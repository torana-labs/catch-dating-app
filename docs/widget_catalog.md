---
doc_id: widget_catalog
owner: recursive_audit_loop
status: active
---

# Widget Catalog

## Canonical Usage Decisions

Host bottom sheets use `CatchSheet.standard` for bounded whole-sheet scrolling,
keyboard clearance and shared header/body/footer geometry. Choices reuse
`CatchSelectionSheet` and `CatchMenuRow.sheet`; natural-height bodies do not own
vertical scrolling or viewport caps. Multi-select filters use wrapped
`CatchChoiceInput` groups and the shell-owned `pinFooter` option for a persistent
Close action. Native wheel and share-card recipes retain
their specific transaction and capture behavior.

Independent measurements use `CatchMetricSection.grid`; source-completeness
states use `.dataQuality` with the same adaptive tile geometry. Do not recreate
organizer summary strips or wrap the tile grid in a second surface. Large text
uses one column and natural-height labels. See the containment doctrine in
`docs/design_language.md` for the metric-only exception.

`CatchFieldStatus` is the single save-state input for all field recipes. Saving
locks disclosure controls and commit actions and supplies progress and
accessibility feedback. Direct text-input edit permissions remain caller-owned.

Disclosure controls use `CatchFieldMode` to distinguish local expansion from
caller-controlled expansion. Switching back to local ownership preserves the
last expansion. `inputActions` remains a caller-owned explicit-save editor.

Direct input completion uses Flutter's keyboard-action behavior. Callers that
need to retain focus, such as message composers, supply `onEditingComplete`;
`onSubmitted` receives the value afterward. Numeric typography uses native
`fontFeatures` instead of a separate typography flag.
`inputMode` reuses native text-input permissions for editing, focus and
selection. Display-only values stay outside the focus order; read-only inputs
can support selection or an explicit picker action.

`CatchFieldLabelTextMode` owns label visibility and optional wording. Content
and disclosure rows keep a visible label; direct inputs may hide it while
retaining one accessible native input name, including optional wording. The
mode does not change validation requirements or selection clearing.

L0 token definitions live in `packages/catch_tokens` and are consumed through
`package:catch_tokens/catch_tokens.dart`. Widgetbook foundation specimens in
`widgetbook/lib/foundation/specimens/` mount those same
production values. Theme wiring, typography, icons, motion, and bundled font assets now live
in `packages/catch_ui/lib/src/foundations`, consumed through
`package:catch_ui/catch_ui.dart`. `AppTheme` retains the app-specific activity
palette. Provider-free text/icon atoms, gaps, surfaces, image renderers and
interaction/layout primitives live in `catch_ui/src/primitives`.
Shared component and pattern widgets live in `catch_ui/src/components` and
`catch_ui/src/patterns`; domain and provider adapters remain app-owned.

`CatchBanner.statuses` (`packages/catch_ui/lib/src/components/catch_banner.dart`) owns durable
offline/rehearsal header anatomy, wrapping and 44 pt actions.
`CatchBannerStatusScope` publishes context without rendering it; canonical
screen owners consume it once below the complete title/tab header, preserve
the 16 pt standard body start and clear it for nested content. Features pass
`CatchBannerStatus` and `CatchBannerAction`, not a renderer or padding.
`CatchNoticeOverlay` now renders only the queued transient notice, never the
persistent context stack.

