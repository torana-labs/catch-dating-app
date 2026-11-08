import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/parts/live_score_row.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Entering a round: the views, the round as a title, a stepper per team,
/// the standings if the host saves now (hidden from guests), Save and
/// Reveal to everyone, and what the reveal does on guests' phones.
class HostLiveScoresBody extends StatelessWidget {
  const HostLiveScoresBody({
    super.key,
    required this.state,
    required this.points,
    required this.onPoints,
    required this.onSave,
    required this.onReveal,
    required this.onView,
    required this.onRetry,
    this.saving = false,
    this.revealing = false,
  });

  final HostLiveScoresState state;

  /// The points entered for this round so far, by team id.
  final Map<String, int> points;
  final void Function(String unitId, int points) onPoints;
  final VoidCallback onSave;
  final VoidCallback onReveal;
  final ValueChanged<HostLiveView> onView;
  final VoidCallback onRetry;
  final bool saving;
  final bool revealing;

  /// The most points a team takes in one round.
  static const int maxPoints = 99;

  /// The preview shows the top three.
  static const int previewPlaces = 3;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    switch (state.status) {
      case HostLiveScoresStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostLiveScoresStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostLiveErrorTitle,
            message: l10n.hostLiveErrorBody,
            retryLabel: l10n.hostLiveRetry,
            onRetry: onRetry,
          ),
        );
      case HostLiveScoresStatus.ready:
        break;
    }
    final round = state.roundIndex + 1;
    final preview =
        [
          for (final unit in state.units)
            (unit: unit, total: unit.total + (points[unit.id] ?? 0)),
        ]..sort((a, b) {
          final byTotal = b.total.compareTo(a.total);
          return byTotal != 0 ? byTotal : a.unit.label.compareTo(b.unit.label);
        });
    final views = HostLiveViewTabBar(
      selected: HostLiveView.scores,
      scores: true,
      onView: onView,
    );
    if (state.units.isEmpty) {
      return CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.section,
          children: [
            views,
            CatchEmptyState(
              icon: CatchIcons.people,
              title: l10n.hostLiveScoresTitle,
              message: l10n.hostLiveScoresNone,
            ),
          ],
        ),
      );
    }
    final busy = saving || revealing;
    final reveal = state.revealRoundIndex;
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          views,
          CatchStack(
            gap: CatchStackGap.g4,
            children: [
              CatchText(
                l10n.hostLiveScoresKicker(round: round),
                variant: CatchTextVariant.labelKicker,
                tone: CatchTextTone.secondary,
              ),
              CatchText(
                l10n.hostLiveScoresEnter(round: round),
                variant: CatchTextVariant.displayTitle,
              ),
            ],
          ),
          CatchSection(
            children: [
              for (final unit in state.units)
                CatchIndexRow(
                  key: ValueKey<String>('host-live-scores-${unit.id}'),
                  title: unit.label,
                  subtitle: l10n.hostLiveScoresSoFar(
                    total: numbers.format(unit.total),
                  ),
                  onTap: null,
                  density: CatchIndexRowSize.compact,
                  trailing: CatchStepper(
                    value: points[unit.id] ?? 0,
                    min: 0,
                    max: maxPoints,
                    enabled: !busy,
                    decreaseSemanticLabel: l10n.hostLiveScoresFewer(
                      team: unit.label,
                    ),
                    increaseSemanticLabel: l10n.hostLiveScoresMore(
                      team: unit.label,
                    ),
                    onChanged: (value) => onPoints(unit.id, value.toInt()),
                  ),
                ),
            ],
          ),
          CatchSurface(
            child: CatchStack(
              children: [
                CatchText(
                  l10n.hostLiveScoresPreview,
                  variant: CatchTextVariant.titleRow,
                ),
                CatchSection(
                  children: [
                    for (final (index, row)
                        in preview.take(previewPlaces).indexed)
                      LiveScoreRow(
                        key: ValueKey<String>(
                          'host-live-scores-preview-${row.unit.id}',
                        ),
                        entry: EventSuccessStandingEntry(
                          unitId: row.unit.id,
                          unitLabel: row.unit.label,
                          position: index + 1,
                          value: row.total,
                          roundsRecorded: round,
                        ),
                      ),
                  ],
                ),
                CatchText(
                  l10n.hostLiveScoresPrivate,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
              ],
            ),
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchButton(
                label: l10n.hostLiveScoresSave(round: round),
                variant: CatchButtonVariant.secondary,
                fullWidth: true,
                status: saving
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: busy ? null : onSave,
              ),
              CatchButton(
                label: state.countingDown
                    ? l10n.hostLiveScoresCountingDown
                    : l10n.hostLiveScoresReveal,
                fullWidth: true,
                status: revealing
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: busy || reveal == null || state.countingDown
                    ? null
                    : onReveal,
              ),
            ],
          ),
          CatchText(
            state.countdownSeconds > 0
                ? l10n.hostLiveScoresRevealCountdown(
                    seconds: state.countdownSeconds,
                  )
                : l10n.hostLiveScoresRevealAtOnce,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
            align: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
