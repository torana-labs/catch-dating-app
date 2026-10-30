---
doc_id: ds_resync_audit_2026-06
version: 1.0.0
updated: 2026-06-16
owner: ui_elevation_initiative
status: active — execution tracker for the design-system re-sync port
---

# Design-System Re-Sync — Gap Audit + Porting Plan (2026-06-16)

Brings `lib/` up to the **latest** Catch design system. The source of truth is the
design-system folder shipped to the engineer (`IMPLEMENTATION_HANDOFF.md`,
`README.md`, `colors_and_type.css`, `COMPOSITION.md`, `components/<group>/<Name>/`,
`templates/<slug>/*.dc.html`) — **not** the repo docs, several of which are stale on
the type system. `templates/feature-drop*` are marketing media, out of scope.

> This tracker **supersedes the font/type language** in
> [`ui_elevation_implementation.md`](ui_elevation_implementation.md) and
> [`design_language.md`](design_language.md), both of which still carried the
> old serif/custom-sans direction. The shipped identity is **Archivo (voice/head) + the
> platform system font (function) + IBM Plex Mono (data)**; the old type studies and
> the "Sunset" cream+orange are retired in code. Those docs' font sections are
> being reconciled in Wave 0.

## State of the migration

~85% complete. Foundations are **already on-spec** and faithful: color tokens,
spacing/gutter, radius, stroke, elevation, the activity **accent** pigments, and the
full `.t-*` type scale ([`catch_text_styles.dart`](../lib/platform/theme/catch_text_styles.dart),
[`catch_fonts.dart`](../lib/platform/theme/catch_fonts.dart),
[`catch_tokens.dart`](../lib/platform/theme/catch_tokens.dart)). Most `Catch*` widgets are
real, composed ports. The remaining work is **targeted drift, a handful of missing
primitives, and a few hand-rolled-instead-of-composed surfaces.**

Audit method: 13-agent parallel workflow (each comparing a DS area's `.jsx`/`.d.ts`
against the Flutter counterpart with file:line evidence), plus a deep + adversarially
verified pass on the event-detail slice. Re-verify file:line refs before acting — they
are 2026-06-16 snapshots.

### Owner decisions (2026-06-16)
1. **EventHero** — *enrich* the existing collapsing/Hero-flighted photo hero with the
   missing DS elements (do **not** replace it; the collapse + Hero-flight is a
   preserved quality atom).
2. **Photo grade** — *match DS `.catch-grade`* exactly (`saturate .78 / contrast 1.04 /
   brightness .97`); re-tune `CatchGrade`.
3. **Sequence** — write this report to `docs/` first, then port event-detail first.

---

## Tier 1 — Foundations (theme layer; mostly one-file fixes)

