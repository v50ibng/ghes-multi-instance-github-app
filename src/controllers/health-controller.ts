import type { Request, Response } from 'express';

export class HealthController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'ok' });
  }
}
