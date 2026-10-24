---
doc_id: design_language
version: 1.35.0
updated: 2026-10-23
owner: ui_elevation_initiative
status: active # identity locked; Phase 0–1 complete (bundled optical-sized fonts, B&W tokens, ActivityPalette routing, matte grade, anti-drift gates); Phase 2 flagship Profile built
---

# Catch Design Language

Source of truth for Catch's **visual identity**: palette, typography, photographic
treatment, metaphors, surfaces, and motion. Pairs with `docs/app_architecture.md`
(layout/scroll/sizing architecture) and `docs/widget_catalog.md` (component inventory). The
multi-phase rollout + **live status** lives in
[`docs/ui_elevation_implementation.md`](ui_elevation_implementation.md).

> **Status (2026-05-31):** The "Sunset" cream+orange palette is **retired**; the direction
> below is **locked** (see §9). Phases 0–1 are implemented (fonts bundled + optically sized,
> B&W tokens, ActivityPalette routing, matte-duotone grade, Catch UI analyzer lints,
> and the zero-diagnostic Catch UI gate) and the **Phase 2 flagship Profile** is built — see
> [`ui_elevation_implementation.md`](ui_elevation_implementation.md) for the per-phase status.
> Some choices stay **tunable** (activity pigments, photo grade, the display face). Visual
> studies live in [`docs/visual_references/`](visual_references/) as runnable HTML.

---

## 1. North star

Two references anchor the direction: **Wallpaper\*** (clean luxury minimalism —
near-monochrome, grid discipline, generous whitespace, color used as an event not a
default) and **Roadbook** (warm editorial soul — confident type, captioned
photography, **warm-desaturated color grading**, restraint). Both are, in fact,
restrained and mostly sans/monochrome.

**Catch = editorial restraint + a typographic voice + meaningful color.** We borrow their
discipline (grid, whitespace, hairlines, tracked labels, muted grading) but our
*voice* is Archivo, and our *only* color is meaningful — it tells you the activity.

### The seven principles (the bar every screen must meet)

1. **Type carries personality; color carries meaning.** If a screen needs decorative
   color to look good, the type/layout isn't done.
2. **Whitespace is a feature.** Generous, slightly asymmetric margins.
3. **Hairlines, not boxes.** 1px rules + negative space over filled cards/shadows.
4. **Photography is graded and framed, never raw filler.** One grade on every photo.
5. **Color = activity.** No decorative brand accent; chroma appears only where an
   activity gives it (§3).
6. **Tracked uppercase mono** for kickers/labels/data; **Archivo** for voice/head;
   the platform system font for function.
7. **It must hold at text-scale 2.0 and in dark mode.** Editorial layouts live on type;
   if Dynamic Type breaks it, it isn't done.

---

## 2. Color — base is black & white

The base system is **paper + ink**. Neutral surfaces (profile, chat, onboarding,
settings, forms) use **no decorative color at all**. Light is the browse/forms register;
**dark is reserved for "wow" surfaces** (event spotlight and celebration) and is
first-class.

| Role (`CatchTokens`) | Light | Dark (wow) | Notes |
|---|---|---|---|
| `bg` | `#F4F4F1` | `#0F0E10` | cooler gallery off-white — **never cream** |
| `surface` | `#FFFFFF` | `#18171A` | |
| `raised` | `#FAFAF8` | `#211F23` | input/raised fills |
| `overlay` | ink @ 55% | `#000` @ 72% | scrims |
| `ink` / `ink2` / `ink3` | `#16140F` / `#544F47` / `#9C958A` | `#F4F0E8` / `#BAB2A7` / `#7E776D` | primary/secondary/tertiary text |
| `line` / `line2` | ink @ 8% / 14% | paper @ 13% / 22% | hairlines |
| `primary` (default action) | `#16140F` (ink) | `#F4F0E8` (paper) | **actions are ink/paper**, not a brand hue |
| `primaryInk` | `#F4F4F1` | `#16140F` | text on a primary fill |
| `success`/`warning`/`danger` | `#2F7D55` / `#B9770F` / `#C2261A` | lighter variants | functional only |

**Token model change:** there is **no brand accent**. `primary` becomes the
default *action* color (ink in light, paper in dark). On activity surfaces the action
color is overridden by the activity pigment (§3). The old `heroGrad` brand gradient is
**deprecated** — hero/wow gradients derive from the activity pigment or ink instead.
`like`/`pass`: `like` defaults to ink (bold); optional systematic flourish — a "Like"
may inherit the activity color of the event where the two people would cross paths.

---

## 3. Activity color system — the only chroma (keep + refine)

`event_activity_visuals.dart` already keys every `ActivityKind` to a color set + a
`CustomPaint` pattern + a glyph (`EventBackdropImage`). This is the **correct answer
to user-generated photography** — events are *art-first, photo-optional* — and it is
the single most systematic asset in the app. **Keep it.** Three refinements:

1. **Candy → pigment.** Replace the bright pastel 3-stop gradients with **confident
   mid-tone pigments** (one screen-printed ink per activity). Bolder where it counts
   (the symbol), calmer elsewhere. Starting values (light context — **editable/tunable**,
   each needs a dark variant + a soft tint):

   | Activity | Pigment | Activity | Pigment |
   |---|---|---|---|
   | social run | `#D85A3C` | dinner | `#C44D6A` |
   | walking | `#6E9A5A` | pub quiz | `#4356A8` |
   | pickleball | `#2F9E7A` | bar crawl | `#B14488` |
   | padel | `#2E9AA0` | singles mixer | `#D85A6E` |
   | tennis | `#4E9A4E` | yoga | `#8A5FB0` |
   | badminton | `#4F70C8` | strength | `#B0573C` |
   | cycling | `#3A6FD0` | open format | `#7A7166` |

2. **Bespoke emblems** (deferred — see §8/task). Replace abstract patterns + generic
   Phosphor glyphs with a **symbolic mark per activity** (route, plate, paddle, lotus,
   martini…). SVG drafts in `catch_activity_grading.html`. Ship on Phosphor glyphs now,
   swap emblems in later.

3. **Formalize as a token-keyed, dark-aware `ThemeExtension`** (the sanctioned
   "expressive palette" layer). This satisfies the Phase-1a token-routing requirement
   without abandoning the expressive system. Make it **editable in one place.**

---

## 4. Photography — one grade, at display time

User photos are inconsistent and low-quality. We **do not edit them on upload** — we
**grade them at display time** (non-destructive, reversible, tunable):

- A single **warm-desaturated duotone grade** (≈ saturation 0.78, slight contrast lift,
  subtle warm multiply + gentle darken) applied via `ColorFiltered`/shader/overlay.
- The grade matches the activity pigments, so a graded UGC photo and a generated
  activity backdrop read as **one editorial family**.
