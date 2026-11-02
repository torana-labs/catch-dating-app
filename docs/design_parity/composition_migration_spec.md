---
doc_id: composition_migration_spec
version: 0.1.5
updated: 2026-11-02
owner: product_design_parity
status: active
---

# Composition Migration Spec

## Purpose

This spec defines the target architecture and rollout workflow for moving Catch
from screen-local UI construction toward a layered, cross-tool design system.

The end state is:

1. Foundation values live in platform-neutral design files.
2. Primitive components are registered once with explicit contracts.
3. Compound components and sections compose only registered lower-level
   primitives and foundation roles.
4. Screens own state selection, controller interaction, navigation, and feature
   composition only.
5. Website, social templates, Claude Design, Figma, Widgetbook, and Flutter all
   consume the same token and component contract model.

This is not a visual audit checklist. Visual parity work starts after each
component or screen slice has an explicit contract and review surface.

## Execution Ownership

Delivery of the layer-model end state (golden-asserted catalog, token and
component package extraction, registry consolidation, binding naming grammar,
migration protocol) is owned by the ratified program in
`docs/plans/ui_system_blueprint_and_conformance_audit.md`. This spec remains
the cross-tool contract owner; do not open a second delivery track for the
same layers.

## Working Decision

Use a hybrid migration:

- Bottom-up for foundation and primitive contracts.
- Screen-down for prioritization and feature slicing.
- Bottom-up within each selected screen slice when a missing primitive,
  compound, or section is discovered.

Do not attempt to finish every primitive before touching screens. That would
turn into a detached design-system project. Also do not rewrite screens first
without registering components. That would preserve the current drift problem.

The practical loop is:

1. Pick a screen from `design/screens/catch.screens.json`.
2. Decompose it into sections and component needs.
3. Register or update missing component contracts.
4. Add Widgetbook states for the affected primitives/sections.
5. Refactor components bottom-up until each layer consumes only lower layers.
6. Refactor the screen so it only maps state and composes sections.
7. Capture and test every state.
8. Run `git diff --check` and report the focused check results in the task or
   CI run.

## Standards Position

The token source should remain compatible with the Design Tokens Community Group
format model. The current public "Design Tokens Format Module 2025.10" document
is a Community Group draft/preview, not a W3C Recommendation. It is useful as a
compatibility target for token files, but Catch should pin its own validation
profile rather than blindly implementing draft-only behavior.

Design-token compatibility means:

- Token files use JSON.
- Tokens use `$value`, `$type`, `$description`, `$deprecated`, and
  `$extensions` where appropriate.
- Groups stay semantic and tool-neutral.
- Platform-specific metadata goes under `$extensions.org.catch`.
- Token aliases remain explicit and validated.
- Generated Dart, generated CSS, Figma variables, Claude context packs, and
  social-template CSS are outputs, not sources.

The DTCG token format does not define full component, section, or screen
contracts. Catch should therefore keep component and screen contracts in
separate JSON files with their own schemas, while allowing those files to
reference DTCG token ids.

## Source Of Truth By Layer

| Layer | Canonical source | Generated / review consumers |
|---|---|---|
| Foundation tokens | `design/tokens/catch.tokens.json` | Flutter generated tokens, website CSS, social CSS, Figma variables, Claude context pack, token specimen pages. |
| Component contracts | `design/components/catch.components.json` and future split files under `design/components/` | Widgetbook primitive states, Figma/Claude handoff names, Code Connect templates, contract validators. |
| Section contracts | Screen-local candidate sections stay nested in `design/screens/catch.screens.json`; reused product sections promote to future `design/sections/catch.sections.json`. | Widgetbook section states, screen composition validators, route captures. |
| Screen contracts | `design/screens/catch.screens.json` | Screen state captures, controller fixture requirements, route tests, visual comparison matrix. |
| Flutter runtime behavior | `lib/contexts/*/parts/**` and feature-owned widget folders | Widgetbook, Flutter tests, route captures, app runtime. |
| Website/social implementations | `website/**`, Claude template exports, social-template tooling | CSS token output, shared screenshots, generated media packs. |

