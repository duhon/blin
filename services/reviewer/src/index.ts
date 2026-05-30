import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { IEventBus, ReviewRequestedEvent, ReviewThreadReplyEvent, PrClosedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';
import { BedrockAgent, type AgentTool } from '@blin/agent';
import { getPrDescriptionTool, listPrFilesTool, getPrCommitsTool, getPrChecksTool, getPrReviewsTool, getReviewCommentsTool, getReviewThreadsTool, type GitHubToolContext } from '@blin/github-tools';
import { knowledgePacks } from './knowledge/index.js';

const s3 = new S3Client({});
const MEMORY_BUCKET = process.env.BLIN_MEMORY_BUCKET;

const MAX_ITERATIONS = 20;
const DEFAULT_READ_LIMIT = 200;
const MAX_READ_LIMIT = 1000;

const DEFAULT_CONFIG = {
  // The review plan and Magento conventions (incl. the expected CI check set)
  // load by default. They live in knowledge so a repo can override how reviews
  // run via .github/blin.yml → knowledge: [ ... ]. The stable core (tool
  // protocol, output format, lifecycle) stays in SYSTEM_PROMPT.
  knowledge: ['review-plan', 'basic', 'magento'] as string[],
  context_files: [] as string[],
};

/** Convert the converse-style tool specs to @blin/agent AgentTools, delegating execution to `exec`. */
function toAgentTools(
  specs: Array<{ toolSpec: { name: string; description: string; inputSchema: { json: Record<string, unknown> } } }>,
  exec: (name: string, input: any) => Promise<string>,
): AgentTool[] {
  return specs.map((s) => ({
    name: s.toolSpec.name,
    description: s.toolSpec.description,
    inputSchema: s.toolSpec.inputSchema.json,
    run: (input: any) => exec(s.toolSpec.name, input),
  }));
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
      description: 'Get the project conventions, coding standards, architecture rules, and accumulated memory from previous reviews of this repository. Always call this first before reviewing.',
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'save_repo_memory',
      description: `Persist accumulated knowledge about this repository to S3 for future reviews (used when learning from a closed PR). Merge new facts with existing memory — never discard what was already there, only add or correct.

STRICT FORMAT — output exactly these four sections, no others:

## Architecture
Key architectural patterns, module structure, DI conventions, layer boundaries. Omit runtime versions — those are auto-detected from composer.json/package.json.

## Conventions
Coding conventions, test patterns, fixture conventions, naming rules specific to this repo. Only things not obvious from the language/framework.

## False positives — do not flag
Bullet list of finding categories that are NOT real issues in this repo. Be specific about WHY each is safe here.
Example: "- Missing setAccessible() before setValue() — repo requires PHP >=8.1 where it is optional"

## Patterns to watch
Recurring risky patterns specific to this codebase that are worth flagging when seen again. Be specific.`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Memory content following the strict four-section format described above.',
            },
          },
          required: ['content'],
        },
      },
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
      name: 'add_review_note',
      description: `Record a PR-level finding for one step of the review plan (NOT tied to a code line). Each call becomes one collapsible section in the final review. Call it once per applicable step (fix / ci / coverage always; alternative only when relevant).`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            section: { type: 'string', enum: ['fix', 'alternative', 'threads', 'ci', 'coverage'], description: 'Which review-plan step this is.' },
            status: { type: 'string', enum: ['ok', 'suggestion', 'blocking'], description: 'ok = fine (✅); suggestion = non-blocking advice (💡); blocking = must fix before merge (🔴).' },
            headline: { type: 'string', description: 'Short status shown on the collapsed header line, e.g. "no runs found", "No tests added for FeedMigrator", "fix confirmed".' },
            detail: { type: 'string', description: 'The collapsed body (markdown). For ci, a markdown LIST of the missing/failed checks. Keep it minimal.' },
          },
          required: ['section', 'status', 'headline', 'detail'],
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

You have tools to explore the PR, post inline comments, and record general findings:
- get_project_conventions: the project conventions, the REVIEW PLAN you must follow, the expected CI check set, and accumulated memory from past reviews
- get_pr_description: understand the purpose of the PR
- get_pr_commits: the PR's commit messages — extra intent when the description is thin
- get_pr_diff: see what changed
- list_pr_files: see all changed files
- get_pr_checks: CI check statuses for the PR — whether tests ran and passed
- get_pr_reviews: reviews already submitted on this PR (any author) and their verdicts
- get_review_comments: inline-comment threads already on this PR (any author)
- get_review_threads: inline review threads with their resolution status (resolved / unresolved)
- read_file: read a slice of any file in the repo for full context. Paginate with offset+limit when the footer says more lines exist — do NOT re-read the same file/range expecting different output
- create_inline_comment: post a comment on a specific line (for [critical] line-level issues)
- add_review_note: record a PR-level finding for the final review summary

