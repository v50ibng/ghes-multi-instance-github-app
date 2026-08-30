import type { CreatedIssueRepository, StoredIssueRecord } from '../models/issue';

export class InMemoryCreatedIssueRepository implements CreatedIssueRepository {
  private readonly storage = new Map<string, StoredIssueRecord>();

  async findByDedupeKey(dedupeKey: string): Promise<StoredIssueRecord | undefined> {
    return this.storage.get(dedupeKey);
  }

  async save(record: StoredIssueRecord): Promise<void> {
    this.storage.set(record.dedupeKey, record);
  }
}
