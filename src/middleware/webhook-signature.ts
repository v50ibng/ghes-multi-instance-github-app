import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { InstanceConfigService } from '../config/instance-config-service';
import { AppError } from '../utils/errors';

const isSignatureValid = (payload: Buffer, secret: string, signature: string): boolean => {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export const createWebhookSignatureVerifier = (configService: InstanceConfigService) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const instanceKey = Array.isArray(req.params.instance) ? req.params.instance[0] : req.params.instance;
    const signature = req.header('x-hub-signature-256');
    const payload = req.body;

    if (!Buffer.isBuffer(payload)) {
      next(new AppError(400, 'Webhook payload must be provided as a raw request body'));
      return;
    }

    if (!signature) {
      next(new AppError(401, 'Missing X-Hub-Signature-256 header'));
      return;
    }

    const instance = configService.getInstance(instanceKey);
    if (!isSignatureValid(payload, instance.webhookSecret, signature)) {
      next(new AppError(401, `Invalid webhook signature for instance ${instanceKey}`));
      return;
    }

    next();
  };
};
