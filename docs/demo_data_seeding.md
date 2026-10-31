---
doc_id: demo_data_seeding
version: 1.4.3
updated: 2026-10-30
owner: recursive_audit_loop
status: active
---

# Demo Data Seeding

This repo has a repeatable Firebase Admin SDK seeder for filling Catch with
realistic demo data. It is intended for TestFlight/dev/staging testing where
the app needs enough users, clubs, events, attendance history, profile decisions, matches,
messages, payments, reviews, and notifications to exercise real flows.

The day-to-day internal CLI is:

```bash
node tool/demo/demo_ops.mjs
```

It wraps the original world seeder for large scenario writes and owns smaller
demo operations such as matching two testers, warming one user, warming a group,
resetting one user's demo state, and validating whether an account is ready for
a high-fidelity demo.

The lower-level world seeder is still available:

```bash
node tool/demo/seed_demo_data.mjs
```

It is deterministic and dry-run-first. Generated documents use stable IDs with a
seed prefix, and every event writes a manifest to `seedEvents/{seedPrefix}_{scenario}`
so the same synthetic world can be deleted and recreated.

## What It Creates

Depending on the scenario, the seeder creates:

- synthetic `users/{uid}` and `publicProfiles/{uid}` documents;
- `clubs/{organizerId}` across supported Indian cities;
- `organizerMemberships/{organizerId_uid}` for synthetic users and optional real anchor users;
- `events/{eventId}` with upcoming, full, waitlisted, cancelled, recently completed,
  and older completed states;
- `eventParticipations/{eventId_uid}` for signed-up, waitlisted, attended, and
  cancelled states;
- `eventSuccessPlans/{eventId}` plus event-success preferences, quick question
  answers, live-reveal assignments, private feedback, wingman requests, and
  aggregate scorecards for seeded singles mixers;
- `savedEvents/{uid_eventId}` for anchor users;
- `profileDecisions/{uid}/outgoing/{targetUid}` and reciprocal likes for anchor-user match flows;
- `matches/{matchId}` and `matches/{matchId}/messages/{messageId}`;
- `payments/{paymentId}` for completed, refunded, and failed/sign-up-failed states;
- `reviews/{eventId~reviewerUid}` and derived club rating summaries;
- `notifications/{uid}/items/{notificationId}` for dashboard activity.

Synthetic users do not get Firebase Auth accounts. They exist as public app
data so real TestFlight users can browse, attend seeded events with them, swipe,
match, and chat.

Seeded matches use deterministic match IDs and write `eventIds` instead of the
legacy single `eventId`, so the chats list can collapse one visible conversation
per matched person while still preserving the shared-event history.

## Sales-Grade Synthetic Supply

The current world seeder is useful for breadth testing, but it is not yet the
source of truth for host sales demos. Sales demos require a canonical synthetic
persona catalog with coherent names, demographics, profile fields, photo sets,
storage-owned assets, market-specific venues, and event-success state. Track that
work in `sales_demo_seed_tracker.md`.

Seed scenarios should migrate toward selecting reusable personas from that
catalog instead of generating one-off users from small name and image pools. Live
sales-demo writes must require uploaded assets and full profile photo metadata;
draft catalogs can be validated for internal consistency before image generation
and upload are complete.

