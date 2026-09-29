# GPT-6 Luna isolated pilot — 2026-09-29 JST

**Latest checkpoint: the 13:40 JST live pilot below succeeded (one request, four structurally valid unpublished candidates). This is not a production model switch or fact-quality approval.**

## Scope / baseline
- User request: try GPT-6 Luna for GlobeQ to investigate operating cost. This is not approval to change the production model or auto-publish a trial.
- Repository: `Iam-2squared/globeq` only. Baseline main: `32869007e0140ab05a3313fbff6475dbb77d61a1`.
- Production application, cron, DB, migrations, existing questions and answer history are unchanged.
- Latest main source still defaults to `gpt-5.6` when `OPENAI_DAILY_MODEL` is unset. Production environment override could not be inspected: Vercel team access returned 403. Do not bypass that boundary.
- Historical 2026-09-29 result: 24 candidates / 16 published. Do not rerun that published day through `runDailyContent`.

## Pilot design
The test reads the exact production generator source, checks Git blob hash `d9b990b0e251a86d5ae0f8f5f191bdf092c38621`, transforms a disposable in-memory copy, and exposes only `searchAndDraft` and `validateItem`. Database access is replaced by a throwing stub; publishing is not exposed or invoked. No source file in `src/` is modified.

- One Responses POST at most, `gpt-6-luna`, original low reasoning, original prompt / JSON Schema / validators.
- Retain 1–100 candidates with no minimum quota. Do not replace this with a 20-question requirement.
- Trial-only cost controls: at most 4 built-in web-search calls; at most 16,000 output tokens; 180-second client timeout; `store:false`; no fallback or automatic retry.
- Use existing GitHub Actions `OPENAI_API_KEY` secret only. Missing credential stops before any generation request. Never print/copy a secret into logs, repository files or chat.
- Isolated branch push only, explicit live-once commit marker, no schedule, no pull-request trigger. GitHub rerun attempts are skipped. Adding a secret alone does not launch another trial.
- Record timestamp, requested/returned model, HTTP status, usage, tool count and structural-validation counts. Only sanitized metrics may be uploaded. Raw drafts and answer keys are not logged or published.

## Verification limits — do not label this production PASS
A successful request is only an unpublished smoke/pilot. Independent source-fact, rights and neutrality review is not performed by this harness. Historical DB duplicate checking is not performed; only within-pack duplicate checking is included. The source's current automatic validator does not itself prove factual correctness. The four-tool cap, different execution time and absence of historical duplicate data also mean this is not a controlled Sol-vs-Luna quality comparison. No promotion based on structural validation alone.

A cost estimate uses returned usage and standard published rates, not the billing ledger. Monthly projection is 30 identical trial runs, not a measured monthly bill. Tax, FX, invoice rounding, nonstandard processing and long-context pricing are not verified. The original estimator omits cache-write premiums; see the corrected offline calculation below. Request/tool/output limits are NOT a guaranteed currency spending cap; a timeout may still incur provider charges.

## Reference rates / interfaces (official, checked 2026-09-29)
- https://developers.openai.com/api/docs/models/gpt-6-luna — API ID, Web search / Structured Outputs support; standard input $0.10, cached input $0.01, cache-write input $0.125, output $0.50 per million tokens.
- https://developers.openai.com/api/docs/pricing — web search $10 per 1,000 tool calls plus model-priced search content.
- https://developers.openai.com/api/docs/guides/prompt-caching — input cost partitions ordinary, cached and cache-write tokens; cache-write pricing replaces, not adds to, the ordinary rate for those tokens.
- https://developers.openai.com/api/reference/cli/resources/responses/methods/create — max_tool_calls / max_output_tokens semantics.

## Initial execution checkpoint — historical
Before the first remote attempt: nine offline harness tests passed locally. No live API request occurred locally because no OpenAI credential is configured there. The first remote run `36519750949` stopped at missing-key preflight at 13:01:45.552 JST with zero requests. The correction run `36519952041` was skipped. The standalone Node tests were separated from Vitest, and the application CI subsequently succeeded. Original missing-key evidence is preserved in `docs/verification/luna-pilot-20260929.json`.

## 2026-09-29 13:35 JST — credential registration confirmed; loader correction
User confirmed that the repository Actions secret had been saved. Run `36522260099` / job `109257491900` confirmed its presence without displaying it, then failed before the live step at 13:35:10 JST: the installed TypeScript module had no `ModuleKind.CommonJS` export. Actual OpenAI requests in that attempt: **0**.

