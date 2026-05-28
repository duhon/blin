import type { IEventBus, ReviewRequestedEvent, AnalystQuestionAskedEvent, PrMentionEvent } from '@blin/event-bus';
import type { EmitterWebhookEvent } from '@octokit/webhooks';

type PullRequestEvent = EmitterWebhookEvent<'pull_request'>;
type PullRequestReviewCommentEvent = EmitterWebhookEvent<'pull_request_review_comment'>;
type IssueCommentEvent = EmitterWebhookEvent<'issue_comment'>;

function extractRepo(payload: PullRequestEvent['payload']) {
  return {
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
  };
}

function extractPr(pr: PullRequestEvent['payload']['pull_request']) {
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    base: pr.base.ref,
    head: pr.head.ref,
  };
}

export async function handlePullRequest(
  event: PullRequestEvent,
  bus: IEventBus
): Promise<void> {
  const { payload } = event;

  if (payload.action === 'review_requested') {
    const requested = (payload as any).requested_reviewer?.login ?? '';
    if (requested !== 'duhon') return;

    const reviewEvent: ReviewRequestedEvent = {
      type: 'review.requested',
      repo: extractRepo(payload),
      pr: extractPr(payload.pull_request),
      requestedBy: payload.sender.login,
      installationId: payload.installation!.id,
    };
    await bus.publish(reviewEvent);
  }

  if (payload.action === 'opened') {
    const analystEvent: AnalystQuestionAskedEvent = {
      type: 'analyst.question_asked',
      repo: extractRepo(payload),
      pr: extractPr(payload.pull_request),
      commentId: 0,
      question: '',
      askedBy: payload.sender.login,
      installationId: payload.installation!.id,
    };
    await bus.publish(analystEvent);
  }
}

export async function handleIssueComment(
  event: IssueCommentEvent,
  bus: IEventBus
): Promise<void> {
  const { payload } = event;

  if (payload.action !== 'created') return;
  if (!payload.comment.user || payload.comment.user.type === 'Bot') return;
  if (!payload.issue.pull_request) return;
  if (!payload.comment.body.toLowerCase().includes('@duhon')) return;

  const mentionEvent: PrMentionEvent = {
    type: 'pr.mention',
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name,
    },
    pr: {
      number: payload.issue.number,
      title: payload.issue.title,
      body: payload.issue.body ?? null,
      base: '',
      head: '',
    },
    comment: payload.comment.body,
    commentId: payload.comment.id,
    author: payload.comment.user.login,
    installationId: payload.installation!.id,
  };

  await bus.publish(mentionEvent);
}

export async function handleReviewComment(
  event: PullRequestReviewCommentEvent,
  bus: IEventBus
): Promise<void> {
  const { payload } = event;

  if (payload.action !== 'created') return;
  if (!payload.comment.user || payload.comment.user.type === 'Bot') return;

  const botMention = '@blin-bot';
  if (!payload.comment.body.includes(botMention)) return;

  const pr = payload.pull_request as unknown as PullRequestEvent['payload']['pull_request'];
  const analystEvent: AnalystQuestionAskedEvent = {
    type: 'analyst.question_asked',
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name,
    },
    pr: extractPr(pr),
    commentId: payload.comment.id,
    question: payload.comment.body.replace(botMention, '').trim(),
    askedBy: payload.comment.user.login,
    installationId: payload.installation!.id,
  };

  await bus.publish(analystEvent);
}
