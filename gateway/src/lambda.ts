import { createWebhooks } from './setup.js';

const webhooks = createWebhooks();

export const handler = async (event: {
  requestContext?: { http?: { method?: string } };
  headers: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}) => {
  if (event.requestContext?.http?.method === 'GET') {
    return { statusCode: 200, body: 'ok' };
  }

  const body = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body ?? '';

  try {
    await webhooks.verifyAndReceive({
      id: event.headers['x-github-delivery'],
      name: event.headers['x-github-event'] as any,
      signature: event.headers['x-hub-signature-256'],
      payload: body,
    });
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('[lambda] error:', (err as Error).message);
    return { statusCode: 400, body: 'Bad Request' };
  }
};
