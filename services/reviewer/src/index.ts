import type { IEventBus, ReviewRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';
import { knowledgePacks } from './knowledge/index.js';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';
const MAX_ITERATIONS = 20;
const MAX_FILE_CHARS = 10000;

const DEFAULT_CONFIG = {
  knowledge: [] as string[],
  context_files: [] as string[],
};

interface BedrockResponse {
  content: any[];
  stopReason: string;
}

async function callBedrock(
  systemPrompt: string,
  messages: any[],
  tools: any[]
): Promise<BedrockResponse> {
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
      messages,
      toolConfig: { tools },
    }),
  });

  if (!response.ok) {
    throw new Error(`Bedrock error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  return {
    content: data.output.message.content,
    stopReason: data.stopReason,
  };
}

function annotateDiff(diff: string): string {
  const lines = diff.split('\n');
  const result: string[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push(line);
    } else if (line.startsWith('+')) {
      result.push(`+[RIGHT:${newLine}] ${line.slice(1)}`);
      newLine++;
    } else if (line.startsWith('-')) {
      result.push(`-[LEFT:${oldLine}] ${line.slice(1)}`);
      oldLine++;
    } else if (line.startsWith('\\')) {
      result.push(line);
    } else if (line.startsWith(' ')) {
      result.push(` [RIGHT:${newLine}] ${line.slice(1)}`);
      oldLine++;
      newLine++;
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

const TOOLS = [
  {
    toolSpec: {
      name: 'get_project_conventions',
      description: 'Get the project conventions, coding standards, and architecture rules defined for this repository. Always call this first before reviewing.',
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'get_pr_description',
      description: 'Get the PR title, description, and base/head branch info',
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'get_pr_diff',
      description: 'Get the full diff of the pull request',
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'list_pr_files',
      description: 'List all files changed in this PR with their status (added/modified/deleted)',
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'read_file',
      description: 'Read the current content of a file in the repository at the PR head commit',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to repo root' },
          },
          required: ['path'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'create_inline_comment',
      description: 'Post an inline review comment on a line or range of lines in the PR diff. Lines must be visible in the diff hunk (including unchanged context lines shown around changes). Use start_line+line to highlight a multi-line range.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path exactly as shown in the diff' },
            line: { type: 'number', description: 'End line of the comment (or the only line for single-line). Must be visible in the diff hunk.' },
            start_line: { type: 'number', description: 'Start line for a multi-line comment range. Must be in the same diff hunk as line. Omit for single-line comments.' },
            side: {
              type: 'string',
              enum: ['LEFT', 'RIGHT'],
              description: 'RIGHT for added/context lines in new file, LEFT for removed lines in old file. Default: RIGHT',
            },
            body: {
              type: 'string',
              description: 'Comment text. For code suggestions use: ```suggestion\\nreplacement code\\n```',
            },
          },
          required: ['path', 'line', 'body'],
        },
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a senior engineer doing a thorough code review of a pull request.

You have tools to explore the PR and post inline comments:
- get_pr_description: understand the purpose of the PR
- get_pr_diff: see what changed
- list_pr_files: see all changed files
- read_file: read any file in the repo for full context
- create_inline_comment: post a comment on a specific line

Your review process:
1. get_project_conventions — always start here to understand the project rules
2. get_pr_description — understand the purpose of the PR
3. get_pr_diff — see what changed
4. read_file as needed — get context from related files, types, interfaces
5. create_inline_comment — post comments for real issues found
6. Use \`\`\`suggestion blocks when you have a concrete fix

Be thorough but only report real issues. Skip style nitpicks.

Rules for inline comments:
- The diff from get_pr_diff annotates every line with its exact line number: `+[RIGHT:42]` means added line 42 (use side=RIGHT, line=42), `-[LEFT:41]` means removed line 41 (use side=LEFT, line=41), ` [RIGHT:42]` means context line 42 (use side=RIGHT, line=42)
- Always read the line number directly from the annotation — never count lines yourself
- Use start_line + line to highlight a multi-line range when the issue spans multiple lines; start_line must be ≤ line and both must be from the same diff hunk
- If the relevant code is completely outside any diff hunk (not visible in the diff at all), do NOT post an inline comment — skip it

When done reviewing, say "Review complete." and stop calling tools.`;

interface ReviewContext {
  octokit: any;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  pat: string | undefined;
  pr: { title: string; body: string | null; base: string; head: string };
}

async function executeTool(name: string, input: any, ctx: ReviewContext): Promise<string> {
  switch (name) {
    case 'get_project_conventions': {
      const readFile = async (path: string): Promise<string | null> => {
        try {
          const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: ctx.owner, repo: ctx.repo, path, ref: ctx.headSha,
          });
          return Buffer.from(data.content, 'base64').toString('utf8');
        } catch {
          return null;
        }
      };

      const blinYml = await readFile('.github/blin.yml');

      let knowledge = DEFAULT_CONFIG.knowledge;
      let contextFiles = DEFAULT_CONFIG.context_files;

      if (blinYml) {
        const knowledgeMatch = blinYml.match(/knowledge:\s*((?:\s+-\s+.+\n?)+)/);
        if (knowledgeMatch) {
          knowledge = [...knowledgeMatch[1].matchAll(/-\s+(\S+)/g)].map(m => m[1].trim());
        }
        const contextFilesMatch = blinYml.match(/context_files:\s*((?:\s+-\s+.+\n?)+)/);
        if (contextFilesMatch) {
          contextFiles = [...contextFilesMatch[1].matchAll(/-\s+(.+)/g)].map(m => m[1].trim());
        }
      }

      const sections: string[] = [];

      for (const name of knowledge) {
        if (knowledgePacks[name]) {
          sections.push(`## Global knowledge: ${name}\n${knowledgePacks[name]}`);
        }
      }

      for (const path of contextFiles) {
        const content = await readFile(path);
        if (content) sections.push(`## ${path}\n${content}`);
      }

      return sections.length > 0
        ? sections.join('\n\n')
        : 'No project conventions configured. Apply general best practices.';
    }

    case 'get_pr_description': {
      return JSON.stringify({
        title: ctx.pr.title,
        body: ctx.pr.body ?? '(no description)',
        base: ctx.pr.base,
        head: ctx.pr.head,
      });
    }

    case 'get_pr_diff': {
      const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: ctx.owner,
        repo: ctx.repo,
        pull_number: ctx.pullNumber,
        headers: { accept: 'application/vnd.github.v3.diff' },
      });
      return annotateDiff(String(data));
    }

    case 'list_pr_files': {
      const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: ctx.owner,
        repo: ctx.repo,
        pull_number: ctx.pullNumber,
        per_page: 100,
      });
      return JSON.stringify(data.map((f: any) => ({
        path: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      })));
    }

    case 'read_file': {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: ctx.owner,
          repo: ctx.repo,
          path: input.path,
          ref: ctx.headSha,
        });
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return content.length > MAX_FILE_CHARS
          ? content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)'
          : content;
      } catch (err: any) {
        return `Error reading file: ${err.message}`;
      }
    }

    case 'create_inline_comment': {
      const res = await fetch(
        `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.pullNumber}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ctx.pat}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            body: input.body,
            path: input.path,
            line: input.line,
            ...(input.start_line ? { start_line: input.start_line, start_side: input.side ?? 'RIGHT' } : {}),
            side: input.side ?? 'RIGHT',
            commit_id: ctx.headSha,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error(`[reviewer] failed to comment on ${input.path}:${input.line}: ${err}`);
        return `Failed to post comment on ${input.path}:${input.line} (side: ${input.side ?? 'RIGHT'}): ${err}. Make sure the line number is within a diff hunk from get_pr_diff.`;
      }
      console.log(`[reviewer] commented on ${input.path}:${input.line}`);
      return 'Comment posted successfully';
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReviewRequestedEvent>('review.requested', async (event) => {
    console.log(`[reviewer] reviewing PR #${event.pr.number} in ${event.repo.fullName}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    const { data: prData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
    });

    const ctx: ReviewContext = {
      octokit,
      owner: event.repo.owner,
      repo: event.repo.name,
      pullNumber: event.pr.number,
      headSha: prData.head.sha,
      pat: process.env.GITHUB_REVIEWER_PAT,
      pr: {
        title: event.pr.title,
        body: event.pr.body,
        base: prData.base.ref,
        head: prData.head.ref,
      },
    };

    const messages: any[] = [
      { role: 'user', content: [{ text: `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}` }] },
    ];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await callBedrock(SYSTEM_PROMPT, messages, TOOLS);
      messages.push({ role: 'assistant', content: response.content });

      if (response.stopReason === 'end_turn') {
        console.log(`[reviewer] done PR #${event.pr.number}`);
        break;
      }

      const toolResults: any[] = [];
      for (const block of response.content) {
        if (block.toolUse) {
          console.log(`[reviewer] tool: ${block.toolUse.name}`);
          const result = await executeTool(block.toolUse.name, block.toolUse.input, ctx);
          toolResults.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ text: result }],
            },
          });
        }
      }

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
    }
  });
}
