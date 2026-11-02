A horizontal row of cards that scrolls with snapping and a peek of the next item.

**Registry:** `new · catch.rail` · Flutter and React: `CatchRail` · In this system: `Catch.Rail`

## When to use
Use for "More from", the press bar and format pickers. On desktops it wraps into a grid.

## What you provide
`itemWidth`, `wrap` (auto, never, always), `label`, children.

## How it adapts
Bleeds to the screen edge inside the gutters. `itemWidth="auto"` fits each item (a row of chips). A list from a host loop (the design canvas) still gets one rail item per entry. When it scrolls, the edge that hides more fades out.

## States and motion
Snaps to each item.

<!-- generated:flutter:start -->
## Flutter

`catch.rail`:
- `CatchRail`
<!-- generated:flutter:end -->

## Replaces
More from, the press bar and the format scroller.
