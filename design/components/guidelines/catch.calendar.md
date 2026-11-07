A month of days, Monday first, for picking a date past the day strip.

**Registry:** `catch.calendar (new)` · Flutter and React: `CatchCalendar` · In this system: `Catch.Calendar`

## When to use
Open it in a Sheet from a "Pick a date" button beside a day strip; the strip covers the next few weeks, the calendar everything else. Show days that already have something on as `marked`, and a weekly repeat as `repeats`.

## What you provide
`month`, `value` or `defaultValue`, `onChange`, `min`, `marked`, `repeats`, `label`.

## How it adapts
Days are 40 px squares or larger; the chosen day is ink, repeats are ringed, marked days carry a coral dot. Days before `min` are disabled.

## States and motion
Arrows step a month at a time; the chosen day changes at once.

<!-- generated:flutter:start -->
## Flutter

`catch.calendar`:
- `CatchCalendar`
<!-- generated:flutter:end -->

## Replaces
The fixed one-week strip on Create, which could not reach past Sunday.
