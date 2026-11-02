---
doc_id: redesign_absorption_evidence
version: 0.1.0
updated: 2026-11-02
owner: ui_elevation_initiative
status: draft
---

# Redesign Absorption Evidence

Four API decisions the redesign programme takes in P0: ListRow absorbs the Field
row layouts, AppShell absorbs the scaffold family, Section absorbs its variants,
and Image unifies four image widgets. Each sheet gives what exists today, what
the system README shows, and a proposed anatomy of slots and states with at most
six variants (amendment F). An absorption is executed when the absorbing
component's first redesigned consumer lands, never in the abstract (amendment D).

**These are proposals for the reviewer. Nothing here is decided, and no Dart
changed.**

Counts were measured on `6fb4785b1`. A count is the number of Dart files in `lib`,
`apps` and `packages` that name the symbol, so it includes the defining file and
overlaps between constructors; "app" is the same count over `lib` and `apps`
only. The appendix has the commands.

## Findings that change the plan

- **`CatchViewport` means two different things.** In Dart it picks a layout for
  the current width. In React it is the whole screen, and the design source's
  `CatchViewport = AppShell` follows React. See the AppShell sheet.
- **`CatchIndexRow` has one app caller; Field's row constructors have about 250
  file references.** "ListRow absorbs Field" moves most of the app's rows, not a
  few, and reverses a rule the registry states today.
- **`CatchCollectionSection` does not exist.** It is the constructor
  `CatchSection.collection`. Three of the plan's five Section "variants" are
  internal renderers with no app callers, so the real surface to reduce is
  `CatchSection`'s 21 constructors.
- **`CatchNavigationViewport` is a pane layout**, and belongs under PaneLayout
  rather than AppShell.
- **`CatchPrimaryRail` is not navigation.** It is the type of the pinned rail under a
  top bar, implemented by filter rails and tab bars. The plan's Navigation row
  lists it, and AppShell has no slot for it.
- **The plan names `grade` and `fallback` on Image; `index.d.ts` declares neither.**

## 1. ListRow absorbs the Field row layouts

Record: `catch.index_row` (T2). System name: `ListRow`.

### What exists today

| Symbol or constructor | Takes | Files | App |
|---|---|---:|---:|
| `CatchIndexRow` | title, subtitle, footer, leading, trailing, selected, onTap, semanticLabel, titleStyle, titleMaxLines | 2 | 1 |
| `CatchField.read` | copy, content or title and body, icon, leading, value, states, tone | 88 | 83 |
| `CatchField.nav` | copy, title, body, leading, value, chevron, status, onTap | 54 | 51 |
| `CatchField.action` | copy, title, onTap | 47 | 45 |
| `CatchField.navigate` | content (a layout), onActivate, secondaryAction | 37 | 34 |
| `CatchField.content` | copy, title, body | 35 | 33 |
| `CatchField.sortable` | copy, title, metadata, leading, onTap | 3 | 1 |
| `CatchRecordLayout` | title, icon, color, metadata, facts, description | 32 | 28 |
| `CatchPersonLayout` | name, imageUrl, avatarColors, avatarShape, supportingText, context, facts, badges | 20 | 17 |
| `CatchConversationLayout` | name, preview, imageUrl, avatarShape, timestamp, context, activityLabel | 4 | 2 |
| `CatchFieldRow` | the row renderer behind the constructors above | 23 | 17 |

Field constructors that are controls, not rows, and stay with Field: `input` (94
files), `inputActions` (8), `add` (11), `select` (2), `control` (25), `choices`
(1), `optionCards` (2), `stepper` (12), `toggle` (35). The last four render a
control inside a row, so where they land is an open question below.

### What the system README shows

- **States:** rest, hover, focus, selected, unread, done, disabled.
- **Slots:** title, subtitle, meta, body, leading, value, status, trailing, action,
  children. `children` sits on the right or below the text (`childrenSlot`).
