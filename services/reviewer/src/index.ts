import type { IEventBus, ReviewRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';
import { knowledgePacks } from './knowledge/index.js';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';
const MAX_ITERATIONS = 20;
const DEFAULT_READ_LIMIT = 200;
const MAX_READ_LIMIT = 1000;

const DEFAULT_CONFIG = {
  knowledge: ['basic'] as string[],
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

type HunkRange = { start: number; end: number };
type FileHunks = {
  rightHunks: HunkRange[];
  leftHunks: HunkRange[];
  rightLines: Map<number, string>;
  leftLines: Map<number, string>;
};
type DiffMap = Map<string, FileHunks>;

function processDiff(diff: string): { annotated: string; map: DiffMap } {
  const lines = diff.split('\n');
  const result: string[] = [];
  const map: DiffMap = new Map();

  let currentFile: string | null = null;
  let currentFileHunks: FileHunks | null = null;
  let rightHunk: HunkRange | null = null;
  let leftHunk: HunkRange | null = null;
  let oldLine = 0;
  let newLine = 0;

  const closeHunks = () => {
    if (currentFileHunks) {
      if (rightHunk) currentFileHunks.rightHunks.push(rightHunk);
      if (leftHunk) currentFileHunks.leftHunks.push(leftHunk);
    }
    rightHunk = null;
    leftHunk = null;
  };

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      closeHunks();
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = m ? m[2] : null;
      if (currentFile) {
        currentFileHunks = {
          rightHunks: [],
          leftHunks: [],
          rightLines: new Map(),
          leftLines: new Map(),
        };
        map.set(currentFile, currentFileHunks);
      } else {
        currentFileHunks = null;
      }
      result.push(line);
    } else if (line.startsWith('@@')) {
      closeHunks();
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push(line);
    } else if (line.startsWith('+++') || line.startsWith('---')) {
      result.push(line);
    } else if (line.startsWith('+')) {
      const content = line.slice(1);
      result.push(`+[RIGHT:${newLine}] ${content}`);
      if (currentFileHunks) currentFileHunks.rightLines.set(newLine, content);
      if (!rightHunk) rightHunk = { start: newLine, end: newLine };
      else rightHunk.end = newLine;
      newLine++;
    } else if (line.startsWith('-')) {
      const content = line.slice(1);
      result.push(`-[LEFT:${oldLine}] ${content}`);
      if (currentFileHunks) currentFileHunks.leftLines.set(oldLine, content);
      if (!leftHunk) leftHunk = { start: oldLine, end: oldLine };
      else leftHunk.end = oldLine;
      oldLine++;
    } else if (line.startsWith('\\')) {
      result.push(line);
    } else if (line.startsWith(' ')) {
      const content = line.slice(1);
      result.push(` [RIGHT:${newLine}] ${content}`);
      if (currentFileHunks) {
        currentFileHunks.rightLines.set(newLine, content);
        currentFileHunks.leftLines.set(oldLine, content);
      }
      if (!rightHunk) rightHunk = { start: newLine, end: newLine };
      else rightHunk.end = newLine;
      if (!leftHunk) leftHunk = { start: oldLine, end: oldLine };
      else leftHunk.end = oldLine;
      oldLine++;
      newLine++;
    } else {
      result.push(line);
    }
  }
  closeHunks();

  return { annotated: result.join('\n'), map };
}

