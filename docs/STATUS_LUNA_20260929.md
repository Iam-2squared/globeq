# GlobeQ Luna rollout checkpoint — 2026-09-29 JST

Read alongside docs/STATUS.md; historical entries there remain unchanged. Scope: Iam-2squared/globeq only. This checkpoint supersedes the old daily-model default, not the variable-count product contract.

## Owner authorization and current phase
The owner requested source/answer quality review, then replacement with GPT-6 Luna if no material deterioration was found, and no expensive Sol fallback. Baseline main: 32869007e0140ab05a3313fbff6475dbb77d61a1. This commit prepares the conditional production patch; CI, merge, actual deployment and post-deploy checks are still pending. Do not call them PASS until verified.

## Review evidence and limitations
Three bounded Luna-only review calls were made. No additional Sol call was made. Raw drafts and search traces were encrypted before artifact upload; no API key or plaintext answer pack was committed. All originals are preserved in PR #16's evidence branch, which is not merged into this production branch.

1. Run 36525158260: two factual candidates, both already-published Sep28 source URLs. Their correct answers/explanations matched exact official pages and same-source saved editorial questions. Rejected as new content. Same-source Sep28 baseline is not attested as Sol output.
2. Run 36525638576: historical exclusions produced two new source URLs, both HTTP200 and factual answers confirmed. One prompt said 'this meeting' without naming its subject, which is invalid in the quiz UI because article context is hidden until answering. That candidate was rejected, not silently rewritten.
3. Run 36526769066 at 14:34 JST: final prompt adds explicit standalone context and source-page checks. Four new candidates; all four passed structure. Independent exact-page HTTP review 36526995990 matched all four correct answers, explanations and summaries. Sources are two MAFF and two Environment Ministry releases: application-service renewal, food-industry award, food-loss award and awareness-month notice. Different awards/events; shared food-loss theme is not represented as topic diversity. Two easy and two normal; no hard items.

The final observed sample showed no material fact, answer-key or standalone-clarity regression relative to saved product examples. This supports a limited operational replacement, NOT statistical Sol/Luna equivalence, hard-question quality or all future news coverage. Generation volume may be smaller with the eight-tool cap. The first duplicate and missing-context failures remain evidence; they were not discarded. The production automatic gate still does not independently prove factual correctness.

Exact sources were opened with a separate credential-free GitHub HTTP job; web cache misses were not called broken links. Source artifact 11015096506, SHA256 1de6ecc8eeba477d955dc7d140259ff4e0f7a5d13a6bf3fea3536ad02455bb0e. MAFF and Environment Ministry terms were read directly, including attribution, editing and item-specific exceptions. Only original concise text is generated; no images, logos, attached third-party material or copied article body is published. Publication dates outside h1 are checked separately before final merge. Full quality-review detail remains on PR #16.

## Production change
- Pin gpt-6-luna in reviewed code. Legacy OPENAI_DAILY_MODEL is intentionally ignored so an old Sol environment override cannot reactivate it.
- No model fallback or automatic request retry; eight built-in calls, 16000 output tokens, 180-second timeout, store:false.
- Read recent existing source URLs before drafting, include them in the prompt, and retain the historical URL/event rejection gate afterwards.
- Require self-contained questions, reject the observed context-dependent pattern, and require a completed Luna response with web search.
- Preserve source allowlist, one correct of four distinct options, freshness, content review, transactional publish and 1–100/no-quota rules. Zero valid items publishes nothing.
- Log only numerical model usage; private run notes record the model and candidate counts. No prompt, raw provider error or secret is intentionally logged.
- GET /api/health/daily-content reads policy/deployment metadata only, without database or model calls. Smoke/visual checks wait for its exact merged commit before inspecting production.
- GLOBEQ_DAILY_GENERATION_PAUSED=1 disables generation before any model or DB access. Recovery is a deliberate pause/fix-forward, not Sol fallback.

## Cost, not a bill
Final trial measured 51629 input, 5754 cache-write, 1889 output tokens, five built-in web calls (one search action). Standard model estimate $0.00625125. Treating every web action as chargeable gives conservative search estimate $0.05 and total $0.05625125; 30 identical trials $1.6875375. Actual search billing can differ by action type. Tax/FX/card charges and other use are excluded. This is a four-question trial projection, not a guaranteed 16–100 question daily bill or an absolute spending cap. Three current-turn review trials total conservative $0.14459465, not a verified invoice. Official rates: https://developers.openai.com/api/docs/models/gpt-6-luna and https://developers.openai.com/api/docs/pricing .

## Preservation / next
No production model was invoked or production content written during review. Sep28/29 pre-audit question fingerprint 9b8ab045edc0d873e31975d6292bb3af; question counts 20 and16; user_answers count67 (can naturally grow). Verify again after deployment. Vercel management connection returned403; no access-control bypass or secret export. GitHub integration is the deployment path, and health/smoke/visual establish the served code. Do not rerun Sep29 publishing. Next normal scheduled generation after the switch must be separately checked from automation_runs; a deployment PASS is not a future Cron PASS.