The pilot-only loader now uses Node's native type stripping and three exact, hash-pinned module-layout adaptations. Original generation prompt, JSON Schema, validators, production source and DB isolation remain unchanged. Four additional offline integration checks exercise the actual loader, one mock-response generation, retained validation and rejection of changed source. No extra dependency or production change was introduced. Local Node type-stripping smoke passed; exact pinned-dependency integration was verified remotely.

## 2026-09-29 13:40 JST — completed live pilot (latest result)

| Evidence | Result |
| --- | --- |
| Trial commit | `3beed99efa5708c29c988a2771b94087ac087f01` |
| Workflow run | https://github.com/Iam-2squared/globeq/actions/runs/36522615092 |
| Job | `109258593170` — SUCCESS |
| Request observation | `2026-09-29T04:40:01.467Z` / **2026-09-29 13:40:01.467 JST** |
| Report emitted | **13:40:17 JST** |
| Requested / returned model | `gpt-6-luna` / `gpt-6-luna` |
| HTTP / response | **200 / completed** |
| Actual Responses requests | **1**, no retry or fallback |
| Measured request duration | **15,466 ms** |
| Built-in web-search calls | **4** |
| Generated candidates | **4** |
| Existing mechanical validation | **4 passed / 0 rejected** |
| Production writes / questions published | **0 / 0** |
| Independent fact / rights / neutrality review | **Not performed** |
| Historical database duplicate checks | **Not performed** |
| Safety tests | **9/9 PASS** |
| Real-loader offline integration tests | **4/4 PASS** |
| Application CI on trial commit | **SUCCESS**, run `36522617937` |
| Vercel Preview on trial commit | **SUCCESS** as reported by GitHub commit status |
| Production model switch / PR merge | **Not performed**; PR #16 stays Draft |

### Persisted usage from the original artifact

```json
{
  "input_tokens": 37049,
  "input_tokens_details": {
    "cache_write_tokens": 4865,
    "cached_tokens": 0
  },
  "output_tokens": 1345,
  "output_tokens_details": {
    "reasoning_tokens": 272
  },
  "total_tokens": 38394
}
```

Original artifact: `luna-pilot-metrics-36522615092`, ID `11012999367`, ZIP SHA256 `fad264847c1bdb69218adac5946a143cb366ec4f2d66453cf3c7d1e46b3dc158`. Downloaded ZIP checksum was independently recomputed and matched. It contains only `luna-pilot-report.json`, not raw questions, answer keys or credentials. Artifact retention is seven days; the key measurements are preserved here for a durable handoff.

### Corrected cost estimate — calculated offline, not another API request
The original artifact estimated `$0.0443774` total and `$1.331322` for 30 identical runs, but treated all noncached input as ordinary input. It did not apply the cache-write rate to **4,865** returned cache-write tokens. Preserve the original artifact; do not treat its old estimate as the corrected value.

Using the official standard rates:

- Ordinary input: `(37,049 - 0 - 4,865) × $0.10 / 1,000,000 = $0.0032184`.
- Cache-write input: `4,865 × $0.125 / 1,000,000 = $0.000608125`.
- Output: `1,345 × $0.50 / 1,000,000 = $0.0006725`; the 272 reasoning tokens are already included and are not added twice.
- Model subtotal: **$0.004499025**.
- Search tool calls: `4 × $0.01 = $0.04`.
- Corrected trial total: **$0.044499025** (about **$0.0445**).
- Thirty identical runs: **$1.334970750** (about **$1.34**).
- At the explicitly hypothetical rate `$1 = ¥150`: **¥6.67 per run / ¥200.25 for 30 runs**. This is not a current exchange-rate quote.

These are standard-price estimates from measured usage, not verified invoices or a monthly spending cap. They exclude tax, card/FX charges and any other project usage. The monthly projection applies only to the same **four-candidate / four-search-call scale**. It does not establish the monthly price of reliably producing 16–100 quality-reviewed questions a day. The original 24-candidate production run is not a controlled comparator.

### Current decision and next step
The API-access, generation and mechanical-format pilot succeeded. Do not promote it to a content-quality or production-release PASS. No further live request was made after this success. Production remains unchanged.

Before another authorized trial, update the estimator to account for returned cache-write tokens and use a private review-capable output path: this metrics-only pilot intentionally did not retain raw questions, so independent source/answer/rights/neutrality review cannot be retroactively performed on them. Review content and historical duplicates before proposing a production model switch. Do not rerun the published 2026-09-29 day or assume 16-question quality from this four-candidate pilot.