NEVER DUPLICATE: before recording anything, call get_pr_reviews and get_review_comments to see what has already been said on this PR by anyone (human or bot, on this or an earlier commit). Do NOT raise a point — inline or in the summary — that has already been raised. Only record genuinely NEW findings. If there is nothing new to add, record nothing and submit no comments.

How to run a review:
1. ALWAYS call get_project_conventions FIRST. It returns the "Review plan" you must follow step by step, plus the project conventions and the expected CI checks. Follow that plan — do not invent your own.
2. Work the plan: use add_review_note for PR-level findings (set blocking only as the plan dictates) and create_inline_comment for [critical] line-level issues.
3. When finished, say "Review complete." and stop calling tools.

Rules for inline comments:
- The diff from get_pr_diff annotates every line with its exact line number: \`+[RIGHT:42]\` means added line 42 (use side=RIGHT, line=42), \`-[LEFT:41]\` means removed line 41 (use side=LEFT, line=41), \` [RIGHT:42]\` means context line 42 (use side=RIGHT, line=42)
- Always read the line number directly from the annotation — never count lines yourself
- The anchor line is the line your comment is attached to (start_line if you use a range, otherwise line). It must be the line containing the actual code you are discussing — not a docblock above it, not a closing brace below, not the first line of the hunk. Find the exact line whose content is what your comment is about, and use that line's number from its [RIGHT:N]/[LEFT:N] annotation
- You MUST pass anchor_excerpt: the exact text of the anchor line (everything after the \`[RIGHT:N]\` / \`[LEFT:N]\` prefix). The server rejects the comment if it doesn't match — this is your safety check that you picked the right line
- Prefer multi-line ranges (start_line + line) over single-line comments whenever the issue concerns more than one line. If you discuss a whole function, loop, conditional, or block — highlight the entire span, not just the first line. Single-line comments are only for issues genuinely confined to one line (a typo, a single bad call, one missing semicolon). start_line must be ≤ line and both must be in the same diff hunk
- If the relevant code is completely outside any diff hunk (not visible in the diff at all), do NOT post an inline comment — skip it
- Comment body is rendered as GitHub markdown — write human prose, not raw diff syntax. NEVER paste \`@@ ... @@\` hunk headers, \`---\`/\`+++\` file headers, or \`[RIGHT:N]\`/\`[LEFT:N]\` annotations into the body. If you need to quote code, use a normal markdown code block

When done reviewing, say "Review complete." and stop calling tools.`;

// Tools used when learning retrospectively from a closed PR (read-only + memory write).
const LEARN_TOOL_NAMES = new Set(['get_project_conventions', 'get_pr_diff', 'read_file', 'save_repo_memory']);
const LEARN_TOOLS = TOOLS.filter((t) => LEARN_TOOL_NAMES.has(t.toolSpec.name));

const LEARN_SYSTEM_PROMPT = `A pull request was just CLOSED. Learn from the whole review retrospectively and persist a reusable lesson for future reviews of this repo. You do NOT post anything to the PR.

The user message tells you whether the PR was MERGED (changes accepted) or closed WITHOUT merge (changes rejected) — that is the ground-truth outcome.

Steps:
1. get_project_conventions — read the current conventions and accumulated memory, so you MERGE rather than duplicate.
2. Gather the review: get_pr_reviews (verdicts), get_review_comments (the inline threads/conversations), get_pr_diff and read_file as needed to understand the code.
3. Infer the lessons:
   - Findings that were addressed/fixed (especially in a MERGED PR) → what kind of problem gets fixed here → "## Patterns to watch" / "## Conventions".
   - Findings dismissed as unnecessary (valid counter-argument, or agreed fine) → "## False positives — do not flag" so future reviews stop raising them.
   - HUMAN-to-human review discussions are the HIGHEST-VALUE signal — prioritize learning from them.
   - A merged PR's accepted patterns are good; a rejected (closed-unmerged) PR's approach is a cautionary signal.
4. save_repo_memory with the MERGED memory in the strict four-section format — keep all existing content, only add or refine.

Record GENERAL, reusable lessons, not one-off specifics. If there is nothing generalizable to learn, do not call save_repo_memory and just stop.`;

