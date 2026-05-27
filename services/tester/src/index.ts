import type { IEventBus, CheckRunCompletedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<CheckRunCompletedEvent>('tests.check_run_completed', async (event) => {
    console.log(`[tester] check run failed: ${event.checkRunName} in PR #${event.pr.number}`);

    console.log(`[tester] would post CI analysis for PR #${event.pr.number} (mock)`);
  });
}
