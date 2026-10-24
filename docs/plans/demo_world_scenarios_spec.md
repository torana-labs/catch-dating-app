---
doc_id: demo_world_scenarios_spec
version: 0.3.1
updated: 2026-10-25
owner: marketing_website
status: active
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
6. **People come from cohorts.** Guests and hosts reference personas by id from
   the reviewed catalogs in `tool/demo/demo_seed/personas/*_personas.draft.json`.
   India stories cast from `india-core-sales-personas-v1` (68 people, 34 women and
   34 men; 21 in Mumbai, 12 each in Pune, Bangalore and Delhi including Gurugram,
   10 in Hyderabad, 1 in Indore), so each launch-format world can cast 10-14
   locals. New York stories cast from `us-nyc-sales-personas-v1` (24 people).
   Names are fictional, and phone numbers use the story country's reserved
   range: `+91 90000 0xxxx` in India, `+1 NXX 555-01xx` in the US. Photos are
   planned slots until generated and uploaded, so captures show initials
   meanwhile.

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
| `waitlisted` | `waitlist` records with `joinedAt ≤ moment` |
| `catchSent` | `catches` with `sentAt ≤ moment` |
| `mutualMatches` | pairs who sent each other a catch by the moment |
| `chatsStarted` | `chats` with `startedAt ≤ moment` |
| `phase` | before start = upcoming, within start–end = live, after end = ended |

Optional event records, each added when a world first needed it:

| Record | Fields | Added by |
| --- | --- | --- |
| `waitlist` | `personId`, `joinedAt` | `us-nyc-host-demo` |
| `catches` | `personId` (sender), `targetId`, `sentAt` | `us-nyc-host-demo` |
| `chats` | `personIds` (a pair), `startedAt` | `us-nyc-host-demo` |
| `reviews` | `personId`, `rating`, `comment`, `createdAt`, `anonymous` | `us-nyc-host-demo` |

Payment, application and message records join the same way, with the same
rule: timestamps in, counts derived.

A world that seeds demo environments declares the `demo-seed` use and a
`seedWorld` generator (cities, users per city, event patterns relative to the
seed time, operator commands). `tool/demo/seed_demo_data.mjs` runs the
generator with the world's cast as its personas.

## Invariants the validator enforces

- Every `personId`, `personaId` and `venueId` resolves; personas resolve
  against the catalogs.
- Every cast persona comes from the story's country (the `locale` region), no
  persona is cast twice (host included), and the host's names match the host
  persona.
- `checkedInAt` is after `bookedAt` and within the event window (doors may open
  30 minutes early).
- `booked ≤ capacity` at every moment.
- A waitlisted guest holds no booking for the same event.
- Catches go between guests who checked in, after the sender checked in; a
  chat needs a mutual match and starts after both catches; a review comes from
  a guest who checked in and is written after the event ends.
- `seedWorld` is present exactly when `uses` includes `demo-seed`, and its
  patterns use production activity kinds.
- Moments are in increasing order, and each one falls on a day the story covers.
- `activityKind` and `format` values are members of the production enums,
  read from the generated schema contracts, not retyped.
- No real-looking contact details: the host phone is in the story country's
  reserved range, email domains are `example.test`.

## Projections

| Consumer | Reader | Notes |
| --- | --- | --- |
| Flutter captures | Dart `DemoWorld` reader in `test/ui_captures/fixtures/` | Each Host capture role reads one (event, moment). Existing builders keep producing production types. The New York world converts civil times to UTC instants, as its captures were drawn with. |
| Website stories | `website/src/stories/fixtures/demoWorld.ts` reading the same JSON | Storybook guest pages (`/join/`, forms, booking) show the same people and event as the app captures. |
| Website copy | `demoWorldFacts` | The "facts" field in the media manifest names which values a caption or sentence quotes. |
| Website demo listing | `website/scripts/generateOrganizerListings.mjs` | The New York world becomes the Storybook demo organiser listing (`hostListings.demo.json`): events, counts, the event-success summary and reviews, at the world's `live` moment. |
| Demo environments | `tool/demo/seed_demo_data.mjs` | A world's `seedWorld` generator, cast from the world's people. Older generator scenarios use the New York catalog. |

## Migration

1. Add the schema, validator, derivation and tests. Convert
   `host-marketing-india` to schemaVersion 2 with a 24-guest attendance list that
   reproduces today's counts exactly (0/0 at planning, 24/0 today, 24/18 live and
   at follow-up). The Dart reader reads v2. **Acceptance:** the 12 canonical
   captures render pixel-identical to the same commit before the change.
2. Add India personas (names first, photos later) and swap the story's host and
   roster to them. Captures change on purpose here and get reviewed. **Done:**
   `india_core_sales_personas.draft.json` (capture fixtures build profiles from
   the catalogs directly, with no generated projection);
   `host-marketing-india` casts Meher Bhatia as host and 20 Mumbai plus 4 Pune
   guests; capture fixtures load every cohort catalog.
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
   they test schema edges, not stories. **In progress:**
   - `us-nyc-host-demo` replaces `host-demo.json`: Sunday Table Club, hosted by
     Victor Alvarez, with three events (the next dinner, a live mixer, and the
     previous evening's mixer) at one `live` moment. Derived counts equal the
     old hand-typed ones (0/0/0, 17/7/3, 17/13/2); the capture fixture, the
     seeder and the website demo listing read it. The website scorecard
     intentionally reflects the corrected catch count below, and its source
     label is now "Catch demo world"; those snapshots require visual review.
   - The old file's host was named Rohan Mehta but cast as Jordan Ellis, who
     was also a guest, so the host is now the persona the story already fits.
   - Its scorecard (18 mutual matches from 31 catches) couldn't be true, so the
     world records 41 catches behind the 18 matches. Its funnel and proof
     claims were never rendered and are dropped.
   - The apps had bundled `host-demo.json` and the New York projection since a
     retired lab read them; nothing reads them now, so they are no longer
     bundled.

## Out of scope

Capture slot count, render caching and CI selection (CAT-239). Real
photography. Any claim that a feature is live: worlds only show engines that
ship (pair rotations and pods today).
