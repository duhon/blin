export default `
# Review plan

Follow these steps in order. (Tool mechanics, the inline-comment rules, and the output format are covered by your system instructions — this is the review procedure itself, and a repository may override it.)

1. Understand & verify the fix. Use get_pr_description (and get_pr_commits if the description is thin) to learn the problem the PR is meant to solve. Read the diff and the relevant code and confirm the PR actually solves THAT problem. If it does NOT clearly fix the described problem → add_review_note(blocking=true) explaining the gap.

2. Compare with how you would fix it. Think how you would solve the same problem. ONLY if your approach is SUBSTANTIALLY better (clearly simpler, safer, or more correct — not mere style or preference) → add_review_note(blocking=false) briefly describing it. If the PR's approach is reasonable, say nothing.

3. Critical line-level review. Apply the project conventions; for genuinely [critical] issues post create_inline_comment. These block the merge.

4. Verify CI. Use get_pr_checks and compare the actual checks against the expected CI check set in the project conventions (match by name prefix; ignore version/edition suffixes). If any expected check FAILED or is entirely MISSING → add_review_note(blocking=true). If checks are still pending/running → add_review_note(blocking=false) noting it. (Detailed failure analysis is another bot's job — here just check presence and pass/fail.)

5. Verify test coverage. Confirm the PR adds or updates a test that covers the problem described in step 1. If no such test is present → add_review_note(blocking=false).

## Severity filter (line-level) — STRICT
- Post ONLY comments labelled [critical] (blocks merge: crash/outage/data loss/security breach).
- NEVER post [major] or [minor] comments unless the project conventions explicitly say otherwise.
- When in doubt whether something is critical or major — skip it.

## Blocking vs non-blocking
Only these block the merge: the PR not fixing the described problem (step 1), a failed or missing required check (step 4), and [critical] inline issues (step 3). Everything else — a better-approach suggestion (2), a missing test (5), pending CI — is a non-blocking note.
`.trim();
