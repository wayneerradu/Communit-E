# Data Persistence And API Reference

This app currently uses JSON-file persistence in `data/`.
Each module has a store wrapper in `lib/*-store.ts`.

## Persistent Data Files

1. `data/faults.json`
2. `data/fault-notes.json`
3. `data/residents.json`
4. `data/resident-history.json`
5. `data/infrastructure-assets.json`
6. `data/projects.json`
7. `data/pr-comms.json`
8. `data/meeting-minutes.json`
9. `data/resolutions.json`
10. `data/parking-lot-ideas.json`
11. `data/vault-assets.json`
12. `data/admin-notifications.json`
13. `data/platform-settings.json`
14. `data/platform-control-center.json`

## Store Files

1. `lib/fault-store.ts`
2. `lib/resident-store.ts`
3. `lib/infrastructure-store.ts`
4. `lib/project-store.ts`
5. `lib/pr-comms-store.ts`
6. `lib/meeting-store.ts`
7. `lib/resolution-store.ts`
8. `lib/parking-lot-store.ts`
9. `lib/vault-store.ts`
10. `lib/notification-store.ts`
11. `lib/platform-store.ts`

## Workflow Entry Points

Primary business logic lives in:
`lib/workflows.ts`

This file handles validation, state transitions, and write operations.

## API Route Groups

### Faults
1. `app/api/faults/*`
Create, list, update, status transitions, escalation actions.

### Residents
1. `app/api/residents/*`
Resident CRUD, status workflow, history.

### Infrastructure
1. `app/api/infrastructure/*`
Asset create/list/update and map-ready data.

### Projects
1. `app/api/projects/*`
Project and task create/update/list operations.

### PRO
1. `app/api/pr-comms/*`
Draft workflow, approvals, send flow.

### Decisions
1. `app/api/meetings/*`
2. `app/api/resolutions/*`
3. `app/api/parking-lot/*`

### Platform
1. `app/api/platform/*`
Settings and control-center operations.

### Utility
1. `app/api/weather/*`
2. `app/api/time/*`
3. `app/api/notifications/*`

## Domain Models

Source of type contracts:
`types/domain.ts`

Core entities:
1. `Fault`
2. `Resident`
3. `InfrastructureAsset`
4. `Project` and `ProjectTask`
5. `PRComm`
6. `MeetingMinute`
7. `Resolution`
8. `VaultAsset`
9. `AppNotification`
10. `PlatformSettings`

## Migration Note

When moving to PostgreSQL:
1. Keep API contracts stable.
2. Replace store file read/write with repository layer calls.
3. Preserve audit semantics and timestamps.
4. Backfill JSON data before switching writes.
