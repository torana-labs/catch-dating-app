---
doc_id: assignment_engine
version: 1.0.0
updated: 2026-11-08
owner: event_success
status: active
---

# Assignment Engine

One function places people into units for every Catch live format:
`runAssignmentEngine` in `functions/src/eventSuccess/assignmentOptimizer.ts`.
Trivia teams, dinner tables, racket pairs on courts, run pace pods and mixer
pods all call it. Each format asks for a different shape and gets back rounds
of units, a bench per round, cumulative time per person and an explanation.
This document owns the engine's request and response contract. The variable
model it serves is in
[`plans/event_success_variable_model_and_runtime_parity_spec.md`](plans/event_success_variable_model_and_runtime_parity_spec.md);
the persisted shapes are in [`data_contracts.md`](data_contracts.md).

Tracked by torana-labs/catch-dating-app#1602. The host-facing "How people mix"
choice in torana-labs/catch-dating-app#1166 is a presentation layer over this
engine.

## Shapes

A format describes its units through the saved `structureConfig`.
`plannerUnitSpec` translates it into one of four planner shapes
(`functions/src/eventSuccess/assignmentPlanner.ts`, `PlannerUnitSpec`):

| Ask | Shape | Saved structure |
|---|---|---|
| "3 groups of 8" | `count: 3` (sizes even) | `unitKind: teams`, `unitSize: 8`, `unitCount: 3` |
| "teams of 5" | `count` derived from size | `unitKind: teams`, `unitSize: 5` |
| "10 groups of 2" | `count: 10` | `unitKind: pairs`, `unitSize: 2` |
| "tables of 4-6" | `resource: {count, seatsPerUnit: 6, minSeats: 4}` | `unitKind: tables`, `resourceCapacity.seatsPerUnit: 6` |
| "pairs on 3 courts for 8 rounds" | `resource: {count: 3, seatsPerUnit: 4}`, `subunitSize: 2` | `unitKind: pairs`, `resourceCapacity: {court, 3, 4}`, cadence 15 |

Explicit size lists (`sizes: [6, 6, 4]`) are supported by the planner for
callers that already know them. Rounds come from the event duration divided
by the cadence (`rotationIntervalMinutes`); no cadence means one static round.
A resource holds at most `seatsPerUnit` people. On courts, when everyone
does not fit, the rest sit on the bench for that round; a doubles court runs
only full (`minSeats = seatsPerUnit`). Tables never leave a guest standing:
a table may run between two thirds full and full, and a roster larger than
the configured tables opens more tables of the same size.

## Request

`AssignmentEngineContext` carries:

- `participants`: uid, optional `arrivalGroup`, `activityAttributes`
  (a closed set of keys, below), and dating profile signals that only the
  opt-in romantic objective reads.
- `blockedPairs`: safety blocks. These are hard and never relaxed.
- `topology`, `rotationRoundCount`, `assignmentAlgorithm`,
  `compatibilityPolicy`, `matchingObjective`: the variable model.
- `constraints`: host keep-together, keep-apart and anchors; affinity
  constraints (`mustPair`, `mustSplit`, `avoidRepeat`); activity balance and
  cluster lists; the exclusion ledger seed.
- `softFeatures`: consented sign-up form answers, already verified per
  participant (`assignmentFeatureConsent.ts`), with host rules.
- `attributeObjectives`: generic `{attribute, mode, weight}` over
  `activityAttributes`.
- `arrivalGroupPolicy`: `keepTogether`, `spread` or `ignore`. Teams and
  tables default to `keepTogether`; other formats default to `ignore`.
- `spreadSoloArrivals`: defaults to true for teams.
- `history`: prior pair meetings, partnerships, opposition, seat neighbours
  and assigned minutes, for a later round or a later occurrence.
- `seed`: deterministic tie-break, normally the event id.

### Objectives

Every attribute objective uses one vocabulary, whatever its source:

