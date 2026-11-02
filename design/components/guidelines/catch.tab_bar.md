The app's tabs, as a bottom bar, a 96 px rail or a 240 px sidebar from one list of items.

**Registry:** `catch.tab_bar` · Flutter and React: `CatchTabBar` · In this system: `Catch.Navigation`

## When to use
Pass it to AppShell and leave `layout` on auto. Four tabs for each app; badges for counts that need attention.

## What you provide
`items` (value, label, icon, href, badge, `section` for a sidebar heading, `pinned` for the phone bar), `value`, `onChange`, `layout`, `header` (the organiser switcher: an element, or `{title, note, avatar, switcher}`), `primaryAction` ("New event"), `footer` (who is signed in, same shape), `label`, `more` (where More goes when items are pinned).

## How it adapts
Bottom under 600, rail from 600, sidebar from 840; night look on dark. Admin has more destinations than four: the sidebar groups them under section headings with counts on the right, the rail draws a rule between sections, and the phone bar shows the pinned items plus More. The rail’s and sidebar’s header (the organiser or the app) sits in the same 56 px row as the top bar and pane headers, with one hairline under all of them.

## States and motion
The selected tab's pill eases in; haptic tick on phones.

<!-- generated:flutter:start -->
## Flutter

`catch.tab_bar`:
- `CatchTabBar`
<!-- generated:flutter:end -->

## Replaces
AppTabBar and HostTabBar.
