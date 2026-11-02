---
doc_id: design_parity_tracker
version: 0.3.2
updated: 2026-11-02
owner: product_design_parity
status: active
---

# Design Parity Tracker

This folder owns the feature-by-feature contract for bringing Catch screens and
widgets closer to the design specification. `design/screens/catch.screens.json`
connects product states, Flutter screens, reusable components, UI captures,
previews, and drift-prevention checks.

## Source Files

| File | Purpose |
|---|---|
| `host_shell_route_ui_audit.md` | Extensible route-by-checklist audit matrix for the Host shell destinations, with source-backed findings and reproducible compact, medium, expanded, and 200% text-scale captures. Add a destination by appending one column. |
| `comprehensive_todo.md` | Canonical execution checklist for remaining design-parity work across sources of truth, state contracts, Widgetbook, captures, pixel comparison, composition, tokens, features, drift prevention, and pass cadence. |
| `composition_migration_spec.md` | Layered implementation spec for migrating screens into controller-owned state composition, registered sections, registered components, and platform-neutral design tokens/contracts. |
| `design/screens/screen_coverage.json` | Exhaustive route-to-screen design-parity lifecycle ledger. Its schema admits planned work, while the zero-debt composition gate accepts no planned route. |
| `design/screens/catch.screens.json` | Machine-readable screen composition registry connecting routes, controller owners, states, captures, sections, implementation paths, and typed route-layout owners. |
| `design/features/host_feature_responsibilities.json` | Ordered responsibility and migration contract for Today, Events, Audience, Inbox, and Organizer. It names existing action owners instead of duplicating their behavior. |
| `tool/design/check_design_parity.mjs` | Standard local design parity gate. Runs component contracts, route inventory, capture coverage, screen coverage, screen contracts, Widgetbook refs, and advisory scanners. |
| `tool/design/build_host_feature_responsibilities.mjs` | Validates the five Host owners against shell order, routes, code symbols, contracts, and tests, then generates their local `lib/hosts/*/README.md` overviews. |
| `tool/design/check_screen_coverage.mjs` | Validates screen coverage against route inventory, capture coverage, and the screen composition registry. |
| `tool/design/check_screen_contracts.mjs` | Validates screen contracts against route inventory, capture catalog entries, component dependencies, Flutter source paths, and Dart symbols. |
| `tool/design/check_widgetbook_contract_refs.mjs` | Validates component contracts and contract preview ids against generated Widgetbook directories. |
| `tool/design/check_widgetbook_coverage.mjs` | Computes role-derived Widgetbook coverage directly from current Dart, Widgetbook, classification, and decision sources. `--check` is authoritative; `--json` or `--write` is for ephemeral review output, never a tracked report. |
| `tool/design/check_screen_contract_hygiene.mjs` | Advisory scanner for raw Material controls and hand-rolled visual values in contracted screen implementation files. Masks comments/string literals, ignores `Colors.transparent`, and prints sample line refs so findings are reviewable before promotion to lints. |
| `tool/design/screen_top_bar_contracts.json` | Exhaustive role classification for every Flutter `Scaffold.appBar`, every consumer/Host root-screen header surface, compact title policy, canonical zero-inset geometry, and reviewed raw media-hero exceptions. New app bars and shell branches are unregistered by default and fail the gate. |
| `tool/design/check_screen_top_bar_contracts.mjs` | Blocking screen-chrome gate. Rejects unregistered/raw/wrong app-bar owners, incomplete root-screen coverage, compact/workspace custom-title, retired typography/geometry overrides, root headers that bypass `CatchTopBar.screen`/`CatchTopBar.primaryRail`, local geometry/text-scaling overrides, and a nonzero canonical post-safe-area inset. |
| `tool/design/check_screen_gutters.mjs` | Advisory inventory for `EdgeInsets` constructors across `lib/**/presentation/**/*.dart` and contracted screen implementation files. Classifies likely screen-gutter candidates separately from lower-confidence local spacing so manual UI reviews have broad evidence instead of a narrow lint. |
| `design/reference_screens/manifest.json` | Exported design-reference PNG manifest used for advisory pixel comparison. |
| `tool/design/check_reference_screens.mjs` | Validates reference PNG metadata and can compare exported references against UI capture output. |
| `widgetbook/` | Local Widgetbook workspace for reusable component and hard-to-reach state previews. |

## Pass Workflow

1. Choose one screen from `design/screens/catch.screens.json`.
2. Read the screen's design refs, source bindings, components, captures, and
   open gaps.
