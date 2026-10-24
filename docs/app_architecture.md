---
doc_id: app_architecture
version: 1.85.0
updated: 2026-10-24
owner: app_architecture
status: active
---

# Catch App Architecture

This is the canonical architecture spec for Catch's Flutter app code under
`lib/`. It defines feature structure, screen ownership, controller/view-model
boundaries, repository access, async state handling, error surfacing, widget
ownership, enforcement, and migration policy.

Use this document first when changing app architecture. It is the single active
home for controller, UI layout, and error architecture guidance. If a durable
rule belongs to app code organization, put it here. Keep only narrow generated
inventories, implementation plans, or domain-specific contracts elsewhere.

## Sources Consolidated

This spec consolidates and normalizes guidance from:

- `lib/README.md`: feature-first folder structure.
- `PROJECT_CONTEXT.md`: current product/route/code map.
- historical controller/view-model guidance: action, flow, async, view-model
  provider patterns, and realtime stream lifecycle.
- historical error architecture guidance: app error taxonomy, branded error
  surfaces, mutation errors, operation context, scanner policy, and global
  reporting.
- historical UI architecture guidance: screen padding, sliver/scroll ownership,
  token tiers, sizing rules, design-tool boundaries, and analyzer-plugin policy.
- `docs/widget_catalog.md`: widget ownership, primitive governance, public
  widget catalog, and private-helper remediation.
- `tool/policy/rules.json`: active enforceable rules such as
  `ASYNC-UI-001`, `CONTROLLER-BOUNDARY-001`, `PROVIDER-SEAM-001`,
  `ERROR-UI-001`, `MUTATION-ERROR-SURFACE-001`, `PENDING-SNAPSHOT-001`,
  `EXTERNAL-SIDE-EFFECT-001`, `UI-LINT-001`, and
  `WIDGET-CATALOG-001`.

## Quick Decision Layer

Answer placement, naming, and completion questions here first; the rest of
this document is the detailed contract behind each row. Ratified 2026-09-04 by
`docs/plans/ui_system_blueprint_and_conformance_audit.md` (D1–D8), which owns
the delivery program that moves L0–L4 into workspace packages. Keep this
section under 120 lines.

### Component ladder

| Level | Name | Contents | Home today | Target home | May depend on |
|---|---|---|---|---|---|
| L0 | tokens | scale values, semantic roles | `packages/catch_tokens` | unchanged | Flutter SDK only |
| L1 | foundations | theme wiring, typography, icons, motion | `packages/catch_ui/lib/src/foundations` | unchanged | L0 |
| L2 | primitives | one visual job: text, surface, icon, gap, tap target | `packages/catch_ui/lib/src/primitives` | unchanged | L0–L1 |
| L3 | components | reusable slot-based assemblies: button, field, section, tile, banner, sheet, states | `packages/catch_ui/lib/src/components` | `packages/catch_ui` | L0–L2 |
| L4 | patterns | page-scale skeletons: scaffolds, section pages, tab scroll views, form-row orchestration, skeletons | `packages/catch_ui/lib/src/patterns` | `packages/catch_ui` | L0–L3 |
| L4a | riverpod adapters | `CatchAsyncBoundary`, mutation error family, provider-backed notices | `lib/core/riverpod_ui/**` | `lib/core/riverpod_ui/` | L0–L4 + Riverpod |
| L5 | feature UI | arranges L2–L4 components and binds domain data to their props; draws nothing itself (D18) | `lib/<feature>/presentation/widgets/**` | unchanged | L0–L4 + own feature |
| L6 | screens | route wiring, providers, controllers, navigation | `lib/<feature>/presentation/**` | unchanged | everything below |

Shared foundations are imported through `package:catch_ui/catch_ui.dart`.
The package owns its branded fonts and licenses and depends only on Flutter,
`catch_tokens`, Phosphor, and `skeletonizer` pinned to 2.1.3. Loading wrappers
use Skeletonizer as their single engine for explicit shapes and real-layout
skeletons, with shared token colors, timing, effect, reduced-motion handling,
and loading semantics. The separate `shimmer` package is removed in the same
migration. Engine imports remain internal to `catch_ui`. `AppTheme` remains
an app adapter that adds the activity-domain palette to `CatchTheme`; it does
not define another theme.
The field API, form editors, constraints and input-bound policies live in
`catch_ui`. Typed choices use named constructors such as
`CatchField<T>.choices`; record configuration preserves const construction and
one keyed widget identity. The one-file D6 budget exception belongs only to
its constructor facade; state and renderers retain the ordinary size limit.
App-generated schema constants supply their concrete paths and values; callers
retain localized validation copy and save orchestration.
`CatchLocalizedErrorState`, scaffold, sliver and inline adapters map app errors
and inherited-locale copy onto the shared error family. Shared retry actions
receive a resolved `retryLabel`; explicit recovery callbacks stay authoritative.
`CatchTabViewportScope` owns route-neutral active-page and bottom-obstruction
metrics for shared layouts. App tab identities and route selection stay in the
app; anchored, floating, and absent bars keep their existing clearance rules.
`CatchBanner.statuses` and its publication scope own persistent header rendering;
`CatchScaffold` owns the Material surface, safe area and keyboard resize
in the shared package. Connectivity and rehearsal state remain app callers.

### Placement decision tree

1. Reads providers, mutations, or routes? → L6 screen, or L4a when it is a
   reusable Riverpod translation of an L2–L4 surface.
2. Draws anything (surface, border, clip, paint, image, icon, text style, tap
   feedback)? → L2–L4 in `catch_ui` with a registry entry and tier, even when
   one place uses it (T4 when only one surface does). D18: the library
   draws; features arrange and bind. Check `docs/widget_catalog.md`,
   Widgetbook and registry aliases first. A name, alias or role-noun match
   needs `comparedWith` and a reason, or the new thing is a recipe of the
   existing component.
3. API names a domain concept (event, organizer, profile, roster)? → an L5
   binding or L6 screen that maps the domain data onto a domain-free L2–L4
   component (poster, polaroid, ticket) and draws nothing.
4. Otherwise → the smallest layer that owns the job, arranging library
   components with the framework's layout widgets and token spacing.

### Naming grammar (summary — the Naming Grammar section below is binding)

- `Catch[<UseCase>]<RoleNoun>` is reserved for L0–L4a; public feature widgets
  are `<Feature><RoleNoun>`; `_Private` widgets only in L5, where they arrange
  and bind like any feature widget (D18).
- Use the same name for the same responsibility. A qualified use case must
  record its concrete distinction from the nearest existing contract in the
  registry; a new ID or implementation technique does not establish one.
- Variant axes are enums `<Component><Axis>` with axis vocabulary
  `Variant|Size|Tone|Emphasis|Status|Placement|Mode`; a third boolean
  constructor parameter forces an enum.
- Files: snake case of the primary class, suffix vocabulary
  `_screen|_controller|_view_model|_state|_repository|_service|_providers`
  or a role-noun widget suffix; one primary public widget per shared-library
  file.
- Name a widget what an agent that has never seen it would write; record the
  other likely names as registry `aliases` so the new-widget gate can point
  at it.
- Cross-framework: a registered concept keeps the same symbol and prop names
  in Flutter and React (`CatchButton`, `variant`, `onPressed` in both); no
  surface name (`Admin`, `Website`, ...) on a shared component. The registry
  `tier` (T1–T4, `design/components/README.md`) decides which frameworks must
  implement it.

### Migration Protocol v2 (a slice is done only when all five hold)

1. Inventory first: a deterministic scanner defines the call-site set before
   work starts; its zero-count is part of the definition of done.
2. The old thing is deleted in the same slice; workspace-wide analyze green
   is the completion proof. Deprecation never crosses a slice boundary.
3. Ratchets move in the same PR, never a follow-up.
4. New rules ship with seeded probes; `info` staging only over a real
   violation pile, promoted within the phase.
5. The catalog moves with code: Widgetbook cases, goldens, and registry rows
   for touched shared components update in the same PR.

An `aligned` claim in `tool/architecture/pattern_adoption.json` must name its
machine check or carry an explicit manual-review line with reviewer and date.

## Canonical Decisions And Overrides

This section is intentionally explicit so architecture decisions stay in one
place.

### Organizer Domain Cutover

The consumer and Hosts apps treat `Organizer` as the product entity and `club`
as one organizer subtype. Primary repository reads use `organizers`,
`organizerFollows`, and organizer-named callables; events carry
`organizerId`; organizer media uploads use `organizers/{id}`; public/detail and
Hosts routes use `/organizers` and `/host/organizers`. The retired
`/host/clubs` and `/host/organizers/:clubId/edit` locations are not mounted or
redirected. Current Flutter repositories never fall back to the legacy `clubs`
collection; a canonical read failure remains visible and recoverable through
the shared async error policy.

The Hosts owner can edit the required `organizerType` field using the closed
taxonomy `club`, `community`, `individual`, `eventProducer`, `venue`, and
`brand`. Managers do not own this classification change. Generic visible copy
must say organizer/follow rather than club/join; “Club” remains valid only as
the label for the `club` subtype or as specific real-world content.

Host organizer/event galleries use one scalable ordered-media editor in create
and edit flows. The inline surface previews the explicit cover and a short
thumbnail rail; the full-screen manager owns long-list scrolling, set-cover,
reorder, remove, add-more, and the organizer media transaction's explicit
Save/Discard actions. Edit Organizer's compact logo and add tiles only enter
that manager; closing it without saving rolls the caller-owned draft back.
Host code must not reuse the Consumer profile six-slot cap. Organizer logo
state is a separate optional mutation, and event creation displays that
inherited identity without treating it as event gallery media.

The Host team Preview tab projects `HostProfile` plus the host's organizer
memberships. It must not query or render the consumer dating profile: a valid
professional host identity can exist without a discoverable consumer profile.

Organizer and external-event action rendering consumes
`OrganizerSupplyCapabilities`; claim state or provenance alone never enables
an action. Unclaimed supply removes booking, payment, waitlist, and host-contact
widgets from composition rather than merely disabling them. Its review
eligibility is `after_event_end`, but the actual review submission affordance
and authority for passed external events is a named app-team dependency. Until
that dedicated flow exists, the app may expose eligibility in domain state but
must not route the user into a generic or fabricated review workflow.

`lib/organizers/` is the canonical import surface. Existing `Club` Dart model,
repository, provider, and `lib/clubs/` filenames are transitional aliases for
binary/source compatibility and may not justify new club-specific persistence,
routes, or copy. Their removal follows the remote parity and released-client
window in `docs/migrations/clubs_to_organizers.md`.

1. Keep the canonical feature folder shape as `domain`, `data`, and
   `presentation`. Do not rename `data` to `repositories`.

2. A data-using screen does not have to use `CatchAsyncBoundary` directly.
   It does have to use a named async state boundary: `CatchAsyncBoundary`,
   `CatchAsyncBoundary.sliver`, or a feature-owned typed UI-state adapter.

3. Widgets should not read repository providers directly. Plugin, platform, and
   local side effects must go through a provider, controller, repository, or
   service seam with a test replacement path.

4. Do not ban `StatefulWidget`. Use it for Flutter mechanics. Use controllers
   or view models for durable product state, async data, mutations, validation
   that changes product behavior, repository calls, and cross-widget
   coordination.

5. Domain/use-case classes are optional, not ceremony. Use them when business
   logic is shared, complex, or independently testable. Do not create a use
   case for every button tap.

6. Loading, error, empty, skeleton, and tab-body widgets are not screens unless
   they are themselves route-level or major navigable surfaces.

7. The old project context names some pre-migration error files. The current
   error owner is this document; app-facing errors must use the
   `CatchErrorState` family, `CatchLocalizedErrorBanner.mutation`,
   `listenToCatchMutationErrors`, or `showCatchNoticeError` as appropriate.

8. Private helper widgets are not an acceptable long-term destination for
   reusable UI. A widget must be public and catalogable, merged into a canonical
   primitive, or inlined/deleted. Tiny private `State<T>` classes and private
   implementation helpers are fine when they are not standalone render
   components.

## Architecture Doctrine

Catch uses feature-first architecture with unidirectional data flow.

The normal flow is:

```text
User input
  -> screen/widget callback
  -> controller or view-model command
  -> repository/service
  -> backend/platform/local source
  -> repository provider
  -> view model / typed UI state
  -> screen async boundary
  -> feature/core widgets
```

Each layer should have one clear job:

| Layer | Owns | Does not own |
|---|---|---|
| `domain` | Freezed models, enums, value objects, pure business rules, domain validators, deterministic projections | Flutter widgets, Riverpod providers, Firebase SDK calls, platform plugins |
| `data` | Repositories, Firebase adapters, local/platform services, data providers, normalization at backend/plugin boundaries | Screen layout, navigation widgets, feature UI copy decisions except mapped error copy owned by core error utilities |
| `presentation` | Screens, controllers, view models, typed UI state, feature widgets, form and interaction wiring | Raw Firebase calls, repository implementation details, cross-feature persistence rules |
| `core` | App shell, routing primitives, design tokens, shared widgets, error utilities, analytics/logging seams, cross-feature platform services | Feature-specific product policy unless it is genuinely global |

The rule is not "more layers are always better." The rule is "state and side
effects have one predictable owner."

## Feature Folder Contract

Most app features should use this shape:

```text
lib/<feature>/
  domain/
    <model>.dart
    <value_object>.dart
    <pure_policy>.dart
  data/
    <feature>_repository.dart
    <feature>_service.dart
    <feature>_providers.dart
  presentation/
    <surface>_screen.dart
    <surface>_controller.dart
    <surface>_view_model.dart
    <surface>_state.dart
    widgets/
      <surface>_<role>.dart
```

Small features do not need every file. A feature may have only a repository and
one screen if the behavior is simple. Large features may split by surface under
`presentation/`, but should keep route-level screens easy to find.

The authenticated Host app applies the same rule below its product domain. Its
five global destinations are feature boundaries, not modes of one Home screen:

```text
lib/hosts/
  today/{domain,data,presentation}
  events/{domain,data,presentation}
  audience/{domain,data,presentation}
  inbox/{domain,data,presentation}
  organizer/{domain,data,presentation}
```

The reviewed responsibility source for those five destinations is
`design/features/host_feature_responsibilities.json`. It generates a local
`README.md` at each target root and cross-checks the Host shell order, typed
routes, existing feature-contract action owners, Dart symbols, specialist data
contracts, and focused tests. Edit the machine-readable source and regenerate;
do not hand-maintain five summaries. A generated README may name legacy current
roots while a destination is migrating, but that status is not permission to
add new destination-owned behavior to the legacy aggregate.

Only create a layer when the destination has an owner for it. Shared event,
organizer, roster, or shell behavior must live with its real authority and may
be consumed across these destination folders; destination presentation code
must never become the persistence owner merely because two tabs display the
same entity.

Files under `lib/**/presentation/**` ending in `_state.dart` are provider-free
display adapters by naming convention. They may depend on domain/core/value
types and `CatchAsyncState`, but they must not import Riverpod, declare
providers, or call `ref.watch/read/listen`; provider-owned composition belongs
in a neighboring `_view_model.dart`, `_controller.dart`, or route screen.
When a route edge translates Riverpod `AsyncValue` into `CatchAsyncState`, it
must use `catchAsyncStateFromAsyncValue` from
`lib/core/riverpod_ui/catch_async_value_adapter.dart`. That adapter preserves
the exhaustive presentation phase: initial loading, retrying, data,
refreshing data, stale data with an error, or terminal error. A loading retry
without credible data always renders loading, never its previous error.

Allowed exceptions:

- `lib/core/**` for app-wide primitives, theme, shared widgets, global app
  shell, shared services, and error/logging infrastructure.
- `lib/routing/**` for GoRouter configuration and route-path constants.
- `lib/exceptions/**` for app exception and logging infrastructure.
- `lib/firebase_options_*.dart` and generated config files.
- Intentional in-development feature folders documented by audit rules, such
  as `event_policies` and `event_success`.

### Event Dress Rehearsal Boundary

`lib/event_rehearsal/` is the first-class Host practice capability. Its two
Host routes create a room and operate preparation, virtual live controls,
synthetic guest behavior, issue simulation, and recap. The feature follows the
ordinary domain/data/presentation split, owns one Functions repository and one
Riverpod action controller, and is registered as
`screen.host.event.rehearsal` plus `feature.event_rehearsal`.

The rehearsal may copy bounded descriptive fields from a real event once at
creation, or use a safe sample. After that snapshot it must not call an Event,
participation, CRM, messaging, payment, matching, or Event Success mutation
repository. Setup becomes immutable after start. Runtime changes are
revision-fenced, carry client action ids, advance a virtual clock, and operate
only on seeded synthetic actors. Internal transport/data faults require the
server's internal/admin capability; normal Hosts always retain the product
behavior scenarios.

The Host console receives only the rehearsal projection and an opaque public
guest URL. `/rehearse/:publicRehearsalId` is a separate React surface that
redeems a deterministic browser slot without Auth or OTP and can mutate only
that slot's synthetic actor. A persistent practice banner is content, not an
unavailable menu row. Reset preserves the seed, fork preserves the original,
and reproduction export contains bounded setup, actor, revision, and action
history rather than production identifiers or PII. Direct Firestore access to
all rehearsal collections remains denied.

### Exhibit ARCH-ROUTER-LIFECYCLE-001: App Router And Integration-Test Lifecycle

`goRouterProvider` owns both its `GoRouter` disposal and a fresh set of
`GlobalKey<NavigatorState>` instances for that provider-container lifecycle.
Navigator keys must not be file-level singletons: a disposed app/test container
must be able to mount a new router without retaining navigation state.

App-shell integration suites use keyed `ProviderScope` roots, bounded frame
advancement, and deterministic repository/provider overrides. They run through
the wrappers in `test/integration/` for the complete headless CI pass; the
original `integration_test/` files provide a bounded hosted native smoke and
remain the explicit entrypoints for a full selected-device pass. Do not use
`pumpAndSettle` or process event-queue drains while the mounted app owns timers.
Do not add an asynchronous localization delegate when the requested behavior is
already the component's nonlocalized fallback.

<!-- exhibit-freshness: ARCH-ROUTER-LIFECYCLE-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Do not create parallel top-level folders such as `services`, `repositories`,
`view_models`, or `widgets` for feature-owned code. If code is genuinely shared,
move it to a clear `core` owner or a domain-specific shared feature with a doc
entry.

### Current Boundary Cleanup Baseline

The first folder-boundary cleanup applied after this spec uses these owners:

- App analytics instrumentation lives in `lib/core/analytics`, not a top-level
  `lib/analytics` feature.
- Explore search lives under `lib/explore/data`; it is part of the Explore
  aggregate surface, not a standalone `search` feature.
- The calendar route lives under `lib/events/presentation/calendar` because it
  is an event agenda surface. Do not recreate top-level `lib/calendar`.
- Chat and host-inbox list UI lives under `lib/chats/presentation/inbox`.
  `lib/matches` remains responsible for match lifecycle data/domain behavior and
  match-specific presentation such as the celebration dialog.
- Event formatters, arrival policy, QR payloads, map links, calendar links,
  invite/share copy, and check-in location services live in `events/domain` or
  `events/data` according to whether they are pure logic or service seams.
  They should not be imported from `events/presentation`.
- Shared activity/event visual primitives used by core widgets live in
  `lib/core/widgets`, not under `events/presentation/widgets`.
- Club display-name lookup is a data/provider seam in `lib/clubs/data`.

### Explore discovery scope and filter boundary

Explore display models are split by responsibility: `explore_screen_state.dart`
owns route branches and empty recovery; `explore_chrome_state.dart` owns search,
city and map-launcher display; `explore_filter_state.dart` owns filter choices
and live counts; `explore_event_display_state.dart` and
`explore_club_display_state.dart` own event and organizer labels;
`explore_mixed_feed_state.dart` owns feed ordering and grouping. These libraries
accept plain values and keep provider reads in the route boundary.
The screen mounts `ExploreScreenEmptyState`, `ExploreClearButton`, and
`ExploreFeedSkeleton` from their component files; empty-state callbacks and
loading shapes retain their existing contracts.
`explore_feed_view_model.dart` owns feed values and cover selection;
`explore_feed_providers.dart` owns Riverpod reads, discovery orchestration, and
recommendation loading. Screens import the provider seam explicitly.

Explore's visible date strip is an intent selector, not a set of overlapping
weekly taxonomies. `Tonight`, the next six local dates, and `Any` are the only
production strip options. The bounded date options share one seven-day
discovery request; the feed view model filters that cached supply in memory and
publishes per-date density counts. Counts use a `+` suffix whenever the cursor
window is not exhaustive. `Any` keeps the accumulated cursor path. Pull refresh
and tab re-entry invalidate the shared Explore clock snapshot before rebuilding
the request, keeping query bounds and visible labels aligned across midnight.

`ExploreScreen` remains the provider boundary for the filter sheet. It watches
the current filter selection and feed while the sheet is open, then passes a
plain `ExploreFilterSheetState` into the provider-free rail/sheet widgets. The
map distance ring and sheet distance choice both mutate
`exploreFiltersProvider`; do not introduce a map-only distance state. Distance
is labeled as events-only because club cards do not own exact coordinates.
Empty-market recovery reuses the same provider-free city picker sheet as the
header trigger.

Cover promotion is a separate display decision from feed ordering. Resolve the
cover through `selectExploreFeaturedEventId`, which reuses recommendation
ranking, prioritizes joinable availability plus bounded attendance strength,
and excludes hosted, joined, blocked, ineligible, cancelled, and past supply.
Store the selected id on `ExploreFeedViewModel`; never infer the cover from
`items.first`, and never remove the promoted event from the chronological body.
Cover copy may describe only the next detail-page action available to that
viewer; it must not promise a booking or waitlist mutation that the CTA does not
execute.

Explore social proof must not create profile reads per event row. The discovery
ticket may render `signedUpCount` through veiled activity avatars using the
shared Event Detail privacy contract. Cross Paths consumes a single private,
server-owned batched suggestion response that revalidates layered consent,
showcase eligibility, reciprocal preferences, safety, actionable event state,
and exposure caps. `ExploreScreen` treats that response as optional enrichment:
errors, unknown versions, expired tokens, search, map, or missing event matches
resolve to no identifiable people without blocking the event feed. Consent
documents remain permission inputs and are never queried as a roster or direct
suggestion source. Organizer cards may reuse already-loaded organizer-manager
and aggregate rating data through shared identity atoms.

## Dependency Direction

The allowed dependency direction is:

```text
presentation -> domain
presentation -> core
presentation -> own feature controller/view-model/state/widgets
presentation -> data only through approved provider/controller seams

data -> domain
data -> core backend/error/logging/config seams
data -> Firebase/platform/local APIs

domain -> Dart/Freezed/json helpers only
core -> lower-level platform/framework APIs and explicit feature-neutral types
```

Hard rules:

- `domain` must not import Flutter, Riverpod, Firebase, platform plugins, or
  feature presentation files.
- `data` must not import feature presentation files.
- `presentation/widgets/**` must not call repository methods or watch
  repository providers directly.
- Aligned adopters whose architecture-tracker role declares provider-free body
  or state behavior are machine-checked by
  `node tool/architecture/check_adopted_architecture_boundaries.mjs`; do not
  mark a file aligned/provider-free until routing and provider APIs have been
  lifted to the route/controller boundary.
- A route-level `*_screen.dart` may watch a feature view model or controller
  provider, and may watch mutation state for display. It should not reach
  around those seams into repositories.
- Cross-feature reads must go through a named provider/view-model/repository
  seam or an explicitly sanctioned presentation seam. Do not deep-import
  sibling feature presentation internals. Sanctioned presentation seams are:
  (a) a sibling feature's public controller (`presentation/*_controller.dart`)
  imported from a route-level `*_screen.dart` or another `*_controller.dart`;
  and (b) symbols exported by the sibling feature root barrel
  (`lib/<feature>/<feature>.dart`). Every feature-root barrel export of a
  `presentation/` file must carry a same-line or previous-line
  `// public-api:` annotation explaining why that symbol is public. Widgets,
  state adapters, domain files, data files, and arbitrary presentation helpers
  do not get the direct-controller-import carve-out.
- Firebase SDK types are not a domain contract. New domain files must stay pure
  Dart plus approved annotation/value packages. Firestore, Auth, Functions,
  Storage, Remote Config, App Check, and plugin-specific types belong in
  repository/data boundaries or feature-neutral adapter seams that keep those
  SDKs out of domain models and validators.
- Domain serialization that still needs Firestore `Timestamp` handling routes
  through `core/firestore_converters`. Existing direct Firebase imports in
  domain are ratcheted debt in
  `tool/architecture/dependency_direction_baseline.json`; new domain code must
  not add them. The long-term target is no Firebase API calls or Firebase types
  in domain signatures. Full DTO purity is not the target by default.
- Platform/plugin effects such as URL launch, share, image picker, location,
  calendar, clipboard, haptics, notifications, and connectivity need a seam
  that tests can replace.

Temporary exceptions require an override comment described in
`Enforcement And Overrides`.

## Provider Topology Graph

Riverpod topology is a live checked source contract, not a committed diagram or
snapshot. `tool/architecture/provider_graph.dart` parses handwritten Dart
sources and derives the complete provider, family, consumer, override, alias,
Mutation, and dependency inventory when the gate runs.

Use these commands after adding, removing, renaming, or changing dependencies
of a provider:

```sh
dart run tool/architecture/provider_graph.dart --check
dart run tool/architecture/provider_graph.dart --summary
dart run tool/architecture/provider_graph.dart --json
```

`tool/architecture/provider_graph_reviews.json` owns explicit decisions for
cross-feature edges, high-fan-out providers, aliases, and intentional manual
provider exceptions; it is the only durable provider-graph evidence stored in
the repository. The check rejects dangling or duplicate provider nodes,
unresolved internal references, reactive cycles, unreviewed candidates, and
stale review decisions. Full JSON and compact summary output are deterministic,
read-only, and created only on demand or as ephemeral CI evidence. Feature-owned
async providers should follow the generated family reference in
`ARCH-PROVIDER-CODEGEN-001`; manual providers require an exact reviewed
exception rather than an implicit allowlist.

The graph also derives responsibility review candidates from class ancestry and
AST callsites: Listenable state owners (including inherited ChangeNotifier and
ValueNotifier types), provider wrappers around them, direct repository
construction by reactive owners, widget repository/backend reads, and widget
completion state around awaited business seams or declared Future callbacks.
Named constructors, import prefixes, local provider aliases, and extension
methods in URI-linked part files retain their exact owner/operation identity.
A `*_controller.dart` filename does not exempt a widget or reactive owner.
Generated repository function factories and pure orchestration helpers are
different responsibilities; Firebase Auth current-user reads may be legitimate
account-currentness fences. Consumer inheritance alone proves no boundary.

Ownership decisions in `provider_graph_reviews.json` name the exact candidate
id, path, symbol, operation, observed `maxCallsites`, and rationale. A new symbol
in a reviewed file, a same-count operation replacement, or added callsites
requires a new review. Remove stale decisions and lower the ceiling when debt
shrinks. `planned` means confirmed debt with a stable task id; `watch` means an
unresolved signal whose changed fields and caller contract still need review.
Neither disposition claims compliance. Use `accepted-exception` only for a
named mechanical/framework/service responsibility, such as the router
Listenable bridge. Do not generate approvals from counts or use directory,
filename, or whole-file ownership exceptions. Manual provider declarations in
`dependency_direction_baseline.json` likewise require their exact symbol and
canonical builder operation; the reviewed private Host family and Programs debt
do not admit another declaration in the same file.

This is a parsed-source review gate, not whole-program type/flow analysis.
Dynamic dispatch, typedef/tear-off callback aliases, re-export-only ancestry,
named-library parts, and callbacks delegated through unrelated helpers still
require manual responsibility review. It inventories concrete operations, not
all loading flags or listeners. A syntax match requires classification; passing
the graph does not certify lifecycle/currentness or erase recorded debt. It
scans `lib/**` excluding `.g.dart` and `.freezed.dart`; its source-file total
still includes generated SDK/localization files with other names and is not the
audit's production denominator. Tests, packages and vendored package sources
are outside this graph's roots; package-local primitives need focused review.

## Screen Definition

A screen is a route-level or major navigable surface. A screen file normally
ends in `_screen.dart`.

A `FeatureScreen` owns:

- route parameters and route `extra` parsing;
- `Scaffold`, `SafeArea`, app bars, tab/page shell, and bottom docks;
- the screen-level padding contract;
- the single vertical scroll owner when the surface scrolls;
- the top-level async boundary for initial data, unless the screen is static;
- screen-level mutation listeners for transient action failures;
- retry invalidation for the provider/view model that failed;
- navigation callbacks and route exits;
- deciding which feature body/state widget is shown.

A `FeatureScreen` should not own:

- repository calls;
- backend/platform side effects;
- product-significant validation;
- mutation orchestration;
- per-section rendering details;
- repeated row/card/control layout.

These are not screens by default:

- loading widgets;
- error widgets;
- empty states;
- skeleton states;
- tab bodies that are mounted inside one route;
- section bodies, cards, rows, forms, slivers, rails, and bottom sheets;
- feature widgets that can be rendered inside more than one screen.

They should live under `presentation/widgets/` or `core/widgets/` depending on
ownership.

## Screen Composition Contract

Screen composition should be predictable:

```text
<Feature>Screen
  -> mutation listener(s), if actions can fail transiently
  -> one approved screen-family owner
  -> one scroll owner or one body shell
  -> CatchAsyncBoundary / CatchAsyncBoundary.sliver / typed UI-state adapter
  -> <Feature>Body / sliver body / state-specific widgets
  -> feature widgets and core primitives
```

Row pages use a full-width body or `CatchRootScreenPageScrollView.sections`.
`CatchSection.rows` / `.sliverRows` own the content gutter and the complete
page or pane interaction plane; `.containedRows` explicitly owns an inset
rounded group. Section alone owns headers and between-row rules. `CatchField`
owns interaction and takes sealed `CatchRecordLayout`, `CatchPersonLayout` or
`CatchConversationLayout` data. These layouts cannot be arbitrary Widgets and
cannot accept callbacks. Secondary targets belong to `CatchFieldSecondaryAction`.

