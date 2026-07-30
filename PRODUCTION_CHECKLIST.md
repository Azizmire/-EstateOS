# EstateOS v1.0 Production Checklist

## Repository complete

- [x] Frontend and backend clean installs are lockfile-reproducible.
- [x] Frontend and backend production builds pass.
- [x] Prisma generation, validation, and committed migrations pass.
- [x] PostgreSQL integration tests exercise all five user roles.
- [x] Backend, frontend, and production-stack browser tests pass.
- [x] Backend coverage thresholds are enforced in CI.
- [x] Linting and explicit TypeScript checks are enforced.
- [x] Production Docker images build and run as the documented stack.
- [x] PostgreSQL, Redis, ClamAV, API, and web health checks pass.
- [x] OpenAPI, installation, operations, security, release, and environment
  documentation are present.
- [x] License, changelog, release notes, and readiness report are present.
- [x] Dependency audits report no known production vulnerabilities.
- [x] Runtime placeholder, role-shortcut, and debug code has been removed.

## Infrastructure required

- [ ] Store database, Redis, JWT, bootstrap, and third-party credentials in a
  managed secret store and complete the initial rotation.
- [ ] Provision production hosting and persistent PostgreSQL, Redis, ClamAV, and
  upload storage.
- [ ] Install and validate TLS certificates and trusted proxy configuration.
- [ ] Forward structured logs, metrics, traces, uptime checks, and alerts to the
  selected monitoring platform.
- [ ] Configure encrypted backups with retention and complete a documented
  disaster-recovery restoration exercise.
- [ ] Complete an external penetration test against the deployed hostname.
- [ ] Complete representative portfolio-scale load and concurrency testing.
- [ ] Add image vulnerability scanning, signing, provenance, and immutable
  release promotion.

Production approval requires every infrastructure item above to be completed or
explicitly accepted by the release owner with documented risk ownership.
