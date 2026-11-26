---
doc_id: event_kinds_and_capabilities_spec
owner: recursive_audit_loop
status: proposed
---

# Event Kinds And Capabilities

## Goal

Every event has one declared kind. One table says what each kind can do and
what records it must have. Code asks that table, never the raw fields. A new
capability cannot ship until someone has decided what it does for every kind,
and a check finds any live event that is missing a record its kind requires.

Today we find these gaps one at a time, usually from a bug report, and patch
each one by hand. This plan replaces that with a system that makes the gap
impossible to leave unnoticed.

Reminders are the first capability built on it. They become configurable:
smart defaults per kind, organiser-level defaults, and per-event edits by the
host.

**Scope.** Event documents (`events`, `externalEvents`), their contracts, the
Functions that read or write them, the Flutter apps, the website and Admin.

**Exclusions.** Private programmes (`organizerPrograms`) keep their own scope
and moments. Organiser-level supply limits stay in
`organizer_supply_capabilities` (see `data_contracts.md`, Organizer Supply
Capabilities); this plan reads them as an input.

**Owners after delivery.** The kind and capability contract moves into
`data_contracts.md`. The capability table lives in `contracts/events/`.
`design/public_surface_behavior.json` keeps owning viewer and action
dispositions on public surfaces; its event dimensions become a projection of
this table (slice 6). When a slice ships, its section here shrinks to a pointer.

## What exists today

Measured at `origin/main` `00d67ceea` (26 Nov 2026).

### The kinds are implied, not declared

There is no event kind field. Code infers the kind from combinations of
optional fields: `eventOrigin` (mode, booking authority, roster authority,
provider, external URL), `externalBooking` (provider, URL),
`publicRegistrationEnabled`, `publicRegistrationMode`, `publicationState`,
`listing` and `status`. Imports live in a separate collection with their own
vocabulary.

| Kind in practice | How code recognises it |
|---|---|
| Imported listing | A row in `externalEvents`, never in `events`. `booking.mode = external_outbound_only`, every `catch*Enabled` is `false`. |
| Catch-native, legacy | `eventOrigin.mode = catchNative`, written only by the legacy `createEvent` (no live caller in the Host app) and demo worlds. |
| Catch-sold, current | Created by progressive setup. **No `eventOrigin`.** Registration closed at publish until a manager opens free or paid. |
| Sold elsewhere, current | No `eventOrigin`, `externalBooking {provider, url}` set. Publish injects placeholder terms (capacity 1000, price 0). |
| Companion of an external event, legacy | `eventOrigin.mode = externalCompanion`, external URL in `eventOrigin.externalEventUrl`, optional provider roster sync. No `externalBooking`. |

Lifecycle (draft, published, cancelled) and visibility (listed, link-only,
private) apply across these, but three publication vocabularies exist:
`events.publicationState`, `externalEvents.publicationStatus` and the
organiser page's `publishStatus`.

### About 75 files re-derive capability from those fields

A full inventory (Functions, Flutter, website, Admin) found these
capabilities decided in more than one place, with different answers:

1. **Can a guest book on Catch?** Four rules. Native callables and the app
   require `eventOrigin.bookingAuthority == catch`
   (`functions/src/events/eventOrigin.ts`,
   `lib/contexts/bookings/domain/event_viewer_composition.dart`). Public
   registration ignores `eventOrigin` and checks `externalBooking` and the
   registration mode. The website projection ignores both in places;
   `website/src/features/events/eventDetailModel.ts` ignores `externalBooking`
   while `eventPageModel.ts` honours it.
2. **Where do guests buy tickets elsewhere?** Two fields for one concept.
   Event pages and registration read `externalBooking.url`. Invite links,
   campaigns, the share card and the Host campaign editor read
   `eventOrigin.externalEventUrl`. The repeat-event prefill turns a companion
   event into a sold-elsewhere event.
3. **Is a Catch page a valid link destination?** Invite links always allow
   it; campaigns require `publicRegistrationEnabled === true`.
4. **Does the event get default reminders?** `reminderEligible` in
   `functions/src/moments/momentDefaults.ts` is
   `published && (eventOrigin present || publicRegistrationEnabled !== false)`.
   Companion events, which sell tickets elsewhere, always qualify.
   Catch-sold events qualify only while registration is open. Sold-elsewhere
   events never do.
5. **Is the price hidden?** The same rule is written four or five times in
   TypeScript and Dart, each equating "booking opens" with public
   registration.
6. **Which Host controls are offered?** The registration toggle in
   `host_event_manage_section.dart` replicates the server's terms but not its
   `externalBooking` check, so the server rejects what the screen offered.

The docs also disagree with the code: `data_contracts.md` says a missing
`eventOrigin` "preserves legacy behavior", while the schema and the code deny
Catch booking when it is missing.

### Reminders

Reminders already run on the Moments engine (`functions/src/moments/`): a
moment has an anchor and offset, an audience and a channel, and hosts edit
event moments in `lib/hosts/events/presentation/moments/`. The gaps:

