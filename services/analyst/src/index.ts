import type { IEventBus, AnalystQuestionAskedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<AnalystQuestionAskedEvent>('analyst.question_asked', async (event) => {
    console.log(`[analyst] question in PR #${event.pr.number} from ${event.askedBy}`);

    console.log(`[analyst] would create discussion for PR #${event.pr.number} (mock)`);
  });
}
