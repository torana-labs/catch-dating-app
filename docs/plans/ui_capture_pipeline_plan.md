---
doc_id: ui_capture_pipeline_plan
version: 0.4.1
updated: 2026-11-02
owner: ui_capture_pipeline
status: remaining_work
---

# UI Capture Pipeline - Remaining Work

The pipeline exists. This file now tracks the gaps that remain after comparing the
old plan to the live repo.

## Implemented / Closed

- Route inventory tooling exists:
  `tool/ui_capture/check_route_inventory.mjs`.
- Capture coverage tooling exists:
  `tool/ui_capture/check_capture_coverage.mjs`.
- Capture runner exists:
  `tool/ui_capture/run_captures.mjs`.
- The Dart catalog exists:
  `test/ui_captures/catalog/screen_capture_catalog.dart`.
- The capture harness supports:
  - light/dark rendering;
  - device override;
  - text scale override;
  - PNG pixel ratio override;
  - capture-first and theme-first output layouts.
- The DPR encode bug is fixed by passing `pixelRatio` into `toImage`.
- Marketing export is wired through active fixture keys in
  `tool/marketing/capture_manifest.json`.
- Current coverage check passes:
  `Routes: 40 | Captures: 31 | Captured routes: 28 | Aliases: 6 | Planned: 0 | Excluded: 6`.
- Route inventory is current:
  `node tool/ui_capture/check_route_inventory.mjs --check`.
- Visual QA tracking covers all 31 live captures in `ui_capture_visual_qa.md`.
- Marketing design JSON has a checked artifact:
  `tool/marketing/app_screenshots_design_context.json`.
- `node tool/marketing/export_app_screenshots.mjs --check-design-json` passes and is
  registered in `tool/tools_manifest.json`.
- The active marketing slots are:
  - `member-event-discovery`
  - `post-run-catch-window`
  - `match-chat-context`
  - `host-event-setup`
  - `host-live-console`
  - `host-post-event-report`
- Active marketing capture sources were regenerated on 2026-06-01 after fixture changes,
  and `node tool/marketing/sync_website_media.mjs --check` passes.

## Remaining Work

1. **Decide CI placement for generated images.**
   - Current CI-safe checks are route inventory and capture coverage.
   - Full screenshot rendering is still a manual/local artifact workflow.
   - Acceptance: decide whether PR CI runs a small smoke catalog, whether `main` renders
     active marketing captures, and where artifacts are stored.

2. **Promote high-DPR design-gallery flow from optional to documented.**
   - `run_captures.mjs --profile design-gallery` exists and writes to the ignored
     `build/design_gallery`; nothing commits gallery PNGs.

## Parked / Not Baseline Scope

- Empty/loading/error/text-scale variants remain opt-in until the baseline catalog is
  stable and useful.
- Payment confirmation remains excluded unless a deterministic transaction fixture is
  introduced.
- Sheets/dialogs should stay captured through parent states unless they become primary
  product surfaces.

## Verification Commands

```bash
node tool/ui_capture/check_route_inventory.mjs --check
node tool/ui_capture/check_capture_coverage.mjs --check
node tool/ui_capture/run_captures.mjs --ids profile_self
node tool/ui_capture/run_captures.mjs --all
node tool/marketing/export_app_screenshots.mjs --check
node tool/marketing/export_app_screenshots.mjs --design-json
node tool/marketing/export_app_screenshots.mjs --check-design-json
node tool/marketing/sync_website_media.mjs --check
```
