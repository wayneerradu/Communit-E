# Audit, Notifications, And Permissions

This document defines governance controls across modules.

## Audit Trail Principles

Every sensitive operation should capture:
1. Actor identity
2. Timestamp
3. Operation type
4. Before/after values where relevant

Key audit surfaces:
1. Resident history
2. Fault notes and status history
3. Approval signatures for PR drafts and governance items
4. Platform settings changes

## Fault Notes Visibility

Fault notes support:
1. `internal`
2. `public-safe`

Use `public-safe` when content may appear on external/public surfaces later.

## Contextual Notifications

Notification principles:
1. Notify only users relevant to the item.
2. Include enough context to open and action quickly.
3. Preserve unread state until user action.

Examples:
1. Project/task loaded or status changed.
2. Fault escalation and assignment updates.
3. Approval workflow state changes.

Data store:
`data/admin-notifications.json`

## Permission Posture

Role baseline:
1. `SUPER_ADMIN`
Platform config and restricted setup areas.
2. `ADMIN`
Operational module execution and approvals.
3. `PRO`
Communication drafting workflow.
4. `RESIDENT`
Public/internal resident-limited surfaces.

## Fault Settings Restriction

Fault escalation contact configuration is super-admin owned.
Operational admins act escalations without seeing backend contact lists.

## UI Safety Patterns

1. View-first, edit-second lock for sensitive records.
2. Explicit save actions.
3. Contextual buttons appear only when rule conditions are met.
4. Queue-first operations to minimize accidental cross-edits.
