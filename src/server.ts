import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config/load-config';

const start = async () => {
  const config = await loadConfig();
  const { app, logger, configService } = createApp(config);

  app.listen(configService.getPort(), () => {
    logger.info(
      {
        port: configService.getPort(),
        instances: configService.getAllInstances().map((instance) => ({
          key: instance.key,
          baseUrl: instance.baseUrl,
          apiBaseUrl: instance.apiBaseUrl,
        })),
      },
      'Multi-instance GHES GitHub App PoC started',
    );
  });
};

void start();
