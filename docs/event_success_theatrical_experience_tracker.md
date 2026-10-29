---
doc_id: event_success_theatrical_experience_tracker
version: 0.1.1
updated: 2026-08-07
owner: recursive_audit_loop
status: temporary_active
---

# Event Success Theatrical Experience Tracker

Temporary tracker for making Event Success feel like a playful, room-wide live
ceremony rather than only a host utility. Fold durable decisions back into
`docs/event_success.md` when the phases below close.

## Product Direction

- The live companion should feel more playful than premium, while still
  polished enough for paid hosts.
- Sound and haptics are part of the live event primitive set, but native cues
  come first. Branded audio assets wait until the first live ceremony pass has
  been evaluated.
- Pre-event sharing and invites are stronger share surfaces than public
  post-event dating stats. Post-event artifacts should be fun and private-first
  inside the app.
- The host surface can stay operational, but the attendee companion and reveal
  moments should feel kinetic, synchronized, and memorable.

## Reference Patterns

- Duolingo streak milestones: celebrate progress with clear, short bursts.
- Headspace: guide mood and pacing without overwhelming the user.
- Spotify Wrapped: turn personal data into a story, mostly in-app for Catch.
- Apple Activity rings: make progress easy to understand at a glance.
- Nike Run Club guided runs: use the phone as a coach during a live activity.
- BeReal: synchronized cues make a shared moment feel live.
- Partiful: the invite starts the party before the event starts.
- Punchdrunk immersive theatre: choreograph discovery instead of exposing every
  option at once.

## Phase 1 - Live Ceremony V1

Status: complete for V1; keep this phase open only for manual device feedback.

- [x] Add an event-success-specific native effects seam with haptics and light
  `SystemSound` cues.
- [x] Make the attendee hero describe the current live moment, stage context,
  and privacy promise.
- [x] Animate active companion moment changes with fade, slide, and subtle
  scale while preserving the single-moment runtime model.
- [x] Make reveal countdowns, waiting states, and unlocked assignments feel
  more ceremonial without leaking partner names before reveal.
- [x] Add a host showtime console above the existing live host guide.
- [x] Dispatch live effects for host step changes, countdowns, reveals, reset,
  check-in/live-entry, and guide completion.
- [x] Prove host and attendee state changes stay synchronized through focused
  production-surface tests and review fixtures.
- [x] Complete focused verification with proof preserved in Git and CI.

Acceptance criteria:

- Attendee companion still renders exactly one runtime-selected moment at a
  time, plus post-event follow-up when the runtime allows it.
- Reveal countdown ticks do not replay haptics or sounds on every rebuild.
- Partner names stay hidden until the reveal state allows them.
- Host Previous/Next and reveal actions keep using the existing controller and
  repository writes.
- Manual QA uses a shared fake event-success environment for host actions,
  attendee questionnaire saves, opt-outs, and countdown timing instead of
  screen-local one-off state patches.
- No Firestore schema, Functions, rules, or assignment-engine changes are part
  of this phase.

## Phase 1B - Attendee Companion Stage Redesign

Status: implemented for first visual review. This is the corrective pass for the
current attendee companion still feeling like a card workbook instead of a live
event surface.
Scope is attendee companion only; host live mode, invite sharing, recap, schema,
Functions, and assignment generation stay out of scope unless needed to preserve
existing behavior.

### Product Bar

- The attendee companion should read as one full-screen live stage, not a
  dashboard page with a hero card and another content card.
- Each runtime moment should have one obvious emotional job: prepare, arrive,
  answer, follow, wait, reveal, ask for help, or close the loop.
- Motion should feel choreographed and purposeful. Avoid subtle generic
  fade-slide motions as the primary effect; use stage transitions, countdown
  tension, reveal release, and tactile state changes.
- The design should stay playful-first, not luxury-first. It can use saturated
  color, oversized live cues, expressive iconography, and kinetic layout, while
  keeping privacy and partner-name safety intact.
- No peer names or assignment details may leak before reveal. No Firestore,
  Functions, rules, or repository wire-shape changes.

### Implementation Checklist

- [x] Replace the current companion `Scaffold`/flat `ListView` presentation with
  a dedicated `_CompanionStageScaffold` that owns background, safe-area padding,
  app-bar treatment, stage height, and bottom action area.
