import type { IEventBus, CheckRunCompletedEvent, TestAnalysisRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';
import { BedrockAgent } from '@blin/agent';
import { getPrDescriptionTool, getPrDiffTool, readFileTool, type GitHubToolContext } from '@blin/github-tools';

const MAX_ITERATIONS = 8;

interface TestFailure {
  name: string;
  /** The meaningful PHPUnit error section (error/failure block + file:line), not the progress dots. */
  error: string;
}

/** One distinct failure (a unique error) and every run/edition it occurred in. */
interface FailureGroup {
  names: string[];
  error: string;
}

/** Cap how many distinct failures we feed the model / render, to bound tokens and comment size. */
const MAX_FAILURES = 10;

/** Collapse identical errors (the same test failing on B2B/CE/EE is one distinct failure). */
function dedupeFailures(failures: TestFailure[]): FailureGroup[] {
  const map = new Map<string, FailureGroup>();
  for (const f of failures) {
    const g = map.get(f.error);
    if (g) g.names.push(f.name);
    else map.set(f.error, { names: [f.name], error: f.error });
  }
  return [...map.values()];
}

/**
 * The GitHub Check Run carries no logs — `output.summary` is a list of markdown
 * links to external report files. The PHPUnit/console output is the link whose
 * URL ends in `console-error-logs.html` (the rest are Allure HTML reports).
 */
function findConsoleLogUrl(summary: string): string | null {
  const match = summary.match(/\((https?:\/\/[^)]*console-error-logs\.html)\)/i);
  return match ? match[1] : null;
}

/**
 * `output.text` opens with a `## Build configuration` section listing the
 * environment the tests ran on (Magento version, PHP version, editions, …).
 * This matters for diagnosis — a failure can be environment/version specific.
 */
function extractBuildConfig(text: string): string {
  const idx = text.indexOf('## Build configuration');
  if (idx < 0) return '';
  // Keep the essentials (version bullets sit at the top); cap to stay token-light.
  return text.slice(idx, idx + 2500).trim();
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Trim a raw PHPUnit `<pre>` block down to the part that explains the failure:
 * everything from the "There was/were N error(s)/failure(s)" marker onward
 * (the progress dots above it are noise). Falls back to the tail of the block.
 */
function extractErrorSection(pre: string): string {
  const m = pre.match(/There (?:was|were) \d+ (?:error|failure)/i);
  const section = m ? pre.slice(m.index!) : pre.slice(-2000);
  return section.slice(0, 2500).trim();
}

/**
 * The console-error-logs report is a table where each failing run is a
 * `<tr class="text-danger">` row holding a `<td class="test-name">` and a
 * `<pre>` with the raw PHPUnit output.
 */
function parseConsoleErrors(html: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const rowRe = /<tr class="text-danger">([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const block = row[1];
    const nameMatch = block.match(/<td class="test-name">([\s\S]*?)<\/td>/i);
    const preMatch = block.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (!preMatch) continue;
    failures.push({
      name: nameMatch ? stripTags(nameMatch[1]) : '(unknown)',
      error: extractErrorSection(stripTags(preMatch[1])),
    });
  }
  return failures;
}

/**
 * Split the model's "VERDICT: …\n---\n<details>" response into its two parts.
 * The agent often narrates its reasoning before the VERDICT line — anchor on
 * the VERDICT marker and discard everything before it, so only the one-line
 * verdict stays visible and the rest goes under the collapsed details.
 */
function splitVerdict(raw: string): { verdict: string; details: string } {
  // Drop any preamble before the VERDICT marker (line-anchored, allows leading ** bold).
  const anchor = raw.match(/(?:^|\n)\s*\**\s*verdict\s*\**\s*:?/i);
  const body = anchor ? raw.slice(anchor.index! + anchor[0].length) : raw;

  const sep = body.match(/\n\s*-{3,}\s*\n/);
  let verdict: string;
  let details: string;
  if (sep) {
    verdict = body.slice(0, sep.index).trim();
    details = body.slice(sep.index! + sep[0].length).trim();
  } else {
    const nl = body.indexOf('\n');
    verdict = (nl < 0 ? body : body.slice(0, nl)).trim();
    details = nl < 0 ? '' : body.slice(nl + 1).trim();
  }
  return { verdict, details };
}

const SYSTEM_PROMPT = `You are a senior PHP engineer triaging failed CI tests on a GitHub pull request for Magento.

A test can fail for one of two reasons:
1. A real defect in the PR's code (the test correctly caught a bug).
2. A problem in the test itself (flaky, wrong expectation, broken data provider, etc.).

You have tools to inspect the pull request at its head revision:
- get_pr_description — the PR title and description (the author's intent: what changed and the problem being solved). Call this FIRST. The title often carries the intent when the description is thin or empty.
- read_file — read the failing test and the code it exercises (start from the file:line in the stack trace).
- get_pr_diff — see exactly what the PR changed, and the real file paths in this repo.
INVESTIGATE before judging: start with get_pr_description for intent, then read the failing test around the reported file:line, read the code under test, and check the diff to see whether the PR changed the relevant code. A failure may be an expected consequence of the change the PR should have handled, or unrelated — weigh the intent against what the code and diff actually show. A grounded verdict beats a guess.

Critical guidance:
- DEFAULT to assuming the failure is a REAL problem in the PR's code. This is by far the most common case. Only conclude it's a test problem when the code you read clearly shows the test itself is at fault.
- NEVER suggest changing or "fixing" the test when the test has actually uncovered a real problem in the code — that would hide the bug. Fix the code, not the messenger.
- Only propose a test fix when the failure is genuinely a test-side issue (e.g. a wrong assertion, a missing/misconfigured @dataProvider, environment assumptions).
- Take the Build configuration into account (PHP version, Magento version, editions). A failure may be specific to a PHP/Magento version — say so when relevant.

You may be given several DISTINCT failures from one check. Judge each on its own merits.

When done investigating, respond in EXACTLY this format. Your message MUST begin with "VERDICT:" — no preamble, do NOT restate your investigation before it.

VERDICT: <one short sentence summarizing across ALL failures — how many distinct failures, and the split between code problems and test problems, e.g. "3 distinct failures: 2 code problems, 1 test problem">
---
<For EACH distinct failure, one Markdown section in this exact shape:>
### <test name(s)> — <Code problem | Test problem>
**Error:** <the key error message with file:line>
**Reasoning:** <why it fails — what you found in the code and the diff>
**Fix:** <concrete fix. If it's a code problem, point at the specific code — do NOT suggest editing the test.>

Be direct and brief. Cite the file:line you actually read. No filler.`;

/**
 * Post a PR comment via GITHUB_REVIEWER_PAT (not the App installation token),
 * so it appears under the human account — matching how the reviewer posts —
 * instead of as "blin-bot".
 */
async function postComment(
  repo: { owner: string; name: string },
  prNumber: number,
  body: string,
): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_REVIEWER_PAT}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ body: `${body}\n<!-- blin -->` }),
    },
  );
  if (!res.ok) {
    console.error(`[tester] failed to post comment on PR #${prNumber} (${res.status}): ${await res.text()}`);
  }
}