- **Leading shortcuts:** `avatar`, `date`, `icon` with `iconTone`, `marker`, `time`,
  `rank`. "Pick the leading slot that says what the row is about."
- **Props:** 30 in `index.d.ts`, against 9 in today's `CatchIndexRow` contract.

### What the evidence says

- The row job already lives in Field, so this moves roughly 250 file references
  from Field to `CatchIndexRow`, each when its screen is redrawn.
- The registry says the opposite today. `catch.index_row`'s naming reason reads
  "Ordinary person and record collections use Field layouts in typed row sections."
- These rules assume Field owns rows and must move with it:
  `catch_field_requires_section_context`, `catch_field_owns_row_interaction`,
  `catch_row_section_fills_viewport`, `catch_section_content_is_passive`. So must
  `interactionContracts.field_row`, whose owner is fixed to `CatchField` in the
  schema, and `CatchSection.fieldRows` (122 files).
- A Field layout is closed and passive: it cannot own input, focus or geometry.
  That guarantee is worth keeping in the new row.

### Proposed anatomy

| Part | Proposal |
|---|---|
| Slots | leading, title, status, subtitle, meta, body, below, value, trailing, action |
| States | rest, hover, pressed, focus, selected, unread, done, disabled, loading |
| Variants (4) | `CatchIndexRow(...)` for any slots; `.person`, `.record` and `.conversation`, which keep today's closed layouts by filling slots from typed facts |

- `loading` keeps the real row geometry, as `CatchField.loading` does today.
- Leading kinds are widgets passed to `leading` (`CatchDateTile`, `CatchAvatar`,
  `CatchIconTile`, `CatchMarker`), not variants.
- `CatchRecordLayout`, `CatchPersonLayout` and `CatchConversationLayout` become those
  constructors. `CatchFieldRow` stays as an internal renderer until its last caller.

### Open for the reviewer

1. Does a row with a control (`CatchField.toggle`, `.stepper`, `.control`) become a
   `CatchIndexRow` with a control in `trailing`, or stay in Field? §5 says Field
   becomes "the input only", which suggests the first. That moves 66 more app file
   references.
2. Should `.person`, `.record` and `.conversation` exist at all, or do bindings in
   each context's `parts/` fill the base row's slots? The second has one variant
   and no typed facts in the library, but gives up the closed-content guarantee.

## 2. AppShell absorbs the scaffold family

Record: `catch.viewport` (T2). System name: `AppShell`.

### What exists today

| Symbol or constructor | Job | Files | App |
|---|---|---:|---:|
| `CatchViewport` (+ `.atWidth`, `.sliver`, `.scene`, `.sliverLane`, `.box`) | **Picks a layout by width**: compact, medium and expanded builders | 19 | 16 |
| `CatchScaffold.standalone`, `.stepFlow`, `.workspace` | Surface, keyboard resize, safe area | 40 | 34 |
| `CatchRootScreenScaffold.standard`, `.fullBleed`, `.sections`, `.withPrimaryRail` | A tab's own screen: title in the scroll content, pinned rail, refresh | 18 | 14 |
| `CatchRouteScaffold` | A pushed route: top bar builder, statuses, footer, actions | 74 | 73 |
| `CatchRouteBody` (8 recipes) | That route's body: gutters, rhythm, slivers, paging, full bleed | 74 | 73 |
| `CatchNavigationViewport` | The same route as columns or one active pane | 6 | 1 |
| `CatchWorkspacePaneScaffold` | One full-height pane | 8 | 5 |
| `CatchPrimaryRail` | Type of the pinned rail under a top bar | 11 | 5 |

`CatchRouteBody` by recipe: `standardViewport` 31, `standardSections` 22,
`standardConstrained` 17, `standard` 13, `fullBleed` 13, `standardConstrainedSlivers`
4, `standardSlivers` 3, `paged` 2.

React's `CatchViewport` is already the shell: `register`, `sizeClass`, `fill`,
`navigation`, `topBar`, `dock`, `overlay`, `children`.

