import type { IEventBus, CheckRunCompletedEvent } from '@blin/event-bus';
import type { EmitterWebhookEvent } from '@octokit/webhooks';

type CheckRunEvent = EmitterWebhookEvent<'check_run'>;

export async function handleCheckRun(
  event: CheckRunEvent,
  bus: IEventBus
): Promise<void> {
  const { payload } = event;

  if (payload.action !== 'completed') return;
  if (payload.check_run.conclusion === 'success') return;

  const pr = payload.check_run.pull_requests[0];
  if (!pr) return;

  const checkEvent: CheckRunCompletedEvent = {
    type: 'tests.check_run_completed',
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name,
    },
    pr: {
      number: pr.number,
      title: '',
      body: null,
      base: pr.base.ref,
      head: pr.head.ref,
    },
    checkRunId: payload.check_run.id,
    checkRunName: payload.check_run.name,
    conclusion: payload.check_run.conclusion as CheckRunCompletedEvent['conclusion'],
    detailsUrl: payload.check_run.details_url ?? '',
    installationId: payload.installation!.id,
  };

  await bus.publish(checkEvent);
}
