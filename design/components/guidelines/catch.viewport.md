A whole screen: theme, size class, navigation placement, top bar, scrolling body, dock and overlays.

**Registry:** `catch.viewport` · Flutter and React: `CatchViewport` · In this system: `Catch.AppShell`

## When to use
Every screen starts here. Pass the Navigation, the TopBar and the Dock; put content in a ScreenBody.

## What you provide
`theme`, `register` (app, or quiet for Admin), `format`, `size`, `frame` (phone, tablet, desktop, fluid), `height`, and either slot props (`navigation`, `topBar`, `dock`, `overlay`) or simply children in any order: the shell is a grid with named areas, so a TopBar, ScreenBody, Dock and Navigation find their places by type.

## How it adapts
Picks the size class and puts navigation at the bottom, in a rail or in a sidebar. Phone frames add the status-bar inset. **quiet** is Admin's register, the quietest of the three (website, apps, Admin): section titles and numbers in plain type, neutral badges with colour only for success, warnings and problems, one-line table cells that end in "…", tinted row icons turned grey, and a text-only sidebar with plain counts. Screens never restyle parts themselves; the shell sets it once. PaneHeader takes a `note` for the summary line ("oldest 3 days · 6 ready to decide").

## States and motion
Route transitions: push, modal sheet, crossfade between tabs.

<!-- generated:flutter:start -->
## Flutter

`catch.viewport`:
- `CatchViewport`
- `CatchViewport.atWidth`
- `CatchViewport.sliver`
- `CatchViewport.scene`
- `CatchViewport.sliverLane`
- `CatchViewport.box`
`catch.app_shell`:
- `CatchAppShell`
`catch.screen`:
- `CatchScreen`
<!-- generated:flutter:end -->

## Replaces
Every board drawing its own frame, bars and navigation.