### What the system README shows

- **States:** rest. "Route transitions: push, modal sheet, crossfade between tabs."
  The top bar learns when the body has scrolled.
- **Slots:** navigation, topBar, dock, overlay, children.
- **Props beyond slots:** `theme`, `register`, `format`, `size`, and `frame` and
  `height`, which exist to draw a screen on the design canvas.

### What the evidence says

- **The name collides.** Registry, plan and design source all make `CatchViewport`
  the shell. The 16 app files that use Dart's `CatchViewport` want a width selector.
  The two jobs cannot share one symbol, so one must be renamed.
- `CatchRouteScaffold` is the real centre of gravity, at 73 app files. Its jobs map
  cleanly onto the slots: `topBarBuilder` to `topBar`, `footer` to `dock`.
- **Two jobs have no slot.** `statuses` (banners) could be Notices in the body, and
  `actions` (the pinned rail) has no home. PaneHeader's `filters` row covers panes
  but not a phone's pinned rail.
- `CatchRouteBody`'s recipes are ScreenBody's job, not the shell's: lane is
  `standardConstrained`, rhythm is `standardSections`, bleed is `fullBleed`.
- `CatchNavigationViewport` takes panes and a compact pane id. That is PaneLayout.
- The scaffolds are members of `catch.screen_body` in the registry today, and that
  record's enforcement includes `catch_screen_scaffold_ownership` and
  `catch_screen_layout_constructor_vocabulary`, which must move with them.

### Proposed anatomy

| Part | Proposal |
|---|---|
| Slots | navigation, topBar, pinnedRail, dock, overlay, body |
| States | rest, scrolled, keyboard-open |
| Variants (2) | `CatchViewport(...)` with a scrolling body; `.slivers` where the body is slivers (a Flutter idiom, with no React twin) |

- `pinnedRail` is new to the system and needs drawing or a decision against it.
- `frame` and `height` stay canvas-only and are not ported to Dart.
- `CatchScaffold`, `CatchRootScreenScaffold` and `CatchRouteScaffold` become internals,
  or `@Deprecated` shims under the shim ratchet (§5.8) until their callers are redrawn.
- `CatchRouteBody` folds into `CatchPageBody`.
- `CatchNavigationViewport` and `CatchWorkspacePaneScaffold` become PaneLayout's internals.

### Open for the reviewer

1. Which symbol gives way? Rename today's selector (for example
   `CatchSizeClassBuilder`, 16 app files) and keep `CatchViewport` as the shell, as
   the registry and React do; or keep Dart's `CatchViewport` and rename the shell in
   the registry, React and the design source. The first is smaller.
2. Does the pinned rail get a shell slot, or does it move into the top bar or body?
3. Does `CatchNavigationViewport` move to PaneLayout, against §5.5?

## 3. Section absorbs its variants

Record: `catch.section` (T1). System name: `Section`, with `SectionHeader` as a part.

### What exists today

| Plan's name | What it is | Files | App |
|---|---|---:|---:|
| `CatchRowSection` | Internal renderer behind `CatchSection`'s row recipes | 3 | 0 |
| `CatchCollectionSection` | **Does not exist.** It is `CatchSection.collection` | 0 | 0 |
| `CatchContentSection` | Internal renderer, "shared readable lane" | 2 | 0 |
| `CatchDependentRowSection` | "Internal renderer for Section's conditional configuration recipe" | 3 | 0 |
| `CatchDaySectionHeader` | Sticky caps header for feeds with a day count | 2 | 1 |
| `CatchSectionHeader` | Title, count and trailing action; `.kicker` | 9 | 6 |

`CatchSection` itself is named by 272 files (251 app). Its 21 constructors, one of
which (`choiceGroup`) the registry's `dart.constructors` omits:

