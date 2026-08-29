export interface InstallationRecord {
  installationId: number;
  instanceKey: string;
  accountLogin: string;
  targetType: string;
  repositorySelection: string;
  suspendedAt?: string | null;
  lastKnownRepositories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InstallationRepository {
  upsert(record: InstallationRecord): Promise<InstallationRecord>;
  delete(instanceKey: string, installationId: number): Promise<void>;
  list(): Promise<InstallationRecord[]>;
  findByInstallationId(installationId: number): Promise<InstallationRecord[]>;
  findByInstanceAndInstallationId(instanceKey: string, installationId: number): Promise<InstallationRecord | undefined>;
}
