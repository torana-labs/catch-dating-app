Messages and the composer for group and one-to-one chats.

**Registry:** `catch.timestamped_message · catch.chat_composer` · Flutter and React: `CatchMessage · ChatInput` · In this system: `Catch.ChatMessage`

## When to use
Group consecutive messages with `continued`. Hosts' announcements use `from="host"` and take the event colour. Closed chats replace the composer with a note.

## What you provide
ChatMessage: `sender` (mine, theirs, host, system), `author`, `time`, `status`, `continued`, `format`, children. ChatComposer: `placeholder`, `onSend`, `closedNote`, `onAttach`.

## How it adapts
Mine is primary (ink by day, paper at night); theirs is the tile.

## States and motion
New messages slide in; failed messages offer a retry.

<!-- generated:flutter:start -->
## Flutter

`catch.timestamped_message`:
- `CatchTimestampedMessageText`
<!-- generated:flutter:end -->

## Replaces
The group chat, one-to-one chats and host announcements.
