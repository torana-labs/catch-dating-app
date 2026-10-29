---
doc_id: airport_arrivals_prd
version: 0.3.19
updated: 2026-09-23
owner: product
status: draft
---

# Airport Arrivals Coordination — Product Requirements

Working name: **Arrivals Desk**. Name is provisional; this document owns the
product requirements and the proposed wedding/corporate extension architecture,
not the brand. The product lives inside **Catch Host**, as confirmed by the
product owner on 2026-09-22. The architecture below distinguishes inspected
source behavior from proposed functionality; it is not a deployment claim.

## Problem

For Indian destination weddings and corporate events, airport pickup is run
by a person with a clipboard at the arrivals exit. The clipboard holds a
manifest: guest names, flight numbers, arrival times, and hotel assignments.
Everything else is improvised:

- **Flight status is tribal knowledge.** Delays, cancellations, and actual
  landing times are checked by hand on Google or an airline site, per guest,
  repeatedly. Landing time is not curb time — immigration and baggage add a
  lag nobody tracks explicitly.
- **Batching is mental arithmetic.** Guests landing within a similar window
  and going to the same hotel should share a vehicle. Doing this live, on
  paper, across hundreds of guests arriving over 2–4 days means vehicles
  leave half-empty and guests wait at the curb.
- **Vehicles come from multiple subcontractors.** A premium SUV (e.g., an
  Innova) bills differently from a sedan, and hotels sit at different
  distances from the airport. Reconciling each vendor's claimed trips,
  vehicle classes, and routes against what actually happened is a
  multi-day post-event argument.
- **Hotels are blind.** The reception team learns guests have arrived when
  20 people walk in at once. Room blocks can't be sequenced, so guests mill
  around the lobby while keys are sorted.

The planner pays for all of this in staff headcount, idle vehicles, vendor
disputes, and a bad first hour of the guest experience.

## Product thesis

Replace the clipboard with a **shared, live arrivals roster** that runs on
the phones and tablets the team already carries:

1. The manifest lives in the system, enriched automatically with live flight
   status.
2. The system proposes vehicle groups by arrival-window × destination-hotel
   and suggests a vehicle class; humans can override everything.
3. Every dispatch records the actual taxi plate and vendor, producing a
   reconciliation ledger as a byproduct of doing the work.
4. The same live state is visible at the hotel desk, so inbound ETAs and
   room sequencing are known before the vehicle arrives.

Catch already operates events infrastructure: phone-first auth, organizer
roles, Firestore real-time sync, callable-owned mutations, and Google Maps
integration. This feature is a new **organizer vertical** (wedding and
corporate event planners) built on that substrate. It does not depend on the
dating graph, clubs, or consumer booking flows.

## Goals / non-goals

### Goals

- One shared source of truth for "who is arriving, when, and going where,"
  live-synced across planner, greeter, and hotel-desk surfaces.
- Live flight tracking (delays, landed, cancelled, diverted) without manual
  checking.
- A **curb ETA** per guest: estimated/actual landing time plus a
  configurable exit lag, so the roster answers "when do they walk out," not
  "when do wheels touch."
- Assisted grouping: suggested vehicle batches by time band and
  destination, with vehicle-class suggestion — every suggestion manually
  overridable.
- One-tap dispatch capture: taxi plate number, vendor, vehicle class,
  departure time — the act of loading a car produces the reconciliation
  record.
- Hotel-side inbound view with live transit ETAs and room-block sequencing.
- Vendor reconciliation report: trips × route × vehicle class × pax,
  rate-card estimate, export.

### Non-goals (v1)

- Guest-facing app or guest notifications (WhatsApp/SMS updates are a later
  phase; guests are roster entries in v1, not users).
- Driver or vendor self-service portal. Vendors are managed entities, not
  signed-in users.
- Departure leg (hotel → airport drops after the event). Nearly symmetric
  to arrivals and deliberately deferred — see Phasing.
- Payments, vendor billing settlement, or guest payment of any kind.
- Route optimization across multiple stops; vehicles run airport → single
  hotel.
- Cross-program fleet optimization in v1. A planner can own several weddings
  or corporate programs; every query, selection, grant and draft must retain
  its explicit program scope even when the pilot exercises only one.

## Users and surfaces

| Persona | Who | Surface | What they do |
|---|---|---|---|
| Planner admin | Wedding planner / corporate event ops lead | Planner console (web or host app) | Create event, import manifest, configure airports/hotels/vendors/rate cards, watch live ops, reconcile |
| Greeter | Temp staff at arrivals exit ("the clipboard person") | Greeter roster (phone/tablet, outdoor-readable) | Track incoming guests, claim/greet, adjust groups, dispatch vehicles, capture plate numbers |
| Hotel desk | Welcoming-team member at each hotel | Desk view (tablet/phone) | See inbound vehicles/guests with ETAs, sequence room blocks, mark arrivals |
| Vendor | Taxi/coach subcontractor | None in v1 | Configured entity: name, fleet, rate card, contact |
| Guest | Event attendee | None in v1 | Manifest entry; carried through the state machine by staff actions |

Multiple greeters work simultaneously (different terminals/exits); multiple
hotels each run their own desk view. All surfaces share one live event
state.

## Core concepts

### Event / private program

In the product narrative, 'event' means the wedding or corporate engagement.
The architecture below stores that private engagement as a **program**, not as
one of today's publicly readable `events` documents.

A multi-day organizer program (wedding, offsite, conference) has:

- One or more arrival airports (v1: typically one; model must not assume
  exactly one) and optional per-terminal notes.
- One or more **hotels**, each with: name, address, drive-time distance
  from each airport, room blocks (named block + room count).
- A **staff roster**: planner admins, greeters, hotel-desk members,
  each scoped to the event (hotel-desk scoped per-hotel).
- **Grouping policy**: time-band window (default 45 min), max guest wait
  tolerance, vehicle-class table, exit-lag defaults.

### Guest manifest entry

| Field | Notes |
|---|---|
| Guest name | Required; display name for signage/board lookup |
| Party size | Adults/kids; drives capacity math |
| Family/party ID | Keeps people travelling together in one group |
| Phone | Optional; for staff contact, not guest messaging in v1 |
| Flight number + arrival date | Optional — supports road/train/manual arrivals ("ground entry" with manual ETA) |
| Hotel assignment | Required for batching; "custom destination" allowed via override |
| Room block | Optional; feeds hotel desk sequencing |
| Flags | VIP (dedicated vehicle), elderly/wheelchair assist, extra luggage (capacity bump) |
| Notes | Free text |

Import paths: CSV template upload, paste-from-Excel/WhatsApp table parsing,
and manual entry. Manifests of 100–500 guests must import without staff
needing to retype. Edit and dedupe (same person listed twice, name
variants) happen in the planner console.

### Flight tracking

Each manifest entry with a flight number + date resolves to a tracked
flight:

- Status: `scheduled → departed → landed`, plus `delayed`, `cancelled`,
  `diverted` as overlaying states; scheduled vs estimated vs actual times
  kept distinct.
- Terminal/arrival info where the API provides it.
- **Curb ETA** = actual landing, else estimated landing, else scheduled
  landing, plus exit lag. Actual/estimated times may be earlier than schedule;
  taking their maximum would incorrectly retain an obsolete delay. An active
  reviewed manual curb estimate supersedes this derived estimate. Cancelled or
  diverted flight data alone produces no usable pickup estimate.
  Exit lag defaults: domestic ≈ 25 min, international ≈ 60 min;
  planner-adjustable per flight or per program. These are planning assumptions,
  not evidence that the guest has exited or is ready to board.
- Polling cadence ramps with proximity (e.g., hourly at T-24h, ~15 min at
  T-3h, tightest once airborne), subject to the provider's push/webhook
  capability — see Integrations.
- Cancellation/diversion/reschedule surfaces as an **exception card** on
  the roster and a planner alert, not a silent status change.

### Vehicles, vendors, dispatch

- **Vendor**: subcontractor; has a fleet (vehicle classes, optional plate
  registry) and a **rate card** (price per trip by vehicle class ×
  destination hotel, or per vehicle-day — model must support both).
- **Vehicle class**: ordered table e.g. sedan (≤4 pax) → SUV/Innova (≤6)
  → tempo traveller (≤14) → coach (≤40), planner-editable per event.
- **Dispatch** (the atomic record): guests[], destination, suggested vs
  actual vehicle class, taxi plate number, vendor, driver name/phone
  (optional), departed_at, Maps transit ETA, arrived_at, status.
  Everything except guests[]+destination is overridable at capture time;
  nothing else about the record is required to be "correct" in advance —
  the point is to record reality.

## Guest lifecycle

```text
scheduled ──→ en_route ──→ landed ──→ greeted ──→ grouped ──→ dispatched ──→ arrived ──→ checked_in
                │
   overlays: delayed · cancelled · diverted · rescheduled
   exceptions: no_show (landed, not found) · self_transport · split_party · wrong_terminal
```

- Transitions `scheduled→landed` are driven by the flight provider.
- `greeted` onward are human actions on the greeter/hotel surfaces.
- Every transition is timestamped and attributed (which staff member) —
  this is what makes downstream reconciliation and post-event reporting
  trustworthy.
- `self_transport` and `no_show` are explicit leg dispositions, not proof of
  a billed taxi trip. A late arrival can be re-queued with a recorded correction;
  historical observations and reconciliation exceptions remain visible.

## Surface requirements

### 1. Planner console

- **Setup wizard**: event dates, airport(s), hotels (+drive time, room
  blocks), vendors (+fleet, rate cards), staff invites, grouping policy.
- **Manifest management**: import (CSV/paste), review, dedupe, per-guest
  edit, bulk hotel assignment.
- **Live ops board**: event-level summary — guests landed/not-yet/
  dispatched/arrived counts, active dispatches with ETAs, open exceptions,
  per-hotel inbound queue. Same data as greeter view, aggregated.
- **Reconciliation**: per vendor — trips, vehicles used, classes, routes,
  pax carried, rate-card estimate; flag variance vs vendor invoice;
  export CSV/PDF. Available live during the event, final at closeout.
- **Event closeout**: final manifest state, exception list, recon export,
  retention/anonymization policy trigger.

### 2. Greeter roster (primary surface)

Design constraint: used standing up, outdoors, one-handed, on flaky
airport connectivity, by temporary staff who may have installed nothing
before their shift.

- **Live board**: roster sorted by curb ETA, grouped into bands
  ("arriving now", "~20 min", "~45 min", "later"). Each row: guest name,
  party size, flight number, status badge (on time / +35 min delayed /
  landed 12 min ago / cancelled), curb ETA, hotel tag, flags (VIP,
  assist).
