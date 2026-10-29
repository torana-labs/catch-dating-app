---
doc_id: sizing_migration_prompt
version: 1.0.1
updated: 2026-08-06
owner: ui_elevation_initiative
status: reference — reusable agent prompt
---

# Sizing migration — agent prompt

Reusable prompt for handing the **fixed-dimension → constraint** migration to a
capable model (use **Sonnet**, not Haiku — the media-vs-cap-vs-art judgment is the
hard part). Pairs with the doctrine in
[`app_architecture.md` → "Sizing And Constraints"](app_architecture.md) and the
`catch_no_raw_content_dimension` analyzer diagnostic.

> **Check first:** `bash tool/check_catch_ui_lint_drift.sh --code
> catch_no_raw_content_dimension --label 'sizing doctrine' --count`. If it prints `0`, there is
> nothing to do (the doctrine is already satisfied on this branch). Point the agent
> at a branch/PR where the count is non-zero.

---

Copy everything below into the agent task:

````markdown
# Task: convert hardcoded UI dimensions to constraints (Catch Flutter app)

Drive the focused `catch_no_raw_content_dimension` report to a clean exit (0)
by converting hardcoded content
dimensions to constraint-based layout, so the UI scales across phone sizes and
Dynamic Type. Source-of-truth: `docs/app_architecture.md → "Sizing And Constraints"`
(read it first). Work in small batches; verify constantly.

## Step 1 — see the work
```bash
bash tool/check_catch_ui_lint_drift.sh --code catch_no_raw_content_dimension --label 'sizing doctrine' --count
bash tool/check_catch_ui_lint_drift.sh --code catch_no_raw_content_dimension --label 'sizing doctrine'
```
The scanner flags, under `lib/` (excluding `lib/platform/theme/**`, `lib/design_fixtures/**`,
`*explore_concept*`, generated `*.g.dart`/`*.freezed.dart`):
- `height:` / `width:` / `dimension:` named args with a number ≥ 4
- fixed `Size(N, …)` literals (N ≥ 4)
- `BoxConstraints.tight` / `.tightFor` / `.expand`
- dimension-like decls: `const/final double …Height|Width|Size|Extent = N`

It does NOT flag (these are the *desired* patterns, leave them): `maxHeight`,
`minHeight`, `maxWidth`, `minWidth`, `strokeWidth` (camelCase), the literals
`0/1/2/3`, and any line already carrying `// sizing:allow: <reason>`.

## Step 2 — for EACH finding, apply this decision tree IN ORDER
PREFER conversion. The `// sizing:allow:` annotation is the LAST resort, only for
genuinely fixed art — never to silence the scanner.

1. **Spacing gap?** (a `SizedBox` with `height:`/`width:` and **no `child`**)
   → use the spacing scale. `CatchSpacing.sN` = 4·N (s1=4 … s6=24 … s16=64); helpers `gapH24`/`gapW16`.
   ```dart
   const SizedBox(height: 24)            →  gapH24            // or SizedBox(height: CatchSpacing.s6)
   ```

2. **Media?** (image / photo / backdrop / map / video, fixed height)
   → `AspectRatio`; drop the fixed height. Reuse a `CatchAspectRatio` token
   (`square`, `wide16x9`, `activityCard`=16/10, `standardPhoto`=4/3, `portrait4x5`, `portrait3x4`).
   ```dart
   SizedBox(height: 200, child: photo)   →  AspectRatio(aspectRatio: CatchAspectRatio.activityCard, child: photo)
   ```

3. **Box that should just fit its child?** → delete the fixed dimension; let it size.
   ```dart
   Container(height: 64, child: Row(...)) →  Padding(... child: Row(...))   // remove height; pad instead
   ```

4. **Box that must CAP its size?** → convert the literal to a min/max constraint
   (camelCase ⇒ scanner-clean AND correct).
   ```dart
   SizedBox(height: 120, child: list)    →  ConstrainedBox(constraints: const BoxConstraints(maxHeight: 120), child: list)
   ```

5. **Text-bearing container with a fixed height?** → NEVER fix it. Use a min-height
   floor + padding so text can grow (Dynamic Type).
   ```dart
   Container(height: 56, child: Text(label))
   → ConstrainedBox(constraints: const BoxConstraints(minHeight: 56), child: Padding(padding: ..., child: Text(label)))
   ```

6. **Fixed-width sibling in a Row/Column?** → `Expanded` / `Flexible` / `FractionallySizedBox`.
   ```dart
   Row(children: [SizedBox(width: 160, child: a), b])  →  Row(children: [Expanded(child: a), b])
   ```

7. **Page/content width on large screens?** → center the body in
   `ConstrainedBox(maxWidth: CatchLayout.maxContentWidth)`.

8. **`BoxConstraints.tightFor(height: X)` / `.tight` / `.expand`** → replace with
   min/max constraints, or `AspectRatio`, per the cases above.

9. **Genuinely fixed art** (QR canvas, logo artboard, platform-spec graphic, a
   `CustomPaint` whose geometry is intrinsic) → keep it and annotate the SAME line:
   ```dart
   SizedBox.square(dimension: 220, child: QrImageView(...)),  // sizing:allow: QR canvas — fixed by spec
   ```
   The reason must be SPECIFIC ("QR canvas — fixed by spec"), not "fixed"/"art".

## Step 3 — hard rules (read these; they're how this goes wrong)
- **Do not hide a raw number in a private constant** to dodge the scanner —
  `static const _cardHeight = 120;` is caught by `catch_no_local_design_constant`.
  Route to a token or a constraint, not a local const.
- **Do not blanket-annotate.** If you used `// sizing:allow:` more than a couple of
  times in a file, you're probably escape-hatching things that should be constraints. Re-check.
- **Behavior-preserving only.** The layout should look the same at text scale 1.0;
  it should merely stop clipping at 1.5/2.0. Don't restructure widgets beyond the swap.
- **Stay out of exempt dirs:** never edit `lib/platform/theme/**`, `lib/design_fixtures/**`, `*explore_concept*`.
- **Icon sizes** always go through `CatchIconSize.{sm,md,lg,...}`, never a raw number.

## Step 4 — verify (after every 5–10 files, and at the end)
```bash
flutter analyze                         # must stay clean
bash tool/check_catch_ui_lint_drift.sh --code catch_no_raw_content_dimension --label 'sizing doctrine' --count
bash tool/check_catch_ui_lint_drift.sh --code catch_no_local_design_constant --label 'local design constants'
flutter test --concurrency=1            # at the end — no new failures vs. baseline
```
If you touched a screen, sanity-check it at text scale 1.0 / 1.5 / 2.0 in light + dark.

## Definition of done
- the focused `catch_no_raw_content_dimension` report exits 0.
- the focused `catch_no_local_design_constant` report exits 0.
- `flutter analyze` clean; no NEW test failures vs. the pre-change baseline.
- No `// sizing:allow:` used except for genuinely fixed art, each with a specific reason.
````
