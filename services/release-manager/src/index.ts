import type { IEventBus, ReleaseRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<ReleaseRequestedEvent>('release.requested', async (event) => {
    console.log(`[release-manager] release ${event.version} requested in ${event.repo.fullName}`);

    console.log(`[release-manager] would create release ${event.version} (mock)`);
  });
}
