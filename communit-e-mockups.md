# CommUNIT-E Mockups

These are low-fidelity screen mockups/wireframes for the first core CommUNIT-E experiences.

Design intent:
- Apple-inspired polish
- minimal clicks
- very simple for non-technical admins
- premium internal platform feel
- mobile-friendly, but desktop strong

## 1. Global App Shell

```text
+--------------------------------------------------------------------------------------+
| CommUNIT-E                                                    Search | Quick Action |
+----------------------+---------------------------------------------------------------+
| Home                 | Good morning, Naledi                                         |
| Residents            | There are 3 faults due, 12 residents pending, 1 vote closing |
| Faults               |                                                               |
| Infrastructure       | [Pending Residents] [Faults Awaiting Response] [Projects]     |
| Projects             | [Open Decisions]                                              |
| Resolutions          |                                                               |
| Parking Lot          | Priority Work Queue                                           |
| Meetings             | - Water leak on Bellair Road needs Escalate+                  |
| PRO                  | - New resident needs WhatsApp confirmation                    |
| Help                 | - Bellair Primary project task stuck                          |
| Super Admin          |                                                               |
|                      | Today                                                         |
| Naledi Mokoena       | - 11:00 Operations meeting                                    |
| Super Admin          | - 14:00 Fault follow-up window                                |
| Active               | - Assistant tip / banner                                      |
+----------------------+---------------------------------------------------------------+
```

## 2. Profile, Presence and Preference

```text
+--------------------------------------------------------------------------------------+
| My Profile                                                           [Save Changes] |
+--------------------------------------------------------------------------------------+
| Avatar | Naledi Mokoena                     Status: Active                            |
|        | Nickname: Nals                     Birthday: 14 August                       |
|        | Email: naledi@unityincommunity...  Office Bearer: Super Admin managed        |
+--------------------------------------------------------------------------------------+
| Full Name              | Mobile Number             | Working Hours                     |
| Email (read only)      | Address                   | Status Note                       |
| Nickname               | Delegate if Away          | Theme / Notifications             |
+--------------------------------------------------------------------------------------+
| Preferences                                                                         |
| - Light / Dark / Auto                                                               |
| - Controlled palette choices                                                        |
| - In-app / Email / Telegram preferences                                             |
| - Workload summary                                                                  |
+--------------------------------------------------------------------------------------+
```

## 3. Residents Hub

```text
+--------------------------------------------------------------------------------------+
| Residents Hub                                                     [Open Map] [Add]  |
+--------------------------------------------------------------------------------------+
| [Pending 12] [Active 428] [Leavers 14] [Needs Mapping 9]                            |
+--------------------------------------------------------------------------------------+
| Pending Queue                                 | Resident Map / Outreach               |
| - Sibongile Ndlovu                            | [Google Map Layer]                    |
|   Address verified                            | pins by WhatsApp state                |
|   Mobile verified                             | filters by road, status, company      |
|   WhatsApp still needed                       |                                       |
|                                               | Selected Segment                      |
| - Out-of-area application                     | - Bluegum Road residents not in WA    |
|   Auto rejected, decline email ready          | - 18 selected                         |
|                                               | - Message preview                     |
|                                               | - Generate outreach                   |
+--------------------------------------------------------------------------------------+
```

Resident profile view:

```text
+--------------------------------------------------------------------------------------+
| Resident Profile: Sibongile Ndlovu                           [Approve] [Reject]      |
+--------------------------------------------------------------------------------------+
| Summary Banner                                                                        |
| Status: Pending | Road: Palm Crescent | Geofence: Passed | WhatsApp: Not Added       |
+--------------------------------------------------------------------------------------+
| Details            | Verification Checklist      | History / Outreach                 |
| Contact info       | Address verified            | Applied 24 Mar                     |
| Normalized address | Mobile verified             | Reminder sent                      |
| Security company   | WhatsApp added              | Notes / audits                     |
| Maps link          | Consent accepted            | Related faults later               |
+--------------------------------------------------------------------------------------+
```

## 4. Faults Hub

