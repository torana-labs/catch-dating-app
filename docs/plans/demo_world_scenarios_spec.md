---
doc_id: demo_world_scenarios_spec
version: 0.1.0
updated: 2026-10-24
owner: marketing_website
status: proposed
---

# Demo World Scenarios

One fictional, internally consistent "world" per scenario feeds every place
that shows synthetic product data: app screenshots, website Storybook stories,
the numbers marketing copy quotes and, later, seeded demo environments. A
screen and the sentence describing it then read the same record, so they can't
disagree.

Part of the website imagery plan (Claude Doc "Website Imagery Inventory",
Production plan tab). The capture pipeline mechanics (slot count, caching,
selective rendering) are CAT-239, owned separately.

## Problem (measured 2026-10-24)

- Synthetic data lives in five unrelated places:
  - `tool/demo/demo_seed/scenarios/*.json` (seed worlds and capture stories);
  - Dart capture builders in `test/ui_captures/fixtures/`;
  - TypeScript Storybook fixtures in `website/src/stories/fixtures/`;
  - Widgetbook fixtures in `lib/design_fixtures/`;
  - schema fixtures in `contracts/fixtures/`.

  Nothing is shared, so the same fictional event can show different details on
  an app screenshot and on a website page.
- The one marketing story, `host-marketing-india.json`, repeats its event four
  times, once per moment (setup, Today, live, recap), with hand-typed counts
  (`bookedCount: 24`, `checkedInCount: 18`). There is no guest list behind them.
- Its host and roster come from the New York sales personas, although the story
  is set in Mumbai.
- Copy that quotes on-screen numbers ("18 checked in · 24 expected") types them
  again in website content.

## Decisions

1. **A world is the unit.** Each scenario file describes one small world:
   people, an organiser, venues and events, with guest records. It never stores
   counts or per-moment copies; readers derive them.
2. **Moments are clocks, not copies.** A world names its moments (`planning`,
   `today`, `live`, `followUp`, …) as civil times. Booking, check-in and other
   records carry timestamps. A screen asks for (world, event, moment), and the
   reader returns the state at that time.
3. **Readers build production types.** The Dart reader keeps building real
   domain objects (`Event`, `Club`, `EventDraft`), as today. The TypeScript reader
   builds the website's own types (`HostListing`, event records). A model change
   breaks the reader at compile time instead of drifting silently.
4. **One validator, one schema.** A JSON Schema in `tool/demo/demo_seed/schema/`
   defines the world format. `tool/demo/lib/demo_world.mjs` validates it with a
   small built-in checker (no npm dependency: Demo Ops CI installs none) that
   rejects any schema keyword it doesn't implement, then checks invariants
   (below). The existing scenario-catalog test runs it over every
   scenario in CI.
5. **Facts are exported, not retyped.** `demoWorldFacts(world, eventId, moment)`
   returns the values copy may quote (guest counts, names, times). Website
   content imports facts instead of typing numbers.
6. **People come from cohorts.** Guests and hosts reference personas by id. India
   stories use India personas. Names are fictional, and phone numbers use the
   reserved demo range `+91 90000 0xxxx`.

## World format (schemaVersion 2)

