---
doc_id: event_run_of_show_and_movement_runtime_spec
owner: events
status: active
---

# Event Run-Of-Show And Movement Runtime Specification

## Decision

Catch events need one canonical, composable run-of-show model. A persisted
event name and itinerary describe what attendees call the event and what is
scheduled to happen. The existing `routePlan` describes how a moving event
travels. A separate short-lived live-position projection describes where
authorized event operators currently are.

These are platform event primitives. Event Success and dress rehearsal consume
them, but do not own them. Standard attendance, route tracking, safety, and
late-arrival guidance must not become Event Success modules.

The implementation extends the current route-plan seam; it does not create a
parallel run/walk/bar-crawl architecture. Stationary formats such as
pickleball, spin, dinner, and quizzes can use the same itinerary without a
geographic route. Moving formats can add route geometry, itinerary locations,
pace groups, and live operator positions.

## Goal

Make every production event-detail field traceable to persisted or explicitly
derived source data, then provide a truthful end-to-end path for:

1. host-authored event names;
2. host-authored itinerary entries with optional exact locations;
3. route geometry and pace-group declarations for moving events;
4. foreground Host/staff location sharing during an event;
5. late-arrival guidance in the no-download web companion; and
6. deterministic rehearsal of the same run-of-show and movement states.

## Verified Current State At `5aed75053`

### Surface-to-source parity matrix

| Surface | Rendered source | Finding | Required action |
| --- | --- | --- | --- |
| Native Event Detail title | `Event.title` | `Event.title` derives weekday, day period, and activity label. There is no persisted event name in `events`, create/update callables, Host draft, or Host editor. | Add a bounded persisted `name`, require it for new creates, permit edits, and retain the current derivation only as a legacy read fallback. |
| Native Event Detail itinerary | `_itineraryFor(Event, l10n)` | The renderer fabricates gather, activity, and wrap-up entries from start/end time. No itinerary is stored. | Add a canonical itinerary contract and render only persisted entries. Do not fabricate a detailed run-of-show. |
| Native Event Detail map | `meetingLocation` and legacy starting-point fields | The map truthfully shows the meeting point, but it cannot show a course, stops, pace groups, or live operator position. | Reuse meeting-location shape for itinerary stops, extend `routePlan` with course geometry and pace groups, and add a separate live projection. |
| Host create route editor | `eventFormat.activityDetails.routePlan` | The reusable v1 route-plan seam already persists movement mode, shape, group strategy, stop cadence, stop kinds, and role kinds. It has no concrete path, stop schedule, or pace-group records. | Extend this seam instead of introducing another movement primitive. |
| Web Event Detail | generated/public event listing fields | Names in website fixtures/listings are present, but canonical Catch events cannot currently provide an authored name. | Flow the canonical event name through the existing public listing/export path; preserve external-event titles as supplied. |
| Web companion | `publicRuntimeEventProjection` | Runtime title is derived from custom activity label or activity kind. It returns the meeting location only and no itinerary, route, or current positions. | Project the effective event name plus safe run-of-show, route, and live guidance. |
| Dress rehearsal | `sourceSetup` | Source rehearsal derives an activity-based rehearsal title and snapshots only title, location, duration, modules, and prompts. | Snapshot the effective event name, itinerary, route, and deterministic synthetic positions. Keep rehearsal isolated from production writes. |
| Organizer Detail | `organizers`, event query, review query | About, tags, photos, professional hosts, metrics, events, reviews, and contact actions are persisted fields or separate canonical records. No dummy organizer field was found. | No schema expansion. Add parity tests only if implementation changes a shared event projection. |
| Professional Host profile | `hostProfiles/{uid}` | Display name, avatar, role title, bio, verification, status, and linked organizer ids align with the professional profile contract. Dating fields are intentionally absent. | No schema expansion. Preserve the professional/public-profile boundary. |
| Public/dating profile | `publicProfiles/{uid}` projected from `users/{uid}` | Visible identity, photos, prompts, running preferences, details, and lifestyle facts are all persisted or derived labels over persisted enums. Exact user coordinates are intentionally stripped. | No schema expansion. Live event sharing must never reuse account latitude/longitude or `prefsShowOnMap`. |