- **Defaults are hard-coded.** Every eligible event gets a push 15 minutes
  before start and a feedback request 2 hours after the end
  (`momentDefaults.ts`, `momentTemplates.ts`). The only organiser-level
  setting is `autoMessages {thankYou, arrival}` in
  `organizerEventSetupDefaults`. Nothing varies by kind.
- **Only booked app users can be reached.** `eventParticipants` resolves
  `eventBookings` rows that have a `uid`. Website registrants without an app
  account, imported or provider-synced rosters and guests who bought
  elsewhere are unreachable. Event-scope moments are push-only.
- **Nobody can ask to be reminded.** There is no event-level "remind me".
  `savedEvents` exists but nothing notifies savers, and moments cannot target
  organiser followers.

## Design

### 1. One declared kind per event

Add a required, closed `kind` to every event:

| Kind | Meaning | Where it lives |
|---|---|---|
| `catchSold` | Guests book on Catch: free, paid or by application. | `events` |
| `soldElsewhere` | A host runs the event with Catch tools; tickets are sold on another platform. Merges today's sold-elsewhere and companion events. | `events` |
| `importedListing` | Supply Intake found it; no host operates it on Catch. Read-only, outbound link only. | `externalEvents` |

Lifecycle, visibility and registration mode stay separate attributes, each
with one vocabulary shared by both collections. Registration mode
(`closed | free | paid | apply`) applies only to `catchSold`;
`publicRegistrationEnabled` is deleted because it is derivable from the mode.

Ticketing facts collapse into one `ticketing` object, replacing both
`externalBooking` and the guest-facing parts of `eventOrigin`:

```json
{ "kind": "external", "provider": "generic", "url": "https://tickets.example/e/123",
  "rosterSource": "hostImport" }
```

`eventOrigin` keeps only immutable provenance (who connected what, when).

The kind is written at creation and changes only through one explicit
command ("change how tickets are sold"). That command runs the provisioner
(section 4), so moving an event between kinds adds and removes the records
each kind requires. The data is pre-launch and synthetic, so existing events
are rewritten in one migration; nothing keeps the old fields.

In TypeScript and Dart the kind is a discriminated union (a sealed class in
Dart). Every `switch` on it must be exhaustive, so adding a kind breaks the
build everywhere a decision is needed.

### 2. One capability table

