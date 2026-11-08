---
doc_id: assignment_engine_ui_spec
version: 1.0.0
updated: 2026-11-08
owner: event_success
status: active
---

# Assignment Engine And Event Properties: Host And Guest UI Specification

## Goal

A host can run every live format end to end on the one assignment engine
([`../assignment_engine.md`](../assignment_engine.md)) and the event-property
live rules (phone availability, `continuous` dinner, `routeStops` crawls) that
merged in torana-labs/catch-dating-app#1610 and #1611. This document lists
every host and guest surface that reads, or should read, those two features.
It records what each surface does today and specifies the work left.

It is a delivery plan. The engine contract stays in `assignment_engine.md`.
Persisted shapes stay in `data_contracts.md` and `contracts/**`. The variable
model stays in
[`event_success_variable_model_and_runtime_parity_spec.md`](event_success_variable_model_and_runtime_parity_spec.md).
When a slice ships, its contract moves into those owners. That slice's
section here then shrinks to a pointer.

**Scope.** Flutter host and guest app, plus Functions and contracts as needed.

**Exclusions.** `website/` (a parallel thread owns the guest web runtime) and
Admin.

**Design reference.** The "Catch directions" Design canvas, page "Host app ·
rebuilt": RbLiveQuizTeams, RbLiveDinnerRules/Seat/Room/Swap, RbAppDinnerAfter,
RbLiveCourtsHost/Setup/Guest, RbLiveRules, RbHostRunReport,
RbHostCourtsReport, RbLiveCrawlArrive, RbLiveCrawlSweep and RbAppLiveArrive.
They are drawn with `packages/catch_ui` primitives (ChoiceCard, ListRow,
Section, Stat, Notice, Surface spotlight). Builds use the matching Catch UI
widgets, not new ones.

## Owner-decision defaults

These are the defaults this plan builds. The owner may override them.

| Decision | Default |
|---|---|
| Who may opt into gender and age band | Pair, team and table formats. Always off by default; the host turns them on per event; guests see them as optional. |
| Doubles companion | Shows partner, opponents and court. On the bench it says "mix in the common area". The doubles live flow ships, with rotation slots that hold more than one peer. |
| Meeting history | Persists per organiser across occurrences. Private, last 90 days. A weekly event avoids last week's pairs. |
| Existing crawl events | Future-dated crawls migrate to `routeStops`. Past events and the Hyderabad demo crawl stay as they are. |
| Host check-in after an arrival-only event starts | The push is deferred to the next planned stop, not dropped. |

## Audit

