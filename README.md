# CommUNIT-E

CommUNIT-E is a Next.js starter for a community management platform that combines municipal fault escalation, resident records, infrastructure mapping, projects, PR approvals, donor tracking, vault assets, and contextual help.

## What is included

- App Router dashboard shell with these hubs:
  - `Admin Hub`
  - `Residents Hub`
  - `Faults Hub`
  - `Infrastructure Hub`
  - `Projects Hub`
  - `PRO Hub`
  - `Vault`
  - `Help Center`
- Typed domain model for the AppSheet-derived workflows
- Prisma schema for PostgreSQL
- API routes for:
  - login, logout, forgot-password, reset-password
  - Google OAuth start/callback scaffolding
  - fault listing and creation
  - fault escalation
  - Parking Lot voting and promotion
  - PR approval and send gates
- Super Admin control plane for:
  - Google Workspace SSO settings
  - collaborative inbox settings
  - Telegram integration settings
  - maintenance mode
  - service restart actions
  - connector health
  - automation job visibility
  - failure center
  - data quality metrics
  - usage stats
  - template/public surface oversight
  - notification policy controls
  - session policy and active session controls
- Docker and Docker Compose for self-hosted deployment
- Vitest coverage for the main workflow rules

## Important implementation note

The UI and routes currently run on typed in-memory demo data so the product structure and business flows are immediately visible. The database schema is already defined in Prisma, which means the next implementation step is replacing the demo-data module with Prisma-backed repositories and file upload providers.

## Local setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npx prisma generate`.
4. Start the stack with `docker compose up --build` or run the app with `npm run dev`.

## Local Super Admin login

- Development login is available immediately at `/login`
- Default local Super Admin email:
  - `superadmin@unityincommunity.org.za`
- Default local Super Admin password:
  - `CommunitE!2026`
- You can override these in `.env` with:
  - `LOCAL_SUPERADMIN_EMAIL`
  - `LOCAL_SUPERADMIN_PASSWORD`

## Super Admin setup

- Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`
- Open the Super Admin page and save the Google Workspace and mailbox settings
- Set `ALLOW_SERVICE_CONTROL=true` and `SERVICE_RESTART_COMMAND` only when you are ready for the app to invoke real restart commands on the host

## Next recommended steps

1. Replace demo repositories with Prisma CRUD repositories and migrations.
2. Add real session handling and password hashing persistence.
3. Connect SMTP delivery and background notification jobs.
4. Add file upload endpoints for fault photos, asset photos, and vault assets.
5. Render real Leaflet maps with filters and detail popups.

