Text, phone, number, choice and code entry with the label, help and error built in.

**Registry:** `catch.field` · Flutter and React: `CatchField` · In this system: `Catch.Field`

## When to use
Always give a `label` (search fields excepted). Put help under the field, not in the placeholder. Errors say what to do.

## What you provide
`label`, `help`, `error`, `kind` (text, phone, number, email, textarea, select, date, search, code), `size` (lg 52, md 44), `prefix`, `suffix`, `leadingIcon`, `counter` with `maxLength`, `options`, `length`, plus the usual input props.

## How it adapts
White on day and on tiles, the raised night tile on dark. Search fields are pills on the grey tile.

## States and motion
Rest, focus (2 px ink ring), filled, error (coral ring and message), disabled.

<!-- generated:flutter:start -->
## Flutter

`catch.field`:
- `CatchField.read`
- `CatchField.navigate`
- `CatchField.content`
- `CatchField.nav`
- `CatchField.sortable`
- `CatchField.action`
- `CatchField.toggle`
- `CatchField.input`
- `CatchField.inputActions`
- `CatchField.control`
- `CatchField.choices`
- `CatchField.optionCards`
- `CatchField.stepper`
- `CatchField.add`
- `CatchField.select`
`catch.search_field`:
- `CatchSearchField`
- `CatchSearchField.expanded`
- `CatchSearchField.expanding`
<!-- generated:flutter:end -->

## Replaces
43 hand-drawn inputs in 22 looks; catch.search_field and catch.code_input become kinds.
