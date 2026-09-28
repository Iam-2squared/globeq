# GlobeQ Japan V1 — product contract

Source of truth: `GlobeQ_Product_Plan_Japan_First_20260928.pdf` (SOLUYRA, 2026-09-28) and the Japan V1 implementation handoff. This document records implementation decisions where the plan leaves choices open.

## Scope and release

- Japan is the only live region in V1. A `region` field and a region/date publication key permit World later; the data model remains region-aware for a future World expansion. Points, tasks, cosmetics and friends are deferred.
- Japan has **no fixed daily minimum**. A published Tokyo calendar day may contain **1–100** validated questions; 100 is the Japan per-day hard cap. Each question has exactly four ordered choices and exactly one verified correct answer.
- Five fixed mobile bottom tabs, in order: Home, News, Quiz (center and prominent), Ranking, Account. Japanese first; desktop remains usable.
- Daily operation may publish AI-generated questions, summaries and explanations without mandatory per-item human review. GlobeQ must display a persistent low-prominence notice that AI-generated content may be inaccurate and users should verify important information against the original source. Automated publication still enforces source URL, four distinct choices, exactly one server-side correct answer, duplicate/freshness checks and the documented source-usage boundary. Fixture questions are synthetic test data and never production news.
- Japan V1 is **not released** until the full handoff release gate, including production smoke test, is met. A green build or preview is a milestone, not a release.

## Core flows

**Home:** Tokyo month calendar shows a day with any competitive answer and a distinct completed day, current streak, answered/total for today and a clear CTA. A published past day links to `/quiz?date=YYYY-MM-DD`. The calendar does not pretend an unpublished day has a quiz.

**News:** Published saved articles list title, GlobeQ's own short summary, source, publication timestamp, category, tags and original URL. Search matches title, summary and tags on saved articles; index and cursor pagination permit growth. Article body is not stored or reproduced.

**Quiz:** Public question responses include prompt, date, difficulty and exactly four choices, but **no correct flag, correct option, isCorrect, answer explanation or answer source before a valid answer**. The answer mutation checks the selected choice against the server database in one transaction; its response then contains correctness, short original explanation, source and article URL. It returns the immutable first result on duplicate submit, including concurrent duplicates. Previously answered questions can show their saved result after session verification. Old dates remain open for learning, with `competition_eligible=false`; historical study never changes competitive streak, progress, hard counts or rankings.

**Ranking:** Streak means consecutive **completed** competitive days, where completion means valid first answers to **all questions published for that Tokyo day**. An uncompleted current day does not break yesterday's streak until the next Tokyo day begins. Weekly Correct means correct answers on the user's first competitive attempt in the ISO week beginning Monday 00:00 Asia/Tokyo; All-Time Correct counts all such first-attempt correct answers regardless of difficulty. Each ranking displays TOP100, the signed-in user's score and rank even when outside TOP100. Equal score means equal rank (`1 + count(users with greater score)`); within a tie sort by username normalized key, then immutable user ID. Withdrawn questions do not earn Hard credit; corrections keep an audit trail.

**Account:** Unique case-folded username, 6–128 character password, no email required. Salted memory-hard password hash; only token hashes are stored in DB, while the opaque session cookie is HttpOnly/Secure in production/SameSite=Lax. Stats include total first competitive answers, correct count, rate, current and longest streak, weekly/all-time first-attempt correct. A user may choose only a badge they have earned; selected badge is shown on profile and ranking.

## Publication and data integrity

- `news_articles` links to source metadata and permitted use; `quiz_days` group a Tokyo date and region; `questions` refer to news; `answer_options` contain the server-only answer flag; `user_answers` has a unique `(user_id, question_id)` constraint; `daily_stats`, streak and hard score aggregates derive only from competitive first answers; `badges`, `user_badges`, `selected_badges` store achievements and display choice. Credentials, sessions, review events and correction reports are separate.
- Draft → Review (source/answer/license/neutrality) → Publish. Publishing uses a transaction with a 1–100 question gate, verifies four choices and one correct choice per question, and records reviewer and time. Published questions cannot be casually edited in place. Withdrawal/correction creates an audit event, preserves history and removes invalid competitive credit by a deliberate recalculation.
- Every news and question record has an original source URL. Do not scrape or store full article bodies where usage rights are unclear; use metadata, verified facts, attribution and original summaries. Source connectors remain disabled until `CONTENT_SOURCES.md` documents rights.
- Politics, elections and policy questions ask about verifiable events, announced text or institutional facts; approval/opposition, character judgment or party preference are never a correct answer.
- Enforce authentication and role checks in every privileged server endpoint, input validation and rate limits. Apply origin/CSRF protection to state changes; never trust client-declared score or choice correctness. Private DB credentials stay server-side. No public browser access to protected tables.
- No destructive migration or production account reset after users exist. Test fixtures and test accounts must be isolated from production.

## Release checklist

Japan 1–100/day with no fixed minimum, four choices, answer→result→summary→original article, historical learning, Home calendar/streak/progress, News search, all three rankings with TOP100 and outside-user rank, Account login/stats/badges, Japanese mobile UX, server answer verification and safe credential storage, green tests, verified database migration, updated README/SPEC/STATUS/CONTENT_POLICY/ARCHITECTURE, production deployment and read-only smoke PASS.
