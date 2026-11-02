import 'package:catch_dating_app/chats/presentation/chat_conversation_context.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_copy.dart';
import 'package:catch_dating_app/chats/presentation/widgets/message_bubble.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Public for Widgetbook.
class ChatMessageList extends StatelessWidget {
  const ChatMessageList({
    super.key,
    required this.messagesAsync,
    required this.currentUid,
    required this.otherName,
    required this.scrollController,
    this.event,
    this.conversationContext = ChatConversationContext.match,
    this.onRetry,
  });

  final AsyncValue<List<ChatMessage>> messagesAsync;
  final String? currentUid;
  final String otherName;
  final ScrollController scrollController;
  final Event? event;
  final ChatConversationContext conversationContext;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return CatchAsyncBoundary<List<ChatMessage>>(
      value: messagesAsync,
      onRetry: onRetry,
      loadingBuilder: (_) {
        final t = CatchTokens.of(context);
        const bubbleSpecs = [
          (isMe: false, widthFactor: 0.62),
          (isMe: false, widthFactor: 0.48),
          (isMe: true, widthFactor: 0.58),
          (isMe: true, widthFactor: 0.42),
          (isMe: false, widthFactor: 0.68),
        ];

        return ListView(
          controller: scrollController,
          padding: CatchInsets.listBodyDense,
          children: [
            Padding(
              padding: CatchInsets.chatDateMarker,
              child: Center(
                child: CatchSkeleton.text(
                  width: CatchLayout.skeletonTextShortWidth,
                ),
              ),
            ),
            for (final spec in bubbleSpecs)
              Padding(
                padding: CatchInsets.chatBubbleGroupEnd,
                child: Row(
                  mainAxisAlignment: spec.isMe
                      ? MainAxisAlignment.end
                      : MainAxisAlignment.start,
                  children: [
                    Flexible(
                      child: FractionallySizedBox(
                        alignment: spec.isMe
                            ? AlignmentDirectional.centerEnd
                            : AlignmentDirectional.centerStart,
                        widthFactor: spec.widthFactor,
                        child: CatchSkeleton.box(
                          height: CatchButtonTokens.largeHeight,
                          // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                          borderRadius: BorderRadius.only(
                            // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                            topLeft: Radius.circular(
                              spec.isMe ? CatchRadius.lg : CatchRadius.sm,
                            ),
                            // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                            topRight: Radius.circular(
                              spec.isMe ? CatchRadius.sm : CatchRadius.lg,
                            ),
                            // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                            bottomLeft: Radius.circular(
                              spec.isMe ? CatchRadius.lg : CatchRadius.sm,
                            ),
                            // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                            bottomRight: Radius.circular(
                              spec.isMe ? CatchRadius.sm : CatchRadius.lg,
                            ),
                          ),
                          borderColor: spec.isMe ? null : t.line,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
      errorBuilder: (_, e, _, onBoundaryRetry) => CatchErrorState(
        retryLabel: context.l10n.sharedActionTryAgain,
        title: context.l10n.chatsChatMessageListTitleMessagesUnavailable,
        message: context.l10n.chatsChatMessageListMessageUnableToLoadMessages,
        icon: CatchIcons.chat,
        onRetry: onBoundaryRetry,
      ),
      builder: (context, messages) {
        if (messages.isEmpty) {
          return Center(
            child: CatchEmptyState(
              icon: CatchIcons.chat,
              title: context.l10n.chatsChatMessageListTitleSayHi,
              message: chatEmptyThreadMessageFor(
                event: event,
                otherName: otherName,
                conversationContext: conversationContext,
              ),
            ),
          );
        }

        final entries = _buildEntries(messages);

        return ListView.builder(
          controller: scrollController,
          padding: CatchInsets.listBodyDense,
          itemCount: entries.length,
          itemBuilder: (context, i) {
            final entry = entries[i];
            final date = entry.date;
            if (date != null) {
              final t = CatchTokens.of(context);
              return Padding(
                padding: CatchInsets.chatDateMarker,
                child: Center(
                  child: Text(
                    AppTimeFormatters.weekdayDayMonth(date),
                    style: CatchTextStyles.badge(context, color: t.ink3),
                  ),
                ),
              );
            }

            final messageIndex = entry.messageIndex!;
            final msg = messages[messageIndex];
            final previous = messageIndex == 0
                ? null
                : messages[messageIndex - 1];
            final next = messageIndex == messages.length - 1
                ? null
                : messages[messageIndex + 1];
            final isFirstInGroup =
                previous?.senderId != msg.senderId ||
                !_sameMessageDay(previous?.sentAt, msg.sentAt);
            final isLastInGroup =
                next?.senderId != msg.senderId ||
                !_sameMessageDay(next?.sentAt, msg.sentAt);
            return MessageBubble(
              text: msg.text,
              isMe: msg.senderId == currentUid,
              sentAt: msg.sentAt,
              imageUrl: msg.imageUrl,
              isFirstInGroup: isFirstInGroup,
              isLastInGroup: isLastInGroup,
            );
          },
        );
      },
    );
  }
}

List<_ChatListEntry> _buildEntries(List<ChatMessage> messages) {
  final entries = <_ChatListEntry>[];
  for (var index = 0; index < messages.length; index++) {
    final message = messages[index];
    final sentAt = message.sentAt;
    final previous = index == 0 ? null : messages[index - 1];
    if (sentAt != null && !_sameMessageDay(previous?.sentAt, sentAt)) {
      entries.add(_ChatListEntry.date(sentAt));
    }
    entries.add(_ChatListEntry.message(index));
  }
  return entries;
}

bool _sameMessageDay(DateTime? a, DateTime? b) {
  if (a == null || b == null) return false;
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

class _ChatListEntry {
  const _ChatListEntry.message(this.messageIndex) : date = null;
  const _ChatListEntry.date(this.date) : messageIndex = null;

  final int? messageIndex;
  final DateTime? date;
}
