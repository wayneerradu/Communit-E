# CommUNIT-E Developer Notes

## Locked Product Decisions

- `CommUNIT-E` is an internal `admin-only` platform. Residents do not log in or use the app directly.
- Authentication will use `Google Workspace / Google Identity` SSO.
- The platform must support a `Super Admin` role in addition to standard internal admin roles.
- The UI must feel slick, modern, premium, and highly polished across desktop and mobile layouts.
- The app will be `mobile-friendly`, but optimized for internal operations rather than public self-service.
- Initial hosting target is `Windows self-hosted`.
- The core technical direction remains `Next.js + TypeScript + PostgreSQL + Docker`, designed to remain portable to Linux/Azure later.

## Email And Inbox Decisions

- `hello@unityincommunity.org.za` must be incorporated into the platform design.
- This mailbox should serve as the primary `support / triage` address.
- Google Workspace `Collaborative Inbox` behavior is required.
- CommUNIT-E remains the `single source of truth`; email is a communication channel, not the canonical record.
- Outbound emails should be designed to send from `hello@unityincommunity.org.za`.
- Inbound emails to `hello@unityincommunity.org.za` should be modeled for later ingestion/sync into the app timeline and triage workflows.
- Collaborative inbox behavior must include app-level ownership of email threads.
- Email threads must be assignable to a specific internal admin from within CommUNIT-E.
- Email threads should support reassignment, status tracking, and linkage to a fault, resident, project, or general support item.
- Thread ownership and workflow state must live in CommUNIT-E even if the source email originated in Google Workspace.

## Triage Thread Requirements

- Each inbound email thread should support:
  - `threadId`
  - `subject`
  - `from`
  - `receivedAt`
  - `assignedTo`
  - `status`
  - `linkedRecordType`
  - `linkedRecordId`
  - `priority`
  - `lastResponseAt`
  - `lastUpdatedBy`
- Recommended thread statuses:
  - `New`
  - `Unassigned`
  - `Assigned`
  - `Waiting on Municipality`
  - `Waiting on Internal Team`
  - `Resolved`
  - `Closed`

## Design Implications

- Faults and communications should include an email activity timeline.
- Triage workflows should support shared handling of inbound messages tied to records in the app.
- The architecture should allow a future inbound-mail sync service without restructuring the core data model.

## Super Admin Control Plane

- A dedicated `Super Admin` area is required inside the platform.
- This area should manage:
  - Google Workspace / Google Identity SSO configuration
  - the `hello@unityincommunity.org.za` collaborative inbox configuration
  - Telegram group integration and test messaging
  - service restart operations for the self-hosted environment
  - maintenance mode controls and maintenance messaging
- These controls should be designed as first-class platform settings and operational tools, not hidden environment-only features.

### Super Admin Oversight Areas

- The Super Admin area must also include:
  - reporting governance
  - KPI and analytics oversight
  - usage statistics
  - maintenance management
  - platform health visibility
  - app/service health visibility
  - audit and export governance
  - assistant usage oversight
  - session policy and active-session control

### Platform Health / Security Center

- The Super Admin area should include a dedicated `Platform Health` or `Security Center` section.
- This view should provide a clear operational picture of the platform and host environment.
- Recommended health areas include:
  - app health
  - database health
  - mailbox sync health
  - notification/Telegram health
  - scheduled job/automation health
  - active maintenance status
  - last health refresh time
  - CPU usage where available
  - memory usage where available
  - usage trend visibility where available

### Reporting Governance

- Reporting and exports must be governed inside the Super Admin area.
- Super Admin should have visibility into:
  - platform-wide reporting
  - operational KPI rollups
  - export activity
  - reporting dependencies and failures
- Export requests/actions should be auditable, including:
  - requester
  - approver where relevant
  - date/time
  - export type
  - scope/filters where relevant

### KPI And Analytics Dashboard

- Super Admin should have a KPI and analytics dashboard covering the full platform.
- Recommended KPI domains include:
  - residents
  - faults
  - infrastructure
  - projects
  - resolutions
  - communications
  - calendar activity
  - notification performance
- KPI dashboards should avoid expensive real-time recalculation where possible and favor responsive reporting views.

### Usage Statistics

- The platform should collect and surface useful usage statistics for Super Admin oversight.
- Recommended usage areas include:
  - dashboard usage
  - major module usage
  - search usage
  - help/self-help usage
  - assistant usage
  - export usage
  - common workflow bottlenecks
- Usage reporting should help improve training, UX, and platform adoption.

### Maintenance Management

- Maintenance management belongs in the Super Admin area.
- It should remain separate from branding and general settings.
- Super Admin should control:
  - maintenance windows
  - maintenance notices
  - active maintenance mode
  - emergency operational actions
- Maintenance actions must be fully audit-tracked.

### Assistant Governance

- Assistant usage should be logged for context and audit.
- Super Admin should be able to review assistant usage patterns at a high level to understand:
  - where admins need the most help
  - which modules generate the most assistance requests
  - where help content or UX improvements are needed

### Audit Rollups

- The Super Admin area should include audit rollups and human-readable platform-wide change visibility.
- It should support reviewing:
  - repeated failures
  - major configuration changes
  - access changes
  - export activity
  - maintenance events
  - connector/integration issues

### Session Governance

- The platform must support proper app-side session governance in addition to Google SSO.
- Required session capabilities include:
  - tracked active sessions
  - idle timeout policy
  - absolute session lifetime
  - warning before expiry
  - multiple-session policy
  - manual logout
  - Super Admin session revocation
  - revoke one session
  - revoke all sessions for a user
  - last seen / last activity visibility
- Session actions must be auditable.

## Module: Profile, Presence And Preference

- Every administrator must have a `Profile, Presence and Preference` area tied to their Google SSO identity.
- This module is internal and applies to all admin users on the platform.

### Identity And Profile

- The user profile should be anchored to the Google SSO login.
- The platform should pull from Google where available:
  - full name
  - email address
  - Google profile image
- The user must be able to add or amend:
  - nickname
  - mobile number
  - address
  - uploaded profile picture override
- The email address should be treated as the primary login identity.
- If a user uploads a profile picture in the app, it should override the Google profile image.
- If no uploaded image exists, fall back to the Google image.
- If neither exists, render initials in a circular avatar.

### Avatar And Assignment Visibility

- Profile pictures must render as circular avatars throughout the platform.
- Avatar, display name, and presence status must appear consistently anywhere work is assigned or owned.
- This includes, at minimum:
  - faults
  - inbox threads
  - projects
  - tasks
  - comments
  - activity/history views

### Presence

- Each admin can set their current presence status.
- Locked statuses:
  - `Active`
  - `Busy`
  - `Do Not Disturb`
  - `On Vacation`
  - `Offline`
- Presence must remain visible throughout the platform so teams can see who is available and who is not.
- Presence should influence assignment UX by making availability obvious before work is assigned.

### Preferences

- The module should include user-level visual preferences.
- Admins can choose app colors through a controlled color picker experience.
- The selectable colors must be limited to approved palettes only.
- Approved palettes must be safe for:
  - light mode
  - dark mode
  - outdoor / sunlight readability
- Users should be able to choose:
  - foreground-accent color
  - background/surface theme family
- Free-form unrestricted color selection should not be allowed.
- The system should provide curated color options that remain accessible and readable.

### Typography

- The default font across all modules must be `Aptos`.
- Font choice is a platform-wide setting, not a per-user preference.
- Only the `Super Admin` may change the platform font setting.
- Font controls must live in the `Super Admin` area.

## Visual Direction

- The platform should target an `Apple-level` standard of polish and refinement.
- The UI should feel:
  - slick
  - modern
  - premium
  - calm
  - clean
  - highly intentional
- The product should use `Apple-inspired` interface qualities without becoming a direct clone.

### Visual Characteristics

- Use soft depth, subtle translucency, layered surfaces, and refined rounded corners.
- Use smooth motion and transitions that feel polished and deliberate.
- Keep layouts clean, spacious, and uncluttered.
- Use strong hierarchy, crisp spacing, and high-quality iconography.
- Ensure mobile layouts feel native-like and premium, not merely compressed desktop layouts.

### Color And Theme

- All platform colors must follow the premium Apple-inspired design context while remaining original to CommUNIT-E.
- Color choices should feel elegant, restrained, and product-grade rather than loud or generic.
- Theme palettes must still respect:
  - light mode readability
  - dark mode readability
  - sunlight readability
  - operational clarity

### Images And Avatars

- Profile images, photos, and visual media should sit naturally within the same premium Apple-inspired design context.
- Avatars, thumbnails, cards, previews, and image containers should feel cohesive with the overall visual system.
- Image treatment should remain clean and premium, with careful cropping, spacing, and presentation.

### Product Rule

- The design goal is `Apple-inspired polish with a distinct CommUNIT-E identity`.
- Do not build a direct Apple clone.

## Module: Residents Hub

- The `Residents Hub` is a core operational module and must support both elegant daily use and efficient bulk administration.
- It must be designed as a structured workflow hub, not a simple list of records.

### Resident Lifecycle

- Residents move through the following lifecycle sections:
  - `Pending`
  - `Active`
  - `Rejected`
  - `Leavers`
  - `Archived`
