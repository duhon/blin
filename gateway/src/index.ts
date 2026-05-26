import express from 'express';
import { App } from '@octokit/app';
import { Webhooks } from '@octokit/webhooks';
import { InMemoryEventBus } from '@blin/event-bus';
import { registerWebhookHandlers } from './router';
import { register as registerReviewer } from '@blin/reviewer';
import { register as registerAnalyst } from '@blin/analyst';
import { register as registerTester } from '@blin/tester';
import { register as registerReleaseManager } from '@blin/release-manager';
import { register as registerEnvironmentManager } from '@blin/environment-manager';

const app = express();
const bus = new InMemoryEventBus();

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
});

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

registerWebhookHandlers(webhooks, bus);

registerReviewer(bus, githubApp);
registerAnalyst(bus, githubApp);
registerTester(bus, githubApp);
registerReleaseManager(bus, githubApp);
registerEnvironmentManager(bus, githubApp);

app.post('/webhooks', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    await webhooks.verifyAndReceive({
      id: req.headers['x-github-delivery'] as string,
      name: req.headers['x-github-event'] as string,
      signature: req.headers['x-hub-signature-256'] as string,
      payload: req.body.toString(),
    });
    res.status(200).send('ok');
  } catch (err) {
    console.error('[gateway] error:', (err as Error).message);
    res.status(400).send('Bad Request');
  }
});

app.get('/health', (_, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[gateway] listening on port ${PORT}`));
