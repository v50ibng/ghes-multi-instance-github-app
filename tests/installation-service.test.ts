import assert from 'node:assert/strict';
import test from 'node:test';
import { InstanceConfigService } from '../src/config/instance-config-service';
import { InMemoryInstallationRepository } from '../src/services/in-memory-installation-repository';
import { InstallationService } from '../src/services/installation-service';
import { createLogger } from '../src/utils/logger';

const runtimeConfig = {
  port: 3000,
  logLevel: 'silent',
  instancesConfigPath: 'config/instances.json',
  instances: {
    ghes1: {
      key: 'ghes1',
      name: 'GHES 1',
      baseUrl: 'https://ghes1.company.com',
      apiBaseUrl: 'https://ghes1.company.com/api/v3',
      appId: '1',
      privateKey: 'key-1',
      webhookSecret: 'secret-1',
    },
    ghes2: {
      key: 'ghes2',
      name: 'GHES 2',
      baseUrl: 'https://ghes2.company.com',
      apiBaseUrl: 'https://ghes2.company.com/api/v3',
      appId: '2',
      privateKey: 'key-2',
      webhookSecret: 'secret-2',
    },
  },
} as const;

test('resolveInstallationInstance requires explicit instance when installationId exists on multiple GHES instances', async () => {
  const repository = new InMemoryInstallationRepository();
  const service = new InstallationService(
    repository,
    new InstanceConfigService(runtimeConfig),
    { createInstallationClient: async () => ({ octokit: {} as never, apiBaseUrl: '', accessToken: '', instanceKey: 'ghes1' }) } as never,
    createLogger('silent'),
  );

  await repository.upsert({
    installationId: 12345,
    instanceKey: 'ghes1',
    accountLogin: 'octo-org',
    targetType: 'Organization',
    repositorySelection: 'all',
    lastKnownRepositories: [],
    suspendedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });
  await repository.upsert({
    installationId: 12345,
    instanceKey: 'ghes2',
    accountLogin: 'octo-org',
    targetType: 'Organization',
    repositorySelection: 'all',
    lastKnownRepositories: [],
    suspendedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });

  await assert.rejects(() => service.resolveInstallationInstance(12345), /Supply the instance query parameter/);
  assert.equal(await service.resolveInstallationInstance(12345, 'ghes2'), 'ghes2');
});
