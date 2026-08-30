# Repository Agenda

## Purpose

This repository contains a Node.js and TypeScript proof of concept for a GitHub App that can operate across multiple GitHub Enterprise Server instances from one application runtime.

## Primary Goals

- Support multiple GHES instances through configuration instead of code changes
- Authenticate correctly per GHES instance by using the right App ID and private key
- Receive and verify webhooks per instance
- Manage installations and installation-scoped tokens
- Expose simple operational APIs for issue creation and repository listing
- Package the service for local development, Docker, and Kubernetes/Helm deployment

## Runtime Responsibilities

- Load instance metadata from configuration files and environment variables
- Resolve installation-to-instance mappings
- Create installation access tokens at runtime
- Call the correct GHES API base URL for each request
- Prevent duplicate issue creation for identical requests

## Deployment Responsibilities

- Provide local and production Docker build paths
- Support Helm-based Kubernetes deployment
- Support optional cert-manager certificate creation for ingress TLS
- Keep secrets external to source control

## Documentation Expectations

- Keep README examples aligned with actual configuration defaults
- Document webhook endpoints, API usage, Docker usage, and Helm values
- Prefer explicit examples for GHES instance mapping and certificate configuration
