import type { AppRuntimeConfig, GhesInstanceConfig } from '../models/instance-config';
import { AppError } from '../utils/errors';

export class InstanceConfigService {
  constructor(private readonly config: AppRuntimeConfig) {}

  getInstance(instanceKey: string): GhesInstanceConfig {
    const instance = this.config.instances[instanceKey];
    if (!instance) {
      throw new AppError(404, `Unknown GHES instance: ${instanceKey}`);
    }

    return instance;
  }

  getAllInstances(): GhesInstanceConfig[] {
    return Object.values(this.config.instances);
  }

  getPort(): number {
    return this.config.port;
  }

  getLogLevel(): string {
    return this.config.logLevel;
  }
}
