# EstateOS security

## Controls included in v1

- Passwords are hashed with bcrypt using a cost factor of 12.
- API sessions use 15-minute signed JWTs and one-time, rotating refresh tokens
  stored as SHA-256 hashes in PostgreSQL.
- Every protected route checks authentication and server-side role permissions.
- Tenant and owner portal queries are scoped to linked records.
- File downloads repeat authorization checks before reading stored bytes.
- Uploads use memory limits, detected content types, ClamAV scanning, SHA-256
  checksums, sanitized names, random storage keys, and image re-encoding.
- Successful mutating responses wait for their audit event to be persisted.
- Authentication and general API requests use separate Redis-backed distributed
  rate limits in production.
- Responses include request identifiers and defensive HTTP headers.
- The API omits framework identification and limits JSON request bodies.
- Production containers run the application as a non-root user.
- Secrets remain environment variables and are excluded from container images.

## Production requirements

- Terminate TLS at the load balancer or reverse proxy.
- Use random database and JWT secrets from a managed secret store.
- Restrict PostgreSQL to the private application network.
- Back up both PostgreSQL and the upload volume.
- Forward container logs to a centralized service and alert on readiness failure,
  elevated 5xx responses, or repeated authentication failures.
- Rotate JWT secrets using a controlled maintenance window; existing sessions
  become invalid after rotation.
- Review `/api/admin/audit` regularly and keep admin membership minimal.

## Reporting a vulnerability

Do not open a public issue containing exploit details or private data. Contact
the project security owner privately with reproduction steps, affected versions,
and the expected impact.
