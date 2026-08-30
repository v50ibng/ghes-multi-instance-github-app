export interface InstanceConfigFileEntry {
  key: string;
  name?: string;
  baseUrl: string;
  appIdEnv: string;
  privateKeyEnv: string;
  webhookSecretEnv: string;
}

export interface InstanceConfigFile {
  instances: InstanceConfigFileEntry[];
}

export interface GhesInstanceConfig {
  key: string;
  name: string;
  baseUrl: string;
  apiBaseUrl: string;
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export interface AppRuntimeConfig {
  port: number;
  logLevel: string;
  instancesConfigPath: string;
  instances: Record<string, GhesInstanceConfig>;
}
