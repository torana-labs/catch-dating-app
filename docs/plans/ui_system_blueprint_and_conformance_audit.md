---
doc_id: ui_system_blueprint_conformance
version: 1.30.1
updated: 2026-10-24
owner: app_architecture
status: active
---

# UI System Blueprint And Conformance Audit

## Purpose

This spec answers one owner question: *how should a Flutter product of this
size be structured — code organization, widget abstraction, naming,
state/controller bundling, and enforcement — and where does Catch deviate from
that standard?* It then packages the deviations as a Codex delivery program
whose completion criteria are mechanical, so migrations cannot silently finish
incomplete.

The 2026-10-17 cross-framework extension (D9–D14, Phase 7) applies the same
program to the React surfaces (`website/`, `admin/`, `packages/web-ui`), so
Flutter and React implement one component contract under one name.
The 2026-10-22 web unification (D16–D17) keeps the website and Admin as
separate deployables over one shared web system, enforced with stylelint and
ESLint rather than hand-written scanners. D18 (2026-10-23) gives both
frameworks one placement rule: the library draws, and features only arrange
and bind. D19–D21 (2026-10-24) set brand baseline v1: one type scale, one
button, and who decides consolidation calls.

It is a point-in-time plan, not a parallel architecture document. Durable rules
ratified here are folded into `docs/app_architecture.md` (and the widget
catalog maintenance contract) in Phase 0; this file then tracks only delivery.
Where this spec and `docs/app_architecture.md` disagree after Phase 0, the
architecture doc wins.

## Summary Verdict

Catch's UI governance is ahead of typical industry practice in doctrine and
enforcement breadth (90 authored rules, 293 registered checks, an analyzer
plugin with seeded probes, a cross-tool component registry, a provider
topology gate). The deviations are not missing rules — they are four
structural choices that industry systems make and Catch has not yet made:

1. **Boundaries are policed, not compiled.** The design system lives inside the
   app package, so every layering rule needs a scanner. Industry systems make
   the design system a separate package whose `pubspec.yaml` cannot express a
   violation.
2. **The component catalog is documentation, not a test.** 946 Widgetbook use
   cases exist but are never executed as assertions; golden coverage is 5 spec
   files. Industry systems derive visual regression from the catalog corpus so
   the catalog *is* the contract.
3. **Identity is registered in too many places.** A public widget's existence
   is recorded in `docs/widget_catalog.md` prose tables, Widgetbook,
   `design/components/catch.components.json`, and sometimes screen/feature
   contracts. Multi-registry maintenance is the main way "docs fight code."
4. **Migration completion is asserted, not measured.** Exhibits and
   `pattern_adoption.json` classifications are agent-maintained claims. The
   strongest completion proof — the old symbol is deleted and the compiler
   agrees — is used for data migrations but not systematized for UI patterns.

Everything else measured — token pipeline, layer doctrine, controller
taxonomy, async/error architecture, copy ownership — conforms to or exceeds
the reference blueprint and must not be rebuilt.

## Part 1 — Reference Blueprint And Conformance

Each pillar states the industry-standard structure (as practiced by mature
design-system organizations: token pipelines per the DTCG model, layered
component libraries in the style of Material/Polaris/Carbon, catalog-driven
testing in the Storybook/Widgetbook ecosystem, codemod-driven migrations as
practiced in large monorepos), then Catch's mechanism, then a verdict:
`CONFORMS`, `PARTIAL`, `GAP`, or `OVER-BUILT`.

### P1. Physical layering — GAP

**Standard.** The design system is a separate package (often several: tokens,
foundations, components) consumed by app packages. Layering violations
(component library importing state management, backend SDKs, or feature code)
are impossible to compile, not merely flagged. The app's package graph is the
architecture diagram.

**Catch today.** A pub workspace already exists (`apps/consumer`, `apps/host`
over the shared root package), but all UI-system code lives inside the app
package: `lib/platform/theme/**` (tokens), `lib/core/widgets/**` (116 files, 193
`Catch*` classes), `lib/core/forms`, `lib/platform/responsive`. Boundaries are
held by the analyzer plugin, `check_ui_composition_contracts`, dependency
direction scanners, and convention. Measured leaks prove convention is porous:
5 riverpod-importing files and 31 l10n-coupled files in `core/widgets`, 2
`ConsumerWidget`s in the primitive layer, 7 non-`catch_`-prefixed files.

**Verdict.** GAP. The workspace is already in place; extraction is the missing
step, and it converts a large class of scanner rules into compile errors.

### P2. Token architecture — CONFORMS

**Standard.** DTCG-shaped platform-neutral token source; a three-tier model
(primitive scale → semantic role → component contract); generated per-platform
outputs; raw values only in the token layer.

**Catch today.** `design/tokens/catch.tokens.json` → generated
`catch_design_tokens.g.dart` + generated CSS; handwritten semantic classes
(`CatchTokens`, `CatchSpacing`, `CatchGaps`, `CatchInsets`, `CatchRadius`,
`CatchBorderRole`, …) layered above; tier model documented in
`docs/app_architecture.md`; raw-value drift essentially eliminated by the lint
estate (21 raw `BoxDecoration`s remain outside core, down from ~48 in June).

**Verdict.** CONFORMS. Only defect: the semantic layer is one 3,116-line file
(`lib/platform/theme/catch_tokens.dart`) mixing every tier — a split target under
P9, not a redesign.

### P3. Component abstraction ladder — PARTIAL

**Standard.** Components are classified on an explicit ladder, and the
classification is data, not folklore. A canonical form:

| Level | Name | Contents | May depend on |
|---|---|---|---|
| L0 | tokens | scale values, semantic roles | nothing |
| L1 | foundations | theme wiring, typography engine, icons, motion | L0 |
| L2 | primitives | one visual job: text, surface, icon, tap target, gap | L0–L1 |
| L3 | components | reusable assemblies with slots: button, field, section, tile, banner, sheet, empty/error state | L0–L2 |
| L4 | patterns | page-scale skeletons: scaffolds, section pages, tab shells, async-state adapters, form-row orchestration | L0–L3 |
| L5 | feature UI | domain-aware compositions, private allowed | L0–L4 + own feature |
| L6 | screens | route wiring, providers, controllers, navigation | everything below |

Placement is decided by two questions: *does it name a domain concept?* (yes →
L5/L6) and *does it read state management?* (yes → L6 or a designated adapter).
Promotion L5→L3 requires a second unrelated consumer plus catalog registration.

