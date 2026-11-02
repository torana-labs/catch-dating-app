Stars, to give a score or to show one.

**Registry:** `catch.rating (new)` · Flutter and React: `CatchRating` · In this system: `Catch.Rating`

## When to use
Use the tappable tiles to rate a night after it ends. Use `readOnly` beside a review or an average. Say what is rated in `label` so it reads "4 out of 5, Riya’s review".

## What you provide
`value` or `defaultValue`, `max` (5), `onChange`, `readOnly`, `size` (md tiles, sm inline; defaults by readOnly), `label`.

## How it adapts
Filled stars are always games yellow; empty tiles follow the ground (tile, nested on a tile, night tile).

## States and motion
A radio group: arrow keys move, pressed scale 0.94, the tint fills in 120 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.rating`: No Flutter symbol yet.
<!-- generated:flutter:end -->

## Replaces
The hand-drawn star rows on After and the text stars on reviews.
