# Widgetbook Compare Resolution Queue

Generated from live review notes saved through
`tool/design/widgetbook_compare_server.mjs`.

## Implementation Batches

1. Completed: field system consolidation. `CatchField` is the canonical
   information atom; old field/text/info adapters and API aliases are removed.
2. Completed: Widgetbook duplicate consolidation for primitives that already
   have formal contracts. Keep contract previews as the canonical review
   surface and remove smaller catalog-only duplicates.
3. Completed: metric system consolidation. `CatchMetricStrip` is the canonical
   metric rail; the old stat-strip primitive and standalone Widgetbook page are
   removed.
4. Completed: top-bar system consolidation. `CatchTopBar.identity` owns
   conversation title/avatar composition under the `catch.top_bar` contract.
   Chat screens use it directly; no chat-specific top-bar wrapper remains.
5. Completed: surface system consolidation. `CatchSurface` owns base cards,
   tinted notes, inline messages, and tappable low-level surface chrome;
   redundant surface wrapper classes and standalone Widgetbook pages are
   removed.
6. Completed: top-bar and hero boundary. `CatchTopBar` remains app-bar chrome;
   club/event hero app bars remain separate hero concepts with naming cleanup
   tracked separately.
7. Completed: section system consolidation. `CatchSection` is the canonical
   information-grouping primitive with divided, contained, and plain variants;
   the former field-group, design-section, and section-surface APIs are
   removed.
8. Current: dedupe-assisted consolidation review. The compare tool now promotes
   the on-demand `build/reports/widget_similarity.json` candidates ahead
   of the older hand-curated backlog, ranked by detector count and similarity
   score, while still showing the registry rank, detector evidence, similarity
   metrics, Widgetbook previews, source tabs, and suggested actions before a
   decision is requested.

## Focused Visual Decision Queue

Status: needs review

The first screen of the compare tool is now the dedupe queue generated from the
widget similarity registry. Use the evidence card to decide whether a candidate
is an absorb, merge/extract, rename-only, keep-distinct, visual-first, or
inline/delete case. The older focused visual decision rows below remain in the
same tool after the dedupe candidates.

These are not implementation decisions yet. They are the unresolved boundaries
that need visual review before more widget consolidation work proceeds.

| Candidate | Review question | Compare id |
| --- | --- | --- |
| Bottom chrome boundary | Are sticky CTA footers and reusable bottom docks separate primitives, or variants of one bottom-chrome primitive? | `decision-preview-bottom-chrome` |
| Event visual/card/media boundary | Which event card/media/hero primitives are canonical, and which are variants of a smaller event visual system? | `decision-preview-event-visual-system` |
| Person row boundary | Is `CatchPersonRow` the canonical people-row primitive, and how should it relate to avatar/list-tile composition? | `decision-preview-person-row-boundary` |
| Chat header private pieces | Should `_ChatsHeaderChrome` and `_ChatsHeaderTitle` become public chat-header primitives, or merge into top-bar/browse-header modes? | `decision-preview-chat-header-boundary` |

Resolved within the event visual review: `CatchViewportCurveFrame` is not a
global event/media primitive. Its viewport clipping behavior is owned by the
club hero/header implementation.

## Second Pass Candidate Backlog

Status: paused behind focused visual review

These are broader Widgetbook catalog boundaries that still look like possible
drift points after the field, surface, top-bar, metric, and section
consolidation passes.

| Candidate | Review question | Initial direction |
| --- | --- | --- |
| DetailRow vs Field | Is compact label/value metadata a density mode of `CatchField`, or a separate table-row primitive? | Review before migrating dense payment/detail sheets. |
| BrowseHeader vs feature browse headers | Are Explore/Chats header wrappers meaningful route adapters or duplicated header primitives? | Keep wrappers only when they own route/provider state; move chrome into `CatchBrowseHeader`. |
| ActionMenu vs Menu | Is action-menu trigger behavior a `CatchMenu` mode? | Keep one menu panel grammar; decide whether the trigger convenience deserves its own contract. |
| SectionLabel vs Kicker | Are these one mono eyebrow primitive with icon/accent variants? | Likely merge if `CatchKicker` can absorb icon/accent behavior. |
| SectionHeader vs Section | Is `CatchSectionHeader` only for list/rail headers, or should titled section chrome belong entirely to `CatchSection`? | Keep separate only for rail/list headers. |
| EmptyState vs feature empty states | Which feature empty wrappers add semantic copy/actions, and which are just pass-through wrappers? | Keep semantic wrappers; inline no-op wrappers into `CatchEmptyState`. |
| SelectChip vs OptionCard | Are chip/card choices variants of one option primitive? | Review with `SegmentedControl vs OptionGroup` as one selection-system pass. |

