import type { IEventBus, CheckRunCompletedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';

interface TestFailure {
  name: string;
  /** The meaningful PHPUnit error section (error/failure block + file:line), not the progress dots. */
  error: string;
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

const ANALYSIS_SYSTEM_PROMPT = `You are a senior PHP engineer triaging failed CI tests on a GitHub pull request for Magento.

A test can fail for one of two reasons:
1. A real defect in the PR's code (the test correctly caught a bug).
2. A problem in the test itself (flaky, wrong expectation, broken data provider, etc.).

Critical guidance:
- DEFAULT to assuming the failure is a REAL problem in the PR's code. This is by far the most common case. Only conclude it's a test problem when the evidence clearly points there.
- NEVER suggest changing or "fixing" the test when the test has actually uncovered a real problem in the code — that would hide the bug. Fix the code, not the messenger.
- Only propose a test fix when the failure is genuinely a test-side issue (e.g. an obviously wrong assertion, a missing/misconfigured @dataProvider, environment assumptions).
- Take the Build configuration into account (PHP version, Magento version, editions, dependency versions). A failure may be specific to a PHP/Magento version — say so when relevant.

Write a concise PR comment in GitHub Markdown:
- State which test(s) failed and the core error (with file:line if present).
- Give your verdict: is this a code problem or a test problem, and why.
- Recommend a concrete next step / fix. If it's a code problem, point at the likely code area — do not suggest editing the test.
Be direct and brief. No filler.`;

async function analyzeFailures(buildConfig: string, failures: TestFailure[]): Promise<string> {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(BEDROCK_MODEL)}/converse`;

  // Collapse identical errors across runs (same test often fails on every edition).
  const unique = new Map<string, TestFailure[]>();
  for (const f of failures) {
    const key = f.error;
    (unique.get(key) ?? unique.set(key, []).get(key)!).push(f);
  }
  const failureText = [...unique.entries()]
    .map(([, group]) => `Failed in: ${group.map((g) => g.name).join(', ')}\n\n${group[0].error}`)
    .join('\n\n---\n\n');

  const userText = `${buildConfig ? `${buildConfig}\n\n---\n\n` : ''}Failed tests:\n\n${failureText}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system: [{ text: ANALYSIS_SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: userText }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  return data.output?.message?.content?.[0]?.text?.trim() ?? '';
}

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<CheckRunCompletedEvent>('tests.check_run_completed', async (event) => {
    if (event.conclusion !== 'failure') {
      console.log(`[tester] check run ${event.checkRunName} concluded ${event.conclusion}, skipping`);
      return;
    }
    console.log(`[tester] analyzing failed check run "${event.checkRunName}" in PR #${event.pr.number}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    // 1. Fetch the check run to read its output (summary links + build config).
    let summary = '';
    let text = '';
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/check-runs/{check_run_id}', {
        owner: event.repo.owner,
        repo: event.repo.name,
        check_run_id: event.checkRunId,
      });
      summary = data.output?.summary ?? '';
      text = data.output?.text ?? '';
    } catch (err) {
      console.error(`[tester] failed to fetch check run ${event.checkRunId}:`, err);
      return;
    }

    // 2. Locate the PHPUnit console-error-logs report.
    const logUrl = findConsoleLogUrl(summary);
    if (!logUrl) {
      console.log(`[tester] no console-error-logs link in "${event.checkRunName}", skipping (non-PHPUnit check)`);
      return;
    }

    // 3. Fetch and parse the report (public host, no auth).
    let failures: TestFailure[];
    try {
      const res = await fetch(logUrl);
      if (!res.ok) {
        console.error(`[tester] failed to fetch report ${logUrl}: ${res.status}`);
        return;
      }
      failures = parseConsoleErrors(await res.text());
    } catch (err) {
      console.error(`[tester] error fetching/parsing report ${logUrl}:`, err);
      return;
    }

    if (failures.length === 0) {
      console.log(`[tester] no failing tests parsed from report, skipping`);
      return;
    }
    console.log(`[tester] parsed ${failures.length} failing test run(s) from report`);

    // 4. Analyze, factoring in the build configuration.
    const buildConfig = extractBuildConfig(text);
    let analysis: string;
    try {
      analysis = await analyzeFailures(buildConfig, failures);
    } catch (err) {
      console.error(`[tester] analysis failed:`, err);
      return;
    }
    if (!analysis) {
      console.log(`[tester] empty analysis, skipping`);
      return;
    }

    // 5. Post the analysis as a PR comment.
    const body = `## 🧪 Test failure analysis — ${event.checkRunName}\n\n${analysis}\n<!-- blin -->`;
    try {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: event.repo.owner,
        repo: event.repo.name,
        issue_number: event.pr.number,
        body,
      });
      console.log(`[tester] posted failure analysis on PR #${event.pr.number}`);
    } catch (err) {
      console.error(`[tester] failed to post comment on PR #${event.pr.number}:`, err);
    }
  });
}