- `Rejected` and `Leavers` records must automatically archive after `1 month`, while still remaining searchable in history.
- Manual archive must also be allowed where appropriate.
- Archived records must be read-only.

### Public Application Form

- A public-facing resident application form is required.
- This form creates a `Pending` resident only and does not create a login/account.
- The form must use hard validation:
  - required fields must be completed
  - the form cannot submit with missing required fields
  - inline validation must be shown
  - submit remains disabled until valid
- Required resident fields:
  - full name
  - physical address
  - mobile number in WhatsApp format
  - security company
  - email address
- Security company options are locked to:
  - `Blue Security`
  - `Duncan Security`
  - `Armour Security`
  - `Fidelity ADT`
  - `Other`
  - `None`
- Selecting `Other` must reveal a required free-text field for the company name.
- The form must require consent confirming:
  - understanding of POPIA 2013
  - agreement not to share private information
  - agreement not to hold WhatsApp administrators responsible for privacy
  - acknowledgement of WhatsApp group rules
  - agreement to abide by those rules
- The form must require the applicant to confirm they are applying for their own household/residence.
- A confirmation email should be sent after successful submission stating the application is pending review.

### Address Normalisation And Geofencing

- Resident addresses must be normalized for `Mount Vernon, Durban, 4094`.
- The address model should enforce:
  - street number
  - road name
  - Mount Vernon
  - Durban
  - 4094
- `Mount Vernon`, `Durban`, and `4094` should default/fix in the UI.
- Road-based targeting and reporting must use the normalized `road name` field.
- Google Maps links must use the normalized address.
- Public applications must be geofenced to `Mount Vernon, Durban, 4094`.
- Out-of-area applications must:
  - be placed into `Rejected`
  - record the rejection reason
  - notify admins
  - send a branded decline email with logos and polished formatting
- Out-of-area records must still remain visible to admins in review/history with the exact reason shown.

### Verification And Activation

- Activation requires explicit admin confirmation of:
  - address verified
  - mobile verified
  - added to Community WhatsApp Group
  - consent accepted
- A resident cannot become `Active` until WhatsApp group membership is confirmed.
- Admins must see a blocking reminder/banner when trying to activate before WhatsApp confirmation.
- Verification evidence should be tracked through checklist state and internal notes, not uploaded proof documents.
- Internal verification notes must be supported.

### Leavers And Rejoin Governance

- `Leavers` is a first-class resident state and must not be treated as archive only.
- Leave reasons must use a standardized list:
  - `Too much noise`
  - `Moved away`
  - `Deceased`
  - `Requested removal`
  - `Duplicate member`
  - `Other`
- `Other` must reveal a required explanation field.
- `Deceased` residents must remain in history but be blocked from normal reapplication.
- If a previous `Leaver` reapplies, the form must dynamically detect the prior record from the mobile number and require a `motivation to rejoin`.
- The motivation field must be mandatory in that case.
- Admin review must show:
  - previous leave reason
  - prior history
  - new motivation
- A former leaver cannot re-enter the group without admin review and approval.
- Reapplications should link back to the same historical person identity, not create a disconnected history.

### Duplicate Detection And Record Integrity

- Only one active application per mobile number/email may exist at a time.
- Duplicate detection must check:
  - mobile number
  - email address
  - similar physical address
- Exact duplicates must be blocked from creating disconnected duplicate identities.
- Similar matches must be flagged for review.
- Duplicate handling UX must support:
  - exact duplicate warning
  - possible duplicate warning
  - side-by-side comparison
  - merge/update/review actions

### Resident Views And Navigation

- The Residents Hub should include these primary views:
  - `Overview`
  - `Pending`
  - `Active`
  - `Rejected`
  - `Leavers`
  - `Archived`
  - `Map`
  - `Outreach`
  - `Imports`
  - `Needs Mapping`
- The hub must include both:
  - premium card-based/summary experiences
  - efficient list/table experiences for bulk admin work

### Overview Metrics

- The Residents Hub overview should show at least:
  - pending residents
  - active residents
  - active residents not yet in WhatsApp
  - residents added this month
  - leavers this month
  - rejected this month
  - needs mapping count
  - recent outreach count

### Resident Profile Page

- Each resident must have a dedicated resident profile page.
- This page should include:
  - summary banner
  - resident details
  - normalized address
  - verification checklist
  - WhatsApp membership state
  - outreach/communication history
  - timeline/history
  - audit/governance view
  - related faults later when integrated
- A summary banner should show at a glance:
  - current resident state
  - geofence result
  - WhatsApp state
  - reapply history if applicable
- Historical records shown in search or linked views should appear greyed out with clear labels like:
  - `Rejected`
  - `Leaver`
  - `Archived`

### Search, Filtering, And Selection

- Smart search must support:
  - name
  - mobile number
  - email
  - road
  - address
  - security company
  - WhatsApp state
  - lifecycle status
- Admins must be able to filter by:
  - road
  - security company
  - WhatsApp membership
  - resident status
- The hub must support bulk selection and live selected-resident counts.

### WhatsApp Membership Management

- Each resident must have a WhatsApp membership field with states such as:
  - `Not Added`
  - `Added`
  - `Left Group`
  - `Removed`
  - `Declined Invite`
- WhatsApp-related fields should include:
  - WhatsApp number confirmed
  - membership state
  - added date
  - added by
  - leave/remove reason
  - rejoin motivation where applicable
- Moving someone to `Leavers` must update WhatsApp state as part of the workflow.
- The system must make `active residents not yet in WhatsApp` highly visible as a growth opportunity.

### Map And Google Maps Integration

- Residents must integrate tightly with Google Maps.
- Every resident card/profile should include an `Open in Google Maps` action.
- The hub must include a dedicated resident `Map View`.
- The resident map must:
  - default to `Active` residents
  - support filters
  - support road-based targeting
  - support bulk selection from the map
  - support map-based outreach actions
- Map markers should visually distinguish:
  - active in WhatsApp group
  - active not in group
  - pending
  - non-active historical states hidden by default unless filtered
- Addresses should be geocoded automatically where possible.
- Failed or ambiguous geocoding must go into a `Needs Mapping` queue.
- Admins must be able to manually correct a pin if geocoding is wrong.
- Mapping quality should support status concepts such as:
  - mapped successfully
  - needs mapping
  - ambiguous address
  - manually corrected pin
  - last map verification date

### Outreach And Communication

- The Residents Hub must include a first-class `Outreach` section.
- Outreach must support:
  - one road
  - multiple roads
  - manual resident selection
  - map-based selection
- Outreach channels should support:
  - email
  - WhatsApp-linked outreach workflows
- WhatsApp sending should begin as a guided/pre-filled workflow rather than full automation on day one.
- Outreach must support categories such as:
  - `WhatsApp growth`
  - `Service alert`
  - `Road notice`
  - `Community update`
- Every outreach action must include:
  - preview
  - recipient count
  - exclusions
  - reason/category
  - message body/template
  - confirmation step
- Outreach templates should be centrally managed and reusable.
- Pending, rejected, leaver, and archived residents should be excluded from outreach by default unless explicitly included.
- Outreach actions must be logged into resident history and audit.
- Communication history must be visible per resident.

### CSV Import And Export

- Residents Hub must support:
  - CSV import
  - CSV export
- CSV import must support an initial large import of `400+` residents.
- The import wizard must support:
  - import mode choice (`Import as Pending` / `Import as Active`)
  - column mapping
  - preview before import
  - duplicate handling modes
  - result summary report
- `Import as Active` must enforce active verification rules.
- Duplicate handling must support:
  - `Skip existing`
  - `Update existing`
  - `Create as new pending review` only for non-exact matches
- Exact mobile/email duplicates must not create disconnected duplicate identities.
- Every bulk import must require an `import reason`.
- Import results must show:
  - created
  - updated
  - skipped
  - duplicates
  - failed rows
- Imported residents must generate the same audit/governance records as manual actions.

### Manual Admin Actions

- Admins must be able to manually add residents directly into:
  - `Pending`
  - `Active`
- If directly added into `Active`, the same verification checklist data must still be captured.
- Manually added active residents should trigger in-app notifications to all admins.
- Admins must also be able to manually move a `Rejected` resident back into `Pending` for reconsideration.

### Notifications

- New pending resident applications should notify admins.
- Resident lifecycle events such as approval, rejection, and leaver status should be available as Telegram notification event types.
- Telegram notifications must be:
  - readable
  - legible
  - concise
  - operationally useful
- Default Telegram delivery window:
  - Monday to Friday
  - 08:00 to 20:00
- Telegram notifications must be suppressed outside that window unless an admin overrides it in their own settings.

### Governance, Audit, And History

- Every meaningful resident action must create a readable audit entry.
- Audit entries must capture:
  - who acted
  - what changed
  - from what
  - to what
  - when
  - why
  - whether the action was manual, imported, or automatic
- Resident records must include a readable timeline/history showing:
  - application
  - verification
  - approval
  - rejection
  - leaver actions
  - archive actions
  - communications
  - notifications sent
  - reapply events

## Module: Faults Hub

