Minus, value, plus, for tickets, capacity and counts.

**Registry:** `catch.number_stepper` · Flutter and React: `CatchStepper` · In this system: `Catch.Stepper`

## When to use
Use for small counts a person adjusts by one. Give `label` the thing being counted ("tickets") so the buttons read "Fewer tickets" and "More tickets".

## What you provide
`value` or `defaultValue`, `min`, `max`, `step`, `onChange`, `label`, `format`.

## How it adapts
Buttons turn white on a tile.

## States and motion
Buttons dim at the limits; pressed scale 0.92.

<!-- generated:flutter:start -->
## Flutter

`catch.number_stepper`:
- `CatchStepper`
- `CatchStepper.actions`
<!-- generated:flutter:end -->

## Replaces
Hand-drawn steppers on booking, capacity and filters.
