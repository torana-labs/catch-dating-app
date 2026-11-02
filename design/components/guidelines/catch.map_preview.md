A static map with format-coloured pins, labels and an optional route.

**Registry:** `catch.map_preview · catch.activity_map_pin` · Flutter and React: `MapPreview` · In this system: `Catch.MapPreview`

## When to use
Use on event pages ("Where") and as the entry to the Explore map. Label only the selected pin.

## What you provide
`pins` (x, y, label, format, selected), `aspect`, `route`, `label`, `onOpen`.

## How it adapts
Map ground and water from tokens. `onPinPress` makes the pins buttons, for picking an event on the map view.

## States and motion
Opens the full map on tap.

<!-- generated:flutter:start -->
## Flutter

`catch.map_preview`:
- `MapPreview`
<!-- generated:flutter:end -->

## Replaces
The event "Where" block and the Explore map.