- The `Faults Hub` is a core incident-management module and must be treated as one of the most important operational areas in the platform.
- It must support fault capture, escalation, ownership, SLA tracking, reply ingestion, duplicate handling, resident linkage, maps, reporting, and governance.
- The design target is a world-class internal operations experience with polished UX and strong control.

### Fault Entry Paths

- Faults can enter the system through at least two main paths:
  - an admin logging a fault using a reference number from a separate municipal app/system
  - an admin escalating on behalf of a resident who has already received a reference number
- The original municipal/reference number must always be stored exactly as received, regardless of department-specific formatting.
- Faults may also later support direct admin-created incidents where no resident is attached initially.

### Core Fault Fields

- Each fault must capture at minimum:
  - original reference number
  - department
  - fault category/type
  - priority
  - normalized fault address
  - road name
  - description
  - image/photo optional
  - linked resident optional
  - captured by admin
  - assigned admin
  - first escalation date
  - ward
  - map coordinates where available
  - nearest landmark optional
- Fault category/type must be separate from department.
- Example:
  - `Water Leak` category belongs to `Water` department

### Department And Configuration Model

- Super Admin must be able to add, change, and amend all fault-related configuration from the platform.
- The platform must support a manageable department list such as:
  - `Electricity`
  - `Water`
  - `Roads`
  - `Sewer`
  - `Refuse`
  - `Parks`
  - and other future departments
- Each department must support configurable escalation tiers:
  - primary department contacts
  - `Escalate+` contacts
  - `Escalate++` director contacts
- Contact configuration must support:
  - multiple recipients per tier
  - add/edit/amend from the app
  - active/inactive state
  - recipient type rules such as `To` and `Cc`
  - fallback behavior if contacts are missing
- The ward councillor must always be included on the first escalation email.

### Priority Model

- Fault priority must be captured at creation and must drive internal reminders and escalation behavior.
- Priority values should include:
  - `Low`
  - `Medium`
  - `High`
  - `Critical`
- Priority may be updated later, but every change must be audited.
- Priority must influence:
  - SLA visibility
  - escalation urgency
  - dashboard prominence
  - internal notifications
  - reporting

### Fault Status Model

- Faults must support a full operational status model, not only escalation timing.
- Recommended statuses:
  - `New`
  - `Escalated`
  - `Awaiting Feedback`
  - `Awaiting Municipality Action`
  - `Follow-up Required`
  - `Resolved`
  - `Closed`
  - `Duplicate`
  - `Cancelled`
- Statuses must be clearly visible across list views, profile views, dashboards, and map views.

### Assignment And Ownership

- Every fault should have a clear internal owner.
- Fault ownership should support:
  - assigned admin
  - secondary/support admin optional
  - date assigned
  - reassignment history
  - owner presence awareness from the Profile/Presence module
- Assignment behavior must respect admin availability rules defined elsewhere in the platform.

### Escalation Timeline And SLA Logic

- Saving a new fault must automatically trigger the first escalation email immediately.
- The escalation timeline runs from the `first escalation date`.
- Default business-day escalation schedule:
  - `Day 3 business days` = nudge for feedback
  - `Day 5 business days` = `Escalate+`
  - `Day 7 business days` = `Escalate++`
- Business-day rules must be explicit:
  - weekends excluded
  - public holiday handling should be configurable later
  - timeline behavior must be consistent and auditable
- The system must support internal nudges and reminders before or when each escalation stage becomes due.

### Meaningful Response And Escalation Suppression

- The platform must distinguish between:
  - no response
  - auto acknowledgement
  - meaningful response
  - progress update
  - closure confirmation
- Automatic nudge/escalation prompts should stop or pause when:
  - a meaningful reply is received
  - the admin marks the fault as `Awaiting Municipality Action`
  - the escalation clock is paused manually
  - the fault is resolved/closed/cancelled/merged
- Admins must be able to manually classify whether a response is meaningful.

### Escalation Email Engine

- All outbound escalation emails must use templates.
- Template types must include:
  - first escalation
  - nudge
  - `Escalate+`
  - `Escalate++`
  - optional follow-up / closure templates later
- Templates should support:
  - a common branded CommUNIT-E shell
  - department-specific content variations
  - editable configuration by Super Admin
- Every escalation email body should include:
  - priority
  - fault address
  - description
  - original reference number
  - age of the fault since first escalation
  - image/photo where possible
  - latest admin note if included
- Later escalations must add previous recipients and append the next escalation tier rather than replacing earlier recipients.
- Images should be attached or included gracefully when available.

### Internal Notes, External Notes, And Communications

- Fault notes must support separation between:
  - internal admin notes
  - external escalation content
  - municipality replies
  - resident-linked notes
- Admins must be able to add notes at any stage.
- Admin notes may be optionally included in outbound emails.
- Notes added during `Nudge`, `Escalate+`, or `Escalate++` should be appended into that email body as escalation updates.
- Every note must preserve:
  - author
  - timestamp
  - whether it was included in outbound email

### Mailbox Reply Ingestion

- The platform must scan the `hello@unityincommunity.org.za` collaborative inbox for replies related to faults.
- Reply matching must use:
  - reference number first
  - then fallback metadata such as subject line or prior recipients
- Matched replies must:
  - attach to the fault communication timeline
  - update `last response received at`
  - remain reclassifiable by admins if the automatic match is wrong

### Communication Timeline

- Every fault must include a clear readable communication timeline showing:
  - record creation
  - first escalation
  - nudges sent
  - `Escalate+`
  - `Escalate++`
  - replies received
  - manual notes
  - assignment changes
  - status changes
  - resolution/closure events
- This timeline must be easy to scan and separate internal events from external communication while keeping both visible together.

### Duplicate And Master Fault Model

- Duplicate/same-fault handling is required and must be first-class.
- If multiple residents log the same incident, the system should support:
  - detecting possible duplicates by address + category + timeframe
  - linking multiple residents to one master fault
  - one primary fault record with multiple affected residents
  - duplicate/child fault states
- Faults marked as duplicate must not create disconnected escalation trails.
- Admins must be able to merge or link related faults as part of duplicate handling.

### Affected Residents And Behaviour Intelligence

- A fault may have:
  - one reporting resident
  - multiple affected residents
  - no resident attached initially
- Resident-linked faults must append notes or history to the resident record.
- The platform should help identify:
  - residents repeatedly logging the same issue
  - many residents affected by the same fault
  - repeated incidents from the same address/road
- This intelligence should support operational insight and not punitive behavior.

### Fault Location And Mapping

- Faults must support:
  - normalized address
  - road name
  - map pin / coordinates
  - Google Maps link
  - ward
  - landmark optional
  - future link to infrastructure assets
- The Faults Hub must include a dedicated map view.
- Fault map capabilities should include:
  - fault pins
  - filtering by department, priority, and status
  - road clustering
  - hotspot visibility
  - overlay with resident and infrastructure context later

### Photos And Media

- Faults should support multiple photos.
- Photos can be added:
  - at creation
  - later during follow-up
- Photo handling should support:
  - preview in the fault record
  - inclusion/attachment in emails where possible
  - timeline visibility
  - timestamp awareness

### Fault Operational Views

- The Faults Hub should include these main working views:
  - `Overview`
  - `New`
  - `Awaiting Response`
  - `Follow-up Due`
  - `Escalate+ Due`
  - `Escalate++ Due`
  - `Resolved`
  - `Closed`
  - `Duplicates`
  - `Map`
  - `By Department`
  - `By Priority`
- These views should combine polished high-level insight with efficient queue management.

### Dashboard Metrics And Reporting

- Fault metrics should include:
  - open faults
  - overdue faults
  - by priority
  - by department
  - by road
  - awaiting response
  - `Escalate+` due
  - `Escalate++` due
  - resolved this month
  - repeat faults on same road
  - repeat reports from residents
- Reporting should support analysis such as:
  - slowest responding departments
  - most common fault categories
  - roads with the most issues
  - average time to first response
  - average time to closure
  - most escalated departments
  - hotspot roads or zones

### Closure, Resolution, And Reopen Rules

- Fault closure must be a structured workflow.
- The platform must support deciding:
  - who can mark a fault resolved
  - who can close a fault
  - whether municipality feedback alone is enough
  - whether admin verification is needed
  - whether resident confirmation is required later
- Faults must support reopen behavior if the issue returns.
- Resolution and closure events must be fully audited.

### Override And Manual Controls

- Admins and Super Admins need manual operational controls such as:
  - resend email
  - send escalation early
  - skip escalation step
  - pause escalation clock
  - mark reply meaningful
  - reopen fault
  - merge duplicates
- All overrides must be governed and audited.

### Notifications

- Internal notifications should include:
  - due nudge reminders
  - due `Escalate+`
  - due `Escalate++`
  - critical faults
  - meaningful municipality replies
  - reopened faults
- These should be available through:
  - in-app notifications
  - Telegram notifications according to platform rules
- Telegram messages must remain readable, concise, and operationally useful.

### Governance, Audit, And Readable History

- Every meaningful fault action must create a readable audit entry.
- Audit entries must capture:
  - who created the fault
  - who changed department/category/priority
  - who sent each escalation
  - who marked a reply meaningful
  - who changed ownership
  - who merged duplicates
  - who resolved/closed/reopened
  - when it happened
  - why it happened where relevant
