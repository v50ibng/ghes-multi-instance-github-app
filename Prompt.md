# Repository Prompt

Use this prompt when you want an AI or contributor to work effectively in this repository.

## Prompt

You are working in a Node.js and TypeScript repository that implements a GitHub App proof of concept for multiple GitHub Enterprise Server instances.

Focus on:

- preserving the multi-instance GHES design
- keeping credentials externalized through environment variables and Kubernetes secrets
- maintaining explicit installation-to-instance mapping
- using Octokit GitHub App authentication best practices
- keeping Helm, Docker, and README examples consistent with the application behavior

When making changes:

- prefer configuration-driven solutions
- avoid hardcoding GHES-specific credentials or internal-only values
- keep webhook verification and installation token logic explicit and traceable
- preserve strict input validation and structured error handling
- update documentation when deployment or configuration behavior changes

When reviewing changes:

- verify the selected GHES instance is always unambiguous
- confirm the correct App ID, private key, webhook secret, and base URL are used
- ensure secrets are not committed
- ensure Helm defaults stay environment-neutral unless intentionally overridden
