import express from 'express';
import { createWebhooks } from './setup.js';

export function createApp() {
  const webhooks = createWebhooks();
  const app = express();

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

  return app;
}
