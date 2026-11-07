The top of every screen, in seven variants: six for the apps and **site** for the website (wordmark, page links that fold away on phones, and an action such as Get the app).

**Registry:** `catch.top_bar · catch.step_header` · Flutter and React: `CatchTopBar` · In this system: `Catch.TopBar`

## When to use
**tab-home** for a tab's own screen (kicker, 30 title, actions). **tool** for sub-screens (back, kicker, 17 title, a text action). **subject** over a hero photo or poster. **step** in flows (counter, segments, title). **live** on night consoles (title and a live badge). **moment** for full-screen moments (close only).

## What you provide
`variant`, `title`, `kicker`, `back` (label, href or onPressed, `close`), `action`, `actions` (or children), `step`, `live`; for site, `links` and `homeHref`. PaneHeader, the same row for one pane, takes `count`, `note` (the summary line), `position` ("1 of 23" with previous and next), `views` (a select: waiting, mine, done) and `filters` (chips with counts and search, as a second row), all as data, so no screen builds a queue header. Placed straight in ScreenBody it heads the whole page and every pane under it: an insights page is a PaneHeader, a row of Stats, then a feed PaneLayout.

## How it adapts
Inside AppShell it learns when the body has scrolled: it gains a hairline, and subject bars turn solid and show their title. It sits under the status bar on phone frames. On tablets and desktops every variant becomes the same 56 px bar: back, a one-line title with its kicker as a breadcrumb, and small (32 px) actions. It lines up with the navigation’s header and every pane header.

## States and motion
Title fade 160 ms on scroll.

<!-- generated:flutter:start -->
## Flutter

`catch.top_bar`:
- `CatchTopBar`
`catch.step_header`:
- `CatchStepHeader`
<!-- generated:flutter:end -->

## Replaces
HostBackBar, HostHeader, HostStepHeader, live headers and 23 hand-drawn back bars.