Status at `99e6936c` (main after #1611). **Built** means a host or guest can
use it today. **Partial** means part of it exists or it is unreachable.
**Missing** means nothing exists.

### Host

| Surface | Status | Where | Gap |
|---|---|---|---|
| Unit-shape picker | Partial | `lib/event_success/presentation/event_success_structure_config_editor.dart` (unit kind, size, count) inside `event_success_setup_body.dart` "How the room is grouped" | No courts × seats or "tables of 4–6" range. Size is clamped to 3–8. |
| Courts setup | Partial | `lib/hosts/live/formats/formats_courts_setup_*` | Courts, minutes and aim. `seatsPerUnit` (singles or doubles) is not editable. |
| Balance / cluster on activity attributes | Built | structure editor | — |
| Cover on activity attributes | Missing | structure editor reads `coverActivityAttributes` but no row writes it | Editor row |
| Form-question rules incl. `coverAcrossGroups` | Built | `host_setup/event_success_assignment_feature_rule_sheet.dart`, `lib/hosts/live/formats/widgets/formats_rule_sheet.dart` | The "aim" control and "with these rules" stats are not drawn (`formats_rules_body.dart` doc comment). |
| Gender / age band opt-in | Partial | structure editor `_offeredAttributes` | Offered to pairs only. No consent copy. No guest notice. |
| Arrival-group policy | Missing | `EventSuccessArrivalGroupPolicy` exists only in the model | Editor row |
| Repeat avoidance | Built | structure editor (rotating formats) | — |
| Court-time fairness preview | Partial | `formats_courts_setup_body.dart` shows partners and rounds after a generate | No minutes each or bench size before generating |
| Groups preview with explanation before live | Partial | `assignments/event_success_host_pod_section.dart`, `…_rotation_section.dart`, `event_success_assignment_reason_notice.dart` on the live tab | Not in setup. No planner summary (objectives met, repeats, fairness). |
| Readiness | Built (basic) | `EventSuccessHostDraft.readinessIssues`, `host_setup/event_success_readiness_field.dart` | No checks for doubles court sizing or a sensitive attribute without consent copy. |
| Phone rule per module | Built | module reasons carry `eventSuccessPhoneAvailabilityNote` | — |
| Phone override | Missing | Override is read from `format.eventSuccessPrimitives.phoneAvailability` (`rules.dart` `_phoneAvailabilityFor`) and saved by `normalizeEventSuccessFormatPrimitives`; no host control writes it | Setup row |
| Send a card to a table (`continuous`) | Missing | Policy allows `midStep` for `continuous`; no control or callable | Control and callable |
| Quiz teams console, Shuffle again | Built | `lib/hosts/live/formats/formats_mix_*` (`generateEventSuccessPods`) | "Keep the team names" not drawn |
| Dinner seat, re-seat by course, seat order, swaps | Missing | `seatedTable` has no format view; only the generic `EventSuccessGroupOverrideSheet` | Console. Seat order is computed by the planner and not persisted. |
| Courts board | Partial | `formats_courts_*` (rounds, Rotate now, Sitting out, Fair so far) | No per-player minutes, no swap or keep-apart on the board, no doubles. |
| Crawl stops console | Partial | `formats_crawl_*` (Stop N, Move everyone, change stop) | Not routed from `hostLiveFormatView` (`live_controller.dart`), so no screen opens it. Same for `formats_pods_*`. |
| First hello | Built | mix console switch; guest `companion_parts/event_success_companion_arrival_card.dart` | — |
| Departure / sweep marking | Built | `host_live/event_success_accountability_section.dart`, `event_assistance_live_sweep_section.dart` | — |
| Report: court time per person, mixing summary | Missing | `host_report/event_success_host_report_page_body.dart`, `lib/hosts/insights/host_event_report_state.dart` | Sections |

### Guest

| Surface | Status | Where | Gap |
|---|---|---|---|
| Consent for form answers | Built | `EventAssignmentFeatureChoicesPageBody`, `setEventAssignmentFeatureConsent` | — |
| Optional gender / age questions | Partial | Profile-derived; the event opt-in is server-side | No guest notice that the host opted in, and no withhold choice |
| Team / table reveal | Partial | `MicroPodCard`, `GroupRotationSlotRow`, `reveal/…attendee_reveal_surface.dart` | No seat neighbours |
| Doubles companion | Missing | `RotationSlotRow` shows one `peerUid`; `sitOutSlots` unread | Partner, opponents, court, bench |
| Passive step when phones are off | Built | `EventSuccessRuntime.phoneAway`, `event_success_moment_presentation_state.dart` | — |
| Crawl stop card | Partial | generic `LiveStepContextCard` | No "Stop N of M" card |
| Skip on every prompt | Partial | First hello has Skip | `StagePromptCard`, `StageConversationCueCard` have none |
| After | Built | `companion_parts/event_success_companion_afterglow_card.dart` | — |

## Specification

### 1. Host setup: "How people mix"

The setup section "How the room is grouped" becomes the one "How people mix"
editor (#1166). It is shared by create defaults and Host Manage
(`EventSuccessSetupBody`).

**Unit shape.**
- Keep the existing kinds.
- For `tables`, the size stepper labels the range: "Tables of 4–6" means
  `seatsPerUnit = 6` with a two-thirds floor, as the engine rule says.
- Courts: the courts setup gains "Singles" or "Doubles" (`seatsPerUnit` 2 or
  4). Doubles is allowed once slice 3 lands.

**Mixing objectives per attribute.** For each offered activity attribute, the
host picks one of these, replacing the two chip rows:

| Choice | Saved as |
|---|---|
| Spread evenly | `balanceActivityAttributes` |
| Keep similar together | `clusterActivityAttributes` |
| A mix in every group | `coverActivityAttributes` |
| Doesn't matter | none |

An attribute appears in at most one list. Form-question objectives stay in the
rule sheet, where `coverAcrossGroups` already exists.

**Gender and age band.** Offered for `pairs`, `teams` and `tables`; never
pre-selected. When either is selected, a neutral Notice shows the consent copy:

> Used only to shape groups at this event. Guests can leave it out, and
> anyone who does is grouped by the other rules. Nobody else sees it.

A saved choice stays visible on any kind, so it can be removed.

**Arrival groups.** One choice row: "People who booked together" →
"Keep together" (`keepTogether`) / "Split up" (`spread`) / "Doesn't matter"
(`ignore`). The current default is shown and saves as null until changed.
Teams and tables default to keep together; others to doesn't matter.

**Repeat avoidance.** Unchanged (rotating formats). Add one read row when the
event recurs: "Avoids pairs from the last 90 days at your events" (slice 3).

**Court-time fairness preview.** A pure Dart estimate,
`estimateCourtTime(players, courts, seatsPerCourt, minutesPerGame,
eventMinutes)`. It follows the engine's capacity rule: a doubles court runs
only full. It returns:
- rounds
- players active per round
- bench per round
- fair share in minutes
- minimum and maximum minutes each

Shown as a Notice: "About 36 min each · 28 on the bench per round". Under it:
"40 players on 3 courts: 12 play each round." The engine stays the source of
truth after generation.

**Preview with explanation.** Setup shows a "Preview the groups" action when
a roster exists. It calls the existing generate callable in a non-publishing
mode. It shows the units and a summary from the planner explainability:
- objectives met, with unmet units per objective
- repeated pairs
- keep-together splits
- fairness spread

The live tab keeps its generate and override sections.

**Readiness.** Add these issues:
- doubles courts while doubles persistence is unavailable;
- a sensitive attribute on a kind that may not offer it.

**Phones.** A "Phones during the event" row lists the five availability
values. It is labelled with the resolved default ("Recommended") and the
existing phone note. Choosing a value writes
`format.eventSuccessPrimitives.phoneAvailability` through the event update
the screen already uses. Choosing the recommended value clears the override.
Module reasons already restate the rule.

### 2. Phone availability live controls

- The live console header shows the resolved rule in one line, such as
  "Phones away during rounds".
- **Send a card to a table** (`continuous` only). A console action opens a
  sheet:
  1. choose a table (unit) or everyone;
  2. pick a conversation card or type one line;
  3. send.

  It is backed by a new callable, `sendEventSuccessTableCue`. The callable
  checks organiser manager rights. It checks `eventSuccessGuestCueAllowed(…,
  "midStep")` and refuses otherwise. It writes one moment per member through
  the existing moment path. It reuses the dedup key shape of the live command
  receipts.

### 3. Live console

Routing: `hostLiveFormatView` adds `seatedTable` → dinner, `routeStops` →
crawl and `pacePods` → pods, so the existing crawl and pods consoles become
reachable.

- **Quiz.** Keep "Shuffle again". Add a read line with the planner summary
  ("6 teams of 5 · solo arrivals spread · 0 repeats").
- **Dinner (RbLiveDinnerRoom).** A table grid (ChoiceCard tiles, "n of 6").
  Selecting a table lists its members in `seatOrder`, with neighbours. Actions:
  - "Swap seats" through the group override path;
  - "Re-seat for the next course", which generates the next round with the
    same history;
  - "Seat a late arrival" at the table with a free seat that the planner
    scores best.

  Courses use the run-of-show course labels.
- **Courts (RbLiveCourtsHost).** Rounds header and Rotate now (built). Each
  court shows two partnerships "against" each other. "Sitting out" shows per
  player "N min on court · M off" and "Plays next". "Fair so far" adds "most
  court time apart". Host edits:
  - swap two players in the next round;
  - keep two people apart.

  Both go through the existing `overrideEventSuccessRotations` and
  keep-apart constraints, so the safety rules stay server-side.
- **Crawl (RbLiveCrawlHost / Sweep).** "Stop N of M", Move everyone, first
  hello status (who has said hello), and the existing sweep marking.

### 4. Guest companion

- **Team / table reveal (RbAppLiveArrive, RbLiveDinnerSeat).** "You're on
  <team>" / "Table 3", members, and for tables "Next to you: Rhea and Kabir"
  from `seatOrder`. A course re-seat shows "Moved from Table 4" (RbLiveDinnerSwap).
- **Doubles companion (RbLiveCourtsGuest).** "Court 2 · You and Tara ·
  against Nikhil and Zoya". On the bench: "You're sitting out this round · mix
  in the common area". The guest also sees their evening list and "min on
  court".
- **Phones off.** The existing passive step context, with no prompt.
- **Crawl stop card (RbLiveCrawlArrive).** "Stop 2 of 4 · Toto's Garage",
  the group and the next move time.
- **Skip.** Every prompt card (first hello, stage prompt, conversation cue)
  has Skip and the line "You can skip any prompt." Skipping records nothing
  personal; it dismisses the cue for this step.
- **Gender / age.** When an event's structure names a sensitive attribute, the
  guest's event preferences show "This host balances groups by <gender / age
  band>. Leave it out" with a switch. Withheld is neutral in the engine, the
  same as a missing answer.

### 5. Reports

- **Court time per person (RbHostCourtsReport).** "Court time 38–42 minutes
  each" and a list sorted by minutes, from the persisted time ledger.
- **Mixing summary.** New faces met per person (median), repeated pairs,
  objective results ("every team had a first-timer") and keep-together splits.

### Backend completions

| Need | Change |
|---|---|
| Doubles persistence | Rotation slots gain `partnerUid`, `opponentUids` and `courtIndex`. `peerUid` stays the partner, for older clients. The rotation callable persists planner subunits on paired courts and drops the `seatsPerUnit > 2` refusal. |
| Bench | Sit-out slots carry `benchNote: "commonArea"`. |
| Time ledger | `rotationFairness` gains `assignedMinutes` and `benchMinutes`. |
| Seat order | Group assignments gain `seatOrderUids` per unit and `seatNeighborUids` for the member. |
| Planner summary | Assignment generations persist `assignmentSummary` (engine core, objective results, repeats, splits, fairness) on the plan for the console and report. |
| Meeting history | `organizerAssignmentHistory/{organizerId}/pairs/{pairKey}` holds `meetings`, `lastMetAt` and `expiresAt` (90 days, TTL). It is written after a publish, read into the engine `history`, and server-only in rules. |
| Deferred check-in push | When `eventSuccessGuestCueAllowed` blocks the host check-in push after the start, a `pendingCues` entry is queued on the plan. The step-change path sends it at the next non-activity step. |
| Crawl migration | A dry-run-first operation sets `interactionModel: routeStops` on future crawl events still on `freeFormMixer`. It skips past events and the Hyderabad demo seed. |
| Table cue | `sendEventSuccessTableCue` callable (above). |

## Delivery slices

One PR per slice. Each runs Functions `npm test` and lint, the Flutter
workspace analyzer and the affected Flutter suites, because CI is off on pull
requests during the redesign sprint.

1. **Spec** (this document) and the stale quiz-readiness test from the #1611
   merge.
2. **Host setup:**
   - objective-per-attribute row with cover;
   - arrival groups;
   - sensitive attributes for pairs, teams and tables with consent copy;
   - court-time estimate;
   - phone override row;
   - readiness.
3. **Backend completions:**
   - doubles slots;
   - time ledger fields;
   - seat order;
   - planner summary;
   - organiser history;
   - deferred check-in push;
   - crawl migration;
   - table-cue callable.

   Includes Dart model fields.
4. **Live console:** routing, dinner console, courts minutes and doubles,
   crawl reachability, send a card.
5. **Guest companion and reports:** doubles companion, seat neighbours, Skip
   everywhere, crawl stop card, court-time and mixing report sections.

## Acceptance

- A host can configure every row in section 1 and see it saved in
  `structureConfig` or the format primitives.
- 40 players on 3 doubles courts for 2 hours previews as "about 36 min each
  · 28 on the bench".
- Doubles publish and the guest sees partner, opponents and court.
- Dinner guests see their table and seat neighbours. The host can swap
  seats and re-seat by course.
- Crawls open the crawl console from Live.
- Every guest prompt has Skip.
- The report shows court time per person and the mixing summary.
