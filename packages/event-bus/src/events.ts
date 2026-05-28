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

// Analyst
export interface AnalystQuestionAskedEvent {
  type: 'analyst.question_asked';
  repo: Repository;
  pr: PullRequest;
  commentId: number;
  question: string;
  askedBy: string;
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

// Butler
export interface PrMentionEvent {
  type: 'pr.mention';
  repo: Repository;
  pr: PullRequest;
  comment: string;
  commentId: number;
  author: string;
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
  | AnalystQuestionAskedEvent
  | TestsRunRequestedEvent
  | CheckRunCompletedEvent
  | ReleaseRequestedEvent
  | EnvironmentRequestedEvent
  | PrMentionEvent;

export type EventType = BlinEvent['type'];
