# EstateOS v1.0.0-rc.1

EstateOS v1.0.0-rc.1 is the first release candidate for the production-oriented
property operations platform.

## Major features

- PostgreSQL-backed Admin, Manager, Owner, Tenant, and Maintenance workspaces.
- Property, unit, resident, lease, payment, expense, maintenance, notification,
  document, and reporting workflows.
- Lease creation, activation, renewal, move-out, termination, and occupancy
  safeguards.
- Tenant-scoped maintenance submission and Owner-scoped financial performance.
- Short-lived access tokens with rotating, revocable refresh sessions.
- Durable audit logging, request identifiers, defensive headers, and
  Redis-backed distributed rate limiting.
- ClamAV upload scanning, detected content types, SHA-256 checksums, image
  re-encoding, and authorized file retrieval.
- Paginated collections and database-side financial aggregation.
- OpenAPI documentation and containerized production deployment.

## Verification

- 93 backend tests passed with PostgreSQL.
- 3 frontend component tests passed.
- 6 Playwright production-stack tests passed.
- Backend coverage: 84.74% statements, 70.13% branches, 91.03% functions, and
  87.56% lines.
- Frontend, API, Prisma migrations, production images, and the complete Docker
  stack passed GitHub Actions verification.
- Production dependency audits reported no known vulnerabilities.

## Breaking changes

None. This is the first versioned release candidate.

The optional local/CI fixture environment variables are named
`SEED_TEST_DATA` and `TEST_SEED_PASSWORD`. Earlier untagged development builds
used demo-oriented names.

## Known limitations

- Production secrets, TLS, hosting, centralized observability, backup
  restoration testing, penetration testing, load testing, and container
  signing/scanning must be supplied by the deployment environment.
- Local file storage requires a durable volume and does not provide horizontal
  object-storage semantics.
- Scheduled work uses a distributed leader lock but not a durable retry queue.
- Browser automation covers all role logins and the Tenant maintenance write
  workflow; additional deep role journeys are planned after v1.

## Upgrade and deployment notes

This is a release candidate. Back up PostgreSQL and the upload volume before
deployment, apply committed migrations with `prisma migrate deploy`, and follow
[OPERATIONS.md](OPERATIONS.md) and
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).