- Keep the original (moderation, the user's own view, re-grading). The grade is a
  **tunable token** — dial intensity globally in one place.

---

## 5. Typography

Three roles, no competition:

| Role | Family | Use |
|---|---|---|
| **Voice / display** | **Archivo** (variable grotesque, locked to a single **78% width** — the "78% system") | brand moments, event/club display titles, and the welcome reel |
| **Function / reading** | **Platform system font** (SF on iOS, Roboto on Android) | app bars, root titles, prose, bios, descriptions, user-authored names, buttons, navigation controls, inputs, and dense UI controls |
| **Data** | **IBM Plex Mono** | time, price, counts, OTP digits, kickers, and explicit uppercase labels |

**Why Archivo:** the current direction is typographic, restrained, and non-serif. Archivo
gives Catch a deliberate display voice without reintroducing a decorative brand accent.
Reading text and user-authored names stay native to the platform for legibility and
Dynamic Type behavior.

> The old serif/custom-sans direction is retired. Keep the swap centralized in
> `CatchFonts`, `CatchTextStyles`, and `design/tokens/catch.tokens.json`.
Generated Flutter scales and handwritten L0 roles live in `packages/catch_tokens`,
imported through `package:catch_tokens/catch_tokens.dart`. Shared theme wiring, text styles, icons, motion, and bundled fonts live in
`packages/catch_ui`, imported through `package:catch_ui/catch_ui.dart`.
`AppTheme` attaches the app-specific activity palette to `CatchTheme`.

**Legibility-first craft:**
- **Single Archivo width — 78% (ratified 2026-07-06).** The DS
  `colors_and_type.css` renders every voice/headline/prose style at
  `font-stretch: 78%`; the app matches it. Archivo's `wdth` axis (62–125) is
  NOT a per-style knob — `CatchFonts.archivoWidth` is the one width, enforced
  at the engine (`voice`/`head` take no width param). The earlier mixed
  90/92/94/100 widths were pre-decision drift and are retired. This is the
  Archivo half of the identity migration; the Newsreader→Archivo family swap
  completed earlier.
- **Dramatic scale jumps** — a large display over a small mono kicker; avoid many mid sizes.
- **Zero tracking by default.** Only explicit uppercase kicker/mono/badge roles add
  tracking. `welcomeReelHeadline` owns the ratified `-0.5px` welcome exception.
- **Near-1.0 display leading** and **generous body leading (~1.5–1.6)**.
- **Archivo is roman-only in the app.** Do not request Archivo italics or add ignored
  `fontStyle` parameters.
- Flutter native bundles `Archivo-Roman-VF.ttf`; web surfaces keep the WOFF2 build.
  Both formats are covered by the bundled Archivo OFL license.

These map onto semantic `CatchTextStyles` roles: brand display styles use
Archivo, numeric and explicitly uppercase data labels use IBM Plex Mono, and
app bars, names, sentence-case labels, controls and prose use the platform font. App UI calls semantic
`CatchTextStyles` roles; `CatchFonts` is an internal theme implementation detail.

All app-bar text uses the platform function family. `CatchTopBar.route` and
`.identity` use `CatchTextStyles.titleL`; root `.screen` and `.primaryRail` use
`CatchTextStyles.headline`. Context always follows the primary title using
`bodyS`. A screen's purpose is primary; an event or organizer name is
secondary context. Person-identity destinations may use the person's name as
the primary title. No app-bar eyebrow, kicker, IBM Plex, Archivo, raw title
widget or feature-owned typography/geometry is valid.

Toolbar navigation, icon actions, menu triggers and collapsed search share a
44-point visual extent, a platform-sized hit target, centered alignment and
an 8-point peer gap. Their resting border is `CatchBorder.interactive`; a root
primary action does not drop its outline. `CatchToolbarButton.selector` owns
city/current-value controls, and `.action` owns labelled wide-screen commands.
They use the same outline and 44-point minimum height; accessible text may grow
the labelled control vertically. Its measured platform text determines both
painted size and the app bar's reserved leading width. At large text sizes,
root selectors join actions and search in a separate control row beneath the
full-width title; opening search replaces those control-row peers. `CatchTopBarTone.overlay`
sets contrast once for the entire bar. Per-icon colors, size, radius and plain
variants are invalid inside app bars, including generic and overflow wrappers.
The shared bar asserts these constraints. Semantic text commands and step
counters retain their existing text recipe; photo/map controls outside the
canonical bar retain their separately registered media treatment.

IBM Plex is reserved for numerals and explicitly uppercase labels. Sentence
case and user-authored text use the platform function family; do not uppercase
user data to make it fit a font role. Legacy mono roles outside app bars require
separate caller migration and are not approval for new lowercase mono text.

Golden snapshots are regression evidence, not design authority. Establish the
semantic and geometry rules, translate invalid configurations into valid
recipes, inspect fresh renders, then deliberately update affected baselines.

### 5.1 Platform function scale and readable records

The Audience review promotes these selected metrics into
`design/tokens/catch.tokens.json`, generated as immutable iOS/Android profiles.
Numbers below are size / line height / weight in logical units. They are Catch
composition choices informed by the 2026-09-03 platform inventory, **not a claim
that every value is a native default**. iOS Footnote informs context (Caption 1
is 12/16, not 13/18); Material
Title Medium and Body Small inform Android names/context. Compact 16/24 reading
text and zero tracking are deliberate Catch choices.

| Semantic use | iOS | Android |
| --- | --- | --- |
| Functional headline | 24 / 30 / 600 | 24 / 32 / 600 |
| UI title | 20 / 25 / 600 | 20 / 28 / 500 |
| Person or record title | 16 / 20 / 600 | 16 / 24 / 500 |
| Reading body | 16 / 24 / 400 | 16 / 24 / 400 |
| Secondary metadata | 14 / 20 / 400 | 14 / 20 / 400 |
| Record context | 13 / 18 / 400 | 12 / 16 / 400 |
| Command | 15 / 20 / 400 | 14 / 20 / 400 |
| Sentence-case status | 12 / 16 / 600 | 12 / 16 / 600 |
| Prominent quantity | 24 / 30 / 600 | 24 / 32 / 600 |
| Editable field value | 16 / 24 / 500 | 16 / 24 / 500 |
| Field caption/support | 13 / 18 / 500 | 12 / 16 / 500 |
| Minimum interactive hit area | 44 | 48 |

`CatchPlatformTokens` selects the same `defaultTargetPlatform` used by
`CatchFonts`. Flutter treats that native target as a compiler constant in
profile/release builds; the profiles themselves are Dart constants. Tests use
Flutter's debug target override, and web resolves its browser platform at runtime.
There is no independent Theme-based selector or redundant platform build flag.
macOS uses Apple metrics; other desktop targets use the Android baseline.

Rows use a 40-unit marker/avatar, a 12-unit leading gap, 8-unit vertical padding,
a 4-unit heading-to-metadata gap, and an 8-unit prose gap. These belong to
`CatchRecordTokens`, backed by canonical layout tokens. Sections retain outer
gutter/divider ownership, and the shell retains floating-navigation obstruction.
Field caption and value extents derive from typography, so a scale change also
updates disclosure and save-status alignment.

Ordinary rows use `CatchSection.rows` (or `.sliverRows` for a growing list)
and `CatchField.read` / `.navigate`. Supply `CatchPersonLayout` for people,
`CatchRecordLayout` for events and records, or `CatchConversationLayout` for
conversation summaries. These are sealed passive values, not Widgets: they
cannot own callbacks, gestures, padding, radii, or dividers. Record text has
natural height. Status moves below
content at enlarged text sizes. `CatchBadge.status` is a passive rounded rectangle
with readable categorical tones. `CatchChoiceInput.segmentedVariant.summary` is a tappable
rounded rectangle with selected semantics; `CatchButton.command` owns the paired
sort/filter action treatment. Color communicates positive, attention, or affinity
meaning and does not introduce a brand accent. These recipes supersede the
feature-local Audience preview typography and palette.

Only a verified page or pane perimeter permits square full-width feedback.
If the renderer has no matching perimeter, feedback uses rounded containment.
This rule applies to hover, press, focus and selection, including legacy
geometry adapters; missing context must never imply edge-to-edge geometry.

Action and CTA labels wrap naturally at the selected platform font size.
`CatchButton.selection` is the explicit compact-chrome exception for a current
value (for example, the selected city): one visible line with ellipsis, full
value in semantics and tooltip, and the same native target minimum. It never
shrinks text. Do not use this constructor to truncate commands or form labels.
Field trailing value plus custom metadata wraps inside its allocated lane;
disclosure glyphs remain fixed and custom actions retain their full hit targets.

### 5.2 Native reference and Catch adoption boundary

`design/tokens/catch.tokens.json` separates three authorities:

1. `platformReference` preserves researched native defaults and source identity,
   units and version. Pinned upstream Material inputs and focused Apple/native
   acceptance inputs live in `design/tokens/platform_sources/`. They are source
   dependencies, not runtime theme skins or an app-adoption ledger.
2. Semantic `typography`, `interaction`, `layout`, `motion` and accessibility
   policies select Catch's authored choices. A native reference is not permission
   to silently replace the ratified 11-role reading profile, brand typography,
   activity palette, 20-point body gutter or floating navigation. Every researched
   domain has an explicit adoption, reference-only or runtime-owned decision.
3. Shared primitives consume generated semantic values. Functional text and
   Material fallback text use the same platform profiles. Compact visual controls
   can remain smaller than their 44/48 hit areas, but padding must actually
   respond to input and neighboring targets must not overlap.

The web reads the same source. `gap` holds the six `CatchGaps` relationships,
`stroke` the `CatchStroke` widths, `windowSize` the Material 3 class lower
bounds behind `CatchWindowSize`, and `layout.pageBodyEnd` the page body's
bottom inset; Flutter reads all four from the generated constants. `layer` is a
web-only z-index scale. `typography.web` is the function profile for the web,
aliasing the iOS profile, and `typography.brand` holds the Archivo voice and
IBM Plex Mono data roles under their `CatchTextStyles` names. The generator also
emits `--catch-theme-<role>` for every colour role: light on `:root` and
`[data-catch-theme="light"]`, dark on `[data-catch-theme="dark"]`.
`test/core/theme/web_token_families_parity_test.dart` pins the generated CSS to
the Flutter values. The shared stylelint preset in `@catch/web-config` rejects
raw values that have a token family.

The floating navigation label has its own generated `navigationLabel` role
(13/13, weight 600, zero tracking on both platforms). It deliberately does not
inherit button typography: changing a generic control must not resize the
approved selected navigation pill.

Safe areas, keyboards, platform clock format, text scaling, reduced-motion
preferences, window constraints and OS font optics remain runtime-owned. Device
snapshot coordinates, every Dynamic Type category's measured font size, native
UIKit control snapshots and asset pixel grids are not portable layout constants.
The runtime must adapt rather than select hardcoded phone-specific offsets.

`design:platform-token-coverage` independently verifies pinned source values and
provenance, rejects missing reference leaves and unclassified domains, and checks
semantic profile completeness and functional-style consumption. Its mutation
tests must fail for deleted values, changed numbers, wrong units and wrong
platform provenance. Generator freshness alone is not adoption evidence.
Measured widget tests separately cover real hit regions, keyboard behavior,
large-text reflow, reduced motion and pinned rail ancestors in both apps'
shared component system.

Events is the activity-led inventory adopter: Upcoming groups by day; Past groups
by month/year. Both use `CatchRecordLayout` facts inside `CatchField.navigate` and whole-row navigation. The
canonical root owns its pinned rail, body gutters and navigation obstruction;
the feature supplies grouping and meaningful copy, not another geometry recipe.


---

## 6. Metaphors

**Presentation tiers (ratified 2026-08-05):** every entity material (event
ticket, organizer poster, person polaroid) ships in at least two tiers — a **hero**
form for surfaces where the entity earns attention, detail, and vertical
space (detail heroes, featured cards, cover moments), and a **condensed**
form for long lists and date-grouped rails (DateTicket rows, index rows).
More tiers are allowed when a surface justifies them; a surface never mixes
tiers within one list.

- **Ticket → events: keep & refine.** `catch_ticket_shape_clipper.dart` (real `CustomClipper`
  notches, perforation, Hero card→detail) is strong, award-adjacent craft. Refine: the
  fixed `eventTicketMediaHeight = 136` → aspect-ratio/constraint (Dynamic Type); push
  the ticket-stub typography (serial/time treatment).
- **Poster → organizers: canonical.** Organizers announce a recurring scene;
  `CatchPoster` is the shared material for Explore spotlight and Club
  Detail identity. Its bounded recipe exposes four layouts (`editorial`,
  `photo`, `split`, `minimal`) and three treatments (`paper`, `ink`, `signal`).
  Consumer surfaces use `editorial` + `paper` until a persisted host recipe is
  approved. Real cover photography or deterministic `ClubPlaceholderCover`
  fills the media lane, while provenance/authority remains explicit overlay
  state rather than being implied by visual polish.
- **Polaroid → people: canonical.** `CatchPolaroid` reserves the instant
  photograph for a person: portrait media, quiet identity caption, and optional
  context overlay. The shared Profile hero is the reference adopter. A future
  Cross Paths rail may attach the relevant event-ticket stub, but it must not
  expose identifiable attendees until its relationship and consent source is
  approved.

---

## 7. Surfaces, layout, motion, scope

- **Light + dark, used intentionally** — light for browse/forms, dark for wow surfaces.
- **Hairlines over boxes; generous whitespace; grid discipline.**

### 7.1 Containment doctrine — when a surface earns a border

Containers mark **objects, actions, semantic states, or independent measurements**.
A bordered or filled surface in product UI must pass at least one of:

- **R1 · Collection object** — a peer in a set you browse or choose among
  (feed tickets, organizer posters, person polaroids, photo slots). The
  container is the object's material; material marks type (events are
  tickets, organizers are posters, people are polaroids).
