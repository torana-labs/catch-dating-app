import 'package:catch_dating_app/chats/presentation/chat_conversation_context.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_copy.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const EdgeInsets _contextHeaderOuterPadding = EdgeInsets.fromLTRB(
  CatchSpacing.s3,
  CatchSpacing.s2,
  CatchSpacing.s3,
  0,
);

class ChatEventContextHeader extends StatelessWidget {
  const ChatEventContextHeader({
    super.key,
    required this.event,
    this.conversationContext = ChatConversationContext.match,
  });

  final Event? event;
  final ChatConversationContext conversationContext;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final event = this.event;
    final visual = event == null
        ? null
        : eventActivityVisual(event.activityKind, context: context);
    final accent = visual?.accent ?? t.primary;
    final title =
        event?.title ??
        context.l10n.chatsChatEventContextHeaderTitleTheSameEvent;
    final date = event == null
        ? null
        : AppTimeFormatters.weekdayDayMonth(event.startTime);
    final stamp = chatContextStampFor(
      event,
      conversationContext: conversationContext,
    );

    return Padding(
      padding: _contextHeaderOuterPadding,
      child: CatchSurface(
        radius: CatchRadius.md,
        backgroundColor: visual?.soft ?? t.primarySoft,
        borderSpec: CatchBorder.resolve(
          t,
          CatchBorderRole.boundary,
          color: accent.withValues(alpha: CatchOpacity.subtleBorder),
        ),
        padding: CatchInsets.chatEventContextContent,
        child: Row(
          children: [
            CatchIconTile(
              icon: visual?.icon ?? CatchIcons.chatBubbleOutlineRounded,
              iconColor: accent,
              backgroundColor: t.surface,
              borderColor: accent.withValues(alpha: CatchOpacity.subtleBorder),
              size: 36,
              radius: CatchRadius.pill,
            ),
            gapW10,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stamp,
                    style: CatchTextStyles.badge(
                      context,
                      color: accent,
                    ).copyWith(fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                  gapH2,
                  CatchText(
                    date == null
                        ? title
                        : context.l10n.chatsChatEventContextHeaderTextTitleDate(
                            title: title,
                            date: date,
                          ),
                    variant: CatchTextVariant.supportingStrong,
                    color: t.ink,
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
