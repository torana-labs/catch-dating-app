Passive labels that carry status: paid, so far, live, imported from, new.

**Registry:** `catch.badge` · Flutter and React: `CatchBadge` · In this system: `Catch.Badge`

## When to use
Choose the tone from what the badge means, never from the screen. **Soft** badges use the pale tints; **solid** neutral is ink, for the strongest label in a block.

## What you provide
`label`, `tone` (neutral, success, warning, danger, info, social, format), `emphasis` (soft, solid, outline: a dashed edge for something still waiting, such as no reply), `size` (sm 22, md 28), `icon`, `dot` (`true` or `"live"`), `format`.

## How it adapts
A soft neutral badge turns white on a tile or a coloured spotlight; a format badge takes the event colour around it.

## States and motion
Static; a live dot pulses every 1.6 s.

<!-- generated:flutter:start -->
## Flutter

`catch.badge`:
- `CatchBadge`
- `CatchBadge.functional`
- `CatchBadge.solid`
- `CatchBadge.solidStatus`
- `CatchBadge.live`
- `CatchBadge.onDark`
- `CatchBadge.onDarkStatus`
- `CatchBadge.privacy`
- `CatchBadge.status`
- `CatchBadge.ticketStatus`
- `CatchBadge.optional`
<!-- generated:flutter:end -->

## Replaces
201 hand-drawn badges in 38 looks; old tones brand → format, gold → warning, affinity → social.
