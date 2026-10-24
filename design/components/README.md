---
doc_id: component_contract_registry
version: 1.11.0
updated: 2026-10-24
owner: ui_elevation_initiative
status: active
---

# Component Contract Registry

`catch.components.json` is the cross-tool and cross-framework contract layer
for Catch UI components. Each contract owns its component's behavior,
accessibility, states, and API for every framework that implements it. The
Flutter implementation in `packages/catch_ui` is the reference implementation,
`@catch/web-ui` implements the same contracts for React, and Figma, Claude
Design, future Code Connect templates, docs, and validators agree on the same
contract (blueprint D11, ratified 2026-10-17).

The registry deliberately describes component APIs, states, slots, token
dependencies, handoff names, and concept identity. A top-level contract is not
automatically an independent concept: `conceptRole` distinguishes a primary
concept from a member, composition, or screen while preserving useful public
handoff contracts. It does not attempt to generate Dart widget
implementations from JSX, CSS, or Figma node geometry.

Every component contract also carries executable cross-surface accessibility
acceptance metadata. The registry requires support for text scale 2.0, a stable
reduced-motion resting state, and both Light and Dark semantic themes. A
component-specific policy may be stricter, but it cannot omit those baselines.

It is also the exhaustive UI-governance source. Every component must declare
exactly one decision: static `enforcement`, executable `verification`, or an
expiring exceptional `waiver`. Steering entries generate the analyzer plugin
constructor tables and violation probes; all other plugin/API/checker codes
still map back to an owning component through `code`/`codes`. `vehicle` names
the implementation of the primary `code`; supplemental `codes` may span
vehicles when one component is protected by complementary gates.

Use `verification.vehicle: widgetbook-contract` when the canonical component
has no distinct static misuse pattern. The coverage checker derives the target
from `dart.symbol` and requires that exact generated Widgetbook component, so
the decision cannot be satisfied by prose. A `waiver` is only for a temporary
gap with a named owner, a specific reason, and a review expiry.

## Identity

A component's identity is its `catch.*` id in this registry, and no other file
assigns component identity. Every implementation, in Flutter or React, binds to
that id. Cross-framework naming is binding in the Cross-Framework Names
subsection of `docs/app_architecture.md`.

Each contract names its implementations, one record per framework:

| Record | Names | Required |
|---|---|---|
| `dart` | `symbol`, `file` (and named `constructors`) of the Flutter implementation | Always |
| `react` | `symbol`, `file`, `api`, optional `additionalSymbols` and `storybook` of the `@catch/web-ui` implementation | Where one exists; never on T3 or T4 |

`react.api` is `headless-control` for the pre-D10 `*Control` exports, which
carry native semantics while surface adapters own styling, and `styled` for a
D10 `Catch*` component. A styled record must use the Flutter symbol (D9).
Phase 7e replaces every headless record with a styled one. Storybook coverage
of `@catch/web-ui` lives in `react.storybook`, which the `webui` visual surface
of `tool/web/check_storybook_visuals.mjs` reads.

The website and admin registries (`design/website/components.json`,
`design/admin/components.json`) own their routes, sections, and
surface-specific (T4) components. A surface adapter of a shared contract
carries `componentId`, which must name a T1 or T2 contract. Under D18 the
library draws: a React T4 component lives in `packages/web-ui/src/components/`
and is registered in the registry of the one surface that renders it, while
its feature keeps only the binding. Admin components that a single feature or
only the app shell renders are `feature-component` entries owned by that
feature; those still under `admin/src/shared/ui` await their move into
`@catch/web-ui`.

`node tool/design/check_component_lexicon.mjs` proves that every `dart`, `react`
and story symbol exists in its named file, that React symbols are exported
from `packages/web-ui/src/index.ts`, and that every `componentId` resolves to a
T1 or T2 contract whose adapter export exists.

### React component inventory

`node tool/run.mjs check web:shared-ui-adoption` maps every exported React
component in `website/`, `admin/` and `packages/web-ui` to a contract (`react`
record or `componentId` adapter), a T4 owner, or deletion. A TypeScript
reference graph measures owners and deletions. Ownership passes through shared
layers, so a shared export that one feature renders belongs to that feature
and counts as debt (`t4-move`) until it is a registered T4 component in
`@catch/web-ui`. A `@catch/web-ui` export registered in a surface registry is
that surface's T4, and the gate fails when another surface renders it. An
export with no production consumer is a deletion. Judgments are
recorded in the surface registries. A shared-layer export that matches a T1 or
T2 L2–L4 contract by name, alias or role noun and is used by more than one
area, or that renders a `@catch/web-ui` implementation, needs `componentId` or
`comparedWith` with a `comparisonReason`. The gate rejects a stale comparison,
an admin entry whose kind contradicts its measured owners, a package export
that implements no contract but serves more than one area, and exact-name
exports on both surfaces that name different contracts. `--write` saves the
inventory to ignored `build/react_component_inventory.json`.

