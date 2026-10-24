---
doc_id: widget_catalog
version: 4.10.1
updated: 2026-09-23
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

The inventory below is generated from public production Widget declarations,
class documentation and `design/components/catch.components.json`. Edit those
sources and run `node tool/design/generate_widget_catalog.mjs --write`;
`--check` detects stale output and hand edits. Undocumented and unreviewed
feature widgets remain visible. The new-widget gate checks source, registry
and Widgetbook identities without requiring a separate hand-authored table.

[CatchField doctrine](design_language.md#73-catchfield-doctrine) owns labelled
field behavior. [App architecture](app_architecture.md) owns layering and
naming; the [consolidation decisions](design_parity/widget_consolidation/decisions.json)
own active keep, replace and delete decisions. Git preserves former inventory
and candidate discussions; this document has no parallel status ledger.

<!-- BEGIN GENERATED WIDGET INVENTORY -->
<!-- Generated by tool/design/generate_widget_catalog.mjs. Do not edit this region. -->
## Production Widget Inventory

1240 public production Widgets. Source discovery determines membership; the component registry supplies reviewed identity and ladder metadata.

Purpose comes from the first class documentation paragraph, then the registry summary. 813 declarations have neither and remain visible as undocumented. Unreviewed feature Widgets use the existing screen-name boundary for L5/L6; that source classification is not a semantic conformance verdict.

### L2 (24)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>CatchClockIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_clock_indicator.dart:6</code> | <code>Indicator</code> | <code>catch.event_card</code> | Event-card time glyph member used by ticket and agenda compositions. |
| <code>CatchCodeCaretIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_code_caret_indicator.dart:5</code> | <code>Indicator</code> | <code>catch.code_input</code> | Token-styled insertion caret used inside code input cells. |
| <code>CatchCodeDigitSurface</code> | <code>packages/catch_ui/lib/src/primitives/catch_code_digit_surface.dart:8</code> | <code>Surface</code> | <code>catch.code_input</code> | Token-styled verification-code cell. |
| <code>CatchControlSurface</code> | <code>packages/catch_ui/lib/src/primitives/catch_control_surface.dart:79</code> | <code>Surface</code> | <code>catch.control_shell</code> | Token-backed control containment with stable geometry across visual states. Also called: <code>ControlContainer</code>, <code>InputContainer</code>, <code>FieldBox</code>. |
| <code>CatchDivider</code> | <code>packages/catch_ui/lib/src/primitives/catch_divider.dart:10</code> | <code>Divider</code> | <code>catch.section</code> | One token-backed separator for sections, field rows and metric columns. |
| <code>CatchFractionalViewport</code> | <code>packages/catch_ui/lib/src/primitives/catch_fractional_viewport.dart:8</code> | <code>Viewport</code> | <code>catch.screen_body</code> | Sizes a child to a fraction of its local lane, capped at an absolute width. |
| <code>CatchGradedImage</code> | <code>packages/catch_ui/lib/src/primitives/catch_graded_image.dart:119</code> | <code>Image</code> | <code>catch.graded_image</code> | Wraps a photo [child] in the shared [CatchGrade] for the current brightness. Non-destructive: the source image is untouched. Set [enabled] `false` to show the raw photo (e.g. the user viewing their own upload). Also called: <code>FilteredImage</code>, <code>ColorGradedImage</code>, <code>ImageFilter</code>, <code>DuotoneImage</code>. |
| <code>CatchHeroViewport</code> | <code>packages/catch_ui/lib/src/primitives/catch_hero_viewport.dart:6</code> | <code>Viewport</code> | <code>catch.motion_viewport</code> | Shared Hero viewport for card flights with transparent Material chrome. |
| <code>CatchIconTile</code> | <code>packages/catch_ui/lib/src/primitives/catch_icon_tile.dart:10</code> | <code>Tile</code> | <code>catch.icon_tile</code> | Non-interactive icon presentation with tiled, empty and error recipes. Also called: <code>IconBadge</code>, <code>IconCircle</code>, <code>IconContainer</code>, <code>IconBox</code>. |
| <code>CatchImageFallbackSurface</code> | <code>packages/catch_ui/lib/src/primitives/catch_image_fallback_surface.dart:5</code> | <code>Surface</code> | <code>catch.network_image</code> | Missing-image paint with neutral-glyph and branded hero recipes; source loading and errors stay with the image owner. |
| <code>CatchKickerText</code> | <code>packages/catch_ui/lib/src/primitives/catch_kicker_text.dart:8</code> | <code>Text</code> | <code>catch.typography</code> | Handoff `Kicker`: uppercase mono eyebrow for section starts and editorial labels. Also called: <code>Eyebrow</code>, <code>EyebrowText</code>, <code>OverlineText</code>, <code>SectionLabel</code>, <code>UiLabel</code>, <code>Kicker</code>. |
| <code>CatchLoadingIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_loading_indicator.dart:8</code> | <code>Indicator</code> | <code>catch.loading_indicator</code> | Indeterminate activity feedback with circular, dots and inline recipes. Also called: <code>Spinner</code>, <code>LoadingSpinner</code>, <code>ProgressSpinner</code>, <code>Loader</code>, <code>ActivityIndicator</code>. |
| <code>CatchMediaOverlay</code> | <code>packages/catch_ui/lib/src/primitives/catch_media_overlay.dart:9</code> | <code>Overlay</code> | <code>catch.detail_media</code> | Photo scrim gradients for readable text and chrome over media. |
| <code>CatchMetadataText</code> | <code>packages/catch_ui/lib/src/primitives/catch_metadata_text.dart:5</code> | <code>Text</code> | <code>catch.typography</code> | Single-line mono label for compact metadata in cards and rails. |
| <code>CatchNetworkImage</code> | <code>packages/catch_ui/lib/src/primitives/catch_network_image.dart:18</code> | <code>Image</code> | <code>catch.network_image</code> | Canonical network-image primitive — the single seam every remote image in the app renders through. Also called: <code>CachedNetworkImage</code>, <code>RemoteImage</code>, <code>CachedImage</code>, <code>ImageLoader</code>. |
| <code>CatchPageIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_page_indicator.dart:4</code> | <code>Indicator</code> | <code>catch.page_dots</code> | Compact page/progress dot indicator with selected-width emphasis, semantic label support, and motion-token transitions. Also called: <code>DotsIndicator</code>, <code>PageDots</code>, <code>CarouselDots</code>, <code>PagerDots</code>. |
| <code>CatchPagerFocusViewport</code> | <code>packages/catch_ui/lib/src/primitives/catch_pager_focus_viewport.dart:6</code> | <code>Viewport</code> | <code>catch.screen_body</code> | Stops descendant focus/caret reveal requests at a horizontal pager page. |
| <code>CatchRevealViewport</code> | <code>packages/catch_ui/lib/src/primitives/catch_reveal_viewport.dart:10</code> | <code>Viewport</code> | <code>catch.motion_viewport</code> | Presents content from an external transition clock with owned curve lifetime. Also called: <code>RevealAnimation</code>, <code>FadeInView</code>, <code>RevealTransition</code>. |
| <code>CatchRowPressSurface</code> | <code>packages/catch_ui/lib/src/primitives/catch_row_press_surface.dart:10</code> | <code>Surface</code> | <code>catch.field</code> | Full-row interaction layer for list and field rows. |
| <code>CatchSheetDragIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_sheet_drag_indicator.dart:4</code> | <code>Indicator</code> | <code>catch.sheet</code> | Centered passive drag affordance for the owning sheet surface. |
| <code>CatchStatusIndicator</code> | <code>packages/catch_ui/lib/src/primitives/catch_status_indicator.dart:4</code> | <code>Indicator</code> | <code>catch.badge</code> | Dot-only status marker used inside rows, badges, and presence-style metadata. |
| <code>CatchSurface</code> | <code>packages/catch_ui/lib/src/primitives/catch_surface.dart:10</code> | <code>Surface</code> | <code>catch.surface</code> | Canonical Catch surface primitive for cards, panels, and tappable tiles. Also called: <code>AppCard</code>, <code>BaseCard</code>, <code>ContentCard</code>, <code>Panel</code>, <code>RoundedContainer</code>. |
| <code>CatchText</code> | <code>packages/catch_ui/lib/src/primitives/catch_text.dart:8</code> | <code>Text</code> | <code>catch.text</code> | Text in one [CatchTextVariant] role. Also called: <code>Typography</code>, <code>Paragraph</code>, <code>BodyText</code>, <code>HeadingText</code>, <code>TextBlock</code>. |
| <code>CatchTextInput</code> | <code>packages/catch_ui/lib/src/primitives/catch_text_input.dart:42</code> | <code>Input</code> | <code>catch.field</code> | Canonical low-level text-entry primitive. |

### L3 (101)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>CatchActionMenu</code> | <code>packages/catch_ui/lib/src/components/catch_action_menu.dart:9</code> | <code>Menu</code> | <code>catch.menu</code> | Anchored overflow trigger for at most five commands; selected or informational status rows are structurally excluded. |
| <code>CatchAttributionRow</code> | <code>packages/catch_ui/lib/src/components/catch_attribution_row.dart:7</code> | <code>Row</code> | <code>catch.sheet</code> | Brand attribution and context for exported media. |
| <code>CatchAvatar</code> | <code>packages/catch_ui/lib/src/components/catch_avatar.dart:19</code> | <code>Avatar</code> | <code>catch.person_avatar</code> | Canonical avatar for photos, initials, activity identity, counts and veils. Callers own names, image URLs, count copy and activity colors. This component owns fallback selection, the clipping frame, ring and optional online dot. Also called: <code>ProfileAvatar</code>, <code>UserAvatar</code>, <code>ProfilePicture</code>, <code>AvatarImage</code>. |
| <code>CatchAvatarInitialsSurface</code> | <code>packages/catch_ui/lib/src/components/catch_avatar_initials_surface.dart:14</code> | <code>Surface</code> | <code>catch.person_avatar</code> | The initials layer of an avatar; its parent owns clipping, photos and status. People use quiet paper/ink. The activity recipe uses caller-resolved pigment. |
| <code>CatchAvatarRow</code> | <code>packages/catch_ui/lib/src/components/catch_avatar_row.dart:11</code> | <code>Row</code> | <code>catch.person_avatar</code> | An overlapping row of avatars, anonymous slots and caller-formatted overflow. |
| <code>CatchAvatarViewport</code> | <code>packages/catch_ui/lib/src/components/catch_avatar_viewport.dart:11</code> | <code>Viewport</code> | <code>catch.person_avatar</code> | Shared avatar clipping, obscuring and label allocation. Labels fit inside the inscribed content square so larger text cannot wrap behind a circle. |
| <code>CatchBadge</code> | <code>packages/catch_ui/lib/src/components/catch_badge.dart:29</code> | <code>Badge</code> | <code>catch.badge</code> | Canonical small badge for compact, non-interactive metadata and status. Also called: <code>StatusBadge</code>, <code>StatusChip</code>, <code>StatusPill</code>, <code>MetaBadge</code>. |
| <code>CatchBanner</code> | <code>packages/catch_ui/lib/src/components/catch_banner.dart:20</code> | <code>Banner</code> | <code>catch.banner</code> | Persistent feedback with one icon, copy and action renderer. Also called: <code>InfoBanner</code>, <code>AlertBanner</code>, <code>WarningBanner</code>, <code>StatusBanner</code>, <code>InlineAlert</code>. |
| <code>CatchBannerStatusScope</code> | <code>packages/catch_ui/lib/src/components/catch_banner_status_scope.dart:8</code> | <code>Scope</code> | <code>catch.banner</code> | Publishes context without drawing it. Canonical screen owners consume this scope once, below their title and optional primary rail, and clear it for nested content. The app publishes connectivity above the route navigator; route-specific rehearsal context is supplied to its scaffold's typed slot. |
| <code>CatchBarIndicator</code> | <code>packages/catch_ui/lib/src/components/catch_bar_indicator.dart:8</code> | <code>Indicator</code> | <code>catch.mini_bar_chart</code> | One quantitative bar, including empty stubs and bounded fractional values. Also called: <code>MiniBar</code>, <code>BarChartBar</code>, <code>ProgressBar</code>, <code>MeterBar</code>. |
| <code>CatchButton</code> | <code>packages/catch_ui/lib/src/components/catch_button.dart:40</code> | <code>Button</code> | <code>catch.button</code> | Canonical labelled action with command, selection and floating recipes. Also called: <code>PrimaryButton</code>, <code>SecondaryButton</code>, <code>AppButton</code>, <code>ActionButton</code>, <code>CtaButton</code>. |
| <code>CatchButtonContentRow</code> | <code>packages/catch_ui/lib/src/components/catch_button_content_row.dart:4</code> | <code>Row</code> | <code>catch.button</code> | Button content row with optional leading media, centered label and natural-height wrapping; interaction and busy state remain Button-owned. |
| <code>CatchChip</code> | <code>packages/catch_ui/lib/src/components/catch_chip.dart:24</code> | <code>Chip</code> | <code>catch.chip</code> | Canonical compact-label primitive for facts, choices, activities, and removable values. Also called: <code>FilterChip</code>, <code>ChoiceChip</code>, <code>TagChip</code>, <code>ToggleChip</code>, <code>SelectableChip</code>. |
| <code>CatchChoiceButton</code> | <code>packages/catch_ui/lib/src/components/catch_choice_button.dart:9</code> | <code>Button</code> | <code>catch.chip.field</code> | Direct option renderer with platform-sized activation, selected/disabled semantics, and preserved custom spoken-label actions. Underline and operational labels retain a defensive one-line ellipsis fallback; CatchChoiceInput.segmented measures full content and enables scrolling before that fallback is needed. Summary labels wrap. |
| <code>CatchChoiceInput</code> | <code>packages/catch_ui/lib/src/components/catch_choice_input.dart:27</code> | <code>Input</code> | <code>catch.chip.field</code> | Checked choices with caller-owned values and shared selection policy. Also called: <code>SegmentedControl</code>, <code>ChipGroup</code>, <code>RadioGroup</code>, <code>CheckboxGroup</code>, <code>ToggleGroup</code>, <code>ChoiceGroup</code>. |
| <code>CatchChoiceTile</code> | <code>packages/catch_ui/lib/src/components/catch_choice_tile.dart:12</code> | <code>Tile</code> | <code>catch.chip.field</code> | One mutually exclusive choice with optional explanatory copy. Also called: <code>OptionCard</code>, <code>ChoiceCard</code>, <code>RadioCard</code>, <code>SelectableCard</code>. |
| <code>CatchCodeInput</code> | <code>packages/catch_ui/lib/src/components/catch_code_input.dart:16</code> | <code>Input</code> | <code>catch.code_input</code> | Canonical editable one-time-code input with synchronized visual digits. Also called: <code>OtpInput</code>, <code>PinCodeInput</code>, <code>VerificationCodeInput</code>, <code>OtpField</code>. |
| <code>CatchCodeInputRow</code> | <code>packages/catch_ui/lib/src/components/catch_code_input_row.dart:8</code> | <code>Row</code> | <code>catch.code_input</code> | Token-styled row of verification-code cells. |
| <code>CatchCollapsedHeaderTitle</code> | <code>packages/catch_ui/lib/src/components/catch_collapsed_header_title.dart:6</code> | <code>HeaderTitle</code> | <code>catch.top_bar</code> | Toolbar title that appears only after a flexible sliver header collapses. |
| <code>CatchContentSection</code> | <code>packages/catch_ui/lib/src/components/catch_content_section.dart:44</code> | <code>Section</code> | <code>catch.section</code> | Non-row content has a readable inset and no shared row recognizer. |
| <code>CatchContentSectionHeader</code> | <code>packages/catch_ui/lib/src/components/catch_content_section.dart:14</code> | <code>Header</code> | <code>catch.section</code> | Internal header boundary shared by row and non-row section recipes. |
| <code>CatchCountBadge</code> | <code>packages/catch_ui/lib/src/components/catch_count_badge.dart:13</code> | <code>Badge</code> | <code>catch.badge</code> | Canonical integer count marker. |
| <code>CatchCountText</code> | <code>packages/catch_ui/lib/src/components/catch_count_text.dart:6</code> | <code>Text</code> | <code>catch.section</code> | Animated, uncapped numeric text for count-bearing headers. |
| <code>CatchDataQualityMetricTile</code> | <code>packages/catch_ui/lib/src/components/catch_data_quality_metric_tile.dart:10</code> | <code>Tile</code> | <code>catch.analytics_metric</code> | Summary surface for a caller-formatted metric and its data-quality status. Also called: <code>DataQualityTile</code>, <code>CompletenessTile</code>, <code>DataCoverageTile</code>. |
| <code>CatchDaySectionHeader</code> | <code>packages/catch_ui/lib/src/components/catch_day_section_header.dart:12</code> | <code>Header</code> | <code>catch.section</code> | Sticky day-section header for chronologically grouped feeds. |
| <code>CatchDependentRowSection</code> | <code>packages/catch_ui/lib/src/components/catch_dependent_row_section.dart:13</code> | <code>Section</code> | <code>catch.section</code> | Internal renderer for Section's conditional configuration recipe. The leading and descendants share geometry; tint signals attachment without adding another perimeter or claiming that a dependency is an equal peer. |
| <code>CatchDialog</code> | <code>packages/catch_ui/lib/src/components/catch_dialog.dart:81</code> | <code>Dialog</code> | <code>catch.confirm_dialog</code> | Shared modal frame for slotted content and typed confirmation choices. Also called: <code>ConfirmDialog</code>, <code>AlertDialog</code>, <code>ConfirmationDialog</code>, <code>ModalDialog</code>. |
| <code>CatchDistanceOverlay</code> | <code>packages/catch_ui/lib/src/components/catch_distance_overlay.dart:12</code> | <code>Overlay</code> | <code>catch.distance_ring</code> | Map radius annotation with fixed or available-space geometry. Also called: <code>RadiusOverlay</code>, <code>DistanceRing</code>, <code>MapRadius</code>. |
| <code>CatchDividedFieldInteractionScope</code> | <code>packages/catch_ui/lib/src/components/catch_divided_field_interaction_scope.dart:5</code> | <code>Scope</code> | <code>catch.field</code> | Internal responsive policy scope published by section-page composition. |
| <code>CatchDock</code> | <code>packages/catch_ui/lib/src/components/catch_dock.dart:31</code> | <code>Dock</code> | <code>catch.bottom_action</code> | Persistent control surface with utility and primary-action recipes. Also called: <code>BottomActionBar</code>, <code>StickyFooter</code>, <code>BottomBar</code>, <code>ActionDock</code>. |
| <code>CatchEmptyState</code> | <code>packages/catch_ui/lib/src/components/catch_empty_state.dart:10</code> | <code>EmptyState</code> | <code>catch.empty_state</code> | Canonical successful-empty content with bounded and inline layout. Also called: <code>EmptyView</code>, <code>EmptyPlaceholder</code>, <code>NoResultsState</code>, <code>EmptyListState</code>. |
| <code>CatchErrorBackButton</code> | <code>packages/catch_ui/lib/src/components/catch_error_back_button.dart:7</code> | <code>Button</code> | <code>catch.error_state</code> | Canonical exit affordance for terminal error states where retry is not a truthful action (for example a deleted event or an unauthorized route). |
| <code>CatchErrorDetailsAccordion</code> | <code>packages/catch_ui/lib/src/components/catch_error_details_accordion.dart:8</code> | <code>Accordion</code> | <code>catch.error_state</code> | Tokenized debug-only framework error disclosure used by CatchFrameworkErrorState. |
| <code>CatchErrorState</code> | <code>packages/catch_ui/lib/src/components/catch_error_state.dart:11</code> | <code>ErrorState</code> | <code>catch.error_state</code> | Canonical error content with full-region, inline and compact placement. Also called: <code>ErrorView</code>, <code>ErrorPlaceholder</code>, <code>RetryState</code>, <code>FailureState</code>. |
| <code>CatchField</code> | <code>packages/catch_ui/lib/src/components/catch_field.dart:35</code> | <code>Field</code> | <code>catch.field</code> | Design-system `Field`: the unified field primitive for row, text-entry, navigation, toggle, disclosure-control, add, validation, and helper states. Stack fields in a CatchSection when the surrounding section owns box or divider chrome. Also called: <code>TextField</code>, <code>FormField</code>, <code>InputField</code>, <code>LabeledField</code>, <code>FormInput</code>. |
| <code>CatchFieldActionRow</code> | <code>packages/catch_ui/lib/src/components/catch_field_action_row.dart:6</code> | <code>Row</code> | <code>catch.field</code> | Trailing Cancel/Done group used by explicit-save field drawers. |
| <code>CatchFieldCommitButton</code> | <code>packages/catch_ui/lib/src/components/catch_field_commit_button.dart:10</code> | <code>Button</code> | <code>catch.field</code> | Exact Cancel/Done action used by a disclosed `CatchField` editor. |
| <code>CatchFieldContentRow</code> | <code>packages/catch_ui/lib/src/components/catch_field_content_row.dart:16</code> | <code>Row</code> | <code>catch.field</code> | Field content with two explicit hierarchies: title/description and caption/value. The enclosing field owns interaction; this member owns text lanes and support. |
| <code>CatchFieldDrawer</code> | <code>packages/catch_ui/lib/src/components/catch_field_drawer.dart:8</code> | <code>Drawer</code> | <code>catch.field</code> | Full-row disclosure below a field header, including its supporting content. |
| <code>CatchFieldGeometryScope</code> | <code>packages/catch_ui/lib/src/components/catch_field_geometry_scope.dart:23</code> | <code>Scope</code> | <code>catch.field</code> | Ambient contract for field-row content and interaction geometry. |
| <code>CatchFieldInput</code> | <code>packages/catch_ui/lib/src/components/catch_field_input.dart:58</code> | <code>Input</code> | <code>catch.field</code> | Native input, validation, and text-entry chrome owned by a CatchField. |
| <code>CatchFieldInteractionPlaneScope</code> | <code>packages/catch_ui/lib/src/components/catch_field_interaction_plane_scope.dart:10</code> | <code>Scope</code> | <code>catch.field</code> | Internal page/lane paint extent published by semantic body primitives. |
| <code>CatchFieldLabelText</code> | <code>packages/catch_ui/lib/src/components/catch_field_label_text.dart:22</code> | <code>Text</code> | <code>catch.field</code> | Field-owned visible label and localized optional accessibility description. |
| <code>CatchFieldLanes</code> | <code>packages/catch_ui/lib/src/components/catch_field_lanes.dart:17</code> | <code>FieldLanes</code> | <code>catch.field</code> | Explicit composition boundary for reusable Field rows that do not own a titled or surfaced `CatchSection`. |
| <code>CatchFieldRow</code> | <code>packages/catch_ui/lib/src/components/catch_field_row.dart:6</code> | <code>Row</code> | <code>catch.field</code> | Field row anatomy with leading, body and trailing lanes; the parent owns geometry. |
| <code>CatchFieldStatusIndicator</code> | <code>packages/catch_ui/lib/src/components/catch_field_status_indicator.dart:14</code> | <code>Indicator</code> | <code>catch.field</code> | Animated saving/saved feedback for the `CatchField` trailing lane. |
| <code>CatchFieldSupportRow</code> | <code>packages/catch_ui/lib/src/components/catch_field_support_row.dart:8</code> | <code>Row</code> | <code>catch.field</code> | Field helper/error and optional counter row. |
| <code>CatchFieldSurface</code> | <code>packages/catch_ui/lib/src/components/catch_field_surface.dart:15</code> | <code>Surface</code> | <code>catch.field</code> | Field state paint: row backgrounds and the focus ring of a small target. |
| <code>CatchFieldTrailingRow</code> | <code>packages/catch_ui/lib/src/components/catch_field_trailing_row.dart:13</code> | <code>Row</code> | <code>catch.field</code> | Public trailing-slot member used by CatchField for value text, chevrons, toggles, clear actions, validation, and custom trailing content. CatchField composes non-centered trailing content into one lane after a single 18 px caption reserve and centers it within the 18.9 px value line. Saving progress appears here only when no explicit commit bar is visible. Its inputSuffix recipe preserves native text-entry clear and custom fallback behavior, including the close glyph and action/icon spacing; the field retains null allocation for an absent suffix. |
| <code>CatchFieldVisibilityScope</code> | <code>packages/catch_ui/lib/src/components/catch_field_visibility_scope.dart:11</code> | <code>Scope</code> | <code>catch.field</code> | Ambient visibility contract for disclosure fields inside obstructed scroll surfaces. |
| <code>CatchFrameworkErrorState</code> | <code>packages/catch_ui/lib/src/components/catch_framework_error_state.dart:27</code> | <code>ErrorState</code> | <code>catch.error_state</code> | Branded fallback for Flutter framework build errors. |
| <code>CatchHeroImage</code> | <code>packages/catch_ui/lib/src/components/catch_hero_image.dart:7</code> | <code>Image</code> | <code>catch.detail_media</code> | Hero image assembly with shared source loading, photo grading, a branded missing-image surface and optional readability overlay. Also called: <code>HeroBanner</code>, <code>CoverImage</code>, <code>HeaderImage</code>, <code>HeroPhoto</code>. |
| <code>CatchHorizontalScrollView</code> | <code>packages/catch_ui/lib/src/components/catch_horizontal_scroll_view.dart:29</code> | <code>ScrollView</code> | <code>catch.section</code> | Horizontal item viewport with lazy bounded-height and intrinsic-height forms. |
| <code>CatchIconAction</code> | <code>packages/catch_ui/lib/src/components/catch_icon_action.dart:35</code> | <code>IconAction</code> | <code>catch.icon_button</code> | Canonical icon-only action with one focus, feedback and count owner. Also called: <code>IconButton</code>, <code>CircleIconButton</code>, <code>RoundIconButton</code>, <code>IconActionButton</code>. |
| <code>CatchIndexRow</code> | <code>packages/catch_ui/lib/src/components/catch_index_row.dart:8</code> | <code>Row</code> | <code>catch.index_row</code> | Canonical hairline index row for compact directories and browse lists. Also called: <code>ListRow</code>, <code>DirectoryRow</code>, <code>NavigationRow</code>, <code>BrowseRow</code>. |
| <code>CatchMenu</code> | <code>packages/catch_ui/lib/src/components/catch_menu.dart:19</code> | <code>Menu</code> | <code>catch.menu</code> | Canonical menu panel, optionally anchored to a caller-owned trigger. Also called: <code>DropdownMenu</code>, <code>PopupMenu</code>, <code>OverflowMenu</code>, <code>ContextMenu</code>, <code>SelectMenu</code>. |
| <code>CatchMenuRow</code> | <code>packages/catch_ui/lib/src/components/catch_menu_row.dart:7</code> | <code>Row</code> | <code>catch.menu</code> | Menu row renderer; the sheet recipe aligns labels to the sheet heading and wraps large text with shared choice semantics. |
| <code>CatchMetaRow</code> | <code>packages/catch_ui/lib/src/components/catch_meta_row.dart:15</code> | <code>Row</code> | <code>catch.meta_row</code> | Compact factual metadata, from a single icon/label to a separated group. Also called: <code>MetadataRow</code>, <code>InfoRow</code>, <code>DetailRow</code>, <code>FactRow</code>. |
| <code>CatchMetricSection</code> | <code>packages/catch_ui/lib/src/components/catch_metric_section.dart:19</code> | <code>Section</code> | <code>catch.metric_strip</code> | Local arrangement of metric values or data-quality-aware metric tiles. Also called: <code>StatsRow</code>, <code>MetricsRow</code>, <code>StatGrid</code>, <code>KpiStrip</code>, <code>MetricGrid</code>. |
| <code>CatchMetricTile</code> | <code>packages/catch_ui/lib/src/components/catch_metric_tile.dart:18</code> | <code>Tile</code> | <code>catch.metric_strip</code> | One caller-formatted value and its label, with an optional icon or unit. |
| <code>CatchNavigationButton</code> | <code>packages/catch_ui/lib/src/components/catch_navigation_button.dart:13</code> | <code>Button</code> | <code>catch.tab_bar</code> | A navigation destination with bottom-bar and side-rail layout recipes. |
| <code>CatchNotice</code> | <code>packages/catch_ui/lib/src/components/catch_notice.dart:12</code> | <code>Notice</code> | <code>catch.notice</code> | Configurable ambient notice family with one app-level safe-area overlay. Arrival notices open from the whole card and support swipe dismissal; ordinary notifications use explicit action and dismiss controls. Features own copy, identity, tone and routing; the shared renderer owns readable geometry and interaction. Also called: <code>Toast</code>, <code>Snackbar</code>, <code>InAppNotification</code>, <code>NotificationToast</code>. |
| <code>CatchPageTabBar</code> | <code>packages/catch_ui/lib/src/components/catch_page_tab_bar.dart:16</code> | <code>TabBar</code> | <code>catch.chip.field</code> | Page-level peer navigation in the canonical scaled app-bar shell. Also called: <code>SegmentedTabs</code>, <code>TopTabs</code>, <code>PageTabs</code>, <code>TabStrip</code>. |
| <code>CatchPolaroid</code> | <code>packages/catch_ui/lib/src/components/catch_polaroid.dart:14</code> | <code>Polaroid</code> | <code>catch.person_polaroid</code> | Canonical person material: a portrait-first instant photograph with a quiet handwritten-note lane rendered in Catch's editorial typography. Also called: <code>ProfileCard</code>, <code>PersonCard</code>, <code>PhotoCard</code>, <code>UserCard</code>. |
| <code>CatchPoster</code> | <code>packages/catch_ui/lib/src/components/catch_poster.dart:17</code> | <code>Poster</code> | <code>catch.organizer_poster</code> | Canonical organizer material. Also called: <code>EditorialCard</code>, <code>MediaCard</code>, <code>FeatureCard</code>, <code>PosterCard</code>, <code>OrganizerPoster</code>. |
| <code>CatchPosterHeader</code> | <code>packages/catch_ui/lib/src/components/catch_poster.dart:192</code> | <code>Header</code> | <code>catch.organizer_poster</code> | Poster copy: kicker, title with optional arrow, tagline, meta and footer. |
| <code>CatchPosterImage</code> | <code>packages/catch_ui/lib/src/components/catch_poster.dart:168</code> | <code>Image</code> | <code>catch.organizer_poster</code> | Poster media framed with the poster radius and an optional overlay. |
| <code>CatchPrivacyBadge</code> | <code>packages/catch_ui/lib/src/components/catch_privacy_badge.dart:21</code> | <code>Badge</code> | <code>catch.badge</code> | Privacy/visibility adapter with caller-resolved labels and fixed mode-to-icon pairing in CatchBadge.privacy. Also called: <code>VisibilityBadge</code>, <code>PrivacyLabel</code>. |
| <code>CatchRangeInput</code> | <code>packages/catch_ui/lib/src/components/catch_range_input.dart:12</code> | <code>Input</code> | <code>catch.range_slider</code> | Edits an ordered numeric interval through two independently movable ends. Also called: <code>RangeSlider</code>, <code>DualSlider</code>, <code>RangePicker</code>. |
| <code>CatchRowSection</code> | <code>packages/catch_ui/lib/src/components/catch_row_section.dart:24</code> | <code>Section</code> | <code>catch.section</code> | Internal renderer for the typed Field collection recipes on CatchSection. |
| <code>CatchSearchField</code> | <code>packages/catch_ui/lib/src/components/catch_search_field.dart:18</code> | <code>Field</code> | <code>catch.search_field</code> | Handoff `SearchField`: raised pill input with search glyph and quiet clear target. Also called: <code>SearchBar</code>, <code>SearchInput</code>, <code>SearchBox</code>. |
| <code>CatchSection</code> | <code>packages/catch_ui/lib/src/components/catch_section.dart:47</code> | <code>Section</code> | <code>catch.section</code> | Design-system `Section`: the canonical primitive for grouping information. Also called: <code>PageSection</code>, <code>SectionCard</code>, <code>SettingsSection</code>, <code>SectionPanel</code>, <code>TitledSection</code>. |
| <code>CatchSectionBody</code> | <code>packages/catch_ui/lib/src/components/catch_section_body.dart:13</code> | <code>Body</code> | <code>catch.section</code> | Section-owned child stack and separators, without header or surface chrome. |
| <code>CatchSectionHeader</code> | <code>packages/catch_ui/lib/src/components/catch_section_header.dart:9</code> | <code>Header</code> | <code>catch.section</code> | Section heading, count and trailing-action layouts, selected by recipe. |
| <code>CatchSectionSurface</code> | <code>packages/catch_ui/lib/src/components/catch_section_surface.dart:12</code> | <code>Surface</code> | <code>catch.section</code> | Contained section perimeter, including explicit error/focus chrome. |
| <code>CatchSelectionField</code> | <code>packages/catch_ui/lib/src/components/catch_selection_field.dart:24</code> | <code>Field</code> | <code>catch.field</code> | Field-owned selection menu, validation state, and labelled value row. |
| <code>CatchSelectionMenu</code> | <code>packages/catch_ui/lib/src/components/catch_selection_menu.dart:12</code> | <code>Menu</code> | <code>catch.menu</code> | Mutually-exclusive selection with anchored, adaptive and button-trigger recipes. |
| <code>CatchSelectionSheet</code> | <code>packages/catch_ui/lib/src/components/catch_selection_sheet.dart:9</code> | <code>Sheet</code> | <code>catch.menu</code> | Phone-friendly selection surface with mutually-exclusive row semantics. |
| <code>CatchShareCardSheet</code> | <code>packages/catch_ui/lib/src/components/catch_share_card_sheet.dart:13</code> | <code>Sheet</code> | <code>catch.sheet</code> | Presentation-only card preview and share action. |
| <code>CatchSheet</code> | <code>packages/catch_ui/lib/src/components/catch_sheet.dart:50</code> | <code>Sheet</code> | <code>catch.sheet</code> | Canonical sheet surface, header and terminal safe region. Also called: <code>BottomSheet</code>, <code>ModalSheet</code>, <code>ActionSheet</code>, <code>DrawerSheet</code>. |
| <code>CatchSheetHeader</code> | <code>packages/catch_ui/lib/src/components/catch_sheet_header.dart:8</code> | <code>Header</code> | <code>catch.sheet</code> | Sheet heading with plain or branded glyph presentation and a trailing slot. |
| <code>CatchStatusRow</code> | <code>packages/catch_ui/lib/src/components/catch_status_row.dart:10</code> | <code>Row</code> | <code>catch.badge</code> | Quiet, unboxed status made from a semantic dot and supporting copy. |
| <code>CatchStepHeader</code> | <code>packages/catch_ui/lib/src/components/catch_step_header.dart:11</code> | <code>Header</code> | <code>catch.step_header</code> | Handoff `StepHeader`: wizard header built from the shared large AppBar plus a 2px progress hairline. Also called: <code>WizardHeader</code>, <code>ProgressHeader</code>, <code>StepProgressBar</code>, <code>OnboardingHeader</code>. |
| <code>CatchStepList</code> | <code>packages/catch_ui/lib/src/components/catch_step_list.dart:13</code> | <code>List</code> | <code>catch.journey_steps</code> | Ordered instructional rows with automatic numbering and a connecting trace. Also called: <code>StepsList</code>, <code>NumberedSteps</code>, <code>TimelineSteps</code>, <code>HowItWorksList</code>. |
| <code>CatchStepper</code> | <code>packages/catch_ui/lib/src/components/catch_stepper.dart:11</code> | <code>Stepper</code> | <code>catch.number_stepper</code> | Bounded numeric adjustment with accelerated hold-to-repeat controls. Also called: <code>NumberStepper</code>, <code>QuantityStepper</code>, <code>CounterControl</code>, <code>QuantityPicker</code>. |
| <code>CatchStepperRepeatButton</code> | <code>packages/catch_ui/lib/src/components/catch_stepper_repeat_button.dart:12</code> | <code>Button</code> | <code>catch.number_stepper</code> | Hold-to-repeat platform-sized target used by `CatchStepper`. |
| <code>CatchTabBar</code> | <code>packages/catch_ui/lib/src/components/catch_tab_bar.dart:16</code> | <code>TabBar</code> | <code>catch.tab_bar</code> | Bottom navigation with one shared selection/contact indicator, drag-to- select behavior, and platform-adaptive chrome. Also called: <code>BottomNavBar</code>, <code>BottomNavigation</code>, <code>NavBar</code>, <code>BottomTabBar</code>. |
| <code>CatchTabBarIndicator</code> | <code>packages/catch_ui/lib/src/components/catch_tab_bar_indicator.dart:4</code> | <code>Indicator</code> | <code>catch.tab_bar</code> | Shared selection and contact-preview fill with an optional focus border and reduced-motion handling. |
| <code>CatchTable</code> | <code>packages/catch_ui/lib/src/components/catch_table.dart:34</code> | <code>Table</code> | <code>catch.table</code> | Bordered data table with an uppercase header row and divided rows. Also called: <code>DataTable</code>, <code>DataGrid</code>, <code>ListTable</code>, <code>RecordTable</code>. |
| <code>CatchTableRow</code> | <code>packages/catch_ui/lib/src/components/catch_table.dart:111</code> | <code>Row</code> | <code>catch.table</code> | One divided row of a [CatchTable]; each cell takes its column's width and placement. |
| <code>CatchTableScope</code> | <code>packages/catch_ui/lib/src/components/catch_table.dart:150</code> | <code>Scope</code> | <code>catch.table</code> | Publishes a [CatchTable]'s columns to its rows. |
| <code>CatchTicket</code> | <code>packages/catch_ui/lib/src/components/catch_ticket.dart:19</code> | <code>Ticket</code> | <code>catch.ticket</code> | Ticket material: media over a perforation over a body. Also called: <code>TicketCard</code>, <code>TicketShape</code>, <code>PerforatedCard</code>, <code>TicketFrame</code>. |
| <code>CatchTicketDivider</code> | <code>packages/catch_ui/lib/src/components/catch_ticket_divider.dart:8</code> | <code>Divider</code> | <code>catch.ticket</code> | Ticket perforation aligned to the notch geometry of its containing ticket. |
| <code>CatchTimestampedMessageText</code> | <code>packages/catch_ui/lib/src/components/catch_timestamped_message_text.dart:8</code> | <code>Text</code> | <code>catch.timestamped_message</code> | Lays out a chat timestamp on the final message line when it fits, otherwise directly below it. Also called: <code>MessageText</code>, <code>ChatMessageText</code>, <code>MessageWithTimestamp</code>. |
| <code>CatchToggleInput</code> | <code>packages/catch_ui/lib/src/components/catch_toggle_input.dart:12</code> | <code>Input</code> | <code>catch.toggle</code> | Catch settings toggle. Also called: <code>Switch</code>, <code>ToggleSwitch</code>, <code>SwitchInput</code>, <code>OnOffSwitch</code>. |
| <code>CatchToolbarButton</code> | <code>packages/catch_ui/lib/src/components/catch_toolbar_button.dart:10</code> | <code>Button</code> | <code>catch.top_bar</code> | Labelled action or current-value selector button in canonical app chrome. |
| <code>CatchToolbarScope</code> | <code>packages/catch_ui/lib/src/components/catch_toolbar_scope.dart:4</code> | <code>Scope</code> | <code>catch.top_bar</code> | Internal chrome boundary: generic body controls must not restyle app bars. |
| <code>CatchTopBar</code> | <code>packages/catch_ui/lib/src/components/catch_top_bar.dart:36</code> | <code>TopBar</code> | <code>catch.top_bar</code> | Canonical app chrome. Recipes own typography, hierarchy and geometry. Also called: <code>AppBar</code>, <code>Toolbar</code>, <code>HeaderBar</code>, <code>TitleBar</code>. |
| <code>CatchTopBarActionRow</code> | <code>packages/catch_ui/lib/src/components/catch_top_bar_action_row.dart:10</code> | <code>Row</code> | <code>catch.top_bar</code> | Canonical trailing-action layout for Catch top bars and screen headers. |
| <code>CatchTopBarPrimaryButton</code> | <code>packages/catch_ui/lib/src/components/catch_top_bar_primary_button.dart:12</code> | <code>Button</code> | <code>catch.top_bar</code> | Primary root-screen action that preserves canonical top-bar geometry. |
| <code>CatchWheelPickerSheet</code> | <code>packages/catch_ui/lib/src/components/catch_wheel_picker_sheet.dart:10</code> | <code>Sheet</code> | <code>catch.sheet</code> | Shared wheel-picker sheet with caller-resolved copy and actions. |

### L4 (31)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>CatchBottomActionOverlay</code> | <code>packages/catch_ui/lib/src/patterns/catch_bottom_action_overlay.dart:14</code> | <code>Overlay</code> | <code>catch.bottom_action</code> | Scroll-aware layout for actions that should stay pinned without a dock. |
| <code>CatchErrorScaffold</code> | <code>packages/catch_ui/lib/src/patterns/catch_error_scaffold.dart:7</code> | <code>Scaffold</code> | <code>catch.error_state</code> | Route/root-tab placement adapter for full-screen app data-load failures. |
| <code>CatchFormChoiceField</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_choice_field.dart:8</code> | <code>Field</code> | <code>catch.field</code> | Form-owned choice drafts, explicit commits and save feedback. Single and multiple selection share one lifecycle; descriptors retain types. |
| <code>CatchFormList</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_list.dart:10</code> | <code>List</code> | <code>catch.field</code> | Maps typed form descriptors to canonical CatchField rows inside one CatchSection, with one accordion and one per-field patch save delegate. |
| <code>CatchFormRangeField</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_range_field.dart:6</code> | <code>Field</code> | <code>catch.field</code> | Form-owned bounded range draft with explicit confirmation and patch saves. |
| <code>CatchFormReviewPageBody</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_review_page_body.dart:10</code> | <code>PageBody</code> | <code>catch.screen_body</code> | Final review page with summary fields and one resumable form-step list. |
| <code>CatchFormStepList</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_step_list.dart:32</code> | <code>List</code> | <code>catch.form_step_list</code> | Navigable form sections with completion status and caller-owned selection. Also called: <code>StepRail</code>, <code>StageRail</code>, <code>FormStepNavigator</code>, <code>FormStepOverview</code>. |
| <code>CatchFormTextField</code> | <code>packages/catch_ui/lib/src/patterns/catch_form_text_field.dart:8</code> | <code>Field</code> | <code>catch.field</code> | Form-owned text draft, normalization and validation with list-owned commit policy. |
| <code>CatchNavigationViewport</code> | <code>packages/catch_ui/lib/src/patterns/catch_navigation_viewport.dart:36</code> | <code>Viewport</code> | <code>catch.screen_body</code> | Presents the same route path as concurrent columns or one active pane. |
| <code>CatchWorkspacePaneScope</code> | <code>packages/catch_ui/lib/src/patterns/catch_navigation_viewport.dart:353</code> | <code>Scope</code> | <code>catch.screen_body</code> | The pane's local presentation, independent of the device's global width. |
| <code>CatchPageBody</code> | <code>packages/catch_ui/lib/src/patterns/catch_page_body.dart:14</code> | <code>PageBody</code> | <code>catch.screen_body</code> | Page insets and field paint geometry, with form, screen and sliver recipes. Also called: <code>PageContent</code>, <code>ScreenBody</code>, <code>PagePadding</code>, <code>ScreenContent</code>. |
| <code>CatchRootScreenPageScrollView</code> | <code>packages/catch_ui/lib/src/patterns/catch_root_screen_page_scroll_view.dart:16</code> | <code>ScrollView</code> | <code>catch.screen_body</code> | Inner scroll owner for one page of `CatchRootScreenScaffold`. |
| <code>CatchRootScreenScaffold</code> | <code>packages/catch_ui/lib/src/patterns/catch_root_screen_scaffold.dart:18</code> | <code>Scaffold</code> | <code>catch.screen_body</code> | Full-screen owner for a root destination with scroll-content title chrome. |
| <code>CatchRootScreenScrollView</code> | <code>packages/catch_ui/lib/src/patterns/catch_root_screen_scroll_view.dart:27</code> | <code>ScrollView</code> | <code>catch.screen_body</code> | Root-screen scroll composition for a pane whose parent already owns the [Scaffold], such as an adaptive master-detail workspace. |
| <code>CatchRouteScaffold</code> | <code>packages/catch_ui/lib/src/patterns/catch_route_scaffold.dart:362</code> | <code>Scaffold</code> | <code>catch.screen_body</code> | Canonical shell for pushed utility, list, and identity routes. |
| <code>CatchRowViewport</code> | <code>packages/catch_ui/lib/src/patterns/catch_row_viewport.dart:5</code> | <code>Viewport</code> | <code>catch.screen_body</code> | Internal boundary published only by page and pane owners. A section may inset its content, but cannot quietly shrink the row interaction perimeter. |
| <code>CatchRowViewportScope</code> | <code>packages/catch_ui/lib/src/patterns/catch_row_viewport.dart:23</code> | <code>Scope</code> | <code>catch.screen_body</code> | Internal inherited width value owned by CatchRowViewport; consumers cannot publish a fabricated row perimeter. |
| <code>CatchScaffold</code> | <code>packages/catch_ui/lib/src/patterns/catch_scaffold.dart:17</code> | <code>Scaffold</code> | <code>catch.screen_body</code> | Canonical surface owner for full-screen compositions. |
| <code>CatchScrollTerminalGap</code> | <code>packages/catch_ui/lib/src/patterns/catch_scroll_terminal_gap.dart:9</code> | <code>Gap</code> | <code>catch.screen_body</code> | Terminal breathing room plus the space obstructed by shell or safe area. |
| <code>CatchScrollView</code> | <code>packages/catch_ui/lib/src/patterns/catch_scroll_view.dart:9</code> | <code>ScrollView</code> | <code>catch.screen_body</code> | Scrolls overflow while short content fills the local viewport height. |
| <code>CatchSectionList</code> | <code>packages/catch_ui/lib/src/patterns/catch_section_list.dart:24</code> | <code>SectionList</code> | <code>catch.section_stack</code> | Ordered section rhythm with inset, sliver, responsive and page recipes. Also called: <code>SectionsColumn</code>, <code>SectionStack</code>, <code>SectionedList</code>, <code>SettingsList</code>. |
| <code>CatchSkeleton</code> | <code>packages/catch_ui/lib/src/patterns/catch_skeleton.dart:12</code> | <code>Skeleton</code> | <code>catch.skeleton</code> | Derives loading paint from real content or a single unresolved leaf shape. Also called: <code>LoadingSkeleton</code>, <code>ShimmerPlaceholder</code>, <code>SkeletonLoader</code>, <code>Shimmer</code>. |
| <code>CatchSliverEmptyState</code> | <code>packages/catch_ui/lib/src/patterns/catch_sliver_empty_state.dart:9</code> | <code>EmptyState</code> | <code>catch.empty_state</code> | Canonical sliver placement for a full-region empty success state. |
| <code>CatchSliverErrorState</code> | <code>packages/catch_ui/lib/src/patterns/catch_sliver_error_state.dart:6</code> | <code>ErrorState</code> | <code>catch.error_state</code> | Sliver placement adapter for branded load failures inside CustomScrollView routes. |
| <code>CatchStateViewport</code> | <code>packages/catch_ui/lib/src/patterns/catch_state_viewport.dart:10</code> | <code>Viewport</code> | <code>catch.empty_state</code> | Removes the floating shell obstruction from state placement. |
| <code>CatchTabViewportScope</code> | <code>packages/catch_ui/lib/src/patterns/catch_tab_viewport_scope.dart:8</code> | <code>Scope</code> | <code>catch.screen_body</code> | Route-neutral active-page and bottom-obstruction metrics for shared layouts. |
| <code>CatchViewport</code> | <code>packages/catch_ui/lib/src/patterns/catch_viewport.dart:13</code> | <code>Viewport</code> | <code>catch.viewport</code> | Local viewport measurement and caller-owned layout selection. Also called: <code>ResponsiveLayout</code>, <code>AdaptiveLayout</code>, <code>SizeClassBuilder</code>, <code>BreakpointBuilder</code>. |
| <code>CatchWorkspaceBackScope</code> | <code>packages/catch_ui/lib/src/patterns/catch_workspace_back_scope.dart:4</code> | <code>Scope</code> | <code>catch.screen_body</code> | The route owns Back; pane chrome consumes it without a second Navigator. |
| <code>CatchWorkspaceHeader</code> | <code>packages/catch_ui/lib/src/patterns/catch_workspace_header_layout.dart:18</code> | <code>Header</code> | <code>catch.screen_body</code> | A pane's natural header participating in its workspace's measured row. |
| <code>CatchWorkspaceHeaderLayout</code> | <code>packages/catch_ui/lib/src/patterns/catch_workspace_header_layout.dart:5</code> | <code>Layout</code> | <code>catch.screen_body</code> | Measures only visible pane headers, then aligns their lower boundaries in the same layout pass. No fixed header height or post-frame state is needed. |
| <code>CatchWorkspacePaneScaffold</code> | <code>packages/catch_ui/lib/src/patterns/catch_workspace_pane_scaffold.dart:13</code> | <code>Scaffold</code> | <code>catch.screen_body</code> | One full-height pane: its header and peer controls stay beside its siblings, while only its own body scrolls. Header rhythm is shared with untabbed panes. |

### L4a (7)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>CatchAsyncBoundary</code> | <code>lib/core/riverpod_ui/catch_async_boundary.dart:21</code> | <code>AsyncBoundary</code> | <code>catch.async_value</code> | Exhaustive async-state selection with one timeout and recovery lifecycle. Also called: <code>AsyncValueView</code>, <code>AsyncBuilder</code>, <code>LoadingErrorBuilder</code>, <code>AsyncStateView</code>. |
| <code>CatchExternalShareSheet</code> | <code>lib/core/riverpod_ui/catch_external_share_sheet.dart:17</code> | <code>Sheet</code> | <code>catch.sheet</code> | UI adapter for the app's Riverpod-backed external share controller. |
| <code>CatchLocalizedErrorBanner</code> | <code>lib/core/riverpod_ui/catch_localized_error_banner.dart:8</code> | <code>Banner</code> | <code>catch.banner</code> | Resolves app errors and retry copy at the caller's localization boundary. |
| <code>CatchLocalizedErrorScaffold</code> | <code>lib/core/riverpod_ui/catch_localized_error_scaffold.dart:7</code> | <code>Scaffold</code> | <code>catch.error_state</code> | Resolves app errors and inherited-locale copy for [CatchErrorScaffold]. |
| <code>CatchLocalizedErrorState</code> | <code>lib/core/riverpod_ui/catch_localized_error_state.dart:7</code> | <code>ErrorState</code> | <code>catch.error_state</code> | Resolves app errors and inherited-locale copy for [CatchErrorState]. |
| <code>CatchLocalizedSliverErrorState</code> | <code>lib/core/riverpod_ui/catch_localized_sliver_error_state.dart:7</code> | <code>ErrorState</code> | <code>catch.error_state</code> | Resolves app errors and inherited-locale copy for [CatchSliverErrorState]. |
| <code>CatchNoticeOverlay</code> | <code>lib/core/riverpod_ui/catch_notice_overlay.dart:11</code> | <code>Overlay</code> | <code>catch.notice</code> | One MyApp-owned safe-area overlay above the router, with a real overlay ancestor for tooltips. Owns entry motion, gesture/keyboard dismissal, F6 focus transfer and interaction-aware timers for every notice; persistent context remains with CatchBanner.statuses below tabs. |

### L5 (949)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>ForceUpdateGate</code> | <code>lib/app.dart:113</code> | — | — | No class documentation or registry summary. |
| <code>HostAuthScaffold</code> | <code>lib/auth/presentation/auth_screen.dart:83</code> | — | — | Host auth frame shares its initial brand anchor with Flutter startup. The inset card enters below it, and one scroll owner can reveal any focused control on short screens or when the keyboard reduces the available height. |
| <code>HostAuthCard</code> | <code>lib/auth/presentation/host_auth_card.dart:6</code> | — | — | The inset card shared by every Catch Host authentication state. |
| <code>HostAuthHeader</code> | <code>lib/auth/presentation/host_auth_card.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostAuthProgressButton</code> | <code>lib/auth/presentation/host_auth_card.dart:53</code> | — | — | A non-interactive primary action surface that preserves the button's geometry while an authentication request is in flight. |
| <code>OtpStep</code> | <code>lib/auth/presentation/otp_step.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>PhoneCountryCodePicker</code> | <code>lib/auth/presentation/phone_step.dart:305</code> | — | — | No class documentation or registry summary. |
| <code>PhoneStep</code> | <code>lib/auth/presentation/phone_step.dart:23</code> | — | — | No class documentation or registry summary. |
| <code>EventChatParticipantsRowList</code> | <code>lib/chats/presentation/event_chat_participants_screen.dart:191</code> | — | — | No class documentation or registry summary. |
| <code>EventChatPageBody</code> | <code>lib/chats/presentation/event_chat_screen.dart:499</code> | — | — | No class documentation or registry summary. |
| <code>EventChatDirectoryRowList</code> | <code>lib/chats/presentation/inbox/event_chat_directory_section.dart:47</code> | — | — | Sliver directory of currently admitted events, including rooms not open yet. |
| <code>EventChatDirectorySection</code> | <code>lib/chats/presentation/inbox/event_chat_directory_section.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>ChatConversationsList</code> | <code>lib/chats/presentation/inbox/widgets/chat_conversations_list.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>ChatsEmptyState</code> | <code>lib/chats/presentation/inbox/widgets/chats_empty_state.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>ChatPersonRowSkeleton</code> | <code>lib/chats/presentation/inbox/widgets/chats_list.dart:122</code> | — | — | No class documentation or registry summary. |
| <code>ChatsList</code> | <code>lib/chats/presentation/inbox/widgets/chats_list.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>ChatsListSkeleton</code> | <code>lib/chats/presentation/inbox/widgets/chats_list.dart:98</code> | — | — | No class documentation or registry summary. |
| <code>ChatsListBody</code> | <code>lib/chats/presentation/inbox/widgets/chats_list_body.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>ChatsBrowseHeader</code> | <code>lib/chats/presentation/inbox/widgets/chats_sliver_header.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>ChatEventContextHeader</code> | <code>lib/chats/presentation/widgets/chat_event_context_header.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>ChatInput</code> | <code>lib/chats/presentation/widgets/chat_input.dart:14</code> | <code>Input</code> | — | Canonical chat composer. Also called: <code>ChatInputBar</code>, <code>MessageInput</code>, <code>MessageComposer</code>, <code>ChatComposer</code>. |
| <code>ChatMessageList</code> | <code>lib/chats/presentation/widgets/chat_message_list.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>ChatShareCard</code> | <code>lib/chats/presentation/widgets/chat_share_card.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>ShareCardBubble</code> | <code>lib/chats/presentation/widgets/chat_share_card.dart:171</code> | — | — | No class documentation or registry summary. |
| <code>ShareCardHeader</code> | <code>lib/chats/presentation/widgets/chat_share_card.dart:114</code> | — | — | No class documentation or registry summary. |
| <code>EventChatEntrySection</code> | <code>lib/chats/presentation/widgets/event_chat_entry_section.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventChatMessageTile</code> | <code>lib/chats/presentation/widgets/event_chat_message_tile.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventChatReactionSection</code> | <code>lib/chats/presentation/widgets/event_chat_message_tile.dart:212</code> | — | — | No class documentation or registry summary. |
| <code>EventProfileAnswerField</code> | <code>lib/chats/presentation/widgets/event_profile_answer_field.dart:7</code> | — | — | An entire reviewed answer, never an ellipsized summary of what will be shared. The optional toggle uses the same interaction and tokens as CatchField. |
| <code>EventProfileEditorSection</code> | <code>lib/chats/presentation/widgets/event_profile_editor_section.dart:14</code> | — | — | Explicit sharing choices for eligible core values and one claimed organizer card. |
| <code>EventProfileIdentitySection</code> | <code>lib/chats/presentation/widgets/event_profile_identity_section.dart:11</code> | — | — | Renders the protected event projection with an ephemeral in-memory photo. |
| <code>EventProfilePhotoField</code> | <code>lib/chats/presentation/widgets/event_profile_photo_field.dart:9</code> | — | — | An owned photo choice that stays disabled until its current preview decodes. |
| <code>MediaMessageBody</code> | <code>lib/chats/presentation/widgets/message_bubble.dart:104</code> | — | — | No class documentation or registry summary. |
| <code>MessageBubble</code> | <code>lib/chats/presentation/widgets/message_bubble.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>MatchTesterSheet</code> | <code>lib/chats/presentation/widgets/suvbot_dock.dart:415</code> | — | — | No class documentation or registry summary. |
| <code>SuvbotDock</code> | <code>lib/chats/presentation/widgets/suvbot_dock.dart:23</code> | — | — | No class documentation or registry summary. |
| <code>SuvbotResetActionRow</code> | <code>lib/chats/presentation/widgets/suvbot_dock.dart:329</code> | — | — | No class documentation or registry summary. |
| <code>ClubDetailReadOnlyPreview</code> | <code>lib/clubs/presentation/detail/club_detail_read_only_preview.dart:15</code> | — | — | Live, consumer-facing Club Detail composition for an owner-facing read-only preview. The selected [initialClub] renders immediately while live detail data hydrates, matching the consumer route's initial-club fallback policy. |
| <code>ClubContactSection</code> | <code>lib/clubs/presentation/detail/widgets/club_contact_section.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>ClubActivitySection</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_body.dart:323</code> | — | — | No class documentation or registry summary. |
| <code>ClubDetailBody</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_body.dart:31</code> | — | — | No class documentation or registry summary. |
| <code>ClubDetailSliverBody</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_body.dart:78</code> | — | — | Sliver-native form of the canonical Club Detail composition. |
| <code>ClubNextRunBanner</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_body.dart:270</code> | — | — | No class documentation or registry summary. |
| <code>ClubBellButton</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_dock.dart:251</code> | — | — | Member notifications bell — the active state fills with the club's activity accent (not the raw Material color scheme). |
| <code>ClubDetailDock</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_dock.dart:24</code> | <code>Dock</code> | — | Design-system `ClubDock` (`components/clubs/ClubDock`): the persistent bottom bar of a club detail screen, stateful over membership role — BookingDock's club sibling. `visitor` shows the member count + an **activity-pigmented** Join CTA (the one sanctioned use of the club pigment on an action); `member` shows the count + a notifications bell + a quiet "Joined" control; `owner` shows Manage + a New-event pair; `guest` shows an ink "Sign in to join". The mono [footnote] carries the state's quiet facts. Also called: <code>ClubActionBar</code>, <code>ClubBottomBar</code>, <code>MembershipBar</code>. |
| <code>ClubMemberCountText</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_dock.dart:213</code> | — | — | No class documentation or registry summary. |
| <code>ClubMembershipDock</code> | <code>lib/clubs/presentation/detail/widgets/club_detail_dock.dart:303</code> | — | — | Provider-backed [ClubDetailDock] for the consumer club-detail screen. Computes the membership state and wires Join / Leave / notification mutations and the guest sign-in route. (Owner state is host-app territory and not rendered here.) |
| <code>ClubHeroHeader</code> | <code>lib/clubs/presentation/detail/widgets/club_hero_top_bar.dart:272</code> | — | — | No class documentation or registry summary. |
| <code>ClubHeroTopBar</code> | <code>lib/clubs/presentation/detail/widgets/club_hero_top_bar.dart:47</code> | — | — | No class documentation or registry summary. |
| <code>ClubHostRow</code> | <code>lib/clubs/presentation/detail/widgets/club_host_section.dart:82</code> | — | — | No class documentation or registry summary. |
| <code>ClubHostSection</code> | <code>lib/clubs/presentation/detail/widgets/club_host_section.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>ClubPhotoRail</code> | <code>lib/clubs/presentation/detail/widgets/club_photo_rail.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>ClubScheduleSection</code> | <code>lib/clubs/presentation/detail/widgets/club_schedule_section.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ClubShareCard</code> | <code>lib/clubs/presentation/detail/widgets/club_share_card.dart:41</code> | — | — | No class documentation or registry summary. |
| <code>ClubShareCover</code> | <code>lib/clubs/presentation/detail/widgets/club_share_card.dart:122</code> | — | — | No class documentation or registry summary. |
| <code>ClubAvatarRail</code> | <code>lib/clubs/presentation/discovery/widgets/club_avatar_rail.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>AvatarChip</code> | <code>lib/clubs/presentation/discovery/widgets/club_list_tile_parts/avatar_chip.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>ClubImage</code> | <code>lib/clubs/presentation/discovery/widgets/club_list_tile_parts/club_image.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>ClubIndexRow</code> | <code>lib/clubs/presentation/discovery/widgets/club_list_tile_parts/directory_card.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>ClubJoinAction</code> | <code>lib/clubs/presentation/discovery/widgets/club_list_tile_parts/directory_card.dart:103</code> | — | — | No class documentation or registry summary. |
| <code>ClubJoinButton</code> | <code>lib/clubs/presentation/discovery/widgets/club_list_tile_parts/directory_card.dart:183</code> | — | — | No class documentation or registry summary. |
| <code>ClubCover</code> | <code>lib/clubs/shared/club_cover.dart:7</code> | <code>Cover</code> | — | Shared club-cover resolver for editorial cards and detail heroes. Also called: <code>ClubCoverImage</code>, <code>ClubImage</code>, <code>ClubPhoto</code>. |
| <code>ClubHostIdentityRow</code> | <code>lib/clubs/shared/club_host_identity_row.dart:60</code> | — | — | No class documentation or registry summary. |
| <code>ClubTagList</code> | <code>lib/clubs/shared/club_host_identity_row.dart:36</code> | — | — | No class documentation or registry summary. |
| <code>ClubPlaceholderCover</code> | <code>lib/clubs/shared/club_placeholder_cover.dart:8</code> | <code>Cover</code> | <code>catch.organizer_poster</code> | Deterministic no-photo organizer artwork used by poster and compact cover states. |
| <code>CatchConsumerBootstrap</code> | <code>lib/consumer_bootstrap.dart:25</code> | — | — | Consumer-only process bootstrap. |
| <code>CelebrationDetailRow</code> | <code>lib/core/celebration/celebration_screen.dart:533</code> | — | — | No class documentation or registry summary. |
| <code>CelebrationDetailsCard</code> | <code>lib/core/celebration/celebration_screen.dart:496</code> | — | — | No class documentation or registry summary. |
| <code>CelebrationIcon</code> | <code>lib/core/celebration/celebration_screen.dart:476</code> | — | — | No class documentation or registry summary. |
| <code>CelebrationNote</code> | <code>lib/core/celebration/celebration_screen.dart:572</code> | — | — | No class documentation or registry summary. |
| <code>PaperCelebrationDetailRow</code> | <code>lib/core/celebration/celebration_screen.dart:437</code> | — | — | No class documentation or registry summary. |
| <code>PaperCelebrationDetailsCard</code> | <code>lib/core/celebration/celebration_screen.dart:406</code> | — | — | No class documentation or registry summary. |
| <code>PaperCelebrationIcon</code> | <code>lib/core/celebration/celebration_screen.dart:388</code> | — | — | No class documentation or registry summary. |
| <code>PaperCelebrationScaffold</code> | <code>lib/core/celebration/celebration_screen.dart:230</code> | — | — | No class documentation or registry summary. |
| <code>AdaptiveTabScaffold</code> | <code>lib/core/presentation/adaptive_tab_scaffold.dart:12</code> | — | — | Shared adaptive placement contract for consumer and host tab shells. |
| <code>AppShell</code> | <code>lib/core/presentation/app_shell.dart:55</code> | — | — | No class documentation or registry summary. |
| <code>AppShellNavigationBar</code> | <code>lib/core/presentation/app_shell.dart:209</code> | — | — | No class documentation or registry summary. |
| <code>AppShellSideNavigation</code> | <code>lib/core/presentation/app_shell.dart:281</code> | — | — | Labelled vertical destination plane for medium and expanded app shells. |
| <code>GuestAuthCtaBar</code> | <code>lib/core/presentation/app_shell.dart:161</code> | — | — | No class documentation or registry summary. |
| <code>HostAppShell</code> | <code>lib/core/presentation/host_app_shell.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>StartupAnimationScope</code> | <code>lib/core/startup/startup_animation_scope.dart:7</code> | — | — | Session-scoped startup state shared with route-owned welcome surfaces. |
| <code>ActivityMapPin</code> | <code>lib/core/widgets/activity_map_pin.dart:8</code> | <code>Pin</code> | — | Activity-pigment map pin with an optional selected data flag. Also called: <code>MapPin</code>, <code>EventMapPin</code>, <code>LocationPin</code>. |
| <code>EventActivityBadge</code> | <code>lib/core/widgets/event_activity_badge.dart:6</code> | <code>Badge</code> | <code>catch.event_card</code> | Circular activity glyph stamp used by event cards, agenda rows, and ticket compositions. |
| <code>EventBackdropImage</code> | <code>lib/core/widgets/event_backdrop_image.dart:8</code> | <code>Image</code> | <code>catch.event_card</code> | Activity-pigment backdrop art for event media: duotone ground, pattern and glyph. |
| <code>EventCard</code> | <code>lib/core/widgets/event_card.dart:13</code> | <code>Card</code> | <code>catch.event_card</code> | Production event card backed by the shared activity visual schema. Also called: <code>EventTicket</code>, <code>EventTile</code>, <code>EventListItem</code>, <code>EventPreviewCard</code>. |
| <code>EventFallbackThumbnail</code> | <code>lib/core/widgets/event_thumbnail.dart:90</code> | <code>Thumbnail</code> | <code>catch.event_card</code> | Direct event-thumbnail activity fallback renderer for no-photo states. |
| <code>EventThumbnail</code> | <code>lib/core/widgets/event_thumbnail.dart:17</code> | <code>Thumbnail</code> | <code>catch.event_card</code> | Shared image/fallback primitive for any event-card surface. |
| <code>OrderedPhotoAddTile</code> | <code>lib/core/widgets/ordered_photo_picker.dart:716</code> | — | — | No class documentation or registry summary. |
| <code>OrderedPhotoPicker</code> | <code>lib/core/widgets/ordered_photo_picker.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>OrderedPhotoTile</code> | <code>lib/core/widgets/ordered_photo_picker.dart:478</code> | — | — | No class documentation or registry summary. |
| <code>StartupBrandHeader</code> | <code>lib/core/widgets/splash_screen.dart:40</code> | <code>Header</code> | <code>catch.startup_loading_screen</code> | The shared role-specific brand anchor used by Host startup and auth. |
| <code>CrossPathsEventConsentSection</code> | <code>lib/cross_paths/presentation/cross_paths_event_consent_section.dart:8</code> | — | — | Provider-free Event Detail renderer for hidden, loading, enabled, disabled, pending, and unavailable event-consent states resolved by the route. |
| <code>CrossPathsEventContextCard</code> | <code>lib/cross_paths/presentation/cross_paths_explore_card.dart:132</code> | — | — | No class documentation or registry summary. |
| <code>CrossPathsExploreCard</code> | <code>lib/cross_paths/presentation/cross_paths_explore_card.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>CrossPathsProfilePreviewSheet</code> | <code>lib/cross_paths/presentation/cross_paths_explore_card.dart:234</code> | — | — | No class documentation or registry summary. |
| <code>ActivityScreenBody</code> | <code>lib/dashboard/presentation/activity_screen.dart:183</code> | — | — | No class documentation or registry summary. |
| <code>ActivityScreenSkeleton</code> | <code>lib/dashboard/presentation/activity_screen.dart:171</code> | — | — | No class documentation or registry summary. |
| <code>DashboardFocusLoadingCard</code> | <code>lib/dashboard/presentation/dashboard_screen.dart:238</code> | — | — | No class documentation or registry summary. |
| <code>DashboardLoadingHeader</code> | <code>lib/dashboard/presentation/dashboard_screen.dart:207</code> | — | — | No class documentation or registry summary. |
| <code>NotificationsAction</code> | <code>lib/dashboard/presentation/dashboard_screen.dart:163</code> | — | — | No class documentation or registry summary. |
| <code>ActivitySection</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:31</code> | — | — | No class documentation or registry summary. |
| <code>ActivitySectionSkeleton</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:186</code> | — | — | No class documentation or registry summary. |
| <code>ActivitySignedOutEmptyState</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>NotificationDayList</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:144</code> | — | — | No class documentation or registry summary. |
| <code>NotificationRow</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:259</code> | <code>Row</code> | — | Activity notification list row with type glyph, read/unread emphasis, timestamp, optional body, divider, and tap semantics. Also called: <code>NotificationTile</code>, <code>NotificationItem</code>, <code>ActivityRow</code>, <code>NotificationListItem</code>. |
| <code>NotificationRowSkeleton</code> | <code>lib/dashboard/presentation/widgets/activity_section.dart:204</code> | — | — | No class documentation or registry summary. |
| <code>ClubPostHomeCard</code> | <code>lib/dashboard/presentation/widgets/club_posts_home_section.dart:55</code> | — | — | No class documentation or registry summary. |
| <code>ClubPostsHomeSection</code> | <code>lib/dashboard/presentation/widgets/club_posts_home_section.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>DashboardEmptySliverBody</code> | <code>lib/dashboard/presentation/widgets/dashboard_empty_sliver_body.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>HowCatchWorksSection</code> | <code>lib/dashboard/presentation/widgets/dashboard_empty_sliver_body.dart:22</code> | — | — | Shared explainer for both the signed-out and signed-in idle Home states. |
| <code>DashboardFullSliverBody</code> | <code>lib/dashboard/presentation/widgets/dashboard_full.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>EmptyHeroBody</code> | <code>lib/dashboard/presentation/widgets/empty_hero_card.dart:54</code> | — | — | No class documentation or registry summary. |
| <code>EmptyHeroCard</code> | <code>lib/dashboard/presentation/widgets/empty_hero_card.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventFocusCard</code> | <code>lib/dashboard/presentation/widgets/event_focus_list.dart:250</code> | — | — | No class documentation or registry summary. |
| <code>EventFocusList</code> | <code>lib/dashboard/presentation/widgets/event_focus_list.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalEntryStateScaffold</code> | <code>lib/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart:202</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalCheckpointRequestSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_request_sheet.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalCheckpointSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_sheet.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalCheckpointVisitSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_visit_sheet.dart:22</code> | — | — | Reuses the live atomic visit UI with original-departure practice evidence. |
| <code>EventRehearsalChoiceTile</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_choice_tile.dart:7</code> | — | — | A destination with its explanation attached, rather than a field value squeezed into a trailing lane. All copy wraps at its natural height. |
| <code>EventRehearsalConfigInput</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_customise_sheet.dart:340</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalCustomiseSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_customise_sheet.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalDeliveryQueueSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_delivery_queue_sheet.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalDeliverySection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_delivery_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalDeliverySheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_delivery_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalDepartureHistorySheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_departure_history_sheet.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalDepartureSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_departure_sheet.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalEntryPageBody</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_entry_page_body.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalEntryScaffold</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_entry_scaffold.dart:10</code> | — | — | The rehearsal entry view, with a single start action and optional editors. The route controller supplies source loading, persistence and navigation. |
| <code>EventRehearsalGroupsSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_groups_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalGuestLinkSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalRunSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart:93</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalHelpQueueSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_help_queue_sheet.dart:25</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalHelpSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_help_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalHelpSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_help_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalMembershipSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_membership_sheet.dart:19</code> | — | — | Synthetic adapter for the same group controls, fixed to the original run. |
| <code>EventRehearsalMovementSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_movement_section.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalPracticeRoleSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_practice_role_section.dart:13</code> | — | — | Chooses the identity used for guest/group assistance, never rehearsal control. |
| <code>EventRehearsalRuntimePreviewSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_runtime_preview_section.dart:11</code> | — | — | Practice choices carry route kinds and synthetic receipts, never sender IDs. |
| <code>EventRehearsalRuntimeSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_runtime_section.dart:15</code> | — | — | A compact simulation form; advanced timing and receipt scripts open on demand. |
| <code>EventRehearsalSettingsSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart:12</code> | — | — | Uses the actual runtime's settings slot and only discloses current groups. |
| <code>EventRehearsalSettingsSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_settings_sheet.dart:21</code> | — | — | The retained owner decides which form is shown while a save is unresolved. |
| <code>EventRehearsalSetupSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_setup_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalRecapSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart:237</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalRosterSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart:196</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalSimulatorBody</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalSourceSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_source_sheet.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventRehearsalStaffEditSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_staff_edit_section.dart:17</code> | — | — | Inline explicit-save duty editor; the controller retains uncertain saves. |
| <code>EventRehearsalStaffSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart:18</code> | — | — | Optional synthetic staff configuration within the rehearsal's practice tools. |
| <code>EventRehearsalStartSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_start_sheet.dart:10</code> | — | — | Chooses the rehearsal starting point before the configurable setup screen. |
| <code>EventRehearsalSweepSection</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_sweep_section.dart:12</code> | — | — | Uses the runtime's latest roster; opening a visit deliberately fetches authority. |
| <code>EventRehearsalVisitSheet</code> | <code>lib/event_rehearsal/presentation/widgets/event_rehearsal_visit_sheet.dart:18</code> | — | — | Practice transport adapter; the run/guest pending owner cannot follow a reset. |
| <code>EventSuccessAssignmentReasonNotice</code> | <code>lib/event_success/presentation/assignments/event_success_assignment_reason_notice.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupMemberField</code> | <code>lib/event_success/presentation/assignments/event_success_group_override_round_section.dart:188</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupOverrideFieldLanes</code> | <code>lib/event_success/presentation/assignments/event_success_group_override_round_section.dart:92</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupOverrideRoundSection</code> | <code>lib/event_success/presentation/assignments/event_success_group_override_round_section.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupOverrideSheet</code> | <code>lib/event_success/presentation/assignments/event_success_group_override_sheet.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostPodSection</code> | <code>lib/event_success/presentation/assignments/event_success_host_pod_section.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostRotationSection</code> | <code>lib/event_success/presentation/assignments/event_success_host_rotation_section.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessPodSummaryRow</code> | <code>lib/event_success/presentation/assignments/event_success_pod_summary_row.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRotationOverrideRoundSection</code> | <code>lib/event_success/presentation/assignments/event_success_rotation_override_round_section.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRotationPairFieldLanes</code> | <code>lib/event_success/presentation/assignments/event_success_rotation_override_round_section.dart:85</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRotationOverrideSheet</code> | <code>lib/event_success/presentation/assignments/event_success_rotation_override_sheet.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCompanionLoadingPageBody</code> | <code>lib/event_success/presentation/companion/event_success_companion_loading_page_body.dart:6</code> | — | — | The companion stage and its actions depend on the resolved plan. Keep the route's real header while that structure is unknown. |
| <code>AfterglowBeatGrid</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_afterglow_card.dart:168</code> | — | — | Beats land in sequence, 1.4s apart, each sliding up from below with a fade. Counter values animate from 0 to their final number over 600ms once the row has finished entering. Gives the afterglow recap a Spotify-Wrapped style paced reveal instead of dumping all three rows at once. |
| <code>AfterglowBeatRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_afterglow_card.dart:199</code> | — | — | No class documentation or registry summary. |
| <code>PrivateAfterglowRecapCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_afterglow_card.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>FirstHelloCheckInCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_card.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>FirstHelloMissionEditor</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_card.dart:278</code> | — | — | The first-hello mission: answer choices plus complete and skip actions. |
| <code>CompanionActionsEmptyState</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_section.dart:147</code> | — | — | No class documentation or registry summary. |
| <code>CompanionArrivalProgressIndicator</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionArrivalSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_section.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>CompanionOthersInRoomText</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_arrival_section.dart:137</code> | — | — | Compact co-presence indicator. Tells the attendee they're not in here alone, with a brief alpha-pulse the moment the count climbs. Used on solo-feeling surfaces (questionnaire, eventually First Hello / wingman). |
| <code>EventCheckInQrScannerSheet</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_check_in_qr_scanner_sheet.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CounterRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_feedback_form.dart:245</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessFeedbackForm</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_feedback_form.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>RatingRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_feedback_form.dart:204</code> | — | — | No class documentation or registry summary. |
| <code>GroupRotationSlotRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_group_rotation_slot_row.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPreviewText</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:387</code> | — | — | No class documentation or registry summary. |
| <code>IncludeMeField</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:414</code> | — | — | No class documentation or registry summary. |
| <code>LiveStepContextCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:249</code> | — | — | No class documentation or registry summary. |
| <code>MicroPodCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:32</code> | — | — | No class documentation or registry summary. |
| <code>PreCheckInPlanningCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:297</code> | — | — | Informational preview of what the host will guide the attendee through once check-in opens. Opt-out controls live on the at-event cards instead. |
| <code>RotationScheduleCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:146</code> | — | — | No class documentation or registry summary. |
| <code>SelfCheckInCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:458</code> | — | — | No class documentation or registry summary. |
| <code>StageConversationCueCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:590</code> | — | — | No class documentation or registry summary. |
| <code>StageCueCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:633</code> | — | — | No class documentation or registry summary. |
| <code>StagePromptCard</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:564</code> | — | — | No class documentation or registry summary. |
| <code>StageSectionHeader</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_live_card.dart:710</code> | — | — | No class documentation or registry summary. |
| <code>CompanionBouncyChip</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_motion_viewport.dart:91</code> | — | — | No class documentation or registry summary. |
| <code>CompanionBouncySurface</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_motion_viewport.dart:65</code> | — | — | Gives the wrapped widget a kinetic press response: scale down on tap-down, brief glow flare, then a spring-back to rest. Drop-in replacement for InkWell-style affordances on the stage where Material's ink ripple feels out of place against the gradient + motif backdrop. |
| <code>CompanionStageMotifImage</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_motion_viewport.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageTransitionViewport</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_motion_viewport.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>CompanionExpectationRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:478</code> | — | — | No class documentation or registry summary. |
| <code>CompanionExpectationSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:427</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperNavigationRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:75</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperProgressIndicator</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:136</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperScaffold</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicket</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:170</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicketDivider</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:376</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicketHeader</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:273</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicketImage</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:411</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicketRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:341</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPaperTicketText</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:391</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPrivacySection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:503</code> | — | — | No class documentation or registry summary. |
| <code>CompanionSelfCheckInSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_paper_section.dart:537</code> | — | — | No class documentation or registry summary. |
| <code>PeopleTokenRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_people_token_row.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompatibilityQuestionnaireSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_questionnaire_section.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>QuestionProgressRail</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_questionnaire_section.dart:254</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessMarqueeImage</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_reveal_overlay.dart:133</code> | — | — | The reveal's animated marquee: the Lottie scene, check-in dots and a phase-driven vignette for one [EventSuccessMarqueeFrame]. |
| <code>RevealCinematicOverlay</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_reveal_overlay.dart:8</code> | — | — | Server-clocked reveal cinematic composed from the same portable assets and deterministic geometry used by the guest-web runtime. |
| <code>RotationSlotRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_rotation_slot_row.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionHeroSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:277</code> | — | — | No class documentation or registry summary. |
| <code>CompanionMomentPageBody</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:412</code> | — | — | No class documentation or registry summary. |
| <code>CompanionMomentViewport</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:93</code> | — | — | No class documentation or registry summary. |
| <code>CompanionPrivacyText</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:364</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageActionSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:444</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageBanner</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:467</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageImage</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:354</code> | — | — | Animates a one-shot entry on first build, then breathes the glyph continuously so the hero element never reads as static between moments. |
| <code>CompanionStageNavigationRow</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:219</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageScaffold</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionStageSurface</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_stage_viewport.dart:435</code> | — | — | Ambient stage card. The border alpha breathes on a 6s sine so the surface never reads as static — even when no content is changing. |
| <code>WingmanRequestSection</code> | <code>lib/event_success/presentation/companion_parts/event_success_companion_wingman_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventAssignmentFeatureChoicesPageBody</code> | <code>lib/event_success/presentation/event_assignment_feature_choices_page_body.dart:13</code> | — | — | The current session's private answer review and independent grant controls. |
| <code>EventAssignmentFeatureSheet</code> | <code>lib/event_success/presentation/event_assignment_feature_sheet.dart:11</code> | — | — | The backend discovers only this verified respondent's answers. A separate matching decision is required for each answer; prior grants stay visible. |
| <code>EventAssistanceCheckpointRequestSection</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_request_section.dart:13</code> | — | — | Closing a request resolves the obligation, without inventing arrival evidence. |
| <code>EventAssistanceCheckpointRequestSheet</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_request_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceCheckpointRosterSection</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_roster_section.dart:10</code> | — | — | The immutable departure remains the denominator, including missing records. |
| <code>EventAssistanceCheckpointSection</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_section.dart:47</code> | — | — | One observation form for live and simulated checkpoint reporting. |
| <code>EventAssistanceCheckpointSheet</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_sheet.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceCheckpointVisitsSection</code> | <code>lib/event_success/presentation/event_assistance_checkpoint_visits_section.dart:12</code> | — | — | Original departure members without an arrival observation, including resolved visits. A visit outcome never removes a person from this denominator. |
| <code>EventAssistanceDeliveryDecisionSection</code> | <code>lib/event_success/presentation/event_assistance_delivery_decision_section.dart:18</code> | — | — | Evidence, scheduled work and manual ownership remain independent facts. |
| <code>EventAssistanceDeliveryEntrySection</code> | <code>lib/event_success/presentation/event_assistance_delivery_entry_section.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceDeliveryQueueSection</code> | <code>lib/event_success/presentation/event_assistance_delivery_queue_section.dart:8</code> | — | — | A bounded list of message evidence, shared by live and practice adapters. |
| <code>EventAssistanceDeliveryQueueSheet</code> | <code>lib/event_success/presentation/event_assistance_delivery_queue_sheet.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceDeliverySheet</code> | <code>lib/event_success/presentation/event_assistance_delivery_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceDepartureHistorySection</code> | <code>lib/event_success/presentation/event_assistance_departure_history_section.dart:16</code> | — | — | Saved records use readable record rows, with disclosure only for report detail. |
| <code>EventAssistanceDepartureHistorySheet</code> | <code>lib/event_success/presentation/event_assistance_departure_history_sheet.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceDepartureRosterSection</code> | <code>lib/event_success/presentation/event_assistance_departure_roster_section.dart:10</code> | — | — | Searchable, bounded observation choices. Nothing is selected by attendance. |
| <code>EventAssistanceDepartureSection</code> | <code>lib/event_success/presentation/event_assistance_departure_section.dart:26</code> | — | — | One departure form shared by real and synthetic transports. |
| <code>EventAssistanceDepartureSheet</code> | <code>lib/event_success/presentation/event_assistance_departure_sheet.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceGroupRosterSection</code> | <code>lib/event_success/presentation/event_assistance_group_roster_section.dart:10</code> | — | — | A compact entry to one guest's group action, shared by both runtimes. |
| <code>EventAssistanceHelpDecisionSection</code> | <code>lib/event_success/presentation/event_assistance_help_decision_section.dart:25</code> | — | — | One deliberate practical-help decision, with the same recovery in both modes. |
| <code>EventAssistanceHelpEntrySection</code> | <code>lib/event_success/presentation/event_assistance_help_entry_section.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceHelpQueueSection</code> | <code>lib/event_success/presentation/event_assistance_help_queue_section.dart:34</code> | — | — | Page controls and readable request records shared by live and practice. |
| <code>EventAssistanceHelpQueueSheet</code> | <code>lib/event_success/presentation/event_assistance_help_queue_sheet.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceHelpSheet</code> | <code>lib/event_success/presentation/event_assistance_help_sheet.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLateJoinDestinationField</code> | <code>lib/event_success/presentation/event_assistance_late_join_destination_field.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLateJoinRulesSection</code> | <code>lib/event_success/presentation/event_assistance_late_join_rules_section.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLateJoinSection</code> | <code>lib/event_success/presentation/event_assistance_late_join_section.dart:24</code> | — | — | The configuration form is shared; its caller supplies live or practice authority. |
| <code>EventAssistanceLateJoinSheet</code> | <code>lib/event_success/presentation/event_assistance_late_join_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLiveDeliverySection</code> | <code>lib/event_success/presentation/event_assistance_live_delivery_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLiveGroupsSection</code> | <code>lib/event_success/presentation/event_assistance_live_groups_section.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLiveHelpSection</code> | <code>lib/event_success/presentation/event_assistance_live_help_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLiveMovementSection</code> | <code>lib/event_success/presentation/event_assistance_live_movement_section.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>EventAssistanceLiveSettingsSection</code> | <code>lib/event_success/presentation/event_assistance_live_settings_section.dart:18</code> | — | — | A compact event default with group overrides disclosed only on request. |
| <code>EventAssistanceLiveSweepSection</code> | <code>lib/event_success/presentation/event_assistance_live_sweep_section.dart:14</code> | — | — | Connects the shared sweep roster to live visit reviews. |
| <code>EventAssistanceMembershipSection</code> | <code>lib/event_success/presentation/event_assistance_membership_section.dart:25</code> | — | — | Shared live/practice controls. A proposal never displays as accepted membership. |
| <code>EventAssistanceMembershipSheet</code> | <code>lib/event_success/presentation/event_assistance_membership_sheet.dart:16</code> | — | — | Live transport adapter; the original per-guest owner survives a sheet refresh. |
| <code>EventAssistanceMovementSection</code> | <code>lib/event_success/presentation/event_assistance_movement_section.dart:9</code> | — | — | Capability-specific entry to the same group controls in both runtimes. |
| <code>EventAssistanceRuntimeChannelsSection</code> | <code>lib/event_success/presentation/event_assistance_runtime_channels_section.dart:11</code> | — | — | Explicit channel order with named, server-reviewed sender choices. |
| <code>EventAssistanceRuntimeLimitsSection</code> | <code>lib/event_success/presentation/event_assistance_runtime_limits_section.dart:11</code> | — | — | Optional timing and delivery limits preserve the rest of the configuration. |
| <code>EventAssistanceRuntimeSection</code> | <code>lib/event_success/presentation/event_assistance_runtime_section.dart:23</code> | — | — | Event-scoped configuration with progressive limits and a frozen pending decision. |
| <code>EventAssistanceRuntimeSheet</code> | <code>lib/event_success/presentation/event_assistance_runtime_sheet.dart:20</code> | — | — | The live settings boundary keeps an unresolved command across sheet closure. |
| <code>EventAssistanceSweepSection</code> | <code>lib/event_success/presentation/event_assistance_sweep_section.dart:20</code> | — | — | The same compact roster opens one guest's visit in live and practice modes. |
| <code>EventAssistanceVisitSection</code> | <code>lib/event_success/presentation/event_assistance_visit_section.dart:55</code> | — | — | An atomic observation. The caller owns review, authority and exact retries. |
| <code>EventAssistanceVisitSheet</code> | <code>lib/event_success/presentation/event_assistance_visit_sheet.dart:16</code> | — | — | Live transport adapter for the shared atomic visit controls. |
| <code>EventMessageChannelAccordion</code> | <code>lib/event_success/presentation/event_message_channel_accordion.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventMessagePreferenceSection</code> | <code>lib/event_success/presentation/event_message_preference_section.dart:34</code> | — | — | Read-only presentation facts. Only the channel's retained controller owns a reviewed permission and can supply the corresponding action callbacks. |
| <code>EventMessagePreferencesNavigationSection</code> | <code>lib/event_success/presentation/event_message_preferences_navigation_section.dart:9</code> | — | — | Consumer event-detail entry. No identity or preference reads until opened. |
| <code>EventMessagePreferencesSheet</code> | <code>lib/event_success/presentation/event_message_preferences_sheet.dart:17</code> | — | — | Resolves only the signed-in attendee. Opening this sheet cannot enroll a phone or choose an attendee, and refresh never carries an old identity. |
| <code>EventMessageSenderSection</code> | <code>lib/event_success/presentation/event_message_sender_section.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessAttendeeSpatialRow</code> | <code>lib/event_success/presentation/event_success_attendee_spatial_row.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CompanionEmptyState</code> | <code>lib/event_success/presentation/event_success_companion_screen.dart:159</code> | — | — | No class documentation or registry summary. |
| <code>CompanionErrorState</code> | <code>lib/event_success/presentation/event_success_companion_screen.dart:129</code> | — | — | No class documentation or registry summary. |
| <code>CompanionScaffold</code> | <code>lib/event_success/presentation/event_success_companion_screen.dart:92</code> | — | — | No class documentation or registry summary. |
| <code>CompanionSkeleton</code> | <code>lib/event_success/presentation/event_success_companion_screen.dart:118</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessConversationCueCard</code> | <code>lib/event_success/presentation/event_success_conversation_cue_card.dart:131</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRecommendationTile</code> | <code>lib/event_success/presentation/event_success_conversation_cue_card.dart:209</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessReportSectionList</code> | <code>lib/event_success/presentation/event_success_conversation_cue_card.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>ConversationCueRow</code> | <code>lib/event_success/presentation/event_success_conversation_cue_row.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessDefaultsSection</code> | <code>lib/event_success/presentation/event_success_defaults_section.dart:16</code> | — | — | Create-event panel that lets the host enable the live event guide and tune the saved defaults inline. The configuration UI is shared with the Host Manage Setup tab via [EventSuccessSetupBody]. |
| <code>EventSuccessHostSection</code> | <code>lib/event_success/presentation/event_success_host_screen.dart:60</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostWorkspacePageBody</code> | <code>lib/event_success/presentation/event_success_host_workspace_page_body.dart:29</code> | — | — | No class documentation or registry summary. |
| <code>CustomQuestionnaireField</code> | <code>lib/event_success/presentation/event_success_questionnaire_config_editor.dart:475</code> | — | — | One accordion text field of a custom questionnaire: the set name, a question prompt or an answer option. |
| <code>CustomQuestionnaireSection</code> | <code>lib/event_success/presentation/event_success_questionnaire_config_editor.dart:156</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessQuestionnaireConfigEditor</code> | <code>lib/event_success/presentation/event_success_questionnaire_config_editor.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRoomMap</code> | <code>lib/event_success/presentation/event_success_room_map.dart:38</code> | — | — | Shared normalized room map used by Host and attendee runtimes. |
| <code>EventSuccessRoomSetupSection</code> | <code>lib/event_success/presentation/event_success_room_setup_section.dart:16</code> | — | — | Shared room-layout setup used by Create Event and post-creation Host Setup. |
| <code>EventSuccessModuleList</code> | <code>lib/event_success/presentation/event_success_setup_body.dart:326</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessSetupBody</code> | <code>lib/event_success/presentation/event_success_setup_body.dart:23</code> | — | — | Compact Event Success setup shared by create-event defaults and Host Manage. |
| <code>EventSuccessStructureConfigEditor</code> | <code>lib/event_success/presentation/event_success_structure_config_editor.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessActivityFieldLanes</code> | <code>lib/event_success/presentation/host_components/event_success_activity_field_lanes.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCompatibilitySection</code> | <code>lib/event_success/presentation/host_components/event_success_compatibility_section.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostHelpSection</code> | <code>lib/event_success/presentation/host_components/event_success_host_help_section.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostResourceErrorState</code> | <code>lib/event_success/presentation/host_components/event_success_host_resource_error_state.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostSectionLoadingPageBody</code> | <code>lib/event_success/presentation/host_components/event_success_host_section_loading_page_body.dart:7</code> | — | — | The tabs are known before the plan resolves; their content is not. |
| <code>EventSuccessHostTabBar</code> | <code>lib/event_success/presentation/host_components/event_success_host_tab_bar.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostTabPageBody</code> | <code>lib/event_success/presentation/host_components/event_success_host_tab_page_body.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessLiveWorkspaceTabBar</code> | <code>lib/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessPlanFieldLanes</code> | <code>lib/event_success/presentation/host_components/event_success_plan_field_lanes.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessAccountabilitySection</code> | <code>lib/event_success/presentation/host_live/event_success_accountability_section.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessControlRoomPageBody</code> | <code>lib/event_success/presentation/host_live/event_success_control_room_page_body.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessControlRoomStageSection</code> | <code>lib/event_success/presentation/host_live/event_success_control_room_stage_section.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessControlRoomSyncBadge</code> | <code>lib/event_success/presentation/host_live/event_success_control_room_sync_badge.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessExclusionAlertBanner</code> | <code>lib/event_success/presentation/host_live/event_success_exclusion_alert_banner.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostLivePageBody</code> | <code>lib/event_success/presentation/host_live/event_success_host_live_page_body.dart:46</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessPresenceSection</code> | <code>lib/event_success/presentation/host_live/event_success_presence_section.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRoomSummarySection</code> | <code>lib/event_success/presentation/host_live/event_success_room_summary_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessStepActionRow</code> | <code>lib/event_success/presentation/host_live/event_success_step_action_row.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessFunnelSection</code> | <code>lib/event_success/presentation/host_report/event_success_funnel_section.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostReportPageBody</code> | <code>lib/event_success/presentation/host_report/event_success_host_report_page_body.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessReportQualitySection</code> | <code>lib/event_success/presentation/host_report/event_success_report_quality_section.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessAssignmentFeatureRuleSheet</code> | <code>lib/event_success/presentation/host_setup/event_success_assignment_feature_rule_sheet.dart:9</code> | — | — | Published-question transform editor for one soft event matching feature. |
| <code>EventSuccessAssignmentFeaturesSection</code> | <code>lib/event_success/presentation/host_setup/event_success_assignment_features_section.dart:17</code> | — | — | Host editor over published question metadata and aggregate roster coverage. No participant answer or identity is present in its data contract. |
| <code>EventSuccessHostSetupPageBody</code> | <code>lib/event_success/presentation/host_setup/event_success_host_setup_page_body.dart:24</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessReadinessField</code> | <code>lib/event_success/presentation/host_setup/event_success_readiness_field.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessTargetAttendeesField</code> | <code>lib/event_success/presentation/host_setup/event_success_target_attendees_field.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessAssignmentSurface</code> | <code>lib/event_success/presentation/reveal/event_success_assignment_surface.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessAttendeeRevealSurface</code> | <code>lib/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownIndicator</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_indicator.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownNotice</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_notice_row_list.dart:37</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownNoticeRowList</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_notice_row_list.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownStepper</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_stepper.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownSurface</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_surface.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCountdownText</code> | <code>lib/event_success/presentation/reveal/event_success_countdown_text.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupRotationRow</code> | <code>lib/event_success/presentation/reveal/event_success_group_rotation_row_list.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessGroupRotationRowList</code> | <code>lib/event_success/presentation/reveal/event_success_group_rotation_row_list.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostRevealSurface</code> | <code>lib/event_success/presentation/reveal/event_success_host_reveal_surface.dart:29</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessHostRevealViewport</code> | <code>lib/event_success/presentation/reveal/event_success_host_reveal_viewport.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessOutcomeSection</code> | <code>lib/event_success/presentation/reveal/event_success_outcome_section.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessPodAssignmentSection</code> | <code>lib/event_success/presentation/reveal/event_success_pod_assignment_section.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealActionRow</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_action_row.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealHeader</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_header.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealProgressIndicator</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_progress_indicator.dart:4</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealRoundRow</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_round_row_list.dart:70</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealRoundRowList</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_round_row_list.dart:15</code> | — | — | Design-system `RotationCard` round list, dark-adapted for the reveal stage: a config mono line over one row per round — `R{n}`, the pairings (or "Hidden until reveal" while masked), and a Done / Now / Hidden state badge. Pairings only render for rounds the host has already released. |
| <code>EventSuccessRevealRoundStepper</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_round_stepper.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRevealWaitingNotice</code> | <code>lib/event_success/presentation/reveal/event_success_reveal_waiting_notice.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRotationRow</code> | <code>lib/event_success/presentation/reveal/event_success_rotation_row_list.dart:53</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessRotationRowList</code> | <code>lib/event_success/presentation/reveal/event_success_rotation_row_list.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessStandingsSection</code> | <code>lib/event_success/presentation/reveal/event_success_standings_section.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>CalendarAgendaSliverSection</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:288</code> | — | — | No class documentation or registry summary. |
| <code>CalendarDateHeader</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:428</code> | — | — | No class documentation or registry summary. |
| <code>CalendarDateHeaderSkeleton</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:483</code> | — | — | No class documentation or registry summary. |
| <code>CalendarMonthGrid</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:651</code> | — | — | No class documentation or registry summary. |
| <code>CalendarStatDivider</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:738</code> | — | — | No class documentation or registry summary. |
| <code>CalendarStatSkeleton</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:591</code> | — | — | No class documentation or registry summary. |
| <code>CalendarStatsHeaderSkeleton</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:556</code> | — | — | No class documentation or registry summary. |
| <code>CalendarWeekRow</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:607</code> | — | — | No class documentation or registry summary. |
| <code>CalendarWeekRowSkeleton</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:495</code> | — | — | No class documentation or registry summary. |
| <code>CalendarStatsHeader</code> | <code>lib/events/presentation/calendar/calendar_stats_header.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>ChromelessMapScaffold</code> | <code>lib/events/presentation/event_location_map_screen.dart:179</code> | — | — | No class documentation or registry summary. |
| <code>EventLocationMapLoadingBody</code> | <code>lib/events/presentation/event_location_map_screen.dart:114</code> | — | — | No class documentation or registry summary. |
| <code>EventMap</code> | <code>lib/events/presentation/event_map_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>EventMapLoadingBody</code> | <code>lib/events/presentation/event_map_screen.dart:197</code> | — | — | No class documentation or registry summary. |
| <code>MapPickerSearchRow</code> | <code>lib/events/presentation/location_picker_screen.dart:380</code> | — | — | No class documentation or registry summary. |
| <code>PlaceSearchSection</code> | <code>lib/events/presentation/location_picker_screen.dart:412</code> | — | — | No class documentation or registry summary. |
| <code>PlaceSuggestionRow</code> | <code>lib/events/presentation/location_picker_screen.dart:499</code> | — | — | No class documentation or registry summary. |
| <code>SelectedPointSection</code> | <code>lib/events/presentation/location_picker_screen.dart:565</code> | — | — | No class documentation or registry summary. |
| <code>SavedEventsAgendaList</code> | <code>lib/events/presentation/saved_events_screen.dart:144</code> | — | — | No class documentation or registry summary. |
| <code>SavedEventsClubNamesErrorState</code> | <code>lib/events/presentation/saved_events_screen.dart:181</code> | — | — | No class documentation or registry summary. |
| <code>EventCompanionCard</code> | <code>lib/events/presentation/widgets/event_detail_body.dart:279</code> | — | — | Provider-free companion prompt adapter for hidden, loading, error, and available Event Success plan states. |
| <code>EventDetailCalloutCard</code> | <code>lib/events/presentation/widgets/event_detail_body.dart:207</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailHostsSection</code> | <code>lib/events/presentation/widgets/event_detail_body.dart:340</code> | — | — | Compact host identity, with all affordances derived from available actions. |
| <code>GuestBookDock</code> | <code>lib/events/presentation/widgets/event_detail_body.dart:318</code> | — | — | No class documentation or registry summary. |
| <code>EventBookingDock</code> | <code>lib/events/presentation/widgets/event_detail_dock.dart:25</code> | — | — | Provider-free booking dock renderer for eligible, paid, booked, waitlist, waitlist-offer, attended, past, disabled, pending, and error states. |
| <code>EventDetailDock</code> | <code>lib/events/presentation/widgets/event_detail_dock.dart:80</code> | — | — | No class documentation or registry summary. |
| <code>EventDockStatusText</code> | <code>lib/events/presentation/widgets/event_detail_dock.dart:525</code> | — | — | No class documentation or registry summary. |
| <code>EventPriceText</code> | <code>lib/events/presentation/widgets/event_detail_dock.dart:443</code> | — | — | No class documentation or registry summary. |
| <code>WaitlistOfferNotice</code> | <code>lib/events/presentation/widgets/event_detail_dock.dart:481</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailFactList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:348</code> | — | — | Flat Event Detail fact rows with structural stacked and inline modes. |
| <code>EventDetailGoodToKnowList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:315</code> | — | — | Good-to-know list for requirements, expectations, booking, cancellation, and settlement rows. |
| <code>EventDetailHintList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:79</code> | — | — | Why-you-might-click hint list derived from event format and activity context. |
| <code>EventDetailItineraryList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:128</code> | — | — | Timed event itinerary rail for route plan, meet, run, and post-event moments. |
| <code>EventDetailMapCard</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:165</code> | — | — | Event detail map preview card with exact or morning-of pin states and optional route-owned tap action. |
| <code>EventDetailMechanismList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:287</code> | — | — | How-sign-ups-work list for open signup, approval, waitlist, and demand-pricing mechanics. |
| <code>EventDetailPhotoGrid</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:484</code> | — | — | Canonical event-detail photo proof strip with uploaded photos and activity-soft placeholders. |
| <code>EventDetailPhotoTile</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:546</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailTicketStubRow</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:20</code> | — | — | Flush ticket fact band for when, where, pace, and activity facts below the hero. |
| <code>HairlineList</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:662</code> | — | — | No class documentation or registry summary. |
| <code>TicketStubTile</code> | <code>lib/events/presentation/widgets/event_detail_fact_list.dart:589</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailHeroTopBar</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:12</code> | — | — | Event detail hero section with standard, ticket, and spotlight-dark media treatments plus route-owned top actions. |
| <code>EventDetailTicketHeroSurface</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:237</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailTicketSurface</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:261</code> | — | — | No class documentation or registry summary. |
| <code>EventPhotoHeroSurface</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:191</code> | — | — | No class documentation or registry summary. |
| <code>HeroActivityBadge</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:376</code> | — | — | No class documentation or registry summary. |
| <code>HeroTimeChip</code> | <code>lib/events/presentation/widgets/event_detail_hero_top_bar.dart:414</code> | — | — | No class documentation or registry summary. |
| <code>ItineraryRow</code> | <code>lib/events/presentation/widgets/event_detail_itinerary_row.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailCompanionSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:365</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailHeroSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:52</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailHintSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:225</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailHostsSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:407</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailItineraryListSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:258</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailLoadingDock</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:438</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailMapSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:299</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailMechanismSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:311</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailPlanSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:205</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailSocialSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:340</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailTicketStubSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:139</code> | — | — | No class documentation or registry summary. |
| <code>TicketStubTileSkeleton</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:182</code> | — | — | No class documentation or registry summary. |
| <code>EventDescriptionSection</code> | <code>lib/events/presentation/widgets/event_detail_overview_section.dart:153</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailOverviewSection</code> | <code>lib/events/presentation/widgets/event_detail_overview_section.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailRouteSection</code> | <code>lib/events/presentation/widgets/event_detail_route_section.dart:8</code> | — | — | Public route expectations; operator roles and tracking policy stay in Host. |
| <code>EventDetailSocialSection</code> | <code>lib/events/presentation/widgets/event_detail_social_section.dart:14</code> | — | — | Who's-going and reviews section composition for guest lock, member roster, review visibility, and attended review action states. |
| <code>GuestWhoIsGoingCard</code> | <code>lib/events/presentation/widgets/event_detail_social_section.dart:85</code> | — | — | No class documentation or registry summary. |
| <code>EventHypeAvatarRow</code> | <code>lib/events/presentation/widgets/event_hype_avatar_row.dart:50</code> | — | — | Event-detail attendee-hype avatar stack that composes the shared Catch person-avatar stack for hidden and revealed roster states. |
| <code>EventPhotoHeader</code> | <code>lib/events/presentation/widgets/event_photo_header.dart:10</code> | — | — | Hero visual for the event detail screen. |
| <code>EventPinsFallbackMap</code> | <code>lib/events/presentation/widgets/event_pins_map.dart:638</code> | — | — | No class documentation or registry summary. |
| <code>EventPinsMap</code> | <code>lib/events/presentation/widgets/event_pins_map.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>MapOverlayTopBar</code> | <code>lib/events/presentation/widgets/map_overlay_top_bar.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>SwipeWindowBanner</code> | <code>lib/events/presentation/widgets/who_is_going_section.dart:240</code> | — | — | No class documentation or registry summary. |
| <code>WhoIsGoingBody</code> | <code>lib/events/presentation/widgets/who_is_going_section.dart:80</code> | — | — | No class documentation or registry summary. |
| <code>WhoIsGoingEmptyState</code> | <code>lib/events/presentation/widgets/who_is_going_section.dart:183</code> | — | — | No class documentation or registry summary. |
| <code>WhoIsGoingSection</code> | <code>lib/events/presentation/widgets/who_is_going_section.dart:34</code> | — | — | No class documentation or registry summary. |
| <code>AgendaDaySection</code> | <code>lib/events/shared/event_agenda_list.dart:252</code> | — | — | No class documentation or registry summary. |
| <code>EventAgendaSliverList</code> | <code>lib/events/shared/event_agenda_list.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>EventAgendaSliverSkeleton</code> | <code>lib/events/shared/event_agenda_list.dart:122</code> | — | — | No class documentation or registry summary. |
| <code>EventAgendaTileSkeleton</code> | <code>lib/events/shared/event_agenda_list.dart:159</code> | — | — | No class documentation or registry summary. |
| <code>EventCheckInQrScanner</code> | <code>lib/events/shared/event_check_in_qr_scanner.dart:54</code> | — | — | No class documentation or registry summary. |
| <code>EventShareCard</code> | <code>lib/events/shared/event_share_card.dart:90</code> | — | — | No class documentation or registry summary. |
| <code>EventShareChip</code> | <code>lib/events/shared/event_share_card.dart:260</code> | — | — | No class documentation or registry summary. |
| <code>EventActionCard</code> | <code>lib/events/shared/event_tiles/event_action_card.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>EventActionCardHeader</code> | <code>lib/events/shared/event_tiles/event_action_card.dart:175</code> | — | — | No class documentation or registry summary. |
| <code>EventActionList</code> | <code>lib/events/shared/event_tiles/event_action_card.dart:214</code> | — | — | No class documentation or registry summary. |
| <code>EventAgendaTile</code> | <code>lib/events/shared/event_tiles/event_agenda_tile.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>DateRail</code> | <code>lib/events/shared/event_tiles/event_date_rail_card.dart:523</code> | — | — | No class documentation or registry summary. |
| <code>EventDateRailCard</code> | <code>lib/events/shared/event_tiles/event_date_rail_card.dart:31</code> | — | <code>catch.event_card</code> | Compact list and map DateTicket with an activity rail, organizer and event identity hierarchy, one optional context block, and a trailing price decision row. |
| <code>EventTicketStubRow</code> | <code>lib/events/shared/event_tiles/event_date_rail_card.dart:239</code> | — | <code>catch.event_card</code> | Canonical decision row used by date-rail and agenda ticket compositions. |
| <code>PerforationDivider</code> | <code>lib/events/shared/event_tiles/event_date_rail_card.dart:482</code> | — | — | No class documentation or registry summary. |
| <code>EventDateTile</code> | <code>lib/events/shared/event_tiles/event_date_tile.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>MonthDayTile</code> | <code>lib/events/shared/event_tiles/event_date_tile.dart:126</code> | — | — | No class documentation or registry summary. |
| <code>WeekDayTile</code> | <code>lib/events/shared/event_tiles/event_date_tile.dart:55</code> | — | — | No class documentation or registry summary. |
| <code>ClubCard</code> | <code>lib/explore/presentation/widgets/club_card.dart:13</code> | <code>Card</code> | <code>catch.organizer_poster</code> | Explore spotlight adopter that composes organizer authority, rating, host identity, and tags into the canonical poster. |
| <code>ExploreClubTagList</code> | <code>lib/explore/presentation/widgets/club_card.dart:171</code> | — | — | No class documentation or registry summary. |
| <code>ExploreFeedClubRow</code> | <code>lib/explore/presentation/widgets/club_card.dart:87</code> | — | — | No class documentation or registry summary. |
| <code>CityOptionTile</code> | <code>lib/explore/presentation/widgets/explore_city_picker.dart:181</code> | — | — | No class documentation or registry summary. |
| <code>ExploreCityButton</code> | <code>lib/explore/presentation/widgets/explore_city_picker.dart:87</code> | — | — | No class documentation or registry summary. |
| <code>ExploreCityPicker</code> | <code>lib/explore/presentation/widgets/explore_city_picker.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>ExploreCityPickerSheet</code> | <code>lib/explore/presentation/widgets/explore_city_picker.dart:131</code> | — | — | No class documentation or registry summary. |
| <code>ExploreClearButton</code> | <code>lib/explore/presentation/widgets/explore_clear_button.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>ExploreExternalEventRow</code> | <code>lib/explore/presentation/widgets/explore_event_row.dart:58</code> | — | — | No class documentation or registry summary. |
| <code>ExploreFeedEventRow</code> | <code>lib/explore/presentation/widgets/explore_event_row.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>ThisWeekRecommendationsSection</code> | <code>lib/explore/presentation/widgets/explore_event_row.dart:161</code> | — | — | No class documentation or registry summary. |
| <code>ActivitySlotRow</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:165</code> | — | — | No class documentation or registry summary. |
| <code>ActivityTypeList</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:99</code> | — | — | No class documentation or registry summary. |
| <code>ActivityTypeRow</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:196</code> | — | — | No class documentation or registry summary. |
| <code>EventTypeBrowseBody</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:47</code> | — | — | No class documentation or registry summary. |
| <code>ExploreEventTypeBrowseGrid</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>MoreActivityTypesRow</code> | <code>lib/explore/presentation/widgets/explore_event_type_browse_grid.dart:241</code> | — | — | No class documentation or registry summary. |
| <code>ExploreFeedSliverBody</code> | <code>lib/explore/presentation/widgets/explore_events_section.dart:147</code> | — | — | No class documentation or registry summary. |
| <code>ExploreEventsSkeleton</code> | <code>lib/explore/presentation/widgets/explore_feed_empty_state.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>ExploreFeedEmptyState</code> | <code>lib/explore/presentation/widgets/explore_feed_empty_state.dart:35</code> | — | — | No class documentation or registry summary. |
| <code>ExploreFeedSkeleton</code> | <code>lib/explore/presentation/widgets/explore_feed_skeleton.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>ExploreAppliedFilterRail</code> | <code>lib/explore/presentation/widgets/explore_filter_rail.dart:109</code> | — | — | Removable Explore filters that scroll beneath the pinned time-scope rail. |
| <code>ExploreFilterRail</code> | <code>lib/explore/presentation/widgets/explore_filter_rail.dart:16</code> | — | — | Explore's pinned primary time-scope rail. |
| <code>ExploreFilterSheet</code> | <code>lib/explore/presentation/widgets/explore_filter_rail.dart:207</code> | — | — | No class documentation or registry summary. |
| <code>ExploreDiscoveryCoverHeader</code> | <code>lib/explore/presentation/widgets/explore_header.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>ExploreRecommendationsSection</code> | <code>lib/explore/presentation/widgets/explore_recommendations_section.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ExploreScreenEmptyState</code> | <code>lib/explore/presentation/widgets/explore_screen_empty_state.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>FeaturedEventBody</code> | <code>lib/explore/presentation/widgets/featured_event_poster.dart:262</code> | — | — | No class documentation or registry summary. |
| <code>FeaturedEventPoster</code> | <code>lib/explore/presentation/widgets/featured_event_poster.dart:18</code> | <code>Poster</code> | — | Design-system `CoverStory` (`components/explore/CoverStory`): the dark "wow" cover that opens Explore — tonight's headline event as a magazine cover. A near-black ground, an activity-pigment radial glow, a faint diagonal scrim, a giant ghosted activity glyph, a condensed Archivo headline, and a paper CTA + mono data block. Also serves as a neutral masthead (omit [activityKind] for the brand glow, set [showGhostGlyph] false, pass [body] for a hook line). Also called: <code>CoverStory</code>, <code>FeaturedEventHero</code>, <code>ExploreHero</code>, <code>FeaturedEventBanner</code>. |
| <code>FeaturedEventTopBar</code> | <code>lib/explore/presentation/widgets/featured_event_poster.dart:165</code> | — | — | No class documentation or registry summary. |
| <code>RecommendCard</code> | <code>lib/explore/presentation/widgets/recommend_card.dart:19</code> | — | — | Explore recommendation card. |
| <code>UpdateRequiredBody</code> | <code>lib/force_update/presentation/update_required_screen.dart:55</code> | — | — | Provider-free full-screen update prompt rendered by [UpdateRequiredScreen]. |
| <code>PhoneImportGuestSection</code> | <code>lib/hosts/audience/phone_import/presentation/widgets/phone_import_guest_section.dart:9</code> | — | — | One guest's local review fields. Controller commands own all draft changes; text-controller lifetime and focus remain Flutter mechanics here. |
| <code>PhoneImportSavedReviewSection</code> | <code>lib/hosts/audience/phone_import/presentation/widgets/phone_import_saved_review_section.dart:9</code> | — | — | Read-only confirmed command, including after a process restart. No native contact identifiers, unused numbers or draft data are rendered here. |
| <code>HostEventEntrySheet</code> | <code>lib/hosts/events/presentation/host_event_entry_sheet.dart:42</code> | — | — | No class documentation or registry summary. |
| <code>HostEventsRouteScaffold</code> | <code>lib/hosts/events/presentation/host_events_screen.dart:109</code> | — | — | No class documentation or registry summary. |
| <code>OrganizerMomentsEntryField</code> | <code>lib/hosts/events/presentation/moments/organizer_moments_entry_field.dart:10</code> | — | — | Manage-screen entry into the event's organizer Moments workspace. |
| <code>HostEventsClubCard</code> | <code>lib/hosts/events/presentation/widgets/host_events_list.dart:34</code> | — | — | No class documentation or registry summary. |
| <code>HostEventsClubSection</code> | <code>lib/hosts/events/presentation/widgets/host_events_list.dart:180</code> | — | — | No class documentation or registry summary. |
| <code>HostEventsTimelineBody</code> | <code>lib/hosts/events/presentation/widgets/host_events_list.dart:371</code> | — | — | One lifecycle page. The root owns tabs and scrolling chrome; this adapter selects data/state only, and the shared page/section/record owners lay it out. |
| <code>ClubBasicsStep</code> | <code>lib/hosts/presentation/club_management/create/widgets/club_basics_step.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>ClubDetailsStep</code> | <code>lib/hosts/presentation/club_management/create/widgets/club_details_step.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ClubEventSuccessDefaultsStep</code> | <code>lib/hosts/presentation/club_management/create/widgets/club_event_success_defaults_step.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ClubHostDefaultsStep</code> | <code>lib/hosts/presentation/club_management/create/widgets/club_host_defaults_step.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>ClubPolicyDefaultsCard</code> | <code>lib/hosts/presentation/club_management/create/widgets/club_host_defaults_step.dart:77</code> | — | — | No class documentation or registry summary. |
| <code>CreateClubContactSection</code> | <code>lib/hosts/presentation/club_management/create/widgets/create_club_contact_section.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ClubProfileImageTile</code> | <code>lib/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart:188</code> | — | — | No class documentation or registry summary. |
| <code>CreateClubPhotosPicker</code> | <code>lib/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>CreateClubProfileImagePicker</code> | <code>lib/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart:99</code> | — | — | No class documentation or registry summary. |
| <code>HostAudienceSourceRuleSection</code> | <code>lib/hosts/presentation/customers/host_audience_source_rule_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostContactMergeCandidateCard</code> | <code>lib/hosts/presentation/customers/host_contact_merge_review_sheet.dart:153</code> | — | — | No class documentation or registry summary. |
| <code>HostContactMergeReviewSheet</code> | <code>lib/hosts/presentation/customers/host_contact_merge_review_sheet.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>HostDismissedMergeCandidateCard</code> | <code>lib/hosts/presentation/customers/host_contact_merge_review_sheet.dart:320</code> | — | — | A merge candidate the host dismissed, with the action to restore it. |
| <code>HostCustomerActiveMergesSection</code> | <code>lib/hosts/presentation/customers/host_customer_active_merges_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerApplicationCard</code> | <code>lib/hosts/presentation/customers/host_customer_applications_section.dart:149</code> | — | — | Displays the same grant-filtered answers as the application detail route. These remain a dated submission rather than becoming editable CRM fields. |
| <code>HostCustomerApplicationsSection</code> | <code>lib/hosts/presentation/customers/host_customer_applications_section.dart:18</code> | — | — | Loads organizer-scoped submissions only when the Details tab is mounted. |
| <code>HostCustomerDetailBody</code> | <code>lib/hosts/presentation/customers/host_customer_detail_body.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerOverviewSectionList</code> | <code>lib/hosts/presentation/customers/host_customer_detail_body.dart:215</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerAttendanceCard</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:389</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerDetailsSection</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:457</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerIdentityCard</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerIdentitySection</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:274</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerRecentEventsList</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:532</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerRevenueCard</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:576</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerRevenueList</code> | <code>lib/hosts/presentation/customers/host_customer_detail_card.dart:664</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerDetailTabBar</code> | <code>lib/hosts/presentation/customers/host_customer_detail_tab_bar.dart:8</code> | — | — | Person-owned peer controls. The workspace owns their height and placement. |
| <code>HostCustomerIdentityInputSection</code> | <code>lib/hosts/presentation/customers/host_customer_editor.dart:187</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerEmailHandoffSheet</code> | <code>lib/hosts/presentation/customers/host_customer_email_sheet.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerFilterSheet</code> | <code>lib/hosts/presentation/customers/host_customer_filter_sheet.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerHistorySection</code> | <code>lib/hosts/presentation/customers/host_customer_history_section.dart:4</code> | — | — | Mounted only by the History tab, so operational joins cannot block Overview. |
| <code>HostCustomerMemoryPreview</code> | <code>lib/hosts/presentation/customers/host_customer_memory_section.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerMemorySection</code> | <code>lib/hosts/presentation/customers/host_customer_memory_section.dart:51</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerNoteSheet</code> | <code>lib/hosts/presentation/customers/host_customer_memory_section.dart:146</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerTagsSheet</code> | <code>lib/hosts/presentation/customers/host_customer_memory_section.dart:244</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerOutreachSheet</code> | <code>lib/hosts/presentation/customers/host_customer_outreach_sheet.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerRecordMenu</code> | <code>lib/hosts/presentation/customers/host_customer_record_menu.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerSourcesSection</code> | <code>lib/hosts/presentation/customers/host_customer_sources_section.dart:4</code> | — | — | Contact provenance is independent of current communication availability. |
| <code>HostCustomerSubmissionsSection</code> | <code>lib/hosts/presentation/customers/host_customer_submissions_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerHistoryFilterSection</code> | <code>lib/hosts/presentation/customers/host_customer_timeline_section.dart:350</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerReachSection</code> | <code>lib/hosts/presentation/customers/host_customer_timeline_section.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerTimelineList</code> | <code>lib/hosts/presentation/customers/host_customer_timeline_section.dart:515</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerTimelineSection</code> | <code>lib/hosts/presentation/customers/host_customer_timeline_section.dart:409</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerWhatsappHandoffSheet</code> | <code>lib/hosts/presentation/customers/host_customer_whatsapp_sheet.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerControlSection</code> | <code>lib/hosts/presentation/customers/host_customers_list.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerFilterSummarySection</code> | <code>lib/hosts/presentation/customers/host_customers_list.dart:57</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomersList</code> | <code>lib/hosts/presentation/customers/host_customers_list.dart:167</code> | — | — | Sliver-native directory. The page owns scrolling; the section builds only visible people and preserves each contact's identity across filter changes. |
| <code>HostCustomersSummarySection</code> | <code>lib/hosts/presentation/customers/host_customers_list.dart:281</code> | — | — | No class documentation or registry summary. |
| <code>HostSaveAudienceSheet</code> | <code>lib/hosts/presentation/customers/host_save_audience_sheet.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedAudienceSection</code> | <code>lib/hosts/presentation/customers/host_saved_audience_section.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedAudienceWorkspace</code> | <code>lib/hosts/presentation/customers/host_saved_audience_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedAudiencesList</code> | <code>lib/hosts/presentation/customers/host_saved_audiences_workspace.dart:37</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedAudiencesWorkspace</code> | <code>lib/hosts/presentation/customers/host_saved_audiences_workspace.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>HostStaticAudienceMembersEditor</code> | <code>lib/hosts/presentation/customers/host_static_audience_members_editor.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>EditHostedEventScopeNotice</code> | <code>lib/hosts/presentation/edit_hosted_event_scope_notice.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostOfferPaymentConfirmationSection</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_confirmation_section.dart:9</code> | — | — | Per-mode confirmation contract: how a paid (or free) offer actually resolves before the host saves. Copy follows the selected mode so the claim about confirmation is honest for the collection path chosen. |
| <code>HostOfferPaymentDetailsSection</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_details_section.dart:20</code> | — | — | The fields a chosen collection mode actually needs: amount/currency for paid modes, validity chips, reusable-page URL + reuse attestation, and the explicit-commit text drawers for instructions and the offer message. All state stays owned by the page body; this section only renders it. |
| <code>HostOfferPaymentModeSection</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_mode_section.dart:11</code> | — | — | The collection-mode decision itself: an expanded picker while the host is choosing, then a collapsed summary tile whose tap (or Change action) reopens the picker. Catch checkout stays visible but gated until provider activation lands. |
| <code>HostOfferPaymentModeTile</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart:46</code> | — | — | One collection-mode option. Catch checkout stays visible but disabled until verified provider activation lands; the rest stage on tap. |
| <code>HostOfferPaymentReviewSheet</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_review_sheet.dart:79</code> | — | — | Server-reviewed diff of the staged payment terms before the command lands. Cancel leaves the draft intact; confirm applies the reviewed request. |
| <code>HostOfferPaymentSetupPageBody</code> | <code>lib/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart:25</code> | — | — | Modeled as a decision, not a preference grid: the host picks how guests pay, sees only the fields that mode needs, and reads how payment confirmation works before saving. Draft edits stage on the controller; Save runs the server preview and an explicit confirm keeps the reviewed commit. |
| <code>HostPrivateEventBasicsSection</code> | <code>lib/hosts/presentation/event_management/create/host_private_event_basics_section.dart:8</code> | — | — | Presentation-only first-save fields. The route owns draft and command state. |
| <code>HostPrivateEventListingSection</code> | <code>lib/hosts/presentation/event_management/create/host_private_event_listing_section.dart:18</code> | — | — | Listing fields on the existing private-event editor. Local terms stay a draft until saved together; setting a price does not open registration. |
| <code>PrivateEventContentSection</code> | <code>lib/hosts/presentation/event_management/create/private_event_content_section.dart:26</code> | — | — | Optional content uses the same editors as the complete create flow. Each saved edit goes through the private setup revision and retry journal. |
| <code>CreateEventDockSkeleton</code> | <code>lib/hosts/presentation/event_management/host_create_event_route_loading_screen.dart:92</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventLoadingBody</code> | <code>lib/hosts/presentation/event_management/host_create_event_route_loading_screen.dart:39</code> | — | — | No class documentation or registry summary. |
| <code>LoadingChipRow</code> | <code>lib/hosts/presentation/event_management/host_create_event_route_loading_screen.dart:70</code> | — | — | No class documentation or registry summary. |
| <code>HostCreateEventRouteBody</code> | <code>lib/hosts/presentation/event_management/host_create_event_screen.dart:146</code> | — | — | No class documentation or registry summary. |
| <code>HostPrivateEventSetupInventorySection</code> | <code>lib/hosts/presentation/event_management/host_private_event_setup_inventory_section.dart:22</code> | — | — | Private events are read from the manager API, never from the public rich Event feed or this device's local draft store. |
| <code>CreateEventAdaptiveWorkspace</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart:13</code> | — | — | Route-owned adaptive composition for Create Event. |
| <code>CreateEventConsequenceSection</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart:133</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventStepRail</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart:85</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventWorkspaceLayout</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart:62</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventGuestsSection</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_guests_section.dart:10</code> | — | — | Guest source and runtime access; ticketing rules belong to EventPolicyStep. |
| <code>CreateEventPhotoPicker</code> | <code>lib/hosts/presentation/event_management/widgets/create_event_photo_picker.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>DraftCard</code> | <code>lib/hosts/presentation/event_management/widgets/draft_picker_sheet.dart:44</code> | — | — | No class documentation or registry summary. |
| <code>EventAgeRangeField</code> | <code>lib/hosts/presentation/event_management/widgets/event_age_range_field.dart:14</code> | — | — | Canonical Host event age selector. |
| <code>EventDetailsStep</code> | <code>lib/hosts/presentation/event_management/widgets/event_details_step.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>EventGuestDetailsSection</code> | <code>lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart:9</code> | — | — | Optional public notes shared by creation, editing and private event setup. |
| <code>EventItineraryEditor</code> | <code>lib/hosts/presentation/event_management/widgets/event_itinerary_editor.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>EventPolicyStep</code> | <code>lib/hosts/presentation/event_management/widgets/event_policy_step.dart:28</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessStep</code> | <code>lib/hosts/presentation/event_management/widgets/event_success_step.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>RouteEventPlanEditor</code> | <code>lib/hosts/presentation/event_management/widgets/route_event_plan_editor.dart:20</code> | — | — | Composes route operations independently from the event's broader format. |
| <code>WhenStep</code> | <code>lib/hosts/presentation/event_management/widgets/when_step.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedPlacesSection</code> | <code>lib/hosts/presentation/event_management/widgets/where_step.dart:210</code> | — | — | No class documentation or registry summary. |
| <code>WhereStep</code> | <code>lib/hosts/presentation/event_management/widgets/where_step.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostAutomationRuleEditor</code> | <code>lib/hosts/presentation/forms/host_automation_rule_editor.dart:4</code> | — | — | Explicit approval of a versioned rule; no customer actions run in the editor. |
| <code>HostEventOfferReviewSection</code> | <code>lib/hosts/presentation/forms/host_event_offer_review_section.dart:60</code> | — | — | One selected current CRM contact and manager-visible future event are supplied by the parent flow. Preview never reserves or admits a guest. |
| <code>HostManualPaymentReviewSection</code> | <code>lib/hosts/presentation/forms/host_event_offer_review_section.dart:189</code> | — | — | Reference text is an unverified assertion. Host review is a deliberate manual bank check, with no provider capture or event admission consequence. |
| <code>HostEventOfferWorkspaceBodySection</code> | <code>lib/hosts/presentation/forms/host_event_offer_workspace_section.dart:149</code> | — | — | No class documentation or registry summary. |
| <code>HostEventOfferWorkspaceContentSection</code> | <code>lib/hosts/presentation/forms/host_event_offer_workspace_section.dart:312</code> | — | — | Pure content composition; the parent owns controller lifetime and listeners. |
| <code>HostEventOfferWorkspaceLayout</code> | <code>lib/hosts/presentation/forms/host_event_offer_workspace_section.dart:292</code> | — | — | No class documentation or registry summary. |
| <code>HostEventOfferWorkspaceSection</code> | <code>lib/hosts/presentation/forms/host_event_offer_workspace_section.dart:24</code> | — | — | One manager's reviewed query selection. No offer is prepared from a list label alone: every selected response is read again and the materialized query hash is rechecked after the event choice and an inline return. |
| <code>HostFormAdmissionSection</code> | <code>lib/hosts/presentation/forms/host_form_admission_section.dart:9</code> | — | — | Review and confirm are distinct actions; preview never admits a guest. |
| <code>HostFormAvailabilityField</code> | <code>lib/hosts/presentation/forms/host_form_availability_field.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostFormBody</code> | <code>lib/hosts/presentation/forms/host_form_body.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>HostFormQuestionField</code> | <code>lib/hosts/presentation/forms/host_form_body.dart:106</code> | — | — | No class documentation or registry summary. |
| <code>HostFormEditorNotice</code> | <code>lib/hosts/presentation/forms/host_form_editor_notice.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostFormEditorViewport</code> | <code>lib/hosts/presentation/forms/host_form_editor_viewport.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostFormInspectorSection</code> | <code>lib/hosts/presentation/forms/host_form_editor_viewport.dart:241</code> | — | — | No class documentation or registry summary. |
| <code>HostFormOutlineMenu</code> | <code>lib/hosts/presentation/forms/host_form_editor_viewport.dart:176</code> | — | — | No class documentation or registry summary. |
| <code>HostFormSectionField</code> | <code>lib/hosts/presentation/forms/host_form_editor_viewport.dart:97</code> | — | — | No class documentation or registry summary. |
| <code>HostFormMetricRow</code> | <code>lib/hosts/presentation/forms/host_form_metric_row.dart:5</code> | — | — | Form-workspace statistics composed from the canonical unboxed stat primitive. |
| <code>HostFormNumberField</code> | <code>lib/hosts/presentation/forms/host_form_number_field.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostFormOverviewSectionList</code> | <code>lib/hosts/presentation/forms/host_form_overview_section_list.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPaymentDetailSheet</code> | <code>lib/hosts/presentation/forms/host_form_payment_detail_sheet.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPaymentSection</code> | <code>lib/hosts/presentation/forms/host_form_payment_section.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPaymentSetupSection</code> | <code>lib/hosts/presentation/forms/host_form_payment_section.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPaymentSheet</code> | <code>lib/hosts/presentation/forms/host_form_payment_sheet.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPaymentsSectionList</code> | <code>lib/hosts/presentation/forms/host_form_payments_section_list.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostFormQuestionSection</code> | <code>lib/hosts/presentation/forms/host_form_question_section.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPublishText</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:173</code> | — | — | No class documentation or registry summary. |
| <code>HostFormQuestionRowList</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:298</code> | — | — | No class documentation or registry summary. |
| <code>HostFormQuestionSectionList</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:78</code> | — | — | No class documentation or registry summary. |
| <code>HostFormQuestionsPageBody</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostFormSectionAccordion</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:204</code> | — | — | No class documentation or registry summary. |
| <code>HostFormSettingsMenu</code> | <code>lib/hosts/presentation/forms/host_form_questions_page_body.dart:135</code> | — | — | No class documentation or registry summary. |
| <code>HostFormResponsesSection</code> | <code>lib/hosts/presentation/forms/host_form_responses_section.dart:37</code> | — | — | No class documentation or registry summary. |
| <code>HostFormSettingsSectionList</code> | <code>lib/hosts/presentation/forms/host_form_settings_section_list.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostFormTargetSection</code> | <code>lib/hosts/presentation/forms/host_form_target_section.dart:16</code> | — | — | Draft-only binding for reusable intake or one specifically selected event. |
| <code>HostFormValidationFieldLanes</code> | <code>lib/hosts/presentation/forms/host_form_validation_field_lanes.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostFormValidationTextField</code> | <code>lib/hosts/presentation/forms/host_form_validation_text_field.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostFormWorkspaceHeader</code> | <code>lib/hosts/presentation/forms/host_form_workspace_header.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseAnswerRow</code> | <code>lib/hosts/presentation/forms/host_response_answer_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseMetadataSection</code> | <code>lib/hosts/presentation/forms/host_response_answer_section.dart:47</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseContactSection</code> | <code>lib/hosts/presentation/forms/host_response_detail_section.dart:405</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseDetailSection</code> | <code>lib/hosts/presentation/forms/host_response_detail_section.dart:43</code> | — | — | No class documentation or registry summary. |
| <code>HostResponsePrimaryAction</code> | <code>lib/hosts/presentation/forms/host_response_detail_section.dart:492</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseReviewNoteField</code> | <code>lib/hosts/presentation/forms/host_response_detail_section.dart:572</code> | — | — | Uses the shared explicit-save field so actions participate in its reveal, keyboard focus and cancellation behavior rather than floating below it. |
| <code>HostResponseStartReviewAction</code> | <code>lib/hosts/presentation/forms/host_response_detail_section.dart:367</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseExportAction</code> | <code>lib/hosts/presentation/forms/host_response_export_action.dart:13</code> | — | — | Inline action for the applied manager query; it shares the response workspace instead of starting a second, unrelated export screen. |
| <code>HostResponseConditionSection</code> | <code>lib/hosts/presentation/forms/host_response_query_editor_parts_section.dart:112</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseConditionValueSection</code> | <code>lib/hosts/presentation/forms/host_response_query_editor_parts_section.dart:228</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseGroupSection</code> | <code>lib/hosts/presentation/forms/host_response_query_editor_parts_section.dart:5</code> | — | — | Recursive group rendering is a widget tree. The editor state alone owns draft mutation, so replacing any branch creates one new immutable root. |
| <code>HostResponseValueFieldSection</code> | <code>lib/hosts/presentation/forms/host_response_query_editor_parts_section.dart:329</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseQueryEditorSection</code> | <code>lib/hosts/presentation/forms/host_response_query_editor_section.dart:54</code> | — | — | A bounded editor for one immutable published version's permitted fields. The caller owns loading, page state and the actual manager callable. |
| <code>HostResponseQueryWorkspaceSection</code> | <code>lib/hosts/presentation/forms/host_response_query_workspace_section.dart:93</code> | — | — | Manager query workspace for one published form version. Its bulk callback carries review intent only; the write endpoint must independently recheck current manager, response, identity, query hash and conversion authority. |
| <code>HostAudienceHeader</code> | <code>lib/hosts/presentation/host_audience_header.dart:6</code> | — | — | Shared Audience header; the canonical root scaffold owns each tab's body. |
| <code>HostAudienceNoOrganizerEmptyState</code> | <code>lib/hosts/presentation/host_audience_no_organizer_empty_state.dart:9</code> | — | — | The no-organizer state for all four Audience destinations. |
| <code>HostAudienceStateScaffold</code> | <code>lib/hosts/presentation/host_audience_view.dart:23</code> | — | — | Canonical Audience destination owner for route-level loading, auth, error, and no-organizer states. |
| <code>HostAudienceTabRail</code> | <code>lib/hosts/presentation/host_audience_view.dart:65</code> | — | — | No class documentation or registry summary. |
| <code>HostEventPublicationStateScaffold</code> | <code>lib/hosts/presentation/host_event_publication_route_screen.dart:82</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsPeriodInput</code> | <code>lib/hosts/presentation/host_operations/host_analytics_period_input.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsBarTile</code> | <code>lib/hosts/presentation/host_operations/host_analytics_trend_section.dart:129</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsTrendSection</code> | <code>lib/hosts/presentation/host_operations/host_analytics_trend_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubEditBody</code> | <code>lib/hosts/presentation/host_operations/host_club_edit_body.dart:25</code> | — | — | No class documentation or registry summary. |
| <code>HostClubPublicationChannelRow</code> | <code>lib/hosts/presentation/host_operations/host_club_edit_body.dart:669</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsEventList</code> | <code>lib/hosts/presentation/host_operations/host_club_insights_section.dart:464</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsReportBody</code> | <code>lib/hosts/presentation/host_operations/host_club_insights_section.dart:269</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsReviewsSection</code> | <code>lib/hosts/presentation/host_operations/host_club_insights_section.dart:534</code> | — | — | No class documentation or registry summary. |
| <code>HostClubInsightsSection</code> | <code>lib/hosts/presentation/host_operations/host_club_insights_section.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>HostClubLogoManagerHeader</code> | <code>lib/hosts/presentation/host_operations/host_club_media_rail.dart:109</code> | — | — | The media manager's logo picker header. |
| <code>HostClubMediaManagerDock</code> | <code>lib/hosts/presentation/host_operations/host_club_media_rail.dart:172</code> | — | — | The media manager's save action and error line. |
| <code>HostClubMediaRail</code> | <code>lib/hosts/presentation/host_operations/host_club_media_rail.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubOrganizerSectionList</code> | <code>lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostCrmAudienceCard</code> | <code>lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart:41</code> | — | — | No class documentation or registry summary. |
| <code>HostCrmChannelRow</code> | <code>lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart:165</code> | — | — | No class documentation or registry summary. |
| <code>HostOrganizerMetricGrid</code> | <code>lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart:194</code> | — | — | No class documentation or registry summary. |
| <code>HostOrganizerMetricRow</code> | <code>lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart:246</code> | — | — | No class documentation or registry summary. |
| <code>HostClubDefaultsEditor</code> | <code>lib/hosts/presentation/host_operations/host_club_spoke_scaffold.dart:158</code> | — | — | No class documentation or registry summary. |
| <code>HostClubReadOnlyDefaultsSection</code> | <code>lib/hosts/presentation/host_operations/host_club_spoke_scaffold.dart:244</code> | — | — | No class documentation or registry summary. |
| <code>HostClubSpokeAsyncBoundary</code> | <code>lib/hosts/presentation/host_operations/host_club_spoke_scaffold.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubSpokeScaffold</code> | <code>lib/hosts/presentation/host_operations/host_club_spoke_scaffold.dart:127</code> | — | — | No class documentation or registry summary. |
| <code>HostTeamProfessionalProfilePreview</code> | <code>lib/hosts/presentation/host_operations/host_club_team_screen.dart:338</code> | — | — | Read-only projection of the professional identity edited in Host team. This intentionally consumes [HostTeamProfileState] rather than the dating profile collection: a host can have a valid organizer identity without a discoverable consumer profile. |
| <code>HostTeamProfileList</code> | <code>lib/hosts/presentation/host_operations/host_club_team_screen.dart:529</code> | — | — | No class documentation or registry summary. |
| <code>HostTeamProfileSection</code> | <code>lib/hosts/presentation/host_operations/host_club_team_screen.dart:456</code> | — | — | No class documentation or registry summary. |
| <code>HostClubsScaffold</code> | <code>lib/hosts/presentation/host_operations/host_clubs_scaffold.dart:72</code> | — | — | No class documentation or registry summary. |
| <code>HostOrganizerStateScaffold</code> | <code>lib/hosts/presentation/host_operations/host_clubs_scaffold.dart:24</code> | — | — | Organizer route-state adapter that preserves the loaded workspace chrome. |
| <code>HostManagerEventSetupPreferencesSection</code> | <code>lib/hosts/presentation/host_operations/host_manager_event_setup_preferences_section.dart:10</code> | — | — | Editor for a manager-authorized setup-preferences projection. No field is read from the public Club document, and a null onChanged disables writes until a revision-fenced manager settings command is available. |
| <code>HostTeamHostedClubsSection</code> | <code>lib/hosts/presentation/host_operations/host_team_hosted_clubs_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostWhatsappSetupSection</code> | <code>lib/hosts/presentation/host_operations/host_whatsapp_setup_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostTrackingSettingsSection</code> | <code>lib/hosts/presentation/host_tracking_settings_section.dart:18</code> | — | — | Settings remain in the organiser Insights workspace; server owns eligibility. |
| <code>HostedEventPolicySection</code> | <code>lib/hosts/presentation/hosted_event_policy_section.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostedEventScheduleSection</code> | <code>lib/hosts/presentation/hosted_event_schedule_section.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>HostBroadcastComposerSheet</code> | <code>lib/hosts/presentation/inbox/host_broadcast_composer_sheet.dart:57</code> | — | — | No class documentation or registry summary. |
| <code>HostCampaignEditor</code> | <code>lib/hosts/presentation/inbox/host_campaign_editor.dart:46</code> | — | — | No class documentation or registry summary. |
| <code>HostCampaignReportSection</code> | <code>lib/hosts/presentation/inbox/host_campaign_editor.dart:576</code> | — | — | No class documentation or registry summary. |
| <code>HostEventAnnouncementField</code> | <code>lib/hosts/presentation/inbox/host_event_announcement_field.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>HostFollowerUpdateComposerSheet</code> | <code>lib/hosts/presentation/inbox/host_follower_update_composer_sheet.dart:44</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxPersonPageBody</code> | <code>lib/hosts/presentation/inbox/host_inbox_person_page_body.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxScopeMenu</code> | <code>lib/hosts/presentation/inbox/host_inbox_scope_menu.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxAudienceInput</code> | <code>lib/hosts/presentation/inbox/host_inbox_workspace_section.dart:333</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxEmptyState</code> | <code>lib/hosts/presentation/inbox/host_inbox_workspace_section.dart:484</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxPeopleSection</code> | <code>lib/hosts/presentation/inbox/host_inbox_workspace_section.dart:387</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxWorkspaceSection</code> | <code>lib/hosts/presentation/inbox/host_inbox_workspace_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostMessagingWorkspaceTabBar</code> | <code>lib/hosts/presentation/inbox/host_inbox_workspace_section.dart:301</code> | — | — | No class documentation or registry summary. |
| <code>HostManualSendList</code> | <code>lib/hosts/presentation/inbox/host_manual_send_list.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostManualSendListBody</code> | <code>lib/hosts/presentation/inbox/host_manual_send_list.dart:163</code> | — | — | No class documentation or registry summary. |
| <code>HostManualSendTaskSheet</code> | <code>lib/hosts/presentation/inbox/host_manual_send_list.dart:247</code> | — | — | One manual send: the recipient, the prepared message and its delivery actions. |
| <code>HostNewMessageRouteSection</code> | <code>lib/hosts/presentation/inbox/host_new_message_screen.dart:255</code> | — | — | No class documentation or registry summary. |
| <code>HostPersonConversationMenu</code> | <code>lib/hosts/presentation/inbox/host_person_conversation_menu.dart:15</code> | — | — | Keeps the existing Catch conversation actions available in the shared pane. The parent supplies only a currently authorized source and its messages. |
| <code>HostPersonConversationPageBody</code> | <code>lib/hosts/presentation/inbox/host_person_conversation_page_body.dart:24</code> | — | — | Embedded presentation: the route/workspace owns Scaffold and keyboard insets. |
| <code>HostSendIntentMenu</code> | <code>lib/hosts/presentation/inbox/host_send_intent_menu.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostSendsBackButton</code> | <code>lib/hosts/presentation/inbox/host_sends_back_button.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>HostSendsPageBody</code> | <code>lib/hosts/presentation/inbox/host_sends_page_body.dart:35</code> | — | — | No class documentation or registry summary. |
| <code>HostWhatsappThreadSheet</code> | <code>lib/hosts/presentation/inbox/host_whatsapp_thread_sheet.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostPaymentAccountCard</code> | <code>lib/hosts/presentation/payments/host_payment_account_card.dart:34</code> | — | — | No class documentation or registry summary. |
| <code>HostPaymentAccountErrorCard</code> | <code>lib/hosts/presentation/payments/host_payment_account_card.dart:669</code> | — | — | No class documentation or registry summary. |
| <code>HostPaymentAccountLoadingCard</code> | <code>lib/hosts/presentation/payments/host_payment_account_card.dart:640</code> | — | — | No class documentation or registry summary. |
| <code>HostPaymentAccountControllerCard</code> | <code>lib/hosts/presentation/payments/host_payment_account_controller_card.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostPaymentAccountSection</code> | <code>lib/hosts/presentation/payments/host_payment_account_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostAnalyticsObservedStagesSection</code> | <code>lib/hosts/presentation/widgets/host_analytics_observed_stages_section.dart:8</code> | — | — | Observed period stage counts with source completeness, without cohort joins. |
| <code>HostAnalyticsPresenceSection</code> | <code>lib/hosts/presentation/widgets/host_analytics_presence_section.dart:8</code> | — | — | Public presence totals with explicit unavailable-data and measurement limits. |
| <code>HostAnalyticsReportLoadingIndicator</code> | <code>lib/hosts/presentation/widgets/host_analytics_report_loading_indicator.dart:5</code> | — | — | Analytics recommendations, events, and quality panels depend on the report. |
| <code>HostAttendanceOutboxNotice</code> | <code>lib/hosts/presentation/widgets/host_attendance_outbox_notice.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostBookingProviderSection</code> | <code>lib/hosts/presentation/widgets/host_booking_provider_section.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostEventCheckInQrSection</code> | <code>lib/hosts/presentation/widgets/host_event_check_in_qr_section.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostEventLiveLocationField</code> | <code>lib/hosts/presentation/widgets/host_event_live_location_field.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>HostActionRow</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:228</code> | — | — | No class documentation or registry summary. |
| <code>HostCapacitySection</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>HostEventActionsSection</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:120</code> | — | — | No class documentation or registry summary. |
| <code>HostEventSummaryRow</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:429</code> | — | — | No class documentation or registry summary. |
| <code>HostEventSummarySection</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:375</code> | — | — | No class documentation or registry summary. |
| <code>HostFullCapacityBanner</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:90</code> | — | — | No class documentation or registry summary. |
| <code>HostPublicRegistrationField</code> | <code>lib/hosts/presentation/widgets/host_event_manage_section.dart:257</code> | — | — | No class documentation or registry summary. |
| <code>HostEventParticipantsSection</code> | <code>lib/hosts/presentation/widgets/host_event_participants_section.dart:47</code> | — | — | No class documentation or registry summary. |
| <code>HostEventParticipantsSectionList</code> | <code>lib/hosts/presentation/widgets/host_event_participants_section_list.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostParticipationLifecycleSection</code> | <code>lib/hosts/presentation/widgets/host_event_participants_section_list.dart:110</code> | — | — | No class documentation or registry summary. |
| <code>HostInviteLinkRow</code> | <code>lib/hosts/presentation/widgets/host_event_private_access_section.dart:372</code> | — | — | No class documentation or registry summary. |
| <code>HostInviteLinksSection</code> | <code>lib/hosts/presentation/widgets/host_event_private_access_section.dart:248</code> | — | — | No class documentation or registry summary. |
| <code>HostPrivateAccessAsyncBoundary</code> | <code>lib/hosts/presentation/widgets/host_event_private_access_section.dart:27</code> | — | — | No class documentation or registry summary. |
| <code>HostPrivateAccessSection</code> | <code>lib/hosts/presentation/widgets/host_event_private_access_section.dart:133</code> | — | — | No class documentation or registry summary. |
| <code>HostPrivateAccessSurface</code> | <code>lib/hosts/presentation/widgets/host_event_private_access_section.dart:118</code> | — | — | No class documentation or registry summary. |
| <code>HostEventReviewsPanel</code> | <code>lib/hosts/presentation/widgets/host_event_reviews_panel.dart:17</code> | — | — | Host-owned review workspace for one event. |
| <code>HostEventRosterSection</code> | <code>lib/hosts/presentation/widgets/host_event_roster_section.dart:6</code> | — | — | Event roster content. The Host router owns its parent and pane placement. |
| <code>HostEventStaffSection</code> | <code>lib/hosts/presentation/widgets/host_event_staff_section.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>HostEventToolCard</code> | <code>lib/hosts/presentation/widgets/host_event_tools_rail.dart:212</code> | — | — | No class documentation or registry summary. |
| <code>HostEventToolsPageIndicator</code> | <code>lib/hosts/presentation/widgets/host_event_tools_rail.dart:159</code> | — | — | No class documentation or registry summary. |
| <code>HostEventToolsRail</code> | <code>lib/hosts/presentation/widgets/host_event_tools_rail.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>HostInlineIconSkeleton</code> | <code>lib/hosts/presentation/widgets/host_loading_skeleton.dart:8</code> | — | — | A leaf placeholder used where only an inline icon is unresolved. |
| <code>HostLumaConnectionSheet</code> | <code>lib/hosts/presentation/widgets/host_luma_connection_sheet.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostLumaEventChoiceSheet</code> | <code>lib/hosts/presentation/widgets/host_luma_connection_sheet.dart:128</code> | — | — | No class documentation or registry summary. |
| <code>HostManualAttendeeSheet</code> | <code>lib/hosts/presentation/widgets/host_manual_attendee_sheet.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostGuestIntakeField</code> | <code>lib/hosts/presentation/widgets/host_operational_roster_section.dart:46</code> | — | — | No class documentation or registry summary. |
| <code>HostGuestIntakeSettingsField</code> | <code>lib/hosts/presentation/widgets/host_operational_roster_section.dart:73</code> | — | — | No class documentation or registry summary. |
| <code>HostOperationalRosterSection</code> | <code>lib/hosts/presentation/widgets/host_operational_roster_section.dart:204</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterInsightRail</code> | <code>lib/hosts/presentation/widgets/host_operational_roster_section.dart:537</code> | — | — | No class documentation or registry summary. |
| <code>HostRuntimeClaimList</code> | <code>lib/hosts/presentation/widgets/host_operational_roster_section.dart:675</code> | — | — | No class documentation or registry summary. |
| <code>HostOrganizerAvatar</code> | <code>lib/hosts/presentation/widgets/host_organizer_switcher_sheet.dart:23</code> | — | — | No class documentation or registry summary. |
| <code>HostOrganizerSwitcherSheet</code> | <code>lib/hosts/presentation/widgets/host_organizer_switcher_sheet.dart:54</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterFilterHeader</code> | <code>lib/hosts/presentation/widgets/host_roster_filter_header.dart:30</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterSearchField</code> | <code>lib/hosts/presentation/widgets/host_roster_filter_header.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostWaitlistBulkOfferNotice</code> | <code>lib/hosts/presentation/widgets/host_roster_filter_header.dart:92</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterHandoffSheet</code> | <code>lib/hosts/presentation/widgets/host_roster_handoff_sheet.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterImportSheet</code> | <code>lib/hosts/presentation/widgets/host_roster_import_sheet.dart:25</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterIntakeReviewSheet</code> | <code>lib/hosts/presentation/widgets/host_roster_intake_review_sheet.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>HostRosterMappingField</code> | <code>lib/hosts/presentation/widgets/host_roster_mapping_field.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>HostStepperDock</code> | <code>lib/hosts/presentation/widgets/host_stepper_dock.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostTeamAddHostSheet</code> | <code>lib/hosts/presentation/widgets/host_team_management_section.dart:350</code> | — | — | No class documentation or registry summary. |
| <code>HostTeamManagementSection</code> | <code>lib/hosts/presentation/widgets/host_team_management_section.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>HostTeamOwnerHostRow</code> | <code>lib/hosts/presentation/widgets/host_team_management_section.dart:262</code> | — | — | No class documentation or registry summary. |
| <code>HostTrackingSettingsInputSection</code> | <code>lib/hosts/presentation/widgets/host_tracking_settings_input_section.dart:11</code> | — | — | Provider-free tracking configuration fields; activation remains policy blocked. |
| <code>HostWizardStepHeader</code> | <code>lib/hosts/presentation/widgets/host_wizard_step_header.dart:7</code> | — | — | Shared Host wizard chrome for club and event creation. |
| <code>ParticipantDecisionButton</code> | <code>lib/hosts/presentation/widgets/participant_table.dart:231</code> | — | — | No class documentation or registry summary. |
| <code>ParticipantRow</code> | <code>lib/hosts/presentation/widgets/participant_table.dart:81</code> | <code>Row</code> | — | Design-system `RosterRow` (`components/hosting/RosterBoard`): one participant — avatar, condensed name over a mono meta line, a signal [CatchBadge], and a spec-driven [action] cell. Columns are fixed 5/3/3 to match [ParticipantTable]. Also called: <code>RosterRow</code>, <code>AttendeeRow</code>, <code>GuestRow</code>. |
| <code>ParticipantRowAction</code> | <code>lib/hosts/presentation/widgets/participant_table.dart:156</code> | — | — | No class documentation or registry summary. |
| <code>ParticipantTable</code> | <code>lib/hosts/presentation/widgets/participant_table.dart:281</code> | <code>Table</code> | — | Host participant table: binds roster rows into CatchTable and keeps a compact field list below the table breakpoint. Also called: <code>RosterTable</code>, <code>AttendeeTable</code>, <code>GuestTable</code>, <code>RosterBoard</code>. |
| <code>HostTodayFocusPageBody</code> | <code>lib/hosts/today/personalization/presentation/host_today_focus_page_body.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayPersonalizationSection</code> | <code>lib/hosts/today/personalization/presentation/host_today_personalization_section.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayPersonalizedLayout</code> | <code>lib/hosts/today/personalization/presentation/host_today_personalized_layout.dart:23</code> | — | — | Owns quiet-day personalization only. The existing Today projection retains its complete loading, error, event and attention presentation unchanged. |
| <code>HostTodayOrganizerEmptyState</code> | <code>lib/hosts/today/presentation/host_today_screen.dart:538</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayBody</code> | <code>lib/hosts/today/presentation/widgets/host_today_body.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayEmptyState</code> | <code>lib/hosts/today/presentation/widgets/host_today_body.dart:94</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayHeader</code> | <code>lib/hosts/today/presentation/widgets/host_today_body.dart:77</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayEventMetadataRow</code> | <code>lib/hosts/today/presentation/widgets/host_today_event_section.dart:127</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayEventMetricTile</code> | <code>lib/hosts/today/presentation/widgets/host_today_event_section.dart:157</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayEventSection</code> | <code>lib/hosts/today/presentation/widgets/host_today_event_section.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayAttentionSection</code> | <code>lib/hosts/today/presentation/widgets/host_today_overview.dart:166</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayOverview</code> | <code>lib/hosts/today/presentation/widgets/host_today_overview.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>HostWorkPageBody</code> | <code>lib/hosts/work/presentation/host_work_screen.dart:121</code> | — | — | The resolved assignment picker, grouped by organizer. |
| <code>PhotoGrid</code> | <code>lib/image_uploads/shared/photo_grid.dart:31</code> | — | — | A 3×2 grid of photo slots for displaying and editing a user's profile photos. |
| <code>PhotoPlaceholderImage</code> | <code>lib/image_uploads/shared/photo_slot_tile.dart:247</code> | — | — | No class documentation or registry summary. |
| <code>PhotoSlotTile</code> | <code>lib/image_uploads/shared/photo_slot_tile.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePhotoEditorPreview</code> | <code>lib/image_uploads/shared/profile_photo_editor_screen.dart:389</code> | — | — | No class documentation or registry summary. |
| <code>LaunchAccessApplicationForm</code> | <code>lib/launch_access/presentation/launch_access_application_screen.dart:171</code> | — | — | No class documentation or registry summary. |
| <code>LaunchAccessChoiceSkeleton</code> | <code>lib/launch_access/presentation/launch_access_application_screen.dart:137</code> | — | — | No class documentation or registry summary. |
| <code>LaunchAccessLoadingBody</code> | <code>lib/launch_access/presentation/launch_access_application_screen.dart:92</code> | — | — | No class documentation or registry summary. |
| <code>LocationMap</code> | <code>lib/locations/shared/location_map.dart:205</code> | — | — | No class documentation or registry summary. |
| <code>MapPreview</code> | <code>lib/locations/shared/map_preview.dart:13</code> | <code>Preview</code> | — | A read-only, attribution-safe Google Maps viewport for compact previews. Also called: <code>LocationPreview</code>, <code>StaticMap</code>, <code>MiniMap</code>, <code>MapThumbnail</code>. |
| <code>MatchCelebrationDialog</code> | <code>lib/matches/shared/match_celebration_dialog.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>ForegroundNotificationListener</code> | <code>lib/notifications/presentation/foreground_notification_listener.dart:12</code> | — | — | App-level presentation adapter. Delivery never reads BuildContext; the shared notice never parses FCM, authenticates a user or chooses a route. |
| <code>OnboardingStepBody</code> | <code>lib/onboarding/presentation/onboarding_screen.dart:140</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingTopBar</code> | <code>lib/onboarding/presentation/onboarding_screen.dart:180</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingGenderInterestBody</code> | <code>lib/onboarding/presentation/pages/onboarding_gender_interest_step.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingGenderInterestStep</code> | <code>lib/onboarding/presentation/pages/onboarding_gender_interest_step.dart:113</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingInstagramBody</code> | <code>lib/onboarding/presentation/pages/onboarding_instagram_step.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingInstagramStep</code> | <code>lib/onboarding/presentation/pages/onboarding_instagram_step.dart:70</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingNameDobBody</code> | <code>lib/onboarding/presentation/pages/onboarding_name_dob_step.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingNameDobStep</code> | <code>lib/onboarding/presentation/pages/onboarding_name_dob_step.dart:172</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingPhotosBody</code> | <code>lib/onboarding/presentation/pages/onboarding_photos_step.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingPhotosStep</code> | <code>lib/onboarding/presentation/pages/onboarding_photos_step.dart:91</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingProfilePromptsBody</code> | <code>lib/onboarding/presentation/pages/onboarding_profile_prompts_step.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingProfilePromptsStep</code> | <code>lib/onboarding/presentation/pages/onboarding_profile_prompts_step.dart:131</code> | — | — | No class documentation or registry summary. |
| <code>PromptField</code> | <code>lib/onboarding/presentation/pages/onboarding_profile_prompts_step.dart:194</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingRunningPrefsBody</code> | <code>lib/onboarding/presentation/pages/onboarding_running_prefs_step.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingRunningPrefsStep</code> | <code>lib/onboarding/presentation/pages/onboarding_running_prefs_step.dart:163</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingWelcomeBody</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>WelcomeFocusText</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:412</code> | — | — | The fixed grammatical focus slot shared by the Consumer boot handoff and the moving Welcome reel. |
| <code>WelcomeReelList</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:556</code> | — | — | No class documentation or registry summary. |
| <code>WelcomeReelRow</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:635</code> | — | — | No class documentation or registry summary. |
| <code>WelcomeRevealTransition</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:767</code> | — | — | No class documentation or registry summary. |
| <code>WelcomeSceneLayout</code> | <code>lib/onboarding/presentation/pages/onboarding_welcome_body.dart:222</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingStepLayout</code> | <code>lib/onboarding/shared/onboarding_step_layout.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>OrganizerAuthorityBadge</code> | <code>lib/organizers/presentation/organizer_authority_badge.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>PaymentCheckoutHeader</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:191</code> | — | — | No class documentation or registry summary. |
| <code>PaymentCheckoutSheet</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:256</code> | — | — | No class documentation or registry summary. |
| <code>PaymentConfirmationBody</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:493</code> | — | — | No class documentation or registry summary. |
| <code>PaymentConfirmationNotice</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:623</code> | — | — | No class documentation or registry summary. |
| <code>PaymentConfirmedBody</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:444</code> | — | — | No class documentation or registry summary. |
| <code>PaymentPendingBody</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:71</code> | — | — | No class documentation or registry summary. |
| <code>PaymentPendingCheckoutBody</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:130</code> | — | — | No class documentation or registry summary. |
| <code>PaymentReferralBanner</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:653</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistoryBody</code> | <code>lib/payments/presentation/payment_history_screen.dart:66</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistoryList</code> | <code>lib/payments/presentation/payment_history_screen.dart:97</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistorySkeleton</code> | <code>lib/payments/presentation/payment_history_screen.dart:147</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistoryTile</code> | <code>lib/payments/presentation/payment_history_screen.dart:215</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistoryTileSkeleton</code> | <code>lib/payments/presentation/payment_history_screen.dart:169</code> | — | — | No class documentation or registry summary. |
| <code>PaymentReceiptSheet</code> | <code>lib/payments/presentation/payment_history_screen.dart:315</code> | — | — | No class documentation or registry summary. |
| <code>ProgramArrivalActionMenu</code> | <code>lib/programs/presentation/program_arrivals_screen.dart:400</code> | — | — | No class documentation or registry summary. |
| <code>ProgramArrivalReadinessBadge</code> | <code>lib/programs/presentation/program_arrivals_screen.dart:361</code> | — | — | No class documentation or registry summary. |
| <code>ProgramArrivalRow</code> | <code>lib/programs/presentation/program_arrivals_screen.dart:246</code> | — | — | No class documentation or registry summary. |
| <code>ProgramFunctionAttendanceRow</code> | <code>lib/programs/presentation/program_attendance_report_screen.dart:210</code> | — | — | One function's attendance reconciliation: invited vs attended vs checked-in, plus the exception counts needing follow-up. |
| <code>ProgramAttentionRow</code> | <code>lib/programs/presentation/program_attention_screen.dart:107</code> | — | — | No class documentation or registry summary. |
| <code>ProgramCreatePageBody</code> | <code>lib/programs/presentation/program_create_screen.dart:226</code> | — | — | Rendering and Flutter field mechanics only. Validation, pending commands, receipt recovery, and list confirmation belong to the injected controller. |
| <code>ProgramDispatchGroupTile</code> | <code>lib/programs/presentation/program_dispatch_screen.dart:225</code> | — | — | No class documentation or registry summary. |
| <code>ProgramDispatchSheet</code> | <code>lib/programs/presentation/program_dispatch_screen.dart:296</code> | — | — | Plate capture + vendor + class override. The dispatch write is queued through the operations outbox so a dead zone cannot lose a departure. |
| <code>ProgramDoorAttendanceBadge</code> | <code>lib/programs/presentation/program_door_screen.dart:574</code> | — | — | No class documentation or registry summary. |
| <code>ProgramDoorGuestRow</code> | <code>lib/programs/presentation/program_door_screen.dart:465</code> | — | — | No class documentation or registry summary. |
| <code>ProgramDoorPageBody</code> | <code>lib/programs/presentation/program_door_screen.dart:193</code> | — | — | No class documentation or registry summary. |
| <code>ProgramDoorPartySizeSheet</code> | <code>lib/programs/presentation/program_door_screen.dart:598</code> | — | — | Numeric sheet for `partySizeAdjust`; the controller only enqueues when the sheet returns a new value. |
| <code>ProgramEventsRow</code> | <code>lib/programs/presentation/program_events_row.dart:10</code> | — | — | One identifiable program destination. Its constituent events remain in the program workspace rather than appearing as unrelated timeline duplicates. |
| <code>ProgramGuestEditDialog</code> | <code>lib/programs/presentation/program_guest_edit_dialog.dart:19</code> | — | — | Edits one guest's contact details, household, and group selections. |
| <code>ProgramGuestGroupEditDialog</code> | <code>lib/programs/presentation/program_guest_group_edit_dialog.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>ProgramGuestsFunctionRow</code> | <code>lib/programs/presentation/program_guests_screen.dart:637</code> | — | — | One guest row: per-function status chips for the whole program plus the RSVP editor for the currently selected function. |
| <code>ProgramGuestsPageBody</code> | <code>lib/programs/presentation/program_guests_screen.dart:201</code> | — | — | No class documentation or registry summary. |
| <code>ProgramHotelInboundTripTile</code> | <code>lib/programs/presentation/program_hotel_desk_screen.dart:250</code> | — | — | No class documentation or registry summary. |
| <code>ProgramRoomBlockRow</code> | <code>lib/programs/presentation/program_hotel_rooms_screen.dart:291</code> | — | — | A reserved room block with live capacity — read-only on the desk board. |
| <code>ProgramStayRow</code> | <code>lib/programs/presentation/program_hotel_rooms_screen.dart:219</code> | — | — | One stay row: guest, room, block, lifecycle status; tap to manage. |
| <code>ProgramStaySheet</code> | <code>lib/programs/presentation/program_hotel_rooms_screen.dart:340</code> | — | — | Assign or manage one guest's stay: block, room label, lifecycle status, and the desk's room-ready / guest-arrived marks. |
| <code>ProgramUnplacedGuestRow</code> | <code>lib/programs/presentation/program_hotel_rooms_screen.dart:165</code> | — | — | A routed guest with no live stay — tap to assign block and room. |
| <code>ProgramImportResultSection</code> | <code>lib/programs/presentation/program_import_screen.dart:311</code> | — | — | No class documentation or registry summary. |
| <code>ProgramLodgingFloorLayout</code> | <code>lib/programs/presentation/program_lodging_layout.dart:262</code> | — | — | No class documentation or registry summary. |
| <code>ProgramLodgingLayout</code> | <code>lib/programs/presentation/program_lodging_layout.dart:14</code> | — | — | Reuses EventSuccess's 2D grid normalization only, never its pair/rotation semantics. No write occurs without an injected authoritative callback. |
| <code>ProgramLodgingExpiredPageBody</code> | <code>lib/programs/presentation/program_lodging_screen.dart:436</code> | — | — | No class documentation or registry summary. |
| <code>ProgramLodgingMembershipPageBody</code> | <code>lib/programs/presentation/program_lodging_screen.dart:474</code> | — | — | No class documentation or registry summary. |
| <code>ProgramLodgingScaffold</code> | <code>lib/programs/presentation/program_lodging_screen.dart:417</code> | — | — | No class documentation or registry summary. |
| <code>ProgramLodgingSetupPageBody</code> | <code>lib/programs/presentation/program_lodging_setup_page_body.dart:17</code> | — | — | Staged, provider-free form mechanics. Persistence and authority lifetime remain with the routed controller. No household creates sharing choices. |
| <code>ProgramFunctionNowNextRow</code> | <code>lib/programs/presentation/program_now_next_screen.dart:183</code> | — | — | No class documentation or registry summary. |
| <code>ProgramArrivalsOutboxBanner</code> | <code>lib/programs/presentation/program_operations_notice.dart:194</code> | — | — | No class documentation or registry summary. |
| <code>ProgramJournalRecoverySheet</code> | <code>lib/programs/presentation/program_operations_notice.dart:102</code> | — | — | Exports preserved local program operations through an account-fenced share flow. |
| <code>ProgramOperationReviewSheet</code> | <code>lib/programs/presentation/program_operations_notice.dart:242</code> | — | — | No class documentation or registry summary. |
| <code>ProgramOperationsNotice</code> | <code>lib/programs/presentation/program_operations_notice.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>ProgramFunctionCountsRow</code> | <code>lib/programs/presentation/program_stakeholder_screen.dart:165</code> | — | — | Per-function RSVP and door-count card for the stakeholder counts view. |
| <code>ProgramHotelOccupancyRow</code> | <code>lib/programs/presentation/program_stakeholder_screen.dart:237</code> | — | — | Per-hotel occupancy row for the stakeholder counts view. |
| <code>ProgramStaffAccessDialog</code> | <code>lib/programs/presentation/program_team_screen.dart:313</code> | — | — | No class documentation or registry summary. |
| <code>ProgramTeamPageBody</code> | <code>lib/programs/presentation/program_team_screen.dart:70</code> | — | — | No class documentation or registry summary. |
| <code>ProgramTimezoneField</code> | <code>lib/programs/presentation/program_timezone_field.dart:9</code> | — | — | A searchable disclosure using Catch's existing field and choice rows. The form owns selection, search and expansion; search text is never saved. |
| <code>ProgramTripLedgerRow</code> | <code>lib/programs/presentation/program_trips_screen.dart:254</code> | — | — | No class documentation or registry summary. |
| <code>ProgramTripVoidSheet</code> | <code>lib/programs/presentation/program_trips_screen.dart:387</code> | — | — | No class documentation or registry summary. |
| <code>ProgramWorkPageBody</code> | <code>lib/programs/presentation/program_work_screen.dart:131</code> | — | — | No class documentation or registry summary. |
| <code>ProgramWorkspaceFunctionTile</code> | <code>lib/programs/presentation/program_workspace_screen.dart:470</code> | — | — | No class documentation or registry summary. |
| <code>ProgramWorkspacePageBody</code> | <code>lib/programs/presentation/program_workspace_screen.dart:73</code> | — | — | No class documentation or registry summary. |
| <code>ProgramFunctionEditDialog</code> | <code>lib/programs/presentation/program_workspace_surface.dart:24</code> | — | — | No class documentation or registry summary. |
| <code>ProgramHotelEditDialog</code> | <code>lib/programs/presentation/program_workspace_surface.dart:563</code> | — | — | No class documentation or registry summary. |
| <code>ProgramPickupPointEditDialog</code> | <code>lib/programs/presentation/program_workspace_surface.dart:381</code> | — | — | No class documentation or registry summary. |
| <code>ProgramWorkspaceHotelTile</code> | <code>lib/programs/presentation/program_workspace_surface.dart:290</code> | — | — | No class documentation or registry summary. |
| <code>ProgramWorkspaceStationTile</code> | <code>lib/programs/presentation/program_workspace_surface.dart:202</code> | — | — | No class documentation or registry summary. |
| <code>PublicProfileBody</code> | <code>lib/public_profile/presentation/public_profile_screen.dart:226</code> | — | — | No class documentation or registry summary. |
| <code>PublicProfileReportReasonTile</code> | <code>lib/public_profile/presentation/public_profile_screen.dart:330</code> | — | — | No class documentation or registry summary. |
| <code>PublicProfileReportSheet</code> | <code>lib/public_profile/presentation/public_profile_screen.dart:268</code> | — | — | No class documentation or registry summary. |
| <code>PublicProfileScreenBody</code> | <code>lib/public_profile/presentation/public_profile_screen.dart:186</code> | — | — | No class documentation or registry summary. |
| <code>ReviewHistoryRow</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:158</code> | — | — | No class documentation or registry summary. |
| <code>ReviewHistoryRowSkeleton</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:210</code> | — | — | No class documentation or registry summary. |
| <code>ReviewsHistoryBody</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:91</code> | — | — | No class documentation or registry summary. |
| <code>ReviewsHistoryList</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:134</code> | — | — | No class documentation or registry summary. |
| <code>ReviewsHistorySkeleton</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:193</code> | — | — | No class documentation or registry summary. |
| <code>ClubReviewsSection</code> | <code>lib/reviews/shared/reviews_section.dart:21</code> | — | — | Read-only club review aggregate. |
| <code>EventReviewsSection</code> | <code>lib/reviews/shared/reviews_section.dart:48</code> | — | — | Event-scoped reviews with write/edit CTA for attended attendees. |
| <code>ReviewCard</code> | <code>lib/reviews/shared/reviews_section.dart:314</code> | — | — | No class documentation or registry summary. |
| <code>ReviewOwnerResponseCard</code> | <code>lib/reviews/shared/reviews_section.dart:409</code> | — | — | No class documentation or registry summary. |
| <code>ReviewResponseSheet</code> | <code>lib/reviews/shared/reviews_section.dart:474</code> | — | — | No class documentation or registry summary. |
| <code>ReviewsPreviewSection</code> | <code>lib/reviews/shared/reviews_section.dart:142</code> | — | — | No class documentation or registry summary. |
| <code>StarRatingPicker</code> | <code>lib/reviews/shared/star_rating_row.dart:37</code> | — | — | Tappable star row for picking a rating. |
| <code>StarRatingRow</code> | <code>lib/reviews/shared/star_rating_row.dart:7</code> | — | — | Read-only star row. [rating] is 1-5 (integers for filled stars). |
| <code>WriteReviewSheet</code> | <code>lib/reviews/shared/write_review_sheet.dart:36</code> | — | — | No class documentation or registry summary. |
| <code>HostNavigationWorkspace</code> | <code>lib/routing/host_navigation_workspace.dart:101</code> | — | — | Sole adapter from semantic workspaces and router ancestry to physical panes. |
| <code>HostWorkspaceContentScope</code> | <code>lib/routing/host_navigation_workspace.dart:297</code> | — | — | Publishes route record keys and editor preview attachments. |
| <code>HostWorkspaceEditorPane</code> | <code>lib/routing/host_navigation_workspace.dart:331</code> | — | — | A routed editor contributes its preview to the enclosing strip. It never starts a second horizontal viewport inside an existing navigation pane. |
| <code>HostWorkspaceRecordScope</code> | <code>lib/routing/host_navigation_workspace.dart:317</code> | — | — | Identifies the record contributing content to the router frame. |
| <code>HostWorkspaceRouteContent</code> | <code>lib/routing/host_navigation_workspace.dart:180</code> | — | — | One key per route record, shared by its Navigator page and visible ancestor. A pushed parent relinquishes its content; the ancestor pane adopts that same element in the same frame. Back returns it to the original Navigator page. |
| <code>HostWorkspaceRouteFrame</code> | <code>lib/routing/host_navigation_workspace.dart:207</code> | — | — | Router frame retaining a single content element for each logical record. |
| <code>HostWorkspaceRouteScope</code> | <code>lib/routing/host_navigation_workspace.dart:153</code> | — | — | Router-owned attachment of selected content to the existing pane path. |
| <code>BlockedAccountsSection</code> | <code>lib/safety/presentation/blocked_account_tile.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>MessagingPermissionsPageBody</code> | <code>lib/safety/presentation/messaging_permissions_screen.dart:49</code> | — | — | No class documentation or registry summary. |
| <code>AccountProfileSection</code> | <code>lib/safety/presentation/settings_screen.dart:699</code> | — | — | No class documentation or registry summary. |
| <code>BlockedAccountsSkeleton</code> | <code>lib/safety/presentation/settings_screen.dart:743</code> | — | — | No class documentation or registry summary. |
| <code>EventRecapLoadingBody</code> | <code>lib/swipes/presentation/event_recap_screen.dart:278</code> | — | — | No class documentation or registry summary. |
| <code>EventRecapReadyBody</code> | <code>lib/swipes/presentation/event_recap_screen.dart:135</code> | — | — | No class documentation or registry summary. |
| <code>RecapHeader</code> | <code>lib/swipes/presentation/event_recap_screen.dart:411</code> | — | — | No class documentation or registry summary. |
| <code>RecapHeaderSkeleton</code> | <code>lib/swipes/presentation/event_recap_screen.dart:318</code> | — | — | No class documentation or registry summary. |
| <code>RecapProfilePhoto</code> | <code>lib/swipes/presentation/event_recap_screen.dart:596</code> | — | — | No class documentation or registry summary. |
| <code>RecapStatTile</code> | <code>lib/swipes/presentation/event_recap_screen.dart:470</code> | — | — | No class documentation or registry summary. |
| <code>RecapStatTileSkeleton</code> | <code>lib/swipes/presentation/event_recap_screen.dart:350</code> | — | — | No class documentation or registry summary. |
| <code>VibeGrid</code> | <code>lib/swipes/presentation/event_recap_screen.dart:215</code> | — | — | No class documentation or registry summary. |
| <code>VibeGridSkeleton</code> | <code>lib/swipes/presentation/event_recap_screen.dart:369</code> | — | — | No class documentation or registry summary. |
| <code>VibeTile</code> | <code>lib/swipes/presentation/event_recap_screen.dart:506</code> | — | — | No class documentation or registry summary. |
| <code>FiltersBody</code> | <code>lib/swipes/presentation/filters_screen.dart:218</code> | — | — | No class documentation or registry summary. |
| <code>FiltersSection</code> | <code>lib/swipes/presentation/filters_screen.dart:363</code> | — | — | No class documentation or registry summary. |
| <code>FiltersValueText</code> | <code>lib/swipes/presentation/filters_screen.dart:390</code> | — | — | No class documentation or registry summary. |
| <code>CatchesPassButtonSkeleton</code> | <code>lib/swipes/presentation/swipe_screen.dart:348</code> | — | — | No class documentation or registry summary. |
| <code>CatchesProfileBody</code> | <code>lib/swipes/presentation/swipe_screen.dart:219</code> | — | — | No class documentation or registry summary. |
| <code>CatchesProfileBodySkeleton</code> | <code>lib/swipes/presentation/swipe_screen.dart:173</code> | — | — | No class documentation or registry summary. |
| <code>CatchesScrimOverlay</code> | <code>lib/swipes/presentation/swipe_screen.dart:442</code> | — | — | No class documentation or registry summary. |
| <code>CatchesTopOverlay</code> | <code>lib/swipes/presentation/swipe_screen.dart:357</code> | — | — | No class documentation or registry summary. |
| <code>CatchesTopOverlaySkeleton</code> | <code>lib/swipes/presentation/swipe_screen.dart:298</code> | — | — | No class documentation or registry summary. |
| <code>OverlayIconSkeleton</code> | <code>lib/swipes/presentation/swipe_screen.dart:339</code> | — | — | No class documentation or registry summary. |
| <code>CatchesPassButton</code> | <code>lib/swipes/presentation/widgets/catches_pass_button.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>SwipeEmptyState</code> | <code>lib/swipes/presentation/widgets/swipe_empty_state.dart:6</code> | — | — | No class documentation or registry summary. |
| <code>ProfileBody</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:21</code> | — | — | PHASE 2 — the flagship profile surface, in the locked editorial language: a person-polaroid hero on a graded photo, Archivo voice, IBM Plex Mono data, bodyL reading text, hairlines over boxes. Color = activity (the kicker + reaction affordances borrow the meeting activity's pigment). |
| <code>ProfileCaptionText</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:542</code> | — | — | No class documentation or registry summary. |
| <code>ProfileCompatibilitySection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:288</code> | — | — | No class documentation or registry summary. |
| <code>ProfileDivider</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:561</code> | — | — | No class documentation or registry summary. |
| <code>ProfileFactsSection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:446</code> | — | — | No class documentation or registry summary. |
| <code>ProfileHeader</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:121</code> | — | — | No class documentation or registry summary. |
| <code>ProfileKickerText</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:270</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePhoto</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:178</code> | — | — | Real photo (graded at display time) or the activity-art fallback when absent. |
| <code>ProfilePhotoSection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:491</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePromptSection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:358</code> | — | — | No class documentation or registry summary. |
| <code>ProfileRunningSection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:383</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSection</code> | <code>lib/swipes/shared/profile_surface/profile_body.dart:207</code> | — | — | No class documentation or registry summary. |
| <code>ProfileReactionAction</code> | <code>lib/swipes/shared/profile_surface/profile_reaction_action.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>ProfileReactionButton</code> | <code>lib/swipes/shared/profile_surface/profile_reaction_action.dart:217</code> | — | — | No class documentation or registry summary. |
| <code>ProfileReactionCommentSheet</code> | <code>lib/swipes/shared/profile_surface/profile_reaction_action.dart:99</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurface</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:19</code> | — | — | The single shared profile shell. Renders the flagship [ProfileBody] for all three modes; only [ProfileSurfaceMode.catches] is reactable (per-section like + comment), so preview / public profile read calm and affordance-free. |
| <code>ProfileSurfaceDivider</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:323</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfaceFactsSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:291</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfaceHeroSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:159</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfacePhotoSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:269</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfaceRunningSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:234</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfaceSectionSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:200</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSurfaceSkeleton</code> | <code>lib/swipes/shared/profile_surface/profile_surface.dart:94</code> | — | — | Content-shaped placeholder for the shared public/preview profile surface. |
| <code>UserAnalyticsDataCoverageSection</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:411</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsEmptyState</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:112</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsReportBody</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:76</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsReportSkeleton</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:149</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsSection</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsTipRow</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:393</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsTipsSection</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:379</code> | — | — | No class documentation or registry summary. |
| <code>UserAnalyticsTrendSection</code> | <code>lib/user_analytics/shared/user_analytics_section.dart:303</code> | — | — | No class documentation or registry summary. |
| <code>FormProfilePhotoField</code> | <code>lib/user_profile/presentation/form_profile_photo_field.dart:13</code> | — | — | No class documentation or registry summary. |
| <code>FormProfilePhotoSelectionField</code> | <code>lib/user_profile/presentation/form_profile_photo_field.dart:54</code> | — | — | Keep the private image in memory only and evict its decoder entry on leave. The selection remains disabled until the actual image has rendered. |
| <code>FormProfileReviewPageBody</code> | <code>lib/user_profile/presentation/form_profile_review_screen.dart:86</code> | — | — | No class documentation or registry summary. |
| <code>FormProfilesAsyncBoundary</code> | <code>lib/user_profile/presentation/form_profiles_screen.dart:36</code> | — | — | The authenticated form directory can render inside the account pager before the applicant has a Consumer profile. It owns its independent async state. |
| <code>FormProfilesSectionList</code> | <code>lib/user_profile/presentation/form_profiles_screen.dart:58</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePreviewSkeletonSliverBody</code> | <code>lib/user_profile/presentation/profile_screen.dart:261</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePreviewSliverBody</code> | <code>lib/user_profile/presentation/profile_screen.dart:298</code> | — | — | No class documentation or registry summary. |
| <code>FormProfileValueField</code> | <code>lib/user_profile/presentation/widgets/form_profile_value_field.dart:11</code> | — | — | A typed field in the participant's explicit profile review. The parent owns draft changes, text controllers and claim acknowledgement. |
| <code>ProfileInlineMultiChoiceEntryEditor</code> | <code>lib/user_profile/presentation/widgets/profile_inline_choice_editor.dart:174</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInlineSingleChoiceEntryEditor</code> | <code>lib/user_profile/presentation/widgets/profile_inline_choice_editor.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInlineHeightEditor</code> | <code>lib/user_profile/presentation/widgets/profile_inline_height_editor.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInlinePromptEntryEditor</code> | <code>lib/user_profile/presentation/widgets/profile_inline_prompt_entry_editor.dart:21</code> | — | — | One contained prompt card: a staged question selector followed by a separate multiline answer that saves implicitly on blur. |
| <code>ProfileInlineRangeEditor</code> | <code>lib/user_profile/presentation/widgets/profile_inline_range_editor.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInsightsTabSliverBody</code> | <code>lib/user_profile/presentation/widgets/profile_insights_tab_sliver_body.dart:4</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePreviewBody</code> | <code>lib/user_profile/presentation/widgets/profile_preview_body.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSettingsButton</code> | <code>lib/user_profile/presentation/widgets/profile_sliver_header.dart:48</code> | — | — | No class documentation or registry summary. |
| <code>ProfileTabBar</code> | <code>lib/user_profile/presentation/widgets/profile_sliver_header.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>ProfileFieldRow</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:295</code> | — | — | No class documentation or registry summary. |
| <code>ProfileMultiEnumRow</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:436</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePhotosSection</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:543</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePromptRow</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:503</code> | — | — | No class documentation or registry summary. |
| <code>ProfileSingleEnumRow</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:376</code> | — | — | No class documentation or registry summary. |
| <code>ProfileTabBody</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:57</code> | — | — | No class documentation or registry summary. |
| <code>ProfileTabSliverBody</code> | <code>lib/user_profile/presentation/widgets/profile_tab_body.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInfoSkeletonSection</code> | <code>lib/user_profile/presentation/widgets/profile_tab_skeleton.dart:85</code> | — | — | No class documentation or registry summary. |
| <code>ProfileInfoSkeletonTile</code> | <code>lib/user_profile/presentation/widgets/profile_tab_skeleton.dart:107</code> | — | — | No class documentation or registry summary. |
| <code>ProfilePhotosSkeletonSection</code> | <code>lib/user_profile/presentation/widgets/profile_tab_skeleton.dart:53</code> | — | — | No class documentation or registry summary. |
| <code>ProfileTabSkeletonSliverBody</code> | <code>lib/user_profile/presentation/widgets/profile_tab_skeleton.dart:9</code> | — | — | No class documentation or registry summary. |

### L6 (128)

| Widget | Source | Role | Canonical concept | Purpose |
|---|---|---|---|---|
| <code>ConsumerPlatformApp</code> | <code>apps/consumer/lib/consumer_platform_app.dart:12</code> | — | — | Consumer-owned native capability bindings around the shared Consumer UI. |
| <code>HostPlatformApp</code> | <code>apps/host/lib/host_platform_app.dart:6</code> | — | — | Host-owned app root selecting only the Host router and default capabilities. |
| <code>ForceUpdateCheckErrorScreen</code> | <code>lib/app.dart:224</code> | — | — | No class documentation or registry summary. |
| <code>MyApp</code> | <code>lib/app.dart:42</code> | — | — | No class documentation or registry summary. |
| <code>AuthScreen</code> | <code>lib/auth/presentation/auth_screen.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>ChatScreen</code> | <code>lib/chats/presentation/chat_screen.dart:36</code> | — | — | No class documentation or registry summary. |
| <code>EventChatParticipantsScreen</code> | <code>lib/chats/presentation/event_chat_participants_screen.dart:16</code> | — | — | No class documentation or registry summary. |
| <code>EventChatScreen</code> | <code>lib/chats/presentation/event_chat_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>EventProfileScreen</code> | <code>lib/chats/presentation/event_profile_screen.dart:17</code> | — | — | Account-bound editor and protected participant view for one event chat. |
| <code>ChatsListScreen</code> | <code>lib/chats/presentation/inbox/chat_inbox_screen.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>ClubDetailScreen</code> | <code>lib/clubs/presentation/detail/club_detail_screen.dart:31</code> | — | — | No class documentation or registry summary. |
| <code>CatchConsumerBootScreen</code> | <code>lib/consumer_bootstrap.dart:172</code> | — | — | The animated Consumer cold-start surface shown above auth and routing. |
| <code>CelebrationScreen</code> | <code>lib/core/celebration/celebration_screen.dart:41</code> | — | — | No class documentation or registry summary. |
| <code>OrderedPhotoManagerScreen</code> | <code>lib/core/widgets/ordered_photo_picker.dart:166</code> | — | — | Full-screen editor for long ordered galleries. It keeps a local mirror so dozens of items can be reordered or removed without collapsing the route; every operation is also forwarded to the owning draft/controller. |
| <code>SplashScreen</code> | <code>lib/core/widgets/splash_screen.dart:9</code> | — | <code>catch.startup_loading_screen</code> | Branded app-start composition with the Catch logo and a delayed bounded loading indicator. Also called: <code>LaunchScreen</code>, <code>StartupScreen</code>, <code>StartupLoadingScreen</code>, <code>AppLoadingScreen</code>. |
| <code>CrossPathsInvitationScreen</code> | <code>lib/cross_paths/presentation/cross_paths_invitation_screen.dart:28</code> | — | — | No class documentation or registry summary. |
| <code>ActivityScreen</code> | <code>lib/dashboard/presentation/activity_screen.dart:23</code> | — | — | No class documentation or registry summary. |
| <code>DashboardEmptyHomeScreen</code> | <code>lib/dashboard/presentation/dashboard_empty_home_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>DashboardErrorScreen</code> | <code>lib/dashboard/presentation/dashboard_error_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>DashboardHomeScreen</code> | <code>lib/dashboard/presentation/dashboard_home_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>DashboardLoadingScreen</code> | <code>lib/dashboard/presentation/dashboard_loading_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>DashboardScreen</code> | <code>lib/dashboard/presentation/dashboard_screen.dart:27</code> | — | — | No class documentation or registry summary. |
| <code>HostEventRehearsalScreen</code> | <code>lib/event_rehearsal/presentation/host_event_rehearsal_screen.dart:38</code> | — | — | No class documentation or registry summary. |
| <code>HostEventRehearsalStartScreen</code> | <code>lib/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCompanionScreen</code> | <code>lib/event_success/presentation/event_success_companion_body_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>EventSuccessCompanionRouteScreen</code> | <code>lib/event_success/presentation/event_success_companion_screen.dart:201</code> | — | — | No class documentation or registry summary. |
| <code>CalendarLoadingScreen</code> | <code>lib/events/presentation/calendar/calendar_loading_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>CalendarScreen</code> | <code>lib/events/presentation/calendar/calendar_screen.dart:25</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailScreen</code> | <code>lib/events/presentation/event_detail_screen.dart:54</code> | — | — | No class documentation or registry summary. |
| <code>EventLocationMapScreen</code> | <code>lib/events/presentation/event_location_map_body_screen.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>EventLocationMapRouteScreen</code> | <code>lib/events/presentation/event_location_map_screen.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>LocationPickerScreen</code> | <code>lib/events/presentation/location_picker_screen.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>SavedEventsScreen</code> | <code>lib/events/presentation/saved_events_screen.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>EventDetailBody</code> | <code>lib/events/presentation/widgets/event_detail_body.dart:25</code> | <code>Body</code> | — | Event Detail screen-section contract that groups the event-specific hero, ticket facts, overview primitives, host/social sections, consent-safe Cross Paths control, companion prompt, and booking dock under one Catch-owned handoff boundary. Also called: <code>EventDetailScreenBody</code>, <code>EventDetailContent</code>, <code>EventDetailsBody</code>. |
| <code>EventDetailLoadingScreen</code> | <code>lib/events/presentation/widgets/event_detail_loading_skeleton.dart:8</code> | — | — | No class documentation or registry summary. |
| <code>EventCheckInCelebrationScreen</code> | <code>lib/events/shared/event_check_in_celebration_screen.dart:9</code> | — | — | No class documentation or registry summary. |
| <code>EventJoinedCelebrationScreen</code> | <code>lib/events/shared/event_joined_celebration_screen.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>ExploreMapScreen</code> | <code>lib/explore/presentation/explore_map_screen.dart:41</code> | — | — | Full-screen event map opened from the Explore feed's map pill. |
| <code>ExploreScreen</code> | <code>lib/explore/presentation/explore_screen.dart:54</code> | — | — | Explore — the supply-side feed (design-system Explore). |
| <code>UpdateRequiredScreen</code> | <code>lib/force_update/presentation/update_required_screen.dart:15</code> | — | — | Blocking screen shown when the running app version is below [minVersion]. |
| <code>PhoneImportReviewScreen</code> | <code>lib/hosts/audience/phone_import/presentation/phone_import_review_screen.dart:15</code> | — | — | Shared review view. Without a canonical submission controller this remains an explicitly labelled demo with sharing permanently disabled. |
| <code>PhoneImportScreen</code> | <code>lib/hosts/audience/phone_import/presentation/phone_import_screen.dart:18</code> | — | — | Native-first program import. Both entry and every gateway operation require live canonical access; a cached program page can only navigate here. |
| <code>HostEventsScreen</code> | <code>lib/hosts/events/presentation/host_events_screen.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>OrganizerMomentEditScreen</code> | <code>lib/hosts/events/presentation/moments/organizer_moment_edit_screen.dart:6</code> | — | — | Creates or revises a moment through upsertOrganizerMoment. Revising an armed moment drops it back to draft with approval cleared — the backend owns that lifecycle; the form only submits the new definition. |
| <code>OrganizerMomentsScreen</code> | <code>lib/hosts/events/presentation/moments/organizer_moments_screen.dart:20</code> | — | — | Moments for one event or program scope: the organizer's send rules with their approve-the-rule-once lifecycle (draft → armed → paused/done). |
| <code>HostApplicationDetailScreen</code> | <code>lib/hosts/presentation/applications/host_application_detail_screen.dart:5</code> | — | — | Compatibility entry for saved application URLs; all detail UI has one owner. |
| <code>CreateClubScreen</code> | <code>lib/hosts/presentation/club_management/create/create_club_screen.dart:35</code> | — | — | No class documentation or registry summary. |
| <code>HostCreateClubScreen</code> | <code>lib/hosts/presentation/club_management/host_create_club_screen.dart:4</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomerDetailScreen</code> | <code>lib/hosts/presentation/customers/host_customer_detail_screen.dart:47</code> | — | — | No class documentation or registry summary. |
| <code>HostAddCustomerScreen</code> | <code>lib/hosts/presentation/customers/host_customer_editor.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>HostCustomersScreen</code> | <code>lib/hosts/presentation/customers/host_customers_screen.dart:69</code> | — | — | No class documentation or registry summary. |
| <code>HostSavedAudienceEditorScreen</code> | <code>lib/hosts/presentation/customers/host_saved_audience_editor.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>EditHostedEventRouteScreen</code> | <code>lib/hosts/presentation/edit_hosted_event_route_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>EditHostedEventScreen</code> | <code>lib/hosts/presentation/edit_hosted_event_screen.dart:62</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventScreen</code> | <code>lib/hosts/presentation/event_management/create/create_event_screen.dart:73</code> | — | — | No class documentation or registry summary. |
| <code>CreateEventSuccessScreen</code> | <code>lib/hosts/presentation/event_management/create/create_event_success_screen.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>EventPublicationScreen</code> | <code>lib/hosts/presentation/event_management/create/event_publication_screen.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostEventOfferPreferencesScreen</code> | <code>lib/hosts/presentation/event_management/create/host_event_offer_preferences_screen.dart:14</code> | — | — | Manager settings for future offers; existing offers retain recorded terms. |
| <code>PrivateEventCreateScreen</code> | <code>lib/hosts/presentation/event_management/create/private_event_create_screen.dart:49</code> | — | — | The first page of the single progressive event editor. |
| <code>PrivateEventDetailsScreen</code> | <code>lib/hosts/presentation/event_management/create/private_event_details_screen.dart:26</code> | — | — | Actual optional schedule, place and format of one saved private event. Organizer defaults appear only as explicit copy-on-save choices. |
| <code>PrivateEventPreferencesScreen</code> | <code>lib/hosts/presentation/event_management/create/private_event_preferences_screen.dart:19</code> | — | — | Manager-only settings on a saved event. Private and published events share controls; each controller retains its own authoritative command protocol. |
| <code>PrivateEventSetupScreen</code> | <code>lib/hosts/presentation/event_management/create/private_event_setup_screen.dart:14</code> | — | — | Progressive actions for one already-saved canonical event. |
| <code>HostCreateEventRouteLoadingScreen</code> | <code>lib/hosts/presentation/event_management/host_create_event_route_loading_screen.dart:7</code> | — | — | No class documentation or registry summary. |
| <code>HostCreateEventRouteScreen</code> | <code>lib/hosts/presentation/event_management/host_create_event_screen.dart:53</code> | — | — | No class documentation or registry summary. |
| <code>RoutePathBuilderScreen</code> | <code>lib/hosts/presentation/event_management/widgets/route_path_builder_screen.dart:10</code> | — | — | Tap-to-build route geometry used by moving event formats. |
| <code>HostFormAnalyticsScreen</code> | <code>lib/hosts/presentation/forms/host_form_analytics_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostFormAutomationsScreen</code> | <code>lib/hosts/presentation/forms/host_form_automations_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostFormBuilderScreen</code> | <code>lib/hosts/presentation/forms/host_form_builder_screen.dart:32</code> | — | — | No class documentation or registry summary. |
| <code>HostFormPreviewScreen</code> | <code>lib/hosts/presentation/forms/host_form_preview_screen.dart:10</code> | — | — | No class documentation or registry summary. |
| <code>HostFormResponseDetailScreen</code> | <code>lib/hosts/presentation/forms/host_form_response_detail_screen.dart:62</code> | — | — | One detail surface for submitted forms and imported application records. |
| <code>HostFormShareScreen</code> | <code>lib/hosts/presentation/forms/host_form_share_screen.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>HostFormTemplatesScreen</code> | <code>lib/hosts/presentation/forms/host_form_templates_screen.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostFormsScreen</code> | <code>lib/hosts/presentation/forms/host_forms_screen.dart:50</code> | — | — | No class documentation or registry summary. |
| <code>HostResponseOfferPreferencesRouteScreen</code> | <code>lib/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart:5</code> | — | — | Public route boundary for the shared offer settings editor. |
| <code>HostResponseOfferScreen</code> | <code>lib/hosts/presentation/forms/host_response_offer_screen.dart:30</code> | — | — | Shared continuation for one response or a reviewed query selection. The originating page stays mounted; save/cancel returns to the same context. |
| <code>HostEventManageRouteScreen</code> | <code>lib/hosts/presentation/host_event_manage_route_screen.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>HostEventManageScreen</code> | <code>lib/hosts/presentation/host_event_manage_screen.dart:58</code> | — | — | No class documentation or registry summary. |
| <code>HostEventOperatorScreen</code> | <code>lib/hosts/presentation/host_event_operator_screen.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>HostEventPublicationRouteScreen</code> | <code>lib/hosts/presentation/host_event_publication_route_screen.dart:5</code> | — | — | The publication editor uses its existing step-flow content after the same uid/organizer/event authorization boundary as management. |
| <code>HostClubEventDefaultsScreen</code> | <code>lib/hosts/presentation/host_operations/host_club_event_defaults_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubLiveGuideScreen</code> | <code>lib/hosts/presentation/host_operations/host_club_live_guide_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubPaymentsScreen</code> | <code>lib/hosts/presentation/host_operations/host_club_payments_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubTeamScreen</code> | <code>lib/hosts/presentation/host_operations/host_club_team_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostClubsScreen</code> | <code>lib/hosts/presentation/host_operations/host_clubs_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostLoadingScreen</code> | <code>lib/hosts/presentation/host_operations/host_loading_screen.dart:3</code> | — | — | No class documentation or registry summary. |
| <code>HostInboxScreen</code> | <code>lib/hosts/presentation/inbox/host_inbox_screen.dart:44</code> | — | — | No class documentation or registry summary. |
| <code>HostMessagingSetupScreen</code> | <code>lib/hosts/presentation/inbox/host_messaging_setup_screen.dart:11</code> | — | — | No class documentation or registry summary. |
| <code>HostNewMessageScreen</code> | <code>lib/hosts/presentation/inbox/host_new_message_screen.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayFocusScreen</code> | <code>lib/hosts/today/personalization/presentation/host_today_focus_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayLoadedRoute</code> | <code>lib/hosts/today/presentation/host_today_screen.dart:439</code> | — | — | No class documentation or registry summary. |
| <code>HostTodayScreen</code> | <code>lib/hosts/today/presentation/host_today_screen.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>HostWorkScreen</code> | <code>lib/hosts/work/presentation/host_work_screen.dart:25</code> | — | — | Unified entry point for restricted Host staff. |
| <code>ProfilePhotoEditorScreen</code> | <code>lib/image_uploads/shared/profile_photo_editor_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>LaunchAccessApplicationScreen</code> | <code>lib/launch_access/presentation/launch_access_application_screen.dart:17</code> | — | — | No class documentation or registry summary. |
| <code>OnboardingScreen</code> | <code>lib/onboarding/presentation/onboarding_screen.dart:20</code> | — | — | No class documentation or registry summary. |
| <code>StartWelcomeRouteScreen</code> | <code>lib/onboarding/presentation/start_welcome_route_screen.dart:9</code> | — | — | Route-level surface owner for the logged-out Welcome experience. |
| <code>PaymentConfirmationLoadingScreen</code> | <code>lib/payments/presentation/payment_confirmation_loading_screen.dart:5</code> | — | — | No class documentation or registry summary. |
| <code>PaymentConfirmationScreen</code> | <code>lib/payments/presentation/payment_confirmation_screen.dart:32</code> | — | — | No class documentation or registry summary. |
| <code>PaymentHistoryScreen</code> | <code>lib/payments/presentation/payment_history_screen.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>ProgramArrivalsScreen</code> | <code>lib/programs/presentation/program_arrivals_screen.dart:28</code> | — | — | The greeter's live arrivals roster for one pickup station. |
| <code>ProgramAttendanceReportScreen</code> | <code>lib/programs/presentation/program_attendance_report_screen.dart:17</code> | — | — | The reconciliationViewer's attendance report: program-wide RSVP-vs-door totals, then one row per function with its exception counts. Everything here is counts and guest ids — the callable never returns PII. |
| <code>ProgramAttentionScreen</code> | <code>lib/programs/presentation/program_attention_screen.dart:15</code> | — | — | Function-lead attention feed: program-scoped staffAttention moment sends filtered server-side to the caller's duties — late-arrival and disruption alerts raised by Moments land here for whoever holds the stamped duty. |
| <code>ProgramCreateScreen</code> | <code>lib/programs/presentation/program_create_screen.dart:26</code> | — | — | No class documentation or registry summary. |
| <code>ProgramDispatchScreen</code> | <code>lib/programs/presentation/program_dispatch_screen.dart:26</code> | — | — | The dispatcher's desk for one pickup station: the deterministic batch suggestions plus the dispatch sheet that captures plate, vendor and class at the moment the vehicle departs — the act that generates the reconciliation record. |
| <code>ProgramFunctionDoorScreen</code> | <code>lib/programs/presentation/program_door_screen.dart:25</code> | — | — | Door workspace for one program function. `functionCheckIn` and `functionLead` staff land here from the work shell; the durable journal owns every attendance transition and queued work replays through the program operations outbox when the venue network drops. |
| <code>ProgramGuestDeskScreen</code> | <code>lib/programs/presentation/program_guest_desk_screen.dart:14</code> | — | — | No class documentation or registry summary. |
| <code>ProgramGuestsScreen</code> | <code>lib/programs/presentation/program_guests_screen.dart:30</code> | — | — | Household × function RSVP grid for the organizer workspace. One function is selected at a time; each household card lists members with their join state and a segmented RSVP editor that writes through `recordProgramFunctionRsvp`. |
| <code>ProgramHotelDeskScreen</code> | <code>lib/programs/presentation/program_hotel_desk_screen.dart:18</code> | — | — | The hotel welcome team's inbound view: vehicles on the way with their manifest names and plates, plus parties still expected at the airport. Deliberately narrow — no contact fields, no other hotels. |
| <code>ProgramHotelRoomsScreen</code> | <code>lib/programs/presentation/program_hotel_rooms_screen.dart:20</code> | — | — | The hotel desk's room board for one property: routed guests still needing a room, every stay with its block/room/status, and the reserved blocks with live capacity. Mutations go through `upsertProgramStay` — the server re-counts block occupancy inside the transaction, so a stale board can never overbook. |
| <code>ProgramImportScreen</code> | <code>lib/programs/presentation/program_import_screen.dart:19</code> | — | — | Manifest import flow: pick a CSV/XLSX, map its columns to manifest fields, preview server-side counts, then commit. The commit retries are idempotent through `clientOperationId`; preview and commit use separate operation ids because the receipt hash includes the mode. |
| <code>ProgramLodgingScreen</code> | <code>lib/programs/presentation/program_lodging_screen.dart:25</code> | — | — | The private coordinator route. Hotel desks retain their separate scoped operational board; this route never fetches private collections directly. |
| <code>ProgramNowNextScreen</code> | <code>lib/programs/presentation/program_now_next_screen.dart:19</code> | — | — | Function-lead Now/Next board: the program's functions bucketed by in-progress, upcoming and finished, with door-side counts so a lead can see where they are needed without opening each roster. Pure client projection over the staff work-access payload — no dedicated read. |
| <code>ProgramStakeholderScreen</code> | <code>lib/programs/presentation/program_stakeholder_screen.dart:16</code> | — | — | Counts-only overview for stakeholderViewer staff: guest/household headcounts, per-function RSVP and door counts, and per-hotel occupancy from routed travel legs. The callable never returns names — function and hotel labels join from the work-access payload on the client. |
| <code>ProgramTeamScreen</code> | <code>lib/programs/presentation/program_team_screen.dart:20</code> | — | — | Program team roster — active staff grants with their duty scopes, plus grant/invite/revoke actions. Duty sets are program-wide in W1 (empty resource scopes); per-station/hotel/function scoping lands with the assignment picker surfaces. |
| <code>ProgramTripsScreen</code> | <code>lib/programs/presentation/program_trips_screen.dart:18</code> | — | — | The trip ledger: every dispatch as a reconciliation record — plate, vendor, class, manifest and outcome. Voided trips keep their row so the vendor invoice can be checked line by line. Rows that are not yet arrived surface in the needs-review strip for reconciliation viewers, and the whole ledger exports to CSV. |
| <code>ProgramWorkScreen</code> | <code>lib/programs/presentation/program_work_screen.dart:24</code> | — | — | Scoped entry point for private program staff. |
| <code>ProgramWorkspaceScreen</code> | <code>lib/programs/presentation/program_workspace_screen.dart:23</code> | — | — | Organizer program workspace — program header, schedule day rail and function management. Guests/team/import live on pushed sibling routes so the schedule stays the focus here. |
| <code>PublicProfileScreen</code> | <code>lib/public_profile/presentation/public_profile_screen.dart:19</code> | — | — | No class documentation or registry summary. |
| <code>ReviewsHistoryScreen</code> | <code>lib/reviews/presentation/reviews_history_screen.dart:18</code> | — | — | No class documentation or registry summary. |
| <code>HostWorkspaceIndexScreen</code> | <code>lib/routing/host_workspace_index_screen.dart:5</code> | — | — | One route index recipe shared by the visible workspace and its navigator. The navigator anchor retains routing state without mounting a second index. |
| <code>MessagingPermissionsScreen</code> | <code>lib/safety/presentation/messaging_permissions_screen.dart:12</code> | — | — | No class documentation or registry summary. |
| <code>SettingsScreen</code> | <code>lib/safety/presentation/settings_screen.dart:33</code> | — | — | No class documentation or registry summary. |
| <code>EventRecapScreen</code> | <code>lib/swipes/presentation/event_recap_screen.dart:21</code> | — | — | No class documentation or registry summary. |
| <code>FiltersScreen</code> | <code>lib/swipes/presentation/filters_screen.dart:25</code> | — | — | No class documentation or registry summary. |
| <code>SwipeScreen</code> | <code>lib/swipes/presentation/swipe_screen.dart:29</code> | — | — | No class documentation or registry summary. |
| <code>FormProfileReviewScreen</code> | <code>lib/user_profile/presentation/form_profile_review_screen.dart:22</code> | — | — | No class documentation or registry summary. |
| <code>FormProfilesScreen</code> | <code>lib/user_profile/presentation/form_profiles_screen.dart:15</code> | — | — | No class documentation or registry summary. |
| <code>ProfileScreen</code> | <code>lib/user_profile/presentation/profile_screen.dart:24</code> | — | — | No class documentation or registry summary. |

<!-- END GENERATED WIDGET INVENTORY -->