- The fault record should have a readable end-to-end history suitable for operational review and governance.

### Public Fault Dashboard

- A public-facing fault dashboard is required so residents can check whether a fault is open or not without seeing private/internal information.
- The public dashboard must show only public-safe fault information.
- Public dashboard fields should include:
  - `Ref#`
  - `Road name`
  - `Nature of fault`
  - `Current public status`
  - `Fault age in days`
- Example public fault natures include:
  - `Water leak`
  - `Overgrown trees`
  - and other public-friendly category labels
- No private/internal information may appear on the public dashboard.
- Specifically, the public dashboard must exclude:
  - resident details
  - internal notes
  - internal recipients
  - internal ownership
  - private email content
  - internal audit data

### Public Dashboard Metrics

- The public dashboard must display:
  - total faults
  - total open faults
  - total closed faults
  - counts grouped by fault nature/type
- Fault age must show how many days the municipality has left the fault open.

### Public Fault Retention

- On the admin side, a fault should remain visible on the dashboard until the `1st of every month` before disappearing from the main dashboard view.
- Historical records must still remain available for reporting, search, and export even after they roll off the main dashboard.

### Resident Feedback Before Closure

- If a fault was escalated on behalf of a resident, admins must be able to:
  - request feedback from the resident
  - confirm with the resident that the work has been completed
- The fault should not be closed on the CommUNIT-E side until that feedback/confirmation step is handled.
- This resident confirmation workflow should be visible in the fault record and timeline.

### Fault Export Requirements

- Fault data must be exportable at any time.
- Export options should include:
  - all faults
  - open faults
  - closed faults
- Export formats must include:
  - Excel
  - PDF
- Exported data should support both operational use and formal reporting.

### Fault KPI Reporting

- On the admin side, KPI and escalation/nudge performance reporting must be exportable for management and director reporting.
- These KPI exports should support showing how departments are performing over time.
- Exportable KPI/reporting views should include at least:
  - nudges due/sent
  - `Escalate+` due/sent
  - `Escalate++` due/sent
  - department response performance
  - ageing/open fault analysis

### Public Fault Status Model

- The public dashboard must use a separate public-safe status model from the richer internal operational statuses.
- Recommended public statuses:
  - `Open`
  - `In Progress`
  - `Awaiting Municipality`
  - `Resolved`
  - `Closed`
- Internal statuses may remain more detailed and operationally specific.

### Public Visibility Rules

- Only public-safe fault data may appear on the public dashboard.
- Exact house numbers or private address detail must not be shown publicly.
- Public fault display should use normalized `road name` and public-safe fault type labels.
- The public dashboard should avoid exposing duplicate records for the same real-world incident.
- One public-facing fault issue should represent one real public issue even if multiple residents are linked internally.

### Public Search And Filtering

- The public dashboard should support at minimum:
  - search by `Ref#`
  - filter by `road`
  - filter by `fault nature`
  - filter by `open/closed/public status`
  - optional filter by department later

### Public Date And Age Display

- Public display should include:
  - `date opened`
  - `last updated`
  - `open for X days`
- Public wording should remain readable and neutral.
- Use phrasing such as `Open for X days` rather than accusatory wording.

### Resident Confirmation Before Closure

- Faults escalated on behalf of a resident require a visible resident-confirmation workflow before closure.
- The workflow should support statuses such as:
  - `Resident confirmation requested`
  - `Resident confirmed complete`
  - `Closure pending admin review`
- If the resident does not respond, the platform should support:
  - reminder attempts
  - a defined wait period
  - admin override to close where appropriate
- All of these actions must be auditable.

### Dashboard Retention Rule

- The monthly dashboard retention rule must be explicit and consistent.
- Closed faults should remain visible on the main dashboard until the next `1st of the month`, after which they roll off the main dashboard view.
- Historical visibility and exportability must remain intact after roll-off.

### Director Reporting And KPI Detail

- KPI packs for directors should support at minimum:
  - department performance
  - performance by priority
  - performance by road
  - average fault age while open
  - average time to first response
  - nudge counts
  - `Escalate+` counts
  - `Escalate++` counts
  - resolved this month
  - oldest open faults
  - top fault types

### Export Governance

- All fault exports must be governed and auditable.
- Export logging must capture:
  - who exported
  - when
  - which dataset
  - which format
  - which filters were applied where relevant

## Module: Infrastructure Hub

- The `Infrastructure Hub` is a core internal asset-intelligence module.
- It must function as a living infrastructure map and asset register that improves over time as more data is captured, verified, and refined.
- It should not rely on the municipal GIS being complete or current.

### Core Purpose

- The Infrastructure Hub should allow admins to:
  - view physical infrastructure on a map
  - capture assets manually
  - enrich assets over time
  - attach photos and GPS
  - link infrastructure directly to faults
  - reduce the need to physically look up asset numbers in the field

### Asset Types

- The system must support configurable infrastructure asset types.
- Initial examples include:
  - streetlight pole
  - electricity substation
  - transformer
  - internet fiber box/cabinet
  - manhole
  - valve
  - pipe segment
  - stormwater drain
  - hydrant
  - pump station
  - road sign
  - other
- Super Admin must be able to add, amend, and manage asset types.

### Infrastructure Layers

- The map must support multiple infrastructure layers, not just a flat set of pins.
- Initial layers should support at least:
  - electricity
  - water
  - sewer
  - telecoms / fiber
  - roads / stormwater
  - community safety / shared infrastructure
- Layers must be configurable and filterable.

### Asset Identity

- Every asset must have an internal `CommUNIT-E asset ID`.
- An official municipal/GIS/utility reference number may be blank initially and added later.
- Assets must be allowed to exist even when no official reference number is known yet.

### Core Asset Data

- Each asset should support at minimum:
  - internal asset ID
  - asset type
  - layer/category
  - official reference number optional
  - road/address context
  - GPS location
  - notes
  - status
  - condition
  - source
  - verification state
  - photos
  - linked faults
  - last verified date

### Geometry And Future-Proofing

- The system should be designed to support more than just points over time.
- Geometry types should remain future-compatible for:
  - points
  - lines
  - polygons later if needed
- Phase 1 may begin primarily with point-based assets, but the data model must not block future line/polygon support.

### Asset Status And Condition

- Assets should support clear operational status values such as:
  - `Active`
  - `Damaged`
  - `Under Review`
  - `Fault Reported`
  - `Repaired`
  - `Decommissioned`
  - `Unknown`
- Assets should also support condition ratings such as:
  - `Good`
  - `Fair`
  - `Poor`
  - `Critical`

### Verification, Confidence, And Source Tracking

- Infrastructure data must support confidence/verification tracking because much of the data will be manual or incomplete.
- Asset verification states should support concepts such as:
  - verified
  - unverified
  - estimated location
  - confirmed by photo
  - confirmed on-site
  - imported from GIS
  - manually added
- Asset records must also track source/origin such as:
  - manual entry
  - municipal GIS import
  - spreadsheet import
  - admin correction
  - field observation

### Photos And Media

- Assets must support one or more photos where available.
- Photo support should include:
  - multiple photos
  - timestamps
  - captions
  - latest photo as cover image
  - later support for before/after comparison if needed

### Views And Navigation

- The Infrastructure Hub must support at least:
  - `Map View`
  - `List/Table View`
  - dedicated asset detail/profile pages
  - operational queues such as needs-attention lists
- The map must be a first-class experience, but the hub should also support operational list work.

### Asset Detail Page

- Each asset should have a dedicated asset detail/profile page.
- The page should include:
  - summary banner
  - asset type
  - internal ID
  - official reference number
  - location details
  - GPS coordinates
  - map preview
  - photos
  - notes
  - linked faults
  - fault history
  - verification/source details
  - timeline/history
  - last verified date

### Manual Capture Workflow

- Because this module will be built up manually over time, the asset capture workflow must be easy and forgiving.
- Admins should be able to:
  - add asset from map pin
  - add asset from list/table
  - add official reference later
  - add photo later
  - refine GPS later
  - merge duplicates
- The workflow must support incomplete records improving over time without losing governance.

### Duplicate Asset Handling

- Duplicate asset handling is required.
- The system should support:
  - possible duplicate warning by proximity + type + road
  - duplicate review
  - merge tools
  - canonical asset record selection

### Map Usability

- The map must be operationally useful, not only visually attractive.
- Required map capabilities should include:
  - zoom-based layer visibility
  - type filters
  - status filters
  - search by asset number/reference/road
  - click pin for quick preview
  - open full asset record
  - clustering when zoomed out
  - visible legend
- Icons must be clearly distinguishable by infrastructure type.
- Colors/icons must remain legible in sunlight and on mobile.
- Selected, unverified, faulted, or critical assets should be visually distinct.

### Fault Linkage

- Faults must be able to be created directly from an infrastructure asset.
- This should prefill location and asset context into the fault record.
- Each asset must show:
  - all linked faults
  - open linked faults
  - historical faults
  - repeated failures
  - date of last issue
- This linkage is one of the most important values of the Infrastructure Hub.

### Needs-Attention Queues

- The hub should include operational queues such as:
  - needs reference number
  - needs GPS correction
  - needs photo
  - needs verification
  - duplicate suspected
  - repeated-fault asset
