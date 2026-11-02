---
doc_id: catch-ui-lint-rules-plan
version: 0.5.4
updated: 2026-11-02
owner: ui_elevation_initiative
dri: TBD
status: remaining_work
priority: P1
sprint: unscheduled
---

# Catch UI Lint Rules - Remaining Roadmap

The P0 lint package has landed in the live worktree. This roadmap keeps only the
unimplemented or still-weak lint/governance work.

## Implemented Baseline

- Local analyzer plugin: `packages/catch_ui_lints`.
- Enabled through `analysis_options.yaml` and verified by `tool/check_catch_ui_lints.sh`.
- Current diagnostics:
  - `catch_no_raw_ui_spacing`
  - `catch_no_token_arithmetic`
  - `catch_use_section_list`
  - `catch_prefer_semantic_insets`
  - `catch_event_detail_prefers_photo_thumbnail`
  - `catch_no_raw_material_control`
  - `catch_no_raw_color`
  - `catch_no_raw_text_style`
  - `catch_no_raw_font_drift`
  - `catch_no_raw_radius`
  - `catch_no_raw_content_dimension`
  - `catch_no_local_design_constant`
  - `catch_no_raw_icon_source`
  - `catch_no_raw_icon_size`
  - `catch_no_raw_alpha`
  - `catch_no_raw_shadow`
  - `catch_no_raw_motion`
  - `catch_no_raw_breakpoint`
  - `catch_no_raw_surface_shell`
  - `catch_no_raw_stroke_width`
  - `catch_no_raw_asset_path`
  - `catch_icon_button_requires_tooltip`
  - `catch_no_allow_debt`
  - `catch_no_widget_returning_method`
- Semantic spacing exists through `CatchGaps`, `CatchInsets`, and
  `docs/app_architecture.md`.
- Token source detection now covers import-prefixed token references such as
  `tokens.CatchSpacing.s4` and guards against top-level local declarations that
  shadow Catch token/source names.
- `docs/app_architecture.md` now documents the token tier model and explicitly
  rejects new `CatchBreakpoints` / `CatchZIndex` namespaces for the current app
  shape.
- Color/text/font drift count is currently `0` via `tool/check_catch_ui_lint_drift.sh`.
- Raw UI stroke drift is also `0`: `catch_no_raw_stroke_width` covers all
  handwritten app code, including 1 px literals, custom primitive
  `borderWidth`/`strokeWidth` arguments, and shared widgets. Zero remains the
  explicit no-border value; decorative `CustomPainter` artwork is excluded.
- `tool/check_catch_ui_lint_drift.sh --all --json <path>` emits a reusable JSON
  count artifact for drift snapshots, including analyzer completion status.
- P0 alignment gaps from the deleted P0 spec are closed: no retired sandbox
  exclusions, line-level art exceptions instead of whole-file color exemptions,
  completed radius coverage, narrowed Chip/Card/Badge material-control scope, and
  analyzer-backed local-constant/allow-debt counts.
- The old UI debt inventory is closed. Future work should come from fresh
  scanner deltas, screen reviews, or analyzer rule escalation, not the retired
  broad-count tracker.
- Diagnostic-specific shell wrappers are retired. Focused inspection uses
  `check_catch_ui_lint_drift.sh --code <diagnostic>` and aggregate enforcement
  uses its zero-diagnostic `--check` gate.
- The shared shell scanner helper is retired because no scanner wrapper consumes it.

## Phase 0 - Token Foundation Still Open

1. **Map-pin/activity color policy.**
   - Decide whether `CatchMapPinColors` and activity/map palettes should become tiered
     semantic tokens or stay sanctioned expressive art.

2. **Resolved symbol identity only when needed.**
   - The live rules remain parsed-AST based by design.
   - Import-prefixed token references and top-level token-name shadowing are covered.
   - Move an individual rule to resolved symbol identity only after a concrete false
     positive/false negative proves parsed matching cannot give a defensible signal.

## Phase 1 - P0 Alignment Gaps