## Layer Model

### Layer 0: Primitive Token Values

Purpose: raw design decisions that are platform-neutral.

Examples:

- Color values.
- Activity pigments.
- Spacing scale.
- Radius scale.
- Stroke widths.
- Opacity values.
- Motion durations and curves.
- Font families.
- Shadow definitions.
- Photo-grade parameters.

Rules:

- Values are stored in DTCG-shaped JSON.
- Raw values are allowed here.
- No Flutter, React, or template-specific names at this layer unless they are
  under `$extensions`.
- Token names should describe design meaning, not current implementation files.
- Token aliases are allowed only when the relationship is intentional and
  validated.

Needed work:

- Add missing Claude role-specific radius values to the token source or document
  why they remain component geometry.
- Decide whether photo-grade and activity-emblem metadata should become token
  leaves, extensions, or separate asset registries.
- Add token specimen pages for color, spacing, radius, typography, elevation,
  activity palette, icon scale, opacity, stroke, motion, and photo grade.

### Layer 1: Semantic Foundation Roles

Purpose: named relationships derived from primitive tokens.

Examples:

- `CatchInsets.pageBody`
- `CatchGaps.section`
- `CatchTextStyles.kicker`
- `CatchTextStyles.bodyLead`
- `CatchRadius.md`
- `CatchLayout.maxContentWidth`

Rules:

- Feature screens should consume semantic roles, not raw primitive tokens.
- Repeated relationships graduate from local component constants into semantic
  roles.
- One-off component geometry stays with the component until reuse is real.
- Role names should remain portable enough to map to CSS classes or template
  utilities.

Needed work:

- Map each Claude `.t-*` role to a Dart `CatchTextStyles` method and a website
  CSS class.
- Decide which local Dart-only layout roles should be exported to the design
  token/context layer.
- Add validators for missing typography and semantic role mappings.

### Layer 2: Primitive Components

Purpose: the smallest reusable visual/action units.

Examples:

- `CatchButton`
- `CatchIconButton`
- `CatchSurface`
- `CatchBadge`
- `CatchChip`
- `CatchField`
- `CatchField`
- `CatchTopBar`

Rules:

- Every primitive has one canonical implementation and one contract id.
- Primitive public props, slots, states, and allowed children live in the
  component contract registry.
- Primitive internals may use platform controls only when the primitive wraps
  and normalizes them.
- Primitive internals may consume foundation roles and lower-level atoms, but
  not feature controllers or repositories.
- Widgetbook must render every contract state.

Definition of done:

- Contract entry exists.
- Token references validate.
- Dart symbol validates.
- Widgetbook state page exists.
- Focused widget tests cover behavior and key states.
- No raw app-facing styling values except sanctioned component geometry.

### Layer 3: Compound Components

Purpose: reusable product components composed from primitives.

Examples:

- `CatchSection`
- `CatchOptionGroup`
- `CatchMetricStrip`
- `CatchMetricStrip`
- `CatchPersonRow`
- `ParticipantRow`
- `EventDetailHostCard`
- `FeaturedEventPoster`

Rules:

- Compound components compose primitives and other lower-level compounds.
- They receive view data and callbacks, not providers or repositories.
- They own local layout rhythm that is specific to the component family.
- Repeated raw values become component constants, semantic roles, or token
  proposals.
- If a compound appears in Claude Design, it must either map to a local
  component contract or be explicitly rejected/deferred.

Definition of done:

- Contract entry exists with `kind: "compound"` or equivalent.
- Dependency list references only approved lower-layer components.
- Widgetbook states cover empty, loaded, long-copy, dark/light when relevant,
  disabled, selected, error, and permission variants as applicable.
- The component can be rendered with local fakes or fixtures.

### Layer 4: Sections

Purpose: screen sections with product meaning.

