# Japan V1 architecture decision — 2026-09-28

## Comparison

| Candidate | Vercel | Postgres/server-only answers | Mobile and tests | Daily publishing | Decision |
| --- | --- | --- | --- | --- | --- |
| Next.js App Router + PostgreSQL | First-class | Route handlers and server components; ordinary SQL transactions | React CSS and unit/integration tests | Separate review/publish command; optional daily trigger later | **Selected** |
| React Router framework mode + PostgreSQL | Supported via adapter | Good loaders/actions | Good | Similar, more deployment adapter decisions | Viable alternative |
| SvelteKit + PostgreSQL | Supported via adapter | Good server routes | Good | Similar | Good, smaller shared React ecosystem for this project |

Keep backend logic as plain TypeScript services independent of route handlers. Next.js serves five server-rendered tab pages and JSON route handlers. The browser receives only public question fields, its own post-answer result and published news. `DATABASE_URL` is a server-only PostgreSQL transaction-pooler URL for Supabase (or another PostgreSQL host); `postgres` runs with prepared statements disabled for a transaction pooler. No Supabase project or paid plan is created automatically. Schema `globeq` is private, is not an exposed Data API schema and revokes access from `PUBLIC`, `anon`, `authenticated`. Browser code has no database key. If the schema is ever exposed in Supabase, an explicit RLS and grant review is required before exposure; the default has zero browser DB privileges.

## Data and guarantees

`users`, `auth_credentials`, `sessions`, `news_articles`, `quiz_days`, `questions`, `answer_options`, `user_answers`, `daily_stats`, `user_scores`, `user_weekly_scores`, `badges`, `user_badges`, `selected_badges`, `content_reviews`, `content_events`, `question_reports`, `rate_limits` reside in `globeq`. A composite region/date key lets a later World pool reach Japan+World 100+/day. `UNIQUE (user_id,question_id)` and one transaction per answer prevent double credit. The transaction locks the question then the user, validates a published question/option, computes correctness in the database, inserts the first result with conflict handling, and increments aggregates only if inserted. A previous submission returns its original result. Additive migration `0002` adds event/article uniqueness and prevents edits to reviewed questions, options or published article metadata. Additive `0003` holds a shared question lock through first answer insertion, while an editorial withdrawal takes the day/question locks then affected user locks before recomputing scores; this avoids concurrent answer/correction races and retains answer history.

`user_scores` stores all-time Hard and completed-day streak/last completed date. `user_weekly_scores` is keyed by Tokyo Monday and user. Indexed positive scores provide TOP100; only when fewer than 100 users have points does an indexed username scan fill zero-score slots. A separate `1 + count(score > my score)` query returns a user's rank even when off-page. Streak eligibility filters on recent completion date so inactive users score zero. Ties use username key then ID for a stable order. With larger user counts, EXPLAIN these queries against realistic data and add a daily score snapshot if needed; avoid writing client-submitted ranking values.

## Security and operations

Use Argon2id with independent salt via the password library, opaque random session token (SHA-256 hash in DB), HttpOnly/SameSite=Lax/Secure-in-production cookie, a same-origin check for mutations, validation, transaction-backed rate limiting and admin role checks per request. Source/answer flags are absent from public question serialization. Strong Content Security Policy and no-store on private APIs are appropriate follow-ups to the release audit. No production user is modified by test fixtures.

Content work starts from permitted metadata and manual source entry. `CONTENT_SOURCES.md` must document rights before enabling a feed. A script creates drafts; a separate editor review records verification; publish runs a transactional 20+ threshold and 4-choice/single-correct checks. Automated cron can trigger candidate collection later, but never auto-publish. Japan day and ISO Monday boundaries use Asia/Tokyo; jobs should use idempotent region/date keys. The migrations are additive once users exist; never reset identities or answers.

Current deployment blocker: no approved database URL, editorial source register or linked Vercel project identified at the initial audit. Local fixtures demonstrate behavior but are not live news or production readiness.
