<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->

# Host Inbox

Own organizer communication work: inquiry conversations, WhatsApp threads, outbound Sends, saved-audience consumption, delivery operations, and sender-readiness recovery.

## Ownership

- Primary route: `hostInboxScreen` (`/host/inbox`)
- Target root: `lib/hosts/inbox`
- Migration status: target boundary defined; implementation still lives in listed legacy Host roots
- Responsibility contract updated: 2026-09-22

Current implementation roots:

- `lib/hosts/people`

## This feature owns

- Own the /host/inbox destination, its Inbox and Sends peer workspaces, organizer/event scope, search, and thread selection.
- Own broadcast, announcement, campaign, follower-update, manual-send, and WhatsApp reply composition or delivery orchestration.
- Own sender setup and provider-readiness recovery for otherwise eligible sends.
- Consume saved-audience identifiers and recipient projections without recreating Audience membership logic.
- Preserve conversation drafts, send status, retries, and deep links to a selected thread.

## This feature does not own

- Customer identity, tagging, saved-audience definitions, form responses, or participant segmentation.
- Event lifecycle management, organizer profile/settings, or payment-account onboarding.
- The shared Consumer/Host chat message implementation when a dedicated chat route owns it.

## Routes

Owned routes:

- `hostInboxScreen` — `/host/inbox`
- `hostOrganizerMessagingScreen` — `/host/organizer/:organizerId/messaging`

Typed handoffs:

- `hostChatScreen` — `/host/inbox/:matchId`
- `hostAudienceScreen` — `/host/audience`

## Key code owners

| Owner | Source | Responsibility |
|---|---|---|
| `HostMessagesScreen` | `lib/hosts/people/messages_screen.dart` | Actions: retry_inbox, select_scope, select_audience_segment, search_inquiries, open_conversation, open_sends. |
| `HostComposeScreen` | `lib/hosts/people/compose_screen.dart` | Actions: select_broadcast_audience, select_broadcast_template. |
| `HostComposeCommands` | `lib/hosts/people/compose_controller.dart` | Actions: send_broadcast. |
| `_HostSendsScreenState` | `lib/hosts/people/sends/sends_screen.dart` | Actions: open_event_announcement_composer. |
| `HostManualSendSheet` | `lib/hosts/people/sends/sends_sheets_body.dart` | Actions: open_manual_send_task, open_manual_handoff, mark_manual_send_task, replan_manual_send_tasks. |
| `showHostFollowerUpdateSheet` | `lib/hosts/people/sends/sends_sheets_body.dart` | Actions: send_follower_update. |
| `HostCampaignScreen` | `lib/hosts/people/sends/campaign_screen.dart` | Structural owner. |
| `HostAudienceController` | `lib/hosts/people/host_audience_controller.dart` | Actions: manage_campaign. |

## Shared dependencies

- `lib/chats/presentation/inbox` — Shared inquiry list/search presentation remains a cross-role chat implementation seam.
- `lib/hosts/people/host_audience_controller.dart` — Legacy campaign orchestration is relocated by A4; the responsibility remains Inbox-owned now.
- `lib/routing/shell/host_shell_screen.dart` — The shell owns global destination navigation and organizer scope.

## Data contracts

- `contracts/callable_responses/create_organizer_post_response.schema.json`
- `contracts/callable_responses/list_organizer_campaigns_response.schema.json`
- `contracts/callable_responses/organizer_campaign_response.schema.json`
- `contracts/callable_responses/organizer_messaging_setup_response.schema.json`
- `contracts/callable_responses/send_event_broadcast_response.schema.json`
- `contracts/callable_responses/send_organizer_whatsapp_reply_response.schema.json`
- `contracts/callables/complete_organizer_whatsapp_connection_payload.schema.json`
- `contracts/callables/create_organizer_post_payload.schema.json`
- `contracts/callables/list_organizer_manual_send_tasks_payload.schema.json`
- `contracts/callables/mark_organizer_manual_send_task_payload.schema.json`
- `contracts/callables/open_organizer_manual_send_task_payload.schema.json`
- `contracts/callables/organizer_campaign_action_payload.schema.json`
- `contracts/callables/replan_organizer_manual_send_tasks_payload.schema.json`
- `contracts/callables/send_event_broadcast_payload.schema.json`
- `contracts/callables/send_organizer_whatsapp_reply_payload.schema.json`
- `contracts/callables/send_organizer_whatsapp_test_payload.schema.json`
- `contracts/callables/upsert_organizer_campaign_payload.schema.json`
- `contracts/firestore/event_bookings.schema.json`
- `contracts/firestore/event_broadcasts.schema.json`
- `contracts/firestore/events.schema.json`
- `contracts/firestore/matches.schema.json`
- `contracts/firestore/organizer_broadcast_summaries.schema.json`
- `contracts/firestore/organizer_campaign_recipients.schema.json`
- `contracts/firestore/organizer_campaign_webhook_receipts.schema.json`
- `contracts/firestore/organizer_campaigns.schema.json`
- `contracts/firestore/organizer_manual_send_tasks.schema.json`
- `contracts/firestore/organizer_posts.schema.json`
- `contracts/firestore/organizer_whatsapp_messages.schema.json`
- `contracts/firestore/organizer_whatsapp_reply_operations.schema.json`
- `contracts/firestore/organizer_whatsapp_threads.schema.json`
- `contracts/firestore/organizers.schema.json`

## Focused tests

- `test/hosts/people/conversation/messages_scope_test.dart`
- `test/hosts/people/sends/sends_body_test.dart`
- `test/hosts/people/compose_request_id_test.dart`
- `test/hosts/people/conversation/conversation_people_test.dart`

## Maintenance

Do not edit this file directly. Update `design/features/host_feature_responsibilities.json`, then run:

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
```

The generator cross-checks the Host shell order, typed route contract, Dart symbols, data-contract paths, and focused tests.
