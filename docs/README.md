# CommUNIT-E Documentation

This folder is the operational and technical documentation set for the app.

## Folder Layout

1. `sop/`
Human-friendly operating procedures per module/page for admins and super admins.

2. `logic/`
Workflow rules in decision format:
`Trigger -> Condition -> Action -> Outcome`.

3. `tech/`
System behavior, persistence, API surface, and implementation references.

4. `templates/`
Reusable templates to document new workflows consistently.

## How To Maintain

1. Update SOP wording first when UI labels or user steps change.
2. Update workflow logic when any threshold, role rule, or trigger changes.
3. Update technical docs when data model, store, or API routes change.
4. Keep language aligned with the UI labels used in the app.

## Source References

1. In-app SOP source: `lib/help-sops.ts`
2. Domain types: `types/domain.ts`
3. Workflow rules: `lib/workflows.ts`
4. Persistent stores: `lib/*-store.ts`
