Icon-only actions: back, close, share, more, save.

**Registry:** `catch.icon_button` · Flutter and React: `CatchIconAction` · In this system: `Catch.IconButton`

## When to use
Always pass `label`; it is read aloud and shown as a tooltip. Use **outlined** circles in bars, **filled** for the one add action, **overlay** over photos, **ghost** inside dense rows.

## What you provide
`icon`, `label`, `variant`, `size` (lg 44, md 40, sm 32), `shape`, `badge`, `pressed`, `onPressed`, `href`.

## How it adapts
White and outline-free on a tile or colour; night look on dark screens; overlay blurs what is behind it.

## States and motion
Rest, hover, pressed (scale 0.94), focus, disabled, toggled (`pressed`).

<!-- generated:flutter:start -->
## Flutter

`catch.icon_button`:
- `CatchIconAction`
- `CatchIconAction.icon`
- `CatchIconAction.counted`
- `CatchIconAction.toolbar`
<!-- generated:flutter:end -->

## Replaces
147 hand-drawn circles on 88 screens.
