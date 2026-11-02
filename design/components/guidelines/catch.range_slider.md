A single value or a range on a track.

**Registry:** `catch.range_slider` · Flutter and React: `CatchRangeInput` · In this system: `Catch.Slider`

## When to use
Show the value as text next to the slider; the thumbs alone are not enough.

## What you provide
`min`, `max`, `step`, `value` or `defaultValue` (a number, or [low, high]), `onChange`, `label`.

## How it adapts
White track on a tile.

## States and motion
Thumbs follow the finger; arrow keys move by one step.

<!-- generated:flutter:start -->
## Flutter

`catch.range_slider`:
- `CatchRangeInput`
<!-- generated:flutter:end -->

## Replaces
The age range on filters.