- **R2 · Actionable module** — tappable as a whole, or carrying a CTA
  cluster owned by exactly this content (booking dock, callout card, task
  card, QR panel).
- **R3 · Plane change** — sheets, menus, overlays, docks, floating
  controls. Elevation resets the rules; content inside starts flat again.
- **R4 · Status tone** — the fill/border carries semantic state
  (warning/error/success notices, primarySoft signal cards).
- **R5 · Field or list frame** — ONE hairline container around related rows
  or a controlling setting and its dependent configuration. Peer rows may
  have separators; dependents attach through a subtle tint inside the same
  perimeter. Never card-per-row or a box around children of an uncontained control.

- **R6 · Independent metric collection** — one scalar/date and its label per
  tile in `CatchMetricSection.grid` or `.dataQuality`. This supports comparison
  and scanning; it does not authorize cards around arbitrary prose or sections.
  Tiles have a shared boundary outline, no shadow, 16 pt padding and equal
  12 pt horizontal/vertical gaps. Paired tiles share height and width. Labels,
  values and captions wrap naturally. Below 320 pt available width or at text
  scale 1.4 and above, the collection becomes one column. An odd final tile
  fills the lane. Use native metric and supporting typography; missing data
  displays a dash, while a measured zero stays zero.

Independent organizer metrics (Performance, Reviews, All time, Audience and
public Preview) use R6, never a shared strip with vertical dividers. The compact
metric rail remains for short, related context about one subject, such as event
capacity. Section headings remain outside metric surfaces. Audience channel
explanations are full-width, stacked text rows under their own section heading;
counts do not imply that a messaging channel is enabled.

