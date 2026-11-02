Lays children out in a column or a row with a token gap.

**Registry:** `new · catch.stack` · Flutter and React: `CatchStack` · In this system: `Catch.Stack`

## When to use
Use instead of hand-written flex boxes. `gap="section"` gives 28 on phones and 40 wider.

## What you provide
`direction`, `gap`, `align`, `justify`, `wrap`, `equal`, `collapseBelow` (a row that stacks into a column below medium or expanded: two-column web sections on phones), `as`.

## How it adapts
The section gap follows the size class. An `equal` row is a grid, so padding inside a child never widens its share. Fields in a row grow to fill it.

## States and motion
Static.

<!-- generated:flutter:start -->
## Flutter

`catch.stack`: No Flutter symbol yet.
<!-- generated:flutter:end -->

## Replaces
Every hand-written flex box.