`contracts/events/event_capabilities.json` lists each capability against
each kind. Each cell is `required`, `optional` (host can turn it on or off,
with a default) or `unavailable`, with a one-line rationale for
`unavailable`. A cell may name an attribute condition (for example "when
registration mode is paid").

Starting rows, as a proposal to review:

| Capability | `catchSold` | `soldElsewhere` | `importedListing` |
|---|---|---|---|
| Event page on Catch and the website | required | required | required (read-only) |
| Book on Catch (native and web) | required, by registration mode | unavailable: tickets are sold elsewhere | unavailable: nobody operates it here |
| Payments record per booking | required when paid | unavailable | unavailable |
| Waitlist | optional | unavailable | unavailable |
| Outbound ticket link | unavailable | required | required |
| Roster | required (Catch bookings) | optional (host import or provider sync) | unavailable |
| Check-in and live console | optional | optional | unavailable |
| Guest list shown to guests | optional | optional | unavailable |
| Event chat | optional | optional | unavailable |
| Reminders | required, defaults on | optional, defaults on | optional, defaults on (platform-authored until claimed) |
| Feedback request after the event | required | optional | unavailable |
| Reviews | required after the event | required after the event | required after the event (unverified) |
| Invite and campaign links to the Catch page | required | required | unavailable |
| Price shown before booking opens | optional | unavailable | unavailable |

A generator turns the table into typed helpers: `eventCapabilities(event)`
in TypeScript (shared by Functions, website and Admin) and Dart. Call sites
ask `caps.booking`, `caps.ticketLink`, `caps.reminders`; they never read the
raw fields.

### 3. Checks, so gaps cannot come back

Prose is not enforcement, so each rule above has a check:

1. **No blank cells.** A check fails if any capability lacks a decision for
   any kind, or an `unavailable` cell lacks a rationale. A new capability
   cannot merge until it is decided for imported listings too.
2. **Exhaustive kinds.** TypeScript `never` checks and Dart sealed classes
   make every `switch` handle every kind.
3. **One gateway for raw fields.** A ratchet check fails on any new read of
   `ticketing`, `eventOrigin`, registration mode or the legacy fields outside
   the capability module and its writers. It starts with today's sites as a
   known-violation list that only shrinks.
4. **Required records exist.** One provisioner, running on the `events`
   dispatcher trigger (STR-5, #2451) and the `externalEvents` publish path,
   creates what each `required` cell needs, such as default reminder moments
   or the payment configuration. A nightly drift check lists live events
   missing a required record and opens or updates an issue.
5. **Proof harness.** Like the public surface matrix, a test enumerates kinds
   from the table and runs each capability's decision helper against a
   fixture of every kind, so a cell and its code cannot disagree.
6. **Public surface matrix alignment.** `design/public_surface_behavior.json`
   replaces its two-value `event.supply` dimension with the kinds from this
   table, and its checker fails if they diverge.

### 4. Reminders as the first capability

Reminders keep the Moments engine. Three changes:

**Audiences that match each kind.**

- `catchSold`: booked guests, including website registrants without an app
  account (resolve `eventAttendees`, not only `eventBookings` with a `uid`).
- `soldElsewhere`: the host's imported or synced roster, plus people who
  asked to be reminded.
- `importedListing`: people who asked to be reminded.

**"Remind me" without a new collection.** A guest taps "Remind me" on any
event page. In the app this writes the existing `savedEvents` edge. On the
website the guest verifies a phone number the same way follow-by-phone does
(`followOrganizerByPhone.ts` creates a phone-code account), then writes the
same `savedEvents` edge plus a `contactPermissions` grant for WhatsApp event
reminders with its receipt. A new `eventSavers` moment audience reads those
edges. This reuses existing collections, as STR-11 requires.

**Layered defaults.** The reminders that apply to an event come from three
layers, each overriding the one before:

1. Platform defaults per kind, in the capability table.
2. Organiser defaults: `organizerEventSetupDefaults.autoMessages` grows into
   a list of reminder rules the host edits once in event defaults.
3. Per-event moments, edited on the existing moments screen. Provisioning
   stays create-only, so a host's edit or pause is never overwritten.

Proposed platform defaults, for the owner to confirm:

| Kind | Before | After |
|---|---|---|
| `catchSold` | 1 day before (WhatsApp where consented, else push), 2 hours before (push) | feedback 2 hours after the end |
| `soldElsewhere` | 1 day before | none by default |
| `importedListing` | 1 day before, to people who asked | none |

Event-scope moments gain the WhatsApp template channel for these audiences,
subject to the consent rules in the contact consent programme (#2460, #2494).

## Bugs found while measuring

These are real today and should not wait for the full programme:

1. **Events from the current Host create flow cannot be booked in the Catch
   app.** Progressive setup never writes `eventOrigin`, and both the app
   (`event_viewer_composition.dart`) and the native booking callables
   (`requireCatchBookingAuthority`) deny booking when it is missing. A
   signed-in guest sees "Booking unavailable". Public registration on the
   website still works. Confirmed in code, not yet reproduced on a device.
2. Companion events render as Catch-bookable on the website, and could take
   website registrations if a manager turned registration on, because public
   registration does not read `eventOrigin`.
3. Companion events get default reminders although they sell tickets
   elsewhere; sold-elsewhere events never do; website registrants are never
   reminded.
4. The repeat-event prefill converts a companion event into a sold-elsewhere
   event.
5. `data_contracts.md` and the `eventOrigin` schema disagree on what a
   missing `eventOrigin` means.

Bug 1 gets its own urgent fix. Bugs 2 to 5 disappear with slices 1 and 3.

## Delivery slices

Each slice becomes a GitHub issue under one epic. Slices 2 and 5 can run in
parallel once slice 1 lands; slice 3 batches can run in parallel by surface.

0. **Urgent: make Host-created events bookable in the app** (bug 1), as a
   stopgap until slice 1.
1. **Kind and ticketing contract.** Add `kind` and `ticketing` to both event
   schemas, unify lifecycle and visibility vocabularies, write them on every
   create path, migrate existing documents, delete `externalBooking`,
   `publicRegistrationEnabled` and the guest-facing `eventOrigin` fields.
2. **Capability table and generated helpers.** The JSON table, its schema,
   generators for TypeScript and Dart, the no-blank-cells check and the
   exhaustive-kind types.
3. **Move call sites onto the helpers,** in batches by surface: booking and
   registration; links, campaigns and sharing; visibility and price; Host
   create and manage screens; website and Admin. Add the raw-field ratchet
   with the remaining sites as its known-violation list.
4. **Provisioner and drift check** on the dispatcher trigger and the
   import publish path.
5. **Reminders.** Kind-aware audiences, website registrants, "Remind me",
   WhatsApp for event scope, layered defaults and the organiser defaults
   editor in Host.
6. **Public surface matrix alignment** and the proof harness.
7. **Close-out.** Move the contract into `data_contracts.md`, delete the
   known-violation list once empty, shrink this plan to pointers.

## Decisions for the owner

1. The three kinds, and merging today's sold-elsewhere and companion events
   into `soldElsewhere`.
2. The platform reminder defaults per kind.
3. Whether imported listings send platform-authored reminders before an
   organiser claims the page.
4. Whether WhatsApp reminders (a per-message cost) are on by default for
   `catchSold`, or push only until the organiser opts in.

Engineering choices inside each slice are delegated.
