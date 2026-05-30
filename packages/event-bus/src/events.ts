export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  base: string;
  head: string;
}

export interface Repository {
  owner: string;
  name: string;
  fullName: string;
}

// Reviewer
export interface ReviewRequestedEvent {
  type: 'review.requested';
  repo: Repository;
  pr: PullRequest;
  requestedBy: string;
  instructions?: string;
  installationId: number;
}

export interface ReviewCommentCreatedEvent {
  type: 'review.comment_created';
  repo: Repository;
  pr: PullRequest;
  commentId: number;
  commentBody: string;
  author: string;
  inReplyToId: number | null;
  diffHunk: string;
  path: string;
  installationId: number;
}

// Tester
export interface TestsRunRequestedEvent {
  type: 'tests.run_requested';
  repo: Repository;
  pr: PullRequest;
  installationId: number;
}

export interface CheckRunCompletedEvent {
  type: 'tests.check_run_completed';
  repo: Repository;
  pr: PullRequest;
  checkRunId: number;
  checkRunName: string;
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped';
  detailsUrl: string;
  installationId: number;
}

/** On-demand request (e.g. from a PR comment) to analyze the PR's current failing checks. */
export interface TestAnalysisRequestedEvent {
  type: 'tests.analysis_requested';
  repo: Repository;
  pr: PullRequest;
  requestedBy: string;
  installationId: number;
}

// Butler
export interface PrMentionEvent {
  type: 'pr.mention';
  repo: Repository;
  pr: PullRequest;
  comment: string;
  commentId: number;
  inReplyToId?: number;
  author: string;
  installationId: number;
}

export interface ReviewThreadReplyEvent {
  type: 'review.thread_reply';
  repo: Repository;
  pr: PullRequest;
  originalComment: { id: number; body: string; path: string; line: number; side: string };
  reply: { id: number; body: string; author: string };
  installationId: number;
}

/** A PR was closed (merged or not). Used to learn retrospectively from the whole review. */
export interface PrClosedEvent {
  type: 'pr.closed';
  repo: Repository;
  pr: PullRequest;
  merged: boolean;
  installationId: number;
}

// Release Manager
export interface ReleaseRequestedEvent {
  type: 'release.requested';
  repo: Repository;
  version: string;
  requestedBy: string;
  installationId: number;
}

// Environment Manager
export interface EnvironmentRequestedEvent {
  type: 'environment.requested';
  repo: Repository;
  pr: PullRequest;
  requestedBy: string;
  installationId: number;
}

export type BlinEvent =
  | ReviewRequestedEvent
  | ReviewCommentCreatedEvent
  | TestsRunRequestedEvent
  | CheckRunCompletedEvent
  | TestAnalysisRequestedEvent
  | ReleaseRequestedEvent
  | EnvironmentRequestedEvent
  | PrMentionEvent
  | ReviewThreadReplyEvent
  | PrClosedEvent;

export type EventType = BlinEvent['type'];
