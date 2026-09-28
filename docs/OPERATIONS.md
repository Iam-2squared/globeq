# Japan V1 content operations

## Before running a live pipeline

1. Approve a source's specific feed/API fields and use terms in `CONTENT_SOURCES.md`. There are **no approved live connectors yet**. Never scrape the article body on unclear rights. Manually enter a URL only after an editor checks its rights, attribution and the fact used.
2. Configure a PostgreSQL database. Supabase production deployment uses the timestamped files in `supabase/migrations/`. For isolated/local or explicitly managed databases, `DATABASE_URL=… npm run db:migrate` reads the same directory. **Never use both deployment paths against the same production database.** Keep `globeq` off Supabase Data API. The migrations create no real content or editor.
3. Register an ordinary operator username, then have a database administrator deliberately change that user's `globeq.users.role` to `editor` through a private database connection. Set `EDITOR_USER_ID` to its UUID in the operator environment. Do not add a public role-upgrade API.

## AI-assisted private draft generation

OpenAI may prepare **private candidates only** from concise facts that an editor has already extracted from an approved source. Never send an article body merely because a URL is public. The generator uses the Responses API with strict Structured Outputs; its result still enters the existing Draft → human Review → Publish gate and cannot publish by itself.

```sh
OPENAI_API_KEY='server-only-secret' npm run content:draft -- --file path/to/verified-source-facts.json --out path/to/private-drafts.json
DATABASE_URL='postgresql://…' EDITOR_USER_ID='uuid' npm run content:import -- --file path/to/private-drafts.json
```

`fixtures/verified-source-facts.example.json` documents the input shape only; `example.test` is not a production source. Model output is not factual or licensing evidence. The human reviewer must reopen the source and independently verify the correct option, summary, rights, link and neutrality before review/publish.

## Draft package and review

Prepare a UTF-8 JSON file (never copy an article body):

```json
{
  "date": "2026-09-28",
  "region": "japan",
  "items": [
    {
      "article": {
        "title": "Manually verified article title",
        "summary": "An original short summary written by the GlobeQ editor.",
        "sourceName": "Verified publisher",
        "sourceUrl": "https://publisher.example/article/123",
        "publishedAt": "2026-09-28T10:00:00+09:00",
        "category": "社会",
        "tags": ["制度"],
        "eventKey": "unique-event-slug"
      },
      "question": {
        "prompt": "The unambiguous factual question goes here?",
        "explanation": "GlobeQ's own short fact-based explanation goes here.",
        "difficulty": "normal",
        "options": [
          { "label": "Option A", "correct": true },
          { "label": "Option B", "correct": false },
          { "label": "Option C", "correct": false },
          { "label": "Option D", "correct": false }
        ]
      }
    }
  ]
}
```

The example host and text above are **format illustrations**, not licensed sources or production questions.

```sh
DATABASE_URL='postgresql://…' EDITOR_USER_ID='uuid' npm run content:import -- --file path/to/verified-candidates.json
DATABASE_URL='postgresql://…' EDITOR_USER_ID='uuid' npm run content:review -- --question QUESTION_UUID --note '具体的な出典の確認内容をここに記録' --rights-confirmed yes --neutrality-confirmed yes
DATABASE_URL='postgresql://…' EDITOR_USER_ID='uuid' npm run content:publish -- --date YYYY-MM-DD
```

Review **every** question. The editor must open the actual article, verify the correct option directly, check the original URL, publication time, rights, original summary and political neutrality. The programmatic publish gate requires at least 20 active reviewed questions for that Tokyo day, four distinct choices, one correct choice, source review and freshness. A review flag is an attestation by the editor; code cannot establish factual truth or licensing on its own. A published day can receive a reviewed replacement first and be published again before withdrawing a disputed question.

Import normalizes title/source/category/text whitespace, UTC publication time and canonical HTTPS URLs (removing tracking parameters and fragments). Additive migration `20260928000002_content_integrity.sql` prevents repeated article URLs, event keys and reuse of one article for another question; it also locks reviewed questions, their choices and published article metadata. If an existing database has duplicate event keys or reused articles, resolve them through the editorial correction workflow before applying that migration; do not delete answer history. An editor still checks that two different URLs do not describe the same event.

Reports are saved in `globeq.question_reports`. Investigate them manually. To withdraw a proven error, add and review/publish a replacement so at least 20 remain, then:

```sh
DATABASE_URL='postgresql://…' EDITOR_USER_ID='uuid' npm run content:withdraw -- --question QUESTION_UUID --note '訂正の根拠と対応を記録'
```

The withdrawal preserves the initial answer rows and audit history, removes the disputed article from News, recalculates affected derived ranking and longest-streak scores and keeps earned badges as historical achievements. This is a correction operation and requires editorial verification. Never run fixtures against a real user or database.

## Daily runbook

- Before Japan midnight, collect only from registered permitted feeds or manually selected rights-checked links. Normalize title/URL/source/time/category; deduplicate by event key and article URL.
- Draft 20+ distinct questions, review each source and option, publish explicitly. An automated job may prepare *candidates* later; it must never skip review or call publish on its own.
- Verify the published count, four choices, answer→explanation→link in an isolated account and public page availability. Monitor link and incorrect-answer reports. A missed day is an incident; never create fictitious news to fill a quota.
- Source/DB/deployment requirements and Japan V1 release state live in `STATUS.md`.
