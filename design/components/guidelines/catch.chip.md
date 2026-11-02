Small round labels you tap: filters, choices, removable inputs and links.

**Registry:** `catch.chip` · Flutter and React: `CatchChip` · In this system: `Catch.Chip`

## When to use
Use **filter** chips to narrow a list, **choice** chips for one pick from a few, **input** chips for things the person added, **tag** for passive labels in content. Use a choice card instead when the option needs a second line.

## What you provide
`label`, `kind`, `selected`, `size` (md 38, sm 32), `dot` (a format), `colourWhenSelected`, `leadingIcon`, `leading`, `count`, `onPressed`, `onRemove`, `href`.

## How it adapts
White with no outline on a tile; translucent white on a coloured spotlight; night look on dark. A format chip can fill with its event colour when selected.

## States and motion
Rest, hover, pressed (scale 0.97), focus, selected (fill eases 160 ms), disabled.

<!-- generated:flutter:start -->
## Flutter

`catch.chip`:
- `CatchChip.tag`
- `CatchChip.selectable`
- `CatchChip.choice`
- `CatchChip.activity`
- `CatchChip.removable`
`catch.chip.field`:
- `CatchChoiceInput`
- `CatchChoiceInput.described`
- `CatchChoiceInput.segmented`
- `CatchChoiceInput.form`
<!-- generated:flutter:end -->

## Replaces
234 hand-drawn chips in 55 looks; catch.chip.field groups.
