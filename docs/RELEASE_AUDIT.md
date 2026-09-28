# Japan V1 release audit — 2026-09-28

**Decision: NOT RELEASED.** This audit separates isolated implementation evidence from the required live Japan service. Do not mark the PR ready or announce V1 until every production gate passes.

| Gate | Local / isolated evidence | Production gate |
| --- | --- | --- |
| Japan 20+/day; four options | 20 synthetic questions on each of two Tokyo dates; publish refuses fewer than 20; four choices and one correct checked | **Blocked:** 20 independently verified real news questions for each daily publication are absent |
| Answer → result → explanation → source | Server-side answer transaction, idempotent retry, concealed public payload and post-answer source link verified by HTTP E2E | Pending live source/link review |
| Past quiz and scoring boundary | Historical date and noncompetitive first answer verified by HTTP E2E | Pending deployed check |
| Home calendar, streak and progress | Tokyo dates, 20/20 progress and streak verified with isolated DB | Browser visual check pending |
| News cards, keyword search | Saved synthetic articles searchable; title/summary/tags query | Rights-approved live articles absent |
| Streak, Weekly Hard, All-Time Hard | All three TOP100, ties and outside-user rank with 106 fixture users | Scale/query plan against real population pending |
| Account, auth, badges | Registration, unique username, Argon2id hash, cookie, login rejection, earned-only badge choice verified | Browser visual check pending |
| Content control and corrections | Manual import → review → transactional publish; replacement then withdrawal preserves immutable answer rows and recalculates scores | Human editor, approved source register, recurring daily operation pending |
| Mobile Japanese UX | Five tabs, responsive styles and Japanese text implemented; 5 HTTP pages return 200 | **Blocked:** 0 real browser viewports checked (no Chrome binary/download in this workspace) |
| Security | Same-origin mutation, validation, rate limit, server-only DB, private schema, reviewed content immutability tested | Deploy-time secrets, host and browser security review pending |
| Tests / migrations / CI | 12/12 Vitest; typecheck/build/E2E pass locally; 18 application tables + tracking table, additive `0001`–`0003` applied to isolated PGlite | Final GitHub CI run and real database migration pending |
| Public deploy and smoke | None | **Blocked:** no GlobeQ-specific DB/project, Vercel target, production deploy or public smoke |

The synthetic fixture uses `example.test`; it must never be inserted into a live database or portrayed as news. A candidate 金融庁 feed is listed but **disabled** pending item-level rights review. No paid service, live feed, production user, deployment, Practice/ARK repository or existing Practice database was touched.

## To close the remaining gates

1. Confirm enough independently licensed source metadata/links for the editorial workload; enter terms, allowed fields, attribution and approval in `CONTENT_SOURCES.md`. Assign human editors to review at least 20 *real* distinct questions each Tokyo day. Keep automatic publishing disabled.
2. Provide or provision an authorized **GlobeQ-specific** PostgreSQL and Vercel project within an approved free tier, then apply all three migrations without test fixtures. Record database ownership, backup and deployment configuration. Never repurpose another product's project or make a paid-plan change without explicit authorization.
3. Verify mobile and desktop viewports using a working browser environment and fixture accounts. Exercise all five tabs, answer/retry/report, badge selection, calendar and every ranking; fix any layout or access issue.
4. After live editorial review and deployment, run a public read-only smoke test for pages, question answer concealment and original links. Use temporary isolated test accounts for any write-path smoke. Record resulting evidence in `STATUS.md`, then decide whether V1 can be released.
