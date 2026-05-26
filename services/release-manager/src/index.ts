import type { IEventBus, ReleaseRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReleaseRequestedEvent>('release.requested', async (event) => {
    console.log(`[release-manager] release ${event.version} requested in ${event.repo.fullName}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    await octokit.rest.repos.createRelease({
      owner: event.repo.owner,
      repo: event.repo.name,
      tag_name: event.version,
      name: event.version,
      body: '📦 **blin-bot mock release notes**\n\nReal AI generated release notes coming soon.',
      draft: true,
    });
  });
}