Examples:

- Profile hero section.
- Event hero section.
- Event itinerary section.
- Host roster section.
- Settings account section.
- Booking dock section.
- Club photos section.

Rules:

- Sections compose primitives and compounds.
- Sections receive section view models and callbacks.
- Sections do not fetch data directly.
- Sections do not decide navigation routes directly; they expose user intents.
- Sections own product ordering and local conditional display, but not business
  mutation logic.
- Sections can be previewed in Widgetbook with realistic fakes.

Definition of done:

- Section contract exists.
- Section state matrix exists.
- Widgetbook section preview exists for every meaningful state.
- Section dependencies are declared.
- Section has no raw Material/Cupertino controls unless wrapping a registered
  primitive is impossible and documented.

### Layer 5: Screens

Purpose: state orchestration and composition.

Screens should do only:

- Read providers/controllers.
- Map domain/controller state into view models.
- Choose which predefined sections to render.
- Wire callbacks to controllers, navigation, or analytics.
- Own route-level chrome and safe-area/scroll ownership through registered
  layout primitives.

Screens should not:

- Hand-roll `EdgeInsets`, `TextStyle`, colors, shadows, radius, or animation
  values.
- Instantiate raw Material/Cupertino controls that have Catch primitives.
- Contain reusable row/card/tile UI directly.
- Reach into repositories from presentation widgets.
- Duplicate component states locally.
- Encode design decisions in conditional branches that should belong to a
  section or component contract.

Definition of done:

- Screen has a `design/screens` entry.
- Every visible UI block maps to a registered section or component.
- Every state is listed: loading, populated, empty, error, offline,
  permission, mutation pending, mutation failed, light/dark, text scale,
  reduced motion, and any feature-specific states.
- Controller/view model owns business state.
- Screen tests verify state composition.
- Route capture or screen preview exists.
- Visual comparison baseline exists when practical.

## Contract File Shape

### Tokens

Keep `design/tokens/catch.tokens.json` as the canonical token file.

Required checks:

- Token schema validation.
- Alias resolution.
- Generated Dart/CSS freshness.
- No unsupported `$type` values without explicit Catch extension support.
- No platform-only values outside `$extensions`.

### Components

Extend or split `design/components/catch.components.json` as the primitive and
compound registry grows. Product sections should not live in this registry; they
stay inside the screen contract until reused across screens, then promote to
`design/sections/catch.sections.json`.

The schema should support:

- `id`
- `name`
- `kind`: `primitive`, `compound`, `screen-adapter`
- `status`: `active`, `candidate`, `deprecated`, `rejected`, `deferred`
- `summary`
- `layer`
- `dart.symbol`
- `dart.file`
- `design.claude.handoffName`
- `design.figma.componentName`
- `design.codeConnect.status`
- `contract.props`
- `contract.states`
- `contract.slots`
- `contract.tokens`
- `contract.dartRoles`
- `contract.allowedChildren`
- `contract.dependencies`
- `contract.fixtures`
- `contract.widgetbookPath`
- `contract.visualRefs`
- `contract.platformBindings`
- `handoff.notes`

Platform bindings should be descriptive, not implementation-owning:

```json
{
  "platformBindings": {
    "flutter": {
      "symbol": "CatchButton",
      "file": "packages/catch_ui/lib/src/components/catch_button.dart"
    },
    "web": {
      "cssClass": "c-button",
      "tokenPrefix": "catch-button"
    },
    "social": {
      "templatePartial": "button"
    }
  }
}
```

### Screens

Add a screen registry when the first screen migration begins. The shape should
connect routes to sections, states, captures, and controller owners:

