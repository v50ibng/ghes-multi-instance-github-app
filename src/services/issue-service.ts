import type pino from 'pino';
import { OctokitClientFactory } from '../github/octokit-client-factory';
import type { CreateIssueInput, CreatedIssueRepository } from '../models/issue';
import { buildIssueDedupeKey } from '../utils/github';
import { InstallationService } from './installation-service';

export class IssueService {
  constructor(
    private readonly issueRepository: CreatedIssueRepository,
    private readonly octokitFactory: OctokitClientFactory,
    private readonly installationService: InstallationService,
    private readonly logger: pino.Logger,
  ) {}

  async createIssue(input: CreateIssueInput) {
    await this.installationService.assertInstallationMapping(input.instance, input.installationId);

    const dedupeKey = buildIssueDedupeKey(
      input.instance,
      input.installationId,
      input.owner,
      input.repo,
      input.title,
      input.body,
    );

    const existing = await this.issueRepository.findByDedupeKey(dedupeKey);
    if (existing) {
      this.logger.info({ dedupeKey, instance: input.instance, installationId: input.installationId }, 'Duplicate issue request detected; returning existing issue');
      return {
        created: false,
        dedupeKey,
        issueNumber: existing.issueNumber,
        issueUrl: existing.issueUrl,
      };
    }

    const { octokit, apiBaseUrl } = await this.octokitFactory.createInstallationClient(input.instance, input.installationId);
    const createdIssue = await octokit.rest.issues.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
    });

    await this.issueRepository.save({
      dedupeKey,
      instanceKey: input.instance,
      installationId: input.installationId,
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
      issueNumber: createdIssue.data.number,
      issueUrl: createdIssue.data.html_url,
      createdAt: new Date().toISOString(),
    });

    return {
      created: true,
      dedupeKey,
      apiBaseUrl,
      issueNumber: createdIssue.data.number,
      issueUrl: createdIssue.data.html_url,
    };
  }
}