`packages/catch_ui/test/metric_section_test.dart` checks equal gutters, paired
geometry, semantic boundaries, readable large text and missing-data behavior.
Intentional layout corrections update reviewed captures; historical goldens do
not override these rules.

Everything else is an **attribute of the page's subject** and renders flat:
kicker + typography + hairlines + spacing carry hierarchy.

Additional rules:

- **Depth ≤ 1.** A bordered surface never contains another bordered
  surface; only a plane change (R3) resets the count. An attached dependent
  tint has no perimeter of its own and does not restart the depth count.
- **Exempt material classes:** chips/pills/badges (data-chip anatomy
  includes its border), skeletons (mimics follow whatever their subject
  does), and the immersive stage/paper/celebration grammars (their own
  ratified languages).

The audited application of this doctrine lives in
`docs/design_parity/containment_audit.md`.

Body compositions selecta semantic recipe before paint. Ordinary informational
sections and successful-empty content stay flat; emptiness alone never earns a
surface. `CatchSection.action` owns a single task: title, optional structured
facts, explanation, then a full-width action. It uses 16 pt padding, 12 pt content
gaps, a 16 pt action gap, radius.md and primarySoft fill without a shadow or
outline. Primary, secondary and destructive action roles change the button;
a destructive action does not recolor its whole module. Callers supply content,
callbacks and busy state, never padding, shadows or arbitrary button variants.
`CatchSection.contained` is the fixed, shadowless framed collection recipe. It
owns semantic boundary/focus/error treatment; use the field/row recipes when
those controls own the collection geometry. Module borders are not decoration.
`CatchBanner` body feedback uses the same padding, heading/body rhythm and
below-copy action placement for neutral, primary, success, warning and danger.
Tone changes pigment and glyph, not layout. Durable screen status bands retain
their dedicated geometry. Elevation is reserved for actual plane changes.
For inline empty content or body feedback, an icon accompanies the heading and
never reserves a column beside the whole paragraph. Message-only empty and feedback states omit decorative icons.
The parent section list owns inter-module spacing through CatchGaps.section;
modules own internal spacing. Do not combine a zero-gap list with adjoining
self-contained modules without an explicit parent-owned section boundary.

Goldens record a reviewed result, not design authority. Approve fresh renders
against these rules before updating baselines. Regression tests verify full-width
copy, matching geometry across semantic tones, action state and report spacing
in packages/catch_ui/test/surface_composition_test.dart and
test/design_system/surface_composition_test.dart.

### 7.1.1 Semantic line system — how an earned line looks

Containment decides whether a line exists. `CatchBorder` decides how every UI
separator, boundary, and interactive outline looks once that line has earned a
place. Callers choose a semantic reason through `CatchBorderRole`; they do not
pair a color and width independently.

| Role | Stroke | Contrast and state policy |
|---|---:|---|
| `separator` | 1 px | Quiet internal division; resolves from `line`. |
| `boundary` | 1 px | Passive object/list perimeter; resolves from `line2`. |
| `control` | 1 px | Resting interactive perimeter; resolves to at least 3:1 against both `bg` and `surface` in light and dark themes. |
| `selected` | 1.5 px | Selected/active perimeter in the semantic action color. |
| `danger` / `warning` | 1.5 px | Validation or status perimeter in the corresponding semantic color. |
| `focus` | 2 px | Keyboard-focus perimeter; deliberately thicker than rest and selection. |

Hover and press use fill feedback while retaining the resting border's color
and width, so pointer interaction never shifts layout. Keyboard focus always
uses the 2 px focus role and may add the shared focus halo. Disabled controls
fall back to the passive boundary role plus disabled opacity.

`CatchSurface.borderRole` is the normal low-level adapter;
`CatchSurface.borderSpec` is reserved for a role with a justified color
override, or a `CatchStroke` width the role does not own (selection rings,
badge cut-outs). `CatchSurface` has no raw `borderColor`/`borderWidth`; they
were deleted once every caller moved to a role or spec.
Higher-level controls (`CatchButton`, `CatchIconAction`, `CatchChip`,
`CatchControlSurface`, `CatchChoiceTile`, search, tabs, and field sections) own
their state-to-role mapping. Decorative `CustomPainter` illustration strokes
are outside the UI-boundary system, but repeated artwork and progress geometry
still uses named `CatchStroke` roles instead of feature-local literals.

### 7.2 Geometry is owned by the primitive

Persistent offline/rehearsal context uses `CatchBanner.statuses`: full-width,
square-edged bands with a shared icon, label-over-detail and trailing action
anatomy. The screen owner places them **below the complete primary tab rail**,
or below the title when there are no tabs; they never split title from tabs.
Tabs and strips stay pinned together as the title scrolls away. Regular body
content begins 16 pt after the last strip. Strips share 20 pt side gutters,
a 64 pt minimum band height and 44 pt action targets; wrapping content may grow
the band. At large text or narrow widths, actions reflow below the text.
These are durable context, not floating `CatchNotice` notifications or local
mutation errors. Existing semantic palettes and localized copy remain in use;
neither fixture sync timestamps nor unimplemented global Retry actions ship.

When a component family has shared placement geometry, the canonical primitive
owns that geometry along with safe-area, platform, focus, and disabled/loading
behavior. Callers provide semantic state, content slots, and callbacks; they do
not rebuild the family as local `Row`, `Stack`, padding, or divider recipes.

- Notice identity is supplied by its feature adapter through `CatchNoticeData`:
  localized title/message, semantic tone, optional icon, optional
  `CatchPersonAvatarItem`, and an optional theme-derived `accentColor`. A person
  replaces the status glyph and reuses `CatchAvatar` for circular photos
  and initials fallback. The shared notice still owns typography, icon/avatar
  extent, spacing, surface and tint derivation. Do not create separate visual
  match/message widgets merely to change copy, identity or color. A color
  override does not waive contrast review in both themes.
  `CatchNoticeData.arrival` makes the whole card the open target with no visible
  Open/Dismiss buttons; swipe up or sideways dismisses it, as do Escape and the
  accessibility dismiss action. A downward drag does not open.
  The global host enters from above the physical viewport, rests 12 pt below
  the top safe area and never shifts route content. Reduced motion skips entry;
  accessible navigation holds the card, and pointer/hover/focus interaction
  pauses auto-dismiss. Ordinary inline notices retain their existing controls.
