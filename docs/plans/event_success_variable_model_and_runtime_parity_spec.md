---
doc_id: event_success_variable_model_and_runtime_parity_spec
version: 1.11.0
updated: 2026-08-14
owner: event_success
status: active
---

# Event Success Variable Model And Runtime Parity Specification

## Decision

Event Success becomes one parameterized facilitation engine whose behavior is
fully determined by a closed set of declared event variables. There is no
per-event-type code fork. A run club, a quiz night, a dinner, and a pickleball
tournament are four points in one variable space, and every unsupported
combination resolves to an explicit `unsupported` endpoint rather than to
undefined behavior.

Dating is not a mode of the product. It is one value of one variable.

The host's live surface is spatial. The room map is the primary rendering of
live event health, not a seating chart and not an attendee-facing seat picker.
Guests are never asked to choose a position — self-selection defeats the
facilitation the product exists to provide.

The attendee ceremony must be equivalent on the Flutter companion and the
no-app web runtime. Equivalence is defined as **identical choreography** —
same beat, same instant, same deterministic seed — and explicitly **not** as
identical pixels. Choreography is contracted and generated into both languages.
Marquee visuals are authored once as portable assets. Micro-interactions are
allowed to diverge.

## Specification Purpose

This is a reviewed implementation contract. A lower-context implementation
agent must be able to take one numbered tranche below, inspect only the named
owner files, and prove it with the named tests, without re-deciding product
scope.

It does not authorize production implementation by itself. Contract/schema
changes, screen contracts, preview coverage, provider work, and deployment
remain normal reviewed changes under their existing owner docs.
[docs/event_success.md](../event_success.md) remains the source of truth for
the existing Event Success layer; this document owns the deltas below and must
be folded into it when the tranches close.

## Verified Current State

Findings from a 2026-08-13 read of the tree. Do not re-derive these.

1. **The variable model already exists and is good.**
   [lib/contexts/formats/domain/event_success_activity_profile/enums.dart](../../lib/event_success/domain/event_success_activity_profile/enums.dart)
   declares `EventSuccessPhoneAvailability`, `EventSuccessRotationSuitability`,
   `EventSuccessAssignmentAlgorithm`, `EventSuccessCompatibilityPolicy`, and
   `EventSuccessRecommendationLevel` (including `unsupported`).
   [event_success_structure.dart](../../lib/event_success/domain/event_success_structure.dart)
   declares `EventSuccessUnitKind`, `EventSuccessRotationRepeatStrategy`, and
   `EventSuccessActivityAssignmentAttribute` with distinct `balanceLabel`
   (spread) and `clusterLabel` (cluster) semantics.

2. **Declared algorithms exceed implemented algorithms.**
   `EventSuccessAssignmentAlgorithm` declares six values (`none`, `pacePods`,
   `socialPods`, `pairRotations`, `teamBalancer`, `tableSeating`). The backend
   implements two — micro-pods and pair rotations
   ([generateEventSuccessPods.ts](../../functions/src/eventSuccess/generateEventSuccessPods.ts),
   [generateEventSuccessRotations.ts](../../functions/src/eventSuccess/generateEventSuccessRotations.ts)).
   `teamBalancer` and `tableSeating` silently resolve to an implemented
   neighbour. This is the single largest gap in per-format utility.

3. **The optimizer is inert for non-dating events.**
   [compatibilityPolicy.ts](../../functions/src/eventSuccess/compatibilityPolicy.ts)
   sets `MUTUAL_INTEREST_SCORE = 100`, `ONE_WAY_INTEREST_SCORE = 15`,
   `SOCIAL_FALLBACK_SCORE = 1`, questionnaire boost 10/25. Without
   gender-interest data every pair scores the social constant, so the 2,192-line
   optimizer in
   [assignmentOptimizer.ts](../../functions/src/eventSuccess/assignmentOptimizer.ts)
   degenerates to fairness ordering and repeat avoidance.

4. **The theatrical layer is Flutter-only.** The kinetic work (animated
   motifs, idle pulse, reveal cinematic with deterministic particle seed,
   co-presence rings, audio beds) lives in
   [lib/event_success/presentation/](../../lib/event_success/presentation/),
   driven by `EventSuccessMomentPresentation.forMoment`
   ([event_success_companion_screen_state.dart:698](../../lib/event_success/presentation/event_success_companion_screen_state.dart)).
   The web runtime at
   [website/src/features/eventRuntime/EventRuntimePage.tsx](../../website/src/features/eventRuntime/EventRuntimePage.tsx)
   renders assignments as plain `<article>` markup. It correctly gates on
   `revealStatus` (`EventRuntimePage.tsx:236`), so the **synchronization
   contract exists and the ceremony does not**.

5. **The web runtime shipped inside the marketing site, not a separate
   workspace.** [docs/event_success.md](../event_success.md) specifies a
   dedicated `runtime/` workspace and Firebase Hosting target `runtime`. Neither
   exists. Hosting targets are `marketing`, `app`, `host`, `admin`. Treat the
   doc's `runtime/` section as **stale** and this document as authoritative:
   the guest runtime lives at `website/src/features/eventRuntime/` and shares
   `packages/web-ui`.