## Field System

Status: implemented

Production migration status:

- `CatchField` production/test call sites use the canonical primitive directly.
- The former settings-row, select-menu, and dropdown-field public primitives
  have been removed; their behavior is represented by `CatchField` value-lane
  and select modes.
- Legacy field/info source files have been deleted rather than retained as
  adapters.
- `CatchField` exposes `title`, `body`, `valueText`, `action`, and
  `placeholder`; the old `label`, `value`, `trailing`, and `hintText` aliases
  are not part of the public field API.
- Section/group wrapping has moved to `CatchSection`.

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| Field vs FieldRow | merge | `CatchField` is the canonical row primitive. `CatchField` should not remain a separate design concept. |
| Field vs TextField | merge | Text input is a `CatchField` mode/state. Visual differences should come from the surrounding section/group wrapper, not from a separate primitive identity. |
| Field grouping vs section grouping | merge | Field grouping is a `CatchSection` variant, not a separate primitive. |
| SettingsRow vs Field | merge | Settings rows are `CatchField` rows with `valueText`, action, navigation, divider, and danger tone configuration. |
| SelectMenu vs DropdownField | merge | Menu-backed selection is `CatchField.select`; form validation and value syncing live in the field primitive. |

Implementation target:

- Keep one global field primitive with optional icon, title, body text, and
  action/control slots.
- Preserve edit, read, navigation, toggle, add, validation, helper,
  clearable-input, value-lane, select, and expanded-control states as field
  modes.
- Treat section/group wrapping as `CatchSection` composition around the field
  primitive.
- Keep Widgetbook contract states as the canonical field review surface.

## Search System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| SearchField vs ExpandingSearch | merge | `CatchSearchField` owns both always-expanded field mode and animated app-bar expansion mode; `CatchSearchField` expanding mode is removed. |

Implementation target:

- Keep search input and expansion/clear/close behavior on `CatchSearchField`.
- Use `CatchSearchFieldMode.expanding` for header/app-bar search affordances and
  the default field mode for always-expanded search.

## Avatar System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| ActivityAvatar vs PersonAvatar | merge | Activity-context initials and dim states are `CatchPersonAvatar` variants, not a separate avatar primitive. |
| PersonAvatar vs PersonAvatarStack | separate concepts | `CatchPersonAvatarStack` remains a composition primitive and composes `CatchPersonAvatar` rather than reimplementing it. |

## Selection System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| SegmentedControl vs OptionGroup | separate concepts | Keep segmented controls and option groups separate for now; both still need a later refinement pass. |

## Bottom Chrome System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| BottomCta vs BottomDock | separate concepts | Sticky CTA footers and utility docks remain separate primitives. |

## Top Bar System

Status: implemented

Production migration status:

- `CatchTopBar.identity` owns the conversation/profile-backed title row with
  avatar, name, optional identity tap, top-bar surface, and shared action slots.
- Chat screens build their typed `shareCard`, `report`, and `block` action menu
  directly through `CatchTopBarMenuAction`.
- The standalone chat top-bar Widgetbook primitive page has been removed; the
  `conversation-title` state now lives under the canonical `catch.top_bar`
  contract preview.
- Missing profile navigation is runtime availability, not a separate top-bar
  design variant.

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| TopBar vs conversation title/header | merge | Conversation avatar/name chrome is a `CatchTopBar.identity` state, not a separate primitive or wrapper. |

Implementation target:

- Keep conversation/header composition on `CatchTopBar.identity`; do not add a
  renamed top-bar helper or compatibility wrapper.
- Keep chat-specific action values (`shareCard`, `report`, `block`) outside the primitive contract; the primitive should expose a general menu/action slot.
- Remove “profile navigation disabled” as a design variant. A missing `onProfileTap` callback is runtime availability, not a separate component state.
- Update Widgetbook so the chat top-bar preview is cataloged under the canonical top-bar contract or clearly marked as a product composition using `CatchTopBar`.

Resolved implementation questions:

- Chat action enum and disabled-action policy remain in chat state, not in a
  widget wrapper.
- The conversation title/avatar slot belongs directly on `CatchTopBar.identity`
  so the canonical primitive owns the layout, typography, hit target, and
  overflow behavior.

## Host Roster System