`CatchPageBody` remains the semantic inset owner for non-row content and legacy
form flows. Never wrap full-width row sections with an additional horizontal
page inset. `CatchScaffold`, `CatchNavigationViewport` and
`CatchSectionList.panes` publish local viewport bounds for geometry assertions.
Square full-width feedback requires a matching published paint extent. Missing
geometry context uses rounded containment; a known mismatch asserts in debug
and remains rounded in release. The Field paint owner checks legacy geometry
declarations too, so omitting Section cannot authorize an inset square highlight.
`CatchScrollTerminalGap` owns terminal clearance, with `.sliver` for a sliver
scroll owner. `CatchStateViewport` owns the visible area for empty/error
placement, also with `.sliver`; both protocols share one obstruction policy.
The state viewport does not select responsive layouts or own state content.

Screen-level padding belongs at the screen/body boundary, not scattered across
unrelated child widgets. Use `CatchInsets`, `CatchGaps`, `CatchPageBody`,
`CatchPageBody.sliver`, `CatchSectionList`, `CatchSectionList.sliver`, and
other semantic layout primitives described below.

If a parent owns a `CustomScrollView`, async loading/error/empty/data branches
should usually be sliver-native. Box widgets can still be used at composition
boundaries through `SliverToBoxAdapter`, but growing repeated content should use
lazy slivers.

### Exhibit ARCH-SCREEN-COMPOSITION-001: Semantic Screen Composition

<!-- exhibit-freshness: ARCH-SCREEN-COMPOSITION-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

Screen composition is a closed family, not a per-feature assembly exercise:

- Every full-screen composition terminates in a named
  `CatchScaffold.standalone`, `.stepFlow`, or `.workspace` role. That
  canonical owner is the only production location allowed to instantiate
  Material `Scaffold`; higher-level root, tabbed, and pushed-route owners
  delegate to it. It centralizes page surface, keyboard resize, safe-area
  policy, bottom chrome, and edge-to-edge behavior without forcing unlike
  routes into one visual form.
- A root shell destination uses `CatchRootScreenScaffold.standard` or
  `.fullBleed`; an adaptive parent that already owns the `Scaffold` uses the
  corresponding `CatchRootScreenScrollView` constructor. Each closed role
  accepts a scroll-content header and body slivers, then jointly selects body
  geometry, responsive-width policy, and terminal clearance. Standard always
  owns the centered readable lane; full bleed is explicitly edge-owned. Both
  retain the safe area, one scroll owner, field-obstruction scope, optional
  refresh wrapper, and shell clearance.
- A root destination with pinned peer tabs uses `CatchRootScreenScaffold.withPrimaryRail`
  and one `CatchRootScreenPageScrollView` per page. Every page must declare
  geometry through the page owner's `standard`, `fullBleed`, or
  `embeddedViewport` constructor; `CatchRootScreenPageSpec` only selects the
  scroll or surface adapter and cannot redeclare geometry or
  terminal-clearance policy.
  Overlap injection, restoration, focus isolation, body geometry, refresh, and
  terminal clearance remain shared mechanics.
- A section-composed page without root-title chrome uses
  `CatchSectionList.page`. Navigation depth uses `CatchNavigationViewport`
  with route-owned ordered levels; expanded layouts retain the entire path in
  a horizontally scrollable strip with pointer/keyboard resizing. Compact
  layouts show the active pane without changing the navigation destination.
  Host feature screens supply `HostDirectoryWorkspace` (required index,
  selection, detail builder and unselected state) or `HostEditorWorkspace`
  (editor and preview) to `HostNavigationWorkspace`; they cannot construct
  physical panes or select column counts. The root-composition check rejects
  those bypasses, including single-pane directory substitutions.
- A pushed utility or detail route uses `CatchRouteScaffold` with its compact
  `CatchTopBar`. A pushed route must not be restyled to resemble a root title.

Ordinary and primary-rail roots are one layout family and one public widget.
The named `withPrimaryRail` constructor is a typed parameter bundle, not a
second scaffold: it requires the rail, closed page body, and root-header spec
together, preventing impossible half-configured states that nullable unrelated
properties would allow. The root owner privately selects `CustomScrollView`
without a rail or overlap-safe `NestedScrollView` with one outside a workspace.
Inside `CatchWorkspacePaneScope`, both root and route owners delegate chrome to
`CatchWorkspacePaneScaffold`: each full-height pane owns its title, actions, peer
rail and body scroll. Peer rails start at the same header boundary; actions stay
in the pane they affect. Visited ancestors keep state across resizing, while
unvisited previews do not initialize until visible. `CatchWorkspaceBackScope`
provides parent navigation to existing top bars; viewport back handling uses the
same path on mobile. Events and Today encode event selection in root query
parameters; Organizer settings replace the adjacent preview; Audience can add a
response/application level after a person. Every Host destination is registered
inside one of the five workspace branches. `HostWorkspaceDestination` requires
an explicit closed `HostWorkspaceRoot` plus its parent next to the route builder;
recursive ancestry is checked for cycles and cross-root parents.
`HostNavigationWorkspace` attaches
the selected route navigator and its declared ancestors to the existing index;
Program subpages, Audience editors, setup flows and live work use this same
adapter. Named push/pop results remain intact. No Host content route escapes
to the root navigator based on width. Every named route keeps one explicit,
canonical absolute-path declaration. The shell uses its root recipe to build
the visible index; a routing anchor retains the navigator root for Back and
push results without mounting a duplicate index. `HostWorkspaceRouteContent`
uses one content key per route record: inactive Navigator pages relinquish their
content to ancestor panes, and Back moves the same element back. This preserves
local editor drafts rather than mounting a second parent editor. Routed editor
previews contribute to the enclosing strip; the adapter does not create a
second horizontal workspace inside a route pane. Peer tabs are
URI-owned; Customers and Forms do not keep competing tab controllers.
The composition scanner checks
all declarations and the canonical navigation viewport. The adaptive app shell
remains the separate owner of bottom navigation and its obstruction.

`CatchPageBodyMode.standard` is the one regular body contract: 20 pt phone
gutters and 16 pt from the preceding title/tab boundary to the standard body
content box. Root call sites select it through a `.standard` constructor rather
than combining layout booleans. `fullBleed` is the explicit alternative for
intrinsically edge-owned slivers such as a conversation canvas, media hero,
map, or embedded preview. Full bleed removes the outer page inset; it does not
create a second body standard. A nested content lane may use a named semantic gutter, such as
`CatchInsets.chatListGutter`, which maps Consumer Chats and Host Inbox to the
same 20 pt horizontal rhythm. There is no compact body role. Feature code
selects one of these semantic roles; it does not restate its horizontal gutter,
title gap, terminal spacer, or field interaction plane.

`CatchInsets.pageBody` owns the 20 pt horizontal gutter and 16 pt standard body
start. `CatchInsets.primaryRailTitleBlock` owns the 8 pt title-to-rail handoff;
`CatchRootScreenScaffold.withPrimaryRail` accepts only the typed `CatchPrimaryRail`
contract, owns the iOS 44 / Android 48 minimum rail and its scaled extent, and
runtime-enforces the canonical variant's reported extent; feature adapters
forward that scaled preferred size instead of restating a fixed height. The
`CatchRootScreenPageScrollView` reapplies the same 16 pt standard body start after
the rail. The semantic-layout and tabbed-scaffold tests pin those numeric
mappings. The composition checker validates semantic roles rather than the
literal numbers. Native source reference, semantic adoption and measured
interaction verification remain separate responsibilities; see
[the platform token boundary](design_language.md#52-native-reference-and-catch-adoption-boundary).

Persistent context uses `CatchBannerStatus`, not queued notices.
`MyApp` publishes honest connectivity context through `CatchBannerStatusScope`
above the navigator for both apps, including pushed routes. A route may add
local context through its scaffold's typed `statuses` slot (rehearsal before
offline). The canonical screen owner consumes that scope once and clears it
for nested content. `CatchRootScreenScaffold.withPrimaryRail` pins the rail and
strips as one intrinsically measured `PinnedHeaderSliver` with a single overlap absorber;
the title scrolls away without a strip between it and the rail. Root screens
pin strips after the title; pushed screens place them below the complete app
bar, including any primary tabs. Standard body spacing remains 16 pt after
the final strip. Standalone/step-flow surfaces with owned safe areas place
context above their body; explicitly edge-owned workspace canvases still
delegate header composition to their semantic owner.

`CatchBanner.statuses` owns full-width paint, common icon/label/detail/action
lanes, wrapping and touch targets. It does not read providers, position an
overlay, dismiss itself or infer retry/sync behavior. The resolved
`catch_status_strip_is_layout_owned` lint prohibits feature construction
(including aliases and constructor tear-offs); features supply data instead.
Runtime tests cover dynamic overlap, pinning, text scaling and tab switches.
Transient notifications, field/section errors and mutation feedback remain
separate owners.

All registered layout-bearing declarations reachable for one route, including
state-specific and responsive alternatives, must remain in the same layout
family. Each owner separately declares any intentional geometry and top-edge
policy. Owner rows identify declarations and layout expressions; they do not
label or exhaust runtime states.

`design/screens/catch.screens.json.layoutContracts` declares presentation
owners for every rendered registered route, `layoutOnlyRoutes` covers rendered
routes excluded from design parity, and `imperativePageContracts` covers every
supported full-screen imperative target outside the named GoRouter graph. The
generated route inventory records each direct `MaterialPageRoute` construction
site separately so multiple callers of one target cannot hide a stale or
unregistered edge. Analyzer discovery is broader than that inventory: it finds
every full-screen `PageRoute` construction form. A typedef alias, constructor
tear-off, factory/wrapper, `CupertinoPageRoute`, `PageRouteBuilder`, or custom
subclass therefore fails closed rather than becoming an uninventoried escape.
Only a direct `MaterialPageRoute` constructor is supported. Modal sheets and
dialogs are not page routes and remain governed by their own surface contracts.
The analyzer-resolved
`architecture:ui-composition-contracts` gate reconciles route, coverage, and
registry membership; resolves each named declaration; verifies an allowed
family expression; checks selected explicit body and top-edge arguments; and
rejects analyzer-resolved Flutter `Scaffold` construction, constructor/type
aliases, and direct or indirect subclasses outside `CatchScaffold` in
hand-authored production source. It compares every generated `builder` or
`pageBuilder` expression with the analyzer-resolved `GoRoute`, proves
conservative static reachability from each named or imperative presentation
target to every registered owner declaration, and requires branch-universal
static proof across all statically reachable widget-producing terminals. Every
build/return branch, approved widget-builder callback, followed local value or
helper, and registered same-family delegate must resolve to the declared layout
family; an unused canonical helper cannot bless a rogue branch, and a behavior
callback cannot masquerade as rendered composition. The gate does not execute
predicates, so it treats every statically reachable branch as possible and
requires all of them to pass. Geometry and top-edge roles not represented by a
checked owner argument remain review metadata. Focused widget and router tests
remain responsible for runtime branch and redirect behavior.

The gate has no debt baseline or feature waiver, and planned coverage cannot
bypass it. At the 2026-09-02 migration baseline, the generated inventory has 70
routes: 65 rendered presentations (60 `builder`, 5 `pageBuilder`) and 5
redirect-only routes. Of the rendered routes, 63 are contracted screen routes;
the excluded `loadingScreen` and `paymentConfirmationScreen` routes remain
governed through `layoutOnlyRoutes`. Layout-only means excluded from baseline
design parity, not exempt from typed layout ownership. A historical screen
record may remain for design evidence after its route becomes a redirect, but
coverage models that route as an alias with no rendered layout owner. The
composition gate verifies that the alias names a typed canonical target, but it
does not traverse the redirect expression; focused router tests prove the
actual redirect result. The same baseline contains 11 imperative page
construction sites across 7 registered targets; each site must remain present
in the generated inventory and analyzer-resolve to its target's typed owner.

The shell-branch manifest at `tool/design/root_screen_composition_contracts.json`
records every `StatefulShellBranch` and the adaptive shell invariants. Its
scanner rejects an unregistered branch, superseded root APIs, and raw sliver
empty/error viewport ownership. Semantic screen owners and body roles belong
only to `design/screens/catch.screens.json` and the analyzer-backed UI
composition gate; the shell scanner must not duplicate those constructor
contracts as substring counts.

## App Shell Chrome Policy

The consumer shell and compact Host shell own bottom tab chrome only for
root-screen screens. The medium and expanded Host shell instead owns persistent
side navigation. Branch child routes that own their own route chrome or bottom
affordance must set `parentNavigatorKey: _rootNavigatorKey` in
`lib/routing/go_router.dart` so compact detail CTAs, chat composers, and
full-screen actions are not rendered under the floating tab bar. A later
master-detail adopter may intentionally keep a child selection inside its Host
branch on medium or expanded layouts, but the route remains the selection
authority and must preserve compact full-screen behavior.

Bottom sheets must be opened through `showCatchBottomSheet` from
`packages/catch_ui/lib/src/components/catch_sheet.dart`. It presents above shell
chrome on the root navigator. Raw Material sheet calls belong only in that
shared presenter; Cupertino date/time popups belong only in the shared adaptive
picker. `test/core/catch_bottom_sheet_policy_test.dart` enforces these boundaries.

Host, private-program operations, Event Assistance and rehearsal use
`CatchSheet.standard` or `.filter`. Natural-height
content shrinks for short sheets and scrolls as one unit (header, body, footer)
within 90% of the available viewport. The shell owns clipping, width, keyboard
obstruction and terminal device clearance. Do not nest a vertical scroll view,
`Flexible` body, per-feature height cap or custom surface padding. A non-scrolling,
shrink-wrapped builder list is permitted for dynamic rows. Native wheel pickers
and capturable share cards retain their distinct shared interaction contracts.

Choice sheets use `CatchSelectionSheet` / `CatchMenuRow.sheet`; selection commits
on tap. Immediate filters use `.filter`: no instructional subtitle, an owned
pinned secondary Close action, and muted ruled `CatchSection.fieldRows` groups.
Other sheet footer actions use `CatchButton.sheet` with dismiss, alternative or
commit roles; width never selects emphasis. Shared headers move trailing actions
below the heading at large text scales. Editors put their
explicit save/submit action in the sheet footer. The legacy `CatchSheet`
constructor remains for Consumer surfaces pending a separate migration.

Root-screen overlays that still coexist with the floating tab bar should use
`CatchTabViewportScope.bottomOverlayClearanceOf(context, minimum: ...)`; feature
code should not recompute the tab-bar height, safe-area subtraction, or platform
floating inset. Root scroll views without tab chrome should end with a semantic
terminal sliver such as `CatchScrollTerminalGap.sliver` instead of hard-coded
bottom spacers. When a route uses this terminal sliver inside a `SafeArea`, the
screen-level `SafeArea` must leave `bottom: false` so the device bottom inset
remains visible to the sliver and becomes scrollable clearance.

`CatchTabViewportScopePlacement` is the shell-to-scroll-owner contract:
`floating` publishes the complete physical obstruction and terminal padding
consumes it; `anchored` means the scaffold already reduced the body viewport,
so only the requested breathing room is added; `none` (and routes outside a
shell) falls back to the larger of the device padding and view padding. Product
screens consume that contract through `CatchScrollTerminalGap` or
`CatchScrollTerminalGap.sliver`; they never read safe-area bottom values directly.

Software-keyboard visibility is defined by `MediaQuery.viewInsets.bottom > 0`,
not by focus. While that inset is nonzero, bottom navigation is omitted, the
consumer shell also omits its guest auth CTA, floating `extendBody` behavior is
disabled, and `CatchTabViewportScope.bottomOverlayInset` is zero. Floating shells
keep the route body in the same stack position while removing only the bottom
navigation sibling, so the focused editable element, text, cursor selection,
and keyboard connection survive the inset transition. Medium and expanded
Host side navigation remains mounted because it does not overlap the software
keyboard. A hardware keyboard leaves `viewInsets.bottom` at zero, so all
navigation remains available.

### Exhibit ARCH-SHELL-SCROLL-001: Adaptive Root-Screen Scroll Clearance

<!-- exhibit-freshness: ARCH-SHELL-SCROLL-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

`AdaptiveTabScaffold` is the single shell placement boundary. Consumer
destinations and compact Host destinations keep the existing platform-aware
bottom bar. Authenticated Host destinations additionally provide a medium rail
and expanded sidebar. The scaffold selects among those supplied widgets from
the available width and always publishes the resulting bottom obstruction
through `CatchTabViewportScope`:

```dart
AdaptiveTabScaffold(
  activeIndex: navigationShell.currentIndex,
  navigationBar: bottomNavigation,
  mediumSideNavigation: railNavigation,
  expandedSideNavigation: sidebarNavigation,
  body: navigationShell,
)
```

Side navigation consumes horizontal layout space and therefore publishes
`CatchTabViewportScopePlacement.none` with zero bottom obstruction. Root scroll
owners continue to use `CatchScrollTerminalGap` or
`CatchScrollTerminalGap.sliver`; they never special-case tablet or desktop
navigation. `AppShellNavigationBar` remains the sole destination adapter, so
labels, selected icons, unread badges, semantics, haptics, and `goBranch`
behavior cannot drift among bottom, rail, and sidebar chrome.

#### Host adaptive workspace specification

The 2026-08-14 current-state review found a sound phone hierarchy but only
width expansion on tablet and desktop: bottom navigation remained attached to
the window edge, operational rows became excessively long, the Inbox left a
mostly empty canvas, Organizer retained only a 600 px form lane, and Create
Event preserved a phone pager plus full-width footer. The adaptive programme
therefore changes information architecture and task concurrency at larger
widths; it does not scale typography, icons, cards, or spacing proportionally.

**Window classes**

| Class | Width | Shell | Composition contract |
|---|---:|---|---|
| compact | `< 600` | platform-aware bottom navigation | one task or record at a time; sheets and full-screen details; touch-first pinned actions |
| medium | `600–839` | labelled 96 px rail | one primary pane plus an optional persistent contextual pane; portrait remains touch-first and landscape may split |
| expanded | `>= 840` | labelled 240 px sidebar | bounded workspace canvas; master-detail and multi-pane composition; pointer and keyboard affordances |

The whole-window class comes only from `CatchWindowSize`. Feature components use
`CatchViewport.atWidth` and a named local threshold when their own width,
not the application window, determines a table, grid, preview, or control-row
reflow. Very wide three-pane workspaces may add named local thresholds around
1100 or 1280 logical pixels without adding a second global breakpoint system.
Feature code must not select layout from `kIsWeb`, bundle identity, or operating
system.

**Platform-specific product composition**

| Surface | Compact phone | Medium tablet | Expanded web or Mac window |
|---|---|---|---|
| Today | live-or-next event spotlight and urgent cross-event work | rail plus operational spotlight and adjacent next actions | cross-event command centre with current event, attention, and compact quick actions |
| Events | lifecycle inventory and full-screen Manage | rail plus event list and persistent selected-event summary where selection exists | bounded event index, selected status/tasks, and lifecycle actions |
| Audience | People, Audiences, Forms, or Responses as one selected mode; pushed detail/editor | selected mode plus durable customer/form context where useful | filter/index pane, durable detail, and history/actions pane at capable local widths |
| Inbox | event scope and conversation list, pushed thread | conversation list plus selected thread | event/audience navigation, conversation list, and thread/detail at sufficiently wide local width |
| Organizer | top tabs and one form lane | rail plus secondary organizer navigation and one content pane | secondary navigation, editor, and preview or insights pane |
| Create Event | current paged wizard and bottom actions | step rail plus focused form; optional summary pane in landscape | step rail, approximately 640 px form lane, live cover/summary preview, compact sticky actions |
| Manage Event | one lifecycle-owned Preparation, Live Operations, or Recap workspace plus an overlay guest-roster drawer; Live may switch locally between Now and Room while Guests opens that drawer | the same lifecycle workspace; a capable local Live width keeps the command stage and supporting operations concurrent | bounded lifecycle workspace, command stage plus supporting operations, wide overlay roster, and no persistent top-level mode navigation |

Today and Events remain separate canonical destinations. Responsive work must
not collapse the cross-event operational home back into the durable event
inventory or recreate Forms as a top-level destination.

**Primary Host information architecture decision**

The selected global contract is
`Today · Events · Audience · Inbox · Organizer` on compact, medium, and
expanded shells. This is a product-authority decision, not a reference-render
preference:

- Today owns the live-or-next event, time-sensitive attention, safest immediate
  actions across the organizer's events, and the explicit Dress Rehearsal
  entry. `/host` redirects to `/host/today`.
- Events owns the durable event inventory, creation, schedule, history, and
  lifecycle entry points. The isolated rehearsal feature remains event-scoped,
  but it is entered from Today instead of masquerading as event creation.
- Audience owns four peer modes: People, Audiences, Forms, and Responses.
  Person-level CRM and intake keep their focused controllers and deep routes;
  they no longer compete as global destinations.
- Inbox owns the peer Inbox and Sends workspaces at `/host/inbox`. The short
  destination label includes conversations, campaigns, event announcements,
  follower updates, and manual send work without exposing the implementation
  term Messaging as shell information architecture.
- Organizer remains the identity, team, defaults, provider, payout, and
  settings authority.

Inbox groups endpoints by verified person identity within the selected organizer
and event/general scope. Names, phone suffixes and fuzzy matching never merge
identities. Each endpoint retains its transport id, cursor and authorization.
The pane combines authorized history but requires an explicit reply route; no
transport fallback or fan-out is permitted. New message chooses a person and
then an available route. Partial source coverage is shown as partial, including
counts; unknown booking membership never becomes a prospective classification.
`HostInboxCatchPages`, `HostInboxWhatsappPages` and `HostConversationHistory`
controllers own pagination and generation fences. `HostPersonConversationController`
owns WhatsApp reply/read IO; the widget owns only presentation and ephemeral
selection. Reply drafts are scoped by account, organizer, person, scope and
route; retries preserve the operation id and successful sends clear only the
unchanged draft. Authentication changes clear session drafts.


