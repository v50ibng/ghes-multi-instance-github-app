import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryCreatedIssueRepository } from '../src/services/in-memory-created-issue-repository';
import { IssueService } from '../src/services/issue-service';
import { createLogger } from '../src/utils/logger';

test('createIssue returns the previously created issue when an identical request is retried', async () => {
  const issueRepository = new InMemoryCreatedIssueRepository();
  let createCallCount = 0;

  const installationService = {
    assertInstallationMapping: async () => undefined,
  } as never;

  const octokitFactory = {
    createInstallationClient: async (instanceKey: string, installationId: number) => ({
      instanceKey,
      apiBaseUrl: 'https://ghes1.company.com/api/v3',
      accessToken: 'token',
      octokit: {
        rest: {
          issues: {
            create: async () => {
              createCallCount += 1;
              return {
                data: {
                  number: 77,
                  html_url: 'https://ghes1.company.com/octo-org/demo/issues/77',
                },
              };
            },
          },
        },
      },
    }),
  } as never;

  const service = new IssueService(issueRepository, octokitFactory, installationService, createLogger('silent'));

  const request = {
    instance: 'ghes1',
    installationId: 12345,
    owner: 'octo-org',
    repo: 'demo',
    title: 'Test Issue',
    body: 'Created by GitHub App',
  };

  const firstResponse = await service.createIssue(request);
  const secondResponse = await service.createIssue(request);

  assert.equal(firstResponse.created, true);
  assert.equal(secondResponse.created, false);
  assert.equal(secondResponse.issueNumber, 77);
  assert.equal(createCallCount, 1);
});

test('createIssue coalesces concurrent duplicate requests before creating a GitHub issue', async () => {
  const issueRepository = new InMemoryCreatedIssueRepository();
  let createCallCount = 0;

  const installationService = {
    assertInstallationMapping: async () => undefined,
  } as never;

  const octokitFactory = {
    createInstallationClient: async (instanceKey: string, installationId: number) => ({
      instanceKey,
      apiBaseUrl: 'https://ghes1.company.com/api/v3',
      accessToken: 'token',
      octokit: {
        rest: {
          issues: {
            create: async () => {
              createCallCount += 1;
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                data: {
                  number: 78,
                  html_url: 'https://ghes1.company.com/octo-org/demo/issues/78',
                },
              };
            },
          },
        },
      },
    }),
  } as never;

  const service = new IssueService(issueRepository, octokitFactory, installationService, createLogger('silent'));

  const request = {
    instance: 'ghes1',
    installationId: 12345,
    owner: 'octo-org',
    repo: 'demo',
    title: 'Concurrent Issue',
    body: 'Created by GitHub App',
  };

  const [firstResponse, secondResponse] = await Promise.all([
    service.createIssue(request),
    service.createIssue(request),
  ]);

  assert.equal(firstResponse.created, true);
  assert.equal(secondResponse.created, false);
  assert.equal(firstResponse.issueNumber, 78);
  assert.equal(secondResponse.issueNumber, 78);
  assert.equal(createCallCount, 1);
});