**Catch today.** The ladder exists in prose (widget ownership, promotion
rules, the composition migration spec's Layer 0–N model) and in practice
(tokens → `Catch*` primitives → sections/fields → screens), but: (a) the level
of a given widget is recorded nowhere machine-readable; (b) `core/widgets` is
a flat 116-file namespace where `CatchLoadingIndicator` sits beside `CatchOrganizerPoster`
and `CatchFormStepFlow`; (c) the riverpod-consuming adapters
(`CatchAsyncBoundary`, the mutation error family, `CatchNotice`) sit in the
same folder as pure primitives, which is exactly why P1's boundary cannot be
compiled today.

**Verdict.** PARTIAL. Adopt the L0–L6 ladder as the classification vocabulary,
record each shared component's level in the component registry, and let the P1
package split make L0–L4 vs L5–L6 physical.

### P4. Naming grammar — PARTIAL

**Standard.** A closed, written grammar such that two people building the same
thing produce the same name — which is what makes duplicates collide instead
of accumulating. Typical shape: reserved library prefix; a bounded role-noun
lexicon (Button, Field, Section, Tile, Row, Sheet, Banner, Badge, State,
Scaffold…); variants as enums named `<Component><Axis>`; slots from a fixed
vocabulary (`leading`, `trailing`, `title`, `subtitle`, `body`, `footer`,
`actions`, `onX`, `xBuilder`); file suffixes from a fixed vocabulary
(`_screen`, `_controller`, `_view_model`, `_state`, `_repository`,
`_service`, `_providers`, plus role-noun widget suffixes).

**Catch today.** Strong fragments: `Catch` prefix convention, `_state.dart`
naming contract (provider-free by convention, scanner-enforced),
`design:lexicon:check` validating cross-surface component identity for
registered components, `check_widget_classification`, and the new-widget
inventory gate. Missing: the grammar is not written as a closed vocabulary, is
not enforced for unregistered widgets (1,027 public widget classes vs 71
registered component ids), and 7 core files escape the prefix
(`block_user_dialog`, `confirm_danger_dialog`, `event_activity_visuals`,
`event_ticket_surface`, `event_visual_atoms`, `ordered_photo_picker`,
`mutation_error_util`).

**Verdict.** PARTIAL. The collision-forcing goal is currently achieved by the
AST-fingerprint consolidation pipeline (after the fact) rather than by naming
(before the fact). Both are needed; the grammar is cheap to add.

### P5. State and controller bundling — CONFORMS

**Standard.** UI is a function of typed state; state management is confined to
a route-edge container layer; components receive plain data and callbacks;
one-shot actions, flows, async state, and read-only composition have distinct
controller shapes; in-flight requests have explicit snapshot policies.

**Catch today.** This pillar is *ahead* of industry norm:
`ARCH-UI-STATE-001` provider-free presentation states,
`catchAsyncStateFromAsyncValue` with an exhaustive phase model, the
`catch_async_requires_state_surface` diagnostic across consumer and Host
presentation folders, the
action/flow/async/view-model controller taxonomy, typed mutation key grain,
and `ARCH-PENDING-SNAPSHOT-001` snapshot-integrity policies with named
adopters and tests.

**Verdict.** CONFORMS. Adoption symmetry is complete: consumer and Host
presentation now share the same async-surface diagnostic and normalize watched
Riverpod snapshots through the existing exhaustive adapter. Do not add new
controller patterns in this program.

### P6. Catalog as executable contract — GAP

**Standard.** The component catalog (Storybook/Widgetbook) is the single
place a component's states are declared, and those declarations are executed:
every catalog case renders in CI, and designated cases produce golden images
diffed on every change (theme × brightness, and text-scale for text-bearing
components). Catalog coverage is asserted over the whole corpus, not just the
diff.

**Catch today.** Widgetbook is real (946 registered use cases, compiled in
CI), and a golden harness exists (`matchCatchGolden`, bundled fonts,
deterministic comparator with 0.30% tolerance, a dedicated
visual-integration CI lane). But the two are not connected: only 5 golden spec
files exist; use cases are compile-checked, never rendered as assertions; and
the coverage gate (`check_new_widget_inventory.mjs`) is diff-based against
`HEAD^`, so anything that ever slips through is invisible forever.

The harness around the catalog is itself large: ≈46,100 handwritten lines
across 28 files with 309 locally defined scaffold classes (device/sheet
frames, provider scopes, catalog grids — every file mounts production
widgets, so there is no shadow UI). Harness volume is a hidden maintenance
tax and a proxy measure of how much of the tree still needs provider
scaffolding to mount in isolation.

**Verdict.** GAP — the highest-leverage one. "UI drift that keeps getting out
of hand" is precisely what whole-corpus rendered goldens catch and nothing
else in the estate does.

### P7. Enforcement design — OVER-BUILT (selectively)

**Standard.** Few, high-leverage rules; each rule ships with its probe (a
fixture proving it fires) and, where mechanical, an autofix; rule count is
kept low by pushing invariants into structure (packages, types) instead of
checks.

**Catch today.** The probe discipline is exemplary (seeded lint corpus,
bidirectional enforcement-coverage gate, enforcement-integrity meta-gate) —
better than most industry teams. But the estate is large (293 checks, 90
rules) partly *because* P1 is unsolved: import-boundary, provider-seam, and
layer-placement rules exist as scanners only because the compiler was never
given the chance to own them. The scanner estate is itself a codebase with
maintenance cost and its own bug surface (per the 2026-08 tooling audit).

**Verdict.** OVER-BUILT in the boundary category, CONFORMS elsewhere. After
P1 lands, retire every check the package graph now owns. Rule count should go
*down* as a result of this program — that is a success metric, not a loss.

### P8. Migration mechanics — GAP

**Standard.** Migrations are codemod-first (`dart fix` data or scripts) and
completion is compiler- or inventory-defined: the old symbol is deleted in the
closing slice, so any missed call site is a build failure, and a deterministic
scanner's zero-count — not an agent's claim — is the definition of done.
Deprecation is a within-migration tool, never an end state.

**Catch today.** The pieces exist separately — exhibits, adopter
classification, decrease-only baselines, the legacy-mirror cutover shape for
data, and the pre-launch clean-schema mandate (no backwards compatibility
anywhere) — but UI/architecture migrations still end with agent-asserted
tracker states, transitional aliases that outlive their slice (`lib/clubs/`),
and baselines with no expiry pressure. This is the root cause of "the agent
does an incomplete job": completion is defined by diligence, not by a
machine.

**Verdict.** GAP. Codified as Migration Protocol v2 (Part 3, D7).

### P9. Size and complexity budgets — GAP

**Standard.** File-size and widget-size budgets, ratcheted: new code obeys the
ceiling, legacy offenders live in a decrease-only baseline.

**Catch today.** Test specs have exactly this (1,200-line ceiling +
decrease-only baseline). Handwritten `lib/` has no budget, and it shows:
`host_crm_repository.dart` 3,624 lines, `catch_tokens.dart` 3,116,
`host_form_builder_screen.dart` 2,927, `host_operational_roster_panel.dart`
2,353, plus four Event Success presentation files between 1,665 and 2,076 —
12 handwritten files sit at or above 1,600 lines.

**Verdict.** GAP, cheap to close: mirror the existing test-size ratchet.

### P10. Doctrine ergonomics — GAP

**Standard.** A short, ranked constitution (one or two pages) answers 90% of
placement/naming/state questions; the long-form spec is reference material;
per-rule detail is generated from the rule registry. Agents and new engineers
load the constitution, not the whole corpus.

**Catch today.** `docs/app_architecture.md` is 4,236 lines (at the
2026-09-04 base) and excellent, but
there is no compact decision layer above it. Every agent session re-derives
"where does this widget go / what is it called / what proves I'm done" from
long prose across several documents. Incomplete migrations are partly a
context problem, not only a discipline problem.

**Verdict.** GAP. Add a one-page decision layer (ladder table + placement
decision tree + naming grammar + protocol checklist) at the top of
`docs/app_architecture.md`, and keep it under 120 lines forever.

### Measured snapshot (2026-09-04)

Re-verify these before executing any phase; date-stamped audits are snapshots.

| Metric | Value | Trend vs 2026-06 |
|---|---:|---|
| Handwritten `lib/**` Dart files / lines | 928 / ~222k (excl. generated l10n) | — |
| Public widget classes in `lib/**` | 1,027 | — |
| Private widget classes | 149 | ↓ from 489 |
| `Widget _buildX()` helper methods | 36 | ↓ from 39 |
| Raw `BoxDecoration` outside `core` | 21 | ↓ from ~48 |
| `core/widgets` files / `Catch*` classes | 116 / 193 | — |
| riverpod-importing files in `core/widgets` | 5 | boundary leak |
| l10n-importing files in `core/widgets` | 31 | boundary leak |
| Widgetbook use cases | 946 | growing |
| Golden spec files / images | 5 / 18 | flat, near-zero |
| Widgetbook handwritten harness lines / files | ~46,100 / 28 | unbudgeted |
| Widgetbook local scaffold classes (frames/scopes) | 309 | no shared harness |
| Registered checks / authored rules | 293 / 90 | growing |
| Handwritten files ≥ 1,600 lines | 12 | unbudgeted |

## Part 2 — Root Causes Of The Two Named Failure Modes

### Why migrations finish incomplete

1. **Completion is a claim.** `pattern_adoption.json` and worklog states are
   written by the same agent doing the migration. Nothing forces the claim
   through a machine except for the few roles covered by
   `check_adopted_architecture_boundaries.mjs`.
2. **The old path survives.** Transitional aliases and compatibility shims are
   left standing "for later," so the compiler never gets to enumerate missed
   call sites. Under the pre-launch clean-schema mandate this caution buys
   nothing.
3. **Doctrine exceeds context.** The rules an agent must satisfy live across
   ~4k lines plus registries; agents satisfy the subset they loaded.
4. **Inventories are ad hoc.** Some migrations start from a grep the agent
   wrote that day rather than a checked-in deterministic scanner, so "all call
   sites" was never a defined set.

### Why source, lints, and tests fight

1. **Multi-registry identity.** Adding one public widget legitimately requires
   touching Widgetbook, `docs/widget_catalog.md` prose tables, sometimes
   `catch.components.json`, and tests. Each is separately gated, so every gate
   feels like friction and drift between them is structural.
2. **Rules arrive after code.** A rule written against an existing violation
   pile forces a baseline/ratchet, which then persists indefinitely (the
   carve-out audit already documented this failure shape for scanners).
3. **Checks duplicate the compiler.** Boundary scanners re-verify things a
   package graph would make unrepresentable, so the same intent is encoded
   twice and can disagree.
4. **Catalog cases assert nothing.** Widgetbook coverage is required but not
   executed, so it reads as ceremony rather than as the component's test — the
   moment a check feels like ceremony, agents and humans route around it.

## Part 3 — Target Decisions

Each decision is final once the owner approves this spec; alternatives are
recorded to prevent re-litigation. **Status: D9–D15 (cross-framework extension and predicted names) ratified by
the owner on 2026-10-17. D1–D8 ratified by the owner on
2026-09-04, including the D3 catalog-charter amendment below.**

### D1. Extract `packages/catch_tokens` and `packages/catch_ui`

Workspace gains two members (root `pubspec.yaml` `workspace:` list):

```text
packages/catch_tokens/   # generated primitive tokens + semantic token classes
                         # deps: flutter only
packages/catch_ui/       # foundations, primitives, components, patterns
                         # deps: flutter + catch_tokens + phosphor_flutter + skeletonizer 2.1.3
                         # NO riverpod, NO firebase, NO app package, NO feature types
```

Loading uses one third-party engine: `skeletonizer` 2.1.3, the version already
resolved by the app workspace. Remove the separate `shimmer` dependency when
migrating the loading family. Both explicit placeholder shapes and skeletons
of real widget compositions remain supported through Catch-owned APIs, using
the same token colors, motion duration, shimmer effect, reduced-motion static
fallback, and loading-semantics policy. Package consumers do not import the
engine directly. This is a narrow presentation-only dependency exception;
Riverpod, Firebase, app packages, and feature types remain excluded. The
animation sweep change and reduced-motion correction require reviewed visual
baselines; relocation-only pixel comparisons do not establish engine equivalence.

Internal layout of `catch_ui` encodes the P3 ladder:

```text
packages/catch_ui/lib/
  catch_ui.dart            # the reviewed barrel (moves from lib/catch_ui.dart)
  src/foundations/         # theme wiring, text styles, icons, motion
  src/primitives/          # L2
  src/components/          # L3 (fields, sections, tiles, banners, sheets, states)
  src/patterns/            # L4 (scaffolds, section pages, tab scroll views,
                           #     form-row orchestration, skeletons)
```

Riverpod-consuming adapters stay in the app package under
`lib/platform/riverpod_ui/` (moved from `core/widgets`): `CatchAsyncBoundary`,
`CatchAsyncBoundary.sliver`, `CatchLocalizedErrorBanner.mutation`,
`listenToCatchMutationErrors`, `mutation_error_util`, `CatchNotice`'s
provider factory. They are thin translations onto `catch_ui` surfaces
(`CatchAsyncState`, `CatchErrorState`), which is what they already are.

Domain-flavored core widgets that name product concepts
(`event_ticket_surface`, `event_activity_visuals`, `event_visual_atoms`,
`CatchOrganizerPoster`, `CatchPolaroid`, `block_user_dialog`,
`confirm_danger_dialog`, `ordered_photo_picker`) are classified during
extraction: entity-material primitives whose API is expressible in
presentation-neutral types move to `catch_ui/src/components`; anything
importing feature domain types stays app-side in `lib/core/widgets` (which
shrinks to the app-coupled remainder) or moves to its owning feature.

*Rejected alternative:* keeping folder-only boundaries and adding more
scanners — that is the current state and the cause of P1/P7 findings.
*Rejected:* extracting a widgetbook/golden package too — the existing
top-level `widgetbook/` app simply repoints its dependency at `catch_ui`.

### D2. `catch_ui` copy policy

`catch_ui` must not import the app localization catalog. Two sanctioned forms:

1. Callers pass already-localized strings (the default; most components
   already work this way).
2. Widget-owned fixed concepts (retry labels, offline notice copy,
   accessibility labels) use a package-local ARB with `gen_l10n` inside
   `catch_ui`, keeping the audience/ownership metadata discipline. The mobile
   copy ownership gate extends its scan roots to the package.

The 31 currently l10n-coupled `core/widgets` files are dispositioned
one-by-one between these two forms during Phase 3; no third form (English
literals in the package) is permitted — the copy scanners keep enforcing
that.

### D3. Goldens are derived from the Widgetbook corpus, and coverage is whole-corpus

- The Widgetbook use case is the single declaration of a component's states.
  A golden runner enumerates designated use cases and renders each at
  light/dark; text-bearing L2–L4 components add text scale 2.0. Reuse
  `matchCatchGolden`, the bundled-font loader, and the checked comparator
  tolerance; run in the existing visual-integration CI lane.
- Adopt the maintained Widgetbook test/generator integration for corpus
  enumeration if it satisfies the spike in Phase 1; hand-roll only the thin
  runner if not (build-vs-adopt policy: prefer adoption, record the trial).
- Coverage becomes whole-corpus: a deterministic script diffs the public
  export surface of `catch_ui` (post-extraction; `core/widgets` `Catch*`
  classes pre-extraction) against golden case ids. Missing coverage is a CI
  failure or an explicit waiver row with owner + expiry. The diff-based
  `HEAD^` gate is retained for feature widgets only.
- **The catalog's charter is tiered by ladder level.** The 2026-09-04 harness
  baseline (≈46,100 handwritten lines, 28 files, 309 local scaffold classes)
  is debt to shrink, not a pattern to extend:
  - **L2–L4 (`catch_ui`):** exhaustive — every variant × theme, knob- or
    matrix-driven, golden-asserted; zero provider scaffolding required by
    construction once D1 lands.
  - **L5 bodies:** a bounded state set, always mounting the production widget
    with `lib/design_fixtures` data — this is composition-regression
    coverage, not decoration.
  - **L6 screens under provider scopes:** lowest value, highest harness tax,
    and redundant with the UI capture pipeline. Each existing case either
    migrates to that pipeline or records an explicit keep reason.
  - **Prototypes:** Widgetbook-defined compositions proposing future UI must
    carry an explicit proposal marker in the case name (for example,
    `· proposed`). They are excluded from production golden coverage. Their
    keep/promote/delete disposition stays with the owning feature review;
    the three `EventSuccessModuleConsolidationPrototype` cases belong to the
    Event Success consolidation review.
  A shared frame/scope harness library and knob-driven state matrices replace
  hand-enumerated permutations; hand-built harness volume becomes a tracked
  measure of remaining provider coupling.

### D4. One identity registry; the widget catalog inventory becomes generated

`design/components/catch.components.json` (plus the source tree itself) is the
identity registry. The inventory tables of `docs/widget_catalog.md` are
generated from a source scan (class, file, level, one-line purpose from the
class doc comment) merged with registry metadata. Hand-written content in the
catalog shrinks to the Canonical Usage Decisions section. The new-widget gate
then checks registry + Widgetbook only — one fewer hand-maintained surface,
which is the single biggest "docs fight code" tax removed.

### D5. Naming grammar v1 is binding

Ratify the grammar in the Appendix, record each shared component's ladder
level and role noun in the registry, extend `design:lexicon:check` +
`check_widget_classification` to enforce: `Catch[<UseCase>]<RoleNoun>` classes only in
`catch_ui` (role nouns from the closed lexicon), `<Feature><RoleNoun>` for
public feature widgets, file suffix vocabulary, variant enums as
`<Component><Axis>`. The 7 unprefixed core files are renamed or re-homed
during Phase 3 extraction (compiler-verified rename).

The 2026-09-08 owner clarification makes the intended collision behavior
explicit: compare implementations of the same public responsibility and choose
one canonical contract. Meaningful variations use named constructors, typed
variants, or a use-case name with a concrete comparison against an existing
contract. A different registry ID or implementation technique is insufficient.
The durable Naming Grammar in `docs/app_architecture.md` owns the spelling,
comparison metadata, and role-selection boundaries. Menu, Surface, Input, Text,
and Image join the closed vocabulary for their existing responsibilities.
The same source review identifies six inherited context publishers. Scope is
reserved for that job: a member of its data-owning concept, with a use-case
naming the published contract and an executable inheritance/ownership check.
Geometry, visibility, interaction policy, active-tab clearance and status
publication retain their independently consumed contracts.
The delegated source review also consolidates box and sliver asynchronous state
switching into one `AsyncBoundary` role. Skeleton, ErrorState, Surface and
Viewport own visual or geometric responsibilities, so none accurately names
state selection, retention and recovery. The new role is unqualified at its
canonical entry point; box/sliver output uses named constructors, and the
existing typed state snapshot remains nonvisual data.
Public anatomy remains a registered member of its primary concept; this does
not permit private shared Widgets or multiple unrelated primaries in one file.

### D6. Handwritten source gets the test-size ratchet treatment

New or split handwritten Dart files in `lib/**`, `packages/**`, and
`widgetbook/lib/**` stay at or below 800 lines; existing offenders enter a
decrease-only baseline
(`tool/architecture/flutter_source_size_baseline.json`) mirroring the test
ratchet mechanics exactly. The 12 `lib/**` monoliths and the Widgetbook
use-case monoliths (9,885-line `primitive_contract_use_cases.dart`,
8,586-line `host_operations_use_cases.dart`) get named split plans in
Phase 5 (repository by subdomain, screens by pane/workspace, `catch_tokens`
by tier during Phase 2/3, use-case files by component family onto the
Phase 1 shared harness).

The `CatchField` constructor facade is one explicit file-size exception:
`packages/catch_ui/lib/src/components/catch_field.dart` may contain at most
1,150 lines. Its named const/factory constructors preserve supported mode
arguments and one keyed widget identity; configuration records, pure property
resolution, state and rendering remain in separate files within the ordinary
800-line cap. The exception does not allow private Widget config subclasses or
Widget-returning helper methods. Phase 5's source-size gate must encode this
exact path and cap, seed an over-cap probe, and retain decrease-only protection.
No other file inherits this exception.

### D7. Migration Protocol v2 (binding for every slice in this program and
after it)

A migration slice is complete only when all five hold:

1. **Inventory first.** A deterministic, checked-in scanner (or `git grep`
   command recorded in the slice) defines the call-site set before work
   starts; its zero-count is part of the DoD.
2. **The old thing is deleted in the same slice.** Old symbol, file, alias,
   or export removed; `flutter analyze` (workspace) green is the completion
   proof. Deprecation may exist only *inside* a slice to stage a `dart fix`
   sweep, never across slices. (Pre-launch mandate: no compatibility layers.)
3. **Ratchets move in the same PR.** Any affected decrease-only baseline is
   lowered in the migration PR, not a follow-up.
4. **New rules ship with probes.** Any lint/check added by the slice lands
   with a seeded fixture proving it fires (existing gold standard), at
   `info` first only if a violation pile exists, promoted within the same
   phase.
5. **Catalog moves with code.** Widgetbook cases, goldens, and registry
   entries for touched shared components update in the same PR.

`pattern_adoption.json` remains for pattern bookkeeping, but an `aligned`
claim must name its machine check or carry an explicit `manual-review` line
with reviewer and date. Every `*_baseline.json` in the repo gains an owner and
target-zero phase reference; a baseline without one is drift
(enforcement-integrity gate extension).

### D8. The check estate shrinks after extraction

After Phase 3, every boundary invariant now expressed by package graphs
(riverpod/firebase/feature imports in the design system, token-definition
placement) has its scanner/lint retired via the existing enforcement-integrity
workflow (rule, manifest, owner-doc anchor, and probe removed together).
Target: net negative check count for this program. New checks added: golden
coverage, source-size ratchet, naming grammar, catalog generation drift —
four in, more than four out.

### Cross-framework extension (D9–D14, ratified 2026-10-17)

Measured on 2026-10-17 against registry v4: five files assigned component
identity (`catch.components.json` with 65 contracts, plus the web-ui, admin,
website and shared-adoption registries); 10 of the 65 contracts had a React
mapping, each carrying up to four names (`CatchButton`, `Button`,
`AdminButton`, `ButtonControl`); 149 of admin's 235 "shared primitive" entries
belong to a single feature family; 231 of 312 shared React exports end in a
noun outside the closed role-noun list; and six Flutter concept names fell
outside the grammar (`CatchEventCard`, `CatchCoverStory`,
`CatchActivityMapPin`, `CatchMapPreview`, `CatchRosterTable`,
`ChatInputBar`). D12 brings `CatchRosterTable` inside the spelling rule, but
its API still names the roster domain concept. The ratified tier model (registry `tier`, T1–T4) is owned by
`design/components/README.md`; the naming rules by the Cross-Framework Names
subsection of `docs/app_architecture.md`.

### D9. Strict cross-framework identity

A registered concept has the same symbol and the same prop, slot, state, enum
and callback names in Flutter and React: `CatchButton` with `variant`,
`size` and `onPressed` in both. Flutter named constructors are a typed
`recipe` prop in React. Rejected alternative: idiomatic React names
(`Button`, `onClick`) with a per-concept mapping table, because the mapping is
one more registry that drifts.

### D10. `@catch/web-ui` ships styled components

The shared React package moves from headless `*Control` components with
per-surface styled adapters to styled `Catch*` components. Surface differences
such as admin density are a prop or a scope. Adapters are deleted as each
surface adopts the shared component. Rejected alternative: keep the headless
split, because per-surface styling is where cross-surface visual drift lives.

### D11. The registry contract owns behavior

`sourceOfTruth.behavior` names the registry contract as the owner of behavior,
accessibility, layout and state for every framework; Flutter is the reference
implementation. Rejected alternative: Flutter code as the source of truth,
which keeps React a permanent port.

### D12. `Table` joins the role nouns

`Table` is added now for a new T1 `catch.table` concept that serves admin's
`DataTable` family and the host roster table. `Chart` and a desktop-navigation
noun wait until a second surface needs them.

### D13. Panel folds into Surface; metrics wait for the inventory

`WEB-SHARED-PANEL-001` moves from `keep_surface_specific` to `planned`: panel
and card containment become `CatchSurface` recipes. `WEB-SHARED-METRIC-001`
stays separate until the Phase 7 inventory compares both anatomies against
`CatchMetricSection`.

