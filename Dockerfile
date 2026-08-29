FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    GHES_INSTANCES_CONFIG_PATH=/app/config/instances.json

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY config ./config

RUN npm prune --omit=dev --no-audit \
    && npm cache clean --force \
    && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "dist/src/server.js"]
