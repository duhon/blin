/**
 * Reusable GitHub-backed AgentTools, shared across blin services.
 *
 * Each export is a factory: pass the GitHub context (an installation Octokit,
 * the repo, the PR number, the head ref) and get back an AgentTool the agent
 * can call. The tools are read-only data pulls — service-specific actions
 * (posting comments, etc.) stay in their own services.
 */

import type { AgentTool } from '@blin/agent';

export interface GitHubToolContext {
  /** An authenticated Octokit instance (e.g. App installation client). */
  octokit: any;
  owner: string;
  repo: string;
  /** PR number the tools operate on. */
  prNumber: number;
  /** Commit sha / ref for file reads (usually the PR head sha). */
  ref: string;
}

export interface ReadFileOptions {
  /** A prefix to strip from incoming paths (e.g. a CI container path like /var/www/html/). */
  stripPrefix?: RegExp | string;
  defaultLimit?: number;
  maxLimit?: number;
}

const DEFAULT_READ_LIMIT = 200;
const MAX_READ_LIMIT = 800;
const MAX_DIFF_CHARS = 12000;

/** The PR title + description — the author's intent (what changed, the problem solved). */
export function getPrDescriptionTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_pr_description',
    description: "The pull request's title and description — the author's intent: what changed and the problem being solved. The title often carries the intent when the description is thin.",
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data: pr } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber,
        });
        return JSON.stringify({
          title: pr.title,
          description: (pr.body ?? '').trim() || '(no description provided)',
          base: pr.base?.ref,
          head: pr.head?.ref,
        });
      } catch (e: any) {
        return `Could not fetch PR description: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** The unified diff of the PR (truncated if very large). */
export function getPrDiffTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_pr_diff',
    description: 'Get the unified diff of the PR to see what changed and the real file paths in this repo.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const resp: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber, mediaType: { format: 'diff' },
        });
        const diff = String(resp.data ?? '');
        if (!diff) return '(empty diff)';
        return diff.length > MAX_DIFF_CHARS ? `${diff.slice(0, MAX_DIFF_CHARS)}\n…(diff truncated)` : diff;
      } catch (e: any) {
        return `Could not fetch PR diff: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** List the files changed in the PR with their status. */
export function listPrFilesTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'list_pr_files',
    description: 'List all files changed in this PR with their status (added/modified/removed) and change counts.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber, per_page: 100,
        });
        return data.map((f: any) => `${f.status}\t+${f.additions} -${f.deletions}\t${f.filename}`).join('\n') || '(no files)';
      } catch (e: any) {
        return `Could not list PR files: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** The PR's commit messages — often the clearest statement of intent when the description is thin. */
export function getPrCommitsTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_pr_commits',
    description: "The PR's commit messages — often the clearest statement of intent when the description is thin or empty.",
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber, per_page: 100,
        });
        return data.map((c: any) => `- ${c.commit.message.split('\n')[0]}`).join('\n') || '(no commits)';
      } catch (e: any) {
        return `Could not fetch PR commits: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** The CI check runs on the PR head commit and their conclusions — to see whether tests ran and passed. */
export function getPrChecksTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_pr_checks',
    description: 'The CI check runs on the PR head commit with their status and conclusion (success/failure/…). Use it to verify the tests actually ran and passed.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
          owner: ctx.owner, repo: ctx.repo, ref: ctx.ref, per_page: 100,
        });
        if (!data.check_runs.length) return 'No check runs found on the head commit — tests may not have run.';
        const lines = data.check_runs.map((c: any) => `${c.name}: ${c.status}${c.conclusion ? ` → ${c.conclusion}` : ''}`);
        const failed = data.check_runs.filter((c: any) => c.conclusion === 'failure').length;
        const pending = data.check_runs.filter((c: any) => c.status !== 'completed').length;
        return `${data.check_runs.length} checks (${failed} failed, ${pending} still running):\n${lines.join('\n')}`;
      } catch (e: any) {
        return `Could not fetch PR checks: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** The submitted reviews on the PR and their verdicts (APPROVED / CHANGES_REQUESTED / COMMENTED). */
export function getPrReviewsTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_pr_reviews',
    description: 'The submitted reviews on the PR, each with its author, state (APPROVED/CHANGES_REQUESTED/COMMENTED) and summary body.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber, per_page: 100,
        });
        if (!data.length) return 'No formal reviews submitted.';
        return data
          .filter((r: any) => r.state !== 'PENDING')
          .map((r: any) => `@${r.user?.login} — ${r.state}${r.body ? `: ${r.body.slice(0, 500)}` : ''}`)
          .join('\n\n');
      } catch (e: any) {
        return `Could not fetch reviews: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** All inline review comments on the PR, grouped into threads (root + replies) by file:line. */
export function getReviewCommentsTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_review_comments',
    description: 'All inline review-comment threads on the PR (root comment plus replies), grouped by file:line — the conversations to learn from.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
          owner: ctx.owner, repo: ctx.repo, pull_number: ctx.prNumber, per_page: 100,
        });
        if (!data.length) return 'No inline review comments.';
        // Group replies under their root (in_reply_to_id), preserving order.
        const roots = new Map<number, any[]>();
        for (const c of data) {
          const rootId = c.in_reply_to_id ?? c.id;
          (roots.get(rootId) ?? roots.set(rootId, []).get(rootId)!).push(c);
        }
        return [...roots.values()]
          .map((thread) => {
            const head = thread[0];
            const convo = thread.map((c: any) => `  @${c.user?.login}: ${c.body}`).join('\n');
            return `Thread on ${head.path}:${head.line ?? head.original_line ?? '?'}\n${convo}`;
          })
          .join('\n\n---\n\n');
      } catch (e: any) {
        return `Could not fetch review comments: ${e?.status ?? e?.message ?? e}`;
      }
    },
  };
}

