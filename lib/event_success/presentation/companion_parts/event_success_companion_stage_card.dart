part of '../event_success_companion_screen.dart';

// The live step's prompt, conversation cue and cue cards, with the skip
// every prompt offers and the section header above them.

class StagePromptCard extends StatefulWidget {
  const StagePromptCard({super.key, required this.prompt, this.title});

  final String prompt;
  final String? title;

  @override
  State<StagePromptCard> createState() => _StagePromptCardState();
}

class _StagePromptCardState extends State<StagePromptCard> {
  bool _skipped = false;

  @override
  void didUpdateWidget(covariant StagePromptCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new prompt (the next step) is offered again.
    if (oldWidget.prompt != widget.prompt) _skipped = false;
  }

  @override
  Widget build(BuildContext context) {
    if (_skipped) return const SizedBox.shrink();
    final t = CatchTokens.of(context);
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.chatBubbleOutlineRounded,
            label: widget.title ?? context.l10n.eventSuccessSocialMissionTitle,
            color: t.primary,
          ),
          gapH12,
          CatchLegacyText(
            widget.prompt,
            variant: CatchLegacyTextVariant.titleL,
          ),
          gapH12,
          CompanionPromptSkipRow(onSkip: () => setState(() => _skipped = true)),
        ],
      ),
    );
  }
}

/// Every prompt can be skipped. Skipping records nothing: it only puts the
/// prompt away for this step.
class CompanionPromptSkipRow extends StatelessWidget {
  const CompanionPromptSkipRow({super.key, required this.onSkip});

  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      children: [
        CatchButton(
          key: const ValueKey('companionPromptSkip'),
          label: context.l10n.eventSuccessCompanionPromptSkip,
          variant: CatchButtonVariant.quiet,
          onPressed: onSkip,
        ),
        gapW8,
        Expanded(
          child: CatchLegacyText(
            context.l10n.eventSuccessCompanionPromptSkipNote,
            variant: CatchLegacyTextVariant.supporting,
            color: t.ink2,
          ),
        ),
      ],
    );
  }
}

class StageConversationCueCard extends StatefulWidget {
  const StageConversationCueCard({
    super.key,
    required this.title,
    required this.cues,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<EventSuccessConversationCue> cues;

  @override
  State<StageConversationCueCard> createState() =>
      _StageConversationCueCardState();
}

class _StageConversationCueCardState extends State<StageConversationCueCard> {
  bool _skipped = false;

  @override
  void didUpdateWidget(covariant StageConversationCueCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.title != widget.title ||
        oldWidget.cues.firstOrNull?.moment != widget.cues.firstOrNull?.moment) {
      _skipped = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cues = widget.cues;
    final title = widget.title;
    final subtitle = widget.subtitle;
    if (cues.isEmpty || _skipped) return const SizedBox.shrink();

    final t = CatchTokens.of(context);
    final moment = cues.first.moment;
    final icon = switch (moment) {
      EventSuccessConversationCueMoment.live => CatchIcons.forumOutlined,
      EventSuccessConversationCueMoment.postEvent => CatchIcons.chatOutlined,
    };
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(icon: icon, label: title, color: t.primary),
          if (subtitle != null) ...[
            gapH8,
            CatchLegacyText(
              subtitle,
              variant: CatchLegacyTextVariant.supporting,
              color: t.ink2,
            ),
          ],
          gapH14,
          for (final cue in cues.take(3)) StageCueCard(cue: cue),
          gapH4,
          CompanionPromptSkipRow(onSkip: () => setState(() => _skipped = true)),
        ],
      ),
    );
  }
}

class StageCueCard extends StatelessWidget {
  const StageCueCard({super.key, required this.cue});

  final EventSuccessConversationCue cue;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: _companionStageCueGap,
      child: CatchLegacySurface(
        backgroundColor: t.primarySoft,
        radius: CatchRadius.sm,
        padding: CatchInsets.contentDense,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: CatchLegacyText(
                    cue.title,
                    variant: CatchLegacyTextVariant.sectionTitle,
                  ),
                ),
                Tooltip(
                  message:
                      cue.moment == EventSuccessConversationCueMoment.postEvent
                      ? context
                            .l10n
                            .eventSuccessEventSuccessCompanionLiveCardsMessageCopyOpener
                      : context
                            .l10n
                            .eventSuccessEventSuccessCompanionLiveCardsMessageCopyCue,
                  child: CatchIconAction(
                    onPressed: () => _copyCue(context, cue),
                    child: Icon(
                      CatchIcons.contentCopyRounded,
                      size: CatchIconSize.md,
                      color: t.primary,
                    ),
                  ),
                ),
              ],
            ),
            gapH4,
            CatchLegacyText(
              cue.body,
              variant: CatchLegacyTextVariant.supporting,
              color: t.ink2,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _copyCue(
    BuildContext context,
    EventSuccessConversationCue cue,
  ) async {
    await Clipboard.setData(ClipboardData(text: cue.body));
    if (!context.mounted) return;
    showCatchNotice(
      context,
      cue.moment == EventSuccessConversationCueMoment.postEvent
          ? context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyOpenerCopied
          : context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyCueCopied,
    );
  }
}

class StageSectionHeader extends StatelessWidget {
  const StageSectionHeader({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: CatchIconSize.md, color: color),
        gapW6,
        Expanded(
          child: CatchLegacyText(
            label,
            variant: CatchLegacyTextVariant.titleS,
            color: color,
            maxLines: 2,
          ),
        ),
      ],
    );
  }
}
