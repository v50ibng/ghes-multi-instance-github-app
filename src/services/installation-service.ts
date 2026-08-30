import type pino from 'pino';
import { InstanceConfigService } from '../config/instance-config-service';
import { OctokitClientFactory } from '../github/octokit-client-factory';
import type { InstallationRecord, InstallationRepository } from '../models/installation';
import type { InstallationRepositoriesWebhookPayload, InstallationWebhookPayload } from '../models/webhook';
import { AppError } from '../utils/errors';

const now = (): string => new Date().toISOString();

const mergeRepositories = (existing: string[], added: string[], removed: string[]): string[] => {
  const repositorySet = new Set(existing);
  added.forEach((repository) => repositorySet.add(repository));
  removed.forEach((repository) => repositorySet.delete(repository));
  return Array.from(repositorySet).sort((left, right) => left.localeCompare(right));
};

export class InstallationService {
  constructor(
    private readonly installationRepository: InstallationRepository,
    private readonly configService: InstanceConfigService,
    private readonly octokitFactory: OctokitClientFactory,
    private readonly logger: pino.Logger,
  ) {}

  async listInstallations(): Promise<InstallationRecord[]> {
    return this.installationRepository.list();
  }

  async resolveInstallationInstance(installationId: number, requestedInstance?: string): Promise<string> {
    if (requestedInstance) {
      this.configService.getInstance(requestedInstance);
      return requestedInstance;
    }

    const matches = await this.installationRepository.findByInstallationId(installationId);
    if (matches.length === 0) {
      throw new AppError(404, `No stored installation mapping found for installation ${installationId}`);
    }

    if (matches.length > 1) {
      throw new AppError(409, `Installation ${installationId} exists on multiple GHES instances. Supply the instance query parameter.`);
    }

    return matches[0].instanceKey;
  }

  async assertInstallationMapping(instanceKey: string, installationId: number): Promise<void> {
    this.configService.getInstance(instanceKey);
    const exactMatch = await this.installationRepository.findByInstanceAndInstallationId(instanceKey, installationId);
    if (exactMatch) {
      return;
    }

    const matches = await this.installationRepository.findByInstallationId(installationId);
    if (matches.length > 0) {
      throw new AppError(409, `Installation ${installationId} is mapped to ${matches.map((record) => record.instanceKey).join(', ')} but not ${instanceKey}`);
    }

    this.logger.warn({ instance: instanceKey, installationId }, 'No stored installation mapping found; proceeding because request specified the instance explicitly');
  }

  async listRepositories(installationId: number, requestedInstance?: string) {
    const instanceKey = await this.resolveInstallationInstance(installationId, requestedInstance);
    const { octokit } = await this.octokitFactory.createInstallationClient(instanceKey, installationId);
    const response = await octokit.request('GET /installation/repositories');

    return {
      instance: instanceKey,
      installationId,
      totalCount: response.data.total_count,
      repositories: response.data.repositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        private: repository.private,
      })),
    };
  }

  async handleInstallationEvent(instanceKey: string, payload: InstallationWebhookPayload): Promise<void> {
    const installationId = payload.installation.id;
    const existing = await this.installationRepository.findByInstanceAndInstallationId(instanceKey, installationId);
    const repositoryNames = payload.repositories?.map((repository) => repository.full_name) ?? existing?.lastKnownRepositories ?? [];

    if (payload.action === 'deleted') {
      await this.installationRepository.delete(instanceKey, installationId);
      this.logger.info({ instance: instanceKey, installationId }, 'Removed installation from in-memory store');
      return;
    }

    const record: InstallationRecord = {
      installationId,
      instanceKey,
      accountLogin: payload.installation.account?.login ?? 'unknown',
      targetType: payload.installation.target_type ?? 'unknown',
      repositorySelection: payload.installation.repository_selection ?? 'unknown',
      suspendedAt: payload.installation.suspended_at ?? null,
      lastKnownRepositories: repositoryNames,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };

    await this.installationRepository.upsert(record);
    this.logger.info({ instance: instanceKey, installationId, action: payload.action }, 'Stored installation event payload');
  }

  async handleInstallationRepositoriesEvent(instanceKey: string, payload: InstallationRepositoriesWebhookPayload): Promise<void> {
    const installationId = payload.installation.id;
    const existing = await this.installationRepository.findByInstanceAndInstallationId(instanceKey, installationId);

    const record: InstallationRecord = {
      installationId,
      instanceKey,
      accountLogin: payload.installation.account?.login ?? existing?.accountLogin ?? 'unknown',
      targetType: payload.installation.target_type ?? existing?.targetType ?? 'unknown',
      repositorySelection: payload.installation.repository_selection ?? existing?.repositorySelection ?? 'selected',
      suspendedAt: payload.installation.suspended_at ?? existing?.suspendedAt ?? null,
      lastKnownRepositories: mergeRepositories(
        existing?.lastKnownRepositories ?? [],
        payload.repositories_added?.map((repository) => repository.full_name) ?? [],
        payload.repositories_removed?.map((repository) => repository.full_name) ?? [],
      ),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };

    await this.installationRepository.upsert(record);
    this.logger.info({ instance: instanceKey, installationId, action: payload.action }, 'Updated installation repository mapping');
  }
}