- Review decisions use `CatchButtonVariant.dangerSecondary` when they need
  destructive feedback without a filled danger CTA. Resting chrome is neutral
  and outlined; hover, focus and press identify danger. Status belongs to the
  record badge rather than an action's resting fill.
- Persistent control docking routes through `CatchDock`. `pageAction`
  is the borderless page-background recipe for one detail action. The scaffold
  reserves its measured height. The app-level `CatchNoticeOverlay` places
  transient notices in the top safe area without changing the route layout. The
  dock owns the page gutter and safe area; features do not wrap it in a card.
- Other persistent control docking routes through `CatchDock`. Its default
  constructor hosts utility content; `primary` owns floating Cupertino or
  anchored Material action chrome. `primaryContent` reuses the same action body
  when its caller already supplies a surface. `CatchBottomActionOverlay` owns
  pinned multi-action form controls over a soft fade and blur. It measures
  wrapped or stacked controls and optional metadata before sizing the usable
  form viewport. The fade reaches the page background above the controls so
  body text cannot bleed through transparent actions. Form-step terminal
  padding clears the fade; callers do not estimate action or safe-area heights.
- Top-bar action grouping routes through `CatchTopBarActionRow`; callers do
  not compose parallel header rows. A primary root-screen action uses
  `CatchTopBarPrimaryButton`, which owns a compact quiet icon target with the
  platform minimum hit extent and wider labelled-button variants. Semantic text, icon-only, and overflow
  actions use `CatchButton.text`, `CatchIconAction`, and
  `CatchActionMenu`. Do not pass a body-style `CatchButton` directly into
  any top-bar `actions` slot.
- Screen hierarchy follows one control per level. Shell destinations express
  product-level navigation; pinned `CatchPageTabBar` / `CatchRootScreenScaffold.withPrimaryRail`
  tabs switch peer views within one destination. A small fixed set of terse,
  mutually-exclusive filters uses `CatchChoiceInput.segmented`; longer, numerous, or
  dynamic mutually-exclusive filters use `CatchSelectionMenu.control` so
  options do not disappear beyond the viewport. Selectable chips express
  independent binary or multi-select values, not scalar scope or lifecycle
  rails. A query that searches the whole active view belongs to that screen's
  top bar through expanding `CatchTopBarSearch`, while a permanently visible
  `CatchSearchField.expanded` is reserved for a search-first browse toolbar.
  Feature-local pill groups do not substitute for peer-view tabs.
  Destination buttons use `CatchNavigationButton`: bottom shared-indicator and
  side-rail layouts are named recipes. Pointer previews never change committed
  route semantics; rail buttons expose a screen-reader tap action. Icon counts
  use `CatchCountBadge.navigationIcon` in both placements.
- Pushed utility/list and identity chrome routes through
  `CatchRouteScaffold`; it owns the page surface and shows a divider only when
  vertical content has actually scrolled beneath the compact bar. Outside navigation workspaces, root tab titles remain scroll content.
  Within a workspace, each pane keeps its own title and peer rail fixed.
  `CatchTopBar` shares an anchored title baseline across root, route, identity
  and branded sidebar titles. The sidebar retains compact Archivo typography
  and a two-tone qualifier on its own continuous navigation surface. Subtitles
  do not move the title baseline. Headers flow from their actual contents and
  canonical padding, with no workspace height floor. `CatchWorkspaceHeaderLayout`
  measures visible headers at their pane widths and aligns their lower boundaries
  to the tallest current content; hidden panes do not contribute. A single pane
  uses only its own content height. The sidebar uses `CatchWorkspacePaneScaffold`
  too; screens must not add their own header padding or compensating spacers. Back is shown when the parent pane is
  hidden; a visible parent column provides that navigation context.
- Root title screens route through `CatchRootScreenScaffold.standard` or
  `.fullBleed` (or the corresponding parent-scaffold
  `CatchRootScreenScrollView` role). The constructor jointly owns geometry,
  responsive width, and shell clearance. Roots with pinned peer
  navigation use `CatchRootScreenScaffold.withPrimaryRail` plus
  a closed `CatchRootScreenPageScrollView.standard`, `.fullBleed`, or
  `.embeddedViewport` role. Standard owns the 20 pt phone gutter, 16 pt body
  start, responsive lane, and shell clearance; full bleed retains shell
  clearance without outer body geometry; embedded viewport delegates scrolling
  and clearance to its fill-remaining child. Feature screens do not
  reconstruct title gaps, page gutters, terminal navigation clearance,
  responsive content lanes, or state-viewport placement. Primary-rail roots use a
  8 pt title-to-rail handoff, a minimum 44 pt iOS / 48 dp Android rail that
  grows with text scale, and the same 16 pt body start.
  `CatchInsets.pageBody`, `CatchInsets.primaryRailTitleBlock`, and
  `CatchPageTabBar.minimumHeight` / `heightFor` own those values. Full bleed removes only the
  outer inset; named nested lanes such as `CatchInsets.chatListGutter` keep
  Consumer Chats and Host Inbox on the same 20 pt horizontal rhythm.
- Host navigation depth uses `CatchNavigationViewport` and the same pane
  widgets at every device width. Each pane owns its full-height header, actions,
  tabs and scrolling body through `CatchWorkspacePaneScaffold`; a directory's
  tabs do not span its selected detail. Navigation columns represent successive
  levels, while a desktop Organizer preview occupies the next level until a
  setting is selected. Width changes presentation only, preserving route
  identity and visited pane state. Expanded paths keep all ancestors in a
  horizontally scrollable strip. Dividers support drag, keyboard resizing and
  a double-click reset; widths are local presentation preferences, not business
  state. Compact screens use the same content and Back path. Every Host
  directory reserves its adjacent detail or selection state, including empty
  Groups and Sends. Feature screens supply semantic directory/editor contracts
  to the Host adapter instead of building panes themselves. Root and detail
  rails share the header
  boundary; Today uses the same header rhythm even without peer tabs.
- Every full-screen composition terminates in
  `CatchScaffold.standalone`, `.stepFlow`, or `.workspace`; higher-level
  root, tabbed, and pushed-route owners delegate to that role. Only the
  canonical primitive may construct a Material `Scaffold`. The composition gate
  reconciles route, coverage, and registry membership; resolves declared
  owners; verifies an allowed family expression and selected explicit body and
  top-edge arguments; rejects unauthorized raw `Scaffold` construction; and
  proves analyzer-resolved reachability from every rendered
  `builder`/`pageBuilder` target to each registered owner declaration and
  requires branch-universal static proof across every statically reachable
  widget-producing terminal. The checker does not execute conditions; it treats
  every reachable branch as possible, so every build/return arm, approved
  widget-builder callback, local helper/value, and registered same-family
  delegate must terminate in the declared layout family. It also discovers all
  full-screen `PageRoute` forms globally. Only direct `MaterialPageRoute`
  construction is supported and generated into the imperative route inventory;
  aliases, tear-offs, factories, `CupertinoPageRoute`, `PageRouteBuilder`, and
  subclasses fail closed. Other geometry/top-edge metadata remains review
  policy, while focused tests prove runtime state and redirect behavior.
