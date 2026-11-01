---
doc_id: location_stack
version: 1.1.8
updated: 2026-11-01
owner: recursive_audit_loop
status: active
---

# Location Stack

## Product Policy

Catch should treat location as optional for account creation and general app
usage, but required for workflows where location is the product guarantee.

- Users can browse clubs, view profiles, chat, and use most app surfaces without
  sharing live device location.
- Hosts must pin an exact named meeting location for every event.
- Participants must be near the pinned run coordinates to self check in.
- Exact user coordinates must not be exposed through public profile documents.
- Event coordinates are venue coordinates, not private user coordinates, and can
  be shown on maps or opened in navigation apps.
- General city-map browsing does not require device location. Explore draws a
  geographic distance ring only after device location is available and the
  user selects a non-`ANY` distance.

## Current State

The app currently uses:

- `geolocator` for device location.
- `google_maps_flutter` for in-app run maps and run-location picking.
- `MapPreview` for read-only compact Event Detail destination previews;
  it owns disabled gestures/controls, Google attribution clearance, automatic
  Android lite mode, and deterministic no-network fixtures.
- `LocationCoordinate`, the app-owned coordinate value object, for domain
  coordinates and client-side distance calculations.
- `ExploreMapScreen` for the interactive event map. It uses real Google tiles
  in production; its explicit `enableNetworkTiles: false` branch is a neutral
  deterministic fixture for tests, Widgetbook, and captures, never painted
  substitute geography.
- Explore's native distance circle owns metre-accurate map geometry while the
  projected `CatchDistanceOverlay.label` keeps the handoff typography and tap
  target attached to its visible edge.
- `DeviceLocation.build()` is passive: it may reuse an already granted
  permission, but never opens the system prompt. Explore's `Use my location`
  control is the explicit prompt boundary; denial leaves the map usable at
  `ANY`. Disabled services and permanent denial surface an `Open settings`
  recovery action routed to the appropriate system settings page.
- `users/{uid}.latitude/longitude` as private profile fields.
- `publicProfiles/{uid}.city` for public coarse location; exact coordinates are
  not projected into public profiles.
- `events/{eventId}.meetingLocation` as the canonical required venue and
  `startingPointLat/startingPointLng` as synchronized non-null compatibility
  mirrors.
- `selfCheckInAttendance` Cloud Function for authoritative distance-gated
  check-in.
- `placesAutocomplete` and `placeDetails` callable Functions as the server-side
  bridge to Google Places API (New).

## Canonical Market Identity And Display Contract

Catch stores a stable market identity and derives human copy at presentation
boundaries. These values are deliberately different:

- `marketId` is the persistence, query, launch, and deduplication key, for
  example `in-dl-delhi-ncr`.
- `cityId` identifies the municipality, for example `in-dl-new-delhi`.
- `slug` is the public URL identity, for example `delhi-ncr`.
- `label` is product-facing market copy, for example `Delhi NCR`; `cityLabel`
  is the municipality copy, for example `New Delhi`.
- Legacy names and aliases are accepted only as compatibility inputs and
  normalize to the canonical market id.

`users/{uid}.city`, `publicProfiles/{uid}.city`, and canonical club location
fields therefore keep the market id. `syncPublicProfile` intentionally copies
that id unchanged. Flutter display surfaces must resolve it through
`CityData.label` or `cityLabel(...)`; editors must submit the canonical id even
when their visible value is a label. Do not denormalize the label into public
profiles, because market renames and future localization would make it drift.

Google Places does not participate in this conversion. Places owns exact event
meeting-point search and details; the city/market catalog owns coarse market
identity and labels.

## Architecture Assessment — 2026-07-13

The direction is sound: canonical ids are separated from copy, exact profile
coordinates stay private, `LocationCoordinate` keeps Google SDK types at the
adapter edge, `LocationMap` owns native map integration, Places keys stay
server-side, and passive location reads do not open a permission prompt. The
current `DeviceLocationGateway` also gives device-location behavior a test seam
and explicit recovery paths.