function validateCommentLine(
  map: DiffMap,
  path: string,
  side: 'RIGHT' | 'LEFT',
  line: number,
  startLine: number | undefined,
  anchorExcerpt: string
): string | null {
  const file = map.get(path);
  if (!file) {
    const known = [...map.keys()].join(', ') || '(none)';
    return `File "${path}" is not in the diff. Files in diff: ${known}`;
  }
  const hunks = side === 'RIGHT' ? file.rightHunks : file.leftHunks;
  if (hunks.length === 0) {
    return `No ${side} hunks for "${path}". Try side=${side === 'RIGHT' ? 'LEFT' : 'RIGHT'}.`;
  }
  const ranges = hunks.map(h => `${h.start}-${h.end}`).join(', ');
  const target = hunks.find(h => line >= h.start && line <= h.end);
  if (!target) {
    return `Line ${line} on side ${side} is not in any diff hunk for "${path}". Valid ${side} ranges: ${ranges}. Pick a line from one of those ranges.`;
  }
  if (startLine !== undefined) {
    if (startLine > line) return `start_line (${startLine}) must be <= line (${line})`;
    if (startLine < target.start || startLine > target.end) {
      return `start_line ${startLine} must be in the same hunk as line ${line} (hunk: ${target.start}-${target.end})`;
    }
  }

  const lineMap = side === 'RIGHT' ? file.rightLines : file.leftLines;
  const anchorLine = startLine ?? line;
  const actualContent = lineMap.get(anchorLine);
  if (actualContent === undefined) {
    return `Line ${anchorLine} on side ${side} has no recorded content for "${path}".`;
  }
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const actualNorm = normalize(actualContent);
  const expectedNorm = normalize(anchorExcerpt);
  if (actualNorm !== expectedNorm) {
    return `anchor_excerpt does not match line ${anchorLine} on side ${side} of "${path}".\n  expected: ${JSON.stringify(expectedNorm)}\n  actual:   ${JSON.stringify(actualNorm)}\nPick the line whose content matches the code you want to comment on.`;
  }
  return null;
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
      description: `Read a slice of a file in the repository at the PR head commit. Returns lines with explicit line numbers (matching diff RIGHT line numbers) plus a footer telling you the total line count and what is missing. Paginate with offset+limit instead of re-reading the same file.`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to repo root' },
            offset: { type: 'number', description: `1-based line to start from. Default 1.` },
            limit: { type: 'number', description: `Max lines to return. Default ${DEFAULT_READ_LIMIT}, max ${MAX_READ_LIMIT}.` },
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
            anchor_excerpt: {
              type: 'string',
              description: 'The exact text content (without the [RIGHT:N]/[LEFT:N] prefix or leading +/- ) of the anchor line — start_line if set, otherwise line. Used to verify you picked the right line. Whitespace is normalized.',
            },
          },
          required: ['path', 'line', 'body', 'anchor_excerpt'],
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
- read_file: read a slice of any file in the repo for full context. Paginate with offset+limit when the footer says more lines exist — do NOT re-read the same file/range expecting different output
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
- The diff from get_pr_diff annotates every line with its exact line number: \`+[RIGHT:42]\` means added line 42 (use side=RIGHT, line=42), \`-[LEFT:41]\` means removed line 41 (use side=LEFT, line=41), \` [RIGHT:42]\` means context line 42 (use side=RIGHT, line=42)
- Always read the line number directly from the annotation — never count lines yourself
- The anchor line is the line your comment is attached to (start_line if you use a range, otherwise line). It must be the line containing the actual code you are discussing — not a docblock above it, not a closing brace below, not the first line of the hunk. Find the exact line whose content is what your comment is about, and use that line's number from its [RIGHT:N]/[LEFT:N] annotation
- You MUST pass anchor_excerpt: the exact text of the anchor line (everything after the \`[RIGHT:N]\` / \`[LEFT:N]\` prefix). The server rejects the comment if it doesn't match — this is your safety check that you picked the right line
- Prefer multi-line ranges (start_line + line) over single-line comments whenever the issue concerns more than one line. If you discuss a whole function, loop, conditional, or block — highlight the entire span, not just the first line. Single-line comments are only for issues genuinely confined to one line (a typo, a single bad call, one missing semicolon). start_line must be ≤ line and both must be in the same diff hunk
- If the relevant code is completely outside any diff hunk (not visible in the diff at all), do NOT post an inline comment — skip it
- Comment body is rendered as GitHub markdown — write human prose, not raw diff syntax. NEVER paste \`@@ ... @@\` hunk headers, \`---\`/\`+++\` file headers, or \`[RIGHT:N]\`/\`[LEFT:N]\` annotations into the body. If you need to quote code, use a normal markdown code block

When done reviewing, say "Review complete." and stop calling tools.`;

interface ReviewContext {
  octokit: any;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  pat: string | undefined;
  pr: { title: string; body: string | null; base: string; head: string };
  diffMap: DiffMap | null;
}

