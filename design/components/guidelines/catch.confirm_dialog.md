A question that must be answered before going on.

**Registry:** `catch.confirm_dialog` · Flutter and React: `CatchDialog` · In this system: `Catch.Dialog`

## When to use
Keep for confirmations and destructive steps. The confirm label says what happens ("Cancel the event"), never "OK".

## What you provide
`open`, `onClose`, `title`, `body`, `confirm`, `cancel`, `tone` (default, destructive), `contained`.

## How it adapts
Night surface on dark.

## States and motion
Fades and scales in over 160 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.confirm_dialog`:
- `CatchDialog`
- `CatchDialog.confirmation`
<!-- generated:flutter:end -->

## Replaces
Confirms and destructive checks.