6. **Live control robustness is deferred by design.**
   [docs/event_success.md](../event_success.md) states that offline queueing,
   revisioned undo, pause, conflict/lock authority, and process-death recovery
   are promotion gates rather than production controls.

7. **First Hello attendance still writes through GPS.** The contract specifies
   a short-lived signed venue session; the tracker records that the GPS
   self-check-in callable remains the attendance write path, with an open item
   to validate the 100m radius on physical venues
   ([docs/event_success_theatrical_experience_tracker.md](../event_success_theatrical_experience_tracker.md)).

8. **Setup exposes 14 modules.** A gated Phase 4 consolidation prototype
   exists under `Event Success / Phase 4 owner review` in Widgetbook, blocked
   on owner approval, proposing one "How people mix" choice and a five-decision
   visible tool set.

---

# Part A — The Variable Model

## A.1 Principle

Every Event Success behavior resolves from the event's declared variables
through one pure function per platform. Screens and generators never branch on
`ActivityKind` directly. Adding an event type means adding a variable *binding*,
never a code path.

The variable space is finite and every combination has a defined endpoint. A
combination that cannot be served resolves to `unsupported` with a reason
string, which is a first-class product state, not an error.

## A.2 Separation of the two compatibility axes

`EventSuccessCompatibilityPolicy` is retained unchanged and **re-scoped** to
mean *which signals the event is permitted to use* — a consent and data-access
axis. A new variable owns *what the optimizer maximizes*. Do not merge them and
do not migrate existing policy values.

```text
compatibilityPolicy  -> which signals may be read   (privacy/consent)
matchingObjective    -> what the optimizer maximizes (product)
```

Today's production behavior is exactly
`compatibilityPolicy: mutualInterestOnly` + `matchingObjective: romantic`.

## A.3 New variable — `matchingObjective`

| Value | Maximizes | Primary formats |
| --- | --- | --- |
| `coverage` | distinct people each attendee is grouped with | **default for every format** |
| `romantic` | mutual-interest pairs | singles mixer, speed meeting |
| `affinity` | shared questionnaire answers | dinner, book club, interest meetup |
| `novelty` | dissimilarity between grouped attendees | networking, newcomer social |
| `balance` | minimize attribute variance *between* units | competitive tournament, quiz |
| `spread` | maximize attribute variance *within* units | casual mixed doubles, social quiz |

`coverage` is the required default. It must produce a meaningful, explainable
assignment with **zero profile data and zero questionnaire answers**. It is the
honest fallback for every non-dating event and it replaces the current
accidental behavior where the social constant collapses scoring to fairness
ordering alone.

`balance` and `spread` read `EventSuccessActivityAssignmentAttribute`
(`paceBand`, `skillBand`, `roleBand`) and reuse the existing `balanceLabel` /
`clusterLabel` semantics for host-facing copy. Do not introduce new attribute
enums.

## A.4 New variable — `resourceCapacity`

```json
{
  "resourceCapacity": {
    "concurrentUnits": 3,
    "resourceLabelId": "court",
    "seatsPerUnit": null
  }
}
```

Declares how many units can be active simultaneously (courts, tables, lanes,
boards). Null means unconstrained.

When `concurrentUnits` is less than the number of generated units, the engine
must schedule across rounds and produce an explicit **sit-out set per round**.
Sit-outs are fairness-tracked (see A.8) and surfaced to the attendee as a first
class moment with a reason, never as an empty screen. Sit-out fairness is the
same ledger as D.1, not a parallel counter.

`seatsPerUnit` is only meaningful with `topology: adjacency`.

## A.5 New variable — `unitOutcome`

| Value | Meaning |
| --- | --- |
| `none` | units produce no recorded result (dinner, mixer) |
| `completion` | units are marked done/not done (run segment, mission) |
| `score` | units accumulate a numeric score (quiz round) |
| `rank` | units are ordered against each other (tournament) |

When `unitOutcome` is `score` or `rank`, the event gains a standings projection
and the existing synchronized reveal ceremony becomes reusable with a standings
payload instead of an assignment payload. **Do not build a second ceremony.**

## A.6 New variable — `topology`

| Value | Meaning | Engine |
| --- | --- | --- |
| `set` | membership only — who is in this unit | implemented (pods, pairs) |
| `sequence` | ordered opposition — who meets whom, in what order | **T6** |
| `adjacency` | position within a unit — who is beside/across from whom | deferred, see A.12 |

`set` is the current implicit behavior. `sequence` is what a tournament,
bracket, or round-robin requires and is what `resourceCapacity` schedules
against.

## A.7 New variable — `durationShape`

`continuous | rounds | courses | segments`

Gives the run-of-show a shape so "next" has defined meaning, and so beat
transitions can be labelled in the host's own vocabulary (Round 3, Second
course, Leg 2). The existing flat `EventRunOfShowStep` list is retained; this
variable only adds grouping and labelling semantics.

