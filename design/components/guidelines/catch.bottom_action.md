The bottom action bar: one primary action with a secondary action or a summary beside it.

**Registry:** `catch.bottom_action · catch.club_dock` · Flutter and React: `CatchDock` · In this system: `Catch.Dock`

## When to use
Use one dock per screen for the step's main action (Save, Book, Continue). Put a price or date in `summary` on booking screens.

## What you provide
`primary`, `secondary`, `summary` (or children), `placement` (auto, bar, card, pane); for pane, `danger`, `note` and `next`.

## How it adapts
A bar on phones and tablets; a floating card on desktops (the event page booking card). **pane** is the decision bar at the foot of a detail pane (Admin reviews, host join requests): a note, a quiet danger action, a secondary and the primary, with what comes next; it stays in view while the pane scrolls.

## States and motion
Rises with the keyboard; hides on scroll down and returns on scroll up (app shells).

<!-- generated:flutter:start -->
## Flutter

`catch.bottom_action`:
- `CatchDock`
<!-- generated:flutter:end -->

## Replaces
HostBottomBar, the booking dock and the organiser follow dock.