| Constructor | Files | App | Proposed home |
|---|---:|---:|---|
| `fieldRows` | 122 | 121 | Base, rows |
| `content` | 38 | 36 | Base, `dividers: none` |
| `divided` | 32 | 30 | Base |
| `plain` | 28 | 27 | Base, `dividers: none` |
| `containedRows` | 28 | 26 | Base, `container: tile` |
| `contained` | 24 | 22 | Base, `container: tile` |
| `containedFieldRows` | 23 | 22 | Base, `container: tile` |
| `rows` | 17 | 15 | Base |
| `sliverRows` | 11 | 9 | `.sliver` |
| `action` | 8 | 6 | `.action` |
| `sliverLoadingRows` | 8 | 6 | `.sliver`, `loading` state |
| `containedLoadingRows` | 7 | 5 | Base, `container: tile`, `loading` state |
| `controls` | 7 | 5 | Base, `dividers: none` |
| `loadingRows` | 7 | 4 | Base, `loading` state |
| `choiceGroup` | 5 | 4 | Base, children are Chips |
| `collection` | 5 | 3 | `.collection` |
| `status` | 5 | 3 | `.status` |
| `containedFieldGroups` | 3 | 1 | Base, children are Sections |
| `horizontal` | 3 | 2 | Base, child is a Rail |
| `formRows` | 2 | 0 | Base, rows; the `CatchForm*` patterns stay T3 (§5.7) |
| `dependentFieldRows` | 2 | 1 | `.dependent` |

### What the system README shows

- **States:** rest. "Static; rows animate in."
- **Slots:** title, kicker, action, note, empty, footer, children. `count` beside the
  title. `SectionHeader` is exported for headers with no list.
- **Options, not variants:** `dividers` (between, all, none), `container` (plain, tile),
  `timeline`, `columns` (2, 3).

### What the evidence says

- The plan's five names are mostly implementation. Only `CatchDaySectionHeader` has
  an app caller, and just one (`explore_events_section.dart`). The work is taking
  `CatchSection` from 21 constructors to six, not removing those classes.
- 15 of the 21 constructors map onto the base constructor's options in the table
  above, which is what the system's `dividers` and `container` express.