- Widget names share one namespace across `lib/**`, `apps/consumer/lib/**`, and
  `apps/host/lib/**`. Source discovery resolves widget subclassing transitively,
  then rejects exact public-class duplicates and ungoverned normalized-name
  collisions across all three production roots. Only `.g.dart`,
  `.freezed.dart`, and the named localization outputs are excluded as generated
  source; a hand-authored file is not exempt merely because it lives below a
  directory named `generated`.
- Compact route bars use `CatchTopBar.route` geometry. Feature screens do
  not override height, safe-area, alignment, gutter, or content padding. A
  detail route whose title is loaded asynchronously carries the known subject
  label through navigation so loading and error states never fall back to a
  parent collection title.
- Section titles and trailing actions route through `CatchSection` or the
  reviewed contained/content owner. A feature-local header-plus-card shell is
  scanner-visible debt. Loading, empty, and error children inherit their
  section's divided, contained, or plain surface decision; state changes do not
  introduce a second border or switch a peer module to a different variant.
  `CatchErrorState` is therefore cardless in full-screen, inline, and compact
  modes; its placement adapter supplies spacing while the parent owns any
  justified containment.
- `CatchSection.containedFieldRows` treats its title, count, and trailing action
  as an external label by default, so the outline begins with the first field.
  When that header belongs to the bounded field group itself, opt into
  `CatchSectionHeaderPlacement.inside`; the header moves inside the
  outline and owns the same padded section rule used by uncontained field
  sections. Omit the label when the page or step title already supplies the
  same context. `CatchSection.contained` keeps its sentence-case title inside
  only when the bounded surface is itself one actionable content module.
- `CatchSection.containedFieldGroups` is the one-perimeter form for a single
  collection with labelled internal choice groups. Callers supply
  `CatchSectionFieldGroup` labels and rows; the section owns the group kickers,
  inset boundaries, sibling dividers, clip, and rectangular active bands. Do
  not represent those groups as separate outlined sections or rebuild their
  headers and rules in feature or Widgetbook code.
- `CatchSection.rows` and `.sliverRows` own full page/pane interaction bounds.
  This default is identical on phone and in a split pane. Content has a semantic
  gutter and centered maximum reading width, while hover, press, selected, focus
  and hit testing reach both pane edges. Do not place an outer horizontal inset
  around these sections. Scaffold and pane owners publish the viewport; debug
  assertions catch a narrowed row section, and release rendering falls back to
  rounded containment if that boundary is violated.
- `CatchSection.containedRows` is the explicit inset exception: one rounded
  perimeter, rectangular internal bands clipped by that perimeter. There is no
  public choice for an inset square highlight. Its header rule spans the whole
  content width. Mid-section rules begin under the row's text lane, after
  its leading icon/avatar; the last row has no trailing rule. Active adjacent
  rows suppress the shared rule, never the header rule.
- `CatchField` owns row interaction, states, navigation disclosure and semantics.
  `CatchFieldSecondaryAction` provides independent labelled commands, buttons,
  selections and menus. Layout content cannot create another recognizer. Legacy
  `CatchFieldLanes` and `.fieldRows` remain adapters for existing editors and
  spatial interaction; new ordinary lists use the typed collection recipes.
  A native text/choice control, message bubble, map canvas, media, chart or
  global navigation rail is not an ordinary row. Those keep their own semantic
  primitive, with non-row section content supplied through `.content`.
- `CatchSection.controls` owns the content gutter and both full content-width
  rules around collection sort/filter controls. Its semantic inputs own sorting
  at the leading edge and Filters at the trailing edge; callers cannot supply
  arbitrary widget slots or swap their roles. A fixed ordering has no dropdown
  affordance. Active filters have one shared summary and Clear action. At narrow
  widths or large text the controls wrap in reading order within the same rules.
  All four Audience tabs use this recipe. They share `HostAudienceHeader` and
  `HostAudienceTabRail` for title, primary creation action, overflow, search, and
  peer navigation.
  Their section-based page owner supplies top spacing once; quick-filter rails
  use section content gutters without adding another page-padding wrapper.
  Organizer-wide Automations belongs in the common overflow, not the Groups
  result list. Omit repeated list titles when the selected tab supplies context.
  Form purpose and submission status are filters, not sort orders. Neither a
  feature nor a state branch may omit the upper boundary or add a mismatched
  lower rule. The rules are distinct from row sibling dividers, which start at
  the text lane.
- `CatchSection.loadingRows` and `.sliverLoadingRows` render passive
  `CatchFieldLayout` values through the same Field and Section as loaded rows.
  Loading cannot add a surrounding container, change row bleed, or expose
  placeholder actions or labels. `CatchSkeleton.content` wraps an actual
  content composition when a card or form is already known; only unknown leaf
  assets use explicit box/text/circle skeleton shapes.
- `CatchRootScreenScaffold.sections` and
  `CatchRootScreenScrollView.sections` keep the standard title-to-body rhythm
  while ordinary rows remain full width. One screen chooses that scaffold
  outside its async branches, so loaded, loading, empty, and error use the
  same horizontal plane and starting rhythm.
- A typed form section owns one text-commit model for all of its sibling rows.
  Explicit confirmation with Cancel and Done is the default for new
  `CatchFormList` sections. An existing surface may opt the complete section
  into on-blur commit while it awaits a reviewed product migration; individual
  row descriptors cannot mix policies or choose their own commit chrome.
  Consumer profile text rows now use this explicit default. Text editors keep
  the outlined Cancel and existing field chrome; their character count occupies
  the leading side of the commit row. Short errors replace the caption while
  retaining the input's accessible name; longer errors wrap naturally. Generated
  value constraints supply the localized Optional label. An emptied optional
  value uses Clear as its commit action, while its domain adapter owns whether
  absence is encoded as null or an empty string. Hints share value typography
  and use the shared secondary text color.


The API boundary is the first enforcement layer: duplicate placement variants
are deleted rather than kept as aliases. Component contracts, Widgetbook
states, and the section/top-bar scanners provide the review and regression
layers.

Shared Flutter UI is imported through `package:catch_ui/catch_ui.dart`, with
semantic tokens in `package:catch_tokens/catch_tokens.dart`. The app compatibility
barrel is retired. Schema-coupled fields, sections, root-header composition, and
typed form orchestration retain focused app imports until their Phase 3 move.
The final reviewed barrel excludes renderer scopes and focus-surface
implementation members; their temporary package exports support the remaining
app-side owners during extraction. Analyzer diagnostics reject feature-level
construction of those internal geometry objects and reject field-owned sibling
dividers or lane-gutter overrides that still type-check.

#### Living component geometry review

Cross-family geometry is reviewed code-first in Widgetbook under
`[Geometry system]`. Those pages render the production primitives and compare
only the states that reveal shared silhouette, edge, spacing, alignment, plane,
safe-area, and viewport rules. They complement rather than replace each
component's exhaustive `Contract states` page.

The review source hierarchy is:

1. Flutter runtime behavior and semantic roles own exact geometry.
2. `design/components/catch.components.json` owns legal component identity,
   states, slots, and token dependencies.
3. Widgetbook's geometry matrices make relationships between component families
   inspectable at compact and adaptive viewports.
4. Approved captures or Figma components may document the reviewed result, but
   do not override runtime behavior without a corresponding code and contract
   change.