## A.8 New variable — `accountability`

| Value | Meaning |
| --- | --- |
| `none` | no end-of-event body count |
| `rollCall` | host confirms each attendee is present at a declared beat |
| `sweep` | host resolves checked-in attendees to returned/departed and explicitly acknowledges any unresolved guests before completion |

`sweep` raises a loud Host warning while any checked-in attendee is unresolved,
but it does not hard-block completion. The Host can review the list or choose
`Finish anyway` with explicit acknowledgement. This preserves the run-club and
outdoor-activity safety aid without treating a quiet or unannounced departure
as an incident.

Departure resolution also feeds A.9.

## A.9 New variable — `affinityConstraint`

Pairwise attendee constraints, generalizing the existing safety keep-apart
edges:

| Value | Meaning |
| --- | --- |
| `mustPair` | keep these attendees in the same unit |
| `mustSplit` | never place these attendees in the same unit |
| `avoidRepeat` | deprioritize regrouping across occurrences |
| `neutral` | default |

The primary input is a new `arrivalGroup` field on `eventAttendees`, populated
by the roster adapter from provider group/ticket-buyer structure. This is the
same data currently discarded during CSV import, and it resolves three problems
with one field: group-booking claim ambiguity, friends who never mix, and
seating a couple together.

Safety keep-apart edges always win over any host-declared `affinityConstraint`.

### Constraint authoring through direct manipulation

A host reassignment made through the spatial control room (A.11, D.2) **writes
an `affinityConstraint`. It is never a bare data edit.** Every reassignment
carries a scope:

| Scope | Meaning |
| --- | --- |
| `thisRound` | one-time override; the next generated round ignores it |
| `pinned` | survives regeneration until the host explicitly releases it |

`pinned` is the default when the host moves an attendee toward a named
attendee. `thisRound` is the default when the host moves an attendee into a
capacity gap. A regeneration that silently undoes a host's manual move is a
trust failure and fails review.

## A.10 Format bindings

`EventSuccessActivityProfile` gains bindings for the new variables. Bindings are
**defaults, not locks** — the host may override any variable that is `selectable`
for the format.

| | Run club | Quiz night | Dinner | Pickleball |
| --- | --- | --- | --- | --- |
| `phoneAvailability` | noneDuringActivity | plannedPauses | arrivalAndPostEventOnly | plannedPauses |
| `unitKind` | pods | teams | tables | pairs |
| `topology` | set | set | adjacency | **sequence** |
| `durationShape` | segments | **rounds** | **courses** | **rounds** |
| `unitOutcome` | completion | **score** | none | **rank** |
| `resourceCapacity` | null | null | tables × seats | **courts** |
| `accountability` | **sweep** | none | none | none |
| `matchingObjective` | affinity (pace) | spread | affinity | balance |
| `assignmentAttribute` | paceBand | — | — | skillBand |
| layout shape (A.11) | zone | round | round/rect | court |
| map value | wayfinding only | unit health | placement + rotation | scheduling + sit-outs |

## A.11 Spatial layout model

The layout exists to serve the host's live comprehension first and placement
second. It is a **schematic model of the room, not a to-scale venue drawing**.

### Stored form

Store the parametric spec. Derive positions and edges. Never store derived
output.

```json
{
  "layoutId": "organizer-owned-id",
  "label": "Bandra studio",
  "units": [
    {
      "id": "t1",
      "label": "1",
      "shape": "round | rect | row | court | zone",
      "capacity": 8,
      "gridX": 0,
      "gridY": 0,
      "order": 1
    }
  ]
}
```

Layouts are **organizer assets, not event assets.** A dinner series, spin
studio, or run club reuses one room indefinitely. Authoring cost amortizes
across occurrences, and a saved layout is selected at event creation. An
event-scoped layout would make even two minutes of authoring not worth
spending.

`order` carries the traversal sequence used for rotation (which table follows
which). It is distinct from proximity and from adjacency.

### Derived edge sets

Two distinct sets, both derived, neither stored:

| Edge set | Meaning | Consumed by |
| --- | --- | --- |
| `unitProximity` | which units are physically near which | rotation cost, spatial dead-zone detection, "place this pod near that one" |
| `seatAdjacency` | which seats are beside or across from which | deferred, see A.12 |

`unitProximity` is deliberately coarse — grid distance between units is
sufficient. It is what makes D.2 work, and it is cheap. It also prevents
rotations that move the entire room simultaneously.

### Rendering and parity

The layout is data, so both runtimes render it from the same contract in one
normalized coordinate space. **This is the cheapest parity case in the
product** — no authored animation, no Rive dependency, no timing problem.

### Fidelity policy

Schematic layout plus physical unit labelling (numbered table tents, bike
numbers, court signs) is the required approach. The label carries the host's
pattern-match; map fidelity does not. **Do not build a to-scale venue editor.**
Host tweaks (move a unit, disable a seat, ragged rows) are incremental
additions to the parametric form, not a drawing canvas.

## A.12 Explicitly deferred