- [x] Make `_CompanionStageScaffold` render one primary `_CompanionMomentStage`
  instead of a stacked hero plus separate card. The stage should combine event
  identity, moment label, live copy, privacy reassurance, and the active module
  content into one composed scene.
- [x] Add a presentation mapper that outputs a moment-specific `CompanionStageTheme`
  with background colors, accent color, icon, illustration/motif, primary verb,
  secondary copy, privacy line, and motion preset. Keep it presentation-only and
  driven by `EventSuccessAttendeeMoment`.
- [x] Convert `_CompanionHero` into stage chrome rather than a standalone
  `CatchSurface`. It should become compact event identity and progress context
  inside the stage, not the dominant workbook header.
- [x] Replace `_LiveMomentCardTransition` with a stage transition that changes
  the full moment scene: outgoing content drops/fades, incoming content rises or
  snaps in, and the stage accent/background changes. Use stable keys so rebuilds
  do not replay transition effects.
- [x] Add a bottom anchored action dock for moment-specific actions such as
  check in, save answers, opt in/out, ask host, and submit feedback. Primary
  actions should not look like form-submit buttons buried inside a card.
- [x] Redesign the questionnaire moment as a quick-tap sequence or playful
  clue board: one clear question focus, answer chips with stronger selected
  feedback, progress indication, and a celebratory save transition. Do not show
  it as a form card with all questions feeling like settings.
- [x] Redesign live step/context moments as room cues: oversized step title,
  stage/rhythm indicator, one conversational prompt, and optional small
  supporting context. Remove unnecessary administrative badges.
- [x] Redesign countdown as a full-stage countdown: large animated number,
  progress ring or sweep, synchronized room copy, and clue-forward waiting text.
  Ensure countdown ticks do not replay haptics/sounds.
- [x] Redesign reveal unlocked state as a distinct release moment: transition
  from locked/clue state into assignment details, with a brief celebratory burst
  using native haptics/system sound only.
- [x] Redesign non-reveal assignment cards (`_MicroPodCard` and
  `_RotationScheduleCard`) to match the stage language rather than plain row
  cards. Use assignment/person tokens and timeline/rhythm visuals instead of
  badge-heavy lists.
- [x] Keep post-event and wingman moments inside the same stage system, but do
  not implement the full private afterglow recap artifact in this phase.
- [x] Preserve the one-runtime-moment model from `EventSuccessRuntime`. Do not
  reintroduce a stacked dashboard that shows every module at once.
- [x] Keep all sensory effects routed through
  `EventSuccessLiveEffectsController`; do not add an audio package or new assets
  in this pass.
- [x] Update widget tests to assert the companion uses stage semantics rather
  than workbook/card semantics: one stage root, one primary moment, no pre-reveal
  peer-name leakage, countdown advances, and reveal unlocks only after reveal.
- [x] Add deterministic production-surface coverage for questionnaire save,
  live countdown, reveal unlock, and opt-out state.
- [x] Run focused gates: `flutter test test/event_success`, affected
  celebration/effects tests if sensory behavior changes, `flutter analyze
  --no-fatal-infos`, `git diff --check`, hot reload the production surface, and capture
  a screenshot before marking this phase complete.

### Countdown Suspense Revision - 2026-05-24

Status: implemented for review.

- [x] Replace the attendee countdown's plain card/progress-bar treatment with a
  darker room-hold stage, oversized animated number, radial sweep/tick dial,
  atmospheric motion, hold/watch/move beat rail, and clue-forward locked copy.
- [x] Keep privacy intact: no peer names display during countdown, and the
  countdown explicitly says names are still locked until the shared release.
- [x] Keep timing architectural: production routed companion screens now let the
  live reveal card run its own second-level ticker, while deterministic tests can
  still pass a deterministic `now`.
- [x] Preserve native effect one-shot behavior; the visual countdown still does
  not trigger haptics/sounds on every tick.
- [x] Update focused companion reveal assertions and run the production reveal
  gates listed in the latest resume notes.

### Acceptance Criteria

- The attendee companion no longer visually presents as a Notion-like workbook:
  no default "hero card plus content card" structure for the main live moments.
- A user can understand the current event moment in under two seconds from the
  stage headline, animation state, and primary action.
