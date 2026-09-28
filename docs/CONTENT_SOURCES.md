# Source rights register

No live connector is enabled as of 2026-09-28. Source review precedes any external candidate collection, article-body scraping or public news ingestion. Editorial staff may enter an individually verified URL and original summary only after checking its usage conditions.

| Source name | Feed/API URL | Terms/licensing URL | Fields to retrieve | GlobeQ use | Attribution | Article body stored? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 金融庁（候補） | https://www.fsa.go.jp/fsaNewsListAll_rss2.xml | https://www.fsa.go.jp/rules/index.html and https://www.fsa.go.jp/kouhou/rss.html | RSS title, link, publication time only; confirm actual field mapping before connection | Candidate metadata and original fact checking; original short GlobeQ summary | Display 金融庁ウェブサイト and article URL; identify GlobeQ's summary as an edited work per site rules | No | **Disabled** pending item-specific exceptions review and operator approval |

For each future source, fill all columns, document any caching/time limits and approval date, and verify reuse of titles/metadata and links. Unknown terms mean no body ingestion. A daily candidate job may only read sources marked approved; drafts remain private until a reviewer verifies the answer and publishes at least 20 for the day. RSS discovery by itself does not grant republication rights.

The 金融庁 RSS is a candidate for financial/regulatory events, not a claim that it yields 20 distinct Japan stories every day. The site rule generally refers to Public Data License 1.0 with attribution and an indication when edited; exceptions and each item still require checking. No request to the feed was made and no connector or automated publishing was enabled.


## Approved manual-source pilot — 2026-09-28

The following source is approved for the **manual fact-extraction pilot only**. This approval does not enable automatic crawling or RSS ingestion. Editors must check item-level third-party rights and the current source page before every use.

| Source name | Discovery / item URL | Terms/licensing | Allowed pilot fields | Attribution | Body stored? | Automation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 国土交通省 報道発表 | https://www.mlit.go.jp/report/press/ | https://www.mlit.go.jp/link.html | Official page URL, title, publication date, and concise factual propositions independently extracted by an editor; GlobeQ writes its own summary/question | Show 国土交通省, original URL, and identify GlobeQ editing/summary where required | No | **Disabled**; manual pilot only | **Approved for manual pilot** |

Pilot rules: never copy a full release into the model input; do not ingest attached third-party images/PDFs merely because the parent page is usable; record only facts needed to verify one unambiguous question. Automatic connector approval is a separate gate.
