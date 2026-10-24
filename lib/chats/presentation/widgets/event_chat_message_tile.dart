import 'package:catch_dating_app/chats/domain/event_chat.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventChatMessageTile extends StatelessWidget {
  const EventChatMessageTile({
    super.key,
    required this.message,
    required this.isMe,
    required this.enabled,
    this.safetyEnabled = false,
    required this.onReply,
    required this.onReact,
    required this.onReaction,
    this.onViewProfile,
    this.onReport,
    this.onBlock,
    this.onRemove,
  });
  final EventChatMessage message;
  final bool isMe, enabled;
  final bool safetyEnabled;
  final VoidCallback onReply, onReact;
  final VoidCallback? onViewProfile, onReport, onBlock, onRemove;
  final ValueChanged<EventChatReaction?> onReaction;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final l = context.l10n;
    final ink = isMe ? t.primaryInk : t.ink;
    return Align(
      alignment: isMe
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: CatchFractionalViewport(
        fraction: CatchLayout.chatBubbleMaxWidthFraction,
        maxWidth: CatchLayout.chatBubbleMaxWidth,
        alignment: isMe
            ? AlignmentDirectional.centerEnd
            : AlignmentDirectional.centerStart,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (message.available && message.kind == 'announcement')
              CatchText(
                l.eventChatAnnouncement,
                variant: CatchTextVariant.supporting,
              ),
            if (message.available)
              Row(
                children: [
                  Expanded(
                    child: onViewProfile == null
                        ? CatchText(
                            isMe ? l.eventChatYou : message.senderName ?? '',
                            variant: CatchTextVariant.supporting,
                          )
                        : Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: Tooltip(
                              message: l.eventProfileView,
                              child: CatchButton.text(
                                label: isMe
                                    ? l.eventChatYou
                                    : message.senderName ?? '',
                                minimumSize: const Size(0, CatchSpacing.s12),
                                padding: EdgeInsets.zero,
                                textStyle: CatchTextStyles.supporting(context),
                                onPressed: enabled || safetyEnabled
                                    ? onViewProfile
                                    : null,
                              ),
                            ),
                          ),
                  ),
                  CatchActionMenu<String>(
                    variant: CatchIconActionVariant.plain,
                    tooltip: l.eventChatMessageActions,
                    enabled: enabled || safetyEnabled,
                    items: [
                      if (enabled) ...[
                        CatchActionMenuItem(
                          value: 'reply',
                          label: l.eventChatReply,
                        ),
                        CatchActionMenuItem(
                          value: 'react',
                          label: l.eventChatReact,
                        ),
                      ],
                      if (onReport != null)
                        CatchActionMenuItem(
                          value: 'report',
                          label: l.eventChatReport,
                        ),
                      if (onBlock != null)
                        CatchActionMenuItem(
                          value: 'block',
                          label: l.eventChatBlock,
                        ),
                      if (onRemove != null)
                        CatchActionMenuItem(
                          value: 'remove',
                          label: l.eventChatRemove,
                        ),
                    ],
                    onSelected: (action) => switch (action) {
                      'reply' => onReply(),
                      'react' => onReact(),
                      'report' => onReport?.call(),
                      'block' => onBlock?.call(),
                      'remove' => onRemove?.call(),
                      _ => null,
                    },
                  ),
                ],
              ),
            CatchSurface(
              padding: CatchInsets.chatBubbleContent,
              backgroundColor: isMe ? t.primary : t.surface,
              borderRole: isMe ? null : CatchBorderRole.separator,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (message.reply case final reply?) ...[
                    CatchText(
                      reply.available
                          ? reply.senderName ?? ''
                          : l.eventChatUnavailable,
                      variant: CatchTextVariant.supporting,
                      color: ink,
                    ),
                    gapH4,
                    CatchText(
                      reply.available
                          ? reply.text ?? ''
                          : l.eventChatUnavailable,
                      maxLines: 3,

                      variant: CatchTextVariant.bodyM,
                      color: ink,
                    ),
                    gapH12,
                  ],
                  CatchTimestampedMessageText(
                    text: message.available
                        ? message.text ?? ''
                        : l.eventChatUnavailable,
                    timestamp: AppTimeFormatters.time(message.sentAt.toLocal()),
                    textStyle: CatchTextStyles.bodyL(context, color: ink),
                    timestampStyle: CatchTextStyles.supporting(
                      context,
                      color: ink,
                    ),
                  ),
                ],
              ),
            ),
            if (message.available &&
                message.reactionCounts.values.any((n) => n > 0)) ...[
              gapH4,
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s1,
                children: [
                  for (final reaction in EventChatReaction.values)
                    if ((message.reactionCounts[reaction] ?? 0) > 0)
                      CatchButton.selection(
                        label:
                            '${reaction.emoji} ${message.reactionCounts[reaction]}',
                        semanticsLabel: eventChatReactionLabel(
                          context,
                          reaction,
                        ),
                        backgroundColor: message.myReaction == reaction
                            ? t.primarySoft
                            : null,
                        onPressed: enabled
                            ? () => onReaction(
                                message.myReaction == reaction
                                    ? null
                                    : reaction,
                              )
                            : null,
                      ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String eventChatReactionLabel(
  BuildContext context,
  EventChatReaction reaction,
) => switch (reaction) {
  EventChatReaction.like => context.l10n.eventChatReactionLike,
  EventChatReaction.love => context.l10n.eventChatReactionLove,
  EventChatReaction.laugh => context.l10n.eventChatReactionLaugh,
  EventChatReaction.wow => context.l10n.eventChatReactionWow,
  EventChatReaction.sad => context.l10n.eventChatReactionSad,
  EventChatReaction.thanks => context.l10n.eventChatReactionThanks,
};

class EventChatReactionSection extends StatelessWidget {
  const EventChatReactionSection({
    super.key,
    required this.onSelected,
    required this.onClose,
    required this.selected,
  });
  final ValueChanged<EventChatReaction?> onSelected;
  final VoidCallback onClose;
  final EventChatReaction? selected;
  @override
  Widget build(BuildContext context) => Padding(
    padding: CatchInsets.content,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: CatchText(
                context.l10n.eventChatReactionsTitle,
                variant: CatchTextVariant.bodyL,
                color: CatchTokens.of(context).ink,
              ),
            ),
            CatchIconAction(
              tooltip: context.l10n.eventChatCloseReactions,
              onPressed: onClose,
              child: Icon(CatchIcons.closeRounded),
            ),
          ],
        ),
        gapH8,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            for (final reaction in EventChatReaction.values)
              CatchButton.selection(
                label: reaction.emoji,
                semanticsLabel: eventChatReactionLabel(context, reaction),
                backgroundColor: selected == reaction
                    ? CatchTokens.of(context).primarySoft
                    : null,
                onPressed: () =>
                    onSelected(selected == reaction ? null : reaction),
              ),
          ],
        ),
      ],
    ),
  );
}