### D14. The event page matches at screen level

`catch.event_detail_sections` becomes a cross-framework screen contract: the
web event page and the app's event detail render the same sections in the same
order, because it is the one page both frameworks render for the same person.

### D15. Predicted names, aliases and material/binding split

Owner direction (2026-10-17): solve recreation at the root, even at higher
up-front cost; name each widget what an agent unaware of it would write; close
every gap found in the same pass. Measured the same day over 1,028 feature
widgets: 337 (33%) failed the role-noun rule, and the nouns agents used most
were Card (42 Flutter, 18 React), Body (59), List (19 Flutter, 23 React), Panel
(16, 14), Step (15), Editor (12) and Grid (6, 25). A rejected name never pointed
at the existing component, so agents renamed and rebuilt.

- **Vocabulary follows evidence.** Card, Body, List, Step, Editor, Rail,
  Picker, Grid, Preview, Dock, Map, Pin and Thumbnail join the role nouns;
  RowList retires into List and `CatchDockSurface` becomes `CatchDock`;
  Workspace joins Screen as a route-level suffix; synonyms such as Panel and
  Content redirect to existing roles. The new nouns alone make 140 of the 337
  failures valid.
- **Aliases steer at creation time.** Registry components and role nouns
  record the other names an agent would write; the catalog and context pack
  index them, and the new-widget gate rejects a name that matches an existing
  component's name or alias, naming the component to use.
- **Materials and bindings.** Domain-free materials (`CatchTicket`,
  `CatchPoster`, `CatchTable`) live in the design system in both
  frameworks; thin feature bindings with predicted names (`EventCard`,
  `ClubCard`, `ParticipantTable`) map domain data onto them. This resolves
  the draft rename sheet's Q1 (split, rather than either keeping feature-shaped
  T2 widgets or forcing domain types into the design system), Q2 (`Pin` and
  `Map`) and Q3 (`ChatInput` stays chat-owned with aliases; it moves into the
  design system only when a second, non-chat surface needs it).

Rejected alternatives: keeping the closed list as-is (it rejects what agents
write without steering them), and adding every noun agents use (Panel, Page,
View and Content are synonyms of existing roles and would recreate the
synonym problem the grammar removed).

Phase 7b.2 (2026-10-18) applied the same test to the 174 remaining name
failures. Bubble (`MessageBubble`), Form (`LaunchAccessApplicationForm`) and
Listener (`ForegroundNotificationListener`) are what agents write and no
existing role covers them, so they join the list; Transition joins in slice 3
for motion-only wrappers (`WelcomeRevealTransition`), the name Flutter itself
uses. The other tails are synonyms
and became redirects: Selector, Scrim, Block, Controls, Loading, Wrap, Group,
Stat, Value and Artwork.

### Web code unification (D16–D17, ratified 2026-10-22)

Measured on 2026-10-22 against `origin/main` e53c26ec4 and the live
`catchdates.com`. The website and Admin already shared one npm workspace,
React, TanStack Query, Firebase, tokens and the query-client factory. Above
that layer they duplicated each other: `catch.field` had 12 implementations
across `@catch/web-ui`, the website and Admin, `catch.button` 8 and
`catch.badge` 7. The website's shared UI layer held 279 exports that one
feature rendered against 56 that several did; Admin's held 147 against 38. The
registry had no layout concepts, and web CSS used no typography token, so
layout and type were written as raw CSS in each app: about 3,400 raw values in
website CSS and 1,270 in Admin's. Admin also read 16 `--admin-*` variables
that were never defined. The two apps call disjoint callables (about 62 and
50) and share no business logic beyond the generated contracts.

### D16. One web system, two deployables

The website (`catchdates.com`, server-rendered Next.js) and Admin
(`admin.catchdates.com`, signed-in single-page app) stay separate deployables
on separate origins, so a script injected into a public page cannot reach an
operator's Firebase Auth session, and each app keeps the rendering model and
release cadence it needs. Everything above the deployable is shared: styled
components and layout primitives in `@catch/web-ui`, tokens and one lint
preset in `@catch/web-config`, and `@catch/web-data` for the Firebase
bootstrap, the contract-validated callable client and query helpers. Each app
owns only its routes, screens and feature controllers. Rejected alternative:
one Next.js app serving both hosts, which would move Admin's 83k lines onto
App Router, couple both release gates and remove the origin boundary, for no
sharing the packages do not already give.

### D17. Web enforcement adopts stylelint and ESLint

Raw values, component placement and screen assembly on the web are enforced
by stylelint and ESLint rules from the shared preset. Each app records the
violations it already has with the tool's own bulk suppressions, and a
freshness check fails when a recorded count is above what remains, so the debt
only shrinks. A hand-written web scanner retires in the same change that lands
the rule replacing it, so D8's net-negative check count applies to the web
too. Rules that need a token family wait for that family: no rule may fail a
build with nothing valid to switch to. Rejected alternative: extending the
hand-written Node scanners, which numbered about eighteen and covered none of
spacing, typography or sizing.

### D18. The library draws; features arrange and bind (ratified 2026-10-23)

Owner direction (2026-10-23): every screen is built from library components,
a visual one place needs goes into the library instead of the feature, and
Flutter and React follow the same rule. Measured on 2026-10-23 against
`origin/main` f03deb7e5, using scans that only report:

- **Flutter.** App code outside `catch_ui` and `lib/platform/theme` has 585 files
  that define widgets.
  - 245 (42%) already only arrange and bind.
  - 140 draw nothing except text. App code makes 1,020 `Text`, `TextSpan` and
    `SelectableText` calls, which is CAT-211's switch to `CatchText`.
  - 200 draw. 84 of them draw only an `Icon` (331 calls), and the library has
    no icon component to switch to. The other 116 build their own visuals in
    377 calls, led by `BorderRadius` and `ColoredBox` (49 each),
    `BoxDecoration` and `Tooltip` (25 each), then `Material`, `ClipRRect`,
    `CustomPaint` and `DecoratedBox` (16 to 18 each).

  The same files call framework layout widgets (`Column`, `Row`,
  `Expanded`, `Padding`, `SizedBox`, `Stack`, `Wrap`) 2,162 times.
- **React.** Feature and app-shell code has 123 `.tsx` files, and 88 of them
  render raw HTML: 48 of Admin's 60 files (947 elements) and 40 of the
  website's 63 (539 elements). The existing boundary gate keeps `className` out
  of all of them, and only 8 pass `style`. Instead, 649 rules in the apps' CSS
  reach these bare elements through a parent class
  (`.intake-batch-inspector p`).
  - The 1,486 elements are 998 text elements (`p`, `span`, `strong`, headings,
    `code`), 272 table elements, 186 layout, list and landmark boxes, 20
    `legend` and 9 images.
  - The two apps' 44 shared-UI files add 1,252 raw elements and 811
    `className` uses. All of that drawing belongs in the library.

The rule:

- **The library draws.** Anything that decides how something looks lives in
  the framework's library, `packages/catch_ui` or `@catch/web-ui`, however
  many places use it. That covers surfaces, borders, clipping, painting,
  images, icons, type, tap and hover feedback, and composite visuals such as
  the ticket. Every library component has a registry entry and a tier.
  - A component that only one surface uses is T4.
  - Library components stay domain-free, as D15 materials do: they take
    presentation props and never import domain types, repositories, Firebase
    or routes.
- **Features arrange and bind.** Feature and screen code (L5 and L6 in
  Flutter, `features/**` and the app shells in React) may only:
  - arrange library components, spaced with token values;
  - pass domain data and callbacks to library props.

  It renders no raw drawing element, passes no styling and uses no raw value.
  - **Web:** arrangement goes through `CatchGap`, `CatchInset`, `CatchPageBody`
    and `CatchSectionList`, because an HTML element without a class has no
    layout of its own.
  - **Flutter:** features keep the framework's layout widgets (`Row`,
    `Column`, `Stack`, `Expanded`, `Wrap`, `Align`, slivers). They arrange but
    draw nothing, and the existing raw-value lints already keep their spacing
    and sizes on tokens.
  - `lib/core/widgets` and the two web apps' shared-UI layers follow the
    feature rule. Their widgets become bindings, and their drawing moves into
    the library.
- **The rule looks at what code renders, not where a class lives or whether it
  is private.** A feature widget that only arranges and binds is legal. The
  new-widget gate's existing ban on new private widget classes is unchanged.
- **Checking each addition stops duplication; where files live does not.** A
  new library component needs a registry entry with its tier and aliases
  before it merges. When its name, an alias or its role noun matches an
  existing entry, it also records `comparedWith` and a `comparisonReason`
  saying why it is not a recipe of that entry.
  - The new-widget gate (Flutter) and `web:shared-ui-adoption` (React) do this
    today for T1 and T2. D18 extends both to every tier.
  - T4 entries are where generalisation starts. When a review finds two T4
    entries doing one job, they become one recipe, and a second surface
    adopting one promotes it.
- **Cross-framework parity is required only for T1 and T2.** D9's rule (same
  symbol and props in both frameworks) applies to those tiers. A T3 or T4
  component exists in its one framework and needs no twin.

Rejected alternatives:

- **Every distinct composition in the library, with no bindings in
  features.** Screen sections would move too, so the library would mirror the
  app's structure, and every product change would become a library change. To
  render domain data, the library would have to import domain types, at which
  point it is the app.
- **One-offs stay in their feature until a second consumer appears** (the
  placement rule until now). A visual drawn inside a feature is invisible to
  the next agent, which draws its own. That is how `catch.field` reached 12
  implementations.
- **A visuals folder in each feature.** It turns one place to check into one
  per feature.
- **Single-use shared exports move into their feature** (the earlier Phase 7
  "screens become assemblies" plan). That puts drawing back into features.
- **Parity for every library component.** Admin-only and native-only
  components would need twins that no surface renders.

### Brand baseline v1 (D19–D21, decided 2026-10-24)

Owner direction (2026-10-24): consolidate first. Collapse the many loosely
defined variants into one definition per concept, chosen by expert judgement
and common practice, so the product converges on one brand style. If a choice
later disappoints, changing it edits a finite set of library defaults rather
than hundreds of screens. The owner delegated these calls to the coordinator
(Claude), who made them from side-by-side review sheets of every current
version.

Measured on 2026-10-24 against `origin/main` 4b9c3e887. All 47 website and
Admin route stories were rendered in Chromium, and Flutter was counted from
source:

- **Type.**
  - The website renders 149 distinct text styles at 43 sizes and 12 weights.
    Its Archivo headlines come in 28 sizes from 20 to 83px.
  - Admin renders 43 styles at 10 sizes and 11 weights. 886 of its 1,218 text
    elements are smaller than 13px.
  - The app has 8 headline sizes spread over 7 named styles.
  - Both frameworks already set Archivo at 78% width. They differ in weight
    (app 600, website 760) and letter-spacing (app 0, website −0.035em).
- **Buttons.**
  - The app has 627 `CatchButton` call sites. They are pills, except 11 that
    use 14px corners.
  - The website has 214. Its button component is a pill, but 42 rules in 14
    page stylesheets restyle it, so pages render 83 buttons with 4px corners,
    37 pills and 15 flat tabs.
  - Admin has 317. They have 8px corners at 40px, its table buttons are 28px
    pills, and none has a hover state.

### D19. One type scale

1. **Display voice.** Archivo stays at 78% width and is set at weight 760.
   Line height and letter-spacing follow the step, as in the table below.
   Archivo is only for headlines of 24px and up. Anything smaller uses the
   function roles in the system font.
2. **Six display steps on a 1.25 ratio.** These are `CatchText` variants with
   the same names in both frameworks:

   | Variant | Size | Line height | Letter-spacing |
   | --- | --- | --- | --- |
   | `displayXs` | 24px | 1.1 | −0.02em |
   | `displayS` | 30px | 1.05 | −0.025em |
   | `displayM` | 38px | 1.05 | −0.03em |
   | `displayL` | 48px | 1.0 | −0.035em |
   | `displayXl` | 60px | 1.0 | −0.04em |
   | `displayXxl` | 72px | 1.0 | −0.04em |

   - The app uses `displayXs` to `displayL`, and `displayXl` only for
     celebration moments.
   - The website uses all six. Below 640px wide, `displayXxl` and `displayXl`
     render two steps down. Its fluid `clamp()` headlines snap to a step at
     each width.
   - Existing roles map onto the steps:
     - `display` (44px) becomes `displayL`.
     - `headlineS` (26px) becomes `displayXs`.
     - `clubDisplay` and `eventDisplay` merge into these variants, which
       settles CAT-235 as its option C. Their step s (22px) and step m (27px)
       become `displayXs`, step l (32px) becomes `displayS`, and step xl
       (38px) becomes `displayM`. That keeps the hero's collapsed and expanded
       titles different sizes.
     - `eventTitle` and the welcome reel (36px each) become `displayM`.
     - `consoleTitle` (20px) becomes the function role `title`.
     - Line heights and weights that callers pass today are dropped.
3. **Interface text.** The shared function roles stay as they are.
   - **Weights.** 400 for reading text, 500 for labels and field values, 600
     for names, titles and buttons. 700 is only for metrics and numerals, and
     760 only for display. Every other weight snaps to the nearest of these.
   - **Admin.** Admin uses the same roles, and its reading text is at least
     13px (`context`). 11–12px is allowed only for mono kickers, status labels
     and badges. Admin page titles use `title`. D10's compact density scope
     is not used for type.

### D20. One button

1. **Shape.** Every button has 4px corners (`radius-xs`) in every framework,
   full-width sheet buttons included. `CatchButtonMode.rounded` retires.
   - Pills are only for chips, filters, segmented toggles, count badges and the
     floating map/count control, so the shape tells an action from a filter.
2. **Variants.**
   - **Primary** has an ink fill. It keeps its activity-accent option, and
     React gains the same prop.
   - **Secondary** has no fill and a 1px border in the shared control border
     colour, which turns full ink on hover. That colour already outlines
     every other control and clears the 3:1 guideline for control edges
     (about 3.2:1 on paper); the website's 42% ink gave only about 2.7:1
     (amended 2026-10-24 in the Flutter D20 change).
   - **Quiet** is text only.
   - **Danger** has a red fill. It is only for the confirming action of a
     destructive flow.

   On dark surfaces the same variants resolve through the dark theme, so there
   is no separate light or inverse variant. Variants that retire:
   - App: `ghost`, `.text` and `.command` become quiet. `dangerSecondary`
     becomes secondary, because the confirm step carries the destructive
     meaning. `light` becomes primary inside a dark scope.
   - Website: `ghost` and `ghost-light` become secondary.
   - Admin: the ghost button becomes secondary, the link button becomes quiet,
     and the table action button becomes secondary at size S.

   These are not buttons:
   - the app's `.selection` becomes a chip;
   - Admin's `selected` becomes a segmented control;
   - the website's filter buttons become chips;
   - the app's `.floating` stays its own component.
3. **Sizes.**

   | Size | Height | Label | Horizontal padding | Absorbs |
   | --- | --- | --- | --- | --- |
   | L (default) | 48px | 15px / 600 | 20px (`s5`) | App 48 and 56, website 48 and 52 |
   | M | 40px | 15px / 600 | 16px (`s4`) | App 36, website small 40, Admin 40 |
   | S | 32px | 13px / 600 | 12px (`s3`) | Admin 28, 30 and 34 |

   On touch devices every size keeps the platform's minimum touch target,
   whatever height it draws.
