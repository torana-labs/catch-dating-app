import 'package:catch_dating_app/contexts/live/domain/event_success_conversation_cue.dart';
import 'package:catch_dating_app/pages/live_room/event_success_conversation_cue_copy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'event_success_conversation_cue_row.dart';

const EdgeInsets _conversationCueRowGap = EdgeInsets.only(
  bottom: CatchSpacing.s2,
);
const EdgeInsets _conversationCueIconInset = EdgeInsets.only(
  top: CatchSpacing.micro3,
);

class EventSuccessConversationCueCard extends StatelessWidget {
  const EventSuccessConversationCueCard({
    super.key,
    required this.title,
    required this.cues,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<EventSuccessConversationCue> cues;

  @override
  Widget build(BuildContext context) {
    if (cues.isEmpty) return const SizedBox.shrink();

    final t = CatchTokens.of(context);
    final moment = cues.first.moment;
    final icon = switch (moment) {
      EventSuccessConversationCueMoment.live => CatchIcons.conversations,
      EventSuccessConversationCueMoment.postEvent => CatchIcons.chat,
    };

    return CatchLegacySurface(
      tone: CatchSurfaceTone.raised,
      radius: CatchRadius.sm,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: t.primary),
              const SizedBox(width: CatchSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: CatchSpacing.s2,
                      runSpacing: CatchSpacing.s2,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        CatchLegacyText(
                          title,
                          variant: CatchLegacyTextVariant.sectionTitle,
                        ),
                        CatchBadge(
                          label: moment.label(context.l10n),
                          tone: moment == EventSuccessConversationCueMoment.live
                              ? CatchBadgeTone.brand
                              : CatchBadgeTone.brand,
                        ),
                      ],
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: CatchSpacing.s1),
                      CatchLegacyText(
                        subtitle!,
                        variant: CatchLegacyTextVariant.supporting,
                        color: t.ink2,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: CatchSpacing.s3),
          for (final cue in cues.take(3)) ConversationCueRow(cue: cue),
        ],
      ),
    );
  }
}