`seatAdjacency` and the `tableSeating` engine remain **deferred**. Seat-level
adjacency — who sits beside versus across from whom — has exactly one launch
format, and the dinner host's live pain is dietary handling and the mid-meal
seat change rather than optimal adjacency. Until its engine ships,
`tableSeating` and `topology: adjacency` must resolve to `unsupported` with an
honest reason rather than silently falling back to micro-pods.

This deferral does **not** block A.11 or D.2. The room map needs
`unitProximity` only.

## A.13 Defined endpoints requirement

There must be one generated resolution table asserting the resolved behavior for
every legal variable combination, and one `unsupported` reason for every illegal
one. A combination absent from the table is a build failure, not a runtime
default. This table is the contract that keeps the space closed.

---

# Part B — Web / App Runtime Parity

## B.1 The actual requirement

Attendees are in the same room holding different devices. What breaks the
illusion is **desynchronized timing**, not divergent pixels. Two bursts that
look slightly different at the same instant read as fine. Two bursts three
seconds apart read as broken.

Therefore:

- **Choreography must be identical and is contracted.**
- **Marquee visuals should be authored once and played by both runtimes.**
- **Micro-interactions may diverge and should not be unified.**

Do not attempt hand-maintained visual parity between Dart `CustomPainter` code
and CSS/Canvas. That is the failure mode this section exists to prevent.

## B.2 Layer 1 — contract the choreography (required)

Promote `EventSuccessMomentPresentation`
([event_success_companion_screen_state.dart:698](../../lib/event_success/presentation/event_success_companion_screen_state.dart))
from a Dart-only presentation class into a generated contract under
`contracts/catalogs/`, emitted to both `lib/core/schema_contracts/generated/`
and `functions/src/shared/generated/`, and consumed by the web runtime through
the existing generated-types pipeline.

The contract owns, per moment kind:

- palette/token id and motif id;
- phase durations (anticipation / climax / settle) in milliseconds;
- tempo and idle-pulse period;
- particle density and the **deterministic seed derivation rule**;
- the server-anchored clock reference (`revealStartedAt +
  structureConfig.revealCountdownSeconds`, already implemented);
- ambient bed id (see B.5).

Both runtimes derive every timing value from the same server anchor and the same
seed rule. This layer alone delivers most of the perceived parity and costs
little, because the contract codegen pipeline already emits Dart and TypeScript.

## B.3 Layer 2 — author marquee visuals once

Recommended approach: **Rive**, which has first-class Flutter and web runtimes
and a state-machine input model, so one `.riv` artboard is driven by the same
contracted inputs (`countdownProgress: 0.0–1.0`, `trigger: reveal`,
`participantCount: n`) on both platforms. Updating an animation becomes
replacing an asset, with no code change on either side.

Scope to the small set that actually carries the ceremony:

1. reveal cinematic (anticipation → climax → settle);
2. arrival co-presence ring;
3. stage motif backgrounds (theatrical / pulse / sunrise).

This is a **net reduction** in code — the corresponding hand-written
`CustomPainter` motifs and `_RevealCinematicOverlay` phases are deleted, not
duplicated.

Required spike before committing (T13 gate): confirm the web runtime bundle cost
is acceptable on a mid-tier Android device over a congested venue network, and
confirm the Flutter and web runtimes render the same artboard identically at the
same input values. If the spike fails, fall back to Lottie for playback-only
motifs plus contracted CSS transforms for the driven countdown; the Layer 1
contract makes that fallback acceptable rather than a rewrite.

### T13 spike result — fallback selected

The 2026-08-14 production-bundle spike rejected Rive for this venue-network
surface. Against a minimal React baseline of 59.63 KB gzip, the current
`@rive-app/react-canvas-lite` path added 49.13 KB gzip of JavaScript, a
326.40 KB gzip canvas-lite WASM runtime, and a 58.79 KB sample `.riv` artboard:
about 434 KB of incremental compressed transfer before Catch page content. The
current Event Runtime route chunk was 10.21 KB gzip. That cost fails the
congested-network gate, so the conjunctive same-artboard rendering comparison
did not proceed after the cost failure.

The specified fallback is therefore authoritative: three checked-in Lottie
vector assets (`theatrical`, `pulse`, `sunrise`) cover the playback-only stage,
arrival, and reveal roles, while Flutter widget transforms and CSS transforms
drive the countdown from the generated Layer 1 timeline, seed, progress, and
participant count. `lottie-web`'s light player is dynamically imported only on
the Event Runtime surface; the measured minimal spike added 47.57 KB gzip of
code-splittable JavaScript and no WASM transfer. Flutter uses the same asset
documents through `lottie`. This resolves the Rive-versus-Lottie decision
without adding an event-format fork or web audio.

## B.4 Layer 3 — allow divergence below the marquee

Chip bounce, press springs, idle breathing, and ink-replacement
microinteractions are explicitly **not** required to match. Nobody compares
these across phones. Each platform uses its idiom. Attempting to unify them is
where maintenance cost explodes for zero perceived benefit.

## B.5 Audio — move it to the room, not the phones

