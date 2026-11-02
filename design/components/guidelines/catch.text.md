Every piece of text, chosen by role rather than size.

**Registry:** `catch.text` · Flutter and React: `CatchText` · In this system: `Catch.Text`

## When to use
Pick the role that says what the text is: `page-title` for a screen title, `section-title` for a section, `title-row` for a name in a list, `label-kicker` for the small grey line above a title, `body` for prose. Never set a font size by hand.

## What you provide
`variant` (one of the 19 type styles or the responsive roles `page-title`, `section-title`, `hero`), `tone`, `as`, `align`, `maxLines`, `numeric`, children.

## How it adapts
Colour comes from the surface behind it (ink on day, paper on night and ink on event colours) unless a tone is set. Responsive roles change size with the screen: a page title is 38 on phones, 48 on tablets and 64 on desktops.

## States and motion
Static. Use `numeric` for values that change so digits do not jump.

<!-- generated:flutter:start -->
## Flutter

`catch.text`:
- `CatchText`
`catch.typography`:
- `CatchKickerText`
<!-- generated:flutter:end -->

## Replaces
146 text styles in 28 sizes; old variants displayXs…displayXxl, sectionTitle, bodyM and friends.
