part of '../event_success_companion_screen.dart';

class CompanionArrivalProgressIndicator extends StatefulWidget {
  const CompanionArrivalProgressIndicator._({
    required this.checkedInCount,
    required this._stageTheme,
    required this.idlePulsePeriodMs,
  });

  final int checkedInCount;
  final _CompanionStageTheme _stageTheme;
  final int idlePulsePeriodMs;

  @override
  State<CompanionArrivalProgressIndicator> createState() =>
      _CompanionArrivalProgressIndicatorState();
}

class CompanionArrivalSection extends StatelessWidget {
  const CompanionArrivalSection._({
    required this.checkedInCount,
    required this._stageTheme,
    required this.motion,
  });

  final int checkedInCount;
  final _CompanionStageTheme _stageTheme;
  final Animation<double> motion;

  @override
  Widget build(BuildContext context) {
    final fg = _stageTheme.foreground;
    final hasArrivals = checkedInCount > 0;
    final caption = hasArrivals
        ? (checkedInCount == 1
              ? context
                    .l10n
                    .eventSuccessEventSuccessCompanionSharedVisiblecopyPersonHereSoFar
              : context
                    .l10n
                    .eventSuccessEventSuccessCompanionSharedVisiblecopyPeopleHereSoFar)
        : context
              .l10n
              .eventSuccessEventSuccessCompanionSharedVisiblecopyWaitingForTheRoom;
    return SizedBox(
      width: CatchLayout.eventSuccessArrivalRingExtent,
      height: CatchLayout.eventSuccessArrivalRingExtent,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: ColorFiltered(
              colorFilter: ColorFilter.mode(
                _stageTheme.accent.withValues(
                  alpha: CatchOpacity.eventSuccessArrivalAccent,
                ),
                BlendMode.srcIn,
              ),
              child: Lottie.asset(
                EventSuccessMotionAsset.theatrical.path,
                controller: motion,
                fit: BoxFit.contain,
                repeat: false,
              ),
            ),
          ),
          ...List<Widget>.generate(24, (index) {
            final angle = (math.pi * 2 / 24) * index - math.pi / 2;
            final filled = index < math.min(checkedInCount, 24);
            final highlight = filled && index % 6 == 0;
            final color = highlight
                ? _stageTheme.accent.withValues(
                    alpha: CatchOpacity.eventSuccessArrivalHighlight,
                  )
                : fg.withValues(
                    alpha: filled
                        ? CatchOpacity.eventSuccessArrivalAccent
                        : CatchOpacity.eventSuccessSubtleBorder,
                  );
            return Positioned.fill(
              child: Align(
                alignment: Alignment(
                  math.cos(angle) * 0.84,
                  math.sin(angle) * 0.84,
                ),
                child: ClipOval(
                  child: ColoredBox(
                    color: color,
                    child: SizedBox.square(dimension: filled ? 7 : 4),
                  ),
                ),
              ),
            );
          }),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: CatchLayout.eventSuccessArrivalRingInnerPadding,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    context.l10n
                        .eventSuccessEventSuccessCompanionSharedTextCheckedincount(
                          checkedInCount: checkedInCount,
                        ),
                    style: CatchTextStyles.headlineS(context, color: fg)
                        .copyWith(
                          height: 1.0,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                  gapH2,
                  CatchText(
                    caption,
                    textAlign: TextAlign.center,
                    variant: CatchTextVariant.statusLabel,
                    color: fg.withValues(
                      alpha: CatchOpacity.eventSuccessArrivalCaption,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact co-presence indicator. Tells the attendee they're not in here
/// alone, with a brief alpha-pulse the moment the count climbs. Used on
/// solo-feeling surfaces (questionnaire, eventually First Hello / wingman).

class CompanionOthersInRoomText extends StatefulWidget {
  const CompanionOthersInRoomText({super.key, required this.checkedInCount});

  final int checkedInCount;

  @override
  State<CompanionOthersInRoomText> createState() =>
      _CompanionOthersInRoomTextState();
}

class CompanionActionsEmptyState extends StatelessWidget {
  const CompanionActionsEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CompanionStageSurface(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(CatchIcons.eventOutlined, color: t.primary),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  context
                      .l10n
                      .eventSuccessEventSuccessCompanionSharedTextTheHostIsRunning,
                  variant: CatchTextVariant.sectionTitle,
                ),
                gapH4,
                CatchText(
                  context
                      .l10n
                      .eventSuccessEventSuccessCompanionSharedTextYourNextPromptOr,
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
