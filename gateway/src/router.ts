import { Webhooks } from '@octokit/webhooks';
import type { IEventBus } from '@blin/event-bus';
import { handlePullRequest, handleReviewComment } from './handlers/pull-request';
import { handleCheckRun } from './handlers/check-run';

export function registerWebhookHandlers(webhooks: Webhooks, bus: IEventBus): void {
  webhooks.on('pull_request', (event) => handlePullRequest(event, bus));
  webhooks.on('pull_request_review_comment', (event) => handleReviewComment(event, bus));
  webhooks.on('check_run', (event) => handleCheckRun(event, bus));

  webhooks.onError((error) => {
    console.error('[gateway] webhook error:', error.message);
  });
}
