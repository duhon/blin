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
