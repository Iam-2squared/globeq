# GlobeQ status log

Keep dated entries; do not replace previous evidence. Times are Asia/Tokyo. The latest entry is authoritative for progress, while release requires all SPEC gates.

## 2026-09-28 17:08 JST — repository audit / documentation bootstrap

| Field | State |
| --- | --- |
| Repository | `Iam-2squared/globeq` only |
| Default branch / HEAD | `main` configured; empty repository, no commit or HEAD at read-only audit |
| Working branch / commit | `main` / initial docs commit pending |
| PR | none |
| CI | no workflow; no runs |
| Files / README | no files; no README |
| Issues / PRs | 0 / 0 |
| Completed | Read official seven-page product PDF; read-only GitHub audit; fixed Japan-first product decisions in SPEC |
| In progress | Docs bootstrap, then feature branch implementation |
| Blockers | No database project/connection, deployment project/credentials or approved news source registered yet; production data and smoke test cannot be claimed |
| Next | Commit minimal SPEC/STATUS to initialize `main`; branch `feature/japan-v1`; implement architecture/content docs, app, migration, fixtures/tests, CI and Draft PR |
| Migration / deployment | Not started / not started |

No external news fetch, paid service, migration or production write occurred during the audit.

## 2026-09-28 17:21 JST — foundation implementation checkpoint

| Field | State |
| --- | --- |
| Branch / HEAD | `feature/japan-v1` / remote initially `654dacf484e24f679d27429068c0971e83547362`; implementation commit pending |
| PR | Draft planned immediately after first feature commit |
| CI | Workflow authored; no run yet |
| Completed | Architecture comparison, content policy/source register; Next.js app shell and five pages; private PostgreSQL schema (18 tables); server-side answer function, username/Argon2id session routes, starter ranking/News/Account APIs |
| Tests | Migration applied in isolated PGlite: 18 tables; app typecheck in progress; answer/fixture tests pending |
| Pending | Operator review/publish tooling, automated tests, mobile and production smoke, actual reviewed daily content |
| Blockers | No production DB, approved live news source or Vercel deployment target; no purchase or service setup attempted |
| Next | Create Draft PR; add review/publish commands; test 20-question fixture, idempotency, rankings, auth and mobile build; verify CI |
| Migration / deployment | File `0001_japan_v1.sql` locally verified with PGlite; no remote migration / no deployment |

This entry records a work checkpoint, not a Japan V1 release.

## 2026-09-28 17:40 JST — isolated end-to-end checkpoint