- These queues should help the infrastructure database mature continuously.

### Road-Based Intelligence

- The system should support road-based asset intelligence such as:
  - all assets on one road
  - broken/flagged assets on a road
  - roads with repeated streetlight failures
  - roads missing mapped assets
  - roads with many resident complaints but low mapped asset coverage

### GIS Import And Improvement Strategy

- Even if municipal GIS data is incomplete, the platform should still support import capability later.
- Infrastructure import capability should remain compatible with:
  - CSV
  - future GIS-like import workflows
  - field mapping
  - source tagging
  - post-import cleanup

### Relationship To Residents And Outreach

- The model should remain compatible with later analysis such as:
  - nearest residents affected
  - residents on the same road
  - residents repeatedly reporting a specific asset
  - outreach tied to asset/fault zones

### Reporting

- Infrastructure reporting should support at least:
  - assets by type
  - assets by road
  - assets without official reference
  - assets with no photo
  - assets with repeated linked faults
  - assets needing verification
  - high-risk infrastructure zones

### Security And Visibility

- The Infrastructure Hub should remain internal-only for now.
- It should not be exposed on the public dashboard at this stage.

### Governance And Audit

- Admins must be able to add and update assets.
- Super Admin must be able to manage asset types, layers, import settings, and infrastructure system rules.
- Every asset add/move/edit/photo upload/merge/verification change must create an audit entry.

## Module: Projects Hub

- The `Projects Hub` is a light collaborative execution module for initiatives that are not faults.
- It should not behave like heavy corporate project management software.
- It should be easy for multiple admins to use together, focused on visibility, collaboration, nudges, and task progress.
- Budget management is explicitly out of scope.

### Purpose

- The Projects Hub should track longer-running community initiatives that require coordination and follow-through.
- Example:
  - `Bellair Primary School Safety Improvement`
  - with tasks such as:
    - road markings
    - crossing line painted
    - warning lights fixed
    - crossing guard arranged

### Project Structure

- Each project should support:
  - project name
  - description
  - status
  - start date
  - target date
  - project lead/owner optional
  - linked road/area optional
  - linked infrastructure optional
  - notes
  - attachments/photos
- Budget-related fields should not be included.

### Project Statuses

- Recommended project statuses:
  - `Planned`
  - `Active`
  - `On Hold`
  - `Blocked`
  - `Completed`
  - `Archived`

### Tasks

- Tasks are the most important layer inside Projects Hub.
- Each task should support:
  - title
  - description
  - assigned admin
  - multiple supporting admins optional
  - due date
  - status
  - linked road/area optional
  - linked infrastructure optional
  - linked fault optional
  - blocker reason where relevant
  - next action
  - notes/comments
  - history
  - last updated date

### Kanban Workflow

- Projects Hub should support a Kanban-style task workflow.
- Locked task buckets/statuses:
  - `Not Started`
  - `Started`
  - `In Progress`
  - `Stuck`
  - `Complete`
- The Kanban experience should be a first-class view.

### Collaboration Model

- Multiple administrators must be able to work on any project.
- Projects should not be designed around one exclusive owner.
- A lead/admin owner may exist for accountability, but collaboration should happen mainly through task assignment and support roles.
- The system should encourage teamwork rather than isolated ownership.

### Views And Navigation

- The Projects Hub should include at least:
  - `Overview`
  - `All Projects`
  - `Kanban Board`
  - `My Tasks`
  - `Stuck Tasks`
  - `Completed`
  - `Timeline / Due Soon`

### Nudges And KPI

- Projects Hub must include nudges and KPI-driven visibility.
- The system should track and surface:
  - overdue tasks
  - stuck tasks
  - tasks with no update for a defined number of days
  - projects with no movement
  - admin workload by open tasks
  - completion rate by admin
  - projects nearing target date
  - tasks in `Stuck` that need help
- The goal is to help the team keep projects moving and identify where support is needed.

### Help-Each-Other Model

- Projects Hub should explicitly support collaborative unblocking.
- For stuck tasks, the UI should make visible:
  - who owns the task
  - who can assist
  - what is blocking it
  - what help is needed
  - how long it has been stuck
- This should help the team work together rather than only monitor delays.

### Activity And Timelines

- Each project should have a readable activity timeline showing:
  - project creation
  - status changes
  - task creation
  - task status changes
  - blocker updates
  - comments/notes
  - completion events
- Each task should also have its own change history.

### Visual And UX Direction

- Projects Hub should be light, fast, and visually clear.
- Kanban should feel smooth and modern, not cluttered.
- Cards should communicate:
  - owner
  - support admins
  - due date health
  - blocker state
  - last updated
- The design should remain consistent with the premium Apple-inspired CommUNIT-E visual direction.

### Linked Context

- Projects should be able to link to:
  - roads/areas
  - infrastructure assets
  - faults where relevant
- This allows projects to sit inside the broader community operations context.

### Reporting

- Projects reporting should support:
  - projects on track
  - blocked projects
  - overdue tasks
  - completion rate by admin
  - tasks stuck by project
  - projects by area/road
  - projects linked to recurring issues/faults

### Future Enhancements

- The model should remain compatible with future enhancements such as:
  - project templates for recurring initiatives
  - milestone support if needed later
  - public-safe progress summaries if ever required

### Governance And Audit

- All meaningful project and task actions must be audited.
- This includes:
  - project creation
  - status changes
  - task creation
  - task assignment/reassignment
  - status changes
  - blocker updates
  - archival/completion

## Platform-Wide Architecture

- CommUNIT-E must be designed as a connected platform, not a collection of disconnected modules.
- The platform should feel unified, consistent, and easy to navigate even as more functionality is added.
- The architecture goal is `world-class internal operations platform` with premium UX and strong governance.

### Platform Shape

- Build CommUNIT-E as one responsive internal web platform.
- It should contain:
  - public-facing surfaces where needed
  - internal authenticated admin surfaces
  - shared visual language
  - shared navigation
  - shared notifications
  - shared audit/governance behavior

### Core Platform Modules

- The platform should be structured around these connected domains:
  - Profile, Presence and Preference
  - Residents
  - Faults
  - Infrastructure
  - Projects
  - Communications
  - Notifications
  - Reporting
  - Super Admin / Platform Settings
  - Help / Self Help
  - AI Assistant

### Cross-Module Relationship Model

- The platform must support strong cross-module relationships.
- Key relationship patterns include:
  - resident linked to faults
  - residents linked to roads
  - faults linked to infrastructure
  - infrastructure linked to roads
  - projects linked to roads
  - projects linked to faults
  - projects linked to infrastructure
  - outreach linked to residents and roads
  - notifications linked to all modules
- These links should feel natural in the UI and not require duplicate data entry.

## Core Entity: Road

- `Road` should be treated as a first-class platform entity, not just a repeated text field.
- This is important because road is a core organizing concept across:
  - residents
  - faults
  - infrastructure
  - projects
  - outreach
  - reporting
- A road entity should support:
  - normalized road name
  - map geometry or central line later if needed
  - linked residents
  - linked faults
  - linked infrastructure
  - linked projects
  - road-level metrics and history
- Road should power targeting, grouping, reporting, and map intelligence across the platform.

## Global Navigation And Work Model

- The platform needs a unified and predictable navigation model.

### Desktop Navigation

- Desktop should use a clear left-side navigation shell with major hubs.
- It should include:
  - Home / Dashboard
  - Residents
  - Faults
  - Infrastructure
  - Projects
  - Communications
  - Reporting
  - Help
  - Super Admin where permitted

### Mobile Navigation

- Mobile should use a simplified navigation model optimized for quick actions and field use.
- It should avoid overcrowding and reduce tap depth wherever possible.

### Global Search

- The platform must include a strong global search.
- Admins should be able to search quickly by:
  - resident name
  - fault reference
  - road
  - project
  - asset
  - email address
  - mobile number
- Search should work as a core platform feature, not separately inside each module only.

### Quick Actions

- The app should support a platform-wide quick actions model.
- Admins should be able to quickly do common actions such as:
  - add resident
  - log fault
  - open map
  - start outreach
  - create project
  - update status

### Global Work Queues

- A world-class operations platform needs shared work queues across modules.
- The platform should surface work such as:
  - residents pending review
  - faults needing nudge
  - faults needing escalation
  - assets needing verification
  - tasks that are stuck
  - items due today
  - important unread replies

## Dashboards

- The first screen must be highly useful and tailored for internal operations.
- Dashboards should exist for:
  - Admin
  - Super Admin
- Dashboards should surface:
  - work needing attention
  - things due soon
  - KPIs
  - quick actions
  - unread or unresolved items

## Notification And Automation Engine

- Notifications and automations should be treated as core platform services, not ad hoc module features.

### Notification Channels

- The platform should support:
  - in-app notifications
  - email notifications
  - Telegram notifications

### Notification Rules

- The system should define:
  - event types
  - who receives what
  - which channel is used
  - quiet hours
  - immediate vs delayed notifications
  - optional digests later
  - user preferences and overrides

### Automation Jobs

