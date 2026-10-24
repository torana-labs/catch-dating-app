part of '../event_success_companion_screen.dart';

class PrivateAfterglowRecapCard extends StatelessWidget {
  const PrivateAfterglowRecapCard({
    super.key,
    required this.event,
    required this.openersEnabled,
    required this.feedbackEnabled,
    this.feedback,
  });

  final Event event;
  final bool openersEnabled;
  final bool feedbackEnabled;
  final EventSuccessFeedback? feedback;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final feedback = this.feedback;
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              StageSectionHeader(
                icon: CatchIcons.autoAwesomeRounded,
                label: context
                    .l10n
                    .eventSuccessEventSuccessCompanionAfterglowLabelPrivateAfterglow,
                color: t.primary,
              ),
              CatchPrivacyBadge(copy: catchPrivacyBadgeCopy(context.l10n)),
            ],
          ),
          gapH10,
          CatchText(
            context.l10n
                .eventSuccessEventSuccessCompanionAfterglowTextYourNightAtTitle(
                  title: event.title,
                ),
            variant: CatchTextVariant.titleL,
          ),
          gapH4,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionAfterglowTextASmallRecapFor,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH14,
          AfterglowBeatGrid._(
            beats: [
              _AfterglowBeat(
                icon: CatchIcons.eventAvailableOutlined,
                label: context
                    .l10n
                    .eventSuccessEventSuccessCompanionAfterglowLabelYouShowedUp,
                value: context.l10n
                    .eventSuccessEventSuccessCompanionAfterglowVisiblecopyLongdatelabelActivitysummarylabel(
                      longDateLabel: event.longDateLabel,
                      activitySummaryLabel: event.activitySummaryLabel,
                    ),
              ),
              _AfterglowBeat(
                icon: CatchIcons.forumOutlined,
                label: openersEnabled
                    ? context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowLabelOpenersReady
                    : context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowLabelMemorySaved,
                value: openersEnabled
                    ? context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowVisiblecopyUseTheSharedEvent
                    : context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowVisiblecopyKeepTheUsefulParts,
              ),
              _AfterglowBeat(
                icon: CatchIcons.favoriteBorderRounded,
                label: feedback == null
                    ? context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowLabelYourRead
                    : context
                          .l10n
                          .eventSuccessEventSuccessCompanionAfterglowLabelYourReadSaved,
                value: feedback == null
                    ? feedbackEnabled
                          ? context
                                .l10n
                                .eventSuccessEventSuccessCompanionAfterglowVisiblecopyLeaveAQuickNote
                          : context
                                .l10n
                                .eventSuccessEventSuccessCompanionAfterglowVisiblecopyCatchKeepsThisRecap
                    : context.l10n
                          .eventSuccessEventSuccessCompanionAfterglowVisiblecopyMetnewpeoplecountPeopleRememberedWelcome(
                            metNewPeopleCount: feedback.metNewPeopleCount,
                            welcomeRating: feedback.welcomeRating,
                          ),
                // Counter animates the first number ("X people remembered")
                // up to its final value to give the recap a Wrapped-style
                // landing beat. Skipped when no feedback exists.
                countValue: feedback?.metNewPeopleCount,
              ),
            ],
          ),
          gapH14,
          CompanionStageBanner(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  CatchIcons.lockOutlineRounded,
                  size: CatchIcon.md,
                  color: t.primary,
                ),
                gapW8,
                Expanded(
                  child: CatchText(
                    context
                        .l10n
                        .eventSuccessEventSuccessCompanionAfterglowTextOnlyYouSeeThis,
                    variant: CatchTextVariant.supporting,
                    color: t.ink,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AfterglowBeat {
  const _AfterglowBeat({
    required this.icon,
    required this.label,
    required this.value,
    this.countValue,
  });

  final IconData icon;
  final String label;
  final String value;

  /// When non-null, the first run of digits in `value` is replaced by a
  /// counter that animates from 0 → countValue. Keeps the surrounding copy
  /// intact (e.g. "3 people remembered" counts the "3" up while the rest of
  /// the sentence stays put).
  final int? countValue;
}

/// Beats land in sequence, 1.4s apart, each sliding up from below with a
/// fade. Counter values animate from 0 to their final number over 600ms once
/// the row has finished entering. Gives the afterglow recap a Spotify-Wrapped
/// style paced reveal instead of dumping all three rows at once.
class AfterglowBeatGrid extends StatefulWidget {
  const AfterglowBeatGrid._({required this._beats});

  final List<_AfterglowBeat> _beats;

  @override
  State<AfterglowBeatGrid> createState() => _AfterglowBeatGridState();
}

class _AfterglowBeatGridState extends State<AfterglowBeatGrid> {
  @override
  Widget build(BuildContext context) {
    final beats = widget._beats;
    return Column(
      children: [
        for (var index = 0; index < beats.length; index++) ...[
          if (index > 0) gapH8,
          AfterglowBeatRow._(
            beat: beats[index],
            // Stagger entry by 1.4s per beat. Tests skip the animation gate
            // so the rows just render in their final state.
            entryDelay: _kStageAnimationsEnabled
                ? CatchMotion.afterglowBeatDelay(index)
                : CatchMotion.none,
          ),
        ],
      ],
    );
  }
}

class AfterglowBeatRow extends StatefulWidget {
  const AfterglowBeatRow._({required this._beat, required this._entryDelay});

  final _AfterglowBeat _beat;
  final Duration _entryDelay;

  @override
  State<AfterglowBeatRow> createState() => _AfterglowBeatRowState();
}

class _AfterglowBeatRowState extends State<AfterglowBeatRow>
    with TickerProviderStateMixin {
  late final AnimationController _entry = AnimationController(
    duration: CatchMotion.afterglowBeatEntry,
    vsync: this,
  );
  late final AnimationController _count = AnimationController(
    duration: CatchMotion.afterglowCountUp,
    vsync: this,
  );

  @override
  void initState() {
    super.initState();
    if (!_kStageAnimationsEnabled) {
      _entry.value = 1;
      _count.value = 1;
      return;
    }
    // Delay the entry, then once entry completes run the count-up.
    Future<void>.delayed(widget._entryDelay).then((_) async {
      if (!mounted) return;
      await _entry.forward();
      if (!mounted) return;
      if (widget._beat.countValue != null) {
        await _count.forward();
      } else {
        _count.value = 1;
      }
    });
  }

  @override
  void dispose() {
    _entry.dispose();
    _count.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final beat = widget._beat;
    return AnimatedBuilder(
      animation: Listenable.merge([_entry, _count]),
      builder: (context, _) {
        final entry = CatchMotion.easeOutCubicCurve.transform(_entry.value);
        final slide = (1 - entry) * CatchLayout.afterglowBeatSlideOffset;
        return Opacity(
          opacity: entry,
          child: Transform.translate(
            offset: Offset(0, slide),
            child: CatchSurface(
              backgroundColor: t.surface,
              borderRole: CatchBorderRole.separator,
              radius: CatchRadius.sm,
              padding: CatchInsets.contentDense,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(beat.icon, size: CatchIcon.control, color: t.primary),
                  gapW10,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          beat.label,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        gapH2,
                        CatchText(
                          _animatedValueString(beat),
                          variant: CatchTextVariant.supporting,
                          color: t.ink2,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Replaces the first run of digits in `beat.value` with an animated
  /// counter when `countValue` is set. Lets "${count} people remembered..."
  /// animate the "3" without touching the surrounding copy.
  String _animatedValueString(_AfterglowBeat beat) {
    final target = beat.countValue;
    if (target == null) return beat.value;
    final eased = CatchMotion.easeOutCubicCurve.transform(_count.value);
    final live = (target * eased).round();
    final pattern = RegExp(
      context.l10n.eventSuccessEventSuccessCompanionAfterglowVisiblecopyD,
    );
    final match = pattern.firstMatch(beat.value);
    if (match == null) return beat.value;
    return beat.value.replaceRange(match.start, match.end, live.toString());
  }
}
