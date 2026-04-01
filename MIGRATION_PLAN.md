# CommUNIT-E — JSON Store → Prisma Migration Plan

## Current state (as of this PR)

The app uses a dual-storage pattern:
- **Primary**: flat JSON files in `/data/*.json`
- **Mirror**: `JsonStore` table in PostgreSQL (via `db-json-store.ts`)

The Prisma schema now has proper normalized models for every domain.
The migration path is incremental — modules can be moved one at a time
without breaking anything.

---

## Migration order (recommended)

Migrate in this order, lowest risk first:

| # | Module | Store key | Prisma model |
|---|--------|-----------|--------------|
| 1 | Resolutions | `resolutions` | `Resolution` + `ResolutionVote` |
| 2 | Parking Lot | `parking-lot` | `ParkingLotIdea` + `ParkingLotVote` |
| 3 | Vault | `vault-assets` | `VaultAsset` |
| 4 | Meetings | `meeting-minutes` | `MeetingMinute` + `MeetingAction` |
| 5 | PRO Comms | `pr-comms` | `PRComm` + `PRCommApproval` |
| 6 | Projects | `projects` | `Project` + `ProjectTask` |
| 7 | Infrastructure | `infrastructure` | `InfrastructureAsset` + `AssetPhoto` |
| 8 | Residents | `residents` + `resident-history` | `Resident` + `ResidentHistory` |
| 9 | Faults | `faults` + `fault-notes` | `Fault` + `FaultNote` + history tables |

---

## How to migrate a module (step by step)

Take Resolutions as an example:

### Step 1 — Run the Prisma migration
```bash
npx prisma migrate dev --name add_resolutions_table
```

### Step 2 — Backfill existing JSON data into the DB
```bash
node scripts/backfill-json-store-to-db.mjs
# Then write a one-off seeder for the specific model if needed
```

### Step 3 — Replace the store read/write with Prisma calls

In `lib/workflows.ts` (or the new `lib/services/resolution-service.ts`),
replace:
```ts
// Before
import { readResolutionsStore, writeResolutionsStore } from "@/lib/resolution-store";
const items = readResolutionsStore();
writeResolutionsStore(updated);
```
with:
```ts
// After
import { prisma } from "@/lib/prisma";
const items = await prisma.resolution.findMany();
await prisma.resolution.update({ where: { id }, data: { ... } });
```

### Step 4 — Make the service functions async

The current store functions are synchronous (file reads).
When switching to Prisma all functions become `async`.
Update the API route handlers to `await` them.

### Step 5 — Remove the JSON file store for that module

Once Prisma is the source of truth:
- Delete `data/<module>.json`
- Delete `lib/<module>-store.ts`
- Remove the `JsonStore` mirror writes for that key

### Step 6 — Verify and test

```bash
npm run test
npm run dev
```

---

## Checklist per module

- [ ] Prisma model aligned with `types/domain.ts`
- [ ] DB migration created and applied
- [ ] JSON data backfilled to DB
- [ ] Store replaced with Prisma calls
- [ ] Functions converted to async
- [ ] API routes updated to await
- [ ] JSON file deleted
- [ ] Store file deleted
- [ ] `JsonStore` mirror writes removed
- [ ] Tests passing

---

## When all modules are migrated

1. Remove `lib/db-json-store.ts`
2. Remove the `JsonStore` model from `prisma/schema.prisma`
3. Delete the `/data` directory (keep a backup first)
4. Remove `scripts/backfill-json-store-to-db.mjs`