- The platform needs a formal automation/job layer for timed and system-generated behavior.
- This should support:
  - fault nudges
  - escalation timing
  - resident archive timing
  - birthday reminders
  - Telegram quiet-hour suppression
  - mailbox polling
  - geocoding retries
  - export/report generation
  - dashboard rollover rules

## Communications Architecture

- Communications should be treated as a platform capability.
- This includes:
  - outbound emails
  - inbound mailbox sync
  - templates
  - thread matching
  - public-safe communications
  - outreach messages
  - approval workflows where needed
- The mailbox is a channel, but CommUNIT-E remains the source of truth.

## Reporting Architecture

- Reporting must be designed at platform level.
- The reporting model should include:
  - live operational dashboards
  - management KPI dashboards
  - public transparency views
  - Excel exports
  - PDF exports
- Exports must remain governed and auditable across all modules.

## Governance And Audit Standard

- Audit and governance should follow one shared platform standard.
- Audit records should consistently capture:
  - actor
  - action
  - entity type
  - entity id
  - before/after where relevant
  - reason where required
  - timestamp
  - source such as manual/import/automatic
- The platform should clearly define:
  - archive vs delete rules
  - immutable history areas
  - override logging
  - export logging

## Usability For Non-Technical Admins

- Most admins are non-technical, so the platform must be simple and easy to use.
- Core UX rules:
  - minimal clicks
  - obvious next steps
  - clear labels
  - plain language
  - no technical jargon in normal workflows
  - strong use of guided actions
  - helpful defaults
  - confirmations only where meaningful
- The app should prefer:
  - step-by-step review flows
  - visible status chips
  - guided forms
  - clear empty states
  - smart warnings
  - progressive disclosure for advanced settings

### In-App Guidance

- Tips and guidance should appear where helpful.
- The system should support:
  - inline helper text
  - tooltips
  - contextual banners
  - task hints
  - explanations for unusual statuses or required actions
- Guidance should help admins understand what to do without overwhelming them.

## Help / Self Help Module

- The platform must include a dedicated self-help area.
- The self-help section should support:
  - module-based guidance
  - simple how-to instructions
  - common troubleshooting
  - explanations of terms/statuses
  - deep links from contextual `?` buttons
- Help content should be easy to manage and understandable by non-technical admins.

## AI Assistant

- The platform should include an internal AI assistant.
- The AI assistant should help admins with:
  - understanding what a screen means
  - what to do next
  - summarizing resident/fault/project histories
  - drafting communications
  - explaining statuses and workflows
  - helping find records or actions faster
- The AI assistant must remain a helper, not the source of truth.
- It must not silently change records without clear user action and confirmation.
- AI help should be designed to reduce confusion and admin effort.

### AI Strategy

- The platform should use a two-layer AI strategy:
  - `Gemini for Google Workspace` for Google-native work
  - `CommUNIT-E Assistant` for app-specific help and workflows

#### Gemini For Google Workspace

- Gemini in Google Workspace should be used where it is strongest, including:
  - Gmail drafting
  - Docs drafting and cleanup
  - Drive/Docs summarisation
  - Calendar-related support
  - general Google Workspace productivity assistance

#### CommUNIT-E Assistant

- The CommUNIT-E in-app assistant is still required because Google Workspace Gemini does not inherently understand the platformâ€™s internal records, workflows, or governance rules.
- The CommUNIT-E Assistant should help with:
  - fault guidance and next-step suggestions
  - summarising resident, fault, project, and meeting histories
  - drafting escalation emails from app data
  - explaining statuses and workflows
  - helping non-technical admins use the system
  - cleaning meeting transcripts and extracting actions/resolutions
  - drafting PRO content and media statements
  - helping with record finding and quick actions

#### Boundaries

- AI must never replace:
  - the platform source of truth
  - approvals/sign-offs
  - governance decisions
  - explicit user confirmation for record-changing actions

## Design System

- The platform needs a shared design system to stay cohesive as it grows.
- This should include:
  - typography rules
  - color tokens
  - icon rules
  - spacing system
  - card and table rules
  - status chip rules
  - avatar rules
  - map UI rules
  - motion rules
  - loading/empty/error states
- The design system must preserve the premium Apple-inspired CommUNIT-E feel while remaining original and operationally clear.

## Module: Resolutions Hub

- The `Resolutions Hub` is an internal-only governance module for recording decisions, resolutions, and polls that would otherwise be lost in chat.
- It should replace informal WhatsApp poll workflows with a structured, auditable, and easy-to-use decision process.

### Purpose

- Any admin should be able to create a resolution or poll.
- The module should preserve:
  - the proposal/question
  - voting options
  - who voted for what
  - when the poll closes
  - the final outcome
  - the full decision history

### Poll And Resolution Types

- The system should support:
  - `Yes / No` resolutions
  - choice polls with up to `4 options`
- Polls are internal only and visible to admins.

### Quorum And Decision Rules

- For `Yes / No` resolutions, a quorum of `4 yes votes` is required for the resolution to pass.
- The voting outcome must remain visible and auditable.
- For multi-option polls:
  - up to `4 options` may be used in round one
  - the option with the most votes should surface as the leading outcome
  - if needed, the top options should be able to move into a second-round revote
- The hub should support a `requires revote` outcome where appropriate.

### Deadlines

- The creating admin must be able to choose the poll deadline in hours.
- The system should automatically close the poll at the configured deadline.
- Closed polls must become read-only for voting.

### Voting Rules

- One admin may cast one vote per resolution/poll.
- Votes must be visible internally.
- Vote history should show:
  - who voted
  - what they voted for
  - when they voted
- Votes cannot be changed after the poll closes.

### Resolution Record Structure

- Each resolution/poll should support:
  - title
  - description/context
  - created by
  - created date/time
  - poll type
  - options
  - deadline in hours
  - status
  - live vote count
  - individual vote visibility
  - final outcome
  - full history
  - optional comments/justification

### Status Model

- Recommended statuses:
  - `Draft`
  - `Open`
  - `Closed`
  - `Passed`
  - `Rejected`
  - `Requires Revote`

### Views

- The Resolutions Hub should include:
  - `Overview`
  - `Open`
  - `Closing Soon`
  - `Closed`
  - `Passed`
  - `Rejected`
  - `Requires Revote`
  - `History`

### Notifications

- The platform should notify admins when:
  - a resolution/poll opens
  - a resolution is nearing deadline
  - a resolution closes
  - a resolution requires revote
- These notifications should work through the platform notification engine.

### Reporting And History

- Resolution history must be preserved permanently unless archived by governance rules later.
- The history should remain searchable and exportable later if needed.
- Resolutions should be included in the general governance model of the platform.

### Governance And Audit

- All resolution actions must be audited.
- This includes:
  - creation
  - opening
  - voting
  - closure
  - final outcome
  - revote creation

## Module: Parking Lot Hub

- The `Parking Lot Hub` is an internal-only idea and deferred-action module.
- It exists to stop ideas, needs, and future items from getting lost in WhatsApp.
- It should act as a structured pipeline before work becomes a resolution or a project.

### Purpose

- The Parking Lot Hub is for:
  - ideas worth keeping
  - needs not yet actioned
  - items waiting for funding/support/timing
  - low-cost/high-impact opportunities
  - future improvements
  - admin/community/branding/equipment requests
- Example items include:
  - stationery
  - clothing
  - table cloth
  - signage
  - supplies
  - small community improvements

### Core Structure

- Each Parking Lot item should support:
  - title
  - description
  - category
  - submitted by
  - submitted date
  - urgency
  - priority
  - estimated cost band
  - expected impact
  - status
  - notes/comments
  - linked resolution optional
  - linked project optional

### Status Model

- Recommended Parking Lot statuses:
  - `New`
  - `Under Review`
  - `Ranked`
  - `Waiting for Funds`
  - `Approved`
  - `Moved to Project`
  - `Declined`
  - `Archived`

### Ranking Model

- Parking Lot items should support lightweight ranking based on:
  - urgency
  - priority
  - estimated cost
  - expected impact
- The system should help surface:
  - low cost / high impact items
  - urgent / low effort items
  - high priority opportunities
  - items suitable for later action

### Cost Model

- Cost should remain lightweight rather than full budgeting.
- Recommended cost handling:
  - `Low`
  - `Medium`
  - `High`
- Optional estimated amount may be added later if needed, but detailed budgeting is not required.

### Impact Model

- Expected impact should also remain simple and lightweight.
- Recommended impact values:
  - `Low`
  - `Medium`
  - `High`
- Future impact dimensions may include:
  - community impact
  - admin impact
  - branding impact
  - safety impact

### Categories

- Suggested categories include:
  - community improvement
  - admin operations
  - branding
  - events
  - safety
  - equipment
  - communications
  - supplies
  - other

### Outcome Paths

- A Parking Lot item may end up in one of several paths:
  - remain parked
  - move to `Resolutions Hub`
  - move to `Projects Hub`
  - be declined
  - be archived
- This linkage is important so good ideas can move into action cleanly.

### Views

- The Parking Lot Hub should include:
  - `Overview`
  - `New Ideas`
  - `Under Review`
  - `High Impact / Low Cost`
  - `Waiting for Funds`
  - `Approved`
  - `Moved to Project`
  - `Declined`
  - `Archive`

### Prioritisation UX

