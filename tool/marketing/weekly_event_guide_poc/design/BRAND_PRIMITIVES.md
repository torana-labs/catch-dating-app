# Catch Carousel Brand References

This document is reference-only. It should not recreate Catch typography, logo
marks, colors, icons, badges, chips, buttons, or symbols.

The previous HTML/PNG primitive board was wrong because it hand-rendered the
wordmark and UI primitives. The approved next step is a renderer that composes
actual Catch assets/components or blocks.

## Non-Negotiables

- Logo: use the real `Catch _` wordmark asset or component. Do not synthesize it
  with text.
- Typography: reference `CatchTextStyles` and `CatchFonts`; do not copy style
  values into carousel templates.
- Colors: reference tokens from `design/tokens/catch.tokens.json`; do not
  duplicate hex palettes in templates.
- UI: reference `CatchBadge`, `CatchChip`, `CatchButton`, and component contract
  IDs from `design/components/catch.components.json`; do not redraw them with
  local CSS/SVG shapes.
- Icons/symbols: use the established icon source for the target surface. Do not
  hand-roll symbols.

## Canvas

Instagram carousel output should still target:

```text
1080 x 1350 px
Aspect ratio: 4:5
```

Those dimensions are platform requirements, not brand primitives.

## Reference Sources

Typography:

- `lib/platform/theme/catch_fonts.dart`
- `lib/platform/theme/catch_text_styles.dart`
- `design_context_pack/design_system/typography.json`

Tokens:

- `design/tokens/catch.tokens.json`
- `packages/web-config/generated/catch-tokens.css`

Components:

- `design/components/catch.components.json`
- `packages/catch_ui/lib/src/components/catch_badge.dart`
- `packages/catch_ui/lib/src/components/catch_chip.dart`
- `packages/catch_ui/lib/src/components/catch_button.dart`

Logo:

- Required: real `Catch _` wordmark source.
- Current repo status: missing from tracked source inspected for this PoC.
- Blocking rule: do not render carousel layouts until the real logo asset or
  component is provided/referenced.

## Current Contract

Machine-readable reference contract:

```text
tool/marketing/weekly_event_guide_poc/design/primitives.contract.json
```

Validation:

```bash
node tool/marketing/weekly_event_guide_poc/scripts/validate_brand_references.mjs
```

The validator checks that referenced text styles, component contracts, runtime
files, and token sources exist. It also reports that visual rendering is blocked
while the `Catch _` logo source is missing.
