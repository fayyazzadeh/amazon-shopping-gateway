# Architecture

## Goals

1. Keep the project completely independent from fayyazzadeh.ir.
2. Make the first release deployable as a static site.
3. Keep API integration behind a clean boundary.
4. Allow the test subdomain to be disabled without affecting the main site.
5. Avoid exposing secrets in frontend code.

## Deployment phases

### Phase 1
GitHub repository -> GitHub Pages -> `amazon-test.fayyazzadeh.ir`

### Phase 2
Static frontend + serverless/API backend when live product data or order processing is required.

### Phase 3
Optional production backend, database, notifications, administration, and order lifecycle.

## Domain strategy

The test deployment should use a dedicated subdomain. DNS and deployment configuration must remain separate from the main site's repository and deployment.

## Security

Amazon/API credentials, notification credentials, and any private configuration must never be committed to the frontend repository.