- **Search/board lookup**: guest walks up and says a name — fuzzy search
  across the manifest, then "greet" in one tap.
- **Claim**: a greeter marks "I've got them" so a second greeter at
  another exit doesn't duplicate; claims are visible to all staff.
- **Suggested groups**: system proposes batches = same hotel × curb-ETA
  within the time band, capped by vehicle class capacity, party integrity
  preserved, VIPs forced to dedicated vehicles. Each suggestion shows the
  recommended vehicle class and fill (e.g., "Innova · 5/6").
- **Manual overrides at every step**: move guest between groups, merge,
  split, change hotel/destination, change vehicle class, hold a group
  ("waiting on one more"), un-greet. Overrides never block on the
  suggestion engine.
- **Dispatch capture**: when the group physically boards — enter taxi
  plate (fuzzy-matched against vendor fleet registry when available),
  confirm/adjust vendor + vehicle class, optional driver phone, tap
  "departed." The group becomes a live dispatch with a Maps transit ETA
  shared to the hotel desk.
- **Exception actions**: mark no-show (with reason), mark self-transport,
  re-queue a guest whose flight was cancelled/rescheduled, split a party.
- **Offline tolerance**: reads cached; writes (greet, claim, dispatch)
  queued locally and synced with conflict resolution. A greeter must
  never lose a dispatch because the terminal concourse has no signal.

### 3. Hotel desk view

- **Inbound queue per hotel**: live list of dispatched vehicles heading
  to this hotel — plate, vehicle class, pax count, guest names, transit
  ETA (from Maps), departure time.
- **Arrival alerts**: heads-up when a vehicle is ~15 min out.
- **Room sequencing**: guests per inbound vehicle grouped by room block;
  desk marks rooms ready / guests checked-in per dispatch.
- **Expected-not-dispatched**: guests landed but not yet in a vehicle
  ("still at airport"), so the desk doesn't wonder where they are.

## Grouping and vehicle suggestion logic

Deterministic, inspectable, and always overridable:

1. Partition un-dispatched travel parties by program, pickup point (airport
   and terminal/meeting zone), destination, and readiness lane. Never group
   separate airports merely because guests share a hotel.
2. Within a destination, order by curb ETA and sweep a configurable time
   band (default 45 min, planner-tunable per event — the core trade-off
   between guest wait and vehicle utilization).
3. Within a band, split into vehicles: keep parties together, respect
   capacity (pax + luggage flags), prefer the smallest class that fits,
   prefer fewer vehicles; VIPs always get a dedicated vehicle regardless
   of fill.
