---
doc_id: program_operations_rollout_spec
version: 1.4.1
updated: 2026-10-30
owner: product
status: active
---

# Program Operations Rollout Spec — build state, gaps, decisions

Status: living tracking spec for allocating the remaining wedding/conference
program-platform work. Companion: the [wedding-planner platform plan](https://github.com/torana-labs/catch-knowledge/blob/main/plans/wedding-planner-platform.md)
in catch-knowledge owns the product/architecture rationale; this document owns *what exists, what does
not, and what needs a decision*. Measured against `main` at `510220f1f`
(2026-10-05) plus the CAT152 source where explicitly marked in review.
"In review" marks an open PR — code exists on a branch, not yet on main.

Legend: **built** = code exists on main and is deployable · **partial** =
backend or model exists, surface/consumer missing · **missing** = nothing on
main · **in review** = open PR, not merged · **decision** = needs
product-owner input before schema/UI work.

---

## 1. Roles and permissions — measured state

### 1.1 The duty union is fully built

`contracts/shared/program_common.schema.json` defines `programStaffDuty`:

| Person (product language) | Duty | Scoped by | Server enforcement |
|---|---|---|---|
| Planner / organizer | `organizerTeamMemberships.role ∈ {owner, manager}` | organizer | full 5-tab host shell |
| Program ops (all program, no org CRM/payouts/sender admin) | `programCoordinator` | program | `requireProgramAccess` |
| Guests / RSVP desk / imports | `guestRelations` | program | — |
| Program-scoped messaging (arm/pause moments) | `communications` | program | moment callables accept manager or `communications` |
| Venue door — check-in only | `functionCheckIn` | `functionIds[]` | journal write guard |
| Venue lead — now/next, door, late arrivals | `functionLead` | `functionIds[]` | — |
| Greeter at airport/station curb | `airportGreeter` | `pickupPointIds[]` | — |
| Dispatch coordinator at airport/station | `transportDispatcher` | `pickupPointIds[]` | — |
| Hotel welcome desk | `hotelDesk` | `hotelIds[]` | — |
| Reconciliation read | `reconciliationViewer` | program | — |
| Family/stakeholder read-only (counts, no PII/finance) | `stakeholderViewer` | program | — |

Each `programStaffGrants` doc carries up to 8 independently-expiring
`{duty, pickupPointIds, hotelIds, functionIds, expiresAtMillis}` tuples, so one
human can hold greeter + dispatcher at the same station. Staff lifecycle is
phone-based: `inviteProgramStaff` → token deep link → `claimProgramStaffInvite`
→ `grantProgramStaff`/`revokeProgramStaff`/`listProgramStaff`.

**Least privilege is structural, not cosmetic:** `getProgramWorkAccess`
returns only the pickup points / hotels inside the actor's duty scope;
every destination callable re-checks authorization server-side; the staff
shell never mounts manager providers; `communications` reaches moments but
never CRM, saved audiences, sender connections, or payouts.

### 1.2 Permissions gaps

| Gap | Detail |
|---|---|
| Organizer tab is all-or-nothing | `owner`/`manager` both get the full 5-tab shell. No org-level role gives Organizer settings/config without Audience (CRM) or Inbox. If we want "settings-only" or "no-CRM" manager seats, that's a new layer on `organizerTeamMemberships`. |
| `stakeholderViewer` has no backend surface | Duty exists; nothing returns counts-only program data. Needs a read callable + a thin read surface. |
| Duty→destination surfaces incomplete | Only transport duties have client surfaces today (see §3.2). |
| `eventStaffGrants` still separate | Legacy event staff roles remain in their own store; `listMyHostAssignments` projects both scopes and `/host/operator/:eventId` redirects onto the unified shell's `/host/work/event/:eventId`. |

---

## 2. Entry paths — measured

| Actor | Path |
|---|---|
| Organizer manager | 5-tab host shell → Events → event → Manage → Moments field → `/host/organizers/:clubId/events/:eventId/moments` (PR #443) |
| Program staff | `/host/work/:programId` (+ `?invite=` token claim) → `getProgramWorkAccess` resolves duty-scoped destinations → `/arrivals/:pickupPointId`, `/dispatch/:pickupPointId`, `/hotel/:hotelId`, `/trips` |
| Program staff (unified) | `listMyHostAssignments` callable deployed — **no Flutter assignment-picker shell yet** |
| Guest (RSVP) | Web `/rsvp/:householdToken` (HMAC link via `issueProgramHouseholdRsvpLink`); `.ics` feed via `programHouseholdItineraryIcs` (`onRequest`) |
| Organizer program workspace | Host shell → Events unified inventory → `/host/programs/:programId` (schedule/guests/team/import, W1 #452). The legacy `/host/programs` list URL redirects to Events and preserves organizer/saved-program context. |

---

## 3. Feature inventory — built / partial / missing

### 3.1 Guest, invitation, RSVP

| Feature | State | Where |
|---|---|---|
| Per-function invitations (not everyone to everything) | **built** | `programFunctionGuests.invited` + `programFunctions.invitationMode` + `applyProgramFunctionInvitations` |
| Per-function RSVP + attendance | **built** | `programFunctionGuests.rsvpStatus/attendanceStatus/partySize`, `recordProgramFunctionRsvp` |
| Household link RSVP page | **built** | `website/src/features/householdRsvp/` — per-member × per-function drafts, party size, notes, explicit messaging consent |
| Guest identity + households | **built** | `programGuests` (contact link optional — CRM never auto-created), `programHouseholds` |
| Side tagging (partnerA/partnerB/mutual, configurable labels) | **partial** | `programHouseholds.side` only — household level, three-value enum |
| Guest groups/tags — arbitrary dimensions | **built** | `programGuestGroups` + `programGuests.groupIds[]` (#450); nullable `hotelId` link in review (#456) |
| Guest notes | **partial** | `responseNote` on function-guest responses only; no free-form note on `programGuests` |
| Import with household mapping | **built** | `importProgramManifest` callable + workspace import surface with column mapping (#452) |
| Travel details collected on RSVP page | **missing** | `submitProgramHouseholdRsvp` contract = rsvp/partySize/note/consent only; legs come via `upsertProgramTravelLeg` or manifest import |

### 3.2 Staff surfaces (duty → destination client side)

| Duty destination (plan §5.4) | State |
|---|---|
| `airportGreeter` → Arrivals | **built** — `/host/work/:programId/arrivals/:pickupPointId` |
| `transportDispatcher` → Arrivals · Dispatch | **built** — dispatch screen on same prefix |
| `hotelDesk` → Inbound · Rooms | **built** — `/hotel/:hotelId` inbound desk + `/hotel/:hotelId/rooms` room board (unplaced queue, stays, block capacity, assign/manage via `upsertProgramStay`); coordinator block CRUD via `upsertProgramRoomBlock` |
| `functionCheckIn` → Door · Walk-ins | **built** — `/host/work/:programId/door/:functionId` roster, check-in/undo/no-show/party-size, walk-in capture, offline outbox replay (#448) |
| `functionLead` → Now/Next · Door · Attention | **built** — Door destination shared with `functionCheckIn` (#448); Now/Next board (client projection over the work-access payload) + Attention feed (`listProgramStaffAttention`: program-scoped staffAttention sends filtered to caller duties, coordinator/manager see all) (#470) |
| `guestRelations` → Guests · RSVP inbox · Imports | **built** — `/host/work/:programId/guests` + `/host/work/:programId/import` on the shared grid/import surfaces with coordinator-only mutations hidden; `listProgramGuests`, `listProgramHouseholds`, `importProgramManifest` and work-access `functions` widened to the duty (#469) |
| `communications` → program Inbox · Moments | **in review** — program Moments route + program Inbox scope chip + `communications`-duty destinations (#454); Inbox chip is organizer/coordinator-facing (`listProgramGuests` needs `programCoordinator`) |
| `reconciliationViewer` → Trips · Exceptions · Export | **in review** — needs-review strip + review-only filter on the `/trips` ledger, bounded CSV export via external share, void affordance gated to dispatch authority (#471); per-function attendance report + CSV export (#460) |
| `stakeholderViewer` → counts-only overview | **in review** — `getProgramStakeholderCounts` callable + `ProgramStakeholderScreen` counts surface at `/host/work/:programId/counts` (#458) |
| `programCoordinator` → program workspace | **built** — Events owns the consolidated list; `/host/programs/:programId` retains workspace/guests/team/import (W1 #452) |
| Unified `HostWorkShell` + assignment picker | **built** — shell + picker (#447); `/host/operator/:eventId` redirects onto `/host/work/event/:eventId` |

### 3.3 Logistics

| Feature | State | Where |
|---|---|---|
| Flight details + enrichment | **built** | `programTravelLegs` (number, carrier, IATA, sched/est/actual, status, alert subscription via `flightAlertWebhook`, terminal, readiness, pax/luggage, party, destination hotel) |
| Venue details | **built** | `programFunctions.venueName/venueNotes/venueLocation` (coords); `programPickupPoints` carry airport/terminal/station kind |
| Hotels | **built** | `programHotels` (name/address/lat/lng/reception contact) + `programStays` + `programRoomBlocks` schemas and callables (`getProgramHotelRooms`, `upsertProgramStay`, `upsertProgramRoomBlock`) with hotel-scoped `hotelDesk` authority |
| Room allocation | **built** | stays/room-block model with transactional capacity rollups; group-aware `suggestStayBlock` prefers group-held blocks; desk room board assigns block + room label, marks ready/arrived, and runs lifecycle status |
| Taxi/transport tracking | **built backend + staff UI** | `transportTrips` (vehicle class, vendor, plate, parties/legs, depart/arrive, rate snapshot), dispatch + hotel-inbound + trips-ledger screens. **How it's exposed:** dispatcher creates trip at `/dispatch/:pickupPointId`; hotel desk sees inbound at `/hotel/:hotelId`; ledger at `/trips`. No guest-facing tracking. |
| Vendors / rate cards | **partial** | `transportVendors` + `rateSnapshot` on trips; no rate-card management UI |
| Distance-aware reminder lead times | **in review** | `travelTimeLead` flag on `functionGuests` audiences; planner wakes runs early by the farthest hotel→venue lead and defers nearer recipients individually (pure haversine seam, Routes API replaceable) — #456 |

#### Socially aware lodging extension (CAT-149)

The occupancy foundation is in review: explicit roommate identity, local-night
capacity, occupant limits, cross-hotel duplicate protection and checked-in
placement protection extend the existing Programs stay/block service. The
current room board remains the native entry point; explicit sharing controls
and lodging demand independent of inbound travel remain integration work.
Invitation households, room-sharing parties and overlapping social groups
must remain separate; household membership may only suggest sharing.

Reviewed source slices now provide nested groups with cycle checks, typed
membership suggestions and manual decisions, a bounded planner with independent
hard-feasibility validation, dated inventory including provisional types, and
bed/accessibility/whole-villa constraints. The 21-room case penalizes isolated
spillover and produces a coherent 19+2 split in the focused benchmark. Manual
pins and unlocked regeneration use the same validator. These are private
snapshot inputs; canonical property/party/inventory editors remain to be wired.

The layered 2D/list board includes empty-room moves, locked-party protection,
explicit selection, and stale async-result rejection. It is an injected-callback
component, not yet a routed Host feature. Immutable proposal storage and scoped
operation receipts have transaction adapter tests; host approval, hotel
confirmation and guest publication remain separate. Private generated document
contracts, direct-access denial and archive retention are being integrated.
Canonical source/revision reads, same-transaction stay publication, membership
import/choice writes, real emulator verification, native editors and combined
UI/capture acceptance remain required before operational release.

Photo/PDF ingestion is a later, optional path into editable layered 2D drafts
with a source overlay and mandatory human/room-roster verification. Private
reusable versions are immutable. A shared hotel catalog needs a separate
rights and verification policy. No 3D model, external AI credentials,
cross-event guest data, real guest import, booking or deployment is part of
this source foundation. Core allocation must work without photos.

### 3.4 Messaging / Moments

| Feature | State |
|---|---|
| Unified Moments engine (6 callables, sweep, travel-leg trigger, send journal, staff-attention projection) | **built + deployed** |
| Organizer Moments Flutter surface (list/editor/lifecycle/run, event scope) | **built** (#443); program-scope Moments route wired in review (#454) |
| Campaign `recipientSource: programSelection` | **built** — upsert validates/normalizes it (programId required, savedAudienceId null) and the dispatcher materializes program recipients via `programRsvp/programSelection.ts` |
| `organizerFormAutomations` → `triggered` moments migration | **missing** — decision 9 approved; form automations still own pipeline |
| WhatsApp program templates | **runbook, not code** — `program_function_starting`, `program_get_ready`, `program_transport_ready`, `program_rsvp_deadline_reminder` each need an approved Meta template per sender connection |

For #456 legacy reminder reconciliation, the server-owned
`organizerMomentRuns` document records `status: failed` with
`reason: legacyOccurrenceUnresolved` when an old wake-based run ID might
share recipients with a nominal-time run ID. The sweep also emits a structured
warning with the moment ID and conflicting run IDs. There is no Host UI reader
or automatic resume for this hold. Before activating the new runner, the
operator should inspect all runs for each affected moment and anchor revision,
then compare `organizerMomentSends/{runId}_{recipientKey}` receipts across
those IDs. Keep every receipt and the failed status intact. If the original
occurrence or recipient delivery cannot be proven, leave it held; resolving
or replaying remaining recipients needs a separately reviewed migration or
targeted-send procedure. Do not reset a failed run to `planned` or delete
receipts, since either can resend an already contacted guest.

### 3.5 Organizer-facing program management

| Feature | State |
|---|---|
| Program CRUD + wedding preset + function upsert + staff grant/invite + guest/household upsert + manifest import | **callables built + deployed** |
| Program workspace UI (schedule day-rail, household×function RSVP grid, Team & duties, headcount dashboard) | **built** (#452) — `/host/programs/:programId` owns workspace/guests/team/import (W1); CAT152 consolidates its bounded Program inventory into Events |
| Programs under Events tab + Organizer → Plan screen | **in review (CAT152)** — Programs render as identifiable date-range/function-count rows in Events, with direct creation and lifecycle actions; the retired list URL redirects into Events. Organizer → Plan screen remains missing. |
| Program logistics editors (pickup points, hotels) | **in review** (#474) — workspace Logistics section |
| Entitlements (`organizerEntitlements`, SKU catalog, limits enforcement) | **in review** — rebased onto current main and re-verified (#455) |
| Attendance report / export per function | **built** (#460) — `/host/work/:programId/attendance` + CSV export |
| Retention / anonymization on archive | **built in source** — dedicated archive/unarchive callables, 14-day grace, deleted-account and organizer/revision fences, resumable anonymization journal and scheduled sweep |

---

## 4. Known platform defect (from this deploy cycle) — resolved

`tool/ci/package_firebase_delivery.mjs`: `verifyFirebaseDelivery` recomputed
the delivery target set with the **control plane's** dormant-functions list
instead of the **source SHA's**. Fixed by replaying the source SHA's dormant
list at verify time (#453); the prod delivery cursor is caught up through
`b1b20b3c5a`.

---

## 5. Decisions

**Resolved:**

1. ~~**Guest group model.**~~ Resolved as (a): `programGuests.groupIds[]` +
   `programGuestGroups` with configurable dimensions — shipped #450.
2. ~~**Distance-aware reminders.**~~ Resolved as suggested: `anchored`/
   `scheduled` initiation retained; `travelTimeLead` audience flag makes the
   planner compute per-recipient `dueAt` from hotel→function travel time —
   in review #456. Estimator is a pure haversine seam; a Routes provider can
   replace it without contract changes.

**Open (block schema/UI work):**
1. **Organizer-level role split.** Do we need seats inside the Organizer tab
   (e.g., finance-viewer, settings-editor) before v1, or does
   program-scoped staffing cover it? Recommend deferring unless a pilot
   asks for it.
2. **Travel capture on household RSVP page.** Extend
   `submitProgramHouseholdRsvp` with optional per-member travel blocks, or
   keep legs planner/import-only for v1? Collecting at RSVP is the planner
   UX win; it widens the web surface's write surface.
3. **Staff identity.** Phone-auth account required today — correct for temp
   wedding staff? A claimable invite without a pre-existing account is
   smoother; confirm acceptable friction.
4. **`stakeholderViewer` shape.** Counts-only overview: which numbers are
   "safe" (headcounts yes, per-hotel occupancy yes?, names never). Needs a
   field-level contract before the API exists.
5. **Room blocks schema.** Confirm `programStays`/`programRoomBlocks` from
   the airport branch's deferred slice still match hotel-desk reality before
   pulling them onto main. Note: no stays/room-block code exists on the
   `backup/airport-arrivals-before-main-20260923` ref — the A7 slice was a
   review artifact, so the schema may need to be authored rather than
   pulled.

---

## 6. Suggested sequencing — status at 2026-09-28

| # | Slice | State | Remaining |
|---|---|---|---|
| R1 | Program workspace UI (schedule, guests grid, team & duties, import mapping) | **merged #452** | — |
| R2 | Guest groups schema decision + contract correction | **merged #450** | — |
| R3 | `HostWorkShell` + assignment picker + door check-in screen on the durable journal | **merged** — shell/picker #447, door screen + journal runtime #448 | `/host/operator` → `/host/work/event/:eventId` redirect **in review #465** |
| R4 | Program-scope Moments route + program Inbox scope chip | **in review #454** | merge |
| R5 | Stays/room blocks + group-informed allocation | **blocked** — decision 5.5; no A7 code exists to pull | schema + allocation |
| R6 | Travel capture on household RSVP | **blocked** — decision 5.2 (write-surface widening) | RSVP-side capture |
| R7 | Distance-aware moment lead times | **in review #456** | merge; optional Routes provider swap |
| R8 | `stakeholderViewer` counts API + read surface | **in review #458** — counts-only contract answers 5.4 (headcounts only, no PII) | merge |
| R9 | Entitlements merge + Plan screen + limits in callables | **in review #455** (rebased, re-verified) | merge |
| R10 | `recipientSource: programSelection` + form-automation → triggered-moment migration | **in review #478** — programSelection dispatcher on main; companion-Moment + durable-intent handoff in review | merge |
| R11 | Reconciliation/export, per-function attendance report, retention | **implemented** — reconciliation/export/attendance merged (#460, #471); retention follows the approved policy (14d grace, keep `contactId`, indefinite anonymized retention): `archiveProgram`/`unarchiveProgram` callables, archived mutation fencing, chunked idempotent anonymize worker with journaled cursor resume, daily sweep | Source complete; release admission and deployment remain release-owned. |
| R12 | `verifyFirebaseDelivery` dormant-list fix | **merged #453** | — |

Merge-ready now (no ordering dependency): R9's entitlements PR (#455).
```
