import 'package:catch_dating_app/chats/domain/chat_message.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_message_list.dart';
import 'package:catch_dating_app/chats/presentation/widgets/message_bubble.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Renderer states',
  type: ChatMessageList,
  path: '[P1 product surfaces]/Matches and chat/Components',
)
Widget chatMessageListRendererStates(BuildContext context) {
  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'ChatMessageList',
      contractId: 'component.messaging.chat_message_list',
      children: [
        const WidgetbookPageStateCard(
          label: 'loading skeleton',
          child: _ChatMessageListFrame(
            messages: AsyncLoading<List<ChatMessage>>(),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'populated messages',
          child: _ChatMessageListFrame(
            messages: AsyncData<List<ChatMessage>>(
              MatchesChatSurfaceFixtures.conversationMessages,
            ),
            event: widgetbookMatchesEvent,
          ),
        ),
        WidgetbookPageStateCard(
          label: 'empty event-grounded prompt',
          child: _ChatMessageListFrame(
            messages: const AsyncData<List<ChatMessage>>([]),
            event: widgetbookMatchesEvent,
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Primitive states',
  type: MessageBubble,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget messageBubblePrimitiveStates(BuildContext context) {
  final now = MatchesChatSurfaceFixtures.now;

  return WidgetbookMatchesAppRoleBoundary(
    role: AppRole.consumer,
    child: WidgetbookPageCatalogFrame(
      title: 'MessageBubble',
      contractId: 'primitive.messaging.message_bubble',
      children: [
        WidgetbookPageStateCard(
          label: 'self and other messages',
          child: _MessageBubblePrimitiveFrame(
            children: [
              MessageBubble(
                text: 'That final kilometer was harder than advertised.',
                isMe: false,
                sentAt: now.subtract(const Duration(minutes: 42)),
              ),
              MessageBubble(
                text: 'Worth it for the sea-facing coffee plan.',
                isMe: true,
                sentAt: now.subtract(const Duration(minutes: 40)),
              ),
            ],
          ),
        ),
        WidgetbookPageStateCard(
          label: 'long copy wraps with timestamp',
          child: _MessageBubblePrimitiveFrame(
            height: WidgetbookPreviewLayout.exploreMediaPreviewHeight,
            children: [
              MessageBubble(
                text: _longIncomingMessageCopy,
                isMe: false,
                sentAt: now.subtract(const Duration(minutes: 28)),
              ),
              MessageBubble(
                text: _longOutgoingMessageCopy,
                isMe: true,
                sentAt: now.subtract(const Duration(minutes: 24)),
              ),
            ],
          ),
        ),
        WidgetbookPageStateCard(
          label: 'grouped and sending',
          child: _MessageBubblePrimitiveFrame(
            children: [
              MessageBubble(
                text: 'Same route next week?',
                isMe: false,
                sentAt: now.subtract(const Duration(minutes: 12)),
                isFirstInGroup: true,
                isLastInGroup: false,
              ),
              MessageBubble(
                text: 'I can do Thursday.',
                isMe: false,
                sentAt: now.subtract(const Duration(minutes: 11)),
                isFirstInGroup: false,
              ),
              const MessageBubble(
                text: 'Checking the club calendar now.',
                isMe: true,
                sentAt: null,
              ),
            ],
          ),
        ),
        WidgetbookPageStateCard(
          label: 'image attachment',
          child: _MessageBubblePrimitiveFrame(
            height: WidgetbookPreviewLayout.sliverPreviewHeight,
            children: [
              MessageBubble(
                text: 'Route card from tonight.',
                imageUrl:
                    MatchesChatSurfaceFixtures.imageMessages.first.imageUrl,
                isMe: true,
                sentAt: now.subtract(const Duration(minutes: 12)),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Timestamped message text',
  type: CatchTimestampedMessageText,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget timestampedMessageTextState(BuildContext context) {
  final t = CatchTokens.of(context);

  return Padding(
    padding: CatchInsets.content,
    child: CatchTimestampedMessageText(
      text: 'That final kilometer was harder than advertised.',
      timestamp: '7:42 PM',
      textStyle: CatchTextStyles.bodyL(context, color: t.ink),
      timestampStyle: CatchTextStyles.meta(context, color: t.ink3),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Media message body',
  type: MediaMessageBody,
  path: '[P1 product surfaces]/Matches and chat/Primitives',
)
Widget mediaMessageBodyState(BuildContext context) {
  final t = CatchTokens.of(context);

  return Padding(
    padding: CatchInsets.content,
    child: MediaMessageBody(
      text: 'Route card from tonight.',
      timestamp: '8:04 PM',
      imageUrl: MatchesChatSurfaceFixtures.imageMessages.first.imageUrl,
      textStyle: CatchTextStyles.bodyL(context, color: t.ink),
      timestampStyle: CatchTextStyles.meta(context, color: t.ink3),
    ),
  );
}

class _ChatMessageListFrame extends StatefulWidget {
  const _ChatMessageListFrame({required this.messages, this.event});

  final AsyncValue<List<ChatMessage>> messages;
  final Event? event;

  @override
  State<_ChatMessageListFrame> createState() => _ChatMessageListFrameState();
}

class _ChatMessageListFrameState extends State<_ChatMessageListFrame> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WidgetbookMatchesDeviceFrame(
      height: WidgetbookPreviewLayout.feedbackViewportHeight,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: SafeArea(
              child: ChatMessageList(
                messagesAsync: widget.messages,
                currentUid: MatchesChatSurfaceFixtures.viewerUid,
                otherName: 'Taylor',
                event: widget.event,
                scrollController: _scrollController,
                onRetry: () {},
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MessageBubblePrimitiveFrame extends StatelessWidget {
  const _MessageBubblePrimitiveFrame({
    required this.children,
    this.height = 240,
  });

  final List<Widget> children;
  final double height;

  @override
  Widget build(BuildContext context) {
    return WidgetbookMatchesDeviceFrame(
      height: height,
      child: Builder(
        builder: (context) {
          final t = CatchTokens.of(context);
          return Scaffold(
            backgroundColor: t.bg,
            body: SafeArea(
              child: ListView(
                padding: CatchInsets.chatListGutter,
                children: children,
              ),
            ),
          );
        },
      ),
    );
  }
}

const _longIncomingMessageCopy =
    'I checked the event notes and the host moved the meetup point closer to the '
    'jetty, so we should still have enough time for coffee after.';

const _longOutgoingMessageCopy =
    'Perfect. I will book the next one once it goes live and send you the route '
    'card so we can compare the pace groups.';
