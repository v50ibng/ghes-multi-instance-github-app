import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import type pino from 'pino';
import { InstanceConfigService } from '../config/instance-config-service';

export interface InstallationClientContext {
  instanceKey: string;
  apiBaseUrl: string;
  octokit: Octokit;
  accessToken: string;
}

export class OctokitClientFactory {
  constructor(
    private readonly configService: InstanceConfigService,
    private readonly logger: pino.Logger,
  ) {}

  async createInstallationClient(instanceKey: string, installationId: number): Promise<InstallationClientContext> {
    const instance = this.configService.getInstance(instanceKey);

    this.logger.info(
      {
        instance: instanceKey,
        installationId,
        appId: instance.appId,
        apiBaseUrl: instance.apiBaseUrl,
      },
      'Creating installation access token for GHES instance',
    );

    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: instance.appId,
        privateKey: instance.privateKey,
      },
      baseUrl: instance.apiBaseUrl,
    });

    const authentication = (await appOctokit.auth({
      type: 'installation',
      installationId,
    })) as { token: string };

    const octokit = new Octokit({
      auth: authentication.token,
      baseUrl: instance.apiBaseUrl,
    });

    return {
      instanceKey,
      apiBaseUrl: instance.apiBaseUrl,
      octokit,
      accessToken: authentication.token,
    };
  }
}
