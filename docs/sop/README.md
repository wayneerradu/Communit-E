# SOP Documents

This folder contains operator-facing instructions.

## Files

1. `module-page-sops.md`
Consolidated SOPs by module and page, aligned to in-app Self Help content.

## Update Rule

Whenever UI labels or process steps change:
1. Update `lib/help-sops.ts`.
2. Update `docs/sop/module-page-sops.md`.
3. Confirm wording is identical to avoid training drift for admins and AI assistants.
