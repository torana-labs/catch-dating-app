A number with a label: booked, checked in, revenue, teams.

**Registry:** `catch.analytics_metric · catch.metric_strip` · Flutter and React: `CatchStat` · In this system: `Catch.Stat`

## When to use
Use tiles for a row of key numbers on a dashboard; use `layout="inline"` inside spotlights and posters. Put several in a `Stack direction="row" equal`.

## What you provide
`label`, `value`, `note` with `noteTone`, `layout` (tile, inline), `meter`.

## How it adapts
Tiles follow the tile rules; inline stats take the ink of what they sit on. `layout="fact"` is a small tile whose value is words (When · Tue 3 Nov · 7:30 PM), for the facts row on event pages.

## States and motion
Numbers can tick up on first view (set by the app; reduced motion shows the final value).

<!-- generated:flutter:start -->
## Flutter

`catch.analytics_metric`:
- `CatchDataQualityMetricTile`
`catch.metric_strip`:
- `CatchMetricSection`
- `CatchMetricSection.grid`
- `CatchMetricSection.dataQuality`
<!-- generated:flutter:end -->

## Replaces
HostStat and the metric strips.
