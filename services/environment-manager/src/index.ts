import type { IEventBus, EnvironmentRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<EnvironmentRequestedEvent>('environment.requested', async (event) => {
    console.log(`[environment-manager] preview requested for PR #${event.pr.number}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    await octokit.rest.repos.createDeployment({
      owner: event.repo.owner,
      repo: event.repo.name,
      ref: event.pr.head,
      environment: `pr-${event.pr.number}`,
      description: 'blin-bot mock preview environment',
      auto_merge: false,
      required_contexts: [],
    });
  });
}
