import type { IEventBus, ReviewRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';

async function callBedrock(systemPrompt: string, userPrompt: string): Promise<string> {
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
      system: [{ text: systemPrompt }],
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  return data?.output?.message?.content?.[0]?.text ?? '';
}

interface InlineComment {
  file: string;
  line: number;
  message: string;
  suggestion: string | null;
}

// Parses unified diff and returns annotated added lines per file:
// "+42: some code" — Claude uses these line numbers directly in JSON response
function buildAnnotatedDiff(diff: string): string {
  const sections: string[] = [];
  let currentFile = '';
  let newLineNo = 0;
  let addedLines: string[] = [];

  const flush = () => {
    if (currentFile && addedLines.length > 0) {
      sections.push(`### ${currentFile}\n${addedLines.join('\n')}`);
    }
    addedLines = [];
  };

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      flush();
      currentFile = line.slice(6);
      newLineNo = 0;
    } else if (line.startsWith('@@ ')) {
      const match = line.match(/\+(\d+)/);
      newLineNo = match ? parseInt(match[1], 10) : 0;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(`+${newLineNo}: ${line.slice(1)}`);
      newLineNo++;
    } else if (!line.startsWith('-') && !line.startsWith('\\')
      && !line.startsWith('diff') && !line.startsWith('index') && !line.startsWith('---')) {
      newLineNo++;
    }
  }
  flush();

  return sections.join('\n\n');
}

const SYSTEM_PROMPT = `You are a senior engineer reviewing a pull request.
Return ONLY a valid JSON array of inline review comments.

Format:
[
  {
    "file": "<relative_file_path>",
    "line": <line_number>,
    "message": "<short review message>",
    "suggestion": "<replacement code or null>"
  }
]

Rules:
- "file" must exactly match the file path shown in the diff
- "line" must be the integer shown before the colon (e.g. "+42: code" → 42)
- "message" must be short and actionable (1-2 sentences)
- "suggestion" is the replacement code without markdown fences, or null
- Return [] if no issues found
- Do not include anything outside the JSON array`;

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReviewRequestedEvent>('review.requested', async (event) => {
    console.log(`[reviewer] reviewing PR #${event.pr.number} in ${event.repo.fullName}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    const { data: prData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
    });
    const headSha = prData.head.sha;

    const { data: diffData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
      headers: { accept: 'application/vnd.github.v3.diff' },
    });

    const annotatedDiff = buildAnnotatedDiff(String(diffData).slice(0, 16000));

    if (!annotatedDiff) {
      console.log(`[reviewer] no added lines to review in PR #${event.pr.number}`);
      return;
    }

    const userPrompt = `PR title: "${event.pr.title}"

Review the changed lines below. Focus on: bugs, security issues, correctness, code quality.

## Changed lines

${annotatedDiff}`;

    const raw = await callBedrock(SYSTEM_PROMPT, userPrompt);

    let comments: InlineComment[];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      comments = match ? JSON.parse(match[0]) : [];
    } catch {
      console.error('[reviewer] failed to parse Claude response as JSON:', raw);
      return;
    }

    if (comments.length === 0) {
      console.log(`[reviewer] no issues found in PR #${event.pr.number}`);
      return;
    }

    console.log(`[reviewer] posting ${comments.length} inline comments on PR #${event.pr.number}`);

    const pat = process.env.GITHUB_REVIEWER_PAT;
    let posted = 0;

    for (const comment of comments) {
      const body = comment.suggestion
        ? `${comment.message}\n\n\`\`\`suggestion\n${comment.suggestion}\n\`\`\``
        : comment.message;

      const res = await fetch(
        `https://api.github.com/repos/${event.repo.owner}/${event.repo.name}/pulls/${event.pr.number}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            body,
            path: comment.file,
            line: comment.line,
            commit_id: headSha,
          }),
        }
      );

      if (res.ok) {
        posted++;
      } else {
        const err = await res.text();
        console.error(`[reviewer] failed to post comment on ${comment.file}:${comment.line}: ${err}`);
      }
    }

    console.log(`[reviewer] done PR #${event.pr.number}: ${posted}/${comments.length} comments posted`);
  });
}
