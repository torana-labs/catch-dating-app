Every button with words on it.

**Registry:** `catch.button` · Flutter and React: `CatchButton` · In this system: `Catch.Button`

## When to use
One **primary** per screen or step: the action you want taken. **Secondary** for the other actions, **ghost** on colour and photos, **quiet** for low-stakes text actions ("See all", "Reset"), **accent** when the action belongs to the event (Book, Reveal), **danger** for destructive actions.

## What you provide
`label` (or children), `variant`, `size` (lg 48, md 40, sm 32), `fill`, `leadingIcon`, `trailingIcon`, `loading`, `disabled`, `onPressed` (or `onClick`), `href`.

## How it adapts
Primary is ink on day and paper on night. Secondary loses its outline and turns white on a tile or a coloured spotlight. Accent takes the event colour from the spotlight or screen (`Root format`). Small buttons keep a 44 px touch target.

## States and motion
Rest, hover (4% ink layer), pressed (8% and scale 0.98 over 100 ms), focus ring, disabled (40%), loading (spinner, width kept). The outline is drawn inside the box, so outlined and filled buttons are the same height.

<!-- generated:flutter:start -->
## Flutter

`catch.button`:
- `CatchButton`
- `CatchButton.command`
- `CatchButton.selection`
- `CatchButton.floating`
- `CatchButton.text`
- `CatchButton.sheet`
<!-- generated:flutter:end -->

## Replaces
432 hand-drawn buttons in 112 looks at 19 heights; old variants quiet → quiet, light → automatic on night.
