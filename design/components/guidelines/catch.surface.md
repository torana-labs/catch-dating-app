The blocks every screen is built from, and the only component that draws a filled box: five for app screens, plus **band** for web pages.

**Registry:** `catch.surface` · Flutter and React: `CatchSurface` · In this system: `Catch.Surface`

## When to use
Use **plain** for text with no box, **tile** for any grouped content, **spotlight** once per screen for the thing that matters most (an event, a bill, the step happening now), **floating** for things over other things (the booking card, popovers). Never draw a box by hand; never outline a box (outlines belong to controls).

## What you provide
`block`, `color` (a format or `ink` for spotlights; a palette colour, `ink` or `tile` for bands), `padding` (sm 12, md 16, lg 20), `aspect`, `onPress` or `href` to make the whole block tappable, and children. A **band** runs edge to edge in a bleeding ScreenBody and keeps its content to the 1,120 page width: the homepage and host landing are a stack of bands.

## How it adapts
A Surface tells everything inside it what it sits on. A tile inside a tile becomes a white nested block with 16 corners; inside a coloured spotlight it becomes translucent white. Chips, buttons, fields, badges and meters inside change their own fill and outline to match. A coloured spotlight also sets the event colour for accent buttons and markers inside it. An ink spotlight on a night screen becomes the raised night tile. `aspect` holds a fixed shape (a colour block in a mosaic) with its content at the bottom.

## States and motion
Pressable blocks: hover layer, pressed scale 0.99 over 100 ms, focus ring.

<!-- generated:flutter:start -->
## Flutter

`catch.surface`:
- `CatchSurface`
- `CatchSurface.card`
- `CatchSurface.tinted`
<!-- generated:flutter:end -->

## Replaces
600 hand-drawn boxes in 248 looks; old CatchSurface tones (surface, raised, primarySoft) map to tile, floating and spotlight.
