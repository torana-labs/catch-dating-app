import 'package:catch_dating_app/contexts/live/parts/formats_court_row.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_person_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_clock.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_pods_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Pace pods in board order: what pods are made from, the counts, a tile
/// per pod with its pace and runners, the runners who need a pod (each
/// with the pod to put them in), and the grouping rules.
///
/// Not drawn, because nothing backs them: Send pods to runners and Shuffle
/// (a runner sees their pod as soon as they are placed, and nothing
/// re-forms pods), a pod leader, and "Spread first-timers across pods".
class HostFormatsPodsBody extends StatelessWidget {
  const HostFormatsPodsBody({
    super.key,
    required this.state,
    required this.onPlace,
    required this.onRules,
    required this.onRetry,
    this.placing = const <String>{},
  });

  final HostFormatsPodsState state;

  /// Puts a runner in a pod.
  final void Function(HostFormatsUnplaced runner, HostFormatsPod pod) onPlace;
  final VoidCallback onRules;
  final VoidCallback onRetry;

  /// Runners whose move is on its way, by attendee.
  final Set<String> placing;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsPodsStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsPodsStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsPodsStatus.noPods:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.route,
            title: l10n.hostFormatsPodsNoneTitle,
            message: l10n.hostFormatsPodsNoneBody,
          ),
        );
      case HostFormatsPodsStatus.ready:
        break;
    }
    final target = state.smallest;
    return CatchPageBody.screen(
      children: [
        CatchText(l10n.hostFormatsPodsIntro),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatRunners,
              value: '${state.runners}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatPods,
              value: '${state.pods.length}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostFormatsStatNoPod,
              value: '${state.unplaced.length}',
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
        for (final pod in state.pods)
          CatchSurface(
            key: ValueKey<String>('formats-pod-${pod.id}'),
            child: CatchStack(
              children: [
                CatchStack(
                  direction: CatchStackDirection.row,
                  justify: CatchStackJustify.between,
                  align: CatchStackAlign.start,
                  children: [
                    Expanded(
                      child: CatchStack(
                        gap: CatchStackGap.g2,
                        children: [
                          CatchText(
                            pod.label,
                            variant: CatchTextVariant.titleBar,
                          ),
                          if (pod.paceSecondsPerKm case final pace?)
                            CatchText(
                              l10n.hostFormatsPodPace(
                                pace: formatsClockSeconds(pace),
                              ),
                              variant: CatchTextVariant.bodySmall,
                            ),
                        ],
                      ),
                    ),
                    CatchBadge(
                      label: l10n.hostFormatsRunnersCount(
                        count: pod.runners.length,
                      ),
                    ),
                  ],
                ),
                if (pod.runners.isNotEmpty)
                  FormatsPlayersRow(players: pod.runners)
                else
                  CatchText(
                    l10n.hostFormatsPodEmpty,
                    variant: CatchTextVariant.bodySmall,
                  ),
              ],
            ),
          ),
        CatchSection(
          title: l10n.hostFormatsNeedsPod,
          note: state.checking ? l10n.hostFormatsChecking : null,
          empty: state.checking ? null : l10n.hostFormatsNeedsPodNone,
          children: [
            for (final runner in state.unplaced)
              FormatsPersonRow(
                key: ValueKey<String>('formats-unplaced-${runner.attendeeId}'),
                name: runner.name,
                subtitle: !runner.movable
                    ? l10n.hostFormatsCannotMove
                    : l10n.hostFormatsNoPaceYet,
                density: CatchIndexRowSize.roomy,
                action: target == null || !runner.movable
                    ? null
                    : CatchIndexRowAction(
                        label: target.label,
                        variant: CatchIndexRowActionVariant.primary,
                        onPressed: placing.contains(runner.attendeeId)
                            ? null
                            : () => onPlace(runner, target),
                      ),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostFormatsRules,
          action: CatchSectionAction(
            label: l10n.hostFormatsAllRules,
            onPressed: onRules,
          ),
          children: [
            CatchIndexRow(
              title: l10n.hostFormatsPodsRulesRow,
              subtitle: l10n.hostFormatsUseAnswersNote,
              icon: CatchIcons.forms,
              onTap: onRules,
              density: CatchIndexRowSize.roomy,
              chevron: true,
            ),
          ],
        ),
      ],
    );
  }
}
