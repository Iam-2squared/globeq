# GlobeQ by SOLUYRA

Japan-first news learning: 4-choice daily quizzes, original short explanations, source links, calendar/streak, rankings and badges. **Development in progress. Japan V1 is not released.** The official product contract is [docs/SPEC.md](docs/SPEC.md); the latest dated evidence is [docs/STATUS.md](docs/STATUS.md).

The current pass/block release checklist is in [docs/RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md).

## Local development

Requirements: Node 24+, npm, PostgreSQL (or a Supabase PostgreSQL project). Copy `.env.example` to `.env.local` and provide a server-only `DATABASE_URL`; do not commit credentials. Schema `globeq` must remain unexposed to Supabase Data API. If the database is absent, the app renders honest empty states; registration and quiz writes are unavailable.

```sh
npm ci
DATABASE_URL='postgresql://…' npm run db:migrate
npm run dev
npm run typecheck
npm test
npm run build
npm run test:e2e
```

For a serverless deployment, use a PostgreSQL transaction-pooler URL; prepared statements are disabled in the app's DB client. Production-compatible migrations live in `supabase/migrations/` with timestamped filenames. `db:migrate` reads that same directory for isolated/local or explicitly managed setup. If Supabase GitHub production deployment is enabled, do not also run `db:migrate` against that same production database; use one deployment path only. No fixtures, real news, editor rights, tokens or password data are inserted by the migrations.

## Editorial operations

Do not connect a feed until [docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md) records its rights and fields. A human verifies source, correct answer, original summary and neutrality as described in [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md). Import draft packages, review each question and publish a Tokyo date only after its 20+ questions pass the gate. The operator CLI is documented in [docs/OPERATIONS.md](docs/OPERATIONS.md). AI-generated text is never auto-published.

`test:e2e` starts an in-memory PGlite wire server, applies the real migration and starts the built app on a local port. Its 20-question package uses `example.test` and **is not news**. Do not seed it in production. Never use a production user account for an E2E test.

## Safety and scope

- Browser question payloads contain no answer flag, correct option or explanation. Answers are checked by a PostgreSQL transaction that keeps each user's first choice and score fixed.
- Login uses username and an Argon2id password hash, a hashed opaque session token and an HttpOnly cookie. Mutations require a same-origin request and are rate limited.
- Region/date data keys allow later World/100+ questions per day; Points and cosmetics are deferred.
- This repository is independent of Practice, ARK and Ark Terminal. No paid integration is required by the code. Production release requires verified content rights, a real database, deployment and a read-only smoke test.