/**
 * Analyze one failed check run's PHPUnit report — investigating the repo via an
 * agent loop — and post the result as a PR comment. Returns true if a comment
 * was posted, false if there was nothing to analyze.
 */
async function analyzeAndPost(
  octokit: any,
  repo: { owner: string; name: string },
  ref: string,
  prNumber: number,
  checkRunName: string,
  checkUrl: string,
  output: { summary?: string | null; text?: string | null },
): Promise<boolean> {
  const logUrl = findConsoleLogUrl(output.summary ?? '');
  if (!logUrl) {
    console.log(`[tester] no console-error-logs link in "${checkRunName}", skipping (non-PHPUnit check)`);
    return false;
  }

  let failures: TestFailure[];
  try {
    const res = await fetch(logUrl);
    if (!res.ok) {
      console.error(`[tester] failed to fetch report ${logUrl}: ${res.status}`);
      return false;
    }
    failures = parseConsoleErrors(await res.text());
  } catch (err) {
    console.error(`[tester] error fetching/parsing report ${logUrl}:`, err);
    return false;
  }

  if (failures.length === 0) {
    console.log(`[tester] no failing tests parsed from "${checkRunName}", skipping`);
    return false;
  }

  // Collapse identical errors, then cap the distinct failures we analyze/render.
  const groups = dedupeFailures(failures);
  const shown = groups.slice(0, MAX_FAILURES);
  const omitted = groups.length - shown.length;
  console.log(`[tester] "${checkRunName}": ${failures.length} runs → ${groups.length} distinct failure(s)${omitted > 0 ? `, analyzing first ${MAX_FAILURES}` : ''}`);

  const buildConfig = extractBuildConfig(output.text ?? '');
  const failureText = shown
    .map((g, i) => `### Failure ${i + 1} — failed in: ${g.names.join(', ')}\n\n${g.error}`)
    .join('\n\n');
  const userMessage =
    `${buildConfig ? `${buildConfig}\n\n---\n\n` : ''}Check: ${checkRunName}\n` +
    `Failed tests (${shown.length} distinct):\n\n${failureText}\n\n` +
    `Investigate with get_pr_description / read_file / get_pr_diff, then give your verdict.`;

  const agent = new BedrockAgent({ logPrefix: `[tester] PR #${prNumber} "${checkRunName}"`, maxIterations: MAX_ITERATIONS });
  const toolCtx: GitHubToolContext = { octokit, owner: repo.owner, repo: repo.name, prNumber, ref };

  let raw: string;
  try {
    const result = await agent.run({
      instructions: SYSTEM_PROMPT,
      request: userMessage,
      tools: [
        getPrDescriptionTool(toolCtx),
        readFileTool(toolCtx, { stripPrefix: /^\/var\/www\/html\// }),
        getPrDiffTool(toolCtx),
      ],
    });
    raw = result.text;
  } catch (err) {
    console.error(`[tester] analysis failed for "${checkRunName}":`, err);
    return false;
  }

  const { verdict, details } = splitVerdict(raw);
  if (!verdict) return false;

  // Header + verdict stay visible; the per-failure breakdown (error → reasoning
  // → fix) and the link to the check go under a collapsed <details> so long
  // reports don't clutter the PR.
  const countLabel = groups.length > 1 ? ` · ${groups.length} distinct failures` : '';
  const omittedNote = omitted > 0 ? `\n\n_…and ${omitted} more distinct failure(s) not shown._` : '';
  const checkLink = checkUrl ? `\n\n**Check:** [${checkRunName}](${checkUrl})` : '';
  const detailsBody = `${details || '(no breakdown produced)'}${omittedNote}${checkLink}`;
  const body =
    `🧪 **Test failure — ${checkRunName}**${countLabel}\n\n${verdict}\n\n` +
    `<details>\n<summary>Details &amp; suggested fix</summary>\n\n${detailsBody}\n\n</details>`;
  await postComment(repo, prNumber, body);
  console.log(`[tester] posted failure analysis for "${checkRunName}" on PR #${prNumber}`);
  return true;
}

export function register(bus: IEventBus, githubApp: App): void {
  // Automatic: a check run finished with a failure.
  bus.subscribe<CheckRunCompletedEvent>('tests.check_run_completed', async (event) => {
    if (event.conclusion !== 'failure') {
      console.log(`[tester] check run ${event.checkRunName} concluded ${event.conclusion}, skipping`);
      return;
    }
    console.log(`[tester] analyzing failed check run "${event.checkRunName}" in PR #${event.pr.number}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/check-runs/{check_run_id}', {
        owner: event.repo.owner,
        repo: event.repo.name,
        check_run_id: event.checkRunId,
      });
      await analyzeAndPost(octokit, event.repo, data.head_sha, event.pr.number, event.checkRunName, data.html_url ?? event.detailsUrl, data.output);
    } catch (err) {
      console.error(`[tester] failed to handle check run ${event.checkRunId}:`, err);
    }
  });

  // On-demand: someone asked (via PR comment) to analyze the PR's current
  // failures. Find the failing checks and fan out one tests.check_run_completed
  // event per check, so each is analyzed independently and in parallel (rather
  // than one giant analysis that risks token/time limits with many failures).
  bus.subscribe<TestAnalysisRequestedEvent>('tests.analysis_requested', async (event) => {
    console.log(`[tester] on-demand analysis for PR #${event.pr.number} requested by ${event.requestedBy}`);
    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    try {
      // The PR object from a comment lacks the head sha — fetch it.
      const { data: pr } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: event.repo.owner,
        repo: event.repo.name,
        pull_number: event.pr.number,
      });

      const { data: checks } = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
        owner: event.repo.owner,
        repo: event.repo.name,
        ref: pr.head.sha,
        per_page: 100,
      });

      const failed = checks.check_runs.filter((c) => c.conclusion === 'failure');
      console.log(`[tester] ${failed.length}/${checks.total_count} checks failing on ${pr.head.sha.slice(0, 7)}`);

      if (failed.length === 0) {
        await postComment(event.repo, event.pr.number,
          `## 🧪 Test failure analysis\n\nNo failing checks on the latest commit (\`${pr.head.sha.slice(0, 7)}\`) — everything's green. ✅`);
        return;
      }

      // Fan out: one event per failing check → the per-check handler above runs
      // them concurrently (the bus dispatches via Promise.all).
      await Promise.all(failed.map((c) => bus.publish({
        type: 'tests.check_run_completed',
        repo: event.repo,
        pr: event.pr,
        checkRunId: c.id,
        checkRunName: c.name,
        conclusion: 'failure',
        detailsUrl: c.details_url ?? '',
        installationId: event.installationId,
      })));
    } catch (err) {
      console.error(`[tester] on-demand analysis failed for PR #${event.pr.number}:`, err);
    }
  });
}