4. **States.**
   - **Hover:** an overlay in the label's colour, 8% on filled buttons and 5%
     on secondary and quiet.
   - **Press:** a 14% overlay and a 0.97 scale. There is no scale under reduced
     motion.
   - **Keyboard focus:** a 2px ring in ink (paper on dark), offset 2px.
   - **Disabled:** 40% opacity and a not-allowed cursor.
   - **Loading:** three dots replace the label at the same width, with busy
     semantics.
   - Transitions use 120ms on the standard curve. The website's hover lift
     (a shadow plus a 1px raise) retires.

### D21. Consolidation decision rights

- **Approved without a packet.** The PR body lists each change from → to,
  with counts. Visual baselines may update for these changes alone.
  - Snapping any raw or off-scale value to the nearest existing token. That
    covers type, spacing, size, radius, colour, elevation and motion duration.
  - Moving a hand-built element onto the nearest existing library component or
    variant, together with that component's own rendering and feedback.
  - Implementing D19 and D20.
- **The coordinator decides, with no wait for the owner.** These need a Linear
  packet first:
  - a new component, variant, prop or token;
  - a mapping where the nearest option is more than one step away or would
    change meaning, such as removing a colour that signals state, truncating
    or dropping content, or restructuring a layout;
  - retiring a role that has no close equivalent.
- **The owner decides** product behaviour, copy, and brand identity beyond
  these library defaults: logo, palette hues and typefaces.
- **Changing a D19 or D20 default later** is a library change, made once and
  reviewed with captures. Screens don't change.

Rejected alternatives:

- **Keep the app's steps (22–44px) and its 600 weight.** The website's heroes
  would shrink to about half their size, and the lighter weight looks thin at
  78% width above about 30px.
- **Pill buttons everywhere.** This is the conventional choice. It keeps
  actions and filters the same shape on all three surfaces, and it would undo
  the consumer website's newest pages (#704).
- **Keep 11–12px reading text in Admin.** It fits about one more table row
  per screen, at the cost of readability over long working sessions.
- **The owner reviews each packet.** Consolidation waited hours at a time on
  calls that set no brand direction.

`docs/design_language.md` takes D19 and D20 in the change that updates the
library defaults.

## Part 4 — Delivery Program

Codex executes all phases. Claude/owner review gates sit between phases.
Every phase obeys Migration Protocol v2 and the repo starting loop
(worktree via `worktree_guard`, derive gates via
`node tool/harness/verify_local.mjs --base origin/main --list`, commit
incrementally). No phase may begin before the previous phase's gate is
explicitly closed by the owner.

### Phase 0 — Ratify and fold in (docs only)

Executed in two slices because `docs/app_architecture.md` and
`docs/widget_catalog.md` were under an active worktree-guard claim
(`events-platform-integration-20260904`) when the program started.

**Phase 0a (landed with this spec):** decisions D1–D8 ratified by the owner
on 2026-09-04 (including the D3 catalog-charter amendment); spec registered
in the docs index; execution-ownership note added to
`docs/design_parity/composition_migration_spec.md`.

**Phase 0b (executed 2026-09-04, same day the claim closed):** the Quick
Decision Layer and Naming Grammar sections now live in
`docs/app_architecture.md` (v1.25.0), the Protocol v2 completion bullet in its
Definition Of Done, and the generated-tables note in
`docs/widget_catalog.md` (v3.11.0). The staged Appendix B was applied and
removed (moved, not copied).

Phase 0 is complete. Phase 1 is unblocked in full.

### Phase 1 — Catalog becomes a test (goldens before any moves)

This lands **before** extraction so the corpus is a safety net under Phases
2–3.

Scope:

1. Spike the Widgetbook corpus→golden integration (adopt-first per D3);
   record the adopt/build decision with evidence in the PR.
2. Golden runner over designated `core/widgets` use cases: light/dark for all;
   text-scale 2.0 for text-bearing components. Deterministic fonts and
   comparator reused from `test/goldens`.
3. Whole-corpus coverage gate `design:golden-coverage` (public `Catch*`
   classes in `core/widgets` vs golden ids; waiver rows carry owner + expiry),
   registered in the tool manifest and the visual-integration lane.
4. Seed baseline images; wire failed-image artifact retention (exists).
5. Use-case triage: a deterministic classifier assigns every registered use
   case to `component-mount`, `body-mount`, `screen-scope`, or `prototype`.
   A `prototype` is a Widgetbook-defined composition proposing future UI,
   requires an explicit proposal marker in its case name (the `· proposed`
   suffix qualifies), and is excluded from the golden-coverage requirement.
   Prototype keep/promote/delete decisions belong to the owning feature
   review; the three Event Success proposals stay with that consolidation
   review and are not edited or deleted by this spike. Generated output stays
   on demand (no tracked ledger); the authored disposition of `screen-scope`
   cases (migrate to the UI capture pipeline vs a named keep reason) is a small
   reviewed source file in Phase 1 proper.
6. Shared harness library: one frame/scope utility set replacing the repeated
   `_DeviceFrame`/`_SheetFrame`/provider-scope shapes, adopted by the
   reference golden slice; knob/matrix-driven state enumeration for L2–L4
   cases so permutations stop being hand-written.
7. No production `lib/**` changes in this phase beyond test/catalog code.

DoD (mechanical): coverage gate green with waivers ≤ 20; golden suite green
twice consecutively in CI (flake check); a deliberately broken spacing token
in a scratch branch produces a visible golden diff (known-bad proof); the
triage classifier covers every registered use case with zero unclassified
across `component-mount | body-mount | screen-scope | prototype`, every
prototype has an explicit proposal marker, and every `screen-scope` case
carries a disposition. Importing the production package is only a proxy for
production mounting: the three Event Success prototypes are identified
exceptions, despite importing production primitives.

**Execution (2026-09-05):** Phase 1 is implemented. The adopted
`widgetbook_golden_test_core` generator enumerates all 972 registered use
cases inside `flutter_test`; the Catch adapter retains the existing bundled
fonts, theme setup, and `matchCatchGolden` comparator. The app-golden default
remains 0.30%; the text-heavy Widgetbook corpus uses a separately checked
0.60% allowance after reviewed macOS 26 arm64 CI diffs measured at most
0.5188% against macOS 27 authoring baselines and were confined to
anti-aliased text/icon edges. The designated `core/widgets` corpus contains
249 golden ids: every case renders
at light and dark, and 217 text-bearing L2–L4 cases also render at text scale
2.0. The checked baseline contains 944 images. Two consecutive local runs
passed all 469 tests in 1:07 each with no rendering drift. The CI lane runs
the same corpus twice sequentially and retains failure artifacts.

The whole-corpus coverage gate measures 259 public pre-extraction `Catch*`
classes: 241 are covered by 249 golden ids and 19 carry owner/expiry waivers
(limit 20). The four-class triage measures 274 `component-mount`, 335
`body-mount`, 360 `screen-scope`, and 3 `prototype` cases, with zero
unclassified. All 360 screen-scope cases have authored dispositions (65
`migrate-to-ui-capture`, 295 `keep-widgetbook`). The three prototypes retain
the `· proposed` marker and remain owned by the Event Success consolidation
review. A shared catalog/device/sheet frame API plus provider and case scopes
now owns the repeated harness shapes; the reference cases and golden runner
adopt it without a bulk catalog migration.

The known-bad proof remains isolated on scratch commit `0171d20e0`: changing
`CatchSpacing.s4` from 16 to 32 fails the reference menu-row goldens by
22.8727% (light) and 22.8691% (dark), above both checked thresholds. The scratch
commit is not part of Phase 1 history. No production `lib/**` file changed.
The owner closed the Phase 1 review gate by merging PR #335 and authorizing
Phase 2 continuation.

### Phase 2 — `packages/catch_tokens`

Scope: create the package; retarget `tool/design_tokens.dart` generator
output; move generated primitive tokens plus the semantic token classes,
splitting the token monolith by tier during the move (D6);
rewrite imports
mechanically across the workspace; delete the migrated originals
(`lib/platform/theme/catch_tokens.dart`, `catch_platform_tokens.dart`, and
`generated/catch_design_tokens.g.dart`); keep the lint plugin's token exemption
pointed at the new package. Theme wiring, typography, icon assets, gap widgets,
and app-coupled activity palettes remain app-side until Phase 3.

DoD: old files gone; `flutter analyze` green across workspace members and
widgetbook; `dart run tool/design_tokens.dart --check` green; goldens
unchanged (Phase 1 proof of no visual drift); lint probe corpus green.

Implementation: `packages/catch_tokens` is a Flutter-only production dependency
in the Dart workspace and exports generated scales plus handwritten primitive,
semantic, and component token units. Its 20 handwritten library files stay
within D6 (largest: 796 lines). Welcome reel and form-workspace geometry have
separate token owners; their expressions and the remaining token values are
preserved. The three migrated originals are deleted, all active consumers use
the package, generator/discovery paths follow it, and the affected test-size
ratchet is lowered. The package dependency check rejects non-Flutter packages;
standard Flutter lints reject undeclared app imports. The workspace analyzer
explicitly targets the package's `lib` source after a seeded probe demonstrated
that directory-wide Flutter analysis could skip it.

The owner closed the Phase 2 gate by approving PR #365 for merge and
authorizing continuation. It merged as `8ba30b124288c4f36a7f39850d07a50bbc672fd6`.

### Phase 3 — `packages/catch_ui`

Sub-slices, each independently gated by compiler + goldens:

- 3a foundations (text styles, icons, motion, theme wiring);
- 3b primitives (L2);
- 3c components (L3: fields, sections, tiles, states, sheets) with the D2
  l10n disposition of the 31 coupled files and D5 renames of the 7 unprefixed
  files;
- 3d patterns (L4: scaffolds, section pages, tab scroll views, form-row
  orchestration) and the `lib/platform/riverpod_ui/` adapter move;
- 3e entity-material classification (poster/polaroid/ticket family) per D1;
- 3f `widgetbook/` repointed to depend on `catch_ui` (+ app package only where
  feature use cases require it); `lib/catch_ui.dart` barrel becomes a
  re-export shim for exactly one slice, then is deleted.

DoD per slice: moved files deleted at origin; workspace analyze green;
goldens unchanged or intentionally re-baselined with review; `catch_ui`
pubspec contains no riverpod/firebase/app dependency (checked by a one-line
manifest assertion, replacing the scanners it obsoletes).

Phase 3a moves the font registry, semantic text styles, icon facade, motion
helpers, and bundled font/license assets into `catch_ui/lib/src/foundations`.
`CatchTheme` owns feature-neutral Material wiring; the app retains `AppTheme`
as the activity-palette adapter. Branded styles use package-qualified font
families, and the existing golden loader resolves the same bundled bytes.
The package boundary permits only Flutter, `catch_tokens`, Phosphor, and the
single loading engine pinned to `skeletonizer` 2.1.3 under D1; workspace analysis
explicitly visits its library and test sources.

Phase 3b moves the provider-free surface, control shell, row-press surface,
text/icon atoms, gap values, image loading/grade/scrim, dividers, indicators,
and focused sizing/reveal protocols into `catch_ui/src/primitives`. The image
fallback has its own file. Motion render helpers become cataloged viewport
widgets with the same transitions; each has a single owning file. Each original
app file is deleted. Golden discovery
counts both remaining app classes and extracted primitives, preserving every
pre-move class and case instead of losing coverage at the package boundary.
Components, patterns/adapters, entity materials, and final public-barrel cleanup
remain the later Phase 3 sub-slices.

Phase 3c begins with provider-free badges, icon actions, status displays, charts,
record rows, section headers, and timestamp layout. These component bodies and
caller-owned copy are preserved at their package home; original files are
deleted and their exact corpus coverage follows the move. Buttons and index
rows follow, with button label/loading anatomy in individual files. Share-card
footers receive their existing localized brand label from app callers;
step progress receives a caller-owned counter formatter. The latter has only
catalog/test consumers, so its unused app-catalog entry is removed. The copy
ownership gate scans the package as well as the app. Optional field labels and
framework-error displays also receive resolved copy through the app presentation
adapter, including screen-reader labels and the debug-details disclosure. Their
public badge/disclosure anatomy has individual files. Provider-free bottom-sheet
chrome, day headers, metadata rows, and metric strips retain their public APIs
and layout behavior in individual package files. Hero backdrops and journey-step
anatomy follow the same ownership rule. Number steppers receive explicit caller
tooltips; their previous English defaults had no production consumers. The
remaining l10n-coupled field/section/sheet families retain their later extraction
work. Empty-state renderers and box/sliver placement also move into the package.
The route-neutral `CatchTabViewportScope` owns inherited active-page and bottom-
obstruction metrics; app tab identities remain app-side. Pattern discovery is
included in the same corpus coverage and runner so moving a placement owner
cannot remove its existing golden cases.
Persistent status rendering/publication and the basic screen scaffold also move
without changing their bodies. Their app state publishers and the root-header/
scroll compositions remain at their current owners for the next pattern slices.
Privacy badges receive their three translated visibility labels through the app
copy adapter. Their fixed mode-to-icon pairing and single accessible label are
preserved in the package; no app catalog is imported.
The low-level text-entry primitive and code-input row/cell/caret visuals have
individual package owners with unchanged bodies. Search and OTP keep app-side
constraint validation and localization until their remaining D2 extraction.
A direct text-input catalog matrix covers empty, populated and disabled states
at both themes and text scale 2.0, retiring its former coverage waiver.
Menus, their anchor/row owners, bottom docks, draggable sheet shells and inline
message surfaces also move with unchanged bodies. Anchored menu placement gains
direct top/bottom previews while retaining route-neutral obstruction metrics.
The shared package enables the Catch analyzer plugin at its own analysis root.
Exact foundation-definition and raw-control ownership follows the moved files;
seeded package-neighbor probes prevent extraction from bypassing enforcement.
Box viewport scrolling and bounded scene geometry move unchanged to the package.
Direct short/overflow, scene-size/inset and master-detail breakpoint previews
cover the four layouts and scene descriptor, retiring five waivers. Master-detail
and adaptive master-detail now have individual package owners with the same
route-body breakpoint, index width and divider. Their state-matrix and catalog
references move with the source.
The person polaroid is classified as L3 entity material: its API contains only
widget/string/color/callback presentation inputs, so the unchanged renderer
moves to the package. Distance rings retain their size negotiation and label
behavior, with a registered viewport member replacing the private body and
an individual file for the native-map-compatible edge label.
Person avatars and their clipping, obscuring, initials, veil and stack anatomy
also move into individual package files. App callers resolve activity colors
through the existing palette and pass count-label formatters through the app
copy adapter. Failed-image fallback, theme changes, rings, veils and stack
ordering retain their existing behavior; the shared API has no activity model
or app-localization dependency.

AsyncValue box/sliver boundaries, their state translator, mutation-error listeners
and mutation-message translation move to `lib/platform/riverpod_ui`. Each public
widget has its own file, preserving deadline/retry and pending-to-error behavior.
The sliver boundary inlines its local error selection into the exhaustive build
switch, resolving the private helper instead of carrying it across the move.
The two provider-free skeleton placement helpers remain with their app-side
layout dependencies in individual files until those patterns move. Golden
discovery includes the Riverpod adapter root so relocation cannot remove its
classes or designated cases. Notice queue/controller state and the app-level
host also move to the Riverpod adapter root. The host keeps its bounded queue,
priority/FIFO ordering, replacement-safe timers, gestures and accessibility
behavior. Provider-free notice data, tones and rendering have individual package
files; every caller supplies the existing localized dismiss label. The exact
resolved-symbol placement lint and its alias/tear-off probes follow the host.

