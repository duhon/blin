import { App } from '@octokit/app';
import { Webhooks } from '@octokit/webhooks';
import { InMemoryEventBus } from '@blin/event-bus';
import { registerWebhookHandlers } from './router.js';
import { register as registerButler } from '@blin/butler';
import { register as registerReviewer } from '@blin/reviewer';
import { register as registerAnalyst } from '@blin/analyst';
import { register as registerTester } from '@blin/tester';
import { register as registerReleaseManager } from '@blin/release-manager';
import { register as registerEnvironmentManager } from '@blin/environment-manager';

export function createWebhooks(): Webhooks {
  const bus = new InMemoryEventBus();

  const rawKey = process.env.GITHUB_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
    : process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const githubApp = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: rawKey,
    webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET! },
  });

  const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET! });

  registerWebhookHandlers(webhooks, bus);
  registerButler(bus, githubApp);
  registerReviewer(bus, githubApp);
  registerAnalyst(bus, githubApp);
  registerTester(bus, githubApp);
  registerReleaseManager(bus, githubApp);
  registerEnvironmentManager(bus, githubApp);

  return webhooks;
}
