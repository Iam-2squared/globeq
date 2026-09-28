# Content and quality policy

Applies to every Japan V1 article and question, whether drafted by a person, feed or AI. Content may be published by the guarded automatic pipeline without daily human review. Keep the original source URL, automation/review actor, timestamp and later corrections; the global AI-inaccuracy notice is mandatory.

## Publish checks

1. **Fact:** The exact correct option is directly supported by the linked source. Check the source at review time and record a short verification note. If it cannot be verified, reject the question.
2. **Four clear choices:** Exactly four distinct plausible options in a stable order and exactly one supported correct answer. No ambiguous timeframe, misleading units, double correct choice or private information.
3. **Freshness and uniqueness:** Published timestamp fits the assigned Tokyo day and the source URL, canonical event key and question do not duplicate that day's event. An older event needs an explicit learning-only context, not a fabricated fresh date.
4. **Copyright and attribution:** Only permitted title/metadata and original summaries. Never paste a full article or long excerpt. Display the source name, original publication time and canonical article link. If licensing or feed terms are unclear, do not ingest the body or enable the connector.
5. **Link:** Check that the original HTTPS article URL resolves to the right story during review; retain even if later broken and record a broken-link report.
6. **Difficulty:** Easy = a prominently stated fact; Normal = fact requiring attentive reading; Hard = precise factual detail or comparison directly stated in the source. Difficulty does not depend on opinion or obscure unsupported inference.
7. **Neutrality:** Political, election and policy questions only ask about verifiable events, official publication or institutional facts. Never mark support, opposition, personality evaluation or a partisan conclusion correct.
8. **Explanation:** Brief GlobeQ-authored neutral summary, shown only after a valid answer. Do not closely paraphrase a long passage. News cards also use original, short summaries.

Automatic path: official-domain web search → structured AI draft → deterministic validation → atomic publish. A Japan day has no fixed minimum; it may publish 1–100 accepted questions passing source-domain, freshness, duplicate, four-choice, one-correct and neutrality gates. Quality must not be lowered to hit a quota. AI validation cannot guarantee factual truth, so the product must state that AI-generated content may be inaccurate and point users to the original source. A report or correction is recorded in an audit event, and a disputed question can be withdrawn while preserving answers and documenting any score recomputation. Never silently change the correct option of a question already answered.

On a validated withdrawal, keep earned badges as historical achievements, preserve immutable initial answers and recalculate affected derived current/longest streak and Hard scores. Remove the withdrawn article from the public News list. If withdrawing the only active question, publish a replacement first so a live published day retains at least one active question. Record the correction note in `content_events`.