| Field | State |
| --- | --- |
| Branch / remote HEAD | `feature/japan-v1` / `961dea4752c9c2be55585b99c8b87fa5d5288fd0` before this checkpoint commit |
| PR | [Draft #1](https://github.com/Iam-2squared/globeq/pull/1); kept Draft |
| CI | First run: **failure** at `npm test` because that checkpoint preceded the test files; next run pending after this commit |
| Completed | Operator import/review/publish/withdraw workflow; 20-question publish gate; DB answer immutability trigger; local five-tab app, auth, News, Quiz, Home, Ranking and badges |
| Local verification | 10/10 unit/integration tests PASS; Next typecheck PASS; build PASS; isolated HTTP E2E PASS (migration, 20 synthetic questions, 20 answers, retry, source reveal, News search, ranking, Account, CSRF, Argon2id) |
| Fixture / ranking / routes | 20 synthetic questions/day; 100 TOP rows plus outside-user rank tested; 5/5 local HTTP routes 200 |
| Mobile viewports | 0 browser viewports verified; Chrome binary absent and its download CDN inaccessible in this workspace |
| DB | 18 app tables applied in PGLite; migration runner also applied the tracking table in isolated socket E2E; no Supabase production migration |
| Deployment | None. No GlobeQ-specific database or Vercel project identified; Practice DB untouched |
| Blockers | Approved live news source and 20 reviewed real questions/day absent; production DB/deployment absent; visual browser and public smoke not verified |
| Next | Push checkpoint and reach green CI; review indexed ranking scaling and security; complete mobile visual, live editorial content, private DB provisioning and deployment before release |

All fixture accounts/news were in memory and were removed after the test. The release gate remains **NOT PASSED**.

## 2026-09-28 17:59 JST — integrity and release-audit checkpoint

| Field | State |
| --- | --- |
| Branch / remote HEAD | `feature/japan-v1` / `6d5dba5dc24e5b1846f63dfc0fc79d758a6af7bb` before this checkpoint push |
| PR | [Draft #1](https://github.com/Iam-2squared/globeq/pull/1); remains Draft |
| CI | Previous commit `6d5dba5` **success**, 1/1 verify job; new change will trigger CI |
| Completed | Additive migrations `0002` and `0003` for article/event uniqueness, immutable reviewed content, indexed rankings and serialized answer/correction; URL/text normalization, three TOP100 variants, withdrawal with article removal and score recomputation, past-study E2E, release audit |
| Local verification | 12/12 tests PASS, typecheck PASS, build PASS, isolated HTTP E2E PASS (20 today's + 20 past synthetic questions, answer/retry/source, accounts/badge, correction); 5 HTTP routes verified |
| Ranking / viewport | 100 TOP rows, 106 synthetic users with own rank 106 and ties for each of 3 types; 0 browser viewports verified because Chrome/download unavailable |
| DB / migrations | 18 application tables plus migration ledger; `0001`–`0003` applied in isolated PGlite; no production DB touched |
| Deployment | None; public deployment smoke **not run** |
| Unfinished / blockers | 20+ rights-reviewed real news questions/day, approved live feed/editorial operation, GlobeQ-specific DB and Vercel target, real-browser visual verification, production migration and public smoke |
| Next | Push branch and verify CI; prepare approved sources and editorial staff; provision authorized free-tier GlobeQ services, verify browser/deployment and update release gate |

No fixture escaped the isolated DB. Japan V1 remains **NOT RELEASED**.

## 2026-09-28 18:01 JST — verified Draft PR checkpoint

| Field | State |
| --- | --- |
| Branch / HEAD at this entry | `feature/japan-v1` / remote `c7ced3cc836233bf6a0b66d82a6247c290353b57`; this status entry follows that implementation commit |
| PR | [Draft #1](https://github.com/Iam-2squared/globeq/pull/1), head `c7ced3c` when checked; description refreshed; not merged |
| CI | Run [#36400787002](https://github.com/Iam-2squared/globeq/actions/runs/36400787002) **success**; `verify` job 1 success / 0 failure, all npm ci/typecheck/test/build/E2E steps success |
| Completed | 5-tab Japanese app, secure answer and account flow, review/publish/correction pipeline, 3 rankings, badges, 3 additive migrations, release audit, Draft PR and green implementation CI |
| Tests | 12 pass / 0 fail / 12 total locally; isolated HTTP E2E PASS; 20 synthetic questions on today's date and 20 on a past date; 5/5 HTTP tab routes checked |
| Ranking / browser | 100 TOP rows and outside-user rank 106 across all 3 metrics with 106 fixture users; 0 browser viewports checked (Chrome binary/download unavailable) |
| Database | 18 application tables + 1 migration ledger, `0001`–`0003` applied and tested in isolated PGlite; production database migration **not run** |
| Deployment | No preview or production deployment; public smoke test **not run** |
| Unfinished / blockers | Rights-approved daily news sources and human-reviewed 20 real questions/day, GlobeQ-only database and deployment target, browser visual check, live migration, deploy and public smoke |
| Next | Obtain source rights/editorial operation and authorized free-tier GlobeQ DB/Vercel targets; perform fixture-only mobile checks, live migrations and safe deployment; complete production smoke before V1 release |

No user data, production service, paid plan, Practice/ARK repository or Practice database was modified. The release gate remains **NOT PASSED**. The CI status above applies to `c7ced3c`; verify any later status-only commit separately.


## 2026-09-28 18:55 JST — Supabase GitHub layout correction

| Field | State |
| --- | --- |
| Trigger | GlobeQ Free Supabase project was created in Tokyo, but GitHub integration could not finalize because this branch had no root `supabase/` project layout |
| Verified cause | Supabase's documented GitHub integration expects the configured working directory to contain `supabase/`; working directory `.` is correct when `./supabase` exists |
| Fix | Added `supabase/config.toml`; moved the three additive migrations into timestamped `supabase/migrations/`; updated the isolated migration runner, DB tests and HTTP E2E to use the same canonical migration directory |
| Production safety | No production migration, fixture, news or user-data write was performed by this correction |
| Repo scope | `Iam-2squared/globeq` only; Practice/ARK untouched |
| Next | Verify CI, then retry Supabase GitHub integration with repository `Iam-2squared/globeq` and working directory `.`. Keep production deployment disabled until the first live migration is deliberately approved |

Japan V1 remains **NOT RELEASED**.


## 2026-09-28 19:30 JST — OpenAI private-draft integration

| Field | State |
| --- | --- |
| Purpose | Add server-only OpenAI-assisted generation for private Japan quiz candidates without weakening the existing human Review/Publish gate |
| API | OpenAI Responses API + strict Structured Outputs; default draft model `gpt-5-mini`, overrideable by `OPENAI_DRAFT_MODEL` |
| Input boundary | Approved-source metadata plus concise editor-verified facts only; no automatic article-body ingestion |
| Output boundary | Original short summary, one factual 4-choice question, one correct answer, explanation and difficulty; output remains private draft data |
| Safety | No auto-publish, no source-rights attestation by AI, no political evaluation; existing per-question human rights/fact/neutrality review remains mandatory |
| Secrets | `OPENAI_API_KEY` is server-only and not committed; production key is configured outside GitHub |
| Production writes | None from this commit; no live OpenAI request and no news import performed |

Japan V1 remains **NOT RELEASED**.


## 2026-09-28 19:35 JST — first live-source pilot selected

| Field | State |
| --- | --- |
| Candidate | 国土交通省「日本スタートアップ大賞2026」の国土交通スタートアップ賞 (2026-09-25) |
| Verified facts for draft input | 国土交通大臣賞の受賞者は株式会社SkyDrive; 応募は317件; SkyDriveは空飛ぶクルマ(eVTOL)の開発・製造・販売・運航サービス等を行う |
| Rights mode | MLIT manual-source pilot only; source page/terms checked, article body not stored and automatic crawling remains disabled |
| Next | Use only these concise facts for one private OpenAI draft, then independently compare the generated correct option/explanation against the official source before any import/review |
| Publish state | **No live question published** |

Japan V1 remains **NOT RELEASED**.


## 2026-09-28 19:45 JST — Vercel preview bootstrap

| Field | State |
| --- | --- |
| Symptom | GitHub Japan V1 CI passes, but Vercel preview deployments for the feature branch report failure |
| Likely project-state cause | The Vercel project was initially imported while `main` contained only bootstrap documentation, before the Next.js application existed |
| Fix | Add source-controlled `vercel.ts` declaring the project framework as Next.js and explicit `npm ci` / `npm run build` commands |
| Release safety | Feature branch only; no PR merge, no production publish, no content publish |
| Preview behavior | Preview can render honest empty states without a database if Preview secrets are absent; production data is not required merely to inspect the UI |

Japan V1 remains **NOT RELEASED**.


## 2026-09-28 19:55 JST — production connection and DB security hardening

| Field | State |
| --- | --- |
| Vercel DB compatibility | App now accepts Supabase Integration `POSTGRES_URL` when `DATABASE_URL` is absent or was saved as the literal alias `$POSTGRES_URL` |
| Security migration | Added `20260928000004_security_hardening.sql` to pin trigger-function `search_path` values and revoke browser-role execution from private functions |
| Supabase auto-RLS helper | Migration revokes anonymous/authenticated/public execution of `public.rls_auto_enable()` when present |
| RLS tables | **Not changed**. RLS remains a separate explicit design decision because GlobeQ uses a private non-Data-API schema and server-side SQL |
| User data | No resets/deletes; additive configuration only |

Japan V1 remains **NOT RELEASED**.


## 2026-09-28 20:05 JST — physical iPhone UI evidence and 20-source fact pack

| Field | State |
| --- | --- |
| Physical UI | User supplied iPhone Safari screenshots for Home / News / Quiz / Ranking / Account; all 5 tabs rendered and bottom navigation remained usable |
| Visual boundary | Preview showed honest empty/pre-release states; Account correctly showed DB-not-configured in Preview because production secrets were not copied to Preview |
| Content research | Prepared `fixtures/japan-20-source-facts-20260928.json` with 20 distinct official events from MLIT, MOE, MAFF, FSA and MOFA |
| Rights register | Five official websites added as manual-only PDL1.0 pilots; item-level exceptions and third-party rights still checked per item; automatic feeds remain disabled |
| Freshness gate | Expanded from 2 to 3 Tokyo calendar days so Friday official releases can support a Monday daily set; older Thursday material remains blocked |
| Publish state | Source facts only. **0 questions imported, 0 questions reviewed, 0 questions published** |

Japan V1 remains **NOT RELEASED**.
