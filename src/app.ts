import express from 'express';
import pinoHttp from 'pino-http';
import { InstanceConfigService } from './config/instance-config-service';
import type { AppRuntimeConfig } from './models/instance-config';
import { HealthController } from './controllers/health-controller';
import { InstallationsController } from './controllers/installations-controller';
import { IssuesController } from './controllers/issues-controller';
import { WebhookController } from './controllers/webhook-controller';
import { OctokitClientFactory } from './github/octokit-client-factory';
import { createErrorHandler } from './middleware/error-handler';
import { createWebhookSignatureVerifier } from './middleware/webhook-signature';
import { createApiRouter, createWebhookRouter } from './routes';
import { InMemoryCreatedIssueRepository } from './services/in-memory-created-issue-repository';
import { InMemoryInstallationRepository } from './services/in-memory-installation-repository';
import { InstallationService } from './services/installation-service';
import { IssueService } from './services/issue-service';
import { createLogger } from './utils/logger';

export const createApp = (runtimeConfig: AppRuntimeConfig) => {
  const configService = new InstanceConfigService(runtimeConfig);
  const logger = createLogger(configService.getLogLevel());
  const installationRepository = new InMemoryInstallationRepository();
  const createdIssueRepository = new InMemoryCreatedIssueRepository();
  const octokitFactory = new OctokitClientFactory(configService, logger);
  const installationService = new InstallationService(installationRepository, configService, octokitFactory, logger);
  const issueService = new IssueService(createdIssueRepository, octokitFactory, installationService, logger);

  const healthController = new HealthController();
  const installationsController = new InstallationsController(installationService);
  const issuesController = new IssuesController(issueService);
  const webhookController = new WebhookController(installationService, logger);

  const app = express();
  app.use(pinoHttp({ logger }));
  app.use('/webhook/:instance', express.raw({ type: 'application/json', limit: '1mb' }), createWebhookSignatureVerifier(configService), createWebhookRouter(webhookController));
  app.use(express.json({ limit: '1mb' }));
  app.use(createApiRouter(healthController, installationsController, issuesController));
  app.use(createErrorHandler(logger));

  return { app, logger, configService };
};