- Countdown and reveal are visually dominant live moments, not small widgets
  inside a normal card.
- Questionnaire feels like a quick clue ritual, not setup/admin configuration.
- Partner identity remains hidden until reveal, verified by tests.
- Existing production write paths, fixture write paths, runtime gating, and
  native effects provider override tests continue to pass.

## Phase 2 - Invite Loop

Status: implemented for first visual review.

- [x] Audit current event detail, payment confirmation, private-link, and host
  manage share copy.
- [x] Add shared event-invite copy so event detail, payment confirmation, and
  host private-link shares use the same event title, date, venue, activity, price,
  and deep link shape.
- [x] Add a booked-attendee invite card on event detail so sharing is visible
  after RSVP instead of only hidden behind the hero icon.
- [x] Refresh payment confirmation invite/referral surfaces with stronger
  friend-invite copy while preserving calendar, directions, and back-home actions.
- [x] Make host private-link sharing more invitation-like without changing
  booking policy.
- [x] Prefer better text/share surfaces first; defer share images/cards until the
  user psychology is clearer.

## Phase 3 - Private Afterglow

Status: implemented for first visual review.

- [x] Design an in-app post-event recap artifact that feels fun without pressuring
  attendees to share dating-event stats publicly.
- [x] Keep attendee-specific safety, comfort, and target identity data private.
- [x] Add copyable post-event openers so the recap has an action beyond passive
  reading.
- [x] Tighten feedback copy around private-first safety and comfort notes.
- [x] Let host-facing recap remain aggregate coaching, not personal attendee
  intelligence.

## Phase 3B - First Hello Check-In Module

Status: implemented for first backend/client review; needs physical-device
venue QA before host-visible launch.

- [x] Add First Hello check-in as an optional event-success module in the
  playbooks and activity-profile recommendation system.
- [x] Expose the arrival-stage host setup toggle where the activity profile says
  the module is selectable.
- [x] Add a presentation-only arrival mission model so the attendee companion can
  render a concrete target, question, and answer options without coupling the UI
  to the future Firestore shape.
- [x] Teach `EventSuccessRuntime` to promote First Hello only when the module is
  enabled, normal check-in is open, the attendee is still `signedUp`, and a
  mission has actually been assigned.
- [x] Add a full-stage First Hello companion card with target-safe copy, private
  answer language, answer chips, completion, and fallback affordance.
- [x] Keep host controls, attendee mission, completion state, and checked-in
  transition synchronized through the production repositories and controllers.
- [x] Add focused runtime, playbook, Host, and companion tests.
- [x] Add the production backend slice: server-owned mission assignment,
  location verification, blocked/reported-pair filtering, answer capture, and
  attendance completion.
- [x] Add Firestore/schema/rules/contracts for First Hello missions and
  completions after the backend shape is chosen.
- [x] Set the first production hypothesis radius for First Hello to 100m,
  tighter than the existing 200m self-check-in radius.
- [x] Add QR check-in separately; First Hello remains an optional ritual, not the
  only attendance path. V1 QR uses host-displayed event QR, attendee scanning,
  and the existing GPS-verified self-check-in callable as the attendance write.
- [ ] Validate the 100m First Hello radius and QR camera flow on physical venues
  before launch; tune radius/copy if dense venues or GPS drift make it brittle.

Acceptance criteria before production launch:

- First Hello never replaces ordinary host/manual/QR/self check-in fallback.
- A user cannot assign themselves a target or complete attendance from
  client-only state.
- The attendee sees one target and one short question; peer answers are not
  written into the target's questionnaire and are not exposed to hosts.
- Blocked/reported or unsafe pairs are filtered before assignment.
- The module degrades cleanly: no mission means normal check-in/questionnaire
  flow, not a broken arrival state.

## Phase 4 - Branded Audio And Assets

Status: deferred pending manual review of native haptics/system sounds.

- Evaluate whether native cues are too subtle or too noisy during live-event QA.
- Add a real audio package and branded sound assets only if native cues are not
  expressive enough.
- Keep any asset work scoped to small reveal/check-in/recap cues, not ambient
  background audio.
- Do not add branded audio in the same slice as First Hello/QR; evaluate the
  live ceremony on device first so the app does not accumulate gimmicky cues.

## Verification Log