| Mode | Meaning | Example |
|---|---|---|
| `balance` | each unit mirrors the pool's mix | spread colleges across hackathon teams |
| `cluster` | each unit is as uniform as possible | pace pods, skill-matched courts |
| `cover` | each unit holds as many distinct values as it can | UI/UX, frontend and backend on every team |
| `diversify` | members of a unit differ from each other | newcomer mixers |

Sources map onto it as follows:

- Host form rules: `preferSimilar` is cluster, `preferDifferent` is
  diversify, `balanceAcrossGroups` is balance, and `coverAcrossGroups` is
  cover.
- Saved activity lists: `balanceActivityAttributes` is balance, or cover when
  the matching objective is `spread`. `clusterActivityAttributes` is cluster,
  and `coverActivityAttributes` is cover.

Missing or withheld answers are neutral. Balance is measured against the people
active in the round, so a minority value is spread, not paired blindly.

The pair objective comes from `matchingObjective`:

- `romantic` reads mutual gender interest. It is used only when the
  `compatibilityPolicy` is `mutualInterestOnly`, which is the event's opt-in.
- `affinity` and `novelty` read event questionnaire answers under
  `questionnaireClueOnly`.
- `coverage` has no pair score. It still avoids repeats and honours every
  attribute objective.

When an objective's inputs are not permitted or absent, the engine reports a
fallback to coverage. It never quietly reads another signal.

The remaining terms of the cost function are:

- **Repeat avoidance:** prior meetings in any unit.
- **Partnerships and opposition:** for subunits such as doubles.
- **Seat neighbours:** for adjacency.
- **The repeat policy:** `avoid`, or `allowWhenExhausted` with
  `maxPairMeetings`.
- **Host constraints:** keep-together and anchors are strong soft terms.
- **Arrival groups:** handled by the arrival-group policy.

## Response

`AssignmentEngineResult` keeps the legacy `groups`, `groupRounds` and
`rotationRounds` fields that the callables persist, and adds:

- `plannedRounds`: `roundIndex`, `units` (`unitIndex`, `members`, optional
  `subunits` for partners, optional `seatOrder` clockwise), and `bench`.
- `timeLedger`: per uid `assignedMinutes`, `benchMinutes`, `assignedRounds`,
  `benchRounds`, `longestBenchStreak`.
- `history`: updated `pairMeetingCounts`, `partnerCounts`, `opponentCounts`
  and `neighborCounts`, keyed by the sorted `uidA__uidB` pair key.
- `explainability`: the existing metrics plus `engineCore`
  (`shapePlanner` or `legacyScorer`) and `planner`.
  - `planner` reports hard violations (always 0), repeated pairs, partners
    and neighbours, keep-together splits, anchor misses, and per-objective
    unmet units and missing values.
  - It also reports fairness: target minutes, minimum and maximum assigned
    minutes, assigned-round spread, and who is more than one round below
    their fair share.

## Fair resource time

When capacity is below the roster, each round's active set is chosen fairness
first:

1. the longest cumulative bench time
2. then the fewest assigned minutes
3. then the longest current bench streak
4. then a seeded per-round hash

Inside the last tier that crosses the capacity cut, the engine prefers people
who keep the active mix close to the pool mix on balance and cover
objectives. This keeps mixed doubles possible.

Bench time accrues from the existing exclusion-ledger seed (late check-in
included).

Worked case, pinned by `assignmentPlanner.test.ts`:

- 40 players, 3 doubles courts, a 2-hour event, 15-minute games: 8 rounds of
  12 players.
- Fair share is 36 minutes. Everyone plays 30 or 45 minutes (16 play three
  games, 24 play two).
- Nobody waits more than three games in a row, and no partnership repeats.
- The bench is told to mix in the common area.

The 40-minute exclusion alert keeps its meaning for formats without a bench.
For resource-bounded formats the planner's `belowFairShareUids` is the
meaningful signal.

## Safety and consent

These hold for every shape:

- **Hard constraints never break.** Blocked pairs and keep-apart pairs never
  share a unit. A host keep-together on a blocked pair loses.