### React prop types

Every prop of a T1 or T2 contract at L2–L4 declares `tsType` beside `dartType`:
the prop type the React implementation uses. L5 bindings and L6 screen
contracts bind each framework's own domain data and declare none (D14, D15),
and T3 and T4 contracts never declare one. Catch-owned types keep their name
(D9); Flutter SDK types map to their web equivalents:

| Dart | TypeScript |
|---|---|
| `String`, `bool`, `int`/`double`/`num` | `string`, `boolean`, `number` |
| `Widget`, `List<Widget>`, `IconData` | `ReactNode` |
| `VoidCallback`, `ValueChanged<T>`, `WidgetBuilder` | `() => void`, `(value: T) => void`, `() => ReactNode` |
| `Color`; `EdgeInsetsGeometry`, `TextStyle`, `BorderSide`, `List<FontFeature>` | CSS color `string`; the matching `CSSProperties` member |
| `Size`, `Offset`, `RangeValues`, `TimeOfDay` | `{width; height}`, `{x; y}`, `{start; end}`, `{hour; minute}` of `number` |
| SDK enums (`BoxFit`) and constructor recipes | the union of the contract's `values` |

A spacing prop whose Flutter callers pass a token constant declares `token`:
`gap` (`CatchGaps`), `inset` (`CatchInsets`) or `space` (`CatchSpacing`). Its
tsType is that token's name union (`CatchGapSize`, `CatchInsetPadding`,
`CatchSpacingStep`), so a React call site writes `gap="section"`, never a
length.

`null` marks a Flutter framework mechanism with no React prop: `Key`,
`FocusNode`, the `TextEditingController`, `TabController` and `MenuController`
controllers, `MaterialTapTargetSize`, `Set<WidgetState>` and `OutlinedBorder`.
Optionality comes from `required`; a required nullable Dart prop is
`<type> | null`. The contract check enforces presence, the null list, enum
names, and the callback, widget and scalar shapes.

## Parity Tiers

Every component declares a `tier`. The L0–L6 ladder in
`docs/app_architecture.md` says what a component may depend on; the tier says
which frameworks must implement it and how closely they must match. One rule
holds in every tier: **the same responsibility uses the same component on every
surface.** Tiers only decide when the React implementation has to exist.

| Tier | Implemented in | Rule |
|---|---|---|
| T0 Tokens | Generated for both from `design/tokens/catch.tokens.json` | Not a registry tier. No surface defines its own token values. |
| `T1` Universal | Flutter and `@catch/web-ui`, now | Every surface that renders the responsibility uses it; no local substitutes. |
| `T2` Product | Flutter now; React when a web surface first needs it | The first web need builds the React implementation in `@catch/web-ui`, never a local copy. |
| `T3` Native-only | Flutter only | Mobile chrome, native maps, Riverpod adapters. A web need is a registry review that promotes the entry to T2, never a local port. |
| `T4` Surface-specific | One surface | That surface's own responsibility, built from T0–T2 parts and never imported by another surface. It is drawn in the framework's library (D18): a Flutter T4 is a `catch.components.json` entry, a React T4 a surface-registry entry whose source is under `packages/web-ui/src/components/`. Promote it when a second surface needs it. |

`CatchIconTile` and `CatchControlSurface` are T1 but internal: they are matched
through the T1 components that render them and are not exported to apps.

`node tool/design/check_component_contracts.mjs` rejects a missing tier, a
`react` record on a T3 or T4 entry, a styled `react` record whose symbol differs
from `dart.symbol`, a missing or misplaced `tsType`, and a member whose tier is
wider than its parent concept's.

### What T1 and T2 implementations must match

- The symbol name, recipes, and variant, size, tone, and status values.
- The state set the contract lists: default, hover or pressed, focus,
  disabled, loading, error.
- Token bindings for color, type, radius, spacing, and motion.
- Measured metrics within a tolerance: minimum height, padding, touch target,
  radius.
- Accessibility: role, label source, focus order, and the baseline above (text
  scale 2.0, reduced motion, Light and Dark).
- Copy ownership: callers pass resolved copy in both frameworks.

