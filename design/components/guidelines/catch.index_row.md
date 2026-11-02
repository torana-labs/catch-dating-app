One row for every list: events, people, guests, settings, tasks, notifications, plan steps, scores and bills.

**Registry:** `catch.index_row` · Flutter and React: `CatchIndexRow` · In this system: `Catch.ListRow`

## When to use
Use inside a Section (or any `.c-list`) so lines come out right. Pick the leading slot that says what the row is about (a date tile for events, an avatar for people, an icon for settings and notices, a marker for tasks, a time for plan steps, a rank for scores) and the trailing slot for what you can do or read (a value, a switch, a small button, a badge, a chevron).

## What you provide
`title`, `subtitle`, `body` (wrapping text such as a review), `meta` with `metaTone`, `progress`; leading `avatar`, `date`, `icon` + `iconTone`, `marker`, `time` (with or without a marker), `rank` or any `leading`; `badge` after the title; `status`; trailing `value`, `trailing` (or children), `action`, `chevron`; `density` (compact 10, regular 12, roomy 14); `wrap` (titles wrap instead of ending in …); `childrenSlot` (trailing, or below: chips or a strip of badges under the text); `unread`, `selected`, `done`, `disabled`; `href` or `onPress`.

## How it adapts
Icon tiles turn white on a tile; everything flips on night. Rows that link show a chevron unless they have another control.

## States and motion
Rest, hover layer, focus ring, selected (a grey block), unread (bold title and a coral dot), done (muted title), disabled. New rows slide in over 240 ms.

<!-- generated:flutter:start -->
## Flutter

`catch.index_row`:
- `CatchIndexRow`
<!-- generated:flutter:end -->

## Replaces
HostEventRow, HostGuestRow, HostPersonRow, HostSettingRow, HostTaskRow, AppNoticeRow, roster_row, notification_row, meta_row and 398 hand-drawn rows.
