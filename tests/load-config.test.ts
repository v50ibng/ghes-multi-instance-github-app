import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config/load-config';

test('loadConfig resolves instance credentials from env vars and config file', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghes-config-'));
  const configPath = path.join(tempDir, 'instances.json');

  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        instances: [
          {
            key: 'ghes1',
            baseUrl: 'https://ghes1.company.com',
            appIdEnv: 'GHES1_APP_ID',
            privateKeyEnv: 'GHES1_PRIVATE_KEY',
            webhookSecretEnv: 'GHES1_WEBHOOK_SECRET',
          },
        ],
      },
      null,
      2,
    ),
  );

  const config = await loadConfig({
    cwd: tempDir,
    env: {
      PORT: '4000',
      LOG_LEVEL: 'debug',
      GHES_INSTANCES_CONFIG_PATH: 'instances.json',
      GHES1_APP_ID: '12345',
      GHES1_PRIVATE_KEY: 'line1\\nline2',
      GHES1_WEBHOOK_SECRET: 'secret',
    },
  });

  assert.equal(config.port, 4000);
  assert.equal(config.logLevel, 'debug');
  assert.equal(config.instances.ghes1.appId, '12345');
  assert.equal(config.instances.ghes1.privateKey, 'line1\nline2');
  assert.equal(config.instances.ghes1.apiBaseUrl, 'https://ghes1.company.com/api/v3');
});
