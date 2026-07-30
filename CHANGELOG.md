# Changelog

All notable changes to EstateOS are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0-rc.1 - 2026-07-29

### Added

- Five role-scoped, PostgreSQL-backed application workspaces.
- Property, resident, lease, payment, expense, maintenance, file, notification,
  reporting, and administration APIs.
- Lease lifecycle and Tenant maintenance-request workflows.
- Rotating refresh sessions, durable audit logging, Redis rate limiting,
  scheduler locking, and ClamAV upload scanning.
- Paginated collections, database-side reporting aggregation, OpenAPI
  documentation, production Docker deployment, and health checks.
- Backend, frontend, PostgreSQL integration, and Playwright test suites.
- ESLint and explicit frontend/backend type-check release gates.

### Changed

- Replaced unstructured runtime output with structured JSON logging.
- Upgraded GitHub Actions dependencies to supported Node 24 runtime releases.
- Renamed optional seed fixtures from demo-oriented variables and identities to
  test-only terminology.

### Fixed

- Corrected npm lockfile compatibility, audit-failure response framing,
  production seed execution, coverage timeouts, and migration orchestration.
- Removed unused exports, undeclared type dependencies, dead upload modules,
  unused demo selectors, hardcoded dashboard values, and production role
  shortcuts.

### Security

- Added short-lived access tokens, refresh rotation/revocation, role scoping,
  durable audit gating, malware scanning, checksums, defensive headers, and
  explicit production secret requirements.