Status: implemented in Widgetbook

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| ParticipantTable: catalog vs contract | merge | `catch.roster_table` is already the canonical primitive. Catalog and contract previews should converge instead of remaining duplicate listings. |
| CatchRosterTiles: catalog vs contract | merge | `catch.roster_tiles` is already the canonical primitive. Catalog and contract previews should converge instead of remaining duplicate listings. |
| ParticipantRow: catalog vs contract | merge | `catch.roster_row` is already the canonical primitive. Catalog and contract previews should converge instead of remaining duplicate listings. |

Implementation target:

- Keep `ParticipantTable` in `lib/hosts/presentation/widgets/participant_table.dart` as the global host-operations primitive.
- Preserve the richer contract states: populated, empty, partial-columns, and long-copy.
- Keep `catch.roster_tiles`, `catch.roster_row`, and `catch.roster_table`
  contract previews as the canonical review surfaces.
- Remove the smaller catalog-only roster listings so Widgetbook has one review
  surface per roster primitive.

## Status Badge System

Status: implemented in Widgetbook

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| CatchPrivacyBadge: catalog vs contract | merge | `catch.privacy_badge` is already the canonical primitive. Catalog and contract previews should converge instead of remaining duplicate listings. |

Implementation target:

- Keep `CatchPrivacyBadge` as the global privacy/status primitive.
- Preserve the contract states: private-to-you, catch-private, and host-can-see.
- Remove or redirect the catalog-only privacy badge listing so Widgetbook has one canonical review surface.

## Sequence System

Status: implemented in Widgetbook

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| CatchJourneySteps: catalog vs contract | merge | `catch.journey_steps` is already the canonical primitive. Catalog and contract previews should converge instead of remaining duplicate listings. |

Implementation target:

- Keep `CatchJourneySteps` as the global ordered-sequence primitive.
- Preserve the richer contract states, including default, compact, accent, and long-copy coverage.
- Remove or redirect the catalog-only journey steps listing so Widgetbook has one canonical review surface.

## Metric System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| Metric rail consolidation | merge | Use `CatchMetricStrip` as the canonical visual style. The old stat rail primitive is removed rather than retained as an alias or adapter. |

Implementation target:

- Keep the left-side `CatchMetricStrip` styling: centered value-over-label cells, compact surface padding, hairline dividers, and optional unit text.
- Use `CatchMetricStripItem` as the only metric item model.
- Club/detail stats now use `CatchMetricStrip`; the old stat-strip source file is deleted.
- `CatchMetricStrip` is registered as formal component contract `catch.metric_strip`, and Widgetbook exposes contract states as the canonical review surface.

## Hero Naming Boundary

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| TopBar vs OrganizerHeroTopBar | separate concepts | App bars and hero app bars are different components. Keep `CatchTopBar` for route chrome, and keep club/event hero implementations as hero concepts rather than top-bar variants. |

Implementation target:

- Keep `CatchTopBar` focused on app-bar title, identity, leading, search, and
  actions.
- Keep club and event hero app bars separate from the top-bar contract.
- Track any future cleanup as naming/registration work for hero concepts, not a
  merge into `catch.top_bar`.

## Surface System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| Surface vs Panel | merge | Use `CatchSurface.card(...)` for bounded card surfaces. |
| Surface vs SoftBand | merge | Use `CatchSurface.tinted(...)` for quiet tinted inset surfaces. |
| Surface vs Callout | merge | Use `CatchSurface.message(...)` for inline icon/title/message notes. |
| Section card surface | merge | Use `CatchSection.contained(...)` for section-card content chrome. |

Implementation target:

- `CatchSurface` is the only low-level surface primitive.
- Preserve base `surface`, `raised`, `primary-soft`, `transparent`,
  `tappable`, and `elevated` states.
- Keep canonical `card`, `tinted`, and `message` states in the `catch.surface`
  contract and Widgetbook preview.
- Remove redundant surface wrapper classes, imports, tests, and standalone
  Widgetbook catalog pages rather than retaining adapters.

## Section System

Status: implemented

Reviewed decisions:

| Candidate | Decision | Canonical direction |
| --- | --- | --- |
| FieldGroup vs Section | merge | `CatchSection` owns contained rounded groups and divided hairline groups. |
| Section card surface | merge | Rounded section chrome belongs to `CatchSection.contained`, not the surface primitive. |
| CatchSectionStack: catalog vs contract | merge | Keep `CatchSectionStack` as page rhythm only and remove the catalog-only duplicate preview. |

Implementation target:

- Keep `CatchField` as the information atom.
- Keep `CatchSection` as the only information-grouping primitive with
  `divided`, `contained`, and `plain` variants.
- Keep `CatchSectionStack` for page gutter/rhythm only.
- Remove the former field-group, design-section, and section-surface references
  rather than retaining wrappers or adapters.
