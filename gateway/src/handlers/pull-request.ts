import type { IEventBus, ReviewRequestedEvent, AnalystQuestionAskedEvent } from '@blin/event-bus';
import type { EmitterWebhookEvent } from '@octokit/webhooks';

type PullRequestEvent = EmitterWebhookEvent<'pull_request'>;
type PullRequestReviewCommentEvent = EmitterWebhookEvent<'pull_request_review_comment'>;

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

export async function handleReviewComment(
  event: PullRequestReviewCommentEvent,
  bus: IEventBus
): Promise<void> {
  const { payload } = event;

  if (payload.action !== 'created') return;
  if (payload.comment.user.type === 'Bot') return;

  const botMention = '@blin-bot';
  if (!payload.comment.body.includes(botMention)) return;

  const analystEvent: AnalystQuestionAskedEvent = {
    type: 'analyst.question_asked',
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name,
    },
    pr: extractPr(payload.pull_request),
    commentId: payload.comment.id,
    question: payload.comment.body.replace(botMention, '').trim(),
    askedBy: payload.comment.user.login,
    installationId: payload.installation!.id,
  };

  await bus.publish(analystEvent);
}
