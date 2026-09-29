# GPT-6 Luna isolated pilot — 2026-09-29 JST

## Scope / baseline
- User request: try GPT-6 Luna for GlobeQ to investigate operating cost. This is not approval to change the production model or auto-publish a trial.
- Repository: `Iam-2squared/globeq` only. Baseline main: `32869007e0140ab05a3313fbff6475dbb77d61a1`.
- Production application, cron, DB, migrations, existing questions and answer history are unchanged.
- Latest main source still defaults to `gpt-5.6` when `OPENAI_DAILY_MODEL` is unset. Production environment override could not be inspected: Vercel team access returned 403. Do not bypass that boundary.
- Historical 2026-09-29 result: 24 candidates / 16 published. Do not rerun that published day through `runDailyContent`.

## Pilot design
The test reads the exact production generator source, checks Git blob hash `d9b990b0e251a86d5ae0f8f5f191bdf092c38621`, transpiles a disposable in-memory copy, and exposes only `searchAndDraft` and `validateItem`. Database access is replaced by a throwing stub; publishing is not exposed or invoked. No source file in `src/` is modified.

- One Responses POST at most, `gpt-6-luna`, original low reasoning, original prompt / JSON Schema / validators.
- Retain 1–100 candidates with no minimum quota. Do not replace this with a 20-question requirement.
- Trial-only cost controls: at most 4 built-in web-search calls; at most 16,000 output tokens; 180-second client timeout; `store:false`; no fallback or automatic retry.
- Use existing GitHub Actions `OPENAI_API_KEY` secret only. Missing credential stops before any generation request. Never print/copy a secret into logs, repository files or chat.
- Isolated branch push only, explicit `[luna-live-once]` commit marker, no schedule, no pull-request trigger. GitHub rerun attempts are skipped. Adding a secret alone does not launch another trial.
- Record timestamp, requested/returned model, HTTP status, usage, tool count and structural-validation counts. Only sanitized metrics may be uploaded. Raw drafts and answer keys are not logged or published.

## Verification limits — do not label this production PASS
A successful request is only an unpublished smoke/pilot. Independent source-fact, rights and neutrality review is not performed by this harness. Historical DB duplicate checking is not performed; only within-pack duplicate checking is included. The source's current automatic validator does not itself prove factual correctness. The four-tool cap, different execution time and absence of historical duplicate data also mean this is not a controlled Sol-vs-Luna quality comparison. No promotion based on structural validation alone.

A cost estimate uses returned usage and standard published rates, not the billing ledger. Monthly projection is 30 identical trial runs, not a measured monthly bill. Tax, FX, invoice rounding, cache writes, nonstandard processing and long-context pricing are not verified. Cost is left unknown when usage is missing or input exceeds 272,000 tokens. Request/tool/output limits are NOT a guaranteed currency spending cap; a timeout may still incur provider charges.

## Reference rates / interfaces (official, checked 2026-09-29)
- https://developers.openai.com/api/docs/models/gpt-6-luna — API ID, Web search / Structured Outputs support; standard input $0.10, cached input $0.01, output $0.50 per million tokens.
- https://developers.openai.com/api/docs/pricing — web search $10 per 1,000 tool calls plus model-priced search content.
- https://developers.openai.com/api/reference/cli/resources/responses/methods/create — max_tool_calls / max_output_tokens semantics.

## Execution checkpoint
Before the remote attempt: nine offline harness tests passed locally. No live API request occurred locally because no OpenAI credential is configured there. Remote outcome must be read from this branch's Actions run; do not infer it from a green application build. The workflow writes exact UTC observation time; convert to JST for human handoff.

Next: inspect the single pilot run. If credentials are missing, ask the owner to configure a GlobeQ-only API key via GitHub Secrets (not in chat), and require a deliberate new run after that. If a request succeeds, report measured usage separately from quality claims. Production remains unchanged until a separately reviewed switch.
