import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { AppRuntimeConfig, GhesInstanceConfig, InstanceConfigFile } from '../models/instance-config';
import { AppError } from '../utils/errors';
import { toApiBaseUrl } from '../utils/github';

const envSchema = z.object({
  PORT: z.string().default('3000').transform((value) => Number.parseInt(value, 10)).pipe(z.number().int().positive()),
  LOG_LEVEL: z.string().default('info'),
  GHES_INSTANCES_CONFIG_PATH: z.string().default('config/instances.json'),
});

const configFileSchema: z.ZodType<InstanceConfigFile> = z.object({
  instances: z.array(
    z.object({
      key: z.string().min(1),
      name: z.string().optional(),
      baseUrl: z.string().url(),
      appIdEnv: z.string().min(1),
      privateKeyEnv: z.string().min(1),
      webhookSecretEnv: z.string().min(1),
    }),
  ).min(1),
});

const normalizePrivateKey = (privateKey: string): string => privateKey.replace(/\\n/g, '\n');

export interface LoadConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export const loadConfig = async (options: LoadConfigOptions = {}): Promise<AppRuntimeConfig> => {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const parsedEnv = envSchema.parse(env);
  const configPath = path.resolve(cwd, parsedEnv.GHES_INSTANCES_CONFIG_PATH);
  const fileContents = await fs.readFile(configPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
    throw new AppError(500, `Unable to read GHES instance config file at ${configPath}`, error.message);
  });
  const parsedFile = configFileSchema.parse(JSON.parse(fileContents));

  const instances = parsedFile.instances.reduce<Record<string, GhesInstanceConfig>>((accumulator, entry) => {
    const appId = env[entry.appIdEnv];
    const privateKey = env[entry.privateKeyEnv];
    const webhookSecret = env[entry.webhookSecretEnv];

    if (!appId || !privateKey || !webhookSecret) {
      throw new AppError(500, `Missing required environment variables for instance ${entry.key}`, {
        appIdEnv: entry.appIdEnv,
        privateKeyEnv: entry.privateKeyEnv,
        webhookSecretEnv: entry.webhookSecretEnv,
      });
    }

    accumulator[entry.key] = {
      key: entry.key,
      name: entry.name ?? entry.key,
      baseUrl: entry.baseUrl.replace(/\/+$/, ''),
      apiBaseUrl: toApiBaseUrl(entry.baseUrl),
      appId,
      privateKey: normalizePrivateKey(privateKey),
      webhookSecret,
    };

    return accumulator;
  }, {});

  return {
    port: parsedEnv.PORT,
    logLevel: parsedEnv.LOG_LEVEL,
    instancesConfigPath: configPath,
    instances,
  };
};
