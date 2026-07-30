# EstateOS v1.0

## Product

- Added authenticated manager, administrator, maintenance, resident, and owner
  workspaces.
- Connected the React application to the production API while preserving
  role-based demo workspaces for evaluation.
- Added property, resident, lease, payment, maintenance, report, document, and
  administration interfaces.
- Added lease activation, renewal, move-out, and termination workflows.
- Added tenant-scoped service requests and owner-scoped performance reporting.

## Security and operations

- Added owner access assignments and linked resident accounts.
- Added authorized file retrieval and deletion.
- Added request IDs, security headers, API and authentication rate limits,
  liveness, readiness, and administrator metrics.
- Added containerized web, API, PostgreSQL, and durable upload services.
- Added production migrations, non-root API execution, health checks, and
  reverse proxy configuration.
- Expanded GitHub Actions to validate the client, API, database migrations,
  automated tests, coverage, and container builds.

## Quality

- Expanded the automated suite from 15 to 31 passing tests.
- Added coverage for resource routes, portal scoping, role boundaries, uploads,
  reporting, middleware, rate limiting, health, and error responses.
- Added complete setup, security, monitoring, backup, restore, release, and
  rollback documentation.

## Required production configuration

EstateOS v1 requires an HTTPS-capable container host, PostgreSQL, a persistent
upload volume, and production secrets. Copy `.env.production.example`, replace
all placeholders, then deploy with `docker-compose.prod.yml`.