Sales persona cohort scope lives in the
[sales demo persona cohorts](https://github.com/torana-labs/catch-knowledge/blob/main/strategy/sales-demo-persona-cohorts.md)
doc in catch-knowledge. The first
production scope is the 24-person New York cohort plus a planned 36-person India
core cohort. Do not create a separate full synthetic user set per Indian city
until there is a product reason to do so; use city overlays and roster subsets
against the reusable India core.

Persona photos are planned against
`tool/demo/demo_seed/personas/photo_activity_taxonomy.json` and
`tool/demo/demo_seed/personas/photo_composition_index.json`. The taxonomy defines
the allowed photo vocabulary; the composition index sets repeatable per-profile,
catalog-wide, city, and cohort ratios before image generation. This keeps prompts
balanced across solo portraits, food/dateable contexts, social proof, culture,
creative/work-adjacent settings, everyday candids, optional active lifestyle
shots, and a small but non-dominant running slice.

The initial New York sales catalog lives at
`tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json`. It currently
contains 24 coherent synthetic personas and 96 planned photo slots. Assets are
still draft-only until images are generated, reviewed, uploaded, and the live
asset gate passes with `--require-published-assets`.

For image generation, organization, upload, and post-upload validation, follow the
[sales demo image generation runbook](https://github.com/torana-labs/catch-knowledge/blob/main/runbooks/sales-demo-image-generation.md)
in catch-knowledge. The first batch uses the subscription
ChatGPT web UI to avoid additional API spend, one conversation per persona, and
four-person waves. Manual web downloads are still draft assets until normalized,
uploaded to UID-owned `users/{uid}/photos/` Storage paths, projected into
`users/{uid}` and `publicProfiles/{uid}`, and validated with
`--require-published-assets`.

The local API pilot generator is still useful for future provider comparisons
when the user explicitly approves API spend. It is intentionally dry-run-first
and writes generated assets under ignored `build/demo-persona-images/` output.
It does not mutate the catalog or upload storage assets; those steps happen only
after visual review.

Seeded event schedules are validated before any write plan is emitted. The seed
fails if a event exceeds the shared max duration, if one club hosts overlapping
active events, or if a user is signed up, waitlisted, or attended in overlapping
event windows. Adjacent events are allowed when one ends at the exact time the next
one starts. Real anchor users are only placed into seeded events for their
normalized profile city, so a tester is not fabricated into simultaneous events
across multiple cities.

Seeded event coordinates come from a curated venue catalog per supported city.
The seeder fails if an active event is missing exact coordinates or if the
coordinates drift away from the catalog entry for that meeting point. This keeps
map pins, directions, and location-gated check-in testing aligned with real
venues instead of city-center offsets.

The `beta-full` scenario intentionally creates a longer event horizon: near-term
events, mid-term events, three-week-ahead events, past attended events, and cancelled
events. That gives TestFlight accounts enough upcoming inventory for ongoing
manual QA instead of aging out after a couple of days.

The world seed does not write `organizerScheduleLocks` or `userEventScheduleLocks`
by default. Those collections are denormalized server-owned race guards for
callable writes; the Functions also query canonical `events` and
`eventParticipations`, so seeded existing state remains conflict-safe without
exploding demo document counts. Use `--include-schedule-locks` only when
explicitly testing the lock collections themselves.

## Internal Demo Ops CLI

List commands:

```bash
node tool/demo/demo_ops.mjs list-commands
```

The supported commands are:

| Command | Purpose |
|---|---|
| `seed-world` | Wrapper around `tool/demo/seed_demo_data.mjs` for full scenario seeds. |
| `append-user` | Wrapper around append mode for adding new testers without resetting existing testers. |
| `suvbot-actions` | Print the backend-owned Suvbot action catalog from `functions/src/demoOps/suvbot.ts`. |
| `suvbot` | Run one Suvbot action for a user from the CLI through the compiled Functions implementation. |
| `match-phones` | Resolve two real phone numbers and create a deterministic match without starter messages by default. |
| `warm-user` | Prepare one real account with saved events, event edges, notifications, payments, synthetic matches, and starter messages. |
| `warm-group` | Pairwise-match a small real tester group so they can dogfood chat together. |
| `reset-user-demo-state` | Delete only demo-owned relationship docs for one user while retaining their manually configured profile. |
| `validate-demo-state` | Check whether one or more users have enough state for a realistic demo. |
| `demo-checklist` | Print the screens/flows a given phone number can confidently demonstrate. |
| `cleanup-demo-data` | Pre-launch cleanup plan for all demo/synthetic documents. |
| `cleanup-stale-events` | Delete seeded past/cancelled events and dependent edges while preserving real profiles. |
| `make-event-full` | Fill a event to capacity with synthetic signed-up participants. |
| `mark-attended` | Force one real user into an attended event state for recap/swipe testing. |
| `promote-waitlist` | Move one real user into a signed-up state and create a promotion notification. |
| `create-unread-message` | Add a deterministic demo chat message so the recipient sees unread activity. |
| `create-refund` | Add a refunded payment-history row for one user/event. |
| `create-host-account` | Give one real user a host-owned demo club and event. |
| `create-check-in-event` | Create a near-immediate signed-up event at manual/user coordinates for location-gated check-in. |
| `scenario-info` | List scenario definitions under `tool/demo/demo_seed/scenarios`. |
| `list-golden-accounts` | Read the golden account registry JSON. |
| `validate-persona-catalog` | Validate the sales-grade synthetic persona catalog and optionally require uploaded assets. |
| `persona-photo-plan` | Print approved persona photo scenes and generation prompts before image generation. |
| `persona-image-generate` | Dry-run or generate the first local image pilot from the persona catalog. |

All write/delete commands are dry-run-first. Add `--apply` to mutate data.
Production writes also require `--allow-prod`.

### Suvbot Self-Service Chat

Seeded anchor users also get a deterministic `Suvbot` thread in Chats. The
seeder writes `demoSelfServiceAccess/{uid}`, `publicProfiles/suvbot`, and
`matches/suvbot_{uid}` with a welcome message, so the app can show button-driven
demo actions inside the normal chat surface.

The deployed callables are `listSuvbotDemoActions` and
`requestSuvbotDemoOperation`. Both are self-scoped to the signed-in user and
require `demoSelfServiceAccess/{uid}.enabled == true`. The app renders chips
from `listSuvbotDemoActions`, so new actions can be shipped by deploying
Functions instead of requiring another app update.

Current backend-owned actions are:

| Action | Purpose |
|---|---|
| `refreshDemoState` | Destructive two-tap action that deletes the caller's demo-owned state, preserves their real profile and Suvbot thread, then warms all demo surfaces again. |
| `clearDemoState` | Destructive two-tap action that deletes the caller's demo-owned state without writing fresh state. |
| `warmSignupState` | Create saved events plus signed-up/waitlisted event state. |
| `warmPostEventState` | Create attended-event state for recap and swipe-window testing. |
| `warmChatState` | Create seeded match threads for chat testing. |
| `warmPaymentState` | Create demo payment-history state for a paid seeded event. |
| `resetChats` | Destructive two-tap action that deletes demo-owned matches, swipe edges, and chat alerts. |
| `resetBookings` | Destructive two-tap action that deletes demo-owned saved events, bookings, schedule locks, and payments. |
| `resetNotifications` | Destructive two-tap action that deletes demo-owned notifications only. |
| `matchTesterByPhone` | Create a seeded match with another allowlisted tester by typed phone number. |
| `checkDemoState` | Report saved demo events, active/attended demo event states, seeded match threads, and demo payments. |
| `help` | Explain the available Suvbot actions. |
| `message` | Record typed text and route supported shortcuts, such as `match +919999999999`. |

Suvbot intentionally does not expose global world reseeding, another user's
unallowlisted phone number, or arbitrary admin commands to beta users.

Use the same backend code from local tooling:

```bash
node tool/demo/demo_ops.mjs suvbot-actions
node tool/demo/demo_ops.mjs suvbot \
  --env prod \
  --phone +919999999999 \
  --action warmChatState \
  --apply \
  --allow-prod
```

The `suvbot` command builds `functions/` and imports
`functions/lib/demoOps/suvbot.js` before running. Add
`--skip-functions-build` only when you already built Functions and want to
reuse the existing compiled output.

### Validate Sales Personas

Use this before a persona catalog is used by a seed scenario:

```bash
node tool/demo/demo_ops.mjs validate-persona-catalog \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
```

Live sales-demo seeding should require uploaded assets:

```bash
node tool/demo/demo_ops.mjs validate-persona-catalog \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --require-published-assets
```

Before spending on image generation, review the planned photo scenes and prompts:

```bash
node tool/demo/demo_ops.mjs persona-photo-plan \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
```

For a reviewable prompt document:

```bash
node tool/demo/demo_ops.mjs persona-photo-plan \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --format markdown
```

Dry-run the first image-generation pilot:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
```

Generate local review images after the dry run looks right:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --apply
```

The pilot config is
`tool/demo/demo_seed/personas/image_generation_pilot.json`. Override the pilot
with `--personas <id,...>`, `--image-model <model>`, or
`--image-output-dir <path>` when comparing providers or re-running a smaller
slice.

For the Gemini/Nano Banana provider comparison, use the Gemini pilot config:

```bash
node tool/demo/demo_ops.mjs persona-image-generate \
  --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json \
  --image-pilot-config tool/demo/demo_seed/personas/image_generation_pilot.gemini.json \
  --personas nyc_maya_shah_001 \
  --image-output-dir build/demo-persona-images-gemini \
  --apply
```

Gemini generation requires `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or
`GOOGLE_GENAI_API_KEY` in the shell. The default Gemini model is Nano Banana Pro
(`gemini-3-pro-image-preview`) with `gemini-3.1-flash-image-preview` as the
fallback if the primary model is unavailable.

If API limits block the scripted pilot, use ChatGPT web only as a manual
review fallback. Keep downloaded images in ignored `build/demo-persona-images/`
output with a local manifest and do not mutate the persona catalog or storage
URLs until the assets have passed review, normalization, upload, and
`--require-published-assets`.

### Match Two Real Testers

Use this when you want yourself and a friend to appear in each other's chat tab
so you can dogfood Catch instead of moving the conversation to WhatsApp:

```bash
node tool/demo/demo_ops.mjs match-phones \
  --env prod \
  --phone-a +919131404263 \
  --phone-b +919870042103 \
  --apply \
  --allow-prod
```

By default this creates/repairs the match directly and writes match
notifications, but it does not fabricate a chat transcript. It records all
written paths under
`demoOpsEvents/{operationId}` and marks documents with `demoOps: true` so they can
be reset later.

To intentionally create starter messages for a scripted demo, add:

```bash
--with-messages
```

Opt-in starter messages are backdated into the recent past. The command does
not use a Firestore server timestamp for generated chat rows because demo plans
need deterministic dry-run output and repeatable document IDs.

To exercise the actual profile-decision trigger as well, add the legacy-named
option:

```bash
--via-swipes
```

To write only reciprocal profile-decision likes and rely on the deployed trigger
to create the match:

```bash
--via-swipes-only
```

`--via-swipes` requires a shared attended event. The command auto-detects one
from `eventParticipations`; if there is no shared attended event, pass
`--event-id` or warm the users first. The option writes
`profileDecisions/{uid}/outgoing/{targetUid}` documents.

### Warm One Account

Use this before handing a TestFlight build to an investor, advisor, or beta
tester who needs the app to feel alive immediately:

```bash
node tool/demo/demo_ops.mjs warm-user \
  --env prod \
  --phone +919131404263 \
  --apply \
  --allow-prod
```

This creates a curated demo state around the real account:

- saved upcoming events;
- signed-up, waitlisted, and attended event participation edges when matching events exist;
- a completed paid-flow payment when a paid upcoming event exists;
- dashboard notifications;
- synthetic matches and starter chat messages.

After applying, the tool recomputes event and event-club aggregate projections from
edge documents so list/detail counts remain consistent.

### Warm A Dogfood Group

Use this for 3-10 real testers who should all be able to chat with each other:

```bash
node tool/demo/demo_ops.mjs warm-group \
  --env prod \
  --phones +919131404263,+919870042103,+919717473191 \
  --apply \
  --allow-prod
```

The command pairwise-matches every phone number in the group and creates starter
messages. It is intentionally deterministic, so rerunning repairs the same
match docs instead of creating duplicate conversations.

### Reset One Account's Demo State

Use this when one tester's seeded state is messy but you want to preserve their
manual onboarding/profile edits:

```bash
node tool/demo/demo_ops.mjs reset-user-demo-state \
  --env prod \
  --phone +919818759929 \
  --apply \
  --allow-prod
```

The reset command deletes only demo-owned relationship/activity docs connected
to that user:

- `organizerMemberships` by `uid`;
- `eventParticipations` by `uid`;
- `userEventScheduleLocks` by `uid`;
- `savedEvents` by `uid`;
- `payments` by `userId`;
- `profileDecisions/{uid}/outgoing/*` and incoming demo profile decisions;
- demo-owned `matches` involving the user and the entire message subcollection
  under those disposable match threads, including real dogfood messages sent
  inside the seeded relationship;
- `notifications/{uid}/items/*`.

It does not delete `users/{uid}` or `publicProfiles/{uid}`.

### Clean Up Stale Seeded Events

Use this when the seeded world has accumulated cancelled or past events and you
want to remove those stale event docs plus their relationship edges without
touching real user profiles:

```bash
node tool/demo/demo_ops.mjs cleanup-stale-events \
  --env prod \
  --apply \
  --allow-prod
```

The command is dry-run-first if you omit `--apply`. It deletes stale seeded
`events`, `eventParticipations`, schedule locks, saved events, payments, reviews,
event-linked profile decisions, demo match threads tied to stale event IDs, and event/match
notifications. It recomputes event and event-club aggregates after apply.

To keep one stale category:

```bash
--keep-past-events
--keep-cancelled-events
```

### Create A Check-In Test Event

Use this when you need to test the location-gated self check-in flow on a real
phone. The event starts five minutes after the command events, so the 10-minute
pre-event check-in window is already open:

```bash
node tool/demo/demo_ops.mjs create-check-in-event \
  --env prod \
  --phone +919131404263 \
  --lat 28.6129 \
  --lng 77.2295 \
  --meeting-point "India Gate" \
  --apply \
  --allow-prod
```

If you omit `--lat` and `--lng`, the command uses the private coordinates on
`users/{uid}`. It creates a demo club, host membership, one signed-up
participation edge for the real tester, schedule locks, and aggregate repairs.

### Validate Demo Readiness

Before a demo, run:

```bash
node tool/demo/demo_ops.mjs validate-demo-state \
  --env prod \
  --phones +919131404263,+919870042103
```

The validator checks for a public profile and enough active matches, messages,
event participations, notifications, saved events, payments, and outgoing
profile decisions to make the app feel warm. It is deliberately product-oriented: it answers “will
this account feel useful in a demo?” rather than merely validating Firestore
schema shape.

## Demo Checklist

Use this before handing someone a phone or TestFlight login:

```bash
node tool/demo/demo_ops.mjs demo-checklist \
  --env prod \
  --phone +919131404263
```

The checklist converts raw counts into capabilities such as profile, event detail,
post-event recap, matches, chat, saved events, payment history, and notifications.

## Live Chats QA Closure

Use this checklist to close `MATCH-CHAT-OWNER-QA-001`. It is intentionally an
owner-operated live-account loop because it depends on a real phone, the active
Firestore project, and real tester accounts.

1. Confirm the target account has enough state for Chats:

   ```bash
   node tool/demo/demo_ops.mjs validate-demo-state \
     --env prod \
     --phone +919131404263
   ```

2. If the account is missing a chat partner, create or repair a deterministic
   live-tester match. First inspect the dry run, then rerun with `--apply` only
   when the proposed paths are expected:

   ```bash
   node tool/demo/demo_ops.mjs match-phones \
     --env prod \
     --phone-a +919131404263 \
     --phone-b +919870042103 \
     --allow-prod

   node tool/demo/demo_ops.mjs match-phones \
     --env prod \
     --phone-a +919131404263 \
     --phone-b +919870042103 \
     --apply \
     --allow-prod
   ```

3. If the chat list has stale or duplicated demo-owned threads for one tester,
   reset only that tester's disposable relationship state, then warm it again:

   ```bash
   node tool/demo/demo_ops.mjs reset-user-demo-state \
     --env prod \
     --phone +919131404263 \
     --apply \
     --allow-prod

   node tool/demo/demo_ops.mjs warm-user \
     --env prod \
     --phone +919131404263 \
     --apply \
     --allow-prod
   ```

4. Create one unread message when the badge, ordering, and opened-thread
   behavior need a deterministic live check:

   ```bash
   node tool/demo/demo_ops.mjs create-unread-message \
     --env prod \
     --from-phone +919870042103 \
     --to-phone +919131404263 \
     --text "Want to try the Saturday route?" \
     --apply \
     --allow-prod
   ```

5. On the live phone, verify the Chats list and thread:

   - the list shows one visible conversation per matched person;
   - unread count and ordering update after the deterministic unread message;
   - opening the thread shows the same match, message, and shared event context;
   - profile images use thumbnails and do not flash full-size source photos;
   - no duplicate synthetic name/photo pairs appear for the active account.

6. If thumbnails are missing on real data, run the profile-thumbnail backfill
   from an authenticated shell targeting the intended Firebase project. Dry-run
   first, review `missing` and `skipped`, then apply only when the plan is
   expected:

   ```bash
   GOOGLE_CLOUD_PROJECT=<firebase-project-id> \
   FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket> \
   npm --prefix functions run backfill:profile-thumbnails

   GOOGLE_CLOUD_PROJECT=<firebase-project-id> \
   FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket> \
   npm --prefix functions run backfill:profile-thumbnails -- --apply
   ```

7. After any writes, rerun both validators:

   ```bash
   node tool/demo/demo_ops.mjs validate-demo-state \
     --env prod \
     --phone +919131404263

   node tool/data/validate_firestore_data.mjs --env prod
   ```

## State Toggles

Use these to force specific screens or edge states without reseeding the whole
world:

```bash
# Fill a event to capacity with synthetic participants.
node tool/demo/demo_ops.mjs make-event-full \
  --env prod \
  --event-id demo_beta_2026_run_mumbai_01_01 \
  --apply \
  --allow-prod

# Mark a real tester as attended so recap/swipe flows unlock.
node tool/demo/demo_ops.mjs mark-attended \
  --env prod \
  --phone +919131404263 \
  --event-id demo_beta_2026_run_mumbai_01_05 \
  --apply \
  --allow-prod

# Promote a waitlisted tester and create the activity item.
node tool/demo/demo_ops.mjs promote-waitlist \
  --env prod \
  --phone +919131404263 \
  --event-id demo_beta_2026_run_mumbai_01_01 \
  --apply \
  --allow-prod

# Add a new chat message from one tester to another.
node tool/demo/demo_ops.mjs create-unread-message \
  --env prod \
  --from-phone +919870042103 \
  --to-phone +919131404263 \
  --text "Want to try the Saturday route?" \
  --apply \
  --allow-prod

# Create a refunded payment row.
node tool/demo/demo_ops.mjs create-refund \
  --env prod \
  --phone +919131404263 \
  --event-id demo_beta_2026_run_mumbai_01_02 \
  --apply \
  --allow-prod

# Create a host-owned club/event for host tools.
node tool/demo/demo_ops.mjs create-host-account \
  --env prod \
  --phone +919131404263 \
  --apply \
  --allow-prod
```

Edge-writing commands mark documents with demo metadata and write manifests.
Commands that change event participation or club membership state also recompute
aggregate projections after apply.

## Scenarios And Golden Accounts

Scenario JSON files live under `tool/demo/demo_seed/scenarios`:

- `investor-demo`
- `dogfood-group`
- `host-demo`
- `payments-demo`
- `empty-state-demo`
- `safety-demo`

Inspect them with:

```bash
node tool/demo/demo_ops.mjs scenario-info
node tool/demo/demo_ops.mjs scenario-info --demo-scenario investor-demo
```

The golden-account registry template is:

```bash
tool/demo/demo_seed/golden_accounts.example.json
```

Read it with:

```bash
node tool/demo/demo_ops.mjs list-golden-accounts
```

Create a local, ignored `tool/demo/demo_seed/golden_accounts.json` later when real
TestFlight accounts are assigned to stable roles.

## Launch Cleanup

Before public launch, run a dry run:

```bash
node tool/demo/demo_ops.mjs cleanup-demo-data \
  --env prod \
  --keep-seed-prefixes cross_paths_mumbai_qa \
  --allow-prod
```

Then apply only after reviewing the path count:

```bash
node tool/demo/demo_ops.mjs cleanup-demo-data \
  --env prod \
  --keep-seed-prefixes cross_paths_mumbai_qa \
  --apply \
  --allow-prod
```

Cleanup scans known top-level and nested demo surfaces for `demoOps`,
`synthetic`, and known `seedPrefix` markers. It includes both legacy `clubs`
and canonical `organizers`, deletes match messages before match docs, and
includes `seedEvents` plus `demoOpsEvents` manifests. A keep prefix protects
documents that carry or reference the retained QA seed. Event
`validate-demo-state` and the broader Firestore validator after cleanup to prove
zero demo residue before launch.

## TestFlight Refresh Cadence

For active beta testing, use this rhythm:

- Weekly: dry-run `seed-world --scenario beta-full --reset-synthetic`, review
  counts, then apply if the synthetic world itself needs a full refresh.
- When inviting a new tester: use `append-user`, not `--reset-synthetic`, so
  existing testers do not receive duplicate seeded notifications.
- When one tester gets messy: use `reset-user-demo-state`, then `warm-user`.
- When events age out: use `cleanup-stale-events`, then `append-user` or `warm-user`
  for accounts that need fresh future state.
- Before any investor/advisor walkthrough: event `demo-checklist` for the exact
  phone number and fix the listed gaps.

## First-Class Demo Tooling Principles

Treat this tooling as product infrastructure:

- **Dry-run first:** every mutation command should show its plan before writes.
- **Prod guard:** prod writes require both `--apply` and `--allow-prod`.
- **Deterministic IDs:** reevents should repair state, not create duplicates.
- **Manifested writes:** each operation writes a `demoOpsEvents/{operationId}`
  manifest with affected users and document paths.
- **Reversible state:** demo-owned documents include `demoOps`, `demoOpsId`, and
  `seedPrefix` markers so single-user reset and future cleanup can find them.
- **Explicit disposal policy:** demo-created match documents are tagged as
  `demoOpsEntityType: "matchThread"` with
  `demoOpsDisposalPolicy: "deleteThreadWithMessages"` because the relationship
  is disposable even when real testers chat inside it.
- **Profile preservation:** never overwrite real `users/{uid}` or
  `publicProfiles/{uid}` from demo tooling.
- **Thumbnail-complete synthetic profiles:** seeded synthetic users and
  `publicProfiles` must include `profilePhotos.thumbnailUrl` values derived
  from their profile photos. Event detail and dashboard hype avatars
  intentionally prefer thumbnail imagery for blurred tiny social-proof circles;
  missing thumbnails degrade back to deterministic color placeholders or
  full-photo fallback paths.
- **Edge-first counts:** when tooling writes relationship edges, recompute parent
  aggregate projections instead of hand-tuning counts.
- **Relationship invariants:** profile decisions and decision-derived matches
  must be backed by attended `eventParticipations` for both users on the same
  event. Append mode filters out relationship docs that fail this check instead
  of creating invalid demo state.
- **Architecture signal:** if a demo command has to duplicate complicated product
  logic, that is evidence the production mutation should probably move behind a
  callable/repository seam.

## Scenarios

List available scenarios:

```bash
node tool/demo/seed_demo_data.mjs --list-scenarios
```

Current scenarios:

- `smoke`: small seed for quick dev/emulator checks.
- `beta-full`: full TestFlight-style world across every supported city.
- `city-dense`: many clubs and events in one city for list/map/search stress.
- `empty-edge-cases`: sparse data for empty, expired, cancelled, and waitlist states.
- `paid-flow-demo`: paid booking/payment-history focused data.

## Prerequisites

Install Functions dependencies if needed:

```bash
npm --prefix functions install
```

Live Firebase writes use the Admin SDK, so the shell needs Application Default
Credentials or a service account:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project catchdates-dev
```

Alternatively:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Emulator events do not need live credentials.

## Dry Event

Always start with a dry run:

```bash
node tool/demo/seed_demo_data.mjs --env dev --scenario smoke
node tool/demo/seed_demo_data.mjs --env dev --scenario beta-full --json
```

The output shows the target project, scenario, anchor users, document counts, and
manifest path. No documents are written unless `--apply` is present.

## Cross Paths Internal Fixture

Cross Paths needs more than profile documents. A candidate must be signed up
for an upcoming event, globally opted in, opted in for that event under the
current terms, objectively showcase-ready, and bound to a reviewed profile
fingerprint. The dedicated operation creates that complete chain for exactly
one synthetic viewer and one or two synthetic candidates:

```bash
npm --prefix functions run build
node tool/demo/demo_ops.mjs seed-cross-paths --env dev --json
node tool/demo/demo_ops.mjs seed-cross-paths --env dev --apply
```

The command is dry-run-first. Dev/emulator runs can use any explicitly selected
synthetic seed. If an old event has moved
outside the six-hour-to-fourteen-day Cross Paths window, it creates one fresh,
free synthetic event with only the selected viewer and candidates signed up.
The chosen synthetic event is explicitly marked
`crossPathsDiscoveryEnabled: true`; the backend's synthetic-only exception is
also scoped to an identical non-empty `seedPrefix`, preventing data from two
synthetic worlds from mixing. It never opts in a real anchor account or changes
a real event's pilot switch.

Production has one intentionally narrow exception for internal Mumbai QA. It
accepts only `cross_paths_mumbai_qa`, viewer
`cross_paths_mumbai_qa_user_002`, event
`cross_paths_mumbai_qa_run_mumbai_01_01`, hidden organizer `courtside`, exactly
two candidates, and fictional test phone `+16505550101`. The command requires
`--allow-prod`, `--allow-prod-cross-paths-fixture`, test-login configuration,
and all pinned IDs. Synthetic organizers and events remain absent from public
Explore and Host listings; the selected viewer sees the fixture only through
their signed-up participation.

For a repeatable Consumer-app login, use a fictional Firebase test phone and a
six-digit test code. Never use a real person's phone or OTP:

```bash
node tool/demo/demo_ops.mjs seed-cross-paths \
  --env dev \
  --apply \
  --configure-test-login \
  --test-phone +16505550101 \
  --test-code 123456
```

The operation first uses the Firebase Admin credential. If that principal can
manage Auth users but cannot read/update Identity Platform configuration, it
falls back to the active `gcloud` account; that account must have
`firebaseauth.configs.get` and `firebaseauth.configs.update` permission.

Cross Paths is part of the normal Consumer client; its temporary Remote Config
rollout switches have been retired. To exercise a non-production fixture, run
the normal Consumer build:

```bash
./tool/flutter_with_env.sh dev consumer run \
  -d "<device-id>"
```

There is no longer a compile-time preview lab. Eligibility remains bounded by
the synthetic seed prefix, selected event, layered consent, showcase review,
admission policy, and server-owned safety checks in every environment.

## Anchor Real TestFlight Users

Anchor users are the real accounts you and your friends/family log into on
TestFlight. The seeder reads their existing `users/{uid}` docs and creates demo
relationships around them.

Use UIDs:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-users uid1,uid2,uid3 \
  --allow-prod
```

Or use phone numbers exactly as stored in `users.phoneNumber`:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-phones +919999999999,+918888888888 \
  --allow-prod
```

Or use a file:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-file tool/demo/demo_seed/beta_anchors.txt \
  --allow-prod
```

Plain text anchor files can contain one UID or phone number per line:

```text
# beta testers
abcFirebaseUid123
+919999999999
```

JSON anchor files can use either shape:

```json
{
  "uids": ["abcFirebaseUid123"],
  "phones": ["+919999999999"]
}
```

If an anchor user is missing, the script fails before writing. If an anchor user
does not have a `publicProfiles/{uid}` document, the dry run prints a warning.
Fix onboarding/profile sync first if that happens; the seeder intentionally does
not overwrite real user profiles.

Synthetic public identities must be deterministic and visibly distinct. The
chat list, search, and profile flows are too hard to QA when two synthetic
profiles share the same public name and primary photo. The seeder now generates
full display names and offsets repeated photos, and the data validator warns on
duplicate synthetic public name/photo pairs. If an environment was seeded before
this rule, rerun the seed with `--reset-synthetic` to replace the misleading
synthetic profiles.

## Apply To Dev Or Staging

For a real write to dev:

```bash
node tool/demo/seed_demo_data.mjs \
  --env dev \
  --scenario beta-full \
  --anchor-users uid1,uid2 \
  --apply \
  --reset-synthetic
```

Validate the result:

```bash
node tool/data/validate_firestore_data.mjs --env dev
```

If validation reports future events with `attended` participation edges, repair
those stale edges before testing event detail or swipe flows:

```bash
node tool/data/repair_future_event_attendance.mjs --env dev --apply
node tool/data/validate_firestore_data.mjs --env dev
```

For staging:

```bash
node tool/demo/seed_demo_data.mjs \
  --env staging \
  --scenario beta-full \
  --anchor-file tool/demo/demo_seed/beta_anchors.txt \
  --apply \
  --reset-synthetic

node tool/data/validate_firestore_data.mjs --env staging
```

## Apply To Current TestFlight/Prod

Production writes require `--allow-prod` as an explicit guard:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-file tool/demo/demo_seed/beta_anchors.txt \
  --apply \
  --allow-prod \
  --reset-synthetic
```

Then validate:

```bash
node tool/data/validate_firestore_data.mjs --env prod
```

Use this only while the current production database is still a disposable beta
dataset. Before public launch, clear the synthetic seed data and validate again.

## Add New Testers Later

Do not use `--reset-synthetic` when you only want to add newly invited testers.
Resetting deletes and recreates the whole synthetic world, which also recreates
existing testers' seeded notifications and unread state.

Add the new phone number or UID to `tool/demo/demo_seed/beta_anchors.txt`, then dry
event append mode:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-file tool/demo/demo_seed/beta_anchors.txt \
  --append-anchors \
  --allow-prod
```

If the dry run shows the expected new anchor count, apply it:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --anchor-file tool/demo/demo_seed/beta_anchors.txt \
  --append-anchors \
  --apply \
  --allow-prod
```

Append mode reads the existing seed manifest, compares the current anchor file
against `anchorUserIds`, and writes only docs related to newly added anchors plus
event/club aggregate updates. It does not delete or recreate existing testers'
notification docs.

Append mode also validates relationship docs after target filtering and capacity
normalization. Any generated swipe, swipe-created match, match message, or match
notification is skipped unless the effective appended/existing
`eventParticipations/{eventId_uid}` documents show both users attended that event.
This keeps the seeded Catches data aligned with the same rule enforced by the
app and by `tool/data/validate_firestore_data.mjs`.

## Reset Without Re-Seeding

The reset behavior uses the prior manifest when present. To delete the current
scenario's synthetic docs and then recreate them, use `--reset-synthetic --apply`
with the same `--seed-prefix` and `--scenario`.

To remove the docs without recreating them:

```bash
node tool/demo/seed_demo_data.mjs \
  --env prod \
  --scenario beta-full \
  --apply \
  --allow-prod \
  --reset-synthetic \
  --delete-only
```

Use the same `--scenario` and `--seed-prefix` that created the data. If the
manifest exists, the script deletes exactly the manifest paths; otherwise it
falls back to the current deterministic generated paths for that scenario.

## Emulator Use

With the Firestore emulator:

```bash
firebase emulators:exec --only firestore \
  "node tool/demo/seed_demo_data.mjs --env dev --scenario smoke --emulator --apply --reset-synthetic"

firebase emulators:exec --only firestore \
  "node tool/data/validate_firestore_data.mjs --env dev --emulator"
```

This is useful for checking shape and aggregate integrity before touching live
Firebase projects.

## Operational Notes

- Default mode is dry run. `--apply` is required for writes.
- Prod writes require both `--apply` and `--allow-prod`.
- `--reset-synthetic` deletes only documents recorded in the seed manifest, or
  the current deterministic generated paths if no manifest exists.
- `--delete-only` removes the synthetic world and exits without recreating it.
- The script never deletes real anchor `users/{uid}` documents.
- Synthetic docs include `synthetic: true`, `seedPrefix`, and `scenario` fields.
- Event and club aggregate fields are computed from edge documents so the existing
  Firestore validator can catch drift.
- Matches are written directly by Admin SDK for seeded demo state; live app
  behavior still creates real matches from reciprocal profile decisions through Functions.

## Recommended Beta Workflow

1. Collect the TestFlight users' Firebase Auth UIDs or phone numbers.
2. Put them in `tool/demo/demo_seed/beta_anchors.txt`.
3. Dry-run prod:

   ```bash
   node tool/demo/seed_demo_data.mjs --env prod --scenario beta-full --anchor-file tool/demo/demo_seed/beta_anchors.txt --allow-prod
   ```

4. Apply:

   ```bash
   node tool/demo/seed_demo_data.mjs --env prod --scenario beta-full --anchor-file tool/demo/demo_seed/beta_anchors.txt --apply --allow-prod --reset-synthetic
   ```

5. Validate:

   ```bash
   node tool/data/validate_firestore_data.mjs --env prod
   ```

6. Have each tester relaunch TestFlight and check:
   dashboard activity, club discovery, club detail, upcoming event detail, saved
   events, paid/free booking states, attended event recap, swiping, matches, chat,
   payment history, reviews, and notification preferences.

## Demo Ops Backlog

Approved and implemented:

- Full world seeding with `tool/demo/seed_demo_data.mjs`.
- Append-only tester seeding without resetting existing anchor users.
- One-command direct matching for two real phone numbers.
- Optional reciprocal swipe writes for match trigger testing.
- One-user warmup for investor/beta demos.
- Real tester group warmup for dogfooding chat.
- One-user demo-state reset that preserves real profile configuration.
- Product-oriented demo-readiness validation.

Recommended next additions:

- **Golden personas:** named internal demo accounts such as founder, host,
  high-activity attendee, new user, paid-event user, and empty-state user.
- **Scenario snapshots:** `investor-demo`, `press-demo`, `host-demo`,
  `payments-demo`, `safety-demo`, and `empty-state-demo` JSON scenario files.
- **Conversation scripts:** deterministic chat transcripts with richer pacing,
  unread/read variants, image-message variants, and moderation-edge examples.
- **State toggles:** commands such as `make-event-full`, `promote-waitlist`,
  `mark-attended`, `create-refund`, `create-unread-message`, and
  `create-host-account`.
- **Demo checklist export:** a command that prints a human checklist for the
  exact screens a given phone number can demonstrate.
- **Launch cleanup:** a hard pre-launch command that deletes all `synthetic`,
  `demoOps`, and `seedPrefix` documents and then validates zero demo residue.
- **Admin UI:** later, wrap the CLI operations in a locked internal admin panel
  or callable-only staff tool once the command semantics stabilize.

Architecture signals to watch:

- If demo tools need to create production-owned documents directly, that is
  acceptable for Admin SDK tooling but should stay visibly marked and audited.
- If direct writes become the only reliable way to create valid app state, move
  the matching/bookings/notifications operation into a callable that both app
  and tooling can invoke.
- Match/message triggers now copy demo metadata through
  `functions/src/shared/demoMetadata.ts` so notification projections remain
  cleanup-safe.
- If resetting one user's state requires broad collection scans, add stronger
  ownership indexes or per-operation manifests before beta data volume grows.
  The current reset command intentionally scans `profileDecisions/*/outgoing`
  instead of requiring an indexed collection-group query; this is acceptable for
  small beta data and should be revisited before seeded data becomes large.
- If “warm user” requires too many unrelated writes, consider adding a formal
  onboarding/demo-state service boundary in Functions so network-effect setup
  becomes one backend-owned transaction.
