# Japan V1 release audit — 2026-09-28

**Decision: OFFICIAL RELEASE — GlobeQ Japan V1 / LIVE.**

Production origin: https://globeq.vercel.app

This audit records the completed Japan V1 gate. Historical pre-release checkpoints remain in `docs/STATUS.md`.

| Gate | Production evidence | Result |
| --- | --- | --- |
| Japan variable daily set; four options | Product contract now allows 1–100 validated Japan questions per Tokyo day with no fixed quota. Release day contains 20 real-source questions / 80 options; every question has four distinct options and exactly one stored correct answer | **PASS** |
| Content rights / source review | Product owner formally approved 20/20 after official-source review; 20 `content_reviews` records with rights and neutrality checked; source registry records conditional PDL1.0/manual-use rules | **PASS** |
| Answer concealment | Public `/api/questions?date=2026-09-28` returns 20×4 and contains no answer flag, correct option, explanation or source URL | **PASS** |
| Answer transaction / scores | Real PostgreSQL rollback test: 20 answers, 20 correct, Hard=6, streak=1, completion + badges; isolated HTTP E2E also covers retry and post-answer explanation/source reveal | **PASS** |
| Live usage integrity | Production snapshot observed 20 persisted answers from one member; all answer rows join published content with explanation and HTTPS source material | **PASS** |
| Home / calendar | Production browser 390×844 capture shows published 20-question day, 0/20 logged-out progress and calendar | **PASS** |
| News | Production browser capture shows 20 published official-source news cards and source links | **PASS** |
| Quiz | Production browser capture shows 20-question navigation and Question 01/20; answer action requires login | **PASS** |
| Ranking | TOP100 route live; isolated 106-user tests cover all three ranking types and outside-TOP100 own rank; production smoke-test accounts were removed | **PASS** |
| Account / auth | Public production smoke: register 201, authenticated Account 200, logout 200, login 200, logout 200; temporary smoke users cleaned | **PASS** |
| Mobile UX | User iPhone Safari five-tab evidence plus automated production Chromium 390×844 capture for all five tabs | **PASS** |
| Database | GlobeQ-only Supabase project; 18 application tables; four production migrations applied | **PASS** |
| Security | Private `globeq` schema; anon/authenticated schema usage false; private answer function execute false; Security Advisor 0 lints | **PASS** |
| CI / deploy | GitHub Japan V1 checks success on `main`; Vercel production deployment success | **PASS** |
| Public smoke | Home / News / Quiz / Ranking / Account all HTTP 200; 20-question API contract passes | **PASS** |
| Test residue | Rollback test left no DB residue; Vercel auth-smoke accounts removed; `smoke_%` users = 0 | **PASS** |

## Operational constraints after release

- Publish at least 20 Japan questions per Tokyo day only after explicit human fact, correct-answer, source-rights/attribution and neutrality review.
- AI/OpenAI may create **private drafts only**. It must not auto-review or auto-publish.
- Do not store or republish full third-party article bodies. Keep GlobeQ-authored short summaries, source name and original URL.
- Automatic source connectors remain disabled until source-specific feed/API terms are separately approved.
- Political/election/policy items must ask verifiable descriptive facts and must not turn support, opposition, motive or evaluation into a correct answer.
- Preserve first-answer immutability and correction history; publish a replacement before withdrawing a disputed live question so the active daily set remains at least 20.
- Practice, ARK and Ark Terminal remain separate systems.

## Next phase

Japan V1 is released. Next work is daily operations automation and reliability: approved-source candidate collection, OpenAI private draft generation using the server-only key, editorial queue ergonomics, recurring production monitoring, then World architecture and Japan+World 100+/day.


## Official release declaration — 2026-09-28

**GlobeQ Japan V1 is officially released.**

Release baseline: `d18e6c7423da7648db76882eeb4d6da5b08efd4f`.

At declaration time:
- GitHub `main`: Japan V1 checks, Production Smoke and Production Visual Evidence all PASS.
- Vercel production deployment: SUCCESS at the public production origin.
- Supabase: 8 production migrations applied; Security Advisor reports 0 lints.
- Production content: 20 published questions / 20 published source records for 2026-09-28.
- Test residue: 0 `smoke_%` users.
- Japan daily contract: no fixed quota; 1–100 validated questions per published Tokyo day.
- Automatic daily pipeline is deployed. Its first genuinely new-day scheduled OpenAI/web-search generation remains a **post-release operational observation**, not evidence already obtained at release time.

Future changes after this declaration are normal post-V1 development and do not retroactively alter this release baseline.