### Existing seams to preserve

- `events/{eventId}` remains the canonical event aggregate.
- `EventFormatSnapshot.activityDetails.routePlan` remains the route owner.
- `EventMeetingLocation` remains the reusable exact-location shape.
- `eventParticipations` and `eventRuntimeParticipants` remain attendee/runtime
  identity edges; a live position is not attendance or a booking.
- Host create/update remains callable-owned. Clients do not write event or
  live-position documents directly.
- Dress rehearsal remains a bounded synthetic engine and never writes
  production event runtime state.
- Event Success may use itinerary phase/route context for facilitation copy,
  but standard late-arrival navigation is owned by the event runtime.

## Canonical Data Model

### 1. Authored event name

`events.name` is an optional bounded string in the persisted schema so legacy
documents remain readable. `createEvent.name` is required for all new events.
`updateEvent.fields.name` permits Host edits.

The Dart domain exposes:

```text
authoredName -> trimmed persisted value or null
title        -> authoredName or the legacy weekday/period/activity derivation
```

All public, runtime, share, calendar, notification, rehearsal, and Host
surfaces use the effective `title`. No writer stores the derived fallback as if
it had been authored.

### 2. Event itinerary

`events.itinerary` is an ordered array of at most 40 public entries. It is
optional for legacy events and formats that do not need a run of show.

Each entry contains:

| Field | Contract |
| --- | --- |
| `id` | Stable event-local id, 1-80 safe characters. |
| `kind` | `gather`, `activity`, `stop`, `break`, `transition`, or `finish`. |
| `offsetMinutes` | Integer minutes from event start, `0..1440`. Keeps entries stable when an event is rescheduled. |
| `durationMinutes` | Optional positive duration, at most 1440 minutes. |
| `title` | Required, trimmed, `1..120` characters. |
| `description` | Optional, trimmed, at most 500 characters. |
| `location` | Optional `EventMeetingLocation`. Exact coordinates are required when the object is present. |
| `routeDistanceMeters` | Optional non-negative distance along the declared path. |

Backend validation additionally requires unique ids, nondecreasing offsets,
entries within the event duration unless explicitly equal to the finish, and
`routeDistanceMeters` only when a route path exists.

The itinerary stored on a public event document is public event content. A
secret or participants-only stop must not be stored there. The current product
does not add a second private itinerary in this tranche.

### 3. Route plan v2

The existing route-plan contract becomes backwards-readable v2. Existing v1
documents continue to resolve. V2 retains all current operational enums and
adds optional concrete data:

- `path`: 2-500 latitude/longitude points in travel order;
- `paceGroups`: 0-12 stable groups with `id`, `label`, optional
  `targetPaceSecondsPerKm`, and sort order; and
- `liveTrackingPolicy`: `disabled`, `hostOnly`, or `authorizedOperators`, plus
  stale and expiry policy bounds.

Itinerary locations are the named plotted points. Route `path` is the course
line. Pace groups describe the public group choices. Human operator assignment
and current position do not live inside the event document.

Activity composition is:

| Activity family | Itinerary | Route path | Pace groups | Live positions |
| --- | --- | --- | --- | --- |
| Bar crawl / hosted walk | Venue stops and transitions | Optional/recommended | Usually none | Host, route lead, or stop host |
| Social run / running | Gather, start, optional regroup/water, finish | Optional/recommended | Optional | Route lead, sweep, pacers |
| Cycling | Gather, hazards/regroups, finish | Optional/recommended | Optional | Route lead, sweep, pacers/marshals |
| Pickleball / racquet | Check-in, warm-up, rounds, break, finish | None | None | Disabled; Event Success spatial layout may represent courts |
| Spin / yoga / strength | Check-in, class blocks, cooldown | None | None | Disabled |
| Dinner / quiz / mixer | Arrival, courses/rounds/rotations, close | None unless venue crawl | None | Disabled unless the event moves between venues |

### 4. Live operator position

Current positions use a new server-only
`eventLivePositions/{eventId_operatorUid}` collection. The source document is
short lived and contains event/club/organizer/operator identity, the authorized
operator role, coordinates, optional accuracy and heading, the server-recorded
sample time, creation/update times, and TTL expiry.

