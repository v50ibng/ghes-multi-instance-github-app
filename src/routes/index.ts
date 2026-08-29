import { Router } from 'express';
import { z } from 'zod';
import { HealthController } from '../controllers/health-controller';
import { InstallationsController } from '../controllers/installations-controller';
import { IssuesController } from '../controllers/issues-controller';
import { WebhookController } from '../controllers/webhook-controller';
import { asyncHandler } from '../utils/async-handler';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';

const createIssueBodySchema = z.object({
  instance: z.string().min(1),
  installationId: z.number().int().positive(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(65536),
});

const repositoriesParamsSchema = z.object({
  installationId: z.string().regex(/^\d+$/),
});

const repositoriesQuerySchema = z.object({
  instance: z.string().min(1).optional(),
});

export const createApiRouter = (
  healthController: HealthController,
  installationsController: InstallationsController,
  issuesController: IssuesController,
): Router => {
  const router = Router();

  router.get('/health', asyncHandler((req, res) => healthController.getHealth(req, res)));
  router.get('/installations', asyncHandler((req, res) => installationsController.listInstallations(req, res)));
  router.get(
    '/repositories/:installationId',
    validateParams(repositoriesParamsSchema),
    validateQuery(repositoriesQuerySchema),
    asyncHandler((req, res) => installationsController.listRepositories(req, res)),
  );
  router.post('/create-issue', validateBody(createIssueBodySchema), asyncHandler((req, res) => issuesController.createIssue(req, res)));

  return router;
};

export const createWebhookRouter = (webhookController: WebhookController): Router => {
  const router = Router({ mergeParams: true });
  router.post('/', asyncHandler((req, res) => webhookController.handleWebhook(req, res)));
  return router;
};