The following bounded architecture debt remains open:

- `LOC-ARCH-001` — Dart, Functions, and Node tooling maintain separate market
  catalogs. This pass reconciled the known Goa omission in Dart, but no
  enforcement prevents recurrence. Generate them from one source or add a
  strict parity scanner.
- `LOC-ARCH-002` — Explore uses Firestore-backed `cityListProvider`, while
  profile and host pickers still use compiled `defaultCityOptions`. Converge
  selection and display on one merged configured-catalog provider with a
  bundled offline fallback.
- `LOC-ARCH-003` — low-accuracy discovery and high-accuracy check-in use two
  Geolocator facades, and initialization is session-scoped rather than keyed by
  user and purpose. Introduce purpose-aware snapshots, TTL/refresh policy, and
  auth-safe async write guards before consolidating the facades.
- `LOC-ARCH-004` — `LocationPickerScreen` owns debounce, request, and stale
  completion state inside a widget. Move it to an auto-dispose controller with
  generation ids before expanding Places behavior.
- `LOC-ARCH-005` — profile updates validate the market-id shape but not catalog
  membership. Validate against the configured selectable market universe at
  the callable boundary.

These are follow-up migrations, not reasons to replace canonical ids with
labels at rest.

## Implemented in This Pass

### Canonical city display repair — 2026-07-13

- Preview, Catches, and Public Profile now resolve canonical profile city ids
  at their shared `ProfileSurface` presentation boundary.
- Host organizer metadata, host metadata rows, and club profile fields resolve
  canonical club locations to labels. The inline city editor exposes choices
  as labels while continuing to submit canonical market ids.
- The Dart fallback catalog now includes the Goa identity already present in
  Functions and Node tooling, so `in-ga-goa` and its Panaji aliases resolve to
  `Goa` offline as well.
- Regression coverage proves `in-dl-delhi-ncr` renders as `Delhi NCR` and never
  as `IN-DL-DELHI-NCR` across the shared profile modes and host surfaces.

### Explore map hardening — 2026-07-13

- Production Explore uses native Google tiles and a centrally owned muted map
  style; fake map geography was removed from the deterministic fixture.
- The distance control preserves `ANY`, asks for location only after an
  explicit tap, and then cycles through the supported radius values.
- Native circles, projected branded ring labels, user-location dots, custom
  activity pins, app-owned cluster counts, and overview camera fitting share
  the same coordinate model.
- The Explore feed opens the map through a reduced-motion-aware paper-veil
  reveal rather than a generic horizontal push.
- Internal and reviewed external event supply share the map-pin contract;
  external pins keep their own identity and open their source instead of being
  fabricated as Catch events.
- Zero results no longer replace the map with a dead empty page. The map and
  distance ring stay mounted with `1 → 3 → 5 → 10 km → Show all` recovery.
- The floating Map launcher appears only when positive mapped supply is loaded.
- Event and external-event coordinates are non-null in the app domain. Create,
  update, discovery, and check-in enforce the same exact-location invariant.
- Dev data was refreshed to future supply and verified at 146/146 structured
  event locations with zero market/discovery repairs remaining. Production was
  audited read-only and has nine historical records needing manual resolution.

- New run creation now requires `startingPointLat` and `startingPointLng` in the
  Flutter controller and in the `createRun` Cloud Function schema.
- Create-run UI now marks the map pin as required and blocks progression until
  the host pins an exact starting point.
- New run documents now store non-null starting coordinates.
- Legacy event mirrors are promoted only when both exact coordinates and a
  non-empty meeting-point name are valid; otherwise decoding fails closed.
- Run detail location taps now open an in-app run location preview; the preview
  has an explicit Google Maps directions CTA.
- Event Detail required exact locations render a real Google map tile through
  `MapPreview`; the caption/action row stays outside the map viewport, and
  deterministic tests use the neutral no-network fixture instead of painted
  fake geography.
- Payment confirmation directions share the same Google Maps directions URL
  helper.
- `flutter_map` has been removed from `pubspec.yaml`; map rendering now goes
  through Google Maps SDK for Flutter.
