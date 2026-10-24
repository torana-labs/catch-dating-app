part of '../event_success_companion_screen.dart';

@immutable
class FirstHelloActionState {
  const FirstHelloActionState({
    this.startPending = false,
    this.completePending = false,
    this.skipPending = false,
  });

  final bool startPending;
  final bool completePending;
  final bool skipPending;
}

class FirstHelloCheckInCard extends StatefulWidget {
  const FirstHelloCheckInCard({
    super.key,
    required this.mission,
    required this.actionState,
    required this.onStart,
    required this.onComplete,
    required this.onSkip,
    this.onPlayCompleteEffect,
  });

  final EventSuccessArrivalMission? mission;
  final FirstHelloActionState actionState;
  final Future<void> Function()? onStart;
  final Future<void> Function(
    EventSuccessArrivalMission mission,
    String answerId,
  )?
  onComplete;
  final VoidCallback? onSkip;
  final Future<void> Function()? onPlayCompleteEffect;

  @override
  State<FirstHelloCheckInCard> createState() => _FirstHelloCheckInCardState();
}

class _FirstHelloCheckInCardState extends State<FirstHelloCheckInCard>
    with SingleTickerProviderStateMixin {
  String? _answerId;
  bool _starting = false;
  bool _saving = false;
  bool _celebrating = false;

  late final AnimationController _celebration;

  @override
  void initState() {
    super.initState();
    _celebration = AnimationController(
      duration: CatchMotion.arrivalCelebration,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _celebration.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final mission = widget.mission;
    final starting = widget.actionState.startPending || _starting;
    final saving = widget.actionState.completePending || _saving;
    final skipping = widget.actionState.skipPending;
    if (mission == null) {
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
                  icon: CatchIcons.wavingHandOutlined,
                  label: context
                      .l10n
                      .eventSuccessEventSuccessCompanionArrivalMissionLabelFirstHello,
                  color: t.primary,
                ),
                CatchPrivacyBadge(
                  copy: catchPrivacyBadgeCopy(context.l10n),
                  variant: CatchPrivacyBadgeVariant.catchPrivate,
                ),
              ],
            ),
            gapH12,
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessCompanionArrivalMissionTextStartYourFirstHello,
              variant: CatchTextVariant.titleL,
            ),
            gapH6,
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessCompanionArrivalMissionTextWeWillConfirmYou,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
            gapH14,
            CompanionStageBanner(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    CatchIcons.nearMeOutlined,
                    size: CatchIcon.md,
                    color: t.primary,
                  ),
                  gapW8,
                  Expanded(
                    child: CatchText(
                      context
                          .l10n
                          .eventSuccessEventSuccessCompanionArrivalMissionTextThisIsAPrivate,
                      variant: CatchTextVariant.sectionTitle,
                    ),
                  ),
                ],
              ),
            ),
            gapH14,
            CompanionStageActionSection(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchButton(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessCompanionArrivalMissionLabelStartFirstHello,
                    leading: Icon(CatchIcons.playArrowRounded),
                    status: (starting)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: starting || widget.onStart == null
                        ? null
                        : _start,
                    fullWidth: true,
                  ),
                  gapH8,
                  CatchButton(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessCompanionArrivalMissionLabelUseNormalCheckIn,
                    variant: CatchButtonVariant.ghost,
                    leading: Icon(CatchIcons.qrCode2Rounded),
                    status: (skipping)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: starting || skipping ? null : widget.onSkip,
                    fullWidth: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final selectedAnswerId = _answerId;
    return Stack(
      children: [
        CompanionStageSurface(
          child: FirstHelloMissionEditor(
            mission: mission,
            selectedAnswerId: selectedAnswerId,
            saving: saving,
            skipping: skipping,
            onAnswerSelected: (answerId) =>
                setState(() => _answerId = answerId),
            onComplete: widget.onComplete == null ? null : _complete,
            onSkip: widget.onSkip,
          ),
        ),
        if (_celebrating)
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: _celebration,
                builder: (context, _) {
                  final v = _celebration.value;
                  // Triangle wave: alpha rises 0→peak then falls back to 0.
                  final alpha =
                      (v < CatchOpacity.arrivalCelebrationLowMultiplier
                          ? v * 2
                          : (1 - v) * 2) *
                      CatchOpacity.arrivalCelebrationPeak;
                  return CatchSurface(
                    tone: CatchSurfaceTone.transparent,
                    radius: CatchRadius.sm,
                    padding: EdgeInsets.zero,
                    duration: Duration.zero,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        CatchEventSuccessColors.arrivalCelebrationWarm
                            .withValues(alpha: alpha),
                        CatchEventSuccessColors.arrivalCelebrationHot
                            .withValues(
                              alpha:
                                  alpha *
                                  CatchOpacity.arrivalCelebrationMidMultiplier,
                            ),
                        CatchEventSuccessColors.arrivalCelebrationGold
                            .withValues(
                              alpha:
                                  alpha *
                                  CatchOpacity.arrivalCelebrationLowMultiplier,
                            ),
                      ],
                    ),
                    child: const SizedBox.expand(),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _start() async {
    final onStart = widget.onStart;
    if (onStart == null) return;
    setState(() => _starting = true);
    try {
      await onStart();
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Future<void> _complete(String answerId) async {
    final mission = widget.mission;
    final onComplete = widget.onComplete;
    if (mission == null || onComplete == null) return;
    setState(() {
      _saving = true;
      _celebrating = true;
    });
    // Layer haptic + chime first so the user feels the celebration land
    // before the gradient sweep finishes.
    final playCompleteEffect = widget.onPlayCompleteEffect;
    if (playCompleteEffect != null) unawaited(playCompleteEffect());
    final celebrationFuture = _kStageAnimationsEnabled
        ? _celebration.forward(from: 0)
        : Future<void>.value();
    try {
      // Run the celebration animation in parallel with the network call.
      // Both must complete before we hand off to the next moment, otherwise
      // the gradient sweep snaps off mid-animation when the moment changes.
      await Future.wait([celebrationFuture, onComplete(mission, answerId)]);
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
          _celebrating = false;
        });
      }
    }
  }
}

/// The first-hello mission: answer choices plus complete and skip actions.
class FirstHelloMissionEditor extends StatelessWidget {
  const FirstHelloMissionEditor({
    super.key,
    required this.mission,
    required this.selectedAnswerId,
    required this.saving,
    required this.skipping,
    required this.onAnswerSelected,
    required this.onComplete,
    required this.onSkip,
  });

  final EventSuccessArrivalMission mission;
  final String? selectedAnswerId;
  final bool saving;
  final bool skipping;
  final ValueChanged<String> onAnswerSelected;
  final ValueChanged<String>? onComplete;
  final VoidCallback? onSkip;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StageSectionHeader(
              icon: CatchIcons.wavingHandOutlined,
              label: context
                  .l10n
                  .eventSuccessEventSuccessCompanionArrivalMissionLabelFirstHello,
              color: t.primary,
            ),
            CatchPrivacyBadge(
              copy: catchPrivacyBadgeCopy(context.l10n),
              variant: CatchPrivacyBadgeVariant.catchPrivate,
            ),
          ],
        ),
        gapH12,
        CatchText(
          context.l10n
              .eventSuccessEventSuccessCompanionArrivalMissionTextFindTargetdisplayname(
                targetDisplayName: mission.targetDisplayName,
              ),
          variant: CatchTextVariant.titleL,
        ),
        gapH6,
        CatchText(
          mission.targetContext,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
        gapH14,
        CompanionStageBanner(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                CatchIcons.questionAnswerOutlined,
                size: CatchIcon.md,
                color: t.primary,
              ),
              gapW8,
              Expanded(
                child: CatchText(
                  mission.question,
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
            ],
          ),
        ),
        gapH14,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            for (final option in mission.answerOptions)
              CompanionBouncyChip(
                label: option.label,
                active: selectedAnswerId == option.id,
                onTap: saving ? null : () => onAnswerSelected(option.id),
              ),
          ],
        ),
        gapH14,
        CatchText(
          context
              .l10n
              .eventSuccessEventSuccessCompanionArrivalMissionTextCompleteThisTinyMission,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
        gapH14,
        CompanionStageActionSection(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchButton(
                label: context
                    .l10n
                    .eventSuccessEventSuccessCompanionArrivalMissionLabelCompleteCheckIn,
                leading: Icon(CatchIcons.checkRounded),
                status: (saving)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed:
                    selectedAnswerId == null || saving || onComplete == null
                    ? null
                    : () => onComplete!(selectedAnswerId!),
                fullWidth: true,
              ),
              gapH8,
              CatchButton(
                label: context
                    .l10n
                    .eventSuccessEventSuccessCompanionArrivalMissionLabelCanTFindThem,
                variant: CatchButtonVariant.ghost,
                leading: Icon(CatchIcons.swapHorizRounded),
                status: (skipping)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: saving || skipping ? null : onSkip,
                fullWidth: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
