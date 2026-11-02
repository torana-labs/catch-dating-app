A titled group of rows, which owns the lines between them.

**Registry:** `catch.section · catch.section_stack` · Flutter and React: `CatchSection` · In this system: `Catch.Section`

## When to use
Wrap every list in a Section. Put rows straight inside; use `container="tile"` when the rows belong together as one block (settings, a set-up list).

## What you provide
`title`, `kicker`, `count`, `action` (a quiet link such as "All 4") or `note` (grey text such as "3 before doors"), `dividers` (between, all, none), `container` (plain, tile), `timeline` (joins the rows’ leading markers with a line: a run of show, messages in order), `empty`, `footer`, `columns` (2 or 3: one long list flowing down into columns, with no lines; one column on phones), children. `SectionHeader` is exported for headers without a list.

## How it adapts
The title is a responsive section title: 24 on phones and tablets, 30 on desktops. Inside a tile the lines inset with the rows. Rows meet at a hairline; anything else in a section (chips, a note, a map, text) gets 12 px before and after from the section, so content never sits flush against its neighbour. A list holding a selected row is a pick list, like the sidebar: no lines, rows 2 px apart, no chevrons, the choice as a pill. On phones, with nothing selected, the same list keeps its lines.

## States and motion
Static; rows animate in.

<!-- generated:flutter:start -->
## Flutter

`catch.section`:
- `CatchSection.divided`
- `CatchSection.fieldRows`
- `CatchSection.containedFieldRows`
- `CatchSection.containedFieldGroups`
- `CatchSection.contained`
- `CatchSection.plain`
- `CatchSection.horizontal`
- `CatchSection.rows`
- `CatchSection.loadingRows`
- `CatchSection.controls`
- `CatchSection.containedRows`
- `CatchSection.containedLoadingRows`
- `CatchSection.sliverRows`
- `CatchSection.sliverLoadingRows`
- `CatchSection.content`
- `CatchSection.formRows`
- `CatchSection.dependentFieldRows`
- `CatchSection.action`
- `CatchSection.collection`
- `CatchSection.status`
`catch.section_stack`:
- `CatchSectionList`
- `CatchSectionList.inset`
- `CatchSectionList.sliver`
- `CatchSectionList.responsive`
- `CatchSectionList.page`
- `CatchSectionList.panes`
<!-- generated:flutter:end -->

## Replaces
Every hand-built section title, "All" link and list. `dividers` is where your rule 7 call lands.