- The location picker now supports Google Places-backed search, with
  Autocomplete session tokens and India-biased results.
- Google Places API keys stay server-side in Firebase Secret Manager; the app
  does not ship a Places web-service key.
- Participant self-check-in now opens 10 minutes before the run, closes 30
  minutes after the run start, and keeps the 200 m maximum distance.
- Check-in location permission failures now surface clear user-facing guidance
  for disabled services, denied permission, and permanently denied permission.
- Public profile exact coordinates have been removed from the Dart model,
  Firestore TypeScript contract, and `syncPublicProfile` projection.
- Removing legacy `latitude`/`longitude` fields from existing `publicProfiles`
  docs is moot under wipe-and-reseed; its one-off script is retired.
- `latlong2.LatLng` has been removed from app-facing code and the dependency
  graph; SDK-specific coordinate types now stay at Google Maps adapter edges.
- `tool/firebase/validate_google_maps_config.mjs` validates dev/staging/prod local Maps
  SDK config for iOS and Android without printing secrets. It can also validate
  the server-side `GOOGLE_MAPS_PLACES_API_KEY` Secret Manager value with
  `--include-places-secret`, including rejecting accidental `keyString:`
  wrappers and making a small Places Autocomplete probe.
  `tool/flutter_with_env.sh` runs native key validation before native run/build
  commands.
- Native iOS and Android key loaders defensively trim the accidental `keyString:`
  wrapper so local key copy/paste mistakes fail less mysteriously.

## Google Maps Usage Tiers

As of the 2025 Google Maps Platform pricing model:

- Essentials SKUs generally include 10,000 free billable events per SKU per
  month.
- Pro SKUs generally include 5,000 free billable events per SKU per month.
- Enterprise SKUs generally include 1,000 free billable events per SKU per
  month.
- Essentials Map Tiles APIs are documented separately as up to 100,000 free
  calls per SKU per month.
- Google replaced the old USD 200 monthly credit with per-SKU monthly free
  usage caps.
- India billing can have reduced INR pricing for eligible India-based customers
  with primary India usage.

References:

- https://mapsplatform.google.com/pricing/
- https://developers.google.com/maps/billing-and-pricing/overview
- https://developers.google.com/maps/billing-and-pricing/india

## Recommended Provider Direction

- Use Google Maps SDK for Flutter for in-app maps.
- Use Google Places API (New) through callable Functions for meeting-point
  autocomplete and place details.
- Continue using external Google Maps URLs for turn-by-turn directions instead
  of building route rendering into Catch. In-app map previews should show the
  destination; routing belongs in Google Maps.
- Set API quotas and billing alerts before enabling any paid map provider.

## Google Cloud Setup Required

1. Attach billing to each Google Cloud project backing the Firebase
   environments you want to run with real maps.
2. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (New)
3. Create an Android-restricted Maps SDK key:
   - API restriction: Maps SDK for Android only.
   - App restriction: Android apps.
   - Add the Catch package names and signing certificate SHA-1s for debug,
     upload, and release builds.
   - Put the key in each app's `apps/<role>/android/local.properties` as
     `GOOGLE_MAPS_ANDROID_API_KEY=...`, or provide the same value as an
     environment variable in CI.
4. Create an iOS-restricted Maps SDK key:
   - API restriction: Maps SDK for iOS only.
   - App restriction: iOS apps.
   - Add each Catch bundle ID used by dev, staging, and prod.
   - Copy `apps/<role>/ios/Flutter/GoogleMapsKeys.xcconfig.example` to
     `apps/<role>/ios/Flutter/GoogleMapsKeys.xcconfig` and set the environment-specific
     entries `GOOGLE_MAPS_IOS_API_KEY_DEV`,
     `GOOGLE_MAPS_IOS_API_KEY_STAGING`, and
     `GOOGLE_MAPS_IOS_API_KEY_PROD`.
