---
doc_id: r11_program_retention_policy
owner: program_operations
status: approved
---

# R11 — program retention / anonymization policy

The rollout spec lists "retention / anonymization on archive" as R11's
last gap. This document fixes the approved policy — what gets scrubbed,
when, who can trigger it, and what must survive.
`organizerPrograms.status` already carries an `archived` enum value, so
the lifecycle hook exists.

## Principles

- **Operational truth survives, identity does not.** Counts, statuses,
  journals, and reports must still answer "how many guests checked in at
  the Sangeet" after anonymization — they lose the ability to answer
  "which guest was Nisha Rao."
- **Anonymization is one-way.** Scrubbed fields are nulled or
  tombstoned, never encrypted-for-later — the point is that a leaked
  backup after archive is a spreadsheet of counts, not a guest list.
- **CRM stays CRM.** `programGuests.contactId` points into the
  organizer's CRM store; retention scrubs the program-local copies, not
  the organizer's contact records (those have their own lifecycle).

## Trigger

`archiveProgram(programId)` callable, organizer owner/manager only:

1. Sets `organizerPrograms.status = "archived"`, `archivedAt`, and
   `anonymizeAt = archivedAt + 14 days` (the approved recap grace
   window — planners still see names while archived-not-anonymized).
2. Disables further mutations on program-scoped collections (rules +
   callable guards check status). Reads continue.
3. Schedules anonymization: a daily sweep runs `anonymizeProgram` on
   programs where `status == "archived"` and `anonymizeAt <= now`.

`unarchiveProgram(programId)` (same authority) restores the pre-archive
status while `anonymizeAt > now` — archive is reversible inside the
grace window; anonymization is not. An in-flight sweep lease also blocks
unarchive so a restore can never race a partial scrub. Only `archived`
starts the clock — `completed` never anonymizes and stays the natural
post-event review state.

Archive does not gate on export: attendance and trip-reconciliation CSV
exports already exist and remain valid post-anonymization (counts
survive), so the confirm flow offers the export affordance without
requiring it.

## Field-level proposal

### Scrub (identity fields → null/tombstone)

| Collection | Fields scrubbed | Replacement |
|---|---|---|
| `programGuests` | `displayName`, `phoneE164`, `email`, `externalReference` | `displayName: "Guest <shortId>"`, others null; `anonymizedAt` set; `contactId` is **kept** (approved) so post-event CRM follow-up stays linked |
| `programHouseholds` | `label`, `primaryContactName`, `primaryPhoneE164`, `primaryEmail` | `label: "Household <shortId>"`, contact fields null; `anonymizedAt` set. *(label added in implementation — family names like "The Sharma family" are the household's identity)* |
| `programStaffInvites` | `displayName`, `phoneE164` | null; `anonymizedAt` set |
| `programStaffGrants` | `displayName`, `phoneLastFour` | null; `anonymizedAt` set |
| `programFunctionGuests` | `responseNote` | null (free text, may carry PII) |
| `programStays` | `notes`, `roomLabel` | `notes` null; `roomLabel` scrubbed (room numbers tied to identities are a soft identifier) |
| `programDoorJournal` | `note` | null; action/partySize/functionId survive |
| `programTravelLegs` | `arrivalTerminal` detail stays — no PII fields; `manualCurbNote` | scrub free-text note fields only |
| `programTravelParties` | `label` | `label: "Party <shortId>"` *(added — family names ride party labels)* |
| `programGuestGroups` | `label` | `label: "Group <shortId>"` *(added — group labels often carry family names)* |
| `programRoomBlocks` | `label`, `notes` | `label: "Block <shortId>"`, `notes` null *(added — same surname/free-text class)* |
| `programHotels` | `receptionContact`, `notes` | null *(added — reception contact is a named person's details)* |
| `programFunctions` | `venueNotes` | null *(added — free-text ops notes; name/venue/dressCode/instructions survive as program content)* |
| `transportTrips` | `notes` | null *(added — free-text; voidReason/vendorNameSnapshot/plates stay operational)* |

### Keep (operational truth)

- All `guestId`/`householdId`/`staffUid` document ids — anonymous
  references, required for joins and counts.
- `programFunctionGuests` RSVP/attendance statuses and counts —
  the attendance report must still reconcile post-archive.
- `programDoorJournal` action/partySize/functionId — door counts are
  the audit trail.
- `programTravelLegs` carrier/flight/status fields — flight numbers
  are itinerary facts, not identities; needed for "did the pickup
  happen" reconciliation.
- `organizerMomentSends`/`organizerMomentRuns` — `recipientKey` is a
  prefixed opaque id (`guest:|household:|uid:|contact:`); journal rows
  stay for delivery auditing, no scrub needed.
- `organizerPrograms` itself — title/dates/status/capabilities stay.

### Delete (documents whose only value was live operation)

- `programStaffInvites` with `status == "pending"` — unclaimed invites
  carry a phone number for no live purpose ("expired" is a timestamp
  state, not a status; all `pending` rows delete). Claimed/revoked
  invites keep the row for audit with identity fields nulled.
- Flight-alert leases/subscriptions on `programTravelLegs`
  (`flightAlertSubscriptionId`, `flightAlertLease`) — cancel provider
  subscriptions at archive; scrub the lease fields.

## Approved decisions (product owner, 2026-09-29)

1. **Grace period: 14 days.** Archive sets the anonymization clock;
   the sweep scrubs at `archivedAt + 14d`. Archive is reversible via
   `unarchiveProgram` while `anonymizedAt == null`; anonymization is
   irreversible.
2. **Export: offered, not required.** The confirm flow surfaces the
   existing attendance/trip exports; archive never blocks on one.
3. **`contactId` kept.** Program-local identity fields scrub, but the
   CRM link stays so post-event follow-up works. Threat model is
   leaked program documents, not organizer-access revocation.
4. **Indefinite anonymized retention.** No second hard-delete stage;
   whole-program deletion is a separate later capability if offered.
5. **Only `archived` anonymizes.** `completed` remains fully readable
   and never enters the clock.

## Implementation shape

- `archiveProgram` / `unarchiveProgram` callables (owner/manager,
  revision-fenced) + a scheduled daily sweep + one internal
  `anonymizeProgram` worker: chunked writes over the collections above,
  idempotent (`anonymizedAt` marker guards re-entry), durable-ops
  journal entry per phase.
- Contract additions: `archivedAt`/`anonymizeAt`/`anonymizedAt`
  optional fields on the listed collections; `archive_program` and
  `unarchive_program` payload/response schemas.
- Rules: program-scoped writes rejected when
  `organizerPrograms.status == "archived"`; staff reads continue
  (anonymized data is what they should see anyway).
- Tests: anonymize is idempotent; counts-only surfaces reconcile
  identically pre/post archive; pending invites deleted; free-text
  fields scrubbed; `contactId` and CRM contact docs untouched; the
  grace window keeps archive reversible and blocks anonymization early.