The decision follows platform guidance that primary navigation represents a
small number of persistent, peer top-level areas and preserves state within
each area: [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
and [Android layout and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).
Airbnb's Host guidance uses Today for an overview of upcoming reservations
while keeping Calendar and Listings as distinct work domains
([Airbnb Host dashboards](https://www.airbnb.com/help/article/3116)). Catch
uses the same separation between immediate operations and durable inventory.
Clear, destination-shaped labels also retain stronger information scent
([Nielsen Norman Group](https://www.nngroup.com/articles/3-ia-mistakes/)).

No verified Host route-frequency study or usage export is present in the
repository. Therefore any future change to this global contract requires new
product evidence, an explicit route/state compatibility plan, and a
coordinated update to the shell manifest, routes, copy, tests, contracts, and
captures. Reference images alone cannot reopen or bypass this boundary.

**Architecture boundaries**

1. `HostAppShell` owns window class, global navigation chrome, and branch
   selection. It does not own feature data, selected domain records, or
   workspace policy.
2. Route screens own providers, URL/path state, selected record ids, async
   boundaries, retry, and navigation effects.
3. Provider-free compact, medium, and expanded views own composition only and
   receive the same typed display state and action callbacks. A responsive
   variant must not introduce a parallel repository, controller, or backend
   query.
4. Controllers and view models own product behavior; repositories, services,
   Firestore contracts, and Functions remain viewport-agnostic.
5. Platform capabilities such as file selection, drag/drop, sharing,
   notifications, native menus, and window restoration stay behind replaceable
   services. Layout widgets never infer capabilities from the current window
   class.
6. Host child routes remain in their owning workspace branch on every width.
   The adapter presents the active level on compact screens and its available
   ancestors on wider screens. Route identity, Back, push/pop results, drafts
   and scroll state must survive resizing; detail selections remain in URLs.

**Section-page composition**

`CatchSectionList` owns ordered complete sections. Its `.inset`, `.sliver`,
`.responsive`, `.panes`, and `.page` recipes preserve their distinct layout protocols
through named constructors. Every constructor declares an empty-state owner
or explicit omission; a recipe must not duplicate its parent's gutter or scroll
owner. Section delimiters stay with `CatchSection`.

Section-based non-sliver routes use `CatchSectionList.page` instead of
rebuilding screen gutters, a content clamp, field visibility, and terminal
shell clearance independently. The route explicitly chooses either a centered
reading lane or `adaptiveTwoColumn`; there is no automatic rule that turns
every wide form into two columns. Adaptive composition measures the page's
remaining local width after rail/sidebar chrome and screen gutters. At the
named 660 px component threshold, complete `CatchSection` blocks move into
their declared primary or secondary lane; below it, including narrow split
windows, the original list order returns in one capped column. The layout never
splits a section or teaches `CatchField` about the viewport.

**Workspace geometry and input**

- A desktop workspace uses bounded content regions rather than either the
  phone-era universal 600 px lane or full-window data rows. Form lanes may
  retain a local 600–680 px reading width inside a wider multi-pane workspace.
- Desktop density becomes more compact and information-rich: shorter rows,
  aligned columns, visible counts/status, toolbars, and fewer modal
  transitions. Display typography does not grow merely because the window did.
- Every side-navigation destination remains visibly labelled. Pointer hover,
  tooltips, Tab traversal, visible focus, Escape/back behavior, and browser
  history are first-class acceptance requirements; shortcuts beyond standard
  traversal require discoverable menus or tooltips.
- Text scale 1.0, 1.5, and 2.0, light/dark theme, reduced motion, software and
  hardware keyboards, and resizable windows remain supported in every class.

**Delivery slices and acceptance**

1. Foundation: adaptive Host bottom/rail/sidebar shell, shared geometry,
   current-branch preservation, exact 599/600/839/840 boundary tests, and
   phone/tablet/desktop Widgetbook states. This is the reference slice.
2. Today and Events reference workspaces: keep the existing typed operational
   and lifecycle state and callbacks, then add medium and expanded
   provider-free compositions with no data-layer changes.
3. Audience and Inbox: introduce URL-backed master-detail selection and
   preserve full-screen compact routes and focused editors.
4. Organizer, Create Event, and Manage Event: recompose the existing state and
   controllers into multi-pane workspaces, retaining local component
   breakpoints for forms and roster tables.
5. Desktop input and native Mac capability work: verify keyboard/focus/browser
   behavior first; add a macOS runner, entitlements, signing, notarization,
   menus, updates, and release automation only through a separate approved
   platform-delivery slice.

Each slice requires focused widget tests at its boundary widths, route-state
preservation tests, phone/tablet/desktop visual review, generic Flutter
analysis, Catch UI lint proof, applicable design contracts, and a bounded Git
diff. A screenshot is evidence for visual composition, not proof of keyboard,
screen-reader, routing, or platform capability behavior.

Consumer shell initialization effects that do not render UI must use
`ref.listen`, not `ref.watch`. In particular, completion or failure of
`appShellFcmInitializationProvider` is reported as a side effect and must not
rebuild the `StatefulNavigationShell`: go_router owns its `GlobalKey`, and
forcing the keyed shell through an unrelated async rebuild can invalidate the
first dashboard frame.

## Layout, Spacing, And UI Architecture

Use `CatchSpacing` from `package:catch_tokens/catch_tokens.dart` for reusable layout
contracts. Feature screens should usually consume the semantic layer
(`CatchGaps`, `CatchInsets`, or layout primitives) rather than composing
anonymous `EdgeInsets` from primitive spacing tokens.

| Token | Value | Typical use |
|---|---:|---|
| `CatchSpacing.s1` | 4 px | Tight icon/text gaps |
| `CatchSpacing.s2` | 8 px | Compact vertical gaps and chip spacing |
| `CatchSpacing.s3` | 12 px | Small section gaps |
| `CatchSpacing.s4` | 16 px | Standard card/content inset |
| `CatchSpacing.s5` | 20 px | Mobile screen side gutters |
| `CatchSpacing.s6` | 24 px | Large section gaps |
| `CatchSpacing.s8` | 32 px | Bottom breathing room |
| `CatchSpacing.s10` | 40 px | Hero-scale vertical spacing |
| `CatchSpacing.s12` | 48 px | Large header spacing |
| `CatchSpacing.s16` | 64 px | Oversized hero spacing only |

`Sizes.p*` is a compatibility bridge for intentional off-scale values such as
6, 10, 14, or 18. Do not add new `Sizes` constants when `CatchSpacing` already
fits.

Use semantic gaps for common relationships:

- `CatchGaps.inline` for tight icon/label or metadata pairs.
- `CatchGaps.related` for closely related rows inside one content cluster.
- `CatchGaps.formField` for standard control gaps inside a form group.
- `CatchGaps.section` for peer page sections.
- `CatchGaps.majorSection` for major page-region separation.

Use semantic inset contracts for repeated shells:

- `CatchInsets.pageBody` for default page or scroll-body padding.
- `CatchInsets.pageBodyRelaxed` when the scroll end needs extra breathing room.
- `CatchInsets.pageBodyTight`, `CatchInsets.pageBodyRelaxedTight`, and
  `CatchInsets.pageBodyUnderHeader` when local chrome or dense headers already
  provide some top separation.
- Loading skeletons inherit the same semantic body inset as the loaded branch.
  A loading state is not, by itself, permission to substitute
  `pageBodyUnderHeader` and collapse the app-bar-to-content rhythm.
- `CatchInsets.pageHeaderBody`, `CatchInsets.pageHeaderCompact`, and
  `CatchInsets.sectionHeader` for page intro rows and compact rail/list headers.
- `CatchInsets.pageHorizontal` and `CatchInsets.pageHorizontalWide` when a
  page/list owns only horizontal gutters.
- `CatchInsets.formStepBody` and `CatchInsets.formStepBodyRelaxed` for
  create/edit form steps.
- `CatchInsets.content*`, `CatchInsets.tile*`, `CatchInsets.listBody*`, and
  `CatchInsets.compactControlContent` for card, tile, list, pill, chip, and
  compact-control internals.
- `CatchInsets.chatBubble*` for message bubble content and sender-group
  spacing shared between live chat bubbles and generated share cards.

When sibling surfaces must align, define one named inset near the owning widget
or primitive and reuse it. Do not scatter equivalent anonymous `EdgeInsets`
across sibling tabs. If a new repeated role appears, add a semantic
`CatchInsets` member or a layout primitive before migrating call sites.

### Token Tier Model

Use the lowest tier that preserves intent, and move repeated feature-local
roles upward only when they recur.

`packages/catch_tokens` owns L0. Its public entrypoint is
`package:catch_tokens/catch_tokens.dart`; generated scales live in
`lib/generated`, handwritten scales in `lib/src/primitives`, semantic roles in
`lib/src/semantic`, and component token contracts in `lib/src/components`.
`CatchWelcomeTokens` owns Welcome reel geometry and `CatchFormWorkspaceTokens`
owns form-builder pane geometry. Import the public entrypoint instead of
package internals. The package uses the repository Dart workspace and its only
production dependency is the Flutter SDK, enforced by
`platform:app-package-graphs` with seeded forbidden-dependency tests.
The package also enables Flutter lints, including undeclared-package-import
diagnostics, and treats info diagnostics as failures.
Theme wiring, typography, icon assets, and the app-coupled `ActivityPalette`
remain in `lib/core/theme` until their Phase 3 disposition.

| Tier | Owner | Examples | Use when |
|---|---|---|---|
| Primitive scale | `package:catch_tokens/catch_tokens.dart` | `CatchSpacing`, `CatchRadius`, `CatchStroke`, `CatchMotion`, `CatchOpacity`, `CatchIcon` | A reusable value is part of the global visual scale. |
| Semantic layout role | `package:catch_tokens/catch_tokens.dart` or a shared primitive | `CatchGaps.section`, `CatchInsets.pageBody`, `CatchLayout.maxContentWidth` | A value describes a repeated relationship or viewport/content contract. |
| Expressive palette role | `ActivityPalette` / `CatchTokens` theme extensions | activity swatches, functional status colors, photo grade overlays | Color communicates activity, state, or theme meaning rather than decoration. |
| Component contract | Owning component or primitive | profile tab body padding, ticket geometry, control shell sizing | A value is tied to one component family and should not become a global token yet. |
| Sanctioned art | Painter/canvas owner with a narrow comment | graded image grain, activity artwork, map-pin canvas colors pending policy | Raw values are part of deliberate illustration/canvas output and are not layout tokens. |

Do not add a new token namespace just because one raw value exists. Add a
primitive token when the value belongs to the global scale; add a semantic role
when the value names a repeated relationship; keep one-off component geometry in
the component until reuse is real.

`CatchBreakpoints` remains rejected for now. Whole-window responsive classes
already live in `CatchWindowSize`, while local component reflow thresholds live in
`ComponentBreakpoints`; collapsing those into the design-token namespace would
blur window and component ownership. `CatchLayout` remains appropriate for
content clamps such as `maxContentWidth`.

`CatchZIndex` also remains rejected for now. Current Flutter stacking behavior
is owned by widget order, overlays, navigators, and route/sheet primitives
rather than repeated numeric z-index values. Introduce a named stacking
contract only after two or more surfaces need the same explicit layer ordering.

### Sizing And Constraints

Catch must scale across phone sizes and Dynamic Type. Prefer constraints over
constant dimensions. Hardcoded heights/widths that wrap content are the main
cause of clipping at large text scales and cramped or stretched layouts.

The `catch_no_raw_content_dimension` and `catch_no_local_design_constant`
analyzer diagnostics flag fixed `height`/`width`/`dimension` arguments,
fixed `Size(...)`, tight/expanding constraints, and local dimension wrappers
under handwritten `lib/`, except the design-system scale and generated code.
The canonical drift helper owns both focused reports and the repository-wide
zero-diagnostic gate. A legitimate fixed-art exception is expressed at the
owning source line rather than through a count allowance:

```dart
// sizing:allow: <reason>
```

Constant dimensions are allowed only for:

- icon sizes through `CatchIcon.{sm,md,lg}`;
- hairlines/dividers (`1` px) and `0`;
- spacing gaps through `CatchSpacing` or `gapH*`/`gapW*`;
- radii through named tokens, and UI boundaries through semantic
  `CatchBorderRole` resolution; repeated progress/art strokes use named
  `CatchStroke` roles;
- genuinely fixed art such as logo canvases, QR codes, or platform-spec
  graphics, with `sizing:allow`.

Banned-to-preferred conversions:

| Instead of | Use |
|---|---|
| `SizedBox(height: 200, child: img)` | `AspectRatio(aspectRatio: 16 / 10, child: img)` |
| `Container(height: 120, child: ...)` | `ConstrainedBox(constraints: BoxConstraints(maxHeight: 120), ...)` |
| fixed row height around text | let it size; add min-height only for a floor |
| fixed-width sibling columns | `Expanded`, `Flexible`, or `FractionallySizedBox` |
| `BoxConstraints.tightFor(height: x)` | min/max constraints or `AspectRatio` |
| full-bleed content on large screens | centered `ConstrainedBox(maxWidth: CatchLayout.maxContentWidth)` |

Never fix the height of a text-bearing container. Use min-height plus padding
and let text grow. Validate important screens at text scale 1.0, 1.5, and 2.0.

### Scroll Ownership

Each full screen should have one clear vertical scroll owner.

Use slivers when a screen needs:

- a collapsing hero/header;
- a pinned search, filter, or tab row;
- mixed header/rail/list/grid content in one viewport;
- lazy repeated rows below a custom header;
- route-owned and tab-owned scroll positions that must coordinate.

Prefer box layout for auth, onboarding, create/edit forms, bottom sheets,
dialogs, short settings pages, and small reusable widgets that need to work
inside more than one scroll context.

When a box-layout root branch renders a terminal empty or error state inside a
floating app shell, wrap the state in `CatchStateViewport`. It subtracts the
shell's published bottom obstruction from the optical center. Do not add a
feature-local `Center`, spacer, or bottom padding to compensate for tab chrome.

Sliver rules:

- Direct children of `CustomScrollView.slivers` must be slivers.
- Use `SliverToBoxAdapter` only for one-off boxes.
- Use `SliverList.builder`, `SliverList.separated`, or `SliverGrid` for
  repeated content that can grow.
- Avoid a vertical `ListView` or large `Column` inside `SliverToBoxAdapter`.
- Use `CatchStateViewport.sliver`, `CatchSliverEmptyState`, or
  `CatchSliverErrorState` for centered sliver empty/error states. They preserve
  responsive overflow and subtract the floating shell's published bottom
  obstruction from the optical center through the same `CatchStateViewport`
  geometry as box screens. Do not compose a feature-local
  `SliverFillRemaining` around `CatchEmptyState` or `CatchErrorState`.
- If a parent owns a sliver scroll view, async loading/error/empty/data state
  widgets should usually return slivers too.

`SliverPersistentHeaderDelegate.minExtent` and `maxExtent` are layout
contracts. Header overflows usually mean the declared extent does not fit text
line height, gaps, padding, icons, or control height. Do not fix those by
negative padding or feature-local nudges.

Pinned bottom rows must not visually cover a collapsing title. Shared feature
headers should use `CatchSliverHeader` from `packages/catch_ui/lib/src/patterns/catch_sliver_header.dart`
and its title-height contracts before adding local header math.

### Root Screens With A Primary Rail

For `NestedScrollView` plus pinned tab rows:

- The outer header owns safe area and pinned-row behavior.
- The absorbed sliver should be the pinned tab row, not the entire scroll-away
  title group.
- Each tab body starts with the matching `SliverOverlapInjector`.
- Body padding belongs to the tab body, not to the pinned tab row.
- Route-owned tab pages use a semantic `CatchRootScreenPageScrollView`
  constructor. `standard` owns the responsive width clamp, 20 pt gutter, 16 pt
  body start, and terminal clearance. `fullBleed` removes only the outer body
  geometry while retaining terminal clearance. `embeddedViewport` is reserved
  for a fill-remaining child that owns its own scroll and terminal clearance. The
  body role owns title/tab-to-content rhythm and page gutters, while the width
  option preserves the canonical 600 px content
  lane plus page gutters only when the viewport has surplus width. A page may
  supply a larger semantic `maxContentExtent` when its records carry multiple
  operational columns or summaries; this changes only the centered lane, not
  scroll ownership. Phone-width pages remain direct slivers. Full-bleed or
  intrinsically sliver-native pages such as embedded Club Preview leave the
  option false.
- The overlap injector and terminal-padding sliver remain full-viewport even
  when page content is width constrained.
- If a tab body contains an independently scrollable child and its top gap must
  remain visible when that child returns to offset zero, put the gap inside that
  filled child.
- If the intended UX is one continuous gesture, bridge both directions:
  child-upward scroll collapses the parent header first, and leading overscroll
  at the child top expands the parent header again.
- Expandable fields reuse the nearest existing vertical scroll position. A tab
  body that sits behind shell chrome publishes the obstruction through
  `CatchFieldVisibilityScope` and supplies enough terminal scroll extent for its
  final field to clear that chrome. `CatchField` drives the chosen position
  frame by frame with the same duration and curve as the disclosure geometry so
  newly available extent is consumed without an end snap. Rapid close cancels
  the drive, direct user scrolling wins, reduced motion jumps immediately, and
  a zero-duration final correction covers any residual clamp. Do not add a
  second `ScrollController` inside the `NestedScrollView` to implement this.

#### Exhibit: ARCH-ROOT-PRIMARY-RAIL-001 root-owned pinned primary-rail composition

Host Clubs is the reference for mixing bounded box content with a sliver-native
preview under one root-owned primary-rail path:

```dart
CatchRootScreenPageScrollView.standard(
  scrollKey: editScrollKey,
  children: editSlivers,
)

CatchRootScreenPageScrollView.fullBleed(
  scrollKey: previewScrollKey,
  children: previewSlivers, // Full-bleed and sliver-native.
)
```

`CatchRootScreenPageScrollView` owns overlap injection, focus isolation, independent
offset restoration, semantic body geometry, and terminal clearance. Feature
pages own their slivers, refresh policy, controllers, and typed tab state. Do not reintroduce
feature-local `Center`/`ConstrainedBox` wrappers, redeclare the body role on
`CatchRootScreenPageSpec`, restore independent width/terminal booleans, or box
the Preview slivers.

### Current Screen Layout Decisions

| Surface | Direction |
|---|---|
| Home dashboard | Keep one `CustomScrollView` with `CatchSliverHeader(title: CatchTopBar.primaryRail(...))`; do not reintroduce Dashboard/Activity tabs without a product decision. |
| Explore | Keep sliver-native. This remains the strongest mixed event/club discovery pattern. |
| Chats list | Keep sliver shell; make populated body sliver-native only if list scale or tests demand it. |
| Event detail | Keep sliver-native because the collapsing hero justifies it. |
| Club detail | Keep sliver-native with agenda-style event list. |
| User profile | Use the shared `CatchRootScreenPageScrollView` contract for every tab, preserving overlap injection and the Preview card scroll bridge. The semantic constructor owns terminal clearance structurally: `standard` and `fullBleed` add it, while `embeddedViewport` delegates it to the embedded surface. |
| Map-heavy screens | Keep the stable full-bleed viewport, but declare it as an immersive `CatchScaffold.workspace`; overlays continue to own their local safe-area insets. |
| Attendance sheet | Keep box-based while it remains a modal/sheet. |
| Create event, onboarding, auth | Use the typed `stepFlow` or `standalone` surface role while preserving their task-specific header, safe-area, keyboard, and footer behavior. |
| Host Forms | Keep Forms / Responses as peer pages in the direct Forms destination. The Forms directory uses an 840 px operational content lane on capable widths so lifecycle, response, and consequence summaries remain legible. The builder stays single-task on phone and uses outline / respondent preview / inspector panes from 960 px; phone publication stays in `CatchDock.primary`, while tablet and desktop publication belongs in the top command bar rather than a full-viewport footer. |

### Design Tooling And Component Contracts

Catch's UI system has separate sources of truth by layer:

| Layer | Source of truth | Mirrors / consumers |
|---|---|---|
| Primitive token values | `design/tokens/catch.tokens.json` | Flutter generated tokens, website CSS, Figma variables, Claude/Figma context packs |
| Flutter widget behavior | `packages/catch_ui/lib/src/**`, `lib/core/widgets/**` | Component contracts, goldens/captures, Figma Code Connect snippets |
| Cross-tool component API | `design/components/catch.components.json` | Claude handoff rules, Figma component mappings, Code Connect templates, future registry docs |
| Screen composition | Feature Flutter code | UI captures, gallery screenshots, design review packs |

Design tools may propose screen structure, but production code should be built
from registered `Catch*` primitives or explicit deltas to the registry. Treat
arbitrary JSX/CSS exports as visual proposal material, not implementation
source. A handoff is implementation-ready only when it names component contract
ids, props, slots, and any missing primitive/token deltas.

Style Dictionary is a candidate token transformation engine, not a component
translator. Keep `dart run tool/design_tokens.dart` as the production generator
until a spike proves generated Dart/CSS equivalence, custom gradient/semantic
formats, deterministic `--check`, and real Figma/Tokens Studio value. Component
contracts remain separate; no Style Dictionary output is widget implementation.

Validate the component registry with:

```sh
node tool/design/check_component_contracts.mjs
```

### UI Analyzer Lint Policy

Catch-owned UI rules use the local analyzer plugin package
`packages/catch_ui_lints`. Do not add new `custom_lint` rules. Deterministic
UI invariants should be implemented as `analysis_server_plugin` diagnostics so
the IDE and repository-root `dart analyze` can surface the same signal. In the
current toolchain, `flutter analyze` and `dart analyze lib` do not load the
Catch plugin; they remain useful generic checks but are not Catch lint proof.

The current lint scope is all handwritten `lib/**` Dart except
`packages/catch_tokens/lib/**`, `lib/core/theme/**` foundations, generated code,
and schema-generated contracts. The token package owns raw token definitions; feature/shared widget code consumes
named `CatchSpacing`, `CatchLayout`, `CatchGaps`, `CatchInsets`, `CatchRadius`,
`CatchBorder`, `CatchStroke`, and Catch control primitives instead of local raw
layout numbers or Material/Cupertino controls. `catch_no_raw_stroke_width`
covers all handwritten app code, including shared widgets and 1 px literals;
zero remains the explicit no-border value, while decorative `CustomPainter`
artwork is outside this UI-boundary diagnostic.

`catch_text_requires_style` also steers direct, resolved `Text` calls onto
`CatchText` when its current variant and argument set preserve the call.
Existing calls are counted per file and role in
`tool/architecture/catch_text_migration_baseline.json`; new calls fail and name
the matching `CatchTextVariant`. The existing lint-drift zero gate checks that
this baseline matches the resolved source and cannot grow from its merge base.
After a migration, regenerate it with
`bash tool/check_catch_ui_lint_drift.sh --update-text-baseline`.
The initial adoption also records pre-existing uncovered roles whose arguments
already fit the text API. These reservations remain dormant until their variant
exists, then activate without increasing another role's allowance. Uncovered
calls added later cannot enlarge a reservation, and no diagnostic requires a
variant that does not exist. Both enabled and dormant allowances only shrink.
Modified styles, uncovered roles and unsupported text APIs remain review inputs;
the steer does not invent replacement props or change typography to fit a role.
The missing-style diagnostic continues to apply independently.

`catch_no_raw_surface_shell` owns the D18 drawing boundary across handwritten
production `lib/**` and both app packages. Its resolved SDK identities cover
surfaces, clipping, paint/effects, images, dividers, decoration, borders, radii
and gradients, including aliases and direct SDK subclass declarations. Custom
painter, clipper and decoration strategy bases belong to that same boundary. Layout
widgets such as Row, Column, Stack, Padding and SizedBox remain arrangement.
The former decorated-surface heuristic is retired. Existing control/network
image diagnostics retain their boundary where they already fire.

Existing drawing sites have per-file, per-family allowances in
`tool/architecture/catch_drawing_migration_baseline.json`. The lint-drift zero
gate checks this resolved inventory and its merge-base shrink constraint;
regenerate with
`bash tool/check_catch_ui_lint_drift.sh --update-drawing-baseline` after a
migration. The initial baseline requires unchanged app/library source.
Icon and Tooltip are inventoried as dormant reservations until CAT-226 supplies
their library components; their later activation cannot enlarge allowances.
The baseline's `activeKinds` records the same families enforced by the rule.
Drawing and text use the same census/history engine, preserving separate
budgets for each source file, including parts. This migration changes ownership
enforcement without changing rendering or choosing new component APIs.

Closed Field layouts and secondary actions render only inside their owning
Field library. The inventory's exact source/library/owner/method/return-type
declarations in `tool/design/lib/owned_composition_renderers.mjs` recognize
those renderer fragments, the Section action recipe, Banner body feedback,
and TopBar's measured frame, search field and selector-row renderers. These
private fragments implement an existing cataloged owner's closed recipe or
state lifecycle; they are not independently reusable components. The same
inventory recognizes three typed domain/route factories. It does not exempt
sibling helpers, moved implementations, or arbitrary Widget-returning
factories. Tests verify the named renderer methods still exist and mutation
tests cover each identity dimension; resolved Catch UI lints separately
enforce the primitive's construction and interaction boundary.

Widget identity is checked globally rather than one folder at a time. The
source-derived classification and new-widget gates scan `lib/**`,
`apps/consumer/lib/**`, and `apps/host/lib/**` together, resolve widget ancestry
transitively so an indirect subclass cannot evade discovery, and reject exact
public-class duplicates or ungoverned normalized-name collisions across those
roots. Generated exclusions are deliberately narrow: `.g.dart`,
`.freezed.dart`, and the two named localization outputs are excluded, but a
hand-authored file inside a directory called `generated` is still production
source. Widget-returning functions and getters are separately inventoried so
moving composition out of a class does not bypass the naming policy.

Implemented diagnostics include raw spacing, token arithmetic, section-list
composition, semantic inset preference, event-detail photo thumbnail preference,
raw Material control use, raw color/text/font/radius/content dimension/local
design constants/icon source/icon size/alpha/shadow/motion/breakpoint/surface
shell/stroke/asset path, icon-button tooltip requirements, allow-debt blocking,
and widget-returning method blocking.

Placement rules additionally cover top-bar action ownership, shell-owned tab
scaffolds, field/section context, explicit collection empty-state policy,
AsyncValue loading/error coverage, raw error surfaces, and feature-local shell
measurement. Every Catch analyzer diagnostic is now a zero-tolerance CI
failure. `CatchSectionList` makes the empty-state decision explicit in its API:
callers provide `emptyBuilder` or name the deliberate
`emptyStateOmitted: true` opt-out.

Cross-file rules use
`tool/architecture/check_ui_composition_contracts.dart`, which resolves every
registered source before checking its symbol, state policy, top-bar contract,
per-route typed layout owner, static `GoRoute` presentation-to-owner
reachability, and the global single-owner Scaffold boundary.
Component enforcement metadata generates
the plugin steering tables and probe corpus; the bidirectional coverage gate
requires every primitive to have enforcement or an unexpired waiver and every
implemented `catch_*` code to have a catalog owner.

Verification commands:

```sh
bash tool/check_catch_ui_lints.sh
bash tool/check_catch_ui_lint_drift.sh --check
bash tool/check_catch_ui_lint_drift.sh --all --json /private/tmp/catch-ui-lint-drift.json
node tool/design/build_lint_enforcement_tables.mjs --check
node tool/design/check_component_enforcement_coverage.mjs
dart test test/tool/ui_composition_contracts_test.dart
dart test test/tool/route_discovery_adversarial_test.dart
dart run tool/architecture/check_ui_composition_contracts.dart --check
flutter analyze --no-fatal-infos
```

The final command is intentionally listed as the generic analyzer complement,
not as proof that the Catch analyzer plugin loaded.

## Async State Boundary Taxonomy

Every async state needs a named boundary. The boundary can be generic or
feature-specific, but it must be obvious to a reader where loading, error,
empty, retry, stale data, and mutation failure are handled.

| State category | Owner | UI primitive or pattern |
|---|---|---|
| Full-screen initial load | Screen | `CatchAsyncBoundary`, `CatchErrorScaffold`, or typed screen-state adapter |
| Sliver initial load | Screen/sliver body | `CatchAsyncBoundary.sliver`, `CatchSliverErrorState`, or typed sliver adapter |
| Section-level load | Section widget or view model | `CatchErrorState` in inline/compact mode, section skeleton, section retry |
| Empty success | Screen/body/section | `CatchEmptyState`, `CatchSliverEmptyState`, or a domain-specific empty widget, never an error primitive |
| Mutation/action pending | Controller mutation + UI affordance | disabled control, spinner, optimistic state when intentional |
| Mutation/action failure | Screen or section | `CatchLocalizedErrorBanner.mutation`, `listenToCatchMutationErrors`, or `showCatchNoticeError` |
| Form validation | Form/controller/domain validator | field error text or inline form banner |
| Optional enrichment failure | Repository/view model | keep primary UI alive, log through error context when useful |
| Platform/plugin failure | Service/repository/controller seam | typed app error, transient CatchNotice for a brief user action failure |
| Framework/runtime failure | Global handlers | `FlutterError.onError`, `PlatformDispatcher.instance.onError`, `CatchFrameworkErrorState` |

Use `CatchAsyncBoundary` for simple body screens with one async value.

Use `CatchAsyncBoundary.sliver` for simple sliver surfaces.

When the loaded detail, form, card, or collection composition is known, render
that same composition with representative branch data inside
`CatchSkeleton.content`. `CatchSkeleton.content` suppresses pointer input and
placeholder semantics while the real layout supplies shape and reflow.
Ordinary row collections use `CatchSection.loadingRows`,
`CatchSection.sliverLoadingRows`, or `CatchSection.containedLoadingRows` to
match the loaded Section perimeter with the eventual `CatchFieldLayout` anatomy;
the Section and Field still own gutters, dividers, interaction shape, and
disclosure slots. A loading branch may estimate count, but it must not invent a
second row tree or enclosing card. Leaf `CatchSkeleton.box/text/circle` shapes
remain appropriate only where no actual child layout exists yet, such as an
unknown remote image or chart.

When the fetched data determines whether the screen has a conversation, form,
roster, card, or empty state, there is no honest layout to skeletonize yet.
Keep the known header and controls mounted and use
`CatchStateViewport.sliverLoading` below them, or
`CatchStateViewport.loading` in a bounded, non-scrolling route body. These
variants center progress in the remaining visible area and account for a
floating bottom navigation bar. `CatchAsyncBoundary.sliver` uses the sliver
variant by default when `fillRemaining` is true. Do not fabricate a likely
card or row collection while the route structure is unresolved.

The route scaffold and its body geometry belong outside async state switches.
For example, Today selects `CatchRootScreenScaffold.sections` once, then
switches only the sliver content. A state change cannot substitute a standard
inset body for the loaded full-width section body. The
`design:loading-composition` rejects removed generic row and collection
recipes on Host and Consumer presentation surfaces, as well as root-title
style overrides. Its per-file allowance is now zero everywhere. Catch UI no
longer exposes repeated cards, rows, boxes, chips, or fake screen/sliver
adapters; callers must choose the real composition or the centered state
viewport.

Both primitives apply `InitialLoadPolicy.standard` (12 seconds) to the first
user-visible resolution and to blocking retries that have no credible data.
When the deadline expires, the skeleton becomes a branded timeout state. Every
presentation call site must supply `onRetry`; the
`catch_async_requires_retry` analyzer diagnostic enforces that contract. The
deadline is a presentation/provider-boundary policy only: never apply an idle
timeout to a long-lived Firestore stream after its first value.

Every full-screen or sliver error must also leave the user a truthful next
step. Use `onRetry` when the failed operation is safe to rerun. For terminal
route conditions such as a deleted resource, invalid route argument, or lost
authorization, supply `actions: [CatchErrorBackButton()]` (or another
explicit destination action) instead. Inline errors may inherit recovery from
their surrounding section. The `catch_error_state_requires_action` analyzer
diagnostic rejects actionless full-screen and sliver error surfaces in feature
presentation code.

Use a feature-owned typed UI state when a screen has richer behavior, such as:

- partial secondary failures;
- stale cached data while refreshing;
- optimistic updates;
- separate section loading states;
- mixed permissions/auth/data outcomes;
- complex empty-state decisions;
- several repositories combined into one screen state;
- retry behavior that differs by section.

The typed state should still expose explicit loading/error/data semantics. Do
not hide `AsyncError` by calling `requireValue` or by converting failures into
empty states.

When one screen composes a secondary async dependency, loading, failure,
resolved absence, and resolved partial data remain separate product truths.
Translate the dependency to a typed state before applying fallbacks; never use
`async.asData?.value ?? emptyValue` when that would make an unresolved or failed
lookup look like a successful empty result. Optional enrichment may keep the
primary content alive with a section skeleton or inline retry, while
comprehension-critical enrichment may gate its section, but only a successfully
resolved missing record may use missing-resource copy or a domain fallback.

## Error Handling Contract

This section is the current error architecture contract. Historical migration
counts and old pass notes remain in git and audit history; active guidance lives
here.

### Current Error Surface Model

The error primitive family separates visual content, placement adapters, and
delivery channels:

- `CatchErrorState` owns one cardless error renderer with caller-resolved copy.
  `CatchLocalizedErrorState` maps app error objects through the inherited locale.
  Both use `CatchErrorStateMode` for placement within their owning content.
  Full-screen, inline, and compact modes never invent a new fill or outline; they inherit containment
  from the route or section that owns the failed content.
- `CatchErrorScaffold` and `CatchSliverErrorState` adapt the root-page and
  sliver protocols. Section errors use the inline/compact modes of
  `CatchErrorState`; app-error adapters use the corresponding localized APIs.
  Every form supports primary retry and an `actions` list for additional recovery.
- `CatchEmptyState` renders successful empty results. `CatchEmptyStateVariant`
  selects stacked or inline content; `CatchSliverEmptyState` owns sliver placement.
  Their `actions` list shares the same slot spelling while empty results retain
  their distinct meaning and layout.
- `CatchErrorBackButton` is the canonical route-exit action when retry would
  be dishonest or impossible.
- `CatchBanner.error` is the persistent inline mutation/form error channel.
- `CatchLocalizedErrorBanner.mutation` is the persistent Riverpod mutation recipe
  on the app-localized banner. Callers retain the mutation subscription; the
  recipe renders only its error state through the same copy/recovery boundary.
- `listenToCatchMutationErrors` subscribes during the owning Consumer build,
  in the branch that owns the action. It preserves keyed mutation handles,
  subscribes once per distinct handle, and publishes only pending-to-error
  transitions. Riverpod cancels the subscriptions when that branch or widget
  leaves; rebuilds never replay an existing failure.
- `showCatchNoticeError` is the canonical transient action failure surface.
- `CatchFrameworkErrorState` is separate and only for `ErrorWidget.builder` /
  framework build/render crashes.

Do not reintroduce `CatchErrorText`, raw `Center(Text(error.toString()))`,
raw vendor messages, or bespoke error cards that discard retry/error context.
An explicit caller retry callback is authoritative and must not be suppressed
by exception metadata. Firestore `permission-denied` is an operational backend
failure unless a domain/callable boundary has explicitly classified it as a
user authorization decision.

### Failure Channels

A first-class Catch error system covers these channels:

| Channel | Examples | Required handling |
|---|---|---|
| Firebase backend services | Firestore, Auth, Functions, Storage, Messaging, Remote Config, App Check | Normalize vendor exceptions once at the boundary, preserve non-PII operation context, map to `AppException`, log/report with stable codes. |
| Platform/plugin side effects | Share sheet, URL launcher, image picker, location, device permissions, app-store launches | Put behind provider/service seams, normalize expected plugin failures, treat user cancellation as low severity, log unexpected plugin bugs. |
| Frontend validation and parsing | Form input, local draft JSON, route/deep-link params, profile/event fields, date/number parsing | Convert user-correctable failures into `ValidationException` or typed local exceptions before raw UI. |
| Domain/business rejections | Sign-in required, permission denied, already joined, not eligible, payment cancelled/failed, booking rejected | Use typed `AppException` subclasses only when code, retry policy, analytics, or tests need stable branching. |
| Controller/mutation failures | Riverpod mutations, multi-step flow mutations, callback-completer APIs | Let typed errors propagate to mutation state; add action context where the repository boundary cannot explain the failure. |
| Provider/load failures | `FutureProvider`, `StreamProvider`, cached/stale refresh, empty vs error states | Render through the `CatchErrorState` family, preserve retry actions, and log provider errors centrally. |
| Flutter framework failures | Build/layout/render exceptions, `ErrorWidget.builder` fallback | Keep minimal `CatchFrameworkErrorState`; report through global hooks; do not try to run normal app UI in an unstable build tree. |
| Uncaught asynchronous failures | Timers, plugin callbacks, unawaited futures, platform dispatcher errors | Wire `PlatformDispatcher.instance.onError`, pass to `ErrorLogger`, report fatal/nonfatal according to severity. |
| Unexpected programmer bugs | Bad state, invalid arguments, invariant violations, null/schema mismatch | Do not show raw details to users. Log/report with stack trace, show generic app copy, and turn recurring user-correctable instances into typed exceptions. |
| Operational/release signals | Crashlytics, Analytics, console fallback, emulator tests, dashboards, alerts | Attach useful non-PII keys/logs; smoke-test reporting in release-like builds. |

The goal is not "catch everything everywhere." The goal is:

1. Expected failures are typed, user-safe, retry-aware, and testable.
2. Unexpected failures retain stack traces and enough context to diagnose.
3. Every app-facing surface gets a branded error primitive.
4. Every caught error is displayed, rethrown as a typed app error,
   reported/logged, or intentionally documented as silent/noisy.
5. Product-significant expected failures can appear in analytics without
   polluting Crashlytics as crashes.

### Boundary Classification

Classify low-level errors at the closest stable boundary:

| Boundary | Preferred API | Notes |
|---|---|---|
| Firebase/backend repository call | `withBackendErrorContext` / `withBackendErrorStream` | Correct transport wrapper for backend calls. |
| Non-backend app operation | `withAppErrorContext` / `normalizeAppError` | Use for local, platform, validation, parsing, and controller-owned failures. |
| Fire-and-forget local work | `runLoggingAppErrors` / `logAppError` | Replacement for bare `catch (_) {}` when the app legitimately continues. |
| Form field validation | `FormField` validators plus reusable domain validators | Use inline field errors for simple per-field validation; throw only when async flow or shared business logic needs an exception. |
| Domain guard | `requireSignedInUid`, eligibility guards, action cardinality checks | Throw typed `AppException` when UI can recover or message the user. |
| Provider/load state | Riverpod `AsyncValue` | Preserve `error` and `stackTrace`; render with descriptor primitives. |
| Framework/global runtime | `FlutterError.onError`, `ErrorWidget.builder`, `PlatformDispatcher.instance.onError` | Report globally; avoid feature-level copy because the app tree may be compromised. |

Presentation `AppErrorContext` and operation context answer different questions.
Presentation context is where the error is shown. Operation context is what the
app was trying to do. Do not put PII in either.

### App Operation Context API

`lib/core/app_error_context.dart` is the non-backend parallel to
`BackendErrorContext`. It adapts to the backend normalizer/logging shape so the
whole app keeps one context and reporting model.

| Symbol | Shape | Use for |
|---|---|---|
| `AppOperation` | `validation`, `localPersistence`, `navigation`, `plugin`, `ui`, `runtime` | Tags the failure category. `plugin` logs under external service; the rest under local service. |
| `AppErrorContext` | `{operation, action, resource?, metadata}` | Low-cardinality, non-PII operation context. |
| `normalizeAppError(error, context, mapper?)` | `AppException` | Normalizes local/plugin errors and can promote user-correctable input to `ValidationException`. |
| `withAppErrorContext(op, context, mapper?)` | `Future<T>` | Wraps plugin/local async work so thrown errors become typed app exceptions. |
| `runLoggingAppErrors(op, context, logError, mapper?)` | `Future<bool>` | Runs best-effort work, logs normalized failure, returns `false`. |
| `logAppError(error, context, logError, mapper?)` | `void` | Normalizes and records a caught error when the operation legitimately continues. |

Privacy rules: never put user IDs, phone numbers, file names, message text,
bios, photo URLs, exact coordinates, payment ids, or raw document ids into
`action`, `resource`, or `metadata`.

### Exception Taxonomy

Use `AppException` subclasses only for stable product/domain concepts that need
branching, analytics, retry policy, audit value, or tests. Use mapped copy for
one-off wording.

| Family | Examples | Target handling |
|---|---|---|
| Auth/session | signed out, expired credential, auth provider disabled, throttled OTP | `SignInRequiredException`, Auth mapper, `ValidationException`, `NetworkException`. |
| Network/backend | offline, timeout, rate limit, permission denied, not found, backend unknown | `NetworkException`, `PermissionException`, `DocumentNotFoundException`, `BackendOperationException`. |
| Storage/media | upload cancelled, file missing, unauthorized, retry limit, invalid file | `StorageException` plus feature-specific mappers when needed. |
| Payments/booking | checkout cancelled, payment failed, verification failed, booking rejected | Payment/booking exceptions with support-oriented reporting and nonfatal severity. |
| Validation/forms | invalid name, date, phone, age, height, route params, local payload | Inline validators or `ValidationException` for shared/async failures. |
| Local persistence/cache | corrupt draft, unsupported schema, local write/read failure | Local operation context plus typed/mapped exception when user-facing. |
| Navigation/deep links | malformed link, missing route id, inaccessible target, stale invite | Typed route/deep-link failure if user-facing; otherwise logged unexpected bug. |
| Location/permissions | denied, permanently denied, service disabled, unavailable | Permission/location exception or mapper; retry/settings copy where useful. |
| External actions | share failed, URL launch failed, store link failed, picker failure | `ExternalActionException` or mapper through app operation context. |
| Programmer bugs | `StateError`, `ArgumentError`, assertion, schema invariant | Bugs unless user can correct the condition. Never show raw details. |
| User cancellation | picker/upload/payment cancelled | Usually low severity and often no error surface; must be explicit. |

### Descriptor And UI Contract

Every app-facing error ends in one descriptor contract:

```text
Object error + presentation AppErrorContext
  -> appErrorDescriptor
     -> title
     -> message
     -> severity
     -> retryable
     -> retryLabel
     -> icon
     -> support/report affordance when needed
```

Surface rules:

| Surface | Use when | Required behavior |
|---|---|---|
| `CatchErrorScaffold` | Root screen/tab cannot load | Title/message/retry from descriptor; never raw exception text. |
| `CatchSliverErrorState` | Sliver-native load failure | Same descriptor, sliver-compatible layout. |
| `CatchErrorState` in inline/compact mode | Section/card-level failure | Compact descriptor copy and retry when retryable. |
| `CatchLocalizedErrorBanner` / `.mutation` | Persistent form/mutation failure | Preserve explicit recovery; no retry unless action exists; avoid duplicating field validation. |
| `showCatchNoticeError` | Transient action failure | Descriptor message and retry action if the failed action can safely rerun. |
| Field validation error | Per-field invalid input | Specific field copy, not a transient notice or generic exception. |
| `CatchFrameworkErrorState` | Flutter build/render failure | Minimal fallback; diagnostic details only in debug/reporting. |
| Empty state | Successful load with zero items | Never use an error primitive for empty data. |

Rules:

- Repositories wrap Firebase/backend operations with
  `withBackendErrorContext` or `withBackendErrorStream`.
- Local, validation, platform, and plugin operations use the app operation
  context APIs from `lib/core/app_error_context.dart` when they can fail outside
  backend wrappers.
- Controllers usually do not catch repository errors. Let typed errors
  propagate through Riverpod `AsyncValue` or `Mutation` state. Catch only when
  adding useful domain context, rollback, or alternate behavior.
- UI never shows raw `error.toString()`, raw Firebase messages, stack traces,
  or vendor/plugin objects.
- Full-screen data errors use `CatchErrorScaffold` or `CatchErrorState`.
- Sliver data errors use `CatchSliverErrorState`.
- Section errors use `CatchErrorState` with an inline or compact mode. Use
  `CatchLocalizedErrorState` when the input is an app error object.
- Persistent mutation/form failures use `CatchLocalizedErrorBanner` or
  `CatchLocalizedErrorBanner.mutation`.
- Transient action failures use `listenToCatchMutationErrors` or
  `showCatchNoticeError`.
- Flutter framework/build/layout crashes use `CatchFrameworkErrorState`, not the
  normal app-facing error family.
- Empty state means successful data load with zero items. It is not an error
  fallback.

Every mutation watched for `isPending` must also surface `hasError`. Mutation
objects should use the same grain as the action cardinality contract: one
visible action plus one scope key maps to one pending/error surface. Do not use
one screen-wide mutation to drive several CTAs with different scope keys, and do
not split one singleton action into multiple independent mutation objects unless
the UI still renders one resulting state.

### Controller And Mutation Errors

Controllers usually delegate to repositories and let errors propagate through
Riverpod `Mutation` state:

```dart
Future<void> joinWaitlist({required Event event}) async {
  final uid = requireSignedInUid(ref, action: 'join a waitlist');
  await ref
      .read(eventRepositoryProvider)
      .joinWaitlistViaFunction(eventId: event.id, uid: uid);
}
```

The UI watches and surfaces the mutation:

```dart
final joinMutation = ref.watch(EventBookingController.joinMutation);
return Column(
  children: [
    if (joinMutation.hasError)
      CatchLocalizedErrorBanner.mutation(mutation: joinMutation),
    CatchButton(
      isLoading: joinMutation.isPending,
      onPressed: () => Mutation.run(
        ref,
        (tx) => tx.get(eventBookingControllerProvider.notifier).joinWaitlist(),
      ),
    ),
  ],
);
```

For transient errors, subscribe in the owning Consumer build branch:

```dart
listenToCatchMutationErrors(
  context,
  ref,
  mutations: [EventBookingController.joinMutation],
  errorContext: AppErrorContext.event,
);
return EventDetailBody(...);
```

Use try/catch in controllers only for adding useful context, rollback, converting
callback APIs to futures, or intentionally continuing after a logged local
failure. Do not catch only to show UI from a controller.

Transient publication is a shared boundary in both apps:
`showCatchNotice` and `showCatchNoticeError` publish brief feedback through
the app-level `CatchNoticeController` queue. Brief action feedback uses the
ordinary queue priority and a stable deduplication key, so repeating one action
replaces its queued copy. Notices keep stable FIFO ordering within their
priority. Action labels and callbacks stay on `CatchNoticeData`; error notices
preserve explicit retry callbacks.

`catch_use_canonical_feedback` resolves Flutter symbols and rejects
`SnackBar`, `SnackBarAction`, `MaterialBanner`, and `ScaffoldMessenger` usage,
including aliases, tear-offs, state publishers, clearing/hiding methods, and
`MaterialApp.scaffoldMessengerKey`. There is no production owner exemption.
Deterministic probes cover Host, Consumer, shared/core code, aliases and
lookalike non-Flutter types. Keep field validation beside its field, section/load
failures beside their section, persistent mutation errors in `CatchBanner`, and
framework crash fallbacks in `CatchFrameworkErrorState`.

Foreground match/message delivery has three owners shared by Host and Consumer:
`FcmService` owns SDK subscriptions, app/recipient checks, token rotation and
authenticated installation cleanup. `ForegroundNotificationController` owns
session/lifecycle validation and bounded event deduplication;
`ForegroundNotificationListener` maps validated events to localized
`CatchNoticeData.arrival` and locally derived conversation destinations. It
suppresses notices for the conversation already open and removes queued notices
when that conversation opens. Neither the renderer nor transport owns feature
navigation policy. Inquiries resolve organizer manager membership on the server:
customer-to-manager targets Host; manager-to-customer targets Consumer. Personal
matches/messages target Consumer. Host replies use professional Host identity.

One `CatchNoticeOverlay` is mounted in `MyApp` above the routed child, inside the
force-update gate. It owns safe-area overlay placement, arrival motion, bounded
FIFO/priority queue display, auto-dismiss and tap/swipe/keyboard/accessibility
interaction. The overlay supplies the actual Flutter Overlay ancestor for notice
tooltips. Pointer, hover and focus pause expiry for both ordinary and arrival
notices. F6 or Shift+F6 transfers focus between notice controls and the prior
route focus; showing a notice never steals keyboard focus. Text wraps and
long actions move below the content when their measured widths do not fit.
Arrival cards never consume header/body layout space. They sit
above title, tabs and persistent status strips, including on pushed routes.
`catch_notice_host_is_app_owned` rejects route-local hosts and
`catch_notification_delivery_is_service_owned` rejects raw foreground SDK
subscriptions outside `FcmService`; both rules resolve aliases/tear-offs.

`AuthSessionController` unregisters an already-created push service before auth
sign-out. Cleanup is bounded and best-effort offline; a persisted revocation
flag requires successful token rotation before a subsequent session registers.
Foreground payload validation cannot retract an OS notification already handed
off before logout. Real-device background/terminated delivery remains a release
verification step, not something widget tests prove.

### Durable Local Commands

`core/persistence/local_command_journal.dart` owns the offline command policy for
both event attendance and private-program operations. Feature adapters own typed
payload validation, resource keys and callable execution; neither domain owns a
second persistence or retry algorithm. Account-scoped journals retain immutable
operation IDs, payload hashes, expected revisions and dependencies. Append,
claim, acknowledge and conflict transitions are storage transactions. Short
persisted replay leases prevent two tabs from concurrently draining the same
scope; server operation receipts remain the cross-device idempotency authority.
Current account identity is checked before each replay. Reconnect always uses the
server's current authorization, never a cached grant.

Journal format version 2 hashes the immutable creation time as well as the
payload and validates that command and envelope timestamps agree. Program
adapters send this time as the observation/departure fact; all adapters use it
to bound replay age. Version 1 journals upgrade in one storage transaction only
after every existing hash and envelope passes validation. Migration preserves
original timestamps, dependencies, leases and terminal states. Invalid or
quarantined records remain stored and cannot replay. Migration cannot establish
the historical integrity of a timestamp that version 1 did not hash.

The storage interface wraps native SQLite (`sqlite3`, FULL synchronous commits)
and browser IndexedDB (`idb_shim`, awaited transaction completion). Native writes
are synchronous and bounded by a 1 MiB journal limit; profile a full journal on
pilot devices before expanding that limit. IndexedDB has browser-controlled
quota, eviction and power-loss guarantees; private/ephemeral browsing is not a
durable shift recorder. There is no in-memory production fallback. The explicit
memory implementation exists for tests and Widgetbook only.

SharedPreferences was rejected for commands because a read/list/write sequence
can lose concurrent work and does not provide transactional durability. A plain
Sembast file was rejected for its lazy file writes and single-process boundary.
Drift remains a reasonable future choice for relational local data, but this
bounded key/value journal needs no ORM or SQLite web worker/WASM deployment.
The selected platform bindings delegate persistence to established databases and
keep the domain replay algorithm shared. See the
[SQLite binding](https://pub.dev/packages/sqlite3) and
[IndexedDB binding](https://pub.dev/packages/idb_shim) for platform constraints.

Pending or conflicted observations never expire or get trimmed to make room.
After seven days, unresolved observations require explicit review. Capacity
rejects new writes visibly; it never discards accepted work. Commands touching a
shared resource depend on earlier unresolved commands. Conflicted predecessors
quarantine their dependents without rebasing immutable revision fences. Explicit
dismissal hides a reviewed observation but retains it for recovery. Acknowledged
and dismissed records may be pruned after 30 days only when no retained command
depends on them. Corrupt legacy payloads remain quarantined; healthy migration
commits before deleting the legacy copy. Account changes never expose another
account's queue. Read-only snapshots have a separate bounded lease and are not
command storage.

Recovery export uses a read-only raw-value storage API so even malformed JSON
can be copied without initialization, migration or replay. The versioned export
contains this account and namespace's original journal string plus its original
legacy string. It does not filter by feature scope because damaged records may
have unreadable scope identities. Authentication is checked across every await;
storage errors omit raw payloads. The operator explicitly chooses the file's
destination through the existing platform share/save adapter. Export success
never clears, dismisses or marks records repaired. Database-level damage that
prevents reading still requires device/support recovery; an export is not an
automatic repair or proof of a completed backup.

### Logging And Telemetry

Current reporting path:

```text
Error thrown
  -> AsyncErrorLogger ProviderObserver
       -> AppException: warning-level/logged expected app failure
       -> BackendOperationException: optional backend_operation_failed analytics
       -> Other: ErrorLogger.logError -> Crashlytics in production release
  -> FlutterError.onError -> ErrorLogger.logFlutterError
  -> PlatformDispatcher.instance.onError -> ErrorLogger.logError
  -> explicit logAppError/runLoggingAppErrors for best-effort local/plugin work
```

Crash/reporting should be useful, not noisy:

| Event type | User display | Crashlytics | Analytics | Notes |
|---|---|---|---|---|
| Expected validation/auth/permission | User-safe copy | Usually no crash issue | Yes when product-significant | Avoid alert fatigue. |
| Expected retryable backend/network | Retry copy | Nonfatal only if repeated/high impact | Yes with service/action/code/retryable | Prefer aggregated analytics. |
| User cancellation | Usually no error or low-key copy | No | Usually no | Cancellation is not failure unless product says so. |
| Payment/booking verification failure | Support-oriented copy | Nonfatal with context | Yes | High business impact but not necessarily crash. |
| Unexpected exception/bug | Generic user copy | Yes with stack trace | Optional | Must retain stack and operation context. |
| Framework/global uncaught fatal | Fallback or app crash | Fatal | Optional | Covered by FlutterError/PlatformDispatcher. |

Use stable, low-cardinality keys: `app_env`, `app_version`, platform, Firebase
project alias, `error_family`, stable code, severity, retryable, expected,
service, feature, action, resource, and presentation context. Do not log PII.

`ErrorLogger` owns a replaceable console sink. Production construction keeps the
normal debug console and Crashlytics path. Expected-error tests and deterministic
captures may use `ErrorLogger.silent(...)` or inject a recording `consoleSink`
so asserted failures do not flood the runner with stack traces. Silencing the
console must never disable an explicitly supplied crash reporter or turn an
unexpected production failure into a swallowed error.

### Privacy And Safety

- Never show raw `FirebaseException.message`, stack traces, callable details, or
  plugin object dumps to normal users.
- Error UI copy must not append debug diagnostics, even in debug builds.
- Developer details belong in `ErrorLogger`, Crashlytics, analytics metadata,
  backend logs, and the Flutter console.
- Never log PII in error metadata: names, phone numbers, exact birth dates,
  chat/message text, profile bio, photo URLs, precise locations, payment ids or
  signatures, and sensitive document ids.
- Preserve original cause and stack trace for developer diagnosis.
- Treat security-rule denials as product/security signals, not generic retry
  failures unless retry can actually succeed after user action.

### Error Scanners

Run the backend scanner before backend error work:

```sh
dart tool/audit/backend_error_candidates.dart
```

Run the frontend/local scanner before frontend/local/plugin error work:

```sh
dart tool/audit/frontend_error_candidates.dart
dart tool/audit/frontend_error_candidates.dart --check
```

Both scanners use stable buckets: `mustMigrate`, `review`, `verified`,
`intentional`, `fixture`, and `migrated`. `mustMigrate` and `review` should stay
at zero. The frontend check uses
`tool/audit/frontend_error_candidates_baseline.json` as a temporary ratchet for
reviewed legacy candidates, so new unbaselined `review` or `mustMigrate`
findings fail without requiring unrelated Flutter edits in the same pass. The
scanner is not proof by itself; it gives a single source of truth for what still
needs migration and what was intentionally retained.

Candidate patterns:

- bare `catch (_)`, empty catch, `.catchError` without logging/rethrow;
- `debugPrint`, raw framework messenger widgets, or `Text(e.toString())` for errors;
- raw `StateError`, `ArgumentError`, `Exception`, or thrown strings;
- `AsyncValue(error:)` branches not using descriptor primitives;
- casual `requireValue` in widgets/providers;
- `Timer`, subscription, callback, unawaited future, or plugin futures;
- `jsonDecode`, local storage reads, route/deep-link parsing;
- `url_launcher`, share, image picker, geolocator, permission handlers;
- raw Firebase/Auth/Functions/Storage messages in UI;
- global handlers (`FlutterError`, `ErrorWidget.builder`, platform dispatcher);
- test fakes and fixtures for classification.

### Error Quick Reference

| Concern | File |
|---|---|
| Exception types | `lib/exceptions/app_exception.dart` |
| Backend error wrapping | `lib/core/backend_error_util.dart` |
| Frontend/local op context | `lib/core/app_error_context.dart` |
| User-facing backend messages | `lib/core/app_error_message.dart` (`appErrorDescriptor` / `appErrorMessage`) |
| UI-facing title/message facade | `lib/core/app_error_message.dart` |
| Central error logger and `AsyncErrorLogger` | `lib/exceptions/error_logger.dart` |
| Analytics error events | `lib/core/analytics/app_analytics.dart` |
| Backend scanner | `tool/audit/backend_error_candidates.dart` |
| Frontend scanner | `tool/audit/frontend_error_candidates.dart` |
| Branded error surfaces | `packages/catch_ui/lib/src/components/catch_error_state.dart` |
| App-level transient feedback | `lib/core/riverpod_ui/catch_notice_feedback.dart` |
| Error banner | `packages/catch_ui/lib/src/components/catch_banner.dart` |
| Mutation helpers | `lib/core/riverpod_ui/mutation_error_util.dart` |
| Mutation subscriptions and transient error notices | `lib/core/riverpod_ui/catch_notice_feedback.dart` |
| Global error handlers | `lib/app_bootstrap.dart` |

### Event conversation session ownership

Event conversations use `EventChatRepository` and `EventChatController`; the
existing dating-match repository is not an admission source. The repository
uses generated callable requests with the reviewed account UID on mutations.
The controller fences asynchronous results by UID, provider generation and read
epoch. It clears visible history when backgrounded or when authority cannot be
verified, and revalidates all loaded history windows rather than appending stale
reply quotes. A new foreground read is required before sending again.

Sending retains the request ID for the exact normalized draft and reply until
acknowledged. Reaction changes retain the reviewed per-message revision.
Typing never sends draft text, serializes start/stop acknowledgements, and stops
after editing is idle even if an unsent draft remains. The controller owns
refresh cadence and scales it with requested history depth; widgets own text
editing, scrolling and app/route lifecycle signals. Account changes must also
clear widget-owned drafts and reply selection before rendering another account.
Mutation entrypoints also require the UID associated with the rendered controls;
an old callback cannot become an action for a newly signed-in account.

`EventChatScreen` is a shared authenticated route at `/events/:eventId/chat`.
It is reachable before dating onboarding so admitted form applicants can review
and claim a private profile first. Admission and explicit room membership still
come from the callable authority. The Host event toolbar opens the same room;
the consumer event detail requests only room access metadata for its entry row.
The message menu contains reply/react plus permitted report, block and removal
actions. Reporting requires a selected reason; blocking and removal require an
explicit confirmation. The controller binds each action to the reviewed account
and message sender, rechecks the current snapshot and reuses its request ID after
a lost acknowledgement. The backend derives the target and checks current room
authority. Profile navigation uses the sender name with a full-height touch target
so even a manager menu stays within the five-command primitive limit.

The screen uses the canonical route top bar and chat composer. Reply previews
resolve against the current message snapshot, and opening reactions dismisses
the keyboard and replaces the composer until the selection closes.

Consumer `/chats` opens an Events directory independently of dating-profile
setup and dating-match providers. Direct messages remain a separate tab, and
individual direct-message routes retain their profile prerequisites. Host inbox
composition is unchanged. `EventChatDirectoryController` deduplicates candidate
pages by event ID and revalidates previously loaded windows on refresh or load
more; errors and account changes discard old entries. The directory refreshes
on returning from a room, resuming the app while visible, or explicit refresh.
Empty filtered pages retain a continuation action until all sources are scanned.

`EventProfileEditorController` owns account-bound sharing reads, card pagination,
reviewed revisions and payload-bound save retries. Card choices retain organizer
ownership from the private form directory and require a current claim and card
revision; only selected applicant fields qualify. `EventProfileDraft` restores
only unchanged saved selections, never preselecting newly edited core values or
answers. Immutable requests separate an in-flight save from later editing.
Revocation does not require current admission or successful card loading.

`EventParticipantProfileController` rechecks the protected projection while
visible and clears it on failed reads, backgrounding or account changes. Its
result contains only selected fields and a bounded in-memory photo preview.
`EventProfileScreen` owns the editor at `/events/:eventId/chat/profile` and the
participant view at `/events/:eventId/chat/people/:participantUid`. Both are
shared authenticated routes before dating onboarding; server-side admission,
claim and sharing checks still control each read. The room app bar opens the
editor and each message's sender name opens its protected profile. Backgrounding
or covering either route clears visible details until a fresh foreground read.

The editor exposes unchecked eligible values and only claimed applicant answers
from the same organizer. Photo selection remains disabled until its owned preview
has decoded; participant photos use only the bounded protected memory preview.
Answer labels and values use natural-height text so a sharing choice never hides
part of the reviewed answer behind an ellipsis.
Card pagination retains unsaved choices while controls are disabled, provided
the account, grant, profile and membership revisions remain unchanged. Changed
card revisions discard local answer choices. Save and revocation use reviewed
UID/revision snapshots; revocation remains available after admission ends.

## Controller And View-Model Contract

Controllers and view models live in `presentation` because they shape UI-facing
application behavior. They are not widgets, and they are not repositories.

Use the smallest controller pattern that owns the lifecycle correctly:

| Pattern | Use for | Typical Riverpod shape |
|---|---|---|
| Action controller | one-shot actions such as book, cancel, join, submit, delete, block, report, sign out | generated notifier with `Mutation` |
| Flow controller | multi-step flows whose state survives navigation inside the flow | generated notifier with immutable state |
| Async state controller | loaded state that is then mutated by user actions | `AsyncNotifier<T>` |
| View-model provider | read-only composition of repository streams/futures into screen-ready state | generated function provider |
| Domain/use-case class | shared or complex business logic independent of Flutter | pure Dart class/function |

Code generation manages the provider seam, not the state model returned by an
arbitrary helper. A generated function returning a business ChangeNotifier is
still manually reactive business-state ownership. Conversely, a generated
function may provide a pure imperative effects service and register disposal
without turning that helper into a Notifier. Synchronous immutable editors with
supplied reviewed snapshots remain valid flow controllers; microtask, listener,
epoch and in-flight syntax alone does not justify converting them to
AsyncNotifier. Preserve the pending-snapshot and account/authorization fences
below when changing ownership.

Mutation key grain must match the UI interaction grain. Route-level single
actions such as book, cancel, submit, and delete for the route's single subject
may use static `Mutation` fields. Repeated row or list actions such as
attendance, waitlist offers, join-request decisions, or any per-entity action
rendered multiple times on one surface must key mutation state per target with
`mutation(key)` family instances. Keys are typed Dart records with value
equality, not concatenated strings. Use
`lib/hosts/presentation/host_event_booking_controller.dart` as the reference
implementation.

### Exhibit ARCH-PENDING-SNAPSHOT-001: Pending Request Snapshot Integrity

<!-- exhibit-freshness: ARCH-PENDING-SNAPSHOT-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `lib/auth/presentation/auth_controller.dart`
- `lib/auth/presentation/auth_presentation_state.dart`
- `lib/auth/presentation/phone_step.dart`
- `test/auth/presentation/auth_controller_test.dart`
- `test/auth/presentation/auth_screen_test.dart`

An in-flight request owns the exact input snapshot that was submitted. A
loading button is feedback, not request integrity. Every control that can
change, dismiss, invalidate, or overlap that snapshot must follow one explicit
policy until the request settles:

| Policy | Product behavior | Required proof |
|---|---|---|
| Frozen snapshot | Disable request-defining fields, conflicting actions, mutation-reset callbacks, and unsafe route exits. This is the default for one form submission or route-level action. | Widget or integration coverage proves the controls cannot change the request and a duplicate trigger does not start a second operation. |
| Versioned snapshot | Keep editing available, but attach an immutable generation/version to the submitted request and ignore or cancel stale results. The UI must explain whether edits are queued or belong to a later submit. | Controller tests prove stale success and failure cannot overwrite the current draft or advance the current flow. |
| Independently keyed concurrency | Permit parallel work only when each operation has a distinct typed scope key and its own pending/error surface. | Tests prove one key cannot disable, overwrite, clear, or surface failure for a sibling key. |

Do not let an input callback call `Mutation.reset` while its operation is
pending. A controller-level in-flight future or idempotency key must
deduplicate duplicate dispatches as defense in depth; disabling the widget
alone is insufficient because keyboard submission, delayed callbacks, and
programmatic callers can bypass it. Flow reset or cancellation must invalidate
the current generation so late external callbacks become no-ops.

Phone Authentication is the reference frozen-snapshot implementation. The
phone field and country selector derive their enabled state from the send
mutation, while the controller returns the same future for duplicate sends and
checks a flow generation before accepting Firebase callbacks:

```dart
Future<void> sendOtp(String phoneNumber, String countryCode) {
  final existingRequest = _sendOtpInFlight;
  if (existingRequest != null) return existingRequest;

  late final Future<void> trackedRequest;
  trackedRequest = _sendOtp(phoneNumber, countryCode).whenComplete(() {
    if (identical(_sendOtpInFlight, trackedRequest)) {
      _sendOtpInFlight = null;
    }
  });
  _sendOtpInFlight = trackedRequest;
  return trackedRequest;
}

void setCountryCode(String code) {
  if (_sendOtpInFlight != null) return;
  state = state.copyWith(countryCode: code);
  sendOtpMutation.reset(ref);
}
```

Member Onboarding and Matching Preferences are promoted frozen-snapshot
adopters. Onboarding freezes backward navigation and the active step's
request-defining controls across identity, prompts, and running preferences;
its controller deduplicates both profile-save and completion operations.
Matching Preferences freezes route dismissal, reset, age, gender, and apply
controls while its controller deduplicates the save. Their focused tests prove
the route, presentation state, and controller layers together.

Host Organizer Create and Host Event Edit are also promoted frozen-snapshot
adopters. Organizer creation freezes route dismissal, step movement, media,
form/default decisions, and footer actions across submit, draft-save, and
initial draft-restore operations. Event editing freezes route dismissal and
the complete schedule, location, pace, policy, and text-field form during
save. Their action controllers return the active future to duplicate callers,
so widget disabling and controller behavior enforce the same request snapshot.

Reviews and Account Settings extend the reference beyond single-submit forms.
The review sheet freezes rating, comment, both write actions, and dismissal
during submit or delete, while its controller returns one active write future.
Account Settings treats preference, unblock, delete, and sign-out as one
surface-exclusive operation domain: any pending mutation disables every
settings action and route exit, confirmation callbacks recheck the shared
pending state, and the settings controller deduplicates overlapping writes.
External platform effects follow the same contract even when they do not write
backend data. Await the platform result, expose progress on the initiating
control, enforce the declared singleton or keyed concurrency policy, and make
both `false` and thrown outcomes visible before restoring the action. Account
Settings extends its surface-exclusive domain to host/legal/support links;
Event Location Map keeps back navigation available but makes the directions
launch itself singleton. Starting and discarding a platform Future is not a
successful action outcome.

The Admin console uses the same whole-surface exclusive policy for operator
writes and submitted analytics queries. A synchronous provider-level lease is
acquired before dispatch, so controllers in different workspaces cannot start
overlapping operations in the same tick. While held, the workspace fieldset,
Admin navigation, shared links, and browser unload are blocked; each controller
submits an immutable payload and releases the lease in `finally`. This
intentionally favors an unambiguous audited operation over parallel Admin
throughput.

Every adopting feature must declare the chosen policy in its feature contract.
If the implementation is not yet safe, the pending-state action matrix must
describe the unsafe controls honestly and retain stable debt instead of
claiming a frozen form.

### Action Controller

Use a stateless generated notifier for one-shot user actions.

```dart
@riverpod
class ExampleController extends _$ExampleController {
  static final submitMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> submit() async {
    final uid = requireSignedInUid(ref, action: 'submit');
    await ref.read(exampleRepositoryProvider).submit(uid: uid);
  }
}
```

Use for book, cancel, join, leave, submit, delete, block, report, sign-out, and
other user-triggered actions. UI should call `Mutation.run(ref, ...)` so
Riverpod keeps provider dependencies alive while the side effect is running.

### Flow Controller

Use a generated notifier with immutable state for multi-step flows or screens
whose state is more than a single local input.

```dart
@Riverpod(keepAlive: true)
class ExampleFlowController extends _$ExampleFlowController {
  static final completeMutation = Mutation<void>();

  @override
  ExampleFlowState build() => const ExampleFlowState();
}
```

Use for auth, onboarding, or future wizards where state must survive navigation
inside the flow. Prefer auto-dispose unless the flow must survive route/tab
changes. If `keepAlive` is used, reset or invalidate state on completion,
sign-out, or cancellation.

### Async State Controller

Use `AsyncNotifier<T>` when state is loaded asynchronously and then mutated by
user actions. Good fits include queues, async local caches, paged lists, and
screens where the controller owns both loaded state and mutation methods.

The executable bounded paging reference lives in
`test/architecture/generated_provider_family_test.dart` (`_PagedRowsOwner`).
It uses test-only manual provider wiring to exercise the locked Riverpod API;
production ports use `@riverpod` and a generated auto-dispose family with the
same value-equality account/organizer scope. This fixture is a decision contract,
not a shared app framework or certification of an existing feature controller.

| Operation | Published state and concurrency | Required proof |
|---|---|---|
| Initial read | `build` returns a Future; Riverpod owns initial loading/error/disposal. Refresh during initial loading is a documented no-op at the command boundary. | A duplicate refresh starts no second initial read. |
| Load more | Keep immutable rows/cursor in AsyncData; publish continuation pending/error in that immutable value. Deduplicate one cursor request and retry the same cursor after failure. | Existing rows remain usable, duplicate calls share a future, and successful pages deduplicate row identities. |
| Refresh | Supersede continuation generation; read from the first cursor. Keep immutable previous rows with refresh pending/error, distinct from continuation error. | Delayed old success and failure cannot replace the refreshed rows or cursor. |
| Scope/disposal | Account and organizer belong in family identity. Fence imperative continuations with `ref.mounted` and the request generation; clear leases on disposal. | A switched account sees no prior-account rows; disposed late completions cannot publish or poison a reopened family. |

The reference uses public AsyncValue APIs: initial loading/errors come from
`build`, while retained refresh/continuation feedback belongs in immutable
page data. Do not copy Riverpod-internal `copyWithPrevious` into a new owner.
Widgets render this state and delegate refresh/load-more; they do not store a
second future, page list, cursor, pending/error flags, or account generation.
Read-only composition stays a generated function provider, a synchronous editor
stays an immutable Notifier flow, and commands follow the Mutation contract.
Paging generation is not an authorization decision or durable command journal:
feature ports must additionally prove their real access deadlines, auth leases,
frozen/versioned request snapshots, idempotency and uncertain-write recovery.

### View-Model Provider

Use a pure generated function provider to combine repository streams/futures
into a read-only view model.

Good fit:

- one screen needs one `.when(loading:error:data:)` value from several async
  dependencies;
- data should be reshaped into screen-ready sections;
- widgets would otherwise read several repositories directly;
- the provider can stay side-effect free.

View-model providers can depend on repositories. Widgets should depend on the
view model.

Controllers own:

- repository calls needed by the screen or flow;
- mutation orchestration;
- product validation decisions;
- action cardinality and eligibility checks when not backend-owned;
- combining multiple providers into one screen-ready state;
- optimistic updates and rollback policy;
- retry invalidation targets;
- app/domain exceptions thrown for user-correctable failures.

Controllers do not own:

- raw visual layout;
- focus nodes, text controllers, scroll controllers, animation controllers;
- pure component rendering;
- route chrome;
- backend implementation details.

View models should return immutable state shaped for the UI. They should avoid
side effects. A view model can expose precomputed display booleans, labels, and
section models when that removes business logic from widgets.

### Exhibit ARCH-PROVIDER-CODEGEN-001: Generated Auto-Dispose Provider Family

<!-- exhibit-freshness: ARCH-PROVIDER-CODEGEN-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `lib/clubs/data/club_name_lookup.dart`
- `lib/clubs/data/club_name_lookup.g.dart`
- `test/architecture/generated_provider_family_test.dart`

Use generated function providers for feature-owned async families. Keep the
family argument as a value-equality query object when callers need a canonical
cache key independent of input order or duplicates. `@riverpod` remains
auto-dispose by default, the generated provider keeps the existing public name,
and the adjacent generated output stays checked in.

```dart
@riverpod
Future<Map<String, String>> clubNameLookup(
  Ref ref,
  ClubNameLookupQuery query,
) async {
  if (query.clubIds.isEmpty) return const <String, String>{};

  final repository = ref.watch(clubsRepositoryProvider);
  final clubs = await Future.wait(query.clubIds.map(repository.fetchClub));

  return {
    for (final club in clubs)
      if (club != null) club.id: club.name,
  };
}
```

Provider migrations must preserve the generated provider name, family call
shape, query equality, auto-dispose lifecycle, `.future` access where used, and
`overrideWith` / `overrideWithValue` test seams. Lock those contracts with a
`ProviderContainer` test before treating a mechanical conversion as complete.

### Realtime Stream Lifecycle

Firestore snapshot streams are long-lived realtime listeners. Silence after the
initial emission is normal and must not be treated as failure. Do not wrap these
streams in `Stream.timeout` to detect stalled initial loads; that converts a
healthy listener into an error if no document changes arrive before the timeout.

Use these lifecycle rules:

- Prefer generated `@riverpod` auto-dispose stream providers for route-owned
  reads. Let the provider close when the route is popped or when the screen
  stops watching it.
- Use `@Riverpod(keepAlive: true)` only when the stream is deliberately global
  or prewarmed. Document the reason at the provider or call site with a
  `// keepalive:` marker within the three lines above the annotation or
  handwritten provider declaration; the dependency-direction scanner enforces
  that marker.
- For bottom-tab branches retained by `StatefulShellRoute.indexedStack`, decide
  whether the stream should remain active while its tab is inactive. If not,
  gate the screen/view model on the active tab before watching feature-owned
  providers. If the active screen already has data and should force a fresh
  listener later, invalidate the specific stream provider when the tab becomes
  inactive.
- Avoid shell-level prewarming for feature-owned tab streams unless the UX
  benefit is explicit, the read cost is acceptable, and provider ownership is
  documented.
- Keep small global streams alive when they support shell-wide behavior, such
  as auth state, current user profile, connectivity, or unread-count badges.
- Add regression tests for lifecycle-sensitive streams. A good test opens the
  stream, emits data, advances fake time beyond any historical timeout window,
  and asserts the provider still holds data rather than `AsyncError`.

Reopening a listener can cost a fresh query read; leaving it open can incur
reads when matching documents change in the background. The right owner is the
surface that needs the data: shell-wide data belongs in the shell,
first-viewport tab data should usually pause when the tab is inactive, and
pushed detail-route data should usually auto-dispose when popped.

## StatefulWidget Policy

Use `StatefulWidget` for Flutter mechanics:

- `TextEditingController`;
- `FocusNode`;
- `ScrollController`;
- `TabController`;
- `AnimationController`;
- `FormState` keys;
- drag/gesture state;
- transient expansion state;
- text currently being edited before commit;
- local UI timers that do not affect product state.

Use a controller/view model instead when the state:

- is loaded asynchronously;
- is persisted;
- triggers a repository or platform operation;
- affects product eligibility, pricing, booking, profile, safety, chat, or host
  behavior;
- must survive route/tab transitions;
- is shared across widgets;
- needs tests without pumping a widget tree;
- has loading/error/retry behavior.

Do not move ephemeral Flutter controller state into Riverpod just for
uniformity. Do not keep product-significant state in a widget just because it is
convenient.

## Repository And Service Contract

Repositories live in `data` and are the app's source of truth for feature data
access. They expose typed reads/writes and hide Firebase/platform specifics.

Repositories own:

- Firestore/Auth/Storage/Functions/Messaging/Remote Config access;
- backend error context wrapping;
- query shape, batching, chunking, and projection reads;
- stream/future providers for feature data;
- data normalization and DTO/model conversion;
- partial-write policy and FieldValue operations;
- repository-level cache/local fallback policy when needed.

Services own low-level external APIs:

- platform plugins;
- SDK clients;
- URL/share/image/location/permission wrappers;
- local storage adapters;
- analytics/crash/logging adapters when feature-neutral.

Use a service when multiple repositories/controllers need the same external
operation or when the operation needs a test double. Put the service near the
owning feature when it is feature-specific; put it under `core` only when it is
truly app-wide.

Use an application service or coordinator only when a non-UI workflow combines
multiple repositories and is reused across features. If the orchestration exists
only for one screen action, keep it in that screen's controller.

Repository rules:

- No full-document client snapshot rewrites for mutations that change existing
  Firestore docs. Use partial `update()`, `set(merge: true)`, or `FieldValue`
  operations unless a transaction-guarded create owns the whole document.
- Do not idle-timeout realtime Firestore streams with `Stream.timeout`.
- Do not fan out display-only list data through per-tile realtime streams when
  one batched provider can resolve it.
- Use `keepAlive` only with documented lifecycle rationale.
- Do not expose raw Firebase exceptions to presentation.

### Legacy-mirror normalization and cutover

When a Firestore model is migrating from legacy scalar mirrors to one
structured canonical field, normalize at the repository/domain read boundary;
do not scatter `newField ?? oldField` fallbacks through presentation code.

The migration shape is:

1. Prefer a valid canonical object.
2. Otherwise promote a complete, internally consistent legacy field set into
   the canonical in-memory shape.
3. Treat partial, non-finite, or contradictory mirrors as invalid; any
   operation that requires the invariant must fail closed.
4. Dual-write the canonical field and supported mirrors while released clients
   still consume those mirrors.
5. Keep the canonical domain field nullable only while a measured production
   blocker set remains. Remove that compatibility state after the repair tool,
   read-only validation, and rollout receipt all report zero blockers.

Event meeting locations are the reference migration. New and edited events are
strict, while Dart reads remain compatibility-nullable because the 2026-07-16
production dry run still has nine coordinate-less historical records. The
exact cutover state and proof live in
`contracts/migrations/event_meeting_location.json`; do not copy the strict
branch implementation into production reads until that contract advances.
`RunClub` next-event projections and `Payment` legacy fields are candidates for
this pattern only after their own source-of-truth, repair, and cutover contracts
exist.

## Widget Ownership

Widgets have two normal homes:

- `lib/core/widgets/**` for shared, app-coupled widgets that cannot live in
  `catch_ui` because they use app domain types or copy. They follow feature
  naming (`<Feature><RoleNoun>`, never the `Catch` prefix) and are registered
  in the component registry. Like feature widgets they arrange and bind; what
  they draw lives in `catch_ui` (D18).
- `lib/<feature>/presentation/widgets/**` for feature-owned UI that depends on
  feature domain/state language.

Feature widgets own (D18, `docs/plans/ui_system_blueprint_and_conformance_audit.md`):

- arranging library components into sections, rows, slivers, rails, forms,
  and body fragments, using the framework's layout widgets and token spacing;
- local Flutter mechanics that draw nothing (scroll, focus, animation
  controllers) when they are genuinely component-local;
- callbacks supplied by the screen/controller;
- translating typed display state into library component props.

Feature widgets do not own:

- drawing of any kind: decoration, clipping, painting, images, icons, styled
  text, tap feedback. It belongs in a `catch_ui` component, even one only this
  feature uses;
- repository reads/writes;
- mutation orchestration;
- backend/platform calls;
- product eligibility decisions;
- global spacing/token definitions;
- cross-feature reusable primitives without catalog review.

Promote a feature widget to `core/widgets` only when:

- at least two unrelated features need the same visual/interaction contract;
- the API can be named without feature-specific language;
- it has a stable component role;
- it can be documented in `docs/widget_catalog.md`;
- Widgetbook/component contract coverage is planned or already present.

Do not promote a widget just to avoid duplication if the concepts are actually
different. Do not leave duplicate feature-local widgets when they are the same
concept under different names.

## Naming Grammar

Ratified 2026-09-04; this section is the durable owner (the blueprint spec's
Appendix A is its ratification record). Phase 4 of the blueprint program makes
role nouns registry data. Reviewed on 2026-09-08 to make canonicalization and
the implementing engineer's source-review responsibility explicit.

Names deliberately bring implementations of the same responsibility into
comparison. Review their production callers, supported states, interaction and
accessibility contracts, and matching Widgetbook renders. Select one canonical
implementation and incorporate useful missing behavior. Prefer named
constructors or typed variants when the contract remains the same. Preserve a
separate API when its input/output, behavior, or anatomy has a concrete purpose;
share the renderer where that purpose allows it. Neither the oldest name nor
the most callers determines the winner.

For shared public Widgets the spelling is `Catch[<UseCase>]<RoleNoun>`: the base
role is unqualified (`CatchMenu`), and the responsibility precedes the role
(`CatchSelectionMenu`). This resolves the earlier summary's ambiguous variant
ordering. Each shared Widget records `level`, `roleNoun`, and `naming.useCase`
in the existing component registry. An empty use case selects the base role.
Qualified entries record `naming.comparedWith` (existing contracts with the
same role, or the owning parent concept) and `naming.reason` (the reviewed
distinction). Members declare their own role; a menu row is a Row, not a Menu.
The name is derived from role and use case independently of the contract ID,
so registering a second ID does not escape a canonical-name collision.

The checks enforce those reviewed identities and reference relationships.
They cannot infer semantic equivalence from arbitrary code: changing the role
or use case requires the same source comparison, recorded in the registry and
reviewed with the code. `Custom`, `New`, `Modern`, `Legacy`, `Old`, and version
qualifiers such as `V2` do not describe a new responsibility. A feature prefix
or implementation technique cannot justify a second shared implementation.

- **Prefixes.** `Catch` is reserved for design-system symbols (L0–L4a).
  Public feature widgets are `<Feature><RoleNoun>`. Private widget classes
  are legal only at L5.
  Phase 4 sweeps the complete shared API. The new-widget delta gate enforces
  this grammar for new or moved feature UI; existing feature naming violations
  remain visible as source-derived classification flags for the owning
  consolidation review. Flags do not approve exceptions or establish conformance.
  App bootstrap classes and app-core adapters are not feature UI.
- **Role nouns (closed; extend only via component-registry review):** Button,
  IconAction, Field, FieldLanes, Section, SectionList, Tile, Row, Chip,
  Badge, Banner, Sheet, Dialog, Notice, EmptyState, ErrorState,
  Skeleton, Indicator, TopBar, Header, HeaderTitle, Scaffold, PageBody,
  ScrollView, TabBar, TabScaffold, Poster, Polaroid, Ticket, Gap, Inset,
  Divider, Avatar, Photo, Cover, Stepper, StepFlow, Accordion, Drawer,
  Overlay, Viewport, Layout, Action, Menu, Surface, Input, Text, Image, Scope,
  AsyncBoundary, Table, Card, Body, List, Step, Editor, Rail, Picker, Grid,
  Preview, Dock, Map, Pin, Thumbnail, Bubble, Form, Listener, Transition.
- **Predicted names (ratified 2026-10-17, blueprint D15).** Among accurate
  names, use the one an agent that has never seen the component would most
  likely write. The role-noun list follows the nouns agents actually use: a
  noun joins when agents use it (or it is the obvious name of a registered
  component) and it names a responsibility no existing role covers; a synonym
  of an existing role redirects to that role instead. Every registered
  component and role noun records `aliases`, the other names an agent would
  plausibly write. The generated catalog and context pack index them, and the
  new-widget gate rejects a new widget whose name matches an existing
  component's name or alias with a pointer to that component (blueprint Phase
  7b delivers the alias data and gate).
- **Nouns added 2026-10-17.** Card: one entity's bounded summary that usually
  opens it, rendered through a material (Ticket, Poster, Polaroid) or Surface.
  Body: the content composition of one screen or page below its chrome
  (`CatchPageBody` still owns page insets). List: a vertical collection of
  rows; it replaced RowList in Phase 7b. Step: one stage of a
  multi-stage flow. Editor: edits one structured value made of several fields.
  Rail: a single-line, horizontally scrolling collection. Picker: chooses a
  value through a dedicated chooser such as a city, date or photo picker. Grid:
  a two-dimensional arrangement of equal cells. Preview: a compact read-only
  rendition of something shown in full elsewhere. Dock: persistent bottom
  controls; `CatchDock` becomes `CatchDock` in Phase 7b. Map: a map
  view. Pin: a mark anchored to a map coordinate. Thumbnail: a small
  representative image of one entity, with a fallback. `Workspace` joins
  `Screen` as a route-level suffix.
- **Nouns added 2026-10-18 (blueprint Phase 7b.2).** Bubble: one chat message
  aligned to its sender. Form: a set of fields submitted together, owning
  validation and submit state. Listener: a non-visual widget that subscribes
  its subtree to an app event source and reacts (a notice, a navigation); it
  paints only its child, and unlike Scope it publishes nothing to
  descendants. Transition: animates its child in or out (opacity, offset, scale)
  and owns motion only, after Flutter's `FadeTransition` and
  `SlideTransition`; layout and paint stay with the child.
- **Synonyms redirect.** Panel is Section (a titled region) or Surface (plain
  containment); Page is Step (a flow stage) or Body (a tab or pager page);
  Content, Overview and View are Body; Strip and Carousel are Rail; Rows and RowList are
  List; AppBar, Toolbar and Topbar are TopBar; InputBar and Composer are Input;
  ActionBar and BottomBar are Dock; Line is Text or Row; Entry and Item are Row,
  Tile or Card; Container, Box, Wrapper, Shell and Frame are Surface, Scaffold
  or Layout; Modal and Popup are Dialog or Sheet; Toast and Snackbar are
  Notice; Spinner and Loader are Indicator; Tag and Pill are Chip; Label,
  Eyebrow and Caption are Text; Stack is Layout or SectionList; Selector is
  Picker; Scrim is Overlay; Block is Card or Section; Controls is Action or
  Dock; Loading is Skeleton or Indicator; Wrap, Group and Groups are List or
  Section; Stat is Tile or Text; Value is Text; Artwork is Cover or Image;
  Sliver is the role's `.sliver` named constructor; Controller is reserved for
  state controllers, never a widget.
- **Materials and bindings.** A domain-free visual material (`CatchTicket`,
  `CatchPoster`, `CatchTable`) lives in the design system in both
  frameworks. A feature binding maps domain data onto it under the name an
  agent would write (`EventCard`, `ClubCard`, `ParticipantTable`), one per
  framework with the same name. A new entity card binds an existing material;
  it never draws its own geometry.
- **Role selection.** Classify the public responsibility, not a child it
  happens to render. Menu owns commands/choices; Surface owns token-backed
  paint and containment; Input owns editing mechanics; Text owns display-only
  typography/layout; Image owns loading or image treatment. Prefer an existing
  specific role: a Field still owns labeling/validation around an Input, an
  Avatar still presents identity, and a HeaderTitle still owns heading semantics.
  Scope publishes UI configuration or geometry through inherited context. It
  must derive from Flutter's inherited Widget family, be a registered member
  of the concept that owns its published data, and compare against that parent.
  Its use-case names the published contract. The owning components retain
  drawing, gestures and layout. This distinction is checked in both directions:
  an inherited publisher uses Scope, and a Scope requires inherited context.
  AsyncBoundary owns exhaustive asynchronous state selection, credible-data
  retention, initial-load deadlines and recovery. It does not own loading paint,
  error content or viewport geometry. Box and sliver protocols are named
  constructors of the same boundary; source types and framework names do not
  justify competing async-state implementations.
  Banner owns persistent inline feedback, with error/retry as named recipes.
  Notice owns transient notification delivery with dismissal/open behavior;
  sharing an icon and message does not make those delivery contracts identical.
  Skeleton owns content-shaped loading. Derived content uses the real widget
  composition; leaf shapes are for media and values with no renderable layout.
  Generic card lists, row recipes, equal boxes, and wrapping chips have been
  removed. Known content loads through its actual Section, Field, and child
  layout; unknown page structure uses the state viewport's centered progress.
  Scaffold owns the page surface, platform safe area, keyboard resize and
  preferred-size forwarding through `CatchScaffold`. `CatchRouteScaffold`
  adds fixed route chrome and scroll-under state; `CatchRootScreenScaffold`
  adds the root scroll composition. They delegate to the same surface owner.
  `CatchRootScreenScrollView` owns the outer title and pinned rail, while
  `CatchRootScreenPageScrollView` owns each overlap-aware inner page and its
  focus/offset retention. The latter two do not create another Scaffold.
  Their title and children slots retain box-header and sliver-child protocols;
  `CatchScaffold.title` is a preferred-size bar and `footer` is bottom chrome.
  The root `withPrimaryRail` recipe exposes its pinned page controls as
  `actions`, constrained by `CatchPrimaryRail`; its scroll-away header and
  typed page-body recipe retain their separate ownership.
  `CatchSelectionField` is the form-value and validation member used by
  `CatchField.select`. It owns a nullable selection and reconciles removed
  options; `CatchSelectionMenu` requires a supported current value and owns
  the adaptive trigger. Both delegate the panel to `CatchMenu`.
  `CatchFieldTrailingRow` owns the field's bounded trailing lane; it composes
  the status indicator and toggle input while `CatchFieldRow` owns the full
  leading/body/trailing layout. Its native input suffix recipe retains clear
  action precedence, fallback content and native target spacing.
  `CatchSearchField` owns browse-query editing and clear/close behavior,
  separately from form validation and commit orchestration. Fixed and transient
  recipes share their native input; `CatchSearchFieldStatus` requests collapsed
  or expanded visibility while explicit animation progress retains precedence.
  Header owns a heading assembly with optional supporting copy, count or
  actions; HeaderTitle owns the title itself. Section and sheet presentation
  recipes use `CatchSectionHeader.kicker` and `CatchSheetHeader.branded`.
  Screen, chronological sticky-feed and step-progress headers retain their
  independently consumed layout or behavior. `CatchCollapsedHeaderTitle`
  reacts to inherited header-collapse progress without owning the sliver.
- **Files.** Snake case of the primary public class; suffix vocabulary
  `_screen`, `_controller`, `_view_model`, `_state`, `_repository`,
  `_service`, `_providers`, or a role-noun widget suffix. One primary public
  widget per shared-library file. Additional public anatomy in that file must
  be registered members of its primary Widget's concept; private Widget classes
  remain confined to L5. Non-Widget implementation helpers may be private.
- **Variants.** Axes are enums named `<Component><Axis>` with axis vocabulary
  `Variant`, `Size`, `Tone`, `Emphasis`, `Status`, `Placement`, `Mode`. At
  most two booleans per public component constructor; a third forces an enum.
  Field context options name their actual scope owner:
  `CatchDividedFieldInteractionScopeMode` selects section interaction policy;
  `CatchFieldGeometryScopeMode` assigns the content gutter; and
  `CatchFieldGeometryScopeVariant` publishes the resolved paint silhouette.
  Policy and resolved geometry stay distinct: only a contained section can
  establish a section clip, and gutter ownership does not imply a paint shape.
  Editorial display sizes are the `CatchTextStylesSize` axis of the typography
  foundation. Event Success countdown and run-of-show position state remains
  feature-owned as `EventSuccessProgressStatus`; it has no shared component
  owner and is not a Catch UI variant axis.
- **Slots.** `leading`, `trailing`, `title`, `subtitle`, `kicker`, `meta`,
  `body`, `footer`, `actions`, `media`, `mediaOverlay`, `child`, `children`;
  builders end in `Builder`; callbacks start with `on`.
- **State objects.** `<Surface>State` (provider-free), `<Surface>ViewModel`
  (provider-owned composition), `<Surface>Controller` (mutations/flows), as
  contracted elsewhere in this document.

### Cross-Framework Names

Ratified 2026-10-17 (blueprint D9–D14). The grammar above also governs React
components in `@catch/web-ui` and the React surfaces; this subsection adds only
what differs between frameworks. Component identity and parity tiers are owned
by the component registry (`design/components/README.md`).

- **One symbol.** A registered concept has the same public name in Dart and
  TypeScript, derived from its `roleNoun` and `naming.useCase`: `CatchButton`
  in `catch_ui` and `CatchButton` exported from `@catch/web-ui`. The `Catch`
  prefix marks a catalog component at React call sites, as it does in Flutter.
- **One API vocabulary.** Contract props, slots, states and enum values use the
  registry names in both frameworks, callbacks included (`onPressed`, not
  `onClick`). Enum axes become string-union props with the same name and
  values (`variant="primary"`). A Flutter named constructor is a `recipe` prop
  in React (`CatchBadge.live` is `recipe="live"`), typed as a discriminated
  union so each recipe accepts only its own `constructorProps`.
- **No surface names on shared components.** `Admin`, `Website`, `Marketing`,
  `Host` and `Consumer` never appear in a T1–T3 symbol. Density or scale
  differences are a prop or a scope, never a second component.
- **One role-noun vocabulary.** React names use the closed list above. The
  registry's `roleNounRedirects` map the synonyms React code commonly uses
  (Panel, Shell, Frame, Toolbar, Strip, Label, Eyebrow and others) onto it, in
  both frameworks.
- **One record per framework.** The registry names each implementation of a
  contract: `dart` for Flutter and `react` for `@catch/web-ui`, each with its
  symbol and file. Prop types sit side by side as `dartType` and `tsType`.
  Website and admin adapters of a shared contract point at it with
  `componentId` in their surface registry and assign no identity of their own.
- **Surface-specific (T4) components** never use the `Catch` prefix and end in a
  closed role noun (`<Feature><RoleNoun>`). A surface prefix (`AdminQueueRow`)
  is allowed but carries no meaning: the folder scopes the component, and no
  other surface imports it.
- **Catalog ids.** Widgetbook and Storybook entries for a registered concept
  are keyed `<registry id>/<recipe>-<state>` (for example
  `catch.button/primary-loading`), so the two catalogs join on id.
- **Files.** Shared React components live one primary public component per file
  at `packages/web-ui/src/components/<Symbol>.tsx` and are exported only
  through the package index. `*Control` exports are package internals, retired
  as styled `Catch*` components replace them.
- **Banned qualifiers** (`Custom`, `New`, `Modern`, `Legacy`, `Old`, version
  qualifiers such as `V2`) apply in both frameworks.

React exports that predate this subsection migrate under blueprint Phase 7.
The React component inventory (`web:shared-ui-adoption`, Phase 7d) already
maps every exported React component to a contract, a T4 owner or deletion,
and it fails when a shared export that matches a registered contract has no
recorded `componentId` or `comparedWith`. The naming check for new shared React
exports arrives in Phase 7f; until then, reviewers apply this subsection to
new and moved React code.

## Cross-Feature Behavior

Some actions affect multiple features. Choose the owner by product truth, not
by which screen happens to call it first.

Use a feature controller when:

- the workflow is initiated by one screen or flow;
- the UI owns the user's next step;
- orchestration is not reused elsewhere.

Use a feature repository when:

- the workflow mutates or reads one feature's source-of-truth data;
- the backend owns most policy;
- the operation should be reused by several controllers.

Use a domain/use-case class when:

- pure business rules combine multiple domain models;
- the result is reusable and testable without Flutter/Firebase;
- no side effect is required.

Use an application service/coordinator when:

- the workflow combines multiple repositories;
- it is not naturally owned by one screen;
- it must be reused by several features;
- it needs its own tests and operation context.

When ownership is unclear, start with the narrowest owner and document the
promotion trigger. Do not create a broad cross-feature service preemptively.

## Product Copy And Localization

User-facing prose is product content, not widget structure. Flutter product copy
must be authored in `lib/l10n/app_en.arb` and consumed through generated
`AppLocalizations`; `lib/l10n/l10n.dart` is the single context access seam.
Consumer and Host share the same catalog and locale lifecycle while keys carry
an explicit `consumer`, `host`, or `shared` audience in ARB metadata.

Every ARB message requires:

- a stable semantic key rather than a value-derived or line-derived key;
- a translator-facing `description`;
- `x-audience`, `x-owner`, and `x-surface` review metadata;
- `x-max-chars` when the layout has a real copy budget; and
- named ICU placeholders with types when content varies.

Presentation resolves copy as late as possible with `context.l10n`. Domain,
repository, controller, and view-model layers return semantic enum values,
validation codes, error codes, and interpolation data rather than English
sentences. Shared widgets may accept already-localized strings when the caller
owns the wording, or accept a semantic value when the widget owns a fixed
product concept. They must not import an English singleton or cache localized
messages globally.

Developer-only deterministic fixtures and exact canonical geographic
proper-noun catalogs may declare
`// copy:allow-file(<specific reason>)` in the first twelve lines. The scanner
accepts that directive only for exact fixture/preview/manual-QA/reference-data
surfaces it knows about; production screens cannot use it. A single intentional
technical literal elsewhere uses the narrower
`copy:allow-inline(<reason>)` marker.

The English ARB is the canonical mobile review file. Marketing can edit it
directly as JSON or request a spreadsheet-shaped review deck with:

```sh
node tool/copy/check_mobile_copy_catalog.mjs \
  --export-csv build/copy/mobile_copy_review.csv
```

The CSV is an export, never a second source of truth. After edits, run
`flutter gen-l10n`, the catalog check, focused app-role tests, and the ownership
ratchet. ICU apostrophes are doubled because `l10n.yaml` enables escaping.

Copy outside Flutter has explicit catalogs rather than being forced through a
runtime Flutter dependency:

- iOS permission prose is owned by `copy/native_en.json`, one key set per app
  role; the native sync writes each iOS project's plist values and localized
  `InfoPlist.strings`, and removes any purpose string its role does not declare;
- server notification templates are owned by `copy/notifications_en.json`; the
  notification sync generates the typed Functions catalog; and
- synchronous structured domain content is owned by
  `copy/structured_domain_copy_en.json`; its generator writes typed Event
  Success/event-policy templates plus small Flutter-independent constants;
- Event Success questionnaire packs and normalization fallbacks are owned by
  `copy/event_success_questionnaires_en.json`; and
- `pushInstallations` records the device locale and timezone so notification
  selection can become recipient-aware without changing producer contracts.

Remote-config or CMS copy may later serve reversible campaign content, but it
must have a bundled fallback, schema/version validation, cache policy, and
rollback. Authentication, safety, legal, permission, error, and navigation copy
must remain bundled and release-reviewed.

### Exhibit ARCH-COPY-001: Product Copy Boundary

<!-- exhibit-freshness: ARCH-COPY-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference implementation:

- `l10n.yaml` — deterministic `gen_l10n` configuration;
- `lib/l10n/app_en.arb` — canonical typed English Flutter catalog;
- `lib/l10n/l10n.dart` — presentation access seam and isolated-preview fallback;
- `lib/app.dart` — shared locale delegates, supported locales, and role-aware
  app title;
- `lib/core/presentation/app_shell.dart` and
  `lib/core/presentation/host_app_shell.dart` — semantic navigation destinations
  localized at render time;
- `lib/core/riverpod_ui/catch_notice_overlay.dart` — resolves notice dismiss copy
  at the app boundary;
- presentation-state factories such as
  `lib/onboarding/presentation/onboarding_flow_state.dart`,
  `lib/events/presentation/event_detail_screen_state.dart`, and
  `lib/event_success/presentation/event_success_companion_screen_state.dart`
  — receive `AppLocalizations` explicitly and return resolved display copy;
- `lib/core/widgets/event_activity_visuals.dart` — resolves semantic taxonomy
  labels from localization at the render boundary while domain activity kinds
  remain stable identifiers;
- `copy/native_en.json` and `tool/copy/sync_native_copy.mjs` — native copy lane;
- `copy/notifications_en.json` and
  `functions/src/shared/notificationCopy.ts` — server notification lane; and
- `copy/structured_domain_copy_en.json` and
  `tool/copy/sync_structured_domain_copy.dart` — schema-checked synchronous
  content lane for domain models that cannot depend on `BuildContext`;
- `lib/core/app_error_message.dart` — semantic exception-code localization at
  widget build time; and
- `tool/copy/check_mobile_copy_ownership.dart` — zero-debt ownership gate.
- `tool/copy/check_l10n_key_usage.mjs` — exact live handwritten-key census and
  zero-orphan ratchet derived on demand from the current source tree; only the
  authored orphan baseline is tracked.

Required checks:

```sh
flutter gen-l10n
node tool/run.mjs check copy:mobile-catalog
node tool/run.mjs check copy:mobile-ownership
node tool/run.mjs check copy:l10n-key-usage
node tool/run.mjs check copy:native-sync
node tool/run.mjs check copy:notification-sync
node tool/run.mjs check copy:event-success-questionnaires
node tool/run.mjs check copy:structured-domain-content
```

The baselines in `tool/copy/mobile_copy_baseline.json` and
`tool/copy/l10n_orphan_baseline.json` must remain empty. New inline findings or
missing catalog getters or zero-use ARB keys fail immediately. Exact usage
locations are available from live `--json` output; no generated usage inventory
is committed. An allowlist entry is only appropriate for a technical
identifier, test/demo fixture, or user-authored value and must contain a narrow
reason.

The ownership gate scans both app `lib/` and `packages/catch_ui/lib/`.
Shared components receive caller-localized strings and formatters; they never
import the app catalog or introduce English defaults. The gate covers more than
direct `Text(...)` calls: copy-shaped
named arguments, default parameters and constructor initializers,
presentation-state members, validation/share/status helpers, transient notice and
confirmation helpers, and Event Success display-enum arguments are all
enforced. Interpolation-only compositions of already-localized values, switch
wire patterns, exception diagnostics, and generated sources are excluded so
the gate reports actionable ownership violations instead of protocol strings.
Its seeded self-test must grow whenever a newly discovered AST shape is added.

Presentation models may contain resolved `String` fields, but any factory that
creates user-visible prose must accept `AppLocalizations` explicitly. Widgets
pass `context.l10n`; tests use `AppLocalizationsEn`. Domain entities,
repositories, controllers, and persisted records keep semantic enums, ids,
counts, dates, and user-authored data instead of localized strings. This makes
copy reviewable without coupling domain logic to Flutter context or hiding a
second English source inside state classes.

## Installable App Roles

Catch ships distinct consumer and host app experiences on a shared backend. The
role split is an architecture boundary, not just navigation polish.

Current roles:

| Role | Owns | Must not own |
|---|---|---|
| `consumer` | dating profile, discovery, booking, attendance, post-event reactions, matching, consumer chats, settings | host event creation/editing/manage tools, host-only club operations, professional host account setup |
| `host` | phone-OTP host shell on mobile and web, private organizer/event quick start, event dress rehearsal, external roster import/manual entry, unified event operations, Event Success host tooling, reviews, analytics, publishing/payment readiness, host inbox and professional host identity | dating browse/match surfaces, dating-profile editing as a prerequisite for host work, consumer-only social readiness gates, a dependency on Catch owning event registration |

Rules:

- App role selection belongs in bootstrap/entrypoint configuration and route
  graph wiring. Feature widgets should not infer role from bundle ids,
  Firebase project ids, or platform flavor strings.
- Every installable entrypoint must install a role-specific app root:
  `apps/consumer` installs `ConsumerPlatformApp` and
  `consumerGoRouterProvider`, while `apps/host` installs `HostPlatformApp` and
  `hostGoRouterProvider`. Shared bootstrap and `MyApp` receive the selected
  root/router as dependencies and must not infer a product from a bundle id.
- `apps/consumer` and `apps/host` are independent Flutter/native package roots.
  Shared product code remains in `catch_dating_app`, but native SDKs belong to
  the app package that uses them. Health and Razorpay adapters are Consumer
  dependencies; Host must compile without either plugin.
- Shared services that need navigation receive the active `GoRouter`
  explicitly from the Consumer or Host shell. A provider override below
  `MaterialApp.router` is not a reliable navigation dependency boundary because
  `GoRouter` owns navigator construction. Importing a product router from a
  shared service remains a composition-boundary violation.
- Consumer routing must not mount host create/edit/manage screens. Consumer
  surfaces may show host identity and public event/organizer information, but not
  host-management affordances.
- Host routing may show attendee, booking, roster, and operational state needed
  to run events, but it must not become a dating browse or match surface.
- Host identity is professional and separate from dating identity:
  `hostProfiles/{uid}` and organizer-manager snapshots own host display names, logos,
  roles, verification, and operational permissions. Dating `users/{uid}` /
  `publicProfiles/{uid}` must not be the source of truth for host display.
- The same auth user may have both a consumer dating profile and a host profile,
  but host onboarding cannot require a completed dating profile.
- Host onboarding also cannot require a public/claimed organizer or a
  Catch-booked participant. A private hidden organizer workspace and
  operations-only event are legitimate first states; publication, payment and
  Consumer-network capabilities are later grants.
- Host web installs the same Host Flutter product root and router as mobile.
  The public marketing site may initiate auth/registration handoffs but must not
  grow a parallel React implementation of authenticated host operations.
- Message-host conversations are professional support/operations threads.
  Headers, avatars, and CTAs must not deep-link to dating profiles or show
  match-style context by default.
- Push registration is install/app-role scoped. Shared notification code should
  preserve the role context used at registration and routing time.
- Deep-link aliases should resolve through the role-appropriate route graph. A
  host-only deep link opened in the consumer app should route to a safe public
  or unavailable state rather than exposing host tools.
- Native targets, Firebase app registrations, App Check providers, URL schemes,
  and launcher resources are release-configuration concerns; current release
  evidence and remaining TestFlight/Play work live in
  `docs/release_operations.md`.

### Host Audience CRM, Provider, Staff, And Offline Boundaries

- `HostCrmRepository` is the single Flutter Functions facade for organizer
  customer summary, directory/detail, contact controls/export, Meta sender
  setup and campaign lifecycle. The top-level Audience branch owns peer People,
  Audiences, Forms, and Responses workspaces: People owns the organizer CRM
  directory and customer detail; Audiences owns reusable definition authoring
  and exact previews; Forms and Responses own intake and review. The top-level
  Inbox branch owns the Inbox and Sends workspaces, including sender setup and
  campaign lifecycle. Inbox and Organizer must not mount a second audience
  builder, and event-manage widgets must not read restricted CRM collections
  directly.
- A CRM contact, identity link, communication permission, communication route,
  saved audience, send attempt, and delivery receipt are different authorities.
  No screen or repository model may collapse one into another. A linked Catch
  account does not grant organizer marketing permission; a phone number does
  not prove identity; opening an external app does not prove a send.
- Responses exposes application review, while People remains the complete
  organizer contact directory. Accepting an accessible application atomically
  creates or links a unique active contact and appends deterministic provenance.
  Duplicate conflicts fail before either write; generic forms use their exact
  submitted response, while legacy native applications require their grant.
  Applications, responses and People expose links without changing the source
  snapshots or inventing permission, verified identity or event admission.
- Contacts may be created by approved server workflows for Catch bookings,
  verified web registration, provider sync, host import, Host Forms conversion,
  or manager-entered Customers data. Every writer must append deterministic
  organizer-scoped provenance. Contact creation never creates a Consumer
  profile, verified identity, attendee row, or communication grant. Manual
  creation requires a display name and at least one proposed phone or email;
  name-only records are not durable CRM contacts.
- Participant-controlled communication preferences are the sole marketing
  permission authority. The standard Host Form consent authorizes receipt and
  use of the submitted answers; it is not marketing permission. A form may
  create a communication grant only through a separately reviewed,
  participant-controlled permission field whose exact copy, version, identity,
  decision, source form, and source response are preserved in the canonical
  permission receipt. Unchecked input, ordinary form consent, imports, roster
  writes, manager entry, tags, applications, and merges never grant or revoke
  permission by inference.
- Audience owns durable reusable CRM audiences. Event announcement workflows
  own event-scoped audiences such as Booked and Prospective. Inbox consumes
  either a saved audience id or an event-scoped audience reference and must not
  grow a second audience-builder or reinterpret CRM predicates locally.
- Audience may hand a scoped, exact computed segment or organizer tag to Inbox
  only after persisting it as a saved audience and carrying that
  audience id into compose. An unscoped, searched, partial, empty, or otherwise
  blocked customer view never gets a generic Inbox shortcut. When an
  eligible view is blocked by organizer sender readiness, its recovery action
  opens the dedicated WhatsApp Business setup route; environment/provider
  unavailability remains explanatory and non-actionable.
- CRM categories are server facts. Flutter may label fixed segment ids but must
  not infer “valuable customer” from ticket price, private feedback, gender,
  compatibility, wingman, dating or safety data. The People summary exposes
  Contacts, Attended, and Repeat as direct directory filters, not decorative
  analytics: Contacts clears the segment filter, Attended selects the canonical
  `past_attendee` segment (at least one attendance), and Repeat selects
  `repeat_attendee` (at least two). `past_attendee` matching remains derived
  from `attendedEventCount > 0` on the server so pre-definition-v3 trait rows
  work without a client union or a backfill gate.
- Manual customer creation is a route-level form and requires an
  organizer-visible name plus at least one phone or email endpoint. Create and
  inline edit share identity-field semantics; organizer-entered endpoints remain
  unverified and never grant identity or messaging permission. Existing
  name-only legacy contacts remain readable, but a manual contact that already
  has an endpoint cannot lose its last endpoint during edit.
- `HostProviderRepository` consumes the server capability catalog. UI renders
  `available`, `configurationRequired`, `exportOnly`, `sampleRequired` and
  `partnerAccessRequired` honestly. A provider name on `EventOrigin` never
  implies API sync or complete financial coverage.
- `HostEventStaffRepository` is the event-scoped operator authority facade.
  `/host/operator/:eventId` composes only roster, attendance and runtime-claim
  actions granted by the backend. It must not mount Customers, campaigns,
  providers, imports, event editing or organizer-wide settings.
- `HostAttendanceOutbox` stores only opaque ids, desired attendance, expected
  revision, client operation id and timing/retry state, partitioned by signed-in
  account. It never stores roster PII. Connectivity replay delegates to the
  absolute server mutation; conflicts remain visible for review instead of
  silently rebasing a toggle.
- Consumer event detail and payment confirmation may call the attendee-link
  helper before sharing. The helper falls back to the ordinary event URL if
  eligibility/audience projection has not converged. Opening the native share
  sheet records a best-effort share intent and must never be labeled a message,
  send, WhatsApp forward or recipient.
- The no-download runtime prepares the same stable attendee link after a
  verified event identity reaches live mode. It opens the browser share surface
  or copies the opaque invite URL, records only that Catch-owned intent, and
  lets the backend choose Catch registration versus the verified external
  booking destination from `EventOrigin`.
- The no-download React runtime and Host/Consumer Flutter apps share backend
  Event Success authority, not widget code. First Hello, wingman,
  questionnaires, groups, pairs and rotations consume event-scoped identity
  and inputs; persistent match/chat/network behavior remains Consumer-only.

### Consumer Cold-Start Composition

Consumer iOS and Android cold starts mount `CatchConsumerBootstrap` before
critical asynchronous initialization. The bootstrap owns the native-to-Flutter
handoff and keeps the real app/router tree unmounted until both its boot motion
and initialization complete.

- `CatchNativeSplash` is the idempotent platform-effect seam. Consumer removes
  the native surface only after the matching Flutter splash mark has decoded
  and painted; Host keeps removal in the resolved force-update gate.
- `CatchConsumerBootScreen` is provider-free and reuses `WelcomeSceneLayout` with
  landing actions suppressed. `/start` still owns the complete logged-out
  Welcome composition, but it no longer owns Consumer cold-start timing.
- Critical services initialize concurrently with the boot reel. A fast startup
  waits for the reel; a slow startup holds its deterministic landed state. An
  initialization failure becomes a retryable Catch error surface rather than a
  permanently preserved native splash.
- Auth restoration, profile loading, deep-link resolution, and router redirects
  begin only after initialization and boot motion finish, so they cannot dispose
  the cold-start animation midway through the handoff.
- The boot `MaterialApp` and initialized `MaterialApp.router` must never overlap.
  `CatchConsumerBootstrap` replaces the process root atomically after both gates
  complete; a root-level `AnimatedSwitcher` can keep router `GlobalKey`
  elements alive while the old tree deactivates and corrupt the first dashboard
  frame. Motion belongs inside the provider-free boot scene, not around
  independent application roots.
- Consumer bootstrap preloads package metadata and overrides
  `appPackageInfoProvider` synchronously before mounting `ForceUpdateGate`.
  This prevents a second startup-loader frame after the reel.
- `StartupAnimationScope` records that the process-level reel played.
  Route-owned `OnboardingWelcomeBody` therefore renders its landed actions immediately
  instead of replaying the same animation after routing starts.
- Reduced-motion settings and tap-to-skip land the reel immediately. The
  process bootstrap runs on cold launch only; app resume does not replay it.
- Host, web, and desktop retain their existing startup behavior unless their
  role-specific owner explicitly adopts a different boot composition.

Host Inbox is the reference for sharing foundations without sharing product
composition. Consumer `/chats` owns `ChatsListScreen`; the compatibility route
`/host/inbox` owns `HostInboxScreen`; its shell label is Inbox while the local
screen heading Messaging names the combined Inbox and Sends modes.
They may reuse `ChatConversationsList`, Field-owned person layouts, search state, inquiry
repositories, and routing contracts, but the consumer screen must not remain
the Host route dispatcher.

The Host Inbox contract is:

- every workspace follows `hostOrganizerSelectionProvider`; Inbox events,
  inquiry previews, WhatsApp sender setup, and campaigns must all resolve from
  the same selected organizer;
- Inbox and Sends are first-class local workspaces. Inbox owns inbound personal
  inquiries and reply-capable conversations. Sends owns outbound intent
  selection, event-announcement composition, mixed outbound history,
  follower-update composition and organizer campaign lifecycle; sender setup
  stays on the dedicated organizer messaging route. Workspace changes update
  the compatibility route query when route synchronization is enabled;
- Inbox decides list/thread adjacency from the width available inside the route
  body after shell navigation, not from the global window. At 720 px or wider
  it uses the canonical 360 px index beside a selected thread; narrower bodies
  keep the pushed-thread flow. The index owns visible and semantic selection,
  while each embedded `ChatScreen` is keyed by thread id and reports its draft
  to the route so switching or resizing cannot leak or discard thread state;
- Sends keeps its operational slivers inside an 840 px content lane on wide
  bodies so intent controls, manual work, history, and empty states retain one
  shared reading axis;
- an explicit selected Event or explicit General scope; General is never an
  event-id sentinel;
- personal two-party contacted-host inquiry threads, separated by event;
- Booked and Prospective thread views, with broadcast counts derived from
  `eventParticipations` rather than conversation count;
- inquiry-only users may appear as Prospective/Inquiry without becoming a
  broadcast recipient;
- event broadcasts use a dedicated callable and produce Activity plus
  preference-gated push, never match/message fan-out;
- production callable-backed affordances stay disabled until the target-specific
  live dependency preflight succeeds.

`HostInboxViewModel.compose` is the provider-free Inbox adapter for organizer
filtering, scope, classification, roster/thread separation, search, lifecycle,
and row-status policy. `HostInboxScreen` owns selected-organizer provider reads,
workspace composition, typed route effects, and sheets;
`HostInboxBroadcastController` owns the event-broadcast mutation even when its
composer is mounted by Sends, and
`HostAudienceController` owns campaign mutations. `HostClubPostController`
owns follower-update submission while the shared route-specific composer owns
only pending/error presentation and closes after callable acceptance.

`communicationRouteCatalog` is the canonical provider-free capability model
for communication routes. Transport alone is never sufficient routing or
authorization input. Every route keeps a stable id and adapter key plus its
sender identity, delivery mode, consent scope, observability, final-send
ownership, audience/eligibility scope, reply support and scheduling support.
Organizer WhatsApp and
Catch-owned WhatsApp therefore remain different routes even though both use
the WhatsApp transport. Their tokens, sender connections, permission evidence,
suppression state, threads and receipts must never share authority.

The current route set is personal WhatsApp handoff, organizer WhatsApp
campaign, Catch-owned WhatsApp, Catch chat, Catch event announcement and
organizer follower update. A future market transport extends this registry and
implements its adapter; it must not add provider conditionals to route-neutral
widgets or weaken an existing consent boundary. The registry is not itself a
user-facing channel picker. Hosts select a communication intent such as
individual conversation, saved-audience campaign, event announcement, or
follower update. Consequence-labelled alternatives may appear only when two
eligible routes materially differ in sender identity, recipient scope, final
send ownership, replies, scheduling, or observability. Provider names and API
policy stay in setup and diagnostic surfaces. Route-specific controllers retain
mutation ownership.

`resolveOrganizerCommunicationPlan` is the server-authoritative planner above
the route catalog. Its inputs are organizer, contact or audience reference,
communication intent, current capability snapshot, and server time. Its output
partitions recipients into managed delivery, external handoff, and unavailable
outcomes with stable route ids and explicit reasons. Dispatch rechecks every
permission, suppression, sender, template, service-window, event, endpoint, and
provider-health condition. Flutter consumes the projection and never recreates
the policy from individual flags. A compact reach label is a presentation of a
named plan at one moment, not a persisted property of a person.

Every server-managed Host outbound free-text boundary calls
`assertOutboundContentAllowed` before persistence or provider handoff. This
currently covers follower updates, WhatsApp campaign/test variables and
service-window replies; event announcements retain the same fail-closed policy
at their callable boundary. Catch chat retains its message-trigger moderation
and redaction path. Personal WhatsApp handoff stays outside this managed-delivery
rule because the Host edits and sends the final message in the external app.

External handoff is intentionally a weak-observability route:
`ExternalLinks.openWhatsappHandoff` may report only whether the device accepted
the native WhatsApp scheme or its `wa.me` fallback. The Host edits the
prefilled copy and presses Send in WhatsApp, so Catch must not create a delivery
receipt or reply thread from that launch. A durable manual-send task may record
only `queued`, `handoffOpened`, an explicit `hostMarkedSent`, `skipped`,
`cancelled`, `superseded`, or `expired`. A later provider-capability change must
not silently dispatch, complete, remove, or supersede an existing task. A route
re-plan is an explicit, read-only comparison against current authority; it only
advises the host whether to keep the handoff, use a newly available managed
route, or resolve an unavailable route. Only a separate explicit host action
may close the manual work. An explicit
organizer WhatsApp opt-out or admin suppression keeps the route visible with
the exact blocker but removes its action even though it is not a campaign
route.
Conversely, provider-backed routes are unavailable until their sender,
template, permission and provider health gates pass.

Host Forms remains the Audience destination's general intake system.
`HostFormPurpose` is useful internal classification, but list and
publish-review copy must describe actual consequences: whether a response can
create or update a CRM contact, which identity evidence it requests, whether
participant permission is requested, and which review queue receives the
result. Form automations may create or propose CRM, tag, application, attendee,
team-notification, webhook, and campaign-draft work. They must not silently
dispatch participant or customer outreach. Audience owns the Forms,
Applications, and Responses workspaces and their canonical routes; the Forms
domain retains response/application semantics and mutation ownership. A person
record may link to application history, but neither the People workspace nor a
separate global Forms destination owns the application queue.

Customer detail is the organizer CRM hub. Identity, editable organizer-owned
contact facts, provenance, permission explanation, current communication plan,
and primary actions remain above the fold. A bounded server-composed activity
timeline then joins permitted form/application, attendance, note, permission,
send/reply, origin, and merge events newest-first. It excludes private Consumer
profile, compatibility, safety, wingman, and unrelated organizer data. Section
cards may remain for identity and memory; the timeline is an activity lens, not
a replacement for every structured field.

`HOST-CRM-AUTHORITY-001` enforces these ownership seams with
`tool/architecture/check_host_crm_boundaries.mjs`. The gate keeps saved-audience
definition mutations in Customers, prevents presentation-layer transport
pickers, keeps manual handoff work in Sends, reviews every permission-authority
collection consumer, confines canonical collection writes, preserves Host Form
provenance for both new and matched contacts, and rejects provider delivery or
read claims on manual handoffs. It pins the Applications list and detail routes
to the Audience shell while requiring redirects for legacy Customers and Forms
URLs. It also
requires ICU plural ownership for
visible CRM counts across Forms, Customers, saved audiences, and Sends. The
scanner is deliberately narrower than a global “reachable” enum:
`HostCommunicationPlan` remains the server-derived, intent-specific authority.

### Installable App Target Contract

`tool/app_targets.json` is the source of truth for the six installable target
combinations: Consumer and Host across dev, staging, and prod. It explicitly
owns each target's entrypoint, display name, Apple scheme/configurations/bundle
id/icon/URL scheme, Android flavor/application id/icon source set, Firebase
project and app registrations, capability policy, deep-link ownership,
role-scoped force-update prefix, store product, and routine release owner.

Unresolved store-account and tester/device prerequisites are not target
identity. `tool/app_target_external_gates.json` owns only their stable Issue,
status, scope, and closure criteria. GitHub Issues and
`docs/release_operations.md` own live run and artifact evidence. The Harness
routes the external-gate contract through validation only; changing it cannot
authorize signed packages, while changing `tool/app_targets.json` still can.

Target identity must not be reconstructed independently in shell scripts,
Gradle, Xcode generators, Firebase activation scripts, or CI workflows. Those
surfaces must query the manifest or be checked against it. The first reference
implementation is:

```text
tool/app_targets.json
  -> tool/platform/resolve_app_target.mjs
  -> tool/flutter_with_env.sh
  -> Android app-target flavor or Apple app-target scheme
  -> role-matched Firebase config and Dart entrypoint
```

Current native policy:

- Android uses six explicit app-target flavors across two role-pinned Gradle
  projects rather than an environment flavor plus a mutable global role
  property. Each project exposes only its three environments and compiles the
  package-local entrypoint. Release manifests embed checked target/role and
  Firebase app/project markers; the signed-AAB gate compares those markers,
  Maps key, debug policy, package/version, and upload certificate against the
  target contract.
- Apple uses one role-specific Xcode project per package root. Each project may
  keep one `Runner` native target while its three schemes own explicit bundle
  ids, Firebase configuration, icons, and entitlements. Consumer and Host
  CocoaPods graphs must stay independent.
- Consumer owns HealthKit/Health Connect and the current public event-link
  association. Host must not inherit those capabilities until a Host-specific
  product contract requires them.
- Force-update minimum builds and store URLs are role-prefixed. Consumer may
  temporarily fall back to the legacy unprefixed remote values during rollout;
  Host never does.
- GitHub Actions is the routine mobile release owner for both roles. The
  approval-free merge-driven producer fans out only for CI-authorized exact
  role/platform targets and publishes verified iOS/Android packages plus a
  post-comparison authority without touching either store. A separate exact
  promoter requires an explicit manual dispatch and recorded release reason;
  it uploads one already-signed package and cannot rebuild or resign it. Their
  credentials live in the main-only `prod-mobile` environment, not the shared
  backend/data `prod` environment. Each ephemeral iOS runner imports the same
  dedicated, fingerprint-checked CI Apple Development identity before invoking
  automatic signing; Xcode still owns profile updates and distribution
  re-signing at export. A runner must never create and then abandon a new
  development certificate. Xcode Cloud has no checked build scripts; its
  disabled workflows are App Store Connect history only. Play upload remains gated by
  `APP-TARGET-ANDROID-PLAY-001` until console enrollment and publisher access
  are proven.

Run
`node tool/run.mjs check ci:mobile-release-package ci:mobile-release-workflow ci:mobile-promotion-core ci:mobile-promotion-workflow platform:app-targets platform:app-package-graphs`
whenever app identity, package roots, native configuration, Firebase
registration, links, force-update policy, or release ownership changes.

Package separation is measured, not inferred. Every production IPA/AAB emits a
`platform:mobile-package-policy` receipt with compressed/uncompressed size,
entry inventory, compiled app-binary hashes, forbidden production assets, and
role-forbidden native plugins. Consumer and Host release builds must prove
distinct binaries and package entry sets. Local release evidence from
2026-07-25 also proves Host excludes Health and Razorpay while Consumer retains
them; exact TestFlight display size alone is not evidence of duplicate Dart
code.

### Exhibit ARCH-APP-TARGET-001: Installable App Target Resolution

<!-- exhibit-freshness: ARCH-APP-TARGET-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

The build wrapper resolves entrypoint and native identity from the target
contract before it activates Firebase or invokes Flutter:

```bash
IFS=$'\t' read -r project_root package_entrypoint ios_flavor android_flavor <<<"$(
  node "$repo_root/tool/platform/resolve_app_target.mjs" \
    --role "$app_role" \
    --environment "$environment" \
    --fields 'projectRoot,packageEntrypoint,ios.scheme,android.flavor'
)"
```

Generators may read `tool/app_targets.json` directly. Other scripts should use
the resolver rather than reproduce suffix or role formulas.

## Routing And Navigation

Routing remains centralized in `lib/routing/go_router.dart`.

Rules:

- Route definitions should construct screens and parse path/query parameters.
- Route guards can redirect based on auth/profile/app state.
- Route config should not perform repository mutations.
- Production navigation outside `lib/routing/**` should use named routes, route
  constants, or typed route helpers instead of raw path string literals. Raw
  paths stay owned by route definitions and URL contract files.
- Screen constructors receive simple route values, not repository instances.
- Complex route extras should be normalized into a typed route argument object
  or handled by the screen/controller boundary.
- Legacy/deep-link aliases should delegate to canonical screens rather than
  duplicate product behavior.

### Public route decision contract

Public-route visibility and action eligibility are governed by
`design/public_surface_behavior.json` and the canonical explanation in
`docs/web_surface_architecture.md#public-viewer-and-listing-authority-matrix`.
Do not reduce the decision to `uid != null` or a crawled/claimed boolean. Auth
resolution, app role, profile readiness, viewer relationship, organizer
visibility, effective lifecycle availability, and authority, event
availability, and capability/runtime evidence remain separate inputs. Every
consumer route in `go_router.dart` must have
exactly one matrix owner; a route hidden from guest tab chrome still needs an
explicit guest and profile-readiness redirect. Run
`node tool/run.mjs check design:public-surface-behavior` whenever a covered
route, decision helper, action, or source enum changes.

## Testing Expectations

Test at the boundary that owns the behavior:

| Behavior | Test type |
|---|---|
| Pure domain rules | Dart unit test |
| Repository query/write mapping | repository test, emulator/rules test, or fake-backed unit test depending on risk |
| Controller action or flow | Riverpod/provider test with fake repositories |
| View-model composition | provider test |
| Async UI state rendering | widget test covering loading, error, empty, data, retry |
| Mutation error surfacing | widget test for pending/error display or listener behavior |
| Sliver/scroll ownership | widget test with small viewport and relevant scroll gestures |
| Shared primitive behavior | Widgetbook use case plus focused widget test when behavior is logic-bearing |
| Backend/rules/data contracts | `tool/check_data_contract.sh` and focused Functions/rules tests |

Brittle tests are design feedback. If a test needs private finders, timing
hacks, or duplicate-text counts, inspect whether the production seam should be
more explicit.

Flutter LCOV is a visibility artifact, not an aggregate percentage gate.
`tool/test/flutter_coverage_report.mjs` reports observed handwritten lines by
top-level feature and explicitly excludes generated/config code from its
headline. Files never loaded by the test process are not represented, so use
the report to choose risk-based additions rather than to claim repository-wide
completeness.

New or split Flutter test specs stay at or below 1,200 lines. Reviewed legacy
specs above the ceiling are exact, decrease-only debt in
`tool/test/flutter_test_size_baseline.json`; reductions refresh the baseline,
growth fails. Split by coherent behavior group and keep shared fixtures in the
same Dart test library when that avoids duplication without hiding source-level
failure locations.

## Source Size Budgets

New or split handwritten Dart files in `lib/**`, `packages/**`, and
`widgetbook/lib/**` stay at or below 800 lines. Split by domain responsibility,
screen pane, or component family; a file split must expose a useful ownership
boundary rather than distribute one monolith across `part` files.

`node tool/run.mjs check audit:flutter-source-size` checks tracked and untracked
source against `tool/architecture/flutter_source_size_baseline.json`. Existing
oversized files may only shrink. Deleted or now-bounded entries must leave the
baseline, and reductions must be recorded in the same change. Git history
prevents a baseline refresh from admitting new oversized files or raising an
existing ceiling. Refresh after a reduction with
`node tool/architecture/check_flutter_source_size.mjs --write-baseline`.

The `CatchField` constructor facade at
`packages/catch_ui/lib/src/components/catch_field.dart` has an approved ceiling
of at most 1,150 lines, with decrease-only protection. Configuration,
resolution, state, and rendering files remain within 800 lines.
`lib/routing/go_router.dart` is exempt from the line budget entirely: the route
inventory requires every `GoRoute` construction to live in that single file, so
its length tracks route count and is bounded by the route and widget
inventories rather than a line ratchet. Known generated suffixes, configured
localization outputs, and exact vendored icon-generator outputs are excluded; a
directory named `generated` or a generated-file comment alone grants no
exemption.

## Enforcement And Overrides

Use three enforcement levels.

The enforcement registry is checked by
`node tool/check_enforcement_integrity.mjs`. When a rule gains, loses, or
changes enforcement, update `tool/policy/rules.json`,
`tool/tools_manifest.json`, the owner-doc anchor, and the known-bad proof or
baseline reduction together. Manual enforcement is explicit with `stage: manual`;
absence of an enforcement entry is drift.

Every `*_baseline.json`, including checked-in test fixtures, declares `owner`
(the owning source document's `doc_id`) and `targetPhase` (a repository Markdown
heading reference to its target-zero phase). Enforcement integrity discovers
these files directly, including unregistered baselines, and rejects missing
metadata or broken phase references. Refresh commands retain this metadata.
The source-budget split targets Phase 5; remaining domain-owned debt targets
Phase 6's continuous conformance lanes. A target is an outstanding obligation,
not evidence that a baseline is already empty.

### Screen chrome contracts

Every handwritten `Scaffold.appBar` is registered by exact file, role,
expression, and canonical owner in `tool/design/screen_top_bar_contracts.json`.
`CatchTopBar` is the single renderer: `.route` owns compact pushed task titles,
`.identity` owns avatar-backed conversation identity, `.screen` owns a standalone
root app bar, and `.primaryRail` owns embedded root titles whose scroll parent
supplies safe area. Root recipes default to no navigation. Search is a typed
capability, not a different typography family. Navigation remains a typed mode,
icon treatment and callback; actions and preferred-size footers retain their
functional slots.

All text uses the platform function family. The prominent first line is the
screen purpose, followed by optional quieter entity context. The shared owner
selects title/headline scale, subtitle style, wrapping, control alignment,
spacing and scaled height. Callers cannot choose an eyebrow, kicker, arbitrary
body/title widget, typography variant, size, height, padding or alignment.
Invalid combinations must be translated to these recipes, never registered as
additional legacy variants. Goldens record the approved result; they cannot
justify a violation of these rules.

Pushed utility/list and identity routes use `CatchRouteScaffold`. It owns the
page background and derives the top-bar divider from real vertical scroll
notifications: no divider at rest, divider only while content is scrolled
under the pinned compact bar. Root tab titles remain sliver content and scroll
away; only deliberately declared search/filter/tab controls may pin.

### Exhibit ARCH-ROUTE-CHROME-001: Pushed Route Chrome

<!-- exhibit-freshness: ARCH-ROUTE-CHROME-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

`CatchRouteScaffold` is the reference boundary for pushed Consumer and Host
routes. The route supplies a `CatchTopBar` builder and body; the shell alone
owns surface color and the scroll-under divider. Loading, empty, error, and
content branches retain the same title voice and back behavior instead of
building competing scaffolds.

`CatchTopBarEmphasis.divided` is the only separator input. The background
role (`CatchTopBarTone`) changes paint only; it cannot silently opt into a border, and the
retired `border` alias must not be reintroduced.

Its closed `CatchRouteBody` API makes viewport behavior explicit:
`standard` scrolls in the canonical lane, `standardViewport` is fixed,
`standardConstrained` centers a scrolling content-width lane,
`standardSlivers` and `standardConstrainedSlivers` own custom-scroll variants,
and `fullBleed` is the deliberate edge-owned exception. Feature routes cannot
toggle scroll, responsive width, or terminal-padding policy with booleans.
Box, sliver, and section variants all publish the same shell obstruction to
expanding fields.

The primitive owns the compact title role: `CatchTextStyles.titleL` is the
platform function family for route labels and user-authored names alike. A
workspace uses `.route` with task title and contextual subtitle. Do not replace
semantic title inputs with custom widgets or feature-specific height logic.

The adopters are Saved Events, Review History, Payment History, Settings, Chat
Detail, Host Event Manage, Host Event Edit, Host team, every Host organizer
settings spoke, and Host route loading. Host create-organizer and create-event
flows remain step-header routes, and event detail remains the declared media
hero exception. When another pushed list or form is touched, migrate it to
this boundary rather than copying `Scaffold(backgroundColor:, appBar:)` flags.

Pushed routes that must always expose an exit declare `leading: "back"` in
the same manifest entry. The gate then requires an explicit
`CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back)` configuration, so a
correct primitive name cannot hide a navigation dead end. Screens that can be
entered as a root deep link should also provide a navigation `onPressed` fallback to their
owning root destination.

`node tool/run.mjs check design:screen-top-bar-contracts` walks all
handwritten `lib/**/*.dart`, not only `presentation/` or `*_screen.dart`. It
also inventories raw Material/Cupertino navigation bars, exact media-hero
exceptions, and feature classes ending in `Screen`, `Scaffold`, `Header`,
`TopBar`, or `HeaderContent` that own screen typography. Stateful-widget
owners include their matching `State<T>` body. Aligned
`ARCH-SCREEN-CHROME-001` adopter paths are checked surface by surface so one
canonical header cannot hide a second noncanonical implementation in the same
file. Other feature headers must name their content, screen, step-flow,
workspace, or temporary legacy role by symbol and owner. Role-to-owner policy
is enforced; raw Material app bars cannot be relabeled as workspace or hero
exceptions. Legacy entries are visible migration debt, not generic
exceptions.
The same gate consumes `tool/design/root_screen_composition_contracts.json` and
must report every consumer and Host root-screen branch; a zero-root pass is
invalid. That manifest classifies shell branches only. Exact title ownership is
registered against the title primitive (`CatchRootScreenHeader.title`,
`CatchTopBar.primaryRail`, or `CatchTopBar.screen`), never against the
layout scaffold that happens to carry it.

Full-screen editors that must cover persistent shell navigation declare their
launcher in the same contract and push through
`Navigator.of(context, rootNavigator: true)`. This route ownership is separate
from title typography: Edit Photo remains correct compact `CatchTopBar.route`
navigation while the root presentation prevents the tab bar from leaking over
its body.

### Analyzer plugin rules

Use `packages/catch_ui_lints` or a future architecture lint package for
deterministic rules that should be visible in IDE/analyzer output.

Good analyzer-rule candidates:

- `presentation/widgets/**` must not import or watch `*RepositoryProvider`.
- feature presentation must not import sibling feature presentation internals
  except the sanctioned screen/controller-to-controller seam.
- `domain/**` must not import Flutter, Riverpod, Firebase, or platform plugins.
- direct raw Firebase UI messages are forbidden in presentation.
- `*_screen.dart` classes should use a named async boundary when they watch
  `AsyncValue`.
- UI that watches a `Mutation` for pending state must also handle error state.
- platform/plugin calls in widgets require an approved provider/service seam.

### Scanners

Use scanners for migration discovery or noisy rules that need judgement.

Good scanner candidates:

- screen-ish widgets missing clear route/screen classification;
- possible direct repository reads in presentation;
- aligned provider-free adopters drifting back into provider/routing imports
  via `tool/architecture/check_adopted_architecture_boundaries.mjs`;
- possible missing mutation listeners;
- overly complex widgets that should split rendering from behavior;
- raw `AsyncValue.when` branches that may need a wrapper or typed state;
- feature widgets that look like reusable primitives;
- private widget classes that need public/catalog resolution;
- stale docs or duplicate architecture guidance.

### Manual overrides

Overrides are allowed only when explicit, searchable, and reviewed.

Use this format on the line nearest the exception:

```dart
// architecture:allow <rule-id> -- reason: <why this is correct> -- owner: <name/team> -- expires: <date-or-debt-id>
```

Examples:

```dart
// architecture:allow repository-read -- reason: legacy route migration shim while EventDetailViewModel lands -- owner: app -- expires: ARCH-EVENT-DETAIL-001
```

```dart
// architecture:allow platform-call -- reason: debug-only diagnostics before app services initialize -- owner: app -- expires: never
```

If overrides pile up for one rule, redesign the rule. If overrides are rare and
specific, keep the rule and migrate the call sites.

## Reference Implementation Workflow

Architecture migration must proceed from a reference implementation, not from
abstract prose alone. Before rolling a pattern across many files, create one
high-quality prototype, copy the relevant code excerpt into this document as an
exhibit, and record adopters in
`tool/architecture/pattern_adoption.json`.

The workflow is:

1. Pick one concrete pattern id before editing the batch.
   - Use ids such as `ARCH-UI-STATE-001` or `ARCH-CONTROLLER-001`.
   - Record the prototype file, tests, Widgetbook/catalog surfaces if any, and
     intended adopters in the tracker.

2. Build one reference prototype first.
   - The prototype should be better than the average migration target: clear
     ownership, provider seams, stable tests, catalog coverage when UI is public,
     and no private widget/helper drift.
   - Do not start a mechanical rollout until the prototype passes its focused
     tests and relevant scanners.

3. Copy a real code excerpt into this document.
   - The exhibit is not pseudocode. It should show the exact shape agents are
     expected to preserve.
   - Keep the excerpt short enough to review, but specific enough that another
     agent can compare a candidate file against it.

4. During rollout, classify every candidate.
   - `aligned`: conforms to the current exhibit.
   - `needs_update`: can conform with local edits.
   - `variant_needed`: valid product constraint that the exhibit does not cover.
   - `exception`: intentionally different, with a debt id or override.

5. When a candidate reveals a better pattern, update the exhibit first.
   - Then revisit every file already marked as an adopter of the previous
     exhibit and either update it or record why it remains a variant/exception.
   - A migration batch is not complete if earlier adopters silently lag behind
     an edited exhibit.

6. Preserve pattern evidence in source and checks.
   - Include the pattern id, prototype path, and adopter paths in the authored
     owner contract; preserve verification in the commit and CI checks.

Exhibit freshness is owned by this doc plus
`tool/architecture/pattern_adoption.json`. Every exhibit block
must carry an `exhibit-freshness` marker naming its tracker source and owner.
`node tool/architecture/check_app_architecture_exhibits.mjs` checks those
markers, verifies the tracker points back to the current doc anchor, and rejects
known stale snippets from prior reference shapes.

### Exhibit ARCH-COMMUNICATION-PLAN-001: Intent-Aware Communication Plan

<!-- exhibit-freshness: ARCH-COMMUNICATION-PLAN-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

Reference files:

- `functions/src/communications/organizerCommunicationPlan.ts`
- `functions/src/organizers/organizerCommunicationPlans.ts`
- `lib/hosts/domain/crm/host_communication_plan.dart`
- `lib/hosts/data/crm/host_communication_repository.dart`
- `lib/hosts/presentation/customers/host_customer_detail_screen.dart`
- `lib/hosts/presentation/customers/host_customer_detail_card.dart`

The server resolves a named communication intent against current identity,
permission, suppression, endpoint, and sender facts. The result is a momentary
plan, not a durable contact property. Presentation renders route availability,
execution ownership, and blockers from that plan; it does not reconstruct the
decision from contact fields.

The reference resolver makes execution ownership explicit:

```ts
export function resolveIndividualCommunicationPlan(
  contact: IndividualCommunicationContactFacts
): RecipientPlan {
  const catchChat = catchChatRoute(contact);
  const personalHandoff = personalHandoffRoute(contact);
  const recommended = catchChat.availability === "available" ? catchChat :
    personalHandoff.availability === "available" ? personalHandoff : null;
  return {
    contactId: contact.contactId,
    displayName: contact.displayName,
    outcome: recommended?.routeId === "catchChat" ? "inCatch" :
      recommended?.routeId === "personalWhatsappHandoff" ? "byHand" :
        "unavailable",
    recommendedRouteId: recommended?.routeId ?? null,
    routes: [catchChat, personalHandoff],
  };
}
```

The route screen starts the secondary request only after its primary customer
resource exists, so loading, primary failure, secondary loading, secondary
failure, and loaded states cannot masquerade as one another:

```dart
final communicationPlan = detailState.value == null
    ? null
    : ref.watch(
        hostCommunicationPlanProvider(widget.organizerId, widget.contactId),
      );
```

Every delivery mutation must recheck the authoritative facts. A previously
resolved plan may explain the current UI, but it never authorizes a later send.
External handoff means the host owns the final send; it must never generate a
Catch delivery receipt until a later verified receipt workflow exists.

### Exhibit ARCH-MANUAL-HANDOFF-001: Durable External Handoff Task

<!-- exhibit-freshness: ARCH-MANUAL-HANDOFF-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

Reference files:

- `contracts/firestore/organizer_manual_send_tasks.schema.json`
- `functions/src/organizers/organizerManualSendTasks.ts`
- `lib/hosts/domain/crm/host_manual_send_task.dart`
- `lib/hosts/data/crm/host_communication_repository.dart`
- `lib/hosts/presentation/customers/host_customer_detail_screen.dart`
- `lib/hosts/presentation/inbox/host_manual_send_list.dart`
- `test/hosts/host_crm_repository_test.dart`
- `test/hosts/host_inbox_screen_test.dart`

External handoff uses two durable phases. Before Flutter launches WhatsApp, the
prepare callable reauthorizes the organizer manager, re-resolves the named
individual-conversation intent, validates the current endpoint and route, and
idempotently persists a `queued` task with bounded prefill and endpoint hashes.
An exact prepare replay returns that task only after repeating the active-task,
endpoint, permission, and route checks.
After the device accepts the external-app launch, Flutter acknowledges only
`handoffOpened` against the task revision. A failed or declined launch leaves
the queued task visible; an acknowledgement failure never becomes a sent fact.
Every later launch from the durable queue first calls the revision-bound,
read-only validation boundary and uses only its returned endpoint and prefill.
The open acknowledgement repeats current authority checks after device
acceptance. This is intentionally two-sided because an external app cannot
participate in the Firestore transaction; neither server check sends or claims
delivery.

The server transition makes the evidence boundary exhaustive:

```ts
if (action === "hostMarkedSent" && task.status !== "handoffOpened") {
  throw new HttpsError(
    "failed-precondition",
    "Open the handoff before marking it sent.",
  );
}
return {
  ...task,
  status: action,
  active: false,
  revision: task.revision + 1,
  hostMarkedSentAt: action === "hostMarkedSent" ? now : null,
};
```

`hostMarkedSent` is an organizer assertion, not provider evidence. The model has
no delivered or read state. Re-open increments an open count and remains an
external-app acknowledgement. Skip and cancel are explicit terminal choices.
Expiry is a server-time projection over the TTL; the active queue query excludes
expired rows even before Firestore TTL deletion runs, and direct client
collection access is denied.

Sends owns the active manual-work queue and exposes the complete loading,
failure, empty, queued, opened, explicit-close, pagination, and re-plan states.
Re-plan is read-only: it may report that Catch chat is now available, but it
does not dispatch, complete, remove, or supersede the handoff. The host must
choose a later action. This prevents capability drift from changing work while
the organizer is deciding what to do.

### Exhibit ARCH-SAVED-AUDIENCE-001: Customers-Owned Saved Audiences

<!-- exhibit-freshness: ARCH-SAVED-AUDIENCE-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

Reference files:

- `contracts/firestore/organizer_saved_audiences.schema.json`
- `functions/src/organizers/organizerSavedAudiences.ts`
- `functions/src/organizers/organizerCampaigns.ts`
- `lib/hosts/domain/crm/host_saved_audience.dart`
- `lib/hosts/data/crm/host_saved_audience_repository.dart`
- `lib/hosts/presentation/customers/host_customers_screen.dart`
- `lib/hosts/presentation/customers/host_saved_audiences_workspace.dart`
- `lib/hosts/presentation/customers/host_saved_audience_editor.dart`
- `lib/hosts/presentation/inbox/host_campaign_editor.dart`

Customers owns reusable CRM audience definitions through its first-class
Audiences peer workspace. The top-level directory is a flat divided list; one
section action opens the full-page create route, and selecting a row opens the
full-page audience overview with a separate edit action. The Customers top bar does not silently repurpose
the People add-customer action, and the removed management modal must not return
as a parallel surface. Sends can select one saved audience id, but it cannot
author a parallel filter expression. Event-scoped Booked or Prospective groups
remain event authority and do not enter this organizer-CRM collection.

The server accepts only a versioned, closed predicate vocabulary: reviewed
computed segments, organizer tags, attendance count, last-seen recency, and
reachability for a named intent, application status for a selected form,
versioned filterable choice/boolean answers, and attendance at a named event.
`organizerSavedAudienceSources.ts` validates organizer ownership and immutable
question/value references. It evaluates current submitted responses and source
origins, following contact merges; withdrawn evidence never supplies membership.
It canonicalizes the definition before hashing it, rejects duplicate predicates,
validates tag ownership, and uses optimistic
revisions for edits and archives. Neither arbitrary queries nor client-provided
collection paths are executable audience definitions.

Preview is an exact server computation or an explicit failure. It refuses
partial source coverage and refuses organizers above the bounded 2,500-contact
evaluation limit rather than returning a plausible-looking subset. The client
labels stored counts as last-preview facts and never presents them as live.
`HostSavedAudienceSection` owns rule summaries, evaluated time, reach, member
links and the scoped Inbox handoff. `HostSavedAudienceMembersController` pages
exact membership; cursors bind organizer, audience revision and all ordered
member ids. Membership changes require a refresh instead of mixing pages.
Source joins are capped at 5,000 records; authoring catalogs are bounded at 200
records per source category and 100 filterable versioned questions. Exceeding
these bounds is an explicit failure, never a truncated exact result.

A draft campaign stores the selected audience id, revision, and definition
hash. Preview stores an exact audience-state hash; approval refuses a changed
hash instead of silently approving a different set. A changed or archived
definition blocks preview or approval. Approval freezes the resolved recipient
ids and recipient revisions; later dispatch
still rechecks current identity, permission, suppression, sender, template, and
content authority. Legacy segment-authored campaign documents remain readable,
but new campaign writes cannot submit legacy segment ids.

### Exhibit ARCH-CRM-AUTHORITY-001: Provenance And Permission Authority

<!-- exhibit-freshness: ARCH-CRM-AUTHORITY-001 source=tool/architecture/pattern_adoption.json owner=app_architecture -->

Reference files:

- `functions/src/shared/organizerContactOrigins.ts`
- `functions/src/shared/organizerCommunicationPreferences.ts`
- `functions/src/events/eventAttendees.ts`
- `functions/src/organizers/organizerAudienceProjection.ts`
- `functions/src/organizers/organizerContactMerges.ts`
- `functions/src/organizers/organizerCampaigns.ts`
- `functions/src/organizers/organizerCampaignDispatcher.ts`
- `tool/data/backfill_organizer_crm_authority_v2.mjs`

Contact creation, identity convergence, communication permission, and
operational suppression are separate authorities. Every approved contact
creator appends a deterministic origin without copying raw response or message
content. A merge moves only `currentContactId`; `originContactId` and source
facts stay stable and the merge receipt names every moved origin so reversal
does not infer ownership.

Current preference is a projection over immutable participant decisions.
Managed delivery may treat a channel as opted in only when current state names
a complete receipt:

```ts
export function effectiveOrganizerCommunicationStatus(
  preference: OrganizerCommunicationPreferenceDocument | null | undefined,
  channel: OrganizerCommunicationChannel
): "unknown" | "optedIn" | "optedOut" {
  const value = preference?.[channel];
  if (value?.status === "optedOut") return "optedOut";
  return hasCompleteOrganizerCommunicationGrant(preference, channel) ?
    "optedIn" : "unknown";
}
```

An explicit withdrawal appends a new receipt and supersedes current state; it
does not rewrite the earlier grant. Organizer suppression remains a separate
operational pause and never becomes participant consent. Legacy non-unknown
state without complete evidence fails closed as unknown for sending, while a
legacy withdrawal remains effective. The backfill creates provenance only
from canonical attendee edges, labels legacy decisions incomplete, reports
missing canonical evidence, and records zero inferred grants.

### Exhibit ARCH-ENTITY-MATERIAL-001: Entity Material Composition

<!-- exhibit-freshness: ARCH-ENTITY-MATERIAL-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `packages/catch_ui/lib/src/components/catch_poster.dart`
- `packages/catch_ui/lib/src/components/catch_polaroid.dart`
- `lib/clubs/presentation/detail/widgets/club_hero_top_bar.dart`
- `lib/swipes/shared/profile_surface/profile_body.dart`
- `design/components/catch.components.json`
- `widgetbook/lib/clubs/catalog/poster.dart`
- `widgetbook/lib/catches/catalog/profile_media.dart`

Entity material is a presentation contract, not feature-local decoration:
events use the ticket family, organizer identity uses
`CatchPoster`, and person identity uses `CatchPolaroid`.
Feature widgets provide typed display copy, media, overlays, and callbacks;
the canonical material owns shape, layout variants, treatment, and spacing.
Do not duplicate a poster or polaroid canvas inside a screen.

The Organizer Detail reference composition is:

```dart
child: CatchPoster(
  media: ClubCover(
    club: club,
    semanticLabel: context.l10n
        .clubsClubHeroAppBarSemanticlabelNameCoverPhoto(
          name: club.name,
        ),
  ),
  kicker: kickerLabel,
  title: club.name,
  meta: locationLabel,
  titleMaxLines: 2,
  showArrow: false,
),
```

The shared Profile reference composition is:

```dart
child: CatchPolaroid(
  media: ProfilePhoto(
    image: data.heroPhoto,
    activity: data.kickerActivity,
  ),
  mediaOverlay: onReact != null && reaction != null
      ? Stack(
          children: [
            Positioned(
              top: CatchSpacing.s3,
              right: CatchSpacing.s3,
              child: ProfileReactionAction(
                target: reaction,
                onReact: onReact!,
                style: ProfileReactionActionVariant.overlay,
                enabled: reactionsEnabled,
                isPending: reactionsPending,
              ),
            ),
          ],
        )
      : null,
  kicker: data.kicker,
  accentColor: accent,
  name: context.l10n.swipesCatchProfileViewTextNameAge(
    name: data.name,
    age: data.age,
  ),
  meta: data.metaLine,
),
```

Context such as organizer authority, reactions, or eventual event overlap is
passed as overlay/adjacent composition and must remain source-backed. In
particular, the Cross Paths consent controls do not make an Explore rail valid
merely because the person-polaroid component exists; identifiable attendees
still require a sanitized server-owned suggestion response.

### Exhibit ARCH-CROSS-PATHS-CONSENT-001: Fail-Closed Layered Consent

<!-- exhibit-freshness: ARCH-CROSS-PATHS-CONSENT-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `lib/cross_paths/cross_paths.dart`
- `lib/cross_paths/data/cross_paths_repository.dart`
- `lib/cross_paths/domain/cross_paths_suggestion.dart`
- `lib/explore/presentation/explore_cross_paths_provider.dart`
- `lib/cross_paths/presentation/cross_paths_explore_card.dart`
- `lib/cross_paths/domain/cross_paths_invitation.dart`
- `lib/cross_paths/domain/cross_paths_pair_hold.dart`
- `lib/cross_paths/presentation/cross_paths_invitation_controller.dart`
- `lib/cross_paths/presentation/cross_paths_invitation_screen.dart`
- `lib/cross_paths/presentation/cross_paths_event_consent_controller.dart`
- `lib/cross_paths/presentation/cross_paths_event_consent_state.dart`
- `lib/cross_paths/presentation/cross_paths_event_consent_section.dart`
- `lib/events/domain/event.dart`
- `lib/safety/presentation/settings_screen.dart`
- `functions/src/crossPaths/pilotPolicy.ts`
- `functions/src/crossPaths/setCrossPathsEventConsent.ts`
- `functions/src/crossPaths/invitations.ts`
- `functions/src/crossPaths/pairHolds.ts`
- `functions/src/events/eventPolicy.ts`
- `functions/src/events/signUpUserForEvent.ts`
- `test/cross_paths/cross_paths_event_consent_section_test.dart`

Use layered consent for an identifiable people surface: a private default-false
global preference is the master permission, a deterministic caller-scoped edge
is the event permission, an Admin-owned default-false event switch selects the
small set of events allowed into the Mumbai pilot, and the server owns all
effective-eligibility and ranking decisions. Consent records and the event
switch are inputs to `getCrossPathsSuggestions`; they are never themselves a
roster or suggestion source.

The Event Detail reference gate is intentionally fail-closed:

```dart
final crossPathsEligible = crossPathsEventConsentEligible(
  event: vm.event,
  participation: vm.participation,
  userProfile: vm.userProfile,
  now: now,
);
final crossPathsConsentReadable = vm.userProfile != null;
final crossPathsConsentAsync = crossPathsConsentReadable
    ? ref.watch(
        watchCrossPathsEventConsentProvider(
          vm.event.id,
          vm.userProfile!.uid,
        ),
      )
    : null;
final crossPathsConsentState = crossPathsEventConsentSectionStateFrom(
  eligibleToEnable: crossPathsEligible,
  loaded: crossPathsConsentAsync?.hasValue == true,
  enabled: crossPathsConsentAsync?.asData?.value?.enabled == true,
  pending: crossPathsConsentMutation.isPending,
  unavailable: crossPathsConsentAsync?.hasError == true,
);
```

Preserve these boundaries in later adopters:

- the client surface is shipped without a rollout flag; this cannot bypass
  server-owned selected-event, layered-consent, showcase, admission, or safety
  checks;
- a missing global field, missing event edge, loading state, or read failure
  never resolves to enabled;
- a missing/false event switch or a real event outside `in-mh-mumbai` never
  resolves to consent-eligible or suggestion-eligible;
- an existing enabled event edge remains caller-readable and revocable after
  booking or global eligibility disappears, while an ineligible disabled edge
  remains hidden;
- Event Detail owns provider reads and mutation orchestration; its body and
  `CrossPathsEventConsentSection` receive provider-free state and callbacks;
- cross-feature presentation imports route through
  `lib/cross_paths/cross_paths.dart`; the reusable section accepts neutral
  presentation values and never imports Event Detail internals;
- Settings writes the private master through the typed user-profile patch;
- the client queries only the caller's own event edge and never writes it;
- the App-Check-protected callable revalidates the master preference, terms,
  Admin-selected Mumbai event, deterministic participation identity, and
  `signedUp` state before enabling;
- disable remains callable-owned and available after eligibility disappears;
- Explore consumes only the sanitized, versioned, short-lived batched response
  from `getCrossPathsSuggestions`; it never joins participation, profile,
  preference, block, or eligibility collections on the client;
- `ExploreFeedSectionState` receives provider-free suggestion values, preserves
  the associated event ticket, and enforces the first-eight event-majority and
  no-adjacent-non-event composition contract;
- `CrossPathsExploreCard` keeps the canonical person Polaroid person-only and
  owns adjacent event context plus distinct profile/event actions.
- invitation documents remain participant-readable and callable-only writable;
  Explore and Activity watch only the current member's specific invitation
  edges and never query an attendee roster;
- `CrossPathsInvitationController` owns send/respond/cancel mutation state,
  while `CrossPathsInvitationScreen` owns route parameters, async branches,
  participant identity, provider invalidation, and navigation to the accepted
  event plan;
- organizer-configured companion inventory remains part of the canonical event
  admission policy. General admission subtracts the reserved pool, while
  `crossPathsPair` admission can consume only that pool and never changes
  waitlist ordering;
- an accepted invitation for an unbooked sender may create one server-owned,
  participant-readable hold. `active` is not a booking; the controller hands
  its frozen quote and id to the existing payment repository, and
  `signUpUserForEvent` alone converts it atomically into participation,
  confirmed pair accounting, and an event plan;
- hold release is idempotent and lifecycle-owned. Expiry, explicit
  cancellation, event/participation/safety invalidation, failed paid
  fulfillment, and account deletion return capacity without client writes;
- discovery consent revocation invalidates pending invitations only. An
  accepted companion hold is explicit pair intent and follows hold expiry or
  meeting-invalidating lifecycle boundaries, just like an accepted plan;
- accepted plans reuse `matches` storage with the explicit
  `crossPathsEventPlan` type, event-scoped deterministic identity, and expiry;
  chat state keeps them out of dating-match celebrations and analytics;
- consent revocation invalidates pending invitations only. Event cancellation,
  booking loss, an explicit plan cancellation, or a block may close an accepted
  plan because those boundaries invalidate the meeting itself.

### Exhibit ARCH-SCREEN-001: Feature Screen Boundary

<!-- exhibit-freshness: ARCH-SCREEN-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `lib/events/presentation/event_detail_screen.dart`
- `lib/events/presentation/event_detail_controller.dart`
- `lib/events/presentation/widgets/event_detail_body.dart`
- `test/events/event_detail_controller_test.dart`
- `test/events/event_detail_widgets_test.dart`
- `design/screens/catch.screens.json`
- `widgetbook/lib/events/catalog/detail_screen.dart`

Use this pattern for route-level or major navigable feature screens. The screen
owns route parameters, provider watches, top-level async/error branches, route
`Scaffold`, bottom navigation, screen-level mutation listeners, navigation
callbacks, retry invalidation, and controller/service side-effect calls. Loaded
body widgets receive explicit view data, shell state, and callbacks; they do not
reach around the screen for route-level repositories or app-shell decisions.

`design/screens/catch.screens.json` is the screen inventory and screen
composition map. Do not create a second screen-inventory document for the same
purpose. The architecture pattern tracker records which screen files conform to
this exhibit.

`EventDetailBody` and `EventLocationMapScreen` do not expose direct scaffold
compatibility. Direct Widgetbook or widget-test states may mount those bodies as
body-only review surfaces, but any state that needs route chrome, bottom
navigation, access/loading/error branches, or mutation listeners must mount the
route screen with provider overrides. Body-only Event Detail fixtures must
provide explicit save/share/calendar/back callbacks, display flags, companion
state, host state, and route-intent callbacks; they must not rely on body-owned
provider fallbacks for route side effects.

Current aligned adopters:

- `lib/events/presentation/event_location_map_screen.dart` uses
  `EventLocationMapRouteScreen` as the route shell. The route watches
  `EventDetailViewModel`, owns the chromeless `Scaffold`, floating back
  controls, loading/error/not-found branches, exact-coordinate gate, retry
  invalidation, and external directions side effect. It resolves
  `EventLocationMapState` and passes that provider-free state plus
  `onGetDirections` into `EventLocationMapScreen`. Direct
  `EventLocationMapScreen` Widgetbook/test states are body-only states with the
  same explicit state/callback API.

- `lib/events/presentation/calendar/calendar_screen.dart` uses
  `CalendarScreen` as the route shell. The screen owns uid/event provider
  waves, the route `Scaffold`, loading/error branches, retry invalidation,
  selected-date and expanded-header inputs, scroll-to-day behavior, and
  event-detail navigation. It resolves `CalendarHomeState` for event
  merge/sort, selected date, header mode, and club-id lookup input before
  composing provider-free calendar header, stats, agenda, and state sections.

- `lib/events/presentation/saved_events_screen.dart` uses
  `SavedEventsScreen` as the route shell. The screen owns uid/saved-event
  provider waves, the route `Scaffold`, loading/error/empty branches, retry
  invalidation, club-name lookup, and saved-event detail navigation. It resolves
  `SavedEventsListState` for ordering, saved/past labels, tile statuses, today,
  and club-id lookup input before composing shared provider-free agenda rows.

Defined variant:

- `ARCH-SCREEN-001C` covers host workspaces such as
  `lib/hosts/presentation/host_event_manage_screen.dart`. Host Event Manage is
  not a mechanical Event Detail copy because one canonical route owns legacy
  Setup, Guests, Live, and Report aliases while rendering exactly one
  lifecycle-owned workspace: Preparation before the attendance window, Live
  Operations during the event, and Recap once the event ends or is cancelled.
  `HostEventManageRouteScreen` keeps canonical route ids/aliases, uid/club/event
  loading, missing-resource/error branches, host access gating, retry
  invalidation, and initial alias/deep-link inputs. `HostEventManageScreenState`
  resolves the phase from event time/status; the top bar exposes one durable
  Guest roster action and the roster is a lazy, full-viewport-edge overlay that
  preserves the bounded underlying workspace element and maps old Guests deep
  links to an initially-open drawer. Preparation owns stable event details,
  website registration, imported/manual/provider guest sources, private invite
  access, temporary event-staff access, Event Success setup, and host actions.
  The roster drawer owns guest status, search/filter, claims, attendance, and
  reporting plus a route-owned handoff to the existing event-scoped Host Inbox;
  setup-only import, forwarding, provider, registration, and staff controls
  must not appear there. Live Operations may expose the single urgent Add
  walk-in escape hatch, while Recap keeps the roster read-only. The compact
  Live Now console remains one scrollable command flow with a pinned action.
  At the named local supporting-pane breakpoint, the same typed state reflows
  into a dominant command stage and one 360 px supporting-operations lane;
  Guests, fallback help, exclusion warnings, and current-step controls move to
  that lane while the revision-fenced Previous/Continue region stays attached
  to the stage. Text scale 1.4 and above returns to the single-column flow.
  The roster remains the existing viewport-edge overlay rather than becoming a
  third persistent data pane. Provider-free
  preparation, roster, private-access, invite-link, Event Success, recap, and
  host-action sections retain explicit display state and typed callbacks. Do
  not move solved route loading/access work into the workspace adapter, and do
  not duplicate attendance or Event Success aliases as separate screen
  contracts.

```dart
@override
Widget build(BuildContext context) {
  final vmAsync = ref.watch(eventDetailViewModelProvider(widget.eventId));
  final vm = vmAsync.asData?.value;
  final isHostApp = AppConfig.appRole.isHost;

  if (vm != null) {
    final now = DateTime.now();
    final viewerIsHost = vm.isHost;
    final sectionVisibility = eventDetailSectionVisibilityStateFrom(
      event: vm.event,
      participation: vm.participation,
      isHostApp: isHostApp,
      isHost: viewerIsHost,
      now: now,
    );
    final isSpotlightDark =
        widget.presentationMode == EventDetailPresentationMode.spotlightDark;
    final style = _eventDetailSurfaceStyle(
      context,
      presentationMode: widget.presentationMode,
    );
    final saveMutation = ref.watch(
      EventDetailController.toggleSavedEventMutation,
    );
    final share = ref.watch(externalShareControllerProvider);
    final calendar = ref.watch(eventCalendarControllerProvider);
    final canOpenCompanion = eventDetailCanOpenCompanion(
      participation: vm.participation,
      showConsumerActions: sectionVisibility.showConsumerActions,
    );
    final companionState = eventDetailCompanionStateFrom(
      participation: vm.participation,
      showConsumerActions: sectionVisibility.showConsumerActions,
      planState: canOpenCompanion
          ? _catchAsyncState(
              ref.watch(watchEventSuccessPlanProvider(vm.event.id)),
            )
          : null,
    );
    final hostState = eventDetailHostStateFrom(
      clubState: _catchAsyncState(ref.watch(fetchClubProvider(widget.clubId))),
      currentUid: vm.userProfile?.uid,
      canMessageHost:
          sectionVisibility.showConsumerActions && vm.isAuthenticated,
    );
    final socialState = eventDetailSocialStateFrom(
      event: vm.event,
      userProfile: vm.userProfile,
      isAuthenticated: vm.isAuthenticated,
      renderAsHost: sectionVisibility.renderSocialAsHost,
      participation: vm.participation,
      now: now,
    );

    if (vm.isAuthenticated) {
      ref.listen(EventBookingController.bookMutation, (prev, next) {
        if (prev?.isPending == true && next.isSuccess) {
          showCatchNotice(context, 'Booking confirmed!');
        }
      });
      ref.listen(EventBookingController.cancelMutation, (prev, next) {
        if (prev?.isPending == true && next.isSuccess) {
          showCatchNotice(context, 'Booking cancelled.');
        }
      });
    }

    void shareEvent(BuildContext buttonContext) => unawaited(
      _shareEvent(
        buttonContext,
        vm.event,
        share,
        widget.inviteCode,
        widget.inviteLinkId,
      ),
    );

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [EventDetailController.toggleSavedEventMutation],
      errorContext: AppErrorContext.event,
    );
    return Scaffold(
      backgroundColor: style.pageBackground,
      body: EventDetailBody(
        event: vm.event,
        userProfile: vm.userProfile,
        clubId: widget.clubId,
        reviews: vm.reviews,
        isAuthenticated: vm.isAuthenticated,
        sectionVisibility: sectionVisibility,
        isSaved: vm.isSaved,
        participation: vm.participation,
        savePending: saveMutation.isPending,
        surfaceStyle: style,
        onBack: () => Navigator.of(context).pop(),
        onShare: shareEvent,
        showAddToCalendar: _canAddEventToCalendar(
          event: vm.event,
          participation: vm.participation,
          isHost: sectionVisibility.renderSocialAsHost,
          now: now,
        ),
        onAddToCalendar: (buttonContext) =>
            unawaited(_addEventToCalendar(buttonContext, vm.event, calendar)),
        onToggleSaved: () => _toggleSavedEvent(
          context,
          ref,
          event: vm.event,
          clubId: widget.clubId,
          userProfile: vm.userProfile,
          isAuthenticated: vm.isAuthenticated,
          isSaved: vm.isSaved,
        ),
        companionState: companionState,
        hostState: hostState,
        socialState: socialState,
        onLocationTap: vm.event.hasExactStartingPoint
            ? () => context.pushNamed(
                Routes.eventLocationMapScreen.name,
                pathParameters: {'eventId': vm.event.id},
              )
            : null,
        onOpenCompanion: () => context.pushNamed(
          Routes.eventSuccessCompanionScreen.name,
          pathParameters: {'clubId': widget.clubId, 'eventId': vm.event.id},
          extra: vm.event,
        ),
        onRetryCompanion: () =>
            ref.invalidate(watchEventSuccessPlanProvider(vm.event.id)),
        onViewClub: (clubId) => context.pushNamed(
          Routes.clubDetailScreen.name,
          pathParameters: {'clubId': clubId},
        ),
        onMessageHost: (clubId, hostUid) => unawaited(
          _messageHost(context, ref, clubId: clubId, hostUid: hostUid),
        ),
        onRetryHosts: () => ref.invalidate(fetchClubProvider(widget.clubId)),
        inviteCode: widget.inviteCode,
        inviteLinkId: widget.inviteLinkId,
        now: now,
        presentationMode: widget.presentationMode,
        heroTag: widget.heroTag,
      ),
      bottomNavigationBar: _eventDetailBottomNavigationBar(
        event: vm.event,
        userProfile: vm.userProfile,
        clubId: widget.clubId,
        isAuthenticated: vm.isAuthenticated,
        participation: vm.participation,
        inviteCode: widget.inviteCode,
        inviteLinkId: widget.inviteLinkId,
        now: now,
        darkSurface: isSpotlightDark,
        sectionVisibility: sectionVisibility,
        onGuestBook: () => _openEventSignIn(
          context,
          clubId: widget.clubId,
          eventId: vm.event.id,
          inviteCode: widget.inviteCode,
          inviteLinkId: widget.inviteLinkId,
        ),
      ),
    );
  }

  if (vmAsync.isLoading && _initialEventMatchesRoute) {
    return EventDetailOptimisticBody(
      event: widget.initialEvent!,
      clubId: widget.clubId,
      presentationMode: widget.presentationMode,
      heroTag: widget.heroTag,
      inviteCode: widget.inviteCode,
      inviteLinkId: widget.inviteLinkId,
    );
  }

  if (vmAsync.isLoading) {
    return EventDetailLoadingScreen(
      presentationMode: widget.presentationMode,
    );
  }

  if (vmAsync.hasError) {
    return CatchLocalizedErrorScaffold(
      vmAsync.error!,
      context: AppErrorContext.event,
      onRetry: () =>
          ref.invalidate(eventDetailViewModelProvider(widget.eventId)),
    );
  }

  return const CatchErrorScaffold(
    title: 'Event not found',
    message: 'This event is no longer available.',
  );
}
```

### Exhibit ARCH-SCREEN-CHROME-001: Root Screen Header Chrome

<!-- exhibit-freshness: ARCH-SCREEN-CHROME-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `packages/catch_ui/lib/src/components/catch_top_bar.dart`
- `lib/dashboard/presentation/dashboard_home_screen.dart`
- `lib/chats/presentation/inbox/widgets/chats_sliver_header.dart`
- `lib/explore/presentation/widgets/explore_header.dart`
- `lib/user_profile/presentation/profile_screen.dart`

Use this pattern for root tab screens and root-like shell destinations.
Scroll-owned root titles use `CatchTopBar.primaryRail`; standalone root app bars
use `.screen`. Both use the platform `headline` role, optional contextual
`bodyS`, and leading/action/search slots in the canonical renderer.
The former `CatchScreenHeader` renderer is retired.

Preferred size and paint use the same scaled line budgets. At text scale 1.5
or greater titles and subtitles may use two lines and actions reflow underneath.
Feature screens must not compensate with their own line counts or heights.
The scaffold passes its actual constrained width to `preferredSizeFor`; a wider
window MediaQuery must not make a narrow route reserve fewer title lines.
Action measurement includes accessible wrappers and native text-button targets.

Top-bar action slots accept only the top-bar action family. Use
`CatchTopBarPrimaryButton` for a primary root-screen action: it renders the
quiet icon target with the platform minimum hit extent on compact phones
and preserves the labelled small button on medium and expanded layouts. Use `CatchIconAction`,
`CatchButton.text`, or `CatchActionMenu` for icon-only, semantic text,
or overflow behavior. The explicit `CatchButton.text` recipe is permitted;
other `CatchButton` recipes are page/body CTA chrome and are rejected by
`CatchTopBarActionRow` in debug builds. The
`design:screen-top-bar-contracts` gate also rejects direct pills in inline
action lists and simple local action-list variables.

Use `.route` for compact detail, edit and utility titles. It shares the root
font family but uses the smaller semantic title scale. A new configuration must
represent a functional need; cosmetic variants and legacy exceptions are not
valid reasons to expand the API.

```dart
CatchTopBar.route(
  title: 'Event recap',
  subtitle: event.title,
  navigation: CatchTopBarNavigation(
    mode: CatchTopBarNavigationMode.back,
    onPressed: onBack,
  ),
  actions: actions,
)
```

### Exhibit ARCH-UI-STATE-001: Provider-Free Presentation State Model

<!-- exhibit-freshness: ARCH-UI-STATE-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `lib/events/presentation/calendar/calendar_screen_state.dart`
- `test/calendar/calendar_screen_state_test.dart`
- `lib/events/presentation/calendar/calendar_screen.dart`

Current Host adopters:

- `lib/hosts/today/presentation/host_today_state.dart`
- `lib/hosts/today/presentation/host_today_view_model.dart`
- `lib/hosts/today/presentation/widgets/host_today_body.dart`
- `test/hosts/today/host_today_state_test.dart`
- `lib/hosts/events/presentation/host_events_state.dart`
- `lib/hosts/events/presentation/host_events_view_model.dart`
- `lib/hosts/events/presentation/widgets/host_events_list.dart`
- `test/hosts/host_operations_screen_test.dart`

Host Manage keeps lifecycle, event actions and summary state in
`host_event_manage_screen_state.dart`. Invitation access and link display live
in `host_invite_link_state.dart`; roster filtering, lookup and mutation
snapshots live in `host_roster_display_state.dart`; setup/live/report row
policy lives in `host_roster_row_state.dart`. These adapters receive plain
data and callbacks. The booking controller owns single-versus-bulk mutation
key selection; provider reads and route effects remain at their existing edges.

`HostTodayState` and `HostTodayAttentionData` apply the boundary to the
command-centre projection: `HostTodayScreen` translates provider snapshots at
the route edge, the provider-free builder prioritizes live before upcoming,
keeps every supported event-identified attention item, and prepares the bounded
Later preview. `HostAttentionPolicy` owns whether backend event facts qualify
as actionable work, applies the named seven-day Today horizon, and orders work
by immediate, soon, then upcoming urgency. Widgets render that result and emit
typed callbacks; they do not inspect repositories, admission policy, or route
state.

`HostEventsWorkspaceState` applies the same boundary to inventory lifecycle
policy: the provider adapter supplies events and an injected clock once; the
state object owns cancellation exclusion, exact Upcoming/Live/Past
classification, ordering, month/year grouping, Repeat availability, fill
clamping, and render-ready row metadata; provider-free widgets consume only
that state and typed callbacks. Do not move those decisions back into row
widgets or substitute waitlist count for a pending-approval aggregate.

Use this pattern when a screen needs a provider-free display model that merges
repository/domain data into UI-ready state. The screen may watch providers at the
route edge, but widgets below the screen consume the presentation state object
instead of reading repositories or recomputing product policy. In this exhibit,
`CalendarHomeState` owns the screen-level selected-date/header/view inputs and
`CalendarEventSummary` owns the merged event list.

Riverpod translation remains at that route edge. Use
`catchAsyncStateFromAsyncValue` rather than ad hoc `AsyncValue` flag checks:
Riverpod snapshots may legitimately report overlapping loading, error, data,
refresh, reload, and retry signals. The shared adapter retains those signals as
one exhaustive `CatchAsyncPhase`; the renderer then selects exactly one visible
branch. Retrying without credible data selects loading, terminal failure
selects error, and stale data remains available under an explicit error policy.
`CatchAsyncState` itself stays provider-free.

Feature presentation code must not branch directly on `isLoading`, `hasError`,
`hasValue`, `asData`, or `valueOrNull` from a watched `AsyncValue`. The
`catch_async_requires_state_surface` analyzer diagnostic enforces this route
edge throughout consumer and Host presentation folders. Convert the snapshot
once, then let
a feature-owned display state decide whether the result is a full-screen load,
empty success, missing resource, primary failure, or optional enrichment. This
keeps Riverpod transition semantics out of feature widgets and prevents a
previous error from flashing during a retry or a refresh-time error from being
mislabeled as successful absence.

This is a narrow state-boundary exhibit. The first full route/controller
migration still needs its own reference exhibit before a broad rollout.
`CalendarHomeState` is the reference route-edge state object; it composes the
`CalendarEventSummary` adapter shown below.

```dart
class CalendarEventSummary {
  const CalendarEventSummary({
    required this.events,
    required this.agendaEvents,
    required this.savedOnlyEventIds,
    required this.today,
    required this.anchorDate,
    required this.totalDistance,
    this.nextEvent,
  });

  final List<Event> events;
  final List<Event> agendaEvents;
  final Set<String> savedOnlyEventIds;
  final DateTime today;
  final DateTime anchorDate;
  final double totalDistance;
  final Event? nextEvent;

  bool isSavedOnly(Event event) => savedOnlyEventIds.contains(event.id);

  static CalendarEventSummary from({
    required List<Event> signedUpEvents,
    List<Event> savedEvents = const <Event>[],
    required DateTime now,
  }) {
    final signedUpIds = signedUpEvents.map((event) => event.id).toSet();
    final savedOnlyEventIds = <String>{};
    final byId = <String, Event>{};

    for (final event in savedEvents) {
      if (event.isCancelled || !event.startTime.isAfter(now)) continue;
      byId[event.id] = event;
      if (!signedUpIds.contains(event.id)) savedOnlyEventIds.add(event.id);
    }
    for (final event in signedUpEvents) {
      byId[event.id] = event;
    }

    final sorted = byId.values.toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final today = DateUtils.dateOnly(now);
    final totalDistance = sorted
        .where((event) => !event.isCancelled)
        .fold<double>(0, (sum, event) => sum + event.distanceKm);

    final upcoming = <Event>[];
    final cancelledUpcoming = <Event>[];
    final past = <Event>[];
    for (final event in sorted) {
      if (!event.startTime.isBefore(now) && event.isCancelled) {
        cancelledUpcoming.add(event);
      } else if (event.startTime.isBefore(now)) {
        past.add(event);
      } else {
        upcoming.add(event);
      }
    }

    final nextEvent = upcoming.isEmpty ? null : upcoming.first;
    final latestPastFirst = [...past]
      ..sort((a, b) => b.startTime.compareTo(a.startTime));
    final anchorDate = nextEvent?.startTime ?? today;

    return CalendarEventSummary(
      events: List.unmodifiable(sorted),
      agendaEvents: List.unmodifiable([
        ...upcoming,
        ...cancelledUpcoming,
        ...latestPastFirst,
      ]),
      savedOnlyEventIds: Set.unmodifiable(savedOnlyEventIds),
      today: today,
      anchorDate: anchorDate,
      totalDistance: totalDistance,
      nextEvent: nextEvent,
    );
  }
}
```

### Exhibit ARCH-FORM-DESCRIPTOR-001: Typed Form Row Orchestration

<!-- exhibit-freshness: ARCH-FORM-DESCRIPTOR-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference files:

- `packages/catch_ui/lib/src/patterns/catch_form_row_descriptor.dart`
- `packages/catch_ui/lib/src/patterns/catch_form_list.dart` and the `CatchFormTextField`, `CatchFormChoiceField` and `CatchFormRangeField` members
- `lib/user_profile/presentation/self_profile_edit_tab_state.dart`
- `lib/user_profile/presentation/widgets/profile_tab_body.dart`
- `lib/hosts/presentation/host_operations/host_club_edit_body.dart`
- `test/core/forms/catch_form_descriptors_test.dart`
- `test/core/forms/contract_alignment_test.dart`
- `test/profile/self_profile_edit_tab_state_test.dart`
- on-demand `build/reports/flutter_form_contract_inventory.json`
- `tool/contracts/generate_flutter_form_contract_inventory.mjs`

Use this pattern when multiple form surfaces need the same row mapping,
single-expanded-field behavior, and per-field patch save loop. Feature state
owns labels, values, validation policy, and typed patch factories. The shared
`CatchFormList<P>` owns canonical `CatchField` composition, accordion
wiring, pending/error presentation, and one `Future<bool> Function(P)` save
delegate. Product-specific controls use `CatchFormCustomRow<P>` and the
provided scope instead of adding feature policy to core.

The descriptor family is shared, provider-free data. Its generic visitor retains
each choice row's item type; the form list owns all row construction, schema
assertions and editor keys inside `build`. Descriptors have no rendering methods.

`CatchFormChoiceField.single` and `.multiple` share selection draft, save and
error handling. `CatchFormTextField` retains text normalization and validation;
`CatchFormRangeField` retains atomic range editing and follows changed
caller values. These are public members of the field concept, constructed by
the form list. The list accepts `onSave` and `errorTextBuilder`; persistence
and localized error interpretation remain caller-owned.

Text commit behavior is a form-section policy, not descriptor styling.
`CatchFormList<P>` defaults to `CatchFormListMode.explicit`, which
renders the canonical staged editor and Cancel/Done actions for every text row.
An existing section may select `CatchFormListMode.onBlur` as one explicit
compatibility decision while its product behavior is migrated. Do not add a
per-row boolean: sibling rows in one form section must not drift between commit
models.

The mapper accepts semantic section content (`title`, `count`, `trailing`, and
`footer`) but does not forward colors, divider roles/insets, gaps, lead/first
position, or internal-divider switches. `CatchSection.fieldRows` owns those
visual defaults and infers its field divider alignment. If a form genuinely
needs a different section role, add a reviewed semantic composition rather
than reopening raw styling parameters on the descriptor mapper.

The consumer Profile About You section remains the descriptor reference
prototype. Host Club Identity and Contact are the first promoted descriptor
adopter: both sections use typed `UpdateClubPatch` descriptors and one save
delegate. Running/Lifestyle retain their existing self-profile descriptors, and
onboarding retains its step-specific composition.

Conditional forms use `CatchFormDependencies<K>` with stable typed IDs.
Each node declares one presentation `parent`, optional additional
`prerequisites`, and a local `when` evaluated from feature state. Applicability
is the conjunction of that local condition and all prerequisite applicability.
The immutable snapshot rejects duplicate IDs, missing references, and cycles
even in inactive branches. Its iterative evaluation imposes no small
logical-depth limit.

Each presentation region allows two ownership edges below its root. A deeper
branch must declare a `continuation` or `step` boundary. The declaration
preserves the full ownership path for ancestor summaries and error recovery;
it does not render those summaries, navigate, or open a modal. The feature
must implement and test its chosen boundary. Additional prerequisites never
add visual depth. Event Policy is the initial applicability and attached-group adopter. The
shared model lives in `packages/catch_ui/lib/src/patterns/catch_form_dependencies.dart`;
Section consumes typed Fields rather than arbitrary nested widget shells.

This model is complementary to flat typed row descriptors, not a universal
form renderer. Values, validation policy, draft retention, and serialization
remain feature-owned. An inactive field must not validate as an active input
or affect submitted behavior merely because its draft value was retained.
Collapsing an active editor does not deactivate it. The section primitive owns
group geometry; the feature owns decision meaning and state. See
[`design_language.md` §7.4](design_language.md#74-conditional-hierarchy) for
the presentation rule and required visual review.

Schema-derived configuration is broader than descriptor adoption. Every
editable canonical control and descriptor instance in both installable apps
binds a generated field contract, including text fields, choices, option
groups/cards, chips, toggles, steppers, range sliders, OTP entry, and direct or
top-bar search. The generated Flutter form-contract inventory is the exhaustive
boundary; descriptor migration may continue incrementally without reopening
contract drift.

```dart
CatchFormList<UpdateUserProfilePatch>(
  title: context.l10n.userProfileProfileTabTitleAboutYou,
  textCommitMode: CatchFormListMode.onBlur,
  rows: editState.aboutSectionRows,
  accordion: _fieldAccordion,
  onSave: _saveAboutPatch,
  errorTextBuilder: _profileSaveErrorText,
)
```

### Exhibit ARCH-DATA-CURSOR-001: Bounded Cursor Read Window

<!-- exhibit-freshness: ARCH-DATA-CURSOR-001 source=tool/architecture/pattern_adoption.json owner=recursive_audit_loop -->

Reference implementation:

- `lib/core/data/cursor_page.dart` owns `limit + 1`, opaque document cursors,
  and honest `hasMore` state.
- `lib/explore/presentation/explore_discovery_window_controller.dart` is the
  reference provider family: the normalized query pair is its identity, the
  notifier alone accumulates pages, and views receive immutable state.
- `lib/events/data/event_discovery_repository.dart` and
  `lib/events/data/external_event_repository.dart` retain raw Firestore cursors
  through client-side post-filtering so rejected documents are never fetched
  repeatedly or skipped.
- `lib/core/data/read_limit_policy.dart` owns every numeric Firestore page or
  working-set ceiling. Repository code does not introduce numeric literals.

Adopters follow these constraints:

1. Realtime history listeners expose only the newest bounded page; older
   history has an explicit repository cursor method.
2. A page cursor points at the final returned Firestore document, never the
   final post-filtered domain item.
3. Query identity includes every city, time, activity, availability, cohort,
   distance, and page-size input that changes server results.
4. UI count copy distinguishes an exhaustive total from a partial `N+` window,
   and loading-more failures preserve the previously loaded window.
5. Working sets without pagination require a named exception in
   `docs/data_contracts.md` and remain capped by `ReadLimitPolicy`.

The enforcement loop is `node tool/run.mjs check
contracts:firestore-read-limits`, focused repository/controller tests, and the
Firestore index-parity check whenever query shape changes.

## Migration Plan

Use this order for architecture cleanup:

1. Plan from current source.
   - inspect the Git diff and the relevant owner docs;
   - use `node tool/harness.mjs explain --base <base> --head HEAD --mode pr`
     when the affected surface is broad; and
   - treat legacy audit snapshots as frozen migration input, never as writable
     completion state.

2. Inventory the current surface.
   - `node tool/run.mjs check audit:dependency-direction audit:adopted-architecture-boundaries audit:mutation-error-surfaces`
   - `bash tool/widget_cleanup_scan.sh --summary`
   - `dart tool/audit/backend_error_candidates.dart`
   - `dart tool/audit/frontend_error_candidates.dart`
   - relevant `npm run design:widgets:*` checks for widget/catalog changes

3. Pick one feature, one enforcement rule, or one reference pattern.
   - Do not run a whole-app rewrite in one batch.
   - Prefer features with active repository reads in widgets, raw async
     branches, or mutation-error drift.
   - If the batch rolls out an architecture pattern, update its authored owner
     contract or focused adoption test before edits.
   - If no reference exhibit exists for the pattern, create the prototype and
     exhibit first.

4. Establish the screen boundary.
   - Identify route-level screens.
   - Move page chrome, safe area, scroll ownership, and padding to the screen.
   - Move body sections into feature widgets.

5. Establish the state boundary.
   - Simple async screen: `CatchAsyncBoundary` or `CatchAsyncBoundary.sliver`.
   - Complex async screen: typed `UiState` and adapter.
   - Preserve section/partial/stale/mutation states explicitly.

6. Establish controller/repository seams.
   - Move repository calls out of widgets.
   - Add view-model providers for combined reads.
   - Add action/flow controllers for mutations and product validation.
   - Add service seams for platform/plugin operations.

7. Establish error surfaces.
   - Full-screen/sliver/inline data errors use branded error primitives.
   - Mutation errors use banner/listener/notice based on persistence needs.
   - Optional enrichment failures log or degrade without breaking primary UI.

8. Clean widget ownership.
   - Keep feature-specific widgets under feature `presentation/widgets`.
   - Promote reusable primitives through `core/widgets`, `docs/widget_catalog.md`,
     Widgetbook, and component contracts.
   - Inline or delete private helper widgets that are not legitimate classes.

9. Add or tighten enforcement.
   - Start with scanners for inventory.
   - Promote deterministic, low-noise rules into analyzer diagnostics.
   - Add explicit overrides only with reason and debt/expiry.

10. Verify and hand off.
    - Run focused analyzer/tests/scanners.
    - Update docs/catalogs when ownership changes.
    - Preserve proof in the commit and CI checks; do not write audit receipts.

## Definition Of Done

An architecture migration slice is done when:

- route-level screens are identifiable and own chrome/padding/scroll concerns;
- widgets no longer read repositories directly except documented overrides;
- async data surfaces use named boundaries;
- mutation pending states also surface errors;
- data-load errors use branded Catch error primitives with retry when safe;
- controllers/view models own product state and repository orchestration;
- StatefulWidget usage is limited to Flutter mechanics or explicitly justified;
- platform/plugin effects have service/provider seams;
- reusable widgets have catalog/Widgetbook/component-contract ownership;
- focused analyzer/tests pass;
- relevant scanners are clean, reduced, or have documented debt;
- owner docs are updated when behavior or ownership changes, with no generated
  governance evidence churn;
- the slice satisfies Migration Protocol v2 (Quick Decision Layer): inventory
  zero, old symbols deleted, ratchets lowered, probes seeded, catalog and
  goldens updated in the same PR.

## Implementation Notes For New Features

When adding a new feature, start with the thinnest structure that satisfies the
contract:

```text
lib/new_feature/
  domain/new_feature_model.dart
  data/new_feature_repository.dart
  presentation/new_feature_screen.dart
  presentation/new_feature_view_model.dart
  presentation/widgets/new_feature_body.dart
```

Event setup and offer flows use generated auto-dispose provider families with
immutable state. Private details, private preferences, published offer settings,
and publication use user/organizer/event identity; manager defaults use
user/organizer identity. The offer workspace adds the source response or query
session and initial event identity; admission includes the response, contact,
and offer. Controllers orchestrate repositories, exact-command journals and
platform services. Screens watch snapshots and dispatch commands; local text,
focus and expansion state remain widget-owned.

Account changes permanently invalidate the old scope. Async continuations check
both provider lifetime and request identity, and unresolved writes retain the
original journal command for retry. The shared preferences command mixin reuses
staging and preview behavior while private setup and published settings retain
separate revision fences, journals and mutations.

The offer workspace's route overrides the complete workspace provider families,
so the route owns disposal even while its offer controller remains in the parent
scope. Dependency updates refresh callbacks without resetting the reviewed
command. Its listener on the separately owned form-query controller is a
compatibility bridge, released through `ref.onDispose`; the workspace's own
product state and offer-flow subscriptions are Riverpod-owned. Focused lifecycle
tests cover closing the workspace during outstanding manager reads. The event
controller architecture test rejects legacy notifier ownership in this slice.

Add a controller only when there is a mutation or durable flow state.

Add a typed `UiState` when the screen cannot be honestly represented as one
`AsyncValue<T>`.

Add a domain/use-case class only when business logic is shared, complex, or
valuable to test independently.

Add a service only when an external/platform operation needs a replaceable seam
or is reused across controllers/repositories.

Add a shared core widget only after checking `docs/widget_catalog.md` and the
existing `Catch*` primitives.

## Quick Review Checklist

Use this checklist during code review:

- Is this file in the layer that owns the behavior?
- Does the screen own page chrome, safe area, padding, scroll, and top async
  boundary?
- Is any repository provider read from a widget?
- Is any plugin/platform call made directly from a widget?
- Does every async branch preserve loading, error, data, and retry semantics?
- Are empty states separate from errors?
- Does every pending mutation have an error surface?
- Is `StatefulWidget` used for Flutter mechanics rather than product state?
- Are domain rules testable without Flutter?
- Are reusable widgets in `core/widgets` and feature-specific widgets in
  feature `presentation/widgets`?
- Would a new developer know where to add the next related behavior?
