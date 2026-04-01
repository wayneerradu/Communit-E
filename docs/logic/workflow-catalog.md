# Workflow Catalog

This is the cross-module workflow index using:
`Trigger -> Condition -> Action -> Outcome`.

## Residents

1. Resident record update
Trigger: Admin saves resident edits.
Condition: At least one field changed.
Action: Persist resident changes and append resident history.
Outcome: Resident data updated with audit trail.

2. Public form submission triage
Trigger: Public form submits resident data.
Condition: Validation passes.
Action: Create pending resident with public submission marker.
Outcome: Admin queue receives resident for approval/rejection workflow.

## Faults

1. Fault creation
Trigger: Escalate Fault form save.
Condition: Mandatory fields valid.
Action: Create fault as escalated, assign owner, log notes/history, trigger contact workflow.
Outcome: Fault appears in queue and escalation lifecycle starts.

2. Escalate+ readiness
Trigger: Fault age reaches threshold by priority.
Condition: Escalate+ not yet actioned.
Action: Show Escalate+ action and nudge.
Outcome: Admin can escalate to next contact group.

3. Escalate++ readiness
Trigger: Fault age reaches second threshold by priority.
Condition: Escalate++ not yet actioned.
Action: Show Escalate++ action and nudge.
Outcome: Admin can escalate to management group.

4. Fault status transition
Trigger: Admin changes fault status.
Condition: Edit lock opened and rules pass.
Action: Persist status, timestamps, actor details, and audit entries.
Outcome: Queue, metrics, and notifications update.

5. Fault reopen
Trigger: Admin reopens closed/archived fault.
Condition: Reopen reason provided.
Action: Set status to escalated and restart escalation lifecycle.
Outcome: Fault re-enters open workflow.

## Infrastructure

1. Asset intake
Trigger: Add Asset action.
Condition: Required fields valid.
Action: Persist asset record including coordinates and optional photo.
Outcome: Asset available in Overview/Map and data quality indicators.

2. Asset quality queue
Trigger: Overview page load or asset update.
Condition: Missing coordinates, review condition, or missing photo.
Action: Include asset in quality queue.
Outcome: Admin can action cleanup from one queue.

## Projects

1. Project creation
Trigger: Save project intake.
Condition: Validation passes.
Action: Persist project, generate project reference, notify contextual admins.
Outcome: Project appears in queue and boards.

2. Task creation
Trigger: Save task intake.
Condition: Linked project selected.
Action: Persist task with generated task reference and notify assignee.
Outcome: Task appears in project workspace and board lanes.

3. Status movement notifications
Trigger: Project/task status changes.
Condition: Status changed from previous value.
Action: Send in-app notification to contextual targets.
Outcome: Notification center and drawer reflect change.

## PRO Communications

1. Save draft
Trigger: PRO saves draft.
Condition: Required draft fields valid.
Action: Move item to pending approval queue.
Outcome: Draft awaits two unique admin approvals.

2. Approval
Trigger: Admin approves draft.
Condition: Approver is admin/super admin and not draft owner.
Action: Add unique approval signature.
Outcome: Draft approved once two approvals are collected.

## Decisions

1. Meeting scheduling
Trigger: Schedule meeting form submit.
Condition: Required fields valid.
Action: Persist meeting minute baseline and calendar metadata.
Outcome: Meeting appears in Decisions module lifecycle.

2. Resolution voting
Trigger: Admin submits vote.
Condition: Option valid and vote window open.
Action: Persist vote and recompute quorum progress.
Outcome: Resolution status updates when quorum/threshold reached.
