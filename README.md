# ghes-multi-instance-github-app

Production-quality GitHub App PoC supporting multiple GitHub Enterprise Server (GHES) instances via Node.js/TypeScript.

## What this project demonstrates

- One Node.js application that supports multiple GHES instances.
- Separate credentials per instance: base URL, App ID, private key, and webhook secret.
- Scalable instance onboarding through a JSON config file plus environment variables.
- Explicit runtime mapping from `instance + installationId` to the correct GHES credentials.
- GitHub App authentication using app JWT -> installation access token.
- Installation webhook handling with `X-Hub-Signature-256` validation.
- REST APIs for issue creation, installation listing, and repository listing.
- In-memory storage interfaces that can later be replaced with PostgreSQL.
- Structured logging, validation, and centralized error handling.

## Project structure

```text
src/
  config/       # GHES instance config loader, env validation
  controllers/  # Express route handlers
  github/       # Octokit client factory, auth helpers
  middleware/   # Webhook signature verification, error handler, input validation
  models/       # TypeScript interfaces/types
  routes/       # Express router definitions
  services/     # Business logic and in-memory repositories
  utils/        # Logger, errors, helpers
tests/          # Focused runtime/unit tests
config/         # GHES instance registry
charts/         # Helm chart for Kubernetes deployment
Dockerfile.local
Dockerfile.production
```

## Configuration model

This app uses **two layers of configuration**:

1. `config/instances.json` defines the list of GHES instances and which environment variables contain each credential.
2. `.env` (or deployment environment variables) provides the actual secrets.

That design keeps secrets out of source control and lets you add more GHES instances by editing configuration only.

### `config/instances.json`

```json
{
  "instances": [
    {
      "key": "ghes1",
      "name": "GHES 1",
      "baseUrl": "https://ghes1.company.com",
      "appIdEnv": "GHES1_APP_ID",
      "privateKeyEnv": "GHES1_PRIVATE_KEY",
      "webhookSecretEnv": "GHES1_WEBHOOK_SECRET"
    },
    {
      "key": "ghes2",
      "name": "GHES 2",
      "baseUrl": "https://ghes2.company.com",
      "appIdEnv": "GHES2_APP_ID",
      "privateKeyEnv": "GHES2_PRIVATE_KEY",
      "webhookSecretEnv": "GHES2_WEBHOOK_SECRET"
    }
  ]
}
```

### `.env.example`

```dotenv
PORT=3000
LOG_LEVEL=info
GHES_INSTANCES_CONFIG_PATH=config/instances.json

GHES1_APP_ID=100001
GHES1_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nreplace-with-ghes1-private-key\n-----END RSA PRIVATE KEY-----"
GHES1_WEBHOOK_SECRET=replace-with-ghes1-webhook-secret

GHES2_APP_ID=100002
GHES2_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nreplace-with-ghes2-private-key\n-----END RSA PRIVATE KEY-----"
GHES2_WEBHOOK_SECRET=replace-with-ghes2-webhook-secret
```

## Why separate webhook endpoints per GHES instance?

This PoC exposes endpoints like:

- `POST /webhook/ghes1`
- `POST /webhook/ghes2`

This is preferred because each endpoint has an unambiguous instance key before the request body is parsed. That makes it straightforward to:

- select the correct webhook secret,
- validate `X-Hub-Signature-256` safely,
- route the webhook to the right GHES configuration,
- simplify operations and troubleshooting.

A shared endpoint would require an additional lookup strategy before trust is established, which is less clear and easier to misconfigure.

## Installation ID -> instance mapping and runtime credential selection

The explicit mapping is handled in two places:

1. **Webhook ingestion** stores installation records as `{ instanceKey, installationId, ... }` in the in-memory installation repository.
2. **Runtime API execution** uses the request's `instance` field and/or the stored mapping to choose the correct GHES credentials.

### Exact runtime flow for `POST /create-issue`

Given:

```json
{
  "instance": "ghes1",
  "installationId": 12345,
  "owner": "my-org",
  "repo": "sample-repo",
  "title": "Test Issue",
  "body": "Created by GitHub App"
}
```

