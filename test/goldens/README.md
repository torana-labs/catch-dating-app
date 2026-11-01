# Golden visual-regression harness

Deterministic golden tests are Catch's automated substitute for the light/dark +
Dynamic-Type visual QA that can't be eyeballed in CI. They guard the UI-elevation
migration (token re-skin, the 186-site sizing pass, the activity re-grade) from
**silent** visual breakage.

## Run

```bash
flutter test test/goldens                    # verify against committed baselines
flutter test --update-goldens test/goldens   # regenerate baselines (review the diff!)
```

Baselines live in `test/goldens/baseline/<name>.<light|dark>.png`.

These tests are tagged `golden`. The Ubuntu Flutter CI unit/widget step runs
with `--exclude-tags=golden` because the committed baselines are macOS-rendered.
The dedicated macOS lane uses `CatchGoldenFileComparator`. App goldens keep the
0.30% pixel tolerance: their reviewed hosted-runner variance is at most 0.29%.
The larger, text-heavy Widgetbook corpus uses a separately checked 0.60%
tolerance after its macOS 26 arm64 CI diffs measured at most 0.5188% against
macOS 27 authoring baselines. The reviewed differences are confined to
anti-aliased text/icon edges. Larger visual drift still fails and emits
Flutter's normal master, test, isolated-diff, and masked-diff artifacts.

## What's covered

| Golden | What it locks |
|---|---|
| `design_system_sheet` | All `CatchTokens` color roles + activity pigments, the full `CatchTextStyles` ramp (serif/sans/mono, weights, italic), and the activity-art duotone + pattern + glyph — light **and** dark. |
| `adaptive_tab_bar_ios_chrome` | Floating/glass `CatchTabBar` chrome, 64/48/8 dock-indicator geometry, active-label pill, badge placement, safe-area offset, and light/dark token mapping on iOS. |
| `adaptive_tab_bar_android_chrome` | Anchored `CatchTabBar` chrome, 64/48/8 dock-indicator geometry, active-label pill, badge placement, safe-area behavior, and light/dark token mapping on Android. |

Add coverage as components stabilize (ticket card, polaroid, profile sections, …).

## Widgetbook corpus

The separate Widgetbook package executes 249 designated `core/widgets` use
cases through `widgetbook_golden_test_core`'s generated-directory traversal
and a thin Catch renderer adapter. All designated cases render in light and
dark; 217 text-bearing L2-L4 cases also render at text scale 2.0. The 944
reviewed images live under `test/goldens/baseline/widgetbook/`. The original
ten reference filenames remain stable, while the rest use deterministic
source-derived ids. State declarations remain in Widgetbook source. Shared
catalog, device, sheet, provider, and case scopes live in
`widgetbook/lib/support/widgetbook_harness.dart`.

```bash
cd widgetbook
flutter pub get
flutter test test/primitive_goldens_test.dart
flutter test test/primitive_goldens_test.dart # consecutive determinism check
```

These tests reuse `matchCatchGolden`, `loadCatchTestFonts`, and
`CatchGoldenFileComparator` with the reviewed Widgetbook-only 0.60% tolerance.
Run the same command with `--update-goldens` to regenerate and review the
images. Every CI run renders the corpus once; the nightly full validation
renders it a second time in sequence as a determinism check.

The corpus runner selects its cases through
`widgetbook/test/support/triage_inventory.dart`, a Dart syntax inventory that
follows local helper and scope references and reconciles generated
registrations with annotations.

## Adding a golden

```dart
// test/goldens/my_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/golden_pump.dart';

void main() {
  testWidgets('my widget', (tester) async {
    await matchCatchGolden(tester, 'my_widget', builder: (context) => const MyWidget());
    // Optional Dynamic-Type variant:
    // await matchCatchGolden(tester, 'my_widget@1.5', textScale: 1.5, builder: ...);
  });
}
```

`matchCatchGolden` pumps inside the real `AppTheme`, renders **light + dark**, pins
devicePixelRatio to 1.0 on a fixed surface, and leaves font/layout failures
visible. Avoid `Image.network` in goldens (it loads nothing in tests) — use
activity art or inject a fake image.

## How fonts work (the tricky part)

Goldens load the same package-owned font assets the app ships from
`packages/catch_ui/assets/fonts`, registering branded families under
`packages/catch_ui/<family>` as Flutter does at runtime:

1. `flutter_test_config.dart` registers Archivo and IBM Plex Mono via
   `FontLoader`; deterministic Roboto files stand in for the concrete platform
   function-family aliases.
2. Archivo weights/widths are driven through `FontVariation` in `CatchFonts`.
3. Mono uses the bundled per-weight statics.

This is **test-only** — no fonts are added to the app bundle. If `CatchFonts`
changes the display face, re-probe the emitted family names and update the loader.

## ⚠️ Platform determinism

Golden PNGs are **platform-specific** (font rasterization differs across macOS /
Linux). The committed baselines were generated on **macOS**. Run golden tests on
the pinned macOS CI platform; the narrow comparator tolerance handles rasterizer
noise between developer and hosted macOS machines. Do not widen it to make a
visual change pass. Treat a golden diff as "review the change," not "auto-fail"
— regenerate only when the change is intended.

## CI

Do not run these PNG goldens in the default Ubuntu Flutter CI job. Run
`flutter test test/goldens` on the pinned platform alongside visual-review gates
(see `docs/release_operations.md`). A diff above the suite's checked tolerance
means a reviewer must confirm the visual change and regenerate baselines.