Inline error-banner visuals and the canonical snackbar publisher move to the
package. Retry banners require caller-resolved labels through `withRetry`.
App-localized error mapping and mutation-state translation stay with the app
adapters, preserving retry eligibility and inherited-locale updates. The former
private localized banner is a public registered adapter with a direct preview.
The raw-feedback lint follows only the exact package publisher; package-neighbor
and retired-app-path probes reject bypasses.

Action-menu controls, the status-bar preview, progress-cue state and horizontal
rails also move to the package. Rail viewport and item rendering have named
component files in the existing section family, replacing their private widget
helpers. Direct previews cover bounded/intrinsic height and item/trailing-slot
sizing. Existing item-width clamps, lazy scrolling, gutters and divider
behavior are preserved. The rail scanner follows the package owner and scans
package callers, with package-neighbor and retired-path negative probes.
The host-row renderer is classified as L3 identity material and moves unchanged
with caller-resolved avatar colors replacing its activity-domain input. The
same accent still paints the verified mark; localized message copy and
callback-owned affordances remain app inputs.
Error content, terminal back actions and box/scaffold/sliver/inline placement
move into individual shared files. Four public app adapters replace the private
localized subclasses and resolve the existing error descriptor during build.
Callers supply retry labels to shared renderers; locale changes, explicit
recovery callbacks, secondary actions and placement behavior are preserved.
The existing action-required lint also covers the app adapters, with seeded
negative probes verified in CI.
Person-row identity, chat/trailing, unread/new indicators and roster anatomy
also have individual shared owners. App callers resolve typing and accessible
unread/new labels through the existing copy adapter; directory rows retain their
slot-only API. Count capping, unread emphasis, avatar shape, large-text stacking
and press surfaces are preserved.
The shared platform preference retains its iOS-only Cupertino decision. Bottom
actions, their content/overlay, and tab navigation move with unchanged rendering
and interaction bodies. The former private tab indicator becomes a registered
member with a direct preview; geometry and gesture state stay with the tab bar.
The bottom-action overlay also has a direct scrolling/safe-area preview while
retaining its existing embedded coverage.
Confirmation and form dialogs keep their distinct layouts in individual shared
files. Typed dialog actions and picker toolbar copy are presentation inputs;
app copy adapters resolve the existing translated defaults. The native picker
sheet becomes a registered member of the sheet family with a direct date/time
preview. iOS date clamping, cancellation and the Material picker paths retain
their existing behavior.
The window-size classification moves to `catch_tokens` as `CatchWindowSize`,
retaining the 600/840 boundaries and removing the unused width aliases. Typed
selection menus, sheets and adaptive triggers then move into individual shared
component files. Callers keep their items, selected values, callbacks and
trigger builders; direct previews cover the sheet and both adaptive triggers.

Analytics metric tiles, their two-column grid and data-quality rows move with
unchanged rendering into individual shared files. Typed display data requires
caller-resolved partial/missing labels; app adapters use the existing translated
copy. Separate metric and source-readiness concepts register their responsibilities,
and a direct data-quality preview adds both-theme and large-text coverage.

Ticket hero geometry, the notched outline and perforation are classified as L3
entity material. They move into individual package files with presentation-neutral
`CatchTicket*` names; callers use the existing geometry tokens directly and the
feature barrel no longer exports the retired app owner. The ticket contract
separates this material from domain-aware event cards and retains their rendering.

Responsive renderers move as the L4 `CatchViewport` family: available-width
selection, named local breakpoints and sliver cross-axis geometry. Builder slots
are explicit, fallback order and boundary comparisons are preserved, and the
unused grid-count helper is deleted. Feature-specific breakpoint values remain
app policy; direct contract previews exercise boundaries, fallback and geometry.

Share-card sheet rendering moves to the package with caller-owned capture keys,
busy state, copy and button-context callbacks. `CatchSheetShare` remains
app-side as the single PNG/platform-share adapter; its attribution, duplicate-
press guard, disposal checks and localized failure handling are unchanged.
The shared sheet has no external-share controller or app localization dependency.

Exclusive disclosure state moves as `CatchAccordionController`; field visibility,
gutter and interaction protocols have individual shared owners with unchanged
behavior. App fields and section layouts consume the package scopes directly.
Scope readers expose only obstruction, shape and outset values; the old
widget-returning `maybeOf` helpers are deleted, retaining absence-sensitive
section defaults and explicit-versus-resolved bleed.
Direct production-consumer previews replace the six controller/scope coverage
waivers; the event-entry scanner follows the controller rename with its seeded
negative probe. Feature-level geometry construction remains prohibited.

Page bodies, sliver bodies, terminal padding, section stacks/lists, responsive
section pages and contained focus surfaces have individual package owners.
The shared `CatchSectionTokens.twoColumnBreakpoint` preserves the 660-pixel local
threshold. Responsive branch renderers are inlined; the reused page paint-plane
helper becomes a registered internal widget with direct nested-gutter coverage
and the same feature-placement restriction. Domain-aware section rendering and
its field metadata inspection stay paired with the remaining field extraction.

Form-step specifications, review items, status and readiness have individual
shared pattern owners. Existing form-key/title helpers and readiness behavior
are preserved; direct production-consumer previews replace the two nonvisual
form-protocol coverage waivers. Feature wizard validation stays app-owned.

Header action groups, title stacks, adaptive tab bars, action wrappers,
collapsed titles and pinned sliver descriptors have individual package owners.
The tab-label helpers become a registered component with the same text/child/icon
precedence; direct previews cover selected/resting labels at both text scales.
The unused icon-action alias is removed in favor of its existing canonical owner.
Search configuration and the app top bars stay with their coupled field and
localized-copy extraction.

Pushed-route scaffolds, closed route-body descriptors, root-page bodies, page
specifications and semantic page owners now live in the shared patterns layer.
The page scroll widget keeps its controller and private state in one library;
the route scaffold keeps its closed body renderer. Rendering, scroll retention,
status publication and constructor vocabulary are preserved. Composition checks
resolve the extracted canonical source identities and retain their negative
constructor probe; direct previews mount the route and typed page protocols.

Field lanes, row/content/support anatomy, focus outlines, bounded steppers,
repeat targets, save controls, disclosure drawers and status rendering have
individual shared component owners. Their private state and painters stay with
the owning widgets. Callers supply the existing localized optional-field copy,
action labels and saving/saved accessibility labels; the status enum and reduced-
motion duration helper are shared, and field value typography belongs to
`CatchTextStyles`. Schema-bound field configuration, choices, toggles and
validation remain with the app field until their constraint boundary moves.
Text validation now receives caller-resolved message formatters through
`CatchFormValidationCopy`. The app adapter retains the same localized field and
length arguments; explicit-validator precedence and constraint order are
unchanged. The generated constraint type and runtime policy remain app-side.

Individual option rendering, the presentation-only option descriptor and the
variant vocabulary have shared component owners. Selected/disabled semantics,
spoken labels, hit targets, summary wrapping and label/mono/operational rendering
retain their bodies. The group controller and schema validation remain app-side;
its existing catalog cases cover the extracted option model and item directly.

The ticket clock and compact status badge are presentation-neutral entity
material: their APIs accept time, color, text and rendering geometry. They move
as `CatchTicketClock` and `CatchTicketStatusBadge`, retaining their existing
event-card member identities and the status badge's keep-distinct decision.
Their direct cases move into the primitive corpus with text scale 2.0 coverage;
the activity stamp and backdrop retain their app-domain visual specification.

Widgetbook already depends directly on `catch_ui` and retains the app dependency
for feature previews. The unused app compatibility barrel is deleted after a
whole-repository Dart directive scan found no import, export, or part references.
Shared UI and token imports use their package entrypoints. Removing the temporary
renderer exports from the shared barrel still follows the remaining app-side
field, section, root-header, and form-owner moves.

The form-review overview, review body, and sheet entrypoint receive their status
label formatter from app callers. The app copy adapter resolves the existing
Complete, Needs information, and Optional catalog strings; shared rendering no
longer reads the app localization catalog for these labels. The widgets remain
app-side until their schema-coupled field dependency moves.

Step-header callers also supply the full and compact counter formatters, and
identity-header callers supply the profile-action semantic label. Both headers
retain their progress clamping, large-text switch, and interaction semantics
without importing the app localization catalog. Their package move still follows
the shared search-field dependency.

Search fields and top-bar search configurations receive `CatchSearchFieldCopy`
from their callers. The package owns the pure copy protocol; the app supplies
its existing search, clear, and close translations. Explicit placeholders and
trigger tooltips retain their precedence. The field and top-bar widgets remain
app-side until the shared schema constraints and validation policy move.

Chip-field callers supply the existing optional-field copy and a typed item-label
formatter. The selector no longer imports the app catalog or requires the app
`Labelled` interface; schema values, selected sets, callbacks, and rendering are
preserved. Its package move still follows the schema policy and chip renderer.

OTP callers supply the existing one-time-code accessibility label from the app
catalog. Digit-key prefixes remain stable implementation identifiers; their
former catalog key and allowlist entry are removed. Input formatting, autofill,
submission, and visible cells retain their bodies without an app-copy import.

Typed form descriptors receive caller-resolved validation formatters and choice
labels. Their editors no longer import the app catalog or require `Labelled`;
normalization, schema filtering, pending saves, explicit/on-blur confirmation,
and typed patch factories retain their existing behavior. Shared field, section,
and constraint dependencies still precede the pattern package move.

Section callers resolve their optional lead accent from the app activity palette.
The section owns the same lead/title-color precedence and joins caller-owned
title/count values without importing app copy or activity types. Field geometry
inspection remains app-side until `CatchField` moves.

Chip activity recipes receive a presentation-only `CatchChipData` value. The
app palette resolves its label, glyph, and pigments during caller builds; the
renderer retains the approved soft/solid recipes, label overrides, interactions,
and semantics. The chip remains app-side until schema constraints move.

All field recipes receive `CatchFieldCopy` from their callers. The protocol
bundles the existing optional-label and validation copy with action labels,
status announcements, empty-value and selection prompts, and clear tooltips.
The app adapter retains the existing locale-specific grammar and casing. Form
lists pass the current copy through a newly built row scope; form-review widgets
forward it explicitly. The field library no longer imports app localization or
its copy adapter. Controllers, focus, selections, pending saves and rendering
remain owned by the existing field implementation. The field's package move
still follows the shared schema-constraint and validation-policy transaction.

The thumbnail scrim renderer and its recipe enum have a shared component owner.
Their existing event-card member identity, gradient colors and stops, pointer
transparency, and public API are preserved. Photo selection, activity fallback,
and event-domain values remain in the app thumbnail; the renderer imports only
Flutter and shared tokens. Existing thumbnail and direct-scrim previews continue
to cover the production implementation without new baselines.

The root-header vocabulary also has shared owners: the primary-rail marker,
root top-edge ownership, leading-control choices, and title typography roles.
Their names, values, and type contracts are unchanged; the two feature adapters
that previously obtained leading choices from the app top-bar library now import
the shared package. Header rendering and schema-coupled search remain app-side
until the constraint transaction permits their package move. The existing
root-page preview passes its production controller rail through the shared
marker type, so the interface retains direct golden coverage after leaving the
rail file.

The step-header source now uses `catch_step_header.dart`, matching its existing
primary class under D5. The widget body is unchanged; caller imports, component
metadata, and authored copy references use the new filename.

Field, chip, search, section-header, and form-commit enums now have shared
owners with unchanged values. Section-group descriptors, form-review summary
items, row scopes, and save/error callback types also move as presentation-only
contracts. The form list still owns accordion state and the caller still owns
patch persistence; the shared row scope only carries those callbacks and the
current field copy. A production form-list preview covers the scope under both
commit modes, including an expanded editor and its collapsed sibling. The
schema-coupled controls, section renderer, and form editors remain app-side
until the constraint transaction allows their package move.

The eight loading widgets move into individual shared pattern files. Explicit
placeholder shapes and real-layout skeletons use one internal Skeletonizer effect
configuration; the separate Shimmer package and all five old app libraries are
removed. The existing shape geometry and public Catch APIs are preserved. Both
paths stop animation under Reduce Motion and exclude placeholder semantics and
pointer interaction; disabling real-layout skeletonization restores the content.
The dependency gate pins Skeletonizer to 2.1.3 and rejects engine declarations
in app packages. Loading motion and accessibility are verified at the rendered
widget boundary, and affected visual baselines follow the approved D1 change.

The 16-field `CatchContractFieldConstraints` value type and
`CatchContractFieldPolicy` move into the shared component package. The schema
generator imports the shared type when emitting app-owned field constants;
the projected values and their lookup remain unchanged in the app. Runtime
input bounds and validators retain their existing implementation and consume
caller-supplied validation copy. This removes the schema import boundary that
prevented the remaining field and form renderers from moving into `catch_ui`.

The next component slice moves `CatchChip`, `CatchOptionCard`,
`CatchOptionGroup`, `CatchOtpCodeField`, `CatchRangeSlider`, `CatchSearchField`,
and `CatchToggle` into the shared package. Callers import app-generated schema
values directly; the controls only accept the shared constraint type. The search
trailing action is inlined at its sole call site, preserving its clear/close
behavior while removing a private widget from the shared layer. Component
contracts, localization ownership descriptions, and exact implementation-path
checks follow the move; historical audit snapshots remain unchanged.

`CatchChipField`, `CatchTabRail`, and `CatchTabControllerRail` now have individual
shared component owners. Their selection, validation, platform minimum size,
scaled geometry, and route-owned pager binding retain their existing bodies.
Callers import the shared package; registry, screen-contract, catalog, and
architecture references follow the move, and both old app libraries are deleted.

Top-bar search configuration, screen top bars, route/identity top bars, and the
step header also have individual shared component owners. Caller-owned copy,
constraints and callbacks retain their APIs. Top-bar rendering inlines its
private search lane and local render helpers into the owning build method,
preserving the title, leading, trailing, search, safe-area and divider geometry.
The two original app libraries are deleted; catalog, screen and copy-ownership
references follow the move. The last schema-constant re-export is removed from
the app field library, with its remaining consumers importing app-owned schema
values directly. This prevents transitional widget exports from duplicating the
explicit schema boundary.

Root scaffolds and scroll views now have individual shared pattern owners.
The closed header descriptor stays in the scroll owner’s Dart library in its
own part file, preserving the private rendering protocol. The scaffold uses
the existing public standard/full-bleed scroll constructors, so the obsolete
private constructor is removed. Scrolling, pinned status/rail geometry, overlap,
safe area and field obstruction retain their implementation. Constructor gates
and their seeded negative fixture follow the two package owners. The status
publication lint permits only the actual scroll renderer; retired app paths
and the delegating root scaffold remain negative probes. A direct catalog matrix
registers the scroll-only member and covers standard, full-bleed and pinned-rail
panes under both themes and text scales.

The field choice chip, toggle adapter, and trailing-slot renderer also have
individual shared component owners. Their constructors, rendering, selection
semantics, motion, and clear-target geometry are unchanged. The obsolete app
lanes part is deleted. Existing direct previews and goldens continue to cover
all three members.

