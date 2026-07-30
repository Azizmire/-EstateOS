# EstateOS operations

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

1. Confirm CI passes.
2. Review pending Prisma migrations.
3. Create database and upload backups.
4. Build new images and start the stack.
5. Confirm PostgreSQL, Redis, ClamAV, API, and web health; then verify login,
   refresh rotation, role scoping, malware-scanned uploads, and audit capture.
6. Keep the previous images available for rollback.

Database migrations are forward-only. If a release must be rolled back after a
non-compatible schema change, restore the pre-release backup rather than editing
the production migration history.