```json
{
  "id": "screen.event.detail",
  "name": "Event Detail",
  "route": "/events/:id",
  "owner": "events",
  "controller": "eventDetailControllerProvider",
  "source": "lib/events/presentation/event_detail_screen.dart",
  "states": [
    "loading",
    "populated",
    "empty",
    "error",
    "bookingPending",
    "bookingFailed",
    "booked",
    "soldOut"
  ],
  "sections": [
    "section.event.hero",
    "section.event.itinerary",
    "section.event.mechanism",
    "section.event.host",
    "section.event.bookingDock"
  ],
  "fixtures": ["fixture.event.detail.default"],
  "captures": ["event_detail_default_light"],
  "status": "planned"
}
```

## Migration Workflow

### Phase 0: Guardrails

Goal: stop future drift before doing large rewrites.

Tasks:

- Add machine-readable screen/component registries.
- Add validators for component dependencies and token references.
- Add Widgetbook coverage checks for registered components.
- Add advisory lints/scanners for screen-local raw values.
- Add foundation specimen pages in Widgetbook.

Exit criteria:

- The validators can identify whether a component is registered, previewed, and
  token-referenced.
- The scanners can report screen raw-value drift without blocking development.

### Phase 1: Core Primitive Parity

Goal: align the bottom layer with Claude Design and the app runtime.

Tasks:

- Confirm aliases in `design/components/catch.components.json`.
- Expand the formal component registry from 10 primitives toward the accepted
  Claude `core` primitive set.
- Add Widgetbook contract states for every accepted primitive.
- Add visual reference links to each contract.
- Decide consolidation items such as `CatchMetricStrip` vs `CatchMetricStrip`.

Exit criteria:

- Every accepted core primitive has a contract, states, Widgetbook page, and
  test or capture proof.
- Widgetbook has foundation specimen pages for token review.

### Phase 2: Feature Component Families

Goal: move feature-level reusable pieces into the registry.

Order should be based on screen priority and inventory gaps:

1. Events.
2. Profile.
3. Explore.
4. Clubs.
5. Host operations.
6. Messaging.
7. Notifications.
8. Booking/payments.

For each family:

- Register compounds and sections.
- Add fixtures.
- Add Widgetbook states.
- Refactor local component internals to consume lower-layer components.
- Add visual refs from Claude cards/templates.
- Decide which Claude components are screen-only and which are reusable.

Exit criteria:

- A feature family has no unregistered reusable UI blocks.
- Every accepted component family can be reviewed without launching the full
  app.

### Phase 3: Screen Migration

Goal: make screens state managers and section composers.

For each screen:

1. Inventory existing UI blocks.
2. Map blocks to registered sections/components.
3. Register missing sections/components.
4. Move reusable UI out of the screen.
5. Move business state into controller/view model if needed.
6. Make the screen render one composition tree from state.
7. Add route captures and/or screen previews.
8. Add focused tests.

Exit criteria:

- Screen contains no hand-rolled visual values.
- Screen imports only controllers, models/view models, routing, and registered
  sections/layout primitives.
- All meaningful states are captured or previewed.

### Phase 4: Cross-Platform Outputs

Goal: keep Flutter, website, and social templates on the same design contract.

Tasks:

- Generate website CSS tokens from `design/tokens/catch.tokens.json`.
- Generate social-template CSS/token packs from the same token source.
- Export component contract context packs for Claude Design and Figma.
- Add website/social validators that reject unknown token names and stale
  generated CSS.
- Add shared screenshot/media references from the UI capture pipeline.

Exit criteria:

- Website and social templates do not carry divergent color/type/activity
  definitions.
- Design context packs and generated CSS can be recreated deterministically.

### Phase 5: Visual Comparison

Goal: measure and review design-language divergence.

Tasks:

- Export Claude/Figma references into `design/reference_screens/` or a
  similarly named design-reference folder.
- Capture Widgetbook and route screenshots at fixed viewports.
- Mask dynamic areas: status bars, timestamps, maps, remote photos, counters,
  animated regions, generated avatars.
- Run visual diffs as advisory first.
- Promote thresholds only after repeated stable results.

Exit criteria:

- Every P1 component and screen has an accepted baseline or an explicit reason
  why pixel comparison is not useful.