async function loadDiffMap(ctx: ReviewContext): Promise<{ annotated: string; map: DiffMap }> {
  const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    headers: { accept: 'application/vnd.github.v3.diff' },
  });
  const processed = processDiff(String(data));
  ctx.diffMap = processed.map;
  return processed;
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
      const { annotated } = await loadDiffMap(ctx);
      return annotated;
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
        const allLines = content.split('\n');
        const totalLines = allLines.length;

        const offset = Math.max(1, Math.floor(input.offset ?? 1));
        const limit = Math.min(MAX_READ_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_READ_LIMIT)));

        if (offset > totalLines) {
          return `File ${input.path} has ${totalLines} lines. offset=${offset} is past the end.`;
        }

        const endLine = Math.min(totalLines, offset + limit - 1);
        const slice = allLines.slice(offset - 1, endLine);
        const numbered = slice.map((l, i) => `${offset + i}\t${l}`).join('\n');

        const footer: string[] = [`--- showing lines ${offset}-${endLine} of ${totalLines} ---`];
        if (endLine < totalLines) {
          footer.push(`To read more, call read_file again with offset=${endLine + 1}.`);
        }
        if (offset > 1) {
          footer.push(`Earlier lines (1-${offset - 1}) are not shown.`);
        }

        return `${numbered}\n${footer.join(' ')}`;
      } catch (err: any) {
        return `Error reading file: ${err.message}`;
      }
    }

    case 'create_inline_comment': {
      if (!ctx.diffMap) await loadDiffMap(ctx);
      const side = (input.side ?? 'RIGHT') as 'RIGHT' | 'LEFT';

      console.log(`[reviewer][comment] === incoming call ===`);
      console.log(`[reviewer][comment] path=${input.path}`);
      console.log(`[reviewer][comment] line=${input.line} start_line=${input.start_line ?? '(none)'} side=${side}`);
      console.log(`[reviewer][comment] anchor_excerpt=${JSON.stringify(input.anchor_excerpt)}`);
      console.log(`[reviewer][comment] body=${JSON.stringify(input.body?.slice(0, 200))}${input.body?.length > 200 ? '...' : ''}`);

      const file = ctx.diffMap!.get(input.path);
      if (file) {
        const lineMap = side === 'RIGHT' ? file.rightLines : file.leftLines;
        const anchorLine = input.start_line ?? input.line;
        const endLine = input.line;
        console.log(`[reviewer][comment] actual line ${anchorLine}=${JSON.stringify(lineMap.get(anchorLine))}`);
        if (anchorLine !== endLine) {
          console.log(`[reviewer][comment] actual line ${endLine}=${JSON.stringify(lineMap.get(endLine))}`);
        }
      } else {
        console.log(`[reviewer][comment] file NOT in diff. known files: ${[...ctx.diffMap!.keys()].join(', ')}`);
      }

      if (typeof input.anchor_excerpt !== 'string' || input.anchor_excerpt.trim() === '') {
        console.warn(`[reviewer][comment] REJECTED: missing anchor_excerpt`);
        return `REJECTED: anchor_excerpt is required. Copy the exact text of the anchor line (start_line if set, otherwise line) from the diff — without the [RIGHT:N] prefix.`;
      }
      const validationError = validateCommentLine(
        ctx.diffMap!,
        input.path,
        side,
        input.line,
        input.start_line,
        input.anchor_excerpt
      );
      if (validationError) {
        console.warn(`[reviewer][comment] REJECTED: ${validationError}`);
        return `REJECTED: ${validationError} The diff annotations show [RIGHT:N] for new-file lines and [LEFT:N] for old-file lines — copy both the number and the content exactly from there.`;
      }

      const requestBody = {
        body: input.body,
        path: input.path,
        line: input.line,
        ...(input.start_line ? { start_line: input.start_line, start_side: side } : {}),
        side,
        commit_id: ctx.headSha,
      };
      console.log(`[reviewer][comment] POST /pulls/${ctx.pullNumber}/comments body=${JSON.stringify({ ...requestBody, body: '<omitted>' })}`);

      const res = await fetch(
        `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.pullNumber}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ctx.pat}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error(`[reviewer][comment] github API failed (${res.status}): ${err}`);
        return `Failed to post comment on ${input.path}:${input.line} (side: ${side}): ${err}`;
      }
      const created = await res.json() as any;
      console.log(`[reviewer][comment] SUCCESS id=${created.id} url=${created.html_url}`);
      console.log(`[reviewer][comment] github attached to line=${created.line} start_line=${created.start_line ?? '(none)'} side=${created.side} original_line=${created.original_line}`);
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
      diffMap: null,
    };

    const messages: any[] = [
      { role: 'user', content: [{ text: `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}` }] },
    ];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      console.log(`[reviewer] --- iteration ${i + 1}/${MAX_ITERATIONS} ---`);
      const response = await callBedrock(SYSTEM_PROMPT, messages, TOOLS);
      messages.push({ role: 'assistant', content: response.content });

      for (const block of response.content) {
        if (block.text) {
          console.log(`[reviewer] claude text: ${block.text.slice(0, 300)}${block.text.length > 300 ? '...' : ''}`);
        }
      }

      if (response.stopReason === 'end_turn') {
        console.log(`[reviewer] done PR #${event.pr.number}`);
        break;
      }

      const toolResults: any[] = [];
      for (const block of response.content) {
        if (block.toolUse) {
          console.log(`[reviewer] tool: ${block.toolUse.name} input=${JSON.stringify(block.toolUse.input).slice(0, 500)}`);
          const result = await executeTool(block.toolUse.name, block.toolUse.input, ctx);
          console.log(`[reviewer] tool result (first 300 chars): ${result.slice(0, 300)}${result.length > 300 ? '...' : ''}`);
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
