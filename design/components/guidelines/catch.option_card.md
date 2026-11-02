Bigger tappable boxes that hold one choice: refund rules, pace groups, formats, days, tables.

**Registry:** `catch.option_card` · Flutter and React: `CatchChoiceTile` · In this system: `Catch.ChoiceCard`

## When to use
Use **row** for options with a second line, **tile** for a grid of picks, **day** for a date strip, **add** to add another. Pass a `format` so a picked tile fills with its event colour.

## What you provide
`title`, `subtitle`, `layout`, `selected`, `selection` (single shows a radio, multi a check), `format`, `icon`, `meta`, `attention`, `onTap`.

## How it adapts
White on a tile, translucent on colour, the raised night tile on dark (the live room).

## States and motion
Rest, hover, pressed (scale 0.99), focus, selected (2 px ink ring, or the event colour), attention (yellow ring), disabled.

<!-- generated:flutter:start -->
## Flutter

`catch.option_card`:
- `CatchChoiceTile`
<!-- generated:flutter:end -->

## Replaces
Pace cards, format picks, the day picker, ticket types, audience options, live room tables: 82 looks.
