Placeholders shaped like what is loading, and a spinner for short waits.

**Registry:** `catch.skeleton · catch.loading_indicator` · Flutter and React: `CatchSkeleton · CatchLoadingIndicator` · In this system: `Catch.Skeleton`

## When to use
Prefer a skeleton shaped like the real row over a spinner. Use the spinner only inside a control (buttons already have one) or for waits under a second.

## What you provide
Skeleton: `shape` (line, block, circle), `width`, `height`. Spinner: `size`, `label`.

## How it adapts
White on a tile, night on dark.

## States and motion
Shimmer every 1.2 s; still with reduced motion.

<!-- generated:flutter:start -->
## Flutter

`catch.skeleton`:
- `CatchSkeleton.card`
- `CatchSkeleton.box`
- `CatchSkeleton.text`
- `CatchSkeleton.textBlock`
- `CatchSkeleton.circle`
- `CatchSkeleton.custom`
- `CatchSkeleton.content`
<!-- generated:flutter:end -->

## Replaces
Hand-drawn placeholders.
