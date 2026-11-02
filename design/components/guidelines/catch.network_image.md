Photos and videos with a coloured placeholder, a fade-in and a play button.

**Registry:** `catch.network_image · graded_image · detail_media` · Flutter and React: `CatchImage` · In this system: `Catch.Image`

## When to use
Always give `alt`. Use the event's format as the placeholder so loading pages still look like the event.

## What you provide
`src`, `alt`, `aspect`, `fit`, `radius`, `placeholder`, `kind` (photo, video), `duration`, `onPlay`.

## How it adapts
Corners follow the block it sits in unless set. `bleed` runs it edge to edge past the gutters, square-cornered, for a hero at the top of a screen. `title` and `caption` sit on a dark fade at the bottom (photo tiles, videos).

## States and motion
Fades in over 240 ms; a failed picture keeps the placeholder colour.

<!-- generated:flutter:start -->
## Flutter

`catch.network_image`:
- `CatchNetworkImage`
`catch.graded_image`:
- `CatchGradedImage`
`catch.detail_media`:
- `CatchHeroImage`
<!-- generated:flutter:end -->

## Replaces
club_cover, hero images and YouTube embeds.