The code path is:

1. `IssueService.createIssue()` receives the request.
2. `InstallationService.assertInstallationMapping("ghes1", 12345)` verifies that the installation is either already mapped to `ghes1` or logs that the request is using an explicit instance.
3. `OctokitClientFactory.createInstallationClient("ghes1", 12345)` calls `InstanceConfigService.getInstance("ghes1")`.
4. That returns the GHES1 credentials from configuration: base URL, App ID, private key, webhook secret.
5. The factory creates app authentication with `@octokit/auth-app`.
6. The factory exchanges the app authentication for an installation token for installation `12345`.
7. A new `Octokit` client is created with:
   - `baseUrl = https://ghes1.company.com/api/v3`
   - `auth = <installation access token>`
8. The app creates the issue against the correct GHES API.

Key files:

- `src/config/instance-config-service.ts`
- `src/services/installation-service.ts`
- `src/github/octokit-client-factory.ts`
- `src/services/issue-service.ts`

## API endpoints

### `POST /create-issue`

Request body:

```json
{
  "instance": "ghes1",
  "installationId": 12345,
  "owner": "my-org",
  "repo": "sample-repo",
  "title": "Test Issue",
  "body": "Created by GitHub App"
}
```

Behavior:

- validates the request body,
- verifies installation-to-instance mapping,
- creates an installation token for the selected GHES instance,
- creates an issue,
- prevents duplicate issue creation for repeated identical requests in the current process.

### `GET /installations`

Lists all stored installation records across GHES instances.

### `GET /repositories/:installationId`

Lists repositories accessible to an installation.

Optional query parameter:

- `?instance=ghes1`

Use the query parameter when the same installation ID exists across multiple GHES instances. If only one stored mapping exists, the app resolves the instance automatically.

### `GET /health`

Simple health endpoint.

## Webhook events handled

- `installation`
  - stores installation information
  - removes installation records on `deleted`
- `installation_repositories`
  - updates the last-known repository mapping in memory
- `ping`
  - health check / validation

## Example webhook payloads

### Installation created

```json
{
  "action": "created",
  "installation": {
    "id": 12345,
    "account": {
      "login": "my-org"
    },
    "target_type": "Organization",
    "repository_selection": "selected",
    "suspended_at": null
  },
  "repositories": [
    {
      "full_name": "my-org/sample-repo"
    }
  ]
}
```

### Installation repositories added/removed

```json
{
  "action": "added",
  "installation": {
    "id": 12345,
    "account": {
      "login": "my-org"
    },
    "target_type": "Organization",
    "repository_selection": "selected",
    "suspended_at": null
  },
  "repositories_added": [
    {
      "full_name": "my-org/sample-repo"
    }
  ],
  "repositories_removed": []
}
```

## Local setup

1. Copy `.env.example` to `.env` and fill in your real GHES credentials.
2. Update `config/instances.json` if you need different instance keys or additional GHES environments.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the app in development mode:

   ```bash
   npm run dev
   ```

5. Or build and run production output:

   ```bash
   npm run build
   npm start
   ```

## Docker

The repository now includes two Dockerfiles:

- `Dockerfile.local` for local development
- `Dockerfile.production` for production or CI image builds

### Local development image

`Dockerfile.local` is optimized for local development:

- installs dependencies inside the container,
- runs the TypeScript app with `npm run dev`,
- runs as the non-root `node` user,
- keeps the GHES config path consistent with local development.

Build with the default public npm registry:

```bash
docker build -f Dockerfile.local -t ghes-multi-instance-github-app:local .
```

Build against the internal JFrog-backed registry:

```bash
docker build -f Dockerfile.local \
  --build-arg DOCKER_REGISTRY=jfrog.hub.vwgroup.com/remote-docker-io \
  --build-arg NODE_VERSION=22.14.0-bookworm-slim \
  --build-arg NPM_REGISTRY=https://jfrog.devstack.vwgroup.com/artifactory/api/npm/npm-public/ \
  --secret id=devstack_user,env=DEVSTACK_USER \
  --secret id=devstack_secret,env=DEVSTACK_SECRET \
  -t ghes-multi-instance-github-app:local .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  ghes-multi-instance-github-app:local
```

