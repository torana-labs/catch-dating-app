import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_chat_entry_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_chat_message_tile.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Admitted attendee conversation',
  type: EventChatScreen,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatScreenPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          eventChatControllerProvider(
            'preview-event',
          ).overrideWith(_Controller.new),
        ],
        child: const EventChatScreen(eventId: 'preview-event'),
      ),
    );

@widgetbook.UseCase(
  name: 'Review and explicit join',
  type: EventChatPageBody,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatJoinPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(child: _JoinPreview());

class _JoinPreview extends StatefulWidget {
  @override
  State<_JoinPreview> createState() => _JoinPreviewState();
}

class _JoinPreviewState extends State<_JoinPreview> {
  final draft = TextEditingController();
  final scroll = ScrollController();
  @override
  void dispose() {
    draft.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (_, _) =>
        const CatchTopBar.route(title: 'RSVP coffee afternoon'),
    body: CatchRouteBody.fullBleed(
      child: EventChatPageBody(
        state: _state(joined: false),
        draft: draft,
        scrollController: scroll,
        now: DateTime.utc(2026),
        replyId: null,
        reactionId: null,
        onSend: () {},
        onLoadEarlier: () {},
        onAction: (_) {},
        onReviewProfile: () {},
        onReply: (_) {},
        onShowReactions: (_) {},
        onReaction: (_, _) {},
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Reply and reactions',
  type: EventChatMessageTile,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatMessagePreview(BuildContext context) => Padding(
  padding: const EdgeInsets.all(16),
  child: EventChatMessageTile(
    message: _message(),
    isMe: false,
    enabled: true,
    onReply: () {},
    onReact: () {},
    onReaction: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Six accessible reactions',
  type: EventChatReactionSection,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatReactionsPreview(BuildContext context) =>
    EventChatReactionSection(
      selected: EventChatReaction.love,
      onSelected: (_) {},
      onClose: () {},
    );

@widgetbook.UseCase(
  name: 'Admitted event entry',
  type: EventChatEntrySection,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatEntryPreview(BuildContext context) => WidgetbookFixtureScope(
  overrides: [
    eventChatAccessProvider(
      'preview-event',
    ).overrideWith((_) async => _state().access),
  ],
  child: const EventChatEntrySection(eventId: 'preview-event'),
);

EventChatMessage _message() => EventChatMessage(
  messageId: 'message',
  sequence: 1,
  sentAt: DateTime.utc(2026, 9, 23, 12),
  senderUid: 'alex',
  senderName: 'Alex',
  available: true,
  text: 'Looking forward to meeting everyone over coffee!',
  reply: const EventChatReply(
    messageId: 'earlier',
    available: true,
    senderName: 'Sara',
    text: 'Who is coming a little early?',
  ),
  reactionCounts: const {EventChatReaction.love: 2},
  myReaction: EventChatReaction.love,
  myReactionRevision: 1,
);
EventChatState _state({bool joined = true}) => EventChatState(
  uid: 'preview-person',
  access: EventChatAccess(
    eventId: 'preview-event',
    title: 'RSVP coffee afternoon',
    organizerId: 'rsvp',
    roomStatus: 'open',
    roomRevision: 1,
    membershipStatus: joined ? 'joined' : 'notJoined',
    membershipRevision: 0,
    canManage: false,
    canJoin: true,
    canReadMessages: joined,
    profileClaimRequired: false,
    termsVersion: 'event-chat-v1',
  ),
  messages: joined ? [_message()] : [],
  typing: const [],
  nextBeforeSequence: null,
  receivedAt: DateTime.utc(2026),
  serverTimeMillis: 0,
);

class _Controller extends EventChatController {
  @override
  Future<EventChatState> build(String eventId) async => _state();
  @override
  void setForeground(bool value) {}
  @override
  void draftChanged(bool hasText) {}
  @override
  Future<void> refresh() async {}
  @override
  Future<void> loadEarlier() async {}
  @override
  Future<bool> updateAccess(
    EventChatAction action, {
    required String reviewedUid,
    DateTime? opensAt,
    DateTime? closesAt,
  }) async => false;
  @override
  Future<bool> send(
    String text, {
    required String reviewedUid,
    String? replyToMessageId,
    bool announcement = false,
  }) async => false;
  @override
  Future<bool> react(
    EventChatMessage reviewed,
    EventChatReaction? reaction, {
    required String reviewedUid,
  }) async => false;
}

@widgetbook.UseCase(
  name: 'Admitted event directory',
  type: EventChatDirectorySection,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatDirectoryPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          eventChatDirectoryControllerProvider.overrideWith(_Directory.new),
        ],
        child: const CustomScrollView(slivers: [EventChatDirectorySection()]),
      ),
    );

@widgetbook.UseCase(
  name: 'Empty directory with more candidates',
  type: EventChatDirectoryRowList,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatDirectoryEmptyPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CustomScrollView(
        slivers: [
          EventChatDirectoryRowList(
            page: EventChatDirectoryPage(
              items: const [],
              nextCursor: const {
                'source': 'attendees',
                'after': null,
                'accountUid': 'preview-person',
              },
            ),
            onLoadMore: () {},
            onSelected: (_) {},
          ),
        ],
      ),
    );

class _Directory extends EventChatDirectoryController {
  @override
  Future<EventChatDirectoryPage> build() async =>
      EventChatDirectoryPage(items: [_state().access], nextCursor: null);
  @override
  Future<void> refresh() async {}
  @override
  Future<void> loadMore() async {}
}