- Passed: `flutter test test/event_success/event_success_live_screens_test.dart test/event_success/event_success_manual_qa_screen_test.dart`
- Passed: `flutter test test/event_success`
- Passed: `flutter test test/core/catch_celebration_screen_test.dart test/chats/match_celebration_dialog_test.dart`
- Passed: `flutter analyze --no-fatal-infos`
- Passed: `git diff --check`
- Phase 1B passed: `flutter test test/event_success/event_success_live_screens_test.dart test/event_success/event_success_manual_qa_screen_test.dart`
- Phase 1B passed: `flutter test test/event_success`
- Phase 1B passed: `flutter test test/core/catch_celebration_screen_test.dart test/chats/match_celebration_dialog_test.dart`
- Phase 1B passed: `flutter analyze --no-fatal-infos`
- Phase 1B passed: `git diff --check`
- Phase 1B visual check: hot reloaded running macOS debug app and inspected
  production attendee companion via Computer Use screenshot.
- Historical note: Phase 1B used the former audit-stamp/report commands. Those
  commands are retired; Git retains the original record.
- Phase 2/3 passed: `flutter test test/payments/payment_confirmation_controller_test.dart test/payments/payment_confirmation_screen_test.dart test/events/event_detail_widgets_test.dart test/event_success/event_success_live_screens_test.dart`
- Phase 2/3 passed: focused `flutter analyze --no-fatal-infos` on touched event,
  payment, host, and event-success files.
- Phase 2/3 passed: `flutter test test/event_success test/payments test/events/event_detail_widgets_test.dart`
- Phase 2/3 passed: full `flutter analyze --no-fatal-infos`
- Phase 2/3 passed: `git diff --check`
- Phase 2/3 ran: `bash tool/widget_cleanup_scan.sh` (triage-only scanner; no
  blocking failures, remaining matches are broader pre-existing widget cleanup
  candidates plus stage/snackbar implementation candidates to revisit during a
  dedicated cleanup pass).
- Historical note: Phase 2/3 used the former audit-stamp/report commands. They
  are not part of the current completion loop.
- Phase 3B passed: `flutter test test/event_success/event_success_runtime_test.dart test/event_success/event_success_playbooks_test.dart test/event_success/event_success_live_screens_test.dart test/event_success/event_success_manual_qa_screen_test.dart`
- Phase 3B passed: `flutter test test/event_success`
- Phase 3B passed: `flutter analyze --no-fatal-infos`
- Phase 3B passed: `git diff --check`
- Phase 3B ran: `bash tool/widget_cleanup_scan.sh` (triage-only scanner; no
  blocking failures, remaining matches are broader widget cleanup candidates).
- Historical note: the Phase 3B audit-stamp/report commands are retired.
- Phase 3B backend/QR passed: `npm run build`
- Phase 3B backend/QR passed: `npm run lint`
- Phase 3B backend/QR passed: `node --test
  lib/eventSuccess/firstHelloCheckIn.test.js`
- Phase 3B backend/QR passed: `firebase emulators:exec --only firestore "node
  --test --test-concurrency=1 --test-name-pattern 'First Hello'
  test/firestore.rules.test.cjs"`
- Phase 3B backend/QR passed: `flutter test
  test/events/event_check_in_qr_payload_test.dart test/event_success`
- Phase 3B backend/QR passed: `./tool/check_data_contract.sh`
- Phase 3B backend/QR passed: `flutter analyze --no-fatal-infos`
- Phase 3B backend/QR passed: `git diff --check`
- Historical note: the backend/QR audit-stamp/report commands are retired.
- Ran: `bash tool/widget_cleanup_scan.sh`
- Historical note: the final audit-stamp/report commands are retired; preserve
  current proof in focused check output and Git.

## Resume Notes

- First Hello now has server-owned mission assignment/completion. Remaining
  risk is physical venue QA: GPS drift, no compatible checked-in target early in
  the event, camera permission copy, and whether 100m is too tight in practice.
- Existing unrelated dirty files are Firebase config and `lib/platform/errors/error_logger.dart`;
  do not revert or include them in this tracker.
- Phases 1B, 2, 3, and 3B are ready for visual/product review after focused
  gates pass.
- Remaining tracked slice is Phase 4: evaluate native sensory cues before
  deciding whether branded audio/assets are worth the extra package and asset
  work.