The section kicker becomes a cataloged shared member. All six section heading
placements use the same extracted renderer, preserving title/count semantics,
baseline alignment, and the existing separate trailing-action lane at large
text scales. Its direct preview covers the previously private heading anatomy;
the section's old helper is deleted.

The canonical `CatchSection` and its private configuration records now live in
the shared component package. Named const constructors and supported slots are
preserved; widget slots are immutable fields, and all variant rendering belongs
to `build`. `CatchSectionBody` owns child stacks and separator placement.
`CatchFieldDividerGeometry` exposes only the direct field's numeric leading
text inset, replacing the section's app-class dependency while preserving the
fallback for unknown adapter rows. The old section libraries are deleted and
callers, constructor ownership, schema metadata, and previews follow the move.

The wrapping choice and explanatory option-card controls now have individual
shared owners. Their selection callbacks and notification order are preserved;
`CatchFieldChoicePickedNotification` carries the same presentation-only close
request across the package boundary. The nearest field still owns the delay,
saving guard, and controlled expansion callback. The old control part retains
only field-state behavior, with both renderer declarations deleted there.

`CatchFieldContentRow.value` owns the field caption, value, badge and supporting
lanes alongside its title/description constructor. The four former helper call
sites supply the same state, copy and trailing reservation; status and placeholder
behavior use explicit enum axes. Caption
styling is shared with the text-entry and select shells. The old render helper
and redundant text-entry body helper are deleted.

Field input suffixes now use `CatchFieldTrailing.inputSuffix`, preserving the
native clear button and its fallback action/icon styling. A missing suffix
remains null at the text-entry boundary. Leading slots, add rows, text-entry
motion and custom trailing placement are inlined into their existing callers;
fourteen private render helpers and the redundant action getter are deleted.
The row body and trailing-state selection, underline chrome, select trigger,
and configured-row wrapper render at their existing callers. Their precedence,
null-slot allocation, form-state callbacks and widget tree remain unchanged.

`CatchFieldSelectControl` owns selection-menu rendering, form validation and
selected-value synchronization at its shared package home. `CatchField.select`
keeps its typed caller API and supplies copy, choices, focus and menu controllers.
The former select renderer and app-side form-state synchronization are deleted;
the direct preview mounts production fields in empty, selected, compact,
disabled and validation-error states.

`CatchFieldSurface` owns active and pressed painting using the existing field
geometry scope. The field retains pointer and keyboard handling, disclosure,
semantics, and save orchestration. Rounded, section-clipped and full-bleed
states share the original border, shadow, outset and animation behavior. Native
text input now renders once inside its form owner; the duplicate private input
helper is deleted. Selection updates normalize the live form value so deferred
cleanup cannot erase a newly supplied selection. The field row now renders
directly in its owning State's build method. Lifecycle, timers, focus and
expansion behavior move unchanged into a non-rendering part; the private row
renderer is deleted and both resulting files stay within D6.

`CatchFieldInput` replaces the final private rendering helper. It consumes
the read-only `CatchFieldInputConfiguration` interface plus explicit state handles; controllers,
focus, dismissal and save orchestration stay with the field. Native rendering
uses the existing `CatchTextInput` primitive, extended with editing and obscuring
enum axes and platform input options. The text-entry member and its facade now live together in `catch_ui`, with
non-Widget configuration records and named constructors. The library has no app
imports.

The typed form list and its four editors now have separate owning libraries.
Each editor retains its State, controllers, validation and save behavior;
descriptors retain typed construction and patch factories. The former combined
file no longer declares a Widget or State, and every resulting file is below
800 lines. These form owners now live in `catch_ui/src/patterns` alongside the field
facade migration; persistence and localized copy remain caller-owned.

The final form review body and step navigator have individual source owners
and explicit registry membership. Their field rows, status labels, callbacks
and scrolling are unchanged. Both now live in `catch_ui/src/patterns` with their original app files deleted.

The seven typed form descriptors now live in the shared pattern package. A
generic visitor preserves each choice type without rendering; the form list
owns the same row constructors, schema assertions and stable editor keys in
its build method. All seven former `buildRow` declarations and the old app
descriptor file are deleted. A direct preview mounts all six descriptor modes
through the production form list under both text-commit policies.

The final field facade uses one `CatchField<T>` widget and private configuration
records. Its four former static Widget helpers are real factory constructors;
all generic callers use `CatchField<T>.choices`, `.optionCards`, or `.select`.
The named const constructors preserve their defaults, and keyed mode changes
retain State. All field parts, the typed form list and editors, and the form
review/navigator now reside in the shared package. The old app-side field/form
files are deleted. D6's owner-approved one-file exception ships with this move;
all other moved field and form files remain within 800 lines.

### Phase 4 — One registry, binding grammar

Scope: catalog inventory generator + drift check (D4); registry gains
`level`, `roleNoun`, and reviewed use-case naming metadata with schema validation; lexicon/classification
checks extended to the grammar (D5); `design:widgets:*` gates simplified to
registry+Widgetbook; one-time grammar conformance sweep over `catch_ui`
public API (renames are compiler-verified; staged `dart fix` data allowed
within the slice).

DoD: `docs/widget_catalog.md` inventory sections carry a generated-file
header and the drift check fails on hand edits; grammar check green with a
seeded known-bad probe; new-widget gate no longer requires markdown table
edits. Naming probes cover a renamed competing primary with a different
registry ID, an unreviewed qualifier, and legitimate members/complementary
operations. Source review establishes semantic identity; passing a spelling
check alone is not evidence that duplicate implementations were consolidated.

### Phase 5 — Budgets, splits, and estate shrink

Scope: source-size ratchet (D6) registered and CI-gated; split plans executed
for the 12 files at or above 1,600 lines (each split is a Protocol v2 slice;
`host_crm_repository` splits by CRM subdomain, Event Success presentation by
part-file elimination into real components, form-builder screen by pane,
Widgetbook use-case monoliths by component family onto the shared harness);
scanner/lint retirement per D8 through enforcement-integrity; baseline expiry
annotations (D7) added and validated.

DoD: ratchet green; monolith baseline reduced to ≤ 4 `lib/**` entries and
zero `widgetbook/lib/**` entries; net check
count strictly lower than the Phase 0 snapshot (record both numbers in the
PR); every baseline names owner + target phase.

**Completion measurement (2026-09-15).** Phase 5 is implemented by this
change and closes when its required PR checks pass. The source-size scanner
covers 1,627 handwritten Dart files. Seven decrease-only entries remain: four
under app `lib/**`, three under shared packages, and zero under
`widgetbook/lib/**`. The original CRM, Event Success, form-builder, token, and
Widgetbook monolith split plans are executed; every remaining baseline entry
has an owner and target phase, as enforced by `meta:enforcement-integrity`.

For D8's executable-estate measurement, check count means active IDs emitted
by `node tool/run.mjs list --json`; internal validators and retained manifest
history are not runnable gates. The exact Phase 0 merge (`fff43783f`) contains
251 active IDs, and this change emits 250. The earlier 293 figure in the
point-in-time audit is retained as the dated total-registration snapshot, not
as the executable DoD comparator.

The locally permitted derived gates passed, including 52 root goldens, two
consecutive 566-test Widgetbook golden runs, 27 headless app-shell tests, and
the five-test hosted macOS smoke. Workspace analysis, Riverpod/plugin smoke,
Catch UI lint/drift, and resolved-analysis collectors remain required PR gates
under the owner-approved CI-only exception for this machine.

### Phase 6 — Continuous conformance (folds into existing lanes)

Not a Codex batch — assignments into existing owners. Consumer-side parity for
`catch_async_requires_state_surface` is complete: the diagnostic now covers all
non-core feature presentation paths, with seeded Host and consumer probes, and
affected watched snapshots are normalized through
`catchAsyncStateFromAsyncValue`. The widget-consolidation worklog remains the
owner of the K/R/D lanes (this program does not duplicate it).

Golden coverage now has zero waivers: the generated notice provider is exercised
through its production controller and host, and scaled preferred-size geometry
through the production scaffold, top bar and tab rail. These direct previews
cover empty/published notices and direct/nested header reservation at both themes
and text scales. The remaining conformance and consolidation lanes stay open.

### Phase 7 — Cross-framework conformance (React)

Every slice obeys Migration Protocol v2. Phase 7b may start now; 7c–7f start in
order, each after the owner closes the previous gate.

**Phase 7a (landed 2026-10-17):** D9–D14 ratified; registry `tier` added to all
65 contracts with a contract-check rule (missing tier, React mapping on T3/T4,
member wider than its parent) and seeded tests; `Table` role noun; registry
`sourceOfTruth.behavior` per D11; Cross-Framework Names in
`docs/app_architecture.md`; tiers and parity invariants in
`design/components/README.md`; ratified target in
`docs/web_surface_architecture.md`; D13 recorded in the adoption tracker.

**Phase 7b — Predictable Flutter names and the alias gate (D15).** React copies
Flutter names under D9, so this precedes any React naming. Scope, all in one
pass:

| Registry id or area | Today | After |
|---|---|---|
| `catch.organizer_poster` | `CatchOrganizerPoster` (+ `OrganizerPosterLayout`/`Treatment`) | `CatchPoster` in `catch_ui` (L3) with `CatchPosterVariant` and `CatchPosterTone`; members become `ClubCard` and `ClubPlaceholderCover` |
| `catch.event_card` | `CatchEventCard.ticket` | `EventCard` (L5 Card) rendering `CatchTicket` |
| `catch.club_cover` | `CatchClubCover` | `ClubCover` (L5 Cover) |
| `catch.map_preview` | `CatchMapPreview` | `MapPreview` (L5 Preview) |
| `catch.cover_story` | `CatchCoverStory` | `FeaturedEventPoster` (L5 Poster), a `CatchPoster` binding if its anatomy matches |
| `catch.chat_composer` | `ChatInputBar` (self-declared naming exception) | `ChatInput` (L5 Input); exception removed |
| `catch.activity_map_pin` | `CatchActivityMapPin` | `ActivityMapPin` (L5 Pin) |
| `catch.roster_table` / `roster_row` | `CatchRosterTable` / `CatchRosterRow` (+ cells, actions) | `ParticipantTable` rendering a new `CatchTable` (L3, T1) / `ParticipantRow`; cells become private; `ParticipantAction`, `ParticipantRowData` |
| `lib/core/widgets` (12 widgets, all failing) | `CatchEventThumbnail`, `CatchEventThumbnailActivityFallback`, `EventActivityBackdrop`, `EventActivityStamp`, `CatchStartupLoadingScreen`, `CatchStartupBrandStage`, ... | `EventThumbnail`, `EventFallbackThumbnail`, `EventBackdropImage`, `EventActivityBadge`, `SplashScreen`, `StartupBrandHeader`; file suffixes fixed |
| Other `Catch` prefixes outside the design system | `CatchAdaptiveTabScaffold`, `CatchCelebrationScreen`, `CatchStartupAnimationScope`, `CatchProfileView` | `AdaptiveTabScaffold`, `CelebrationScreen`, `StartupAnimationScope`, `ProfileBody` |
| Map adapter (`lib/locations/shared`) | `CatchGoogleMap`, `CatchGoogleMapController`, `CatchMapMarker`, `CatchMapMarkerBitmap`, `CatchMapMarkerHue`, `CatchMapCircle`, `CatchMapPolyline`, `CatchMapCameraPosition`, `CatchMapType` | `LocationMap`, `LocationMapController`, `MapMarker`, `MapMarkerBitmap`, `MapMarkerHue`, `MapCircle`, `MapPolyline`, `MapCameraPosition`, `LocationMapType` |
| Design-system vocabulary | `CatchFormRowList`, `CatchSectionRowList`, `CatchStepRowList`, `CatchFormStepRowList`, `CatchDockSurface` | `List` and `Dock` spellings; `CatchSectionRowList` is reviewed as a possible `CatchSection` recipe first, because `CatchSectionList` already exists |
| Compositions | `ClubDetailDock`, `EventDetailBody`, `NotificationRow`, startup screen | level and role recorded (Dock, Body, Row, Screen) |

Tooling in the same pass: registry `aliases` for components and role nouns,
indexed by the catalog and context pack; a new-widget gate that rejects a name
matching an existing component's name or alias and names the component to use;
the feature-naming check extended to `lib/core/widgets`; the reserved-prefix
test corrected from `startsWith("Catch")` to `^Catch[A-Z]` (it falsely
flagged the seven `Catches*` swipe widgets) and enforced across `lib/core/**`
except `lib/platform/riverpod_ui`; `Workspace` accepted as a route-level suffix;
and a decrease-only ratchet on the remaining feature-naming failures (197 after
the new nouns).

Bindings register as compositions, not concepts; `catch.event_card`'s members
need new parents, including `CatchClockIndicator`, a `catch_ui` primitive
registered under that app-level card. Layout constants named after old widgets
(`activityMapPin*`, `organizerPosterRadius`) are renamed in the token source
in the same pass. App bootstrap classes keep the product name, as the grammar
already exempts them.

DoD: every symbol in the table renamed with the old symbol deleted; no
registry concept outside `Catch[<UseCase>]<RoleNoun>`; no `Catch[A-Z]` symbol
outside `catch_ui`, `catch_tokens`, `lib/platform/riverpod_ui` and app bootstrap;
the alias gate, prefix test and ratchet each ship with a seeded failing probe
(a new `EventTicket`, a new `ProfilePanel`, a new `CatchFoo` in a feature
folder); workspace analyze green.

**Phase 7b status (2026-10-18).** Landed on `codex/xf-component-naming-tiers`:
the alias gate, redirects, prefix and coverage checks, and every rename in the
table above. The gate also forced the widgets that moved with renamed files to
conform: the profile surface (`ProfileSection`, `ProfileHeader`,
`ProfileCompatibilitySection` and siblings, with the view models renamed to
`*SectionData`), `FeaturedEventTopBar`, `FeaturedEventBody`,
`ExploreClubTagList`, and the roster helpers `ParticipantRowAction`,
`ParticipantDecisionButton` and `ParticipantStat`. `CatchPoster` gained
registered anatomy (`CatchPosterImage`, `CatchPosterHeader`) in place of
widget-returning helpers. Moving it into `catch_ui` put it under the text-scale
2.0 golden, which exposed an existing overflow in the editorial layout; the copy
now keeps its 42% share and grows past it at large text. Golden coverage now
also counts public widgets in `lib/core/widgets`, which the prefix-only
surface had dropped (254 surfaces, all covered). The ratchet fell from 338 to
276 entries.

Deviations and remaining 7b work:

- `EventCard` and the other renamed `lib/core/widgets` files stay in
  `lib/core/widgets`: it is a golden-source home, and moving them out would
  remove their goldens. `catch.event_card` and `catch.startup_loading_screen`
  stay concepts with a decision note so they can keep their registered members.
- The `CatchAsyncState` family is the last stray prefix (three ratchet entries).
  Moving it into `lib/platform/riverpod_ui` touches
  `lib/hosts/today/presentation/host_today_view_model.dart`, which another
  active task holds; move it after that task lands.
- The splash screen's Widgetbook catalog id still reads
  `core.widgets.catch_startup_loading_screen` because `lib/l10n/app_en.arb`
  references it and another active task holds that file. The same file's
  string descriptions cite source paths, about forty of which Phase 7b and
  7b.2 renamed (they surface in `app_localizations.dart` doc comments);
  update them with the catalog id once that task lands.