## Enforcement Plan

### Validators

Add or extend validators for:

- Token schema and generated output freshness.
- Component contract schema.
- Component dependency graph.
- Widgetbook coverage for registered states.
- Screen registry route/source existence.
- State matrix coverage.
- Visual reference existence.
- Cross-platform token usage in website/social templates.

### Lints And Scanners

Advisory first, then ratchet:

- Screens should not use raw `EdgeInsets`, `SizedBox` values, `TextStyle`,
  color literals, shadows, radius values, or animation durations.
- Screens should not instantiate raw Material/Cupertino controls where Catch
  primitives exist.
- Components should not consume repositories/providers unless they are explicit
  controller adapters.
- Component internals should not reference higher-layer components.
- Feature sections should not import app routes directly.
- Website/social CSS should not define colors/type/spacing outside generated
  tokens except in explicitly sanctioned art/media modules.

### Dependency Rules

Allowed direction:

```text
tokens -> semantic roles -> primitives -> compounds -> sections -> screens
```

Disallowed direction:

```text
screens -> primitives by raw styling
sections -> controllers/repositories
components -> screens/routes
tokens -> platform-specific runtime behavior
website/social -> independent Catch palette/type systems
```

## Screen Migration Template

Each screen pass should produce this record:

```markdown
## <Screen Name>

- Route:
- Source file:
- Controller/provider owner:
- Current states:
- Missing states:
- Existing reusable sections:
- Missing sections:
- Existing reusable components:
- Missing components:
- Raw-value violations:
- Visual reference:
- Widgetbook previews:
- Route captures:
- Tests:
- Open product/design questions:
- Migration status:
```

## First Execution Slice

Recommended first slice:

1. Finish foundation specimen pages in Widgetbook.
2. Confirm the aliases in `design/components/catch.components.json`.
3. Expand contracts for accepted Claude core components.
4. Pick one high-value screen with good design references.

The best first screen candidate is Event Detail because it already has many
feature components in code and many Claude equivalents in the inventory:

- `EventTicket`
- `TicketStub`
- `HintList`
- `Itinerary`
- `MapCard`
- `MechanismList`
- `PhotoStrip`
- `HostCard`
- `BookingDock`
- `EventHero`

Event Detail should not be rewritten all at once. Start by registering and
previewing these event components, then refactor the screen into a controller
state mapper plus section composition.

## Open Decisions

1. Whether feature-level Claude components such as `ProfileHero`, `OrganizerHero`,
   `DashboardEventCard`, and `LiveConsole` are reusable components or
   screen-specific sections.
2. How strict to make raw-value lints at each phase.
3. Which tool should render token specimen pages long term: Widgetbook, a
   generated static web page, or both.
4. Whether website/social component contracts should share the same registry or
   use platform-specific bindings under one abstract component id.

## Resolved Decisions

- Section contract storage: screen-local candidate sections remain nested in
  `design/screens/catch.screens.json`. Once a section is reused across screens
  or must be consumed outside its originating screen, promote it to a dedicated
  `design/sections/catch.sections.json` registry. Keep
  `design/components/catch.components.json` focused on primitives,
  cross-screen compounds, and platform bindings.
- Screen contract storage: `design/screens/catch.screens.json` is the canonical
  screen contract registry, including each screen's states and captures.

## Definition Of Done For The Whole Program

The migration is complete when:

- Every accepted Claude primitive has a local contract decision.
- Every accepted local primitive has a design-side mapping or a documented
  runtime-only rationale.
- Every token used by Flutter, website, and social templates comes from the
  same design token source or a sanctioned generated output.
- Every P1 screen has a screen contract, state list, route capture, and
  Widgetbook/preview coverage for hard-to-reach states.
- Screens contain no hand-rolled design values outside sanctioned route/layout
  ownership.
- Components compose only lower-layer components and foundation roles.
- CI can detect token drift, contract drift, Widgetbook coverage drift, and
  screen raw-value drift.