Do not port per-attendee audio to web. Fifty phones playing an ambient bed
200–500ms apart in a noisy venue sounds broken, not cinematic, and it is
unfixable because it is a physics problem rather than a sync problem.

Target state: **the room makes one sound from one device.** Ambient beds and
reveal stings play from the host's control-room device, which is already the
beat authority. This is strictly better than the current design, works
identically for app and web attendees, and deletes code.

Per-attendee haptics stay on the app and are simply absent on web. That is an
acceptable divergence — haptics are private, not shared.

## B.6 Rejected — Flutter Web for the guest runtime

Rejected. The guest runtime's own requirement is low-bandwidth, and Flutter
Web's first-load payload is unacceptable for a guest scanning a QR at a venue
door on mobile data. A guest waiting for a multi-megabyte bundle at check-in is
a worse failure than a plain page. The host runtime already uses Flutter Web
(`apps/host/build/web`) and that remains correct — hosts load once, ahead of
time, deliberately.

---

# Part C — Robustness Gaps

## C.1 Presence is asserted once and never rechecked

Check-in records arrival. Nothing records departure. Rotations generated at the
start of the event will assign a partner who left forty minutes ago, and the
attendee stands waiting for someone who is gone. This is the most visible
possible failure of the feature.

Required: a liveness heartbeat from the open companion/web session, a derived
`presenceState` (`present | idle | likelyDeparted`), and a host prompt before
the next round — "3 guests may have left. Regenerate?" — that never silently
mutates an assignment mid-round.

## C.2 Irreversible beats need a guard, not an undo

`Previous` moves the pointer. It cannot un-reveal what fifty people already saw.
Do not build revisioned undo for published reveals; the social event is not
reversible.

Required: `reveal` and rotation-publish are treated as destructive actions with
an explicit confirm step in the control room, consistent with the existing
locally-pending/debounce guard on the primary action.

The robustness budget goes to **process-death recovery** instead. A host whose
app dies mid-rotation with no way back is a ruined evening, and unlike total
connectivity loss it is a certainty over enough events.

## C.3 Assignment generation must be pre-computed

Pairwise scoring is O(n²); at 150 attendees that is roughly 11,000 pairs per
round. If the host taps "next" and the room watches a spinner, the ceremony
fails at its climax.

Required: generate round N+1 during round N, store it as a host-only draft, and
make the beat transition a publish of an already-computed result. This also
gives the host a preview-and-edit window, which is a product win, not only a
performance one.

## C.4 First Hello must stop depending on GPS

The contract already specifies a short-lived signed venue session and states
that a printable join QR cannot prove physical attendance. The code still writes
attendance through the GPS callable with a 100m radius.

Required: implement the signed venue session as the attendance write path.
In dense urban venues 100m includes neighbouring buildings and the street; in
basements and malls GPS produces false negatives that block honest guests at the
door. The signed session is strictly better on both counts and removes a
location permission prompt at the worst possible moment.

