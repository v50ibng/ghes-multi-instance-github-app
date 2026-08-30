# Repository Instructions

## Application Rules

- Treat each GHES instance as an independent credential boundary
- Do not hardcode App IDs, private keys, webhook secrets, or live tokens
- Keep installation-to-instance mapping explicit in code and documentation
- Use the configured GHES API base URL for all installation-scoped API calls

## Change Rules

- Prefer minimal, targeted changes
- Keep TypeScript strictness intact
- Maintain async and promise-based flows
- Keep logging structured
- Keep validation at the API and webhook boundaries

## Deployment Rules

- Keep Docker and Helm configuration aligned with application runtime behavior
- Keep Helm defaults generic and safe
- Use Kubernetes Secrets for credentials
- Use cert-manager values only when ingress TLS should be managed by the chart

## Documentation Rules

- Reflect real file names, endpoints, and configuration keys
- Include concrete examples when behavior depends on configuration
- Update README when Docker, Helm, certificate, or GHES configuration changes

## Validation Rules

- Review new docs for consistency with code
- Avoid introducing placeholder secrets that can be deployed accidentally
- Preserve example values that are safe for public or shared use
