A person, as a photo or initials on a colour that stays the same for them everywhere.

**Registry:** `catch.person_avatar` · Flutter and React: `CatchAvatar` · In this system: `Catch.Avatar`

## When to use
Use `AvatarStack` for who is going and teams. Sizes: xs 24 and sm 28 in stacks and dense rows, md 40 in rows, lg 48 for people lists and chat, xl 64 on live screens, xxl 104 on profiles.

## What you provide
`size`, `name`, `imageUrl`, `initials`, `color`, `ring`, `status`, `href` or `onPress` with `pressLabel`. AvatarStack: `people`, `size`, `max`, `total`.

## How it adapts
The ring matches whatever is behind the avatar, so stacks read on white, tiles, colours and night. Initials switch to the display face from xl. `shape="square"` is an organiser's logo; people stay round.

## States and motion
Photo failing falls back to initials.

<!-- generated:flutter:start -->
## Flutter

`catch.person_avatar`:
- `CatchAvatar`
- `CatchAvatar.count`
- `CatchAvatar.veiled`
- `CatchAvatar.monogram`
- `CatchAvatar.system`
<!-- generated:flutter:end -->

## Replaces
318 hand-drawn circles in 86 looks.