Close the open tracker item ("validate the 100m radius and QR camera flow on
physical venues") by deleting the radius dependency, not by validating it.

## C.5 Late arrivals have no path

Assignments are generated before the event starts. An attendee arriving forty
minutes in currently receives nothing. In the launch market a thirty-minute late
arrival is the norm, not an edge case.

Required: an insertion operation that patches the current round — filling a
sit-out slot, extending a pod to its maximum size, or explicitly holding the
attendee to the next round with a stated reason — without regenerating published
assignments.

---

# Part D — New Capabilities

Ordered by leverage.

## D.1 The exclusion ledger

**One function, four expressions.** Track cumulative *time unassigned or
unengaged* per attendee.

| Format | Expression |
| --- | --- |
| Tournament | sit-out fairness — the thing racket players notice above all else |
| Mixer | the wallflower |
| Dinner | the guest at the end of the table nobody turned toward |
| Run club | the runner who dropped off the back |

It is simultaneously an **optimizer constraint** (minimize maximum exclusion
time, ahead of score) and a **live host alert** — "three people have not been
assigned to anyone in 40 minutes." Hosts cannot observe this themselves; it is
the thing they most want and least have.

Brief social exclusion has outsized negative effect (Williams' ostracism work),
which is why this belongs in the live control room as an intervention prompt and
not in post-event analytics.

## D.2 The spatial control room

**The room map is the correct rendering of D.1.** "Three people have not been
assigned to anyone in 40 minutes" is a list. A dim patch in the back-left corner
of the room is a place the host can walk to. The host's next action is physical,
so the alert must be spatial.

It also surfaces something no list can express: **spatial dead zones** — the
corner table nobody rotated through, the back row of bikes, the pod stranded by
the bar. Hosts cannot see this themselves, because they are inside the room
rather than above it.

This capability, not seat optimization, is the reason the layout model exists.

### Required behavior

- **Unit-level by default, person-level on tap.** 150 legible names do not fit
  on a phone. The scan view is units with fill state and a health overlay
  derived from D.1. Individuals are a drill-down.
- **Assigned and confirmed positions must be visually distinct.** Outline for
  assigned, filled for confirmed (table QR, host confirmation). A
  confident-looking map that is wrong is worse than a list, because the host
  stops verifying it. The map never overstates what it knows.
- **Tap-select then tap-place is the required phone interaction.** The host is
  standing, moving, one-handed, in low light, under time pressure — precision
  pointing is the wrong demand and a mis-drop is socially visible. Tap the
  attendee; valid destinations highlight and invalid ones grey out with a
  reason (capacity, safety keep-apart, declared constraint); tap the
  destination. Consequences are shown *between* the two taps, which is
  impossible mid-drag.
- **Drag-and-drop is additive and resolves to the same operation.** Tablet and
  host-web only. Build the operation first; the drag affordance is not a
  prerequisite for shipping the surface.
- **Every reassignment writes a scoped `affinityConstraint`** per A.9. A
  regeneration that silently undoes a host's manual move fails review.
- **Single-writer discipline.** Reassignment contends with pre-generation (C.3)
  and with a second staff device. It uses the same fencing and
  locally-pending/debounce guard as beat transitions.

### Formats served

Spin (bikes), dinner (tables), quiz (tables), pickleball (courts), mixer
(zones). Formats resolving to `unitKind: wholeGroup` render no map and must not
display an empty one.

## D.3 The conversation graph

One screen at the end of the night in the web runtime: **"Who did you actually
talk to?"** — the roster as tappable chips, seeded with the people the engine
assigned them to.

This single interaction delivers:

- the real Event Success metric, measured rather than surveyed — the current
  target ("two new meaningful conversations") has no instrument behind it;
- validation of whether assigned pairs actually talked, which is the only honest
  test of the optimizer;
- the wallflower confirmation for the host recap;
- a proprietary dataset no ticketing platform has;
- the natural, non-coercive app bridge: "keep in touch with the four people you
  met."

Per format the label changes and the mechanism does not: who you ran with, your
teammates, your tablemates, your opponents.

Privacy: the graph is attendee-private and host-aggregate. Hosts see counts and
exclusion, never who named whom.

## D.4 Roll call and sweep

The `accountability` variable's runtime surface. Generic mechanism, deep utility
for run clubs and outdoor formats. Unresolved checked-in attendees produce a
Host warning and explicit completion acknowledgement, never an inescapable
completion lock.

## D.5 Live standings

The `unitOutcome` variable's runtime surface, reusing the existing reveal
ceremony with a standings payload. Quiz nights and tournaments are *defined* by
the scoreboard, and the hard part — server-anchored synchronized reveal — is
already built.

## D.6 The pre-event moment

The web session is established at OTP, which opens a channel between
verification and the event. Use it to collect the one per-format variable the
engine needs:

| Format | Collected |
| --- | --- |
| Run club | pace band |
| Pickleball | skill band |
| Dinner | dietary and seating constraint |
| Mixer | questionnaire |
| Quiz | team name / arrival group |

One mechanism, per-format payload. It also produces the readiness number hosts
want ("38 of 52 ready") and moves OTP off the door — which is required anyway,
since OTP is the one runtime operation that structurally cannot work offline.

## D.7 Escalating disclosure for social missions

`socialMissions` currently fires prompts keyed to a stage. The mechanism that
actually builds closeness is *reciprocal escalating self-disclosure* (the Aron
"fast friends" line of work) — the sequence matters more than the questions.

Required: prompts carry a disclosure level, and the run-of-show walks the level
upward across the night rather than sampling randomly within a stage. Small
change, real effect.

## D.8 Format-first setup

Unblock the gated Phase 4 consolidation. The wedge host has no facilitation
training and does not want fourteen toggles; they want a format. `Playbook` and
`EventSuccessActivityProfile` already do this work. Ship formats as the primary
choice and move modules behind an explicit "customize" path.

---

# Implementation Tranches

**Tranche numbers are the run order.** Work through them in ascending order.
Each is independently reviewable, ships on its own, and must update its owner
docs in the same commit. Generated files come from contract sources.

The `effort` marker records why a tranche is hard. It is guidance for routing,
not permission to think less on the standard ones.

## Progress

Tick a tranche only when it is implemented, its named tests pass, and its owner
docs are updated. Update this table in the same commit as the tranche.

- [x] T1 `matchingObjective` and `coverage`
- [x] T2 `affinityConstraint` and `arrivalGroup`
- [x] T3 Exclusion ledger
- [x] T4 Live control robustness
- [x] T5 Spatial layout model and control room
- [x] T6 `resourceCapacity` and `sequence` topology
- [x] T7 `unitOutcome` and live standings
- [x] T8 Presence and late arrivals
- [x] T9 Signed venue session replaces GPS
- [x] T10 Conversation graph
- [x] T11 `accountability` sweep
- [x] T12 Presentation contract and parity foundation
- [x] T13 Marquee visual parity
- [x] T14 `durationShape` and format-first setup
- [x] T15 Pre-event moment and escalating disclosure

**T1 — `matchingObjective` and the `coverage` default.** `effort: high`
Owner: `functions/src/eventSuccess/compatibilityPolicy.ts`, `assignmentOptimizer.ts`, `formatPrimitives.ts`, `lib/event_success/domain/event_success_activity_profile/`.
Add the enum per A.3, leave `compatibilityPolicy` semantics untouched per A.2,
implement `coverage` as the default objective, and prove a meaningful assignment
with zero profile and zero questionnaire data. The objectives must compose with
the optimizer's existing fairness ordering rather than fight it. Tests: extend
`assignmentOptimizer.test.ts` with a profile-free corpus per objective.

**T2 — `affinityConstraint` and `arrivalGroup`.** `effort: standard`
Owner: roster adapters, `eventAttendees` schema, `assignmentConstraints.ts`.
Per A.9, including the `thisRound` / `pinned` scope model. Sequenced early
because it unblocks T5 and independently fixes group-booking claim ambiguity in
roster import. Adapter golden fixtures must cover group tickets. Safety
keep-apart edges must be proven to win over host-declared constraints.

**T3 — Exclusion ledger.** `effort: high`
Owner: `functions/src/eventSuccess/assignmentConstraints.ts`, `assignmentOptimizer.ts`, host control room.
Constraint plus live host alert per D.1. This changes objective *ordering*
inside the optimizer, not just its inputs. Tests: assert maximum-exclusion-time
is minimized ahead of score; assert the alert fires at threshold.

**T4 — Live control robustness.** `effort: high`
Owner: control room, `functions/src/eventSuccess/`.
C.2 confirm guard, C.3 pre-generation, and process-death recovery. Sequenced
before T5 because the map introduces a second live writer. Tests: restart
mid-round resumes the correct beat; publish is idempotent.

**T5 — Spatial layout model and control room.** `effort: high`
Owner: `contracts/catalogs/`, organizer layout assets, host control room, `lib/event_success/presentation/`, `website/src/features/eventRuntime/`.
A.11 parametric layouts plus D.2. Ship in this order; each step is
independently shippable and step 2 alone delivers spatial dead-zone detection:

1. parametric layout authoring as an **organizer asset**, selected at event
   creation;
2. read-only room map with the D.1 health overlay and the assigned/confirmed
   distinction;
3. tap-select/tap-place reassignment writing scoped constraints via T2;
4. drag-and-drop affordance, tablet and host-web only.

Tests: `unitProximity` derivation per shape; map renders identically from the
same contract on both runtimes; `wholeGroup` formats render no map; invalid
destinations grey out with the correct reason; a reassignment survives the next
regeneration when scoped `pinned` and does not when scoped `thisRound`;
concurrent reassignment and T4 pre-generation resolve under single-writer
fencing.

**T6 — `resourceCapacity` and `sequence` topology.** `effort: high`
Owner: `functions/src/eventSuccess/assignmentTopology.ts`, `generateEventSuccessRotations.ts`, new scheduler.
The tournament engine per A.4 and A.6, including fair sit-outs wired to T3 and
rotation cost weighted by `unitProximity` from T5. Tests: round-robin
correctness, court-count constraint, sit-out fairness bound,
odd-attendee-count byes.

**T7 — `unitOutcome` and live standings.** `effort: standard`
Owner: `contracts/`, `functions/src/eventSuccess/`, reveal ceremony payload.
Per A.5 and D.5. Reuse the existing ceremony; a second ceremony implementation
fails review.

**T8 — Presence and late arrivals.** `effort: high`
Owner: runtime session, `functions/src/eventSuccess/`.
C.1 and C.5. The "never mutate a published round" invariant is the hard part.
Tests: a `likelyDeparted` attendee is excluded from the next generated round;
late insertion does not mutate a published round.

**T9 — Signed venue session replaces GPS.** `effort: high`
Owner: `functions/src/eventSuccess/firstHelloCheckIn.ts`, check-in callables, host QR surface.
C.4. Security-sensitive. Tests: printable QR grants no attendance; expired
session rejected; replay rejected.

**T10 — Conversation graph.** `effort: standard`
Owner: `website/src/features/eventRuntime/`, `functions/src/eventSuccess/`, `contracts/firestore/`.
Per D.3, including the privacy boundary. Tests: attendee-private read rules;
host-aggregate projection contains no name-to-name edges.

**T11 — `accountability` sweep.** `effort: standard`
Owner: control room, event completion path.
A.8 and D.4. Tests: unresolved checked-in attendees raise the completion
warning; review does not complete; explicit `Finish anyway` acknowledgement
does complete.

**T12 — Presentation contract and parity foundation.** `effort: standard`
Owner: `contracts/catalogs/`, `lib/event_success/presentation/event_success_companion_screen_state.dart`, `website/src/features/eventRuntime/`.
Promote `EventSuccessMomentPresentation` to a generated contract per B.2. Both
runtimes derive timing and seed from it. Sequenced here rather than first
because it is foundational for parity only, and delivers nothing observable on
its own. Tests: contract fixture round-trip in Dart and TS; a parity test
asserting both runtimes compute the same phase boundaries and seed for the same
server anchor.

**T13 — Marquee visual parity.** `effort: high for the spike, standard after`
Owner: assets, `lib/event_success/presentation/`, `website/src/features/eventRuntime/`, `packages/web-ui`.
Run the B.3 spike first and record its result in this document before
implementing. Delete the superseded `CustomPainter` motifs rather than leaving
both. Tests: visual capture on both runtimes at identical contracted inputs.

**T14 — `durationShape` and format-first setup.** `effort: standard`
Owner: run-of-show, setup body, playbooks.
A.7 and D.8, unblocking Phase 4. Tests: setup exposes formats first; module
customization remains reachable and lossless.

**T15 — Pre-event moment and escalating disclosure.** `effort: standard`
Owner: `website/src/features/eventRuntime/`, `socialMissions` prompt data.
D.6 and D.7.

Implemented: the runtime profile now binds exactly one required pre-event field
to the resolved `interactionModel`: pace band, skill band, dietary/seating
notes, questionnaire answers, or quiz team/arrival group. The existing
server-owned `needsInput`/`ready` transition remains the non-sensitive source
for readiness counts. Pace and skill answers enter assignment attributes,
mixer answers enter private compatibility responses, and quiz team names use
the existing arrival-group constraint; dinner data does not make the still-
unsupported `tableSeating` algorithm appear supported. `socialMissions` prompt
ids and disclosure levels are authored in the generated cross-runtime catalog.
Both runtimes resolve step 0 to light, step 1 to personal, and later steps to
reflective disclosure without sampling or branching on `ActivityKind`.

---

# Acceptance Gates

- The generated resolution table (A.13) covers every legal variable combination;
  an absent combination fails the build.
- `coverage` produces an explainable assignment with zero profile data and zero
  questionnaire answers for all four reference formats.
- No generator or screen branches on `ActivityKind` directly.
- `tableSeating` resolves to `unsupported` with an honest reason until its
  engine ships.
- Flutter and web runtimes enter and exit each ceremony phase within 250ms of
  each other against the same server anchor, and produce the same deterministic
  seed.
- A published reveal cannot be reverted; it can only be guarded before
  publication.
- Attendance cannot be written from a printable QR or from a location claim.
- The host recap surfaces exclusion; it never surfaces who named whom.
- A `pinned` host reassignment survives every subsequent regeneration until the
  host releases it.
- The room map visually distinguishes assigned from confirmed position, and a
  host can reach every reassignment outcome without a precision drag.
- A saved layout is reusable across occurrences without re-authoring.

# Do Not Ship If

- a per-event-type code fork is introduced anywhere in generators or screens;
- an unsupported variable combination silently resolves to a neighbouring
  implemented behavior;
- the web runtime and Flutter companion derive ceremony timing from different
  clocks or different seeds;
- audio is shipped per-attendee on web;
- `matchingObjective` widens which signals may be read — that remains
  `compatibilityPolicy`'s sole authority;
- a host-declared `affinityConstraint` overrides a safety keep-apart edge;
- the conversation graph exposes name-to-name edges to a host;
- assignment generation runs synchronously on the beat transition;
- a host reassignment is written as a bare data edit rather than a scoped
  constraint;
- the room map renders an assigned position as though it were confirmed;
- drag-and-drop is the only path to a reassignment outcome on a phone;
- a layout is stored as derived coordinates rather than a parametric spec, or is
  scoped to an event rather than an organizer;
- a to-scale venue drawing editor is built.

# Open Questions For The Owner

1. Resolved in T13: the measured Rive transfer cost failed the venue-network
   spike, so both runtimes use the specified Lottie-plus-contracted-transforms
   fallback.
2. Resolved in T11: `sweep` warns loudly and requires explicit Host
   acknowledgement, but never hard-blocks completion. Quiet departures are a
   normal possibility, not automatic evidence of danger.
3. Resolved in T3: the exclusion ledger is time-based for every format, with a
   configurable threshold and a 40-minute default.
4. Resolved in T10: explicit opt-in is the default, with assigned attendees
   suggested but unselected. Hosts may configure opt-out before setup freezes;
   assigned attendees are then preselected and remain removable or skippable.
5. Host analytics anonymity threshold (carried over from
   [docs/event_success.md](../event_success.md), still open): 3, 5, or dynamic
   by event size.
6. Whether `adjacency` and table seating are funded this cycle or remain
   `unsupported` through the next two occurrences of the dinner format.
7. Resolved in T5: the pilot uses explicit Host confirmation and visually keeps
   assigned position distinct from Host-confirmed position; table-level QR is
   not required.
8. Resolved in T5: all five contracted shapes ship together: `round`, `rect`,
   `row`, `court`, and `zone`.
9. Resolved in T8: checked-in companion sessions heartbeat every 30 seconds;
   server-derived presence is `present` through 90 seconds, `idle` through five
   minutes, and `likelyDeparted` after five minutes. These are bounded deployment
   defaults rather than hard-coded client policy. Hosts explicitly confirm
   regeneration or late placement, and published rounds remain immutable.