When a geometry review identifies drift, classify it as a token, primitive,
composition, consumer-override, unsupported-state, or responsive/accessibility
problem. Fix the lowest shared owner, update its contract states when the legal
API changes, and update the relevant geometry matrix when the relationship
between families changes. Do not copy exhaustive component states into the
matrix or create a second geometry registry.

### 7.3 CatchField doctrine

`CatchField`/`CatchSection` own ordinary list rows as well as editable values:
people, event inventory, records, conversation summaries, settings and forms.
Their passive content layouts carry values; sections carry grouping and geometry.
Expressive media, celebration, hero, charts and message bubbles retain their
specialized primitives. Use `CatchSection.content` for those non-row regions.
A screen can combine both families without making content widgets own row state.

New `CatchField` modes or slots require a `docs/widget_catalog.md` entry, a
Widgetbook contract story, and a behavior-contract test under
`test/core/widgets/catch_field/` in the same PR.

The cross-stack vocabulary is machine-readable at
`design/components/catch.components.json#interactionContracts`. Flutter owns
the exact mode, slot, save-state, and section-variant names; React surfaces map
native components onto those semantics rather than sharing implementation.
The optional `build/reports/field_facade_inventory.json` report is generated
from the live Flutter API and carries this doctrine's forbidden storytelling
surfaces for review. Run `npm run design:fields:facades:check` after changing
the field or section API.

Field-local terse binary and multi-select labels use `CatchField.choices` and
selectable chips. Page-level scalar filters follow the option-group/adaptive
selection rule above.
Mutually exclusive options with per-option guidance use
`CatchField.optionCards`: the selected title owns the collapsed value, and
each expanded title plus description stays inside one clickable
`CatchChoiceTile`. Standalone groups use `CatchChoiceInput.described` so they
share selection and spacing with the field recipe. Do not put only the selected description in the field body;
that detaches the explanation from the options it describes.

- **Sizing:** constraints over constant heights/widths; min/max constraints, intrinsics,
  `Flexible`/`Expanded`, `AspectRatio`, content max-width clamp. Resilient to **Dynamic
  Type** (validate at text scale 1.0/1.5/2.0).
