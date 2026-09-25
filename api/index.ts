import { createApp } from '../src/app/server.js';
import type { Request, Response } from 'express';

let handler: any;

export default async function vercelHandler(req: Request, res: Response) {
  if (!handler) {
    const { app } = await createApp();
    handler = app;
  }
  return handler(req, res);
}
