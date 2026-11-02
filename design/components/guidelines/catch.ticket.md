The guest's ticket: the event in its colour, the facts, and the code to show at the door.

**Registry:** `catch.ticket` · Flutter and React: `CatchTicket` · In this system: `Catch.Ticket`

## When to use
Show the full ticket on the plan screen and at the door; brighten the screen when the code is shown.

## What you provide
`title`, `format`, `organiser`, `formatLabel`, `facts`, `code`, `guest`, `status` (valid, used, refunded).

## How it adapts
Floating on day, the raised tile at night.

## States and motion
Used and refunded tickets fade the code.

<!-- generated:flutter:start -->
## Flutter

`catch.ticket`:
- `CatchTicket.hero`
- `CatchTicket.card`
<!-- generated:flutter:end -->

## Replaces
AppTicket and the QR blocks on share screens.
