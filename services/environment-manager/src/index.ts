import type { IEventBus, EnvironmentRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<EnvironmentRequestedEvent>('environment.requested', async (event) => {
    console.log(`[environment-manager] preview requested for PR #${event.pr.number}`);

    console.log(`[environment-manager] would create deployment for PR #${event.pr.number} (mock)`);
  });
}
