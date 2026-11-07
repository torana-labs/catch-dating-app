A tinted message about status: help, a warning, something that went wrong or worked.

**Registry:** `catch.notice · catch.banner` · Flutter and React: `CatchNotice` · In this system: `Catch.Notice`

## When to use
Inline notices sit in the flow near what they are about. Banners go at the top of a screen for app-wide states (offline, payments paused). Say what to do in the action.

## What you provide
`tone` (info, success, warning, danger, neutral), `title`, children, `icon` (or `false`), `action`, `layout` (inline, banner), `onDismiss`.

## How it adapts
Uses the pale status tints with their deep partner for the icon; night tints on dark.

## States and motion
Banners slide down over 240 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.notice`:
- `CatchNotice`
- `CatchNotice.inline`
`catch.banner`:
- `CatchBanner`
- `CatchBanner.error`
- `CatchBanner.errorWithRetry`
- `CatchBanner.statuses`
<!-- generated:flutter:end -->

## Replaces
Status-tint boxes and help notes across the drawings.