interface ReviewContext {
  octokit: any;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  defaultBranch: string;
  pat: string | undefined;
  pr: { title: string; body: string | null; base: string; head: string };
  diffMap: DiffMap | null;
  commentsPosted: number;
  /** Per-step findings from the review plan, rendered as collapsible sections in the final review body. */
  reviewNotes: Array<{ section: string; status: string; headline: string; detail: string }>;
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

      // Auto-detect runtime constraints from project manifests
      const composerJson = await readFile('composer.json');
      if (composerJson) {
        try {
          const composer = JSON.parse(composerJson);
          const constraints: string[] = [];
          if (composer.require?.php) constraints.push(`php: ${composer.require.php}`);
          const extensions = Object.entries(composer.require ?? {})
            .filter(([k]) => k.startsWith('ext-'))
            .map(([k, v]) => `${k}: ${v}`);
          if (extensions.length) constraints.push(...extensions);
          if (composer['require-dev']?.php) constraints.push(`php (dev): ${composer['require-dev'].php}`);
          if (constraints.length) {
            sections.push(`## Project runtime constraints (composer.json)\n${constraints.map(c => `- ${c}`).join('\n')}\n\nDo NOT flag issues that only affect versions outside these constraints.`);
          }
        } catch {}
      }

      const packageJson = await readFile('package.json');
      if (packageJson) {
        try {
          const pkg = JSON.parse(packageJson);
          if (pkg.engines && Object.keys(pkg.engines).length > 0) {
            const engines = Object.entries(pkg.engines).map(([k, v]) => `- ${k}: ${v}`).join('\n');
            sections.push(`## Project runtime constraints (package.json)\n${engines}\n\nDo NOT flag issues that only affect versions outside these constraints.`);
          }
        } catch {}
      }

      for (const path of contextFiles) {
        const content = await readFile(path);
        if (content) sections.push(`## ${path}\n${content}`);
      }

      // Load semantic memory from S3
      if (MEMORY_BUCKET) {
        try {
          const s3res = await s3.send(new GetObjectCommand({
            Bucket: MEMORY_BUCKET,
            Key: `${ctx.owner}/${ctx.repo}/memory.md`,
          }));
          const memory = await s3res.Body!.transformToString();
          if (memory) sections.push(`## Repo memory (accumulated knowledge from previous reviews)\n${memory}`);
        } catch {}
      }

