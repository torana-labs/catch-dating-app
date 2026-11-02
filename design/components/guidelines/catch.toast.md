A short note that something happened, with an optional undo.

**Registry:** `new · catch.toast` · Flutter and React: `CatchToast` · In this system: `Catch.Toast`

## When to use
Use after an action whose result is not otherwise visible ("Rhea checked in", "Saved"). One at a time.

## What you provide
`open`, `message`, `tone` (neutral, success, danger), `icon`, `action`, `duration`, `onClose`, `contained`.

## How it adapts
Sits above the dock or bottom bar. Ink on day, paper on night.

## States and motion
Slides up with a spring, leaves after 4 s.

<!-- generated:flutter:start -->
## Flutter

`catch.toast`: No Flutter symbol yet.
<!-- generated:flutter:end -->

## Replaces
"Saved", check-in and undo messages.
