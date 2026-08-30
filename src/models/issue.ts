export interface CreateIssueInput {
  instance: string;
  installationId: number;
  owner: string;
  repo: string;
  title: string;
  body: string;
}

export interface StoredIssueRecord {
  dedupeKey: string;
  instanceKey: string;
  installationId: number;
  owner: string;
  repo: string;
  title: string;
  body: string;
  issueNumber: number;
  issueUrl: string;
  createdAt: string;
}

export interface CreatedIssueRepository {
  findByDedupeKey(dedupeKey: string): Promise<StoredIssueRecord | undefined>;
  save(record: StoredIssueRecord): Promise<void>;
}