Direct Firestore reads and writes are denied. App-Check-protected callables own
publishing and stopping. Authorization requires either organizer-manager
authority or an active event staff grant with the new `publishLiveLocation`
permission. The event must be active, within the bounded live window, and have
a route plan whose policy enables that operator class.

The participant runtime projection contains no UID, phone number, or personal
profile. It exposes only role, coordinates, optional accuracy and heading, and
freshness timestamps. Stale or expired rows are excluded. Unclaimed public
links receive no live positions. Stopping sharing deletes the row. TTL is
defense in depth.

The first native implementation is foreground-only while the Host live screen
is open. Background execution, turn-by-turn navigation, and a promise of
continuous tracking while iOS or Android suspends the app are explicitly out
of scope.

### 5. Runtime and late-arrival guidance

The event runtime bootstrap projects:

- effective event title;
- itinerary with absolute display times calculated from start plus offset;
- route path and pace-group labels;
- fresh operator positions; and
- authoritative server time so the client can resolve the next published stop.

The web companion draws a privacy-preserving course schematic and presents
itinerary locations through the existing shared runtime visual language. When
a fresh tracker exists it highlights that Host/operator position. When none
exists it shows the next published scheduled stop and truthfully states that
live guidance is unavailable; it never implies that the Host is at an
itinerary stop merely because the clock passed its offset. An authenticated,
approved participant can see this bounded arrival guidance before venue
check-in, while assignments and other checked-in Event Success tools remain
closed.

### 6. Dress rehearsal

A rehearsal snapshots the effective name, itinerary, route, pace groups, and
live policy once from the source event. The rehearsal projection derives
deterministic synthetic tracker positions from virtual-clock progress along the
saved path.
It never calls the production publish/stop functions and never writes
`eventLivePositions`.

The Host rehearsal setup and anonymous guest route both receive the same frozen
movement projection; the guest renders itinerary, route, synthetic position,
and late-arrival copy through shared runtime primitives. Existing actor,
action, revision, guest-token, App Check, and 24-hour expiry boundaries remain
unchanged.

## Migration And Compatibility

1. Firestore `name`, `itinerary`, and route v2 additions are optional so old
   documents remain schema-valid.
2. New create requests require `name`. Existing clients are not production
   released; no compatibility alias is added to the callable.
3. Reads use the legacy derived title only when `name` is absent/blank.
4. Existing route-plan v1 documents decode unchanged and expose empty path,
   pace groups, and disabled live policy.
5. No bulk production rewrite is part of this PR. An optional dry-run/backfill
   tool may propose derived names, but must not represent derived copy as an
   organizer-authored name and must require separate production authorization.
6. Generated TypeScript, Admin Timestamp types, Dart constraints, website
   types, validators, fixtures, and schema registries update from the authored
   JSON schemas; generated files are never hand edited.

## Security And Privacy Invariants

- Account/profile latitude and longitude are never a live event source.
- Enabling route tracking in event setup is not consent to start sharing a
  person's location; the operator starts and stops a foreground session.
- The public projection never exposes operator UID or staff profile data.
- Only claimed runtime participants, active Catch participants, or authorized
  Hosts receive live guidance. A public Event Detail can show static public
  itinerary and route data but not live positions.
- Accuracy, sample age, event time window, route policy, and manager/staff grant
  are validated server-side.
- Live writes are rate limited and bounded. Stale/expired data fails closed.
- Rehearsal remains synthetic and isolated from production collections.

## Implementation Checklist

### A. Contract and domain foundation

- [x] Add event `name` and itinerary schemas plus valid/invalid fixtures.
- [x] Extend route-plan contract for bounded path, pace groups, and live policy.
- [x] Add `eventLivePositions` and publish/stop callable contracts.
- [x] Refresh all generated cross-stack contract outputs.
- [x] Add Dart event/itinerary/route models with legacy fallbacks.
- [x] Add backend normalization and invariant tests for create/update.
- [x] Commit the foundation as one bounded slice.

### B. Host authoring

