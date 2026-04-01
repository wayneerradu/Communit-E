# Faults Escalation And Governance Logic

This is the formal logic reference for Faults Hub behavior.

## Escalation State Model

Field: `escalationLevel`
Values:
1. `none`
2. `plus`
3. `plusplus`

This field is explicit and should not be inferred only from flags.

## Global Escalation Timing

Escalation logic is global per fault priority.

1. `critical`
Escalate+ available immediately.
Escalate++ available immediately.

2. `high`
Escalate+ available immediately.
Escalate++ available after 2 days.

3. `medium` and `low`
Escalate+ available after 4 days.
Escalate++ available after 7 days.

Anchor time for day calculations: initial escalation timestamp.

## Contact Routing

Fault Settings owns contact groups.

1. Initial escalation contacts
Used for every newly escalated fault.

2. Escalate+ contacts by subcategory
Used when Escalate+ is actioned.

3. Escalate++ contacts by subcategory
Used when Escalate++ is actioned.

Contact lists are maintainable and expected to change over time.

## Assignment And Ownership

Canonical fields:
1. `assignedToEmail`
2. `assignedAt`
3. `lastWorkedByEmail`
4. `lastWorkedAt`

Rules:
1. No fault is unassigned after creation.
2. Creator becomes initial owner on save.
3. Reassign action only appears after 120 seconds.
4. Any later reassign also respects the same 120-second guardrail.

## Status Lifecycle

Primary status values:
1. `escalated`
2. `in-progress`
3. `closed`
4. `archived`

Closed items remain reopenable.
Archived items remain reopenable.

## Resident Feedback Request

When fault is linked to a resident and status is in-progress:
1. Show `Request Feedback` action.
2. Action opens WhatsApp with resident mobile and prefilled message:
`Please can we have feedback if <Fault Reference> has been closed, reply with Yes or No`.

## Closure And Reopen Guardrails

Closure flexibility:
1. Admin can close with override reason when needed.
2. Hard lock is intentionally avoided for operational realities.

Reopen behavior:
1. Reopen reason is required.
2. Reopen triggers escalation workflow again.
3. Fault returns to open lifecycle.

## Queue Contract

Open queues include all non-closed, non-archived items.

Supported view modes:
1. Priority (default)
2. By Status
3. By SLA Breach
4. By Age (oldest first)
5. By Last Update (oldest first)

Closed and archived are retained and searchable through status views.

## Nudges

Nudges must:
1. Rotate automatically on timer.
2. Rotate on click.
3. Pause on hover.
4. Persist current nudge per selected fault context.

## Audit And Governance

Every meaningful action must capture:
1. Actor
2. Timestamp
3. Before value
4. After value

Notes support two visibility levels:
1. `internal`
2. `public-safe`

## Concurrency

Two-admin edit conflict handling uses optimistic checks.

Expected flow:
1. Client submits expected update timestamp.
2. Backend compares with latest persisted record.
3. If mismatch, update is rejected with refresh prompt.
