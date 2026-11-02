Overflow actions behind a "More" button.

**Registry:** `catch.menu` · Flutter and React: `CatchMenu` · In this system: `Catch.Menu`

## When to use
Put rare or destructive actions here; keep the main action on the screen.

## What you provide
`items` (label, icon, danger, onPressed), `label`, `defaultOpen`.

## How it adapts
A sheet on phones, a popover on wider screens.

## States and motion
Scales from its button over 160 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.menu`:
- `CatchMenu`
- `CatchMenu.anchored`
<!-- generated:flutter:end -->

## Replaces
Overflow actions across the host screens.
