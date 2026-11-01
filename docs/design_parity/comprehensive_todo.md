---
doc_id: design_parity_comprehensive_todo
version: 0.2.331
updated: 2026-11-02
owner: product_design_parity
status: active
---

# Comprehensive Design Parity Todo

This is the canonical execution checklist for migrating Catch screens toward
the design contracts. Keep this file focused on what remains. Use the JSON
ledgers as the source of truth when counts differ:

- `design/screens/screen_coverage.json`
- `design/screens/catch.screens.json`
- `docs/design_parity/state_matrix.json`
- `tool/ui_capture/capture_coverage.json`
- `design/components/catch.components.json`

## Current Snapshot

The unused Catches Hub UI was retired on 2026-09-23. Its legacy `/catches`
URL continues redirecting to Dashboard; it no longer needs a screen export
or an independent feature contract. Its domain state and route intents remain tested.

- Route inventory: 56 app routes.
- Route coverage decisions: 50 contracted, 4 alias, 0 planned, 2 excluded.
- Screen contracts: 38 contracted screens.
- Feature orchestration coverage: 57 registered authorities, 41 source
  contracts, 34 contracted Flutter screens, 6 contracted marketing routes, 14
  contracted Admin routes, and 1 planned Flutter authority. Four static/fallback marketing
  routes remain deliberately excluded and the legacy organizer-listing route
  remains a grouped static-output projection. The social-journey batch compiles all 87
  registered states and 20 explicit actions across Catches Event,
  Matches List, Member Chat, Self Profile, and Public Profile; missing focused
  capture/test evidence remains named migration debt. Organizer Detail adds one
  three-surface identity spanning 13 consumer, 19 host, and 5 marketing states
  with 19 surface-specific actions and checked route-state-to-preview evidence.
  Dashboard Home and Event Success add 45 exact Flutter states and 24 actions;
  Event Success preserves its missing compatibility-save route callback as a
  compiler-enforced known gap rather than falsely enabling it.
  Host Home and Host Organizers add 68 exact Flutter states and 42 actions
  across Today, Events, Edit, Insights, Preview, settings spokes, payouts,
  team, host identity, and sign out. Their 61 missing evidence obligations are
  explicit compiler debt rather than implied coverage.
  Host Event Create adds 31 exact states and 33 meaningful actions across route
  authorization, the five-step wizard, media and location selection, local
  drafts, submission, offline recovery, and success navigation. Raw text entry
  remains form data rather than synthetic action cardinality.
  Host Inbox adds 25 exact states and ten actions across event/general scope,
  booked/prospective audiences, search, conversation routing, and roster-backed
  broadcasts. Chat Thread now binds Host Chat as a second projection of the
  shared `ChatScreen`, adding 29 host states and nine host-policy actions
  without duplicating the consumer contract.
  Host Organizer Create and the owner-edit projection of Host Event Manage add
  38 exact states and 23 meaningful actions, including honest pending-snapshot
  availability and child ownership for Location Map. Phone Authentication and
  Member Onboarding with its Start Welcome projection add 27 exact states and
  31 actions. They distinguish opening from selecting a country, minimum from
  surplus photo policy, mark the unreachable Instagram step explicitly, and
  contract frozen request snapshots across their pending mutations.
  Event Planning binds Calendar and Saved Events as two projections of one
  agenda goal, compiling 19 states and 12 actions without inventing list-level
  save mutations. Matching Preferences adds 11 states and six actions with a
  frozen save snapshot and a truthful missing-profile recovery state.
  Event Recap adds 12 exact states and five close/recovery/profile-recovery/
  selection/handoff actions, separating attendee-profile loading, failure, and
  resolved absence. Event Detail now binds the 11-state read-only exact-location map as
  a second projection, with route recovery, back, and directions actions. This
  pass also removes Host Event Edit's false route binding: its production flow
  opens `LocationPickerScreen`, not Event Location Map.
  Notifications, Reviews, Payments, and Account Settings complete Flutter
  migration with 62 exact states and 30 actions. Their contracts distinguish
  identity failure from sign-out, unresolved enrichment from genuine absence,
  support guidance from a real support handoff, and safe whole-surface
  concurrency from isolated loading buttons. Notifications now keeps identity
  failure distinct from resolved sign-out, Payment History separates event-title
  loading/error/missing states, and Reviews plus Account Settings freeze their
  complete pending surfaces. Payment guidance is now labeled for its real
  instructional outcome, while Event Location Map and Account Settings await
  external launches, freeze duplicate or conflicting actions, and surface false
  or thrown launcher failures instead of implying success.
  Marketing Home, Host Acquisition, and Organizer Claim add 16 exact route
  states and 45 surface actions. The dynamic Claim lookup is compiled as a
  second projection because its four authority states are independently useful;
  Home and Host now bind the shared `/api/join-waitlist` request/response
  schemas, generated website and Functions types, and runtime validators. All
  three form workflows freeze request-defining controls, steps, auth, sibling
  forms, and route exits under `ARCH-PENDING-SNAPSHOT-001`.
  Twelve Admin feature identities now compile all 14 Admin route authorities.
  Intake and Overview each use two projections because Organizer Intake and
  the live Overview controller wrapper own independently useful states and
  actions. Runtime bindings distinguish strict request/response schemas from
  generated structural object validation for every cited callable. Admin now
  closes its first systemic debt with one exclusive operation lease that
  freezes all request-defining controls, route actions, shared links, and peer
  mutations during any contracted write or submitted query. The highest-risk
  overview, access-decision, role, safety, and marketing mutation directions
  now have strict request and response schemas; remaining structural callables
  stay explicitly labeled rather than being overclaimed.
- Screen priority spread: 32 P1, 10 P2, and 5 P3 contracted screens.
- Contracted screen states: 733.
- Contracted screen sections: 254.
- Current screen-registry migration counts and per-screen gaps are derived with
  `node tool/design/check_comprehensive_todo_summary.mjs --summary`. They are
  product migration debt, not validation failures; do not copy counts here.
- Contracted section states: 1,156.
- Open screen-contract validation gaps: 0.
- Current matrix gap totals are included in the same derived summary across
  screen-state, lint-candidate, and preview-plan queues.
- Matrix state status spread: 562 captured, 84 implemented, 4 planned, and
  77 tested.
- Capture coverage registry: 671 capture ids across 54 captured route entries,
  10 alias route entries, 16 planned route entries, and 2 excluded route entries.
- Component contracts: 71 reusable primitive/composite contracts with 445
  contract states.
- Widgetbook registry: 870 generated component entries, 928 generated use-case
  builders, 124 formal primitive contract previews, and 1,532 referenced
  preview ids.
- Design references: 45 exported references are registered across 26 screens in
  `design/reference_screens/manifest.json`; 9 contracted screens still have no
  canonical exported reference. Host Settings has a found source awaiting a
  stable export, while 8 of the no-reference screens are now explicitly
  blocked on missing canonical screen sources in the local Claude bundle.
- Host reference baselines are now refreshed in the manifest for 17 registered
  host references. Within-threshold host baselines are both Host Home
  references, all six registered Host Create Event references, all five
  registered Host Event Manage references, Host Create Club basics, Host Edit
  Club owner edit, Host Edit Event owner edit, Host Clubs Organizer, and Host
  Club Detail public view. Remaining host reference work is state-specific
  exports and captures, not a current registered-baseline pixel failure.
- Non-host reference baselines are now refreshed in the manifest for 18
  registered references. Within-threshold non-host baselines are Profile Self
  edit tab, Auth Phone Entry, and Filters Preferences; all other compared
  non-host baselines remain above advisory threshold and should drive the next
  visual-edit batches.
- Event Success Companion now uses a paper ticket shell for pre-arrival and
  self-check-in moments, moving the default-live-guide advisory baseline from
  75.47% mismatch / 117.85 meanDelta to 22.94% mismatch / 33.16 meanDelta.
  The reference remains above threshold because activity palette/content and
  stage-specific variants still diverge.
- Explore Discovery now uses a production cover-story header for the populated
  feed and the `member_event_discovery` capture fixture mirrors the Claude
  Bandra/Khar pub-quiz scenario. The advisory baseline improved from 61.62%
  mismatch / 90.26 meanDelta to 41.87% mismatch / 36.74 meanDelta, but remains
  above threshold because generated event-title copy, ticket/card rhythm, map
  interleave, status chrome, and bottom dock treatment still diverge.
- Dashboard Home empty-start now uses a full-bleed first-run hero instead of
  the standard dashboard title bar plus rounded card composition. The advisory
  baseline improved from 58.50% mismatch / 76.91 meanDelta to 54.05% mismatch /
  59.13 meanDelta, but remains above threshold because deterministic text
  rendering, bottom dock/app-shell treatment, and journey-step copy rhythm still
  diverge.
- Public Profile now uses a deterministic Aanya portrait fixture, shared
  Sundowner 5K context, poppable route chrome, the `claude-phone-390x812`
  capture device, and a refreshed Profile handoff reference for
  `public_profile_member`. The advisory baseline is within threshold at
  13.40% mismatch / 17.15 meanDelta, maxDelta 240, masked 221520.
- Host Event Manage now matches all five registered Claude references within
  advisory thresholds after the Guests split, shared segmented control,
  compact setup action rows, cohort-waitlist full banner rule, and deterministic
  Bandra Social fixture pass. Final metrics are setup `13.35% / 13.30`,
  full/waitlist `14.49% / 15.54`, guests roster `12.68% / 15.43`, live
  `10.05% / 4.69`, and report `12.61% / 15.52`.
- Host Today and Events are independent destinations. `HostTodayOverview`
  renders the live-or-next decision layer, exhaustive time-sensitive attention,
  and a seven-day horizon as a compact stack or wide two-pane workspace.
  `HostEventsWorkspaceState` independently renders the durable paginated
  Schedule and History inventory plus create/repeat/import/draft entry. The old
  Today and Events advisory metrics remain historical ingredient evidence until
  approved state-specific reference exports replace them.
- The former Host Edit Club visual reference is retained as historical evidence.
  The standalone route and screen are retired; the old
  `/host/clubs/:organizerId/edit` location is not mounted. The selected organizer
  Edit tab owns identity, contact, logo/photos, policy defaults, and Event
  Success defaults.
- Host Edit Event owner edit was refreshed against the registered Claude
  reference and now compares within threshold at `9.25% / 10.93`. Remaining
  work is state-specific reference exports and adapter ownership for private
  access, validation, location picker, mutation callbacks, and close
  navigation, not first-pass owner-edit visual parity.
- Host Club Detail public view now uses the floating hero chrome, scale-down
  stat values, regular-weight About copy, and a split generic-tag wrap in the
  shared public club detail body. After the hero-edge mask calibration, the
  registered advisory comparison is within threshold at `15.82% / 15.22`,
  improving from the original `28.94% / 44.44` and the pre-calibration
  `17.87% / 19.52` follow-up.
- Host Create Event success/manage now uses a tighter paper celebration rhythm
  plus a deterministic Sundowner 5K reference fixture for
  `host_create_success_manage`. The advisory baseline improved from 32.49%
  mismatch / 55.05 meanDelta through 27.13% mismatch / 42.68 meanDelta to
  11.40% mismatch / 13.70 meanDelta and is now within threshold after the
  tokenized paper inset, detail-row, separator, and action-spacing pass.
- Current operating rule: route and screen inventory are mostly solved. The
  remaining work is state coverage, Widgetbook/capture coverage, adapter
  composition, design-reference export, pixel comparison, token/component
  reconciliation, and drift prevention.
- Dashboard Home now has canonical Claude references and advisory pixel
  comparison wiring under `design/reference_screens/`. Continue exporting
  references for the remaining P1/P2/P3 surfaces before declaring visual
  parity.
- Async route-state consolidation has started: Payment History, Review History,
  Activity, Payment Confirmation, Saved Events, Event Map, Event Location Map,
  host create/edit club/event route gates, Host Operations/Clubs, Host Account,
  Host Profile, Host Event Manage, host attendance/profile lookups, host
  analytics, hosted-club event lists, `WhoIsGoingSection`, and Settings route gutters
  now use shared async/layout primitives. Remaining direct async branches are
  dashboard view-model transformations and an optional Event Detail plan
  presence check; treat those as policy decisions before further migration.
- Async UI policy is now explicit in `ASYNC-UI-001`: view-model
  `AsyncValue.when` is allowed for non-widget display state, optional
  enrichment can stay silent only when the primary surface remains correct,
  fallback/initial data should render ahead of blocking skeletons, async errors
  need retry unless impossible or unsafe, and loading skeletons should mirror
  the eventual content shape. Skeleton passes are complete for Payment History,
  Review History, Activity, Saved Events, Matches/Chat list and message
  loading, Event Detail route loading without credible fallback data, and
  Profile/Public Profile data loading. Calendar route and club-name enrichment
  loading now preserve the calendar chrome and render calendar/agenda-shaped
  skeletons. Filters, Catches event deck, and Event Recap loading now use
  control/profile/recap-shaped skeletons. Club Detail no-fallback loading,
  event map/location-map loading, Dashboard route loading, Event Success
  host/companion/preview loading, and host route/profile/analytics/attendance
  loading now use club-profile, map, dashboard, event-success, and
  host-operations-shaped skeletons. Host draft-picker and Dashboard/Event
  Success inline progress affordances now use compact skeleton placeholders
  instead of spinners. The final broad app-wide loader audit converted Safety
  blocked accounts, User Analytics, Launch Access, Payment Confirmation, and
  profile-photo editor preview loading to content-shaped skeletons. Remaining
  direct loader hits are documented as tiny inline mutation/media/search
  progress, startup/platform loading, or core async primitive defaults.

## Comprehensive To Do List

This is the complete execution list from the current ledgers. Work top to
bottom unless a dependency is blocked; within a priority band, take the screen
with the largest state or gap count first.

### Master Completion Checklist

This section tracks the eight workstreams that must all close before the
design-system migration goal is complete.

- [x] `GOAL-DS-001` Finish loading-state parity.
  - Status: complete for the current app-wide source audit. `ASYNC-UI-001` is active and the first
    content-shaped skeleton batches are complete for Payment History, Review
    History, Activity, Saved Events, Matches/Chat list and message loading, and
    Event Detail route loading when no credible `initialEvent` fallback is
    available. Profile and Public Profile data loading now render
    content-shaped skeletons, with Public Profile preserving `initialProfile`
    fallback data. Calendar data loading now renders a pinned date-header,
    stats-strip, and agenda-row skeleton; club-name enrichment loading keeps
    resolved calendar chrome visible and skeletonizes the agenda only.
    Filters, Catches event deck, and Event Recap loading now render
    control/profile/recap-shaped skeletons. Club Detail no-fallback loading,
    event map/location-map loading, Dashboard route loading, Event Success
    host/companion/preview loading, and host route/profile/analytics/attendance
    loading now render club-profile, map, dashboard, setup/live/report,
    companion, preview, and host-operations-shaped skeletons. Host draft-picker
    inline loading plus Dashboard health/recommendation and Event Success
    manual-QA inline progress now use compact skeleton placeholders. The broad
    app-wide grep pass now also covers Safety blocked accounts, User Analytics,
    Launch Access, Payment Confirmation, and profile-photo editor preview
    loading with content-shaped skeletons. Remaining direct loader source hits
    are documented exceptions: public-profile report/block overlay, photo-slot
    upload overlay, chat composer/image/message media progress, Suvbot control
    action progress, location-picker suffix search progress, club notification
    toggle progress, Settings delete/sign-out mutation progress, startup
    loading, and core async defaults.
  - Acceptance: every contracted loading state either uses a content-shaped
    skeleton, renders credible fallback data, or is documented as a tiny inline
    metadata/platform-action exception.
  - Known generic/full-content candidates from the current source grep: none.
  - Documented loading exceptions: public-profile report/block mutation pending
    still uses an overlay spinner over already-rendered content; profile photo
    slot upload pending remains an inline media-slot action spinner; chat
    composer sends, chat image loads, Suvbot actions, location search suffixes,
    club notification toggles, and Settings destructive/auth mutations keep
    bounded inline progress; startup and core async defaults remain platform
    and primitive-level loaders.
- [ ] `GOAL-DS-002` Finish screen composition migration.
  - Status: in progress. Route inventory and many async boundaries are in
    place, but several screens still need route-state adapters and
    provider-free visual sections.
  - Acceptance: screens orchestrate providers/controllers/navigation/state
    selection only; sections receive immutable display data and typed
    callbacks; no screen-local product decisions or raw layout values remain
    without a stable exception.
- [ ] `GOAL-DS-003` Finish provider-free Widgetbook section coverage.
  - Status: in progress. Core primitives and many route states are covered;
    section-level previews still trail the screen contracts.
  - Acceptance: every contracted reusable section has meaningful Widgetbook
    states for loading, populated, empty, error/access, mutation, long copy,
    text scale, reduced motion, and light/dark where relevant.
- [ ] `GOAL-DS-004` Finish deterministic captures and pixel comparison.
  - Status: in progress. Capture and reference tooling exists, with 37
    references across 26 screens, but several contracted screens and variants
    still need exports, masks, captures, and advisory comparison proof.
  - Acceptance: every contracted screen state needed for review has a capture
    or intentional exclusion; every canonical visual reference has PNG, mask,
    manifest, state-matrix, screen-contract, advisory comparison, and audit
    proof.
- [ ] `GOAL-DS-005` Finish Claude Design vs Flutter inventory reconciliation.
  - Status: inventory exists, reconciliation remains open.
  - Acceptance: every Claude primitive, Flutter primitive, component contract,
    Widgetbook entry, token/foundation specimen, website/social-template value,
    and local-only widget is classified as keep, rename, merge, deprecate,
    reject, missing-in-Flutter, missing-in-Claude, or needs-design-review.
- [ ] `GOAL-DS-006` Move remaining raw values into tokens/components.
  - Status: in progress through advisory scanners and component passes.
  - Acceptance: spacing, radius, color, typography, motion, icon sizing,
    skeleton shape, and layout constants are owned by tokens/components or
    documented exceptions.
- [ ] `GOAL-DS-007` Promote stable drift prevention into CI/lints.
  - Status: in progress. `npm run design:parity:check` is the aggregate gate;
    several hygiene scanners remain advisory while false positives are reduced.
  - Acceptance: high-signal invariants for async UI, retryable errors,
    unresolved Widgetbook refs, screen-contract/capture drift, token drift, and
    raw visual values are enforced in CI or analysis tooling with stable debt
    ids for intentional exceptions.
- [ ] `GOAL-DS-008` Resolve remaining policy classifications.
  - Status: mostly resolved. View-model `AsyncValue.when` is allowed for
    non-widget display state; optional enrichment can fail silently only when
    the primary surface remains correct.
  - Acceptance: Event Detail's optional Event Success plan branch and any other
    optional enrichment are documented in code or screen contracts as optional,
    or promoted into visible loading/error section states if they gate a
    primary CTA, paid action, safety action, or host operation.
  - Current classification: Event Detail's saved-plan companion lookup remains
    an optional enrichment because failure/loading does not block the primary
    detail body, booking CTA, paid action, safety action, or host operation.

### P0. Source-Of-Truth Control

- [ ] Keep `design/screens/screen_coverage.json`,
  `design/screens/catch.screens.json`, `docs/design_parity/state_matrix.json`,
  `tool/ui_capture/capture_coverage.json`, Widgetbook generated ids,
  `docs/widget_catalog.md`, `design/reference_screens/manifest.json`, and this
  tracker synchronized in every pass.
- [ ] Keep route inventory generated from app routing, but keep rich design
  metadata in the portable design ledgers so Flutter, Widgetbook, the website,
  social templates, and design-tool exports can share it.
- [ ] Revisit alias and excluded routes quarterly, or immediately when a lab,
  manual-QA, or dev-only route becomes product-facing.
- [ ] Close screen-registry and state-matrix gaps only when implementation,
  capture or preview proof, tests, scanner proof, and Git/CI proof exist.

### P1. Reference Export And Pixel Baselines

- [ ] Resolve the 8 screens with no canonical reference:
  export `screen.host.settings` from the found `HostAccount.dc.html` source,
  and unblock/obtain canonical screen sources for `screen.calendar.home`, `screen.saved_events.list`, `screen.event.recap`,
  `screen.host.profile`, `screen.event.location_map`,
  `screen.reviews.history`, and `screen.payments.history`.
- [ ] Add missing P1 variant references after each first baseline:
  Catches Event mutation/comment/offline/theme states, Event Success stage and
  reveal states, Host Event Manage guest/private-access edge states,
  Host Create Event draft/validation/submit/success states, Host Chat dedicated
  host-thread states, and Matches/Profile interaction-heavy variants.
- [ ] Add missing P2 variant references: Auth OTP, validation, resend, and
  mutation states; Onboarding steps, photo gate, upload, and entry-mode states;
  Start animated reel, reduced-motion, text-scale, and alternate theme states.
- [ ] For every exported reference, add the PNG, `masks.json`, manifest entry,
  `catch.screens.json` design ref, state-matrix ref, advisory compare run, and
  exact-SHA Git/CI proof.
