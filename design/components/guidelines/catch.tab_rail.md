Two to five views of the same thing, with a pill that slides to the selected one.

**Registry:** `catch.tab_rail` · Flutter and React: `CatchPageTabBar` · In this system: `Catch.Segmented`

## When to use
Use to switch views within a screen (Bills, Bookings, Refunds; Now, Guests, Scores, Room). Use navigation for moving between screens.

## What you provide
`items` (value, label, count), `value` or `defaultValue`, `onChange`, `size` (md 40, sm 32), `fill`, `label`.

## How it adapts
White track on a tile; night track on dark. Options never clip: if they don’t fit, it scrolls with a fade and keeps the chosen one in view. Use it for two to four views; for filters, use a Rail of Chips (itemWidth “auto”).

## States and motion
The pill slides over 240 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.tab_rail`:
- `CatchPageTabBar`
- `CatchPageTabBar.controlled`
<!-- generated:flutter:end -->

## Replaces
HostSegmented and the live console tabs.
