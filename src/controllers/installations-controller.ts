import type { Request, Response } from 'express';
import { InstallationService } from '../services/installation-service';

export class InstallationsController {
  constructor(private readonly installationService: InstallationService) {}

  async listInstallations(_req: Request, res: Response): Promise<void> {
    const installations = await this.installationService.listInstallations();
    res.status(200).json({ installations });
  }

  async listRepositories(req: Request, res: Response): Promise<void> {
    const installationIdParam = Array.isArray(req.params.installationId) ? req.params.installationId[0] : req.params.installationId;
    const installationId = Number.parseInt(installationIdParam, 10);
    const instance = typeof req.query.instance === 'string' ? req.query.instance : undefined;
    const repositories = await this.installationService.listRepositories(installationId, instance);
    res.status(200).json(repositories);
  }
}