- Prioritisation should remain easy for non-technical admins.
- The UI should avoid complex scoring models exposed to users.
- Instead, it should visually surface concepts such as:
  - quick wins
  - urgent needs
  - high-impact opportunities
  - hold for later

### Collaboration

- Admins should be able to:
  - comment on a Parking Lot item
  - support an idea
  - add context
  - suggest moving the item to a resolution
  - suggest moving the item to a project
- This should make the Parking Lot collaborative and visible rather than a dumping ground.

### Notifications

- Parking Lot notifications should remain lightweight.
- Useful events include:
  - new item added
  - item moved to review
  - item approved
  - item moved to project
  - item sent for resolution

### Governance And Audit

- Parking Lot items must preserve:
  - who created the idea
  - who ranked it
  - who moved it
  - why it was approved/declined
  - when it changed status
- All meaningful actions should be auditable.

### Expert Recommendations

- The Parking Lot should be:
  - light
  - visual
  - sortable
  - rankable
  - easy to move into action
- It must not become a junk drawer.
- Its main job is to help answer:
  - `What should we do next when we have time, support, or funding?`
- The best model is:
  - idea intake
  - simple ranking
  - decision path
  - move to action

## Module: Meetings And Minutes Hub

- The `Meetings and Minutes Hub` is an internal governance and operations module for structured meetings, minute capture, sign-off, and turning decisions into action.
- It should replace informal or easily lost meeting records with formal, searchable, auditable minutes tied to outcomes.

### Purpose

- The module should support:
  - meeting scheduling
  - shared visibility
  - structured agenda templates
  - transcript-assisted minute drafting
  - AI-assisted cleanup and summarisation
  - formal sign-off
  - emailing/distribution of final minutes
  - conversion of action items into projects/tasks/resolutions

### Meeting Record Structure

- Each meeting should support:
  - meeting title
  - meeting date
  - start time
  - end time optional
  - location
  - meeting type
  - agenda
  - attendees
  - apologies optional
  - chairperson
  - secretary
  - status
  - meeting reference/number

### Meeting Types

- Suggested meeting types include:
  - committee meeting
  - operations meeting
  - project meeting
  - special resolution meeting
  - ad hoc meeting
  - event/other scheduled meeting

### Deputy Substitution Rules

- If the chairperson cannot attend, the deputy chairperson must be able to substitute.
- If the secretary cannot attend, the deputy secretary must be able to substitute.
- The system must support this substitution explicitly in the meeting record and sign-off workflow.

### Shared Calendar

- Meetings must live in a shared calendar visible to all admins.
- The shared calendar should also support other date-based items such as:
  - events
  - recurring operational dates
  - refuse collection every Thursday
  - community reminders
  - governance dates
- Calendar entries should support different colors by event type/category.
- The calendar should sync with Google Calendar.

### Meeting Template

- The module should include a structured meeting template with:
  - date
  - time
  - location
  - attendees
  - apologies
  - agenda
  - discussion sections
  - resolutions
  - votes
  - action items
  - next meeting date optional

### Capture And Transcription

- The system should support using phones to help capture and transcribe meetings.
- It should support:
  - transcript upload or input
  - timestamped conversation body
  - manual note capture during the meeting
  - audio/transcript source attachment later where possible

### AI Assistance

- The AI assistant should help by:
  - cleaning up transcripts
  - removing noise/repetition
  - structuring the meeting minutes
  - extracting action items
  - identifying resolutions
  - highlighting votes
  - suggesting linked tasks/projects/resolutions
- AI should prepare a draft only.
- AI must not finalize official minutes automatically.
- Users must review AI-generated content before sign-off.
- The system should indicate that transcript-derived content requires human review.

### Governance Workflow

- Recommended minute workflow:
  - draft created
  - secretary reviews and edits
  - secretary signs off
  - chairperson signs off
  - final minutes locked
  - final minutes distributed/emailed
  - action items created from approved minutes
- This sign-off workflow should support deputy substitution where applicable.

### Sign-Off Model

- Sign-off should record:
  - secretary approved by/date/time
  - chairperson approved by/date/time
  - substitute role if applicable
  - final locked version number
- Final signed minutes must become locked and auditable.

### Voting Inside Meetings

- Minutes should support formal vote capture where relevant.
- Each motion/resolution should support:
  - motion text
  - proposer
  - seconder optional
  - votes for
  - votes against
  - abstentions
  - outcome
- These meeting decisions should remain compatible with the broader Resolutions Hub.

### Action Item Conversion

- Approved minutes should be able to create or link:
  - projects
  - tasks
  - resolutions
  - follow-up reminders
- Each action item should support:
  - owner
  - due date
  - source meeting reference
  - link to created/related project or task

### Views

- The Meetings and Minutes Hub should include:
  - `Upcoming Meetings`
  - `Past Meetings`
  - `Draft Minutes`
  - `Awaiting Secretary Sign-off`
  - `Awaiting Chairperson Sign-off`
  - `Final Minutes`
  - `Action Items`
  - `Calendar`

### Email And Distribution

- Once signed off, final minutes should be emailable/distributable from the platform.
- The final clean copy should be stored in the meeting record history.
- Final minutes should also trigger a Telegram notification once distributed.

### Notifications

- Important notifications should be supported through the platform notification engine.
- Examples include:
  - new meeting created
  - meeting reminder
  - minutes awaiting secretary sign-off
  - minutes awaiting chairperson sign-off
  - final minutes distributed
- New meeting notifications should go to Telegram.
- Final minute distribution notifications should go to Telegram as well.

### Versioning, Search, And Export

- Draft minutes should support version history before final sign-off.
- Final minutes should be searchable.
- Final minutes should support PDF export.
- Meeting records should support a numbering/reference system.

### Visibility And Access

- Meetings and minutes are internal-only by default.
- Access should remain admin-facing, with governance controls applied to edits and sign-off.

### Governance And Audit

- All meaningful actions in this module must be audited.
- This includes:
  - meeting creation
  - edits
  - transcript upload
  - AI-generated draft creation
  - sign-off steps
  - final locking
  - distribution
  - action item creation

## Shared Calendar Cross-Platform Integration

- The shared calendar should be treated as a cross-platform time and scheduling layer, not only a meeting calendar.
- It should connect useful date-based activity across CommUNIT-E in a filtered and readable way.

### Calendar-Linked Areas

- The shared calendar should support useful integration with:
  - Faults
  - Residents
  - Projects
  - Infrastructure
  - Resolutions
  - Parking Lot
  - Meetings and Minutes
  - Communications
  - Super Admin / Platform events
  - personal admin views

### Faults Calendar Items

- Fault-related calendar entries should include:
  - escalation due dates
  - nudge dates
  - `Escalate+` dates
  - `Escalate++` dates
  - municipality follow-up deadlines
  - resident confirmation due dates
  - site inspection dates
  - closure review dates

### Residents Calendar Items

- Resident-related calendar entries should include:
  - pending application review dates
  - WhatsApp-add follow-up reminders
  - outreach dates
  - birthdays
  - archive dates for rejected/leavers

### Projects Calendar Items

- Project-related calendar entries should include:
  - project target dates
  - task due dates
  - stuck-task follow-up dates
  - checkpoints/milestones where used later
  - planned site visits

### Infrastructure Calendar Items

- Infrastructure-related calendar entries should include:
  - asset verification dates
  - maintenance inspections
  - GIS cleanup or correction follow-ups
  - photo capture reminders
  - repeated-fault review dates

### Resolutions Calendar Items

- Resolutions-related calendar entries should include:
  - poll close deadlines
  - revote dates
  - implementation follow-up dates

### Parking Lot Calendar Items

- Parking Lot-related calendar entries should include:
  - review dates
  - revisit dates
  - move-to-decision or move-to-project follow-ups

### Meetings Calendar Items

- Meetings-related calendar entries should include:
  - meeting dates
  - recurring meetings
  - sign-off due dates
  - minute distribution deadlines
  - action follow-up dates

### Communications Calendar Items

- Communications-related calendar entries should include:
  - scheduled announcements
  - campaign dates
  - public notice dates
  - social calendar dates
  - communication deadlines

### Super Admin / Platform Calendar Items

- Platform/admin calendar entries should include:
  - maintenance windows
  - upgrades
  - service restart windows
  - audit/review reminders
  - governance review dates

### Personal Admin Calendar Use

- Each admin should be able to use the shared calendar to see their own relevant scheduled work, including:
  - meetings
  - task due dates
  - fault follow-ups
  - resolutions closing soon
  - birthdays
  - reminders

### Filters And Layers

- The calendar should support filters/layers so it remains useful and not noisy.
- Suggested calendar layers include:
  - meetings
  - faults
  - residents
  - projects
  - infrastructure
  - resolutions
  - outreach
  - birthdays
  - system/admin events

## Module: PRO Hub

- The `PRO Hub` is the internal communications and publishing module for the Public Relations Officer and supporting admins.
- It should manage calendar-driven content planning, media preparation, approvals, scheduling, and multi-channel publishing.

### Purpose

- The PRO Hub should support:
  - annual public-holiday and observance planning
  - content creation and review
  - image/media management for campaigns
  - approval workflows
  - scheduling
  - publishing to connected channels
  - governance and history

