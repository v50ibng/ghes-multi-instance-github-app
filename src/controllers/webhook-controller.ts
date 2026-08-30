import type { Request, Response } from 'express';
import type pino from 'pino';
import type { InstallationRepositoriesWebhookPayload, InstallationWebhookPayload } from '../models/webhook';
import { AppError } from '../utils/errors';
import { InstallationService } from '../services/installation-service';

export class WebhookController {
  constructor(
    private readonly installationService: InstallationService,
    private readonly logger: pino.Logger,
  ) {}

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const instanceKey = Array.isArray(req.params.instance) ? req.params.instance[0] : req.params.instance;
    const event = req.header('x-github-event');
    const delivery = req.header('x-github-delivery');

    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(400, 'Webhook request body is not a buffer');
    }

    const payload = JSON.parse(req.body.toString('utf8')) as InstallationWebhookPayload;

    this.logger.info({ instance: instanceKey, event, delivery }, 'Received GHES webhook');

    switch (event) {
      case 'ping':
        res.status(200).json({ ok: true, instance: instanceKey, event });
        return;
      case 'installation':
        await this.installationService.handleInstallationEvent(instanceKey, payload);
        res.status(202).json({ received: true, event, instance: instanceKey });
        return;
      case 'installation_repositories':
        await this.installationService.handleInstallationRepositoriesEvent(instanceKey, payload as InstallationRepositoriesWebhookPayload);
        res.status(202).json({ received: true, event, instance: instanceKey });
        return;
      default:
        res.status(202).json({ received: true, ignored: true, event, instance: instanceKey });
    }
  }
}