- **Unplaceable people are benched.** Someone who cannot be placed safely goes
  to the bench and is reported. The engine never forces a violation.
- **Form answers are consent-gated.** They reach the engine only through
  `softFeatures` snapshots that the consent resolver checked against the
  event, form version, question, response and consent receipt.
- **Profile attributes are a closed set.** `activityAttributes` keys are
  `paceBand`, `skillBand` and `roleBand`, plus the sensitive `gender` and
  `ageBand`.
  - The server adds a sensitive key to a participant only when the event's
    saved structure names it (`optInProfileAttributesForStructureConfig`,
    `withOptInProfileAttributes`). Naming it is the per-event opt-in.
  - `ageBand` is a coarse band computed at event start, and is never derived
    for a minor. The engine never sees a birth date.
  - No format default selects a sensitive key.
- **Output is deterministic.** For the same request and seed, the output is
  the same whatever order the roster arrives in.

## Routing

`runAssignmentEngine` sends a request to the shape planner when any of these
hold:

- the algorithm is `teamBalancer` or `tableSeating`
- the request has `attributeObjectives` or `history`
- a host rule uses `coverAcrossGroups`
- a non-sequence topology has a seat-bounded resource (courts × 4, tables)

Otherwise the legacy scorer runs. That covers `pacePods`, `socialPods`,
`pairRotations`, and the `sequence` scheduler in
`generateEventSuccessRotations.ts`. Their behaviour is pinned by
`assignmentOptimizer.test.ts`, and they return the same uniform
`plannedRounds` and `timeLedger`.

Romantic scoring is gated on the `romantic` objective on both paths.

## Performance

Construction is greedy with seeded restarts:

- 12 restarts up to 60 active people
- 4 restarts up to 200
- 1 restart above that

A bounded swap search follows (250,000 evaluations per round).

Measured in a cloud development container:

| Case | Time |
|---|---|
| 40 players on courts, 8 rounds | 0.5 s |
| 300 people into teams of 10 | 1.6 s |
| 1,000 people into teams of 8 (the roster cap) | 5.8 s |

## Format bindings

| Format | Algorithm | Shape | Defaults |
|---|---|---|---|
| Pub quiz | `teamBalancer` | teams of 5 | arrival groups together, solo arrivals spread; standings reveal |
| Dinner | `tableSeating` | tables (adjacency), course cadence | arrival groups together, seat order, no repeated tablemates when the table count allows |
| Pickleball / racket | `pairRotations` | courts × 4 with partner subunits, or singles sequence | fair court time, no repeat partners until exhausted |
| Social run | `pacePods` | pods | pace cluster |
| Mixer | `socialPods` / `pairRotations` | pods or pairs | romantic only with `mutualInterestOnly` |

Quiz and dinner use the group assignment tool (`micro_pods`). Guided rotations
stay two-person pairs.

## Not yet built

- **Doubles persistence and display.** The engine schedules partners and
  opponents on courts. The rotation callable still persists one-to-one pair
  slots, and the companion shows one peer, so live doubles needs the slot
  schema and companion work first. Until then, `generateEventSuccessRotations`
  refuses a court with more than two seats, rather than silently producing no
  rounds.
- **Legacy cores.** Pace pods, social pods and pair rotations still run on
  the legacy scorer. Moving them onto the planner needs parity tests against
  the current romantic and fairness pins.
- **Cover for activity attributes.** `coverActivityAttributes` is stored and
  honoured, but no host editor writes it yet. Form-question cover is in both
  host rule sheets.

## Open owner decisions

1. **Who may opt into gender and age band.** The editor offers them to pair
   formats, and keeps them visible once chosen.
2. **The doubles companion moment.** It must show the partner, the opponents,
   the court, and "mix in the common area" while on the bench.
3. **Persisting history across occurrences.** Should history be kept per
   organiser so a weekly event avoids last week's pairs? The engine accepts
   history; where it is stored is not yet decided.