### Calendar-Driven Content Planning

- The PRO Hub must include a planning calendar with:
  - South African public holidays
  - relevant community-related international days
  - relevant religious holidays
- This calendar should be refreshed annually from internet-based sources.
- The calendar entries should be reviewable and manageable inside the app so the PRO is not locked to raw imported data.
- These observance/calendar items should be usable as seeds for content planning.

### Content Record Structure

- Each content item should support:
  - title/headline
  - body/caption/message
  - content type
  - target channels
  - linked holiday/observance/event optional
  - media/images
  - created by
  - created date
  - scheduled publish date/time
  - approval status
  - publishing status
  - notes/comments
  - final publish history

### Channels

- The PRO Hub should support channel-targeted publishing workflows for:
  - website (WordPress blogs)
  - WhatsApp group share flow
  - Instagram
  - Facebook
  - TikTok
- The architecture should use channel connectors so each platform can have its own workflow and constraints while the content record remains unified.

### Approval Workflow

- Content must support an internal approval flow before publishing.
- A content item should move to `Approved` once it receives `2 or more approval votes`.
- Approval history must remain visible and auditable.
- Admins should be able to see:
  - who approved
  - who rejected
  - when they voted
  - comments where used

### Scheduling

- Once approved, the PRO must be able to schedule the content for a future date and time.
- Scheduling should work per content item and remain visible on the shared calendar where relevant.
- The system should track:
  - scheduled
  - published
  - failed
  - cancelled
  - requires review

### WordPress Publishing

- The app should be capable of publishing approved content to the website via WordPress blog integration.
- This should use a proper connector/integration model rather than manual copy-and-paste where possible.

### WhatsApp Workflow

- The app should support a WhatsApp publishing/share workflow using:
  - a prepared message
  - a link
  - image/media where possible
- The WhatsApp path should remain connector-based and policy-aware.
- WhatsApp publishing should be implemented in a way that respects platform restrictions and approval constraints.

### Social Media Connectors

- The platform should support connectors for:
  - Instagram
  - Facebook
  - TikTok
- Connectors should be designed so they can handle:
  - account authorization
  - publish status tracking
  - channel-specific media requirements
  - error handling
  - audit history

### Media Handling

- Content items should support one or more images/media assets.
- Media should be reusable where appropriate.
- The system should preserve clean media handling for each channel.

### Status Model

- Recommended content statuses:
  - `Draft`
  - `Pending Approval`
  - `Approved`
  - `Scheduled`
  - `Published`
  - `Failed`
  - `Cancelled`
  - `Archived`

### Views

- The PRO Hub should include:
  - `Calendar`
  - `Drafts`
  - `Pending Approval`
  - `Approved`
  - `Scheduled`
  - `Published`
  - `Failed`
  - `Archive`

### Shared Calendar Integration

- The PRO calendar should integrate with the shared platform calendar where useful.
- Relevant entries include:
  - public holidays
  - observance days
  - scheduled campaigns
  - scheduled posts
  - communication deadlines

### Governance And Audit

- All meaningful actions in the PRO Hub must be audited.
- This includes:
  - content creation
  - edits
  - media changes
  - approvals/rejections
  - scheduling
  - publishing attempts
  - connector failures
  - final publish outcomes

### Implementation Principle

- The PRO Hub must use a connector-based publishing architecture so external publishing platforms can be integrated cleanly and adjusted as their rules and APIs evolve.

### Publishing Strategy

- The publishing strategy should use official API/OAuth or supported connector methods where possible.
- The platform should avoid a raw username/password automation model for social/channel publishing.
- Main account passwords should not be the normal integration method for publishing workflows.

#### WordPress

- WordPress publishing should be automated through a proper integration method such as the WordPress REST API and supported credentials/integration patterns.

#### Instagram / Facebook / TikTok

- Instagram, Facebook, and TikTok should be integrated through official connector-style authorization and publishing patterns where supported.
- These integrations should remain token/authorization based, not main-password based.

#### WhatsApp

- WhatsApp group publishing should start as a guided/manual share workflow.
- The app should:
  - prepare the approved message
  - prepare the media
  - prepare any link needed
  - assist the admin in sharing to the WhatsApp group
- WhatsApp group publishing should not rely on insecure raw credential automation.

### Media Statements

- The PRO Hub must support formal media statement creation and distribution.
- Media statements are internal-drafted but intended for external media recipients.

#### Media Statement Workflow

- The PRO should be able to create a statement record with:
  - headline/title
  - statement body
  - issue/topic
  - subject line
  - email body
  - statement date
  - selected media recipients
  - approval state
  - sign-off state
- Media statements must go through the internal approval process before distribution.
- Once approved, the PRO must sign in the app before final sending.

#### Media Outlet Selection

- The front end must support selectable media recipients including:
  - `Caxton`
  - `IOL`
  - `News 24`
  - `The Post`
  - `The Mercury`
- These media options should map to backend-managed email addresses.
- Super Admin should manage the actual recipient email addresses in the backend/settings layer.

#### Statement Output

- Once approved and signed, the app should:
  - generate a polished PDF version of the statement
  - apply a strong branded format
  - send the statement by email
- The outbound email should use a defined:
  - subject
  - body
  - date
  - recipient list
  - attached PDF statement

#### Governance And Audit

- Media statements must preserve:
  - drafter
  - approvers
  - PRO sign-off
  - send history
  - recipients
  - PDF version
  - timestamped audit trail

## Phase 2 Module Design: Donors And Financials

- `Donors` and `Financials` are deferred to a later phase, but they must be architected now so the current platform can connect to them cleanly later.
- These modules should support donor relationship management, donation strategy, project/fundraising linkage, and later transaction reconciliation from the bank account.

### Donors Module Purpose

- The Donors module should maintain a database of both:
  - businesses
  - individual donors
- It should support relationship tracking, outreach planning, recurring contribution strategies, and linking donors to causes/projects/campaigns.

### Donor Record Structure

- Each donor should support:
  - donor type (`Business` / `Individual`)
  - name
  - contact person where applicable
  - mobile number
  - email address
  - address optional
  - category/tier
  - interests/focus areas
  - preferred giving model
  - recurring donor flag
  - notes/history
  - linked campaigns/projects

### Donation Strategy Layer

- The platform should support a donation strategy model that links:
  - donor targets
  - projects/causes
  - campaigns
  - expected contribution patterns
- Example:
  - CCTV camera rollout project needs X amount
  - PRO builds a recurring monthly giving strategy
  - residents and businesses can be targeted as recurring contributors into the NPO bank account

### Campaign / Funding Need Linkage

- Donation strategy should be able to link directly to:
  - a project
  - a campaign
  - an infrastructure need
  - a community safety initiative
- This should help the PRO understand:
  - how much is needed
  - who is being approached
  - which donor types are most suitable
  - what progress has been made

### Recurring Donation Model

- The design should support recurring monthly donation planning from the start.
- This includes:
  - recurring intention
  - preferred cadence
  - expected amount later if needed
  - donor commitment history

### Financial Module Future Scope

- The Financial module is not for immediate implementation, but must be planned now.
- It should later support:
  - bank transaction import via CSV
  - transaction matching/reconciliation
  - donor payment matching
  - campaign/project allocation
  - automation where possible

### CSV And Bank Integration Readiness

- Once bank access is available, the Financial module should support:
  - downloading/uploading CSV bank files
  - transaction parsing
  - matching payments to donors where possible
  - exception queues for unmatched transactions
  - audit/governance on financial imports

### Phase Boundary

- For now:
  - design the data model and module boundaries
  - keep donor and financial capabilities out of the core phase-1 implementation
- The current platform must remain ready to integrate these modules later without restructuring the rest of the system.
## Vault Hub

Purpose:
- provide one governed internal source for reusable documents, templates, media, and important links
- stop admins from using outdated files, inconsistent letterheads, or scattered shared-drive references
- support consistency across Residents, Faults, Meetings, PRO, Resolutions, and Super Admin workflows

Vault structure:
- `Brand Assets`
  - logos
  - profile images
  - banners
  - approved campaign artwork
- `Official Documents`
  - constitutions
  - policies
  - forms
  - signed governance documents
- `Letterheads And Templates`
  - media statement templates
  - resident decline templates
  - fault escalation templates
  - meeting minute templates
  - official letterheads
- `Resolutions Archive`
  - passed resolutions
  - signed resolution PDFs
  - supporting files
- `Media Library`
  - approved photos
  - campaign media
  - event images
  - public-use assets
- `Important Links`
  - municipality portals
  - WordPress admin
  - shared drives
  - Google resources
  - operational reference URLs

Core behavior:
- internal only
- searchable by category, title, and tags
- preview where possible
- mark one file as the `current approved template` where applicable
- version history for important templates and official documents
- upload and usage audit trail
- owner/uploader visible
- optional expiry/review dates for documents that may become outdated

Permissions:
- `Super Admin` controls structure, categories, permissions, and approved/current templates
- `Admins` can upload, view, and use permitted assets
- templates should be reusable from other modules instead of recreated separately

Design rule:
- Vault must feel like a clean internal resource center, not a raw file dump
- the most current approved assets and templates should always be easiest to find

