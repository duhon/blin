import type { IEventBus, ReviewRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';

async function callBedrock(prompt: string): Promise<string> {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(BEDROCK_MODEL)}/converse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  return data?.output?.message?.content?.[0]?.text ?? '';
}

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReviewRequestedEvent>('review.requested', async (event) => {
    console.log(`[reviewer] reviewing PR #${event.pr.number} in ${event.repo.fullName}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    const { data: diffData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
      headers: { accept: 'application/vnd.github.v3.diff' },
    });

    const diff = String(diffData).slice(0, 12000);

    const prompt = `You are a senior engineer reviewing a pull request.

PR title: "${event.pr.title}"

## Task
Review the diff below. Focus on: security vulnerabilities, bugs, correctness issues, code quality and performance.
Be concise. Only report real issues. If no issues found, respond with only: "✅ No significant issues found."

## Diff
${diff}`;

    const review = await callBedrock(prompt);
    console.log(`[reviewer] posting review on PR #${event.pr.number}`);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
      body: `## 🤖 blin-bot review\n\n${review}`,
      event: 'COMMENT',
    });

    console.log(`[reviewer] done PR #${event.pr.number}`);
  });
}
