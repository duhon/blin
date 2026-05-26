import type { IEventBus, CheckRunCompletedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<CheckRunCompletedEvent>('tests.check_run_completed', async (event) => {
    console.log(`[tester] check run failed: ${event.checkRunName} in PR #${event.pr.number}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    await octokit.rest.issues.createComment({
      owner: event.repo.owner,
      repo: event.repo.name,
      issue_number: event.pr.number,
      body: `🔍 **blin-bot mock test analysis**\n\nCheck run **${event.checkRunName}** failed.\n\nReal AI failure analysis coming soon.`,
    });
  });
}
