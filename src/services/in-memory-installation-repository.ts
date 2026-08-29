import type { InstallationRecord, InstallationRepository } from '../models/installation';

const buildKey = (instanceKey: string, installationId: number): string => `${instanceKey}:${installationId}`;

export class InMemoryInstallationRepository implements InstallationRepository {
  private readonly storage = new Map<string, InstallationRecord>();

  async upsert(record: InstallationRecord): Promise<InstallationRecord> {
    this.storage.set(buildKey(record.instanceKey, record.installationId), record);
    return record;
  }

  async delete(instanceKey: string, installationId: number): Promise<void> {
    this.storage.delete(buildKey(instanceKey, installationId));
  }

  async list(): Promise<InstallationRecord[]> {
    return Array.from(this.storage.values()).sort((left, right) => left.instanceKey.localeCompare(right.instanceKey) || left.installationId - right.installationId);
  }

  async findByInstallationId(installationId: number): Promise<InstallationRecord[]> {
    return Array.from(this.storage.values()).filter((record) => record.installationId === installationId);
  }

  async findByInstanceAndInstallationId(instanceKey: string, installationId: number): Promise<InstallationRecord | undefined> {
    return this.storage.get(buildKey(instanceKey, installationId));
  }
}
