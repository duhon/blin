export default `
# Review plan

Work these steps in order. Each step records its result with ONE add_review_note call (section, status, headline, detail) — that becomes a collapsible section in the final review. Keep every detail minimal; the developer decides specifics. Always record steps 1, 4 and 5; step 2 only when it applies.

## Step 1 — Fix verification (section: "fix")
Use get_pr_description (and get_pr_commits if the description is thin) to learn the problem the PR should solve. Read the diff and the relevant code and judge whether the PR actually solves THAT problem.
- Solves it → status "ok", headline "fix confirmed", a one-line detail of what it fixes.
- Does NOT solve it → status "blocking", headline e.g. "does not fix the described problem", detail explaining the gap.
- Description too vague to tell what is being fixed → status "suggestion", headline "not enough info in the description", detail: there isn't enough information in the PR description to understand what is being fixed and how — ask the author to clarify.

## Step 2 — Alternative approach (section: "alternative") — OPTIONAL
Only if YOUR approach would be SUBSTANTIALLY better (clearly simpler, safer, or more correct — not style/preference): status "suggestion", a short headline, detail briefly describing the better approach. If the PR's approach is reasonable, do NOT call add_review_note for this step at all.

## Step 3 — Critical line-level review
Apply the project conventions; for genuinely [critical] issues call create_inline_comment (these block the merge). Do NOT add_review_note for this — the critical-review section is generated automatically from your inline comments.

### Severity filter — STRICT
- Post ONLY [critical] issues (crash/outage/data loss/security breach).
- NEVER [major]/[minor] unless the conventions say otherwise. When in doubt — skip.

## Step 4 — CI checks (section: "ci")
Use get_pr_checks and compare against the expected CI check set in the project conventions (match by name prefix; ignore version/edition suffixes).
- A required check FAILED or is entirely MISSING / no runs at all → status "blocking", headline e.g. "no runs found" or "Static Tests failed". The detail MUST be a markdown LIST of the expected checks that are missing or failed (one per line, "- Name"), not prose.
- Checks still pending/running → status "suggestion", headline "still running".
- All required checks passed → status "ok", headline "all required checks passed".
(Detailed failure analysis is another bot's job — here just presence and pass/fail.)

## Step 5 — Test coverage (section: "coverage")
Check whether the PR adds or updates a test covering the problem from step 1.
- Missing → status "suggestion", headline e.g. "No tests added for <Class>", detail: a SHORT, HIGH-LEVEL recommendation. Recommend only top-level scenarios to cover (integration/functional level at minimum) — do NOT prescribe unit tests, do NOT enumerate detailed cases or assertions. Keep it to a few bullets and let the developer decide how.
- Present → status "ok", headline "covered by tests".

## Blocking vs non-blocking
Only these block the merge (REQUEST_CHANGES): the PR not fixing the described problem (step 1, blocking), a failed/missing required check (step 4, blocking), and [critical] inline issues (step 3). Suggestions and "ok" results never block.
`.trim();
