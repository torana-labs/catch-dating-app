---
doc_id: redesign_surviving_tests
version: 1.0.0
updated: 2026-11-02
owner: redesign_programme
status: active
---

# Redesign Surviving Tests

Which legacy screen tests pin behaviour, and so must be re-homed before their
screen is deleted, and which only pin layout. This is row 0.5 of the redesign
programme (plan in `torana-labs/catch-knowledge`,
`plans/redesign-implementation-programme.md`, amendment G), tracked under
https://github.com/torana-labs/catch-dating-app/issues/1461. Each screen packet
lifts its section from [Behaviours by destination](#behaviours-by-destination)
into its "tests to re-home" field.

Measured at `6fb4785b1`. The suite changes daily, so
[Appendix B](#appendix-b-re-run-the-classification) re-runs everything. Retire
this document when the programme's "Tests follow the pyramid" gate holds.

## Summary

- **414 test files have a legacy subject.** 326 are behaviour, 62
  are mixed and 26 are layout. Another 18 files under
  `widgetbook/test` are outside the brief's folders but die with the same
  screens, so they are listed too and kept out of the totals.
- **Nearly everything pins behaviour.** Of 3,089 test cases in those files,
  2,635 assert behaviour, 237 assert only layout and 217 never touch
  legacy code. The net is not mostly layout, so deleting a screen's tests
  without re-homing them would lose real rules.
- **Most of it already sits below the widget level.** 603 behaviours
  belong in domain tests with fakes and 989 in action tests. Only
  736 need a body render test, 112 a parts binding test and
  195 an integration journey. Amendment G's pyramid fits what the
  suite already pins.
- **Only 16 goldens die with a screen, not 92.** Of the 92 "app goldens", 82
  are `catch_ui` family sheets, 2 are the token sheet and 8 pin legacy widgets.
  Another 8 program-screen goldens sit in a folder the plan did not count. See
  [App goldens](#app-goldens).
- **This is not a line-by-line reading.** The brief asked for every behaviour
  or mixed file to be read. Those 388 files hold 149,532 lines, so they
  were read case by case from a digest, with source-level reading on a sample.
  [Method](#method-and-blind-spots) says exactly what was and was not read.

## Using this in a screen packet

Take your destination's section. For each bullet, write the test named by the
tag before the old file goes:

| Tag | Re-home to |
|---|---|
| `domain` | domain test with a fake, in the context package |
| `action` | action test, in the context's `actions/` |
| `parts` | parts binding test |
| `body` | body render test, asserting semantics only |
| `journey` | the destination's integration journey |

Three things a packet must not miss:

1. **A file is not always one screen's to delete.** The files in
   [Files shared by destinations](#files-shared-by-destinations) appear under
   several destinations. A screen PR removes only its own cases, and the last
   destination deletes the file.
2. **Some cases in these files are not legacy tests.** The 217 cases in
   [Appendix A](#appendix-a-cases-that-test-only-context-code) reach no legacy
   symbol. They survive: move them to the context's test folder rather than
   deleting them with the file.
3. **The bullet is the test's name, not a reading of its assertions.** Where
   the name is unclear, open the file. `{name}` in a bullet is a value the test
   loops over.

## Totals

### Files per label

| Label | Files | Lines | Meaning |
|---|---:|---:|---|
| behaviour | 326 | 93,911 | every legacy case asserts what happens |
| mixed | 62 | 55,621 | both; only the behaviour cases are listed |
| layout | 26 | 4,082 | every legacy case asserts arrangement; deleted with the screen |
| **Universe** | **414** | **153,614** | |

`widgetbook/test`, outside the universe: 8 behaviour, 1 mixed,
9 layout, carrying 12 behaviours.

The universe's 414 files are 414 of the 821 test files under
`test/` and `apps/*/test`. 230 of them pump a widget and 236 override
providers. The other 407 have no case that reaches a legacy symbol, so they
survive unchanged:

| Test folder | Files with no case reaching legacy code |
|---|---:|
| `core` | 128 |
| `event_success` | 51 |
| `hosts` | 38 |
| `goldens` | 24 |
| `event_rehearsal` | 23 |
| `programs` | 19 |
| `events` | 18 |
| `tool` | 14 |
| `integration` | 8 |
| `tooling` | 8 |
| `payments` | 7 |
| `apps/*/test` | 6 |
| `chats` | 6 |
| `organizers` | 6 |
| `user_profile` | 5 |
| `analytics` | 3 |
| `force_update` | 3 |
| `health_activity` | 3 |
| `routing` | 3 |
| `swipes` | 3 |
| `architecture` | 2 |
| `cross_paths` | 2 |
| `exceptions` | 2 |
| `image_uploads` | 2 |
| `launch_access` | 2 |
| `locations` | 2 |
| `public_profile` | 2 |
| `ui_captures` | 2 |
| `activity` | 1 |
| `auth` | 1 |
| `communications` | 1 |
| `contexts` | 1 |
| `dependencies` | 1 |
| `event_policies` | 1 |
| `explore` | 1 |
| `l10n` | 1 |
| `lint_contracts` | 1 |
| `notifications` | 1 |
| `onboarding` | 1 |
| `profile` | 1 |
| `reviews` | 1 |
| `safety` | 1 |
| `user_analytics` | 1 |
| **Total** | **407** |

The `core`, `goldens`, `tool`, `tooling` and `integration` rows are `catch_ui`,
lint and journey tests. The rows named after legacy folders are tests of
`lib/contexts/**`, which were moved there in earlier phases but kept their old
test folders. The 95 helper libraries under the same folders (fixtures, fakes)
are not test files and are not counted; each goes when its last user goes.

### Cases per label

| Label | Cases | Decided by |
|---|---:|---|
| behaviour | 2,635 | rules, then hand review of the digest |
| layout | 237 | rules, then hand review of the digest |
| context only, survives | 217 | symbol reachability |
| **All cases in universe files** | **3,089** | 2,840 rules alone, 225 changed by hand, 24 by a folder rule |

### Behaviours per destination

| Destination | Folder | Files | Behaviours | domain | action | parts | body | journey | Layout-only files | Adjacent behaviours |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| P3.0 shell | `apps/host/lib/shell` | 6 | 24 | 8 | 0 | 0 | 5 | 11 | 2 | 0 |
| P3.1 today | `apps/host/lib/today` | 9 | 82 | 26 | 9 | 0 | 26 | 21 | 1 | 0 |
| P3.2 events/create | `apps/host/lib/events/create` | 21 | 138 | 40 | 47 | 5 | 39 | 7 | 2 | 0 |
| P3.3 door | `apps/host/lib/door` | 7 | 24 | 5 | 4 | 8 | 6 | 1 | 1 | 0 |
| P3.4 live | `apps/host/lib/live` | 46 | 242 | 54 | 149 | 8 | 26 | 5 | 0 | 2 |
| P3.5 insights | `apps/host/lib/insights` | 4 | 19 | 5 | 0 | 0 | 14 | 0 | 1 | 0 |
| P3.6 marketing | capture renders for the ads | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| P5 events | `apps/host/lib/events` | 56 | 305 | 61 | 183 | 6 | 45 | 10 | 0 | 0 |
| P5 people | `apps/host/lib/people` | 31 | 241 | 44 | 70 | 5 | 87 | 35 | 4 | 0 |
| P5 forms | `apps/host/lib/forms` | 29 | 173 | 9 | 99 | 13 | 39 | 13 | 5 | 0 |
| P5 organizer | `apps/host/lib/organizer` | 15 | 82 | 3 | 25 | 16 | 32 | 6 | 0 | 0 |
| P5 onboarding | `apps/host/lib/onboarding` | 7 | 29 | 8 | 10 | 1 | 9 | 1 | 0 | 0 |
| P5 programmes | `apps/host/lib/programmes` | 28 | 165 | 16 | 86 | 2 | 49 | 12 | 0 | 6 |
| P5 live/formats | `apps/host/lib/live/formats` | 6 | 21 | 6 | 2 | 0 | 11 | 2 | 0 | 0 |
| P6 onboarding | `apps/consumer/lib/onboarding` | 14 | 144 | 29 | 74 | 0 | 36 | 5 | 2 | 2 |
| P6 home | `apps/consumer/lib/home` | 7 | 43 | 15 | 2 | 3 | 17 | 6 | 1 | 0 |
| P6 explore | `apps/consumer/lib/explore` | 17 | 189 | 86 | 8 | 5 | 81 | 9 | 3 | 0 |
| shared lib/pages/event | `lib/pages/event` | 19 | 163 | 73 | 22 | 13 | 40 | 15 | 0 | 1 |
| shared lib/pages/organizer | `lib/pages/organizer` | 10 | 68 | 25 | 8 | 10 | 20 | 5 | 1 | 0 |
| shared lib/pages (startup) | `lib/pages/startup` | 3 | 7 | 3 | 3 | 0 | 1 | 0 | 0 | 0 |
| P6 book | `apps/consumer/lib/book` | 6 | 44 | 0 | 28 | 3 | 11 | 2 | 0 | 0 |
| P6 live | `apps/consumer/lib/live` | 12 | 84 | 18 | 36 | 6 | 23 | 1 | 0 | 0 |
| P6 after | `apps/consumer/lib/after` | 18 | 78 | 27 | 18 | 1 | 26 | 6 | 2 | 0 |
| P6 chats | `apps/consumer/lib/chats` | 21 | 132 | 17 | 61 | 4 | 39 | 11 | 1 | 1 |
| P6 you | `apps/consumer/lib/you` | 27 | 138 | 25 | 45 | 3 | 54 | 11 | 0 | 0 |
| **Total** | | | **2635** | 603 | 989 | 112 | 736 | 195 | **26** | 12 |

"Files" counts a file once per destination it appears under. "Adjacent" is
`widgetbook/test`, not in the row's behaviours. P3.6 is a capture PR with no
tests of its own to re-home.

## App goldens

The plan counts 92 app goldens pinning whole screens. Measured, they are the
PNGs directly under `test/goldens/baseline`, and most do not pin a screen.
Nothing outside `test/goldens` is compared against a golden.

| PNGs | Where | Compared by | Pins | What happens |
|---:|---|---|---|---|
| 6 | `test/goldens/baseline/profile_redesign*` | `test/goldens/profile_view_test.dart` | legacy `ProfileBody` in `lib/swipes/shared/profile_surface` | delete with P6 after |
| 2 | `test/goldens/baseline/entity_materials*` | `test/goldens/entity_material_test.dart` | legacy `OrganizerPlaceholderCover` in `lib/organizers/shared` | delete with `lib/pages/organizer`, or move if the cover becomes a `catch_ui` component |
| 8 | `test/goldens/program_screens/` | four `widgetbook/test/program_*` tests | legacy program screens | delete with P5 programmes; three of those tests also pin behaviour, listed there |
| 2 | `test/goldens/baseline/design_system_sheet*` | `test/goldens/design_system_sheet_test.dart` | tokens and `lib/contexts/events/parts` | stays; regenerated by the tokens PR |
| 82 | the rest of `test/goldens/baseline/` | 21 family tests under `test/goldens/` | `catch_ui` component sheets | stays |
| 1,300 | `test/goldens/baseline/widgetbook/` | `widgetbook/test/primitive_goldens_test.dart` | the `catch_ui` corpus | stays; see the blind spot below |
| 4 | `test/goldens/design_handoff/` | nothing | no test or tool references them | orphaned reference images |

That is 1,404 PNGs under `test/goldens`, matching the brief's total. The 15 PNGs
under `artifacts/marketing` and `artifacts/store` are marketing outputs. No test
compares against them, so they are not goldens.

**So 16 goldens die with a screen.** Two consequences for the plan. Its gate
"`test/goldens` outside `catch_ui` empty" cannot pass by deleting screens: the 21
family tests and their 82 baselines live at the repo root and have to move into
`packages/catch_ui`. And the 1,300 corpus images are not all clean library shots:
134 sit outside the core and geometry groups (58 are named `p1_product_surfaces`
or `p3_utility_surfaces`), and 27 Widgetbook source files in the folders the
corpus draws on import legacy code. A screen PR that deletes a widget those files
use will break their use cases, and any goldens they feed. How many of the 134
that reaches was not resolved here.

## Files shared by destinations

These appear under more than one destination. Delete only your own cases.

17 files.

| File | Behaviours per destination |
|---|---|
| `test/hosts/host_operations_screen_test.dart` | P3.1 today 6, P3.5 insights 4, P5 events 2, P5 people 44, P5 organizer 34 |
| `test/explore/explore_widgets_test.dart` | P5 onboarding 4, P6 explore 52, shared lib/pages/organizer 17 |
| `test/event_success/event_success_live_screens_test.dart` | P3.4 live 15, P3.5 insights 4, P5 events 3, P5 live/formats 9, P6 live 25 |
| `test/chats/chat_screen_test.dart` | P5 people 8, P6 chats 34 |
| `test/auth/presentation/auth_controller_test.dart` | P5 onboarding 1, P6 onboarding 39 |
| `test/organizers/organizers_controllers_test.dart` | P5 organizer 4, P5 onboarding 9, shared lib/pages/organizer 27 |
| `test/hosts/host_create_event_screen_test.dart` | P3.2 events/create 30, P5 events 9 |
| `test/events/events_widgets_test.dart` | P3.2 events/create 3, P6 explore 2, shared lib/pages/event 16 |
| `test/chats/chat_inbox_screen_test.dart` | P5 people 6, P6 chats 13 |
| `test/auth/presentation/auth_screen_test.dart` | P5 onboarding 2, P6 onboarding 12 |
| `test/reviews/reviews_widgets_test.dart` | shared lib/pages/event 6, P6 you 7 |
| `test/routing/router_widgets_test.dart` | P3.2 events/create 1, P5 people 5, P6 onboarding 1, P6 chats 3 |
| `test/architecture/keep_alive_provider_lifecycle_test.dart` | P6 onboarding 2, P6 explore 3, P6 live 2, P6 chats 2 |
| `test/routing/router_redirect_test.dart` | P3.0 shell 8, P3.2 events/create 1 |
| `test/routing/app_shell_guest_cta_test.dart` | P3.0 shell 1, P6 chats 1, P6 you 1 |
| `test/core/forms/contract_alignment_test.dart` | P5 organizer 1, P6 you 1 |
| `test/hosts/host_wizard_step_header_test.dart` | P3.2 events/create 1, P5 onboarding 1 |


## Method and blind spots

### How the universe was found

A file is in the universe when at least one of its test cases reaches a symbol
declared in a legacy folder of the plan's Appendix B, or in
`lib/routing/shell/{host_app_shell,adaptive_tab_scaffold}` or `lib/routing/host_*`
(which P3.0 replaces). "Reaches" is computed, not assumed from the folder: a
scanner collects every top-level symbol of the legacy files a test imports,
directly or through a helper, then follows local helpers and shared variables
until it can say whether a case's body touches one. So
`test/hosts/host_response_query_test.dart` is in, but only five of its ten cases
count; the other five test `lib/contexts/forms` and survive.

Excluded even where they import legacy code: `test/tool`, `test/tooling`,
`test/lint_contracts` and `test/integration`. They use a legacy path as a lint
fixture, or they are the journey suites the plan keeps. A lint fixture that names
a deleted file still has to be repointed by that PR's own checks.
`test/ui_captures` is included and labelled layout as a folder rule: it renders
routes for review and its fixtures carry no product rule. The one exception is a
case asserting production draft restore.

### How each label was decided

Every case got a rule-based label from what it asserts:

| Case | Label |
|---|---|
| plain `test()` | behaviour |
| asserts a fake's recorded call, a route, semantics, provider state or a callback-bearing widget property | behaviour |
| taps or types, then asserts anything | behaviour |
| finds by text, type or key only, and its name states a condition (when, without, error, empty, loading, hidden, denied…) | behaviour |
| the same, with no condition in its name | layout |
| geometry, style properties, golden comparison or "does not throw" only | layout |
| reads repository source files | layout |

A file is behaviour when all its legacy cases are, layout when none are, and
mixed otherwise. Then the digest was read and 225 cases were changed by hand
([Appendix C](#appendix-c-hand-decisions)): overwhelmingly widget tests of
geometry the rules had called behaviour, and text-only tests that pin a rule
with no condition word in their name. Each file's line in the sections below
records whether hand decisions touched it.

### What was actually read

- **All 3,089 universe cases and the 18 adjacent files, at case level.**
  The digest shows each case's name and label. Widget cases also show up to their
  first three assertions in compressed form; unit cases show the name only.
- **12 files at source level, as a check.** 8 end to end
  and 4 by their test bodies, marked in the sections below: 6 of the 26
  layout files (23%, against the 10% asked for) and 6 behaviour or mixed files
  across the destinations. Two of their 32 cases changed label, about 6%. Expect
  a similar rate elsewhere.
- **Not read line by line:** the rest of the 388 behaviour and mixed files.
  The brief asked for this. At 149,532 lines it was not done, and this is the
  main limit on the document.

### Known blind spots

- **Labels lean towards behaviour.** Losing a pinned rule is worse than one extra
  look, so the rules and the hand pass both kept doubtful cases. Some listed
  behaviours will turn out to be layout; drop those when you reach them.
- **Names can overstate.** A bullet says what the test claims. The check found
  `Back to home button pops to root` asserting only that the button exists. That
  one is labelled layout, but others like it will have passed.
- **Assertions in helpers are not expanded.** `_expectSomething(tester)` counts as
  a helper call. `test/user_profile/form_profile_review_widget_test.dart` hides
  its whole check in `_readable`.
- **Loops count once.** A parameterised case is one bullet however many values it
  runs. `test/design/public_surface_behavior_test.dart` is the extreme: one bullet,
  driven by 92 rows of `design/public_surface_behavior.json` covering Explore, the
  map, organizer and event detail, event location and route guards. It sits under
  `lib/pages/event`, and any packet touching those surfaces should read it.
- **Reachability is by name, with no analyzer.** A helper that touches a legacy
  symbol taints every case calling it, so a few context tests may read as legacy.
  A case reaching legacy code only through a provider override it never names
  reads as context-only. Check Appendix A before relying on a file.
- **Only pinned behaviour is visible.** A rule with no test does not appear, and
  this says nothing about whether a test is correct.
- **`test/integration` is untouched by this list.** Those suites find screens by
  text and key, so redrawing a screen will break them. The plan's "stay green" is
  separate work for each screen PR.

### Judgement calls on destinations

Where the plan's rows do not settle it, these were chosen, and a packet writer
can move a section:

- `event_assistance_*` goes to P3.4 live (the `LiveNeeds` board). Its twins in
  `lib/event_rehearsal` go to P5 events with the rest of Rehearsal.
- `event_attendance_*` goes to P5 events (`EventAttendance`), not the door.
- Attendee message consent (`event_sms_preference`, `event_sender_preference`,
  `event_message_preferences`) goes to P6 live.
- Rotation, pod and reveal controls go to P5 live/formats; the rest of the host
  console stays in P3.4.
- Event-success setup screens go to P5 events (`EventSetup`). Host reports go to
  P3.5.
- Create-organizer goes to P5 onboarding, edit-organizer to P5 organizer.
- `lib/force_update` has no row, so it goes to `lib/pages/startup`, since both
  apps show it. `lib/image_uploads`, `lib/user_analytics` and
  `lib/host_memberships` go to P6 you.
- Re-home targets follow the same rule table throughout; a controller test is
  `action` and a state or view-model test is `domain`.

## Behaviours by destination

### P3.0 shell

`apps/host/lib/shell`. 24 behaviours: 8 domain, 5 body, 11 journey.

**`test/core/app_shell_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/routing/shell/adaptive_tab_scaffold.dart` · decided by rules

- `journey` AdaptiveTabScaffold: suppresses floating navigation without reparenting a focused editor

**`test/routing/app_shell_guest_cta_test.dart`** — behaviour · subject `lib/routing/shell/adaptive_tab_scaffold.dart` · decided by rules · also under P6 chats, P6 you

- `body` FCM completion does not rebuild the keyed consumer navigation shell

**`test/routing/host_navigation_workspace_test.dart`** — behaviour · subject `lib/routing/host_navigation_workspace.dart` · decided by rules

- `journey` {destination} preserves {view} through the real shell at {width}
- `body` navigator anchor does not mount a second production index
- `journey` every Host named route belongs to one of the five workspace branches
- `journey` Audience {view} keeps its detail slot before data loads
- `journey` all declared Host parents form complete acyclic paths in their own workspace
- `body` routed editor previews join the outer strip and never become compact destinations
- `journey` legacy Audience submission links resolve to typed routes with the person parent
- `journey` routed panes keep index state, nested Back and push results across widths

**`test/routing/host_shell_navigation_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/routing/shell/host_app_shell.dart` · decided by rules

- `body` real Host shell owns the lifecycle IA and switches branches
- `body` Audience Forms draft survives destination changes and shell reflow

**`test/routing/host_workspace_review_regression_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart`, `lib/chats/presentation/event_chat_screen.dart` · decided by rules

- `journey` expanded Manage can open Guests twice and retain both drafts
- `journey` Manage Chat {destination} keeps organizer and ancestor state
- `journey` Manage Chat Participants person keeps organizer and Manage state
- `journey` direct {destination} Back reaches its contextual parent

**`test/routing/router_redirect_test.dart`** — behaviour · subject `lib/routing/host_legacy_redirects.dart` · decided by rules · also under P3.2 events/create

- `domain` Host organizer routes: legacy Host root redirects to Today
- `domain` Host organizer routes: legacy event operator links redirect onto the work shell
- `domain` Host organizer routes: legacy application links redirect into Audience ownership
- `domain` Host organizer routes: retired application directories preserve filters in Responses
- `domain` Host organizer routes: legacy application detail links still open the exact application
- `domain` Host organizer routes: legacy Customers and Forms links preserve deep-link state
- `domain` Host organizer routes: redirects the retired Organizer Audience tab into Audience
- `domain` Host organizer routes: organizer index opens the primary organizer workspace

Layout only, deleted with the screen:

- `test/ui_captures/capture_runner_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `test/ui_captures/host_composition_regression_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules, read end to end


### P3.1 today

`apps/host/lib/today`. 82 behaviours: 26 domain, 9 action, 26 body, 21 journey.

**`test/hosts/host_operations_screen_test.dart`** — mixed (30 layout cases go with the screen) · subject `lib/hosts/today/presentation/host_today_screen.dart`, `lib/hosts/today/presentation/widgets/host_today_overview.dart` · decided by rules, 1 by hand · also under P3.5 insights, P5 events, P5 people, P5 organizer

- `journey` Host Today uses real countdown and routes cross-event tasks
- `journey` Host Today opens a live spotlight in the run-of-show
- `body` Host Today follows the shared organizer selection
- `journey` Host Today delegates creation and opens event manage
- `body` Host Today owns the dedicated dress rehearsal entry point
- `journey` Host Today opens smart event entry from its quiet state

**`test/hosts/today/host_today_feed_controller_test.dart`** — behaviour · subject `lib/hosts/today/presentation/host_today_feed_controller.dart` · decided by rules

- `action` Today fetches its bounded feed without the Events controller
- `action` Today remains available when optional history fails
- `action` Today merges server tasks with the local attendance outbox
- `action` Today exposes incomplete attention sources without dropping events

**`test/hosts/today/host_today_progressive_feed_test.dart`** — behaviour · subject `lib/hosts/today/presentation/host_today_feed_controller.dart` · decided by rules, 1 by hand

- `body` available event renders while {held} remains pending
- `body` empty active feed is not quiet while {held} is pending
- `body` {held} failure keeps the event and exposes an error
- `body` independent sources start before active events settle
- `body` settled sources render real events and exact task coverage
- `body` preserves progressive results in {first}, {second}, {third} completion order
- `body` active source failure never becomes a quiet empty feed
- `body` same-turn optional payloads {variant} active survive the initial build publication
- `body` same-family retry ignores old {held} {variant}
- `action` disposed feed ignores held {held} {variant}
- `body` active error remains terminal after late optional {variant}
- `body` optional errors before active failure stay handled
- `body` synchronous active failure still starts each independent read once
- `body` empty feed waits for history before restoring Focus
- `body` empty history error exposes retry and can recover to quiet

**`test/hosts/today/host_today_refresh_lifecycle_test.dart`** — behaviour · subject `lib/hosts/today/presentation/host_today_screen.dart` · decided by rules

- `journey` task push/pop refreshes the retained Today projection
- `body` tab return observes another actor task on the retained Today
- `journey` embedded event return refreshes the retained Today projection
- `body` resume refreshes server tasks without remounting Today
- `body` minute timer rebuilds retain the boundary without fetch loops
- `body` existing {failure} retry refreshes the retained feed
- `journey` existing event entry return refreshes the retained feed
- `body` detached-to-resumed notification does not refetch
- `body` duplicate route and resume notifications do not refetch
- `body` resume while another destination covers Today waits for return
- `body` retry retires a pending evaluation of the same Today family
- `body` leaving the workspace retires a held create continuation
- `journey` retained create callback rejects old {scope} {variant} while current callback works
- `journey` held create choice rejects old {scope} {variant} continuation
- `journey` held create route refreshes only current {scope} {variant} on return
- `body` held old {scope} {variant} {variant} cannot affect current Today

**`test/hosts/today/host_today_state_test.dart`** — behaviour · subject `lib/hosts/today/presentation/host_today_state.dart` · decided by rules

- `domain` Today route state exhaustively maps auth and organizer branches
- `domain` Today prioritizes live work and maps the projected queue
- `domain` Today keeps non-event attention visible without a spotlight
- `domain` Today has display copy for every deliverable attention kind
- `domain` Today preserves partial attention failures beside event content
- `domain` Today maps loading, error, and empty history context

**`test/hosts/today/personalization/host_today_personalization_state_test.dart`** — behaviour · subject `lib/hosts/today/personalization/presentation/host_today_personalization_state.dart` · decided by rules

- `domain` first quiet visit offers orientation, skip does not ask again
- `domain` {entry} changes the primary action and roadmap order
- `domain` CRM add action requires evidence that the audience milestone is incomplete
- `domain` unknown evidence does not become incomplete or completed setup
- `domain` public page and payments are independent, optional milestones
- `domain` roadmap is immutable and practice remains useful after completion
- `domain` {status} always outranks orientation and adoption actions
- `domain` attention failures prevent a false quiet orientation or next action
- `domain` featured and later events cannot be masked by an inconsistent empty flag

**`test/hosts/today/personalization/host_today_personalized_view_test.dart`** — behaviour · subject `lib/hosts/today/presentation/host_today_state.dart`, `lib/hosts/today/presentation/host_today_feed_controller.dart` · decided by rules

- `journey` first quiet visit opens full-screen focus and close persists skip
- `journey` selection returns to personalized quiet Today
- `journey` failed focus save shows one error and leaves the choice retryable
- `journey` organizer presence action retains the selected organizer
- `journey` operational uncertainty does not read or offer optional focus
- `journey` operational work appearing closes optional focus without recording skip
- `journey` direct focus route yields to operational work
- `journey` direct focus route waits for known quiet without reading preferences
- `journey` direct focus route yields to a failed operational feed
- `journey` system back persists the first-run skip
- `journey` saved skip does not reopen focus on a later visit

**`test/hosts/today/personalization/host_today_preference_controller_test.dart`** — behaviour · subject `lib/hosts/today/personalization/presentation/host_today_preference_controller.dart` · decided by rules

- `action` selection and skip persist and refresh the read model
- `action` double submit freezes one captured choice until persistence completes
- `action` failed persistence retains the old preference and allows retry
- `action` a stale account scope cannot persist a preference

**`test/hosts/today/personalization/host_today_roadmap_provider_test.dart`** — behaviour · subject `lib/hosts/today/personalization/presentation/host_today_roadmap_provider.dart` · decided by rules

- `domain` scoped provider: a stale account does not subscribe to organizer data
- `domain` scoped provider: cached identity while loading or failed cannot authorize reads
- `domain` scoped provider: missing or unavailable membership does not read CRM or payouts
- `domain` scoped provider: an authorized cohost reads CRM but not owner payment accounts
- `domain` scoped provider: pending evidence updates from real results and clears on sign-out
- `domain` rehearsal summary failures stay unknown and success is authoritative
- `domain` unknown dependencies are not treated as completed or empty
- `domain` only authoritative customer counts establish audience completion
- `domain` public website requires both publication and a canonical route
- `domain` cohost payment capability is not confused with organizer owner readiness
- `domain` payout completion needs this owner to be ready to accept payments

Layout only, deleted with the screen:

- `test/hosts/today/personalization/host_today_visual_test.dart`: 2 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand


### P3.2 events/create

`apps/host/lib/events/create`. 138 behaviours: 40 domain, 47 action, 5 parts, 39 body, 7 journey.

**`test/events/events_widgets_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/events/presentation/event_detail_view_model.dart`, `lib/hosts/presentation/event_management/widgets/when_step.dart` · decided by rules · also under P6 explore, shared lib/pages/event

- `body` Events widgets: basic input widgets render their states and handle taps
- `body` Events widgets: when step renders schedule validation text
- `body` Events widgets: stepper footer fades scrolling content without restoring dock chrome

**`test/events/location_picker_screen_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/events/presentation/location_picker_screen.dart` · decided by rules

- `body` LocationPickerScreen: starts without a selection
- `body` LocationPickerScreen: initial center does not count as a selected location
- `body` LocationPickerScreen: updates the selected point when the map callback fires
- `journey` LocationPickerScreen: uses the initial location and confirms it through navigation
- `body` LocationPickerScreen: searches places and uses the selected place coordinates
- `body` LocationPickerScreen: uses shared offline copy when place search fails offline
- `body` LocationPickerScreen: uses shared offline copy when place details fail offline
- `body` LocationPickerScreen: shows immediate feedback while loading selected place details

**`test/hosts/create_event_draft_repository_seam_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/create_event_draft_controller.dart` · decided by rules

- `action` create uses the generated repository override and exact snapshot
- `action` update forwards the journal request and replay receipt unchanged
- `action` get uses the override and retains organizer and event identity
- `action` {operation} preserves repository errors without retrying
- `action` disposed and replacement containers keep pending commands separate

**`test/hosts/create_event_guests_section_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/widgets/create_event_guests_section.dart` · decided by rules

- `parts` optional booking details remain toggleable: {source}

**`test/hosts/create_event_prefill_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/create_event_prefill.dart` · decided by rules

- `domain` repeat prefill copies safe form values and requires a new date
- `domain` repeat preserves the explicit member review exemption
- `domain` members-only source is not exposed as repeatable
- `domain` repeating an imported event preserves mode but not the old guest source
- `domain` repeat prefill preserves composable route operations
- `domain` lossy custom pricing policy is not exposed as repeatable

**`test/hosts/create_event_saved_venue_state_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/create_event_location_state.dart` · decided by rules

- `domain` saved venue fills exact location and suggests capacity when empty
- `domain` saved venue never overwrites an existing draft capacity
- `domain` moving the map pin clears saved venue provenance
- `domain` event-specific name and directions remain editable snapshots
- `domain` draft restore preserves saved venue provenance and exact location

**`test/hosts/create_event_success_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/create_event_success_screen.dart` · decided by rules

- `body` dispatches the event-created celebration effect once

**`test/hosts/event_age_range_field_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/widgets/event_age_range_field.dart` · decided by rules, 1 by hand

- `parts` event age range maps slider endpoints to policy sentinels
- `parts` event age range follows externally restored controller values

**`test/hosts/event_guest_details_section_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart` · decided by rules

- `parts` guest notes save, clear and reload at large text (dark={dark})

**`test/hosts/event_policy_dependency_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/event_management/create/create_event_policy_state.dart`, `lib/hosts/presentation/event_management/create/create_event_form_keys.dart` · decided by rules, 1 by hand

- `body` admission and pair controls own their applicable children
- `body` inactive invalid draft fields do not validate or disappear from controllers
- `body` external booking removes every Catch booking descendant

**`test/hosts/host_create_event_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/create_event_controller.dart` · decided by rules

- `action` CreateEventController.submit: creates an event with a generated id and normalized fields
- `action` CreateEventController.submit: uploads multiple event photos in the submitted order
- `action` CreateEventController.submit: retains the committed event when a later upload fails
- `action` CreateEventController.submit: sends enabled event-success defaults through createEvent
- `action` CreateEventController.submit: creates an external companion with runtime provenance
- `action` CreateEventController.submit: uses event capacity when normalizing pub quiz team defaults
- `action` CreateEventController.submit: allows zero distance for non-distance event formats
- `action` CreateEventController.submit: passes invite codes for invite-only events
- `action` CreateEventController.submit: rejects invalid create-event inputs before touching the repository
- `action` committed event photo recovery integration: failure at {failAt} retries media on the committed event
- `action` committed event photo recovery integration: ordinary retry recovers a failed unsent-request sidecar swap
- `action` committed event photo recovery integration: replaced request clears cached selection across ordinary retries
- `action` committed event photo recovery integration: ordinary retry adopts same-request background completion
- `action` committed event photo recovery integration: attachment completion survives presentation refresh failure
- `action` committed event photo recovery integration: background completion survives reentry until departure and removes only its source draft
- `action` committed event photo recovery integration: saved identity is visible and durable before a blocked upload
- `action` committed event photo recovery integration: restart replays exact timestamps after lost attachment acknowledgement
- `action` committed event photo recovery integration: cleanup failure survives restart and missing bytes require reselection
- `action` committed event photo recovery integration: storage failure after commit keeps identity and uploads no bytes
- `action` committed event photo recovery integration: create acknowledgement across account change ABA={switchBack} is metadata only
- `action` committed event photo recovery integration: oversized unsent gallery can reselect fewer photos on the saved event
- `action` committed event photo recovery integration: disposed create controller retains only the acknowledged receipt

**`test/hosts/host_create_event_screen_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/hosts/presentation/event_management/host_create_event_screen.dart` · decided by rules, 1 by hand · also under P5 events

- `body` activity selection stays compact and changes the saved format
- `journey` route operations adapt across walks, crawls, and custom events
- `body` adds a real run-of-show entry
- `action` leaving nondurable photo recovery requires an explicit choice
- `action` photo recovery reentry preserves saved identity and requests missing bytes
- `action` unknown attachment reentry keeps objects, conflict={conflict}
- `body` inactive saved event reentry is honest: {status}
- `body` account ABA hides saved event and fences recovery until reentry
- `journey` picks a map location and handles back navigation
- `body` fills the location name from a Google place selection
- `body` saved place fills the editable Where fields in one tap
- `body` CreateEventScreen: basics disclosures start collapsed, share one accordion, and color activity chips
- `body` CreateEventScreen: route blocks users outside the club host team
- `body` CreateEventScreen: route hydrates the private create flow from initial club extra
- `body` CreateEventScreen: route rejects an initial club that disagrees with its path
- `journey` CreateEventScreen: walks through the wizard, validates rules, submits, and pops
- `body` CreateEventScreen: live guide uses capacity-aware pub quiz team plan
- `action` CreateEventScreen: custom event format persists label and structure
- `body` CreateEventScreen: invite-only creation copy says the event is listed but booking-gated
- `body` CreateEventScreen: shows the past-time validation, clears it on repick, and renders mixed durations
- `body` CreateEventScreen: restored past schedule draft shows validation error
- `body` CreateEventScreen: shows the submission error banner when creation fails
- `body` CreateEventScreen: keeps create-event backend diagnostics out of the banner
- `body` CreateEventScreen: draft picker deletes persisted drafts and resumes another
- `action` CreateEventScreen: repeat prefill stays separate from persisted draft state
- `action` custom format can be created with its optional label skipped
- `action` runtime-only creation needs no roster or presentation and ignores hidden booking rules
- `body` allows sections to be completed out of order
- `body` external guest-list creation preserves the mapped source and removes Catch payment policy
- `journey` stays open when save draft and exit fails

**`test/hosts/host_create_event_state_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/host_create_event_route_state.dart` · decided by rules

- `domain` CreateEventDraftSnapshot signature includes dirty-only fields
- `domain` HostCreateEventRouteState prefers route extra club
- `domain` HostCreateEventRouteState maps fetch states
- `domain` HostCreateEventRouteState blocks non-host identities
- `domain` CreateEventWizardState maps step, footer, and mutation display state
- `domain` CreateEventWizardState maps success and clamps invalid step index
- `domain` CreateEventWizardStep maps canonical form specs
- `domain` CreateEventWizardValidationPlan maps form and schedule policy
- `domain` CreateEventWizardState maps global close intents
- `domain` CreateEventWizardReviewState gates only required sections
- `domain` external event review {scenario}
- `domain` CreateEventPolicyState maps defaults, transitions, and drafts
- `domain` CreateEventPolicyState builds defaults and event policy bundles
- `domain` CreateEventScheduleState maps initial picker time
- `domain` CreateEventScheduleState maps picker result transitions
- `domain` CreateEventScheduleState validates future start time
- `domain` CreateEventScheduleState maps duration bounds and transitions
- `domain` CreateEventPhotoDraftState caps, previews, removes, and reorders
- `domain` CreateEventLocationState maps picker selection and payload
- `domain` CreateEventDraftActionState maps dirty state and save policy
- `domain` CreateEventDraftSideEffectState maps load and delete intents
- `domain` CreateEventDraftRestoreState maps draft fields and stale values
- `domain` CreateEventDraftRestoreState marks restored past schedule invalid
- `domain` CreateEventDraftSnapshot maps serializable draft fields

**`test/hosts/host_wizard_step_header_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_wizard_step_header.dart` · decided by rules · also under P5 onboarding

- `parts` event review hides progress and keeps the close action

**`test/hosts/private_event_create_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_create_screen.dart` · decided by rules

- `action` inline return waits for a matching manager read after receipt
- `body` {status} past private event reopens without setup actions
- `domain` restores canonical and legacy local draft times
- `body` trusted organizer read binds inherited basics to server hash
- `journey` one first-save request opens the private setup workspace
- `action` lost response retries the persisted body after reopening
- `action` manager read reopens a saved event and replays a lost edit
- `body` failed manager reread blocks stale setup until retry succeeds
- `body` saved setup action remains reachable at 360px and 2x text

**`test/hosts/private_event_details_provider_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_details_controller.dart` · decided by rules

- `domain` state notifies subscribers and is isolated by event scope
- `domain` account change fences the old scope even when the account returns
- `domain` disposing during an awaited load does not write into dead state

**`test/hosts/private_event_details_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_details_screen.dart` · decided by rules

- `body` narrow 2x details sends actual {actionKind}

**`test/hosts/private_event_details_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_details_controller.dart` · decided by rules

- `action` photo upload locks duplicate edits and retries the exact attachment
- `action` lost response, revocation and reopen replay one exact journaled command
- `action` failed details reread disables stale editing
- `action` wrong-identity reread never unlocks another event after save
- `action` guest reconciliation resumes the exact admission command after restart
- `action` bounded automatic guest checks preserve a resumable command
- `action` only exact stale review clears admission command: {definitive}
- `action` switching accounts during progress stops further requests
- `action` discard intent survives a lost response and restart
- `action` a raced apply switches discard retry back to original save

**`test/routing/router_redirect_test.dart`** — behaviour · subject `lib/routing/host_legacy_redirects.dart` · decided by rules, 1 by hand · also under P3.0 shell

- `journey` Host organizer routes: GoRouter keeps the canonical create-event child route

**`test/routing/router_widgets_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/host_create_event_screen.dart`, `lib/hosts/presentation/event_management/create/private_event_create_screen.dart` · decided by rules · also under P5 people, P6 onboarding, P6 chats

- `body` create-event route fetches the club when no extra is available

**`test/ui_captures/fixtures/host_marketing_india_fixture_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/event_management/create/create_event_draft_restore_state.dart`, `lib/hosts/presentation/event_management/create/create_event_policy_state.dart` · decided by rules

- `domain` production draft restore preserves explicit civil date/time in the process timezone

Layout only, deleted with the screen:

- `test/hosts/host_step_flow_composition_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand
- `test/hosts/route_path_builder_screen_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand


### P3.3 door

`apps/host/lib/door`. 24 behaviours: 5 domain, 4 action, 8 parts, 6 body, 1 journey.

**`test/events/attendance_sheet_screen_test.dart`** — behaviour · subject `lib/events/shared/attendance_sheet_view_model.dart` · decided by rules, 1 by hand

- `body` live mode keeps an empty roster inside the check-in board
- `body` setup mode keeps an empty roster inside the table
- `body` report mode keeps an empty roster inside the table
- `action` report export buttons share revenue and ops CSV files
- `body` shows branded loading while attendance data loads
- `body` shows branded error when attendance data fails
- `action` renders attendee profiles and toggles attendance
- `body` live mode scopes attendance pending state to one row
- `action` participants setup mode shows booked and waitlisted actions
- `journey` participants setup mode offers the next open waitlist spots
- `action` participants setup mode labels manual approvals as requests

**`test/events/event_check_in_qr_payload_test.dart`** — behaviour · subject `lib/events/shared/event_check_in_qr_scanner.dart` · decided by rules

- `domain` event check-in QR scan classifier keeps scanner plugin details hidden
- `domain` only a live venue-session QR yields attendance authority

**`test/hosts/host_event_check_in_qr_panel_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_event_participants_section.dart` · decided by rules, read end to end

- `parts` Host QR carries a live session while share remains static

**`test/hosts/host_event_roster_section_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_event_roster_section.dart` · decided by rules

- `parts` ordinary roster pane exposes content and commands at {width}

**`test/hosts/host_roster_import_sheet_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_roster_import_sheet.dart` · decided by rules

- `parts` overflow rows cannot submit a partial import
- `parts` duplicate buyer emails continue to explicit saved review
- `parts` an all-exception file can enter saved review
- `parts` phone import footer is reachable at text scale {scale}

**`test/hosts/host_roster_insight_filter_test.dart`** — behaviour · subject `lib/hosts/presentation/host_roster_insight_filter.dart` · decided by rules

- `domain` all includes rows while CRM filters fail closed for unavailable rows
- `domain` advocate filter includes ordinary and high-impact advocates
- `domain` top Catch spender never matches a merely known spender

**`test/hosts/host_roster_intake_review_sheet_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_roster_intake_review_sheet.dart` · decided by rules, 1 by hand

- `parts` explicit exclusion refreshes review before apply
- `parts` scope change immediately scrubs an open review

Layout only, deleted with the screen:

- `test/hosts/host_roster_primitives_test.dart`: 3 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules, read end to end


### P3.4 live

`apps/host/lib/live`. 242 behaviours: 54 domain, 149 action, 8 parts, 26 body, 5 journey; 2 more in `widgetbook/test`.

**`test/event_success/event_assistance_accountability_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_accountability_controller.dart` · decided by rules

- `action` rate limiting preserves an earlier uncertain request
- `action` no implicit disposition; clearing the choice and stale reviews prevent submission
- `action` reentrant and repeated triggers share one request and its verified result
- `action` an uncertain decision survives closing and reopening against a fresh page
- `action` an uncertain visit result stays shared across group and checkpoint reviews
- `action` unavailable visits remain reviewable without offering a write
- `action` a retry from the failure callback gets a new active future
- `action` unverified success remains uncertain until the exact request is confirmed
- `action` a definitive conflict requires fresh authority and a new operation
- `action` closed pending editor loses authority after {transition}
- `action` a late completion cannot restore the old account state
- `domain` loading, account changes and failed reads never expose old accountability
- `domain` equal scopes share a read and a later reload wins over an older completion

**`test/event_success/event_assistance_case_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_case_editor.dart` · decided by rules

- `action` starts without a decision and only exposes a legal submission
- `action` duplicate submits share one frozen command and lock the form
- `action` uncertain failures retain only the identical decision for retry
- `action` conflicts and revoked authority require reload instead of changed retries
- `action` a replay preserves later resolution instead of showing the old handoff
- `action` sign-out removes the entire form and returning to the UID cannot revive it
- `action` account switch during a submission cannot publish its old result
- `action` an observed request remains alive through its pending commit
- `action` a new page review replaces only an unsubmitted draft

**`test/event_success/event_assistance_case_pending_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_case_editor.dart` · decided by rules

- `action` closure and refreshed pages retain the same unresolved case decision
- `action` pending discovery survives an empty open queue
- `action` settling one case preserves discovery and retry for another
- `action` an unsubmitted draft cannot act after its page is retired
- `action` reentrant retry publishes exactly one new operation attempt
- `action` a detached uncertain request loses authority after {mode}
- `action` a foreign typed result stays uncertain instead of confirming this case

**`test/event_success/event_assistance_cases_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_cases_provider.dart` · decided by rules

- `domain` loading, sign-out and auth errors never expose prior private data
- `domain` manager choices for another caller never enter the queue
- `domain` old-account reads cannot publish into a different account
- `domain` same UID after sign-out starts a new review period and read
- `domain` equal queries share reads while cursors and statuses stay separate
- `domain` explicit reload wins over an older completion
- `domain` read errors persist until explicit reload, without automatic retries

**`test/event_success/event_assistance_checkpoint_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_controller.dart` · decided by rules

- `action` rate limiting preserves an earlier uncertain request
- `action` no implicit choice; invalid and obsolete selections cannot be submitted
- `action` reentrant and repeated triggers share one request and its verified result
- `action` an uncertain decision survives closing and reopening against a fresh page
- `action` correction explanation is required before dropping an earlier observation
- `action` a missing departure roster exposes its reason and cannot submit
- `action` a retry from the failure callback gets a new active future
- `action` unverified success remains uncertain until the exact request is confirmed
- `action` a definitive conflict requires fresh authority and a new operation
- `action` closed pending editor loses authority after {transition}
- `action` a late completion cannot restore the old account state
- `domain` loading, account changes and failed reads never expose old checkpoint
- `domain` equal scopes share a read and a later reload wins over an older completion

**`test/event_success/event_assistance_checkpoint_reporter_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_sheet.dart` · decided by rules

- `action` verified reporter selection retains the exact pending choice: practice={practice} scale={scale}

**`test/event_success/event_assistance_checkpoint_request_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_request_controller.dart` · decided by rules

- `action` explicit reload retires an unsubmitted request review
- `action` rate limiting preserves an earlier uncertain request
- `action` no implicit action and refreshed permission invalidates an unsubmitted choice
- `action` {runtimeType} deduplicates, verifies success and refreshes the shared report
- `action` uncertain action survives closure and fresh report without changing its identity
- `action` reentrant retry starts exactly one second request
- `action` unverified success retains the original action for reconciliation
- `action` definitive conflict refreshes authority and requires a new explicit action
- `action` closed pending action loses authority after {mode}
- `action` late completion cannot restore a retired account
- `domain` permission loading, failure and foreign caller never expose an actionable review
- `action` observer data readiness never creates manager or responsible reporter authority
- `domain` checkpoint refresh retires management review while shared arrival reads remain available

**`test/event_success/event_assistance_checkpoint_request_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_request_section.dart` · decided by rules

- `action` original request closes and reopens with exact retry: practice={practice} scale={scale}

**`test/event_success/event_assistance_checkpoint_section_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_section.dart` · decided by rules

- `parts` removing a saved observation requires an explicit correction
- `parts` unavailable names keep original observations without editable identity
- `parts` empty recorded roster is reportable; absent roster is unavailable

**`test/event_success/event_assistance_checkpoint_visit_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_sheet.dart` · decided by rules

- `action` original checkpoint guest outcome preserves arrivals and exact retry: practice={practice} scale={scale}

**`test/event_success/event_assistance_checkpoint_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_checkpoint_section.dart` · decided by rules

- `journey` history opens original report and retains unknown save: practice={practice} scale={scale}

**`test/event_success/event_assistance_deliveries_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_deliveries_provider.dart` · decided by rules

- `domain` loading, sign-out and auth errors never expose prior private data
- `domain` old-account reads cannot publish into a different account
- `domain` same UID after sign-out starts a new review period and read
- `domain` equal queries share reads while cursors and event scopes stay separate
- `domain` explicit reload wins over an older completion
- `domain` read errors persist until explicit reload, without automatic retries

**`test/event_success/event_assistance_delivery_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_delivery_controller.dart` · decided by rules

- `action` only a current page can open a review, and opening never submits
- `action` duplicate triggers share one frozen command and refresh the page after success
- `action` an uncertain request survives dismissal and only retries its exact command
- `action` page refresh cannot replace an unresolved command for the same message
- `action` definitive conflicts require a new page and new reviewed request
- `action` account changes remove private state and cannot revive an old review
- `action` unseen A to B to A changes while a request is pending discard its result
- `action` auth failure clears an uncertain request even with no remaining sheet listeners
- `action` a submission can finish after sheet dismissal without losing the receipt
- `action` different message actions and mutation keys remain independent
- `action` a retry triggered by the visible error receives a new active future
- `action` a result for another message cannot clear the pending handoff

**`test/event_success/event_assistance_delivery_pagination_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_delivery_queue_sheet.dart` · decided by rules

- `body` delivery cursor history ignores repeated and stale navigation taps

**`test/event_success/event_assistance_delivery_privacy_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_delivery_sheet.dart` · decided by rules

- `action` new source redaction and access loss override a frozen delivery review

**`test/event_success/event_assistance_delivery_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_live_delivery_section.dart` · decided by rules

- `journey` delivery evidence, detached handoff and late receipt: practice={practice} scale={scale}

**`test/event_success/event_assistance_departure_editor_lifecycle_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_editor.dart` · decided by rules

- `action` reentrant submitting notification shares the same future
- `action` reentrant roster-review notification shares the same future
- `action` unresolved save survives closure, query refresh and rate limiting
- `action` detached sign-out and same-UID return retire the unknown request
- `action` detached account change rejects a late successful response
- `action` retired review cannot prepare a new departure
- `action` roster review completing after a refresh cannot enable confirmation
- `action` malformed receipt remains unresolved and retries the original request

**`test/event_success/event_assistance_departure_editor_retry_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_editor.dart` · decided by rules

- `action` one pending save freezes all controls and deduplicates submissions
- `action` ambiguous failure retries the exact reviewed roster and checkpoint
- `action` conflict cannot rebase or retry until the host loads a new review
- `action` success refreshes group progress and existing Host assistance reads
- `action` account switch during save prevents success and never exposes the old form
- `action` switching away and back cannot revive or retry an old decision
- `action` a refreshed page preserves the unresolved departure until receipt

**`test/event_success/event_assistance_departure_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_editor.dart` · decided by rules

- `action` no destination or roster is inferred from opening the form
- `action` a reviewed empty roster remains explicit and enables checkpoint setup
- `action` changing selected people invalidates roster review and checkpoint
- `action` changing destination clears its checkpoint but preserves roster review
- `action` roster network failure allows retry without creating a departure
- `action` a failed roster refresh cannot fall back to the previous review
- `action` roster conflict requires new progress review without dropping selected people
- `action` an account switch during review removes the form and rejects completion

**`test/event_success/event_assistance_departure_history_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_history_provider.dart` · decided by rules

- `domain` auth loading, failures and sign-out hide all history
- `domain` late old-account and same-UID sign-in completions cannot restore history
- `domain` reload wins over delayed reads and failures require explicit retry
- `domain` equal queries share a read and older pages remain separate
- `domain` foreign account results are rejected even from a repository override

**`test/event_success/event_assistance_departure_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_provider.dart` · decided by rules

- `domain` loading and auth failures never expose departure controls
- `domain` equal scopes share a read; other groups have independent snapshots
- `domain` explicit reload wins over an older completion without automatic retry
- `domain` failed reads remain errors until an explicit reload

**`test/event_success/event_assistance_departure_section_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_section.dart` · decided by rules

- `action` omitted and explicitly empty rosters stay different: record={record}

**`test/event_success/event_assistance_departure_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_section.dart` · decided by rules

- `action` actual rehearsal runtime exposes group departure without a parallel runtime
- `action` departure freezes reviewed choices across closure: practice={practice} scale={scale}

**`test/event_success/event_assistance_group_staff_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_group_staff_controller.dart` · decided by rules

- `action` rate limiting preserves an earlier uncertain request
- `action` no implicit choice; invalid and obsolete selections cannot be submitted
- `action` reentrant and repeated triggers share one request and its verified result
- `action` an uncertain decision survives closing and reopening against a fresh page
- `action` another phone for the same verified UID cannot replace an uncertain decision
- `action` a lookup resolving to another account cannot open the reviewed target editor
- `action` a retry from the failure callback gets a new active future
- `action` unverified success remains uncertain until the exact request is confirmed
- `action` a definitive conflict requires fresh authority and a new operation
- `action` closed pending editor loses authority after {transition}
- `action` a late completion cannot restore the old account state
- `domain` loading, account changes and failed reads never expose old staff
- `domain` equal scopes share a read and a later reload wins over an older completion

**`test/event_success/event_assistance_help_pagination_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_help_queue_sheet.dart` · decided by rules

- `parts` cursor history is bounded by status and ignores repeated stale taps

**`test/event_success/event_assistance_help_privacy_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_help_sheet.dart` · decided by rules

- `action` new source redaction and access loss override a frozen help review
- `journey` indistinguishable manager names cannot form a handoff

**`test/event_success/event_assistance_help_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_live_help_section.dart` · decided by rules

- `journey` named help handoff, detached retry and resolution: practice={practice} scale={scale}

**`test/event_success/event_assistance_host_guests_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_host_guests_provider.dart` · decided by rules

- `domain` loading, sign-out and auth failures do not read or retain guest data
- `domain` account changes immediately hide a loaded previous account
- `domain` old account completion cannot publish into the new account
- `domain` sign-out during a read never publishes the completed old response
- `domain` equal selections share reads and distinct selections remain independent
- `domain` reload starts a fresh read without letting an older completion win
- `domain` unavailable reads stay visible and explicit reload recovers
- `domain` successful participation commands refresh the assistance read

**`test/event_success/event_assistance_late_join_configuration_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_late_join_sheet.dart` · decided by rules

- `action` custom controls update the exact typed preference only on save

**`test/event_success/event_assistance_late_join_setting_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_late_join_setting_provider.dart` · decided by rules

- `domain` loading, sign-out and authentication failures remove private state
- `domain` delayed old-account reads and same-UID re-entry cannot restore a prior review
- `domain` event and group reads are isolated and explicit refresh fences older completion
- `domain` a repository cannot substitute another group review
- `action` suggestions require an explicit choice; duplicate saves share one frozen request
- `action` uncertain saves retain the request and reject edits until exact retry
- `action` a conflict requires new review, never a rebased retry
- `action` an account change revokes the prior decision even when its save completes
- `action` a retired settings page cannot authorize a new choice or save
- `action` a hidden pending save survives page replacement and confirms the same command
- `action` a detached uncertain setting cannot survive {transition}
- `action` a response from another group remains uncertain at the state owner
- `action` a receipt naming another manager cannot acknowledge this host
- `action` retry from the visible error starts a new active future

**`test/event_success/event_assistance_late_join_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_late_join_section.dart` · decided by rules

- `action` custom rules survive mode changes and a closed uncertain save at {scale}
- `parts` sign-out hides an uncertain settings review and its recovery entry

**`test/event_success/event_assistance_membership_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_membership_controller.dart` · decided by rules

- `action` no implicit choice; invalid and obsolete selections cannot be submitted
- `action` reentrant and repeated triggers share one request and its verified result
- `action` an uncertain decision survives closing and reopening against a fresh page
- `action` a retry from the failure callback gets a new active future
- `action` unverified success remains uncertain until the exact request is confirmed
- `action` a definitive conflict requires fresh authority and a new operation
- `action` closed pending editor loses authority after {transition}
- `action` a late completion cannot restore the old account state
- `domain` loading, account changes and failed reads never expose old membership
- `domain` equal scopes share a read and a later reload wins over an older completion

**`test/event_success/event_assistance_membership_section_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_membership_section.dart` · decided by rules

- `parts` unidentified or absent receivers cannot form a handover
- `action` only reviewed {action} can be confirmed; scale={scale}

**`test/event_success/event_assistance_membership_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_membership_sheet.dart` · decided by rules

- `action` membership keeps its exact retry across dismissal: practice={practice} scale={scale}

**`test/event_success/event_assistance_participation_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_participation_editor.dart` · decided by rules

- `action` return points belong only to an explicit temporary break
- `action` ineligible guests cannot stage a participation change
- `action` no implicit choice; invalid and obsolete selections cannot be submitted
- `action` reentrant and repeated triggers share one request and its verified result
- `action` an uncertain decision survives closing and reopening against a fresh page
- `action` a retry from the failure callback gets a new active future
- `action` unverified success remains uncertain until the exact request is confirmed
- `action` a definitive conflict requires fresh authority and a new operation
- `action` closed pending editor loses authority after {transition}
- `action` a late completion cannot restore the old account state
- `action` authentication loss at submission cannot dispatch the old decision
- `domain` loading, account changes and failed reads never expose old participation
- `domain` equal scopes share a read and a later reload wins over an older completion

**`test/event_success/event_assistance_runtime_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_runtime_provider.dart` · decided by rules

- `domain` loading, sign-out and authentication failures remove private state
- `domain` delayed old-account reads and same-UID re-entry cannot restore a prior review
- `domain` event reads are isolated and explicit refresh fences older completion
- `action` configuration requires an explicit choice; duplicate saves share one frozen request
- `action` uncertain saves retain the request and reject edits until exact retry
- `action` a conflict requires new review, never a rebased retry
- `action` an account change revokes the old review even when its save completes
- `action` a retired settings page cannot authorize a new choice or save
- `action` a hidden pending save survives page replacement and confirms the same command
- `action` a detached uncertain setting cannot survive {transition}
- `action` a response from another event remains uncertain at the state owner
- `action` a receipt naming another manager cannot acknowledge this host
- `action` retry from the visible error starts a new active future

**`test/event_success/event_assistance_runtime_senders_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_runtime_senders.dart` · decided by rules

- `action` explicit pages merge only their channel and become reviewed commands
- `domain` a {fault} change clears choices and requires a full review
- `domain` an empty filtered page retains its advancing continuation
- `domain` {transition} retires the directory and ignores delayed pages

**`test/event_success/event_assistance_runtime_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_runtime_section.dart` · decided by rules, 1 by hand

- `body` a replayed pause displays newer configured state honestly
- `journey` channels, optional limits and exact retry remain usable at {scale}
- `action` pause remains available with no eligible senders
- `body` sign-out removes a private pending review and recovery prompt

**`test/event_success/event_assistance_visit_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_visit_sheet.dart` · decided by rules

- `action` visit keeps its exact retry across dismissal: practice={practice} scale={scale}

**`test/event_success/event_success_control_room_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_room_map.dart` · decided by rules

- `body` restart mid-round resumes the correct persisted beat
- `body` Room workspace renders the saved map before placements exist
- `body` Room forwards initial selection and typed spatial actions
- `body` real Host room fixture forwards spatial callbacks through its shell

**`test/event_success/event_success_duration_shape_test.dart`** — behaviour · subject `lib/event_success/presentation/host_live/event_success_step_action_row.dart` · decided by rules, 1 by hand

- `parts` live navigation uses each duration shape vocabulary

**`test/event_success/event_success_exclusion_ledger_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_host_screen.dart`, `lib/event_success/presentation/event_success_host_workspace_page_body.dart` · decided by rules, 1 by hand

- `body` control room alert uses the configured threshold
- `body` control room stays quiet immediately before threshold

**`test/event_success/event_success_live_screens_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_live_effects_controller.dart` · decided by rules, 2 by hand · also under P3.5 insights, P5 events, P5 live/formats, P6 live

- `body` host hides phase navigation during the actual event window
- `body` host live keeps running and names a failed local resource
- `body` quiz points use distinct checked-in roster team names
- `body` host confirms presence changes before the next round
- `body` host live mode surfaces active wingman requests
- `body` host live mode shows the countdown reveal console
- `body` host live mode is unavailable until setup is saved
- `body` host live guide skips live streams until setup is saved
- `body` host section keeps real tabs while guide loads
- `domain` host section retains local provider failures
- `body` host live actions dispatch ceremony effects once per tap
- `body` missing callbacks disable actions without playing effects
- `body` pending step blocks competing actions and recovers after error
- `body` reveal callbacks retain arguments and await their effects
- `body` unresolved sweep warns while review and finish-anyway stay available

**`test/event_success/event_success_progress_cues_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_progress_status.dart` · decided by rules

- `domain` progress cue state resolves complete, current, and future positions

**`test/event_success/event_success_room_map_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_room_map.dart` · decided by rules

- `body` attendee map is read-only and keeps assigned distinct
- `body` tap placement exposes every outcome without precision drag
- `body` large Host surfaces add drag without replacing tap controls

**`test/hosts/host_event_live_location_field_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_event_live_location_field.dart` · decided by rules

- `parts` sharing is explicit and disposal clears the position

**`widgetbook/test/event_assistance_previews_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_membership_section.dart`, `lib/event_rehearsal/presentation/widgets/event_rehearsal_staff_edit_section.dart` · decided by rules · adjacent, not in the totals

- `parts` backend fixture asset mounts real staff, visit and group previews without Firebase

**`widgetbook/test/event_departure_previews_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assistance_departure_section.dart`, `lib/event_success/presentation/event_assistance_departure_roster_section.dart` · decided by rules · adjacent, not in the totals

- `parts` departure previews mount actual shared controls without Firebase

Layout only, deleted with the screen:

- `widgetbook/test/event_checkpoint_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent
- `widgetbook/test/event_delivery_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent
- `widgetbook/test/event_help_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent
- `widgetbook/test/event_late_join_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent
- `widgetbook/test/event_runtime_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent
- `widgetbook/test/host_component_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent


### P3.5 insights

`apps/host/lib/insights`. 19 behaviours: 5 domain, 14 body.

**`test/event_success/event_assistance_help_runtime_test.dart`** — behaviour · subject `lib/event_success/presentation/host_report/event_success_host_report_page_body.dart` · decided by rules

- `body` help and delivery review survive every report availability state after the event

**`test/event_success/event_success_live_screens_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_host_screen.dart`, `lib/event_success/presentation/event_success_companion_screen_state.dart` · decided by rules, 2 by hand · also under P3.4 live, P5 events, P5 live/formats, P6 live

- `body` host screen exposes setup live mode and report tabs
- `body` ended host report skips live streams and keeps scorecard data
- `body` host report remains available for legacy module selections
- `body` host report summarizes live signal quality

**`test/hosts/host_insights_scorecard_test.dart`** — behaviour · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules

- `body` Host Insights renders the narrative scorecard hierarchy
- `body` Host Insights handles empty trend and event ranges honestly
- `body` Host trend bucket tap reveals the exact pair detail
- `body` Coach links attendance advice to the latest event report
- `body` Coach links checkout advice to event defaults
- `domain` Coach attendance rule requires two events below sixty percent
- `domain` Coach checkout rule fires at thirty percent drop-off
- `domain` Coach demand rule names an event at twice its bookings
- `domain` Coach repeat rule requires three complete visible event rows
- `domain` Coach returns at most two recommendations in rule priority order

**`test/hosts/host_operations_screen_test.dart`** — mixed (30 layout cases go with the screen) · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules, 1 by hand · also under P3.1 today, P5 events, P5 people, P5 organizer

- `body` Host analytics trend renders every backend bucket
- `body` Host analytics loading does not invent report sections
- `body` Host presence distinguishes measured totals from missing {mode}
- `body` Host analytics permission denied does not display presence totals

Layout only, deleted with the screen:

- `test/ui_captures/organizer_insights_preview_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules


### P3.6 marketing

capture renders for the ads. 0 behaviours.


### P5 events

`apps/host/lib/events`. 305 behaviours: 61 domain, 183 action, 6 parts, 45 body, 10 journey.

**`test/design_system/surface_composition_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/hosts/presentation/widgets/host_event_reviews_panel.dart` · decided by rules, 2 by hand

- `body` review failure stays in the module and retry recovers to empty
- `body` pending reviews keep the module and do not show successful-empty copy

**`test/event_rehearsal/event_rehearsal_accountability_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_accountability_controller.dart` · decided by rules

- `action` one reviewed visit owns reentrant taps and confirmed completion
- `action` refresh and sheet closure preserve an uncertain request verbatim
- `action` a retry callback can start before the failed async stack unwinds
- `action` obsolete and foreign rows cannot be selected or sent by a generic editor
- `action` a definitive reset conflict requires a fresh review and a new request
- `action` an unverified result remains uncertain and preserves the request for retry
- `action` refresh during a pending visit decision still accepts its exact confirmed result
- `action` closed pending sheet revokes its request after {transition}
- `action` pending and error state is independent for each synthetic guest
- `action` a rate limit during an exact retry retains the uncertain decision
- `action` late completion cannot restore private state after an account change

**`test/event_rehearsal/event_rehearsal_assistance_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart` · decided by rules

- `action` unverified provider success stays pending until a verified receipt
- `action` a detached pending owner observes sign-out and same-account sign-in
- `action` rate limit after an unknown outcome keeps the original request
- `action` reentrant submit shares the original future
- `action` help resolution keeps its reviewed case through an uncertain retry
- `action` {kind} uses its reviewed request receipt
- `domain` loading, signed-out and failed authentication expose no private review
- `domain` late old-account reads and foreign session projections cannot create a review
- `action` explicit refresh retires the prior review and ignores old pending reads
- `action` one selected command owns duplicate submissions and confirmed result
- `action` uncertain outcome retains exact payload and rejects another choice until resolved
- `action` closing and refreshing retain one unresolved command across reviews
- `action` a reset conflict requires a fresh review rather than a rebased retry
- `action` account change permanently revokes an editor even if its command completes
- `action` refresh does not discard a verified receipt for the original command
- `action` invalid actor selection clears the draft without a backend call

**`test/event_rehearsal/event_rehearsal_assistance_repository_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_controller.dart` · decided by rules

- `action` the existing action controller forwards the frozen practice change

**`test/event_rehearsal/event_rehearsal_connection_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart` · decided by rules

- `domain` a disconnected guest retains check-in and confirmed Room placement
- `domain` a connected phone cannot make expected or absent guests present
- `domain` legacy disconnected records do not regain attendance from a connection

**`test/event_rehearsal/event_rehearsal_delivery_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_delivery_controller.dart` · decided by rules

- `action` one reviewed message owns reentrant taps and confirmed completion
- `action` refresh and sheet closure preserve an uncertain request verbatim
- `action` a retry callback can start before the failed async stack unwinds
- `action` obsolete and foreign rows cannot be selected or sent by a generic editor
- `action` a definitive reset conflict requires a fresh review and a new request
- `action` an unverified result remains uncertain and preserves the request for retry
- `action` refresh during a pending handoff still accepts its exact confirmed result
- `action` closed pending sheet revokes its request after {transition}
- `action` late completion cannot restore private state after an account change

**`test/event_rehearsal/event_rehearsal_domain_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart` · decided by rules

- `domain` projects selected format, structure and copied roster into Host runtime
- `domain` parses a bounded isolated rehearsal projection
- `domain` projects rehearsal state into the canonical Host runtime

**`test/event_rehearsal/event_rehearsal_entry_integration_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_controller.dart`, `lib/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart` · decided by rules, 1 by hand

- `journey` Start submits the source configuration once and opens its runtime
- `action` custom guest count and event details reach creation and survive a failure
- `body` custom entry starts from organizer defaults

**`test/event_rehearsal/event_rehearsal_entry_provider_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_entry_view_model.dart` · decided by rules

- `domain` custom practice never reads an unrelated upcoming event roster
- `domain` explicit event failure remains an error, not sample defaults
- `domain` another organizer event is rejected before reading roster

**`test/event_rehearsal/event_rehearsal_entry_ui_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/event_rehearsal/presentation/widgets/event_rehearsal_entry_scaffold.dart` · decided by rules

- `body` edits survive Done and reset restores the selected source
- `body` invalid count stays in settings with a visible correction

**`test/event_rehearsal/event_rehearsal_help_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_help_controller.dart` · decided by rules

- `action` only reviewed managers are selectable and duplicate taps apply once
- `action` missing open rows and closed sheets preserve one exact uncertain retry
- `action` a parent receipt cannot hide a missing or different help outcome
- `action` exact retry retains a later resolution instead of restoring its handoff
- `action` detached sign-out and same-UID return cannot restore old authority

**`test/event_rehearsal/event_rehearsal_membership_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_membership_controller.dart` · decided by rules

- `action` {action} freezes its reviewed decision and verifies the exact receipt
- `action` reentrant state callbacks cannot submit a second group decision
- `action` invalid receiver, destination and deadline clear selection without dispatch
- `action` rows from another snapshot and the generic editor cannot bypass membership review
- `action` a receiver-specific projection from another account cannot be opened
- `action` unavailable membership exposes no executable selection
- `action` refresh fences first submission and stale selection
- `action` pending and error state is independent for each guest
- `action` completion retains explicit group cleanup without permitting a new placement

**`test/event_rehearsal/event_rehearsal_membership_pending_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_membership_controller.dart` · decided by rules

- `action` closure and refresh preserve the exact uncertain request and later membership
- `action` a callback can retry before the failed async stack unwinds
- `action` an unverified result retains the request rather than showing saved
- `action` a definitive conflict releases the pending request for a fresh review
- `action` a rate limit cannot erase an earlier uncertain decision
- `action` refresh during submission still accepts the matching receipt
- `action` closed pending sheet revokes its request after {transition}
- `action` late {outcome} cannot restore private state after an account change
- `action` reset generation gets a distinct controller and cannot replace the old pending request

**`test/event_rehearsal/event_rehearsal_movement_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_movement_controller.dart` · decided by rules

- `action` one group owns repeated and reentrant taps until its receipt is verified
- `action` closed sheet and refreshed history retain an uncertain request exactly
- `action` a retry callback can execute before the failed stack unwinds
- `action` a malformed success stays uncertain and stale reviews cannot create decisions
- `action` a definitive revision conflict requires a new review and request
- `action` a closed pending request is revoked after {transition}
- `action` an in-flight result cannot restore private state after sign-out
- `action` checkpoint and departure share the same pending group slot
- `domain` provider rejects a changed generation before requesting movement
- `domain` provider does not join a movement result from a different runtime snapshot
- `domain` auth loss between the two deliberate reads withholds the movement page
- `action` {after} retains the exact pending command through refresh

**`test/event_rehearsal/event_rehearsal_publication_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart`, `lib/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart` · decided by rules

- `action` publication binds current confirmed movement and the reviewed generation
- `action` predeparture automation freezes routes, plan and script through an uncertain retry
- `action` a separate movement snapshot cannot replace the reviewed source
- `action` refreshing movement retires a selected, unsubmitted instruction
- `action` a refreshed page cannot select a new plan from retired movement

**`test/event_rehearsal/event_rehearsal_runtime_operation_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_runtime_operation_controller.dart` · decided by rules

- `action` an uncertain outcome round resumes the exact unit command
- `action` a reveal retry preserves its decision and action ids
- `action` an invalid typed round is rejected before any unit is written

**`test/event_rehearsal/event_rehearsal_settings_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_settings_controller.dart` · decided by rules

- `action` double taps share one decision and success verifies its exact receipt
- `action` unknown save survives dismissal and cannot be replaced by another group
- `action` malformed success retains the original request for reconciliation
- `action` changed review retires editable choices and cannot retarget a rule
- `action` a detached pending owner observes same-UID sign-out and rejects old callbacks
- `action` the error callback can immediately start the exact retry

**`test/event_rehearsal/event_rehearsal_settings_widgets_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart` · decided by rules, 1 by hand

- `action` practice defaults, optional controls and exact retry at {scale}
- `action` practice deadline prerequisite is visible before Save: {withDeadline}
- `action` read-only practice cannot configure or pause

**`test/event_rehearsal/event_rehearsal_staff_controller_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_staff_controller.dart` · decided by rules

- `action` staff edit coalesces double taps and verifies the actual duty receipt
- `action` unknown outcome survives dismissal, refresh and another staff selection
- `action` malformed success keeps the exact staff request for reconciliation
- `action` definitive denial releases pending intent and requires current review
- `action` rate limiting cannot settle an unresolved staff save
- `action` refresh before submission cannot apply a stale draft
- `action` detached pending editor detects sign-out and same-UID sign-in
- `action` role selection is run-scoped and auth-epoch scoped
- `domain` role queries do not share Host data and reject an impersonated response
- `action` staff editor rejects a role-scoped review even for the real Host

**`test/event_rehearsal/event_rehearsal_staff_widgets_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart` · decided by rules, 1 by hand

- `action` practice team configures group, duty and expiry {dark} {scale}

**`test/event_rehearsal/event_rehearsal_visit_runtime_test.dart`** — behaviour · subject `lib/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart` · decided by rules, 2 by hand

- `domain` projection preserves recorded visits and never promotes messages into return proof
- `journey` real rehearsal runtime opens the shared visit action and retains sweep completion warning
- `journey` real rehearsal runtime opens one guest group review without changing attendance
- `journey` selected expired practice duty opens read-only controls and stays visible in the rehearsal strip

**`test/event_rehearsal/host_event_rehearsal_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_rehearsal/presentation/host_event_rehearsal_screen.dart` · decided by rules, 2 by hand

- `body` start screen makes the practice boundary and choices explicit
- `body` host console renders an isolated live rehearsal projection
- `body` score rehearsal reuses the live outcome and reveal actions
- `body` virtual run controls expose legal actions for a running room
- `journey` placement Coach task opens Room on the real guest control
- `body` issue injection follows the virtual event lifecycle

**`test/event_success/event_assistance_settings_runtime_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_host_screen_state.dart`, `lib/event_success/presentation/host_setup/event_success_host_setup_page_body.dart` · decided by rules

- `body` late arrival settings remain available when event format setup is locked

**`test/event_success/event_attendance_disposition_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_attendance_disposition_editor.dart` · decided by rules

- `action` starts without a default and rejects unsupported choices
- `action` duplicate taps share a frozen action without optimistic attendance
- `action` uncertainty allows only the identical command to retry
- `action` {code} requires new review instead of a changed retry
- `action` replay displays a later correction instead of the original no-show
- `action` sign-out removes the form and the same UID cannot revive it
- `action` account switches during submission cannot publish the old result
- `action` an auth error permanently revokes the old review
- `action` a pending commit survives dismissal of its last observer
- `action` reloading creates a new review without inheriting the draft

**`test/event_success/event_attendance_disposition_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_attendance_disposition_provider.dart` · decided by rules

- `domain` loading and sign-out expose no previous guest review
- `domain` a response for the previous account cannot surface after switching
- `domain` unavailable reads stay errors without automatic retries
- `domain` each attendee scope has its own reviewed source and reload

**`test/event_success/event_attendance_report_provider_test.dart`** — behaviour · subject `lib/event_success/presentation/event_attendance_report_provider.dart` · decided by rules

- `domain` loading, reload, errors and sign-out never expose old totals
- `domain` late reads cannot cross accounts or restore an earlier login period
- `domain` auth failure hides the report and same-UID recovery requires a fresh read
- `domain` reload is isolated to the exact event
- `domain` only a confirmed decision refreshes its event report, with no optimistic totals
- `domain` a late old-account commit cannot refresh the new account report

**`test/event_success/event_success_assignment_features_test.dart`** — behaviour · subject `lib/event_success/presentation/host_setup/event_success_assignment_features_section.dart` · decided by rules, 1 by hand

- `action` Host sees only aggregate usable roster coverage and saves a removal
- `body` account change discards an in-flight published catalog
- `body` a rule sheet cannot apply after the organizer changes
- `body` save in flight disables form and question edits
- `body` background hides the catalog until a fresh preview completes

**`test/event_success/event_success_live_screens_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_controller.dart`, `lib/event_success/presentation/event_success_host_workspace_page_body.dart` · decided by rules · also under P3.4 live, P3.5 insights, P5 live/formats, P6 live

- `body` host setup collapses to a read-only plan after bookings start
- `action` host setup preserves custom format interaction model on save
- `action` post-creation setup persists the selected room layout

**`test/event_success/event_success_questionnaire_config_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_questionnaire_config_editor.dart` · decided by rules

- `body` previews every question pack before an explicit commit
- `body` custom questions use one collapsed field editor at a time

**`test/event_success/event_success_setup_body_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_setup_body.dart` · decided by rules

- `body` setup body uses explanatory cards for live guide choices
- `body` grouping stays hidden for a whole-group guide without grouping tools

**`test/event_success/event_success_structure_config_editor_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_structure_config_editor.dart` · decided by rules

- `body` edits repeat policy and activity assignment goals
- `body` whole-group flow hides irrelevant size and count controls

**`test/hosts/edit_hosted_event_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/edit_hosted_event_screen.dart` · decided by rules

- `domain` HostEventEditState maps route provider states
- `domain` HostEventEditState maps edit locks
- `domain` HostEventEditScreenState maps save display and success policy
- `domain` HostEventEditSaveRequest builds unlocked save payload
- `domain` HostEventEditSaveRequest preserves locked schedule and policy
- `domain` HostEventEditPrivateAccessState maps invite-code seed policy
- `domain` HostEventEditLocationState maps selected location display
- `domain` HostEventEditFieldDisplayState maps form field display values
- `domain` HostEventEditScheduleValidationState maps start-time validation
- `domain` HostEventEdit intents carry typed callback payloads
- `journey` saves host-editable event details through updateEvent
- `body` freezes route and form controls while event save is pending
- `body` locks schedule controls when the event has activity
- `body` disables canonical edit fields and save for cancelled events
- `action` validates required host-editable event fields before saving

**`test/hosts/event_controller_lifecycle_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/event_offer_preferences_controller.dart`, `lib/hosts/presentation/event_management/create/private_event_preferences_controller.dart` · decided by rules

- `action` {kind}: duplicate loads do not race and scopes stay isolated
- `action` {kind}: account change permanently fences late reads
- `action` {kind}: disposal during a load ignores late completion

**`test/hosts/event_offer_preferences_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/event_offer_preferences_controller.dart` · decided by rules

- `action` published event read and write reject malformed authority receipts
- `action` lost reply, denied retry and reopen preserve the exact command
- `action` failed offer reread clears old editable authority
- `action` preview stages inherited changes and apply retains reviewed fences
- `action` reload invalidates an in-flight preview and stale apply never writes
- `action` only an exact server stale rejection retires pending settings
- `action` account change blocks settings preview and writes

**`test/hosts/event_publication_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_preferences_screen.dart`, `lib/hosts/presentation/event_management/create/event_offer_preferences_controller.dart` · decided by rules

- `body` publication action remains reachable with 200% text

**`test/hosts/event_publication_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/event_publication_controller.dart` · decided by rules

- `action` publication diagnostics require a new validated success receipt
- `action` lost response replays exact intent and rereads current visibility
- `action` only exact stale-rejection proof clears uncertain publication
- `action` readiness blocks publishing and receipt identity cannot unlock UI
- `action` account switch discards late results and preserves original journal

**`test/hosts/host_create_event_screen_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/hosts/presentation/host_event_manage_screen.dart` · decided by rules · also under P3.2 events/create

- `body` host manage exposes one lifecycle workspace and roster action
- `journey` past event opens recap without setup or live navigation
- `body` host manage roster renders public profile rows
- `action` host manage keeps ritual controls in Live and check-in in Guests
- `body` host manage renders demand revenue once without a stat strip
- `body` host manage exposes invite code and private link
- `action` host manage confirms and cancels an active event
- `action` host manage confirms and deletes an unused event
- `body` host manage hides delete when event activity is visible

**`test/hosts/host_event_booking_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/host_event_booking_controller.dart` · decided by rules

- `action` HostEventBookingController: cancelHostedEvent delegates to the event repository
- `action` HostEventBookingController: deleteHostedEvent delegates to the event repository
- `action` HostEventBookingController: updateHostedEvent delegates editable event details
- `action` HostEventBookingController: updateHostedEvent deduplicates an active request snapshot
- `action` HostEventBookingController: createWaitlistOffer delegates a single user offer
- `action` HostEventBookingController: createWaitlistOffers delegates bulk offers in order
- `action` HostEventBookingController: createWaitlistOffers skips empty batches
- `action` HostEventBookingController: approveJoinRequest delegates to the event repository
- `action` HostEventBookingController: declineJoinRequest delegates to the event repository
- `action` HostEventBookingController: markAttendance delegates to the event repository
- `action` HostEventBookingController: throws before deleting when the user is not signed in
- `action` HostEventBookingController mutation keys: scope row operations by event and user
- `action` HostEventBookingController mutation keys: scopes bulk waitlist offers by event

**`test/hosts/host_event_manage_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/host_event_manage_controller.dart` · decided by rules

- `action` createInviteLink delegates to repository and copies generated URL
- `action` copyInviteLink resolves and copies the opaque token URL
- `action` disableInviteLink delegates to repository and returns its label
- `action` cancelHostedEvent delegates through the booking controller
- `action` deleteUnusedEvent delegates through the booking controller
- `action` sharePrivateLink delegates to the external share controller
- `action` shareRevenueReport builds and shares a revenue CSV
- `action` shareOpsReport builds and shares an ops CSV

**`test/hosts/host_event_manage_screen_state_test.dart`** — behaviour · subject `lib/hosts/presentation/host_event_manage_screen_state.dart` · decided by rules

- `domain` HostEventManageScreenState resolves lifecycle workspace and roster
- `domain` legacy Host Event Manage route sections keep stable labels
- `domain` Host Event Manage renders exactly one lifecycle workspace
- `domain` HostEventManageActionEffect maps action destinations
- `domain` HostEventActionDisplayState maps destructive action policy
- `domain` HostPrivateLinkActionState maps share link display state
- `domain` HostPrivateAccessDisplayState maps card copy and rows
- `domain` HostParticipantsMutationDisplayState maps pending and error policy
- `domain` HostReportSummaryDisplayState maps report summary copy
- `domain` HostParticipantProfilesLookupState maps profile provider branches
- `domain` HostInviteLinksListDisplayState maps mutation modes
- `domain` HostInviteLinkRowDisplayState maps URL, stats, and row actions
- `domain` HostRosterDisplayState maps setup filters and waitlist offers
- `domain` HostRosterDisplayState maps manual approval setup requests
- `domain` HostRosterDisplayState maps live and report roster filters
- `domain` HostSetupRosterRowDisplayState maps setup row policy
- `domain` HostLiveRosterRowDisplayState maps live row policy
- `domain` HostReportRosterRowDisplayState maps report row policy

**`test/hosts/host_event_offer_preferences_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/event_management/create/host_event_offer_preferences_screen.dart` · decided by rules

- `body` settings provider rebinds for organizer, event, and actor
- `body` fresh event shows mode choices and lists save blockers
- `action` payment page link asks for link and reuse confirmation before saving
- `action` free admission hides payment fields and records a free offer

**`test/hosts/host_events_layout_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/events/presentation/host_events_state.dart` · decided by rules

- `body` retrying empty Past shows derived rows, not a false empty state
- `body` Past keeps date and attendance in the shared record row
- `body` Events shows one identifiable program row with dates and count
- `body` Events advances Programs with the selected lifecycle tab

**`test/hosts/host_events_refresh_test.dart`** — behaviour · subject `lib/hosts/events/presentation/host_events_screen.dart` · decided by rules

- `journey` create and Back re-reads the retained list with the new event
- `journey` {label} return re-reads the retained list
- `body` tab return re-reads the retained list
- `journey` dismissed entry, clock ticks and same-route updates keep reads

**`test/hosts/host_events_screen_state_test.dart`** — behaviour · subject `lib/hosts/events/presentation/host_events_state.dart` · decided by rules

- `domain` repeat selects latest-ended event regardless of input order
- `domain` Host event entry resolves organizer capabilities once
- `domain` Host event entry ignores drafts and repeats from another organizer
- `domain` Host Events groups upcoming rows and derives truthful metadata
- `domain` Host Events classifies exact lifecycle boundaries
- `domain` Host Events async state maps loading, error, and timeline empty copy
- `domain` Host Events merges unpublished and cancelled events into the timeline

**`test/hosts/host_events_timeline_controller_test.dart`** — behaviour · subject `lib/hosts/events/presentation/host_events_timeline_controller.dart` · decided by rules

- `action` independent page responses preserve sibling state pastFirst={pastFinishesFirst} pastFails={pastFails}
- `action` a refresh ignores an old in-flight page response
- `action` appends and de-duplicates schedule and history pages
- `action` preserves the schedule when history fails and retry recovers
- `action` suppresses a duplicate load-more request while one is active
- `action` cancelled-only continuation retry preserves every loaded page
- `action` cancelled bootstrap failure retains successfully loaded published history
- `action` unpublished scopes read bounded pages and continue beyond 200 rows

**`test/hosts/host_events_timeline_progressive_test.dart`** — behaviour · subject `lib/hosts/events/presentation/host_events_timeline_controller.dart` · decided by rules

- `action` bootstrap retry retains each successful source and rejects duplicates
- `action` duplicate history continuations share the exact failed retry cursor
- `action` refresh retains pending history, replaces refreshed rows and retries {failedSource}
- `action` retained old notifier cannot issue reads after session switch
- `action` initial history merges into active continuation without resetting its cursor
- `action` old initial Upcoming is fenced after account switch fails={oldFails}
- `action` continuation stops after {transition} fails={oldFails}
- `action` Upcoming is independent of history; historyFirst={historyFirst}
- `action` initial {source} failure stays truthful; historyFirst={historyFirst}
- `action` simultaneous failures use stable precedence from {firstFailure}
- `action` late history is fenced: {transition} fails={oldFails}
- `action` auth loading clears rows and starts no reads until authentication resolves

**`test/hosts/host_events_timeline_ui_test.dart`** — behaviour · subject `lib/hosts/events/presentation/host_events_timeline_controller.dart` · decided by rules

- `action` Upcoming renders while all four history reads remain pending
- `body` private {scope} failure is terminal beforeUpcoming={beforeUpcoming}
- `body` session switch hides previous rows immediately; signout={signout}

**`test/hosts/host_invite_link_dialog_test.dart`** — behaviour · subject `lib/hosts/presentation/host_invite_link_state.dart` · decided by rules

- `action` invite link fields stay usable until the dialog closes

**`test/hosts/host_operations_screen_test.dart`** — mixed (30 layout cases go with the screen) · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules · also under P3.1 today, P3.5 insights, P5 people, P5 organizer

- `body` Host events unifies lifecycle rows and repeats a past event
- `body` Host Events resumes a loaded draft without a second lookup

**`test/hosts/host_public_registration_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/host_event_booking_controller.dart` · decided by rules

- `action` paid registration retry retains its command and newer revisions get a new identity
- `action` free events opt in to free mode and signed-out users cannot configure

**`test/hosts/host_sheet_composition_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/hosts/events/presentation/host_event_entry_sheet.dart`, `lib/hosts/events/presentation/host_event_entry_state.dart` · decided by rules

- `parts` Event and Program tabs return the selected creation intent
- `parts` combined entry returns the exact older draft without another picker
- `parts` last draft deletion retains Start new and a failed delete retains its row

**`test/hosts/manager_event_setup_defaults_journal_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_preferences_controller.dart`, `lib/hosts/presentation/event_management/create/event_offer_preferences_controller.dart` · decided by rules

- `action` pending body survives reopen and is isolated by manager and club
- `action` lost response, revocation, and reopen reuse the exact command
- `action` failed manager reread cannot edit a stale defaults snapshot

**`test/hosts/manager_event_setup_preferences_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/host_operations/host_manager_event_setup_preferences_section.dart` · decided by rules

- `body` new reusable page needs explicit Host confirmation
- `body` manager-only editor labels suggestions and disables unsaved controls

**`test/hosts/private_event_preferences_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_preferences_screen.dart` · decided by rules

- `body` preview then apply at {width}px and {scale}x text

**`test/hosts/private_event_preferences_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/create/private_event_preferences_controller.dart` · decided by rules

- `action` pending event command is scoped and cannot be silently replaced
- `action` lost receipt, revoked retry, and reopen replay exact command
- `action` failed private settings reread disables stale editing
- `action` only an exact server stale rejection retires pending settings
- `action` account change blocks settings preview and writes

**`test/hosts/private_event_setup_inventory_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/host_private_event_setup_inventory_section.dart` · decided by rules

- `parts` manager inventory pages and reopens the canonical id
- `parts` stale organizer response cannot replace the current inventory
- `action` changing history filter ignores stale pages and resets cursor
- `parts` timeline row renders the saved event and forwards its id

Layout only, deleted with the screen:

- `widgetbook/test/rehearsal_settings_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent


### P5 people

`apps/host/lib/people`. 241 behaviours: 44 domain, 70 action, 5 parts, 87 body, 35 journey.

**`test/chats/chat_inbox_screen_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/chat_inbox_screen.dart` · decided by rules · also under P6 chats

- `domain` HostInboxScreenState: computes host filter, unread count, and visible rows
- `body` host inbox empty state uses explicit attendee-query copy
- `body` host inbox keeps attendee queries inbound-only
- `body` host inbox search empty uses attendee-query copy
- `journey` host inbox rows navigate to host chat route
- `body` host inbox hides consumer dating matches

**`test/chats/chat_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/chats/presentation/chat_screen.dart` · decided by rules · also under P6 chats

- `domain` ChatThreadLookupState: waits for host inquiry club context before reading attendee profile
- `domain` ChatThreadLookupState: uses club host profile instead of public profile for host peer
- `domain` HostChatScreenState: maps host inquiry identity and action availability
- `domain` HostChatScreenState: names host fallback and disabled composer states
- `domain` HostChatScreenState: does not resolve unavailable host inquiry or Suvbot action intents
- `body` ChatRouteState: centralizes host inquiry provider lookups for the route
- `journey` ChatScreen: host inquiry disables profile navigation and share card actions
- `action` ChatScreen: disables the composer for blocked host inquiry chats

**`test/hosts/host_broadcast_composer_sheet_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_broadcast_composer_sheet.dart` · decided by rules

- `parts` keeps one request id across a failed retry
- `parts` rotates the request id when the payload changes
- `parts` keeps sending disabled before the production preflight

**`test/hosts/host_campaign_editor_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_campaign_editor.dart` · decided by rules, 1 by hand

- `parts` initial audience id selects the Customers-owned audience

**`test/hosts/host_customer_count_refresh_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_customers_screen.dart`, `lib/hosts/presentation/customers/host_customers_controller.dart` · decided by rules

- `journey` create acknowledgement refreshes retained People counts once
- `action` cancelled creation does not refetch counts
- `action` failed creation keeps the form and does not refetch counts
- `action` coverage refresh reloads summary and scoped New count
- `action` summary retry refreshes its independently cached New count

**`test/hosts/host_customer_filter_summary_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_customers_screen.dart`, `lib/hosts/presentation/customers/host_customers_screen_state.dart` · decided by rules

- `body` filter summary enables the exact-count campaign bridge
- `body` filter summary qualifies counts and explains a blocked bridge
- `body` all customers renders no redundant messaging handoff
- `body` provider unavailability explains the blocker without a CTA
- `body` manual tag summary can become its own saved audience

**`test/hosts/host_customer_hit_targets_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/hosts/presentation/customers/host_customer_detail_screen.dart`, `lib/routing/shell/host_app_shell.dart` · decided by rules

- `body` Tab and {keyLabel} operate CRM menu at {scale}x
- `journey` selected CRM record and pane scroll survive wide compact wide
- `journey` focused real index search survives status, resize and text reflow

**`test/hosts/host_customer_removal_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_customer_detail_screen.dart` · decided by rules

- `action` controller deduplicates exact requests but never changed revisions
- `action` failed request cleans up and another organizer remains independent
- `journey` embedded acknowledgement clears only A at {layout}
- `journey` cancel and rejected hide retain the detail truthfully
- `body` removal rejection is not replayed by rebuild and can retry
- `journey` reentry cannot consume a departed removal rejection
- `journey` saved duplicate callbacks cannot overlap confirmation or hide
- `body` saved callback cannot become a new {change} action
- `action` {change} ABA during confirmation cannot dispatch old hide
- `journey` {change} ABA suppresses acknowledged {variant}
- `journey` {change} switch suppresses late {variant}
- `body` live auth mismatch before confirmation blocks stale streamed actor
- `action` live auth mismatch after confirmation blocks dispatch
- `journey` live auth mismatch suppresses late {variant} and cache refresh
- `journey` organizer B can remove independently while organizer A is pending
- `journey` late A completion never clears newly selected B
- `journey` departure and reentry retain pending dedupe without replaying success
- `body` standalone removal pops only its acknowledged current route
- `journey` standalone root returns to Audience after acknowledgement
- `journey` covered then restored same State cannot consume an old acknowledgement
- `body` departed standalone completion cannot pop the new route
- `body` post-ack navigation error is not reported as failed removal

**`test/hosts/host_customers_screen_state_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_customers_screen_state.dart` · decided by rules

- `domain` customer filters map to explainable organizer segments
- `domain` customer SMS filters render only when SMS is available
- `domain` campaign audience definitions require a scoped customer selection
- `action` combined selection survives saved audience serialization
- `domain` campaign bridge exhaustively separates async setup states
- `domain` campaign bridge stays hidden for all customers and live search
- `domain` customer filters are grouped without losing SMS readiness
- `domain` segment count requests retain organizer, search and filter identity
- `domain` directory request identity includes the server sort order

**`test/hosts/host_follower_update_composer_sheet_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_follower_update_composer_sheet.dart` · decided by rules

- `action` submits trimmed follower copy and closes after acceptance
- `parts` retry reuses the request id until the copy changes

**`test/hosts/host_inbox_screen_test.dart`** — mixed (5 layout cases go with the screen) · subject `lib/hosts/presentation/inbox/host_inbox_screen.dart` · decided by rules, 3 by hand

- `body` program screen contains shared history for selection {selection}
- `body` account switch with late program completion stays contained
- `body` older program remains scoped with unlinked guests and no composer
- `body` requested program waits for direct lookup and keeps error scoped
- `body` resolved signed-out state is not shown as loading
- `body` renders selected-event segments without an outbound card
- `body` keeps WhatsApp threads inside the existing Inbox scopes
- `body` keeps Catch Inbox usable when WhatsApp enrichment fails
- `journey` compact scope label opens the shared event menu
- `domain` General scope excludes event-specific inquiries
- `body` singleton general scope centers the canonical empty state without a header
- `body` moves roster-backed event announcements into Sends
- `body` shows Sends history before opening the campaign composer
- `body` Sends omits WhatsApp setup where the provider is unavailable
- `journey` Follower update intent opens its composer
- `journey` Sends history renders every server-managed send route
- `journey` queued manual handoff cannot be marked sent before opening
- `journey` opened handoff remains unconfirmed but permits host assertion
- `body` campaigns workspace restores the routed saved audience

**`test/hosts/host_inbox_view_model_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_view_model.dart` · decided by rules

- `domain` resolveHostInboxScope: defaults live first, then nearest upcoming
- `domain` resolveHostInboxScope: explicit event wins and General stays explicit
- `domain` resolveHostInboxScope: unknown event id falls back to the default event
- `domain` resolveHostInboxScope: requested program scope survives a truncated or loading menu
- `domain` resolveHostInboxScope: scope equality distinguishes program from event and general
- `domain` HostInboxViewModel.compose: keeps roster audience counts separate from thread counts
- `domain` HostInboxViewModel.compose: General contains only eventless personal inquiries
- `domain` HostInboxViewModel.compose: search applies after event and audience classification
- `domain` HostInboxViewModel.compose: classifies waitlist offer state without making inquiry a recipient
- `domain` HostInboxViewModel.compose: program scope with linked guests withholds unresolved history
- `domain` HostInboxViewModel.compose: unverified program scope never shows general threads

**`test/hosts/host_operations_screen_test.dart`** — mixed (30 layout cases go with the screen) · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules · also under P3.1 today, P3.5 insights, P5 events, P5 organizer

- `body` Groups owns app-bar creation, explicit ordering and clearable filters
- `body` Organizer audience retry preserves unknown versus measured zero
- `body` customer timeline joins form and reply history
- `body` customer detail separates overview, details, memory and history
- `journey` customer detail exposes only the recommended message route
- `journey` customer WhatsApp handoff pre-fills copy and opens the app
- `journey` customer email handoff pre-fills copy and records the attempt
- `body` customer Details fetches submissions without blocking Overview
- `body` customer submissions distinguish unavailable from known empty
- `body` customer notes unavailable never becomes no notes
- `journey` customer operational history loads only when its tab opens
- `body` customer detail failure names the customer, not organizer
- `journey` customer sort opens a bottom sheet on phones
- `journey` sender recovery opens dedicated WhatsApp Business setup
- `body` sender recovery stays hidden where a sender cannot be connected
- `body` customer search shows clear only while input is non-empty
- `journey` customer timeline opens the host event detail route
- `body` customer memory keeps manual tags separate and notes editable
- `body` customer record actions log an asserted outreach attempt
- `action` customer identity edits and saves in place
- `body` cancel restores customer details without saving
- `body` verified customer edits name while endpoints stay read-only
- `journey` inline customer details keep invalid drafts open
- `body` customer reach separates recorded permission from missing evidence
- `body` customer reach retains retry and every loaded source
- `journey` customer reach loading and blockers never offer an unavailable route
- `body` customer reach resumes only team suppression
- `body` organizer messaging control exposes the requested state
- `body` customer directory keeps initial loading distinct from failure
- `body` customer directory failure names the directory resource
- `body` incomplete CRM totals render as lower bounds
- `body` saved audiences render populated, empty, and error states
- `body` ambiguous customer keeps warning and disclosure affordances
- `body` incomplete customer history is honest and can be rechecked
- `body` customer search debounces and unavailable SMS stays hidden
- `body` People chips combine categories, persist and reset immediately
- `body` customer filter sheet scrolls without loading every count
- `body` manual customer form captures useful identity and memory
- `body` Add person accepts only {endpoint} and retains values on failure
- `body` saved audience directory leaves creation to the app bar
- `journey` saved audience create and edit use full-page routes
- `body` Host Customers follows the shared organizer selection
- `action` saved audience preview failure retains the saved identity
- `action` saved audience create retry reuses its request identity

**`test/hosts/host_saved_audience_retry_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_saved_audience_members_controller.dart` · decided by rules

- `action` Retry reloads revision and rules before restarting members
- `action` editor refresh keeps dirty name and original save fence
- `action` pagination started during refresh cannot restore retained data
- `action` repeated refresh reads current revisions and drops old cursors
- `action` definition failure stays an error and does not preview stale revision
- `action` disposal during definition read starts no preview
- `action` concurrent edit after definition read still fails the preview fence
- `action` missing saved definition never falls back to stale preview
- `action` organizer switch during editor refresh ignores old completion
- `body` organizer switch fences the old refresh and editor state
- `action` invalidated pending page cannot overwrite refreshed members

**`test/hosts/host_saved_audience_workflows_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_saved_audience_members_controller.dart` · decided by rules

- `action` member controller follows the server cursor and preserves the full list
- `body` audience overview inspects members and hands its scope to Messaging
- `action` filter options retry replaces the error and restores the saved rules
- `action` combined saved filters retain edits on dismissal and expose stored SMS
- `action` form-answer authoring saves the selected published version and choice
- `body` spend authoring stores exact minor units and a time window
- `action` static editing removes unavailable aliases and selects from later pages

**`test/hosts/host_sdk_saved_audience_selection_test.dart`** — behaviour · subject `lib/hosts/presentation/customers/host_customers_screen.dart`, `lib/hosts/presentation/customers/host_customers_controller.dart` · decided by rules

- `action` a stale People continuation cannot overwrite a refreshed list
- `body` latest Group selection wins when details complete out of order
- `body` {contextChange} cancels a pending Group selection and stale error

**`test/hosts/host_whatsapp_setup_pane_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_messaging_setup_screen.dart`, `lib/hosts/presentation/host_operations_screen.dart` · decided by rules

- `body` setup route keeps its owners and omits an unavailable sender
- `body` hides sender connection where Embedded Signup is unavailable
- `body` manages an already connected sender without Embedded Signup

**`test/hosts/inbox/host_conversation_history_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_conversation_history_controller.dart` · decided by rules

- `action` history gets an opaque cursor before loading beyond the live window
- `action` history failure is retryable and account changes discard late replies

**`test/hosts/inbox/host_inbox_pagination_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_whatsapp_pages_controller.dart`, `lib/chats/presentation/inbox/chats_list_view_model.dart` · decided by rules

- `action` pagination retains authorized rows after {failure} failure and retries
- `action` refresh invalidates an in-flight older page

**`test/hosts/inbox/host_inbox_people_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_people.dart` · decided by rules

- `domain` joins only verified account ids and retains source endpoints
- `domain` identical names and missing or conflicting links never merge
- `domain` scope and organizer eligibility precede identity joining
- `domain` unknown classification stays visible and is never counted prospective
- `domain` counts distinct people before search using authoritative roster
- `domain` identity changes split a previous join without recycling person keys
- `domain` program scope: shared guest membership proves no historical message purpose
- `domain` program scope: missing audience yields an empty inbox, never all threads
- `domain` program scope: search still applies inside a program audience
- `domain` audience derives linked uids only from guest contacts

**`test/hosts/inbox/host_inbox_program_audience_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_program_audience_controller.dart` · decided by rules

- `action` direct ownership check precedes guests, including older programs
- `action` foreign program never requests a guest page
- `action` loads past 200 guests and keeps unlinked guests out of contacts
- `action` page failure retains prior guests and retries the same cursor

**`test/hosts/inbox/host_inbox_purpose_containment_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_view_model.dart`, `lib/chats/presentation/inbox/chats_list_view_model.dart` · decided by rules

- `body` program direct link {selection} never mounts history or actions
- `body` late program completion after workspace switch cannot mount old history
- `body` denied or foreign exact program never requests guests or opens fallback
- `body` revoked exact-program read replaces safe state with scoped error
- `body` canonical event detail remains available after program containment

**`test/hosts/inbox/host_new_message_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/inbox/host_new_message_screen.dart` · decided by rules

- `journey` new message resolves a person and respects route availability {available}

**`test/hosts/inbox/host_person_conversation_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_reply_drafts.dart`, `lib/chats/presentation/widgets/chat_input.dart` · decided by rules

- `journey` person transcript retains source identity and sends on only the selected route
- `body` revoked membership and a changed identity link cannot leak source history

**`test/hosts/inbox/host_reply_drafts_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_reply_drafts.dart` · decided by rules

- `domain` retry retains its operation and duplicate activation cannot send twice
- `domain` person, organizer, event and route drafts never overwrite one another
- `domain` account reset and disposal invalidate pending completion

**`test/hosts/phone_import/phone_import_controller_test.dart`** — behaviour · subject `lib/hosts/audience/phone_import/presentation/phone_import_controller.dart` · decided by rules

- `action` multiple numbers require a chosen number; nameless guest needs reviewed name
- `action` shared phones keep separate guests and expose review warning
- `action` repeated selection deduplicates by local contact only and preserves chosen edits
- `action` no-number picker entries cannot become importable; household member can
- `action` explicit sharing resets after every request-defining change
- `action` stable review snapshot retries locally; edits invalidate snapshot
- `action` {status} keeps selected review and never loops
- `action` thrown native error preserves review and allows manual retry
- `action` pending picker freezes peer changes and duplicate taps
- `action` discard invalidates an outstanding callback and clears all local evidence
- `action` local number needs explicit country review and re-selection clears it
- `action` invalid number cannot be substituted into a selected contact

**`test/hosts/phone_import/phone_import_live_flow_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/audience/phone_import/presentation/phone_import_screen.dart` · decided by rules

- `action` client uses current program access; explicit preview then share
- `body` production exposes phone entry and reviewed route to wedding managers
- `body` native selection needs explicit international review and shares only chosen phone
- `body` reselecting the same contact in a new review retains the scoped upstream reference
- `body` cached access cannot open import when live read is unavailable
- `body` changed organizer or restricted guest scope fails closed
- `body` wedding route change disposes pending write even after returning
- `body` auth switch disposes an in-flight review; late receipt stays private
- `body` work entry is hidden for cached or restricted grants

**`test/hosts/phone_import/phone_import_review_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/audience/phone_import/presentation/phone_import_controller.dart` · decided by rules

- `body` chooses a number, edits guest grouping, and confirms the exact scope
- `action` local chosen phone requires explicit international review
- `body` no-number contacts require removal; household members need no phone
- `action` repeated selection stays deduplicated and shared phones stay separate
- `action` {status} gives honest feedback without a permission loop
- `body` picker pending state freezes conflicting review controls
- `body` sharing remains reachable at {size} / text scale {scale} in both themes

**`test/hosts/phone_import/phone_import_route_controller_test.dart`** — behaviour · subject `lib/hosts/audience/phone_import/presentation/phone_import_route_controller.dart` · decided by rules

- `journey` creator opens real review using canonical program authority
- `action` entry does not bypass a fresh destination denial
- `action` creator access has no organizer metadata dependency: {kind}
- `action` changed role during canonical refresh requires a new route review
- `action` canonical refresh cannot cross a changed {kind}
- `action` approved staff use fresh program access without assignment discovery
- `action` staff refresh cannot retain changed {kind} authority
- `action` approved access does not depend on assignment metadata: {kind}
- `action` staff {kind} authority cannot reach metadata or a review

**`test/hosts/phone_import/phone_import_submission_controller_test.dart`** — behaviour · subject `lib/hosts/audience/phone_import/presentation/phone_import_submission_controller.dart` · decided by rules

- `action` preview never commits or persists and edits revoke preview and consent
- `action` confirmed batch is durable before commit and cleared only after receipt
- `action` lost response survives controller recreation without automatic replay
- `action` storage failure prevents every commit and retains the frozen review
- `action` sharing freezes edits and duplicate taps while response is pending
- `action` revoked grant on explicit retry preserves pending command and sends no write
- `action` partial response remains visible and never clears retry state
- `action` disposed route cannot turn late receipt into visible success or delete retry

**`test/routing/router_widgets_test.dart`** — behaviour · subject `lib/hosts/presentation/inbox/host_inbox_screen.dart`, `lib/hosts/presentation/inbox/host_inbox_view_model.dart` · decided by rules · also under P3.2 events/create, P6 onboarding, P6 chats

- `domain` host Audience route resolves all four peer workspaces
- `domain` host inbox route restores the campaigns saved audience
- `domain` host inbox route ignores an audience outside compose mode
- `domain` host inbox route parses program scope and organizer
- `domain` host inbox route prefers event scope over program scope

Layout only, deleted with the screen:

- `test/ui_captures/audience_directory_preview_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `test/ui_captures/audience_values_preview_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `test/ui_captures/customer_detail_preview_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules, test bodies read
- `test/ui_captures/fixtures/host_audience_journey_fixture_test.dart`: 9 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `widgetbook/test/host_phone_import_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent


### P5 forms

`apps/host/lib/forms`. 173 behaviours: 9 domain, 99 action, 13 parts, 39 body, 13 journey.

**`test/hosts/applications/host_application_intake_test.dart`** — behaviour · subject `lib/hosts/presentation/applications/host_application_detail_screen.dart` · decided by rules, 1 by hand

- `body` imported review keeps its existing People link
- `action` review note saves without changing status
- `journey` accept refreshes application and opens its linked person
- `body` contact shortcuts remain reachable and answers precede review on mobile
- `body` revoked application cannot expose review actions

**`test/hosts/forms/cat83_responses_diagnostic_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_forms_screen.dart`, `lib/hosts/presentation/forms/host_form_operations_controller.dart` · decided by rules

- `action` generated equal-request family shares one actual initial read
- `parts` real cold Responses mount starts one unresolved read
- `action` same account rebuild is stable; warm remount forces one fresh read
- `parts` same-account remount refreshes a retained unresolved request
- `parts` builder-style keyed A-B-A rejects retained unresolved A
- `parts` unresolved account A-B-A rejects old results; failure={failOld}
- `parts` loaded old-account rows vanish before the new actor read settles
- `domain` selected form cold mount resolves version with two reads
- `action` selected form change and explicit version changes count requests
- `domain` required absent account starts zero response requests

**`test/hosts/forms/host_audience_loading_performance_test.dart`** — behaviour · subject `lib/hosts/presentation/host_audience_view.dart`, `lib/hosts/presentation/forms/host_forms_screen.dart` · decided by rules

- `body` Responses renders independently when Forms {variant}
- `action` Forms error retry repeats the account-authorized read
- `body` Groups does not start hidden People directory or count reads

**`test/hosts/forms/host_event_offer_review_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_event_offer_review_section.dart` · decided by rules

- `action` Host must preview event-specific offer before commit

**`test/hosts/forms/host_event_offer_workspace_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_event_offer_workspace_controller.dart` · decided by rules

- `journey` route footer follows event choice and clears on account loss
- `body` legacy response cache is hidden until the new manager read resolves
- `action` account switch clears prior response rows and selection before the next manager query resolves
- `domain` published response queries always include the offer workspace
- `domain` response query mount preserves external search and contact scope
- `action` single response uses the shared flow and checks application review: {approved}
- `action` single response rejects an identity changed by an asynchronous detail read
- `action` saved target revalidates response and admission source for {variant}
- `action` workspace controller invalidates selected offer context when the underlying query selection changes
- `action` CRM conversion return rechecks exact selected response before offer preview
- `action` changed query result blocks event choice without partial offers
- `journey` existing {mode} {amount} offer shows appropriate payment controls and handoff
- `body` existing offer discovers and replays saved manual command
- `action` event picker shows in-flow create action only when the parent enables private setup
- `action` personal preparation overlaps fresh reads and cancellation prevents preview
- `action` personal preview rechecks approval before an authoritative preview
- `action` query change after recovery keeps the exact saved command available
- `action` query change during a lost commit response retains exact retry identity
- `action` query invalidation fences delayed recovery without losing its saved command
- `action` completed receipt metadata does not block retry after an offer-list failure
- `action` selection starts independent reads together and rejects late cancelled results after a new preparation
- `action` preparation retry preserves selection after a manager read fails
- `action` late application rejection blocks a draft even when other reads finish
- `action` fresh {variant} response blocks preparation
- `action` Back disposal does not publish delayed manager data
- `action` approval reads are bounded to four and cancellation stops later batches
- `body` recipient chooser orders existing events first and keeps preparation visible and cancellable

**`test/hosts/forms/host_form_admission_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_event_offer_controller.dart`, `lib/hosts/presentation/forms/host_event_offer_workspace_controller.dart` · decided by rules

- `action` uncertain commit survives recreation and retries the exact request
- `action` definitively rejected command must be reviewed again before replacement
- `action` late preview cannot render or admit after an account change
- `action` admission is confirmed explicitly after preview

**`test/hosts/forms/host_form_analytics_screen_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_forms_controller.dart` · decided by rules

- `body` Results retains its version through export polling
- `body` Results with no starts does not invent a completion rate

**`test/hosts/forms/host_form_builder_screen_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_form_workspace_state.dart` · decided by rules, 3 by hand

- `body` settings offer separate unchecked WhatsApp choices
- `body` question editor stays focused and settings remain directly reachable
- `body` publish review names cross-workspace consequences and limits
- `body` publish review labels incomplete legacy automation coverage
- `body` opening a question closes the previously expanded editor
- `body` single page summarizes readiness and keeps preview explicit
- `action` inline drag handle changes the persisted question order
- `journey` Published form shares its workspace navigation at {size}

**`test/hosts/forms/host_form_payment_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_payment_controller.dart` · decided by rules

- `action` OAuth return refreshes authoritative setup without assuming success
- `action` unconfigured setup cannot start OAuth and concurrent operations are fenced
- `action` check connection refreshes the selected fee account without changing merchants
- `action` reconnect disconnects accounts that cannot take payments, then starts OAuth

**`test/hosts/forms/host_form_payment_settings_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_form_payment_section.dart` · decided by rules

- `body` payment setup is honest when partner setup is unavailable {dark}
- `action` Catch collection works independently of OAuth readiness {ready}
- `body` unverified identity cannot configure even with a ready merchant
- `action` fee sheet requires refund policy and preserves exact amount and account
- `body` fee settings offer one Razorpay connection, never a second

**`test/hosts/forms/host_form_payments_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_payments_controller.dart` · decided by rules

- `action` pagination is scoped, single flight, deduplicated and retryable
- `action` refresh ignores a stale page completion
- `action` disposing a filtered query safely ignores its late result

**`test/hosts/forms/host_form_payments_section_list_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_payments_section_list.dart` · decided by rules

- `parts` payment stages and test money are explicit {dark}
- `action` filter uses authoritative scoped query and can refresh
- `parts` empty records explain checkout rather than implying payment setup
- `parts` large-text detail is readable and response is evidence based: {status}

**`test/hosts/forms/host_form_response_detail_screen_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_form_response_detail_screen.dart` · decided by rules

- `journey` response payment {label} opens details
- `action` native response and application identities resolve the same detail
- `action` revoked application never fetches the linked response
- `action` missing linked application fails closed rather than dropping review
- `body` response has one primary next action: {status}
- `journey` one flat detail keeps answers and opens full contact targets
- `body` ordinary response has People action without application review
- `body` withdrawn response keeps authorized answers without mutations
- `action` Next after review removal loads the next filtered page, then Previous

**`test/hosts/forms/host_form_response_filters_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_operations_controller.dart`, `lib/hosts/presentation/forms/host_form_responses_section.dart` · decided by rules

- `body` published version is selected and switching clears answer filters
- `body` city filters remain available during loading and empty scan pages
- `body` filtered response queue shows real review rows
- `body` all promoted questions are available with at most five active filters
- `body` inline form and answer chips combine, reset and preserve selection at {scale}

**`test/hosts/forms/host_form_responses_paging_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_operations_controller.dart` · decided by rules

- `action` pagination preserves request scope, retries and deduplicates rows
- `action` refresh rejects stale continuation {variant}
- `action` disposed continuation {variant} cannot poison reopened scope
- `action` a different request family retains its own rows and cursor

**`test/hosts/forms/host_form_target_binding_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_payment_controller.dart`, `lib/hosts/presentation/forms/host_forms_controller.dart` · decided by rules

- `action` pending target edit never saves under the next signed-in manager
- `action` old manager save response cannot restore target after account switch
- `action` event picker discards old manager results and edits only the new manager selection
- `action` picker pages preserve a linked event until absence is authoritative
- `action` late old-account targets cannot appear or become selectable
- `action` failed manager read shows error and retry discards stale page
- `action` repeating target cursor fails closed without duplicate pagination

**`test/hosts/forms/host_form_target_concurrency_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_target_section.dart` · decided by rules

- `action` reload waits for sent save then newer target edit saves at fresh revision
- `action` account rebuild waits for old save before manager read
- `action` disposed provider ignores an in-flight save response
- `action` late actor mismatch schedules reload after save exits
- `action` undo after a successful target save cannot write as next actor
- `action` account change rebuilds editor and rejects late old read
- `action` late first A read cannot claim editor after A to B to A
- `action` A to B to A cursor cycle stops without accepting repeated page
- `parts` bound event refreshes when actor settles after first frame

**`test/hosts/forms/host_forms_screen_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_forms_screen.dart` · decided by rules

- `action` Audience Forms and Responses use shared tabs and view-aware search at {width}
- `journey` Response form scope survives tab changes and route updates
- `body` account switch {variant} hides old forms

**`test/hosts/forms/host_forms_workspace_isolation_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_forms_screen.dart` · decided by rules

- `body` initial and same-workspace deep links retain exact filters
- `journey` explicit valid route wins retained shell choice until shell switches
- `domain` unauthorized initial organizer never lends its IDs to fallback
- `domain` invalid later route clears IDs even when fallback stays unchanged
- `action` retained Responses clears before new reads; ABA={returnToA}
- `body` held B directory cannot replace returned A; failure={fails}
- `body` held response pages stay outside returned workspace; failure={fails}
- `action` new route filters survive pending workspace normalization
- `action` {action} requires current confirmation and dispatches once
- `action` {action} confirmation cannot dispatch after {change}
- `body` duplicate completion is fenced after {change}; failure={fails}
- `action` import {phase} is fenced after {change}
- `body` old import failure/finally cannot release a new workspace picker
- `action` current import acknowledgment refreshes and clears its filters

**`test/hosts/forms/host_response_export_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_response_export_controller.dart` · decided by rules

- `action` applied query, hashes and null cursor bind a complete export
- `action` late receipt after query drift is never opened or attached
- `action` a query changed while checking the journal is not exported
- `action` typed stale receipt requires a fresh applied result
- `action` a stale pending export settles its original command without opening
- `action` account change before completion or reopen never opens the URL
- `journey` inline export action uses the reviewed query and opens once
- `action` offer create action can select without a bulk review callback

**`test/hosts/forms/host_response_lifecycle_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_response_detail_screen.dart`, `lib/hosts/presentation/forms/host_form_operations_controller.dart` · decided by rules

- `domain` response contact links normalize E.164 and restrict social hosts
- `body` Responses app-bar import confirms in a sheet and refreshes unfiltered inbox
- `body` Lifecycle rail requests every review outcome with original scope
- `journey` One list routes native review, imports and ordinary responses to their details
- `domain` review queue targets the shifted neighbor when the current row leaves

**`test/hosts/forms/host_response_offer_empty_route_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_response_offer_screen.dart` · decided by rules

- `body` query route without selection keeps explicit Back navigation

**`test/hosts/forms/host_response_query_editor_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_response_query_editor_section.dart` · decided by rules

- `parts` editor applies a typed city condition from the published catalog
- `parts` reset clears conditions and nested groups stay bounded

**`test/hosts/forms/host_response_whatsapp_handoff_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_response_detail_screen.dart` · decided by rules

- `domain` whatsapp handoff builds a wa.me link only for a valid E.164 phone
- `journey` response contact row opens a prefilled WhatsApp handoff
- `body` response contact row hides WhatsApp without a valid phone

**`test/hosts/forms/host_response_workspace_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/hosts/presentation/forms/host_form_response_query_controller.dart` · decided by rules

- `journey` opens response without selecting it
- `journey` selection control does not open the response
- `parts` pagination stays below rows and busy until the next page arrives
- `parts` answer sorting uses value directions and clears stale selection

**`test/hosts/host_automation_workflows_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_automations_screen.dart`, `lib/hosts/presentation/forms/host_form_operations_controller.dart` · decided by rules

- `action` global editor saves an enabled acceptance webhook and retries the same request
- `body` editing preserves a configured secret and expected revision
- `body` attendance message selection loads older drafts and pins the reviewed revision
- `action` rule pause and history pagination preserve other run receipts

**`test/hosts/host_event_offer_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_event_offer_controller.dart` · decided by rules

- `action` one response may feed event-specific offers, never a duplicate contact
- `action` expiry and public HTTPS link are validated before review
- `action` detail preserves historical terms and manual attestation fields
- `action` preview gates commit; uncertain retry keeps the same request ID
- `action` reference and Host bank attestation cannot imply provider capture
- `action` manual mutation journal replays exact request after restart
- `action` manual mutation recovery discovers original command after restart
- `action` malformed batch receipt leaves saved operation for exact replay
- `action` failed detail refresh never reissues acknowledged mutation

**`test/hosts/host_manual_payment_review_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_manual_payment_review_controller.dart` · decided by rules

- `action` recovers the saved command and blocks a new reference until replay
- `action` deduplicates an in-flight command and suppresses account-stale completion
- `action` ambiguous mutation failure reloads the durable command for retry
- `action` disposed review ignores a late recovery failure
- `action` an already invalidated account cannot enter recovery

**`test/hosts/host_response_query_test.dart`** — behaviour · subject `lib/hosts/presentation/forms/host_form_response_query_controller.dart` · decided by rules

- `action` a changed page two clears selection and requires refresh
- `action` offer review rechecks selected identities after event choice
- `action` an older request cannot replace a newer filter result
- `action` typed repository stale failure clears selection and asks refresh
- `action` scan budget and permission loss are separate from zero matches

Layout only, deleted with the screen:

- `test/hosts/forms/host_form_profile_question_section_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand
- `test/hosts/forms/host_form_share_loading_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand, read end to end
- `test/ui_captures/host_sheet_review_test.dart`: 2 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `test/ui_captures/offer_payment_capture_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules
- `test/ui_captures/response_detail_preview_test.dart`: 1 cases · capture harness: renders the route for review, pins no product rule · decided by rules


### P5 organizer

`apps/host/lib/organizer`. 82 behaviours: 3 domain, 25 action, 16 parts, 32 body, 6 journey.

**`test/core/forms/contract_alignment_test.dart`** — behaviour · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules · also under P6 you

- `journey` host club descriptors stay aligned with patch contracts

**`test/hosts/host_account_deletion_test.dart`** — behaviour · subject `lib/safety/presentation/settings_controller.dart` · decided by rules

- `body` Host without an organizer can cancel account deletion
- `body` Host deletion requires confirmation and freezes account actions
- `body` Failed Host deletion keeps the account screen available

**`test/hosts/host_account_legal_links_test.dart`** — behaviour · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules

- `journey` Host account menu opens {label} externally
- `body` Host account menu hides unconfigured legal destinations
- `body` pending Host legal launch freezes account actions
- `body` Host legal link launch failure is visible

**`test/hosts/host_operations_screen_test.dart`** — mixed (30 layout cases go with the screen) · subject `lib/hosts/presentation/host_operations_screen.dart` · decided by rules · also under P3.1 today, P3.5 insights, P5 events, P5 people

- `body` Host club photo picks stay staged until Save media
- `body` Host image manager discards its staged draft in place
- `body` Host organizer logo removal remains available in image manager
- `action` Host club photo upload failures stay visible and retry
- `body` Organizer owners can edit the organizer type
- `journey` Club settings rows push every spoke with the selected club id
- `body` Club settings spokes are read-only for co-hosts
- `body` Host club photo removal stays staged until Save media
- `body` Host club photo reorder stays staged until Save media
- `body` Host clubs defaults to the consolidated edit workspace
- `action` Host tracking policy gate and server eligibility {canEdit}
- `action` HostTeamWorkspaceState uses club fallback while profile is loading
- `action` HostTeamWorkspaceActionState maps profile and club navigation policy
- `action` HostOrganizersScreenState resolves selected club, tab, and owner role
- `action` HostOrganizerInsightsState owns only club and narrative range
- `action` HostEventsRouteState maps auth and organizer async branches
- `body` Host team shows loading while uid resolves
- `body` Host payment card shows loading while uid resolves
- `journey` India payout setup recommends Razorpay and exposes Route form
- `body` Host clubs owns profile management without event CTAs
- `body` Default switches auto-save without a Done action
- `action` Host club fields edit inline without opening edit wizard
- `body` Organizer Edit exposes demand-pricing defaults when configured
- `journey` Host city editor displays labels and persists canonical ids
- `body` Host team workspace edit loads from club snapshot while profile waits
- `action` Host team workspace creates a missing professional profile
- `body` Host team workspace no-profile row shows create pending state
- `body` Host team workspace surfaces missing profile creation failures
- `body` Host team workspace edits active professional profile inline
- `body` Host team workspace keeps inline profile fields after save failure
- `body` Host team workspace exposes a back action with a safe root fallback
- `body` Organizer top bar surfaces sign out failures
- `body` Host team Preview renders the professional host profile projection
- `body` Host team workspace validates required display name

**`test/hosts/host_organizer_defaults_saver_test.dart`** — behaviour · subject `lib/hosts/presentation/organizer_management/host_organizer_defaults_saver.dart` · decided by rules

- `action` coalesces rapid updates behind one in-flight write
- `action` reverts to the last confirmed defaults after a terminal failure

**`test/hosts/host_organizer_identity_switcher_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_organizer_switcher_sheet.dart` · decided by rules

- `action` selection is isolated per signed-in Host user
- `action` selection resolution prefers a valid route, then state, then first
- `parts` organizer avatar prefers the real logo with activity fallback
- `parts` switcher sheet marks the current organizer and returns a choice
- `parts` switcher sheet remains stable at 2x text

**`test/hosts/host_organizer_publication_state_test.dart`** — behaviour · subject `lib/hosts/presentation/host_organizer_publication_state.dart` · decided by rules

- `domain` legacy organizer without publicPage is visible only in Catch
- `domain` publication state preserves the four independent channel states
- `domain` published flag without a canonical route is not website enabled

**`test/hosts/host_team_management_controller_test.dart`** — behaviour · subject `lib/hosts/presentation/organizer_management/host_team_management_controller.dart` · decided by rules

- `action` HostTeamManagementController: forwards owner host-management actions to the repository

**`test/hosts/host_team_management_section_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_team_management_section.dart` · decided by rules

- `journey` Add host sheet follows handoff copy and submits phone number
- `action` Remove host confirmation uses shared copy and mutation
- `action` Transfer ownership confirmation uses shared copy and mutation
- `parts` Co-host can read the roster without owner mutation controls
- `parts` Empty roster remains an explicit canonical team section

**`test/hosts/host_tracking_settings_test.dart`** — behaviour · subject `lib/hosts/presentation/host_tracking_settings_controller.dart` · decided by rules

- `action` Settings saves retain displayed revision and explicit null IDs
- `action` save errors and pending state are account and organizer scoped
- `action` stale account or organizer cannot issue a save
- `body` account changes reset drafts and fence late saves and reentry

**`test/hosts/memberships/host_memberships_section_test.dart`** — behaviour · subject `lib/hosts/presentation/memberships/host_memberships_state.dart` · decided by rules

- `action` enabling requires a ready payout account
- `parts` a host-collected program names the blocker the host can fix
- `action` an enabled program pauses billing and lists plans

**`test/hosts/organizer_form_primitives_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/hosts/presentation/organizer_management/create/widgets/organizer_basics_step.dart`, `lib/hosts/presentation/organizer_management/create/widgets/organizer_host_defaults_step.dart` · decided by rules

- `body` club basics accepts a city restored after first build
- `body` club defaults rebuild cohort cap rows
- `body` club defaults rebuild pricing rows from disclosed choices

**`test/hosts/presentation/payments/host_organizer_bills_section_test.dart`** — behaviour · subject `lib/hosts/presentation/payments/host_organizer_bills_section.dart` · decided by rules, 2 by hand

- `parts` a month shows what it costs and where it stands
- `parts` no bills says so
- `parts` the section reads the organizer's bills
- `parts` an unpaid statement adds up and pays from its link
- `parts` a closed statement has nothing to pay

**`test/hosts/presentation/payments/host_razorpay_connection_section_test.dart`** — behaviour · subject `lib/hosts/presentation/payments/host_razorpay_connection_section.dart` · decided by rules

- `parts` payouts stay honest while partner setup is unavailable {dark}
- `parts` connect discloses what Catch can do before OAuth
- `parts` a ready account shows ready and confirms disconnect {dark}
- `parts` pending state blocks repeat actions
- `parts` an account that cannot take payments asks to reconnect {dark}

**`test/organizers/organizers_controllers_test.dart`** — behaviour · subject `lib/hosts/presentation/organizer_management/host_organizer_edit_controller.dart`, `lib/organizers/presentation/detail/organizer_detail_view_model.dart` · decided by rules · also under P5 onboarding, shared lib/pages/organizer

- `action` CreateOrganizerController: co-host media edits update only media fields
- `action` CreateOrganizerController: club logo removal clears both logo projections
- `action` CreateOrganizerController: failed club media writes clean up newly uploaded files
- `action` CreateOrganizerController: club media edits reject non-host users


### P5 onboarding

`apps/host/lib/onboarding`. 29 behaviours: 8 domain, 10 action, 1 parts, 9 body, 1 journey.

**`test/auth/presentation/auth_controller_test.dart`** — behaviour · subject `lib/auth/presentation/auth_controller.dart` · decided by rules · also under P6 onboarding

- `action` AuthController state management: host app defaults phone auth to the Catch market

**`test/auth/presentation/auth_screen_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/auth/presentation/auth_screen.dart` · decided by rules · also under P6 onboarding

- `body` AuthScreen: Host short screen reveals scaled controls above keyboard in {theme}
- `body` AuthScreen: Host reveals OTP inline and keeps the brand anchor fixed

**`test/explore/explore_widgets_test.dart`** — mixed (21 layout cases go with the screen) · subject `lib/explore/presentation/explore_view_model.dart`, `lib/hosts/presentation/organizer_management/create/create_organizer_screen.dart` · decided by rules · also under P6 explore, shared lib/pages/organizer

- `body` CreateOrganizerScreen picks and previews club photos
- `body` CreateOrganizerScreen shows mutation errors inline
- `body` CreateOrganizerScreen freezes route and draft controls while submit is pending
- `journey` CreateOrganizerScreen reviews and pops after a successful submit

**`test/hosts/host_organizer_create_state_test.dart`** — behaviour · subject `lib/hosts/presentation/organizer_management/create/create_organizer_screen.dart` · decided by rules

- `domain` HostOrganizerCreateState maps create wizard display state
- `domain` HostOrganizerCreateState maps draft restore retry and disable state
- `domain` HostOrganizerCreateState maps city and selected media
- `domain` HostOrganizerCreateReviewState gates basics and details
- `domain` HostOrganizerCreate route intents carry typed callback payloads
- `domain` HostOrganizerCreateDraftRequest trims optional draft fields
- `domain` HostOrganizerCreateSubmitRequest trims fields and requires city
- `domain` HostOrganizerSubmitOutcomeState closes only after pending success

**`test/hosts/host_wizard_step_header_test.dart`** — behaviour · subject `lib/hosts/presentation/widgets/host_wizard_step_header.dart` · decided by rules, 1 by hand · also under P3.2 events/create

- `parts` club wizard keeps nullable context and one-based progress

**`test/organizers/create_organizer_photos_picker_test.dart`** — behaviour · subject `lib/hosts/presentation/organizer_management/create/widgets/create_organizer_photos_picker.dart` · decided by rules

- `body` standard club photos picker exposes the empty add tile
- `body` edit strip keeps cover affordance and add tile
- `body` edit logo empty state exposes one labelled add action
- `body` edit logo preview stays separate from replace and remove

**`test/organizers/organizers_controllers_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/organizer_detail_view_model.dart`, `lib/hosts/presentation/organizer_management/create/create_organizer_controller.dart` · decided by rules · also under P5 organizer, shared lib/pages/organizer

- `action` create cleanup removes uploads when media attachment fails
- `action` partial media retries reuse successful staged uploads
- `action` CreateOrganizerController: deduplicates an active organizer submit snapshot
- `action` CreateOrganizerController: picks multiple club photos and reads preview bytes
- `action` CreateOrganizerController: creates a club through the repository when there are no club photos
- `action` CreateOrganizerController: creates the club before uploading new club media
- `action` CreateOrganizerController: creates a club with multiple ordered club photos
- `action` CreateOrganizerController: create cleanup removes uploads when media attachment fails
- `action` CreateOrganizerController: creates a club without requiring profile state


### P5 programmes

`apps/host/lib/programmes`. 165 behaviours: 16 domain, 86 action, 2 parts, 49 body, 12 journey; 6 more in `widgetbook/test`.

**`test/hosts/work/host_work_screen_test.dart`** — behaviour · subject `lib/hosts/work/presentation/host_work_screen.dart` · decided by rules, 1 by hand

- `journey` admin assignment keeps a Work back target: operational={operationalDuty}
- `body` renders the picker grouped by organizer
- `journey` forwards a lone program assignment into its scope
- `journey` forwards a lone event assignment into the operator surface
- `body` shows the empty state when no assignments are live
- `body` manager shell keeps the picker instead of forwarding

**`test/programs/program_attendance_report_test.dart`** — behaviour · subject `lib/programs/presentation/program_attendance_report_screen.dart` · decided by rules, 1 by hand

- `parts` renders program totals, joined names, and exception badges
- `body` shows the empty state when no functions carry counts
- `body` shows the error state and retries

**`test/programs/program_create_controller_test.dart`** — behaviour · subject `lib/programs/presentation/program_create_controller.dart` · decided by rules

- `action` fresh persistence failure before dispatch unlocks without rotating key
- `action` recovered ambiguous command stays locked if retry persistence fails
- `action` actor change during command persistence prevents dispatch
- `action` missing required fields show all inline errors without a request
- `action` canonical text lengths and strict date ordering reject before create
- `action` saving is immediate, fields lock and duplicate submits cannot run
- `action` failed create preserves draft and retries the same command and key
- `action` receipt confirmation retry never creates another program
- `action` recovered receipt confirms exact saved identity without creating again
- `action` definitive rejection unlocks correction and rotates the request identity
- `action` command and receipt are durable before their network stages
- `action` list must contain saved identity; a matching name cannot fake success
- `action` detail confirmation cannot cross program or organizer identity
- `action` account or organizer changes during create cannot publish old scope
- `action` disposed form ignores late completion and never refreshes another route

**`test/programs/program_create_provider_test.dart`** — behaviour · subject `lib/programs/presentation/program_create_screen.dart` · decided by rules, 1 by hand

- `domain` a receipt without a submitted body remains locked and confirmation-only
- `domain` a false preference write prevents dispatch and keeps the fresh draft editable
- `domain` account and organizer provider fences prevent stale-scope dispatch
- `domain` legacy empty command recovery preserves a populated editable draft
- `body` production provider form accepts title recoveredEmpty={recoveredEmpty}
- `domain` partially empty submitted command is retained conservatively
- `domain` fresh provider keeps absence of submitted command and title editable
- `domain` partial persisted draft reopens with blank timezone and same key
- `domain` exact legacy empty command is editable without dispatch or journal deletion
- `domain` real recovered command stays locked and retries exact submitted body and key
- `domain` receipt prevents empty-command recovery from unlocking a known saved ID

**`test/programs/program_create_screen_test.dart`** — behaviour · subject `lib/programs/presentation/program_create_screen.dart` · decided by rules

- `action` full form validates, shows loading and confirms the retained retry draft dark={dark} scale={scale}

**`test/programs/program_door_test.dart`** — behaviour · subject `lib/programs/presentation/program_door_screen.dart` · decided by rules

- `body` door page body renders roster and dispatches actions

**`test/programs/program_events_controller_test.dart`** — behaviour · subject `lib/programs/presentation/program_events_controller.dart` · decided by rules

- `action` confirmed row is immediately visible and survives partial-read outage
- `action` failed same-scope refresh retains known rows and exposes retry
- `action` missing saved ID error remains until the exact ID is recovered
- `action` not-found and authority rejection remove a retained anchor
- `action` earlier-start exact anchor is visible after two bounded reads, with real paging
- `action` anchor already in first page needs no extra request
- `action` page failure retains rows and exact cursor for retry; duplicate clicks are ignored
- `action` repeated cursor cannot loop or discard existing rows
- `action` tab-aware continuation skips hidden pages until a matching row
- `action` tab-aware continuation remains bounded for sparse results
- `action` account or organizer interruption clears rows and ignores late page/anchor completion
- `action` exact anchor must match its ID and does not turn first-page failure into success

**`test/programs/program_function_lead_test.dart`** — behaviour · subject `lib/programs/presentation/program_work_screen.dart`, `lib/programs/presentation/program_attention_screen.dart` · decided by rules, 3 by hand, test bodies read

- `body` work shell opens Now & next and Attention for function leads
- `body` work shell hides lead rows for other duties
- `domain` Now & next buckets functions by window
- `domain` attention feed renders duty alerts newest first
- `body` attention feed shows the empty state without alerts

**`test/programs/program_guest_desk_test.dart`** — behaviour · subject `lib/programs/presentation/program_guest_desk_screen.dart` · decided by rules, 2 by hand

- `journey` guestRelations staff see the guest desk rows and open them
- `body` greeters without the desk duty get the empty shell
- `body` the staff guest desk hides coordinator mutations but keeps RSVP edits
- `body` program coordinators retain roster mutations on the desk
- `body` {scenario} gets the correct guest desk access

**`test/programs/program_guest_edit_dialog_test.dart`** — behaviour · subject `lib/programs/presentation/program_guest_edit_dialog.dart` · decided by rules

- `journey` empty guest name keeps editor open without a result
- `body` guest editor returns trimmed fields with stable selected group order
- `body` deselected household and blank optional fields remain null
- `action` guest page maps the extracted editor result to the same upsert fields

**`test/programs/program_guest_group_hotel_editor_test.dart`** — behaviour · subject `lib/programs/presentation/program_guests_screen.dart` · decided by rules

- `action` new group selects a hotel from the program catalog
- `action` editing a group clears its hotel with revision fence

**`test/programs/program_guests_function_row_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/programs/presentation/program_guests_screen.dart` · decided by rules

- `body` {scenario} has accurate localized function copy
- `body` attending choice preserves its wire value
- `body` not-invited badge does not rewrite RSVP selection or callback values
- `body` pending mutation keeps localized status and hides RSVP editor

**`test/programs/program_guests_phone_import_navigation_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/programs/presentation/program_guests_screen.dart`, `lib/hosts/audience/phone_import/presentation/phone_import_route_controller.dart` · decided by rules

- `journey` manager Guests opens the existing guarded phone-import route
- `body` manager entry is hidden for {entry}
- `body` detail {kind}/{status} hides entry
- `body` refresh never retains the entry and a fresh denial hides it
- `body` transient access failure has scoped retry and preserves Guests

**`test/programs/program_hotel_pagination_test.dart`** — behaviour · subject `lib/programs/presentation/program_hotel_desk_screen.dart` · decided by rules

- `action` hotel pages remain independent and refresh the mutated page

**`test/programs/program_hotel_rooms_test.dart`** — behaviour · subject `lib/programs/presentation/program_hotel_rooms_screen.dart` · decided by rules

- `body` room board renders blocks, stays, and the unplaced queue
- `action` assigning an unplaced guest writes a stay on the block
- `action` checked-in stays lock placement and permit checkout
- `body` empty board renders inline empty states

**`test/programs/program_lifecycle_affordances_test.dart`** — behaviour · subject `lib/programs/presentation/program_events_row.dart`, `lib/programs/presentation/program_guest_desk_screen.dart` · decided by rules, 1 by hand

- `journey` {status} setup-only row opens without lifecycle commands
- `body` creator {status} command honors pending={pending}
- `body` {duty} can share RSVP links with independent edit authority
- `body` archived guest desk does not offer RSVP link issuance
- `body` expired guest-relations grant does not expose RSVP sharing
- `body` restore menu is disabled after grace expires before sweep

**`test/programs/program_lodging_board_test.dart`** — behaviour · subject `lib/programs/presentation/program_lodging_layout.dart` · decided by rules

- `body` empty-room move uses the reviewed proposal and destination
- `body` checked-in parties stay locked and invalid rooms explain why
- `body` layered 2D map and list show the same rooms including empties
- `body` late preview for an old proposal cannot enable a move
- `body` callback rebuild cannot overlap an unfinished move
- `body` floor change clears the hidden room confirmation

**`test/programs/program_lodging_controller_test.dart`** — behaviour · subject `lib/programs/presentation/program_lodging_controller.dart` · decided by rules

- `action` membership save binds guest revision and explicit empty exclusion
- `action` membership save without lodging setup reloads an honest empty view
- `action` uncertain membership write hides old choices and refresh never repeats it
- `action` acknowledged membership save failed reload never repeats prior revision
- `action` disposed membership save cannot launch a late preview
- `action` late membership read cannot deliver after account authority changes
- `action` earlier loaded setup expiry blocks imperative membership access but permits refresh
- `action` initial private view uses exact current proposal and setup
- `action` missing setup exposes no invented rooms or sharing assumptions
- `action` busy regeneration rejects a second mutation
- `action` uncertain publication retries exact command without stale save
- `action` uncertain approval retries one immutable save and same operation
- `action` acknowledged decision with failed refresh hides stale controls
- `action` authority generation invalidates private view and late regeneration
- `action` account switch rejects a late proposal from the prior session
- `action` disposing during save cannot start the subsequent approval write
- `action` late transition cannot clear a rebuilt pending decision
- `action` disposing during transition cannot start a late preview
- `action` refresh cannot discard an uncertain decision identity
- `action` staged setup save binds exact configuration revision and adoptions
- `action` disposed setup save cannot start late preview
- `action` acknowledged {variant} save reload failure hides old write
- `action` definitive {variant} permits fresh source instead of stale retry
- `action` unrecognized failed precondition retains exact uncertain command
- `action` uncertain hotel confirmation retries exact hotel and operation identity
- `action` confirmation rejects missing or unallocated hotel before a write
- `action` acknowledged hotel confirmation never republishes on failed reload

**`test/programs/program_lodging_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/programs/presentation/program_lodging_screen.dart` · decided by rules

- `action` expired refresh retains uncertain publication receipt fence
- `action` membership chooser can explicitly clear an existing inclusion
- `body` membership setup expiry hides private chooser before selection
- `body` membership evidence expiry hides the complete private editor
- `action` routed membership review includes no-travel guests and records explicit choices
- `action` uncertain membership save offers fresh read without old save controls
- `journey` route renders current private proposal with explicit publication
- `body` missing setup renders an empty state without mutating
- `action` pending decision disables refresh without losing retry
- `action` routed setup saves the reviewed revision without inventing sharing
- `action` routed acknowledged setup reload failure hides stale save controls
- `action` routed stale setup rejection offers a fresh read without repeating write
- `action` session change discards the private routed setup draft
- `action` recording hotel confirmation is separate from guest publication
- `body` hotel confirmation is displayed only for the exact approved proposal

**`test/programs/program_lodging_setup_editor_test.dart`** — behaviour · subject `lib/programs/presentation/program_lodging_setup_page_body.dart` · decided by rules

- `action` empty setup cannot save invented household sharing
- `body` new inventory requires the host to enter a room type
- `action` verified staged setup saves original stable identities and revision

**`test/programs/program_operations_controller_test.dart`** — behaviour · subject `lib/programs/presentation/program_operations_controller.dart` · decided by rules

- `action` offline claim, ready and departure retain chained revision fences
- `action` a rejected departure stays visible and does not report acceptance
- `action` an unrelated conflict does not reject an accepted observation
- `action` account switch hides saved work and blocks callbacks from the old screen
- `action` a save followed by an unknown sync failure preserves the command
- `action` failed initial storage load is exposed and can be retried
- `action` reconnect during append flushes after save and serializes double taps

**`test/programs/program_reconciliation_test.dart`** — behaviour · subject `lib/programs/presentation/program_trips_screen.dart` · decided by rules, 1 by hand

- `body` a reconciliation viewer reviews exceptions read-only
- `body` a dispatcher still sees the void affordance
- `action` export walks the ledger pages and shares a CSV file

**`test/programs/program_stakeholder_screen_test.dart`** — behaviour · subject `lib/programs/presentation/program_stakeholder_screen.dart` · decided by rules, 1 by hand

- `body` renders counts with function and hotel names joined from work access
- `body` falls back to ids when access names are absent
- `body` renders inline empty states for a program without scope
- `body` renders the error state when the counts read fails

**`test/programs/program_timezone_field_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/programs/presentation/program_timezone_field.dart` · decided by rules

- `parts` search selects a named zone and never submits query scale={scale}

**`test/programs/program_timezone_providers_test.dart`** — behaviour · subject `lib/programs/presentation/program_timezone_providers.dart` · decided by rules

- `domain` private organizer setting takes precedence over city and device
- `domain` city fallback remains explicit when private settings cannot be read
- `domain` unknown city falls back to the device, not an invented organizer zone
- `domain` unavailable device leaves an explicit manual selection
- `action` fresh default or exact recovered timezone restored={restored} pending={pending}

**`test/programs/program_trip_pagination_test.dart`** — behaviour · subject `lib/programs/presentation/program_trips_screen.dart` · decided by rules

- `journey` ledger navigates pages and clears a page on learned revocation

**`test/programs/program_work_invite_route_test.dart`** — behaviour · subject `lib/programs/presentation/program_work_screen.dart` · decided by rules

- `journey` a successful invite replaces its URL and reopens offline without a claim
- `journey` a rejected invite keeps its URL for retry
- `journey` leaving a pending invite prevents a late route replacement

**`test/programs/program_workspace_logistics_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/programs/presentation/program_workspace_screen.dart` · decided by rules

- `body` empty logistics state and inactive badges render
- `action` add pickup point submits kind, label and details
- `action` edit pickup point carries id and revision fence
- `action` add hotel submits name, address and reception contact
- `action` edit hotel carries id and revision fence

**`widgetbook/test/program_dispatch_sheet_test.dart`** — behaviour · subject `lib/programs/presentation/program_dispatch_screen.dart` · decided by rules · adjacent, not in the totals

- `action` a rejected departure stays reviewable until {change} changes

**`widgetbook/test/program_journal_recovery_test.dart`** — behaviour · subject `lib/programs/presentation/program_operations_notice.dart` · decided by rules · adjacent, not in the totals

- `body` quarantined work exports only after explicit action and remains intact
- `journey` an account change while preparing recovery never opens sharing

**`widgetbook/test/program_operations_review_test.dart`** — behaviour · subject `lib/programs/presentation/program_operations_notice.dart` · decided by rules · adjacent, not in the totals

- `body` review identifies saved work and dismisses only the selected change

**`widgetbook/test/program_trips_preview_test.dart`** — behaviour · subject `lib/programs/presentation/program_trips_screen.dart` · decided by rules · adjacent, not in the totals

- `body` Trips catalog uses its fixture clock for active duty actions
- `body` the same Trips fixture loses actions when its grant expires


### P5 live/formats

`apps/host/lib/live/formats`. 21 behaviours: 6 domain, 2 action, 11 body, 2 journey.

**`test/event_success/event_success_live_control_guard_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_host_screen.dart`, `lib/event_success/presentation/reveal/event_success_host_reveal_surface.dart` · decided by rules

- `action` reveal requires confirmation and published reveal has no reset
- `body` rotation publish requires confirmation

**`test/event_success/event_success_live_reveal_card_state_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_live_reveal_card_state.dart` · decided by rules

- `domain` EventSuccessRevealActionState: reports loading when any reveal mutation is pending
- `domain` EventSuccessRevealActionState: uses the first available action error in display order
- `domain` EventSuccessRevealActionState: falls back to later action errors when earlier actions are clean

**`test/event_success/event_success_live_screens_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_host_screen.dart`, `lib/event_success/presentation/event_success_companion_screen_state.dart` · decided by rules, 3 by hand · also under P3.4 live, P3.5 insights, P5 events, P6 live

- `body` host live mode excludes opted-out stale rotations
- `body` host skips rotation drafts when the saved plan does not use them
- `body` host live mode summarizes generated micro-pod groups
- `body` host live mode excludes opted-out stale pod assignments
- `body` host live mode summarizes generated rotation schedules
- `journey` host live mode opens group override editor
- `body` host live mode marks host-edited rotations
- `journey` host live mode opens rotation override editor
- `body` host live mode requires generation before rotation edits

**`test/event_success/event_success_live_standings_test.dart`** — behaviour · subject `lib/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart`, `lib/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart` · decided by rules, 1 by hand

- `body` standings reuse the assignment reveal visibility gate
- `action` Host records a complete score round inside the reveal card

**`test/event_success/event_success_motion_contract_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_motion_contract.dart` · decided by rules

- `domain` three portable assets cover every generated stage motif
- `domain` Dart resolves the shared parity fixture and deterministic geometry
- `domain` server clock owns every ceremony phase boundary

**`test/event_success/event_success_reveal_clock_test.dart`** — behaviour · subject `lib/event_success/presentation/reveal/event_success_reveal_clock_mixin.dart` · decided by rules

- `body` reveal clock starts, pauses, resumes, and cancels on disposal
- `body` a parent refresh with the same clock state retains its cadence


### P6 onboarding

`apps/consumer/lib/onboarding`. 144 behaviours: 29 domain, 74 action, 36 body, 5 journey; 2 more in `widgetbook/test`.

**`test/architecture/keep_alive_provider_lifecycle_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_controller.dart`, `lib/onboarding/presentation/onboarding_step.dart` · decided by rules · also under P6 explore, P6 live, P6 chats

- `action` keepAlive provider lifecycle: auth OTP flow state survives route listener disposal
- `action` keepAlive provider lifecycle: onboarding form state survives step listener disposal

**`test/auth/presentation/auth_controller_test.dart`** — behaviour · subject `lib/auth/presentation/auth_controller.dart` · decided by rules · also under P5 onboarding

- `action` AuthController OTP attempt ownership: already-dispatched automatic auth cannot clear replacement B
- `action` AuthController OTP attempt ownership: late registration error for A cannot settle pending B
- `action` AuthController OTP attempt ownership: {variant} releases pending A without clearing replacement B
- `action` AuthController OTP attempt ownership: pending disposal settles A and ignores every retained callback
- `action` AuthController OTP attempt ownership: same-phone resend supersedes A while retaining its own token
- `action` AuthController OTP attempt ownership: {boundary} ignores late A codeSent
- `action` AuthController OTP attempt ownership: {boundary} ignores late A auto verification
- `action` AuthController OTP attempt ownership: reset ignores all retained A callbacks after B codeSent
- `action` AuthController OTP attempt ownership: reset settles an abandoned pending send on a stale callback
- `action` AuthController OTP attempt ownership: disposal makes retained codeSent a harmless no-op
- `action` AuthController OTP attempt ownership: disposal blocks the repository call for retained auto auth
- `action` AuthController OTP attempt ownership: current attempt may auto verify after its codeSent
- `action` AuthController OTP attempt ownership: deduplication retains one attempt and the exact future
- `body` AuthController OTP attempt ownership: invalid input preserves an eligible current attempt
- `action` AuthController OTP attempt ownership: same normalized phone reuses only its own resend token
- `action` AuthController OTP attempt ownership: late A cannot contaminate a resend token for B phone
- `body` AuthController OTP attempt ownership: current verification failure reaches its own request
- `action` AuthController OTP attempt ownership: late A failure does not settle or corrupt pending B
- `action` AuthController.sendOtp: prefixes +91 and advances to the OTP step when code is sent
- `action` AuthController.sendOtp: uses the previous resend token for repeat OTP requests
- `action` AuthController.sendOtp: does not reuse the resend token for a different phone number
- `action` AuthController.sendOtp: deduplicates an active request and freezes request-defining state
- `action` AuthController.sendOtp: reset ignores callbacks from an abandoned OTP request
- `action` AuthController.sendOtp: rejects invalid phone numbers before calling Firebase Auth
- `action` AuthController.sendOtp: rejects invalid country codes before calling Firebase Auth
- `action` AuthController.sendOtp: uses signInWithCredential during auto verification
- `action` AuthController.verifyOtp: throws when no verification session is active
- `action` AuthController.verifyOtp: signs in with the stored verification id
- `action` AuthController.verifyOtp: rejects malformed OTP codes before repository sign-in
- `action` AuthController state management: initial country code maps the platform locale
- `action` AuthController state management: defaults country code from the locale provider
- `action` AuthController state management: setCountryCode updates state and resets mutation
- `action` AuthController state management: goToStep changes the current step
- `action` AuthController state management: reset clears all state
- `action` AuthController state management: reset restores the locale-derived country code
- `action` AuthSessionController: unregisters an existing push service before auth sign-out
- `action` AuthSessionController: signOut delegates to the repository and clears auth flow state
- `action` AuthSessionController: signOut clears keepAlive Explore browse state
- `action` AuthSessionController: signOut returns one active session operation

**`test/auth/presentation/auth_input_test.dart`** — behaviour · subject `lib/auth/presentation/auth_input.dart` · decided by rules

- `domain` AuthInput: normalizes national phone numbers
- `domain` AuthInput: normalizes international phone numbers
- `domain` AuthInput: returns a semantic issue for invalid phone numbers
- `domain` AuthInput: rejects malformed country codes with shared UI message
- `domain` AuthInput: normalizes a six digit OTP code
- `domain` AuthInput: rejects malformed OTP codes
- `domain` AuthInput: formats and masks phone numbers for UI/logging

**`test/auth/presentation/auth_presentation_state_test.dart`** — behaviour · subject `lib/auth/presentation/auth_presentation_state.dart` · decided by rules

- `domain` AuthPhoneEntryViewState: derives country, autofocus, and loading state from auth inputs
- `domain` AuthPhoneEntryViewState: does not autofocus outside the phone step
- `action` AuthOtpEntryViewState: enables verification for a complete OTP when mutations are idle
- `domain` AuthOtpEntryViewState: disables actions during resend and formats pending copy
- `domain` AuthOtpEntryViewState: disables verification for incomplete codes and verify pending state

**`test/auth/presentation/auth_screen_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/auth/presentation/auth_screen.dart` · decided by rules, 3 by hand · also under P5 onboarding

- `body` AuthScreen: large text keeps {role} auth usable in {theme}
- `body` AuthScreen: defaults the country picker to India
- `body` AuthScreen: uses the locale-derived country picker default
- `journey` AuthScreen: country picker opens with dark theme styles
- `body` AuthScreen: switch between phone and OTP views
- `journey` AuthScreen: change number returns to phone step
- `action` AuthScreen: phone form sends OTP through the controller
- `action` AuthScreen: phone form freezes request inputs and ignores duplicate sends
- `action` AuthScreen: phone form shows validation before sending OTP
- `action` AuthScreen: OTP entry verifies with the stored verification id
- `action` AuthScreen: OTP entry ignores duplicate submits while pending
- `body` AuthScreen: OTP verification errors settle back into an editable state

**`test/launch_access/launch_access_application_screen_test.dart`** — behaviour · subject `lib/launch_access/presentation/launch_access_application_screen.dart` · decided by rules

- `body` launch access keeps form-shaped skeleton while loading
- `body` launch access form uses CatchField toggle for host interest

**`test/launch_access/launch_access_controller_test.dart`** — behaviour · subject `lib/launch_access/presentation/launch_access_controller.dart` · decided by rules

- `action` LaunchAccessController: edits and submits the current user application draft
- `action` LaunchAccessController: draft resets after route listener disposal

**`test/onboarding/onboarding_account_policy_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_controller.dart`, `lib/onboarding/presentation/onboarding_step.dart` · decided by rules

- `action` account saves a single name and optional birthday {birthday}
- `action` account switch rejects a stale profile draft before writing
- `action` social entry asks for missing birthday before photos
- `action` social identity patches preserve the existing rich account
- `action` social identity rejects a missing or underage birthday
- `domain` birthday form policy follows the requested capability
- `body` name-only form creates account without asking social questions
- `action` event birthday completion preserves a minimal profile without social questions
- `action` cohort-only event completion does not request or write a birthday
- `body` age-only event form saves birthday and omits name and matching questions
- `action` account save disables controls and shows retryable errors

**`test/onboarding/onboarding_controller_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_controller.dart` · decided by rules

- `action` OnboardingController.initStep: {label} does not fetch a draft or initialize a new profile
- `action` OnboardingController.initStep: cached profile identity survives a failed refresh on entry
- `action` OnboardingController.initStep: starts on the welcome step for signed-out users
- `action` OnboardingController.initStep: jumps to the profile step and reuses auth phone when no profile exists
- `action` OnboardingController.initStep: starts social completion at photos for booking-ready profiles
- `action` OnboardingController.initStep: starts run preference completion at the running step
- `action` OnboardingController.initStep: starts at welcome for signed-in users without a phone
- `action` OnboardingController.initStep: does not resume a persisted draft when the signed-in user has no phone
- `action` OnboardingController.initStep: clamps old social-step drafts to the booking identity flow
- `action` OnboardingController.saveProfile: deduplicates an active save and freezes controller-owned draft state
- `action` OnboardingController.saveProfile: throws when the user is no longer signed in
- `action` OnboardingController.saveProfile: persists booking-ready identity without advancing to social steps
- `action` OnboardingController.saveProfile: social identity rejects missing interested-in genders
- `action` OnboardingController.saveProfile: stays on gender preferences when profile persistence fails
- `action` OnboardingController.completeRunPreferences: deduplicates an active completion request
- `action` OnboardingController.completeRunPreferences: throws when the latest profile is unavailable
- `action` OnboardingController.completeRunPreferences: saves running preferences without changing social completion
- `action` OnboardingController.completeSocialProfile: saves prompts and marks the social profile complete

**`test/onboarding/onboarding_flow_state_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_flow_state.dart` · decided by rules

- `domain` OnboardingFlowState: keeps welcome as a body-only shell with no top bar
- `domain` OnboardingFlowState: standard account setup has one identity step
- `domain` OnboardingFlowState: locks profile-completion back target to the photos step
- `action` OnboardingFlowState: freezes backward navigation while a step mutation is pending
- `domain` OnboardingFlowState: locks run-preferences entry to a single-step flow

**`test/onboarding/onboarding_step_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_step.dart` · decided by rules

- `domain` OnboardingStepX: shows progress for every step after welcome
- `domain` OnboardingStepX: locks back navigation to name step once profile steps begin
- `domain` OnboardingStepX: returns the previous step only when still above the minimum
- `domain` OnboardingStepX.headerCopy: surfaces the question and supporting line per step
- `domain` OnboardingStepX.headerCopy: photos/prompts switch copy in profile-completion mode
- `domain` OnboardingStepX.headerCopy: running prefs distinguishes completion vs run-only entry

**`test/onboarding/onboarding_widgets_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/onboarding/presentation/onboarding_screen.dart` · decided by rules, 4 by hand

- `domain` OnboardingProfilePromptsBody: state derives prompt progress, available prompts, and submit intent
- `body` OnboardingProfilePromptsBody: provider-free step shows progress and forwards continue
- `body` OnboardingProfilePromptsBody: pending completion freezes prompt questions and answers
- `body` OnboardingProfilePromptsBody: prompt pickers hide prompts selected in other slots
- `domain` OnboardingWelcomeBody: reel phrase bank matches strings.json
- `body` OnboardingWelcomeBody: shows the landed welcome page with CTA
- `body` OnboardingWelcomeBody: reduced motion renders landed state immediately
- `body` OnboardingWelcomeBody: tap skips the reel into the welcome CTAs
- `journey` OnboardingWelcomeBody: see whats on routes through the named Explore route
- `journey` OnboardingScreen: back button returns editable onboarding steps to previous step
- `domain` OnboardingNameDobBody: state derives draft display, date policy, and submit intent
- `body` OnboardingNameDobBody: provider-free step forwards date and continue actions
- `body` OnboardingNameDobBody: validates required fields before continuing
- `body` OnboardingNameDobBody: social birthday advances to matching preferences
- `body` OnboardingNameDobBody: keeps phone field read-only
- `domain` OnboardingGenderInterestBody: state validates selections and creates submit intent
- `body` OnboardingGenderInterestBody: provider-free step forwards typed choice actions
- `body` OnboardingGenderInterestBody: pending save freezes both choices and continue
- `body` OnboardingGenderInterestBody: validates required selections before continuing
- `body` OnboardingGenderInterestBody: restores saved selections from the onboarding draft
- `domain` OnboardingInstagramBody: state trims continue handles and clears skipped handles
- `body` OnboardingInstagramBody: provider-free step forwards continue and skip actions
- `body` OnboardingInstagramBody: continues with a trimmed handle and advances to photos
- `body` OnboardingInstagramBody: skip clears the handle and advances to photos
- `domain` OnboardingPhotosBody: state derives continue gating and photo slot intents
- `body` OnboardingPhotosBody: provider-free step forwards typed photo actions
- `body` OnboardingPhotosBody: explains why continue is disabled until enough photos are added
- `body` OnboardingPhotosBody: explains the catches gate in profile-completion mode
- `body` OnboardingPhotosBody: surfaces upload failures from the photo upload controller
- `domain` OnboardingRunningPrefsBody: state derives labels and submit payload
- `body` OnboardingRunningPrefsBody: provider-free step shows state and forwards continue
- `body` OnboardingRunningPrefsBody: pending completion freezes every run-preference control
- `body` OnboardingRunningPrefsBody: explains run preferences as event-specific booking data

**`test/onboarding/welcome_reel_handoff_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/onboarding/presentation/pages/onboarding_welcome_body.dart`, `lib/onboarding/presentation/onboarding_controller.dart` · decided by rules

- `body` Welcome reel handoff: does not replay after the consumer cold-start reel

**`test/routing/router_widgets_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_screen.dart`, `lib/payments/presentation/payment_history_screen.dart` · decided by rules · also under P3.2 events/create, P5 people, P6 chats

- `journey` production router retries profile failure before {variant}

**`widgetbook/test/onboarding_previews_test.dart`** — behaviour · subject `lib/onboarding/presentation/onboarding_controller.dart`, `lib/onboarding/presentation/onboarding_step.dart` · decided by rules · adjacent, not in the totals

- `body` onboarding specimens have independent prepared initial states
- `body` changing a preview mode replaces pending state before mounting

Layout only, deleted with the screen:

- `test/core/consumer_bootstrap_test.dart`: 7 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand
- `test/onboarding/onboarding_composition_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand


### P6 home

`apps/consumer/lib/home`. 43 behaviours: 15 domain, 2 action, 3 parts, 17 body, 6 journey.

**`test/chats/fcm_service_lifecycle_test.dart`** — behaviour · subject `lib/notifications/presentation/foreground_notification_controller.dart` · decided by rules

- `action` shared shell initialization connects actual SDK stream to arrivals

**`test/dashboard/cross_paths_notification_route_test.dart`** — behaviour · subject `lib/dashboard/presentation/notifications_list_state.dart` · decided by rules

- `domain` pending invitations route to detail and accepted plans route to chat
- `domain` organizer updates route with their organizer identity

**`test/dashboard/dashboard_full_view_model_test.dart`** — behaviour · subject `lib/dashboard/presentation/dashboard_full_view_model.dart` · decided by rules

- `domain` dashboardHomeScreenStateProvider: returns the signed-out empty state without notification chrome
- `domain` dashboardHomeScreenStateProvider: surfaces membership failures with a typed retry target
- `domain` dashboardHomeScreenStateProvider: normalizes provider loading waves into one loading state
- `domain` dashboardHomeScreenStateProvider: returns signed-in idle as a full live-layer state
- `domain` dashboardHomeScreenStateProvider: returns full state with pinned header copy and followed clubs
- `domain` buildDashboardFullViewModel: selects the nearest upcoming event as nextEvent
- `domain` buildDashboardFullViewModel: filters past booked events out of upcomingEvents
- `domain` buildDashboardFullViewModel: surfaces attended section errors and clears open windows
- `domain` buildDashboardFullViewModel: carries all open windows, ordered by soonest expiry
- `domain` buildDashboardFullViewModel: selects the latest attended event that has not been reviewed
- `domain` buildDashboardFullViewModel: surfaces unread club post notifications as a home module
- `domain` buildDashboardFullViewModel: selects self check-in during the event check-in window

**`test/dashboard/dashboard_home_catch_windows_test.dart`** — behaviour · subject `lib/dashboard/presentation/dashboard_screen.dart`, `lib/dashboard/presentation/dashboard_full_view_model.dart` · decided by rules

- `journey` DashboardScreen Catch windows: logs each Home window and opens its existing catch route
- `body` DashboardScreen Catch windows: moves an expired Catch window into the review phase

**`test/dashboard/dashboard_screen_test.dart`** — mixed (7 layout cases go with the screen) · subject `lib/dashboard/presentation/dashboard_screen.dart` · decided by rules

- `body` Dashboard full home shell: keeps the focus list while attended enrichment is loading
- `body` Dashboard full home shell: keeps live focus content when attended enrichment fails
- `body` Dashboard full home shell: renders the catch window before booked events
- `body` Dashboard full home shell: shows both open Catch windows without a swipe
- `body` Dashboard full home shell: shows self check-in as the first dashboard content card
- `body` Dashboard full home shell: surfaces self check-in failures inline
- `journey` Dashboard full home shell: event focus directions opens the event location externally
- `body` Dashboard full home shell: event focus shows full-width cards with a condensed upcoming tail
- `domain` NotificationsListState: groups visible rows with an injected clock
- `body` DashboardScreen: shows a loading state while booked events are loading
- `body` DashboardScreen: shows an error when booked events fail to load
- `body` DashboardScreen: uses shared offline copy for typed dashboard load failures
- `body` DashboardScreen: shows the in-body idle CTA when there are no live modules
- `journey` DashboardScreen: logs idle home open, module impression, and CTA tap
- `body` DashboardScreen: keeps host tools out of the consumer empty state
- `body` DashboardScreen: shows the full dashboard when booked events exist
- `body` DashboardScreen: club posts home section renders unread post cards
- `journey` DashboardScreen: notifications screen opens with a manual read action
- `body` DashboardScreen: notifications identity failure is not shown as signed out
- `journey` DashboardScreen: notification row navigation failures show branded feedback
- `body` DashboardScreen: notifications screen renders grouped notification rows

**`test/dashboard/event_focus_list_test.dart`** — behaviour · subject `lib/dashboard/presentation/widgets/event_focus_list.dart` · decided by rules

- `parts` renders all windows in expiry order before upcoming, with counts and CTAs
- `parts` shows a static rounded countdown when animations are disabled
- `parts` updates the countdown while the window remains open

**`test/notifications/foreground_notification_test.dart`** — behaviour · subject `lib/notifications/presentation/foreground_notification_controller.dart` · decided by rules

- `action` session gate dedupes events and clears queue on account/lifecycle changes
- `journey` foreground receipt renders globally, taps route, and active chat suppresses another card

Layout only, deleted with the screen:

- `test/dashboard/empty_hero_card_test.dart`: 1 cases · geometry or style properties only · decided by rules and hand
- `widgetbook/test/dashboard_home_previews_test.dart`: 1 cases · Widgetbook mount check: the use case renders without throwing · decided by rules · adjacent


### P6 explore

`apps/consumer/lib/explore`. 189 behaviours: 86 domain, 8 action, 5 parts, 81 body, 9 journey.

**`test/architecture/keep_alive_provider_lifecycle_test.dart`** — behaviour · subject `lib/explore/presentation/explore_view_model.dart` · decided by rules · also under P6 onboarding, P6 live, P6 chats

- `domain` keepAlive provider lifecycle: Explore city selection keeps manual choice and guard across listeners
- `domain` keepAlive provider lifecycle: Explore search query survives listener disposal
- `domain` keepAlive provider lifecycle: Explore filters survive listener disposal

**`test/calendar/calendar_screen_state_test.dart`** — behaviour · subject `lib/events/presentation/calendar/calendar_screen_state.dart` · decided by rules

- `domain` CalendarHomeState: uses the next event date as the default selected date
- `domain` CalendarHomeState: preserves explicit selected date and header mode
- `domain` CalendarHomeState: derives agenda section state from club-name lookup phases
- `domain` CalendarHomeState: empty agenda state wins before club-name lookup state
- `domain` CalendarEventSummary: merges joined and saved events into the calendar display policy
- `domain` CalendarEventSummary: agenda rows classify saved-only and cancelled events

**`test/calendar/calendar_screen_test.dart`** — behaviour · subject `lib/events/presentation/calendar/calendar_screen.dart` · decided by rules, 2 by hand

- `body` CalendarScreen: shows loading while the auth session resolves
- `body` CalendarScreen: shows an auth error when the session fails to load
- `body` CalendarScreen: shows a loading state while booked events are loading
- `body` CalendarScreen: keeps calendar chrome visible while club names load
- `body` CalendarScreen: seeds expanded month and selected date
- `body` CalendarScreen: shows the empty calendar when the user has no planned events
- `body` CalendarScreen: shows an error state when planned events fail to load
- `body` CalendarScreen: renders agenda stats and booked event details
- `body` CalendarScreen: includes future saved events as planned calendar rows
- `body` CalendarScreen: anchors calendar summary to the next upcoming event
- `body` CalendarScreen: falls back to the current week when there are no upcoming events
- `body` CalendarScreen: scrolls as one surface so later agenda events are reachable
- `body` CalendarScreen: tapping a week date scrolls to that agenda day
- `body` CalendarScreen: pulling down expands month grid and scrolling up collapses it
- `body` CalendarScreen: collapsed week strip follows a date selected from month grid
- `body` CalendarScreen: Today button returns expanded calendar to current day
- `body` CalendarScreen: keeps month and week picker tappable after agenda jump
- `journey` CalendarScreen: opens a booked event from the agenda and back returns to calendar

**`test/cross_paths/cross_paths_explore_card_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/cross_paths/presentation/cross_paths_explore_card.dart` · decided by rules, read end to end

- `parts` person and event remain distinct accessible actions
- `parts` reports one impression when the lazy feed card mounts
- `parts` pair inventory offers an invitation before booking

**`test/events/calendar_screen_test.dart`** — behaviour · subject `lib/events/presentation/calendar/calendar_screen.dart` · decided by rules

- `body` CalendarScreen: shows loading while the auth session resolves
- `body` CalendarScreen: shows an auth error when the session fails to load
- `body` CalendarScreen: shows a signed-out empty calendar without querying events
- `body` CalendarScreen: shows a signed-in empty calendar after event streams resolve

**`test/events/event_date_rail_card_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/events/shared/event_tiles/event_date_rail_card.dart` · decided by rules

- `body` DateTicket uses activity art and a trailing price decision
- `parts` DateTicket exposes veiled attendee proof without identities

**`test/events/event_map_screen_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/events/presentation/event_map_screen.dart` · decided by rules, 1 by hand

- `domain` distance-ring geography projects a northern radius edge
- `domain` distance-ring geography exposes all camera-fit bounds
- `domain` selected native pins keep the resting bitmap while art resolves
- `body` shows a map-shaped skeleton while map events load
- `body` shows an empty state when no map events are available
- `body` preserveCanvasWhenEmpty keeps map and distance ring visible
- `body` selecting a map marker makes its pin the camera target
- `body` external event pins select with their exact map coordinate
- `body` background tap clears selected map marker
- `body` explicit fixture is neutral and composes the distance ring
- `body` native map wrapper supports byte-backed marker icons
- `domain` event pin clusters rasterize app-owned ink count markers
- `journey` event pin maps expose user dot and distance ring circles
- `body` event pin maps report initial and moved camera centers
- `domain` event pin maps cluster dense pins at low zoom

**`test/events/event_map_view_model_test.dart`** — behaviour · subject `lib/events/presentation/event_map_view_model.dart` · decided by rules

- `domain` buildEventMapViewModel: deduplicates events, keeps signed-up data, and sorts chronologically
- `domain` buildEventMapViewModel: filters map pins without dropping unpinned event rows
- `domain` buildEventMapViewModel: filters past and cancelled events out of the map surface
- `domain` resolveEventMapInitialCenter: uses device location while the city is auto-selected
- `domain` resolveEventMapInitialCenter: uses selected city when device location is unavailable
- `domain` resolveEventMapInitialCenter: uses selected city when the user overrides the city
- `domain` eventMapViewModelProvider: combines profile, signed-up, saved, and recommended events

**`test/events/events_widgets_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/events/shared/event_agenda_list.dart`, `lib/events/shared/event_tiles/event_tiles.dart` · decided by rules · also under P3.2 events/create, shared lib/pages/event

- `body` Events widgets: agenda and action widgets render and handle selection
- `body` Events widgets: agenda list sorts events and forwards selected-event taps

**`test/events/saved_events_screen_test.dart`** — behaviour · subject `lib/events/presentation/saved_events_screen.dart` · decided by rules

- `domain` SavedEventsListState: orders upcoming saved events before past saved events
- `body` SavedEventsScreen: shows loading while the auth session resolves
- `body` SavedEventsScreen: shows an auth error when the session fails to load
- `body` SavedEventsScreen: shows an empty state when there are no saved events
- `body` SavedEventsScreen: orders upcoming saved events before past saved events
- `journey` SavedEventsScreen: opens saved event detail from the list

**`test/explore/explore_city_controller_test.dart`** — behaviour · subject `lib/explore/presentation/explore_city_controller.dart` · decided by rules

- `action` autoSelectCity uses profile city before device location
- `action` autoSelectCity falls back to nearest device city
- `action` autoSelectCity leaves default city when no location is available
- `action` watching the controller auto-selects when profile data arrives

**`test/explore/explore_cross_paths_feed_test.dart`** — behaviour · subject `lib/explore/presentation/explore_cross_paths_provider.dart` · decided by rules

- `domain` second organizer stays outside the first eight mixed cards
- `domain` callable context includes only booked or bookable events
- `domain` mixed feed stays event-majority and separates people

**`test/explore/explore_cross_paths_qa_test.dart`** — behaviour · subject `lib/explore/presentation/explore_view_model.dart`, `lib/explore/presentation/explore_feed_providers.dart` · decided by rules

- `domain` signed-in synthetic viewer can see only its hidden-organizer QA event

**`test/explore/explore_discovery_window_controller_test.dart`** — behaviour · subject `lib/explore/presentation/explore_discovery_window_controller.dart` · decided by rules

- `action` loadNext accumulates the active query window without duplicates
- `action` loadNext restores the current page and rethrows failures

**`test/explore/explore_view_model_test.dart`** — behaviour · subject `lib/explore/explore.dart`, `lib/events/shared/event_tiles/event_tiles.dart` · decided by rules

- `domain` Explore state: ExploreDiscoveryEmptyState derives provider-free empty actions
- `domain` Explore state: ExploreEventsEmptyState derives provider-free event actions
- `domain` Explore state: ExploreMapLauncherState hides until mapped supply is loaded
- `domain` Explore state: ExploreCityButtonState derives provider-free city chrome
- `domain` Explore state: ExploreCityPickerState exposes provider-free picker availability
- `domain` Explore state: ExploreChromeState derives browse header labels
- `domain` Explore state: ExploreChromeState derives discovery cover/search policy
- `domain` Explore state: ExploreFilterRailState derives active count and semantics
- `domain` Explore state: ExploreFilterSheetState derives distance and area options
- `domain` Explore state: ExploreDateStripState exposes seven dates with supply density
- `domain` Explore state: ExploreFilterSheetState keeps cursor counts honest
- `domain` Explore state: ExploreCoverStoryState derives provider-free cover copy
- `domain` Explore state: ranked hero beats chronology and stays in the feed
- `domain` Explore state: blocked events cannot become the Explore hero
- `domain` Explore state: cover CTA describes the next detail action honestly
- `domain` Explore state: ExploreFeedSectionState counts the full feed and keeps the cover event visible
- `domain` Explore state: ExploreFeedSectionState promotes a real two-day This week strip
- `domain` Explore state: mixed feed chronologically merges internal and external plans before clubs
- `domain` Explore state: mixed feed does not silently truncate external results
- `domain` Explore state: ticket strip joins only uninterrupted internal event rows
- `domain` Explore state: mappableEventCount includes required-location event supply
- `domain` Explore state: result count uses a plus while cursor pages remain
- `domain` Explore state: map view model preserves external event identity and coordinate
- `domain` Explore state: ExploreEventRowState derives provider-free event row labels
- `domain` Explore state: ExploreEventRowState keeps organizer identity for followed clubs
- `domain` Explore state: ExploreExternalEventRowState derives provider-free row labels
- `domain` Explore state: unclaimed organizer external event without link renders No link row state
- `domain` Explore state: ExploreOrganizerCardState derives shared club card labels
- `domain` Explore state: event price copy distinguishes demand floor from viewer quote
- `domain` Explore state: ExploreScreenBodyState derives route branch precedence
- `domain` Explore state: ExploreDiscoveryScreenState derives route display state
- `domain` Explore state: selectedExploreCityProvider defaults to Mumbai and clears search on change
- `domain` Explore state: autoSelectCity sets city when user has not made a manual pick
- `domain` Explore state: autoSelectCityByName uses known profile cities
- `domain` Explore state: autoSelectCity does not override a manual city choice
- `domain` Explore state: setCity clears search query while autoSelectCity also clears it
- `domain` Explore state: setCity clears city-local filters but keeps global filters
- `domain` Explore state: time filters define discovery windows
- `domain` Explore state: Explore defaults to the highest-intent Tonight scope
- `domain` Explore state: distance filter values define proximity radii
- `domain` Explore state: distance filter requires a resolved device location
- `domain` Explore state: distance filter applies after device location resolves
- `domain` Explore state: empty map recovery widens only bounded radius filters
- `domain` Explore state: matchesExploreOrganizerSearchQuery matches name, area, host, and tags
- `domain` Explore state: applyExploreFilters combines quick filters
- `domain` Explore state: applyExploreFilters uses the selected time window
- `domain` Explore state: applyExploreFilters ignores a distance-only selection on clubs
- `domain` Explore state: organizerMatchesScopeFilters short-circuits the tag check for events
- `domain` Explore state: debouncedExploreSearchQuery debounces and trims the server key
- `domain` Explore state: debouncedExploreSearchQuery settles immediately for short queries
- `domain` Explore state: exploreOrganizersViewModelProvider partitions joined and discover clubs
- `domain` Explore state: exploreOrganizersViewModelProvider shows empty city without waiting for auth
- `domain` Explore state: filteredExploreOrganizersProvider applies the normalized search query
- `domain` Explore state: exploreFeedViewModelProvider filters events by device distance
- `domain` Explore state: exploreFeedViewModelProvider reuses one dated window and counts days
- `domain` Explore state: exploreFeedViewModelProvider keeps external supply separate
- `domain` Explore state: exploreFeedViewModelProvider resolves viewer-specific availability
- `domain` Explore state: exploreFeedViewModelProvider does not block on personal event enrichment
- `domain` Explore state: exploreOrganizersViewModelProvider surfaces auth uid errors
- `domain` Explore state: exploreOrganizersViewModelProvider surfaces filtered list errors

**`test/explore/explore_widgets_test.dart`** — mixed (21 layout cases go with the screen) · subject `lib/explore/presentation/explore_screen.dart` · decided by rules, 1 by hand · also under P5 onboarding, shared lib/pages/organizer

- `body` Explore body keeps joined rail and club directory together
- `action` Explore body exposes an honest load-more action
- `body` Explore mixed feed pins day headers and fuses uninterrupted tickets
- `body` Explore body slivers keep feed visible when clubs fail
- `body` ExploreDiscoveryCoverHeader CTA delegates featured item
- `body` ExploreDiscoveryCoverHeader uses compact row without hero
- `body` ExploreMapScreen keeps browsing after location is unavailable
- `journey` ExploreMapScreen selects pin before navigating from card
- `journey` ExploreMapScreen opens selected external event source
- `body` ExploreMapScreen background tap dismisses selected card
- `body` ExploreMapScreen clears selected card when feed refresh drops event
- `body` ExploreMapScreen clears selected card when selected event loses its pin
- `body` ExploreScreen shows Explore-specific error copy
- `body` ExploreScreen listens for join mutation errors
- `body` ExploreScreen renders external feed when clubs are empty
- `body` ExploreScreen filters discover cards from the chip rail
- `body` ExploreFilterSheet toggles secondary filter state
- `body` ExploreFilterRail suppresses account-only joined controls
- `body` ExploreFilterRail removes visible applied filters
- `body` ExploreFilterSheet updates its live result count
- `body` ExploreFeedEventRow demotes ineligible plans with a reason
- `journey` ExploreScreen map pill opens the map route
- `body` ExploreMapScreen keeps Any until distance is activated
- `body` ExploreMapScreen keeps the ring on zero results and offers recovery
- `journey` ExploreDiscoveryCoverHeader search opens the compact field
- `body` FeaturedEventPoster labels tappable location chrome
- `parts` Explore club cover prefers the primary uploaded photo
- `body` Explore club card composes rating and semantics
- `body` external event row exposes one composed summary
- `body` ExploreEventsSection does not duplicate full status meta
- `body` Explore event type browse index updates the activity filter
- `body` ExploreEventsSection empty state can broaden time filter
- `body` ExploreEventsSection empty state clears search and filters together
- `body` Explore header expands search and updates the search query
- `body` ExploreCityPicker changes city and clears the Explore search query
- `body` Explore header hides create-club action in consumer app
- `body` OrganizerIndexRow labels joined clubs without host state
- `journey` club index row and avatar chip navigate to detail routes
- `body` OrganizerIndexRow uses club cover fallback when image is absent
- `action` OrganizerIndexRow surfaces directory join failures
- `body` ExploreScreen renders a navigable guest club directory
- `body` ExploreScreen hides account controls while auth resolves
- `body` ExploreScreen shows account controls after sign-in resolves
- `body` ExploreScreen shows skeleton cards while loading
- `body` ExploreScreen revalidates when its shell tab is re-entered
- `body` ExploreScreen pull-to-refresh revalidates the feed
- `body` ExploreScreen keeps search reachable when the selected city is empty
- `body` ExploreScreen empty state clears search and filters
- `body` ExploreScreen keeps the featured event in the feed during search
- `body` ExploreScreen renders internal feed when clubs are empty
- `body` Explore feed preserves canonical phases and paging ownership
- `body` Explore recommendation phases preserve independent recovery

**`test/routing/top_level_back_navigation_test.dart`** — behaviour · subject `lib/events/presentation/calendar/calendar_screen.dart` · decided by rules

- `journey` calendar back button returns to dashboard

Layout only, deleted with the screen:

- `test/core/toolbar_control_contract_test.dart`: 7 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand
- `test/explore/explore_city_trigger_layout_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand
- `test/explore/explore_recommendations_loading_test.dart`: 1 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand, read end to end


### shared lib/pages/event

`lib/pages/event`. 163 behaviours: 73 domain, 22 action, 13 parts, 40 body, 15 journey; 1 more in `widgetbook/test`.

**`test/cross_paths/cross_paths_event_consent_section_test.dart`** — behaviour · subject `lib/cross_paths/presentation/cross_paths_event_consent_section.dart` · decided by rules

- `domain` eligibility requires both consent gates and a future booking
- `domain` keeps only an existing enabled consent revocable after eligibility
- `parts` stays absent for the hidden state
- `parts` renders the route-resolved event consent state

**`test/cross_paths/cross_paths_event_detail_integration_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_screen.dart`, `lib/events/presentation/event_detail_view_model.dart` · decided by rules

- `journey` Cross Paths Event Detail integration: renders route-owned consent when eligible
- `body` Cross Paths Event Detail integration: keeps an existing consent revocable

**`test/design/public_surface_behavior_test.dart`** — behaviour · subject `lib/explore/presentation/explore_chrome_state.dart`, `lib/explore/presentation/explore_map_screen.dart` · decided by rules

- `domain` every app row of design/public_surface_behavior.json holds: authority, Explore, the map, organizer and event detail, event location and route guards match the matrix (92 rows)

**`test/events/event_detail_controller_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_controller.dart` · decided by rules

- `domain` buildEventDetailViewModel: does not derive guest actions before auth resolves
- `domain` buildEventDetailViewModel: returns loading while any dependency is still loading
- `domain` buildEventDetailViewModel: consumer owner relationship suppresses attendee actions
- `domain` buildEventDetailViewModel: host role derives host event detail state
- `domain` buildEventDetailViewModel: host role waits for club ownership before rendering detail state
- `domain` buildEventDetailViewModel: host role surfaces club errors before falling back to consumer state
- `domain` buildEventDetailViewModel: consumer detail surfaces organizer authority failures
- `domain` buildEventDetailViewModel: consumer detail rejects hidden or suppressed organizers
- `domain` buildEventDetailViewModel: host runtime may preview an event for a hidden organizer
- `domain` buildEventDetailViewModel: host runtime denies an event owned by another organizer
- `domain` buildEventDetailViewModel: returns saved state from the saved event relationship doc
- `domain` buildEventDetailViewModel: returns participation state from the event participation edge
- `domain` buildEventDetailViewModel: returns null data when the event does not exist
- `domain` buildEventDetailViewModel: returns data with null userProfile when user is authenticated and the app user stream yields null
- `domain` buildEventDetailViewModel: surfaces event stream errors
- `domain` buildEventDetailViewModel: surfaces app user stream errors
- `domain` buildEventDetailViewModel: surfaces review stream errors instead of swallowing them
- `domain` buildEventDetailViewModel: fails closed when saved state cannot be resolved
- `domain` buildEventDetailViewModel: fails closed when participation state cannot be resolved
- `domain` buildEventDetailViewModel: provider wires together the event, user, and reviews streams
- `action` EventDetailController: saves an unsaved event and returns the new saved state
- `action` EventDetailController: unsaves a saved event and returns the new saved state
- `action` EventDetailController: records invite-link opens through the event repository seam
- `action` EventDetailController: logs but does not surface invite-link attribution failures

**`test/events/event_detail_dock_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/events/presentation/widgets/event_detail_dock.dart` · decided by rules

- `action` EventDetailDock: books a free event from the eligible state
- `action` EventDetailDock: gates run-event booking behind run preferences
- `action` EventDetailDock: passes invite query codes into booking actions
- `parts` EventDetailDock: keeps invite-only events blocked without an invite code
- `parts` EventDetailDock: shows booking errors from the active mutation
- `parts` EventDetailDock: disables paid bookings when the platform is unsupported
- `action` EventDetailDock: cancels an existing booking
- `parts` EventDetailDock: does not use aggregate counts for the current viewer state
- `parts` EventDetailDock: does not render self check-in as an event-detail bottom action
- `action` EventDetailDock: joins and leaves the waitlist
- `action` EventDetailDock: accepts and declines active waitlist offers
- `action` EventDetailDock: request-only events use request and withdraw copy
- `parts` EventDetailDock: renders attended and past states
- `parts` EventDetailDock: does not show attended state before the event starts

**`test/events/event_detail_failed_read_retry_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_view_model.dart` · decided by rules

- `domain` Retry re-runs the organizer read keyed by the loaded event

**`test/events/event_detail_information_state_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_information_state.dart` · decided by rules

- `domain` resolves each Event Detail fact into exactly one section
- `domain` caps sign-up facts at admission, waitlist, and variable pricing
- `domain` waitlist copy follows the configured mode
- `domain` free events use release-the-spot copy instead of refund language

**`test/events/event_detail_paid_checkout_dock_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_screen_state.dart` · decided by rules

- `domain` organizer-sold paid seats keep the book action
- `domain` other paid seats are unavailable with a reason before any tap
- `domain` paid waitlist offers cannot be accepted when offers are not sold

**`test/events/event_detail_screen_state_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_screen_state.dart` · decided by rules

- `domain` booking profile gate rejects a non-null incomplete profile
- `domain` EventDetail booking dock state: hides Catch booking for an unclaimed organizer
- `domain` EventDetail booking dock state: derives eligible paid and paid-unsupported booking states
- `domain` EventDetail booking dock state: maps pending state to disabled loading actions
- `domain` EventDetail booking dock state: cancelled events never fall through to the ended state
- `domain` EventDetail booking dock state: derives request-to-join and run preference gate actions
- `domain` EventDetail booking dock state: derives waitlist offer accept and decline state
- `domain` EventDetail booking dock state: does not treat expired accepted waitlist offers as approved
- `domain` EventDetail booking dock state: hides signed-up dock during the self check-in window
- `domain` EventDetail companion state: hides companion when consumer actions or participation are missing
- `domain` EventDetail companion state: maps companion plan async state to display state
- `domain` EventDetail section visibility state: shows consumer invite loop for signed-up future events
- `domain` EventDetail section visibility state: hides consumer-only sections for host route contexts
- `domain` EventDetail section visibility state: hides invite loop for cancelled, past, or unsigned-up events
- `domain` EventDetail social state: locks member context for guests
- `domain` EventDetail social state: unlocks reviews only for attended users after the event ends
- `domain` EventDetail host state: maps missing, loading, and error host branches
- `domain` EventDetail host state: derives content display data and message availability
- `domain` EventDetail host state: shows the verified seal only for owner-verified authority

**`test/events/event_detail_widgets_test.dart`** — mixed (6 layout cases go with the screen) · subject `lib/events/presentation/event_detail_screen.dart` · decided by rules

- `body` EventDetailScreen: renders the loading state
- `body` EventDetailScreen: uses initialEvent while live data is still loading
- `body` EventDetailScreen: initial event does not impersonate a guest while auth resolves
- `body` EventDetailScreen: renders the error state
- `body` EventDetailScreen: renders the missing state
- `body` EventDetailScreen: renders the offline state with recovery
- `body` EventDetailScreen: renders the loaded state
- `body` Event Detail section loading states: companion loading renders a callout skeleton
- `body` Event Detail section loading states: hosts loading renders the shared hosts skeleton
- `body` EventDetailCalloutCard: renders configured copy and forwards button context
- `body` EventDetailPhotoGrid: renders supplied photos without empty slots
- `action` EventDetailHeroTopBar: reveals the event title in the collapsed toolbar
- `body` EventDetailHeroTopBar: prefers event photos across detail hero presentations
- `body` EventDetailBody: renders overview detail sections for attended events
- `body` EventDetailBody: hides the companion entry until the host saves setup
- `body` EventDetailBody: does not unlock reviews for stale future attendance data
- `journey` EventDetailBody: route renders guest roster prompt and sign-in CTA
- `journey` EventDetailBody: route gates a non-null incomplete profile from booking and saving
- `body` EventDetailBody: does not render a host bottom action footer
- `journey` EventDetailBody: route shows a full-screen celebration after booking
- `journey` EventDetailBody: route shows a snackbar after cancelling a booking
- `journey` EventDetailBody: top action buttons are tappable and the back button pops
- `body` EventDetailBody: booked attendee invite card shares a rich event invite
- `journey` EventDetailBody: route saved event button renders selected and unsaves
- `journey` EventDetailBody: route saved event button surfaces save failures
- `journey` EventDetailBody: location tap opens the in-app event map

**`test/events/event_field_optionality_test.dart`** — behaviour · subject `lib/hosts/presentation/event_management/widgets/event_itinerary_editor.dart`, `lib/events/presentation/widgets/event_detail_fact_list.dart` · decided by rules, 1 by hand

- `domain` explicitly skipped route stays skipped after draft serialization
- `body` blank content omits authored plan, itinerary and photo sections
- `body` non-distance format never renders compatibility pace as skill
- `body` all photos are visible and first ordered photo is canonical cover
- `body` itinerary renders only supplied metadata
- `journey` editing itinerary preserves route distance and can clear it
- `domain` cancellation reason is rendered only for a cancelled event

**`test/events/event_hype_avatar_row_test.dart`** — behaviour · subject `lib/events/presentation/widgets/event_hype_avatar_row.dart` · decided by rules

- `parts` EventHypeAvatarRow renders veiled activity placeholders when obscured
- `domain` eventHypeAvatars uses the server-owned candidate order and thumbnails
- `domain` eventHypeAvatars falls back to full photo while thumbnails backfill

**`test/events/event_share_card_test.dart`** — behaviour · subject `lib/events/shared/event_share_card.dart` · decided by rules

- `parts` exports an event invite as a png with the event link
- `parts` uses a personal invite URL and records only share intent

**`test/events/event_viewer_state_provider_test.dart`** — behaviour · subject `lib/events/presentation/widgets/event_detail_dock.dart`, `lib/events/presentation/event_booking_controller.dart` · decided by rules

- `body` unresolved current facts never fall back to local approval
- `body` failed viewer reads expose retry rather than booking
- `body` an old profile cannot consume another account viewer state
- `body` refreshing facts cannot reuse an earlier approval
- `body` a late response from the previous account stays closed
- `action` completed cancellation refreshes current authority
- `body` unclaimed supply does not start a private viewer read

**`test/events/event_viewer_state_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_screen_state.dart` · decided by rules

- `domain` booking dock consumes current facts: follow and approval cannot bypass current membership
- `domain` booking dock consumes current facts: approval cannot bypass present capacity
- `domain` booking dock consumes current facts: confirmed native booking is retained after revocation
- `domain` booking dock consumes current facts: public paid admission does not invent a native cancellation
- `domain` booking dock consumes current facts: current quote controls paid display
- `domain` booking dock consumes current facts: an active local offer cannot bypass a revoked current grant
- `domain` booking dock consumes current facts: current scoped offer exposes accept rather than direct book
- `domain` booking dock consumes current facts: current offer survives a missing local participation snapshot
- `domain` booking dock consumes current facts: current offer overrides a stale confirmed participation snapshot
- `domain` booking dock consumes current facts: waitlisted viewer can leave despite {reason}
- `domain` booking dock consumes current facts: retained admission overrides a stale local waitlist offer
- `domain` booking dock consumes current facts: unknown scope cannot enable any action
- `domain` booking dock consumes current facts: missing booking details remain closed despite a valid account

**`test/events/events_widgets_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/events/shared/event_tiles/event_tiles.dart`, `lib/events/presentation/event_detail_view_model.dart` · decided by rules · also under P3.2 events/create, P6 explore

- `body` Events widgets: does not fabricate an itinerary for legacy event documents
- `journey` Events widgets: location card uses the event required exact coordinates
- `body` Events widgets: location card always exposes map for a valid event
- `body` Events widgets: event location route shows map-shaped skeleton while loading
- `body` Events widgets: event location map keeps directions as an explicit action
- `journey` Events widgets: event location route opens directions externally
- `journey` Events widgets: event location route reports a false directions result
- `journey` Events widgets: event location route guards duplicate directions taps while pending
- `journey` Events widgets: event location route reports a thrown directions failure
- `domain` Events widgets: event location state derives map and directions data
- `body` Events widgets: event action card renders badges, meta, and actions
- `body` Events widgets: event photo header uses the shared branded fallback without a photo
- `body` Events widgets: event photo header does not duplicate event detail copy
- `body` Events widgets: event photo header prefers event photos when available
- `body` Events widgets: who is going shows the empty upcoming state
- `body` Events widgets: who is going loads profiles and shows overflow for past events

**`test/host_memberships/host_membership_event_dock_test.dart`** — behaviour · subject `lib/events/presentation/event_detail_screen_state.dart` · decided by rules

- `domain` an included member books free with an included note
- `domain` a discounted member sees the usual price beside the member price
- `domain` non-members get the upsell offer
- `domain` members-only and early access restrictions explain themselves
- `domain` the booking cap falls back to list price with a note

**`test/reviews/reviews_widgets_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/reviews/shared/reviews_section.dart` · decided by rules, 1 by hand · also under P6 you

- `action` empty attended event section can submit a review
- `body` empty event reviews stay hidden without write access
- `action` own review can be edited and deleted from the sheet
- `body` pending review write freezes draft and sheet dismissal
- `parts` review cards display host responses
- `action` hosts can respond to event reviews

**`test/reviews/write_review_controller_test.dart`** — behaviour · subject `lib/reviews/shared/write_review_controller.dart` · decided by rules

- `action` submit creates a trimmed event review
- `action` submit updates an existing review
- `action` submit deduplicates an active review write snapshot
- `action` submit rejects invalid ratings
- `action` delete delegates to repository
- `action` setOwnerResponse delegates trimmed host response

**`widgetbook/test/primitive_goldens_test.dart`** — behaviour · subject `lib/events/presentation/widgets/event_detail_dock.dart` · decided by rules · adjacent, not in the totals

- `parts` booking dock catalog mounts the production state surface


### shared lib/pages/organizer

`lib/pages/organizer`. 68 behaviours: 25 domain, 8 action, 10 parts, 20 body, 5 journey.

**`test/explore/explore_widgets_test.dart`** — mixed (21 layout cases go with the screen) · subject `lib/explore/presentation/explore_view_model.dart`, `lib/events/shared/event_tiles/event_tiles.dart` · decided by rules · also under P5 onboarding, P6 explore

- `body` OrganizerDetailScreen uses initialOrganizer while live data is still loading
- `body` OrganizerDetailScreen shows detail-provider errors
- `body` OrganizerDetailScreen shows a not-found state
- `body` OrganizerDetailScreen listens for join mutation errors
- `body` OrganizerDetailScreen listens for leave mutation errors
- `body` OrganizerMembershipDock renders the correct action and pending state
- `action` OrganizerMembershipDock join and leave actions hit the repository
- `body` OrganizerHeroTopBar share button invokes share handler
- `journey` OrganizerHeroTopBar shows club identity and pops back from the detail route
- `body` OrganizerHeroTopBar uses clean fallback without a cover image
- `body` OrganizerHeroTopBar reveals the club name in the collapsed toolbar
- `body` OrganizerDetailBody host view stays a public club profile
- `body` OrganizerDetailBody shows host identity without opening a dating profile
- `action` OrganizerDetailBody shows multiple hosts and messages a host
- `body` OrganizerDetailBody owner does not see host team management actions
- `body` OrganizerDetailBody keeps club review aggregate read-only below schedule
- `journey` OrganizerDetailBody agenda taps navigate to the selected event

**`test/organizers/organizer_detail_dock_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/widgets/organizer_detail_dock.dart` · decided by rules

- `body` OrganizerBellButton retains toggle and pending semantics over icon chrome

**`test/organizers/organizer_detail_read_only_preview_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/widgets/organizer_detail_body.dart`, `lib/organizers/presentation/detail/organizer_detail_view_model.dart` · decided by rules, 1 by hand

- `parts` loading preview uses the consumer initial-club fallback
- `parts` failed preview exposes the consumer retry error state
- `parts` missing preview uses the consumer not-found state
- `body` loaded preview renders canonical content behind one boundary
- `parts` unclaimed no-host preview shows provenance without empty hosts
- `parts` owner verification is derived from authority state

**`test/organizers/organizer_hero_top_bar_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart` · decided by rules

- `domain` OrganizerHeroTopBar: resolves default hero variants from club media state
- `body` OrganizerHeroTopBar: logo-only clubs render the masthead hero shell
- `body` OrganizerHeroTopBar: embedded preview renders the hero without route chrome

**`test/organizers/organizer_host_section_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/widgets/organizer_host_section.dart` · decided by rules, 1 by hand, read end to end

- `parts` OrganizerHostSection: uses activity accent seal and established meta

**`test/organizers/organizer_manager_authority_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/organizer_detail_view_model.dart`, `lib/hosts/presentation/host_event_edit_screen_state.dart` · decided by rules

- `domain` stale display profile cannot open the event edit route
- `domain` host detail route rejects a revoked manager and consumer exposes no host affordance
- `action` media edit rejects a revoked manager before the repository mutation

**`test/organizers/organizer_schedule_section_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/widgets/organizer_schedule_section.dart` · decided by rules

- `parts` OrganizerScheduleSection: renders direct date-rail cards with strip grouping
- `parts` OrganizerScheduleSection: keeps host-owned rows marked hosted
- `parts` OrganizerScheduleSection: preserves the inline empty state

**`test/organizers/organizer_share_card_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/organizers/presentation/detail/widgets/organizer_share_card.dart` · decided by rules

- `parts` club hero share exports a png with the club link

**`test/organizers/organizers_controllers_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/organizer_detail_view_model.dart`, `lib/organizers/presentation/detail/organizer_detail_screen_state.dart` · decided by rules · also under P5 organizer, P5 onboarding

- `action` OrganizerMembershipController: join requires sign-in and forwards the club id
- `action` OrganizerMembershipController: join throws when there is no signed-in user
- `action` OrganizerMembershipController: leave requires sign-in and forwards the club id
- `action` OrganizerMembershipController: setPushNotifications forwards the club id and preference
- `action` OrganizerHostContactController: starts a host conversation through the repository
- `domain` OrganizerDetailViewModel: builds derived state for hosts, members, and upcoming events
- `domain` OrganizerDetailViewModel: returns loading while a core dependency is still loading
- `domain` OrganizerDetailViewModel: consumer owner relationship suppresses self-directed actions
- `domain` OrganizerDetailViewModel: consumer direct reads reject hidden or suppressed organizers
- `domain` OrganizerDetailViewModel: host runtime may preview a hidden organizer
- `domain` OrganizerDetailViewModel: host runtime denies a discoverable organizer owned by someone else
- `domain` OrganizerDetailViewModel: cancelled events do not appear in organizer schedules
- `domain` OrganizerDetailViewModel: host role derives host club detail state
- `domain` OrganizerDetailViewModel: returns null data when the club stream yields no club
- `domain` OrganizerDetailViewModel: surfaces club stream errors
- `domain` OrganizerDetailViewModel: surfaces event stream errors
- `domain` OrganizerDetailViewModel: uses empty reviews when the review stream is unavailable
- `domain` OrganizerDetailViewModel: surfaces uid stream errors
- `domain` OrganizerDetailViewModel: uses null profile when profile stream is unavailable
- `domain` HostOrganizerDetailScreenState: rejects an optimistic organizer for a different route id
- `domain` HostOrganizerDetailScreenState: wraps a live host view model as public preview content
- `domain` HostOrganizerDetailScreenState: uses initial club fallback while live host data loads
- `domain` HostOrganizerDetailScreenState: does not derive guest fallback actions before auth resolves
- `domain` HostOrganizerDetailScreenState: maps blocking async branches to loading, error, and not found
- `domain` HostOrganizerDetailScreenState: derives consumer body display policy from domain data
- `domain` HostOrganizerDetailScreenState: derives host body policy without consumer dock or host messaging
- `domain` HostOrganizerDetailScreenState: public preview keeps consumer display policy but removes the dock

**`test/organizers/organizers_flow_test.dart`** — behaviour · subject `lib/organizers/presentation/detail/organizer_detail_screen.dart`, `lib/explore/presentation/explore_feed_providers.dart` · decided by rules

- `journey` Clubs flow: club taps navigate with the required route param
- `journey` Clubs flow: guest join CTA opens phone auth with the club as from route
- `body` Clubs flow: detail screen shows club-shaped skeleton while live data loads
- `body` Clubs flow: detail screen can load from live data without navigation extra
- `journey` Clubs flow: host detail schedule opens the host event detail route
- `body` Clubs flow: detail screen refreshes membership UI when the membership stream updates

Layout only, deleted with the screen:

- `test/goldens/entity_material_test.dart`: 1 cases · golden comparison · decided by rules


### shared lib/pages (startup)

`lib/pages/startup`. 7 behaviours: 3 domain, 3 action, 1 body.

**`test/app_force_update_error_test.dart`** — behaviour · subject `lib/force_update/presentation/force_update_diagnostics.dart` · decided by rules

- `domain` force update diagnostics show Remote Config guidance in dev
- `domain` force update diagnostics stay hidden when there is no error
- `domain` force update diagnostics stay hidden for non-Firebase errors in prod

**`test/force_update/update_required_content_test.dart`** — behaviour · subject `lib/force_update/presentation/update_required_screen.dart` · decided by rules

- `body` UpdateRequiredBody renders copy and delegates CTA

**`test/force_update/update_required_controller_test.dart`** — behaviour · subject `lib/force_update/presentation/update_required_controller.dart` · decided by rules

- `action` opens the iOS store URL on iOS
- `action` opens the Android store URL for non-iOS platforms
- `action` fails cleanly when the configured store URL is empty


### P6 book

`apps/consumer/lib/book`. 44 behaviours: 28 action, 3 parts, 11 body, 2 journey.

**`test/events/event_booking_controller_test.dart`** — behaviour · subject `lib/events/presentation/event_booking_controller.dart` · decided by rules

- `action` EventBookingController.book: books a free event through the payment repository
- `action` EventBookingController.book: books a paid event with the full payment payload
- `action` EventBookingController.book: passes invite codes through paid bookings
- `action` EventBookingController.book: throws when paid bookings are unsupported on the platform
- `action` EventBookingController.book: routes non-INR paid bookings to the payment repository
- `action` EventBookingController.book: throws before booking when the user is not signed in
- `action` EventBookingController mutations: cancelBooking delegates to the event repository
- `action` EventBookingController mutations: joinWaitlist delegates to the server-side waitlist function
- `action` EventBookingController mutations: leaveWaitlist uses the signed-in uid from auth
- `action` EventBookingController mutations: acceptWaitlistOffer keeps free accepted offers in-app
- `action` EventBookingController mutations: accepted paid offers start checkout with local price {displayedPrice}
- `action` EventBookingController mutations: declineWaitlistOffer delegates to the event repository
- `action` EventBookingController mutations: joinWaitlist surfaces repository errors
- `action` EventBookingController mutations: leaveWaitlist throws when the user is not signed in

**`test/events/event_booking_session_continuation_test.dart`** — behaviour · subject `lib/events/presentation/event_booking_controller.dart` · decided by rules

- `action` paid offer cannot start checkout after {transition}
- `action` paused owner cannot miss a same-account session replacement
- `action` paid offer stays revoked after {interruption} and recovery
- `action` disposing the owner before acceptance cannot start checkout
- `action` current paid offer keeps authoritative receipt and payload at {price}
- `action` free acceptance remains authoritative (account changed: {changeAccount})
- `action` acceptance failure preserves repository error (account changed: {changeAccount})
- `action` {action} refuses a profile from another account before work
- `action` already completed free booking is not reclassified after account change
- `action` controller preserves the receipt returned by an already-started checkout

**`test/events/organizer_payment_method_sheet_test.dart`** — behaviour · subject `lib/events/presentation/widgets/organizer_payment_method_sheet.dart` · decided by rules

- `parts` payment page shows the quote and every method {name}
- `parts` without a refund deadline the page omits the refund line

**`test/payments/payment_confirmation_controller_test.dart`** — behaviour · subject `lib/payments/presentation/payment_confirmation_controller.dart` · decided by rules

- `action` builds a native calendar event from event details
- `action` builds directions URI from coordinates when available
- `action` builds directions URI from meeting point when coordinates are absent
- `action` builds invite and referral text without widget dependencies

**`test/payments/payment_confirmation_screen_test.dart`** — mixed (4 layout cases go with the screen) · subject `lib/payments/presentation/payment_confirmation_screen.dart` · decided by rules

- `body` PaymentConfirmationScreen: renders pending external checkout as the booking sheet
- `body` PaymentConfirmationScreen: cancelled paid checkout cannot celebrate or reopen payment
- `journey` PaymentConfirmationScreen: invite and referral surfaces open rich event share cards
- `body` PaymentConfirmationScreen: shows confirmation-shaped skeleton while event is loading
- `body` PaymentConfirmationScreen: shows not found when event is null

**`test/payments/payment_history_screen_test.dart`** — behaviour · subject `lib/payments/presentation/payment_history_screen.dart` · decided by rules, 2 by hand

- `body` PaymentHistoryScreen: renders cancellation state {variant}
- `body` PaymentHistoryScreen: shows booking failure details for sign-up failures
- `body` PaymentHistoryScreen: shows refunded recovery details for sign-up failures
- `journey` PaymentHistoryScreen: tapping a payment tile opens detail bottom sheet
- `body` PaymentHistoryScreen: detail sheet labels and performs support guidance honestly
- `parts` PaymentHistoryScreen: shows all status badge variants correctly
- `body` PaymentHistoryScreen: uses batched event titles and labels missing events honestly
- `body` PaymentHistoryScreen: keeps event-title loading distinct from missing events
- `body` PaymentHistoryScreen: event-title failure exposes an event-specific retry state


### P6 live

`apps/consumer/lib/live`. 84 behaviours: 18 domain, 36 action, 6 parts, 23 body, 1 journey.

**`test/architecture/keep_alive_provider_lifecycle_test.dart`** — behaviour · subject `lib/event_success/event_success_companion_launcher.dart`, `lib/event_success/presentation/event_success_live_effects_controller.dart` · decided by rules · also under P6 onboarding, P6 explore, P6 chats

- `domain` keepAlive provider lifecycle: companion launch registry retains de-dupe state without listeners
- `action` keepAlive provider lifecycle: live effects controller keeps imperative controller instance

**`test/event_success/event_assignment_feature_sheet_test.dart`** — behaviour · subject `lib/event_success/presentation/event_assignment_feature_sheet.dart` · decided by rules

- `parts` auth change discards prior answer result
- `parts` background clears answer and rejects late result
- `action` failed write retains error after authoritative refresh

**`test/event_success/event_message_preferences_widgets_test.dart`** — behaviour · subject `lib/event_success/presentation/event_message_preferences_navigation_section.dart` · decided by rules

- `action` independent consent and exact retry after dismissal at {scale}
- `action` previous sender can be withdrawn but never silently granted
- `parts` {resolution} identity offers recovery without channel reads
- `action` sign-out removes the old terms and grant actions

**`test/event_success/event_participant_context_test.dart`** — behaviour · subject `lib/event_success/presentation/event_participant_context_provider.dart` · decided by rules

- `domain` refresh retires the old link before resolving a new source
- `domain` same UID re-entry cannot revive a late old-account identity

**`test/event_success/event_sender_preference_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_sender_preference_controller.dart` · decided by rules

- `action` discovery is read-only; configured sender is the only enrollment choice
- `action` empty history pages remain explicitly pageable without fetching all senders
- `action` an absent sender hides; discovery failures can be refreshed without enrollment
- `action` a changed configured sender across pages invalidates the whole discovery review
- `action` duplicate taps share one request and uncertainty survives sheet dismissal
- `action` definite rejection and same-suffix review changes require fresh consent
- `action` conflict publishes returned terms without assuming the request applied
- `action` account A to B to A fences old pages, changes and navigation callbacks
- `action` auth errors discard an uncertain review after the sheet closes
- `action` read failures and backward views cannot reuse a prior checkbox callback
- `action` WhatsApp and RCS remain independently operable for the same participant

**`test/event_success/event_sender_preference_receipt_test.dart`** — behaviour · subject `lib/event_success/presentation/event_sender_preference_controller.dart` · decided by rules

- `action` discovery cannot publish another participant’s choices
- `action` a selected sender read cannot expose a different sender
- `action` the state owner rejects an applied receipt with wrong {wrong}
- `action` retry is actionable as soon as its uncertain state is visible

**`test/event_success/event_sms_preference_controller_test.dart`** — behaviour · subject `lib/event_success/presentation/event_sms_preference_controller.dart` · decided by rules

- `action` loading, read errors, refresh and sign-out expose no old review
- `action` repeated taps share one request and no preference changes optimistically
- `action` uncertainty permits only an identical retry, including after resume
- `action` same-revision conflict requires the returned review and a new request
- `action` definite rejection requires a read; malformed replies remain uncertain
- `action` old account reads and writes cannot replace current participant state
- `action` authentication errors discard pending choices before the same UID returns
- `action` inactive offers hide but existing grants retain withdrawal
- `action` different attendees have independent state and refresh scope
- `action` a submitted preference remains tracked when its observer is dismissed
- `action` an uncertain SMS decision survives closing and reopening its sheet
- `action` a detached SMS retry cannot survive {transition}
- `action` the state owner rejects a receipt from a different participant
- `action` a retry from the error state receives a fresh active future

**`test/event_success/event_success_companion_launcher_test.dart`** — behaviour · subject `lib/event_success/event_success_companion_launcher.dart` · decided by rules

- `domain` EventSuccessCompanionLaunchRegistry: does not launch from an initial attended snapshot
- `domain` EventSuccessCompanionLaunchRegistry: detects a signed-up to attended transition once
- `domain` EventSuccessCompanionLaunchRegistry: claims a launch moment only once until reset
- `journey` launchEventSuccessCompanionIfAvailable: pushes the companion route when a live guide exists
- `body` launchEventSuccessCompanionIfAvailable: stays put when no live guide exists
- `body` launchEventSuccessCompanionIfAvailable: does not launch for the hosting user
- `body` launchEventSuccessCompanionIfAvailable: launches ended events with always-on attendee surfaces
- `body` launchEventSuccessCompanionIfAvailable: fetches the event for a foreground attendance transition

**`test/event_success/event_success_companion_route_state_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_companion_screen_state.dart` · decided by rules

- `domain` companion route state maps moment loading and retry intent

**`test/event_success/event_success_companion_screen_state_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_companion_screen_state.dart` · decided by rules

- `domain` EventSuccessCompanionScreenState: derives pre-arrival moment and paper shell state
- `domain` EventSuccessCompanionScreenState: derives First Hello moment when mission start is available
- `domain` EventSuccessCompanionScreenState: filters wingman candidates to viewer interested-in genders
- `domain` AssignmentOptOutActionState: derives included from opt-out preference
- `domain` AssignmentOptOutActionState: keeps pending state separate from preference state
- `domain` SelfCheckInActionState: defaults to idle and can represent check-in pending
- `domain` WingmanRequestActionState: defaults to idle and can represent saving
- `domain` EventSuccessFeedbackActionState: defaults to idle and can represent saving

**`test/event_success/event_success_live_screens_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/event_success/presentation/event_success_live_effects_controller.dart` · decided by rules, 8 by hand · also under P3.4 live, P3.5 insights, P5 events, P5 live/formats

- `body` companion screen lets checked-in attendees ask the host for help
- `body` companion filters host-help candidates to the attendee interested-in genders
- `body` companion keeps booked attendees in pre-arrival mode
- `body` companion screen shows assigned First Hello mission
- `action` companion screen can start First Hello before mission exists
- `action` companion screen saves compatibility questionnaire answers
- `body` companion route shows unanswered questionnaire after check-in
- `body` companion route refreshes when event clock crosses end time
- `body` companion route keeps chrome and centers progress while loading
- `body` companion route shows loading while uid resolves
- `body` companion route shows auth errors before signed-out copy
- `body` companion screen shows post-event openers and feedback after attendance
- `parts` companion screen shows assigned micro-pod card
- `parts` companion screen shows rotating group slots as tables
- `parts` companion screen shows assigned rotation schedule
- `body` companion live reveal hides rotation partner until revealed
- `body` companion live reveal shows unlocked rotation partner
- `body` companion reveal dispatches a single stable reveal effect
- `body` companion screen hides stale rotation assignment after opt-out
- `body` companion screen hides stale pod assignment after opt-out
- `body` companion route fetches assigned podmate public profiles
- `body` companion route fetches assigned rotation partner profiles
- `body` companion keeps always-on post-event sections for legacy selections
- `body` companion route is unavailable until host saves setup
- `domain` companion route state resolves core loading messages and ready data

**`test/event_success/event_success_runtime_test.dart`** — behaviour · subject `lib/event_success/presentation/event_success_conversation_cue_copy.dart` · decided by rules

- `domain` EventSuccessRuntime: gates live prompts and post-match openers separately
- `domain` EventSuccessRuntime: walks every format from light to reflective disclosure


### P6 after

`apps/consumer/lib/after`. 78 behaviours: 27 domain, 18 action, 1 parts, 26 body, 6 journey.

**`test/chats/match_celebration_dialog_test.dart`** — behaviour · subject `lib/matches/shared/match_celebration_dialog.dart` · decided by rules

- `body` renders full-screen match celebration actions

**`test/cross_paths/cross_paths_invitation_controller_test.dart`** — behaviour · subject `lib/cross_paths/presentation/cross_paths_invitation_controller.dart` · decided by rules

- `action` controller exposes typed send, respond, and cancel receipts
- `action` controller preserves a failed mutation as AsyncError
- `action` pair booking converts a free hold through booking authority
- `action` pair booking carries a paid hold into checkout authority

**`test/cross_paths/cross_paths_invitation_screen_test.dart`** — behaviour · subject `lib/cross_paths/presentation/cross_paths_invitation_screen.dart` · decided by rules

- `body` recipient sees accept and decline actions
- `body` accepted invitation exposes its event plan actions
- `body` requester sees a held-not-booked state and booking action
- `body` recipient sees the requester booking state without a CTA
- `journey` expired invitation opens its event for {variant}
- `journey` active invitation keeps the booking action on its own route

**`test/public_profile/public_profile_controller_test.dart`** — behaviour · subject `lib/public_profile/presentation/public_profile_controller.dart` · decided by rules

- `action` PublicProfileController: delegates block and report actions to the safety repository

**`test/public_profile/public_profile_screen_state_test.dart`** — behaviour · subject `lib/public_profile/presentation/public_profile_screen_state.dart` · decided by rules

- `domain` PublicProfileScreenState maps cold loading without fallback
- `domain` PublicProfileScreenState keeps initial profile visible while loading
- `domain` PublicProfileScreenState maps errors to retry intent
- `domain` PublicProfileScreenState maps null profile to unavailable state
- `domain` PublicProfileScreenState hides viewer context for own profile
- `domain` PublicProfileMutationMode tracks report and block flags independently

**`test/public_profile/public_profile_screen_test.dart`** — behaviour · subject `lib/public_profile/presentation/public_profile_screen.dart` · decided by rules

- `body` PublicProfileScreen renders profile skeleton while loading
- `body` PublicProfileScreen keeps initial profile visible while stream loads
- `body` PublicProfileScreen shows branded empty state when unavailable
- `body` PublicProfileScreen shows branded error state on load failure
- `body` PublicProfileScreen report sheet uses shared action rows
- `action` PublicProfileScreen reports the selected reason with success feedback
- `action` PublicProfileScreen surfaces report mutation failures
- `action` PublicProfileScreen surfaces block mutation failures after confirmation
- `journey` PublicProfileScreen blocks users with success feedback and route pop

**`test/swipes/catches_event_screen_state_test.dart`** — behaviour · subject `lib/swipes/presentation/catches_event_screen_state.dart` · decided by rules

- `domain` CatchesEventScreenState: maps queue loading and error states
- `domain` CatchesEventScreenState: derives empty copy from event, user, participation, and clock
- `domain` CatchesEventScreenState: keeps sign-in copy explicit when user data is unavailable
- `domain` CatchesEventScreenState: derives ready deck display data from queue and enrichment data

**`test/swipes/event_recap_screen_state_test.dart`** — behaviour · subject `lib/swipes/presentation/event_recap_screen_state.dart` · decided by rules

- `domain` EventRecapScreenState: maps loading, error, and missing event branches
- `domain` EventRecapScreenState: derives hero copy, attendee rows, and open deck intent
- `domain` EventRecapScreenState: derives closed window copy and empty roster state
- `domain` EventRecapScreenState: preserves profile lookup loading and error states

**`test/swipes/event_recap_screen_test.dart`** — behaviour · subject `lib/swipes/presentation/event_recap_screen.dart` · decided by rules, 1 by hand

- `body` EventRecapScreen shows recap-shaped skeleton while loading
- `body` EventRecapScreen builds roster from server-owned candidates
- `body` keeps profile lookup loading distinct from missing profiles
- `body` profile lookup failures expose retry and recover
- `body` EventRecapScreen can seed selected vibe ids
- `journey` EventRecapScreen passes selected vibe ids to catches deck

**`test/swipes/filters_screen_state_test.dart`** — behaviour · subject `lib/swipes/presentation/filters_screen_state.dart` · decided by rules

- `domain` FiltersPreferencesState derives defaults and save request fields
- `domain` FiltersPreferencesState keeps pending mutation controls disabled

**`test/swipes/filters_screen_test.dart`** — behaviour · subject `lib/swipes/presentation/filters_screen.dart` · decided by rules

- `action` controller deduplicates an active filter save
- `body` skeletonizes the real filter controls while profile loads
- `body` shows a retryable profile state instead of a blank body
- `journey` saves filters through the controller mutation and pops
- `journey` pending save freezes route exit, reset, age, and gender

**`test/swipes/profile_card_content_test.dart`** — behaviour · subject `lib/swipes/shared/profile_surface/profile_card_content.dart` · decided by rules

- `domain` ProfileCardContent: does not expose exact distance on public swipe cards
- `domain` ProfileCardContent: derives trimmed card sections from the public profile
- `domain` ProfileCardContent: derives compatibility insights when viewer context is available
- `domain` ProfileCardContent: keeps city and relationship goal out of detail chips
- `domain` ProfileCardContent: drops blank optional text values

**`test/swipes/profile_card_widget_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/swipes/shared/profile_surface/profile_surface.dart`, `lib/swipes/shared/profile_surface/profile_body.dart` · decided by rules, 1 by hand

- `body` ProfileSurface renders polished missing-photo state in light mode
- `parts` ProfileSurface resolves canonical city ids in every profile mode
- `body` ProfileSurface omits prompt cards when prompts are blank
- `body` ProfileSurface hides reaction controls outside Catches
- `body` ProfileSurface renders compatibility reasons and event identity tags
- `body` ProfileSurface surfaces section reaction controls in Catches
- `body` ProfileSurface lets users react to compatibility signals
- `body` ProfileSurface comment sheet sends a block-specific comment

**`test/swipes/profile_view_mapper_test.dart`** — behaviour · subject `lib/swipes/shared/profile_surface/profile_view_mapper.dart` · decided by rules

- `domain` profileViewFromCardContent: maps public profile content into the handoff body sequence

**`test/swipes/swipe_action_buttons_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/swipes/presentation/swipe_keys.dart`, `lib/swipes/presentation/widgets/catches_pass_button.dart` · decided by rules

- `body` CatchesPassButton exposes the floating pass action

**`test/swipes/swipe_empty_content_test.dart`** — behaviour · subject `lib/swipes/presentation/swipe_empty_content.dart` · decided by rules

- `domain` buildSwipeEmptyContent: explains why an event is unavailable when missing
- `domain` buildSwipeEmptyContent: explains that Catches opens after the event ends
- `domain` buildSwipeEmptyContent: explains when the user did not attend the event
- `domain` buildSwipeEmptyContent: explains when the catch window has closed
- `domain` buildSwipeEmptyContent: falls back to the default empty message when the window is active

**`test/swipes/swipe_queue_notifier_test.dart`** — behaviour · subject `lib/swipes/presentation/swipe_queue_controller.dart` · decided by rules

- `action` SwipeQueueNotifier.swipe: does not pop the queue when signed-in uid is unavailable
- `action` SwipeQueueNotifier.swipe: records the swipe and removes the top profile when uid is available
- `action` SwipeQueueNotifier.swipe: records reaction target and comment for a section like
- `action` SwipeQueueNotifier.swipe: ignores duplicate swipe attempts while a swipe write is pending
- `action` SwipeQueueNotifier.swipe: surfaces a retryable timeout instead of loading forever
- `action` SwipeQueueNotifier.swipe: surfaces obvious offline state before waiting for timeout
- `action` SwipeQueueNotifier.swipe: keeps cached queue data when connectivity drops offline

**`test/swipes/swipe_screen_test.dart`** — behaviour · subject `lib/swipes/presentation/swipe_screen.dart` · decided by rules

- `body` SwipeScreen shows profile-shaped skeleton while queue loads
- `action` SwipeScreen disables pass action while swipe write is pending
- `action` SwipeScreen keeps current profile and shows snackbar on failure

Layout only, deleted with the screen:

- `test/goldens/profile_view_test.dart`: 3 cases · golden comparison · decided by rules
- `test/swipes/profile_surface_contract_test.dart`: 2 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules, read end to end


### P6 chats

`apps/consumer/lib/chats`. 132 behaviours: 17 domain, 61 action, 4 parts, 39 body, 11 journey; 1 more in `widgetbook/test`.

**`test/architecture/keep_alive_provider_lifecycle_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/chats_list_view_model.dart` · decided by rules · also under P6 onboarding, P6 explore, P6 live

- `domain` keepAlive provider lifecycle: chat search query survives listener disposal
- `domain` keepAlive provider lifecycle: chat search query starts empty for the next account

**`test/chats/chat_controller_test.dart`** — behaviour · subject `lib/chats/presentation/chat_controller.dart` · decided by rules

- `action` sendImage deletes the uploaded image when the message write fails
- `action` sendImage leaves the image in place on success
- `action` sendImage is a no-op when the user cancels the picker
- `action` sendImage propagates upload rejection without writing a message

**`test/chats/chat_conversations_list_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/widgets/chat_conversations_list.dart` · decided by rules

- `body` selected conversation owns a visible semantic row state

**`test/chats/chat_event_context_header_test.dart`** — behaviour · subject `lib/chats/presentation/widgets/chat_event_context_header.dart` · decided by rules, 1 by hand

- `parts` renders an activity-aware dinner context stamp
- `parts` renders a neutral fallback stamp while event context loads
- `parts` uses event-question framing for a contacted host
- `domain` empty inquiry copy branches on viewer role without dating language

**`test/chats/chat_inbox_screen_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/chat_inbox_screen.dart` · decided by rules, 1 by hand · also under P5 people

- `domain` HostInboxScreenState: chats view model propagates uid auth errors
- `domain` HostInboxScreenState: maps search and unread empty states
- `domain` HostInboxScreenState: maps async loading and error branches
- `action` ChatsListCelebrationController: selects newly arrived consumer matches only
- `action` ChatsSearchHeaderController: tracks active search and closes only when empty
- `body` chat browse header presentation is independent of global app role
- `body` chat root header search expands in scroll content and is editable
- `body` shows the empty state when there are no matches
- `body` shows search-specific empty copy when a query has no matches
- `body` collapses duplicate match docs into one chat row per person
- `body` batches inbox club and public profile lookups per roster
- `body` does not mark own latest message as unread
- `journey` navigates from matches list to chat without route extra

**`test/chats/chat_input_bar_test.dart`** — mixed (3 layout cases go with the screen) · subject `lib/chats/presentation/widgets/chat_input.dart` · decided by rules

- `body` derives sendability from the trimmed draft
- `body` keeps focus for keyboard and internal action taps
- `body` pending actions leave the editor and peer action usable
- `body` exposes one editable node and one node per action

**`test/chats/chat_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/chats/presentation/chat_screen.dart` · decided by rules · also under P5 people

- `body` ChatScreen Suvbot: retries failed Suvbot controls through the typed target
- `action` ChatScreen Suvbot: shows Suvbot controls without chat composer
- `domain` ChatReadMarkerState: marks a uid once and exposes the last known uid for dispose
- `domain` ChatReadMarkerState: marks read for incoming latest messages only
- `action` ChatReadMarkerController: executes mark-read decisions through the repository
- `action` ChatReadMarkerController: marks incoming latest messages and disposes with last known uid
- `domain` ChatScrollCoordinator: tracks initial and appended message batches
- `domain` ChatScrollCoordinator: ignores send-success scroll when unattached
- `action` ChatThreadActionController: resolves profile navigation requests from chat state
- `action` ChatThreadActionController: runs share report and block intents through injected effects
- `action` ChatThreadActionController: suppresses success effects when safety actions fail
- `domain` ChatThreadLookupState: derives consumer chat profile and event lookup keys
- `domain` ChatThreadLookupState: suppresses profile and event lookups for Suvbot
- `domain` HostChatScreenState: scopes Cross Paths plans and closes the composer after expiry
- `domain` HostChatScreenState: marks safety actions disabled while their mutations are pending
- `domain` HostChatScreenState: resolves typed top-bar action intents
- `domain` HostChatScreenState: names retry targets for route, message, and Suvbot failures
- `body` ChatRouteState: keeps thread UI loading while uid resolves
- `body` ChatScreen: hydrates the other profile without route extra
- `body` ChatScreen: empty match thread grounds the prompt in the shared event
- `body` ChatScreen: reports draft changes to an adaptive workspace owner
- `body` ChatScreen: resets unread once the uid becomes available after mount
- `action` ChatScreen: sends trimmed messages and clears the input
- `action` ChatScreen: keeps composer usable while sending and retains a newer draft on failure
- `body` ChatScreen: keeps multiline composer visible and capped when keyboard is open
- `action` ChatScreen: consumer chat reports show success feedback
- `action` ChatScreen: consumer chat report failures surface snackbar feedback
- `action` ChatScreen: consumer chat block action requires confirmation
- `body` ChatScreen: resets unread again for incoming messages while open
- `body` ChatScreen: shows a friendly error and retry when messages fail to load
- `journey` ChatScreen: routes match load errors through a retryable chat state
- `body` ChatScreen: prompts before sharing an empty consumer thread
- `action` ChatScreen: surfaces failed report mutations through chat feedback
- `action` ChatScreen: surfaces failed block mutations through chat feedback

**`test/chats/chat_share_card_test.dart`** — behaviour · subject `lib/chats/presentation/widgets/chat_share_card.dart` · decided by rules, 1 by hand

- `parts` renders an anonymized activity-aware share card
- `domain` hasShareableChatMessages ignores image-only messages

**`test/chats/event_chat_controller_test.dart`** — behaviour · subject `lib/chats/presentation/event_chat_controller.dart` · decided by rules

- `action` lost send acknowledgement retries the exact payload ID once
- `action` failed authority refresh removes messages and disables new writes
- `action` late read cannot restore content after backgrounding
- `action` new message snapshot and reaction revision replace stale copies
- `action` older history is re-read rather than retaining stale reply copies
- `action` in-flight typing start is followed by stop with acknowledged revision
- `action` an idle unsent draft stops typing instead of sending heartbeats
- `action` typing expiry uses server time even when device clock differs
- `action` a previous account cannot replace current messages or clear its state

**`test/chats/event_chat_directory_controller_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/event_chat_directory_controller.dart` · decided by rules

- `action` empty candidate pages continue and duplicates resolve by event ID
- `action` load more revalidates earlier entries and fences duplicate clicks
- `action` failed refresh removes old directory entries and retries from source
- `action` a late page cannot restore the previous account directory

**`test/chats/event_chat_directory_widget_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/event_chat_directory_controller.dart` · decided by rules, 1 by hand

- `body` event inbox {dark} {scale} works without dating data
- `body` empty scan page keeps the continuation action accessible

**`test/chats/event_chat_message_actions_controller_test.dart`** — behaviour · subject `lib/chats/presentation/event_chat_controller.dart` · decided by rules

- `action` report requires a reason; guests cannot remove someone else’s message
- `action` lost acknowledgement retries the same report and guards double taps
- `action` changed sender or withdrawn message cannot use an old menu
- `action` own message can be removed but not reported or blocked
- `action` an account change cannot acknowledge or repeat the previous action

**`test/chats/event_chat_message_actions_widget_test.dart`** — behaviour · subject `lib/chats/presentation/event_chat_controller.dart` · decided by rules

- `action` report reason is explicit and readable {dark} {scale}
- `action` block cancellation writes nothing, removal needs confirmation

**`test/chats/event_chat_participants_controller_test.dart`** — behaviour · subject `lib/chats/presentation/event_chat_participants_controller.dart` · decided by rules

- `action` empty filtered scans can continue; every loaded page is revalidated
- `action` authority failure removes all loaded names
- `action` background hides names; a late old read cannot restore them
- `action` account change resets pagination and ignores a pending old account read

**`test/chats/event_chat_participants_widget_test.dart`** — behaviour · subject `lib/chats/presentation/event_chat_participants_screen.dart` · decided by rules, 1 by hand

- `journey` participant route is readable and opens protected profiles {dark} {scale}
- `journey` room toolbar opens participants without requiring a message
- `body` schedule picker keeps room authority through modal and saves
- `body` archive needs explicit confirmation and preserves authority
- `journey` manager sees removed member action without profile navigation
- `body` empty filtered page preserves continuation instead of declaring the room empty

**`test/chats/event_chat_widget_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/chats/presentation/event_chat_controller.dart` · decided by rules, 1 by hand

- `body` event chat readable {dark} {scale} {joined}
- `body` host opening and profile review are separate actions
- `body` fixture room state {room} has appropriate access and capture
- `body` terminal room {room} hides messages and member actions
- `body` reaction choices wrap and retain full touch targets

**`test/chats/event_profile_controller_test.dart`** — behaviour · subject `lib/chats/presentation/event_profile_controller.dart` · decided by rules

- `action` card picker filters ownership and preserves empty-page continuation
- `action` revocation remains possible with cancelled admission and unavailable cards
- `action` stale UI accounts and revisions cannot start a save
- `action` preview checks the same reviewed revision before any write
- `action` pending save freezes duplicates, card changes and refreshes
- `action` failed save retains the request ID for retrying the same reviewed payload
- `action` failed participant refresh drops previously visible private details
- `action` backgrounding clears profile and requires a new foreground read
- `action` late participant results cannot cross a sign-in change
- `action` an old card review cannot appear in the next signed-in account
- `action` pending save acknowledgement cannot change the next account editor
- `action` an initial profile response arriving in the background stays hidden

**`test/chats/event_profile_widget_test.dart`** — behaviour · subject `lib/chats/presentation/event_profile_screen.dart` · decided by rules, 2 by hand

- `body` long answers remain fully readable before sharing at large text
- `journey` sender name opens the selected participant profile
- `body` editor and participant readable {dark} {scale}
- `action` all choices start off; explicit save contains only checked answers
- `action` card pagination preserves unsaved core choices and never selects new answers
- `body` new server revision discards stale local choices
- `action` revocation stays available after admission ends
- `action` personalization is editable only when sharing is eligible
- `action` owned preview confirmation saves the reviewed selection
- `journey` account change hides an open preview and cannot save it
- `journey` backgrounding hides an open preview and cannot restore it
- `body` photo selection waits for a decoded preview and resets on replacement
- `body` photo-only sharing does not claim only the name is shared
- `body` real participant screen hides details in background and rechecks on resume

**`test/chats/suvbot_controller_test.dart`** — behaviour · subject `lib/chats/presentation/suvbot_controller.dart` · decided by rules

- `action` SuvbotController: delegates demo action requests to the repository

**`test/routing/app_shell_guest_cta_test.dart`** — behaviour · subject `lib/chats/presentation/inbox/chat_inbox_screen.dart` · decided by rules, 1 by hand · also under P3.0 shell, P6 you

- `journey` production router opens Chats for social-ready users

**`test/routing/router_widgets_test.dart`** — behaviour · subject `lib/chats/presentation/chat_screen.dart` · decided by rules, 2 by hand · also under P3.2 events/create, P5 people, P6 onboarding

- `body` chat route hydrates the profile when extra is invalid
- `journey` chat route uses a routed PublicProfile extra immediately
- `journey` FCM navigation helper drives the real chat route

**`widgetbook/test/matches_previews_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/chats/presentation/inbox/chats_list_view_model.dart` · decided by rules · adjacent, not in the totals

- `body` inbox preview queries are prepared independently and stay editable

Layout only, deleted with the screen:

- `test/chats/message_bubble_test.dart`: 6 cases · proves composition only: finds by type or text, with no input-driven condition · decided by rules and hand


### P6 you

`apps/consumer/lib/you`. 138 behaviours: 25 domain, 45 action, 3 parts, 54 body, 11 journey.

**`test/core/forms/contract_alignment_test.dart`** — behaviour · subject `lib/user_profile/presentation/self_profile_edit_tab_state.dart` · decided by rules · also under P5 organizer

- `domain` consumer profile descriptors stay aligned with patch contracts

**`test/host_memberships/host_membership_domain_test.dart`** — behaviour · subject `lib/host_memberships/presentation/my_memberships_state.dart` · decided by rules

- `domain` savings: sums unreleased member-priced bookings per membership

**`test/host_memberships/host_membership_widgets_test.dart`** — behaviour · subject `lib/host_memberships/presentation/host_membership_badge.dart` · decided by rules, test bodies read

- `body` MyMembershipsList: shows savings and the actions the status allows
- `body` MyMembershipsList: explains a host billing pause and offers no actions
- `body` MyMembershipsList: renders an empty state
- `journey` HostMembershipUpsellBanner: names the plan and opens it
- `body` HostMembershipPlansList: lists plans and marks the current one
- `body` member badge hides for ended memberships

**`test/image_uploads/photo_grid_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/image_uploads/shared/photo_grid.dart` · decided by rules

- `body` only active, non-loading photo slots are tappable
- `body` the next empty photo slot adds a photo
- `body` filled slots expose delete affordances when enabled
- `body` main label can be hidden for embedded photo grids

**`test/image_uploads/photo_upload_controller_test.dart`** — behaviour · subject `lib/image_uploads/shared/photo_upload_controller.dart` · decided by rules

- `action` rejects out-of-range photo slots before starting upload work
- `action` serializes overlapping photo writes so newer state is preserved
- `action` ignores a second picker request while the first is open
- `action` completes safely if the provider is disposed mid-upload
- `action` deletes a new upload when attaching it to the profile fails
- `action` deletePhoto compacts grouped photos and compatibility arrays
- `action` deletePhoto keeps completed profiles above the photo floor
- `action` reorderPhoto moves photos and keeps prompts aligned
- `action` savePhoto updates an existing photo caption without uploading
- `action` savePhoto clears the same prompt from other photos

**`test/image_uploads/profile_photo_editor_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/image_uploads/shared/profile_photo_editor_screen.dart` · decided by rules

- `action` preserves an unchanged unknown prompt and its caption on save

**`test/profile/optional_height_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/user_profile/presentation/widgets/profile_inline_height_editor.dart`, `lib/user_profile/presentation/self_profile_inline_edit_patch_factory.dart` · decided by rules

- `domain` height removal serializes null rather than omitting the patch key
- `body` height clear cancels, retries and retains a confirmed null

**`test/profile/profile_edit_controller_test.dart`** — behaviour · subject `lib/user_profile/presentation/profile_edit_controller.dart` · decided by rules

- `action` ProfileEditController: skips empty patches before enqueueing a profile save
- `action` ProfileEditController: does not run queued profile saves after the uid changes
- `action` ProfileEditController: latest profile saves preserve earlier nested queued edits

**`test/profile/profile_prompt_disclosure_test.dart`** — behaviour · subject `lib/user_profile/presentation/widgets/profile_tab_body.dart`, `lib/user_profile/presentation/widgets/profile_inline_editors.dart` · decided by rules, 1 by hand

- `domain` ProfileTab reveals completed prompts plus exactly the next slot

**`test/profile/profile_widgets_test.dart`** — mixed (19 layout cases go with the screen) · subject `lib/user_profile/presentation/profile_screen.dart` · decided by rules, 4 by hand

- `journey` inline prompt choices exclude questions used by other cards
- `body` inline email edit uses the email keyboard
- `action` inline email edit keeps row geometry stable and actions close
- `body` height inline edit uses bounded plus-minus controls
- `action` height edit waits for save before closing
- `action` prompt answer save failure stays inline with field error
- `action` prompt edit limits input to the callable length limit
- `action` prompt edit collapses repeated empty lines while typing
- `action` prompt answer shows saving then saved status after blur
- `journey` clearable single-choice inline editors open with no selected chip
- `body` nullable drinking inline editor does not preselect Never
- `action` single-choice chip saves only after Done
- `action` single-choice chip can be deselected and saved as null
- `action` languages can clear the last value with Optional copy
- `body` single-choice empty draft does not show stale saved value
- `action` multi-choice selected chips move into the row value slot
- `action` single-choice save shows pending state before closing
- `journey` failed single-choice save clears pending selection and keeps editor open
- `body` failed single-choice editors do not leak selection to another field
- `action` multi-choice edit saves before closing
- `action` pace range edit saves values before closing
- `body` ProfileTab edits display name and keeps legal identity readonly
- `action` display name edit validates and saves trimmed public name
- `body` direct text Saved state survives an equal profile refresh
- `body` equal profile refresh preserves a multi-choice draft
- `body` ProfileTab omits private discovery filters
- `body` ProfileTab keeps activity preferences optional and collapsed before setup
- `body` Pace range expands inline with shared RangeSlider
- `body` prompt card separates explicit question and blur-save answer
- `action` prompt answer trims and saves implicitly when focus leaves
- `action` prompt answer blur preserves a question selection until explicit Done
- `action` prompt Done and answer blur serialize without dropping either
- `domain` profile prompt cards remain capped at the three-prompt contract
- `body` Forms tab is reachable with profile {status}
- `body` ProfileScreen renders tab-shaped skeletons while loading
- `journey` Profile settings button routes to account settings
- `body` ProfileScreen accepts a typed initial tab
- `body` ProfileScreen surfaces profile photo upload failures
- `body` ProfileTab derives consistent empty editable-row copy

**`test/profile/self_profile_edit_tab_state_test.dart`** — behaviour · subject `lib/user_profile/presentation/self_profile_edit_tab_state.dart` · decided by rules

- `domain` SelfProfileEditTabState maps photo grid delete and loading state
- `domain` SelfProfileEditTabState disables delete at minimum photo count
- `domain` SelfProfileEditTabState derives prompt slots and available ids
- `domain` SelfProfileEditTabState derives basics and profile section row descriptors
- `domain` SelfProfilePhotoIntentFactory resolves editor and mutation intents

**`test/profile/self_profile_inline_edit_patch_factory_test.dart`** — behaviour · subject `lib/user_profile/presentation/self_profile_inline_edit_patch_factory.dart` · decided by rules

- `domain` optional profile text patches carry an explicit null clear
- `domain` SelfProfileInlineEditPatchFactory maps direct identity fields
- `domain` SelfProfileInlineEditPatchFactory maps enum and list fields
- `domain` SelfProfileInlineEditPatchFactory maps running preference patches

**`test/profile/self_profile_screen_state_test.dart`** — behaviour · subject `lib/user_profile/presentation/self_profile_screen_state.dart` · decided by rules

- `domain` retained profile data is hidden during reload and refresh errors
- `domain` SelfProfileScreenState maps loading profile state
- `domain` SelfProfileScreenState maps profile errors to retry intent
- `domain` SelfProfileScreenState maps null profile to unavailable route state
- `domain` SelfProfileScreenState projects ready profile and mutation modes
- `domain` SelfProfileMutationMode tracks upload and save flags independently

**`test/reviews/reviews_widgets_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/reviews/presentation/reviews_history_screen.dart` · decided by rules, 1 by hand · also under shared lib/pages/event

- `body` review history prompts signed-out users
- `body` review history shows loading while reviews resolve
- `body` review history shows profile load errors
- `body` review history shows review load errors
- `body` review history shows empty reviews state
- `journey` review history lists own reviews and opens edit sheet
- `body` review history falls back when event context is missing

**`test/routing/app_shell_guest_cta_test.dart`** — behaviour · subject `lib/user_profile/presentation/profile_screen.dart` · decided by rules, 1 by hand · also under P3.0 shell, P6 chats

- `journey` production router opens Profile for social-ready users

**`test/safety/messaging_permissions_controller_test.dart`** — behaviour · subject `lib/safety/presentation/messaging_permissions_controller.dart` · decided by rules

- `action` withdrawal retries keep identity; in-flight results cannot cross accounts
- `action` pagination retries the same cursor and updates current Catch permission
- `action` scoped withdrawal leaves the other organizer purpose active
- `action` Stop all reaches the repository after fresh purpose re-opt-in

**`test/safety/messaging_permissions_widget_test.dart`** — behaviour · subject `lib/safety/presentation/messaging_permissions_controller.dart` · decided by rules

- `body` independent sender controls are readable {dark} {scale}
- `body` pending withdrawal disables both senders
- `body` each organizer purpose has its own withdrawal action
- `body` fresh scoped grant after older STOP keeps Stop all reachable

**`test/safety/settings_account_state_test.dart`** — behaviour · subject `lib/safety/presentation/settings_account_state.dart` · decided by rules

- `domain` maps loaded profile and blocked-account rows into display state
- `domain` keeps preference updates isolated to the selected field
- `domain` Cross Paths consent defaults off and maps only explicit profile opt-in
- `domain` reports a surface-wide operation while any write domain is pending
- `domain` models profile provider loading, error, and missing states

**`test/safety/settings_controller_test.dart`** — behaviour · subject `lib/safety/presentation/settings_controller.dart` · decided by rules

- `action` savePreference writes the selected settings field
- `action` Cross Paths preference uses the private global-consent field
- `action` one active settings write freezes every controller write domain
- `action` unblockUser delegates to SafetyRepository
- `action` requestAccountDeletion clears local flow state after repository call

**`test/safety/settings_legal_links_test.dart`** — behaviour · subject `lib/safety/presentation/settings_screen.dart`, `lib/safety/presentation/settings_keys.dart` · decided by rules

- `journey` consumer Settings opens {expected} externally
- `body` consumer Settings hides unconfigured legal rows
- `body` consumer legal link launch failure is visible

**`test/safety/settings_screen_test.dart`** — mixed (1 layout cases go with the screen) · subject `lib/safety/presentation/settings_screen.dart` · decided by rules

- `body` Host analytics requires a choice and can be withdrawn
- `body` profile-unavailable settings keep account actions without preference writes {entry}
- `body` renders profile-backed settings and empty blocked state
- `action` shows the private Cross Paths toggle as a shipped privacy control
- `body` renders profile provider loading state without blank rows
- `body` renders blocked accounts row skeleton while loading
- `body` renders profile provider errors through inline error state
- `action` preference switches write through SettingsController
- `body` failed preference writes roll back optimistic switch state
- `body` pending settings write freezes the whole settings surface
- `body` blocked account rows use profile data and unblock controller
- `body` account section owns profile history actions and sign out
- `journey` host app row opens the central handoff link
- `journey` pending host handoff freezes settings and false result is visible
- `journey` host handoff reports a thrown launcher failure
- `body` delete account confirmation delegates to controller

**`test/user_analytics/user_analytics_section_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/user_analytics/shared/user_analytics_section.dart` · decided by rules, 1 by hand

- `parts` UserAnalyticsSection renders a report-shaped skeleton while loading
- `parts` data coverage maps known ids and future ids to stable labels

**`test/user_profile/form_profile_account_widget_test.dart`** — behaviour · subject `lib/user_profile/presentation/profile_screen.dart`, `lib/user_profile/presentation/self_profile_screen_state_provider.dart` · decided by rules, 1 by hand

- `body` form directory is readable without dating setup {dark} {scale}

**`test/user_profile/form_profile_photo_test.dart`** — behaviour · subject `lib/user_profile/presentation/form_profile_photo_field.dart` · decided by rules, 1 by hand

- `body` selection waits for decoding; leaving evicts the private image
- `parts` decode failure leaves selection disabled and offers retry

**`test/user_profile/form_profile_review_widget_test.dart`** — mixed (2 layout cases go with the screen) · subject `lib/user_profile/presentation/form_profile_review_screen.dart` · decided by rules, test bodies read

- `action` save requires acknowledgement; selection and edits reset it; retry keeps request ID
- `action` organizer groups keep status and response actions distinct
- `body` empty scanned page can load more without claiming no profiles exist

**`test/user_profile/form_profiles_controller_test.dart`** — behaviour · subject `lib/user_profile/presentation/form_profiles_controller.dart` · decided by rules

- `action` pagination rejects stale account results and preserves retry cursor

**`test/user_profile/profile_activity_section_widget_test.dart`** — behaviour · subject `lib/user_profile/presentation/widgets/profile_tab_body.dart` · decided by rules

- `body` optional activity section stays readable {dark} {scale}


## Appendix A. Cases that test only context code

These live in universe files but reach no legacy symbol, so they survive. Move
them to the context's test folder before deleting the file.

| File | Cases that test only context code |
|---|---|
| `test/architecture/keep_alive_provider_lifecycle_test.dart` | initial app location stays fixed for the container lifetime |
| `test/chats/fcm_service_lifecycle_test.dart` | one subscription per session, explicit app/recipient validation, reset; logout during initial-message lookup cannot navigate afterwards; an upgraded installation rotates its previously unscoped address; logout during permission prompt cannot reattach token/tap listeners; account replacement rotates address and rejects previous recipient; unregister removes only this installation and matching legacy token; failed offline revocation blocks token reuse until rotation succeeds; backend {fixture} reminder routes through {delivery}; backend reminder rejects wrong {invalid} on {delivery}; delayed backend reminder cannot navigate after {transition}; backend event payload requires both route identifiers; Host accepts backend staff payloads and rejects Consumer payload |
| `test/core/app_shell_test.dart` | treats empty and none-only results as offline; treats any real transport as online; chat navigation badge stays inside its icon box; iOS navigation bar uses floating adaptive chrome; large-text navigation stays icon-only inside floating chrome; iOS floating navigation keeps selected end tab close to edge; navigation bar accepts host destination sets; navigation bar selection fires haptic feedback; app notice controller dedupes notices by key; queued app notices render below the safe area; ephemeral app notices dismiss after their duration |
| `test/core/consumer_bootstrap_test.dart` | animated bootstrap is consumer mobile only; initialized app waits for both startup work and the reel; startup work can outlast the reel without exposing the router; handoff never overlaps independent MaterialApp roots; bootstrap failure is retryable and never repeats native handoff; boot reel lands without mounting logged-out actions |
| `test/core/forms/contract_alignment_test.dart` | seeded overlong UI limit proves the alignment gate is non-vacuous; choice alignment includes values without an app label interface |
| `test/core/toolbar_control_contract_test.dart` | toolbar controls share paint extent, center and gaps on {platform}; selector published size equals painted layout at both text scales; search expansion stays valid during the transition and after typing; labelled toolbar {variant} supports semantic activation and disables it; collapsed search supports semantic activation and disabled search exposes no tap; app bar rejects {entry} |
| `test/design/public_surface_behavior_test.dart` | synthetic organizers are never publicly browseable; public surface behavior contract enumerates every registered app row |
| `test/event_rehearsal/event_rehearsal_assistance_repository_test.dart` | uncertain retries preserve the exact reviewed payload and current response; an unconfirmed mutation response is an error, not a saved command |
| `test/event_rehearsal/event_rehearsal_connection_test.dart` | wire connection state stays independent and malformed values fail |
| `test/event_rehearsal/event_rehearsal_domain_test.dart` | rejects malformed callable projections; maps reserved behavior wire values explicitly |
| `test/event_success/event_assistance_departure_provider_test.dart` | switching accounts hides loaded progress before the next response; an old account read cannot complete into the new account; switching away and back produces a new review identity; a sign-out during read cannot later publish the response |
| `test/event_success/event_participant_context_test.dart` | reads actual server projections without inventing a selected attendee; foreign identity, extra candidate data and inconsistent shapes fail |
| `test/event_success/event_success_assignment_features_test.dart` | published option identity and explicit ordinal order survive mapping; number mapping requires finite distinct bounds |
| `test/event_success/event_success_exclusion_ledger_test.dart` | alert boundary is inclusive at the configured threshold; next alert delay includes time until event tracking starts; next alert delay pauses while a timed assignment is active; ledger starts at check-in and unions overlapping engagement; static peer assignment does not accrue exclusion; static assignment preserves exclusion accrued before generation |
| `test/event_success/event_success_motion_contract_test.dart` | portable asset documents are valid Lottie vector animations; superseded Event Success painters stay deleted |
| `test/event_success/event_success_runtime_test.dart` | gates capabilities from selected modules and feature toggles; gates compatibility questionnaire and ranking opt-in separately; prioritizes assigned First Hello mission during arrival; requires a booked arrival state for First Hello mission; prioritizes unanswered questionnaire during check-in arrival; does not interrupt active reveal for unanswered questionnaire; gates live reveal behind assignment modules; allows quiz standings reveal without generated assignments; keeps booked attendees in pre-arrival planning state; maps checked-in attendee content to the host active step; keeps idle reveal steps as context until countdown starts; filters run-of-show steps to selected live modules; keeps platform-owned live steps when host tools are absent; always exposes the platform-owned post-event surface |
| `test/events/event_check_in_qr_payload_test.dart` | event check-in QR payload round trips event id; event check-in QR payload rejects unrelated codes |
| `test/events/event_field_optionality_test.dart` | event-local time uses stored zone and preserves legacy fallback |
| `test/events/event_viewer_state_provider_test.dart` | a foreign local account key fails before reading the repository |
| `test/events/event_viewer_state_test.dart` | retained admission is distinct from revoked future eligibility; an owned offer permits acceptance rather than direct booking; malformed and contradictory facts never produce a booking DTO |
| `test/host_memberships/host_membership_domain_test.dart` | parses the server document and tenure; maps every wire status and rejects unknown ones; offers only the self-serve moves the server accepts; parses prices, benefits, perks and limits; benefits round-trip to the save payload; pricing hint flags plans below a regular spend; checkout progress parses strictly; event membership facts require the exact key set |
| `test/host_memberships/host_membership_event_dock_test.dart` | older responses without membership facts still parse |
| `test/hosts/event_publication_test.dart` | publication request journal rejects unknown authority fields |
| `test/hosts/forms/host_form_admission_test.dart` | readiness and receipts reject wrong scope and fabricated authority |
| `test/hosts/forms/host_form_target_binding_test.dart` | event target survives draft serialization and changes only explicitly |
| `test/hosts/forms/host_forms_screen_test.dart` | directory pagination keeps account and session identity |
| `test/hosts/forms/host_response_export_test.dart` | durable ambiguous request replays the same ID after recreation; nested caller edits cannot change a saved export command or replay |
| `test/hosts/forms/host_response_lifecycle_test.dart` | Unified entries parse both sources and reject an empty row |
| `test/hosts/host_automation_workflows_test.dart` | automation webhook URL shape rejects credentials, fragments and non-HTTPS ports |
| `test/hosts/host_create_event_controller_test.dart` | exact serialized UTF-8 request bound accepts its boundary |
| `test/hosts/host_customer_filter_summary_test.dart` | campaign bridge fails closed while customer history is incomplete |
| `test/hosts/host_event_offer_test.dart` | manual write acknowledgement binds scope, action and result |
| `test/hosts/host_operations_screen_test.dart` | CatchSection.fieldRows rows align to the section text lane |
| `test/hosts/host_response_query_test.dart` | mixed typed conditions retain exact API shape across pagination; unpublished fields and invalid typed values cannot be applied; twenty condition and three-level bounds mirror server limits; a changed result clears selected response identities; malformed page and catalog fail instead of showing partial results |
| `test/hosts/host_saved_audience_retry_test.dart` | real repository follows definition cursors and sends refreshed fence |
| `test/hosts/host_tracking_settings_test.dart` | Private settings reject cross-organiser and policy-enabled responses; private reads require settled auth and discard old session results |
| `test/hosts/manager_event_setup_preferences_test.dart` | manager preferences can set and clear without public serialization; reusable payment pages require canonical public HTTPS URLs |
| `test/hosts/memberships/host_memberships_section_test.dart` | plan drafts validate the mandate price window; event rules parse overrides and the computed general sale |
| `test/hosts/phone_import/phone_import_controller_test.dart` | selected contact references are stable only in the same account and wedding |
| `test/hosts/phone_import/phone_import_live_flow_test.dart` | live fixture deadlines follow the caller clock beyond the sample date; commit wait fails when retry ends before reaching the fixture |
| `test/hosts/private_event_details_test.dart` | optional media and itinerary survive JSON journal and explicit clearing; partial details preserve inherit, set and clear without implied values; map location survives the exact-command journal without invented coordinates; listing terms journal retains exact price and rejects invalid policies; progress rejects complete phases and fabricated occupied counts |
| `test/hosts/private_event_preferences_test.dart` | all ten three-state intentions serialize; amount cannot inherit |
| `test/hosts/private_event_setup_inventory_test.dart` | manager inventory validates every returned private item and cursor |
| `test/image_uploads/photo_upload_controller_test.dart` | image upload policies keep picked media bounded by surface |
| `test/notifications/foreground_notification_test.dart` | only match/message events with valid targets are accepted; event room arrivals derive a safe route without a match id; network URLs cannot supply navigation and avatar must be HTTPS |
| `test/onboarding/onboarding_account_policy_test.dart` | event completion resumes booking without requiring social readiness |
| `test/organizers/organizer_manager_authority_test.dart` | revocation is not undone by a delayed owner-labelled display entry; display-only legacy records and signed-out users grant no seat; nested ownership snapshots do not grant a management seat; {entry} retains management authority without a display profile; canonical owner wins ownership while both explicit IDs remain managers |
| `test/programs/program_attendance_report_test.dart` | report requires program totals and per-function fields; export csv carries a program row and one row per function |
| `test/programs/program_door_test.dart` | parses function, counts, guests, and journal; batch results keep per-operation outcomes; scoped check-in reads only assigned functions; empty function scope means every function; non-door duties never read function rosters; expired door assignment loses function access; managers read any function; door action round-trips through the journal codec; walk-in entry validates and groups by function; persisted journal rejects corrupt door payloads |
| `test/programs/program_hotel_pagination_test.dart` | hotel pages require both explicit continuation fields |
| `test/programs/program_hotel_rooms_test.dart` | room board payload requires its explicit collections |
| `test/programs/program_lifecycle_affordances_test.dart` | legacy inventory needs explicit lifecycle authority; inventory restore needs authority and an unexpired grace window; legacy archive without a deadline remains restorable as on backend; restore grace deadline is exclusive and anonymization is irreversible |
| `test/programs/program_reconciliation_test.dart` | export serializes the ledger with CSV escaping |
| `test/programs/program_trip_pagination_test.dart` | trip pages require explicit continuation metadata |
| `test/routing/app_shell_guest_cta_test.dart` | guest app shell waits for auth before showing phone CTA; guest app shell shows phone CTA without tab destinations; authenticated app shell loads Chats and Profile branches; authenticated iOS shell overlays the floating tab bar |
| `test/routing/router_redirect_test.dart` | initial and cached-null failures retain the intended destination; successful absence still enters onboarding with the same intent; cached real profile remains usable after a failed refresh; public browsing remains available during profile failure; Host routes remain independent of the Consumer profile; {intent} survives error and retry when returning to own account; {path} requires resolved auth but not a loaded profile; does not waive adjacent private or booking routes; requires sign-in but not a dating or booking-ready profile; returns to form review after authentication, preserving other gates; host management routes are not available to consumer role; consumer routes are not mounted for the Host app role; launch access is a normal Consumer Settings route; shared bootstrap and development routes remain role-neutral; consumer in-app event deep links stay on consumer event routes; allows only the declared public discovery route shapes; rejects nested account routes under public organizer paths; organizer settings spokes use canonical top-level routes; organizer route forwards stable edit field query keys; host app starts on host tooling instead of the consumer welcome; host app sends unauthenticated users directly to auth; host app does not resume stale consumer destinations; unauthenticated users are sent to the start screen with the pending route; unauthenticated users can stay on the start screen; unauthenticated users can browse Explore; legacy unauthenticated onboarding links move to start and preserve from; authenticated users without a profile may still browse public routes; authenticated users without a profile still gate private routes; club detail deep links are accessible to unauthenticated users; event detail deep links are accessible to unauthenticated users; event companion deep links require authentication; identity-incomplete profiles stay in onboarding and preserve the pending route; booking-ready users can access event routes without a social-ready profile; booking-ready users are sent to profile completion for catches; booking-ready users may hit the retired catches hub redirect; profile-completion onboarding is allowed until social ready; run-preference onboarding is allowed until run preferences are ready; run-preference onboarding resumes once run preferences are ready; loading auth state routes through the loading screen; fully set-up users resume the preserved destination from onboarding; fully set-up users visiting the auth route land on dashboard; fully set-up users visiting start resume the preserved destination; unauthenticated users can access the auth route; pending OTP verification returns signed-out users from start to auth; pending OTP verification returns signed-out users from default route to auth; pending OTP verification does not steal signed-out public club browsing; invalid from values are discarded on resume; authority-style from values are discarded on resume; transient pending destinations resume to dashboard |
| `test/routing/router_widgets_test.dart` | legacy Programs URL preserves organizer, saved ID and remaining query on Events; saved audience compose restores its organizer from the URI |
| `test/safety/settings_controller_test.dart` | watchBlockedUsersProvider auto-disposes settings listeners; watchBlockedUsersProvider propagates uid auth errors |
| `test/ui_captures/fixtures/host_marketing_india_fixture_test.dart` | the Mumbai story is a capture world, not a seed world; all four phases share the same named event, venue, schedule and free/open policy; phase clocks and attendance advance without checked-in guests before the event |
| `test/ui_captures/host_sheet_review_test.dart` | Host sheet review {entry} |
| `test/user_profile/form_profile_photo_test.dart` | preview rejects oversized, wrong-type and non-JPEG payloads |

## Appendix B. Re-run the classification

From a checkout, with Node and Python 3 and no dependency install. No Flutter
process runs. Save the scripts below and the overrides from Appendix C into a
scratch directory, then:

```sh
export S=/path/to/scratch
node $S/inventory.mjs $S/inv.jsonl
python3 $S/universe.py $S
node $S/extract_cases.mjs $S/inv.jsonl $S/cases.jsonl
python3 $S/classify.py
python3 $S/digest.py test/hosts > $S/digest.txt
python3 $S/finalize.py
```

`finalize.py` prints the totals and any hand decision that no longer matches a
test (`UNUSED OVERRIDE`); read those first after the suite changes. `digest.py`
takes a comma-separated list of test folders and is what the hand review read.
`render_doc.py` prints the tables and sections: it fills the double-brace
placeholders named in its source from two text files in the scratch directory,
`prose_top.md` and `prose_method.md`. Put in them the placeholders you want
refreshed and copy the output over the matching parts of this document.

The greps behind the counts in [App goldens](#app-goldens) and the first pass:

```sh
git ls-files 'test/**_test.dart' 'apps/*/test/**_test.dart' | wc -l
git ls-files 'test/**.dart' | xargs grep -l 'pumpWidget' | wc -l
git ls-files 'test/**.dart' | xargs grep -l 'overrideWith' | wc -l
git ls-files 'test/**.dart' | xargs grep -l '^part of' | wc -l
git ls-files '*.png' | grep -E '^(test|artifacts)/' | awk -F/ '{print $1"/"$2"/"$3}' | sort | uniq -c
git ls-files 'test/goldens/baseline/*.png' | grep -v widgetbook | sed -E 's#.*/##; s/\.(light|dark)\.png$//' | sort | uniq -c
git grep -n 'matchesGoldenFile\|matchCatchGolden' -- ':!test/goldens' ':!docs'
git grep -ln 'program_screens\|design_handoff'
git grep -n 'artifacts/marketing\|artifacts/store' -- test widgetbook tool/ui_capture
git ls-files 'test/goldens/baseline/widgetbook/**' | grep -vE 'corpus/(core_|geometry_)' | wc -l
git grep -lE 'package:catch_dating_app/(auth|chats|cross_paths|dashboard|event_rehearsal|event_success|events|explore|force_update|host_memberships|hosts|image_uploads|launch_access|locations|matches|notifications|onboarding|organizers|payments|programs|public_profile|reviews|safety|swipes|user_analytics|user_profile)/' -- widgetbook/lib/primitives widgetbook/lib/utility widgetbook/lib/foundation widgetbook/lib/geometry widgetbook/lib/layout widgetbook/lib/shell widgetbook/lib/support
```

#### `inventory.mjs`

````js
#!/usr/bin/env node
// First pass: enumerate the test tree, join `part` files to their library, and
// read the subject of each library from its imports. Run from the repo root.
// Output: JSON lines, one per Dart library under test/ and apps/*/test.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const LEGACY = [
  'auth', 'chats', 'cross_paths', 'dashboard', 'event_policies', 'event_rehearsal',
  'event_success', 'events', 'explore', 'force_update', 'host_memberships', 'hosts',
  'image_uploads', 'launch_access', 'locations', 'matches', 'notifications', 'onboarding',
  'organizers', 'payments', 'programs', 'public_profile', 'reviews', 'safety', 'swipes',
  'user_analytics', 'user_profile',
];
const OUT_OF_SCOPE_PKG = ['contexts', 'kernel', 'platform', 'routing', 'pages', 'design_fixtures', 'l10n'];

const out = process.argv[2];
const files = execSync("git ls-files 'test/**.dart' 'apps/*/test/**.dart' 'widgetbook/test/**.dart'", { encoding: 'utf8' })
  .trim().split('\n');

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const partOf = new Map();
for (const f of files) {
  const src = text.get(f);
  const m = src.match(/^part of ['"]([^'"]+)['"];/m);
  if (m) partOf.set(f, path.normalize(path.join(path.dirname(f), m[1])));
}

const libs = new Map();
for (const f of files) {
  const root = partOf.get(f) ?? f;
  if (!libs.has(root)) libs.set(root, []);
  libs.get(root).push(f);
}

function imports(src, file) {
  const res = [];
  for (const m of src.matchAll(/^(?:import|export)\s+['"]([^'"]+)['"]/gm)) {
    const u = m[1];
    if (u.startsWith('package:catch_dating_app/')) res.push(u.slice('package:catch_dating_app/'.length));
    else if (u.startsWith('package:')) res.push('@' + u.slice('package:'.length));
    else if (!u.startsWith('dart:')) res.push('./' + path.normalize(path.join(path.dirname(file), u)));
  }
  return res;
}

const count = (src, re) => (src.match(re) ?? []).length;

const rows = [];
for (const [lib, members] of libs) {
  const src = members.map((m) => text.get(m)).join('\n');
  const imp = imports(text.get(lib) ?? '', lib);
  const legacy = imp.filter((i) => LEGACY.includes(i.split('/')[0]));
  const other = imp.filter((i) => OUT_OF_SCOPE_PKG.includes(i.split('/')[0]));
  const isTest = /_test\.dart$/.test(lib);
  rows.push({
    lib,
    members,
    isTest,
    lines: src.split('\n').length,
    legacy,
    other,
    relImports: imp.filter((i) => i.startsWith('./')),
    cases: count(src, /\b(?:testWidgets|test)\(\s*(?:\n\s*)?['"]/g) + count(src, /\bvariant:/g) * 0,
    testWidgets: count(src, /\btestWidgets\(/g),
    unit: count(src, /(?<![A-Za-z])test\(/g),
    verify: count(src, /\bverify(Never)?\(/g),
    expectFind: count(src, /expect\(\s*find\./g) + count(src, /expect\(\s*tester\./g),
    expectAll: count(src, /\bexpect(Later)?\(/g),
    golden: count(src, /matchesGoldenFile|matchCatchGolden/g),
    tap: count(src, /tester\.(tap|enterText|drag|longPress|fling)\b|tapAndSettle|\.tap\(/g),
    pump: count(src, /pumpWidget/g),
    override: count(src, /overrideWith|overrideWithValue|overrides:/g),
    settle: count(src, /pumpAndSettle/g),
    semantics: count(src, /bySemanticsLabel|ensureSemantics|getSemantics|meetsGuideline|SemanticsFlag|hasSemantics|matchesSemantics/g),
    geometry: count(src, /getSize|getTopLeft|getCenter|getRect|getBottomLeft|getBottomRight|getTopRight|tester\.widget<(?:Container|SizedBox|Padding|DecoratedBox|Text|Row|Column|Align)>|\.size\b|\.height\b|\.width\b|\.padding\b|\.decoration\b/g),
    findType: count(src, /find\.byType\(/g),
    findText: count(src, /find\.text(?:Containing)?\(/g),
    findKey: count(src, /find\.byKey\(/g),
    route: count(src, /GoRouter|\.location\b|routerConfig|uri\.path|matchedLocation|onPressed|Navigator/g),
    fakeCalled: count(src, /calls\b|\.called|called\b|captured|recorded|invocations|lastCall|lastRequest|requests\b|\.saved|\.submitted|callCount|\.received/g),
  });
}
writeFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(rows.length, 'libraries;', rows.filter((r) => r.isTest).length, 'test entrypoints');
````

#### `universe.py`

````python
#!/usr/bin/env python3
"""Second pass: decide the universe and the subject of each test library.

A library is in the universe when its subject (the production file named most
like the test, else its imports) sits in a legacy folder of Appendix B or in
lib/routing/shell. Imports through local helper libraries count (transitively).
"""
import json, os, re, sys

S = sys.argv[1]
inv = [json.loads(l) for l in open(f'{S}/inv.jsonl')]
by = {r['lib']: r for r in inv}
LEG = set('auth chats cross_paths dashboard event_policies event_rehearsal event_success events explore force_update host_memberships hosts image_uploads launch_access locations matches notifications onboarding organizers payments programs public_profile reviews safety swipes user_analytics user_profile'.split())
SHELL = ('routing/shell/', 'routing/host_', 'routing/detail_route_pages')


def is_leg(p):
    return p.split('/')[0] in LEG or p.startswith(SHELL)


def is_screen_lib(p):
    return is_leg(p) and p.endswith('.dart')


def trans(lib, seen=None):
    seen = seen or set()
    if lib in seen or lib not in by:
        return set()
    seen.add(lib)
    res = {i for i in by[lib]['legacy']}
    res |= {i for i in by[lib].get('other', []) if is_leg(i)}
    for rel in by[lib]['relImports']:
        res |= trans(rel[2:], seen)
    return res


def toks(s):
    return set(t for t in re.split(r'[_/.]', s) if t and t not in {'dart', 'test', 'presentation', 'widgets', 'shared', 'lib', 'screen'})


rows = []
for r in inv:
    if not r['isTest']:
        continue
    direct = [i for i in r['legacy'] + r['other'] if is_leg(i)]
    tr = sorted(trans(r['lib']) - set(direct))
    ctx = [i for i in r['other'] if i.split('/')[0] in ('contexts', 'kernel', 'platform')]
    base = os.path.basename(r['lib']).replace('_test.dart', '')
    # find production files whose name equals the test name in any root
    exact_leg = [i for i in direct if os.path.basename(i).replace('.dart', '') == base]
    exact_ctx = [i for i in ctx if os.path.basename(i).replace('.dart', '') == base]
    subj = None
    how = None
    if exact_leg:
        subj, how = exact_leg[0], 'name=legacy'
    elif exact_ctx:
        subj, how = exact_ctx[0], 'name=context'
    else:
        def score(i):
            a, b = toks(os.path.basename(i)), toks(base)
            return len(a & b) / max(1, len(a | b))
        cand_leg = sorted(direct, key=score, reverse=True)
        cand_ctx = sorted(ctx, key=score, reverse=True)
        sl = score(cand_leg[0]) if cand_leg else -1
        sc = score(cand_ctx[0]) if cand_ctx else -1
        if cand_leg and sl >= sc and sl > 0:
            subj, how = cand_leg[0], f'overlap={sl:.2f}'
        elif cand_ctx and sc > sl:
            subj, how = cand_ctx[0], f'overlap-context={sc:.2f}'
        elif cand_leg:
            subj, how = cand_leg[0], 'first-legacy-import'
        elif tr:
            subj, how = tr[0], 'via-helper'
    rows.append(dict(lib=r['lib'], lines=r['lines'], direct=direct, trans=tr, ctx=ctx, subject=subj, how=how))
json.dump(rows, open(f'{S}/subjects.json', 'w'), indent=0)
import collections
print(collections.Counter((x['how'] or 'none').split('=')[0] for x in rows))
if len(sys.argv) > 2:
    for x in rows:
        if (x['how'] or 'none').split('=')[0] in sys.argv[2].split(','):
            print(x['lib'], '=>', x['subject'], x['how'], 'L', len(x['direct']), 'C', len(x['ctx']))
````

#### `extract_cases.mjs`

````js
#!/usr/bin/env node
// Splits every Dart test library into test cases and classifies each statement
// of each case. No analyzer needed: a small scanner respects strings and comments.
// Usage: node extract_cases.mjs <inv.jsonl> <cases.jsonl>
import { readFileSync, writeFileSync } from 'node:fs';

function mask(src) {
  // Same length as src, with string contents and comments blanked, so that
  // bracket matching and keyword search never see them.
  const out = src.split('');
  let i = 0;
  const n = src.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  function skipString() {
    const start = i;
    let raw = false;
    if (src[i] === 'r') { raw = true; i++; }
    const q = src[i];
    const triple = src.substr(i, 3) === q + q + q;
    const delim = triple ? q + q + q : q;
    i += delim.length;
    while (i < n) {
      if (!raw && src[i] === '\\') { i += 2; continue; }
      if (src.substr(i, delim.length) === delim) { i += delim.length; break; }
      if (!raw && src[i] === '$' && src[i + 1] === '{') {
        let depth = 1; i += 2;
        while (i < n && depth > 0) {
          const c = src[i];
          if (c === "'" || c === '"') { skipString(); continue; }
          if (c === '{') depth++;
          if (c === '}') depth--;
          i++;
        }
        continue;
      }
      i++;
    }
    blank(start + (raw ? 2 : 1) + (triple ? 2 : 0), i - delim.length);
  }
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const s = i; while (i < n && src[i] !== '\n') i++; blank(s, i); continue; }
    if (c === '/' && src[i + 1] === '*') { const s = i; i += 2; while (i < n && src.substr(i, 2) !== '*/') i++; i += 2; blank(s, i); continue; }
    if (c === "'" || c === '"') { skipString(); continue; }
    if (c === 'r' && (src[i + 1] === "'" || src[i + 1] === '"') && !/[A-Za-z0-9_]/.test(src[i - 1] ?? ' ')) { skipString(); continue; }
    i++;
  }
  return out.join('');
}

function closeParen(m, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  for (let i = open; i < m.length; i++) {
    const c = m[i];
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ')' || c === '}' || c === ']') {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

function firstStringArg(src, m, open) {
  // Reads adjacent string literals from the first positional argument.
  let i = open + 1;
  let name = '';
  let got = false;
  while (i < src.length) {
    while (/\s/.test(m[i]) ) i++;
    let c = src[i];
    if (c === 'r' && (src[i + 1] === "'" || src[i + 1] === '"')) { i++; c = src[i]; }
    if (c !== "'" && c !== '"') break;
    const triple = src.substr(i, 3) === c + c + c;
    const delim = triple ? c + c + c : c;
    let j = i + delim.length;
    let piece = '';
    while (j < src.length) {
      if (src[j] === '\\') { piece += src[j + 1] ?? ''; j += 2; continue; }
      if (src.substr(j, delim.length) === delim) break;
      if (src[j] === '$' && src[j + 1] === '{') {
        // Interpolation: keep a readable placeholder, skip nested strings.
        let depth = 1;
        let close = j + 2;
        let quote = null;
        while (close < src.length && depth > 0) {
          const ch = src[close];
          if (quote) { if (ch === '\\') close++; else if (ch === quote) quote = null; }
          else if (ch === "'" || ch === '"') quote = ch;
          else if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth > 0) close++;
        }
        const expr = src.slice(j + 2, close).replace(/\s+/g, ' ').trim();
        const ident = expr.match(/^[A-Za-z_][\w.]*$/);
        piece += ident ? `<${expr.split('.').filter((x) => x !== 'name' && x !== 'label' && x !== 'key' && x !== 'value').pop() ?? expr}>` : '<variant>';
        j = close + 1;
        continue;
      }
      if (src[j] === '$' && /[A-Za-z_]/.test(src[j + 1] ?? '')) {
        const v = src.slice(j + 1).match(/^\w+/)[0];
        piece += `<${v}>`;
        j += v.length + 1;
        continue;
      }
      piece += src[j];
      j++;
    }
    name += piece;
    i = j + delim.length;
    got = true;
  }
  return got ? name.replace(/\s+/g, ' ').trim() : null;
}

const STMT = /\b(expectLater|expect|verifyNever|verifyInOrder|verify|matchCatchGolden|[_a-z]*[eE]xpect[A-Z]\w*|_?assert[A-Z]\w*|_?verify[A-Z]\w*)\s*(?:<[^()]*>)?\(/g;
const ACTION = /\b(?:tester|widgetTester|t)\s*\.\s*(tap|enterText|drag|longPress|fling|dragUntilVisible|sendKeyEvent|scrollUntilVisible|tapAt|pageBack)\b|\b(tap[A-Z_]\w*|_tap\w*|_enter\w*|_submit\w*|_select\w*|_open\w*|_press\w*|_scroll\w*|_drag\w*)\s*\(/g;

function classifyAssert(s) {
  const x = s.replace(/\s+/g, ' ');
  if (/matchesGoldenFile|matchCatchGolden/.test(x)) return 'golden';
  if (/^(verify|verifyNever|verifyInOrder|_?verify[A-Z])/.test(x) && !/^_?verify[A-Z]\w*Golden/.test(x)) return 'verify';
  if (/^(?:_?[eE]xpect[A-Z]|_?assert[A-Z])/.test(x)) return /layout|geometry|position|size|width|height|padding|above|below|order|before|after|inset|align|aligned|gutter|bound/i.test(x.slice(0, 40)) ? 'geomHelper' : 'helper';
  if (/Semantics|meetsGuideline|hasSemantics|matchesSemantics|bySemanticsLabel|androidTapTargetGuideline|textContrastGuideline/.test(x)) return 'semantics';
  if (/\b(getSize|getTopLeft|getTopRight|getBottomLeft|getBottomRight|getCenter|getRect|localToGlobal|paintBounds)\b|\.(size|width|height|maxWidth|minWidth|maxHeight|minHeight|dy|dx|top|left|right|bottom|padding|margin|constraints|alignment|mainAxisAlignment|crossAxisAlignment|borderRadius|decoration|color|backgroundColor|foregroundColor|fontSize|fontWeight|textAlign|maxLines|overflow|style|shape|elevation|border|gap|spacing|flex|fit|axis|scrollDirection|physics|shrinkWrap)\b/.test(x) && /tester\.|widget|getSize|getTopLeft|getCenter|getRect|render|Render|find\./.test(x)) return 'geometry';
  if (/^expect(Later)?\(\s*(find\.)?descendant|^expect(Later)?\(\s*find\.ancestor/.test(x)) return 'presence';
  if (/^expect(Later)?\(\s*find\.byType/.test(x)) return 'typeFound';
  if (/^expect(Later)?\(\s*find\.(text|textContaining|widgetWithText|byWidgetPredicate|byTooltip|byIcon|byKey|byElementPredicate|bySubtype|widgetWithIcon)/.test(x)) {
    if (/find\.(text|textContaining|widgetWithText|byTooltip)/.test(x.slice(0, 70))) return 'textFound';
    if (/find\.byKey/.test(x.slice(0, 70))) return 'keyFound';
    return 'presence';
  }
  if (/^expect(Later)?\(\s*[_a-zA-Z]+[fF]inder|^expect(Later)?\(\s*[_a-zA-Z]*(Button|Row|Action|Tile|Card|Sheet)\b,\s*finds/.test(x)) return 'presence';
  if (/,\s*(findsOneWidget|findsNothing|findsWidgets|findsNWidgets|findsAtLeast|findsAny|findsExactly)/.test(x)) return 'presence';
  if (/tester\.widget|tester\.state|tester\.firstWidget|tester\.element|widget</.test(x)) return 'widgetProp';
  if (/location|routerDelegate|matchedLocation|pushedRoutes|\.path\b|Route|route|router/.test(x)) return 'route';
  return 'state';
}

const inv = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = [];
for (const row of inv) {
  if (!row.isTest) continue;
  for (const file of row.members) {
    const src = readFileSync(file, 'utf8');
    const m = mask(src);
    // Local assertion helpers, for a one-level expansion of helper calls.
    const groups = [];
    const re = /\b(testWidgets|test|group|testGoldens)\s*\(/g;
    let k;
    const cases = [];
    while ((k = re.exec(m))) {
      const before = m.slice(Math.max(0, k.index - 2), k.index);
      if (/[.\w]$/.test(before.trimEnd().slice(-1)) && before.trimEnd().endsWith('.')) continue;
      const open = k.index + k[0].length - 1;
      const close = closeParen(m, open);
      if (close < 0) continue;
      const name = firstStringArg(src, m, open);
      if (k[1] === 'group') { groups.push({ name, start: open, end: close }); continue; }
      if (name === null) {
        // e.g. test(name, ...) with a variable name
        const vs = m.slice(open + 1, open + 80).split(',')[0].trim();
        cases.push({ kind: k[1], name: `<${vs}>`, start: open, end: close, dynamic: true });
      } else cases.push({ kind: k[1], name, start: open, end: close, dynamic: /<[\w.]+>/.test(name) });
    }
    for (const c of cases) {
      const body = m.slice(c.start, c.end);
      const srcBody = src.slice(c.start, c.end);
      const asserts = [];
      STMT.lastIndex = 0;
      let a;
      while ((a = STMT.exec(body))) {
        const op = a.index + a[0].length - 1;
        const cl = closeParen(body, op);
        const stmt = srcBody.slice(a.index, cl + 1).replace(/\s+/g, ' ');
        asserts.push({ kind: classifyAssert(stmt), text: stmt.slice(0, 170) });
        STMT.lastIndex = cl > 0 ? cl : op + 1;
      }
      const actions = [];
      ACTION.lastIndex = 0;
      let ac;
      while ((ac = ACTION.exec(body))) actions.push(ac[1] ?? ac[2]);
      const gr = groups.filter((g) => g.start < c.start && g.end > c.end).map((g) => g.name).filter(Boolean);
      out.push({
        lib: row.lib,
        file,
        group: gr.join(' > '),
        kind: c.kind,
        name: c.name,
        dynamic: !!c.dynamic,
        line: src.slice(0, c.start).split('\n').length,
        lines: src.slice(c.start, c.end).split('\n').length,
        asserts,
        actions: [...new Set(actions)],
        pumpsWidget: /pumpWidget|_pump\w*\(|\bpump[A-Z]\w*\(|buildSubject|_build\w*\(|tester\.pump\w*Widget/.test(body),
        container: /ProviderContainer|container\.read|createContainer/.test(body),
      });
    }
  }
}
writeFileSync(process.argv[3], out.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(out.length, 'cases');

// ---- Taint pass: does each case reach a symbol declared in a legacy file? ----
import { execSync } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';

const LEGACY_ROOTS = ['auth','chats','cross_paths','dashboard','event_policies','event_rehearsal','event_success','events','explore','force_update','host_memberships','hosts','image_uploads','launch_access','locations','matches','notifications','onboarding','organizers','payments','programs','public_profile','reviews','safety','swipes','user_analytics','user_profile'];
const isLegacyPath = (p) => LEGACY_ROOTS.includes(p.split('/')[0]) || /^routing\/(shell\/(host_app_shell|adaptive_tab_scaffold)|host_)/.test(p);

const WORD = /[A-Za-z_]\w*/g;
const KEYWORDS = new Set('if for while switch return catch assert await async void final const var late class enum mixin extension typedef import export part show hide as is in else do try throw new super this null true false static get set required abstract sealed base interface'.split(' '));

function topLevelDecls(src) {
  const m = mask(src);
  const decls = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth === 0 && c === '}') { decls.push(m.slice(start, i + 1)); start = i + 1; }
    } else if (c === ';' && depth === 0) { decls.push(m.slice(start, i + 1)); start = i + 1; }
  }
  const out = [];
  for (const d of decls) {
    const h = d.replace(/@\w+(\([^)]*\))?/g, ' ').trim();
    let name = null;
    let k;
    if ((k = h.match(/^(?:abstract\s+|sealed\s+|final\s+|base\s+|interface\s+|mixin\s+)*(?:class|enum|mixin|typedef|extension\s+type)\s+(\w+)/))) name = k[1];
    else if ((k = h.match(/^extension\s+(\w+)/))) name = k[1];
    else if ((k = h.match(/^(?:import|export|part|library)\b/))) name = null;
    else {
      const eq = h.indexOf('=');
      const par = h.indexOf('(');
      if (par > 0 && (eq < 0 || par < eq)) { const mm = h.slice(0, par).match(/(\w+)\s*(?:<[^()]*>)?\s*$/); if (mm && !KEYWORDS.has(mm[1])) name = mm[1]; }
      else if (eq > 0) { const mm = h.slice(0, eq).match(/(\w+)\s*$/); if (mm && !KEYWORDS.has(mm[1])) name = mm[1]; }
      else { const mm = h.match(/(\w+)\s*;$/); if (mm && !KEYWORDS.has(mm[1])) name = mm[1]; }
    }
    if (name) out.push({ name, text: d });
  }
  return out;
}

const symbolCache = new Map();
function legacySymbols(pkgPath, seen = new Set()) {
  if (seen.has(pkgPath)) return new Set();
  seen.add(pkgPath);
  if (symbolCache.has(pkgPath)) return symbolCache.get(pkgPath);
  const res = new Set();
  const lib = 'lib/' + pkgPath;
  if (!existsSync(lib)) return res;
  const src = readFileSync(lib, 'utf8');
  for (const d of topLevelDecls(src)) res.add(d.name);
  for (const suffix of ['.g.dart', '.freezed.dart']) {
    const g = lib.replace(/\.dart$/, suffix);
    if (existsSync(g)) for (const d of topLevelDecls(readFileSync(g, 'utf8'))) if (!d.name.startsWith('_') ) res.add(d.name);
  }
  for (const ex of src.matchAll(/^export\s+['"]([^'"]+)['"]/gm)) {
    let u = ex[1];
    if (u.startsWith('package:catch_dating_app/')) u = u.slice('package:catch_dating_app/'.length);
    else if (u.startsWith('package:') || u.startsWith('dart:')) continue;
    else u = path.normalize(path.join(path.dirname(pkgPath), u));
    for (const s of legacySymbols(u, seen)) res.add(s);
  }
  // Private part files of the same library declare public symbols too.
  for (const pt of src.matchAll(/^part\s+['"]([^'"]+)['"]/gm)) {
    const u = path.normalize(path.join(path.dirname(pkgPath), pt[1]));
    if (u.endsWith('.g.dart') || u.endsWith('.freezed.dart')) continue;
    for (const s of legacySymbols(u, seen)) res.add(s);
  }
  symbolCache.set(pkgPath, res);
  return res;
}

const libByPath = new Map(inv.map((r) => [r.lib, r]));
function helperClosure(lib, seen = new Set()) {
  if (seen.has(lib)) return seen;
  seen.add(lib);
  const r = libByPath.get(lib);
  if (!r) return seen;
  for (const rel of r.relImports) helperClosure(rel.slice(2), seen);
  return seen;
}

function localDeclarations(srcAll) {
  // Named functions at any depth (group-local helpers included) plus top-level decls.
  const out = [];
  const m = mask(srcAll);
  for (const d of topLevelDecls(srcAll)) out.push(d);
  const re = /(?:^|\n)\s*(?:static\s+)?(?:[\w<>?,\[\]]+\s+)+(_?[a-zA-Z]\w*)\s*(?:<[^()]*>)?\(/g;
  let k;
  while ((k = re.exec(m))) {
    if (KEYWORDS.has(k[1])) continue;
    const open = k.index + k[0].length - 1;
    const close = closeParen(m, open);
    if (close < 0) continue;
    let j = close + 1;
    while (/\s/.test(m[j] ?? '') ) j++;
    if (m.substr(j, 5) === 'async') { j += 5; while (/\s/.test(m[j] ?? '')) j++; }
    if (m[j] === '{') { const e = closeParen(m, j); if (e > 0) out.push({ name: k[1], text: m.slice(k.index, e + 1) }); }
    else if (m.substr(j, 2) === '=>') { const e = m.indexOf(';', j); if (e > 0) out.push({ name: k[1], text: m.slice(k.index, e + 1) }); }
  }
  // Variables shared by a group or main(): declared or assigned outside any test body.
  let shared = m;
  const caseRe = /\b(testWidgets|test)\s*\(/g;
  let cs;
  while ((cs = caseRe.exec(m))) {
    const open = cs.index + cs[0].length - 1;
    const close = closeParen(m, open);
    if (close > 0) shared = shared.slice(0, open) + ' '.repeat(close - open) + shared.slice(close);
  }
  const varRe = /(?:^|\n)\s*(?:(?:final|late|const|var)\s+)*(?:[A-Z][\w<>?,\[\] ]*\s+)?(_?[a-z]\w*)\s*=[^=>]/g;
  let vk;
  while ((vk = varRe.exec(shared))) {
    if (KEYWORDS.has(vk[1])) continue;
    const e = shared.indexOf(';', vk.index);
    if (e > 0) out.push({ name: vk[1], text: shared.slice(vk.index, e + 1) });
  }
  return out;
}

const taintByLib = new Map();
for (const r of inv) {
  if (!r.isTest) continue;
  const closure = [...helperClosure(r.lib)];
  const legacyImports = new Set();
  for (const l of closure) {
    const lr = libByPath.get(l);
    if (!lr) continue;
    for (const i of [...lr.legacy, ...lr.other]) if (isLegacyPath(i)) legacyImports.add(i);
  }
  const syms = new Set();
  const symFile = new Map();
  for (const i of legacyImports) for (const s of legacySymbols(i)) { syms.add(s); if (!symFile.has(s)) symFile.set(s, i); }
  const allSrc = closure.flatMap((l) => (libByPath.get(l)?.members ?? [])).map((f) => readFileSync(f, 'utf8'));
  const decls = allSrc.flatMap((s) => localDeclarations(s));
  const tainted = new Set(syms);
  const via = new Map();
  for (let round = 0; round < 4; round++) {
    let changed = false;
    for (const d of decls) {
      if (tainted.has(d.name)) continue;
      const toks = d.text.match(WORD) ?? [];
      const hit = toks.find((t) => tainted.has(t) && t !== d.name);
      if (hit) { tainted.add(d.name); via.set(d.name, hit); changed = true; }
    }
    if (!changed) break;
  }
  taintByLib.set(r.lib, { tainted, syms, symFile, via, legacyImports: [...legacyImports] });
}

for (const c of out) {
  const t = taintByLib.get(c.lib);
  const src = readFileSync(c.file, 'utf8');
  const m = mask(src);
  // Re-locate the case body from its 1-based start line.
  const lineStart = src.split('\n').slice(0, c.line - 1).join('\n').length + 1;
  const open = m.indexOf('(', lineStart - 1);
  const close = closeParen(m, open);
  const toks = new Set(m.slice(open, close).match(WORD) ?? []);
  // Direct hits name the legacy symbols the case itself uses.
  const direct = [...toks].filter((x) => t.syms.has(x));
  const indirect = [...toks].filter((x) => t.tainted.has(x) && !t.syms.has(x));
  c.legacyDirect = direct.slice(0, 8);
  c.legacyIndirect = indirect.slice(0, 5);
  const files = new Set();
  for (const s of direct) files.add(t.symFile.get(s));
  for (const s of indirect) { let x = s; let n = 0; while (t.via.has(x) && n++ < 6) x = t.via.get(x); if (t.symFile.has(x)) files.add(t.symFile.get(x)); }
  c.legacyFiles = [...files].filter(Boolean);
  c.touchesLegacy = direct.length + indirect.length > 0;
  // Source-text contracts read repo files; evidence dumps that only write a PNG do not count.
  c.readsFile = /\b(?:File|Directory)\(\s*['"](?:lib|tool|design|docs|apps|packages|widgetbook|contracts|\.\.)\b/.test(src.slice(open, close));
}
writeFileSync(process.argv[3], out.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log('tainted', out.filter((c) => c.touchesLegacy).length);
````

#### `classify.py`

````python
#!/usr/bin/env python3
"""Rule pass: label every test case, roll up to a file label, pick a re-home
target. Hand decisions live in overrides.json and win over every rule here."""
import collections, json, os, re, sys

S = os.environ['S']

COND = re.compile(
    r"\b(when|if|unless|until|while|without|only|after|before|once|instead|except|even|but|"
    r"not|never|no|none|cannot|can't|cant|doesn't|does not|don't|do not|won't|isn't|"
    r"hide|hides|hidden|disable|disables|disabled|enable|enables|enabled|"
    r"error|errors|fail|fails|failed|failure|empty|missing|loading|pending|retry|retries|"
    r"denied|deny|blocked|block|blocks|locked|lock|locks|unavailable|expired|cancelled|canceled|"
    r"requires|require|rejects|reject|prevent|prevents|guard|guards|fence|fences|fenced|"
    r"stale|offline|unknown|invalid|valid|validates|confirm|confirms|confirmation|"
    r"preserve|preserves|restore|restores|keep|keeps|clear|clears|"
    r"owner|manager|staff|attendee|admin|member|permission|authority|"
    r"past|ended|live|upcoming|draft|published|sold out|full|waitlist|free|paid)\b",
    re.I,
)
LAYOUT_NAME = re.compile(
    r"\b(layout|layouts|lays out|overflow|overflows|compos(e|es|ition|ed)|chrome|spacing|padding|"
    r"alignment|aligned|aligns|gutter|geometry|sliver|slivers|viewport|text scale|textscale|"
    r"dynamic type|scales?|breakpoint|tablet|desktop|narrow|wide|width|height|size|sizes|sized|"
    r"column|columns|pane|panes|rail|golden|visual|renders?|rendering|primitives?|tokens?|"
    r"typography|anatomy|styling|style|styles|theme|dark mode|inset|insets|hairline|divider|"
    r"scroll owner|hit target|hit targets|tap target)\b",
    re.I,
)
NAV_NAME = re.compile(
    r"\b(navigat\w*|routes?|routing|deep link\w*|redirect\w*|back button|goes back|go back|push\w*|pops?|"
    r"opens?|open the|returns? to|lands? on|takes? (you|the)|links? to|tapping .* (opens|goes)|handoff)\b",
    re.I,
)
ACTION_NAME = re.compile(
    r"\b(submit\w*|save\w*|send\w*|sends|cancel\w*|invok\w*|call\w*|writes?|mark\w*|publish\w*|unpublish\w*|"
    r"delete\w*|remov\w*|retr(y|ies)|creat\w*|updat\w*|approv\w*|declin\w*|reject\w*|upload\w*|"
    r"import\w*|export\w*|check(s|ed)? in|book\w*|refund\w*|block\w*|report\w*|like\w*|pass\w*|"
    r"toggl\w*|sync\w*|confirm\w*|join\w*|leave\w*|invite\w*|commit\w*|persist\w*|mutation\w*)\b",
    re.I,
)
SMALL_WIDGET = re.compile(
    r"(row|tile|card|badge|chip|item|banner|pill|summary|poster|avatar|bubble|header|footer|label|"
    r"indicator|strip|meta|fact|dock|button|avatar_row|cover|preview|hero|field|section|panel|sheet|list)$"
)

# Text-only cue: the name states an input or condition, not just a claim about arrangement.
COND_STRICT = re.compile(
    r"\b(when|if|unless|until|while|without|only|after|before|once|instead|except|even|"
    r"not|never|no|none|cannot|can't|cant|doesn't|does not|don't|do not|won't|isn't|"
    r"hide|hides|hidden|disable|disables|disabled|"
    r"error|errors|fail|fails|failed|failure|empty|missing|loading|pending|retry|retries|"
    r"denied|deny|blocked|block|blocks|locked|lock|locks|unavailable|expired|cancelled|canceled|"
    r"requires|require|rejects|reject|prevent|prevents|guard|guards|fence|fences|fenced|"
    r"stale|offline|unknown|invalid|past|ended|sold out|waitlist|for (the )?(owner|manager|staff|attendee|admin|member|non)\w*)\b",
    re.I,
)
CALLBACK_PROP = re.compile(r"onPressed|onTap|onChanged|enabled|isEnabled|\.value\b|checked|selected|isSelected|initialValue|controller\.text|\.text\b|isNull|isNotNull|isLoading|loading")


def reclass(a, kind):
    """Sharpen the scanner's assertion kinds with facts the scanner did not see."""
    t = a['text']
    k = a['kind']
    if 'takeException' in t:
        return 'noThrow'
    if k == 'state' and kind == 'testWidgets' and re.search(r"\.(dy|dx|top|left|bottom|right|width|height|padding|size|color|style|fontSize|decoration|borderRadius)\b", t):
        return 'geometry'
    return k


def label_case(c):
    kinds = [reclass(a, c['kind']) for a in c['asserts']]
    K = set(kinds)
    name = (c['group'] + ' ' + c['name']).strip()
    if not c['touchesLegacy']:
        return 'context', K
    if 'golden' in K:
        return ('mixed' if K & {'state', 'verify', 'route', 'semantics'} else 'layout'), K
    if c.get('readsFile'):
        return 'layout', K
    if c['kind'] != 'testWidgets':
        if not kinds:
            return 'behaviour', K
        return 'behaviour', K
    # widget tests
    if K & {'verify', 'route', 'semantics'}:
        return 'behaviour', K
    if 'state' in K:
        return 'behaviour', K
    if c['actions'] and K - {'noThrow'}:
        return 'behaviour', K
    if 'widgetProp' in K:
        if any(CALLBACK_PROP.search(a['text']) for a in c['asserts'] if a['kind'] == 'widgetProp'):
            return 'behaviour', K
    if K <= {'noThrow'} or not K:
        return 'layout', K
    if K & {'textFound', 'keyFound', 'presence', 'typeFound', 'helper', 'widgetProp', 'geometry', 'geomHelper'}:
        visual_only = K <= {'geometry', 'geomHelper', 'noThrow'} or (K <= {'geometry', 'geomHelper', 'noThrow', 'typeFound'} and not COND_STRICT.search(name))
        if visual_only:
            return 'layout', K
        if COND_STRICT.search(name):
            return 'behaviour', K
        return 'layout', K
    return 'layout', K


def rehome(c, K, subject):
    name = (c['group'] + ' ' + c['name']).strip()
    base = os.path.basename(subject or '').replace('.dart', '')
    files = ' '.join(c.get('legacyFiles', []))
    if 'semantics' in K and c['kind'] == 'testWidgets':
        return 'body'
    finds = K & {'textFound', 'typeFound', 'keyFound', 'presence', 'widgetProp', 'geometry', 'geomHelper', 'helper'}
    pumps = c.get('pumps', c.get('pumpsWidget'))
    if c['kind'] != 'testWidgets' or (not finds and not pumps):
        if re.search(r"controller|mutation|submitter|saver|actions?\b|_flow\b|_editor", files):
            return 'action'
        return 'domain'
    if 'route' in K or (c['actions'] and NAV_NAME.search(name)):
        return 'journey'
    state_text = ' '.join(a['text'] for a in c['asserts'] if reclass(a, c['kind']) == 'state')
    if 'verify' in K or (c['actions'] and re.search(r"repositor|repo\.|[cC]alls|saved|writes|commands|recorded|submitted|created|updated|fake|Fake|captured", state_text)):
        return 'action'
    if SMALL_WIDGET.search(base) and not re.search(r"screen|page|body|state", base):
        return 'parts'
    return 'body'


if __name__ == '__main__':
    subjects = {x['lib']: x for x in json.load(open(f'{S}/subjects.json'))}
    cases = [json.loads(l) for l in open(f'{S}/cases.jsonl')]
    for c in cases:
        subj = subjects.get(c['lib'], {}).get('subject')
        c['label'], K = label_case(c)
        c['K'] = sorted(K)
        c['rehome'] = rehome(c, K, subj)
    with open(f'{S}/labelled.jsonl', 'w') as f:
        for c in cases:
            f.write(json.dumps(c) + '\n')
    print(collections.Counter(c['label'] for c in cases))
````

#### `digest.py`

````python
#!/usr/bin/env python3
"""Prints a reading digest: every case's name and compressed assertions."""
import collections, json, os, re, sys

S = os.environ['S']
prefixes = tuple(sys.argv[1].split(','))
widget_asserts = int(sys.argv[2]) if len(sys.argv) > 2 else 3
unit_asserts = int(sys.argv[3]) if len(sys.argv) > 3 else 0
cases = [json.loads(l) for l in open(f'{S}/labelled.jsonl')]
by = collections.defaultdict(list)
for c in cases:
    if c['lib'].startswith(prefixes):
        by[c['lib']].append(c)


def comp(a):
    t = a['text']
    t = re.sub(r"\s+", ' ', t)
    m = re.match(r"expect\(\s*find\.(text|textContaining|byType|byKey|byTooltip|byIcon)\((.*?)\),\s*(findsOneWidget|findsNothing|findsWidgets|findsNWidgets\(\d+\)|findsAtLeast\(\d+\))", t)
    if m:
        pre = {'findsNothing': '-'}.get(m.group(3), '+')
        arg = m.group(2).replace('const ', '').replace('ValueKey', '').replace("<String>", '')
        sym = {'text': '', 'textContaining': '~', 'byType': '<', 'byKey': '#', 'byTooltip': 'tip:', 'byIcon': 'ic:'}[m.group(1)]
        return f"{pre}{sym}{arg[:38]}"
    t = re.sub(r"^expect(Later)?\(\s*", '', t)
    t = t.replace('tester.', '').replace('container.read(', 'read(').replace('find.', '')
    return t[:62]


LAB = {'behaviour': 'B', 'layout': 'L', 'context': 'C', 'mixed': 'M'}
RH = {'action': 'act', 'domain': 'dom', 'parts': 'prt', 'body': 'bdy', 'journey': 'jny'}
for lib in sorted(by):
    cs = by[lib]
    if not any(c['touchesLegacy'] for c in cs):
        continue
    files = collections.Counter(f for c in cs for f in c.get('legacyFiles', []))
    top = ' '.join(f.replace('presentation/', 'p/') + f"×{n}" for f, n in files.most_common(3))
    print(f"\n## {lib} ({len(cs)}) {top}")
    for c in cs:
        n = re.sub(r"\s+", ' ', c['name'])[:150]
        tag = f"{LAB[c['label']]}{'' if c['label'] in ('layout','context') else '/' + RH[c['rehome']]}"
        kind = 'w' if c['kind'] == 'testWidgets' else 'u'
        limit = widget_asserts if c['kind'] == 'testWidgets' else unit_asserts
        asserts = ' ; '.join(comp(a) for a in c['asserts'][:limit])
        more = f" +{len(c['asserts']) - limit}" if len(c['asserts']) > limit and limit else ''
        act = 'A' if c['actions'] else ''
        print(f"{tag} {kind}{act} {n}" + (f" :: {asserts}{more}" if asserts else ''))
````

#### `finalize.py`

````python
#!/usr/bin/env python3
"""Final pass: apply hand overrides, assign destinations, roll cases up to file labels."""
import collections, json, os, re, sys
sys.path.insert(0, os.environ['S'])
from classify import label_case, rehome, reclass
S = os.environ['S']
subjects = {x['lib']: x for x in json.load(open(f'{S}/subjects.json'))}
cases = [json.loads(l) for l in open(f'{S}/cases.jsonl')]

OUT_OF_UNIVERSE = ('test/tool/', 'test/tooling/', 'test/lint_contracts/', 'test/integration/', 'test/architecture/event_controller')

overrides = []
for line in open(f'{S}/overrides.txt'):
    if line.startswith('#') or not line.strip():
        continue
    a = [x.strip() for x in line.split('|||')]
    overrides.append(a + ['-'] * (5 - len(a)) + [0])

P30='P3.0 shell'; P31='P3.1 today'; P32='P3.2 events/create'; P33='P3.3 door'; P34='P3.4 live'; P35='P3.5 insights'; P36='P3.6 marketing'
PEV='P5 events'; PPE='P5 people'; PFO='P5 forms'; POR='P5 organizer'; PON='P5 onboarding'; PPR='P5 programmes'; PFM='P5 live/formats'
CON='P6 onboarding'; CHO='P6 home'; CEX='P6 explore'; CBO='P6 book'; CLI='P6 live'; CAF='P6 after'; CCH='P6 chats'; CYO='P6 you'
SEV='shared lib/pages/event'; SOR='shared lib/pages/organizer'; SPG='shared lib/pages (startup)'
ORDER=[P30,P31,P32,P33,P34,P35,P36,PEV,PPE,PFO,POR,PON,PPR,PFM,CON,CHO,CEX,SEV,SOR,SPG,CBO,CLI,CAF,CCH,CYO]

def has(p, n): return re.search(p, n) is not None

def dest(lib, name):
    l = lib.replace('test/', '', 1) if lib.startswith('test/') else lib
    n = name
    if l.startswith('hosts/host_operations_screen_test'):
        if has(r'Host Today|Today metric', n): return P31
        if has(r'Host [Ee]vents', n): return PEV
        if has(r'[Cc]ustomer|People|[Ss]aved audience|Groups|sender|Add person|CRM|Organizer audience|organizer messaging', n): return PPE
        if has(r'analytics|presence', n): return P35
        return POR
    if l.startswith('hosts/host_create_event_screen_test'):
        return PEV if has(r'host manage|past event opens recap', n) else P32
    if l.startswith('hosts/today/'): return P31
    if l.startswith('hosts/work/') : return PPR
    if l.startswith(('hosts/forms/', 'hosts/applications/')): return PFO
    if l.startswith(('hosts/inbox/', 'hosts/phone_import/')): return PPE
    if l.startswith(('hosts/memberships/', 'hosts/presentation/payments/')): return POR
    if l.startswith('hosts/'):
        b = os.path.basename(l)
        if has(r'^(create_event|host_create_event_(controller|state)|event_age_range|event_guest_details|event_policy_dependency|private_event_create|route_path_builder|host_step_flow|private_event_details)', b): return P32
        if has(r'^(host_event_roster|host_roster|host_event_check_in)', b): return P33
        if has(r'^host_event_live_location', b): return P34
        if has(r'^host_insights', b): return P35
        if has(r'^(host_customer|host_saved_audience|host_sdk_saved|host_inbox|host_broadcast|host_campaign|host_follower|host_whatsapp)', b): return PPE
        if has(r'^(host_automation|host_event_offer_test|host_manual_payment|host_response_query)', b): return PFO
        if has(r'^(host_team|host_tracking|host_organizer_(defaults|identity|publication)|host_account|organizer_form)', b): return POR
        if has(r'^host_organizer_create', b): return PON
        if has(r'^host_wizard_step_header', b): return PON if has(r'club', n) else P32
        return PEV
    if l.startswith('event_rehearsal/'): return PEV
    if l.startswith('programs/'): return PPR
    if l.startswith('event_success/'):
        b = os.path.basename(l)
        if b.startswith('event_success_live_screens'):
            if has(r'^companion|question progress', n) : return CLI
            if has(r'report', n): return P35
            if has(r'setup|custom format', n) and not has(r'live', n): return PEV
            if has(r'rotation|micro-pod|pod |group override', n): return PFM
            return P34
        if b.startswith('event_assistance_help_runtime'): return P35
        if b.startswith('event_assistance_settings_runtime'): return PEV
        if b.startswith('event_assistance'): return P34
        if b.startswith('event_attendance'): return PEV
        if has(r'^(event_message_pref|event_sender_pref|event_sms_pref|event_participant|event_assignment_feature|event_success_companion|event_success_runtime)', b): return CLI
        if has(r'^(event_success_setup_body|event_success_structure|event_success_questionnaire|event_success_assignment_features)', b): return PEV
        if has(r'^(event_success_live_control_guard|event_success_live_standings|event_success_live_reveal|event_success_reveal_clock|event_success_motion)', b): return PFM
        return P34
    if l.startswith('chats/'):
        b = os.path.basename(l)
        if b.startswith('match_celebration'): return CAF
        if b.startswith('fcm_service'): return CHO
        if b.startswith(('chat_inbox_screen', 'chat_screen')) and has(r'[Hh]ost', n): return PPE
        return CCH
    if l.startswith('cross_paths/'):
        b = os.path.basename(l)
        if has(r'consent|detail_integration', b): return SEV
        if has(r'explore_card', b): return CEX
        return CAF
    if l.startswith(('swipes/', 'public_profile/', 'matches/')): return CAF
    if l.startswith(('dashboard/', 'notifications/')): return CHO
    if l.startswith(('explore/', 'calendar/', 'locations/')):
        if l.startswith('explore/explore_widgets'):
            if has(r'^(OrganizerDetail|OrganizerHero|OrganizerMembership|metric strip)', n): return SOR
            if has(r'^CreateOrganizer', n): return PON
        return CEX
    if l.startswith('events/'):
        b = os.path.basename(l)
        if has(r'^(attendance_sheet|event_check_in_qr)', b): return P33
        if has(r'^(calendar_screen|saved_events|event_map|event_date_rail)', b): return CEX
        if has(r'^(event_booking|organizer_payment_method)', b): return CBO
        if b.startswith('location_picker'): return P32
        if b.startswith('events_widgets'):
            if has(r'basic input|when step|stepper footer', n): return P32
            if has(r'agenda', n): return CEX
            return SEV
        return SEV
    if l.startswith('host_memberships/'):
        return SEV if 'event_dock' in l else CYO
    if l.startswith('image_uploads/'): return CYO
    if l.startswith('payments/'): return CBO
    if l.startswith('organizers/'):
        if 'create_organizer_photos' in l: return PON
        if l.startswith('organizers/organizers_controllers'):
            if has(r'creat|picks multiple|deduplicates an active organizer|partial media', n): return PON
            if has(r'media edit|logo removal|club media', n): return POR
        return SOR
    if l.startswith(('onboarding/', 'launch_access/')): return CON
    if l.startswith('auth/'):
        return PON if has(r'^Host |host app', n) else CON
    if l.startswith('force_update/') or l.startswith('app_force_update'): return SPG
    if l.startswith(('profile/', 'user_profile/', 'user_analytics/', 'safety/')): return CYO
    if l.startswith('reviews/'):
        return CYO if has(r'review history', n) else SEV
    if l.startswith('routing/host_') : return P30
    if l.startswith('routing/router_redirect'): return P30
    if l.startswith('routing/app_shell_guest'): return P30
    if l.startswith('routing/top_level'): return CEX
    if l.startswith('routing/router_widgets'):
        if has(r'host (Audience|inbox)|saved audience', n): return PPE
        if has(r'create-event', n): return P32
        if has(r'chat route|FCM', n): return CCH
        return CON
    if l.startswith('core/app_shell'): return P30
    if l.startswith('core/consumer_bootstrap'): return CON
    if l.startswith('core/toolbar_control'): return CEX
    if l.startswith('core/forms/contract_alignment'): return POR if has(r'host club', n) else CYO
    if l.startswith('architecture/keep_alive'):
        if has(r'auth OTP|onboarding', n): return CON
        if has(r'Explore', n): return CEX
        if has(r'chat', n): return CCH
        return CLI
    if l.startswith('design/public_surface'): return SEV
    if l.startswith('design_system/surface_composition'):
        if has(r'Today', n): return P31
        if has(r'report', n): return P35
        return PEV
    if l.startswith('goldens/entity'): return SOR
    if l.startswith('goldens/profile'): return CAF
    if l.startswith('ui_captures/'):
        b = os.path.basename(l)
        if has(r'audience|customer', b): return PPE
        if has(r'response|offer|sheet_review', b): return PFO
        if has(r'insights', b): return P35
        if has(r'marketing', b): return P32 if has(r'draft restore', n) else P36
        return P30
    if l.startswith('widgetbook/test/'):
        b = os.path.basename(l)
        if b.startswith(('program_', )): return PPR
        if has(r'^(event_(assistance|checkpoint|delivery|departure|help|late_join|runtime))', b): return P34
        if has(r'^rehearsal', b): return PEV
        if b.startswith('dashboard'): return CHO
        if b.startswith('host_phone_import'): return PPE
        if b.startswith('matches'): return CCH
        if b.startswith('onboarding'): return CON
        if b.startswith('host_component'): return P34
        if b.startswith('primitive_goldens'): return SEV
    return None

rows = []
bylib = collections.defaultdict(list)
for c in cases:
    subj = subjects.get(c['lib'], {}).get('subject')
    label, K = label_case(c)
    how = 'rule'
    rh = rehome(c, K, subj)
    b = os.path.basename(c['lib'])
    # state/view-model/provider test files stay domain unless the case drives a mutation
    if c['kind'] != 'testWidgets' and re.search(r'_(state|view_model|provider|domain|copy|display)_test', b) and rh == 'action' and not re.search(r'submit|save[sd]? |mutation|controller|persist', c['name'], re.I):
        rh = 'domain'
    if re.search(r'^test/routing/host_navigation_workspace', c['lib']) and not c['touchesLegacy']:
        label, how, rh = 'behaviour', 'scope', 'journey'
    if c['lib'].startswith('test/ui_captures/') and not (label == 'context' or 'draft restore' in c['name']):
        label, how = 'layout', 'scope'
    if c['lib'].startswith('widgetbook/test/') and 'previews' in b and label == 'behaviour' and K <= {'noThrow', 'typeFound', 'presence', 'textFound'}:
        label, how = 'layout', 'scope'
    d = dest(c['lib'], c['name'])
    for o in overrides:
        if c['lib'].endswith(o[0] + '.dart') and o[1] in c['name']:
            o[5] += 1
            how = 'hand'
            if o[2] == 'L': label = 'layout'
            elif o[2] == 'B': label = 'behaviour'
            if o[3] != '-': rh = o[3]
            if o[4] != '-': d = o[4]
    c.update(label=label, rehome=rh, dest=d, how=how, K=sorted(K))
    bylib[c['lib']].append(c)

for o in overrides:
    if o[5] == 0: print('UNUSED OVERRIDE', o[0], o[1])

files = []
for lib, cs in bylib.items():
    touch = [c for c in cs if c['label'] != 'context']
    if not touch: continue
    if lib.startswith(OUT_OF_UNIVERSE): continue
    nb = sum(1 for c in touch if c['label'] in ('behaviour', 'mixed'))
    nl = sum(1 for c in touch if c['label'] == 'layout')
    flabel = 'behaviour' if nb and not nl else 'layout' if nl and not nb else 'mixed'
    files.append(dict(lib=lib, label=flabel, b=nb, l=nl, c=len(cs) - len(touch), hand=sum(1 for c in cs if c['how'] == 'hand'),
                      lines=sum(0 for _ in ()), adjacent=lib.startswith('widgetbook/')))
json.dump(dict(files=files, cases=[c for cs in bylib.values() for c in cs], order=ORDER), open(f'{S}/final.json', 'w'))
main = [f for f in files if not f['adjacent']]
print('universe files', len(main), collections.Counter(f['label'] for f in main))
print('adjacent', collections.Counter(f['label'] for f in files if f['adjacent']))
fl = {f['lib'] for f in main}
allc = [c for c in cases if c['lib'] in fl]
print('cases', collections.Counter(c['label'] for c in allc), 'rehome', collections.Counter(c['rehome'] for c in allc if c['label'] in ('behaviour','mixed')))
d = collections.Counter(c['dest'] for c in allc if c['label'] in ('behaviour','mixed'))
print([ (k, d[k]) for k in ORDER], 'None', d.get(None))
print('no-dest', [(c['lib'], c['name'][:50]) for c in allc if c['dest'] is None and c['label']!='context'][:20])
print('hand', sum(1 for c in allc if c['how']=='hand'))
````

#### `render_doc.py`

````python
#!/usr/bin/env python3
"""Renders the tables and destination sections from final.json. prose_top.md and
prose_method.md supply the hand-written text; every number in them is a {token}."""
import collections, json, os, re, subprocess, sys

S = os.environ['S']
d = json.load(open(f'{S}/final.json'))
inv = {json.loads(l)['lib']: json.loads(l) for l in open(f'{S}/inv.jsonl')}
cases = d['cases']
files = {f['lib']: f for f in d['files']}
ORDER = d['order']
ADJ = lambda lib: lib.startswith('widgetbook/')
SHOWN = lambda c: c['lib'] in files
BEH = ('behaviour', 'mixed')
REHOME = ['domain', 'action', 'parts', 'body', 'journey']
FOLDER = {
    'P3.0 shell': '`apps/host/lib/shell`', 'P3.1 today': '`apps/host/lib/today`',
    'P3.2 events/create': '`apps/host/lib/events/create`', 'P3.3 door': '`apps/host/lib/door`',
    'P3.4 live': '`apps/host/lib/live`', 'P3.5 insights': '`apps/host/lib/insights`',
    'P3.6 marketing': 'capture renders for the ads', 'P5 events': '`apps/host/lib/events`',
    'P5 people': '`apps/host/lib/people`', 'P5 forms': '`apps/host/lib/forms`',
    'P5 organizer': '`apps/host/lib/organizer`', 'P5 onboarding': '`apps/host/lib/onboarding`',
    'P5 programmes': '`apps/host/lib/programmes`', 'P5 live/formats': '`apps/host/lib/live/formats`',
    'P6 onboarding': '`apps/consumer/lib/onboarding`', 'P6 home': '`apps/consumer/lib/home`',
    'P6 explore': '`apps/consumer/lib/explore`', 'shared lib/pages/event': '`lib/pages/event`',
    'shared lib/pages/organizer': '`lib/pages/organizer`',
    'shared lib/pages (startup)': '`lib/pages/startup`', 'P6 book': '`apps/consumer/lib/book`',
    'P6 live': '`apps/consumer/lib/live`', 'P6 after': '`apps/consumer/lib/after`',
    'P6 chats': '`apps/consumer/lib/chats`', 'P6 you': '`apps/consumer/lib/you`',
}
READ_END_TO_END = {
    'test/hosts/host_roster_primitives_test.dart', 'test/organizers/organizer_host_section_test.dart',
    'test/swipes/profile_surface_contract_test.dart', 'test/hosts/forms/host_form_share_loading_test.dart',
    'test/ui_captures/host_composition_regression_test.dart', 'test/hosts/host_event_check_in_qr_panel_test.dart',
    'test/cross_paths/cross_paths_explore_card_test.dart', 'test/explore/explore_recommendations_loading_test.dart',
}
READ_BODIES = {
    'test/ui_captures/customer_detail_preview_test.dart', 'test/user_profile/form_profile_review_widget_test.dart',
    'test/programs/program_function_lead_test.dart', 'test/host_memberships/host_membership_widgets_test.dart',
}
NOISE = {'auth/presentation/auth_controller.dart', 'chats/presentation/chat_screen.dart',
         'hosts/events/presentation/host_events_timeline_controller.dart'}


def toks(s):
    return set(t for t in re.split(r'[_/.]', s) if t and t not in {'dart', 'test', 'presentation', 'widgets', 'shared', 'lib', 'screen'})


def subject(lib, cs):
    cnt = collections.Counter(f for c in cs for f in c.get('legacyFiles', []))
    if not cnt:
        return []
    base = toks(os.path.basename(lib).replace('_test.dart', ''))
    def score(f):
        a = toks(os.path.basename(f))
        return (len(a & base) / max(1, len(a | base)), cnt[f], f not in NOISE)
    ranked = sorted(cnt, key=score, reverse=True)
    best = ranked[0]
    rest = [f for f in sorted(cnt, key=lambda f: (f in NOISE, -cnt[f])) if f != best and f not in NOISE]
    return ['lib/' + best] + (['lib/' + rest[0]] if rest and score(best)[0] < 0.5 else [])


def clean(name):
    n = re.sub(r'<([\w.?]+)>', r'{\1}', name)
    return re.sub(r'\s+', ' ', n).strip()


def line(c):
    if c['name'] == '<id>':
        return ('every app row of design/public_surface_behavior.json holds: authority, Explore, the map, '
                'organizer and event detail, event location and route guards match the matrix (92 rows)')
    g = clean(c['group']) if c['group'] else ''
    t = clean(c['name'])
    if g and g.lower() not in t.lower():
        t = f"{g}: {t}"
    return t


def layout_reason(lib, cs):
    K = set(k for c in cs for k in c['K'])
    if lib.startswith('test/ui_captures/'):
        return 'capture harness: renders the route for review, pins no product rule'
    if 'golden' in K:
        return 'golden comparison'
    if lib.startswith('widgetbook/'):
        return 'Widgetbook mount check: the use case renders without throwing'
    if K <= {'geometry', 'geomHelper', 'noThrow', 'widgetProp'}:
        return 'geometry or style properties only'
    return 'proves composition only: finds by type or text, with no input-driven condition'


behaviours = [c for c in cases if SHOWN(c) and c['label'] in BEH]
main_b = [c for c in behaviours if not ADJ(c['lib'])]
adj_b = [c for c in behaviours if ADJ(c['lib'])]

# ---- totals ----
all_tests = [l for l, r in inv.items() if r['isTest'] and (l.startswith('test/') or l.startswith('apps/'))]
uni = [l for l, f in files.items() if not f['adjacent']]
adj = [l for l, f in files.items() if f['adjacent']]
fl = collections.Counter(files[l]['label'] for l in uni)
fa = collections.Counter(files[l]['label'] for l in adj)
lines_by = collections.Counter()
for l in uni:
    lines_by[files[l]['label']] += inv[l]['lines']
uc = [c for c in cases if c['lib'] in uni]
cl = collections.Counter('behaviour' if c['label'] in BEH else c['label'] for c in uc)
rh_tot = collections.Counter(c['rehome'] for c in main_b)
how = collections.Counter(c['how'] for c in uc)
outside = collections.Counter()
for l in all_tests:
    if l not in files:
        parts = l.split('/')
        outside['apps/*/test' if l.startswith('apps/') else parts[1] if len(parts) > 2 else '(test root)'] += 1
pump_files = sum(1 for l in uni if inv[l]['pump'] > 0)
over_files = sum(1 for l in uni if inv[l]['override'] > 0)

tokens = dict(
    all_tests=len(all_tests), uni=len(uni), out=len(all_tests) - len(uni), adj=len(adj),
    f_b=fl['behaviour'], f_m=fl['mixed'], f_l=fl['layout'],
    a_b=fa['behaviour'], a_m=fa['mixed'], a_l=fa['layout'],
    l_b=lines_by['behaviour'], l_m=lines_by['mixed'], l_l=lines_by['layout'], l_all=sum(lines_by.values()),
    c_b=cl['behaviour'], c_l=cl['layout'], c_c=cl['context'], c_all=len(uc),
    adj_b=len(adj_b), hand=how['hand'], scope=how['scope'], rule=how['rule'],
    rh_domain=rh_tot['domain'], rh_action=rh_tot['action'], rh_parts=rh_tot['parts'], rh_body=rh_tot['body'], rh_journey=rh_tot['journey'],
    pump=pump_files, over=over_files,
    pct_keep=round(100 * cl['behaviour'] / max(1, cl['behaviour'] + cl['layout'])),
    read_files=len(READ_END_TO_END | READ_BODIES), read_end=len(READ_END_TO_END),
    f_bm=fl['behaviour'] + fl['mixed'], l_bm=lines_by['behaviour'] + lines_by['mixed'],
)


def table_dest():
    out = ['| Destination | Folder | Files | Behaviours | domain | action | parts | body | journey | Layout-only files | Adjacent behaviours |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    tb = 0
    for dest in ORDER:
        cs = [c for c in main_b if c['dest'] == dest]
        rh = collections.Counter(c['rehome'] for c in cs)
        fs = {c['lib'] for c in cs}
        lo = {l for l in uni if files[l]['label'] == 'layout' and any(c['dest'] == dest for c in cases if c['lib'] == l and c['label'] == 'layout')}
        ab = sum(1 for c in adj_b if c['dest'] == dest)
        tb += len(cs)
        out.append(f"| {dest} | {FOLDER[dest]} | {len(fs)} | {len(cs)} | {rh['domain']} | {rh['action']} | {rh['parts']} | {rh['body']} | {rh['journey']} | {len(lo)} | {ab} |")
    assert tb == len(main_b), (tb, len(main_b))
    out.append(f"| **Total** | | | **{tb}** | {rh_tot['domain']} | {rh_tot['action']} | {rh_tot['parts']} | {rh_tot['body']} | {rh_tot['journey']} | **{fl['layout']}** | {len(adj_b)} |")
    return '\n'.join(out)


def table_outside():
    out = ['| Test folder | Files with no case reaching legacy code |', '|---|---:|']
    for k, v in sorted(outside.items(), key=lambda kv: -kv[1]):
        out.append(f'| `{k}` | {v} |')
    out.append(f'| **Total** | **{sum(outside.values())}** |')
    assert sum(outside.values()) == tokens['out']
    return '\n'.join(out)


def table_split():
    spans = collections.defaultdict(collections.Counter)
    for c in main_b:
        spans[c['lib']][c['dest']] += 1
    rows = sorted(((l, v) for l, v in spans.items() if len(v) > 1), key=lambda kv: -sum(kv[1].values()))
    out = [f'{len(rows)} files.\n', '| File | Behaviours per destination |', '|---|---|']
    for l, v in rows:
        out.append(f"| `{l}` | " + ', '.join(f'{k} {v[k]}' for k in ORDER if v[k]) + ' |')
    return '\n'.join(out)


def sections():
    out = []
    for dest in ORDER:
        dcases = [c for c in cases if SHOWN(c) and c['dest'] == dest]
        beh = [c for c in dcases if c['label'] in BEH]
        rh = collections.Counter(c['rehome'] for c in beh if not ADJ(c['lib']))
        main_n = sum(1 for c in beh if not ADJ(c['lib']))
        adj_n = len(beh) - main_n
        out.append(f"\n### {dest}\n")
        summary = f"{FOLDER[dest]}. {main_n} behaviours"
        if main_n:
            summary += ': ' + ', '.join(f"{rh[k]} {k}" for k in REHOME if rh[k])
        if adj_n:
            summary += f"; {adj_n} more in `widgetbook/test`"
        out.append(summary + '.\n')
        by = collections.defaultdict(list)
        for c in beh:
            by[c['lib']].append(c)
        for lib in sorted(by, key=lambda l: (ADJ(l), l)):
            cs = by[lib]
            f = files[lib]
            others = sorted({c['dest'] for c in cases if c['lib'] == lib and c['label'] in BEH and c['dest'] != dest}, key=ORDER.index)
            subj = subject(lib, cs)
            head = f"**`{lib}`** — {f['label']}"
            if f['label'] == 'mixed':
                head += f" ({f['l']} layout cases go with the screen)"
            if subj:
                head += ' · subject ' + ', '.join(f'`{s}`' for s in subj)
            handn = sum(1 for c in cs if c['how'] == 'hand')
            head += ' · decided by ' + ('rules' if not handn else f'rules, {handn} by hand')
            if lib in READ_END_TO_END:
                head += ', read end to end'
            elif lib in READ_BODIES:
                head += ', test bodies read'
            if others:
                head += ' · also under ' + ', '.join(others)
            if ADJ(lib):
                head += ' · adjacent, not in the totals'
            out.append(head + '\n')
            for c in sorted(cs, key=lambda c: (c['file'], c['line'])):
                out.append(f"- `{c['rehome']}` {line(c)}")
            out.append('')
        lo = [l for l in sorted(files) if files[l]['label'] == 'layout' and any(c['lib'] == l and c['label'] == 'layout' for c in dcases)]
        if lo:
            out.append('Layout only, deleted with the screen:\n')
            for l in lo:
                cs = [c for c in dcases if c['lib'] == l]
                note = ', read end to end' if l in READ_END_TO_END else ', test bodies read' if l in READ_BODIES else ''
                ad = ' · adjacent' if ADJ(l) else ''
                out.append(f"- `{l}`: {len(cs)} cases · {layout_reason(l, cs)} · decided by {'rules' if not any(c['how'] == 'hand' for c in cs) else 'rules and hand'}{note}{ad}")
            out.append('')
    return '\n'.join(out)


def appendix_context():
    out = ['| File | Cases that test only context code |', '|---|---|']
    by = collections.defaultdict(list)
    for c in uc:
        if c['label'] == 'context':
            by[c['lib']].append(c)
    n = 0
    for lib in sorted(by):
        names = '; '.join(clean(c['name']) for c in by[lib]).replace('|', '/')
        out.append(f'| `{lib}` | {names} |')
        n += len(by[lib])
    assert n == cl['context']
    return '\n'.join(out)


def appendix_scripts():
    out = []
    for name, lang in [('inventory.mjs', 'js'), ('universe.py', 'python'), ('extract_cases.mjs', 'js'), ('classify.py', 'python'), ('digest.py', 'python'), ('finalize.py', 'python'), ('render_doc.py', 'python')]:
        out.append(f"#### `{name}`\n\n````{lang}\n{open(f'{S}/{name}').read().rstrip()}\n````\n")
    return '\n'.join(out)


def appendix_overrides():
    body = open(f'{S}/overrides.txt').read().rstrip()
    return f"````text\n{body}\n````"


prose_top = open(f'{S}/prose_top.md').read()
prose_method = open(f'{S}/prose_method.md').read()
doc = prose_top + '\n' + prose_method
doc = doc.replace('{{TABLE_SPLIT}}', table_split()).replace('{{TABLE_DEST}}', table_dest()).replace('{{TABLE_OUTSIDE}}', table_outside())
doc = doc.replace('{{SECTIONS}}', sections()).replace('{{APPENDIX_CONTEXT}}', appendix_context())
# Scripts go in last so that their own placeholder strings are not expanded.
doc = doc.replace('{{APPENDIX_OVERRIDES}}', appendix_overrides()).replace('{{APPENDIX_SCRIPTS}}', appendix_scripts())
for k, v in tokens.items():
    doc = doc.replace('{{' + k + '}}', f'{v:,}' if isinstance(v, int) else str(v))
left = re.findall(r'\{\{\w+\}\}', doc.split('## Appendix')[0])
assert not left, left
sys.stdout.write(doc)
json.dump(tokens, open(f'{S}/tokens.json', 'w'), indent=1)
````


## Appendix C. Hand decisions

One line per decision: test file, a substring of the case name, the label (`B`
or `L`), the re-home target and the destination. `-` keeps the rule's answer.

````text
# lib-suffix ||| name-substring ||| label (B/L/-) ||| rehome (-) ||| dest (-)
calendar/calendar_screen_test ||| seeds expanded month ||| B ||| body ||| -
calendar/calendar_screen_test ||| anchors calendar summary ||| B ||| body ||| -
explore/explore_city_trigger_layout_test ||| city header contains ||| L ||| - ||| -
explore/explore_widgets_test ||| ExploreDiscoveryCoverHeader paints through ||| L ||| - ||| -
explore/explore_widgets_test ||| Explore time scope pins ||| L ||| - ||| -
explore/explore_widgets_test ||| sticky day headers release ||| L ||| - ||| -
explore/explore_widgets_test ||| Explore and detail share organizer poster ||| L ||| - ||| -
explore/explore_widgets_test ||| OrganizerHeroTopBar keeps long title ||| L ||| - ||| -
explore/explore_widgets_test ||| OrganizerDetailBody renders metrics below ||| L ||| - ||| -
explore/explore_widgets_test ||| ExploreMapScreen can seed selected pin ||| L ||| - ||| -
explore/explore_widgets_test ||| Explore club cover prefers the primary ||| B ||| parts ||| -
organizers/organizer_detail_read_only_preview_test ||| owner verification is derived ||| B ||| parts ||| -
organizers/organizer_hero_top_bar_test ||| clubs without photos render artwork ||| L ||| - ||| -
payments/payment_history_screen_test ||| shows refunded recovery details ||| B ||| body ||| -
payments/payment_history_screen_test ||| shows all status badge variants ||| B ||| parts ||| -
reviews/reviews_widgets_test ||| review cards display host responses ||| B ||| parts ||| -
reviews/reviews_widgets_test ||| review history prompts signed-out ||| B ||| body ||| -
reviews/reviews_widgets_test ||| empty event reviews keep copy full-width ||| L ||| - ||| -
reviews/reviews_widgets_test ||| club and standalone empty presentations ||| L ||| - ||| -
safety/settings_screen_test ||| settings rows align to the section ||| L ||| - ||| -
swipes/profile_card_widget_test ||| ProfileSurface resolves canonical city ||| B ||| parts ||| -
swipes/profile_card_widget_test ||| ProfileSurface renders the same content in dark ||| L ||| - ||| -
swipes/profile_card_widget_test ||| ProfileSurface handles long public profile ||| L ||| - ||| -
swipes/swipe_action_buttons_test ||| pass and reaction adapters share ||| L ||| - ||| -
swipes/event_recap_screen_test ||| builds roster from server-owned ||| B ||| body ||| -
chats/chat_event_context_header_test ||| uses event-question framing ||| B ||| parts ||| -
chats/chat_inbox_screen_test ||| chat browse header presentation ||| B ||| body ||| -
chats/message_bubble_test ||| right-aligns stacked timestamp ||| L ||| - ||| -
chats/message_bubble_test ||| removes the outgoing tail ||| L ||| - ||| -
chats/message_bubble_test ||| uses tighter vertical rhythm ||| L ||| - ||| -
chats/message_bubble_test ||| message list gives multi-line ||| L ||| - ||| -
chats/chat_input_bar_test ||| renders real focus chrome ||| L ||| - ||| -
chats/event_chat_directory_widget_test ||| event inbox ||| B ||| body ||| -
chats/event_chat_participants_widget_test ||| participant route is readable ||| B ||| journey ||| -
chats/event_chat_widget_test ||| host opening and profile review ||| B ||| body ||| -
chats/event_profile_widget_test ||| long answers remain fully readable ||| B ||| body ||| -
chats/event_profile_widget_test ||| photo-only sharing does not claim ||| B ||| body ||| -
chats/chat_share_card_test ||| renders an anonymized ||| B ||| parts ||| -
chats/chat_screen_test ||| seeds an initial draft ||| L ||| - ||| -
events/attendance_sheet_screen_test ||| report export buttons share ||| B ||| action ||| -
events/event_detail_widgets_test ||| renders the loaded state at text scale ||| L ||| - ||| -
events/event_detail_widgets_test ||| renders the loaded state with reduced motion ||| L ||| - ||| -
events/event_detail_widgets_test ||| keeps the expanded hero title-only ||| L ||| - ||| -
events/event_detail_widgets_test ||| stores the route arguments ||| L ||| - ||| -
events/event_field_optionality_test ||| blank content omits authored ||| B ||| body ||| -
events/event_map_screen_test ||| preserveCanvasWhenEmpty ||| B ||| body ||| -
events/event_map_screen_test ||| placeholder event pins use DS ||| L ||| - ||| -
events/event_map_screen_test ||| fixture distance ring follows handoff ||| L ||| - ||| -
events/location_picker_screen_test ||| stores the initial location ||| L ||| - ||| -
events/location_picker_screen_test ||| uses the shared muted Catch map ||| L ||| - ||| -
onboarding/welcome_reel_handoff_test ||| landed scene pins reel ||| L ||| - ||| -
onboarding/welcome_reel_handoff_test ||| spinning focus treatment ||| L ||| - ||| -
onboarding/onboarding_composition_test ||| welcome and form steps keep ||| L ||| - ||| -
onboarding/onboarding_widgets_test ||| explains why continue is disabled ||| B ||| body ||| -
onboarding/onboarding_widgets_test ||| explains the catches gate ||| B ||| body ||| -
onboarding/onboarding_widgets_test ||| explains run preferences as event-specific ||| B ||| body ||| -
onboarding/onboarding_widgets_test ||| reel phrase bank matches ||| B ||| domain ||| -
auth/presentation/auth_screen_test ||| Host uses the selected inline phone ||| L ||| - ||| -
auth/presentation/auth_screen_test ||| defaults the country picker to India ||| B ||| body ||| -
auth/presentation/auth_screen_test ||| uses the locale-derived country picker ||| B ||| body ||| -
auth/presentation/auth_screen_test ||| switch between phone and OTP views ||| B ||| body ||| -
dashboard/dashboard_screen_test ||| notification rows compose the CatchField ||| L ||| - ||| -
dashboard/dashboard_screen_test ||| keeps signed-in idle free of old tab chrome ||| L ||| - ||| -
dashboard/dashboard_screen_test ||| does not render a profile shortcut ||| L ||| - ||| -
dashboard/empty_hero_card_test ||| Find an event CTA stays legible ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileTab omits private discovery ||| B ||| body ||| -
profile/profile_widgets_test ||| profile prompt cards remain capped ||| B ||| domain ||| -
profile/profile_widgets_test ||| ProfileScreen accepts a typed initial tab ||| B ||| body ||| -
profile/profile_widgets_test ||| ProfileScreen surfaces profile photo upload ||| B ||| body ||| -
profile/profile_widgets_test ||| profile inline drawers animate ||| L ||| - ||| -
profile/profile_widgets_test ||| choice tiles keep their controls ||| L ||| - ||| -
profile/profile_widgets_test ||| Profile sliver header uses ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileScreen uses native horizontal ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileScreen preserves NestedScrollView ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileScreen assigns terminal clearance ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileScreen reveals expanded Diet ||| L ||| - ||| -
profile/profile_widgets_test ||| ProfileScreen terminal clearance ||| L ||| - ||| -
profile/profile_widgets_test ||| Profile preview card can scroll ||| L ||| - ||| -
profile/profile_widgets_test ||| Profile preview upward drag ||| L ||| - ||| -
profile/profile_widgets_test ||| Profile preview overscroll ||| L ||| - ||| -
profile/profile_widgets_test ||| profile info field wraps long ||| L ||| - ||| -
profile/profile_widgets_test ||| inline chip editors do not repeat ||| L ||| - ||| -
profile/profile_prompt_disclosure_test ||| ProfileTab reveals completed prompts ||| B ||| domain ||| -
user_analytics/user_analytics_section_test ||| data coverage maps known ids ||| B ||| parts ||| -
user_analytics/user_analytics_section_test ||| Profile Insights loading reserves ||| L ||| - ||| -
user_profile/form_profile_account_widget_test ||| form directory is readable ||| B ||| body ||| -
user_profile/form_profile_photo_test ||| selection waits for decoding ||| B ||| body ||| -
image_uploads/photo_grid_test ||| embedded grid ignores ambient ||| L ||| - ||| -
image_uploads/profile_photo_editor_screen_test ||| uses compact canonical chrome ||| L ||| - ||| -
core/app_shell_test ||| floats navigation and publishes ||| L ||| - ||| -
core/app_shell_test ||| anchors navigation through Scaffold ||| L ||| - ||| -
core/app_shell_test ||| anchors fallback chrome ||| L ||| - ||| -
core/app_shell_test ||| preserves safe-area terminal clearance ||| L ||| - ||| -
core/consumer_bootstrap_test ||| static Catch_ and reel ||| L ||| - ||| -
core/toolbar_control_contract_test ||| large root selectors reflow ||| L ||| - ||| -
design_system/surface_composition_test ||| Today recommendation uses the action ||| L ||| - ||| -
design_system/surface_composition_test ||| publication keeps channel facts ||| L ||| - ||| -
design_system/surface_composition_test ||| public reviews uses the shared module ||| L ||| - ||| -
design_system/surface_composition_test ||| report owns separation ||| L ||| - ||| -
design_system/surface_composition_test ||| review failure stays in the module ||| B ||| body ||| -
design_system/surface_composition_test ||| pending reviews keep the module ||| B ||| body ||| -
routing/router_redirect_test ||| GoRouter keeps the canonical create-event ||| B ||| journey ||| P3.2 events/create
routing/app_shell_guest_cta_test ||| production router opens Chats ||| B ||| journey ||| P6 chats
routing/app_shell_guest_cta_test ||| production router opens Profile ||| B ||| journey ||| P6 you
routing/router_widgets_test ||| chat route uses a routed PublicProfile ||| B ||| journey ||| P6 chats
routing/router_widgets_test ||| FCM navigation helper drives ||| B ||| journey ||| P6 chats
routing/host_shell_navigation_test ||| Host shell selects chrome ||| L ||| - ||| -
routing/host_shell_navigation_test ||| real Host shell publishes adaptive placement ||| L ||| - ||| -
event_rehearsal/event_rehearsal_entry_integration_test ||| custom entry starts from organizer ||| B ||| body ||| -
event_rehearsal/event_rehearsal_entry_ui_test ||| entry and optional controls fit ||| L ||| - ||| -
event_rehearsal/event_rehearsal_settings_widgets_test ||| practice defaults, optional controls ||| B ||| action ||| -
event_rehearsal/event_rehearsal_staff_widgets_test ||| practice team configures ||| B ||| action ||| -
event_rehearsal/event_rehearsal_visit_runtime_test ||| opens one guest group review ||| B ||| journey ||| -
event_rehearsal/event_rehearsal_visit_runtime_test ||| selected expired practice duty ||| B ||| journey ||| -
event_rehearsal/host_event_rehearsal_screen_test ||| virtual run controls expose ||| B ||| body ||| -
event_rehearsal/host_event_rehearsal_screen_test ||| placement Coach task opens ||| B ||| journey ||| -
event_rehearsal/host_event_rehearsal_screen_test ||| host console reflows at 2x ||| L ||| - ||| -
programs/program_attendance_report_test ||| renders program totals, joined ||| B ||| parts ||| -
programs/program_create_provider_test ||| production provider form accepts ||| B ||| body ||| -
programs/program_function_lead_test ||| work shell opens Now ||| B ||| body ||| -
programs/program_function_lead_test ||| Now & next buckets ||| B ||| domain ||| -
programs/program_function_lead_test ||| attention feed renders duty alerts ||| B ||| domain ||| -
programs/program_guest_desk_test ||| program coordinators retain ||| B ||| body ||| -
programs/program_guest_desk_test ||| gets the correct guest desk access ||| B ||| body ||| -
programs/program_guests_function_row_test ||| selected pending badge retains ||| L ||| - ||| -
programs/program_lifecycle_affordances_test ||| can share RSVP links with independent ||| B ||| body ||| -
programs/program_reconciliation_test ||| a dispatcher still sees the void ||| B ||| body ||| -
programs/program_stakeholder_screen_test ||| renders counts with function ||| B ||| body ||| -
programs/program_lodging_screen_test ||| membership editor scrolls at double ||| L ||| - ||| -
event_success/event_assistance_runtime_widgets_test ||| a replayed pause displays ||| B ||| body ||| -
event_success/event_success_assignment_features_test ||| account change discards an in-flight ||| B ||| body ||| -
event_success/event_success_duration_shape_test ||| live navigation uses each duration ||| B ||| parts ||| -
event_success/event_success_exclusion_ledger_test ||| control room alert uses the configured ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| companion keeps booked attendees ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| companion screen shows assigned micro-pod ||| B ||| parts ||| -
event_success/event_success_live_screens_test ||| companion screen shows rotating group slots ||| B ||| parts ||| -
event_success/event_success_live_screens_test ||| companion screen shows assigned rotation ||| B ||| parts ||| -
event_success/event_success_live_screens_test ||| companion live reveal shows unlocked ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| companion route fetches assigned ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| companion keeps always-on ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host live mode summarizes generated ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host live mode surfaces active wingman ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host live mode marks host-edited ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host section keeps real tabs ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host report remains available ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| host report summarizes live signal ||| B ||| body ||| -
event_success/event_success_live_screens_test ||| question progress rail uses stage ||| L ||| - ||| -
event_success/event_success_live_standings_test ||| standings reuse the assignment ||| B ||| body ||| -
event_success/event_success_control_room_test ||| report waiting state uses ||| L ||| - ||| -
event_success/event_success_control_room_test ||| compact Control Room fits ||| L ||| - ||| -
event_success/event_success_control_room_test ||| wide Control Room keeps ||| L ||| - ||| -
hosts/applications/host_application_intake_test ||| imported review keeps its existing ||| B ||| body ||| -
hosts/event_age_range_field_test ||| follows externally restored ||| B ||| parts ||| -
hosts/event_policy_dependency_test ||| admission and pair controls own ||| B ||| body ||| -
hosts/event_policy_dependency_test ||| applicable field labels remain readable ||| L ||| - ||| -
hosts/forms/host_form_builder_screen_test ||| settings offer separate unchecked ||| B ||| body ||| -
hosts/forms/host_form_builder_screen_test ||| compact builder leads with questions ||| L ||| - ||| -
hosts/forms/host_form_builder_screen_test ||| tablet builder keeps three panes ||| L ||| - ||| -
hosts/forms/host_form_builder_screen_test ||| single page summarizes readiness ||| B ||| body ||| -
hosts/forms/host_form_builder_screen_test ||| inline drag handle changes the persisted ||| B ||| action ||| -
hosts/forms/host_form_response_detail_screen_test ||| optional note remains readable ||| L ||| - ||| -
hosts/forms/host_form_share_loading_test ||| unknown form share structure centers ||| L ||| - ||| -
hosts/forms/host_forms_screen_test ||| Responses empty state centers ||| L ||| - ||| -
hosts/forms/host_event_offer_workspace_test ||| capture unified offer ||| L ||| - ||| -
hosts/forms/host_form_profile_question_section_test ||| profile use ||| L ||| - ||| -
hosts/host_campaign_editor_test ||| initial audience id selects ||| B ||| parts ||| -
hosts/host_create_event_screen_test ||| uses dockless actions ||| L ||| - ||| -
hosts/host_create_event_screen_test ||| puts viable event fields ||| L ||| - ||| -
hosts/host_create_event_screen_test ||| wide create flow uses ||| L ||| - ||| -
hosts/host_create_event_screen_test ||| demand pricing allows at least ||| L ||| - ||| -
hosts/host_create_event_screen_test ||| route hydrates the private create ||| B ||| body ||| -
hosts/host_customer_hit_targets_test ||| full Host CRM pointer targets ||| L ||| - ||| -
hosts/host_customer_hit_targets_test ||| real panes scroll independently ||| L ||| - ||| -
hosts/host_events_layout_test ||| Events reflows and pins ||| L ||| - ||| -
hosts/host_inbox_screen_test ||| program screen contains shared history ||| B ||| body ||| -
hosts/host_inbox_screen_test ||| account switch with late program ||| B ||| body ||| -
hosts/host_inbox_screen_test ||| General scope excludes event-specific ||| B ||| domain ||| -
hosts/host_inbox_screen_test ||| Messaging pane header and rail ||| L ||| - ||| -
hosts/host_inbox_screen_test ||| split view uses route-body ||| L ||| - ||| -
hosts/host_inbox_screen_test ||| wide Sends keeps history ||| L ||| - ||| -
hosts/host_inbox_screen_test ||| scope menu stays above floating ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host club workspace keeps shared chrome ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host edit content fills ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host organizer media summary keeps ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host organizer empty media summary ||| L ||| - ||| -
hosts/host_operations_screen_test ||| compact customer overview keeps ||| L ||| - ||| -
hosts/host_operations_screen_test ||| customer contact fields use their full ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Today metric value and label ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host Today loading centers ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host clubs keeps root primary-rail ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host Today keeps root composition ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host Today error stays in the root ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host Events keeps root composition ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host events centers its canonical ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host events past-only history ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host payout states each own ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host team workspace club rows use ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host club workspace uses native ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host club tabs preserve independent ||| L ||| - ||| -
hosts/host_operations_screen_test ||| customer overview groups status ||| L ||| - ||| -
hosts/host_operations_screen_test ||| customer rows preserve hierarchy ||| L ||| - ||| -
hosts/host_operations_screen_test ||| expanded customer workspace keeps ||| L ||| - ||| -
hosts/host_operations_screen_test ||| Host analytics trend renders every ||| B ||| body ||| -
hosts/host_operations_screen_test ||| Host Today follows the shared organizer ||| B ||| body ||| -
hosts/host_roster_intake_review_sheet_test ||| scope change immediately scrubs ||| B ||| parts ||| -
hosts/host_sheet_composition_test ||| draft content and actions share ||| L ||| - ||| -
hosts/host_sheet_composition_test ||| People filters use muted ruled ||| L ||| - ||| -
hosts/host_step_flow_composition_test ||| event editor loading uses ||| L ||| - ||| -
hosts/host_wizard_step_header_test ||| club wizard keeps nullable ||| B ||| parts ||| -
hosts/presentation/payments/host_organizer_bills_section_test ||| the section reads the organizer ||| B ||| parts ||| -
hosts/presentation/payments/host_organizer_bills_section_test ||| a closed statement has nothing ||| B ||| parts ||| -
hosts/organizer_form_primitives_test ||| club defaults use canonical choices ||| L ||| - ||| -
hosts/inbox/host_new_message_screen_test ||| new-message loading uses ||| L ||| - ||| -
hosts/today/host_today_progressive_feed_test ||| disposed feed ignores held ||| B ||| action ||| -
hosts/today/personalization/host_today_visual_test ||| Focus phone layout and actions ||| L ||| - ||| -
hosts/today/personalization/host_today_visual_test ||| quiet Today phone layout and actions ||| L ||| - ||| -
hosts/work/host_work_screen_test ||| renders the picker grouped by organizer ||| B ||| body ||| -
hosts/route_path_builder_screen_test ||| route builder uses the canonical ||| L ||| - ||| -
organizers/organizer_host_section_test ||| uses activity accent seal ||| B ||| parts ||| -
explore/explore_recommendations_loading_test ||| recommendations load through ||| L ||| - ||| -
profile/profile_widgets_test ||| Profile terminal empty and error ||| L ||| - ||| -
````