- [ ] Keep pixel comparison advisory until repeated local and CI runs prove
  masks, thresholds, fixture clocks, dynamic image sources, and export
  dimensions are stable.

### P2. Captures, Tests, And Interaction Proof

- [ ] Move all 62 planned matrix states toward captured, tested, ready, or
  intentionally excluded status with proof.
- [ ] Prioritize feature gaps in this order: Host Operations, secondary
  consumer surfaces, host secondary operations, utility surfaces,
  Explore/Club Detail, Catches, Matches/Chat, Start/Auth/Onboarding, Profiles,
  Event Success Companion, Event Detail, then Dashboard maintenance.
- [ ] Add deterministic captures for loading, populated, empty, error, offline,
  access/permission, mutation pending/failure, light/dark theme, text scale,
  and reduced-motion states wherever meaningful.
- [x] Replace remaining generic loading indicators/card stacks with
  content-shaped skeletons that resemble the eventual screen or section UI
  before treating a loading state as visually reviewed. The 2026-06-23
  app-wide loader audit converted the remaining full-content candidates and
  documented only bounded inline/startup/core exceptions.
- [ ] Add interaction proof for states static captures cannot prove: send,
  report, block, upload, delete, reorder, save, copy/share, destructive
  dialogs, route navigation, keyboard composers, sheets, snackbars, and private
  invite flows.
- [ ] Reuse fixture builders between Widgetbook and route captures so review
  states and capture states cannot drift independently.
- [ ] Fix `test/events/event_detail_widgets_test.dart` guest-roster scroll
  helper debt. Full-file verification currently passes the Event Detail route
  loading/fallback branches and then fails later in `EventDetailBody renders
  guest roster prompt and sign-in CTA` with `Bad state: No element` from
  `_scrollEventDetailUntilVisible`; treat this as scroll-helper/test debt, not
  loading-state parity debt.

### P3. Screen Composition Migration

- [ ] For each screen pass, inventory provider reads, controller ownership,
  mutation owners, private widgets, reusable primitives, tests, captures,
  Widgetbook entries, design refs, raw values, and open gaps before visual
  edits.
- [ ] Add or finish a route-level adapter/view-model seam before moving layout
  pieces. Route widgets should orchestrate providers, navigation, state
  selection, and section composition only.
- [ ] Move repository writes, mutation branching, permission decisions,
  product validation, denormalized lookup decisions, and platform side effects
  into controllers, repositories, or feature-owned provider seams.
- [ ] Keep visual sections provider-free where practical, receiving immutable
  display data and typed callbacks.
- [ ] Replace screen-local spacing, radius, color, typography, icon sizing,
  motion, and magic layout values with tokens, theme roles, or registered
  component APIs as each screen is migrated.

### P4. Widgetbook Review Surface

- [ ] Add provider-free Widgetbook previews for every contracted section with
  meaningful visual states after its adapter seam exists.
- [ ] Add shared fakes for loading, empty, error, offline, permission denied,
  unauthorized, mutation pending, mutation failure, missing route params,
  missing documents, deleted resources, partial data, long copy, text scale,
  reduced motion, and light/dark themes.
- [ ] Keep every `previewId` in `design/components/catch.components.json`,
  `catch.screens.json`, and `state_matrix.json` resolvable in generated
  Widgetbook directories.
- [ ] Regenerate Widgetbook after annotated use cases change, then run the
  Widgetbook contract-ref check before closing the pass.

### P5. Tokens, Components, And Cross-Surface Design Data

- [ ] Reconcile Claude Design primitives against Flutter source,
  `design/components/catch.components.json`, and Widgetbook.
- [ ] Classify every local Flutter-only primitive as keep, rename, deprecate,
  reject, or needs-design-review.
- [ ] Add foundation specimen pages for color, typography, spacing, radius,
  elevation, stroke, opacity, motion, activity pigments, icon scale, and
  photo-grade decisions.
- [ ] Keep `design/tokens/catch.tokens.json` compatible with the Design Tokens
  Community Group shape and generate Flutter, website, and social-template
  outputs from that source instead of adding Flutter-only token categories.
- [ ] Promote screen-local sections into shared component contracts only when
  reuse or design-language stability justifies the contract.

### P6. Drift Prevention And CI

- [ ] Keep `npm run design:parity:check` as the aggregate gate for route
  inventory, screen coverage, capture coverage, screen contracts, state
  matrix, Widgetbook refs, component contracts, and advisory hygiene.
  Flutter CI also checks token generation drift directly, while Tools CI now
  runs for design ledgers and Widgetbook changes.
- [ ] Keep route inventory semantic checks blocking so nested `GoRoute` child
  segments cannot drift from `Routes.<id>.path`.
- [ ] Tighten screen-contract hygiene scanners for raw Material controls,
  one-off visual constants, unregistered sections, raw error surfaces, and
  presentation widgets that own product behavior.
- [ ] Promote stable, high-signal invariants into `packages/catch_ui_lints`
  only after scanner false positives are understood.
- [ ] Add website and social-template token checks before those surfaces carry
  independent palette, typography, or event-scheme values.
- [ ] Keep broad scanners advisory until violations are fixed, intentionally
  allowed, or tracked with stable debt ids.

### P7. Blocked Or Human-Dependent Work

- [ ] Owner-side live Chats device pass, seeded-data proof, and thumbnail
  backfill require a real device/live-account QA loop.
- [ ] Strict pixel-diff blocking remains blocked on stable advisory evidence
  across repeated local and CI runs.

## Current Control Todo

Use this section when choosing the next pass. The longer sections below keep
the detail, acceptance criteria, and screen-by-screen state inventory.

### Immediate Pass Order

1. [x] `TODO-NEXT-LOADING-001` Close the remaining `GOAL-DS-001`
   loading-state parity queue.
   - Completed the remaining known full-content/generic loader candidates:
     Club Detail, Filters, Swipe, Event Recap, Event Map/Location Map,
     Dashboard maintenance loaders, Event Success route loaders, host inline
     route/profile/analytics loaders, and the final app-wide loader batch for
     Safety blocked accounts, User Analytics, Launch Access, Payment
     Confirmation, and profile-photo editor preview loading.
   - Acceptance: each loading state uses a content-shaped skeleton, credible
     fallback data, or a documented tiny inline metadata/platform-action
     exception; tests prove the behavior and the screen/state metadata no
     longer describes stale spinner behavior.
2. [ ] `TODO-NEXT-REF-P1-001` Finish the P1 design-reference export baseline.
   - Export and wire remaining Host Event Manage variants.
     Catches Event Deck now has a first
     active-profile baseline, Event Success
     Companion now has a default live-guide baseline, and Host Chat now has a
     shared Messaging-thread baseline; dedicated variants remain for all three.
     Host Create Event basics/location/schedule/policy/guide and Host Event
     Manage setup/guests/live/report now have scoped design-phone advisory
     comparison proof recorded in `catch.screens.json` and `state_matrix.json`.
   - Acceptance: PNG, mask, manifest entry, `catch.screens.json` design ref,
     `state_matrix.json` state ref, advisory comparison output, and exact-SHA
     Git/CI proof exist for every exported state.
3. [ ] `TODO-NEXT-CAP-P1-001` Close highest-risk P1 capture and interaction
   gaps.
   - Cover Event Success stage changes, Catches mutation failures/offline
     states, Matches send/report/block and keyboard states, Profile upload and
     report flows, and Host Operations role/access/loading/error variants.
   - Acceptance: deterministic route or interaction proof exists, capture ids
     are registered, matrix states move out of planned, and fixtures are
     reusable instead of one-off test data.
4. [ ] `TODO-NEXT-ADAPTER-P1-001` Extract P1 route-state adapters before
   visual polishing.
   - Start with Event Detail, Explore/Club Detail, Event Success Companion,
     Catches, Matches/Chat, Profiles, and Host Operations.
   - Acceptance: route widgets orchestrate providers/navigation only, visual
     sections receive immutable display data and typed callbacks, and adapter
     tests cover branch selection.
5. [ ] `TODO-NEXT-WB-SECTIONS-001` Add provider-free Widgetbook previews for
   contracted sections after each adapter seam exists.
   - Start with Host Home sections, Host Clubs editor/team/analytics sections,
     Host Event Manage roster/private-access/action sections, and Host Chat
     composer/safety sections.
   - Acceptance: previews reuse shared fixture builders, generated Widgetbook
     ids resolve, and component/section references are mirrored in the screen
     contract or state matrix.
6. [ ] `TODO-NEXT-REF-P2P3-001` Export remaining P2/P3 references once the P1
   reference baseline is moving.
   - Cover Auth OTP and mutation variants, deeper Onboarding steps, and Host
     Settings. Host Settings has a direct
     `explorations/archived-templates/host-account/HostAccount.dc.html`
     source and matching route captures, but the attempted Chrome headless
     export did not produce a PNG; rerun with a stable local exporter.
     Calendar, Saved Events, Event Recap, Host Profile, Event Location Map,
     Reviews History, and Payment History are blocked until design provides
     canonical standalone screen sources; current Claude sources only expose
     related primitives or adjacent flows.
   - Acceptance: same reference/mask/manifest/screen/matrix/advisory proof as
     P1, with dynamic regions masked before any diff threshold is trusted.
7. [ ] `TODO-NEXT-DS-RECONCILE-001` Reconcile primitives, tokens, sections, and
   cross-surface design data.
   - Compare Claude Design, Flutter source, `catch.components.json`,
     Widgetbook, portable tokens, website needs, and social-template needs.
   - Acceptance: every local-only primitive is classified as keep, rename,
     deprecate, reject, or needs-design-review; no new Flutter-only token
     category is added without a cross-surface decision.
8. [ ] `TODO-NEXT-DRIFT-001` Tighten drift prevention after advisory signals are
   stable.
   - Keep the aggregate design gate blocking, keep broad scanners advisory
     until false positives are understood, then promote stable invariants into
     lints or blocking scanners.
   - Acceptance: failures are high-signal, documented debt ids exist for
     intentional exceptions, and CI does not block on unstable pixel noise.

### Per-Pass Required Updates

- [ ] `TODO-PASS-001` Update all affected ledgers together:
  `screen_coverage.json`, `catch.screens.json`, `state_matrix.json`,
  `capture_coverage.json`, Widgetbook generated ids, `docs/widget_catalog.md`,
  design-reference manifests, and tracker docs.
- [ ] `TODO-PASS-002` Run the relevant proof stack:
  `npm run design:parity:check`, focused Flutter tests, focused analyzer with
  `--no-fatal-infos`, route/capture/reference checks, Widgetbook generation or
  ref checks when use cases change, `git diff --check`, and relevant scanners.
- [ ] `TODO-PASS-003` Preserve the exact changed paths and selected check
  results in Git and CI; do not update the frozen audit inventory or pass
  ledger.
- [ ] `TODO-PASS-004` Keep follow-up tasks here or in the JSON ledgers; do not
  leave new design-parity work only in chat history.

### Workstream Backlog

### Loading-State Parity Queue

- [x] Calendar route loading and club-name enrichment loading now use
  content-shaped skeletons instead of full-content spinners.
- [x] Filters loading now uses control-shaped age-slider, gender-chip, and
  apply-dock skeletons.
- [x] Catches event deck queue loading now uses the shared profile-surface
  skeleton with deck overlay and pass-button placeholders.
- [x] Event Recap loading now uses recap hero, attendee-grid, and CTA
  skeletons.
- [x] Club Detail no-fallback loading now uses club-profile-shaped hero,
  stats, host, about, tag, and upcoming-section skeletons; credible
  `initialOrganizer` fallback still renders the real body.
- [x] Event Map and Event Location Map loading now use map-shaped skeletons;
  the route location map preserves floating controls and a directions-card
  placeholder.
- [x] Dashboard route loading now uses a dashboard-shaped skeleton shell with
  header, notification, focus-card, stride-card, quick-action, and
  recommendation placeholders.
- [x] Event Success host, companion, and event-preview route loading now use
  setup/live/report, companion-stage, and preview-section skeletons.
- [x] Host route/profile/analytics/attendance loading states now use
  `HostRouteLoadingBody`, `HostSettingsRowsSkeleton`,
  `HostAnalyticsReportSkeleton`, `HostEventRowsSkeleton`, and
  `HostRosterSkeleton`.
- [x] Host draft-picker inline loading state now uses `HostInlineIconSkeleton`.
- [x] Classify Dashboard health/recommendation inline progress and Event
  Success manual-QA action progress as either tiny inline exceptions or replace
  them with content-shaped skeleton/progress treatments. Dashboard inline
  actions and Event Success manual-QA store loading now use compact skeleton
  placeholders.
- [x] Re-run the loader grep after each pass and either close, queue, or
  document every remaining spinner/generic placeholder as an exception. The
  targeted grep is clean for dashboard, event-success, and host presentation
  folders; run a broader app grep during the final parity closeout.
- [x] Broad app-wide loader audit from the 2026-06-23 source grep. Converted
  full-content/generic candidates to content-shaped skeletons in
  `lib/image_uploads/presentation/profile_photo_editor_screen.dart`,
  `lib/safety/presentation/settings_screen.dart`,
  `lib/user_analytics/presentation/user_analytics_panel.dart`,
  `lib/payments/presentation/payment_confirmation_screen.dart`, and
  `lib/launch_access/presentation/launch_access_application_screen.dart`.
  Documented remaining exceptions:
  `lib/image_uploads/presentation/widgets/photo_slot.dart` media-slot upload
  overlay, `lib/public_profile/presentation/public_profile_screen.dart`
  report/block overlay over rendered content,
  `lib/chats/presentation/widgets/suvbot_dock.dart`,
  `lib/chats/presentation/widgets/chat_input.dart`, and
  `lib/chats/presentation/widgets/message_bubble.dart` inline action/media
  progress, `lib/events/presentation/location_picker_screen.dart` search
  suffix progress, `lib/organizers/presentation/detail/widgets/catch_club_dock.dart`
  and `lib/organizers/presentation/detail/widgets/membership_button.dart`
  notification-toggle progress, Settings delete/sign-out mutation progress,
  `lib/pages/startup/splash_screen.dart` startup loading, and
  `lib/platform/riverpod_ui/catch_async_value_view.dart` core async primitive defaults.

### Reference Export Queue

- [ ] P1 references: remaining Host Create Event and Host
  Event Manage variants. Catches Event Deck now has a first active-profile
  baseline from the Claude website app screenshot asset; Event Success
  Companion now has a default live-guide baseline; Host Chat now has a first
  shared Messaging-thread baseline. Host Create Event basics/location/schedule/
  policy/guide and Host Event Manage setup/guests/live/report now have scoped
  design-phone advisory comparison proof. Remaining P1 reference work is
  dedicated Catches/Event Success/Host Chat
  variants, Host Create Event draft/validation/submit/success variants, Host
  Event Manage private-access edge variants, and any future Host Club Detail
  hosted-schedule/share/contact/review or host-control variants that design
  explicitly adds.
- [ ] P2 references: Auth OTP and mutation variants, remaining Onboarding
  steps, and Host Settings. Host Settings has a found `HostAccount.dc.html`
  source and should be the next export once the local reference exporter is
  stable. Calendar, Saved Events, Event Recap, and Host Profile are blocked on
  missing standalone canonical screen sources. Auth Phone, Onboarding Welcome,
  Filters, Host Club Create, Host Club Edit, and Host Event Edit now have first
  baseline references; their remaining work is variant coverage.
- [ ] P3 references: Event Location Map, Reviews History, and Payment History
  are blocked on missing standalone canonical screen sources. Notifications
  and Account Settings now have first baseline references; their remaining
  work is variant coverage.
- [ ] For every new reference: export PNGs, add masks, update
  `design/reference_screens/manifest.json`, wire the `designRefs` in
  `catch.screens.json`, mirror state refs in `state_matrix.json`, run advisory
  comparison, and keep the references, contracts, and review output in the same
  PR and CI run.

### P1 Execution Queue

- [ ] Finish Dashboard Home section seams: keep full/empty reference comparison
  stable, split remaining full-body display data, and add section-level
  Widgetbook coverage where the adapter seams already exist.
- [ ] Finish Host Operations baseline: add missing captures/references for Host
  Home, Host Clubs, Host Create Event, Host Event Manage, Host Inbox, Host
  Chat, and any future Host Club Detail variants; then introduce route-state
  adapters and provider-free section previews.
- [ ] Finish Explore/Club Detail: complete feed/map/filter capture variants,
  move map/list/filter/contact/host-message decisions into adapters, and
  reconcile Club Detail and Host Club Detail shared section semantics.
- [ ] Finish Catches: add the Hub reference, dedicated deck variant
  references, keyboard-open references, optional mutation references, stable
  clocks, and provider-free hub display adapters. Cached-offline deck
  preservation and comment-sheet empty/filled regions are now captured.
- [ ] Finish Matches/Chat: add remaining empty/keyboard/share/report/block
  references, interaction proof for send/report/block flows, and list/chat
  route-state adapters.
- [ ] Finish Profiles: add delete/reorder, inline save
  pending/error, settings navigation, selected report reason, snackbar proof,
  and self/public profile adapters.
- [ ] Finish Event Success Companion: add stage-by-stage captures/references,
  masks for dynamic moments, and adapters that keep runtime decisions out of
  visual widgets.
- [ ] Finish Event Detail: close remaining role branches, unavailable/private
  states, formal host/companion prompt section registration, and
  section/component hardening. Booking dock state now maps through
  `EventDetailBookingDockState`.

### P2 And P3 Execution Queue

- [ ] Start/Auth/Onboarding: add phone/OTP, validation, resend cooldown,
  onboarding-step, photo gate, upload, entry-mode, text-scale, reduced-motion,
  and design-reference coverage.
- [ ] Secondary consumer surfaces: add Calendar, Saved Events, Filters, and
  Event Recap adapters, captures, Widgetbook states, and design references.
- [ ] Host secondary operations: add Host Club Create/Edit, Host Event Edit,
  remaining Host Settings/Profile variants, adapters, Widgetbook states, and
  design references. Host Settings now has active, fallback, no-profile,
  profile loading/error, clubs loading/error, text-scale, reduced-motion, and
  paired light/dark route captures; Host Profile now has populated, loading,
  error, missing-profile, text-scale, reduced-motion, and paired light/dark
  route captures.
- [ ] Utility surfaces: preserve first-pass Widgetbook coverage while adding
  deterministic map, notifications, reviews, settings, and payment captures,
  references, and masks.

### Cross-Cutting Work

- [ ] Keep the route inventory, screen coverage, capture coverage, screen
  contracts, state matrix, component contracts, Widgetbook ids, widget catalog,
  and this tracker synchronized in every pass.
- [ ] Add provider-free Widgetbook previews for all meaningful contracted
  sections once their screen adapters exist.
- [ ] Reuse fixture data between Widgetbook and route captures so preview and
  capture states cannot drift.
- [ ] Reconcile Claude primitives, Flutter primitives, portable component
  contracts, tokens, Widgetbook entries, and website/social-template design
  needs before adding new token categories.
- [ ] Tighten drift prevention only after false positives are understood:
  aggregate design gate first, advisory scanners second, analyzer-plugin lints
  only for stable high-signal invariants.

### Exhaustive Screen Todo Index

Use this authored decision index when choosing the next parity pass. Current
counts and gap identities are derived by the summary command above; screen and
reference registries own inventory. Keep reference decisions and next actions
here without copying the computed progress view.

