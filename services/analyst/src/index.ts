import type { IEventBus, AnalystQuestionAskedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<AnalystQuestionAskedEvent>('analyst.question_asked', async (event) => {
    console.log(`[analyst] question in PR #${event.pr.number} from ${event.askedBy}`);

    const octokit = await githubApp.getInstallationOctokit(event.installationId);

    await octokit.rest.discussions.createForRepo?.({
      owner: event.repo.owner,
      repo: event.repo.name,
      title: `PR #${event.pr.number} — ${event.pr.title}`,
      body: '👋 **blin-bot mock discussion**\n\nThis is a placeholder discussion. Real AI analysis coming soon.',
      category_id: 0,
    }).catch(() => {
      // Discussions API may not be available on all repos
      console.log('[analyst] discussions not available, skipping');
    });
  });
}