Closed. If a P0 rule is widened again, update this roadmap and the lint contract
tests in the same pass instead of creating another standalone P0 tracker.

## Phase 1.5 - Scanner Family Migration

Closed on 2026-06-02. The deterministic scanner surfaces now live in
`packages/catch_ui_lints`; the historical root commands are analyzer-report
wrappers only.

## Phase 2 - P1 Rule Candidates

Implement only after the current scanner/lint policy is stable.

- Group A value rules: raw stroke and any shadow/opacity/icon/motion refinements that
  need resolved symbol identity beyond the migrated parsed-AST checks.
  - Raw stroke has repository-wide analyzer coverage via
    `catch_no_raw_stroke_width` and is part of the strict zero gate.
- Group B primitive bypass: preferred Catch image primitive and calibrated
  card/surface refinements beyond `catch_no_raw_surface_shell`.
- Group C component proliferation: private widget complexity and max build nesting depth.
- Group D boundaries: import boundaries, raw values only in theme, single icon set.
- Group E accessibility: required semantic labels for icon-only controls and meaningful
  images.
  - Icon-only `IconButton` tooltip coverage now exists via
    `catch_icon_button_requires_tooltip`; meaningful-image coverage still needs a
    narrower image policy.

## Phase 3 - P2 / Advanced Candidates

- Raw aspect ratio.
- Magic breakpoint.
- Direct `Theme.of(context).colorScheme` strictness.
- Raw asset path strictness.
  - Direct raw `assets/...` strings passed to asset loaders now have advisory analyzer
    coverage via `catch_no_raw_asset_path`; broader asset ownership remains a P2
    source-of-truth decision.
- Duplicate subtree detection.
- Minimum tap target.
- Raw user-facing string / l10n policy.

## Phase 4 - Governance Loop

1. **Visual-regression gate.**
   - The UI capture and golden infrastructure exists, but full visual review is not a
     required PR gate.

2. **Deprecation + codemods.**
   - Built-in `deprecated_member_use_from_same_package` can enforce deprecated tokens and
     primitives, but the design-system workflow is not yet formalized.

3. **Drift metric.**
   - Counts exist for some scanners/lints and
     `tool/check_catch_ui_lint_drift.sh --all --json <path>` now provides a reusable
     snapshot artifact. A hosted dashboard/trend surface is still not built.

4. **Component lifecycle ownership.**
   - Add a lightweight proposal/review flow before adding shared primitives if component
     sprawl keeps recurring.

## Parked / Not Worth Right Now

- Do not move all rules to resolved AST preemptively. Do it per rule when parsed matching
  cannot give a defensible signal.
- Style Dictionary is adopted (`tool/design_tokens.mjs`); this plan does not add other token
  codegen.
- Do not build duplicate dashboard infrastructure while scanner/lint output already gives
  a cheap count.

## Verification Commands

```bash
bash tool/check_catch_ui_lints.sh
bash tool/check_catch_ui_lint_drift.sh --count
bash tool/check_catch_ui_lint_drift.sh --all --json /private/tmp/catch-ui-lint-drift.json
bash tool/check_catch_ui_lint_drift.sh --code catch_no_raw_content_dimension --count
bash tool/check_catch_ui_lint_drift.sh --code catch_no_local_design_constant --summary
bash tool/check_catch_ui_lint_drift.sh --code 'catch_no_raw_ui_spacing|catch_no_token_arithmetic|catch_prefer_semantic_insets|catch_no_raw_material_control|catch_no_raw_button_control|catch_no_raw_radius|catch_no_raw_icon_source|catch_no_raw_icon_size|catch_no_raw_alpha|catch_no_raw_shadow|catch_no_raw_motion|catch_no_raw_breakpoint|catch_no_raw_surface_shell' --count
bash tool/check_catch_ui_lint_drift.sh --code catch_no_allow_debt --summary
bash tool/check_catch_ui_lint_drift.sh --check
flutter analyze --no-fatal-infos
```