```json
{
  "schemaVersion": 2,
  "id": "host-marketing-india",
  "label": "India Host Marketing",
  "description": "Fictional Mumbai trivia night used by Host marketing captures.",
  "uses": ["marketing-capture", "web-story"],
  "locale": "en-IN",
  "timeZone": "Asia/Kolkata",
  "currency": "INR",
  "moments": {
    "planning": "2026-10-16T12:00:00",
    "today": "2026-10-17T16:00:00",
    "live": "2026-10-17T19:00:00",
    "followUp": "2026-10-18T10:00:00"
  },
  "host": {"id": "host", "personaId": "in_core_…", "displayName": "…", "phoneNumber": "+919000000001", "email": "host@example.test"},
  "organizer": {"id": "club-host-marketing-india", "name": "Evening Club", "city": "mumbai", "area": "Bandra West", "description": "…", "tags": ["trivia"]},
  "venues": [{"id": "harbour-room", "name": "Harbour Room", "area": "Bandra West", "lat": 19.0607, "lng": 72.8362, "directions": "Meet the host at the entrance."}],
  "people": [{"id": "g01", "personaId": "in_core_…"}],
  "events": [{
    "id": "event-host-trivia-store-demo",
    "name": "Saturday Trivia Social",
    "venueId": "harbour-room",
    "civilDate": "2026-10-17", "startTime": "18:30", "endTime": "20:30",
    "activityKind": "openActivity",
    "customActivityLabel": "Trivia social",
    "format": {"interactionModel": "hostLedProgram", "admissionPreset": "openCapacity", "playbookId": "host_led_social", "selectedModuleIds": ["host_script", "safety_controls"], "hostGoal": "…"},
    "capacity": 30,
    "priceInPaise": 0,
    "attendance": [{"personId": "g01", "bookedAt": "2026-10-16T19:05:00", "checkedInAt": "2026-10-17T18:41:00"}]
  }]
}
```

Derived at (event, moment):

| Value | Rule |
| --- | --- |
| `booked` | attendance with `bookedAt ≤ moment` and not cancelled by then |
| `checkedIn` | attendance with `checkedInAt ≤ moment` |
| `phase` | before start = upcoming, within start–end = live, after end = ended |

Waitlist, payment, application and message records join the format when a
scenario first needs them, with the same rule: timestamps in, counts derived.

## Invariants the validator enforces

- Every `personId`, `personaId` and `venueId` resolves.
- `checkedInAt` is after `bookedAt` and within the event window (doors may open
  30 minutes early).
- `booked ≤ capacity` at every moment.
- Moments are in increasing order, and each one falls on a day the story covers.
- `activityKind` and `format` values are members of the production enums,
  read from the generated schema contracts, not retyped.
- No real-looking contact details: phone numbers in the reserved range, email
  domains `example.test`.

## Projections

| Consumer | Reader | Notes |
| --- | --- | --- |
| Flutter captures | Dart `DemoWorld` reader in `test/ui_captures/fixtures/` | Replaces per-role events with (event, moment). Existing builders keep producing production types. |
| Website stories | `website/src/stories/fixtures/demoWorld.ts` reading the same JSON | Storybook guest pages (`/join/`, forms, booking) show the same people and event as the app captures. |
| Website copy | `demoWorldFacts` | The "facts" field in the media manifest names which values a caption or sentence quotes. |
| Demo environments | `tool/demo` seeding | Later. Seed worlds keep their generator; a world can be seeded as-is. |

## Migration

1. Add the schema, validator, derivation and tests. Convert
   `host-marketing-india` to schemaVersion 2 with a 24-guest attendance list that
   reproduces today's counts exactly (0/0 at planning, 24/0 today, 24/18 live and
   at follow-up). The Dart reader reads v2. **Acceptance:** the 12 canonical
   captures render pixel-identical to the same commit before the change.
2. Add India personas (names first, photos later) and swap the story's host and
   roster to them. Captures change on purpose here and get reviewed.
3. Add the TypeScript reader and point the guest-page Storybook stories at the
   world.
4. Write one world per launch format, each its own small PR that can run in
   parallel:
   - `run-club-bandra`
   - `dinner-indiranagar`
   - `mixer-pune`
   - `pickleball-gurugram`
   - `pub-crawl-hyderabad`
5. Fold `host-demo` (NYC sales seed) and the Widgetbook design fixtures into
   worlds where they show the same entities. Contract fixtures stay separate:
   they test schema edges, not stories.

## Out of scope

Capture slot count, render caching and CI selection (CAT-239). Real
photography. Any claim that a feature is live: worlds only show engines that
ship (pair rotations and pods today).