- [x] Add name and itinerary to Host draft persistence/restore/signatures.
- [x] Add schema-bound name and itinerary editing to create flow.
- [x] Extend the route editor with path, pace groups, and live policy without
  creating an activity-specific form fork.
- [x] Add the same supported fields to Host event edit/manage.
- [x] Add focused controller/widget tests and draft round-trip tests.
- [x] Commit Host authoring separately from the contract foundation.

### C. Native attendee and Host live runtime

- [x] Replace fabricated Event Detail itinerary with persisted entries.
- [x] Extend the static event map with route and itinerary pins.
- [x] Add foreground publish/stop repository and controller seams.
- [x] Add explicit sharing state, stale/error state, and stop-on-dispose behavior
  to Host Live.
- [x] Add focused domain/controller/widget tests.

### D. Backend and web companion

- [x] Implement authorization, validation, rate limits, TTL fields, and cleanup
  for publish/stop.
- [x] Add safe itinerary/route/live guidance to runtime bootstrap.
- [x] Render current/next stop, route, pace groups, and fresh tracker state in
  the web companion using shared primitives.
- [x] Add Functions and React behavior tests, typecheck, and build proof.

### E. Rehearsal and Event Success integration

- [x] Snapshot name, itinerary, route, groups, and live policy into rehearsal.
- [x] Generate deterministic virtual tracker progress without production
  writes.
- [x] Render the shared guidance projection on Host and guest rehearsal paths.
- [x] Make Event Success consume current/next itinerary context only through a
  platform adapter; do not add a tracking or attendance module.
- [x] Add isolation, revision, bootstrap, and UI behavior tests.
- [x] Commit native, backend/web, and rehearsal as one compile-coherent runtime
  slice after the focused checks pass.

### F. Parity closeout and delivery

- [x] Re-run the organizer, professional Host, and public-profile parity tests;
  make no schema edits where the audit remains green.
- [x] Run schema generation/freshness, `./tool/check_data_contract.sh`, focused
  Functions tests, focused Flutter tests/analyzer, React tests/typecheck/build,
  impact-derived scanners, `git diff --check`, and final scope review.
- [x] Derive the exact PR gate list from the final Git diff.
- [ ] Push every atomic commit, create the PR, and monitor exact-head CI to a
  terminal result.

## Completion Criteria

The implementation is complete only when all of the following are true:

1. A newly created event stores an organizer-authored name and every native,
   Host, web, share, calendar, notification, runtime, and rehearsal consumer
   resolves the same effective title.
2. Event Detail never displays a fabricated itinerary. It either renders the
   stored run of show or omits the section with an honest empty state in Host
   authoring.
3. Itinerary entries round-trip through draft, create, edit, Firestore, Dart,
   Functions, runtime bootstrap, and rehearsal, including optional locations.
4. Existing v1 route plans and nameless legacy events still read correctly.
5. A route event can store and render a bounded path and pace groups; a
   stationary event does not need fake route data.
6. An authorized foreground Host/staff session can publish and stop a location;
   unauthorized, stale, out-of-window, policy-disabled, and malformed requests
   fail closed in backend tests.
7. A claimed late arrival can see fresh, privacy-safe guidance in the web
   companion, with truthful scheduled fallback when no live tracker is fresh.
8. Dress rehearsal demonstrates the same itinerary/route/current-position
   states with deterministic synthetic data and zero production runtime writes.
9. Organizer Detail, professional Host profile, and public profile remain
   schema-aligned, with no speculative fields added merely to match visual
   mockups.
10. Generated outputs are current, focused checks pass, the Git diff contains
    no unrelated work or removed evidence layer, atomic commits are pushed, and
    an exact-head PR exists with terminal CI evidence.

## Explicit Non-Goals

- production deployment or production-data mutation;
- OS-guaranteed background location tracking;
- turn-by-turn navigation or routing-provider optimization;
- attendee location sharing;
- storing private/secret itinerary stops on the public event document;
- deriving live position from account profile coordinates;
- making route tracking, attendance, or safety an Event Success module;
- replacing Event Success room layouts with geographic maps; or
- adding organizer/profile fields when the current persisted projection already
  supports the visible surface.