3. Expand the state list before editing UI. Include loading, populated, empty,
   error, offline, permission, mutation, light/dark, text-scale, and reduced
   motion states when they apply.
4. Add or update fixtures, captures, previews, tests, and component contracts as
   part of the same feature pass.
5. Run the local design parity gate:

   ```bash
   npm run design:parity:check
   ```

6. Run focused analyzer/tests/scanners for the touched feature.
7. Preserve the result in the commit and CI checks; do not write an audit
   receipt or generated evidence file.

CI generates the route inventory and only the widget catalog's marked region
from each exact source checkout before its semantic checks. Authored prose,
component identities, route coverage decisions and regression goldens remain
unchanged. A fresh inventory does not supply missing coverage. Local generators
below remain useful during authoring; routine CI consumers need no generated
inventory commit.

## New Route Workflow

When `lib/routing/go_router.dart` changes, update the route-derived design
ledgers in the same PR:

1. Regenerate the route inventory:

   ```bash
   node tool/ui_capture/check_route_inventory.mjs --update
   ```

2. Add or update the route in `design/screens/screen_coverage.json`. Although
   `planned` remains a design-parity lifecycle value, it cannot land through the
   zero-debt composition gate. A rendered route must be `contracted` or
   `excluded`; a redirect-only route must be `alias`.
3. Add or update the route in `tool/ui_capture/capture_coverage.json` with one
   of the explicit capture decisions: `captured`, `alias`, `planned`, or
   `excluded`.
4. For a rendered `builder` or `pageBuilder` route, add typed owners in
   `design/screens/catch.screens.json`: use `layoutContracts` for a contracted
   product screen or `layoutOnlyRoutes` for a rendered design-parity exclusion.
   Every registered owner declaration must be statically reachable from the
   generated presentation target, and every statically reachable
   widget-producing build/return terminal must resolve to the registered layout
   family. This is branch-universal static proof: the gate does not execute a
   condition to choose one likely arm, so all reachable arms must pass. Unused
   canonical helpers and behavior callbacks cannot satisfy the route.
5. For imperative full-screen navigation, add an `imperativePageContracts`
   target and regenerate the route inventory. Analyzer discovery covers every
   `PageRoute` form, while the inventory supports only direct
   `MaterialPageRoute` construction. Aliases, constructor tear-offs,
   factories/wrappers, `CupertinoPageRoute`, `PageRouteBuilder`, and custom
   subclasses fail closed rather than creating an uninventoried screen.
6. For a redirect-only route, record `alias` coverage with its
   `canonicalRouteId` and no rendered owner. Add focused router coverage for the
   actual redirect result; the composition gate checks typed alias metadata but
   does not traverse redirect expressions.
7. For a new product screen, add the screen contract and its states in
   `design/screens/catch.screens.json`.
8. Run the aggregate gate:

   ```bash
   npm run design:parity:check
   ```

Flutter CI also runs this gate, so new product routes cannot pass CI without
screen and capture coverage decisions.

The router remains the source for path inventory only. Rich design metadata
belongs in the portable `design/screens` ledgers so the
same contracts can serve Flutter, Widgetbook, website/social templates, and
future design-tool exports without making Dart routing the design source of
truth.

## State Statuses

- `planned`: Known requirement; no implementation proof yet.
- `implemented`: Code path exists, but capture/preview/test proof is incomplete.
- `captured`: UI capture exists for the state.
- `tested`: Automated widget/unit/integration test covers the state.
- `ready`: State has implementation, useful visual proof, and relevant tests.
- `blocked`: State is blocked by missing fixture/data/tooling/design source.

## Visual Comparison Policy

Design rules and valid component configurations govern intentional corrections.
Review fresh renders against those rules before updating affected regression
baselines. A golden mismatch reports a change; it does not establish that the
old layout was correct. Never preserve an invalid configuration merely to pass
pixel comparison, or update images mechanically to hide a regression.

Synthetic product screenshots use the separate export-only UI capture harness
and [marketing media pipeline](../marketing_app_media_pipeline.md). Capture
export does not compare goldens, update baselines, or publish the website.


External design-reference comparison starts as an advisory gate. Store exported
design references under `design/reference_screens/` and compare them against
`tool/ui_capture/run_captures.mjs` output. Mask dynamic regions such as status
bars, maps, timestamps, remote photos, and generated counters before enforcing a
threshold.

Dashboard Home is the first wired baseline. Refresh the comparable Flutter
captures with:

```bash
node tool/ui_capture/run_captures.mjs --ids dashboard_home,dashboard_home_empty_start --device design-phone --output-dir /tmp/catch-dashboard-reference-captures
```

Then run the advisory comparison:

