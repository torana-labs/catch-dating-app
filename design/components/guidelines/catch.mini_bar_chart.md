Simple bars with their values on top and labels underneath.

**Registry:** `catch.mini_bar_chart` · Flutter and React: `CatchBarChart` · In this system: `Catch.BarChart`

## When to use
Use for a handful of periods (weeks, months). Mark the current, unfinished period as `partial`. For shares of a whole use `Meter kind="stack"`.

## What you provide
`bars` (label, value, partial), `label` (read aloud), `height`.

## How it adapts
Ink bars on any ground; partial bars use the track colour with a control outline.

## States and motion
Bars grow over 500 ms when values change.

<!-- generated:flutter:start -->
## Flutter

`catch.mini_bar_chart`:
- `CatchBarIndicator`
- `CatchBarIndicator.chart`
<!-- generated:flutter:end -->

## Replaces
The insights charts.