4. Emit suggestions with rationale shown inline ("3 guests, same hotel,
   landings within 20 min → 1 sedan"). The greeter accepts, edits, or
   ignores.

The engine never auto-dispatches; it only proposes. Every dispatch is a
human decision that produces a durable record.

## Integrations

- **Flight data provider** (decision pending — see Open Questions):
  requirements are India-first coverage (IndiGo, Air India group, Akasa,
  plus international carriers into Indian airports), flight-number+date
  resolution, estimated/actual landing times, terminal data, cancellation/
  diversion signals, and either webhooks or affordable polling at
  ~hundreds-of-flights scale per event. Candidates to evaluate:
  FlightAware AeroAPI, AeroDataBox, AviationStack, VariFlight.
- **Google Maps / Routes API**: airport→hotel transit ETAs per dispatch
  and per-hotel drive-time config. Catch already integrates Google Maps;
  reuse the existing location stack rather than a second provider.
- **Auth/staff invite**: event-scoped staff access. Open question whether
  temp greeters use phone auth, an event PIN link, or a lightweight PWA
  session — see Open Questions.

## Non-functional requirements

- **Connectivity**: roster snapshots are purpose-scoped and time-limited;
  locally recorded actions are durably queued with visible pending status.
  Server mutations use expected revisions and idempotency receipts, never
  last-write-wins for passenger or vehicle assignment. Conflicts require
  explicit review. Offline capture is not server-confirmed dispatch and cannot
  prevent another disconnected device from recording the same guest. Device
  destruction or app-data deletion before sync remains an explicit limitation.
- **Concurrency**: N greeters × M hotel desks × planner on one event
  state; claims and dispatch records prevent double-handling.
- **Device/UX**: phone + tablet, sunlight-readable contrast, large type
  and tap targets, minimal typing (search, not forms, at the curb),
  battery-conscious polling, landscape tablet for hotel desk.
- **Privacy**: manifests are PII (names, phones, flights, hotels). Access
  is event-scoped by role; hotel desk sees only its hotel's guests;
  retention and post-event anonymization policy defined before launch.
- **Localization**: English v1; Hindi (and bilingual signage strings) on
  the roadmap.
- **Scale**: single event ≈ hundreds of guests, tens of concurrent staff,
  hundreds of flight-track-days; design should not preclude thousands.

## Success metrics

- Guest curb wait: greeted → dispatched time (target: median < 20 min).
- Vehicle fill rate and empty-dispatch rate vs pre-launch baseline.
- % of groups accepted as-suggested vs manually edited (engine quality).
- Vendor reconciliation effort: days of dispute → a report plus variance
  review; % of vendor-invoiced trips match recorded dispatches.
- Hotel check-in wait for inbound batches.
- Flight status freshness lag (provider → roster) and curb-ETA accuracy.
- Staff effort: actions per guest; greeter onboarding time (<10 min for
  temp staff is the bar).

## Architecture fit

- **Surfaces**: all staff and planner operations remain inside Catch Host.
  A restricted staff shell shares its authentication, design system and
  adaptive layouts; it is not the internal React admin console.
- **State**: callable-owned commands and role-specific read projections.
  Low-latency callable refresh is the initial read transport; an authorized
  realtime projection is a later optimization, not permission to stream all PII.
- **Data**: private program-scoped collections for wedding/offsite operations,
  linked deliberately to existing organizer/CRM/Form authorities. Public event
  documents must not become private guest-logistics stores.
- **Flight polling**: scheduled Functions plus a provider adapter; provider
  credentials remain server-side. Existing Maps/Places code does not implement
  road-route ETA queries. Both integrations need new adapters and launch checks.
- The detailed architecture and incremental delivery contract follow below.

## Phasing

- **P0 / MVP**: planner setup + manifest import; greeter roster with live
  flight status and curb ETA; manual grouping with suggestion engine v1;
  dispatch capture (plate, vendor, class); hotel inbound view (read-only
  ETAs); basic reconciliation report. Single airport exercised end-to-end.
- **P1**: fleet registry + plate auto-match; rate-card variance recon;
  room-block allocation at desk; WhatsApp/SMS guest + staff notifications;
  multi-greeter claims hardening; Hindi strings.
- **P2**: **departure leg** (hotel→airport drops — nearly symmetric and
  the obvious next thing a wedding planner asks for); vendor portal or
  driver QR confirmation; multi-airport polish; settlement export to
  accounting.

## Open questions

1. **Surface — resolved**: Catch Host, with role-specific staff workspaces;
   a separate staff app or internal-admin login is not the direction.
2. **Staff auth — proposed**: named Firebase phone-auth accounts, scoped
   expiring assignments and deep-link continuation. A shared event PIN is not
   authorization. Invite-before-first-login needs an explicit new binding flow.
3. **Flight provider**: coverage/cost/push-capability spike required
   before committing; India domestic coverage is the deciding factor.
4. **Product boundary — resolved**: an additional segment within Catch Host,
   not a replacement for the social-event Host experience. Pricing and segment
   onboarding copy remain product decisions.
5. **Business model**: per-event flat fee, per-guest, or bundled into an
   organizer subscription — out of scope here but shapes the console.
6. **Guest comms**: do guests get pickup instructions/driver details by
   WhatsApp in P1, and does that require their consent at manifest import?
7. **Retention**: how long is manifest PII kept post-event, and who can
   export it?

## Edge cases to design for

- Guest lands but never exits (met family, wrong terminal, medical) —
  no-show with reason, not a silent drop.
- Same name twice on a manifest; same person twice under variant names.
- Flight rescheduled to next day — guest stays on roster, doesn't fall off
  at midnight.
- Party splits across flights; party members arrive on different days.
- Guests with no flight (road/train) mixed into the same roster.
- Taxi plate doesn't match any registered fleet — still record it, flag
  for recon.
- Two greeters dispatch overlapping groups simultaneously — server-owned
  dispatch records, no double-counted trips.
- Vehicle dispatched but turns back / guest removed at the curb —
  dispatch void with reason, kept in the ledger.
- International guests with no Indian number — no dependency on guest
  phone in v1.

## Catch Host Extension Architecture

### 1. Status, scope and governing boundaries

This section is a proposed implementation architecture derived from source at
base `eb4829d198a2721ceea74e778c68ab5b07f67919`. It is not a claim that the new
collections, roles, APIs or screens already exist. The initial implementation
slice is identified separately in section 15. Existing runtime owners remain
[app architecture](../app_architecture.md), [data contracts](../data_contracts.md),
[Host product](../host_product.md), [Forms](../host_forms.md),
[backend operation catalog](../backend_operation_catalog.md), and
[design language](../design_language.md). Update those owners with each shipped
boundary; this document owns the cross-domain wedding/transport proposal, not a
second general architecture standard.

**Goal:** make a private multi-day wedding or corporate program operable in
Catch Host, with least-privilege staff stations and reusable participant,
intake, communication and transport capabilities.

**Scope:** program identity, guests/households, functions, RSVP and travel intake,
hotels, staff grants, flight enrichment, transport planning, dispatch,
reception and reconciliation; scoped handoffs to existing Audience and Inbox.

**Exclusions:** a new mobile app, internal-admin privileges for planners,
Consumer onboarding, dating/profile requirements, a new CRM/form/messaging
engine, automatic public publication, a generic enterprise RBAC editor,
automatic settlement, hotel PMS integration, and a global routing optimizer.

**Acceptance:** source boundaries, privacy and concurrency guarantees are tested;
a pilot can import a family roster, give a greeter only one airport station,
give a receptionist only one hotel, record a trip once, receive it at the hotel
and reconcile it without changing existing social-event behavior.

### 2. What is actually reusable today

Paths in this table are existing inspected sources, not proposed filenames.

| Existing source | What it supplies | Boundary/gap for weddings |
|---|---|---|
| `lib/host_app.dart`, `lib/routing/go_router.dart` (`appRedirect`) | Separate Host app/router; authenticated Host users bypass Consumer profile completion | Host authentication currently does not select a duty-specific workspace; add a staff-access bootstrap rather than another Consumer role |
| `lib/routing/shell/host_app_shell.dart` | Five manager destinations, organizer selection, adaptive shell | Fixed branch indices and unconditional manager-shell providers; hiding labels alone would still mount unrelated providers |
| `contracts/firestore/organizer_team_memberships.schema.json`, `functions/src/shared/organizerHosts.ts` | Organizer owner/manager authority | Broad business authority, unsuitable for airport or hotel staff |
| `contracts/firestore/event_staff_grants.schema.json`, `functions/src/shared/eventOperatorAuthority.ts`, `functions/src/events/eventStaff.ts` | UID-bound, revocable, revisioned, expiring event grants; transaction-aware checks | Existing grant API gives the operator bundle, not airport/hotel-scoped authority; requires an existing Auth account; max 50 active staff and 14-day grants |
| `lib/hosts/presentation/host_event_operator_screen.dart`, `lib/contexts/organizers/data/host_event_staff_repository.dart` | Restricted `/host/operator/:eventId` route and typed callable repository | Useful shell/access pattern, not a safe airport/hotel read model |
| `firestore.rules` (`events`, `eventAttendees`, `hasActiveEventOperatorGrant`) | Events are public; attendees are private except permitted managers/roster staff | `viewRoster` grants whole attendee-document reads; no field redaction or hotel restriction. The rules helper checks top-level expiry, whereas the callable helper also checks `operatorExpiresAt`; require parity work before extending that path |
| `functions/src/events/eventAttendees.ts`, `rosterAdapters.ts`, `lib/contexts/audience/data/host_roster_file_parser.dart` | CSV/XLSX parsing, normalization, reviewed imports, source keys, individual operational attendees | No travel/stay model; phone-first dedupe can collapse a household unless stable individual references are preserved |
| `functions/src/organizers/organizerAudienceProjection.ts`, `contracts/firestore/organizer_contact_event_edges.schema.json` | Event-attendee-to-CRM provenance and rebuildable person/event edges | Program membership must not be faked as event attendance or silently become cross-client marketing permission |
| `lib/hosts/audience/README.md`, `lib/contexts/audience/data/crm/host_contacts_repository.dart`, `host_saved_audience_repository.dart` | People, saved audiences, identity/merge review and contextual history | Wedding membership is a typed program scope, not just a free-text tag |
| `functions/src/organizers/organizerForms.ts`, `organizerFormConversions.ts`, `contracts/shared/organizer_form_common.schema.json` | Versioned Forms, responses and reviewed conversion | Current targets are organizer/event/campaign; no program, household respondent authority or repeatable household roster. Current event conversion creates one attendee and depends on CRM conversion |
| `lib/hosts/inbox/README.md`, `functions/src/organizers/organizerCampaigns.ts` | Scoped Inbox/Sends, saved-audience consumption, delivery status and sender checks | Current saved-audience campaign path expects `organizerCrm`; wedding-scoped recipients and authority must be carried through preview, approval and dispatch |
| `lib/contexts/bookings/data/host_attendance_outbox.dart` | Account-keyed local queue, absolute mutation, revision and conflict-review pattern | SharedPreferences implementation trims old/overflow entries and clears malformed data. Do not reuse that storage policy for financially significant dispatch records |
| `functions/src/eventSuccess/operations/departureRosterSource.ts` | Explicit departed-member selection, source hashes, transaction fencing | Requires checked-in event attendees and group participation. It is not airport transport; do not extend it with plate, hotel or vendor fields |
| `functions/src/places/googlePlaces.ts`, `lib/locations`, `docs/location_stack_plan.md` | Server-side Places adapter, coordinates, Maps rendering and attribution | No flight API or Google Routes ETA adapter found in the inspected runtime sources |
| `packages/catch_ui`, `packages/catch_tokens`, `lib/platform/riverpod_ui` | Provider-free primitives, adaptive composition, field/section patterns and async boundaries | Build logistics components from these; don't fork the visual system |

An authored capability label is not sufficient proof of behavior. In particular,
existing docs describe broader Forms staff capabilities than the manager-only
conversion flow inspected here. Reuse requires endpoint-level authorization
review, not simply a new tab or a schema field.

### 3. Domain model: organization, program and function are different

Recommended hierarchy:

```text
Organizer: the planner company / corporate organizer
  Program: one private wedding / offsite / conference engagement
    Guests: one record per invited person, optional CRM identity link
    Households: invitation/response relationships
    Functions: mehendi, sangeet, ceremony, reception / corporate sessions
    Travel legs and travel parties
    Hotels, room blocks, stays and allocations
    Staff assignments
    Transport: vendors, vehicles, batches, trips and reconciliation
```

Use `organizerType: eventProducer` where appropriate; do not add a global
`weddingPlanner` Auth role or misuse social activity kinds to decide security.
Use the program-level `kind: wedding | corporate | social | other` and a
versioned capability profile. Segment presets choose copy, templates and default
modules. Server-validated enabled capabilities decide availability; grants decide
authority. A planner can run both weddings and social events.

#### Why a new private program instead of one giant Event

The existing Event carries booking/discovery/attendance assumptions and is
publicly readable. A wedding spans several dates, venues, guest subsets and
staff shifts; airport pickup can happen before any function starts. Its master
invitation status, room check-in and reception attendance are not one status.

`organizerPrograms` is the private engagement root, not a new public listing.
`programFunctions` contains the private schedule and venue; function-level
invitation membership is a planned separate relation. It does **not** create public `events`.
If a later function needs existing Event Success or commerce, add a reviewed
private-event/public-projection boundary and an explicit `eventId` bridge.
Do not create a dummy public wedding event merely to satisfy current CRM or Form
APIs. Do not relax existing Event required-location or booking invariants.

This is an additive rollout: existing public social Events and their attendees
continue unchanged. The new program guest is invitation membership at a different
scope; a linked EventAttendee is a function's admission/attendance fact. Neither
replaces `organizerContacts` as a CRM identity or `eventParticipations` as a real
Consumer booking.

#### Identity and membership

- `programGuestId` is an opaque stable person-within-program id. It is not a UID,
  phone, row number on a subsequent upload, or a concatenated guest name.
- A guest may have no personal phone/email/account. A household contact is a
  delivery/RSVP delegate, not identity evidence that all members are one person.
- `contactId` is optional and organizer-scoped. Explicit reviewed identity linking
  reuses existing CRM merge/provenance policy; contact merges do not merge guests,
  reservations, passenger counts or stay assignments automatically.
- `householdId` means shared invitation/response authority. `travelPartyId` means
  people who should ride together on a particular leg. Different flights/hotels
  can split a household into several travel parties without corrupting identity.
- Keep one record per passenger, including children; derive party headcount.
  Pending unnamed plus-ones have stable slots and do not produce fake accounts.
- Travel, stay, RSVP, communication consent and function attendance are separate
  aggregates. A flight landing must never check a guest into the wedding or hotel.

### 4. Authorization: named duties, not broad employee access

Keep Firebase Auth for identity. Use **private program-scoped assignments** for
staff authority, borrowing the event-grant revision/expiry/revocation model but
not reinterpreting `eventId` as `programId`.

`programStaffGrants/{programId_uid}` has organizer/program/UID binding,
status, revision, grantor/revocation fields and independently expiring duties.
Each duty is a discriminated union with a bounded resource scope:

```text
programCoordinator(programId)
airportGreeter(programId, pickupPointIds[])
transportDispatcher(programId, pickupPointIds[])
hotelDesk(programId, hotelIds[])
reconciliationViewer(programId)
```

The initial product may assign both greeter and dispatcher duties to the same
person. Separating them allows a helper to find guests without authorizing a
financially significant dispatch. Avoid user-authored permission expressions.
The program coordinator is program-wide operations authority, not organizer
ownership, sender administration, payout access or unrestricted CRM export.

| Capability | Organizer manager | Program coordinator | Airport greeter | Dispatcher | Hotel reception | Reconciler |
|---|---|---|---|---|---|---|
| Program setup/guest list | Yes | This program | Assigned pickup projection | Assigned pickup projection | Assigned hotel projection | No guest directory |
| Greet/ready/claim | Yes | Yes | Assigned pickup only | Assigned pickup only | No | No |
| Batch/assign/depart | Yes | Yes | No unless also dispatcher | Assigned pickup only | No | No |
| Confirm hotel receipt | Yes | Yes | No | No | Assigned hotel only | No |
| Rooms/allocations | Yes | Yes | No room numbers | No room numbers | Assigned hotel only | No |
| Vendor/rate administration | Yes | Explicit program authority | No | Read operational vehicle identity, not rates | No | Review costs; cannot dispatch |
| Reconciliation/export | Yes | Explicit finance grant | No | No | No | Financial projection only |
| Forms/Inbox | Organizer scope | Only explicitly program-bound operations | No | No | No | No |
| Cross-program CRM/sender/payouts | Existing authority | No | No | No | No | No |
| Staff grant/revoke | Yes | Not in first release | No | No | No | No |

A read/write decision must combine actor UID, owning organizer, program status,
current grant/duty revision and expiry, feature capability, requested action and
resource membership. User-provided hotel ids or pickup ids never enlarge scope.
A write affecting a guest and a trip checks **both** resources' program and
pickup/destination relationships in the same transaction.

Program grants are separate from organizer manager arrays and global custom
claims. Managers are resolved from current canonical organizer authority, not a
client boolean. Grant/revoke flows re-read manager authority transactionally.
Global revocation invalidates all duties; extending a hotel duty cannot extend
airport access. Duties are initially capped and short-lived using reviewed
limits comparable to existing staff grants. Longer-term planner access must not
be silently inferred from temporary staff renewal.

The pilot stores `expiresAtMillis` on each granted duty scope; the enclosing
`expiresAt` is the maximum deadline used by the active-grant inventory query.
Exact duplicate duty/pickup/hotel tuples can renew to a later deadline. Different
tuples stay separate, including an unrestricted short assignment beside a
narrower long assignment. The eight-assignment cap rejects an oversized merge
without consuming the invite. Coordinators require empty (program-wide) scopes.
Legacy grants without per-assignment deadlines are denied and must be reissued
by a manager; the old maximum deadline cannot reconstruct original authority.
Any pending invites issued before tuple preservation must likewise be revoked
and reissued before rollout, because their original scope cannot be recovered.

Invite issuance reads manager authority and active owned resources in the same
transaction as creation. Pending lookup applies the expiry predicate before its
limit; exact normalized name/scope/deadline retries reuse the link, while changed
requests require revoking the pending invite first. Claims and direct grants
revalidate resource ownership and active state transactionally. Hotel-desk
assignments accept hotel restrictions only, because hotel receipt and inbound
views do not implement pickup-point restrictions. Grant/invite mutations reject
records whose stored organizer/program/account binding has changed.
Work bootstrap loads assigned resource IDs before applying its 32-pickup and
64-hotel response caps. Unrestricted queries include current organizer ownership
and active state; overflow is explicit. Hotel-only staff receive no airport
pickup inventory.

Client program kind/status, travel readiness, staff duty and vehicle capability
enums are checked against generated callable constraints. Unsupported numeric
values (fractional counts/revisions, non-finite values and invalid timestamps)
fail parsing rather than being rounded into different operational facts.

Offline access checks the individual deadlines. A cached station projection
must refresh after any of its applicable scope tuples expires. Other valid
work access is retained. Cached projection reads recheck the authority generation
and grant deadline after loading, so a concurrent narrower bootstrap cannot
release a roster captured under older permissions. Refreshing a changed access scope clears older program
projections and fences in-flight cache writes. The v2 cache removes old v1
private entries instead of interpreting their missing deadlines as permission.

Operational arrivals, transport-plan, hotel-inbound and trip-ledger responses
carry `accessExpiresAtMillis`: the earliest expiry among assignments that can
contribute to that projection (null for organizer managers). This is a read
lifetime, not a new grant or permission source. A narrower remaining assignment
requires a fresh projection. The client shares one exact-deadline provider
across reads and dispatch sheets, rechecks wall time on app resume,
discards retained rows during reload, and
rejects responses that arrive after their deadline. Saved-operation review
stops resolving guest names from a roster while it reloads. A dispatch sheet
checks both its captured route deadline and the current roster before queuing. Live
read responses also carry the cache's accepted authority generation through
persistence: a concurrent revocation or narrower bootstrap discards an older
response before display, without clearing the newer verified access. A
bootstrap may advance its own generation; persistence failure alone does not
turn a successful live read into an error. Mutation receipts retain their
server outcome across a concurrent access change. Offline projections also
expire at 24 hours from the older of their access and view snapshots, including
an already-open manager view. Dispatch uses the shared work-entry read and
carries both snapshot deadlines into its sheet; no separate access provider
may discard that freshness metadata. The same account/program authority
generation is observable by active projections and open dispatch sheets. A
change removes captured data and reloads dependent reads; a failed read does
not restart itself in response to its own denial. Disposing a read is distinct
from signing out and must not erase another view's valid access snapshot.
Publishing new work authority may require one fresh read to settle against
that generation; unchanged authority does not trigger another reload.
Missing deadlines in legacy operational snapshots fail parsing; they are never
interpreted as manager access.

#### Staff onboarding and discovery

1. Existing-account pilot: staff signs in to Catch Host with phone OTP; planner
   selects that account and grants a station/shift. No Consumer or public host
   profile is required.
2. `listMyHostAssignments` returns the caller's current safe assignment cards,
   bounded and paginated, not the organization's staff directory.
3. Deep links preserve the destination through OTP, then resolve access on the
   server. Links identify a workspace; possession alone grants nothing.
4. Next slice: expiring one-use invitation bound to a verified phone, stored as
   a protected lookup/hash and consumed transactionally after authentication.
   Token replay, wrong phone, expiry and revocation fail closed. No shared PIN.
5. Auth change, duty expiry, revocation or scope change disposes scoped providers,
   clears visible private data and routes to assignment selection/access expired.

#### Reads, PII and revocation

Firestore cannot redact fields within a readable document. Initially deny direct
client reads/writes for the new operational collections and return bounded,
purpose-specific callable DTOs. Airport projection includes name, party, relevant
flight, pickup zone, destination label and actionable assistance requirement; it
excludes room number, unrelated form answers, finance and CRM history. Hotel
projection contains only that hotel's expected guests, inbound trips and room
work; it excludes other hotels and vendor pricing. Finance sees trip ids/counts,
classes, vendors and charges, not phone numbers or accommodation details beyond
route billing identifiers.

Do not give new staff `viewRoster` merely so an existing repository works.
Do not pass raw stored objects through callable responses. Fetch-by-id, search,
counts, exports, snapshots and refresh all use the same resource filter.
Treat removed/private records as unavailable without revealing foreign existence.
Online revocation applies to each new read/write. Data already read cannot be
remotely unseen; local snapshots need a bounded lease and explicit shared-device
policy rather than an impossible instant offline-revocation guarantee.

### 5. Catch Host information architecture and routes

Keep the existing five manager destinations stable. Add program inventory under
**Events**, wedding-scoped people/intake under **Audience**, and wedding-scoped
communications under **Inbox**. Do not create sixth/seventh global Forms or
Transport tabs. A program workspace inside Events exposes local sections:
Overview, Guests, Schedule, Travel, Accommodation, Transport and Team. Guest and
communication shortcuts hand off typed program context to the owning destination.

The manager's wedding journey is:

```text
Events -> New private program -> Wedding preset
  -> import guests/households
  -> invite family contacts to RSVP through Forms
  -> review responses and travel requirements
  -> allocate hotels/room blocks
  -> assign staff and vendors
  -> run arrivals/dispatch/reception
  -> reconcile transport and archive operational data
```

Staff do not enter that manager shell:

| Workspace | Primary navigation | Explicitly absent |
|---|---|---|
| Airport | Arrivals, Dispatch (if granted), shift/access menu | Audience, Inbox, Organizer, payouts, imports |
| Hotel | Inbound, Rooms (if granted), shift/access menu | Other hotels, airport dispatch, CRM, marketing |
| Reconciliation | Trips, Exceptions, scoped export | Guest contact directory and operational mutation |

Prefer one task screen without bottom tabs when only one destination is granted.
For multi-duty staff, an assignment switcher changes an explicit context; it does
not union unrelated permissions into one omniscient roster. Managers can enter a
staff-view mode for rehearsal while retaining their separately authorized account.

Proposed route additions (names are not yet registered):

```text
/host/events/programs
/host/programs/:programId
/host/programs/:programId/guests
/host/programs/:programId/transport
/host/programs/:programId/accommodation
/host/programs/:programId/team
/host/work
/host/work/:programId/airport/:pickupPointId
/host/work/:programId/hotel/:hotelId
/host/work/:programId/reconciliation
```

`HostWorkShell` is a sibling of `HostAppShell`, not a dynamic subset of its
indexed branches. Use destination identifiers and a per-shell index map.
Authentication redirect remains identity-only; a new workspace-access boundary
handles manager/staff/default selection, pending resolution and deep-link denial.
Do not build manager Inbox unread-count or organizer inventory providers for a
staff-only shell. Update route contracts, feature responsibilities, screen
contracts and deep-link tests together; preserve `/host/operator/:eventId`.

### 6. Proposed persistence and contract inventory

All names below are proposed. Use the current top-level collection style with
explicit `organizerId` and `programId`, opaque ids, bounded documents, revisions,
server timestamps and server-owned writes. Do not put the whole wedding roster
inside one Firestore document or add arbitrary logistics maps to `events`.

| Collection | Canonical fact and important fields | Writer / read audience |
|---|---|---|
| `organizerPrograms` | organizer, kind, private title, timezone, dates, lifecycle, enabled capabilities, revision | Program commands / managers and safe assigned-staff summary |
| `programFunctions` | program, private name, start/end, venue, dress-code/instructions, optional reviewed future Event bridge | Program commands / authorized program participants through projection |
| `programGuests` | name, household, optional contactId, invitation/RSVP state, provenance and revision | Guest/import/RSVP commands / scoped projections |
| `programHouseholds` | primary contact, bounded delegate authority, invitation delivery preference | Guest commands / coordinator; respondent only its own authorized household |
| `programFunctionGuests` | unique function/guest membership, invitation and attendance states | Function RSVP/attendance commands, never flight updates |
| `programGuestImports` | idempotency key, source digest, preview revision, counts and bounded row issues | Import workflow; raw uploads separately scoped with expiry |
| `programStaffGrants` | program/UID, duties, independent expiry, status/revision | Manager-only grant/revoke / access service |
| `programPickupPoints` | airport code, terminal/meeting zone, exact coordinates, pickup instructions | Setup commands / airport station projection |
| `programHotels` | exact address/coordinates, reception details, active status | Setup commands / relevant operational projections |
| `programRoomBlocks` | hotel, stay dates, block label and capacity | Accommodation commands / coordinator and assigned hotel |
| `programStays` | guest, hotel, dates, room-block/room allocation, room-ready and hotel-arrived timestamps | Accommodation commands; field-redacted by duty |
| `programTravelLegs` | guest, inbound/outbound/manual kind, original itinerary, resolved flight instance, pickup point, destination, readiness, revision | Travel commands; provider facts linked, not copied over manual facts |
| `programTravelParties` | explicit per-leg ride-together relationship and reviewed split history | Travel commands; bounded member count |
| `flightInstances` | operating service, origin/destination/date, provider identity, schedule/estimate/actual, terminal, observation time | Provider worker; no guest names or contact data |
| `transportVendors` | organizer-owned vendor identity/contact, active status | Managers; program use requires explicit binding |
| `programTransportContracts` | program/vendor binding, versioned tariff/class/route/day terms, currency and validity | Authorized commercial setup; dispatch gets operational subset only |
| `transportVehicles` | organizer/vendor, canonical registration, class and safe passenger/luggage capacity | Vehicle setup; vendor relationship cannot be inferred only from fuzzy plate match |
| `transportBatches` | program, pickup, destination, tentative/locked plan, party/leg references, source hash | Reviewed planner/dispatcher commands; suggestions alone need not persist |
| `transportTrips` | unique trip, actual plate/vendor/class snapshot, manifest, departure/arrival state, rate snapshot, revisions | Dispatch/receipt commands; distinct airport/hotel/finance DTOs |
| `transportActiveAssignments` | unique program/travel-leg to active trip binding | Same transaction as dispatch; protects duplicate boarding |
| `transportVehicleAssignments` | organizer/vehicle active-trip binding | Same transaction as dispatch/arrival; protects concurrent vehicle use |
| `transportOperationReceipts` | request id/hash, actor/scope, original result/revision, expiry | Command transaction / safe replay result only |
| `transportTripAdjustments` | reasoned vendor/plate/manifest/cost correction or void referencing prior revision | Authorized correction command; immutable financial history |
| `transportReconciliationRuns` | source cutoff/revisions, totals, discrepancies, export references | Finance workflow; derived from trips and agreed tariffs |

The first deploy does not need every table. Foundation creates program, guest,
resource and grant contracts; transport adds its own tables with commands; finance
adds rate/adjustment/export records when that slice is built. A program's list of
supported hotel/pickup resources is bounded, but guest/trip inventories paginate.

**CRM integration:** add program membership as a source-aware relation/view,
not a duplicate organizer address book. A new `organizerContactProgramEdges`
projection can index linked guests for Audience and merge-aware program filtering.
The program guest remains membership authority. Counts explicitly distinguish
people, invited guest slots, reachable contacts and households. No program field
is added to the global public profile. Do not copy all logistics into contact
notes or form-answer traits.

**Indexes:** include program + pickup + active state + ready/ETA order for travel;
program + hotel + ETA/status for inbound trips; program + hotel + stay date for
rooms; program + vendor + service date for finance; UID + status + expiry for
assignment discovery. Stable cursors bind scope, filters and source revision where
necessary. DTOs expose coverage/truncation rather than claiming an exact total
from a capped query. Server-only flight refresh indexes use `nextRefreshAt`.

**Contract plumbing:** authored draft-07 schemas in `contracts/shared`,
`firestore`, `callables`, `callable_responses`, with valid/invalid fixtures,
`x-firestore-*` and ownership metadata. Extend the existing generator/ownership
inventory registration, then generate TS/Ajv/Admin timestamp types and Dart request
DTOs. Do not hand-edit generated outputs or create a second schema registry.
Backend collection ownership, rules denies, indexes, retention and deletion hooks
ship with each collection, not after the UI.

### 7. Forms and RSVP: reuse the engine, add a typed target

Keep Forms inside Audience. A wedding preset provides RSVP, travel-information,
dietary/accessibility and accommodation-preference templates. Wedding-specific
questions remain program custom fields, not global dating/profile fields.

Incremental extensions:

1. Extend form target union with `program` and validate ownership in management,
   publication, response access, conversion and automation. Forms attached to a
   program cannot be retargeted across clients with existing responses.
2. Add a version-bound semantic mapping from question ids to proposed guest,
   RSVP or travel changes. Never parse mutable question labels to find a flight.
3. Retain the current public form page for general prospect intake. Private RSVP
   uses a purpose-scoped recipient invitation, optional verified contact step,
   and a private bootstrap that exposes only the invited household. Existing
   public-form resolution is not sufficient protection for a prefilled wedding.
4. Household response authority references explicitly authorized guest ids and
   functions. A respondent cannot invent another household id, enumerate guests,
   or edit every guest sharing a phone. Guests need no Consumer profile.
5. MVP can collect one guest's travel details per submission with an authorized
   household selection. A proper repeatable household editor is a distinct
   builder/respondent capability, not a claimed existing feature.
6. Submitted response remains versioned evidence. A reviewed, idempotent
   conversion updates operational RSVP/travel records with source provenance.
   Subsequent corrections create a new submission/change, not edits to immutable
   response evidence. Changes after dispatch create an exception for review.
7. Flight strings resolve server-side. Ambiguous date/airport/codeshare results
   remain unresolved and manually reviewable; no speculative automatic match.

A form saying 'attending' updates RSVP, not physical attendance. Travel updates
never allocate a room or reserve a vehicle unless a separately authorized command
confirms that operation. Reuse the current conversion receipt and preview pattern,
but do not reuse the one-response-one-CRM-contact assumption for a family.

### 8. Messaging and invitations: reuse Inbox, preserve consent

Audience decides program membership; Inbox owns delivery. Program-scoped shortcuts
open Inbox with immutable program/function/recipient context. Presets include
save-the-date, function invitation, dress code, RSVP reminder and arrival
instructions. They are template choices, not new transports.

- Extend campaign context with an explicit program scope and recipient selection
  contract. A program coordinator cannot fall back to all organizer CRM contacts
  or choose an unrelated saved audience.
- Preview freezes recipient identities, scope/revisions and approved template
  variables. Approval checks those facts; worker dispatch rechecks authority,
  current recipient permission/suppression and program cancellation.
- Resolve household delivery once per intended endpoint; do not send four copies
  because four children share a guardian's number. Keep per-guest RSVP linkage
  even when one invitation was delivered to a household contact.
- Reuse organizer sender connections, message templates, manual-send tasks,
  WhatsApp delivery receipts and STOP behavior. Importing a wedding spreadsheet
  or completing RSVP is not cross-event marketing permission.
- Service-purpose pickup updates and promotional messages require separate
  reviewed purpose/consent rules. Existing event-assistance channel workers are
  reference implementations, not automatically authorized for a new program.
- Personal WhatsApp handoff still means the staff member presses Send; Catch must
  not claim delivery/read evidence. Airport/hotel staff do not inherit Inbox just
  because they may need a guest contact number.

Private invitation content and room information never go into public Event
announcements, organizer follower posts, push payloads or shared URLs. Push carries
an opaque change reference; the app fetches an authorized projection.

### 9. Transport state, grouping and transaction invariants

Use independent state machines:

```text
Flight observation: scheduled / airborne / landed / cancelled / diverted
Travel leg: expected -> greeted -> ready -> assigned -> departed -> received
Exceptions: missing/contacting, flightChanged, selfTransport, cancelledLeg
Batch: suggested (ephemeral) -> accepted -> locked -> dispatched / released
Trip: departed -> arrived; exceptions: interrupted, corrected, voided
Stay: unallocated -> allocated -> roomReady -> hotelArrived -> checkedIn
RSVP: invited -> attending / declined / awaitingReply
```

Human-observed ready/departed/received states cannot be rolled back by flight
polling. A late guest can recover from a no-show disposition via a reasoned
correction. Cancelled flight does not cancel the wedding invitation. Vehicle
arrival and individual guest hotel receipt are separate if only some passengers
arrive or the manifest was wrong.

#### Suggestion policy

Use deterministic policy, not an LLM or hidden optimizer. Inputs are validated
travel parties with stable ids, program, pickup point, destination, readiness,
curb estimate, seat demand, luggage demand, required vehicle capabilities and
explicit dedicated-vehicle flag. Suggested vehicle capacity excludes the driver;
vehicle class labels alone do not establish usable seats or luggage space.

- Keep ready guests separate from merely expected guests in live suggestions.
  Forecast expected arrivals separately so a ready family is not silently held
  for a flight that may be late.
- Sort stably by time then id. Windows are anchored to the earliest member; do
  not chain overlapping bands into an arbitrarily long wait.
- For ready parties, cap a proposed departure by the earliest ready-at plus the
  configured maximum wait. Flag overdue groups and recommend dispatch/review;
  occupancy is secondary to wait and accessibility constraints.
- Preserve travel parties; if a party cannot fit any allowed class, surface an
  explicit unassigned reason. Splitting requires a reviewed staff operation.
- Track passenger seats and luggage separately, and require explicit vehicle
  capabilities for wheelchair access/child-seat arrangements. Unknown capacity
  requires review, not an optimistic assumption.
- The initial greedy heuristic expands a group only when some available class
  can fit it, then recommends the smallest feasible class. It is deterministic,
  not a proof of globally cheapest or minimum-vehicle allocation. Show rationale,
  unused seats and expected hold time; future cost-aware ranking is separate.
- Scope the planning request to currently available classes/fleet commitments.
  A class suggestion does not reserve a vehicle or guarantee vendor supply.
- Auto-refresh can revise unaccepted suggestions, not locked operator plans.
  Re-evaluate source revisions when accepting and again at dispatch.

#### Dispatch command

Proposed `dispatchTransportTrip` request includes program, batch/travel-leg ids,
expected revisions, actual vehicle/registration, vendor binding, class,
observation time and operation id. The server:

1. Authenticates, checks App Check/rate limit/schema, and authorizes the station.
2. In one bounded transaction re-reads program, authority, guests/legs, accepted
   batch, active passenger assignments, vehicle assignment and applicable rate.
3. Validates same program/pickup/destination, actual readiness, capacity and no
   existing active assignment. Manual overrides cannot bypass authorization,
   double-dispatch checks or legal/safety capacity limits.
4. Creates the trip, manifest snapshot, active assignments and immutable operation
   receipt atomically. Retry with the same request hash returns the original
   result; reuse of the operation id with different content is rejected.
5. Commits before publishing notifications/provider work. Retryable background
   projections cannot create a second trip. Provider network calls never run
   inside a Firestore transaction.

Unknown plates can be recorded with normalized display and an explicit provisional
vendor mapping; unresolved billing is flagged, not silently guessed. Fuzzy plate
matching is a suggestion only. Corrections preserve what staff originally entered
and who changed it. Exact normalized registration prevents obvious concurrent
assignment; cross-program vehicle occupancy is organizer-scoped.

The implemented `transportVehicleAssignments` reservation key hashes organizer
id and normalized plate. Active reservations have no age-based expiry. Arrival
and void require matching trip, program, organizer and plate before release;
an old command replay cannot release a newer reservation. Enabling this version
on an environment with older active trips requires reconciling those trips and
creating their reservations first; missing or conflicting bindings fail closed.

Hotel receipt rechecks destination/hotel authority and marks actual arrival; it
releases the vehicle for later work under the agreed lifecycle. Passenger
assignments release only by a confirmed terminal/corrective command. A taxi
returning to the airport after a failed trip is an interruption/correction, not
a delete-and-recreate shortcut.

#### Reconciliation

Snapshot actual vendor, vehicle class, route and applicable tariff version at
dispatch. Later master-data edits cannot rewrite a historical bill. Keep integer
minor units and ISO currency. Per-trip and vehicle-day hire are different pricing
models: sum trip fees for the former; allocate/group vehicle-day usage once for
the latter, with explicit extras for tolls, parking, overtime or deadheading only
when contracted. Empty repositioning is an explicit non-passenger trip kind,
not a made-up guest dispatch.

Report recorded trips, disputed/provisional/voided trips, rate gaps, invoice
claimed units and variance separately. A missing tariff yields 'unpriced', never
zero cost. Exports bind program, authorization and a source cutoff; later
adjustments create a new reconciliation version. Room arrival does not prove
vendor invoice approval or payment.

### 10. Flight, Maps and offline integration boundaries

#### Flight adapter

Add a provider-neutral server port returning normalized observations and
provenance. Resolve flight number with operating carrier, service date,
origin/destination and airport timezone; keep codeshare aliases and the user's
original itinerary. One flight instance can serve many guests without repeated
API polling. Keep guest identity out of provider requests.

Scheduled/estimated/actual times retain their meanings and observed-at timestamp.
Out-of-order provider responses cannot replace newer facts; manual overrides have
actor/reason/expiry and do not destroy raw observations. Cancellations/diversions
produce exceptions, not misleading pickup ETAs. Poll on an adaptive schedule,
with bounded concurrency, backoff, per-environment credentials, cost ceilings,
cache/licensing checks and a circuit breaker. Coverage for Indian domestic and
international arrivals is a provider evaluation gate, not an assumed capability.

#### Road ETA adapter

Reuse `LocationCoordinate`, Places lookup and map/navigation widgets. Add a new
server-side Google Routes port using driving/traffic duration; 'transit' in this
PRD means vehicle travel, not public-transit mode. Scope/cap/cache calls by route
and time band. Provider failure never blocks recording a departure.

Without driver GPS, the honest ETA is **departure time + route duration estimated
at departure**, with source and computed-at time. It is not live vehicle location.
Do not periodically pretend the taxi is still at the airport and add a new full
journey to now. Actual arrival is staff-confirmed. An optional future driver GPS
feature needs its own consent, trip-scoped authority, background-location and
retention work; a greeter's phone position is not the taxi's position.

#### Live reads and offline capture

Initial connected stations use scoped callable pages refreshed on focus, after
commands and on a short configurable visible-screen interval. Return server time,
source revisions, freshness and next cursor. Avoid one listener/poll per guest.
Pilot target: accepted changes visible to connected other stations within ten
seconds under the tested load, with measured P95 rather than a claimed SLA.

A later realtime optimization can publish sanitized resource-scoped projections
or non-PII invalidation signals, with rules that bind current duties. Never stream
raw `programGuests`/CRM and filter locally. Hotel reassignment must immediately
remove a guest from the old projection and fence stale updates by revision.

Offline mode separates 'observed here' from 'confirmed by server'. The outbox is
an append-only local command journal with stable ids, payload hashes, dependencies,
auth/program scope and expected revisions. It uses the shared `core/persistence/local_command_journal.dart` policy with
transactional SQLite on native and IndexedDB on web, capacity rejection and
explicit conflict quarantine; no oldest-entry trimming and no silent clearing
on parse failure. Event attendance uses the same journal. The storage decision,
retention and browser durability limits are owned by
[app architecture](../app_architecture.md#durable-local-commands).
A read-only encrypted/minimized snapshot cache is separate from commands and
expires with the duty/session lease. No raw PII in analytics/error logs.

Online coordination can reserve assignments; two disconnected devices cannot
obtain a global exclusive lock. Pilot operations therefore designate one offline
dispatch recorder per station or require connectivity for confirmed dispatch.
An emergency offline observation remains recoverable for reconciliation but is
not presented as authoritative to another device until accepted. Revoked writes
fail on reconnect and require a currently authorized coordinator to review the
observation; expired authority is never replayed as current authorization.

### 11. Folder organization and dependency direction

The tree is a target map, not a request to create empty scaffolding. Add files
only with working behavior/tests. Current legacy Host folders remain until a
bounded migration has a consumer; new destination-owned behavior goes into the
canonical five roots from `host_feature_responsibilities.json`.

```text
lib/
  hosts/
    access/
      domain/host_work_assignment.dart
      domain/host_workspace_context.dart
      data/host_work_access_repository.dart
      presentation/host_work_shell.dart
      presentation/host_assignment_picker_screen.dart
      presentation/host_workspace_access_controller.dart
    events/
      presentation/host_events_screen.dart                 (extend inventory)
      presentation/programs/host_program_screen.dart
      presentation/programs/host_program_setup_controller.dart
    audience/
      presentation/programs/host_program_guests_screen.dart
      presentation/programs/host_program_guest_controller.dart
      presentation/programs/host_program_rsvp_review.dart
      presentation/forms/                                 (new target adapters)
    inbox/
      presentation/programs/host_program_communication_scope.dart
      presentation/programs/host_program_invitation_templates.dart
    organizer/
      presentation/transport/host_vendor_directory.dart
  programs/
    domain/program.dart
    domain/program_guest.dart
    domain/program_household.dart
    domain/program_function.dart
    domain/program_rsvp.dart
    data/program_repository.dart
    data/program_guest_repository.dart
    data/program_intake_repository.dart
  transport/
    domain/travel_leg.dart
    domain/travel_party.dart
    domain/transport_trip.dart
    domain/transport_batch.dart
    domain/flight_observation.dart
    data/transport_roster_repository.dart
    data/transport_command_repository.dart
    data/transport_command_journal.dart
    presentation/airport_arrivals_screen.dart
    presentation/airport_arrivals_view_model.dart
    presentation/airport_arrivals_state.dart
    presentation/transport_dispatch_controller.dart
    presentation/transport_reconciliation_screen.dart
    presentation/widgets/arrival_guest_row.dart
    presentation/widgets/transport_batch_section.dart
    presentation/widgets/transport_trip_detail.dart
  accommodation/
    domain/program_stay.dart
    domain/program_room_block.dart
    data/accommodation_repository.dart
    presentation/hotel_reception_screen.dart
    presentation/hotel_reception_controller.dart
    presentation/hotel_reception_state.dart
  locations/
    domain/                                                 (reuse coordinates)
  routing/
    go_router.dart                                          (compose shells)
    route_contract.dart                                     (typed route ids)
packages/catch_ui/                                           (generic UI only)
```

`hosts/*` owns product navigation and cross-feature orchestration; `programs`,
`transport` and `accommodation` own shared domain/repository authority. Avoid two
competing Guest repositories inside Audience and Transport. Transport reads a
minimal authorized projection, not `HostAudienceContactDetail`. Accommodation
consumes inbound-trip DTOs through a port, not airport presentation controllers.
Domain code has no Flutter/Riverpod/Firebase imports. Repositories adapt generated
contracts and error context; auto-dispose controllers own commands; `_state.dart`
files stay provider-free display adapters. Scoped providers key by account,
program, duty and resource, not just the currently selected organizer.

```text
functions/src/
  programs/
    programHandlers.ts, programStore.ts, programPolicy.ts
    programGuestHandlers.ts, programGuestImport.ts, programGuestIdentity.ts
    programRsvpHandlers.ts, programFormConversion.ts
    programStaffHandlers.ts, programStaffAuthority.ts
    programReadModels.ts
  transport/
    arrivalTiming.ts, grouping.ts                            (pure first slice)
    transportHandlers.ts, transportAuthority.ts
    transportReader.ts, transportStore.ts, transportPolicy.ts
    transportProjections.ts, transportReconciliation.ts
    flightProvider.ts, flightRefresh.ts
    routeEtaProvider.ts
    *.test.ts
  accommodation/
    accommodationHandlers.ts, accommodationStore.ts
    accommodationPolicy.ts, accommodationReadModels.ts
  organizers/
    organizerForms.ts                                       (extend target)
    organizerFormConversions.ts                             (typed handoff)
    organizerSavedAudienceSources.ts                        (program source)
    organizerCampaigns.ts                                   (scope/delivery)
  shared/
    generated/                                              (generator-owned)
  index.ts                                                  (explicit exports)
contracts/
  shared/program_common.schema.json
  shared/program_staff.schema.json
  shared/transport_common.schema.json
  firestore/organizer_programs.schema.json
  firestore/program_guests.schema.json
  firestore/program_staff_grants.schema.json
  firestore/transport_trips.schema.json
  callables/<bounded_operation>_payload.schema.json
  callable_responses/<bounded_projection>_response.schema.json
  fixtures/{valid,invalid}/
test/
  hosts/access/
  programs/
  transport/
  accommodation/
widgetbook/                                                 (governed fixtures)
```

Follow existing handler/dependency-injection/policy/store separation. Extract
common auth/receipt machinery only when multiple real consumers share it; do not
turn all existing handlers into a new framework. `functions/src/operations` and
`operations/` are durable business-workflow infrastructure, not the home for every
product action containing the word 'operations'. Reuse their proven idempotency,
lease and retry patterns when imports, provider refresh or exports need workers;
do not invent a second durable engine or a tracked evidence registry.

### 12. UI reuse and bounded extensions

| Need | Reuse first | New feature-level piece / extension rule |
|---|---|---|
| Phone/tablet station | `AdaptiveTabScaffold`, `CatchWindowSize`, `CatchScaffold`, root/route scaffolds | New `HostWorkShell`; do not add hidden manager branch indices |
| Header/search | `CatchTopBar`, `CatchSearchField`, canonical search capability | Program/airport/hotel context in semantic title/subtitle; no custom typography knobs |
| Time-band roster | `CatchSection`, `CatchFieldLanes`, canonical field/content rows | `ArrivalGuestRow` composes flight, readiness, party and destination; not a CRM row with hidden private fields |
| Filter and status controls | `CatchSection.controls`, `CatchChip`, `CatchBadge` | Typed flight/transport view state, text/icon plus color; no color-only delay signal |
| Confirm dispatch | `CatchSheet`, `CatchField`, `CatchSelectionSheet`, `CatchButton` | `TransportDispatchController` owns pending snapshot, validation and idempotency; plate/vendor review stays explicit |
| Batch manifest | Contained section only for a real selectable/dispatchable group | `TransportBatchSection`, capacity facts, wait warning and explicit split/move actions |
| Hotel inbound board | Existing adaptive master-detail recipes and field sections | Inbound list + selected trip/stay pane, same data controller on phone/tablet |
| Connectivity/stale data | `CatchBanner.statuses`, async boundary and localized error adapters | One durable pending/stale/conflict banner; distinguish cached data from provider freshness |
| Planner totals | `CatchMetricSection.grid` / `.dataQuality` | Exact vs stale/partial coverage and unpriced trips are explicit |
| Location | Existing `MapPreview` and app location adapter | Optional context, never required to use the roster or substituted with fake map geometry |
| Guest import/forms | Existing parser, preview/field controls and Forms builder | Program-specific semantic column mapping and household identity review |

No reusable primitive currently needs wedding-specific properties. First compose
feature widgets. Only promote a new generic status/freshness or selectable-record
pattern into `catch_ui` after two concrete consumers prove the same anatomy.
Keep provider calls, airline statuses and hotel permissions out of that package.
Do not add a universal table framework or a `weddingMode` boolean throughout
existing screens.

Phone is a searchable list and pushed/sheet detail with large explicit actions;
tablet is list/detail with an optional batch pane at a sufficient local width.
Use current window breakpoints, not device-type checks. Preserve scroll/focus and
selection when live updates arrive; don't move a row out from under a tap. Record
operation snapshots before awaiting, and do not clear a newly edited draft when
an older save finishes.

Acceptance fixtures include empty/loading/stale/error, unassigned hotel,
cancelled/diverted flight, overdue pickup, no suitable vehicle, duplicate dispatch,
revoked role, expired cache, and interrupted trip. Test large text, screen readers,
keyboard navigation, sunlight contrast, mixed-case/long Indian names and exact
plate readability. Add Widgetbook, feature/screen/component contracts and capture
coverage in the same UI slice; do not change golden baselines without review.

### 13. Safety, privacy and operational limits

- Private program metadata is not public Event metadata. Rooms, itinerary,
  assistance requirements and contact numbers never leak through search indexes,
  public profiles, logs, analytics dimensions or a recipient's unrelated form.
- Wedding client lists remain separate by program even within one planner firm.
  Coordinator authority does not cross clients. Organizer-level CRM retention
  after a wedding is an explicit permitted-purpose policy, not the default fate
  of every imported family member.
- Record practical assistance requirements, not unnecessary diagnoses. Do not
  collect passports, government ids or ticket PNRs to track a public flight.
- Define per-class retention before production: operational guest/stay data,
  provider observations, grant/invite data, exports, local snapshots, immutable
  billing records and minimally retained dispute evidence. TTL is cleanup, not
  an authorization check. Export URLs expire and export creation is audited.
- Account deletion and program archival traverse new references and projections;
  finance retention must minimize identity and honor the approved policy.
- API secrets remain in existing secret management; no real credentials or
  provider payloads in fixtures. Separate dev/staging/prod adapters and quotas.
- Pilot sizing: 500 named guests, several hotels, two airport stations and
  approximately 20 concurrent staff. Validate query/write limits and latency at
  that load before increasing advertised scale. No unbounded listener over all
  organizer contacts or guest-level flight polling.
- Kill switches can stop provider refresh, new dispatches or a program's staff
  mutations independently. Preserve reading/reconciliation of existing records;
  disabling a feature does not delete operational history.

### 14. Verification and incremental rollout

Use additive, feature-gated slices. Every deployed slice includes schema fixtures,
generated outputs, server tests, security tests, UI contracts where applicable,
focused checks and an explicit data migration/rollback story. No production
migration, provider purchase, notification sending or deployment is authorized by
this architecture work.

| Slice | Deliverable | Acceptance / dependencies |
|---|---|---|
| A0: pure transport policy | Timing precedence and deterministic capacity/time-window suggestions | Tests cover early actual arrivals, cancellations/diversions, separate pickups/hotels/programs, readiness lanes, household integrity, luggage/accessibility and overdue waits; no callable/export/UI activation |
| A1: private program foundation | Program/function/guest/household schemas, import preview/commit, manager read/write APIs, scope-safe inventory | Anonymous/cross-organizer access denied; names-only guests work; shared family phone does not merge people; idempotent re-import; no public Event created |
| A2: staff authority and shell | Program duties, grant/revoke, assignment discovery, access projection, HostWorkShell | Wrong hotel/airport/event/program denied through API as well as UI; deep-link OTP continuation; expiry/revocation/conflicting duties; no manager providers mounted; existing event-operator routes unchanged |
| A3: manual transport vertical | Pickup/hotel/travel setup, ready/claim, reviewed groups, actual trip capture, hotel inbound/receipt | Two-staff race creates one active assignment; exact retry returns original result; unknown plate vendor review; departure without provider ETA works; room arrival is not event check-in |
| A4: flight and Routes adapters | Provider resolution/refresh, freshness and route estimates | India route/carrier fixture evaluation, timezone/codeshare tests, stale/out-of-order/outage handling, cost caps; no false GPS/live-progress claim |
| A5: offline hardening | Durable journal, scoped snapshot cache, conflict recovery and shift procedure | Restart during write, disk/full/parse fault, lost ack, revoked grant on reconnect, two offline devices, cross-account isolation; never silently drop accepted local observations |
| A6: wedding intake and outreach | Program target in Forms, household RSVP, program-bound Audience/Inbox | Foreign guest token denied; revised response provenance; one household contact can respond only for assigned people; audience preview and send cannot cross program; consent/suppression respected |
| A7: accommodation and commercial closeout | Room blocks/allocations, vendor tariff snapshots, corrections and recon export | No double room allocation for overlapping stays; per-trip vs vehicle-day math; unpriced/voided trips; immutable rate history; export redaction |
| A8: expansion | Return-airport leg, deeper function/Event bridge, optional driver channel | Separate privacy and release review; return flight deadline planning is not simply arrival grouping reversed |

The first integrated pilot uses A1–A3 with manual estimates; production flight
claims require A4 and unreliable-connectivity claims require A5. A wedding CRM/
RSVP/communications launch requires A6, and the full room/reconciliation promise
requires A7. This makes the work incremental without calling an isolated policy
helper a usable feature.

For each diff derive current gates with
`node tool/harness/verify_local.mjs --base origin/main --list`. Registered docs
check: `node tool/run.mjs check docs:metadata`. Contract slices use the schema
generator/check, validator and `./tool/check_data_contract.sh`. Run authorization
and read-redaction integration tests with Firestore emulators, plus focused
Functions unit tests and typecheck. UI slices run focused Flutter tests,
fatal-info workspace analysis and selected architecture/design checks; do not
run Flutter processes concurrently. Existing social Host and Consumer routes,
Audience merges, Form conversions and Inbox dispatch are regression surfaces.

Important negative tests include: a hotel user asking for another hotel's trip
by guessed id; a dispatcher moving a guest into a foreign program; a former
coordinator replaying an offline operation; a scoped campaign widening its
saved audience; a shared phone collapsing two children; a stale provider response
undoing physical departure; and a changed rate card rewriting a historical bill.

### 15. Implementation status and remaining decisions

The source implements the airport operations vertical; that does not establish
production deployment or completion of the broader wedding platform.

| Area | Implemented source | Remaining integration or activation work |
|---|---|---|
| Transport policy | Pure arrival timing, bounded grouping, indivisible travel parties, wait deadlines, capacity and duplicate-passenger guards in `functions/src/transport/` | Pilot load and operational usability validation |
| Private program foundation | Server-owned program/function/guest/household/resource contracts and management callables; explicit person and journey identities; transactional household membership | Per-function invitation/RSVP/attendance contracts and the full manager workspace |
| Staff authority | Independently scoped and expiring duties, phone-bound invitations, paged staff inventory, canonical work access and restricted `ProgramWorkScreen` | Assignment discovery and the unified event/program work shell |
| Operational workflow | Manifest preview/commit with resumable receipts and party-atomic chunks; arrivals/dispatch/hold UI; atomic vehicle occupancy; immutable dispatch manifests; independently paged hotel and trip views | Full accommodation, rate/billing reconciliation and return-airport workflow |
| Flight integration | AeroDataBox polling and webhook handlers, itinerary/freshness fences and recoverable subscription reconciliation | Environment secrets, actual provider-payload validation, cost controls, cross-timezone stations, manual-refresh UI and Routes integration |
| Offline operation | Shared SQLite/IndexedDB command journal for program work and event attendance; immutable IDs/times/revisions, dependencies and replay leases; conflict review and non-destructive recovery export; account-scoped expiring read snapshots | Physical-device durability/eviction validation, shift procedure and approved retention/erasure policy |

`exportedFunctions` entries and callable payload/response contracts ship with
their owning Functions source. Generated contracts are derived from those
schemas; they are not a separate place to reconcile branch semantics.

The planner produces suggestions, not reservations or dispatches. Flight,
travel readiness, hotel arrival and per-function attendance remain different
facts. A6–A8 remain future product slices. Production activation still requires
retention/erasure decisions, environment and index verification, provider
verification where enabled, and exact-head CI/release checks. No real migration,
notification sending or deployment is implied by this implementation status.

#### Integration contracts for the wedding epic

The adjacent wedding plan, schedule, Moments and entitlement work can reuse
these boundaries without adding another identity, outbox or permission model:

- **Function membership is authoritative.** The schedule module's
  `guestItinerary.ts` and `functionHeadcount.ts` currently accept a program-wide
  invitation/RSVP plus optional RSVP overrides. That shape cannot express a
  guest invited to the reception but excluded from another function. Before
  wiring them into private itineraries, counts or outreach, introduce the owned
  `programFunctionGuests` relation with explicit invitation, RSVP and attendance
  facts. A missing relation must not grant access through program-wide RSVP.
  Retire the current editable guest-level RSVP as an independent write source
  when migrating; choose a documented derived rollup or remove it.
- **Moments consume persisted facts.** `getProgramTransportPlan` is a
  recomputed suggestion, whereas Moments' `transportPlanDeparture` anchor
  expects a stable ID, departure time and revision. Supply an explicitly accepted
  and versioned departure plan for pre-departure reminders, or use an immutable
  trip fact for post-departure actions. Never invent a durable anchor from a
  suggestion's list position or cache timestamp.
- **Households delegate communication, not identity.** Program household
  contact fields and membership are already owned here. A messaging adapter must
  resolve the authorized household delegate instead of taking the first guest
  phone in a deduplicated group. Validate program/function scope, channel consent
  and suppression at send time. Import, RSVP and delivery preference do not
  themselves grant messaging consent. Inbox remains the delivery owner.
- **Limits require transactional claims.** The entitlement branch's grant
  selection and soft-limit helpers are pure decisions, not budget consumption.
  Program creation, paid capability enablement and billable sends must bind their
  claim and operation receipt in the same transaction. Preserve reads, recovery
  and reconciliation when new spending or actions are disabled. Household daily
  send counters likewise need an atomic claim, not a count-then-send check.
- **Unify staff presentation through a typed adapter.** Keep event and program
  grant persistence and server authority explicit while projecting both into
  the planned `HostWorkAssignment`/work shell. Retain each duty's resource tuple,
  expiry and revision; flattening them into one union would reintroduce scope
  widening. Function check-in should reuse the shared command journal and add
  its own typed payload/replay adapter, rather than a third queue.
- **Public Events remain separate.** A private function does not create an
  Event or Consumer booking. A future `eventId` bridge needs explicit ownership,
  authorization and public projection rules. Travel arrival never supplies
  function check-in, and a CRM link never supplies guest membership or consent.

Integrate the reviewed airport source and contract foundation first, then the
per-function contract correction and adapters required by the schedule and
staff-shell consumers. Add entitlement consumption and Moments delivery only
with their transactional and consent boundaries. Reconcile authored schemas and
registries before regenerating shared outputs once; do not merge generated
files as competing sources. Re-derive checks against the integrated main head,
including existing single-event attendance, Forms conversion and Inbox behavior.
The old wedding-plan reference to a SharedPreferences attendance queue is
superseded by the shared durable journal documented in
[App Architecture](../app_architecture.md#durable-local-commands).

### Manifest persistence and identity boundaries

Manifest planning, document materialization, and callable persistence are separate
modules. The existing operation-receipt collection carries import progress;
there is no additional import journal. Each transaction writes at most 50 source
rows, keeping all rows for a travel party together even when interleaved in the
input. A party with an invalid row is rejected as a whole; unrelated parties can
still import. Receipts store resolved source indices, including rejected rows,
so retries skip completed work and concurrent retries serialize through the
same receipt. Legacy prefix cursors remain readable. Preview simulates these
same groups; commit validates current authority and source records again.
Earlier committed parties remain applied if a later transaction fails. Any
legacy partially imported pilot parties must be resumed or reconciled before
operational use; the new batching cannot repair an already published subset.

An external reference identifies a person. A new reference may adopt exactly one
unreferenced name/flight/service-day match; distinct references never merge.
Name-only matches, duplicate labels, duplicate matching journeys, and rows that
target a dispatched journey require explicit review. A scheduled ground arrival
with a stable guest reference also reuses its existing inbound leg.

Households contain guests; travel parties contain specific journey `legIds`.
Both are bounded to 50 members. A party has at most one leg per guest and shares
one journey kind, pickup and destination. The leg's `partyId` is a server-owned
lookup index maintained atomically with canonical party membership. Editing a
party never adopts the same guest's other arrivals or departures. Detach a leg
explicitly before moving it to another party or changing its route. Dispatched
and arrived journeys cannot be regrouped. An existing empty party can release
its last member; creating an empty party is rejected.

Import rows naming a party create an explicit inbound leg even when itinerary
details remain unresolved. Suggestions and dispatch require complete, consistent
party membership. Legacy guest-only parties require explicit leg reconciliation
before use; do not infer journeys when rolling out this schema change. Moving a
guest to another household updates both household membership lists in the same
transaction. Manual guest edits, household replacement and imports share one
membership policy. Removal clears the guest lookup; adding an existing guest
removes it from its prior household. Capacity and current authority are checked
inside the transaction. Empty households retain their contact record and can
be reused; an empty membership never grants a guest response or delivery right.
Import never implies invitation, consent, or RSVP. Guest pagination uses the
document snapshot cursor so equal display names do not hide subsequent guests.

Program creation and resource setup validate current manager/coordinator
authority inside their write transaction, including ownership of retained
vendor program bindings. Program vendor pickers bind the requested organizer
to the authorized program and query only active vendors assigned to that
program before enforcing the 100-result cap. Organizer-wide inventory remains
manager-only; a cap overflow is explicit rather than silently truncated.


Successful staff-invite entry replaces the claim URL with the resolved program
workspace URL after access settles. The replacement preserves Back navigation;
reopening that canonical URL can use the existing bounded offline snapshot
without attempting to claim the invite again. Failed claims retain their URL
for retry, and a late result cannot navigate after the user leaves the route.

### Offline observation fences

An unreadable or quarantined operations journal offers a recovery export from
the error notice. The operator reviews that the file includes saved operations
across all programs for their account, then chooses a trusted save destination.
The original journal and legacy data remain intact, including malformed JSON.
Export does not clear the queue or restart replay; reconciliation must preserve
the original command IDs and observation times. Whole-database damage can still
prevent export and requires device/support recovery.

The shared command journal's version 2 request hash includes the immutable
observation/departure time. Reusing a command ID with a changed time is a
conflict, even when the rest of its payload matches. Loading verifies the
stored envelope and command timestamps agree. A version 1 journal upgrades
transactionally only after every old hash and envelope passes validation,
keeping stored times, IDs, dependencies, leases and terminal states intact.
Invalid or quarantined records stay preserved and cannot replay. This migration
protects subsequent integrity checks; it cannot retrospectively prove a time
that the older format did not hash.

Every new arrival observation carries a roster revision and its immutable device
observation time. A subsequent offline command can reference this actor's prior
observation receipt for the same leg. Readiness and dispatch resolve that receipt
inside their transaction and require its resulting revision to remain current.
Another actor's receipt, a different journey, a missing receipt, or an intervening
provider/planner/staff write causes review; the client never silently rebases.

Claims and readiness use the observed time rather than the later sync time.
Observations over seven days old or over five minutes in the future require
review; accepted positive clock skew is clamped to server time. Replays bind both
the time and predecessor reference. Legacy queued observations lacking a revision
remain preserved for review. The command adapter shares typed observation
references and manifest fences with the repository so wire fields cannot drift.

### Suggested manifest integrity

A party becomes available when its slowest member is ready, while its wait
allowance starts at the earliest member's curb-ready observation. Combining
parties keeps the earliest deadline. Disrupted journeys stay unassigned until
staff resolve their readiness, including when a manual curb estimate exists.
Hotel identifiers and free-text destinations use distinct internal identities;
operational views display the current hotel name. Every suggestion respects the
50-journey dispatch limit even when a vehicle has more seats. Journey counts
are derived from each unit's explicit guest IDs. Two units with overlapping
guests remain separate suggestions, preserving legitimate separate journeys
without producing a manifest that dispatch would reject. Missing, inactive or
foreign-owned pickup/hotel resources leave the whole unit unassigned with
`missingScope`, while its journeys remain visible in the roster for correction.
Planning hydrates pickup validity instead of unused private guest details.
Dispatch, arrival observations and trip completion recheck both organizer and
program bindings inside their transactions. Replays identify the original
owned trip and operation; missing or rebound trip/assignment records require
reconciliation. An inactive owned pickup still permits releasing a claim. Views needing more
than 200 groups fail explicitly instead of returning an incomplete plan.

### Recorded dispatch facts

New dispatches capture owned guest identities, per-journey passenger/luggage
counts and the canonical vehicle-class record in the same transaction as the
trip and reservations. The snapshot records when the dispatch was saved;
that time can differ from an offline command's physical departure time.
Arrival, void and exact replay preserve it. Subsequent guest edits, rebookings
or catalog changes cannot rewrite these recorded facts. No contact details
are copied into the manifest.

Hotel and ledger reads share one manifest projection. Snapshot-backed trips
use their recorded names and class label without loading live guest records.
Older trips explicitly identify their names as current records and retain
strict ownership/resource checks; they are never silently backfilled with
invented historical facts. A present inconsistent snapshot requires
reconciliation rather than falling back to current names. Production retention
and erasure policy still applies to these private operational records.

### Operational read scope

An online permission or missing-resource denial invalidates all cached program
projections before a fresh canonical work-access check. Successfully reverified
duties remain available; their rosters must reload before offline reuse. A
failed access check, account change or later denial leaves prior snapshots
closed. The originally denied action still fails; revalidation never retries
a mutation. Repository calls own this invalidation, so the snapshot fallback
reader cannot erase freshly verified work a second time. Standalone snapshot
readers retain their own fail-closed invalidation.

Manager staff inventory pages up to 50 grants in stable staff-identity order,
including expired and revoked records. Continuations use the staff UID and
survive renewal, revocation, or deletion of an earlier grant. Every page
rechecks management and filters organizer/program ownership before its cap.
Grant and revoke return the affected staff UID and committed revision through
the shared mutation acknowledgement; listing staff is a separate read, so a
failed refresh cannot misreport a committed change as a failed mutation.
The 100-active-grant quota remains separate from page size; direct grants and
invite claims both count only grants owned by the current program organizer.

The hotel desk independently pages incoming vehicles and expected guests,
with at most 50 rows per list. Each response declares both continuations.
Vehicle pages use departure order; receiving a vehicle does not invalidate
its cursor. Expected-guest pages use document-ID order, so dispatch or removal
of a prior row does not interrupt paging. Every request reapplies current
hotel authorization and organizer/program filters. Staff can move backward or
return either list to its first page; an unavailable vehicle cursor offers a
fresh hotel view. Trip actions refresh the currently displayed page, and row
state is keyed by trip identity rather than its position in a page.

The trip ledger uses pages of at most 50 trips in descending departure order,
with Firestore's descending document-ID tie-break. Each cursor is checked
against current organizer/program ownership and the actor's complete duty
scopes; overlapping scopes are deduplicated before selecting the page. The
response always declares its next cursor, and the Host offers older, newer and
latest pages. An unavailable cursor offers a return to the latest page rather
than silently losing the rest of the history. Each page retains the existing
live authority and expiry fences. A page is a current read, not a frozen export;
new dispatches appear when returning to the latest trips.

Organizer predicates precede arrival and trip query limits. Hotel expected
journeys are inbound-only. Passenger names require matching organizer, program,
pickup and destination bindings between trip and journey, plus owned guest
records. Related-document reads deduplicate references and bound concurrent
requests. Inactive owned hotels still expose their historical/in-flight work.

Arrivals and trip queries apply each duty's pickup and hotel restrictions before
reading passengers or applying limits. Restrictions from different duties are
unioned only after each duty's complete scope has been evaluated. Query splitting
accounts for Firestore disjunction limits, including the arrivals readiness
predicate. A roster exceeding 500 visible journeys fails explicitly and requires
a narrower station view; it never represents a partial roster as complete.

### Provider observation boundaries

Flight normalization and refresh cadence are shared by import, planner edits,
polling and webhook updates. An update must match flight number, destination,
known origin and the exact scheduled arrival instant. Schedule corrections need
planner review; estimates never change the identity anchor. Polling requests the
arrival date in the program timezone. Stations in another timezone can produce a
safe provider miss and need explicit timezone support before that pilot.

AeroDataBox runway and revised times may be estimates. Only a confirmed arrival
status makes them actual arrival times. Each applied provider observation stores
its update timestamp; replayed and older observations are ignored. Write-back
runs against the current leg in a transaction, preserves operational edits, and
advances the revision. Rebooking also clears curb readiness, claims and manual curb observations.
Unchanged itineraries preserve those observations. It clears old provider facts
while retaining the
subscription reference needed for cleanup. Manual refresh only polls status and binds the API key. The scheduled sweep
owns subscription reconciliation and binds both the API key and webhook secret.

Provider semantics: [AeroDataBox OpenAPI](https://doc.aerodatabox.com/docs/openapi-direct-v1.json).


Subscription reconciliation stores a pending flight number and a short lease on
the leg before contacting the provider. The free subscription listing recovers a
create whose response was lost; deletion failures retain the id and retry cursor.
Landing pushes keep that cursor until cleanup succeeds. Rebooking preserves the
old subscription subject so the worker can release it before adopting the new
flight. Secret rotation replaces old callback URLs. Provider requests have bounded
timeouts, and each sweep stops starting new work before its runtime budget ends.
The webhook handler only authenticates, normalizes and stores observations; it
does not perform subscription I/O during the provider's delivery timeout.
