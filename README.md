# EstateOS

EstateOS is a production-oriented property operations platform for managers,
residents, maintenance teams, and property owners.

## v1 capabilities

- Portfolio dashboard with occupancy, collections, maintenance, and lease health
- Property and unit directory with rent and operational performance
- Resident records, emergency contacts, and account-linked resident access
- Lease creation, activation, renewal, move-out, termination, and documents
- Payment ledger, collection summaries, expenses, and monthly financial reports
- Maintenance intake, assignment, status history, attachments, and notifications
- Resident portal for leases, payments, documents, and maintenance requests
- Owner portal with scoped property performance and net operating income
- Maintenance workspace with assigned and unassigned service queues
- Secure uploads with content detection, image optimization, scoped downloads,
  and local durable storage
- Administrator access assignment, audit history, API metrics, and role controls
- OpenAPI documentation, automated tests, Docker deployment, and GitHub Actions CI

## Roles

| Role | Access |
| --- | --- |
| `ADMIN` | Full platform, users, access assignments, audit logs, and metrics |
| `MANAGER` | Portfolio, residents, leases, payments, files, reports, and maintenance |
| `MAINTENANCE` | Work queue, request updates, and maintenance attachments |
| `TENANT` | Personal lease, payments, documents, and service requests |
| `OWNER` | Read-only performance for explicitly assigned properties |

Authorization is enforced by the API. Frontend navigation is only a convenience
and is not treated as a security boundary.

## Local development

Requirements: Node.js 22, npm, PostgreSQL 17, Redis 7, and optionally Docker Desktop.

1. Start PostgreSQL:

   ```sh
   docker compose up -d
   ```

2. Install dependencies:

   ```sh
   npm ci
   npm --prefix server ci
   ```

3. Copy `server/.env.example` to `server/.env`. For the included local
   PostgreSQL container, use:

   ```dotenv
   DATABASE_URL="postgresql://estateos:estateos-local@localhost:5432/estateos?schema=public"
   JWT_SECRET="replace-with-at-least-32-random-characters"
   ADMIN_SEED_NAME="EstateOS Administrator"
   ADMIN_SEED_EMAIL="admin@example.com"
   ADMIN_SEED_PASSWORD="replace-with-a-strong-bootstrap-password"
   SEED_DEMO_DATA="true"
   DEMO_SEED_PASSWORD="replace-with-a-demo-password"
   ```

4. Prepare the database:

   ```sh
   npm --prefix server run prisma:generate
   npm --prefix server run prisma:deploy
   npm --prefix server run prisma:seed
   ```

5. Start the API and web application in separate terminals:

   ```sh
   npm run dev:api
   npm run dev
   ```

The web application runs at `http://localhost:5173`, the API at
`http://localhost:4000`, and API documentation at
`http://localhost:4000/api/docs`.

The application uses authenticated API data in every mode; no demo-role
shortcut or fallback dataset is included in the web bundle.

## Validation

```sh
npm run build
npm test
npm run test:frontend
npm --prefix server run test:coverage
# Against a seeded production stack:
npm run test:e2e
```

## Production deployment

1. Copy `.env.production.example` to `.env.production` and replace every
   placeholder.
2. Point `PUBLIC_URL` at the final HTTPS origin.
3. Start the production stack:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

The stack includes:

- Nginx serving the compiled React application and proxying `/api`
- A non-root Node API container with health checks and graceful shutdown
- PostgreSQL with a durable volume and readiness checks
- Redis for distributed rate limiting
- ClamAV for mandatory malware scanning
- A durable upload volume
- Automatic production migration deployment on API startup

See [OPERATIONS.md](OPERATIONS.md) for monitoring, backup, restore, and release
procedures and [SECURITY.md](SECURITY.md) for the security model.

## API surface

All protected routes accept `Authorization: Bearer <token>`.

- `/api/auth` – bootstrap, login, rotating refresh sessions, logout, password changes, account creation, current user
- `/api/dashboard` – portfolio summary and activity
- `/api/properties` – properties and units
- `/api/tenants` – resident records
- `/api/leases` – lease lifecycle
- `/api/payments` and `/api/expenses` – financial operations
- `/api/maintenance` – work orders and status history
- `/api/uploads` and `/api/files` – upload and authorized retrieval
- `/api/notifications` – user notifications
- `/api/reports` – financial and portfolio reports
- `/api/portal` – tenant and owner scoped data
- `/api/admin` – users, access assignments, audit history, and metrics
- `/api/health` and `/api/ready` – liveness and readiness