| Gap | Sev | Where | Fix |
|---|---|---|---|
| Mono tracking globally zeroed (kicker/kickerLg/monoLabel/monoLabelS/badge) | High | `catch_text_styles.dart:398+` | Add `letterSpacing` = `em×size` (kicker .16em→1.76, kickerLg .18em→2.16, monoLabel/S .13em→1.43/1.30, badge .08em→0.72); fix "zero tracking" docstring |
| Activity glyphs wrong: running→sneakerMove (dup of socialRun), pickleball→tennisBall, badminton→pingPong | High | `activity_palette.dart:110-115` | running→personSimpleRun, pickleball→pingPong, badminton→feather (phosphor 2.1.0 has no `shuttlecock`) |
| Voice display tracking missing | Low | `catch_text_styles.dart` | display −0.7 / headline −0.35 / headlineS −0.16 / titleL −0.1 / eventTitle −1.0 / consoleTitle −0.2 / hint −0.2 / name −0.1 |
| Photo grade differs (sat .84/contrast .94 vs DS .78/1.04 — opposite contrast direction) | Med | `catch_graded_image.dart:53` | Re-tune to DS `.catch-grade` (decision #2) |
| Activity deep/soft HSL-derived vs DS explicit hex | Med | `activity_palette.dart:30` | Generate explicit `--act-*-deep/-soft` tokens; derive as fallback |
| Dead `CatchIcons` activity getters (contradictory, 0 callers) | Low | `catch_icons.dart:382` | Delete |
| Retired type-study TTFs on disk (not shipped) + `sunset*` aliases referenced in events/hero/console/status-bar | Low | assets/fonts/, events | Delete retired TTFs; rename `sunset*`→`dark`/`light` at call sites |
| Stale docs (ui_elevation_implementation.md, design_language.md, widget_catalog 2.5.160, "white-on-orange" celebration note) | Low/Med | docs/ | Reconcile to Archivo/system-font |

## Tier 2 — Missing primitives (no Flutter equivalent)

HostCard (High, blocks event-detail) · Callout (High) · Field+FieldGroup unified row
w/ floating label (High) · OptionGroup `onFilter`/`filterBadge` (High; ExploreFilterRail
uses the DS-forbidden `trailing:` filter) · ClubDock pinned stateful dock incl. owner
state (High) · CrossPathsCard (High — decision: target surface or intentional drop) ·
JourneySteps shared primitive (Med) · TicketStub `card` variant (Med) · ClubHero
`full`/`masthead` variants (Med) · CoverStory dark cover (Med) · shared
HostRow/ContactRow/PhotoStrip/Roster\*/LiveConsole/RotationCard (Med/High — exist only
as file-private widgets) · OptionCard (Low).

## Tier 3 — Drifted primitives (exist, wrong values/states)

High: PersonAvatar fallback uses activity pigment + sans initials (violates
"people = paper & ink"); ProfileHero scrim too heavy (0.22/0.62/0.95 vs 0.14/0.34/0.74);
ReviewRow stars gold vs ink + no mono date; StrideCard emphasis inverted + chart 58 vs
84; DashboardEventCard no activity tint; DateTicket missing note/tail/dataEm/full states
+ numeral 31 vs 22; EventHero missing pigment gradient/ArtArt/hosted-by; BookingDock
missing catch-line + mono price block + scarcity note.
Med/Low: CompatibilityList/RunningRhythm hand-rolled (check-icon vs pigment dot,
CatchBadge vs CatchChip, inverted stat order); ContactRow glyph pigmented (breaks ink
rule); HostRow no seal/wrong name face; RangeSlider no SliderTheme (M3-seed colors);
ActivityAvatar initials in sans vs mono; form drift (box radius 8 vs 12, field-label
voice, stepper value/ends, PhotoStripField add-last vs add-first/cover); FieldRow &
ChatListTile divider 0.62 vs 0.38; ChatListTile time sans vs mono; EventTicket missing
"N going · M left · Full(red)" meta line.

## Tier 4 — Screens

`present-ok`: profile (flagship), messaging, notifications, settings, booking,
host-create flows. `drifted`: Explore (map+sheet metaphor — composes none of
CoverStory/CrossPaths/DateTicket; decision: sanction or port), host-event-manage (roster
fully hand-rolled, no shared LiveConsole/RotationCard). `partial`: club-detail/host-clubs
(HostRow/ContactRow/PhotoStrip private), dashboard (no CoverStory/JourneySteps),
onboarding (redundant double-title header).

---

## Event-detail vertical slice — punch list (slice #1, verified)

Slice is ~80% faithful; section rhythm, TicketStub band, HintList/Itinerary/
MechanismList, MapCard, AvatarStack, CTA pigment are **present-ok**. Blockers to
side-by-side DoD (§6), in order:

1. **Mono tracking** (Tier 1 foundation) — every kicker/label is untracked.
2. **EventHero** — enrich (decision #1) with activity accent→deep gradient base,
   ActivityArt, condensed `eventTitle` (36/w700/wdth90/−1), activity-tag pill, series
   kicker, and the "Hosted by …✓seal" attribution; retire `sunsetDark` refs.
3. **HostCard / "YOUR HOSTS" section** — build `CatchHostCard` (graded avatar on
   activity gradient, condensed name + verified seal in accent, mono meta, 3-cell
   numeric stat strip, two hairline actions); insert a `CatchSection`.
4. **BookingDock** — extend `CatchBottomCta` with an accent catch-line header + mono
   price block (`numericLarge` + `monoLabelS` note, warning color when ≤3 spots).

Lower: PhotoStrip series caption ("LAST SATURDAY / RUN #N · N WENT · M CAUGHT") if series
data exists; optionally flatten GOOD TO KNOW from cards to box-free hairline rows.

---

## Porting plan (dependency-ordered waves)

- **Wave 0 — Foundations**: mono+voice tracking → activity glyphs → photo grade → cleanup
  (dead getters, sunset renames, TTFs) → doc reconciliation. *Regenerate goldens after
  the tracking + grade changes.*
- **Wave 1 — Event-detail slice**: `CatchHostCard` → EventHero enrichment → BookingDock
  extension → assemble "Your hosts" section + wire dock → verify side-by-side
  (light/dark, text-scale 1.5/2.0).
- **Wave 2 — Missing leaf primitives**: Callout, OptionCard, JourneySteps, Field/FieldGroup,
  TicketStub card; extract shared HostRow/ContactRow/PhotoStrip/Roster\*.
- **Wave 3 — Drifted primitives by severity** (PersonAvatar, ProfileHero scrim, ReviewRow,
  StrideCard, DashboardEventCard, DateTicket, RangeSlider, forms…).
- **Wave 4 — Composite screens** (ClubDock + club-detail dock, host roster +
  LiveConsole/RotationCard, Explore decision, dashboard CoverStory, onboarding).
- **Wave 5 — Document intentional drift + final §5 rules pass + golden refresh.**

## Progress log

**2026-06-16 — batch 8 (Explore → feed-primary + map route; owner chose the FULL rewrite over
skin-in-place. Analyze-clean project-wide; explore (57) + clubs (62) + routing (42) green):**
- **Retired the map-as-canvas.** `ExploreScreen` was a 644-line map canvas: a live `EventMap`
  behind a `DraggableScrollableSheet` with three snap states (FULL/MAP/PEEK), tilt-to-reveal device
  motion, and map-lead slivers. It is now a plain feed-primary screen — `Column[ browse header +
  filter rail, Expanded(CustomScrollView(feed)) ]` reusing `buildExploreBodySlivers` + the existing
  empty/skeleton states — with a floating **bottom-left map pill** (`CatchCountPill`, "Map · N").
- **New `ExploreMapScreen`** (`explore_map_screen.dart`) + route `/clubs/map` (static child registered
  before `:clubId`, `parentNavigatorKey: root` so it's full-screen above the tab dock). The pill does
  `context.pushNamed(Routes.exploreMapScreen.name)`; the map shows the same feed events as pins
  (`exploreMapViewModelFromFeed`), cycles the distance ring, and opens an event on pin-tap.
- **Test re-baseline:** deleted 5 retired-interaction tests (open-map-drag, peek summary, wrist-lift
  motion reveal, selected-pin half-sheet, closed-feed-below-lid); fixed 2 chrome/feed tests for the
  new `Column` layout; added a map-pill→route nav test; cleaned 4 now-unused imports + 2 helpers.
  Also fixed 3 **pre-existing** `OrganizerDetailBody` failures (this session's earlier `_ClubHostRow`
  restructure dropped "Hosted by X" → name + `OWNER ·`/`HOST ·` mono meta; tests still asserted the
  old copy — updated to the displayName + `textContaining('… · ')`).
- **Explore refinements — LANDED (both, this batch).** (1) **CoverStory swap:** the feed's
  `_ExploreHero` now renders the DS dark `FeaturedEventPoster` instead of `CatchEventSpotlightCard`. The
  cover is **CTA-driven** ('View event' button) — no whole-card gesture, and the shared-element Hero
  "morph" was intentionally dropped (`_openCoverStoryEvent` opens `presentationMode: spotlightDark`,
  no `heroTag`, default page transition). `_openEvent` simplified (dead spotlight branch removed; rows
  still open ticket). `FeaturedEventPoster` gained a `data2` second mono line (data=`time · price`,
  data2=capacity) rendered in a `Flexible` ellipsizing block (an adversarial review caught that the
  original non-flex data column **overflowed** on phone widths/large text scale — the 800px test
  surface masked it; fixed + guarded with a 320px×1.6 probe test). Orphaned `_heroCountdownLabel`/
  `_relativeCountdownLabel` deleted. Tests: `find.byType(FeaturedEventPoster)` findsOneWidget (single-event)
  / findsNothing (multi-day), plus a CTA→detail nav test asserting `spotlightDark`. The **map-sheet**
  selected-lead path (`buildExploreMapSheetLeadSlivers`) intentionally KEEPS `CatchEventSpotlightCard`.
  Owner QA: the cover is now CTA-only (no tap-anywhere) and opens without the card morph — confirm
  visually. (2) **Motion-reveal cleanup:** deleted `lib/core/device_motion.dart`,
  `lib/explore/presentation/explore_map_motion_reveal.dart`, `test/organizers/explore_map_motion_reveal_test.dart`;
  stripped `DeviceMotionSource` mocks from `screen_capture_catalog.dart` + `app_shell_test_harness.dart`;
  dropped `sensors_plus` from `pubspec.yaml`/`pubspec.lock` and regenerated `ios/Podfile.lock` via
  `pod install` (the 6 `sensors_plus` pod entries removed; no other pods touched). Verified: explore
  (78) + events green, project analyze clean, plus an adversarial-review workflow (4 dimensions,
  per-finding verify) whose HIGH finding (the cover data-Row overflow) was fixed and probe-guarded.

**2026-06-16 — batch 7 (onboarding title-into-header; owner decision #5). Analyze-clean,
onboarding (38) + auth (10) green:**
- The big per-step question + supporting line now live in the flow header (`CatchStepFlowHeader`,
  which already renders title+subtitle via `CatchTopBar large`) instead of each page's body.
  Centralized the copy — including the conditional `profileCompletionOnly` / `runPreferencesOnly`
  variants for photos/prompts/running — in `OnboardingStep.headerCopy(...)`; `_OnboardingTopBar`
  passes it through. Removed the in-body `OnboardingStepHeader` from all 6 onboarding pages
  (welcome has no top bar; the form content now leads the scroll frame). `OnboardingStepHeader`
  the widget stays — the **auth** phone/OTP pages still use it (out of scope).
- Coverage relocated: the per-mode copy is now unit-tested in `onboarding_step_test`
  (`headerCopy`); the page-in-isolation widget tests kept their page-content assertions
  ('This only gates Catches…', 'Why do you run?', 'Continue booking') and the full-screen
  header tests now assert the question ("What's your name?", 'How do you identify?').

**2026-06-16 — batch 6 (host-tools integration; analyze-clean, all affected suites green):**
- **Roster primitives WIRED** into `host_event_attendance_panel.dart`. The panel's three
  modes (setup / live / report) now render through `CatchRosterTiles` + `ParticipantTable`
  + `ParticipantRow`; deleted 12 hand-rolled private widgets (`_RosterTableShell`,
  `_TableEmptyState`, `_SetupReviewRow`, `_LiveRosterRow`, `_ReportRow`, `_DecisionControls`,
  `_DecisionIconAction`, `_ProfileButton`, `_WaitlistOfferButton`, `_CompactPersonIdentity`,
  `_NameMeta`, `_RosterDivider`), ~360 lines net removed. Report rows gained avatars + a
  mono payment cell (DS-consistent). Extended `ParticipantAction`: `buttonKey` (keeps the
  per-attendee check-in test handle) and `ParticipantDecideAction.onProfile` (preserves the
  request-row profile-peek as a third leading target; dims approve/decline while pending).
  Added `CatchIcons.eye`. The DS render uppercases mono filter/table labels + meta
  (`t-mono-label`/`t-badge` are `text-transform:uppercase`), so the widget tests were
  updated to the rendered strings (GUEST/SIGNAL/HOST ACTION, ALL/DUE/IN/WAITLIST, VIEW
  PROFILE) and decide targets are now found by `bySemanticsLabel` (DS uses a11y labels, not
  tooltips). Verified: `attendance_sheet_screen_test` (10), `host_create_event_screen_test`,
  `event_success_manual_qa_screen_test`.
- **LiveConsole rebuilt in place** (`event_success_host_live.dart` `_LiveNowConsole`) to the
  DS `LiveConsole`: retired the legacy `sunsetDark` 3-stop gradient for the DS 2-stop
  `ink → mix(ink, gold 20%)` from the light palette (fg = `primaryInk`); STEP n/m · stage
  is now one mono-label line (was two badges); a bare 5px run-of-show meter (dropped the
  "Run of show" label-row chrome via deleting `_LiveNowProgressMeter`); title → `consoleTitle`;
  a gold-dot `_LiveNowPill` (renders "LIVE NOW"); nav flex tuned to the DS 2:3. Verified:
  `event_success_live_screens_test`, `event_success_manual_qa_screen_test` (+ project-wide
  analyze clean).
- **RotationCard — DONE via "skin, keep features" (owner-chosen).** The DS `RotationCard`
  is a *simpler* model than the app's split (`_RotationsHostCard` generation/fairness/override
  card **and** `EventSuccessLiveRevealHostCard` dramatic reveal-with-countdown). Rather than
  flatten (regression) or rebuild the test-locked generation card (which is generation-time
  → all rounds hidden, no Done/Now state to show), the DS round-state visual was applied on
  the **reveal host card**, the surface that actually owns reveal state: replaced the compact
  `_RevealRoundRail` (R1/R2/R3 badge wrap) with `_RevealRoundList` — a config mono line
  (`PAIRS · 15 MIN ROUNDS · AVOID REPEATS · 10S REVEAL`) over one row per round (`R{n}` +
  pairings or "Hidden until reveal" italic + a Done/Now/Hidden badge). Pairings render only
  for released rounds (reveal-gated — never leaks future rounds), names threaded via
  `participantProfiles`; helpers `_rotationConfigLine` + `_revealRoundPairsLabel`. Pods keep
  the rail. The dramatic countdown + the generation card are untouched (no feature loss).
  Verified: full `event_success` suite (116) + `hosts` (37) green, analyze clean.

**2026-06-16 — batch 5 (the big-efforts pass; owner chose to go maximal + QA core
screens after). New primitives, all analyze-clean:**
- **`CatchField` + `CatchSection`** (`lib/core/widgets/catch_field.dart`) — the DS
  unified row primitive (edit·read·nav·toggle·control·add, floating label). Edit mode
  delegates to a new **`CatchFieldVariant.bare`** so all of CatchField's
  validation/keyboard/autofill machinery is preserved. **Current status:** active app
  field rows now compose `CatchField`/`CatchSection`; `CatchToggle` remains the low-level
  switch leaf and standalone control for non-field surfaces.
- **`CatchCrossPathsCard`** (`lib/explore/presentation/widgets/`) — DS person-in-feed
  postcard + photo variants (the Explore leaf; `crossPaths*` tokens). Built but **not
  wired** (owner: omit CrossPaths from the feed until a crossed-paths data source exists).
- **`FeaturedEventPoster`** (`lib/explore/presentation/widgets/`) — DS dark wow cover
  (activity radial glow, ghost glyph, condensed headline, paper CTA, optional
  location/search chrome; `coverStory*` tokens). Ready for the Explore feed header.

**Owner decisions (batch 5):** Explore → port the DS feed (omit CrossPaths for now; map
moves to a bottom-left map-pill route). Onboarding → move title into the header. Host
tools → rebuild onto DS RosterTable/Row/Tiles + LiveConsole + RotationCard (improve where
the DS is weak). Field → build + migrate everything. Core-screen rewrites → land verified
by analyze + widget tests; owner QAs visually after.

**Field form convergence — DONE (owner-chosen path):** `CatchField` gained an opt-in
`floatingLabel` (default ON, gated by `showLabel`, off for `isOptional` which keeps its
"(optional)" badge, off for `bare`). Every required form field across the app now shows
the DS Field floating caption with **zero call-site churn and no feature loss** (validators
/keyboards/autofill/suffix/helper all intact) — verified across 250+ form tests + goldens.
`CatchField`/`CatchSection` remain for read/nav/toggle rows + new fields.

**Host roster primitives — built (`lib/hosts/presentation/widgets/participant_table.dart`):**
`CatchRosterTiles` (count-tile filter row), `ParticipantRow` (avatar + condensed name +
mono meta + signal badge + spec-driven action cell: button/decide/badge/text),
`ParticipantTable` (5/3/3 hairline shell + empty state). Faithful to the DS with the
mono/`t-name` type fixes. Analyze-clean. **Wiring into `host_event_attendance_panel.dart`
(1800 lines, no widget test) is the unverifiable integration step — needs app QA.**

**Settings convergence — completed later:** row-shaped settings and policy switches now
route through `CatchField.toggle`, and section/group chrome routes through `CatchSection`.
`CatchToggle` remains available only as the low-level switch leaf or for standalone
non-field controls.

**Remaining (in progress; the unverifiable core-surface integrations the owner will QA):**
(1) wire roster primitives into the host attendance panel + build/​wire `LiveConsole` +
`RotationCard` (event-success live console); (2) Explore feed screen rewrite (leaves ready);
(3) onboarding title-into-header.


**2026-06-16 — Wave 0 (foundations) landed + analyze-clean:**
- Mono tracking restored in `catch_text_styles.dart` (kicker 1.76 / kicker-lg 2.16 /
  mono-label 1.43 / mono-label-s 1.30 / badge 0.72) + the "zero tracking" docstring
  fixed; voice negative tracking added (display −0.7 … name −0.1, eventTitle −1.0).
- Activity glyphs fixed in `activity_palette.dart` (running→personSimpleRun,
  pickleball→pingPong, badminton→feather — phosphor 2.1.0 has no `shuttlecock`).
- Photo grade re-tuned to DS `.catch-grade` in `catch_graded_image.dart`
  (saturate .78 / contrast 1.04 pivot / brightness .97; `blackLift`→`brightness`).
- Added canonical `CatchIcons.sealCheck` / `.arrowUpRight` / `.chatCircle`.

**Wave 1 (event-detail) — COMPLETE (analyze-clean; 37 event-detail widget tests +
79 primitive/grade tests green; goldens regenerated + visually verified):**
- `EventDetailHostCard` (+`EventDetailHostStat`, `_HostAvatar`) leaf in
  `event_detail_design_primitives.dart` (`CatchLayout.eventDetailHost*` tokens),
  parametrized for the dark spotlight surface.
- Wired via `_EventDetailHostsSection` in `event_detail_body.dart` — watches
  `fetchOrganizerProvider`, maps `Club` → host name/avatar/meta/stats, and wires
  View club (→ club detail) + Message host (→ `startConversation` → chat).
- `EventDetailHeroTopBar` enriched: activity **tag pill** (glyph + label) on both the
  standard + ticket heroes, poster **w700** title, condensed standard-hero title
  (`eventDetailHeroStandardTitleSize`), `sunsetDark`→`dark` retired (5 sites). Added
  canonical `CatchIcons.sealCheck/arrowUpRight/chatCircle/sparkle`.
- `CatchBottomCta` extended with `catchLine`/`catchLineAccent`/`footnote`; the booking
  dock now shows the whispered catch-line ("Matching opens for everyone who goes") and
  `EventPriceText` is a mono `numericLarge` price + warning-toned scarcity note (≤3 spots).
- Photo grade: `CatchGrade` re-tuned to DS `.catch-grade` (Wave 0).

**Deferred from the hero (deliberate):** the activity-pigment gradient base + multiply
photo tint (no-photo already shows activity art, and a global multiply over every event
photo is a strong change to weigh separately); the hosted-by line in the hero (host
identity now lives in the new "Your hosts" HostCard section, avoiding duplication +
data-threading into the hero); series kicker (no `Event` series/recurrence field).

**Wave 2 + 3 + 4 — batch 4 (analyze-clean, 0 issues; tests green):**
- **`CatchSurface.message`** (Wave 2) — `lib/core/widgets/catch_surface.dart`: 5-tone note/tip
  banner (tinted wash or neutral hairline) + leading glyph + title/body (`calloutFill` token).
- **`CatchOptionCard`** (Wave 2) — `lib/core/widgets/catch_option_card.dart`: descriptive
  selectable choice card (check/circle + ink-border selected + ink wash).
- **`CatchClubDock` + `OrganizerMembershipDock`** (Wave 2 primitive **+ Wave 4 screen**) —
  `lib/organizers/presentation/detail/widgets/catch_club_dock.dart`: the 4-state pinned club
  dock (guest/visitor/member/owner) with count block, activity-pigmented Join CTA,
  accent-filled notifications bell (fixes the raw-Material-colorScheme bell drift), quiet
  "Joined" control, and mono footnote. **Wired** into `OrganizerDetailScreen` as
  `bottomNavigationBar`, replacing the inline Membership/Join-Catch sections in
  `club_detail_body.dart`. `clubs_flow_test` updated ("Leave club"→"Joined") and green.
- **DashboardEventCard activity tint** (Wave 3) — `EventActionCard` gained opt-in
  `topAccentColors` (6px activity accent→deep bar) + per-action `accentColor`; the
  dashboard `EventFocusRail` passes the event's activity accent + pigments the primary action.
- **Field-label voice** (Wave 3) — `CatchFormFieldLabel` small label now `.t-field-label`
  (11.5/w500/ink3), not the mono-ish `labelM`.
- **Stepper value** (Wave 3) — `CatchNumberStepper` value now `.t-numeric-l` (16/w700),
  not the 13/w500 `mono`.
- Added `CatchIcons.checkCircle/circle`.

### Phase status (end of session)
- **Wave 2 (missing primitives):** Callout · OptionCard · JourneySteps · ClubDock built
  (4 of the catalogue's missing primitives, all reusable + analyze-clean). Remaining as
  larger separate efforts: TicketStub `card` variant and extracting shared
  HostRow/ContactRow/PhotoStrip/Roster\* out of their screen files.
- **Wave 3 (drifted):** ~18 fixes shipped (mono+voice tracking, glyphs, grade,
  PersonAvatar paper-ink, ProfileHero scrim, ReviewRow, StrideCard, ActivityAvatar,
  RangeSlider, FieldRow/ChatListTile dividers + mono time, ContactRow/HostRow, form box
  radius, field-label, stepper value, DashboardEventCard tint). Remaining: DateTicket
  sold-out/note/tail states, ContactRow mono-eyebrow structural half, stepper bordered
  ± discs, PhotoStripField add-first/cover.
- **Wave 4 (screens):** event-detail slice assembled + verified; club-detail rebuilt onto
  the pinned ClubDock; dashboard event-focus cards activity-tinted + JourneySteps. Remaining
  larger screen efforts: onboarding single-title fold (spans 9 pages + the header), host
  roster → shared `CatchRoster*` + `LiveConsole`/`RotationCard`, the Explore map+sheet
  reconciliation, and the dark dashboard CoverStory.

**Optional slice polish:** PhotoStrip series caption ("LAST SATURDAY / RUN #N");
flatten GOOD TO KNOW from cards to box-free hairline rows. **Recommended follow-up:** add
an event-detail golden (reuse the `event_detail_widgets_test` fixtures) to lock the
assembled slice side-by-side.

**Wave 3 — high-severity self-contained drift fixes (batch 1; analyze-clean, widget
tests green, goldens regenerated):**
- **PersonAvatar fallback** → paper & ink: flat `primarySoft` fill + mono `ink2`
  initials; removed the activity-pigment `_GradientPlaceholder` (people are never
  pigment). Image-error + no-photo both use it now.
- **ProfileHero scrim** → DS stops `0.14 / 0 / 0.34 / 0.74` (new
  `profileHeroScrimTop/Mid/Bottom` tokens; retired the over-heavy 0.22/0.62/0.95 reuse).
- **ReviewRow stars** → ink (filled) / line2 (empty), not gold — ratings are ink data.
- **StrideCard** → chart height 58→84; today bar full-strength, other days ~0.55
  (`strideInactiveBar`) — emphasis was inverted.
- **ActivityAvatar initials** → mono (data voice) w700 + 0.02em, not the sans cut.
- **RangeSlider** → tokenized `SliderThemeData` (4px line2 track, ink active fill, 24px
  surface knob lifted off the track) instead of M3-seed colors.

**Wave 3 — batch 2 (analyze-clean, tests green, goldens regenerated):**
- **FieldRow** inset divider opacity 0.62→0.38 (new `fieldRowDivider` token); leading glyph
  22→20 (`CatchIconSize.control`) with the 32px divider inset.
- **ChatListTile** inbox divider → `fieldRowDivider` (0.38); inbox time now mono `t-meta`
  (was the sans `statusLabel`).
- **ContactRow** (club detail) glyph + value → ink (contact info never takes the
  action/activity color); value → `t-title-s`; trailing → `arrow-up-right`.
- **HostRow** (`_ClubHostRow`) → 40px avatar, condensed `t-name` (dropped the "Hosted by"
  prefix), owner verified seal-check, mono role meta line (replaced the role-badge pill).

**Wave 2 + Wave 3 — batch 3 (analyze-clean, 0 issues; tests green; goldens regenerated):**
- **`CatchJourneySteps`** (Wave 2 missing primitive) — new `lib/core/widgets/
  catch_journey_steps.dart`: mono index + traced node-rail (node + connecting line) +
  function title/body, auto-numbered, `journeySteps*` tokens. Replaced the dashboard
  `_DashboardJourneySteps` hand-roll (which used flat Dividers + a serif body).
- **Form box radius 8→12** — `CatchControlMetrics.radius(rounded)` now
  `interactiveTile` (12); every boxed input (text field, select trigger, picker/map
  tile, stepper) matches the DS box radius.

**Still open (Wave 3):** DashboardEventCard activity tint; DateTicket note/tail/dataEm/
sold-out states; ContactRow's mono channel eyebrow + hairline-circled glyph (structural
half); remaining form drift (field-label voice, stepper value/ends, PhotoStripField
add-first/cover). **EventTicket "Full"** is intentionally surfaced via `EventStatusPill`
(not a danger-red capacity-line split) — documented, not a gap. **Wave 2** remaining:
Callout, OptionCard, ClubDock, TicketStub card, shared HostRow/ContactRow/PhotoStrip/
Roster\*. **Wave 4** (composite screens) not started.

(The previously-noted pre-existing `app_shell_test_harness.dart:872` analyze error has been
resolved — `flutter analyze` is now fully clean, 0 issues.)

## Definition of done (per screen, handoff §6)

Renders from ported tokens/type/components only (zero ad-hoc styles); matches the
`templates/<slug>/` blueprint in layout, spacing rhythm, type roles, and copy; all
component-defined states present; holds at text-scale 2.0 and in dark mode.