      return sections.length > 0
        ? sections.join('\n\n')
        : 'No project conventions configured. Apply general best practices.';
    }

    case 'get_pr_diff': {
      const { annotated } = await loadDiffMap(ctx);
      return annotated;
    }

    case 'add_review_note': {
      ctx.reviewNotes.push({
        section: String(input.section ?? 'fix'),
        status: String(input.status ?? 'suggestion'),
        headline: String(input.headline ?? '').trim(),
        detail: String(input.detail ?? '').trim(),
      });
      return `Noted (${input.section}: ${input.status}).`;
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
        body: `${input.body}\n<!-- blin -->`,
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
      ctx.commentsPosted++;
      return 'Comment posted successfully';
    }

    case 'save_repo_memory': {
      if (!MEMORY_BUCKET) return 'Memory storage not configured (BLIN_MEMORY_BUCKET not set)';
      const key = `${ctx.owner}/${ctx.repo}/memory.md`;
      await s3.send(new PutObjectCommand({
        Bucket: MEMORY_BUCKET,
        Key: key,
        Body: input.content,
        ContentType: 'text/markdown',
      }));
      console.log(`[reviewer][memory] saved s3://${MEMORY_BUCKET}/${key}`);
      return 'Memory saved successfully';
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
      defaultBranch: prData.base.repo.default_branch,
      pat: process.env.GITHUB_REVIEWER_PAT,
      pr: {
        title: event.pr.title,
        body: event.pr.body,
        base: prData.base.ref,
        head: prData.head.ref,
      },
      diffMap: null,
      commentsPosted: 0,
      reviewNotes: [],
    };

    const userRequest = event.instructions
      ? `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}\n\nSpecific request from ${event.requestedBy}: ${event.instructions}`
      : `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}`;

    // Generic read-only GitHub tools come from the shared package; the
    // specialized ones (diff-annotated get_pr_diff/read_file, create_inline_comment)
    // and non-GitHub ones (conventions, memory) stay local in executeTool.
    const toolCtx: GitHubToolContext = {
      octokit: ctx.octokit,
      owner: ctx.owner,
      repo: ctx.repo,
      prNumber: ctx.pullNumber,
      ref: ctx.headSha,
    };

    const agent = new BedrockAgent({ logPrefix: `[reviewer] PR #${event.pr.number}`, maxIterations: MAX_ITERATIONS });
    await agent.run({
      instructions: SYSTEM_PROMPT,
      request: userRequest,
      tools: [
        // save_repo_memory is excluded here — learning happens only on PR close.
        ...toAgentTools(TOOLS.filter((t) => t.toolSpec.name !== 'save_repo_memory'), (name, input) => executeTool(name, input, ctx)),
        getPrDescriptionTool(toolCtx),
        listPrFilesTool(toolCtx),
        getPrCommitsTool(toolCtx),
        getPrChecksTool(toolCtx),
        getPrReviewsTool(toolCtx),
        getReviewCommentsTool(toolCtx),
        getReviewThreadsTool(toolCtx),
      ],
    });

    // Assemble the final review: one collapsible section per review-plan step,
    // ordered fix → alternative → critical review → ci → coverage. Verdict:
    // REQUEST_CHANGES on any blocking section or critical inline issues;
    // COMMENT if there are only suggestions; APPROVE if everything is ok.
    const ICON: Record<string, string> = { ok: '✅', suggestion: '💡', blocking: '🔴' };
    const TITLE: Record<string, string> = { fix: 'Fix verification', alternative: 'Alternative approach', threads: 'Review threads', ci: 'CI checks', coverage: 'Test coverage' };
    const section = (icon: string, title: string, headline: string, detail: string) =>
      `<details>\n<summary>${icon} ${title}: ${headline}</summary>\n\n${detail}\n\n</details>`;

    const notesOf = (s: string) => ctx.reviewNotes.filter((n) => n.section === s);
    const parts: string[] = [];
    for (const s of ['fix', 'alternative']) {
      for (const n of notesOf(s)) parts.push(section(ICON[n.status] ?? '💡', TITLE[s], n.headline, n.detail));
    }
    if (ctx.commentsPosted > 0) {
      const n = ctx.commentsPosted;
      parts.push(section('🔴', 'Critical review', `${n} issue${n > 1 ? 's' : ''}`, `Found ${n} critical inline issue${n > 1 ? 's' : ''} — see the comments below.`));
    }
    for (const s of ['threads', 'ci', 'coverage']) {
      for (const n of notesOf(s)) parts.push(section(ICON[n.status] ?? '💡', TITLE[s], n.headline, n.detail));
    }

    // Nothing new to say (everything was already raised on the PR) — don't post
    // a duplicate review.
    if (parts.length === 0) {
      console.log(`[reviewer] PR #${event.pr.number}: nothing new to add, skipping review submission`);
      return;
    }

    // Only APPROVE / REQUEST_CHANGES resolve a requested review — a COMMENT
    // review leaves the reviewer stuck "pending". So non-blocking findings
    // still APPROVE (they don't block the merge); only blocking ones request
    // changes.
    const hasBlocking = ctx.commentsPosted > 0 || ctx.reviewNotes.some((n) => n.status === 'blocking');
    const reviewEvent = hasBlocking ? 'REQUEST_CHANGES' : 'APPROVE';

    const titleLine = hasBlocking
      ? '## 🔴 Review complete — changes requested'
      : parts.length > 0
        ? '## ✅ Review complete — approved, with notes'
        : '## ✅ Review complete — approved';
    const reviewBody = `${titleLine}\n\n${parts.length > 0 ? parts.join('\n\n') : 'Looks good to me 👍'}`;

    const reviewRes = await fetch(
      `https://api.github.com/repos/${event.repo.owner}/${event.repo.name}/pulls/${event.pr.number}/reviews`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.pat}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body: reviewBody, event: reviewEvent }),
      }
    );
    if (reviewRes.ok) {
      console.log(`[reviewer] PR #${event.pr.number} review submitted: ${reviewEvent}`);
    } else {
      console.error(`[reviewer] failed to submit review: ${reviewRes.status} ${await reviewRes.text()}`);
    }
  });

  bus.subscribe<ReviewThreadReplyEvent>('review.thread_reply', async (event) => {
    console.log(`[reviewer] thread reply in PR #${event.pr.number} by ${event.reply.author}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);
    const pat = process.env.GITHUB_REVIEWER_PAT;

    const THREAD_SYSTEM_PROMPT = `You are a senior engineer who posted an inline code review comment. Someone has replied to your comment — read their reply, consider their argument, and respond directly in the thread.

You can use read_file to look up more context if needed.

Write your reply as your FINAL message — just the reply text in GitHub markdown (it is posted verbatim into the thread). Do not call any tool to post it.

Be concise. If their argument is valid, acknowledge it and explain if you're retracting the finding. If you still believe the issue is real, explain why clearly. Do not repeat the original finding verbatim.`;

    const THREAD_TOOLS = [
      {
        toolSpec: {
          name: 'read_file',
          description: `Read a slice of a file in the repository for context.`,
          inputSchema: {
            json: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path relative to repo root' },
                offset: { type: 'number', description: '1-based line to start from. Default 1.' },
                limit: { type: 'number', description: `Max lines to return. Default ${DEFAULT_READ_LIMIT}, max ${MAX_READ_LIMIT}.` },
              },
              required: ['path'],
            },
          },
        },
      },
    ];

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
      defaultBranch: prData.base.repo.default_branch,
      pat,
      pr: {
        title: event.pr.title,
        body: event.pr.body,
        base: prData.base.ref,
        head: prData.head.ref,
      },
      diffMap: null,
      commentsPosted: 0,
      reviewNotes: [],
    };

    const threadExecuteTool = async (name: string, input: any): Promise<string> => {
      if (name === 'read_file') return executeTool('read_file', input, ctx);
      return `Unknown tool: ${name}`;
    };

    const initialMessage = `You previously commented on \`${event.originalComment.path}\` line ${event.originalComment.line}:

> ${event.originalComment.body}

${event.reply.author} replied:

> ${event.reply.body}

Respond to their reply.`;

    const agent = new BedrockAgent({ logPrefix: `[reviewer] thread PR #${event.pr.number}`, maxIterations: MAX_ITERATIONS });
    const { text } = await agent.run({
      instructions: THREAD_SYSTEM_PROMPT,
      request: initialMessage,
      tools: toAgentTools(THREAD_TOOLS, threadExecuteTool),
    });

    const replyText = text.trim();
    if (!replyText) {
      console.error(`[reviewer][thread] PR #${event.pr.number}: agent produced no reply text, skipping`);
      return;
    }

    // The agent's final text IS the reply — post it into the thread.
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
          body: `${replyText}\n<!-- blin -->`,
          in_reply_to: event.originalComment.id,
        }),
      }
    );
    if (!res.ok) {
      console.error(`[reviewer][thread] reply failed (${res.status}): ${await res.text()}`);
    } else {
      console.log(`[reviewer][thread] reply posted on PR #${event.pr.number}`);
    }
  });

  // Learn retrospectively from a closed PR: look at the reviews, threads, diff
  // and the merged/rejected outcome, distill reusable lessons, and merge them
  // into the repo memory. Posts nothing to the PR.
  bus.subscribe<PrClosedEvent>('pr.closed', async (event) => {
    console.log(`[reviewer] PR #${event.pr.number} closed (merged=${event.merged}) — learning`);
    if (!MEMORY_BUCKET) {
      console.log(`[reviewer] BLIN_MEMORY_BUCKET not set — cannot learn, skipping`);
      return;
    }

    const octokit = await githubApp.getInstallationOctokit(event.installationId);
    let prData: any;
    try {
      ({ data: prData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: event.repo.owner,
        repo: event.repo.name,
        pull_number: event.pr.number,
      }));
    } catch (err) {
      console.error(`[reviewer] learn: failed to fetch PR #${event.pr.number}:`, err);
      return;
    }

    const ctx: ReviewContext = {
      octokit,
      owner: event.repo.owner,
      repo: event.repo.name,
      pullNumber: event.pr.number,
      headSha: prData.head.sha,
      defaultBranch: prData.base.repo.default_branch,
      pat: process.env.GITHUB_REVIEWER_PAT,
      pr: { title: event.pr.title, body: event.pr.body, base: prData.base.ref, head: prData.head.ref },
      diffMap: null,
      commentsPosted: 0,
      reviewNotes: [],
    };
    const toolCtx: GitHubToolContext = { octokit, owner: ctx.owner, repo: ctx.repo, prNumber: ctx.pullNumber, ref: ctx.headSha };

    const request =
      `PR #${event.pr.number} "${event.pr.title}" was just closed — ${event.merged ? 'MERGED (changes accepted)' : 'CLOSED WITHOUT MERGE (changes rejected)'}.\n\n` +
      `Review the whole PR retrospectively with the tools and update the repo memory with what you learn.`;

    const agent = new BedrockAgent({ logPrefix: `[reviewer] learn PR #${event.pr.number}`, maxIterations: MAX_ITERATIONS });
    await agent.run({
      instructions: LEARN_SYSTEM_PROMPT,
      request,
      tools: [
        ...toAgentTools(LEARN_TOOLS, (name, input) => executeTool(name, input, ctx)),
        getPrReviewsTool(toolCtx),
        getReviewCommentsTool(toolCtx),
      ],
    });
  });
}