| Priority | Screen | Reference decision | Next todo |
|---|---|---|---|
| P1 | `screen.catches.event` | None | Local Catches Event states, cached-offline deck capture, pass/reaction pending captures, duplicate-pending disabled-control proof, comment-sheet empty/filled captures, and write-failure snackbar feedback are source-backed. Remaining work is blocked on keyboard-open capture automation and external reference exports for keyboard/comment sheet, empty/offline, accessibility, theme, and optional mutation variants. |
| P1 | `screen.club.detail` | None | Body policy, direct host/contact/photo section previews, loading captures, initial-fallback capture, empty-schedule capture, and consumer-only dock decisioning are closed. Reopen only if a new host/member dock contract is designed. |
| P1 | `screen.dashboard.home` | None | `feature.dashboard_home` now compiles all 19 states and 12 route/event-focus actions. Six captured and previewed error/offline/accessibility/theme states still need focused test registration; full-body display-data cleanup remains separate architecture work. |
| P1 | `screen.event_success.companion` | Stage variants blocked on missing canonical exports | `feature.event_success` now compiles all 26 states and 12 attendee actions. The contract exposes the unwired compatibility-save callback as a known gap instead of enabling it; nine captured/previewed states still need focused test registration, while auto-launch remains policy tested without synthetic visual evidence. |
| P1 | `screen.event.detail` | None | Booking dock, booking/cancel mutation feedback, host lookup, companion availability, body visibility, invite-loop visibility, host-app bottom-nav visibility, and social/review access now map through provider-free Event Detail display states. Continue only reference/pixel comparison, waitlist-specific mutation variants, or new product variants. |
| P1 | `screen.explore.discovery` | None | `feature.explore` now compiles two native projections under one identity: all 21 Flutter discovery/map states with empty-state recovery actions, plus the three real marketing Organizer Search route states with URL-filter/search/reset controller actions and React preview/test evidence. The stale marketing-only `saved-organizers` route state was removed because saving belongs to organizer detail. Dedicated captures for no-exact-pin and zero-radius map results plus focused no-exact-pin/offline/accessibility tests remain named Flutter evidence debt. The 2026-07 quality pass adds ranked-but-non-destructive cover selection, honest CTA copy, a seven-day intent strip plus Any, cursor freshness, privacy-safe attendee proof, host/rating organizer context, and current widget-contract convergence. The shipped Cross Paths module adds only sanitized, consent-safe person/event suggestions for Admin-selected events and remains separate from organizer-search state. |
| P1 | `screen.cross_paths.invitation` | None; deterministic route captures remain open | `feature.cross_paths_invitation` compiles all seven participant-only invitation, accepted-plan, active companion-seat hold, ended-hold, and terminal states. Focused widget, controller, callable, and Firestore rules tests cover the behavior. The client rollout flag is retired, so route captures are now an ordinary evidence follow-up using the bounded synthetic cohort rather than a staged-feature blocker. |
| P1 | `screen.host.chat` | Blocked: provider-specific offline policy and dedicated Host Chat reference masks | `feature.member_chat` now binds Host Chat as a second projection of the same `ChatScreen` implementation, compiling all 29 host states and nine host actions while preserving intentional profile/share disablement for host inquiries. Twenty-five focused test/capture obligations remain explicit host-surface evidence debt. Read-marker and scroll coordination stay lifecycle effects rather than synthetic user actions. The populated-thread reference remains within threshold at `12.71%` mismatch / `5.28` mean delta. |
| P1 | `screen.host.club.detail` | None | Public-view parity pass aligned the Claude photo fixture, one-line title scale, next-event address, next-run banner, 4-up stats, section order, activity chips, capture font loading, asset prewarm, floating hero chrome, stat value fit, regular-weight About copy, split generic-tag wraps, and hero-edge mask calibration. Advisory comparison is now within threshold at 15.82% / 15.22 after improving from 28.94% / 44.44 and 17.87% / 19.52. Current contract is closed as public-preview-only; reopen only if design adds distinct hosted schedule/share/contact/review or host-control variants. |
| P1 | `screen.host.clubs` | `HOST-STANDALONE-ORGANIZER-WORKSPACE-001` | `feature.host_organizers` compiles all 49 registered states and 29 actions across Edit, Insights, Preview, settings spokes, payouts, team, host identity, hosted-organizer navigation, and sign out. Captures cover the default Organizer workspace, signed-out, co-host, loading, error/offline, empty, analytics, inline editor, payout, team mutation, and the canonical Host team workspace; 46 focused test/capture/preview obligations remain explicit evidence debt. The standalone-host publication and CRM expansion is bounded at `20.09%` mismatch / `25.94` mean delta under `HOST-STANDALONE-ORGANIZER-WORKSPACE-001` without weakening the canonical threshold. |
| P1 | `screen.host.event.create` | Blocked: draft/validation/submit reference exports and masks | `feature.host_event_create` compiles all 31 registered states and 33 meaningful actions across authorization, wizard choices and validation, ordered media, Places-backed location selection, local drafts, submission, offline recovery, and success navigation. Ten focused test/preview obligations remain explicit evidence debt. Raw text input stays under form and event-schema validation instead of becoming synthetic action cardinality. All six registered visual references remain within advisory thresholds; success/manage is bounded at `11.40% / 13.70`. |
| P1 | `screen.host.event.manage` | Blocked: edge-state masks need canonical exports | Host Manage now has an exact generated feature contract across all registered route/workspace states and primary edit/cancel/delete actions, including typed route, screen-state, and side-effect outcomes. The restored route-and-section Widgetbook use case closes the stale preview reference; 33 focused test gaps remain explicit evidence debt. Route/access, section, participant, invite-link, Event Success, action, report, cancellation, accessibility, and theme captures remain registered, while reference-specific edge masks are still blocked on canonical exports. |
| P1 | `screen.host.event.rehearsal` | Planned: authenticated setup, live console, recap, accessibility, and theme references | `feature.event_rehearsal` binds the authenticated Host setup and control-room routes to an isolated practice domain plus a public synthetic guest-phone projection. The console freezes setup after start, advances a virtual clock, models 11 guest-behavior scenarios and eight internal fault states, rotates the guest link, and preserves deterministic reset, fork, replay, and reproduction export. Widget, controller, callable, rules, schema, and public web tests cover the first-class boundary; truthful routed captures remain planned until an authenticated organizer fixture is admitted to the canonical catalog. |
| P1 | `screen.host.home` | Blocked: separate Today/Events state variants need canonical exports | `feature.host_home` compiles all 22 registered states and 14 actions across auth recovery, organizer switching, the independent compact/wide Today command centre, exhaustive attention coverage, nested Events recovery, lifecycle filtering, and typed create/repeat/manage/task/rehearsal navigation. Twenty-two focused evidence obligations remain explicit debt. The populated Today runtime is captured at phone, tablet, and desktop widths; remaining historical Today and Events references stay ingredient evidence until design supplies approved per-destination state exports. |
| P1 | `screen.host.customers` | Planned: canonical direct-directory and detail references | `feature.host_customers` compiles all 32 registered states and 17 actions across computed segments, visually distinct organizer tags, author-stamped notes, notes-excluding export, campaign delivery history, pagination, contact administration, identity and revenue boundaries, and verified-account conversations. Deterministic directory and contact-memory captures are registered; broadcast history remains a deliberate Phase 4 seam, and a payment-maintained indexed High spender trait remains explicit follow-up work. |
| P1 | `screen.host.applications` | Planned: canonical queue, import, and detail references | Host Applications owns one provider-neutral review queue, exact submitted-answer projection, validated outreach, revision-fenced review, and CSV/XLSX import mapping. Participant submission and revocation callables now enforce reviewed values and exact organizer grants; participant-facing Flutter UI, deterministic previews/captures, and only justified provider API connectors remain explicit follow-up work. |
| P1 | `screen.host.inbox` | Blocked: Inbox variant references and new Campaigns references need canonical exports or product-backed data | `feature.host_inbox` now represents Host Messaging and compiles all 32 registered states and 13 actions across organizer-scoped Inbox/Campaigns workspaces, event/general scope, booked/prospective audiences, search, chat routing, roster-derived event broadcasts, WhatsApp sender setup, and campaign lifecycle. A full-shell Campaigns capture and focused ownership test cover the move; 25 focused evidence obligations remain explicit debt. The populated Inbox comparison and external live callable/IAM/delivery proof remain separate work. |
| P1 | `screen.matches.chat` | None | Shared `ChatRouteState`, `HostChatScreenState`, `ChatThreadLookupState`, `ChatReadMarkerController`, `ChatScrollCoordinator`, `ChatThreadActionController`, and `ChatRetryController` now own provider waves, lookup keys, read effects, scroll behavior, top-bar action execution, retry invalidation, and disabled composer copy for consumer Match Chat. Deterministic captures include keyboard-open multiline, send failure snackbar, report failure snackbar, and block confirmation. Populated-thread and new-match empty references are registered and compare within threshold after fixture and reference-safe-area alignment: populated `7.22%` / `8.50`, new-match empty `5.01%` / `5.46`. Continue only if design exports keyboard/share/report/block/dynamic-time panels. |
| P1 | `screen.matches.list` | None | `HostInboxScreenState` and `ChatsListDisplayState` now live in `chats_list_screen_state.dart` and own visible row derivation, unread filtering, empty-state selection, search affordance, and display-error retry intents. `ChatsListCelebrationController` owns new-match celebration target selection and dialog execution, and `ChatsSearchHeaderController` owns search-open close policy while the route passes query value/callback into the header. No `ChatNewMatchesRail` symbol remains; new matches render through the shared row list with fresh treatment. The populated baseline is within advisory threshold against `matches_list_context` (`6.84%` mismatch, meanDelta `8.21`); continue only if design exports distinct search/filter/loading/empty panels or the interaction state becomes external. |
| P1 | `screen.profile.public` | None | `PublicProfileScreenState` owns target-profile branches, initial fallback, viewer context projection, safety action availability, retry intent, and report/block mutation mode. Selected report reason, report pending overlay, report success snackbar, report failure snackbar, and block failure snackbar now have focused test or capture proof. Public-profile reference parity is within threshold at `13.40%` mismatch / `17.15` meanDelta after refreshing the stale source export, matching poppable route chrome, and using the `claude-phone-390x812` capture device. |
| P1 | `screen.profile.self` | Blocked: current handoff is two-tab/stale edit layout | SelfProfileScreenState, SelfProfileEditTabState, SelfProfilePhotoActionController, and SelfProfileInlineEditPatchFactory now own the route, row descriptor, photo intent, patch seams, and settings navigation proof. Fresh references and Aanya fixture alignment still compare above threshold because the handoff lacks the production Insights tab and current photo/editor rows; resume when canonical design source catches up or product chooses the older two-tab/edit layout. |
| P2 | `screen.auth.phone_entry` | Blocked: phone handoff layout is stale | `feature.phone_auth` compiles all eight phone/OTP states and six actions, distinguishing opening the country picker from selecting a dial code and preserving cooldown, verify, resend, change-number, mutation, and accessibility behavior. `DS-AUTH-004` is closed under `REG-PENDING-SNAPSHOT-001`: send pending freezes phone/country controls, duplicate controller dispatches share one request, reset invalidates stale callbacks, and focused controller/widget tests prove the snapshot boundary. OTP compares within threshold; phone entry remains blocked only on the stale canonical handoff. |
| P2 | `screen.calendar.home` | Blocked: no standalone Calendar Home source; only `CalendarPrimitive.html`/`DateRangePicker` | `feature.event_planning` compiles Calendar as the merged joined-and-saved projection with all ten states and seven recovery, date/header, Today, and Event Detail actions. It preserves identity/event-stream versus secondary organizer-name failure cases and exact evidence debt. Widgetbook and captures remain complete; canonical reference export is still blocked. |
| P1 | `screen.programs.arrivals` | Planned: roster lane captures land with the program golden pass | `feature.programs_arrivals_ops` binds the station-scoped greeter roster with attention, ready, and expected lanes; claim/readiness/disruption writes enqueue through the offline outbox with idempotent clientOperationIds. Route captures and pixel proof remain the explicit follow-up. |
| P1 | `screen.programs.dispatch` | Planned: dispatch desk captures land with the program golden pass | `feature.programs_arrivals_ops` binds deterministic transport grouping plus the plate/vendor/class dispatch sheet; writes queue offline and replay through the outbox. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.door` | Planned: door roster captures land with the program golden pass | `feature.programs_arrivals_ops` binds the function-scoped door roster: guest rows carry RSVP, attendance, party size, and household labels; check-in, undo, no-show, party-size, and walk-in writes enqueue through the offline outbox and replay against the durable server journal. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.hotel_desk` | Planned: hotel inbound captures land with the program golden pass | `feature.programs_arrivals_ops` binds the hotel-scoped inbound projection: en-route plates, manifest names, ETAs, and expected parties, with mark-arrived scoped to the destination hotel. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.trips` | Planned: ledger captures land with the program golden pass | `feature.programs_arrivals_ops` binds the trip ledger: every dispatched vehicle keeps plate, vendor, class, manifest, and outcome, with reasoned void preserved for reconciliation. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.work` | Planned: workspace captures land with the program golden pass | `feature.programs_arrivals_ops` binds the scoped staff workspace: the server-returned access payload decides which station, hotel, and ledger links render, and every destination re-checks authority. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.create` | Planned: form and Events program captures pending verification | Programs appear as bounded, paged inventory rows in Events. Event/Program creation tabs open the full program form with inline required-field validation, save/confirmation feedback and preserved retry drafts. `/host/programs` redirects to Events. |
| P1 | `screen.programs.workspace` | Planned: workspace captures land with the program golden pass | `feature.programs_arrivals_ops` binds the organizer program workspace: program header, day-rail function tiles with check-in counts, station and hotel summaries, invitation fan-out, and guests/team/import navigation. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.guests` | Planned: guest matrix captures land with the program golden pass | `feature.programs_arrivals_ops` binds the household-by-function RSVP matrix with group chips, per-guest edits, function-scoped RSVP writes, and the group ledger driven by `listProgramGuests`. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.team` | Planned: team captures land with the program golden pass | `feature.programs_arrivals_ops` binds the staff roster with duty badges, scoped pickup-point/hotel/function chips, expiry copy, and grant, invite, and revoke actions through the shared access dialog. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.import` | Planned: import captures land with the program golden pass | `feature.programs_arrivals_ops` binds manifest import: file pick, per-column field mapping through the client mapper, preview and commit through `importProgramManifest`, and the result section with created/updated counts and row errors. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.counts` | Planned: counts captures land with the program golden pass | `feature.programs_arrivals_ops` binds the counts-only stakeholder overview: guest and household totals, per-function RSVP and door counts, and per-hotel occupancy rows, with names joined client-side so no PII crosses the callable boundary. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.attendance_report` | Planned: attendance captures land with the program golden pass | `feature.programs_arrivals_ops` binds the counts-and-ids attendance report: program totals, per-function invited/responded/attending/checked-in breakdowns with exception chips, and a CSV export scoped to exactly what the viewer can read. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.now_next` | Planned: Now/Next captures land with the program golden pass | `feature.programs_arrivals_ops` binds the function-lead Now/Next board: a pure client projection over the staff work-access payload bucketing functions in-progress, upcoming and earlier with expected/checked-in counts and door-roster navigation. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.attention` | Planned: attention captures land with the program golden pass | `feature.programs_arrivals_ops` binds the duty-filtered staff attention feed: program-scoped staffAttention sends filtered server-side to the caller's active duties, deduplicated per run and duty, rendered with severity, duty and recency. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.hotel_rooms` | Planned: room-board captures land with the program golden pass | `feature.programs_arrivals_ops` binds the hotel-scoped room board: stay rows with lifecycle marks, live block capacity, unplaced-guest rows opening the assign sheet, and `upsertProgramStay`/`upsertProgramRoomBlock` mutations through the desk's authority. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.lodging` | Repo specification and seven synthetic Widgetbook cases; dedicated routed references remain open | Keep the existing typed pushed-route owners and tested private setup/review lifecycle. Compile `feature.programs_lodging` under `PROGRAMS-LODGING-FEATURE-001`; add dedicated loading/error/empty/expired/editor/review route captures and accessibility variants. Existing marketing PNGs provide no lodging-route proof. |
| P1 | `screen.host.event.moments` | Planned: routed captures land with the organizer moments golden pass | The organizer Moments workspace lists scope-bound send rules with approve-the-rule-once lifecycle controls (arm, pause, resume, manual run) and an inline editor covering manual, scheduled, anchored, and triggered initiation against the generated callable constraints. Event scope is routed today through the manage screen; program scope mounts when an organizer program workspace exists. Route captures remain the explicit follow-up. |
| P1 | `screen.programs.moments` | Planned: program Moments route captures land with the program golden pass | The program route uses the same scoped Moments list and editor for lifecycle review, creation, and edits. Its route and states are implemented; visual captures remain open. |
| P1 | `screen.host.work` | Planned: routed captures land with the staff work shell golden pass | The unified staff work picker lists the caller's live assignments grouped by organizer, forwards a lone workShell assignment straight into its scoped workspace, and renders the grant empty state otherwise. Route captures remain the explicit follow-up. |
| P2 | `screen.event.recap` | Blocked: no standalone Event Recap source | `feature.event_recap` compiles all 12 states and five close, route-recovery, profile-recovery, attendee-selection, and Catches-handoff actions. `DS-EVENT-RECAP-005` is closed: profile lookup loading keeps the resolved recap with a grid skeleton, failure shows inline retry for the exact batched query, and Guest is reserved for genuinely missing resolved profiles. Deterministic profile-enrichment loading/error previews and captures are registered; canonical reference export remains blocked. |
| P2 | `screen.filters.preferences` | None | `feature.matching_preferences` compiles all 11 states and six close, recovery, age, gender, reset, and apply actions. `DS-FILTERS-004` is closed under `REG-PENDING-SNAPSHOT-001`, and `DS-FILTERS-005` is closed by branded missing-profile guidance plus retry and focused route proof. Existing Widgetbook, captures, and default reference stay registered. |
| P2 | `screen.host.club.create` | Additional state-specific references needed beyond basics_default | `feature.host_organizer_create` compiles all 17 states and 12 meaningful actions across wizard movement, media, organizer type/city, reusable defaults, local draft recovery, submission, and caller-pop lifecycle. Pending submit, draft save, and initial restore now freeze route exit, step movement, media, fields/defaults, and footer actions; controller and widget proof closes `DS-HOST-CLUB-CREATE-005`. Remaining exceptions are reference or unrelated evidence debt. |
| P2 | `screen.host.club.edit` | None | Route captures now cover owner edit, validation, media replacement, submit pending/error, offline fetch failure, co-host mode, forbidden identity, accessibility, and theme states. Shared Host Club Create/Edit adapter state now owns field/media display values, validation, submit request data, route callback intents, and submit-success close policy; owner-edit pixel comparison is within threshold. |
| P2 | `screen.host.event.edit` | None | `feature.host_event_manage` binds owner edit as a second lifecycle projection, compiling all 21 edit states and 11 actions across route recovery, schedule/location/pace/policy decisions, the actual `LocationPickerScreen` fullscreen modal, validation, update, and caller-pop lifecycle. Save pending now freezes route dismissal and the complete form, while controller deduplication and focused widget proof close `DS-HOST-EVENT-EDIT-005`. |
| P2 | `screen.onboarding.flow` | Blocked: interaction variants need canonical exports | `feature.member_onboarding` compiles all 13 flow states and 22 actions across booking identity, profile completion, run preferences, draft resume, exact minimum/surplus photo policy, prompts, and mutation behavior. The implemented Instagram step is explicitly `orphaned`: no production entry mode or forward transition reaches it, so retire it or reconnect it with route proof under `DS-ONBOARDING-005`. `DS-ONBOARDING-006` is closed under `REG-PENDING-SNAPSHOT-001`: pending saves freeze step-back and every request-defining identity, prompt, or running-preference control, and controller tests prove duplicate dispatches share one request. Existing Widgetbook, captures, adapters, and primary references remain registered; interaction-specific references stay blocked under `DS-ONBOARDING-004`. |
| P2 | `screen.saved_events.list` | Blocked: no standalone Saved Events source | Event Planning binds Saved Events as the saved-only projection of Calendar's agenda goal, compiling all nine states and five back/recovery/Event Detail actions. The contract intentionally declares no list-level save/unsave action even though a saved-event repository exists, because those mutations remain on Event Detail. Widgetbook and captures remain complete; canonical reference export is still blocked. |
| P2 | `screen.start.welcome` | State-specific references are optional until strict comparison requires them | Member Onboarding binds Start Welcome as a second projection of the same `OnboardingWelcomeBody` implementation and reuses its skip, phone-auth, and guest-Explore action identities. All six reel, landed, CTA, reduced-motion, text-scale, and fixed-dark states compile against their own Start authority evidence instead of creating a duplicate feature. Additional state-specific references remain blocked/reference-only unless strict visual comparison requires them. |
| P3 | `screen.event.location_map` | Blocked: no standalone full-screen map source; map primitives only | Event Detail binds Event Location Map as its read-only exact-location projection, compiling all 11 states and three back/recovery/directions actions. `DP-EVENT-MAP-005` is closed: directions launch is singleton while pending, the button shows progress, and false or thrown failures restore the action with visible feedback. Deterministic pending/failure captures are registered; exported map masks and pixel comparison remain blocked on a canonical route source. |
| P3 | `screen.notifications.list` | None | `feature.notifications` compiles all 14 states and four identity-retry/activity-retry/read/navigation actions. `DP-NOTIFICATIONS-004` is closed: uidProvider failure now renders a branded auth retry state, while resolved null uid alone owns the signed-out empty state. Deterministic uid-error preview and capture evidence is registered. |
| P3 | `screen.payments.history` | Blocked: no standalone Payment History source; Booking moments only | `feature.payments` compiles all 17 states and six recovery/receipt/support actions. `DP-PAYMENT-HISTORY-005` is closed by the honest How to get help label and tested payment/order-ID guidance; `DP-PAYMENT-HISTORY-006` is closed by distinct event-title loading, failure, and resolved-absence behavior. Deterministic enrichment previews/captures and refreshed support-guidance captures are registered; canonical reference export remains blocked. |
| P3 | `screen.reviews.history` | Blocked: no standalone Reviews History source; `ReviewRow` primitive only | `feature.reviews` compiles all 12 states and seven recovery/edit/rating/save/delete actions. Review mutation fields now freeze with their captured request under `REG-PENDING-SNAPSHOT-001`; event enrichment loading/failure/missing still shares one fallback under `DP-REVIEWS-HISTORY-005`. Reference export remains blocked. |
| P3 | `screen.settings.account` | None | `feature.account_settings` compiles all 19 states and 13 navigation, preference, safety, external, deletion, and sign-out actions. `DP-SETTINGS-ACCOUNT-004` and `DP-SETTINGS-ACCOUNT-005` are closed: mutation and external-link operations freeze the whole surface, the selected external row shows progress, duplicate taps are rejected, and false or thrown launcher failures produce visible feedback. Deterministic external-link pending/failure captures are registered. |

### Currently Blocked Or User-Input Dependent

- [ ] `TODO-BLOCKED-LIVE-QA-001` Owner-side live Chats device pass, seeded-data
  proof, and thumbnail backfill remain owner-blocked because they require a
  real device/live-account QA loop.
- [ ] `TODO-BLOCKED-DESIGN-DECISION-001` Pixel comparisons remain advisory
  until repeated local/CI runs prove masks, thresholds, fixture clocks, image
  sources, and dynamic regions are stable enough to block merges.
- [ ] `TODO-BLOCKED-DESIGN-SOURCE-002` Canonical reference export is blocked
  for Calendar Home, Saved Events, Event Recap, Host Profile,
  Event Location Map, Reviews History, and Payment History until design
  provides standalone screen sources. The local Claude bundle currently only
  has related primitives or adjacent flows for those surfaces.

## Master Execution Checklist

This is the high-level backlog. A feature is not design-parity complete until
each relevant layer below is done and the proof is recorded in the JSON ledgers,
tests, captures, Widgetbook, Git, and CI.

### 0. Ledger And Source-Of-Truth Hygiene

- [ ] `TODO-MASTER-LEDGER-001` Keep route inventory, screen coverage, capture
  coverage, screen contracts, state matrix, Widgetbook ids, component
  contracts, widget catalog, and this tracker synchronized in the same pass.
- [ ] `TODO-MASTER-LEDGER-002` When a route is added, removed, renamed, or
  aliased, update `tool/ui_capture/route_inventory.json`,
  `design/screens/screen_coverage.json`,
  `tool/ui_capture/capture_coverage.json`, `design/screens/catch.screens.json`,
  and `docs/design_parity/state_matrix.json` before visual work.
- [ ] `TODO-MASTER-LEDGER-003` Keep gap closure explicit: close the gap in the
  screen registry or state matrix only when implementation, preview/capture,
  test, and scanner proof exist or the gap is intentionally excluded.
- [ ] `TODO-MASTER-LEDGER-004` Do not create duplicate backlog docs. Add new
  design-parity work here or in the relevant JSON registry. This is the only
  human-readable design-parity worklist.

### 1. Design References And Pixel Comparison

- [ ] `TODO-MASTER-REF-001` Export canonical Claude/Figma references for every
  P1 screen and every accepted primitive/compound before declaring visual
  parity.
- [ ] `TODO-MASTER-REF-002` Store exported references under
  `design/reference_screens/<screen-or-component>/<state>.png` with a manifest
  that records source, viewport, theme, text scale, and export date.
- [ ] `TODO-MASTER-REF-003` Define masks for dynamic regions: status bars, safe
  areas, maps, timestamps, remote photos, generated counters, live counts,
  keyboards, snackbars, sheets, dialogs, and animation frames.
- [ ] `TODO-MASTER-REF-004` Add advisory pixel comparison between deterministic
  route/Widgetbook captures and exported design references.
- [ ] `TODO-MASTER-REF-005` Promote pixel comparison to blocking only after the
  advisory run is stable across repeated CI/local runs.

### 2. Tokens, Primitives, And Component Contracts

- [ ] `TODO-MASTER-DS-001` Reconcile the Claude Design inventory against
  `design/components/catch.components.json`, Widgetbook, and Flutter source.
- [ ] `TODO-MASTER-DS-002` Classify each local Flutter primitive absent from
  Claude Design as keep, rename, deprecate, reject, or needs-design-review.
- [ ] `TODO-MASTER-DS-003` Expand component contracts beyond the 18 formal core
  contracts only when the component is reusable, appears in the design system,
  or blocks screen composition.
- [ ] `TODO-MASTER-DS-004` Add foundation specimen pages for color, typography,
  spacing, radius, elevation, stroke, opacity, motion, activity pigments, icon
  scale, and photo-grade decisions.
- [ ] `TODO-MASTER-DS-005` Keep `design/tokens/catch.tokens.json` compatible
  with the Design Tokens Community Group shape and keep Flutter, website, and
  social-template outputs generated from that source.
- [ ] `TODO-MASTER-DS-006` Replace screen-local raw values with tokens,
  semantic roles, or registered component APIs as each screen is migrated.

### 3. Widgetbook Review Surface

- [ ] `TODO-MASTER-WB-001` Add Widgetbook entries for every contracted screen
  section that has meaningful local visual states.
- [ ] `TODO-MASTER-WB-002` Add shared fixture fakes for loading, empty, error,
  offline, permission denied, unauthorized, mutation pending, mutation failure,
  missing route params, missing documents, deleted resources, partial data,
  long copy, text scale, reduced motion, and light/dark themes.
- [ ] `TODO-MASTER-WB-003` Reuse fixture data between Widgetbook and route
  captures wherever practical so review states do not diverge.
- [ ] `TODO-MASTER-WB-004` Run Widgetbook build generation whenever annotated
  use cases change, then verify contract preview ids resolve.
- [ ] `TODO-MASTER-WB-005` Prefer provider-free section previews after a route
  screen has an adapter/view-model seam; use full route previews only when the
  provider wiring itself is the thing under review.

### 4. Captures, Tests, And State Proof

- [ ] `TODO-MASTER-PROOF-001` For every contracted state, record whether it is
  planned, implemented, previewed, captured, tested, ready, blocked, or
  intentionally excluded.
- [ ] `TODO-MASTER-PROOF-002` Add deterministic route captures for P1 loading,
  populated, empty, error, offline, access/permission, mutation, text-scale,
  reduced-motion, and paired theme states.
- [ ] `TODO-MASTER-PROOF-003` Add focused tests for route-state adapters,
  mutation error surfacing, typed callbacks, access branches, and fixture seams.
- [ ] `TODO-MASTER-PROOF-004` Add interaction proof for states that static
  captures cannot prove: send/report/block, upload/delete/reorder, private
  invite links, copy/share, destructive dialogs, route navigation, keyboard
  composer states, and snackbars.
- [ ] `TODO-MASTER-PROOF-005` Keep captures deterministic by injecting clocks,
  fixture data, reduced-motion behavior, and stable image sources where needed.

### 5. Screen Composition Migration

- [ ] `TODO-MASTER-COMP-001` For each selected screen, inventory route widget,
  provider reads, controllers, mutation owners, private widgets, existing
  sections, tests, captures, Widgetbook entries, design references, raw values,
  and open registry gaps before visual edits.
- [ ] `TODO-MASTER-COMP-002` Introduce or finish a route-level screen state
  adapter/view model before moving layout pieces around.
- [ ] `TODO-MASTER-COMP-003` Keep route widgets responsible for provider
  orchestration, state selection, navigation wiring, and section composition
  only.
- [ ] `TODO-MASTER-COMP-004` Move repository writes, mutation branching,
  permission decisions, product validation, and platform side effects into
  controllers, repositories, or feature-owned provider seams.
- [ ] `TODO-MASTER-COMP-005` Keep visual sections provider-free where practical;
  pass immutable display data and typed callbacks.
- [ ] `TODO-MASTER-COMP-006` Register missing sections/components as they are
  discovered, but keep one-screen layout glue private until reuse or design
  language requires a named contract.
- [ ] `TODO-MASTER-COMP-007` Use batched feature seams for list/profile/event
  display data instead of per-tile provider streams or sequential reads.

### 6. Drift Prevention And CI

- [ ] `TODO-MASTER-DRIFT-001` Keep `npm run design:parity:check` as the
  aggregate gate for route inventory, capture coverage, screen coverage,
  screen contracts, Widgetbook refs, component contracts, matrix entries, and
  advisory hygiene.
- [ ] `TODO-MASTER-DRIFT-002` Tighten screen-contract hygiene scanners around
  raw Material controls, one-off visual constants, unregistered sections, and
  presentation widgets that own product behavior.
- [ ] `TODO-MASTER-DRIFT-003` Promote stable UI invariants into
  `packages/catch_ui_lints` only after scanner false positives are understood.
- [ ] `TODO-MASTER-DRIFT-004` Keep broad scanners advisory until violations are
  fixed, intentionally allowed, or documented with stable debt ids.
- [ ] `TODO-MASTER-DRIFT-005` Add website/social-template token checks before
  those surfaces start carrying independent palette, typography, or event
  scheme values.

### 7. Recommended Execution Order

- [ ] `TODO-MASTER-ORDER-001` Finish the narrow Dashboard Home composition
  cleanup already in progress, including remaining display-data seams and
  design-reference export. EventFocusRail now receives typed
  `EventFocusActions` and a display-only check-in state from the composing
  Dashboard body. DashboardStrideSection now receives typed stride actions and
  display-only action state from the composing Dashboard body.
- [ ] `TODO-MASTER-ORDER-002` Complete the P1 capture/design-reference loop for
  Event Detail, Explore/Club Detail, Event Success Companion, Catches,
  Matches/Chat, Profiles, and Host Operations.
- [ ] `TODO-MASTER-ORDER-003` For each P1 screen, migrate composition only after
  state inventory and fixture seams are clear.
- [ ] `TODO-MASTER-ORDER-004` Move to P2 Start/Auth/Onboarding, secondary
  consumer surfaces, and host secondary operations after P1 routes have
  capture/reference/advisory-diff baselines.
- [ ] `TODO-MASTER-ORDER-005` Preserve P3 utility Widgetbook coverage and close
  utility capture/reference gaps opportunistically when related primitives or
  sheets are touched.

## Immediate Queue

1. [ ] `TODO-NEXT-001` Finish the P1 design-reference export baseline.
   - Already done: Dashboard Home full/empty, Event Detail member, Explore
     feed, Club Detail member, Matches list/thread, Profile self edit/preview,
     Public Profile, Host Home Today, Host Clubs Organizer, Host Inbox, Host
     Create Event basics/location/schedule/policy/guide, and Host Event Manage
     setup/private-access/live/report, Host Club Create basics, Host Club Edit
     owner edit, Host Event Edit prefilled event, Notifications Activity, and
     Settings Account references are exported, masked, manifest-registered, and
     wired into advisory comparison. Auth Phone, Onboarding Welcome, and
     Filters default references are also exported, masked, and
     manifest-registered; Auth and Onboarding still need deeper variant exports.
     Host Club Detail owner/public-view is exported, masked,
     manifest-registered, wired to `host_club_detail_public`, and within the
     advisory threshold after the hero-edge mask calibration.
   - Also exported but not manifest-registered yet: Host Events tab, because a
     matching route capture id is not in place.
   - Catches Event Deck active profile now has a Claude website app screenshot
     reference normalized, masked, manifest-registered, and wired to
     `post_run_catch_window`; mutation, keyboard/comment sheet, empty/offline,
     accessibility, and theme variants remain.
   - Start Welcome landed direct now has the splash/welcome handoff reference
     exported, masked, manifest-registered, and wired to `start_welcome`;
     animated reel, reduced-motion, text-scale, and alternate theme variants
     remain.
   - Event Success Companion default live guide now has a Claude Event
     Companion reference exported, masked, manifest-registered, and wired to
     `event_success_companion`; the production default/pre-arrival shell now
     matches the ticket-first structure and improves the advisory comparison
     from 75.47% to 22.94% mismatch. Stage, reveal, afterglow, feedback,
     activity palette/content, and accessibility/theme variants remain.
   - Host Chat populated thread now has a shared Messaging-thread baseline
     reference exported, masked, manifest-registered, and wired to
     `host_chat_inquiry`; dedicated professional host-chat variants remain.
   - Latest pass: Host Create Event basics/location/schedule/policy/guide and
     Host Event Manage setup/guests/live/report references were re-compared
     against design-phone captures and the advisory numbers were mirrored into
     `catch.screens.json` and `state_matrix.json`.
   - Catches Hub is now classified as blocked on missing canonical design
     source/export; the local Claude bundle only exposes the already-registered
     Catches Event Deck/post-run catch-window asset.
   - Next exports: Host Settings from the found `HostAccount.dc.html` source,
     remaining Auth/Onboarding variants, Host Create Event
     draft/validation/submit/success, and Host Event Manage private-access
     edge variants. Host Profile, Calendar, Saved Events, Event Recap, Event
     Location Map, Reviews History, and Payment History are blocked on
     canonical standalone screen sources.
   - Start with references that already have local Claude templates:
     Host Create Event and Host Manage remaining variants where matching
     capture ids exist or can be added in the same pass.
   - For each export, add `design/reference_screens/<screen>/<state>.png`, a
     `masks.json`, manifest entries, screen-registry refs, state-matrix refs,
     and an advisory `check_reference_screens.mjs --compare` run.
2. [ ] `TODO-NEXT-002` Close remaining P1 deterministic capture and
   interaction-proof gaps.
   - Event Success Companion: first-pass route loading/access/error/offline
     and runtime moments are captured and linked to Widgetbook; remaining work
     is mutation pending/failure adapters plus deeper reference exports.
   - Catches: mutation failure/interactions, cached-offline preservation,
     keyboard/comment sheet regions, and explicit hub offline copy if needed.
   - Matches/Chat: send/report/block mutation proof, keyboard-open snapshots,
     and owner-blocked live Chats QA.
   - Profiles: delete/reorder, inline save pending/error
     drawers, settings navigation, selected report reason, and
     success/failure snackbar proof.
   - Host Operations: remaining loading/error/empty/offline/access,
     text-scale, reduced-motion, light/dark, role, analytics, roster, private
     access, and host chat variants.
3. [ ] `TODO-NEXT-003` Add provider-free section-level Widgetbook previews
   after the relevant screen adapters exist.
   - Start with Host Home sections, then Host Clubs editors/team/analytics,
     Host Event Manage roster/private access/actions, and Host Chat
     composer/safety states.
   - Keep broad route previews only where provider wiring itself is the review
     target; prefer immutable display data plus typed callbacks for reusable
     sections.
4. [ ] `TODO-NEXT-004` Extract screen adapters for the P1 routes with the
   highest remaining product-state risk.
   - Event Detail: host lookup, companion plan lookup, and booking dock mode
     now map through provider-free `EventDetailHostState`,
     `EventDetailCompanionState`, and `EventDetailBookingDockState`; finish
     remaining visibility branches.
   - Explore/Club Detail: move filtering, map/list mode, host messaging,
     contact launching, and dock-mode decisions into route state.
   - Event Success Companion: keep runtime decisions in `EventSuccessRuntime`
     and route-specific display derivation outside visual widgets.
   - Catches, Matches/Chat, Profiles, and Host Operations: move provider waves,
     mutations, route callbacks, side effects, and access decisions into
     feature-owned adapters/controllers.
5. [ ] `TODO-NEXT-005` Reconcile component and token inventory while screen
   work exposes gaps.
   - Reconcile every Claude Design primitive against
     `design/components/catch.components.json`, Widgetbook, and Flutter
     source.
   - Classify local-only Flutter primitives as keep, rename, deprecate, reject,
     or needs-design-review.
   - Add foundation specimen pages for color, type, spacing, radius, elevation,
     stroke, opacity, motion, activity pigments, icon scale, and photo-grade
     decisions.
6. [ ] `TODO-NEXT-006` Tighten drift prevention only after the advisory signal
   is stable.
   - Keep `npm run design:parity:check` as the aggregate gate.
   - Promote only high-signal UI invariants into `packages/catch_ui_lints`.
   - Keep broad scanners advisory until violations are fixed, intentionally
     allowed, or documented with stable debt ids.

## Matrix Gap Queue

| Priority | Feature | Screens | States | Screen Gaps | Lint Gaps | Preview Gaps | Total Open | Next Pass |
|---|---|---:|---:|---:|---:|---:|---:|---|
| P1 | `host_operations` | 7 | 180 | 24 | 0 | 1 | 25 | `host-operations-captures-01` |
| P2 | `secondary_consumer_surfaces` | 4 | 39 | 12 | 1 | 1 | 14 | `secondary-consumer-surfaces-design-parity-01` |
| P2 | `host_secondary_operations` | 5 | 88 | 10 | 1 | 0 | 11 | `host-secondary-operations-design-parity-01` |
| P3 | `utility_surfaces` | 5 | 67 | 9 | 1 | 1 | 11 | `utility-surfaces-design-parity-01` |
| P2 | `start_auth_onboarding` | 3 | 15 | 6 | 1 | 1 | 8 | `start-auth-onboarding-design-parity-01` |
| P1 | `explore_discovery` | 3 | 35 | 0 | 0 | 0 | 0 | `explore-spec-policy-review-01` |
| P1 | `catches` | 2 | 31 | 6 | 0 | 0 | 6 | `catches-captures-01` |
| P1 | `matches_chat` | 2 | 38 | 6 | 0 | 0 | 6 | `matches-chat-captures-01` |
| P1 | `profiles` | 2 | 30 | 4 | 0 | 0 | 4 | `profile-captures-01` |
| P1 | `event_success_companion` | 1 | 26 | 3 | 0 | 0 | 3 | `event-success-companion-composition-01` |
| P1 | `events_discovery_booking` | 1 | 15 | 2 | 1 | 0 | 3 | `event-detail-composition-01` |
| P1 | `dashboard_home` | 1 | 19 | 0 | 0 | 0 | 0 | `dashboard-full-body-display-data-01` |

## A. Sources Of Truth And Gates

- [x] `TODO-SOT-001` Generate route inventory from app routing.
- [x] `TODO-SOT-002` Require every generated route to have a coverage decision:
  contracted, alias, planned, or excluded.
- [x] `TODO-SOT-003` Validate contracted routes against
  `design/screens/catch.screens.json`.
- [x] `TODO-SOT-004` Validate screen contracts against route inventory, source
  files, Dart symbols, captures, components, and Widgetbook refs.
- [x] `TODO-SOT-005` Keep `npm run design:parity:check` as the aggregate local
  design gate.
- [x] `TODO-SOT-006` Add a route-coverage review note/check to the new-route
  workflow so new routes cannot ship without a coverage decision.
  - Proof: `docs/design_parity/README.md` now documents the new-route workflow,
    Flutter CI runs `npm run design:parity:check`, and the gate fails if route
    inventory, screen coverage, capture coverage, screen contracts, or matrix
    entries drift.
- [x] `TODO-SOT-007` Decide whether generated route inventory is sufficient or
  whether the router/AppRoute source should carry richer design metadata.
  - Decision: keep the router as the path inventory source only. Rich design
    metadata stays in the portable `design/screens` and `docs/design_parity`
    ledgers so Flutter, Widgetbook, website/social templates, and design-tool
    exports can share the same contracts.
- [ ] `TODO-SOT-008` Keep `screen_coverage.json`, `catch.screens.json`,
  `state_matrix.json`, `capture_coverage.json`, generated Widgetbook ids,
  `docs/widget_catalog.md`, and this tracker synchronized in
  every parity pass.
- [ ] `TODO-SOT-009` Revisit alias and excluded routes quarterly, or whenever a
  dev/lab/manual-QA route becomes product-facing.

## B. State Contracts

- [ ] `TODO-STATE-001` For every contracted screen, enumerate default,
  populated, loading, empty, error, offline, permission/access, mutation,
  light/dark theme, text-scale, and reduced-motion states where meaningful.
- [ ] `TODO-STATE-002` For every detail route, explicitly record missing route
  params, missing documents, deleted resources, unauthorized access, and
  initial-data fallback states.
- [ ] `TODO-STATE-003` For chat-like surfaces, record keyboard, composer,
  message loading/error, send pending/failure, attachment, blocked, report,
  safety, read-marker, and empty-thread states.
- [ ] `TODO-STATE-004` For create/edit surfaces, record validation,
  disabled-submit, draft, image/file picker, mutation pending/failure, success,
  cancel/exit, and permission states.
- [ ] `TODO-STATE-005` For host/member/guest/owner/private variants, record
  role-specific copy, data, and behavior.
- [ ] `TODO-STATE-006` Mark every state as planned, implemented, previewed,
  captured, tested, ready, blocked, or intentionally excluded with proof refs.

## C. Widgetbook

- [x] `TODO-WB-001` Set up Widgetbook as the review surface for Catch
  primitives and hard-to-reach states.
- [x] `TODO-WB-002` Add first-pass Widgetbook coverage for the core component
  catalog and generated contract refs.
- [x] `TODO-WB-003` Add first-pass P3 utility Widgetbook coverage for Event
  Location Map, Notifications, Reviews History, Settings, and Payment History.
- [x] `TODO-WB-004` Add first-pass Widgetbook coverage for Dashboard Home,
  Event Success Companion, Catches hub/event deck, Matches list/chat,
  Profile/Public Profile, and Host Operations routes.
- [x] `TODO-WB-005` Represent every reusable primitive/composite in
  `design/components/catch.components.json` with every meaningful contract
  state in Widgetbook:
  - `catch.badge`
  - `catch.button`
  - `catch.chip`
  - `catch.field`
  - `catch.section`
  - `catch.icon_button`
  - `catch.journey_steps`
  - `catch.option_card`
  - `catch.privacy_badge`
  - `catch.roster_row`
  - `catch.roster_table`
  - `catch.roster_tiles`
  - `catch.screen_body`
  - `catch.section_stack`
  - `catch.option_group`
  - `catch.surface`
  - `catch.field`
  - `catch.top_bar`
  - Proof: `widgetbook/lib/primitives/primitive_contract_use_cases.dart`
    contains formal previews for all 18 component contracts, and
    `tool/design/check_widgetbook_contract_refs.mjs` now fails if a preview's
    declared states drift from `design/components/catch.components.json`.
- [ ] `TODO-WB-006` Add Widgetbook entries for every contracted screen section
  with meaningful local visual states.
- [ ] `TODO-WB-007` Add shared fakes for loading, empty, error, offline,
  permission denied, unauthorized, mutation pending, mutation failure, missing
  route params, missing documents, deleted resources, and partial data.
- [ ] `TODO-WB-008` Reuse fixture data between Widgetbook and route captures
  where practical.
- [ ] `TODO-WB-009` Keep generated Widgetbook directories synchronized after
  adding, renaming, or deleting use cases.
- [ ] `TODO-WB-010` Keep contract `previewIds` resolvable in generated
  Widgetbook directories.
- [ ] `TODO-WB-011` Add text-scale, reduced-motion, and light/dark review
  coverage for high-risk primitives, animated surfaces, maps, and all P1
  sections.

## D. Captures And Pixel Comparison

- [x] `TODO-CAP-001` Keep capture coverage separate from screen contract
  status.
- [x] `TODO-CAP-002` Register route, screen, capture, Widgetbook, component,
  and matrix checks in the aggregate parity gate.
- [x] `TODO-CAP-003` Keep `tool/ui_capture/capture_coverage.json` exhaustive
  for every generated route.
  - Proof: `node tool/ui_capture/check_capture_coverage.mjs --check --summary`
    validates all 48 generated routes have a capture decision: captured, alias,
    planned, or excluded.
- [ ] `TODO-CAP-004` Add deterministic captures for P1 loading, populated,
  empty, error, offline, access/permission, mutation, text-scale,
  reduced-motion, and paired theme states.
- [ ] `TODO-CAP-005` Add P2/P3 captures when states are hard to reach manually
  or likely to drift.
- [ ] `TODO-CAP-006` Store canonical design references under
  `design/reference_screens/`.
- [ ] `TODO-CAP-007` Define masks for status bars, safe areas, maps,
  timestamps, remote photos, generated counters, live counts, dynamic
  recommendations, keyboards, snackbars, sheets, dialogs, and animation frames.
- [ ] `TODO-CAP-008` Add advisory pixel comparison between local captures and
  exported design references.
- [ ] `TODO-CAP-009` Promote selected pixel checks to blocking only after
  repeated advisory runs prove fixtures, masks, image sources, and thresholds
  are stable.

## E. Composition Migration

- [ ] `TODO-COMP-001` For every screen pass, identify route widget, provider
  reads, controller ownership, mutation owners, private widgets, tests,
  captures, Widgetbook entries, and contract gaps before visual edits.
- [ ] `TODO-COMP-002` Add a route-level screen state adapter/view model before
  visual refactors.
- [ ] `TODO-COMP-003` Keep route widgets responsible for routing, provider
  orchestration, state selection, and section composition only.
- [ ] `TODO-COMP-004` Move repository writes, mutation branching, permission
  decisions, product validation, and side effects into controllers or
  feature-owned providers.
- [ ] `TODO-COMP-005` Keep visual sections provider-free where practical; pass
  immutable display data and typed callbacks.
- [ ] `TODO-COMP-006` Keep list/profile/event/club display data behind batched
  feature seams rather than per-tile streams or sequential reads.
- [ ] `TODO-COMP-007` Promote private widgets to reusable sections/components
  only after reuse is proven by a second surface or the design language needs a
  stable named role.
- [ ] `TODO-COMP-008` Keep one-screen layout glue private when it is not a
  design primitive.

## F. Components, Tokens, And Cross-Surface Design Data

- [x] `TODO-DS-001` Keep reusable component contracts in
  `design/components/catch.components.json`.
- [x] `TODO-DS-002` Keep portable foundation tokens in
  `design/tokens/catch.tokens.json`.
- [x] `TODO-DS-003` Keep Flutter implementation of tokens/theme under
  `lib/platform/theme`.
- [ ] `TODO-DS-004` Reconcile every Claude Design primitive against Flutter
  source, component contracts, and Widgetbook entries.
  - Foundation-token Widgetbook specimens now cover color roles, activity
    pigments/glyphs, spacing/gaps/insets, radius, elevation, opacity,
    typography roles, icon scale, aspect ratios, stroke widths, motion
    durations/curves, data-pair examples, photo-grade decisions, and the
    typographic Archivo wordmark. `check_widgetbook_contract_refs.mjs` now
    gates the eight required foundation specimen pages. Remaining foundation
    reconciliation is detailed visual/value review against the Claude
    specimens plus local-only token classification.
  - Core primitive Widgetbook entries now expose formal contract-state review
    pages for `CatchSection`, `CatchJourneySteps`, `CatchPrivacyBadge`,
    `CatchScreenBody`, and `CatchSectionStack`, closing those Claude primitive
    inventory rows from "source candidate but no standalone entry."
  - Host roster primitives now expose source-backed standalone Widgetbook
    review pages for `CatchRosterTiles`, `ParticipantRow`, and
    `ParticipantTable` under `[Core catalog]/Host operations`, closing those
    Claude primitive inventory rows from "source candidate but no standalone
    entry."
  - The Claude-vs-Widgetbook inventory now treats source-backed generated
    entries as represented rather than missing. Existing generated entries for
    `CatchCountPill`, `FeaturedEventPoster`, `OrganizerCover`, `CatchIndexRow`,
    `EventBookingDock`, `EventDetailHintList`, `EventDetailHostCard`,
    `EventDetailItineraryList`, `EventDetailMapCard`,
    `EventDetailMechanismList`, `EventDetailPhotoGrid`,
    `EventDetailTicketStubRow`, `NotificationRow`, and `CatchConfirmDialog`
    are recorded as represented; remaining unresolved rows stay in the
    no-clear-match bucket for future product/API decisions.
  - `CatchRosterTiles`, `ParticipantRow`, and `ParticipantTable` are now formal
    component contracts (`catch.roster_tiles`, `catch.roster_row`, and
    `catch.roster_table`) with matching contract-state Widgetbook previews.
  - `CatchSection`, `CatchJourneySteps`, `CatchPrivacyBadge`,
    `CatchScreenBody`, and `CatchSectionStack` are now formal component
    contracts with matching contract-state Widgetbook previews, moving the
    reusable handoff composition layer from broad catalog-only coverage into
    the cross-tool contract registry.
  - Dashboard, messaging, and event-detail sheet sections now have standalone
    source-backed Widgetbook review entries for `QuickActions`,
    `DashboardStrideSection`, `RecommendCard`, `CatchTopBar.identity`,
    `ChatEventContextHeader`, `MessageBubble`, `ChatInput`,
    `ChatListTile`, and `BookingConflictSheet`.
  - The inventory now classifies additional source-backed Claude aliases that
    are not yet standalone/formal contracts: `CheckoutSheet`, `OrganizerDock`,
    `OrganizerHero`, `OrganizerPolaroid`, `ContactRow`, `LiveConsole`, `MetricGrid`,
    `PhotoGrid`, `ProfilePhoto`, `ProfilePrompt`, and `RotationCard`.
- [ ] `TODO-DS-005` Classify every local Flutter primitive absent from Claude
  Design as keep, rename, deprecate, or needs-design-review.
- [ ] `TODO-DS-006` Replace screen-local hard-coded spacing, color, radius,
  typography, icon sizing, motion, and layout constants with tokens, theme
  roles, or registered component APIs.
- [ ] `TODO-DS-007` Decide website and social-template token export needs before
  adding Flutter-only token categories.
- [ ] `TODO-DS-008` Evaluate DTCG/W3C design-token compatibility before adding a
  parallel token pipeline or generator.
- [ ] `TODO-DS-009` Create `design/sections/catch.sections.json` only if
  repeated cross-screen section contracts outgrow screen-local sections.

## G. Feature Queues

- [ ] `TODO-P1-001` Event Detail: use the exported member reference/advisory
  diff baseline, then add final capture variants, adapter cleanup, and
  section/component hardening for booking, role, unavailable, private,
  mutation, and host-entry states.
- [ ] `TODO-P1-002` Explore Discovery: cover-header and fixture alignment pass
  complete; advisory baseline improved from 61.62% mismatch / 90.26 meanDelta
  to 41.87% mismatch / 36.74 meanDelta. The section/component registry split is
  now explicit: CoverStory, CountPill, OrganizerCover, IndexRow, and
  DateTicket/EventTicket roles map to registered component contracts, while
  OrganizerPolaroid, filter rail,
  activity grid, feed, chrome, map launcher, map route, and empty/error surfaces
  are registered screen-local sections. Deterministic captures now cover
  signed-in joined clubs, filter-empty, offline, unclaimed-host, selected-pin,
  and distance-ring map variants. Next resolve generated title/card rhythm/map
  interleave/status chrome/bottom dock divergence and add drift checks around
  filter rails and map/list parity.
- [ ] `TODO-P1-003` Dashboard Home: empty-start hero-shell pass complete;
  advisory baseline improved from 58.50% mismatch / 76.91 meanDelta to 54.05%
  mismatch / 59.13 meanDelta. Keep first-pass Widgetbook states and
  deterministic captures current, then finish remaining provider-free section
  display-data seams. Baseline full and empty Claude references now live under
  `design/reference_screens/screen.dashboard.home`, and
  `tool/design/check_reference_screens.mjs` wires advisory comparison against
  `dashboard_home` and `dashboard_home_empty_start`. Resolve the remaining
  empty-start text rendering, bottom dock/app-shell, and journey-step rhythm
  divergence, then run the populated Dashboard pass. The
  joined-clubs rail no longer performs per-club provider reads; it uses the
  batched `watchOrganizersByIdsProvider` seam.
  QuickActions now receives typed `DashboardQuickAction` callbacks from the
  composing Dashboard body instead of owning route pushes.
  EventFocusRail now receives typed `EventFocusActions` plus
  `EventFocusCheckInState` from `DashboardFullSliverBody`, so the visual rail no
  longer imports routing, Riverpod providers, external links, calendar launchers,
  check-in controllers, event-success launchers, or review sheets.
  DashboardStrideSection now receives `DashboardStrideSectionActions` and
  `DashboardStrideActionState`; `DashboardFullSliverBody` owns retry,
  permission, install, refresh, snackbar, and busy-state wiring.
- [ ] `TODO-P1-004` Event Success Companion: keep first-pass Widgetbook route
  and screen states current, add deterministic captures for every attendee
  stage, keep runtime decisions in `EventSuccessRuntime`, add a route adapter,
  and mask countdowns/animations/profile imagery.
- [ ] `TODO-P1-005` Catches hub/event deck: add Widgetbook/capture states for
  hub windows, deck queue, reactions, comment sheet, access states, mutation
  failures, clocks, and profile imagery. Catches Event route provider-wave
  derivation is now owned by `CatchesEventScreenState`.
- [ ] `TODO-P1-006` Matches list/chat: preserve first-pass Widgetbook states,
  then add captures for list filters, unread/new matches, thread
  loading/error, composer, send failures, blocked/report flows, keyboard, and
  chat-specific adapters.
- [ ] `TODO-P1-007` Profile/self and Public Profile: preserve first-pass
  Widgetbook states and deterministic route captures, then add remaining
  interaction captures for delete/reorder, inline save
  pending/error drawers, settings navigation, selected report reason, mutation
  success/failure snackbars, profile adapters, and visual parity for the
  remaining public-profile top chrome/insight-copy/profile-section deltas.
- [ ] `TODO-P1-008` Host Operations: finish registered baseline captures, add
  provider-free section previews, add adapters for Home/Clubs/Club Detail/Create
  Event/Event Manage/Inbox/Chat, and close private-access, roster, host chat,
  analytics, setup, mutation, and role-state gaps. Host Event Manage live has
  had its first compact-workspace pass; next decide the compact step-count/
  playbook semantics, then continue setup/apron/report visual passes.
- [ ] `TODO-P2-001` Start/Auth/Onboarding: add Widgetbook/capture states for
  reel variants, phone/OTP flows, validation, resend cooldown, onboarding
  steps, photo gates, upload mutations, flow-entry modes, and design refs.
- [ ] `TODO-P2-002` Calendar/Saved Events/Filters/Event Recap: Calendar,
  Saved Events, Filters, and Event Recap now have Widgetbook/capture states for
  provider waves, empty/error states, selection/draft state,
  mutation/partial lookup failures, accessibility, and theme variants.
  Continue blocked reference exports.
- [ ] `TODO-P2-003` Host create/edit club, edit event, host settings, and host
  profile: add Widgetbook/capture states for form validation, image
  replacement, unauthorized/missing resources, payouts/admin placeholders,
  profile mutation flows, and adapters.
- [ ] `TODO-P3-001` Event Location Map: preserve first-pass Widgetbook coverage,
  keep deterministic capture variants current, add exported pixel masks for
  map tiles and coordinate/no-coordinate states, introduce the route-state
  adapter, and keep map failures branded.
- [ ] `TODO-P3-002` Notifications: preserve route/row Widgetbook coverage, add
  deterministic captures for read/unread/deep-link/error states, and reuse
  shared activity fixtures.
- [ ] `TODO-P3-003` Reviews History: preserve route and `WriteReviewSheet`
  Widgetbook coverage, add deterministic captures for list/empty/error/missing
  event/edit states, and keep review sheet provider-free.
- [ ] `TODO-P3-004` Settings: preserve account/preferences/privacy/blocked and
  mutation Widgetbook coverage, add deterministic captures for destructive
  dialogs and pending/error paths, and keep safety/account actions controller
  owned.
- [ ] `TODO-P3-005` Payment History: preserve route and receipt Widgetbook
  coverage, add deterministic captures for status rows, empty/error states,
  failed-signup help, and receipt sheet variants.

## H. Drift Prevention And CI

- [x] `TODO-DRIFT-001` Validate route inventory, capture coverage, screen
  coverage, screen contracts, state matrix, Widgetbook refs, component
  contracts, and advisory hygiene in one local gate.
- [x] `TODO-DRIFT-002` Add scanners for screen-contract hygiene, Widgetbook ref
  resolution, and component-contract/Widgetbook parity.
- [x] `TODO-DRIFT-003` Fail on new product routes without screen and capture
  coverage decisions.
  - Proof: `.github/workflows/flutter-ci.yml` now runs the aggregate design
    parity gate on every pull request and push to `main`.
- [x] `TODO-DRIFT-004` Compare component contracts against generated Widgetbook
  use cases and fail once the baseline is stable.
  - Proof: `npm run design:parity:check` runs
    `tool/design/check_widgetbook_contract_refs.mjs`, which now validates
    component contract symbols, formal primitive preview contract ids,
    contract-state parity, and all referenced Widgetbook preview ids.
- [x] `TODO-DRIFT-007` Block enum-versus-runtime route path drift.
  - Proof: `tool/ui_capture/check_route_inventory.mjs` now composes nested
    `GoRoute` paths, fails if any route lacks `name: Routes.<id>.name`, records
    `runtimePath`, `runtimeParentId`, and `runtimePathExpression` in
    `tool/ui_capture/route_inventory.json`, and fails if a composed runtime
    path differs from `Routes.<id>.path`.
- [x] `TODO-DRIFT-008` Keep token drift covered by CI. The design context pack
  that shared this item is retired.
  - Proof: `.github/workflows/flutter-ci.yml` now runs
    `dart run tool/design_tokens.dart --check` after the design parity
    gate. `.github/workflows/tools-ci.yml` now triggers for `design/**`,
    `docs/design_parity/**`, `widgetbook/**`,
    root package lockfiles, and Flutter pubspec changes so the full tool
    manifest design category runs when those artifacts move.
- [ ] `TODO-DRIFT-005` Add or tighten advisory checks for contracted screens
  that import raw Material controls or add one-off visual constants.
- [ ] `TODO-DRIFT-006` Promote high-signal UI invariants into
  `packages/catch_ui_lints` after known false positives are resolved.
- [ ] `TODO-DRIFT-007` Keep broad scanners advisory until existing violations
  are fixed, intentionally allowed, or documented with stable ids.

## I. Per-Pass Cadence

- [ ] `TODO-CADENCE-001` Work one feature pair or one host surface at a time.
- [ ] `TODO-CADENCE-002` Read route source, providers/controllers, tests,
  captures, Widgetbook entries, design references, and current contract gaps
  before editing visuals.
- [ ] `TODO-CADENCE-003` Update coverage JSON, screen contracts, state matrix,
  Widgetbook/capture entries, docs, and tests together.
- [ ] `TODO-CADENCE-004` Run Widgetbook code generation whenever annotated
  Widgetbook use cases change.
- [ ] `TODO-CADENCE-005` Verify each pass with `npm run design:parity:check`,
  focused Flutter tests, focused analyzer with `--no-fatal-infos`, JSON syntax
  checks where relevant, `git diff --check`, and relevant scanners. Preserve
  the result in Git and CI.
- [ ] `TODO-CADENCE-006` Keep follow-up gaps in this tracker, not chat history.

## J. Screen-By-Screen To-Do Index

This index is generated from `docs/design_parity/state_matrix.json` and is the
practical checklist for what remains per screen. `ready` states are omitted.
`captured`, `tested`, and `implemented` states still need whatever final proof
is missing before they can be promoted to ready: design reference, pixel
comparison, interaction proof, adapter extraction, or scanner/test proof.

### P2 start_auth_onboarding

- [ ] `start.welcome` (6 state follow-ups, 1 open gap)
  - planned: None
  - implemented: None
  - tested: None
  - captured: `animated_reel`, `landed_direct`, `cta_navigation`, `reduced_motion`, `text_scale_2`, `light_dark`
  - DP-START-001: Landed direct Start Welcome reference and masks are registered, and deterministic captures cover animated reel, reduced motion, text scale, CTA, and canonical fixed-dark theme treatment. Export state-specific animated, reduced-motion, text-scale, or alternate-theme references only if strict visual comparison requires them.
  - DP-START-002: Closed by Widgetbook states for animated reel, landed direct, reduced motion, text scale, CTA, and canonical fixed-dark theme treatment.
- [ ] `auth.phone_entry` (8 state follow-ups, 0 open gaps; 1 blocked reference gap)
  - implemented: None
  - tested: `validation_error`
  - captured: `phone_entry`, `country_selector`, `otp_entry`, `validation_error`, `send_code_mutation`, `verify_otp_mutation`, `text_scale_2`, `reduced_motion`
  - DP-AUTH-001: Blocked after the 2026-07-03 phone/OTP reference refresh. Auth phone and OTP references are exported, masked, and registered. Widgetbook and deterministic captures cover OTP cooldown, validation error, country picker, send/verify/resend pending and failure, text scale, reduced motion, and light/dark. OTP compares within threshold at `12.20%` mismatch / `16.05` meanDelta, but phone entry remains above threshold at `11.09%` / `22.89` because the handoff uses top chrome/back plus a compact field row while production uses the vertically centered auth frame and current labeled field. Validation/country/mutation references remain unavailable.
  - DP-AUTH-002: Closed by `auth_phone_validation_error`, which drives invalid phone input and submit through the capture harness.
- [ ] `onboarding.flow` (13 state follow-ups, 1 open gap)
  - planned: None
  - implemented: `OnboardingFlowState`, `OnboardingTopBarState`, `OnboardingNameDobState`, `OnboardingNameDobStep`, `OnboardingGenderInterestState`, `OnboardingGenderInterestStep`, `OnboardingInstagramState`, `OnboardingInstagramStep`, `OnboardingPhotosState`, `OnboardingPhotosStep`, `OnboardingProfilePromptsState`, `OnboardingProfilePromptsStep`, `OnboardingRunningPrefsState`, `OnboardingRunningPrefsStep`
  - tested: `required_field_errors`, `name_dob_step_adapter`, `gender_interest_step_adapter`, `instagram_step_adapter`, `profile_prompts_step_adapter`, `photos_upload_failure`, `photos_step_adapter`, `running_prefs_step_adapter`, `save_profile_mutation`, `complete_mutation`
  - captured: `welcome_entry`, `name_dob_step`, `name_dob_validation_error`, `gender_interest_step`, `gender_interest_validation_error`, `instagram_step`, `instagram_filled`, `instagram_skipped`, `photos_photo_gate`, `photos_one_photo_disabled`, `photos_count_met`, `photos_upload_pending`, `photos_upload_failure`, `prompts_step`, `prompts_partial`, `prompts_complete`, `prompts_long_answer`, `running_prefs_step`, `save_profile_mutation`, `complete_mutation`, `saved_draft`, `text_scale_2`, `reduced_motion`
  - DP-ONBOARDING-001: Onboarding welcome, name/DOB, gender/interest, Instagram filled, photos count-met, prompts partial, and running-preferences references and masks are exported and registered. Widgetbook now covers route entry modes, prefilled identity, selected gender/interest, Instagram filled/skipped, photo disabled/count-met/upload-pending, prompt empty/partial/complete/long-answer, save/complete pending and error, text scale, and reduced motion states through deterministic provider overrides. Route captures now cover each primary step, saved draft, name/DOB and gender validation errors, Instagram default/filled/skipped, photo disabled/count-met/upload-pending/upload-failure states, empty/partial/complete/long-answer prompts, save-profile pending/error, complete-run-preferences pending/error, step-family text scale, and reduced motion; focused widget tests cover the identity, prompt, photo, and running-preference adapters. `OnboardingNameDobState`/`OnboardingNameDobStep` own name/DOB display state, date policy, validation, and typed callbacks; `OnboardingGenderInterestState`/`OnboardingGenderInterestStep` own selected-chip display, validation, save pending/error display, submit intent, and typed callbacks; `OnboardingInstagramState`/`OnboardingInstagramStep` own optional-handle seed text, continue/skip intents, and typed callbacks; `OnboardingProfilePromptsState`/`OnboardingProfilePromptsStep` own prompt selection, answer projection, completion gating, footer/error display, and typed callbacks; `OnboardingPhotosState`/`OnboardingPhotosStep` own photo gate/upload display state and typed photo callbacks; `OnboardingRunningPrefsState`/`OnboardingRunningPrefsStep` own pace labels, run-preference selections, mode-specific copy, completion error display, and typed submit intent. Remaining interaction-specific references are blocked/reference-only until a canonical interaction source exists.
  - DP-ONBOARDING-002: Catalogue repeated step layouts and promote only genuinely shared patterns to component contracts.
- [ ] Feature-level drift/previews
  - DP-LINT-002: Add an advisory rule/check that new shared primitives need a component contract and preview/story entry.
  - DP-PREVIEW-002: Add Start/Auth/Onboarding screen-state Widgetbook use cases after the primitive catalog review.

### P1 events_discovery_booking

- [x] `event.detail` (21 state follow-ups, no open gaps)
  - tested: `shared_snackbar_feedback`, full booking celebration route
  - captured: `loading`, `not_found`, `fatal_error`, `member_default`, `member_ticket`, `member_spotlight_dark`, `guest`, `host_app`, `booking_signed_up`, `booking_pending`, `booking_success_snackbar`, `booking_failed`, `cancel_pending`, `cancel_success_snackbar`, `cancel_failed`, `waitlist_sold_out_cancelled_past`, `offline`, `text_scale_2`, `reduced_motion`
  - DP-EVENT-DETAIL-001: Closed by `catch.event_detail_sections`, the canonical screen-contract registry entry for Event Detail compounds.
  - DP-EVENT-DETAIL-002: Closed by provider-free EventDetailSectionVisibilityState and EventDetailSocialState, alongside existing booking dock, companion, and host display states.
- [ ] Feature-level drift/previews
  - DP-EVENT-LINT-001: Add an advisory scanner for feature screens that import raw Material controls or hand-roll visual values outside registered sections/components.

### P1 explore_discovery

- [ ] `explore.discovery` (21 state contracts, 1 open evidence gap)
  - captured: `loading`, `club_source_error`, `event_feed_error`, `empty_city`, `no_search_results`, `discovery_feed`, `search_query`, `filters_active`, `anonymous_guest`, `unclaimed_host_projection`, `map_route`, `pins_ready`, `selected_pin`, `large_pan_scope`, `map_loading`, `map_error`, `offline`, `text_scale_2`, `reduced_motion`
  - implemented/previewed: `no_exact_pins`, `zero_radius_results`
  - DP-EXPLORE-001: Closed by the screen-local Explore section registry plus formal component mappings for `catch.cover_story`, `catch.count_pill`, `catch.club_cover`, `catch.index_row`, and `catch.event_card`; the unwired Cross Paths proposal is retired until a consent-safe relationship source exists, while OrganizerPolaroid remains section-local.
  - DP-EXPLORE-002: Closed by deterministic captures for signed-in joined clubs, filter-empty/no-filter results, explicit offline copy, unclaimed host projection, selected-pin map, and distance-ring map variants. Map masks and provider-wave cleanup remain tracked separately.
  - DP-EXPLORE-003: Closed by advisory comparison of `explore_search_query` against the Claude Explore discovery-feed reference; remaining visual divergence is tracked as reference/pixel follow-up, not as missing registry/capture coverage.
  - DS-EXPLORE-004: Closed by `ExploreDiscoveryScreenState`, which maps route provider-wave inputs into map launcher, body branch, and empty-state display state before `ExploreScreen` renders visual slivers.
  - DS-EXPLORE-005: Add deterministic captures for `no_exact_pins` and `zero_radius_results`, plus focused test evidence for `no_exact_pins`, `offline`, `text_scale_2`, and `reduced_motion`; the generated Explore feature contract carries these six explicit evidence exceptions until then.
- [x] `club.detail` (13 state follow-ups, 0 open gaps)
  - captured: `loading`, `not_found`, `fatal_error`, `member_default`, `visitor_not_member`, `guest_join`, `host_public_view`, `empty_schedule`, `join_leave_pending`, `join_leave_failed`, `offline`, `text_scale_2`, `reduced_motion`
  - DP-CLUB-DETAIL-001: Closed by the consumer-only dock decision; shared public Club Detail sections are reused by Host Club Detail, while provider-backed `OrganizerMembershipDock` stays screen-local and `CatchOrganizerDock` promotion is deferred until another host/member action-dock contract exists.
  - DP-CLUB-DETAIL-002: Closed by `OrganizerDetailBodyState`; route async/loading/error/not-found, initial-club fallback, next-event selection, host-message eligibility, contact actions, event-route target, review visibility, and membership dock state are derived outside visual sections.
  - DS-CLUB-DETAIL-003: Closed by provider-free `OrganizerHostSection`, `OrganizerHostRow`, `OrganizerContactSection`, and `OrganizerPhotoRail` files plus direct Widgetbook states and widget catalog entries.
  - DP-CLUB-DETAIL-003: Closed by `club_detail_loading`, `club_detail_initial_loading`, and `club_detail_empty_schedule` captures plus the existing exported/masked Club Detail member reference.
  - DP-CLUB-DETAIL-004: Closed by advisory comparison of `club_detail_member` against the Claude Club Detail V2 member-default reference; divergence is concentrated in hero media/chrome, next-event/stat-strip treatment, and below-fold schedule/dock composition.
- [x] `explore.map` (6 state follow-ups, 0 open gaps)
  - captured: `pins_ready`, `selected_pin`, `large_pan_scope`, `no_exact_pins`, `map_loading`, `map_error`
  - DP-EXPLORE-MAP-002: Closed by Widgetbook states for route, collapsed summary, selected event lead, nearby rail, loading/error, and text-scale map-sheet lead coverage.
- [x] Feature-level drift/previews
  - DP-EXPLORE-LINT-001: Closed by `tool/design/check_screen_coverage.mjs`, which blocks contracted routes from remaining uncontracted in screen coverage.
  - DP-EXPLORE-PREVIEW-001: Closed by existing Widgetbook coverage for Explore screen/chrome, date/filter rail and sheet, CoverStory, mixed feed cards, veiled attendee proof, map launcher, empty/error states, activity index, and map route states.
  - Product decisions resolved 2026-07-19: the cover is ranked independently while the feed stays chronological; Cross Paths is retired; attendee proof remains veiled and read-free; map/sheet distance shares one state. Future identified people, mutuals, follow-graph semantics, saved/for-you, and editorial lanes require their own product/data contract.

### P1 dashboard_home

- [ ] `dashboard.home` (19 registered states, 1 open evidence gap)
  - tested: `self_check_in_mutation`, `after_event_swipe_review`
  - captured: `loading`, `profile_error`, `memberships_error`, `booked_events_error`, `empty_start`, `full_dashboard`, `event_focus_upcoming`, `self_check_in_mutation`, `after_event_swipe_review`, `notifications_unread`, `joined_clubs_rail`, `weekly_activity_permission`, `recommendations_ready`, `recommendations_loading`, `recommendations_error`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-DASHBOARD-004: Closed by Dashboard full/empty reference PNG export and advisory comparison tooling.
  - DS-DASHBOARD-005: Add focused state-level tests for `profile_error`, `memberships_error`, `offline`, `text_scale_2`, `reduced_motion`, and `light_dark`; `feature.dashboard_home` carries these six explicit evidence exceptions while compiling all 19 registered states and 12 Dashboard-owned actions.

### P1 event_success_companion

- [ ] `event_success.companion` (26 registered states, 1 open action gap, 1 blocked reference gap)
  - planned: None
  - tested: `auto_launch`
  - captured: `route_loading`, `event_not_found`, `sign_in_required`, `no_booking`, `plan_missing`, `data_load_error`, `default_live_guide`, `pre_arrival_planning`, `self_check_in`, `first_hello_start`, `first_hello_assigned`, `compatibility_questionnaire`, `live_step_context`, `conversation_cues`, `micro_pod_assignment`, `rotation_schedule`, `live_reveal_countdown`, `live_reveal_unlocked`, `wingman_request`, `post_event_afterglow_feedback`, `opt_out_assignments`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-EVENT-SUCCESS-COMPANION-002: Closed; companion route loading/error/access/offline states, runtime moments, action pending states, text scale, reduced motion, and paired light/dark captures are registered and linked to first-pass Widgetbook previews. Mutation failure/snackbar variants should be added only if product copy diverges from the shared mutation listener behavior.
  - DP-EVENT-SUCCESS-COMPANION-003: Closed for provider-free section APIs and `EventSuccessCompanionScreenState` ownership. First Hello, self-check-in, micro-pod, rotation, wingman, feedback, and questionnaire sections receive typed callbacks from `EventSuccessCompanionScreen`; the missing production route binding for questionnaire persistence is tracked separately by DP-EVENT-SUCCESS-COMPANION-005.
  - DP-EVENT-SUCCESS-COMPANION-004: Blocked; default live-guide companion reference and masks are registered, but no local canonical exports exist for runtime-stage, reveal, wingman, afterglow, feedback, offline/error, accessibility, or theme variants.
  - DS-EVENT-SUCCESS-COMPANION-005: Wire `EventSuccessCompanionRouteScreen` to `EventSuccessController.saveCompatibilityResponse` through `EventSuccessController.compatibilityResponseMutation`, add a route-level persistence test, and then remove `FEATURE-ACTION-WIRING-001` from `feature.event_success`. Add focused state-level tests for the nine registered test exceptions separately; auto-launch correctly remains launcher-policy evidence without a synthetic preview or capture.

### P1 catches

- [ ] `catches.event` (19 state follow-ups, 2 open gaps)
  - tested: None
  - captured: `queue_loading`, `queue_error`, `active_profile`, `empty_queue`, `event_missing`, `sign_in_required`, `event_in_progress`, `did_not_attend`, `window_closed`, `pass_mutation`, `reaction_mutation`, `duplicate_pending`, `write_failure`, `cached_offline`, `comment_sheet_empty_filled`, `offline`, `filters_action`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-CATCHES-EVENT-002: Blocked on keyboard-open capture automation and design-reference pixel comparison input. Pass/reaction pending, duplicate-pending disabled controls, write-failure snackbar feedback, cached-offline data preservation, comment-sheet regions, queue loading/error/offline, empty, missing event, signed-out, in-progress, did-not-attend, closed-window, text-scale, reduced-motion, and paired light/dark captures are already registered.
  - DP-CATCHES-EVENT-003: Closed by `CatchesEventScreenState`, which maps queue/event/user/participation provider waves through provider-free `CatchAsyncState` before visual deck and empty/access sections receive display data plus typed callbacks.
  - DP-CATCHES-EVENT-004: Blocked on external reference exports for dedicated mutation, keyboard/comment sheet, empty/offline, accessibility, and theme variants; first active-profile deck reference and masks are registered.

### P1 matches_chat

- [x] `matches.list` (15 state follow-ups, 0 open gaps)
  - implemented: `chats_list_screen_state`, `chats_list_celebration_controller`, `chats_search_header_controller`, `visible_thread_derivation`, `search_affordance_state`, `display_retry_intent`
  - tested: `chats_list_celebration_controller`, `chats_search_header_controller`
  - captured: `uid_or_matches_loading`, `matches_error`, `populated_threads`, `new_matches`, `search_open`, `search_empty`, `no_matches_empty`, `duplicate_collapsed`, `unread_state`, `host_inbox_filter`, `match_celebration`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-MATCHES-LIST-002: Closed. List captures and the canonical Messaging inbox reference cover the populated baseline, and a fresh advisory comparison against `matches_list_context` is within threshold at 6.84% mismatch / 8.21 meanDelta, maxDelta 227, masked 77996. HostInboxScreenState, ChatsListDisplayState, ChatsListCelebrationController, and ChatsSearchHeaderController own the code seams. Additional search/filter/loading/empty reference variants are reference-only unless design exports distinct panels or the interaction state becomes external.
  - DP-MATCHES-LIST-003: Closed. `HostInboxScreenState` and `ChatsListDisplayState` own host filter projection, unread count, search affordance, loading/error/content/empty mapping, unread filtering, visible row derivation, empty-state selection, and display-error retry intents before `ChatsList` renders sections. `ChatsListCelebrationController` owns new-match celebration target selection and dialog execution. `ChatsSearchHeaderController` owns search-open close policy, and `ChatsListScreen` passes `chatSearchQueryProvider` value/callback into the header. Reopen only if future product policy adds a new search, filter, or celebration interaction seam.
  - DP-MATCHES-LIST-004: Closed. No `ChatNewMatchesRail` symbol exists in `lib`, `test`, or Widgetbook; new matches render through `ChatConversationsList` with row-level `CatchPersonRow` fresh treatment. Reopen only if product designs a dedicated new-match rail or section.
- [x] `matches.chat` (23 state follow-ups, 0 open gaps)
  - implemented: `chat_route_state`, `host_chat_screen_state`, `chat_thread_lookup_state`, `read_marker_controller`, `chat_scroll_coordinator`, `chat_thread_action_controller`, `chat_retry_controller`, `safety_report_block`
  - tested: `send_message_mutation`, `send_failure`, `send_image_mutation`, `image_send_failure_cleanup`, `read_receipt_reset`, `report_success_feedback`, `report_failure_feedback`, `block_confirmation`, `keyboard_open_multiline`, `chat_route_state`, `chat_thread_lookup_state`, `chat_thread_action_controller`, `chat_retry_controller`
  - captured: `messages_loading`, `messages_error`, `populated_thread`, `empty_thread`, `event_context_ready`, `event_context_fallback`, `chat_unavailable`, `blocked_chat`, `top_bar_actions`, `share_card`, `suvbot_controls`, `suvbot_action_mutation`, `keyboard_composer`, `keyboard_open_multiline`, `send_failure_snackbar`, `report_failure_snackbar`, `block_confirmation`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-MATCHES-CHAT-002: Closed. Deterministic captures cover loading, errors, empty, missing/blocked chat, send/report mutation failure snackbars, block confirmation, share card, Suvbot, offline, keyboard-open multiline, text scale, reduced motion, and light/dark. A fresh design-phone capture now compares within threshold against the registered Messaging thread reference after fixture and reference-safe-area alignment: mismatch 7.22%, meanDelta 8.50, maxDelta 240, masked 199692.
  - DP-MATCHES-CHAT-003: Closed by shared `ChatScreen` adapters. `ChatRouteState` performs uid, match, messages, public-profile, event, Suvbot action, mutation-pending, and share-controller provider watches before rendering. `HostChatScreenState` owns consumer match identity, action availability, retry intents, safety target copy, message peer name, and disabled composer copy. `ChatThreadLookupState` owns lookup keys; `ChatReadMarkerController` executes read-marker side effects; `ChatScrollCoordinator` owns auto-scroll; `ChatThreadActionController` executes profile/share/report/block typed actions; and `ChatRetryController` executes typed retry invalidation. Reopen only if consumer Match Chat splits from the shared chat adapter.
  - DP-MATCHES-CHAT-004: Closed. Populated Messaging thread and `Messaging · New match (empty)` references and masks are exported, registered, and within advisory threshold: populated thread mismatch 7.22%, meanDelta 8.50, maxDelta 240, masked 199692; new-match empty mismatch 5.01%, meanDelta 5.46, maxDelta 240, masked 46812. Keyboard-open, share-card, report/block dialog, and dynamic message-time references remain reference-only until canonical source panels exist.

### P1 profiles

- [ ] `profile.self` (16 state follow-ups, 0 open gaps; 1 blocked reference gap and 1 blocked owner/product/schema gap)
  - tested: `photo_grid`, `inline_text_edit`, `inline_choice_edit`, `inline_save_pending`, `inline_save_error`, `settings_navigation`
  - captured: `profile_loading`, `profile_error`, `profile_unavailable`, `edit_tab_default`, `photo_upload_mutation`, `inline_save_pending`, `inline_save_error`, `preview_tab_default`, `settings_action`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-PROFILE-SELF-002: Blocked after the 2026-07-03 reference refresh and fixture alignment. Deterministic captures are registered for loading, error, offline, unavailable, edit tab, preview tab, upload pending, upload failure, inline save pending/error drawers, text scale, reduced motion, and paired light/dark. Settings navigation proof is covered by `profile_widgets_test`. Fresh edit/preview handoff exports still model a compact two-tab header and older edit field/photo-grid layout while production `ProfileScreen` intentionally renders Edit, Preview, and Insights plus current photo/editor rows. The refreshed advisory compare remains above threshold: preview 26.84% mismatch / 46.15 meanDelta, edit 13.67% mismatch / 20.03 meanDelta.
  - DP-PROFILE-SELF-003: Closed by SelfProfileScreenState owning profile provider waves, preview projection, upload/save mutation modes, and retry intent; SelfProfileEditTabState owning photo-grid, prompt-slot, basics/about/running/lifestyle row descriptors; SelfProfilePhotoActionController owning photo editor/delete/reorder intents; and SelfProfileInlineEditPatchFactory owning inline edit patch creation.
  - DP-PROFILE-SELF-004: Closed by exported self-profile edit and preview references plus masks in `design/reference_screens/screen.profile.self`.
  - DP-PROFILE-SELF-005: Closed for the implementation-safe Field primitive tranche: exact footer/header metrics, caret and typography values, spinner/status/error anatomy, underline/disclosure motion, animated saving states, repeat timing, keyboard activation, focus-visible rings, dedicated content-row 2/3-line clamps, and unchanged legacy value-row 1/2-line defaults are implemented and tested. Existing semantic colors already match, so no palette values changed.
  - DP-PROFILE-SELF-006: Blocked on explicit owner/product/schema approval for direct-input stable-label policy; single-choice persistence, clearability, deselection, and save behavior; DOB helper/mono formatting; pace visibility; lifestyle footer; enum-backed workout control; three prompts/300 characters versus six/140; and profile icon/row ordering.
- [x] `profile.public` (14 state follow-ups, 0 open gaps)
  - tested: `report_mutation`, `shared_snackbar_feedback`
  - captured: `loading_without_initial_profile`, `loading_with_initial_profile`, `load_error`, `profile_unavailable`, `public_profile`, `viewer_context`, `report_sheet`, `block_confirmation`, `block_mutation`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-PROFILE-PUBLIC-002: Closed. Deterministic captures are now registered for loading, initial-profile fallback, error, offline, unavailable, own profile, shared-event context, pending overlay, report sheet, block confirmation, text scale, reduced motion, and paired light/dark. Selected report reason, report success snackbar, and block failure snackbar now have focused widget-test proof. The refreshed public-profile reference now compares within advisory threshold against `public_profile_member` at 13.40% mismatch / 17.15 meanDelta, maxDelta 240, masked 221520.
  - DP-PROFILE-PUBLIC-003: Closed by PublicProfileScreenState, which owns target-profile branches, initial-profile fallback, viewer context projection, safety action availability, retry intent, and report/block mutation mode.
  - DP-PROFILE-PUBLIC-004: Closed by exported public-profile reference plus masks in `design/reference_screens/screen.profile.public`.

### P1 host_operations

- [ ] `host.home` (22 registered states, 4 open gaps)
  - planned: `single_owned_only_if_distinct`, `callback_controller_seams`, `reference_variants`
  - implemented: `create_event_action`, `manage_event_navigation`, `host_home_section_widgetbook_previews`, `today_compact_wide_visual_alignment`, `today_seven_day_horizon`, `today_creation_ownership_removal`
  - tested: `create_event_action`, `manage_event_navigation`, `today_compact_wide_visual_alignment`, `today_seven_day_horizon`, `today_creation_ownership_removal`
  - captured: `uid_missing`, `host_clubs_loading`, `host_clubs_error`, `host_clubs_offline`, `no_host_clubs`, `one_owned_club`, `multiple_clubs_switcher`, `club_events_loading`, `club_events_error`, `club_events_offline`, `cohost_role`, `empty_events`, `upcoming_events`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-HOST-HOME-002: Blocked/reference-only until approved separate Today and Events state exports or additional pixel-reference sources exist. Captured signed-out/access, organizer loading/error/offline, no organizers, populated Today at compact/wide widths, owner/co-host switching, long organizer-name pressure, co-host empty events, Events loading/error/offline, text-scale, reduced-motion, and light/dark.
  - DP-HOST-HOME-003: Closed. `HostTodayScreen`, `HostTodayRouteState`, `HostTodayState`, `HostTodayFeedController`, and `HostAttentionPolicy` own the independent Today route, live-first spotlight, exhaustive attention work, and seven-day projection. `HostEventsScreen`, `HostEventsRouteState`, `HostEventsWorkspaceState`, and `HostEventsTimelineController` own the independent Events route and durable inventory under `lib/hosts/events/presentation/`.
  - DP-HOST-HOME-004: Today and Events are separate canonical destinations. Historical sources remain ingredient evidence only; do not use either to collapse Today back into Events. Source-backed backend facts now cover the supported attention catalog, while unsupported kinds remain named coverage debt. Loading, quiet, role/cohost, offline/error, text-scale, reduced-motion, light/dark, and additional lifecycle variants still need canonical source exports before strict comparison.
  - DS-HOST-HOME-005: `feature.host_home` compiles all 22 states and 14 Today- or Events-owned actions. Add focused state tests for the 22 registered evidence exceptions, standalone captures for create/manage navigation, and one dedicated nested hosted-event offline Widgetbook scenario to retire its evidence exceptions.
- [ ] `host.clubs` (49 registered states, 2 open gaps)
  - planned: `blocked_reference_variants`
  - implemented: `host_clubs_organizer_overview_default`, `host_clubs_compact_reference_alignment`, `host_clubs_reference_mask_calibration`, `inline_choice_edit`, `age_range_edit`, `host_team_add_sheet_widgetbook`, `host_team_confirm_dialog_widgetbook`, `host_club_insights_state`, `host_clubs_preview_route_callback`, `pixel_comparison_advisory_baseline`
  - tested: `cohost_club_edit_limited`, `multiple_clubs_switcher`, `inline_text_edit`, `payouts_not_setup`, `host_team_add_sheet`, `host_team_confirm_dialogs`, `host_team_controller_mutations`, `host_club_insights_state`, `preview_route_callback`, `preview_tab`
  - captured: `uid_missing`, `organizer_overview`, `host_clubs_loading`, `host_clubs_error`, `host_clubs_offline`, `no_host_clubs`, `cohost_club_edit_limited`, `inline_text_edit`, `update_club_pending`, `update_club_error`, `payouts_ready_or_restricted`, `payout_mutation`, `host_team`, `host_team_mutation`, `insights_loading`, `insights_report`, `insights_error`, `preview_tab`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DS-HOST-CLUBS-001: Closed. Signed-out, default organizer overview, co-host, empty, loading, generic/offline load errors, analytics loading/error/offline/report, payout provider loading/ready/restricted/error/offline, inline editor pending/error/offline, payout action pending/error/offline, host-team mutation pending/error/offline, text-scale, reduced-motion, light/dark, and preview tab variants are captured. Additional pixel variants depend on future Claude exports because the local bundle exposes only the organizer baseline for this screen.
  - DS-HOST-CLUBS-002: Closed. `HostOrganizersScreenState` owns selected club, selected tab, owner/co-host role capability, and deterministic initial expanded editor state. `_HostOrganizersScaffold` defaults to the Organizer overview and routes its public preview, payout, settings, edit, and insights actions into existing typed callbacks/tabs. Inline edit and payout actions now have controller mutations; `HostTeamAddHostSheet` is public and Widgetbook covers ready, pending, error, and offline add-host states; `HostTeamHostActionDialog` is public and Widgetbook covers remove-host and transfer-ownership confirmations; `HostOrganizerInsightsState` owns analytics query derivation, custom date bounds, event scope, and retry target identity.
  - DS-HOST-CLUBS-004: Reopened for the standalone-host workspace. Private-to-public publication coaching and cross-event CRM readiness move the deterministic 2026-08-10 `host_clubs_management` capture to mismatch 20.09%, mean delta 25.94, max delta 240, masked 260416. `HOST-STANDALONE-ORGANIZER-WORKSPACE-001` bounds that intentional expansion without changing canonical thresholds; close it after a reviewed standalone-host reference replaces or reconciles the older organizer composition. Extra cohost, empty, loading/error/offline, analytics, payout, inline editor, team mutation, text-scale, reduced-motion, and light/dark comparisons depend on future design exports.
  - DS-HOST-CLUBS-005: `feature.host_organizers` compiles all 49 states and 29 actions across one coordinated organizer workspace. Add focused tests for 31 registered states, deterministic captures for 14 preview-only states, and one dedicated `host_team_offline` Widgetbook scenario to retire its 46 evidence exceptions.
- [x] `host.club.detail` (19 state follow-ups, 0 open gaps)
  - watch: `distinct_hosted_schedule_rows_if_needed`, `host_control_reference_variants_if_design_changes`, `pixel_comparison`, `retry_intent_typing_optional`
  - implemented: `HostOrganizerDetailScreenState`, `state_adapter_branching`, `retry_intent`, `reviews_authenticated`, `contact_links`, `share_action`, `host_controls_public_preview_policy`, `public_view_reference_alignment`
  - tested: `event_navigation_host_route`, `loading_with_initial_club`, `load_error`, `club_not_found`, `host_public_view`, `host_schedule_hosted`, `membership_dock_suppressed`, `share_action`, `state_adapter_branching`
  - captured: `host_public_view`, `loading_without_initial_club`, `loading_with_initial_club`, `load_error`, `offline`, `club_not_found`, `host_not_on_team`, `host_signed_out`, `host_schedule_empty`, `host_schedule_hosted`, `host_controls_missing`, `reviews_authenticated`, `contact_links`, `share_action`, `membership_dock_suppressed`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DS-HOST-CLUB-DETAIL-001: Closed for the current public-preview contract. Flutter captures cover public preview, initial fallback loading, full loading, generic error, offline, not-found, non-host-team preview, signed-out preview, empty schedule, text-scale, reduced-motion, and light/dark; the registered public-view reference comparison is within threshold. Reopen only if design adds distinct hosted schedule/share/contact/review or host-control variants.
  - DS-HOST-CLUB-DETAIL-002: Closed. `HostOrganizerDetailScreenState` owns branch selection, initial data fallback, host ownership/public-preview mode, dock suppression, and load-error retry intent typing. `HostOrganizerDetailError` carries `HostOrganizerDetailRetryIntent.reloadDetail`, and `OrganizerDetailScreen` executes that typed retry through `_retryHostOrganizerDetail` before invalidating `organizerDetailViewModelProvider`. The screen also wires typed callbacks for schedule routing, host profile/message actions, contact launches, and share side effects.
  - DS-HOST-CLUB-DETAIL-003: Closed for the current contract: Host Club Detail remains public-preview-only, while Edit club, Add event, payouts, and host-team controls remain in Host Home and Host Clubs. Reopen only if the design contract adds a dedicated host-controls variant.
  - DS-HOST-CLUB-DETAIL-004: Closed. Host Club Detail owner/public-view reference and masks are exported and registered; Flutter state captures now exist for the main route variants. Public-view visual parity improved from 28.94% / 44.44 to 17.87% / 19.52 after fixture, hero, stats, section-order, capture-font, asset-prewarm, floating hero chrome, stat value fit, regular-weight About copy, and split generic-tag wrap work, then the hero-edge mask calibration moved the registered comparison within threshold at 15.82% mismatch / 15.22 meanDelta, maxDelta 240, masked 180280. Add host-control references only if the design contract moves operations onto this route.
- [ ] `host.event.create` (31 registered states, 1 evidence gap, 2 reference-blocked gaps)
  - planned: none
  - implemented: `HostCreateEventRouteState`, `CreateEventWizardStep`, `CreateEventWizardValidationPlan`, `CreateEventWizardState`, `CreateEventSuccessNavigationEffect`, `CreateEventDraftSnapshot`, `CreateEventDraftActionState`, `CreateEventDraftRestoreState`, `CreateEventDraftSideEffectState`, `CreateEventScheduleState`, `CreateEventPhotoDraftState`, `CreateEventPolicyState`, `wizard_step_metadata`, `wizard_validation_plan`, `wizard_header_footer_state`, `wizard_mutation_error_state`, `wizard_success_state`, `wizard_action_intents`, `success_navigation_effect`, `draft_snapshot_serialization`, `draft_action_state`, `draft_restore_state`, `draft_side_effect_state`, `schedule_validation_state`, `duration_bounds_state`, `photo_draft_state`, `policy_state`, `unauthorized_host`, `same_day_time_error`, `invite_only_policy`, `dynamic_pricing_policy`
  - tested: `route_state_adapter`, `wizard_step_metadata`, `wizard_validation_plan`, `wizard_state_adapter`, `wizard_action_intents`, `success_navigation_effect`, `route_authorization`, `draft_snapshot_serialization`, `draft_action_state`, `draft_restore_state`, `draft_restore_stale_values`, `draft_side_effect_state`, `draft_save_clock_state`, `schedule_validation_state`, `duration_bounds_state`, `photo_draft_state`, `policy_state`, `policy_age_validation`, `invite_only_policy`, `cohort_caps_policy`, `dynamic_pricing_policy`, `draft_delete`, `unsaved_changes`
  - captured: `initial_club_extra`, `club_fetch_loading`, `club_fetch_error`, `club_not_found`, `unauthorized_host`, `basics_default`, `basics_validation`, `event_photos`, `custom_activity`, `where_step_default`, `location_picker_selected`, `when_step_default`, `same_day_time_error`, `policy_default`, `policy_age_validation`, `invite_only_policy`, `cohort_caps_policy`, `dynamic_pricing_policy`, `event_success_step`, `submit_pending`, `submit_error`, `success_manage`, `draft_picker_restore`, `draft_delete`, `unsaved_changes`, `draft_save_update`, `draft_save_offline`, `photo_upload_offline`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route initial-club-extra/loading/error/offline/missing/unauthorized, validation, custom activity, picked event photos, draft picker/restored, save-draft pending/error/offline, submit pending/error/offline, photo-upload offline, every wizard step, text scale, reduced motion, dark theme, and success screen.
  - DS-HOST-EVENT-CREATE-001: Blocked on missing exported draft/validation/submit references and masks. Map-picker offline search is captured; remaining deterministic capture variants are reference-specific.
  - DS-HOST-EVENT-CREATE-002: Closed. Route, wizard-step, validation-plan, wizard display/action, success-navigation effect, draft serialization/action/restore/side-effect, schedule, location, photo, and policy state are provider-free and covered by state/widget tests. `CreateEventScreen` only executes local form-controller assignment, page movement, platform picker calls, controller mutation triggers, and Navigator/context side effects.
  - DS-HOST-EVENT-CREATE-004: Blocked on missing exported draft/validation/submit references and masks. Existing Host Create Event basics, location, schedule, policy, Event Success guide, and success/manage references are exported, masked, manifest-registered, compared, and within advisory thresholds.
  - DS-HOST-EVENT-CREATE-005: Closed. `HostCreateEventRouteState` now watches signed-in uid state and renders a host-access error before `CreateEventScreen` for signed-out or non-host-team users, with state and widget coverage.
  - DS-HOST-EVENT-CREATE-006: `feature.host_event_create` compiles all 31 states and 33 meaningful actions. Add focused tests for the nine registered test exceptions and one dedicated location-picker offline Widgetbook scenario to retire its ten evidence exceptions.
- [ ] `host.event.manage` (58 state contracts, 4 open or blocked gaps)
  - planned: None
  - implemented: `HostEventManageScreenState`, `HostEventManageActionEffect`, `HostEventActionDisplayState`, `HostPrivateLinkActionState`, `HostPrivateAccessDisplayState`, `HostInviteLinksListDisplayState`, `HostInviteLinkRowDisplayState`, `HostRosterDisplayState`, `HostSetupRosterRowDisplayState`, `HostLiveRosterRowDisplayState`, `HostReportRosterRowDisplayState`, `HostParticipantsMutationDisplayState`, `HostParticipantLifecycleActions`, `HostReportSummaryDisplayState`, `HostParticipantProfilesLookupState`, `EventSuccessHostSectionState`, `selected_section_state`, `host_manage_chrome_state`, `host_manage_action_effect`, `host_actions_private_link_callback`, `host_action_display_state`, `private_link_action_state`, `private_access_card_state`, `invite_links_list_state`, `invite_link_row_state`, `roster_filter_display_state`, `roster_row_display_state`, `host_participants_mutation_display_state`, `host_participant_lifecycle_actions`, `host_report_summary_state`, `host_participant_profiles_lookup_state`, `event_success_provider_wave_state`, `shared_snackbar_feedback`, `shared_form_dialog`
  - tested: `host_manage_screen_state`, `host_manage_action_effect`, `host_action_display_state`, `private_link_action_state`, `private_access_card_state`, `invite_links_list_state`, `invite_link_row_state`, `roster_filter_display_state`, `roster_row_display_state`, `host_participants_mutation_display_state`, `host_report_summary_state`, `host_participant_profiles_lookup_state`, `event_success_host_section_state`, `host_manage_widget_flows`, `host_event_manage_controller`
  - captured: `uid_loading`, `club_fetch_loading`, `event_stream_loading`, `initial_event_extra`, `section_picker`, `route_error`, `event_or_club_not_found`, `unauthorized_host`, `setup_workspace`, `attendance_setup_roster`, `attendance_loading`, `attendance_error`, `attendance_empty`, `attendee_profiles_loading`, `attendee_profiles_error`, `filtered_roster_empty`, `attendance_mutation_pending`, `attendance_mutation_error`, `full_event_waitlist_apron`, `live_workspace`, `live_event_success_unavailable`, `live_event_success_plan_loading`, `live_event_success_plan_error`, `live_event_success_plan_offline`, `live_event_success_wingman_requests`, `live_event_success_micro_pods_assigned`, `live_event_success_guided_rotations_assigned`, `live_event_success_check_in_qr`, `live_event_success_conversation_cues`, `live_event_success_reveal_round_revealed`, `live_event_success_host_override_edited`, `live_event_success_ready`, `report_workspace`, `report_export`, `report_scorecard`, `report_scorecard_loading`, `report_scorecard_error`, `report_scorecard_offline`, `private_access_loading`, `private_access_error`, `private_access_offline`, `private_access_missing_code`, `invite_private_link`, `invite_links_loading`, `invite_links_error`, `invite_links_offline`, `invite_links_empty`, `invite_links_disabled`, `invite_links_long_label_source`, `invite_link_create_disable`, `edit_event_action`, `cancel_event_pending_error`, `delete_unused_event`, `cancelled_event`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route loading/error/offline/missing, initial event fallback, unauthorized user, setup/private access, section picker selected states, live, report, attendance loading/error/empty, attendee profile loading/error, filtered roster empty, attendance mutation pending/error, full/waitlist apron, private-access loading/error/offline/missing-code, private-link share pending/error, invite-link loading/error/offline/empty, invite-link mutation pending/error, edit/cancel/delete host actions, report export pending/error, live unavailable, live plan loading/error/offline, saved live guide, wingman requests, micro-pods, guided rotations, check-in QR, conversation cues, revealed round, host-edited override, report scorecard loading/error/ready/offline, cancelled, text scale, reduced motion, and dark theme.
  - DP-HOST-EVENT-MANAGE-001: Add remaining deterministic Host Event Manage captures only for reference-specific variants, compact step-count semantics if product keeps them, and modal Event Success override editor sheets if that surface becomes contractual. Private-access missing-code, invite-link disabled-row, invite-link long-label/source, Event Success plan/scorecard offline, wingman request, micro-pod assignment, guided-rotation assignment, check-in QR, conversation cue, revealed-round, host-edited override, and route loading/access/error states are already captured under the ARCH-SCREEN-001C host workspace route shell or direct Host Manage Event Success section captures.
  - DP-HOST-EVENT-MANAGE-002: Closed. HostEventManageScreenState now owns selected section, section labels, title copy, collapsed-header semantics, and section-change transitions; HostEventManageActionEffect owns edit/cancel/delete action destinations, edit route parameters, and event payload; HostEventActionDisplayState owns known-activity policy, cancel/delete pending copy, delete visibility, cancelled-event action rows, and shared host roster count helpers; HostPrivateLinkActionState owns share-private-link invite code/link derivation, loading/error/count detail copy, and share-enabled policy; HostPrivateAccessDisplayState owns private-access card missing-code/listed-copy policy and code/link row visibility; HostInviteLinksListDisplayState owns named invite-link mutation mode, create-loading flag, disabled-action policy, and empty copy; HostInviteLinkRowDisplayState owns row URL derivation, stat copy, disabled badge visibility, disable-action visibility, and actions-disabled policy; HostRosterDisplayState owns setup/live/report roster filter specs, active-filter fallback, searched row ids, empty-state copy, and waitlist bulk-offer eligibility; HostSetupRosterRowDisplayState, HostLiveRosterRowDisplayState, and HostReportRosterRowDisplayState own row meta, signal, tone, payment copy, and row action policy flags; HostParticipantsMutationDisplayState owns attendance, approval/decline, waitlist-offer, ops-export, and revenue-export pending/error display policy; HostParticipantLifecycleActions owns profile, approval, decline, attendance, waitlist-offer, ops-export, and revenue-export callback injection for the provider-free roster board; HostReportSummaryDisplayState owns gross estimate, checked/no-show/waitlist counts, and report summary copy; HostParticipantProfilesLookupState owns attendee-profile lookup loading/error/ready branch policy and retry target identity; EventSuccessHostSectionState owns Event Success plan/roster/assignment/preference/wingman/scorecard provider-wave status and retry intents before Host Manage composes the provider-free Event Success panel. Route loading/access/error states stay in HostEventManageRouteScreen under ARCH-SCREEN-001C.
  - DP-HOST-EVENT-MANAGE-004: Private invite-link create/copy/disable/share effects and cancel/delete writes plus invalidation now route through controller seams with mutation capture coverage. `HostEventManageActionEffect` owns edit/cancel/delete destinations and edit route params while `HostEventManageScreen` executes Navigator/dialog/controller side effects, shared Catch dialog/snackbar feedback, action mutation execution, and private-link share execution. `HostEventActionsSection` receives `HostPrivateLinkActionState` and a typed share callback instead of reading private-link providers directly. `HostParticipationLifecycleBoard` receives `HostParticipantLifecycleActions` instead of reading Riverpod mutations/routes directly, while `HostEventParticipantsList` remains the provider-bound adapter for profile navigation, approval/decline, attendance, waitlist offers, and report exports. Remaining side-effect work is Event Success callbacks if that surface keeps growing.
  - DP-HOST-EVENT-MANAGE-005: Blocked/reference-only until canonical edge-state exports exist. Setup/private-access, full/waitlist apron, attendance roster, live console, post-event report, private-access missing-code, invite-link disabled-row, and invite-link long-label/source states have deterministic captures; base references are exported, masked, manifest-registered, and compared within advisory thresholds. Remaining work is masks for additional dynamic host data once canonical exports exist.
  - DS-HOST-EVENT-MANAGE-006: Add focused tests for the 33 route, roster, private-access, invite-link, action-row, offline, accessibility, and theme states currently backed by deterministic captures and the restored `HostEventManageRouteScreen/Route and section states` Widgetbook use case; the generated Host Manage feature contract carries these exceptions until proof lands.
- [ ] `host.inbox` / Messaging (32 registered states, live production proof, and blocked reference variants)
  - implemented: global selected-organizer scope, first-class Inbox/Campaigns workspaces, explicit Event/General scope, compact shared-menu event selector, Booked/Prospective personal inquiry segments, roster-backed broadcast audience counts, authorized event composer/callable, WhatsApp sender setup, campaign lifecycle, deterministic relative row times, and route-owned navigation/mutation seams.
  - tested: scope selection, audience switching, roster-without-threads behavior, General isolation, composer lifecycle/idempotency, view-model classification, backend authz/moderation/rate-limit/idempotency/delivery policy, repository contracts, and shared compact SegPill behavior.
  - captured: populated Booked, Campaigns with connected sender, Prospective, General, roster-without-threads, composer, composer pending, composer error, plus existing loading/error/offline/search/text-scale/reduced-motion/light-dark states.
  - DP-HOST-INBOX-001: Closed. The canonical full-shell populated comparison passes both unchanged thresholds at `7.34%` mismatch / `7.62` meanDelta after compact title, event-scope menu, mono SegPill, deterministic fixture copy, and relative timestamp alignment.
  - DP-HOST-INBOX-002: Closed. `HostInboxViewModel` owns Event/General scope, Booked/Prospective classification, roster/thread count separation, search, lifecycle availability, and row status labels; `HostInboxScreen` owns providers, routing, and broadcast presentation.
  - DP-HOST-INBOX-003: Closed. Widgetbook covers the production route, provider-free Inbox scope/audience/workspace/composer components, and the Campaigns sender workspace; deterministic full-shell captures cover both primary workspaces.
  - DP-HOST-INBOX-004: In progress only for external release proof. Keep production sending disabled until the target-specific live callable/IAM preflight succeeds, then record Activity durability, preference-gated push, and no match/message fan-out. Long-count and keyboard reference variants remain blocked until canonical exports or product-backed fixtures exist.
  - DP-HOST-INBOX-005: `feature.host_inbox` compiles all 32 states and 13 actions. Add the remaining sender/campaign lifecycle captures and focused tests while preserving the existing Inbox interaction evidence; 25 evidence obligations remain explicit.
- [ ] `host.chat` (29 registered states, 1 evidence gap, 2 blocked gaps)
  - blocked: provider-specific profile/club/event offline copy policy and dedicated pixel-reference variants
  - implemented: `uid_loading`, `chat_route_state`, `typed_top_bar_actions`, `top_bar_action_intents`, `retry_intents`, `route_error_retry`, `shared_snackbar_feedback`, `read_marker_state`, `read_marker_controller`, `chat_scroll_coordinator`, `chat_thread_action_controller`, `chat_retry_controller`, `chat_thread_lookup_state`
  - captured: `match_loading`, `match_error`, `match_not_found`, `host_inquiry_identity`, `event_context_fallback`, `messages_loading`, `messages_error`, `empty_thread`, `populated_thread`, `image_day_separator`, `composer_enabled`, `keyboard_composer`, `composer_disabled_loading`, `blocked_chat`, `send_message_pending`, `send_image_pending`, `top_bar_safety_actions`, `report_user_mutation`, `block_user_mutation`, `mutation_error_listener`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - tested: `host_profile_navigation_disabled`, `host_share_card_disabled`, `event_context_ready`, `auto_scroll_read_marker`, `read_marker_state`, `chat_thread_action_controller`, `chat_retry_controller`, `chat_thread_lookup_state`, `chat_route_state`, `send_failure`, `top_bar_typed_actions`, `top_bar_action_intents`, `disabled_top_bar_actions`, `share_empty_feedback`, `route_retry_intents`, `message_retry`, `suvbot_retry`, `blocked_host_chat`, `report_block_menu_success`, `report_block_failure_feedback`
  - DP-HOST-CHAT-001: Blocked. Host Chat captures now cover match loading/error/missing, message loading/error/offline, empty, populated, event fallback, blocked, composer pending/disabled, keyboard-open multiline safe-area, image/day-separator populated thread, report failure snackbar, block confirmation dialog, safety pending menu, text-scale, reduced-motion, and light/dark states. Provider-specific profile/club/event offline copy still needs product policy, and pixel-reference variants still need dedicated Host Chat masks.
  - DP-HOST-CHAT-002: Closed. `ChatRouteState` performs the route-level uid, match, messages, host-inquiry club, public-profile, event, Suvbot action, mutation-pending, and share-controller provider watches before `_ChatContent` renders. `HostChatScreenState` owns host inquiry identity, top-bar typed action availability, route/message/Suvbot retry intents, report/block pending action disabling, top-bar action intent policy, safety target copy, message peer name, and composer disabled reason. `ChatReadMarkerState` owns read-marker decision policy for duplicate, forced, incoming-latest, and dispose marks; `ChatReadMarkerController` executes `ConversationRepository.markRead` side effects; `ChatScrollCoordinator` owns initial/appended/send-success message list auto-scroll state; `ChatThreadActionController` executes profile/share/report/block typed action intents through injected UI and safety runners; `ChatRetryController` executes typed route/message/Suvbot retry invalidation; and `ChatThreadLookupState` owns other-participant, host-inquiry club, host profile, public-profile, and event lookup decisions before `ChatRouteState` performs the provider watches. Reopen only for future product-specific action policies.
  - DP-HOST-CHAT-004: Closed. Host-specific tests now cover `ChatRouteState` provider composition, `HostChatScreenState` identity fallbacks, top-bar typed actions, disabled pending top-bar actions, route/message/Suvbot retry intents, match-route retry invalidation, message retry invalidation, Suvbot retry invalidation, blocked host chat composer behavior, profile navigation/share-card disabled behavior, report/block success behavior, and report/block failure feedback through the shared chat mutation listener.
  - DP-HOST-CHAT-005: Blocked. Baseline shared Messaging-thread Host Chat reference and masks are registered; the advisory comparison against `host_chat_inquiry` is within threshold at 12.71% mismatch, meanDelta 5.28, maxDelta 240, masked 228552. Dedicated Host Chat references are still needed for keyboard/safe-area, timestamps, remote photos, generated share-card rasterization if retained, dynamic message times, unread/read markers, host-shell chrome, accessibility, and theme states.
  - DP-HOST-CHAT-006: `feature.member_chat` now binds Host Chat as a second projection of the same `ChatScreen` implementation, compiling all 29 host states and nine host actions. Add six standalone captures and focused tests for the 19 registered test exceptions to retire its 25 host-surface evidence exceptions.
- [ ] Feature-level drift/previews
  - DP-HOST-HOME-PREVIEW-001: Host Home section Widgetbook use cases now cover `HostOperationsTopBar`, `HostMetaRow`, `HostEventRow`, `HostEventsOrganizerCard`, owner/co-host switching, and long club-name pressure across content/loading/error/offline/empty/cancelled-filtered route states. Remaining hard-to-reach host-shell previews are keyboard/safe-area or pixel-reference variants design requires.

### P2 host_secondary_operations

- [ ] `host.club.create` (17 state follow-ups, 0 code-open gaps; 1 blocked reference gap)
  - planned: None
  - implemented: `route_entry`, `uid_missing_submit`, `initial_step_preview_knob`, `initial_draft_preview_knob`
  - tested: `host_club_create_state_adapter`, `success_pop`, `shared_draft_feedback`
  - captured: `basics_default`, `basics_validation`, `club_photos`, `draft_restore`, `details_step`, `host_defaults_step`, `event_success_defaults_step`, `save_draft_pending_error`, `submit_pending`, `submit_error`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route entry, basics validation, picked media, restored draft, basics, details, host defaults, Event Success defaults, save-draft pending/error, submit pending/error, offline submit failure, text scale, reduced motion, and dark theme.
  - DP-HOST-CLUB-CREATE-001: Closed for app code. Widgetbook and deterministic captures now cover route entry, validation, picked media, restored draft, all wizard steps, save-draft pending/error, submit pending/error, offline submit failure, text-scale, reduced-motion, and dark theme. Remaining variants are reference-specific pixel states blocked on additional exports.
  - DP-HOST-CLUB-CREATE-002: Closed for app code. Host Create Club basics reference and masks are exported and registered. `HostOrganizerCreateState` now owns header/footer display state, media/edit-scaffold enabled state, media display values, field/city display state, edit validation display state, mutation error copy, draft-load retry state, and typed primary/save-draft/draft-restore intents while `HostOrganizerCreateRouteIntent` owns route callback dispatch and `HostOrganizerCreateDraftRequest` and `HostOrganizerCreateSubmitRequest` own draft/submit request construction.
- [ ] `host.event.edit` (21 state follow-ups, 0 open gaps)
  - planned: None
  - implemented: None
  - tested: `host_event_edit_state_adapter`, `schedule_locked`, `success_pop`, `shared_snackbar_feedback`
  - captured: `uid_loading`, `route_loading`, `route_error`, `offline`, `event_not_found`, `unauthorized_host`, `prefilled_event`, `schedule_editable`, `schedule_locked`, `policy_editable`, `policy_locked`, `location_picker`, `validation_error`, `private_access_loading`, `submit_pending`, `submit_error`, `cancelled_event_disabled`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route loading/error/offline/not-found/unauthorized, editable prefilled form, schedule locked form, cancelled disabled form, private-access loading, validation errors, selected location, text scale, reduced motion, and dark theme.
  - DP-HOST-EVENT-EDIT-001: Closed. Widgetbook and deterministic captures now cover route loading/error/offline/not-found, unauthorized host, prefilled editable form, schedule/policy locked form, private-access loading, validation, selected-location, submit pending/error, cancelled disabled form, text-scale, reduced-motion, and light/dark. Additional state-specific pixel states are reopen-only if design exports them.
  - DP-HOST-EVENT-EDIT-002: Closed. Host Edit Event prefilled reference and masks are exported, registered, and compared within threshold at `9.25% / 10.93` after the reference refresh. `HostEventEditState` now owns route provider waves plus route access and schedule/policy lock rules, `HostEventEditScreenState` owns save feedback/pop policy, `HostEventEditSaveRequest` owns validated save payload construction, `HostEventEditPrivateAccessState` owns invite-only private-access watch and invite-code seed policy, `HostEventEditLocationState` owns selected-location display and picker initial-label state, `HostEventEditScheduleValidationState` owns invalid-start validation state, and `HostEventEditIntent` owns typed route callback payloads.
- [ ] `host.settings` (18 state follow-ups, 0 code-open gaps; 2 blocked/reference gaps)
  - implemented: `uid_missing`, `profile_loading`, `profile_error`, `no_profile`, `profile_fallback_adapter`, `settings_state_adapter`, `profile_controller_mutations`, `edit_preview_tabs`, `clubs_loading`, `clubs_error`, `clubs_section`
  - tested: `fallback_profile_from_club`, `active_profile`, `create_profile_pending`, `create_profile_error`, `save_profile_error`, `sign_out_error`
  - captured: `profile_offline`, `create_profile_mutation`, `save_profile_mutation`, `profile_editor_sheet`, `clubs_offline`, `sign_out_action`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route auth/profile/clubs states, profile summary rows including create-pending, clubs loading/error/empty/populated rows, Edit/Preview tab rail, text scale, reduced motion, and dark theme.
  - DP-HOST-SETTINGS-001: Closed for app code. Deterministic captures now cover inline profile editing, create/save mutation pending/error/offline, sign-out error/offline, and profile/club offline provider states. Direct HostAccount.dc.html source is found, but the 2026-06-25 stable temp bundle, current runtime, CDP, and original-source Chrome attempts either produced placeholder boxes or hung before a valid PNG. Remaining reference work is blocked on source/runtime repair or an alternate export path, masks, and pixel comparison.
  - DP-HOST-SETTINGS-002: Closed for app code. `HostSettingsState`, `HostSettingsProfileState`, and `HostSettingsOrganizersState` now adapt profile/club provider waves, club-backed fallback identity, loading, error, missing, empty, and content branches before `HostSettingsProfileSection` and `HostSettingsOrganizersSection` render. `HostProfileController` owns profile create/save mutations shared with Host Profile. Remaining payout/admin ownership is a product IA decision before code changes.
- [ ] `host.profile` (15 state follow-ups, 2 open gaps)
  - implemented: `uid_missing`, `profile_loading`, `profile_error`, `profile_edit_state_adapter`, `profile_controller_mutations`, `missing_profile`, `populated_profile`, `validation_error`, `save_success`, `status_variants`
  - tested: `create_profile_mutation`, `create_profile_error`, `save_error`
  - captured: `profile_offline`, `validation_error`, `create_profile_mutation`, `save_pending`, `save_error`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - previewed: route loading/error/auth/missing/populated, provider-free form status variants, validation, save pending, missing/create pending, text scale, reduced motion, and dark theme.
  - DP-HOST-PROFILE-001: Deterministic captures now cover validation, create/save mutation pending/error/offline, profile offline, text-scale, reduced-motion, and light/dark states. Remaining: canonical reference export and pixel comparison.
  - DP-HOST-PROFILE-002: `HostProfileEditState` now adapts direct Host Profile auth/loading/error/missing/content provider state before `HostProfileForm` and `HostProfileMissingState` render, `HostProfileController` owns create/save orchestration shared with the Host Settings inline form, and the route exposes a default-disabled validation mode for deterministic captures. Remaining: any host-specific offline copy decision and reference-backed comparison.
- [ ] Feature-level drift/previews
  - DP-HOST-SECONDARY-LINT-001: Promote stable host form composition invariants into scanner/lint rules after create/edit/profile adapter boundaries exist.
  - [x] DP-HOST-SECONDARY-PREVIEW-001: Widgetbook entries now exist for host club create/edit, host event edit, Host Settings route/sections, and Host Profile route/form/field/missing states.

### P2 secondary_consumer_surfaces

- [ ] `calendar.home` (10 state follow-ups, 1 blocked gap)
  - implemented: None
  - tested: `event_detail_navigation`
  - captured: `uid_missing`, `events_loading`, `events_error`, `club_names_loading_error`, `empty_calendar`, `expanded_month_header`, `planned_events`, `text_scale_2`, `reduced_motion`
  - DP-CALENDAR-001: Closed by Calendar Widgetbook states covering collapsed/expanded header, stats, agenda rows, loading, empty, provider error, club-name loading/error, text scale, reduced motion, and dark theme variants under the canonical `screen.calendar.home` contract id.
  - DP-CALENDAR-002: Closed by deterministic Calendar captures for uid-missing fallback, loading, empty, provider error, club-name loading/error, expanded month, selected day, text scale, reduced motion, and paired light/dark output.
  - DP-CALENDAR-003: Closed by CalendarHomeState and CalendarAgendaSectionState owning event summary, selected date, header mode, club-id lookup input, agenda row display, and empty/loading/error section state while CalendarScreen retains provider waves, retry invalidation, scroll behavior, and route navigation.
- [ ] `saved_events.list` (9 state follow-ups, 1 blocked gap)
  - implemented: None
  - tested: `detail_navigation`
  - captured: `uid_missing`, `saved_events_loading`, `saved_events_error`, `empty_saved_events`, `populated_saved_events`, `club_names_loading_error`, `text_scale_2`, `light_dark`
  - DP-SAVED-EVENTS-001: Closed by Saved Events Widgetbook states for populated rows, empty, loading, stream error, club-name loading/error, past/saved row statuses, text scale, and dark theme variants.
  - DP-SAVED-EVENTS-002: Closed by deterministic Saved Events captures for uid-missing fallback, empty/deleted-doc fallback, loading, error, club-name loading/error, past-only, text scale, and paired light/dark output.
  - DP-SAVED-EVENTS-003: Closed by SavedEventsHeaderSliver, SavedEventsAgendaList, SavedEventsLoading, SavedEventsError, SavedEventsOrganizerNamesErrorState, SavedEventsMessage, and SavedEventsListState provider-free section boundaries.
- [x] `filters.preferences` (10 state follow-ups, 0 open gaps)
  - planned: None
  - implemented: None
  - tested: `save_success_exit`
  - captured: `profile_loading`, `profile_error`, `profile_missing`, `default_preferences`, `edited_preferences`, `reset_preferences`, `save_pending`, `save_error`, `text_scale_2`, `reduced_motion`
  - DP-FILTERS-001: Closed by Filters Widgetbook route/content states covering default, dirty edits, reset-restored content, loading, profile error, offline profile error, missing profile, save pending, save-error snackbar seeding, text scale, reduced motion, and explicit dark-theme specimens.
  - DP-FILTERS-002: Closed by deterministic Filters captures for loading, profile error, missing profile, dirty edit, reset-restored content, save pending, save error, text scale, reduced motion, and paired light/dark output.
  - DP-FILTERS-003: Closed by FiltersPreferencesState owning saved defaults, draft values, dirty state, reset/apply availability, pending state, and save request fields while FiltersScreen retains provider waves, mutation listening, route close/pop behavior, and controller execution.
- [ ] `event.recap` (12 state follow-ups, 1 blocked gap)
  - planned: None
  - implemented: None
  - tested: `open_catches_deck`
  - captured: `recap_loading`, `recap_error`, `event_not_found`, `populated_attendees`, `empty_roster`, `profile_lookup_loading`, `profile_lookup_error`, `profile_lookup_fallback`, `vibe_selection`, `text_scale_2`, `reduced_motion`
  - DP-EVENT-RECAP-001: Closed by Event Recap Widgetbook route states covering loading, view-model error, missing event, populated attendees, empty roster, profile-enrichment loading/error, partial profile fallback, selected vibe tile, closed/open catch-window copy, text scale, reduced motion, and dark theme.
  - DP-EVENT-RECAP-002: Closed by deterministic Event Recap captures for loading, error, missing event, empty roster, profile-enrichment loading/error, partial profile fallback, selected tiles, text scale, reduced motion, and paired light/dark output. Keyboard/safe-area has no dedicated recap input state.
  - DP-EVENT-RECAP-003: Closed by EventRecapScreenState owning async branch mapping, attendee/profile rows, selected ids, hero/window copy, retry intents, and open-deck intent data while EventRecapScreen retains provider invalidation, local selection mutation, and GoRouter execution at the route edge.
- [ ] Feature-level drift/previews
  - DP-SECONDARY-LINT-001: Add an advisory check that P2 captured routes cannot remain planned in screen_coverage.json after a contract exists.
  - DP-SECONDARY-PREVIEW-001: Add Widgetbook states for Calendar, Saved Events, Filters, and Event Recap sections before visual parity edits.

### P3 utility_surfaces

- [ ] `event.location_map` (11 state follow-ups, 0 open gaps; 2 blocked reference gaps)
  - planned: `map_masking`
  - captured: `route_loading`, `route_error`, `event_not_found`, `no_exact_coordinate`, `pinned_location`, `directions_action`, `network_tiles_disabled_capture`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-EVENT-MAP-003: Blocked/reference-only. EventLocationMapState is implemented and route/state captures exist; exported map masks wait on a canonical standalone full-screen map reference.
- [ ] `notifications.list` (14 state follow-ups, 0 open gaps)
  - tested: `read_unread_rows`, `row_navigation_targets`
  - captured: `uid_loading`, `uid_error`, `signed_out`, `activity_loading`, `activity_error`, `empty_activity`, `notifications_activity`, `mark_all_read`, `deep_link_failures`, `text_scale_2`, `reduced_motion`, `light_dark`
- [ ] `reviews.history` (12 state follow-ups, 0 open gaps)
  - tested: `edit_review_sheet`
  - captured: `uid_missing`, `profile_loading`, `profile_error`, `reviews_loading`, `reviews_error`, `empty_reviews`, `reviews_history_list`, `event_context_missing`, `text_scale_2`, `reduced_motion`, `light_dark`
- [ ] `settings.account` (19 state follow-ups, 0 open gaps)
  - tested: `history_navigation_rows`
  - captured: `profile_backed_account`, `profile_loading`, `profile_error`, `profile_missing`, `external_link_outcomes`, `notification_preferences`, `preference_save_error`, `privacy_safety_defaults`, `blocked_accounts_loading_error`, `blocked_accounts_empty`, `blocked_accounts_list`, `unblock_mutation`, `delete_account_flow`, `sign_out_action`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-SETTINGS-ACCOUNT-002: closed; Settings Account route captures now cover profile loading/error/offline/missing, blocked-user loading/error/offline/list, preference/delete/sign-out/unblock mutation pending/error/offline, external-link pending/failure, text scale, reduced motion, and light/dark. Unblock success feedback now uses the shared Catch snackbar helper. Settings intentionally uses the shared offline provider/mutation error copy instead of Settings-specific copy.
- [ ] `payments.history` (17 state follow-ups, 0 open gaps; 2 blocked reference gaps)
  - tested: `status_variants`
  - captured: `uid_loading`, `uid_error`, `signed_out`, `payments_loading`, `payments_error`, `payment_history_empty`, `populated_payments`, `detail_sheet`, `failed_signup_help`, `event_title_loading`, `event_title_error`, `event_title_missing`, `offline`, `text_scale_2`, `reduced_motion`, `light_dark`
  - DP-PAYMENT-HISTORY-002: Blocked/reference-only. Payment History route captures now cover access, provider waves, empty, populated rows, receipt sheet, failed sign-up help sheet, support snackbar, event-title loading/error/missing states, offline provider errors, text scale, reduced motion, and light/dark. The support snackbar uses the shared Catch snackbar helper. Canonical reference export, receipt-id masks, and pixel comparison wait on a standalone Payment History design source.
- [ ] Feature-level drift/previews
  - DP-UTILITY-LINT-001: After adapter boundaries exist, extend contracted-screen hygiene checks for utility routes that add raw Material controls or one-off visual constants.
  - DP-UTILITY-PREVIEW-001: Add Widgetbook states and deterministic captures for map, notifications, reviews, settings, and payments utility surfaces before pixel comparison.

## Definition Of Done

A screen is done when all of these are true:

- [ ] Route is present in `design/screens/screen_coverage.json` with the
  correct status, priority, screen id, and reason.
- [ ] Screen is present in `design/screens/catch.screens.json` with routes,
  owner, priority, source, controller/state ownership, states, captures,
  composition sections, dependencies, and open gaps.
- [ ] Screen states cover meaningful loading, populated, empty, error, offline,
  permission/access, mutation pending/failure, theme, text scale, reduced
  motion, and role-specific variants.
- [ ] Route widget owns navigation and state orchestration only.
- [ ] Visual structure is delegated to predefined sections/components.
- [ ] Sections depend on registered primitives/tokens instead of raw Material
  controls or one-off visual values.
- [ ] Widgetbook includes useful primitive/section previews for hard-to-reach
  states and all contract `previewIds` resolve.
- [ ] UI capture catalog includes deterministic full-screen captures for the
  highest-risk states.
- [ ] Tests cover controller/adapters and critical UI state transitions.
- [ ] Pixel comparison is advisory or ready once exported references and masks
  exist.
- [ ] Drift-prevention scanners pass or record stable, intentional advisory
  findings.
- [ ] `docs/widget_catalog.md`, design parity docs, and the relevant authored
  contracts are updated in the same pass.
