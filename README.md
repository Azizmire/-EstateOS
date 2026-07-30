<div align="center">

# 🏢 EstateOS

### Enterprise Property Management Platform

**Modern · Secure · Scalable · Production Ready**

EstateOS is a full-stack property operations platform for managers, residents,
maintenance teams, and property owners—built around real workflows, strict
authorization, durable data, and deployment-ready infrastructure.

<br />

<picture>
  <img
    src="docs/assets/estateos-hero.png"
    alt="EstateOS enterprise property portfolio with secure operational dashboards"
    width="100%"
  />
</picture>

<br />

[![Version](https://img.shields.io/badge/version-1.0.0--rc.1-7c3aed?style=for-the-badge)](RELEASE_NOTES.md)
[![Release](https://img.shields.io/badge/release-candidate-f59e0b?style=for-the-badge)](https://github.com/Azizmire/-EstateOS/releases/tag/v1.0.0-rc.1)
[![EstateOS CI](https://img.shields.io/github/actions/workflow/status/Azizmire/-EstateOS/ci.yml?branch=main&style=for-the-badge&label=EstateOS%20CI)](https://github.com/Azizmire/-EstateOS/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Azizmire/-EstateOS?style=for-the-badge&color=22c55e)](LICENSE)

[**Get started**](#-getting-started) ·
[**Explore features**](#-platform-capabilities) ·
[**View API**](#-api-overview) ·
[**Deploy**](#-production-deployment) ·
[**Read the docs**](#-documentation)

<br />

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111827)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-111827?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3-6ba539?style=flat-square&logo=openapiinitiative&logoColor=white)](https://www.openapis.org/)

</div>

---

## 📑 Table of contents

- [Why EstateOS](#-why-estateos)
- [Project overview](#-project-overview)
- [Platform capabilities](#-platform-capabilities)
- [Roles and access](#-roles-and-access)
- [System architecture](#-system-architecture)
- [Core workflows](#-core-workflows)
- [Getting started](#-getting-started)
- [Local development](#-local-development)
- [Validation](#-validation)
- [Production deployment](#-production-deployment)
- [Command reference](#-command-reference)
- [API overview](#-api-overview)
- [Screenshots](#-screenshots)
- [Documentation](#-documentation)
- [Developer](#-developer)
- [Roadmap](#-roadmap)
- [Release status](#-release-status)

---

## ✨ Why EstateOS

Property operations are usually split across disconnected tools, manual
handoffs, and role-specific spreadsheets. EstateOS brings the operational
surface into one secure system while keeping every user inside a deliberately
scoped workspace.

| Outcome | What EstateOS provides |
| --- | --- |
| **One operational picture** | Occupancy, collections, lease health, maintenance, and financial performance in one portfolio view |
| **Real lifecycle workflows** | Lease activation, renewal, move-out, termination, work-order history, and payment operations |
| **Role-safe access** | API-enforced permissions for administrators, managers, owners, tenants, and maintenance teams |
| **Production foundations** | PostgreSQL migrations, Redis rate limiting, malware scanning, health checks, audit history, and Docker orchestration |
| **Verifiable delivery** | Backend, frontend, PostgreSQL integration, container, and browser tests enforced by GitHub Actions |

> EstateOS treats frontend navigation as a convenience—not as a security
> boundary. Authorization is enforced by the API.

---

## 📊 Project overview

| Metric | EstateOS |
| --- | --- |
| **User roles** | 5 role-scoped workspaces |
| **API modules** | 15 modular route areas |
| **Production services** | 6 orchestrated Docker services |
| **Automated tests** | 93 backend · 3 frontend · 6 production-stack browser tests |
| **CI quality gates** | 4—Frontend · API · Containers · Production stack |
| **Backend coverage** | 84%+ statements with enforced CI thresholds |
| **Database** | PostgreSQL 17 with committed Prisma migrations |
| **Authentication** | Short-lived access tokens with rotating, revocable refresh sessions |
| **API contract** | Interactive OpenAPI documentation |
| **Release stage** | `v1.0.0-rc.1` release candidate |

---

## 🧩 Platform capabilities

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🏢 Property Management</h3>
      • Portfolio-wide occupancy and collection visibility<br />
      • Property and unit directories with rent performance<br />
      • Operational health and activity dashboards
    </td>
    <td width="50%" valign="top">
      <h3>💰 Financial Reporting</h3>
      • Payment ledgers, collection summaries, and expenses<br />
      • Monthly and period-scoped financial reporting<br />
      • Owner net operating income and database-side aggregation
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>👥 Resident &amp; Lease Operations</h3>
      • Resident records, emergency contacts, and account access<br />
      • Lease creation, activation, renewal, move-out, and termination<br />
      • Tenant-scoped payments, documents, and service requests
    </td>
    <td width="50%" valign="top">
      <h3>🔧 Maintenance</h3>
      • Resident request intake and role-specific work queues<br />
      • Assignment, priority, status history, and notifications<br />
      • Authorized attachments and completion workflows
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🔒 Security &amp; Files</h3>
      • API-enforced role controls and rotating sessions<br />
      • Durable audits, defensive headers, and distributed rate limits<br />
      • Content detection, malware scanning, checksums, and scoped downloads
    </td>
    <td width="50%" valign="top">
      <h3>🚀 DevOps &amp; Infrastructure</h3>
      • Reproducible installs and committed Prisma migrations<br />
      • Health-gated Docker orchestration and graceful shutdown<br />
      • Automated CI, testing, backup, and restore guidance
    </td>
  </tr>
</table>

> [!TIP]
> Every workspace uses authenticated API data. EstateOS does not ship
> production role shortcuts or fallback datasets.

---

## 👤 Roles and access

| Role | Primary workspace | Access |
| --- | --- | --- |
| `ADMIN` | Platform administration | Full platform, users, access assignments, audit logs, and metrics |
| `MANAGER` | Portfolio operations | Portfolio, residents, leases, payments, files, reports, and maintenance |
| `OWNER` | Property performance | Read-only performance for explicitly assigned properties |
| `TENANT` | Resident portal | Personal lease, payments, documents, and service requests |
| `MAINTENANCE` | Service workspace | Work queue, request updates, and maintenance attachments |

---

## 🏗 System architecture

```mermaid
flowchart LR
    User["Users<br/>Admin · Manager · Owner<br/>Tenant · Maintenance"]
    Web["React + Vite<br/>Web application"]
    Proxy["Nginx<br/>Static delivery + /api proxy"]
    API["Express + TypeScript<br/>REST API + OpenAPI"]
    Auth["Authentication<br/>RBAC + rotating sessions"]
    Data["Prisma ORM"]
    DB[("PostgreSQL 17<br/>Operational data")]
    Redis[("Redis 7<br/>Rate limits + locks")]
    AV["ClamAV<br/>Malware scanning"]
    Files[("Durable volume<br/>Authorized uploads")]

    User -->|HTTPS| Proxy
    Proxy --> Web
    Proxy -->|/api| API
    API --> Auth
    API --> Data
    Data --> DB
    API --> Redis
    API --> AV
    API --> Files

    classDef edge fill:#eef2ff,stroke:#6366f1,color:#111827
    classDef service fill:#ecfeff,stroke:#0891b2,color:#111827
    classDef data fill:#f0fdf4,stroke:#16a34a,color:#111827
    class User,Web,Proxy edge
    class API,Auth,Data,AV service
    class DB,Redis,Files data
```

<details>
<summary><strong>Production service topology</strong></summary>

| Service | Responsibility | Startup condition |
| --- | --- | --- |
| `web` | Nginx, compiled React application, and `/api` proxy | API is healthy |
| `api` | Non-root Node.js API with graceful shutdown | Database, Redis, ClamAV, and migrations are ready |
| `migrate` | One-shot committed Prisma migration deployment | PostgreSQL is healthy |
| `postgres` | Durable PostgreSQL 17 data store | PostgreSQL readiness check passes |
| `redis` | Distributed rate limiting and scheduler locking | Authenticated Redis health check passes |
| `clamav` | Mandatory production upload scanning | ClamAV daemon responds as healthy |

</details>

---

## 🔄 Core workflows

### Authentication flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as EstateOS Web
    participant API as EstateOS API
    participant DB as PostgreSQL
    participant Audit as Audit History

    User->>Web: Submit credentials
    Web->>API: POST /api/auth/login
    API->>DB: Verify account and password
    DB-->>API: User and role assignments
    API->>Audit: Record authentication event
    API-->>Web: Access token + rotating refresh session
    Web->>API: Authorized request
    API-->>Web: Role-scoped data
    Web->>API: Refresh expired access token
    API->>DB: Rotate and revoke prior refresh session
    API-->>Web: New token pair
```

### Maintenance workflow

```mermaid
stateDiagram-v2
    [*] --> Submitted: Tenant creates request
    Submitted --> Assigned: Manager assigns work
    Submitted --> InProgress: Maintenance accepts work
    Assigned --> InProgress: Work begins
    InProgress --> OnHold: Waiting on access / parts
    OnHold --> InProgress: Work resumes
    InProgress --> Completed: Resolution recorded
    Completed --> Closed: Manager verifies
    Closed --> [*]
```

### Lease lifecycle

```mermaid
flowchart LR
    Draft["Draft"] --> Active["Active"]
    Active --> Renewal["Renewal"]
    Renewal --> Active
    Active --> MoveOut["Move-out"]
    Active --> Terminated["Terminated"]
    MoveOut --> Closed["Closed"]
    Terminated --> Closed

    classDef neutral fill:#f8fafc,stroke:#64748b,color:#111827
    classDef live fill:#ecfdf5,stroke:#10b981,color:#111827
    classDef endState fill:#fff7ed,stroke:#f97316,color:#111827
    class Draft,Renewal neutral
    class Active live
    class MoveOut,Terminated,Closed endState
```

---

## 🚀 Getting started

```mermaid
flowchart LR
    Clone["1 · Clone"] --> Install["2 · Install"]
    Install --> Configure["3 · Configure"]
    Configure --> Docker["4 · Start PostgreSQL"]
    Docker --> Migrate["5 · Generate + migrate"]
    Migrate --> Seed["6 · Seed"]
    Seed --> Start["7 · Start API + web"]
    Start --> Ready["EstateOS running ✅"]

    classDef step fill:#eef2ff,stroke:#6366f1,color:#111827
    classDef ready fill:#ecfdf5,stroke:#10b981,color:#111827
    class Clone,Install,Configure,Docker,Migrate,Seed,Start step
    class Ready ready
```

### Prerequisites

| Requirement | Version / guidance |
| --- | --- |
| Node.js | 22 |
| npm | 10 |
| PostgreSQL | 17 |
| Docker Desktop | Recommended |
| Redis | 7; optional locally and required in production |
| ClamAV | Optional locally and required in production |

---

## 💻 Local development

### 1. Start PostgreSQL

**Terminal · Local database**

```sh
docker compose up -d
```

### 2. Install dependencies

Install the web and API dependencies from their committed lockfiles:

**Terminal · Repository root**

```sh
npm ci
npm --prefix server ci
```

### 3. Configure the environment

Copy `server/.env.example` to `server/.env`. For the included local PostgreSQL
container, use:

```dotenv
DATABASE_URL="postgresql://estateos:estateos-local@localhost:5432/estateos?schema=public"
JWT_SECRET="replace-with-at-least-32-random-characters"
ADMIN_SEED_NAME="EstateOS Administrator"
ADMIN_SEED_EMAIL="admin@example.com"
ADMIN_SEED_PASSWORD="replace-with-a-strong-bootstrap-password"
SEED_TEST_DATA="true"
TEST_SEED_PASSWORD="replace-with-a-test-fixture-password"
```

### 4. Generate Prisma, migrate, and seed

**Terminal · Database preparation**

```sh
npm --prefix server run prisma:generate
npm --prefix server run prisma:deploy
npm --prefix server run prisma:seed
```

### 5. Start the API and frontend

Run the API and web application in separate terminals:

**Terminal A · EstateOS API**

```sh
npm run dev:api
```

**Terminal B · EstateOS web application**

```sh
npm run dev
```

### 6. Verify the environment

| Surface | URL |
| --- | --- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| **API** | [http://localhost:4000](http://localhost:4000) |
| **API documentation** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| **Health check** | [http://localhost:4000/api/health](http://localhost:4000/api/health) |
| **Readiness check** | [http://localhost:4000/api/ready](http://localhost:4000/api/ready) |

> [!NOTE]
> The optional test fixture seed is intended for local verification and CI
> only. The application uses authenticated API data in every mode; no role
> shortcut or fallback dataset is included in the production web bundle.

---

## ✅ Validation

Run the repository's complete quality gates:

**Terminal · Full repository validation**

```sh
npm run build
npm run lint
npm run typecheck
npm test
npm run test:frontend
npm --prefix server run test:coverage
# Against a seeded production stack:
npm run test:e2e
```

| Gate | Coverage |
| --- | --- |
| **Frontend** | Clean install, lint, type check, component tests, and production build |
| **API** | Clean install, Prisma generation, PostgreSQL migrations, type check, build, tests, and coverage |
| **Containers** | Production web and API image builds |
| **Production stack** | Healthy services, compiled seed, five-role authentication, and browser workflows |

---

## 🐳 Production deployment

```mermaid
flowchart LR
    Env["Copy<br/>.env.production.example"] --> Secrets["Configure secrets<br/>and HTTPS origin"]
    Secrets --> Build["Build production<br/>images"]
    Build --> Start["Start stack"]
    Start --> Migrate["Apply committed<br/>migrations"]
    Migrate --> Health["Verify service<br/>health"]
    Health --> Live["EstateOS running 🚀"]

    classDef step fill:#eff6ff,stroke:#2563eb,color:#111827
    classDef live fill:#ecfdf5,stroke:#10b981,color:#111827
    class Env,Secrets,Build,Start,Migrate,Health step
    class Live live
```

1. Copy `.env.production.example` to `.env.production` and replace every
   placeholder.
2. Point `PUBLIC_URL` at the final HTTPS origin.
3. Start the production stack:

   **Terminal · Production stack**

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

The stack includes:

| Component | Production responsibility |
| --- | --- |
| **Nginx** | Serves the compiled React application and proxies `/api` |
| **Node API** | Runs as a non-root container with health checks and graceful shutdown |
| **PostgreSQL** | Stores durable operational data with readiness checks |
| **Redis** | Provides distributed rate limiting and coordination |
| **ClamAV** | Enforces mandatory malware scanning |
| **Upload volume** | Persists authorized uploaded files |
| **Migration service** | Must apply committed migrations successfully before API startup |

<details>
<summary><strong>Production operations and release boundary</strong></summary>

Before deployment, move final secrets into the selected platform's managed
secret store, configure TLS, and confirm persistent storage. Production approval
also requires monitoring, backups, restore testing, penetration testing, load
testing, and container scanning/signing outside the repository.

See [OPERATIONS.md](OPERATIONS.md) for deployment, monitoring, backup, restore,
and rollback procedures; [SECURITY.md](SECURITY.md) for the security model; and
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for the codebase-versus-
infrastructure release boundary.

</details>

---

## ⌨️ Command reference

| Task | Command |
| --- | --- |
| Start local PostgreSQL | `docker compose up -d` |
| Install frontend dependencies | `npm ci` |
| Install API dependencies | `npm --prefix server ci` |
| Start frontend | `npm run dev` |
| Start API | `npm run dev:api` |
| Generate Prisma client | `npm --prefix server run prisma:generate` |
| Deploy migrations | `npm --prefix server run prisma:deploy` |
| Seed database | `npm --prefix server run prisma:seed` |
| Run backend tests | `npm test` |
| Run frontend tests | `npm run test:frontend` |
| Run backend coverage | `npm --prefix server run test:coverage` |
| Run browser tests | `npm run test:e2e` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Build everything | `npm run build` |
| Run the standard verification suite | `npm run verify` |
| Start production stack | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` |

---

## 📚 API overview

All protected routes accept `Authorization: Bearer <token>`. Interactive OpenAPI
documentation is served from `/api/docs` by a running API.

| Area | Route | Responsibility |
| --- | --- | --- |
| Authentication | `/api/auth` | Bootstrap, login, rotating refresh sessions, logout, password changes, account creation, and current user |
| Dashboard | `/api/dashboard` | Portfolio summary and activity |
| Properties | `/api/properties` | Properties and units |
| Residents | `/api/tenants` | Resident records |
| Leases | `/api/leases` | Lease lifecycle |
| Payments | `/api/payments` | Payment and collection operations |
| Expenses | `/api/expenses` | Expense management |
| Maintenance | `/api/maintenance` | Work orders and status history |
| Uploads | `/api/uploads` | Secure upload intake |
| Files | `/api/files` | Authorized file retrieval |
| Notifications | `/api/notifications` | User notifications |
| Reports | `/api/reports` | Financial and portfolio reports |
| Portals | `/api/portal` | Tenant- and owner-scoped data |
| Administration | `/api/admin` | Users, access assignments, audit history, and metrics |
| System | `/api/health` · `/api/ready` | Liveness and readiness |

---

## 📸 Screenshots

> [!NOTE]
> **Product screenshots are coming soon.** The layout below reserves consistent
> spaces for approved application captures without introducing broken images.

<table>
  <tr>
    <td align="center" width="33%">
      <strong>📊 Portfolio Dashboard</strong><br />
      <sub>Occupancy, collections, lease health, and activity</sub><br /><br />
      <em>Screenshot slot · dashboard</em>
    </td>
    <td align="center" width="33%">
      <strong>🏢 Property Management</strong><br />
      <sub>Properties, units, residents, and operating performance</sub><br /><br />
      <em>Screenshot slot · properties</em>
    </td>
    <td align="center" width="33%">
      <strong>🏠 Tenant Portal</strong><br />
      <sub>Lease, payments, documents, and maintenance requests</sub><br /><br />
      <em>Screenshot slot · tenant portal</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <strong>💼 Owner Portal</strong><br />
      <sub>Scoped property performance and net operating income</sub><br /><br />
      <em>Screenshot slot · owner portal</em>
    </td>
    <td align="center" width="33%">
      <strong>🔧 Maintenance Workspace</strong><br />
      <sub>Assigned queues, status history, and attachments</sub><br /><br />
      <em>Screenshot slot · maintenance</em>
    </td>
    <td align="center" width="33%">
      <strong>📈 Reports</strong><br />
      <sub>Period-scoped financial and portfolio intelligence</sub><br /><br />
      <em>Screenshot slot · reports</em>
    </td>
  </tr>
</table>

> Replace each slot with a repository-hosted image when approved product
> captures are available; the section is intentionally structured to accept six
> consistent landscape screenshots without changing the surrounding layout.

---

## 📖 Documentation

| Document | Purpose |
| --- | --- |
| [Operations guide](OPERATIONS.md) | Deployment, health, monitoring, backup, restore, release, and rollback |
| [Security policy](SECURITY.md) | Security model, reporting, controls, and deployment responsibilities |
| [Changelog](CHANGELOG.md) | Versioned product changes |
| [Release notes](RELEASE_NOTES.md) | Current release-candidate scope, verification, and limitations |
| [Production checklist](PRODUCTION_CHECKLIST.md) | Repository-complete and infrastructure-required release gates |
| [Production readiness report](PRODUCTION_READINESS.md) | Verified builds, tests, coverage, containers, migrations, risks, and readiness |
| [MIT license](LICENSE) | Open-source license |

---

## 👨‍💻 Developer

EstateOS is designed and developed by
**[Abdiaziz Mire](https://github.com/Azizmire)**—a
**Software Engineer / Software Developer** focused on building secure,
maintainable, production-oriented applications with thoughtful user
experiences and dependable engineering foundations.

---

## 🗺 Roadmap

| Stage | Focus | Status |
| --- | --- | --- |
| **v1.0** | Five role-scoped workspaces, core property operations, security hardening, OpenAPI, Docker, migrations, and automated verification | Release candidate |
| **v1.1** | Deeper browser journeys, expanded operational analytics, object-storage integration, and durable background job processing | Proposed |
| **Future** | Broader integrations, multi-region deployment patterns, advanced automation, and mobile-first experiences | Directional |

Roadmap items beyond the current release candidate are proposals, not committed
delivery dates or guarantees.

---

## 🏁 Release status

EstateOS is currently published as **`v1.0.0-rc.1`**.

- [Release notes](RELEASE_NOTES.md)
- [Changelog](CHANGELOG.md)
- [Production readiness report](PRODUCTION_READINESS.md)
- [MIT license](LICENSE)

The repository-controlled release gates are documented and automated.
Production secrets, hosting, TLS, centralized observability, backup restoration
testing, penetration testing, representative load testing, and container
signing/scanning remain deployment-environment responsibilities.

<div align="center">

---

Built with ❤️ using **React, TypeScript, Express, PostgreSQL, Prisma, Docker**
and **GitHub Actions**.

**EstateOS © 2026** · Property operations with an enterprise foundation.

[Back to top](#-estateos)

</div>
