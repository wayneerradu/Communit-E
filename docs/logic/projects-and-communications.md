# Projects And Communications Logic

## Projects Lifecycle

## Project Creation

Trigger: Save project intake form.
Validation:
1. Title and description required.
2. Optional assignment and dates.
Actions:
1. Generate unique project reference.
2. Persist project in store.
3. Send contextual notification.
Outcome: Project appears in manager queue, boards, and reporting.

## Task Creation

Trigger: Save task intake form.
Validation:
1. Linked project required.
2. Task title required.
Actions:
1. Generate task reference under project reference.
2. Persist task under project.
3. Clear task form UI.
4. Notify assignee contextually.
Outcome: Task appears in project workspace and task board.

## Workspace Editing

Rule:
1. Select project from queue to load project workspace.
2. Project/task fields are view-first until Edit is clicked.
3. Save persists updates and timestamps.

## Notifications

Contextual targets:
1. Project owner/admin.
2. Task assignee.
3. Creator when relevant.

Event examples:
1. Project loaded.
2. Task loaded.
3. Status moved.

## Reporting Export

Current exported PDF scope:
1. Project Name
2. Project Description
3. Stacked Tasks

File naming:
`<ProjectRef>-Report.pdf`

## PRO Communication Lifecycle

## Draft Creation

Trigger: PRO creates draft.
Action: Persist as `draft`.

## Save Draft To Queue

Trigger: PRO saves draft for approval.
Action: Move to `pending-approval`.

## Approval Rule

Conditions:
1. Approver must be admin/super admin.
2. Draft owner cannot self-approve.
3. Two unique admin approvals required.

Outcome:
Status moves to `approved`.

## Send Rule

Condition:
Draft has required approvals.

Action:
Send action marks draft as `sent`.

Outcome:
Communication lifecycle completes with governance trail.
