---
doc_id: ui_elevation_implementation
owner: ui_elevation_initiative
status: active
---

# UI Elevation — Remaining Decisions

The completed rollout checklist and its superseded implementation examples have
been removed. Git preserves that history. Use the current owners below when
changing the UI; do not repeat the old token, font, profile, or sandbox migrations.

## Current Owners

- [Design language](design_language.md): visual identity, typography, activity
  color, photo grading, motion, and the remaining map-pin policy decision.
- [App architecture](app_architecture.md): sizing, scrolling, state ownership,
  and component composition.
- [Widget catalog](widget_catalog.md): current reusable components and APIs.
- [Design-system resync tracker](ds_resync_audit_2026-06.md): unresolved
  conformance work from the later design-system pass. Its current type language
  supersedes the earlier rollout's examples.
- [UI capture pipeline](plans/ui_capture_pipeline_plan.md) and
  [golden harness](../test/goldens/README.md): deterministic visual review.

## Remaining Decisions

These items remain review work, not claims that current implementations fail:

- Decide whether map-pin colors should follow activity/theme tokens or remain
  a documented expressive-art exception in the design language. If colors become
  theme- or activity-dependent, verify that bitmap cache keys include those
  inputs so old pins cannot survive a palette change.
- Bespoke activity emblems remain deferred; regular Phosphor glyphs are the
  current fallback. Keep this decision with the design language's deferred work.
- Activity pigment and photo-grade tuning remain design choices owned by the
  shared token and primitive implementations.
- Any display-face revisit must update the design language and shared font
  owner together; the retired rollout is not an alternate typography contract.

## Verification

Follow [AGENTS.md](../AGENTS.md) and derive the affected checks from the current
diff. For visual changes, inspect light and dark renders and the affected text
scales using the existing capture/golden harness. Preserve the actively consumed
`lib/design_fixtures/` library when removing obsolete standalone prototypes.
