One layout widget for the seven screen patterns.

**Registry:** `new · catch.pane_layout` · Flutter and React: `CatchPaneLayout` · In this system: `Catch.PaneLayout`

## When to use
Pick the pattern that matches the screen and fill its slots; it decides the columns for each screen size.

## What you provide
`pattern` (feed, list-detail, editor, operations, browse, reading, wide-table, queue), `main`, `detail`, `aside` (or simply children, in that order), `detailOpen`. In the editor pattern an aside is the step list, shown on the left on desktops only.

## How it adapts
Queue: the table fills the width and the selected item opens in a 440 px inspector (480 from 1,440); each pane scrolls on its own; below 1,200 the inspector replaces the table. List 360, reading lane 600, preview 320 from 1,180, live pane 360 from 900, live cap 1,040; detail panes fold away on phones. A split screen owns its edges: the page gutter stops at the split and each pane insets its content evenly (list 16, detail 32). Start each pane with a PaneHeader for its title and actions; every pane header shares the 56 px row, sits at the very top of the screen, and content starts 24 px under its line whatever stack it is in. A detail pane beside its list shows no back arrow and no breadcrumb (the list is the context); both appear when the detail replaces the list.

## States and motion
The detail slides in on phones and swaps in place on wide screens.

<!-- generated:flutter:start -->
## Flutter

`catch.pane_layout`:
- `CatchPaneLayout`
<!-- generated:flutter:end -->

## Replaces
Hand-built grids on every tablet and desktop board.