```text
+--------------------------------------------------------------------------------------+
| Faults Hub                                                   [Public View] [Log Fault]|
+--------------------------------------------------------------------------------------+
| [Open 34] [Awaiting Response 11] [Escalate+ Due 4] [Oldest Open 19d]                |
+--------------------------------------------------------------------------------------+
| Master Fault Record                           | Resident Confirmation / Public View   |
| Ref#: EL-44512                                | Public fault snapshot                 |
| Department: Electricity                       | Ref# EL-44512                         |
| Priority: Critical                            | Palm Crescent                         |
| Open For: 8 days                              | Streetlight outage                    |
| 5 affected residents linked                   | Open for 8 days                       |
|                                               |                                       |
| Timeline                                      | Resident confirmation needed          |
| Day 0 first escalation                        | before internal closure               |
| Day 3 nudge sent                              |                                       |
| Day 5 Escalate+ due                           | Behavior insight                      |
| Inbox reply matched                           | repeated same issue merged            |
| Admin note included in next email             |                                       |
+--------------------------------------------------------------------------------------+
```

Public fault dashboard:

```text
+--------------------------------------------------------------------------------------+
| Public Fault Dashboard                                           Search Ref# / Road  |
+--------------------------------------------------------------------------------------+
| [Total Faults] [Open] [Resolved This Month] [By Nature]                               |
+--------------------------------------------------------------------------------------+
| Ref# EL-44512 | Palm Crescent | Streetlight outage | Awaiting Municipality | 8 days  |
| Ref# WT-22041 | Bellair Road  | Water leak         | In Progress            | 4 days  |
+--------------------------------------------------------------------------------------+
```

## 5. Infrastructure Hub

```text
+--------------------------------------------------------------------------------------+
| Infrastructure Hub                                            [Add Asset From Map]   |
+--------------------------------------------------------------------------------------+
| Map View                                      | Asset Detail Snapshot                |
| [Layered map with icons]                      | CE-POLE-014                         |
| - streetlight poles                           | Official ref: pending               |
| - substations                                 | Status: Fault Reported              |
| - fiber                                        | Condition: Poor                     |
| - manholes                                    | Linked faults: 3                    |
| - valves / pipes                              | Needs verification: Yes             |
+--------------------------------------------------------------------------------------+
| Needs Attention Queues                                                                 |
| - Missing official refs   - Missing GPS   - Needs photo   - Duplicate suspected       |
+--------------------------------------------------------------------------------------+
```

## 6. Projects Hub

```text
+--------------------------------------------------------------------------------------+
| Projects Hub                                                       [New Project]     |
+--------------------------------------------------------------------------------------+
| Bellair Primary School Safety Improvement                                              |
+--------------------------------------------------------------------------------------+
| Not Started | Started | In Progress | Stuck | Complete                                 |
|-------------|---------|-------------|-------|------------------------------------------|
| Crossing    | Road    | Warning     | Paint | Site visit complete                      |
| guard       | marking | light       | contractor blocked                             |
| approval    | request | follow-up   | needs supplier response                       |
+--------------------------------------------------------------------------------------+
| Help Needed / KPI                                                                     |
| - 3 tasks overdue                                                                     |
| - 2 tasks stuck > 5 days                                                              |
| - 1 project nearing target date                                                       |
+--------------------------------------------------------------------------------------+
```

## 7. Meetings and Minutes

```text
+--------------------------------------------------------------------------------------+
| Meetings and Minutes                                               [New Meeting]     |
+--------------------------------------------------------------------------------------+
| Date | Time | Location | Type | Agenda                                               |
| 3 Apr|18:30 | Hall     | Ops  | Fault review, school safety, media statement         |
+--------------------------------------------------------------------------------------+
| Transcript uploaded from phone                                                           |
| AI cleanup creates:                                                                      |
| - Clean minute draft                                                                     |
| - Action items                                                                           |
| - Resolutions                                                                            |
| - Vote summary                                                                           |
+--------------------------------------------------------------------------------------+
| Sign-off Workflow                                                                       |
| Secretary sign-off -> Chairperson sign-off -> Lock final minutes -> Email + Telegram   |
| Deputies can substitute if primary office bearer is absent                              |
+--------------------------------------------------------------------------------------+
```