### Production image

`Dockerfile.production` is the production-oriented image:

- uses a multi-stage build,
- installs dependencies in the builder image,
- supports private registry authentication through build args,
- removes dev dependencies before the runtime image,
- keeps registry credentials out of the final image,
- runs as the non-root `node` user.

Build with the default public npm registry:

```bash
docker build -f Dockerfile.production \
  --build-arg DOCKER_REGISTRY=docker.io/library \
  --build-arg NODE_VERSION=22-bookworm-slim \
  --build-arg NPM_REGISTRY=https://registry.npmjs.org/ \
  -t ghes-multi-instance-github-app:prod .
```

Build with the JFrog-backed settings from your environment:

```bash
docker build -f Dockerfile.production \
  --build-arg DOCKER_REGISTRY=jfrog.hub.vwgroup.com/remote-docker-io \
  --build-arg NODE_VERSION=22.14.0-bookworm-slim \
  --build-arg NPM_REGISTRY=https://jfrog.devstack.vwgroup.com/artifactory/api/npm/npm-public/ \
  --secret id=devstack_user,env=DEVSTACK_USER \
  --secret id=devstack_secret,env=DEVSTACK_SECRET \
  -t ghes-multi-instance-github-app:prod .
```

The production Dockerfile uses BuildKit secrets for registry credentials so the credentials are available only during the dependency installation layer and are not baked into the final image.

Run:

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  ghes-multi-instance-github-app:prod
```

The runtime image bundles `config/instances.json`. Override it by mounting your own file and setting `GHES_INSTANCES_CONFIG_PATH` if needed:

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  -v "$(pwd)/config/instances.json:/app/config/instances.json:ro" \
  ghes-multi-instance-github-app:prod
```

## Helm chart

The repository includes a Helm chart at:

```text
charts/ghes-multi-instance-github-app
```

The chart follows the same runtime design as the Node.js app:

- GHES instance metadata is rendered into a ConfigMap as `instances.json`.
- Sensitive App IDs, private keys, and webhook secrets are supplied through a Kubernetes Secret.
- The Deployment mounts `instances.json` into `/app/config/instances.json`.
- Liveness and readiness probes use `GET /health`.

### Key Helm values

- `image.repository`, `image.tag`: container image to deploy
- `app.instances`: list of GHES instances to render into `instances.json`
- `credentials.existingSecret`: use an already-managed Secret instead of creating one
- `credentials.data`: secret values if you want Helm to create the Secret
- `ingress.enabled`: expose the service externally

### Install with Helm

```bash
helm upgrade --install ghes-app ./charts/ghes-multi-instance-github-app
```

### Install with an existing Secret

Create a secret that contains the environment variables referenced by `app.instances`:

```bash
kubectl create secret generic ghes-app-credentials \
  --from-literal=GHES1_APP_ID=100001 \
  --from-literal=GHES1_WEBHOOK_SECRET=replace-with-ghes1-webhook-secret \
  --from-literal=GHES2_APP_ID=100002 \
  --from-literal=GHES2_WEBHOOK_SECRET=replace-with-ghes2-webhook-secret \
  --from-file=GHES1_PRIVATE_KEY=/path/to/ghes1.private-key.pem \
  --from-file=GHES2_PRIVATE_KEY=/path/to/ghes2.private-key.pem
```

Then install:

```bash
helm upgrade --install ghes-app ./charts/ghes-multi-instance-github-app \
  --set credentials.create=false \
  --set credentials.existingSecret=ghes-app-credentials
```

### Example Helm values override

