A quick task over the screen it belongs to: filters, choosing a pace, adding to a calendar.

**Registry:** `catch.sheet` · Flutter and React: `CatchSheet` · In this system: `Catch.Sheet`

## When to use
Use for short tasks that keep their context. Use a full screen for tasks with their own steps, and a dialog only for questions.

## What you provide
`open`, `onClose`, `title`, `kicker`, `action`, `dock`, `placement` (auto, bottom, center), `contained`, `scrim` (false keeps the screen behind usable), `tone` (success for a confirmation), children.

## How it adapts
A bottom sheet on phones; a centred panel on tablets and desktops; night surface on dark.

## States and motion
Springs up over 360 ms; drag the grabber down to close; Escape and the scrim close it.

<!-- generated:flutter:start -->
## Flutter

`catch.sheet`:
- `CatchSheet`
- `CatchSheet.standard`
- `CatchSheet.filter`
- `CatchSheet.contained`
<!-- generated:flutter:end -->

## Replaces
The booking sheets, the dispatch sheet and filters.
