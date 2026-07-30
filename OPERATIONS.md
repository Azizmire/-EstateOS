# EstateOS operations

## Production deployment

1. Copy `.env.production.example` to `.env.production`.
2. Replace every example value and move the final secrets into the selected
   platform's managed secret store.
3. Set `PUBLIC_URL` to the public HTTPS origin.
4. Build and start the stack:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

The one-shot `migrate` service applies committed PostgreSQL migrations before
the API can become healthy. Confirm the service completed successfully and do
not use `prisma migrate dev` in production.

Before first sign-in, set `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and
`ADMIN_SEED_PASSWORD` in the one-shot seed process environment and run:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T \
  -e ADMIN_SEED_NAME -e ADMIN_SEED_EMAIL -e ADMIN_SEED_PASSWORD \
  -e SEED_TEST_DATA=false api node dist/prisma/seed.js
```

Remove the bootstrap password from the process environment after the
administrator is created.

## Health and monitoring

- `GET /api/health` confirms the API process is alive.
- `GET /api/ready` confirms the API can reach PostgreSQL. Production startup
  also fails closed when Redis cannot connect.
- `GET /api/admin/metrics` returns process uptime, memory use, request counts,
  error counts, and average response times. It requires an administrator token.
- Every API response includes `x-request-id`; preserve it in proxy and
  application logs when tracing an incident.

Recommended alerts:

- Readiness fails for more than two minutes.
- API 5xx rate exceeds 2% over five minutes.
- Memory use grows continuously for 30 minutes.
- Authentication rate-limit responses spike above the normal baseline.
- PostgreSQL volume or upload volume exceeds 80% capacity.
- Redis or ClamAV becomes unhealthy.

## Backup

Back up the database, upload volume, and Redis append-only volume together so
file metadata and active operational state stay aligned with stored files.

Example database backup:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U estateos -d estateos -Fc > estateos.dump
```

Create a snapshot or archive of the `estateos_uploads` Docker volume at the same
time. Encrypt backups, store them outside the production host, and test restores
quarterly.

## Restore

1. Stop web and API traffic.
2. Restore PostgreSQL into an empty database.
3. Restore the matching upload-volume snapshot.
4. Run `prisma migrate deploy`.
5. Start the API and confirm `/api/ready`.
6. Start the web service and verify sign-in, a file download, and one read-only
   portfolio report.

## Release

1. Confirm lint, type checks, builds, tests, coverage, migrations, containers,
   and production-stack CI jobs pass on the release commit.
2. Review pending Prisma migrations.
3. Create database and upload backups.
4. Build immutable images from the tagged commit and record their digests.
5. Confirm PostgreSQL, Redis, ClamAV, API, and web health; then verify login,
   refresh rotation, role scoping, malware-scanned uploads, and audit capture.
6. Sign and scan the images before promotion.
7. Keep the previous images available for rollback.

Database migrations are forward-only. If a release must be rolled back after a
non-compatible schema change, restore the pre-release backup rather than editing
the production migration history.
