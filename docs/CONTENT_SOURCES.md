# Source rights register

No live connector is enabled as of 2026-09-28. Source review precedes any external candidate collection, article-body scraping or public news ingestion. Editorial staff may enter an individually verified URL and original summary only after checking its usage conditions.

| Source name | Feed/API URL | Terms/licensing URL | Fields to retrieve | GlobeQ use | Attribution | Article body stored? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 金融庁（候補） | https://www.fsa.go.jp/fsaNewsListAll_rss2.xml | https://www.fsa.go.jp/rules/index.html and https://www.fsa.go.jp/kouhou/rss.html | RSS title, link, publication time only; confirm actual field mapping before connection | Candidate metadata and original fact checking; original short GlobeQ summary | Display 金融庁ウェブサイト and article URL; identify GlobeQ's summary as an edited work per site rules | No | **Disabled** pending item-specific exceptions review and operator approval |

For each future source, fill all columns, document any caching/time limits and approval date, and verify reuse of titles/metadata and links. Unknown terms mean no body ingestion. A daily candidate job may only read sources marked approved; drafts remain private until the publication gates pass; Japan has no fixed daily minimum and a hard cap of 100. RSS discovery by itself does not grant republication rights.

The 金融庁 RSS is a candidate for financial/regulatory events, not a claim that it yields 20 distinct Japan stories every day. The site rule generally refers to Public Data License 1.0 with attribution and an indication when edited; exceptions and each item still require checking. No request to the feed was made and no connector or automated publishing was enabled.


## Approved manual-source pilot — 2026-09-28

The following source is approved for the **manual fact-extraction pilot only**. This approval does not enable automatic crawling or RSS ingestion. Editors must check item-level third-party rights and the current source page before every use.

| Source name | Discovery / item URL | Terms/licensing | Allowed pilot fields | Attribution | Body stored? | Automation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 国土交通省 報道発表 | https://www.mlit.go.jp/report/press/ | https://www.mlit.go.jp/link.html | Official page URL, title, publication date, and concise factual propositions independently extracted by an editor; GlobeQ writes its own summary/question | Show 国土交通省, original URL, and identify GlobeQ editing/summary where required | No | **Disabled**; manual pilot only | **Approved for manual pilot** |

Pilot rules: never copy a full release into the model input; do not ingest attached third-party images/PDFs merely because the parent page is usable; record only facts needed to verify one unambiguous question. Automatic connector approval is a separate gate.


## Manual pilot approvals — 2026-09-28

These approvals cover **manual source-page review and concise fact extraction only**. Automatic RSS/API crawling remains disabled until a separate connector review. For every item, check page-level exceptions and third-party rights, store no article body, show the official source URL, and identify GlobeQ-authored editing/summary.

| Source | Terms | Manual title/date/URL + concise fact extraction | Automatic feed | Attribution |
| --- | --- | --- | --- | --- |
| 国土交通省 | https://www.mlit.go.jp/link.html | **Approved, conditional on item-level exceptions** | Disabled | 出典：国土交通省ウェブサイト（URL）／GlobeQが加工して作成 |
| 環境省 | https://www.env.go.jp/mail.html | **Approved, conditional on item-level exceptions** | Disabled | 出典：環境省ウェブサイト（URL）／GlobeQが加工して作成 |
| 農林水産省 | https://www.maff.go.jp/j/use/link.html | **Approved, conditional on item-level exceptions** | Disabled | 出典：農林水産省ウェブサイト（URL）／GlobeQが加工して作成 |
| 金融庁 | https://www.fsa.go.jp/rules/ | **Approved, conditional on item-level exceptions** | Disabled | 出典：金融庁ウェブサイト（URL）／GlobeQが加工して作成 |
| 外務省 | https://www.mofa.go.jp/mofaj/annai/legalmatters/index.html | **Approved, conditional on item-level exceptions** | Disabled | 出典：外務省ウェブサイト（URL）／GlobeQが加工して作成 |

All five sites state that their content is generally usable under PDL1.0 unless otherwise indicated. This is not a blanket approval for third-party images, attached documents, logos, externally-owned text, or a different feed-specific rule.


## Automatic official-source search approval — 2026-09-28

GlobeQ may use OpenAI Responses API `web_search` once per Tokyo day with an explicit domain allowlist. The automatic job does **not** store full source bodies, images or attachments. It stores only the individual official page URL/title/publication time plus GlobeQ-authored short summary/question/explanation.

Approved automatic domains:

| Source | Domain | Terms basis | Automatic use |
| --- | --- | --- | --- |
| 国土交通省 | `mlit.go.jp` | PDL1.0 unless specifically excluded | official-page discovery + factual quiz drafting |
| 環境省 | `env.go.jp` | PDL1.0 unless specifically excluded | same |
| 農林水産省 | `maff.go.jp` | PDL1.0 unless specifically excluded | same |
| 金融庁 | `fsa.go.jp` | PDL1.0 unless specifically excluded | same |
| 外務省 | `mofa.go.jp` | PDL1.0 unless specifically excluded | same |
| 厚生労働省 | `mhlw.go.jp` | PDL1.0 unless specifically excluded | same |
| 経済産業省 | `meti.go.jp` | PDL1.0 unless specifically excluded | same |

Automatic safeguards: HTTPS individual-page URL, domain/source-name match, no reused URL/event key, maximum 7-day freshness window, four distinct choices, exactly one stored correct option, descriptive-only political/policy wording, and exclusion when the searched page explicitly indicates third-party rights/exception material needed for the question. Source attribution and the original URL remain visible in GlobeQ.

Because AI/web search can still be wrong, the global product notice remains mandatory. A run may publish **1–100** valid unique questions; there is no daily quota. A zero-valid-item or failed run publishes nothing and is recorded privately in `globeq.automation_runs`.
