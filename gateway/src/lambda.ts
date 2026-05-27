import { configure } from '@vendia/serverless-express';
import { createApp } from './app.js';

export const handler = configure({ app: createApp() });
