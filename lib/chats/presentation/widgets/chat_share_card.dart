import 'dart:math' as math;

import 'package:catch_dating_app/chats/domain/chat_message.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_copy.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<void> showChatShareCardSheet(
  BuildContext context, {
  required List<ChatMessage> messages,
  required String currentUid,
  required Event? event,
  required ExternalShareController share,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (_) => CatchExternalShareSheet(
      media: ChatShareCard(
        messages: messages,
        currentUid: currentUid,
        event: event,
      ),
      share: share,
      fileName: context.l10n.chatsChatShareCardVisiblecopyCatchChatCardPng,
      buttonLabel: context.l10n.chatsChatShareCardVisiblecopyShareCard,
      footnote:
          context.l10n.chatsChatShareCardVisiblecopyNamesPhotosAndTimestamps,
      subject: context.l10n.chatsChatShareCardVisiblecopyCatchChatCard,
      text: context.l10n.chatsChatShareCardTextSharedFromCatch,
      // ignore: avoid_redundant_argument_values
      maxWidth: CatchLayout.chatShareCardWidth,
      // ignore: avoid_redundant_argument_values
      pixelRatio: CatchLayout.chatShareCardPixelRatio,
    ),
  );
}

bool hasShareableChatMessages(List<ChatMessage> messages) {
  return messages.any((message) => _shareableText(message).isNotEmpty);
}

// Public for Widgetbook.
class ChatShareCard extends StatelessWidget {
  const ChatShareCard({
    super.key,
    required this.messages,
    required this.currentUid,
    required this.event,
  });

  final List<ChatMessage> messages;
  final String currentUid;
  final Event? event;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = event == null
        ? null
        : eventActivityVisual(event!.activityKind, context: context);
    final accent = visual?.accent ?? t.primary;
    final cardMessages = _visibleShareMessages(messages);

    return AspectRatio(
      aspectRatio: CatchLayout.chatShareCardAspectRatio,
      child: CatchSurface(
        backgroundColor: t.bg,
        borderRole: CatchBorderRole.boundary,
        padding: CatchInsets.contentRelaxed,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShareCardHeader(event: event, accent: accent, visual: visual),
            gapH16,
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  for (var i = 0; i < cardMessages.length; i++)
                    ShareCardBubble(
                      text: cardMessages[i].text,
                      isMe: cardMessages[i].senderId == currentUid,
                      isFirstInGroup:
                          i == 0 ||
                          cardMessages[i - 1].senderId !=
                              cardMessages[i].senderId,
                      isLastInGroup:
                          i == cardMessages.length - 1 ||
                          cardMessages[i + 1].senderId !=
                              cardMessages[i].senderId,
                    ),
                ],
              ),
            ),
            gapH14,
            CatchAttributionRow(
              brandLabel: context.l10n.coreCatchShareCardFooterTextCatch,
              trailing: chatContextStampFor(event),
              trailingColor: accent,
            ),
          ],
        ),
      ),
    );
  }
}

class ShareCardHeader extends StatelessWidget {
  const ShareCardHeader({
    super.key,
    required this.event,
    required this.accent,
    required this.visual,
  });

  final Event? event;
  final Color accent;
  final EventActivityVisualSpec? visual;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Row(
      children: [
        CatchIconTile(
          icon: visual?.icon ?? CatchIcons.chatBubbleOutlineRounded,
          iconColor: accent,
          backgroundColor: t.surface,
          borderColor: accent.withValues(alpha: CatchOpacity.subtleBorder),
          size: CatchLayout.chatShareCardHeaderIconExtent,
          iconSize: CatchIcon.md,
          radius: CatchRadius.pill,
        ),
        gapW10,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                chatContextStampFor(event),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: CatchTextStyles.statusLabel(
                  context,
                  color: accent,
                ).copyWith(fontWeight: FontWeight.w800),
              ),
              gapH3,
              CatchText(
                chatShareCardTitleFor(event),
                maxLines: 1,

                variant: CatchTextVariant.titleL,
                color: t.ink,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ShareCardBubble extends StatelessWidget {
  const ShareCardBubble({
    super.key,
    required this.text,
    required this.isMe,
    required this.isFirstInGroup,
    required this.isLastInGroup,
  });

  final String text;
  final bool isMe;
  final bool isFirstInGroup;
  final bool isLastInGroup;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Padding(
      padding: isLastInGroup
          ? CatchInsets.chatBubbleGroupEnd
          : CatchInsets.chatBubbleGroupContinue,
      child: Align(
        alignment: isMe
            ? AlignmentDirectional.centerEnd
            : AlignmentDirectional.centerStart,
        child: CatchFractionalViewport(
          fraction: CatchLayout.chatBubbleMaxWidthFraction,
          maxWidth: CatchLayout.chatBubbleMaxWidth,
          alignment: isMe
              ? AlignmentDirectional.centerEnd
              : AlignmentDirectional.centerStart,
          child: CatchSurface(
            backgroundColor: isMe ? t.primary : t.surface,
            borderRole: isMe ? null : CatchBorderRole.separator,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(
                isMe || isFirstInGroup ? CatchRadius.lg : CatchRadius.sm,
              ),
              topRight: Radius.circular(
                !isMe || isFirstInGroup ? CatchRadius.lg : CatchRadius.sm,
              ),
              bottomLeft: Radius.circular(
                isMe || !isLastInGroup ? CatchRadius.lg : CatchRadius.sm,
              ),
              bottomRight: Radius.circular(
                isMe && isLastInGroup ? CatchRadius.sm : CatchRadius.lg,
              ),
            ),
            padding: CatchInsets.chatBubbleContent,
            child: CatchText(
              text,
              variant: CatchTextVariant.bodyL,
              color: isMe ? t.primaryInk : t.ink,
              maxLines: 3,
            ),
          ),
        ),
      ),
    );
  }
}

List<ChatMessage> _visibleShareMessages(List<ChatMessage> messages) {
  final textMessages = messages
      .where((message) => _shareableText(message).isNotEmpty)
      .map(
        (message) => ChatMessage(
          id: message.id,
          senderId: message.senderId,
          text: _shareableText(message),
        ),
      )
      .toList();
  final start = math.max(
    0,
    textMessages.length - CatchLayout.chatShareCardMaxMessages,
  );
  return textMessages.sublist(start);
}

String _shareableText(ChatMessage message) => message.text.trim();