/** All inline review threads on the PR with their resolution status (needs GraphQL). */
export function getReviewThreadsTool(ctx: GitHubToolContext): AgentTool {
  return {
    name: 'get_review_threads',
    description: 'All inline review threads on the PR with their resolution status (resolved vs unresolved). Use to verify open threads have been closed (resolved or dismissed) before merge.',
    inputSchema: { type: 'object', properties: {} },
    async run(): Promise<string> {
      const query = `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved isOutdated path comments(first:1){nodes{author{login} body}}}}}}}`;
      try {
        const data: any = await ctx.octokit.graphql(query, { owner: ctx.owner, repo: ctx.repo, number: ctx.prNumber });
        const threads: any[] = data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
        if (!threads.length) return 'No review threads on this PR.';
        const unresolved = threads.filter((t) => !t.isResolved);
        const lines = threads.map((t) => {
          const c = t.comments?.nodes?.[0];
          const who = c?.author?.login ? `@${c.author.login}: ` : '';
          const snippet = c?.body ? String(c.body).replace(/\s+/g, ' ').slice(0, 80) : '';
          return `${t.isResolved ? 'resolved' : 'UNRESOLVED'} — ${t.path}${t.isOutdated ? ' (outdated)' : ''}: ${who}${snippet}`;
        });
        return `${threads.length} thread(s), ${unresolved.length} unresolved:\n${lines.join('\n')}`;
      } catch (e: any) {
        return `Could not fetch review threads: ${e?.message ?? e}`;
      }
    },
  };
}

/** Read a slice of a file at the context ref, returned with line numbers. */
export function readFileTool(ctx: GitHubToolContext, opts: ReadFileOptions = {}): AgentTool {
  const defaultLimit = opts.defaultLimit ?? DEFAULT_READ_LIMIT;
  const maxLimit = opts.maxLimit ?? MAX_READ_LIMIT;
  return {
    name: 'read_file',
    description: `Read a slice of a file at the PR head revision, returned with line numbers. Paginate with offset+limit (default ${defaultLimit}, max ${maxLimit}).`,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repo-relative file path.' },
        offset: { type: 'number', description: '1-based start line. Default 1.' },
        limit: { type: 'number', description: `Max lines to return. Default ${defaultLimit}, max ${maxLimit}.` },
      },
      required: ['path'],
    },
    async run(input: any): Promise<string> {
      let path = String(input.path ?? '').trim();
      if (opts.stripPrefix) path = path.replace(opts.stripPrefix as any, '');
      path = path.replace(/^\/+/, '');
      if (!path) return 'Provide a non-empty path.';
      const offset = Math.max(1, Number(input.offset) || 1);
      const limit = Math.min(Number(input.limit) || defaultLimit, maxLimit);
      try {
        const { data } = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: ctx.owner, repo: ctx.repo, path, ref: ctx.ref,
        });
        if (Array.isArray(data) || data.type !== 'file' || !data.content) {
          return `'${path}' is not a readable file (maybe a directory).`;
        }
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const lines = content.split('\n');
        const out = lines.slice(offset - 1, offset - 1 + limit).map((l, i) => `${offset + i}\t${l}`).join('\n');
        const footer = `\n\n(file has ${lines.length} lines; showed ${offset}–${Math.min(offset + limit - 1, lines.length)})`;
        return (out || '(no lines in that range)') + footer;
      } catch (e: any) {
        return `Could not read '${path}' at ${ctx.ref.slice(0, 7)}: ${e?.status ?? e?.message ?? e}. Use get_pr_diff to discover the real file paths in this repo.`;
      }
    },
  };
}
