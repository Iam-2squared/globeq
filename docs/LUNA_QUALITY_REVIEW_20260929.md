# Luna quality review and conditional replacement — 2026-09-29 JST

The owner authorized a content-quality audit and replacement of the expensive daily model if no material regression is found, with no Sol fallback. Scope is GlobeQ only. This document records the plan before seeing the new output; it is not a PASS declaration.

## Baseline
Main remains 32869007e0140ab05a3313fbff6475dbb77d61a1. Existing 2026-09-29 content: 16 published questions, after 24 candidates. Read the 16 saved question/option/source records; do not pay for another Sol run. Read-only pre-audit fingerprint of Sep 28/29 questions: 9b8ab045edc0d873e31975d6292bb3af. Answer row count at snapshot: 67 (can naturally increase).

## Authorized bounded review
One new Luna Responses request, maximum 8 built-in calls and 16000 output tokens, low reasoning, original pinned generator/prompt/schema. Retain 1–100 variable-count contract. No retry/fallback, no DB credential, publishing function not exposed. New local envelope/cost/safety tests 7/7 PASS. Existing 9 safety and 4 loader tests run remotely before the request. Latest prior app CI 36522916275 SUCCESS.

Draft output and source trace are AES-256-GCM encrypted; its random key is wrapped with a 3072-bit RSA-OAEP-SHA256 public key. Only the public key is committed. The reviewer's private key remains outside GitHub in the current isolated workspace. Artifact retention is seven days, and logs contain only sanitized metrics. Request/call/token limits are not a guaranteed currency cap.

## Independent review gate
Open every candidate's cited official page. Check the question's correct answer, false alternatives, explanation, original concise summary, publication date, event scope, standalone clarity, and absence of evaluative political wording. Check source usage terms and item-level exceptions. Check duplicate URLs/events against saved GlobeQ articles. A mechanical four-option PASS is insufficient. Classify unresolved source facts as unverified, not as PASS. Compare with the saved baseline using the same criteria; do not silently correct the generated text and count the correction as model quality.

Approve a limited operational model replacement only if the review finds no material content-quality regression in the observed sample. This is not statistical model equivalence; record sample size and all limitations. Unresolved critical fact/source/answer errors block promotion.

## Rollout plan after quality gate
Dedicated production PR, full CI, then merge/deploy and smoke/visual evidence. Pin gpt-6-luna so an old OPENAI_DAILY_MODEL=Sol value cannot select an expensive model. No automatic Sol fallback. Keep today's published content and answers unchanged; do not run today's publishing endpoint to perform a test. Verify runtime policy without invoking the model. Preserve an explicit manual pause path instead of recovering with expensive Sol.

Vercel management read on this turn failed (get_project wrapper schema mismatch, list_projects 403 for iam-2squareds-projects). No permission bypass, secret export, or environment edit attempted. GitHub integration deployment is a separate authorized route, not proof that management access works.