```bash
node tool/design/check_reference_screens.mjs --compare --capture-dir /tmp/catch-dashboard-reference-captures
```

Host references must use a repo-pinned `design/source_packs/` source with a
hash-complete, locally closed dependency manifest and must compare the real
application navigation chrome. App Build Matrix validates reference metadata
with `--check --summary`; it does not regenerate or compare those captures.
Explicit local `--compare --strict` runs require fresh matching captures. Strict mode
fails unknown or missing captures, dimension drift, and threshold regressions.
A real but unfinished feature may declare a stable `parityDebtId` plus a looser
`regressionThresholds` ceiling; that ceiling prevents further drift and does
not change the canonical parity threshold or close the debt.

## Preview Policy

Use previews for hard-to-reach component and screen states. Use route captures
for full-screen composition, navigation chrome, fixture realism, and review
artifacts. A state can be `ready` with either a useful route capture or a useful
preview, but high-traffic P1 routes should eventually have both.

The local Widgetbook workspace lives in `widgetbook/`. Primitive previews should
map to `design/components/catch.components.json` contract states, and screen
previews should use the same fixture fakes as UI captures where possible. Run
`cd widgetbook && dart run build_runner build` after adding annotated use cases.

Widgetbook exercises real screens and shells with fixture state, never
parallel Widgetbook-only assemblies or fixture-aware branches inside
production widgets (owner-approved 2026-07-05). Parallel shells are how dead
production code survives and drifts.

### Composition review verdicts

When reviewing a screen's composition, map route → screen states →
composition tree down to the core primitives and give every named layer one
verdict:

| Verdict | Meaning | Action |
|---|---|---|
| OWNS | Real content or logic lives here | Keep |
| ADAPTS | Provider wiring or state dispatch (the controller pattern) | Keep |
| CONFIGURES | Passes meaningful, non-default configuration downward | Keep |
| PASS-THROUGH | Re-exposes a primitive and adds nothing, including subclass-as-configuration | Delete and inline at call sites |
| DISTORTS | Overrides or duplicates the primitive's contract (padding, titles, chrome) | Fix at the seam or in the primitive |
| NEUTRALIZES | The primitive's defaults fight its context, so every call site zeroes them | Fix the primitive's contract |

Widget discovery is global across shared `lib/**`, Consumer
`apps/consumer/lib/**`, and Host `apps/host/lib/**` production roots. The
classification pass resolves indirect widget subclasses transitively before it
checks exact public names and normalized collision keys, so moving or renaming a
duplicate cannot hide it in another app root. Generated exclusions are limited
to `.g.dart`, `.freezed.dart`, and the named localization outputs; directories
called `generated` are not blanket exclusions.

Run `node tool/design/check_widgetbook_coverage.mjs --check` for current
role-derived coverage. The interactive comparison UI is served by
`tool/design/widgetbook_compare_server.mjs` from the current Widgetbook,
classification registry, and canonical decision logs. Do not commit generated
coverage reports or rebuild a parallel static comparison page.

## Modelling Screens And Actions

Per-feature contract files lived here until 2 Nov 2026. Screen and route
registries still own state inventories, tests and captures own the evidence, and
these lessons from building those contracts still apply:

- **Feature boundaries follow a user goal.** Group routes that share a user goal
  and overlapping data and actions, not a route, widget or class. A shared
  widget alone doesn't make one feature, and a separate URL alone doesn't split one.
- **Don't infer actions from capabilities.** A repository that can save doesn't
  mean the screen offers saving. Describe what production UI exposes.
- **Record decisions, not keystrokes.** Wizard moves, submissions and side effects
  are actions; text entry is form data governed by validators and schemas.
- **A failed dependency isn't an empty state.** Keep loading, failure and resolved
  absence separate rather than falling back as if the data were simply missing.
- **External effects finish when they finish.** Await directions or settings links,
  show a pending state, refuse duplicates, and report both a false result and a throw.
- **Name actions for what they do.** `show_support_guidance` closes a sheet and
  shows guidance, so it doesn't claim to open a support channel.
- **Freeze what a pending request depends on.** Every control that can change,
  dismiss or invalidate an in-flight request counts, even when the primary button
  is disabled. `PENDING-SNAPSHOT-001` owns the rule; Admin uses one console-wide
  lease that `tool/web/check_admin_pending_operations.mjs` checks.
- **Implemented isn't reachable.** A previewed state with no route to it is
  unreachable debt, not live-flow coverage.
- **Two entry points, one decision.** When one implementation serves two routes
  for the same goal, keep their state lists separate and reuse the action names.
