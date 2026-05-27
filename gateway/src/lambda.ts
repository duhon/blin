import { createWebhooks } from './setup.js';

const webhooks = createWebhooks();

export const handler = async (event: {
  requestContext?: { http?: { method?: string } };
  headers: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}) => {
  if (event.requestContext?.http?.method === 'GET') {
    console.log('[lambda] GET health check');
    return { statusCode: 200, body: 'ok' };
  }

  const eventName = event.headers['x-github-event'];
  const deliveryId = event.headers['x-github-delivery'];

  const body = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body ?? '';

  let action: string | undefined;
  try {
    action = JSON.parse(body).action;
  } catch {}

  console.log(`[lambda] event=${eventName}${action ? `.${action}` : ''} delivery=${deliveryId}`);

  try {
    await webhooks.verifyAndReceive({
      id: deliveryId,
      name: eventName as any,
      signature: event.headers['x-hub-signature-256'],
      payload: body,
    });
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('[lambda] error:', (err as Error).message);
    return { statusCode: 400, body: 'Bad Request' };
  }
};