## 8. Resolutions Hub

```text
+--------------------------------------------------------------------------------------+
| Resolutions Hub                                                     [New Resolution] |
+--------------------------------------------------------------------------------------+
| Open Resolution                                                                         |
| "Approve branded table cloth purchase?"                                                 |
| Type: Yes / No                                                                          |
| Deadline: 24 hours                                                                      |
| Votes: 4 yes required                                                                   |
| Visible votes:                                                                          |
| - Naledi: Yes                                                                           |
| - Peter: Yes                                                                            |
| - Sasha: No                                                                             |
| - Zama: Yes                                                                             |
| Outcome: waiting for quorum                                                             |
+--------------------------------------------------------------------------------------+
```

## 9. Parking Lot Hub

```text
+--------------------------------------------------------------------------------------+
| Parking Lot Hub                                                       [Add Idea]     |
+--------------------------------------------------------------------------------------+
| New / Under Review / Ranked / Waiting for Funds / Approved / Moved to Project         |
+--------------------------------------------------------------------------------------+
| Item: Community table cloth                                                             |
| Category: Branding                                                                      |
| Urgency: Medium                                                                         |
| Priority: Medium                                                                        |
| Cost Band: Low                                                                          |
| Impact: High                                                                            |
| Suggested lane: Quick win                                                               |
+--------------------------------------------------------------------------------------+
```

## 10. PRO Hub

```text
+--------------------------------------------------------------------------------------+
| PRO Hub                                                           [Draft Campaign]    |
+--------------------------------------------------------------------------------------+
| Calendar                                                                                |
| - SA public holidays                                                                    |
| - International observance days                                                         |
| - Religious holidays                                                                    |
| - Community recurring dates                                                             |
+--------------------------------------------------------------------------------------+
| Pending Approval Content                        | Media Statement                       |
| - Freedom Day post                              | Topic: Road safety                    |
| - WhatsApp / Website / Facebook                 | Outlets: Caxton, IOL, News24, etc    |
| - 2 approvals required                          | PDF generated after approval          |
|                                                 | PRO signs off before send             |
+--------------------------------------------------------------------------------------+
```

## 11. Super Admin Control Plane

```text
+--------------------------------------------------------------------------------------+
| Super Admin Console                                                  [Save Policies] |
+--------------------------------------------------------------------------------------+
| [Active Sessions 7] [Connectors 5] [Jobs 9] [Quality Alerts 23]                      |
+--------------------------------------------------------------------------------------+
| Session Policy                              | Connector / Failure Center              |
| - Idle timeout 30 min                       | Google Workspace: connected            |
| - Absolute session 12 hrs                   | WordPress: warning                     |
| - Warn 5 min before expiry                  | Telegram: needs config                 |
| - Allow multiple sessions                   | Mailbox sync: warning                  |
|                                             | Unmatched email replies: 1             |
+--------------------------------------------------------------------------------------+
| Reporting / KPI / Usage / Templates / Public Surfaces / Maintenance                   |
+--------------------------------------------------------------------------------------+
```

## 12. Public Resident Application

```text
+--------------------------------------------------------------------------------------+
| Join the Community Group                                                               |
+--------------------------------------------------------------------------------------+
| Full Name                                                                              |
| Street Number                                                                          |
| Road Name                                                                              |
| Mobile Number (WhatsApp)                                                               |
| Security Company                                                                       |
| Email Address                                                                          |
+--------------------------------------------------------------------------------------+
| Consent                                                                                |
| - POPIA understanding                                                                  |
| - Privacy disclaimer                                                                   |
| - WhatsApp rules accepted                                                              |
| - Applying for own household                                                           |
+--------------------------------------------------------------------------------------+
| [Submit Application]                                                                   |
+--------------------------------------------------------------------------------------+
```

## Next Step

After these wireframes are approved, the next step should be:
1. choose which screens need high-fidelity polish first
2. convert them into more visual mockups
3. align the build to these layouts and interaction rules

