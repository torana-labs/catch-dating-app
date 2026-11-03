part of 'event_success_conversation_cue_card.dart';

class ConversationCueRow extends StatelessWidget {
  const ConversationCueRow({super.key, required this.cue});

  final EventSuccessConversationCue cue;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: _conversationCueRowGap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: _conversationCueIconInset,
            child: Icon(
              CatchIcons.forward,
              size: CatchIconSize.xs,
              color: t.ink3,
            ),
          ),
          const SizedBox(width: CatchSpacing.s2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s1,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    CatchLegacyText(
                      cue.title,
                      variant: CatchLegacyTextVariant.sectionTitle,
                    ),
                    CatchBadge(label: cue.contextLabel),
                  ],
                ),
                const SizedBox(height: CatchSpacing.s1),
                CatchLegacyText(
                  cue.body,
                  variant: CatchLegacyTextVariant.supporting,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
