import type { IEventBus, ReviewRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReviewRequestedEvent>('review.requested', async (event) => {
    console.log(`[reviewer] reviewing PR #${event.pr.number} in ${event.repo.fullName}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    await octokit.rest.pulls.createReview({
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number,
      body: '👋 **blin-bot mock review**\n\nThis is a placeholder review. Real AI review coming soon.',
      event: 'COMMENT',
    });
  });
}