- Materials (2026-10-18): `CatchTable` (T1, with `CatchTableRow` and
  `CatchTableScope`) is extracted from the participant table shell, and
  `ParticipantTable` binds it through a shared `participantTableColumns`
  layout; `CatchTicket.card` is the width-driven ticket recipe that owns the
  notched outline, and `EventCard` binds it. Both extractions render
  byte-identically to before at 440 and 900 px in light and dark. Compared with
  `CatchPoster`, `FeaturedEventPoster` is a featured-item masthead (generated
  art, chrome slot, call to action, data lines, content height), so it stays a
  separate binding; the registry records the comparison. The roster insets
  became `CatchInsets.table*`.
- Layout constants follow their materials: `CatchLayout.poster*` and
  `CatchAspectRatio.poster` (were `organizerPoster*`), `ticketNotch*` (were
  `eventTicketNotch*`, now used by `CatchTicket.card`) and `ticketHero*` (were
  the `eventDetailTicket*` values that size `CatchTicket.hero`; the
  event-detail-only stub and title constants keep their names). `activityMapPin*`
  already matches the renamed `ActivityMapPin` and stays.
- Still open: the React `CatchTable` in `@catch/web-ui` (Phase 7e) and the
  `CatchAsyncState` move above.
- Deleted after migration (2026-10-18): `CatchSurface.borderColor` and
  `borderWidth`, deprecated since the border roles landed but never enforced
  (Dart does not report a deprecated field through its `this.` constructor
  parameter), had 145 callers in 107 files. The plain line colors became
  `borderRole` (`separator`, `boundary`); custom pigments and wider strokes
  became `borderSpec`; transparent and zero-width borders were removed. Both
  golden suites rendered identically. Also deleted: the unused deprecated
  `ProfileInlinePromptEntryEditor.value`, and the analyzer plugin's dead
  art-path entries for `event_activity_visuals.dart` and `event_pins_map.dart`.
  The lint harness's seeded event-detail probe still constructed the old
  `EventActivityBackdrop`, so the thumbnail rule fired zero times; it now uses
  `EventBackdropImage`.

#### Phase 7b.2 — Naming sweep

Rename the remaining feature-naming failures
in feature-sized slices using the alias redirects, lowering the ratchet in each
slice until it reaches zero. The ratchet lives in
`design/components/widget_naming_baseline.json`, checked by
`node tool/design/generate_widget_catalog.mjs --check`; `--write` only removes
fixed entries.

Slice 1 (2026-10-18): auth, chats, clubs, dashboard, force update, image
uploads, launch access, notifications, payments, reviews, safety and swipes;
the ratchet fell from 276 to 222 entries. Rules applied, and to apply in later
slices:

- Thin `ConsumerWidget` adapters that were named `*Controller` take the role
  they fill: `PaymentHistoryListController` is `PaymentHistoryBody`,
  `MembershipTrailingController` is `ClubJoinAction`.
- A predicted name that collides with a dependency's widget gets the feature
  prefix: the wrapper of `country_code_picker`'s `CountryCodePicker` is
  `PhoneCountryCodePicker`.
- Symbols derived from a renamed widget follow it (private `State` classes,
  its skeleton, its provider-free state object, its style enum, which also
  takes an axis name: `ProfileReactionControlsStyle` became
  `ProfileReactionActionVariant`). Names of a domain concept stay (the photo
  slot painters, `StarRatingPicker`, the catches profile-review action state),
  and so do l10n keys.
- Renaming or moving a file brings its widgets to the gate's standard in the
  same slice: previews for every public widget it holds, and private widget
  classes or widget helpers inlined (the OTP step's phone row and edit
  button).

Slice 2 (2026-10-18): events and explore; the ratchet fell from 222 to 162.
Notable calls: CTA widgets that render a `CatchDock` are Docks
(`EventDetailCta` is `EventDetailDock`, `GuestBookCta` is `GuestBookDock`);
the date markers are Tiles (`EventDateTile`, with `EventDateTileVariant`
replacing the non-axis `EventDateMarkerLayout`); slivers take the role they
render (`SavedEventsAgendaList`, `ExploreFeedSliverBody`); and
`ExploreEventsEmptySliver` became `ExploreFeedEmptyState` because
`ExploreEventsEmptyState` already names its data. Renamed libraries carry
their `part` files and generated parts with them.

Slice 3 (2026-10-18): event success, event rehearsal, onboarding, profile
editing and user analytics; the ratchet fell from 162 to 84. The connected
onboarding pager pages are `Onboarding<Step>Body` and keep their provider-free
`Onboarding<Step>Step` (files and `_state` files now `onboarding_<step>_step`);
Panel became Section throughout user analytics; `WelcomeScene` is
`WelcomeSceneLayout`. The moved files brought nine private widget classes and
one widget helper to the gate: the thin `_EventRehearsalControlButton` folded
into `CatchButton` at its six call sites, five single-use rehearsal pickers and
rows and the reveal vignette were inlined, and `FirstHelloMissionEditor`,
`EventSuccessMarqueeImage` and `CustomQuestionnaireField` (with a
`CustomQuestionnaireFieldState` record replacing the `_inputField` helper)
became public, previewed widgets.

Slice 4a (2026-10-18): hosts, minus the files below; the ratchet fell from
84 to 37. Panel and the adaptive-workspace Pane are Section
(`HostCustomerHistorySection`, `CreateEventConsequenceSection`), the
spoke-route resolver that selects loading, error and data states is
`HostClubSpokeAsyncBoundary`, and `StepperFooter` is `HostStepperDock`. The
pass-through `HostClubOrganizerOverview` was deleted in favour of the
`HostOrganizerMetricGrid` it wrapped. Renaming `host_analytics.dart`, a
938-line file on the source-size ratchet, required splitting it (a renamed
file cannot re-enter the legacy baseline): the trend section and bar tile moved
to `host_analytics_trend_section.dart`, and the insights section is 709 lines
and off the ratchet.

Slice 4b (2026-10-18): the twelve hosts files 4a left; the ratchet fell from
37 to 11, and every remaining entry waits on another active task (below).
Queue and Bar took the role they render (`HostManualSendList`,
`HostRuntimeClaimList`, `HostRosterInsightRail`, `HostClubMediaRail`),
Composer is Editor (`HostCampaignEditor`), Control and Disclosure are Field
(`HostEventLiveLocationField`, `HostGuestIntakeSettingsField`), Renderer is
Body (`HostFormBody`), and the overview adapter is
`HostClubOrganizerSectionList`. `HostFormBody`'s no-op `_HostFormSchemaBoundary`
existed only to satisfy `catch_field_requires_section_context`, which exempted
any ancestor whose type name contained `FormSchema`; its question fields now
return through `CatchFieldLanes.single`, the canonical single-row boundary,
and the name exemption is deleted from the lint. The moved files brought 16
private widget classes to the gate: that boundary was deleted,
`_HostClubMediaRoleBadge` and `_HostManualSendReplanSheet` were inlined, and
13 became public, previewed widgets (for example `HostCrmAudienceCard`,
`HostManualSendTaskSheet`, `HostDismissedMergeCandidateCard`). `host_club_edit_tab.dart` (1,298 lines,
on the size ratchet) split into `host_club_edit_body.dart` (705),
`host_club_edit_rows.dart` and `host_club_media_rail.dart`, and is off the
ratchet. The 25 new Widgetbook use cases render offline: the stateful owners
(merge review, form responses, manual sends, roster, live location) get
provider overrides beside their fixtures, `widgetbookHostComponentStates`
is the shared host component catalog, and
`widgetbook/test/host_component_previews_test.dart` pumps every one of them so
a provider the overrides miss fails a test instead of a preview.

Open: seven Widgetbook functions stack `@UseCase` annotations and the
generator emits only the first of each, so 14 entries never render (for
example `HostTeamManagementSection`); split them into one function each.
Slice 4b replaced the stacked entries for `HostOrganizerMetricGrid`,
`HostOrganizerMetricRow` and `HostClubOrganizerSectionList` with exact use
cases.

Deferred: `CatchAsyncState`, `CatchAsyncPhase` and `CatchAsyncStatus` (app
symbols under the reserved `Catch` prefix) wait on the task holding
`lib/hosts/today/presentation/host_today_view_model.dart`;
`DashboardFullSliverBody`'s file rename and the
`EventCheckInQrScanner` rename both touch
`test/dashboard/dashboard_screen_test.dart`, which another active task holds;
`HostTodayLoadedRoute`, `HostTodayOverview` and `HostTodayAttentionSection`
wait on the task holding the Host Today files; `host_audience_view.dart` waits
on the task holding `lib/routing/go_router.dart`; `HostEventReviewsPanel` waits
on the task holding `tool/tools_manifest.json`.

**Phase 7c — One registry for React identity.** Replace the `surfaces` name
map with per-framework implementation records (symbol and file), add
`tsType` beside `dartType`, merge `design/web-ui/components.json` into the
registry, and point admin and website registry entries for T1–T2
responsibilities at `catch.*` ids. Reclassify the 149 admin feature-family
entries from `shared-primitive` to feature components. DoD: one file assigns
component identity; the lexicon, coverage and sync tools read the new records.

**Phase 7c status (2026-10-18).** Landed on `codex/xf-react-registry-7c`. The
`surfaces` map is gone. `dart` already named the Flutter symbol and file, so it
stays the Flutter record, and a `react` record beside it names the
`@catch/web-ui` symbol, file, `api` and Storybook coverage. Nine contracts have
one, all `api: headless-control`: these nine records and their surface
adapters are the set Phase 7e replaces, and a `styled` record must reuse the
Flutter symbol (D9). The contract check rejects a `react` record on T3 or T4.

- **web-ui registry merged and deleted.** Its eight entries became `react`
  records, and its two readers now read the registry: the lexicon check, and
  the `webui` surface of the Storybook visual check, which captures the same
  seven stories. Two entries had no concept and now map to existing ones:
  `CheckboxControl` to `catch.toggle`, because Flutter renders a single
  boolean input as a switch and has no checkbox, and `DataTableControl` to
  `catch.table`. `ToggleGroupControl` maps to `catch.chip.field`, and
  `SelectControl` and `TextareaControl` are additional `catch.field` symbols.
  `LottieAnimationControl` and `classNames` were never registered; Phase 7d
  maps them.
- **`tsType`.** 426 props on the T1 and T2 contracts at L2–L4 carry `tsType`
  beside `dartType`. Thirteen are `null`: Flutter mechanisms such as `Key`,
  `FocusNode` and controllers, which have no React prop. L5 bindings and L6
  screen contracts carry none, because each framework binds its own domain
  data (D14, D15). The mapping table lives in `design/components/README.md`.
  The contract check enforces presence, the `null` list, enum names, and the
  callback, widget and scalar shapes. On first run it rejected four values the
  mechanical mapping produced: two builder typedefs, the menu trigger builder,
  and `BoxFit`.
- **Surface adapters point at registry ids.** `lexicon` plus `lexiconId`
  became one `componentId` field: seven website entries and eight admin
  entries. The website `Button` and `TextField` adapters existed only in the
  old `surfaces` map, so they now have entries of their own. The lexicon check
  proves each `componentId` names a T1 or T2 contract and that the export
  exists. It also proves every `dart`, `react` and story symbol is declared in
  its named file.
- **Admin feature components.** The TypeScript checker traced every
  `shared-primitive` entry's production consumers, following uses through
  other shared components and excluding tests and stories. 129 have one
  feature consumer: marketing 86, intake 29, overview 6, events 4,
  organizers 3, cross-paths 1. Seventeen more render only in the app shell.
  All 146 are now `feature-component` entries owned by that feature or `app`,
  and still live in `admin/src/shared/ui` until Phase 7e moves them. The
  2026-10-17 figure of 149 grouped entries by name family. The difference is
  20 name-family entries that no production code renders; together with four
  others, these 24 are Phase 7d deletion decisions. 65 entries have more than
  one consumer and remain `shared-primitive`. The root cause is a rule:
  `web:admin-feature-exports` lets a feature folder export only `*Screen` and
  `*Workspace` components and sends every other export to admin shared UI.
  Before Phase 7e moves the 146, it changes that rule to accept the
  `feature-component` entries a feature owns.
- **Sync.** Design-sync mappings carry `reactSymbol`, `reactFile` and
  `reactApi`. The manifest's behavior source now names the registry contract,
  with Flutter as the reference implementation (D11).

Deviations: `design/web-ui/shared_primitive_adoption.json` stays until Phase
7d. Its rows form an adoption queue, not a component registry, and its
classification gate (every package export and every exact-name overlap) is
what the 7d inventory replaces. Two items wait on the task that holds
`tool/tools_manifest.json`: listing the website and admin registries and
`packages/web-ui/src` as `design:component-lexicon` impact paths, and a
`root-npm` gate for the ownership measurement, which 7d's inventory check
needs anyway. Website `routeIds` are maintained by hand; the 7d status below
measures how far they drift. (A first version of this record cited
`StatusBadge` on `claim` as drift. That was wrong: the claim pages render it
through the organizers' `StatusBadge` wrapper. The early graph dropped uses
made through private helpers.)

**Phase 7d — Generated React inventory.** A deterministic scan of
`website/`, `admin/` and `packages/web-ui` maps every exported component to
a registry concept, a T4 owner, or deletion. It confirms or rejects the
name-match duplicates found on 2026-10-17 (for example `AdminTag` and
`TagList` against `CatchChip`, `StatusBanner` against `CatchBanner`) and
settles D13's metric comparison. Inventory output stays in ignored local
output, per AGENTS.md. DoD: zero unmapped exports.

**Phase 7d status (2026-10-19).** Landed on `codex/xf-react-inventory-7d`.
`web:shared-ui-adoption` is now the inventory gate. It builds a TypeScript
reference graph of `website/`, `admin/` and `packages/web-ui`
(`tool/web/lib/react_component_graph.mjs`) that follows barrels, `import()`
of default exports, and private top-level helpers. A component is an exported
PascalCase declaration that renders JSX, or a memo, forwardRef or lazy
component. The gate maps all 698 to exactly one of four outcomes, with
`--write` saving the inventory to ignored `build/react_component_inventory.json`:

| Outcome | How it is decided | website | admin | web-ui |
|---|---|---:|---:|---:|
| Concept | `react` record | | | 11 |
| Adapter | `componentId` in the surface registry | 21 | 30 | |
| T4 owner | measured: the export's own area, or its one consumer area for a shared export (7e moves those) | 158 + 170 to move | 83 + 147 to move | 1 to move |
| Deletion | measured: no production consumer (tests and stories do not count) | 53 | 24 | |

Only judgments are recorded. A shared-layer export that matches a T1 or T2
L2–L4 contract by name, alias or role noun (after redirects), and is consumed
by more than one area, needs a decision. So does any shared-layer export that
renders a `@catch/web-ui` implementation. An export that renders the matched
contract's implementation is a binding and needs no record. The decision is
`componentId` (it implements the contract) or `comparedWith` plus a
`comparisonReason` (it does not). 70 decisions are recorded: 36 confirmed and
34 rejected. Exports with the same name on website and admin must name one
contract. The gate also checks that admin `feature-component` and
`shared-primitive` entries match their measured owners; re-measured with
private-helper chains, 7c's 146 entries all hold. The self-test seeds a
TypeScript fixture for the graph and a known-bad inventory for every rule.

