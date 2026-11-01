# Screen Composition Registry

`catch.screens.json` binds each public screen contract to its route inventory,
resolved Dart source, state controller, captures, sections, and three UI
enforcement columns:

- `shell` names the consumer, host, or standalone root and whether a nested
  Scaffold is intentionally allowed;
- `topBar` names the canonical chrome role/expression and owner;
- `statePolicy` names the loading/error/empty/data states the registered screen
  must own.

Run both gates after changing a screen or route composition:

```sh
node tool/design/check_screen_contracts.mjs --check
dart run tool/architecture/check_ui_composition_contracts.dart --check
```

The first checker validates route, capture, state, and component references.
The second resolves every production Dart source and fails missing symbols,
mismatched top-bar/state contracts, unauthorized Material Scaffold ownership,
or an unregistered named or imperative full-screen presentation. Named
GoRoutes bind through `layoutContracts` or `layoutOnlyRoutes`. Analyzer
discovery covers every full-screen `PageRoute` construction form, but the
imperative inventory and `imperativePageContracts` support only direct
`MaterialPageRoute` construction, with every call site generated into
`tool/ui_capture/route_inventory.json`. Aliases, constructor tear-offs,
factories/wrappers, `CupertinoPageRoute`, `PageRouteBuilder`, and subclasses
fail closed rather than bypassing the inventory. New screen contracts must add
all three enforcement columns in the same change.

For each registered layout owner, `family` plus `bodyGeometry` deterministically
selects the body boundary; there is no second body-owner field to drift. Root
owners explicitly select `CatchPageBodyMode`, pushed routes select the
matching `CatchRouteBody` variant, and roots with a primary rail select
`CatchRootScreenBody` with an explicit `bodyLayout` on every
`CatchRootScreenPageSpec`. The analyzer follows the owner declaration's actual
build/return tree and requires branch-universal static proof across every
statically reachable widget-producing terminal. It treats every reachable
conditional or switch arm as possible, follows approved builder callbacks and
local helpers/values, and accepts only registered same-family delegates. A
canonical scaffold or page hidden in an unused helper cannot satisfy the
contract, and a behavior callback cannot disguise a rogue branch. Semantic
root-page wrappers must expose and forward the same body role to
`CatchRootScreenPageScrollView`.

The complementary widget-classification and new-widget gates scan `lib/**`,
`apps/consumer/lib/**`, and `apps/host/lib/**` as one production namespace.
They resolve indirect widget subclasses transitively and reject exact or
ungoverned normalized public-name collisions across roots. Generated
exclusions are narrow (`.g.dart`, `.freezed.dart`, and named localization
outputs), not directory-wide.

A screen contract governs composition; a feature contract adds
state/action/evidence orchestration.
