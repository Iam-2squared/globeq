/** Isolated one-request pilot. Never calls runDailyContent or a database. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

export const MODEL = 'gpt-6-luna';
export const SOURCE_BLOB = 'd9b990b0e251a86d5ae0f8f5f191bdf092c38621';
export const MAX_TOOL_CALLS = 4;
export const MAX_OUTPUT_TOKENS = 16000;
const ENDPOINT = 'https://api.openai.com/v1/responses';

export function gitBlobHash(source) {
  return createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
}
export function estimateCost(usage, webCalls) {
  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  if (![input, output, cached, webCalls].every(n => Number.isSafeInteger(n) && n >= 0) || cached > input || input > 272000) return null;
  // USD estimate, not an invoice or spend cap. Official standard rates checked 2026-09-29.
  const model = ((input - cached) * 0.10 + cached * 0.01 + output * 0.50) / 1000000;
  const search = webCalls * 0.01;
  return { model_usd: model, search_tool_usd: search, total_usd: model + search,
    thirty_identical_runs_usd: (model + search) * 30, invoice_verified: false };
}
export function makeTransport({ apiKey, fetchImpl = globalThis.fetch, capture = {} }) {
  let calls = 0;
  return async (url, init) => {
    if (!apiKey) throw new Error('MISSING_API_KEY');
    if (calls !== 0) throw new Error('SECOND_REQUEST_BLOCKED');
    if (url !== ENDPOINT || init?.method !== 'POST') throw new Error('UNEXPECTED_ENDPOINT');
    const payload = JSON.parse(init.body);
    if (payload.model !== MODEL || payload.tools?.length !== 1 || payload.tools[0].type !== 'web_search') throw new Error('UNEXPECTED_REQUEST');
    payload.max_tool_calls = MAX_TOOL_CALLS;
    payload.max_output_tokens = MAX_OUTPUT_TOKENS;
    payload.store = false;
    calls += 1;
    capture.request_count = calls;
    const started = Date.now();
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(180000),
    });
    capture.duration_ms = Date.now() - started;
    capture.http_status = response.status;
    if (response.ok) {
      const body = await response.clone().json();
      capture.model_returned = body.model;
      capture.response_status = body.status;
      capture.usage = body.usage;
      capture.web_search_calls = (body.output ?? []).filter(x => x.type === 'web_search_call').length;
      if (body.status !== 'completed') throw new Error('RESPONSE_NOT_COMPLETED');
    }
    return response;
  };
}

export async function loadGenerator({ apiKey, transport, root = process.cwd() }) {
  const source = await readFile(resolve(root, 'src/lib/daily-content.ts'), 'utf8');
  if (gitBlobHash(source) !== SOURCE_BLOB) throw new Error('SOURCE_CHANGED_REVIEW_REQUIRED');
  const require = createRequire(resolve(root, 'package.json'));
  // TypeScript 7's installed module does not provide the compiler API used by the
  // original harness. Strip types with Node, adapting only this hash-pinned
  // module's two imports and one export; all generation/validation code is kept.
  let compiled = stripTypeScriptTypes(source, { mode: 'strip' });
  const replacements = [
    ["import { z } from 'zod';", "const { z } = require('zod');"],
    ["import { db } from '@/lib/db';", "const { db } = require('@/lib/db');"],
    ['export async function runDailyContent(', 'async function runDailyContent('],
  ];
  for (const [before, after] of replacements) {
    if (compiled.split(before).length !== 2) throw new Error('UNEXPECTED_MODULE_LAYOUT');
    compiled = compiled.replace(before, after);
  }
  compiled += '\nexports.searchAndDraft = searchAndDraft; exports.validateItem = validateItem;\n';
  const exports = {};
  const sandbox = {
    exports,
    require: name => {
      if (name === 'zod') return require('zod');
      if (name === '@/lib/db') return { db() { throw new Error('DATABASE_ACCESS_BLOCKED'); } };
      throw new Error('UNEXPECTED_IMPORT');
    },
    process: { env: { OPENAI_API_KEY: apiKey, OPENAI_DAILY_MODEL: MODEL } },
    fetch: transport, URL,
  };
  vm.runInNewContext(compiled, sandbox, { timeout: 1000, filename: 'pinned-daily-content.cjs' });
  // Expose ONLY the generator and pure validator; never the publishing function.
  return { generate: exports.searchAndDraft, validate: exports.validateItem };
}

export async function runPilot({ apiKey, targetDate, root, fetchImpl, load = loadGenerator }) {
  const report = { mode: 'unpublished-pilot', model_requested: MODEL, target_date: targetDate,
    observed_at: new Date().toISOString(), source_blob: SOURCE_BLOB,
    request_count: 0, max_tool_calls: MAX_TOOL_CALLS, max_output_tokens: MAX_OUTPUT_TOKENS,
    production_writes: 0, published: 0, independent_fact_audit: 'not_performed',
    historical_duplicate_check: 'not_performed', production_promotion: 'not_authorized' };
  if (!apiKey) return { ...report, status: 'blocked_missing_api_key' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate ?? '') || !Number.isFinite(Date.parse(targetDate))) return { ...report, status: 'blocked_invalid_date' };
  const capture = {};
  try {
    const transport = makeTransport({ apiKey, fetchImpl, capture });
    const generator = await load({ apiKey, transport, root });
    const items = await generator.generate(targetDate);
    const urls = new Set(), events = new Set(), reasons = {};
    let accepted = 0;
    for (const item of items) {
      const issues = generator.validate(item, targetDate, urls, events);
      if (issues.length) {
        for (const issue of issues) reasons[issue] = (reasons[issue] ?? 0) + 1;
      } else {
        accepted += 1; urls.add(item.sourceUrl); events.add(item.eventKey);
      }
    }
    Object.assign(report, capture, { status: 'generated_unpublished', candidates: items.length,
      structural_gate_pass_count: accepted, structural_gate_reject_count: items.length - accepted,
      structural_rejection_reasons: reasons, cost_estimate: estimateCost(capture.usage, capture.web_search_calls) });
  } catch {
    // Do not emit exception text, provider bodies, draft questions, or answer keys into public Actions logs.
    Object.assign(report, capture, { status: 'pilot_failed', retry_performed: false,
      cost_estimate: estimateCost(capture.usage, capture.web_search_calls) });
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const date = process.env.LUNA_TARGET_DATE;
  const report = await runPilot({ apiKey: process.env.OPENAI_API_KEY, targetDate: date });
  const text = JSON.stringify(report, null, 2);
  await writeFile('luna-pilot-report.json', text + '\n', { mode: 0o600 });
  console.log(text);
  process.exitCode = report.status === 'generated_unpublished' ? 0 : 1;
}