- The Flutter side of `timeline` is `CatchTimelineList`, merged in
  [#1478](https://github.com/torana-labs/catch-dating-app/pull/1478) after these
  counts, as a child of `CatchSection.content`. It would fold into the `timeline` option.
- `catch_use_named_catch_section_constructor` steers callers to the named
  constructors, so it inverts when this lands.

### Proposed anatomy

| Part | Proposal |
|---|---|
| Slots | title, kicker, count, action, note, children, empty, footer |
| States | rest, loading, empty |
| Variants (6) | `CatchSection(...)` with `dividers`, `container`, `timeline`, `columns`; `.sliver`; `.action`; `.status`; `.collection`; `.dependent` |

- `CatchRowSection`, `CatchContentSection` and `CatchDependentRowSection` stay internal.
- `CatchDaySectionHeader` becomes `CatchSectionHeader` with `sticky`.
- This sits at the six-variant cap. `.sliver` is a Flutter idiom with no React twin.

### Open for the reviewer

1. Are `.action`, `.status` and `.collection` sections at all? They are modules with
   their own anatomy (message, details, action), and could be Notice and EmptyState
   inside a base Section, which would leave three variants. They have 12 app callers
   between them, so this is cheap to decide either way.
2. `catch.section_stack` (`CatchSectionList`) appears under Section, Stack and
   ScreenBody in §5. Which one takes it?

## 4. Image unifies four image widgets

Records: `catch.network_image`, `catch.graded_image`, `catch.detail_media` (all T2).
System name: `Image`; registry symbol `CatchImage`, which does not exist yet.

### What exists today

| Symbol | Job | Takes | Files | App |
|---|---|---|---:|---:|
| `CatchNetworkImage` | Loads and decode-sizes a remote image; neutral fallback | url, fit, width, height, errorBuilder, loadingBuilder, semanticLabel, cacheWidth, cacheHeight | 18 | 14 |
| `CatchGradedImage` | Applies the warm photo grade to any child | child, enabled | 8 | 5 |
| `CatchHeroImage` | Graded network image, fallback and scrim, filling its parent | imageUrl, semanticLabel, showScrim | 3 | 2 |
| `CatchMediaOverlay` | Scrim gradients; `.thumbnail`, `.detailHero`, `.photoFrame`, `.heroTint` | variant or base colour | 3 | 1 |
| `CatchImageFallbackSurface` | Branded fallback; a member of `catch.network_image` | recipe | 7 | 4 |

React has `CatchHeroImage`, `CatchAppCaptureImage` and `CatchPhotoTile`.

### What the system README shows

- **States:** rest, loading, failed. "Fades in over 240 ms; a failed picture keeps the
  placeholder colour."
- **Slots:** title, caption, words over the bottom on a dark fade.
- **Props:** `src`, `alt`, `aspect`, `fit`, `radius`, `placeholder`, `kind` (photo, video),
  `duration`, `onPlay`, `bleed`.

### What the evidence says

- Today's four are layers, not rivals: `CatchHeroImage` is
  `CatchGradedImage(CatchNetworkImage(...))` plus a fallback and a scrim. One component
  can own all of them.
- §5 lists `grade` and `fallback`; `index.d.ts` has neither. `placeholder` is the
  fallback colour. The design source's `Image` applies no grade, while web-ui's
  `CatchHeroImage` applies it in CSS, with a parity test against the Dart values.
- `CatchGradedImage` wraps any child, but four of its five app callers wrap a
  `CatchNetworkImage`. Only `profile_body.dart` passes something else, an `Image` from
  an image provider.
- `catch_no_raw_network_image` steers feature code to `CatchNetworkImage`. It must
  point at `CatchImage` once that lands.
- §5 lists React's `CatchPhotoTile` under both Surface and Image. An alias belongs to
  one record, so it is on `catch.surface` for now.

### Proposed anatomy

| Part | Proposal |
|---|---|
| Slots | title, caption |
| States | rest, loading, failed |
| Variants (3) | `CatchImage(src:, alt:, ...)`; `.hero`, with `bleed` and the hero scrim; `.provider(image:, alt:)`, for a picture that is not a remote URL |

- Video is `kind`, not a variant, as in the system.
- The scrim follows from `title`, `caption` and `.hero`; `CatchMediaOverlay`'s recipes
  become internal.
- `CatchNetworkImage` stays as the internal loader, keeping decode sizing, and
  `CatchGradedImage` stays as the internal grade.

### Open for the reviewer

1. Does the grade need a prop? `CatchGradedImage` has `enabled`, and §5 lists `grade`,
   but the system declares none. The proposal keeps it always on in both frameworks,
   which needs a design answer because the design source's `Image` draws no grade.
2. Do thumbnails need a variant? `CatchMediaOverlay.thumbnail` has its own scrim, and
   `event_thumbnail.dart` is its main user. The proposal leaves that as a binding in
   the events context's `parts/`.

## Appendix: how the counts were taken

From the repository root, at `6fb4785b1`. Dart only, generated files excluded:

```sh
# Files, for one symbol or constructor
grep -rlE '\bCatchRouteScaffold\b' lib apps packages \
  --include='*.dart' --exclude='*.g.dart' --exclude-dir=build --exclude-dir=.dart_tool | wc -l

# The "App" column drops packages
grep -rlE '\bCatchRouteScaffold\b' lib apps \
  --include='*.dart' --exclude='*.g.dart' --exclude-dir=build --exclude-dir=.dart_tool | wc -l

# A constructor: escape the dot; \b keeps .nav from matching .navigate
grep -rlE '\bCatchField\.nav\b' lib apps packages \
  --include='*.dart' --exclude='*.g.dart' --exclude-dir=build --exclude-dir=.dart_tool | wc -l
```

Each row of the tables repeats these with its own symbol. The system's states, slots
and props are each record's `system` block in `design/components/catch.components.json`.
