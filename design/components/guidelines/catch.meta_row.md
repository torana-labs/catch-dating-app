Facts about one record, read at a glance: label over value in columns, or one dot-separated line.

**Registry:** `catch.meta_row` · Flutter and React: `CatchMetaRow` · In this system: `Catch.MetaRow`

## When to use
Use for a record's facts in a detail pane (Admin items, a host's person pane, ticket and event facts). Never stack boxed label-value tiles.

## What you provide
`items` (label, value, `tone`, `href`, `wide` to span the row), `layout` (grid, inline), `columns` (1 to 4).

## How it adapts
Two columns in narrow panes whatever `columns` asks. Values wrap; links are underlined quietly.

## States and motion
Static.

<!-- generated:flutter:start -->
## Flutter

`catch.meta_row`:
- `CatchMetaRow`
- `CatchMetaRow.entry`
- `CatchMetaRow.flow`
- `CatchMetaRow.group`
<!-- generated:flutter:end -->

## Replaces
Admin's boxed field tiles (AdminFieldGrid, StateRow).
