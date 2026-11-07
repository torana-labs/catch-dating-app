Progress, caps and steps on a rounded track.

**Registry:** `catch.mini_bar_chart` · Flutter and React: `CatchMeter (was CatchBarIndicator)` · In this system: `Catch.Meter`

## When to use
Use **progress** for how far along something is, **cap** when a limit matters (the Catch bill against ₹10,000), **segments** for steps of a night or a setup flow.

## What you provide
`value`, `max`, `kind`, `thickness` (4, 6, 8), `fill`, `format`, `label` (required, read aloud), `showLabel`, `limit`.

## How it adapts
The track is grey on white, white on a tile, translucent white on colour and dim on night.

## States and motion
The fill eases over 500 ms when the value changes.

<!-- generated:flutter:start -->
## Flutter

`catch.meter`:
- `CatchMeter`
<!-- generated:flutter:end -->

## Replaces
172 hand-drawn bars in 22 looks.
