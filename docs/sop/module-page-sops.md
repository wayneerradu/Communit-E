# Module And Page SOPs

This document is the external SOP companion to the in-app Self Help content.
Baseline source is `lib/help-sops.ts`.

## Admin Dashboard

### Overview
Purpose: Daily command center to prioritize urgent work.
Steps:
1. Check critical tiles first.
2. Work priority queue from highest risk to lowest.
3. Use global search for direct record access.
Expected result: Team works highest-value items first.

### My Work
Purpose: Personal execution queue for logged-in admin.
Steps:
1. Clear assigned faults.
2. Clear project tasks.
3. Complete approvals and meeting actions.
Expected result: Assigned work is current and visible.

## Residents Hub

### Overview
Purpose: Resident coverage and data quality visibility.
Steps:
1. Review totals and street metrics.
2. Monitor missing information indicators.
3. Route cleanup actions to Find a Resident.

### Find a Resident
Purpose: Search and edit resident records safely.
Steps:
1. Search by name, mobile, street, or security company.
2. Open profile preview.
3. Click Edit before changing fields.
4. Save and verify history was written.
Rule: Records are locked by default.

### Residents Map
Purpose: Role coverage and location management on map.
Steps:
1. Use clusters at high zoom-out.
2. Click pin for resident context.
3. Open full profile when deeper actions are needed.

## Faults Hub

### Overview
Purpose: Operational insights and risk analysis.
Steps:
1. Review critical and aged items first.
2. Use chart/tile drilldown to open live lists.
3. Route execution to Fault Queue/Escalations.

### Escalate Fault
Purpose: Capture new fault correctly and trigger workflow.
Steps:
1. Enter mandatory fields including eThekwini reference.
2. Choose escalation mode (Admin or Resident-linked).
3. Pin location and save.
Outcome: Fault enters queue and escalation sequence begins.

### Fault Queue
Purpose: Service-desk style execution workspace.
Steps:
1. Filter queue view.
2. Select fault row.
3. Use workspace actions: edit, status updates, escalate, notes.
Rule: Workspace is read-only until Edit is clicked.

### Fault Map
Purpose: Open-fault hotspot visualization.
Steps:
1. View open faults only.
2. Use category color and subcategory icon logic.
3. Zoom for cluster expansion and detail.

### Assigned To Me
Purpose: Personal fault handling for logged-in admin.
Steps:
1. Filter by priority and SLA breach.
2. Work oldest and stale items first.

### Escalations
Purpose: Action faults ready for Escalate, Escalate+, Escalate++.
Steps:
1. Open grouped readiness cards.
2. Click item to continue in workspace.
3. Execute escalation action when due.

### Closed Faults
Purpose: Closure quality and historical review.
Steps:
1. Review closed/archived items.
2. Reopen with reason when recurrence happens.

### Fault Settings (Super Admin)
Purpose: Configure contact routing for escalation levels.
Steps:
1. Maintain initial contact group.
2. Maintain Escalate+ by subcategory.
3. Maintain Escalate++ by subcategory.

## Infrastructure Hub

### Overview
Purpose: Manage asset inventory quality and completeness.
Steps:
1. Capture asset with type, condition, location, and photo.
2. Keep notes current.
3. Use data-quality queue filters for cleanup.

### Infrastructure Map
Purpose: Visual map of asset coverage and type density.
Steps:
1. Toggle type filters.
2. Use legend and icons for quick identification.
3. Drill to selected asset summary.

## Projects Hub

### Overview
Purpose: Project and task health insights.
Steps:
1. Watch blocked, aging, and stale indicators.
2. Use nudges to prioritize actions.

### Manager
Purpose: Create and run projects/tasks.
Steps:
1. Create project and assign admin.
2. Create task linked to selected project.
3. Select project from queue to open workspace.
4. Edit via explicit Edit actions.

### My Projects And Tasks
Purpose: Work only records relevant to logged-in admin.
Steps:
1. Toggle between All Related, My Projects, My Tasks.
2. Update status and notes on owned items.

### Reporting
Purpose: Export project report PDF.
Steps:
1. Select project.
2. Export PDF.
Current output: Project name, description, and stacked tasks.

## PRO Hub

### PlayGround
Purpose: Draft to approval communication workflow.
Steps:
1. Create draft.
2. Save draft to approval queue.
3. Collect 2 unique admin approvals.
4. Send approved communication.

### Donors
Purpose: Keep donor context visible for campaigns.

## Decisions Hub

### Meeting Scheduler
Purpose: Schedule and sync meetings with calendar.

### Meeting Minuter
Purpose: Capture minutes and action items.

### Resolutions
Purpose: Formal voting and governance outcomes.

### Parking Lot
Purpose: Hold ideas until threshold and promote to action.

## My Profile

Purpose: Maintain user presence and personal details.

## Vault

Purpose: Store shared assets with category and description metadata.

## Notifications

Purpose: Process contextual operational notifications quickly.

## Self Help

Purpose: Searchable SOP and help forum entry point.

## Super Admin

Purpose: Platform and integration configuration with governance controls.