They may differ in text rasterization, hover (web) versus press (touch)
feedback, platform-native pickers, keyboards, and scroll physics, and in how
motion is implemented as long as duration and curve tokens match.

Blueprint Phase 7 makes this executable: each framework's catalog must cover
every recipe and state, each entry has a screenshot baseline in its own
framework, a generated side-by-side sheet joins the two catalogs on registry
id, and metrics are asserted from the same contract values in both test suites.

## Aliases And Redirects

`aliases` on a component or member lists the other names an agent unaware of
it would plausibly write (`PrimaryButton` for `CatchButton`, `ProfileCard` for
`CatchPolaroid`). Aliases must be unique, must not repeat or shadow any
registered symbol, and must not be a bare role noun; the contract check enforces
this. The generated widget catalog prints them as "Also called", the design
context pack carries them, and the new-widget gate
(`node tool/design/check_new_widget_inventory.mjs --check`) rejects a new widget
whose name matches a registered name or alias and names the component to use.

`roleNounRedirects` maps nouns agents commonly write but the grammar spells
differently (Panel, Content, View, ...) to the role nouns to use. Naming
failures quote the redirect instead of only rejecting the name.

`widget_naming_baseline.json` is the decrease-only ratchet for feature-naming
and reserved-prefix debt, checked by
`node tool/design/generate_widget_catalog.mjs --check`. A new finding fails; a
fixed finding that is still listed also fails until
`node tool/design/generate_widget_catalog.mjs --write` removes it.

## Files

| File | Purpose |
|---|---|
| `catch.components.json` | Authoritative component contract registry. |
| `catch.components.schema.json` | JSON Schema for the registry shape. |
| `widget_naming_baseline.json` | Decrease-only ratchet of existing naming debt. |
| `../../tool/design/generated/enforcement_expectations.json` | Generated code ownership and anti-vacuity expectations for repository gates. |

## Workflow

1. Add or change the Flutter primitive in `packages/catch_ui/lib/src`.
2. Update the matching contract entry here, including its `tier`, `aliases`,
   `react` record, props with `dartType` and `tsType`, states, slots, and DTCG
   token references. Confirm its accessibility policy preserves primary
   meaning and actions at text scale 2.0 and does not depend on motion.
3. Add or revise the governance decision. Prefer static enforcement when a
   misuse pattern is mechanically detectable; otherwise use executable
   verification. New waivers need a specific reason, owner, and review expiry.
4. Run `node tool/design/build_lint_enforcement_tables.mjs`, then
   `node tool/design/check_component_enforcement_coverage.mjs`.
5. Run `node tool/design/check_component_contracts.mjs`.
6. Regenerate the design context pack with
   `node tool/design/build_context_pack.mjs` when the registry should be shared
   with Claude Design or another design tool.
7. Regenerate `design/sync/catch.design-sync.json` so mapping state and contract
   digests stay current.

Use `Catch<ControlledNoun>` for new concepts. Prefer named constructors for
variants, concept-qualified names for public members, and explicit adapter or
recipe qualifiers when a standalone class solves a real API problem without
creating another concept. Feature compositions normally keep feature names and
do not count as concepts.

Concept boundaries follow semantic responsibility, not a shared circumstance
or visual shape. If one contract contains independently configurable behavior
with different usage rules, split its concept identity even when stable Dart
class names do not need to change. The loading family is the reference case:
`catch.skeleton`, `catch.loading_indicator`, and `catch.async_value` are three
concepts, while `catch.startup_loading_screen` is a composition over the
indicator. Conversely, feature adapters that only retain semantics, pending
state, or stable test keys should configure an existing renderer rather than
claim another core concept.

Figma mappings start as `unmapped`. The registry's `componentName` is the stable
join key. A library-publish snapshot supplies the file key and node id, and the
sync manifest generates the node URL; live mappings do not require hand-edited
URLs. The old `status` and `componentUrl` fields remain accepted as declared
fallback metadata and are treated as stale when no captured node proves them.
`design.figma.propertyProjection` is the explicit tool-facing API when a usable
Figma component should not mirror every code prop or review state one-to-one.
Its properties must cite the owning code props, while `reviewStates: evidence`
keeps large governed state sets in review galleries instead of multiplying the
public variant matrix. Optional code slots may intentionally project as both a
Boolean visibility control and an instance-swap control.
Code Connect templates should live beside their owning Flutter primitive or in
a dedicated Figma mapping folder, and the registry should point at that
template. The executable sync contract, snapshot importer, and current
live-capability receipt live in `design/sync/README.md`.