| Family | Use | Do not use |
|---|---|---|
| Screen composition | Every full-screen composition terminates in `CatchScaffold.standalone`, `.stepFlow`, or `.workspace`; only that primitive constructs Material `Scaffold`. Root title destinations use `.standard`, `.fullBleed`, or `.sections` on `CatchRootScreenScaffold` / `CatchRootScreenScrollView`; `.sections` keeps full-width rows and the 16 pt title-to-body rhythm. Roots with pinned peer navigation use `.withPrimaryRail` plus `CatchRootScreenPageScrollView`; pushed routes use `CatchRouteScaffold`. Select one root owner outside async state branches so loading, error, empty, and loaded content share its geometry. The composition gate verifies constructor role and branch-universal ownership. | Do not compose a feature-local `Scaffold` + `SafeArea` + `CustomScrollView` + title padding + terminal spacer, override a root title style, or choose a different root recipe for loading and loaded states. |
| Root and route headers | `CatchTopBar.route`, `.identity`, `.screen` and `.primaryRail` share one renderer and the platform function family. Task title precedes optional entity context; root titles use the headline scale. Search is a typed capability. The primitive owns wrapping, scaled heights and alignment. | No eyebrow, kicker, custom title widget/style, typography variant, size, mode, height, padding, gutter or alignment inputs. Translate invalid configurations and review fresh renders before updating goldens. |
| Browse search | A permanently expanded browse input renders no empty trailing control and shows its clear control only while the query is non-empty. `onCloseSearch` belongs only to morphing `expanding` chrome where an empty expanded search can collapse. | Do not pass `onCloseSearch` to a fixed Customers-style expanded search merely to occupy the trailing slot. |
| `CatchSection.divided` | Default for flat page-subject content and ordered detail groups. Typography, spacing, and hairlines carry hierarchy. Callers may supply a theme-resolved `titleColor`, including activity accents; omission uses the neutral section title. | Do not add a surrounding card or a surfaced empty state inside it. |
| `CatchSection.fieldRows` | Use for a titled divided group of sibling fields. The section owns its leading/header rule, text-lane sibling rules, and one interaction policy: responsive compact pages default to full bleed, while a section may explicitly request `roundedTile`. | Do not configure divider color/inset/role, give individual fields different interaction geometry, or use it as a headerless lane. |
| `CatchSection.controls` | Use for sort/filter controls above a collection. The Section owns the readable gutter and both full content-width rules; callers supply sort/filter labels and callbacks. Ordering is leading, Filters trailing, with an optional shared active-filter summary and Clear action. | Do not inject arbitrary children, reverse sort/filter placement, or draw screen-local boundary rules. |
| `CatchSection.loadingRows` / `.sliverLoadingRows` | Supply representative `CatchFieldLayout` values for the eventual row anatomy. Field and Section retain the loaded row's width, text lane, sibling rules, disclosure slot, and disabled loading semantics. | Do not substitute `CatchSkeleton.rows`, `.mediaRows`, or `.iconRows` for a known collection layout or add a loading-only outer card. |
| `CatchSection.containedFieldRows` | Use for one outlined group of sibling fields. A supplied title, count, or trailing action forms an outside kicker row by default; use `CatchSectionHeaderPlacement.inside` when that header belongs to the bounded group itself. Inside headers own the same inset end-to-end section rule as divided field sections. | Do not hand-roll a parallel kicker-plus-card shell, place an inside header without its section-owned rule, or round active child rows. |
| `CatchSection.dependentFieldRows` | A controlling Field and its applicable typed dependents share one rounded perimeter. The child area attaches through tint, without additional outlines or peer dividers. The section owns exact hit bounds; the form owns applicability and serialization. | Do not wrap only the children, accumulate indentation, or hide applicable fields when the control editor collapses. |
| `CatchSection.containedFieldGroups` | Use when one outlined collection contains one or more labelled groups of related field choices. Supply semantic `CatchSectionFieldGroup` descriptors; the section owns every internal kicker, boundary, sibling rule, clip, and active band. | Do not assemble subsection kickers and field dividers in feature code or use separate outlined sections for groups that form one choice set. |
| `CatchFieldLanes` | Use `.divided` for headerless sibling fields, `.single` for one ungrouped field, and `.custom` for a non-field body. Divided lanes inherit the responsive interaction policy and own canonical gutter and separators. | Do not override gutters or make a field paint its sibling divider. |
| `CatchSection.contained` | Fixed, shadowless frame around a related collection; semantic boundary, focus and error treatment belong to the section. | No paint or spacing overrides; ordinary information stays flat. |
| `CatchSection.action` | One bounded task: title, optional facts, explanation and a full-width primary, secondary or destructive CTA. | No arbitrary surface knobs, field lists in details, or card merely for an empty state. |
| `CatchSection.plain` | Flat information in an existing content lane, including Public reviews; enclosing composition owns section spacing. | Do not add a frame merely because information is empty or explanatory. |
| `CatchSliverEmptyState` | `packages/catch_ui/lib/src/patterns/catch_sliver_empty_state.dart:8` | Sliver placement of the canonical empty-state content and shared bottom-overlay accounting. |
| `CatchEmptyState` | It is content, not a section decision. Inside a section, leave `surface: false` and let the enclosing section own padding and chrome. A standalone route/pane may opt into `surface: true` only when that bounded region itself is the approved surface. | Do not change containment because data is absent; empty state must inherit the same owner as loaded content. |
| Semantic borders | Choose `CatchBorderRole.separator`, `boundary`, `control`, `selected`, `focus`, `danger`, or `warning`; higher-level primitives own interaction mapping. Focus is 2 px, selected/status is 1.5 px, and resting lines are 1 px with theme-aware contrast. | Do not pair raw border colors and widths in product UI, change outline geometry for hover/press, or make an error/loading branch invent containment. |

The full widget inventory is generated from public production Widget
declarations, class documentation and `design/components/catch.components.json`,
and is not committed: run `node tool/design/generate_widget_catalog.mjs --write`
to read it at `build/generated/widget_catalog.md`. `--check` enforces what it
encodes against live source. Undocumented and unreviewed feature widgets remain
visible there. The new-widget gate checks source, registry and Widgetbook
identities without requiring a separate hand-authored table.

[CatchField doctrine](design_language.md#73-catchfield-doctrine) owns labelled
field behavior. [App architecture](app_architecture.md) owns layering and
naming; the [consolidation decisions](design_parity/widget_consolidation/decisions.json)
own active keep, replace and delete decisions. Git preserves former inventory
and candidate discussions; this document has no parallel status ledger.
