Wide data for tablets and desktops that folds into list rows on phones.

**Registry:** `catch.table` · Flutter and React: `CatchTable` · In this system: `Catch.Table`

## When to use
Use for programme guests and people on desktop. Keep the first column the name.

## What you provide
`columns` (key, label, align, width, `sort` for the arrow, and `kind`: text, title for two lines, marker for a reply or status dot read aloud, badge, number; or a `render` function), `rows` (plain data, so the same table works from Flutter and the canvas), `rowKey` (a field name or function; defaults to key, then id), `label`, `onRowPress`, `selectedKey` (the row open beside the table), `selectable` with `checked`, `onCheck` and `bulk` (actions for the checked rows), `density`.

## How it adapts
Table from 600; list rows below.

## States and motion
Sticky header; hover on pressable rows.

<!-- generated:flutter:start -->
## Flutter

`catch.table`:
- `CatchTable`
<!-- generated:flutter:end -->

## Replaces
The programme guest table and people on desktop.