- **2026-10-17 name matches.** `AdminTag` is a duplicate implementation, of
  `catch.badge` rather than `catch.chip`. It labels muted metadata and status
  values with status tones, which is CatchBadge's job; CatchChip covers
  interest tags, choices and removable values. The retired tracker listed it
  as adopting `BadgeControl`, but its check looked only at file imports;
  `AdminTag` renders a raw `span`. `TagList` (admin marketing) and
  `AdminTagList` are rejected: they are wrap containers for badges. `StatusBanner`
  is confirmed as `catch.banner`, and so is the inline `AlertRow`.
- **D13 metrics, settled.** Admin's metric family implements
  `catch.metric_strip`. `AdminMetricGrid` (a labelled grid of independent
  measurements) is `CatchMetricSection.grid`, and `AdminMetricCard` (label,
  value, caption) is its `CatchMetricTile` member. Admin's `footer` slot and
  `attention` tone have no Flutter counterpart, and Flutter's grid data
  requires an icon that admin does not render; 7e reconciles the contract.
  The website `MetricCard` has no production consumer and is a deletion.
  `WEB-SHARED-METRIC-001` therefore leaves `keep_surface_specific`.
- **D13 panels.** A titled panel (`Panel`, `AdminEditorPanel`, website
  `ProcessStatusPanel`) is the contained recipe of `catch.section`, whose
  aliases already include `SectionPanel` and `TitledSection`. Plain card
  containment (`AdminSearchCandidatePanel`, `AdminSignInPanel`) is
  `catch.surface`. D13's "panel and card containment become `CatchSurface`
  recipes" therefore holds for the box, and the heading belongs to the section.
- **Adapters per contract (7e's worklist):** field 9, button 7, badge 5,
  banner 3, choice input 3, table 3, section 4, and the rest 1–2. Four T2
  contracts now have web adapters (`meta_row`, `metric_strip`,
  `journey_steps`, `toggle`), so their first web need has arrived.
- **Rejected with a recorded reason:** full-width marketing page bands named
  `*Section` (`MarketingSection`, `WaitlistSection`, `HostPreviewSection`),
  site and page headers against `catch.step_header`, layout stacks and rows
  against `catch.section_stack` and the row contracts, and `StoreButton`.
  Store badges follow Apple's and Google's artwork rules, so `StoreButton`
  cannot be a `CatchButton` recipe.
- **Owner decision (2026-10-19): one shared step list. Registered
  2026-10-22.** Website `StepRail` and admin `AdminIntakeStageRail` were two
  web ports of Flutter's `CatchFormStepList`, then the T3 member
  `catch.screen_body.form_step_overview`. The owner promoted it to its own T2
  contract, `catch.form_step_list` (L4 pattern, role noun `List`), which the
  app, website and admin share; 7e replaces both ports with it. The contract
  owns the spec, status and review-item data members and declares
  cross-framework props (`items`, `statusLabelBuilder`, `onStepSelected`,
  `fieldCopy`). Its formal preview in
  `widgetbook/lib/primitives/contracts/form_step_list.dart` replaces the old
  delegating Widgetbook case. Both rails are now `componentId` adapters of the
  contract, so a fifth T2 contract has a web adapter. The inventory then
  matched seven shared `*List` and `*Group` exports by role noun:
  `AdminDiffList`, `AdminRoadmapList`, `AdminTagList`, `QualityList`,
  `AdminIntakeSourceList`, `ActionGroup` and `HostPreviewFaqList`. Each
  rejection is recorded: none selects a form section or reports completion
  status. Both web rails mark a current step (`aria-current="step"`), and
  `StepRail` also has done and disabled steps and optional body copy. The
  Flutter list has none of these; it reports per-step completion with status
  badges instead. 7e reconciles the contract before building the React
  implementation.

Retired: `design/web-ui/shared_primitive_adoption.json`. The inventory now
covers each of its gates: package exports, exact-name overlaps, and family
adoption. The adoption import check is gone, not replaced; it accepted a
file-level import as evidence, and D10 deletes the adapters in 7e anyway. The
website schema now lets an unstyled supporting component (`PlainButton`, the
website `DataTable` and `CheckboxField` adapters) list no stylesheet, rather
than name one it does not own. Nineteen website entries are new, with route
ids measured from the graph.

Not done, with reasons:

- **Route coverage.** Measured against the graph, 63 of 131 non-route website
  entries differ from their declared `routeIds`. Some of that is staleness
  after #693; for example, `HomeDiscoverySection` now renders only on visitor
  discovery. The rest is a measurement gap: app-shell wrappers such as
  `PageShell` and the consent banner render above the route tree, so they need
  route-tree semantics before `routeIds` can be generated. That is a follow-up.
- **`tool/tools_manifest.json` changes.** That file is still held by #688.
  The `web:shared-ui-adoption` description still names the retired tracker,
  and the lexicon impact paths from 7c are unchanged.
- **`docs/agent_skills/skills_manifest.json`.** Held by the docs task (#696);
  its two tracker paths are updated once that claim is released, before this
  PR runs CI.

**Phase 7e — T1 in `@catch/web-ui`.** Build each T1 concept (plus
`catch.table`) as a styled `Catch*` component under the Cross-Framework
Names rules, then move admin and website onto it, deleting each adapter and
`*Control` export in the same slice. DoD per concept: no surface-local
substitute remains; the old adapter is deleted and both apps typecheck and
build.

**Phase 7f — Executable parity.** Catalog coverage (every recipe × state in
both Widgetbook and Storybook, keyed by registry id); per-framework screenshot
baselines; a generated side-by-side review sheet; contract metrics asserted in
both test suites; a check that new React shared exports follow Cross-Framework
Names; and the D14 event-page screen contract. T2 components are then built as
web surfaces first need them. DoD: each check ships with a seeded failing probe.

**Phase 7 amendment (2026-10-22, D16–D17).** The Phase 7 program is the
single owner of 7e; the website convergence work consumes the library rather
than building its own. Changes to the remaining phases:

- **7e lands its foundations first.** Web `CatchGap`, `CatchInset`,
  `CatchPageBody` and `catch.section_stack`, plus a `CatchText` with role
  variants, ship before any concept migration, because a screen cannot be
  assembled only from library components until layout and text exist in the
  library. They landed in #767, with #773 repairing the gap parity test and
  golden pin after #768. Their cross-framework (D9) decisions:
  - `CatchText` is a new T1 concept, `catch.text`, with a thin Flutter twin in
    `catch_ui`, `CatchText(data, variant:)`, whose variants are exactly the
    `CatchTextStyles` role names. Migrating Flutter's roughly 1,013
    `Text(style: CatchTextStyles.x)` call sites is Linear CAT-211.
  - `CatchGap` and `CatchInset` are React-only `additionalSymbols` on
    `catch.screen_body`, with no Flutter widget twins; their prop values reuse
    the `CatchGaps` and `CatchInsets` role names. The registry rule that a
    styled React record reuses its Dart symbol rules out anchoring them to a
    token class.
  - `catch.screen_body` (`CatchPageBody`) moves from T3 to T1.

  The T1 concepts then follow measured duplication: field, button, badge,
  table, chip.field, section, banner, typography. After them come the
  website's priority-1 T2 entities, which gate website Phase 4:
  `catch.event_card`, `catch.ticket`, `catch.organizer_poster` /
  `catch.club_cover`, `catch.person_polaroid` and `catch.meta_row`. Priority 2
  follows: `catch.graded_image`, `catch.detail_media`,
  `catch.event_detail_sections`, `catch.metric_strip`, `catch.journey_steps`,
  `catch.network_image` and `catch.map_preview`. 7e owns `packages/web-ui`,
  `catch.components.json` and the adapters, and lowers the 7g suppressions as
  it migrates screens.
- **7g — Web tokens and lint preset.** Landed so far: Admin colours, spacing,
  radius and transition timing on tokens (#756); gap, stroke, window-size,
  layer, web type, brand type and theme-role token families (#768), plus the
  field radius, opacity, tint and themed elevation tokens 7e's field slice
  needs (#776); and one
  stylelint preset for both apps with per-app suppressions and a freshness
  check (#769). Next: the ESLint preset (no raw controls, no `className` or
  `style` outside the library, no bare text or layout elements in features),
  retiring the scanners it replaces in the same change.
- **7h — `@catch/web-data`.** One Firebase bootstrap and one callable client
  validated from `contracts/`, replacing Admin's
  `generateCallableValidators.mjs` and the website's
  `shared/contracts/generated` pipeline, plus the query-key and
  pending-mutation helpers. Starts after the website read layer (#753) is
  wired in.
- **Screens become assemblies** (amended by D18 on 2026-10-23). Dead exports
  are deleted. Shared exports that one feature renders become registered
  `@catch/web-ui` components, and the feature keeps only a binding; they no
  longer move into the feature. A feature turns on the no-bare-elements rule
  once it composes only library components.

**D18 delivery (2026-10-23).** D18 adds no new phase. It changes work already
planned:

- **Two rules, one per framework.** The 7g ESLint preset reports raw HTML
  elements, `className` and `style` everywhere outside `packages/web-ui`. A
  new `catch_ui_lints` rule reports raw drawing widgets and styling objects
  outside `catch_ui`. Each starts from today's counts as a shrink-only
  baseline (D17). The hand-written check each rule covers, such as
  `web:react-classname-boundaries`, retires in the same change (D8).
- **Missing library components come first.** Element families with no
  library component to switch to stay out of the rules until one exists, so
  each call site does not create its own wrapper:
  - Flutter `Icon` (331 calls) and `Tooltip` (25) wait for library icon and
    tooltip components;
  - React tables (272 elements) wait for `catch.table`;
  - images wait for `catch.network_image`.

  Text is in from the start, because `CatchText` exists in both frameworks.
- **React one-offs register in their surface's registry** (CAT-225). A
  component that one surface renders lives in
  `packages/web-ui/src/components/` and is a T4 entry in
  `design/admin/components.json` or `design/website/components.json`. The
  inventory maps it to that surface's T4 and fails when another surface renders
  it. `catch.components.json` keeps `react` records for T1 and T2, so its
  Flutter-record tooling is unchanged.
- **Re-scoped tickets.**
  - CAT-219 registers Admin's single-use shared exports as `@catch/web-ui`
    components with feature bindings, instead of moving them into features.
  - `screens.web_single_use_shared` keeps its target of zero, counting only
    single-use shared exports that the library has not registered.
  - CAT-211 is D18's Flutter text slice.
  - The ESLint suppressions are the `screens.web_bare_markup` gate CAT-217
    already tracks.

### Consolidation done-gates (owner decision, 2026-10-23)

Consolidation finishes before the redesign starts. The owner's sequence is:
tokens are the only source of values, a component library on both frameworks
uses only tokens, the registry keeps the two implementations in step, and
every screen on every surface is a composition of those components with its
controllers and state. Design studies after that are drawn on Host app and
website screens built from library components, not consumer screens, because
those surfaces launch first and lean on the T1 set.

Consolidation is done when every gate in
`design/components/consolidation_gates.json` is at zero. Each gate records
its owner, its starting value and what blocks its regressions today.
`node tool/design/consolidation_gates.mjs` measures all of them;
`--similarity` adds the two Flutter duplicate-widget gates, which need Dart.
The report never blocks a change. A gate whose `enforcement` says "none yet"
needs its owner to add a shrink-only ratchet, and that ratchet then follows
Migration Protocol v2.

| Layer | Gates |
|---|---|
| Tokens | Flutter raw values (enforced at zero); website raw-colour exemptions; recorded raw CSS values in the website and Admin |
| Library | T1 contracts without a styled `@catch/web-ui` component; priority-1 T2 entities without one; contracts still on a headless `*Control`; T1 contracts whose Widgetbook states their styled Storybook story does not cover (the state-coverage half of 7f; both frameworks' screenshot baselines join it when 7f lands them) |
| Screens | React adapters; unused React exports; shared exports one feature renders; bare HTML outside the library; page-scoped CSS; Flutter text styled in place (CAT-211); hand-built Flutter decoration and tap targets; near-duplicate Flutter widget clusters; library absorb candidates |

On 2026-10-23, 1 of 16 gates was at target.

### Work packet template (every Codex slice)

```text
Packet: <phase>.<n> <title>
Inventory command: <exact command whose zero-output defines done>
Deletes: <old symbols/files that must not exist afterward>
Adds: <code + lint/check + probe + widgetbook/golden + registry rows>
Ratchets touched: <baseline files lowered in this PR>
Verification: <exact check ids / commands, derived via verify_local --list>
Escalation: stop and report if the inventory shrinks by editing the scanner,
if a delete requires a compatibility shim, or if a rule needs a carve-out —
those are owner decisions, not implementation details.
```

## Part 5 — Interactions With In-Flight Work

| In-flight | Relationship |
|---|---|
| `widget_consolidation_pipeline_spec.md` | Unchanged owner of dedupe (K/R/D). Phase 4's grammar reduces its future intake. |
| `catch_field_section_system_spec.md` | Field/section internals move in 3c; its gated phases rebase onto `catch_ui` paths, contracts unchanged. |
| `catch_ui_lint_rules_plan.md` | Phase 1.5 scanner retirements merge into D8's estate shrink; probe harness gains the package roots. |
| `ui_capture_pipeline_plan.md` | Shares the golden harness; capture consumers unaffected. |
| `ds_resync_audit_2026-06.md` | Porting work continues; new ports land directly in `catch_ui` once 3b is closed. |
| `composition_migration_spec.md` | This program is the executor of its layer-model "needed work"; that spec stays the cross-tool contract owner. |
| Host adaptive workspace slices | Unaffected; they consume patterns (L4) wherever those live. |

## Appendix A — Naming Grammar v1 (ratified 2026-09-04)

After Phase 0b the durable owner of this grammar is
`docs/app_architecture.md`; this appendix remains the ratification record and
defers to that section on any conflict.

- **Prefixes.** `Catch` is reserved for `catch_tokens`/`catch_ui` symbols (and
  the app-side riverpod adapters that wrap them). Public feature widgets are
  `<Feature><RoleNoun>`; private widgets `_<Anything>` are legal only in L5.
- **Role nouns (closed; extend only via registry review):** Button, IconAction,
  Field, FieldLanes, Section, SectionList, Tile, Row, RowList, Chip, Badge,
  Banner, Sheet, Dialog, Notice, EmptyState, ErrorState, Skeleton, Indicator,
  TopBar, Header, HeaderTitle, Scaffold, PageBody, ScrollView, TabBar,
  TabScaffold, Poster, Polaroid, Ticket, Gap, Inset, Divider, Avatar, Photo,
  Cover, Stepper, StepFlow, Accordion, Drawer, Overlay, Viewport.
- **Files.** Snake case of the primary public class; suffix vocabulary:
  `_screen`, `_controller`, `_view_model`, `_state`, `_repository`,
  `_service`, `_providers`, or a role-noun suffix for widgets. One primary
  public widget per file in `catch_ui` (its parts private in-file).
- **Variants.** Axes are enums named `<Component><Axis>` with axis vocabulary
  `Variant`, `Size`, `Tone`, `Emphasis`, `Status`, `Placement`, `Mode`. At
  most two booleans per public component constructor; a third forces an enum.
- **Slots.** `leading`, `trailing`, `title`, `subtitle`, `kicker`, `meta`,
  `body`, `footer`, `actions`, `media`, `mediaOverlay`, `child`, `children`;
  builders end in `Builder`; callbacks start with `on`.
- **State objects.** `<Surface>State` (provider-free), `<Surface>ViewModel`
  (provider-owned composition), `<Surface>Controller` (mutations/flows) — as
  already contracted.