```yaml
image:
  repository: ghcr.io/v50ibng/ghes-multi-instance-github-app
  tag: "1.0.0"

app:
  instances:
   - key: ghes1
     name: GHES 1
     baseUrl: https://ghes1.company.com
     appIdEnv: GHES1_APP_ID
     privateKeyEnv: GHES1_PRIVATE_KEY
     webhookSecretEnv: GHES1_WEBHOOK_SECRET
   - key: ghes2
     name: GHES 2
     baseUrl: https://ghes2.company.com
     appIdEnv: GHES2_APP_ID
     privateKeyEnv: GHES2_PRIVATE_KEY
     webhookSecretEnv: GHES2_WEBHOOK_SECRET

credentials:
  create: false
  existingSecret: ghes-app-credentials
```

## curl examples

### Create an issue

```bash
curl -X POST http://localhost:3000/create-issue \
  -H 'Content-Type: application/json' \
  -d '{
    "instance": "ghes1",
    "installationId": 12345,
    "owner": "my-org",
    "repo": "sample-repo",
    "title": "Test Issue",
    "body": "Created by GitHub App"
  }'
```

### List installations

```bash
curl http://localhost:3000/installations
```

### List repositories for an installation

```bash
curl 'http://localhost:3000/repositories/12345?instance=ghes1'
```

## Postman examples

Create a collection with:

1. `POST {{baseUrl}}/create-issue`
   - Header: `Content-Type: application/json`
   - Body: raw JSON using the sample above
2. `GET {{baseUrl}}/installations`
3. `GET {{baseUrl}}/repositories/12345?instance=ghes1`
4. `POST {{baseUrl}}/webhook/ghes1`
   - Headers:
     - `Content-Type: application/json`
     - `X-GitHub-Event: installation`
     - `X-Hub-Signature-256: sha256=<computed-signature>`

## Testing webhooks locally with ngrok

1. Start the app:

   ```bash
   npm run dev
   ```

2. Start ngrok:

   ```bash
   ngrok http 3000
   ```

3. Configure each GHES App webhook URL:
   - GHES1 -> `https://<ngrok-id>.ngrok.app/webhook/ghes1`
   - GHES2 -> `https://<ngrok-id>.ngrok.app/webhook/ghes2`

4. Trigger an installation event from the GHES App settings page.

5. Verify the stored installation mapping:

   ```bash
   curl http://localhost:3000/installations
   ```

## Computing `X-Hub-Signature-256` for manual webhook tests

Example using OpenSSL:

```bash
payload='{"action":"created","installation":{"id":12345}}'
secret='replace-with-ghes1-webhook-secret'
signature=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$secret" | sed 's/^.* //')
curl -X POST http://localhost:3000/webhook/ghes1 \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: installation' \
  -H "X-Hub-Signature-256: sha256=$signature" \
  -d "$payload"
```

## Security considerations

- Credentials are loaded from environment variables only.
- No secrets are hardcoded in source.
- Webhooks are verified with HMAC SHA-256 using `X-Hub-Signature-256`.
- Each GHES instance uses its own secret, App ID, and private key.
- Installation access tokens are created per request and scoped to the target installation.
- Duplicate issue requests are deduplicated in memory for this PoC.
- The in-memory stores are suitable for demos only; use persistent storage in production.

## Troubleshooting

### `Unknown GHES instance`

The `instance` field or webhook path segment does not exist in `config/instances.json`.

### `Missing required environment variables for instance`

One or more of the `*_APP_ID`, `*_PRIVATE_KEY`, or `*_WEBHOOK_SECRET` variables are missing.

### `Invalid webhook signature`

The webhook secret for that instance does not match the secret configured in GHES, or the payload used for hashing differs from the transmitted payload.

### `No stored installation mapping found`

The demo store is empty, usually because the process restarted or the installation webhook has not yet been delivered. Re-send the installation webhook or supply the explicit `instance` for issue creation.

### `Installation ... exists on multiple GHES instances`

Use `GET /repositories/:installationId?instance=ghes1` to disambiguate which GHES installation should be queried.

## Focused validation

```bash
npm test
npm run build
```

## Future production upgrades

- Replace in-memory repositories with PostgreSQL implementations.
- Persist issue dedupe keys with TTL or idempotency semantics.
- Add pagination and caching for repository listing.
- Add installation token caching with expiration awareness if needed.
- Add metrics and distributed tracing.