5. Create a server-side Places API key:
   - API restriction: Places API (New) only.
   - Do not put this key in Flutter, Android, or iOS config.
   - Store it as a Firebase Functions secret:
     `firebase functions:secrets:set GOOGLE_MAPS_PLACES_API_KEY`.
   - Store only the raw `AIza...` key. Do not paste a plist-style
     `keyString:` wrapper.
   - Validate the deployed project before debugging the app:
     `node tool/firebase/validate_google_maps_config.mjs --env dev --platform ios --include-places-secret`.
6. Set conservative quotas before TestFlight:
   - Maps SDK daily map-load quota per project.
   - Places Autocomplete request quota.
   - Place Details request quota.
   - Billing budget alert at a low threshold, plus a second alert at the
     maximum monthly amount you are willing to spend during beta.
7. Deploy Functions after setting the secret so `placesAutocomplete` and
   `placeDetails` can start.

## Remaining Implementation Plan

### Phase 1: Privacy Boundary

- Decide whether swipe cards should show no location copy, city-only copy, or a
  coarse same-city/nearby-city label.
- Define `prefsShowOnMap` precisely or rename it if it does not control a real
  public map surface.

### Phase 2: Location Module

- Move location code into a dedicated `lib/location` feature.
- Add `LocationSnapshot`, `ApproximateLocation`, and `LocationPurpose` domain
  types.
- Centralize Geolocator usage in one `LocationRepository`.
- Add TTL/refresh policy:
  - low accuracy for city detection and map centering,
  - high accuracy only for check-in,
  - no background tracking,
  - manual refresh affordance.

### Phase 3: Run Location Quality

- Store the selected provider place id when available.
- Store display address separately from host-written meeting instructions.
- Validate run coordinate ranges in Firestore rules and callable schemas.
- Consider making host run edits require a pinned location before schedule or
  location changes are saved.

### Phase 4: Check-In Hardening

- Keep server-side check-in distance validation authoritative.
- Log check-in failure reason categories without storing raw coordinates in
  analytics.
- Add abuse controls for repeated failed check-ins.
- Keep host manual attendance as an override for edge cases.

### Phase 5: Maps Productionization

- Keep Google Maps as the production map provider unless product requirements
  force a provider change.
- Keep Google Maps SDK keys in environment-specific native config, and validate
  the server-side Places secret with
  `tool/firebase/validate_google_maps_config.mjs --include-places-secret` before
  TestFlight or device QA.
- Add budget alerts, quota limits, and release checklist items.
- Maintain `enableNetworkTiles: false` fixtures for deterministic Widgetbook,
  widget-test, and capture rendering, plus integration QA for real map tiles on
  configured devices.

## Current Maps And Demo-Data Readiness

The retired transient maps/demo tracker has been folded into this document and
`docs/demo_data_seeding.md`.

Completed:

- Dashboard map view, create-run pin picker, Event Detail compact preview,
  run-detail location preview, and payment-confirmation directions all use the
  Google Maps stack.
- Native iOS/Android Maps config is validated by
  `tool/firebase/validate_google_maps_config.mjs`, and `tool/flutter_with_env.sh` runs
  that validation before native run/build commands. Places secret validation is
  opt-in with `--include-places-secret` because it requires `gcloud` access to
  Secret Manager and a live Google Places probe.
- Active source/config no longer depends on `flutter_map`, OpenStreetMap, or
  `latlong2` app-facing coordinate types.
- Seeded runs use curated venue coordinates and validation rejects missing or
  drifted active run coordinates.
- Demo ops validation reports upcoming mapped runs and check-in-window
  signed-up runs.
- Active app models now store city/location as string ids backed by Firestore
  city config plus `city_catalog.dart` fallbacks.
- On 2026-07-13, an iPhone 17 simulator running iOS 26.5 loaded real Google
  tiles with the muted Catch style, four byte-backed activity pins, selected-pin
  flag interaction, a metre-accurate 3 km circle, its projected branded edge
  label, and accessible native event-marker descriptions.

Still open:

- Keep improving check-in-specific demo data so each anchor demo account can
  reliably test a location-gated run.