- **Scale targets:** Host covers phone, tablet, and desktop web/Mac windows plus
  Dynamic Type; other product surfaces remain phone + Dynamic Type until their
  owner adopts an explicit adaptive contract. Larger Host classes recompose
  navigation, panes, task concurrency, and density; they do not proportionally
  enlarge phone components. The canonical Host contract lives in
  [`app_architecture.md#host-adaptive-workspace-specification`](app_architecture.md#host-adaptive-workspace-specification).
- **Motion:** route motion through `CatchMotion` and
  `package:catch_ui/catch_ui.dart`. Use `catchSelectionHaptic()` for
  discrete choices, `catchTransitionHaptic()` for map/sheet state changes,
  `CatchRevealViewport` for calm card-to-detail routes, and
  `CatchHeroViewport`/`CatchHeroViewport.ticket` for ticket or polaroid flights. Avoid
  raw `Duration(...)`, ad-hoc `Hero`, and direct `HapticFeedback` in product UI
  unless a new named motion primitive is being introduced.

---

### 7.4 Conditional hierarchy

Logical dependency and visible nesting are separate. A field has one visual
parent, and may have additional prerequisites elsewhere in the form. Those
prerequisites affect whether it applies; they do not each earn a nested box.
For example, Demand pricing belongs to Admission format, while Catch handling
the booking is a separate prerequisite.

Use these rules for a conditional configuration branch:

1. Keep the controlling choice and applicable dependents in one visual group.
   Use `CatchSection.dependentFieldRows` for a control with an attached,
   subtly filled configuration area. Its rows stay flat inside one perimeter.
   Equal dividers separate peers; they do not establish subordination.
2. Give the control a short, prominent decision label. Explain its effect in
   supporting text, and name child inputs by what the person is changing.
   Units, limits, and a concrete consequence belong beside the relevant input.
   A term such as “Step” is insufficient when its meaning is not evident.
3. Allow at most two dependent ownership levels below a region's root.
   This is Catch's initial presentation policy, not a limit on logical depth.
   Use emphasis, shared space, and attachment; do not accumulate indentation,
   vertical guide lines, nested outlines, or a new shade for every level.
4. Before a third level, choose a coherent continuation or separate task step.
   Keep earlier decisions available as editable summaries, identify the
   current task, and preserve the path back. A continuation is an explicit
   composition decision; reaching a depth never automatically opens a modal.
5. Distinguish “collapsed” from “does not apply.” Collapsing an editor retains
   applicability. Disabling an ancestor deactivates its dependent branch;
   retained draft values must not silently affect the submitted configuration.
   Validation must reveal the active path to an error, including a collapsed
   region or another step.

`CatchFormDependencies` checks declared ownership, prerequisites, cycles, and
inline depth. It does not inspect the rendered widget tree or implement
continuation navigation. Each adopter must test its actual visibility,
validation, serialization, and error recovery. Visual review must cover both
themes, text scale 2.0, and long labels. A valid declaration alone does not
prove that the screen communicates the hierarchy.

## Cross-stack component lexicon

`design/components/catch.components.json` is the binding semantic lexicon for
Flutter, website, admin, and the shared web UI package, and the only file that
assigns component identity. Implementation remains stack-native; the registry
shares identity and contract ownership, not widget or component code.

Each component names its implementations: `dart` for Flutter and, where one
exists, `react` for `@catch/web-ui` (symbol, file, `api`, and Storybook
coverage). Every declared symbol must exist in its named file, and React symbols
must be exported from the package barrel. Website and admin adapters of a
shared contract carry a `componentId` in `design/website/components.json` or
`design/admin/components.json`; the id must name a T1 or T2 contract and the
export must exist in the entry's source. New or moved design-system components
must add the record in the same change.

Run `node tool/run.mjs check design:component-lexicon`. The checker remains a
repo-level JavaScript gate. Its default command also checks shared Flutter API
grammar with the syntax-only Dart collector and requires resolved Flutter
dependencies. Website validation uses `--surfaces-only` for the Node-only
symbol check; the registered gate and Flutter CI retain the full check. Do not
move this contract into the `catch_ui_lints` analyzer plugin.

Every component contract also carries either an `enforcement` decision or an
expiring `waiver`. Enforcement metadata is executable: it generates raw-widget
steering tables and seeded probes for the Catch analyzer plugin, while a
bidirectional coverage gate rejects catalog components without a decision and
implemented `catch_*` diagnostics without a catalog owner. Screen composition
is registered separately with shell, top-bar, and state policies and validated
with analyzer resolution.

Structural labels and status badges are separate semantic families. Use
`catch.typography` (`CatchKickerText`, React `UiLabel`, website `UiLabel`,
admin `AdminEyebrow`) for eyebrows and compact hierarchy context. Use
`catch.badge` (`CatchBadge`, React `BadgeControl`, website `StatusBadge`, admin
`StatusChip`) for status, state, counts, and alerts. The lexicon gate pins these mappings so a
shared visual treatment cannot erase their different meanings.

---

## 8. Open / deferred (tunable, not blockers)

- **Activity pigment exact lightness** — current mid-tones are "fine for now"; build the
  system so they're **editable** and tune later.
- **Bespoke activity emblem set** (~16 symbols) — design task; ship on Phosphor glyphs first.
- **Activity emblem set** — bespoke symbols remain deferred; ship on regular Phosphor
  glyphs first.

---

## 9. Exploration log (persisted context)

What we tried and why, so we don't relitigate it:

- **Sunset retired** as a placeholder; beige/cream specifically rejected as "dull and dated."
- **Three flat palette candidates** (Newsprint / Warm-beige / Ink-cobalt) — rejected:
  too abstract to judge, and beige was a hard no.
- **Pivoted to high-fidelity HTML mocks** (real fonts/photos) — this worked. Landed
  "bold editorial, light browse + dark wow."
- **Accent tuner** (coral/magenta/cobalt/acid/tangerine) → conclusion: **no global accent
  at all**; color should *mean* activity, so the per-activity palette is the only chroma.
- **Activity art re-grade:** candy gradients → deep duotone (too dark) → **confident
  mid-tone pigments**; abstract patterns → **bespoke emblems** (deferred); grading decided
  **display-time, non-destructive**.
- **Typography:** earlier serif studies (Instrument Serif, Playfair/Bodoni,
  Source Serif 4, Literata) were retired. The current locked stack is Archivo for voice/head,
  platform system for function/body, and IBM Plex Mono for data.
- **References studied:** Roadbook (warm-desaturated editorial, sans-leaning) + Wallpaper
  (monochrome restraint). Catch = their restraint + a typographic voice + meaningful color.
- **Visual studies (runnable):** `visual_references/catch_identity_mock.html` (light+dark
  direction), `catch_activity_grading.html` (pigment + emblems + grading), `catch_typography.html`
  (type specimen). `lib/labs/identity_candidate_lab_app.dart` is **superseded** (old
  A/B/C palettes) and should be refreshed or removed in Phase-0 closeout.

---

## 10. What's left to do

**Phase 0 closeout (bridge to code):** ✅ DONE
1. ✅ Encode this into `CatchTokens` (B&W light + dark base, no brand accent).
2. ✅ Build the `ActivityPalette` expressive-layer `ThemeExtension` (mid-tone pigments,
   dark-aware, editable) + the display-time photo grade as a tunable token.
3. ✅ Wire **Archivo / platform system / IBM Plex Mono** into `CatchFonts` +
   `CatchTextStyles` (upright titles, condensed head roles, scale/zero
   tracking/leading).
4. ✅ Refresh or delete the superseded `identity_candidate_lab_app.dart`.

**Implemented rollout phases:**
- **Phase 1** — route palette-owners (`event_activity_visuals.dart`,
  `profile_card_style.dart`, `club_cover_fallback.dart`, …) through tokens → **re-skin
  proof**; sizing/constraint doctrine + Dynamic Type; motion spec; anti-drift CI gate.
- **Phase 2** — flagship **Profile** (shared `ProfileSurface` → uplifts swipe + preview).
- **Phase 3** — rollout to par: onboarding, **Dashboard + Profile tabs**, clubs (land the
  named polaroid; retire `club_cover_fallback`), chat/matches, settings/payments/calendar,
  event_success. Retire dead sandboxes (`labs/`, `explore_concept/`).

**Remaining policy decision:** map pins still need an explicit art-vs-token
decision. Either route `CatchMapPinColors` through `ActivityPalette`/tokens, or
document the map-pin palette as a sanctioned expressive-art exception here.

## Host bottom-sheet composition

`CatchSheet.standard` and `.filter` own the modal surface, heading inset, body gap, scrolling,
keyboard clearance and bottom safe region. Short sheets fit their content; long
sheets use the shared viewport cap. Choices align with the heading through
`CatchMenuRow.sheet`, wrap their labels, and show a trailing selection mark.
Single-choice sort and membership menus use those rows. People and Forms filters
use wrapping `CatchChoiceInput` chips in multiple mode inside titled sections.
Selected chips include a checkmark. Choices within a category are OR; nonempty
categories combine with AND. Empty categories do not restrict the result.
Responses also presents its form context and promoted question filters as inline
wrapped chips, without nested picker sheets. Form context is single-choice because
the response API scopes question definitions to one form; answers are multi-select
with OR within a question and AND across questions. Changing form clears answer
conditions. Reset all clears the editable form scope and answers. Supported answer
and active-question limits come from the request contract.

Selections apply immediately and remain visible when the sheet reopens. These
filters have Reset all in the header and a full-width Close action using
`CatchSheet.filter` so dismissal remains visible while the
choices scroll. Ordinary filter sheets have no instructional subtitle or filter-logic
explanation. The filter constructor does not expose subtitle or footer styling.
Counts belong in the directory summary rather than changing a
chip's width.

Use flat `CatchSection.fieldRows(first: true)` for the first field group in a
sheet. Additional groups retain section spacing; do not add a contained card
perimeter merely because the content is in a sheet. Keep different interaction
contracts visible: choices apply on tap, Close dismisses immediate filters, and
Save/Send confirms an editor through a full-width footer action.

Titled chip groups use `CatchSection.choiceGroup`; field rows use
`CatchSection.fieldRows`. Both retain the shared muted `ink2` field-section
kicker and rule. The choice-group recipe owns `CatchFieldTokens.rowVerticalPadding`
(12 points) between the rule and the first chip surface; bare chips must not be
passed directly to the row recipe. `CatchSectionList` owns inter-group gaps.
Do not override title color or build a separate filter heading style.
Rendered geometry tests enforce the divider-to-chip clearance.

Footer emphasis follows purpose through `CatchButton.sheet`: `dismiss` and
`alternative` are outlined secondary actions; `commit` is filled primary.
Width is independent of emphasis. Close and Start a fresh event are secondary;
Save, Apply and Publish are commit actions. Filters apply immediately and Close
only dismisses, so they must not suggest an additional commit.

Create event owns saved drafts and new-event choices in one sheet. Its Continue
section lists each draft directly, newest first, before Repeat last event. Selecting
a draft carries that exact draft into the editor without another picker. Confirmed
deletion removes only its row; deleting the last draft keeps Start new available.
Direct editor entry uses the same composition when offering saved drafts.

Draft rows use `CatchField.content(emphasis: CatchFieldEmphasis.title)`: draft
identity is primary, saved time is supporting text, and the shared row centers
leading and delete icons against the complete text block. Draft actions omit
the disclosure chevron, matching the other Create event options. Do not
correct alignment with feature-owned offsets. Secondary actions retain separate
platform-sized hit targets. Blocking source policy and rendered geometry tests
cover these rules in `catch_bottom_sheet_policy_test.dart` and
`host_sheet_composition_test.dart`; shared sheet tests cover action roles and
persistent dismissal at small viewports and 200% text.

Host operational modules use `CatchSection.action`, `.collection`, and `.status`: one quiet token surface with content-derived height, shared padding, and full-width commands. Collection owns empty/populated presentation and sibling separators; the feature owns data, permissions and callbacks. Use `.fieldRows` for navigation and outlined field recipes for actual form groups. `design:component-contracts` rejects generic card/flat-section and local empty-state composition on migrated Program and Recap surfaces.
