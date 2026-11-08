import 'package:catch_dating_app/contexts/events/parts/host_event_step_row.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A rehearsal in board order: the practice badge, what it is, the plan's
/// steps with the one to practise now, and Open the practice door and End
/// rehearsal.
class HostRehearsalBody extends StatelessWidget {
  const HostRehearsalBody({
    super.key,
    required this.state,
    required this.onOpenDoor,
    required this.onEnd,
    required this.onRetry,
    this.ending = false,
  });

  final HostRehearsalState state;
  final VoidCallback onOpenDoor;
  final VoidCallback onEnd;
  final VoidCallback onRetry;

  /// The end command is on its way.
  final bool ending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostRehearsalStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostRehearsalStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsRehearsalErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostRehearsalStatus.running || HostRehearsalStatus.ended:
        break;
    }
    final ended = state.status == HostRehearsalStatus.ended;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            wrap: true,
            children: [
              CatchBadge(
                label: l10n.hostEventsRehearsalBadge,
                tone: CatchBadgeTone.warning,
                size: CatchBadgeSize.md,
              ),
            ],
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                ended
                    ? l10n.hostEventsRehearsalEndedTitle
                    : l10n.hostEventsRehearsalTitle,
                variant: CatchTextVariant.pageTitle,
              ),
              CatchText(
                l10n.hostEventsRehearsalBody(count: state.guests),
                tone: CatchTextTone.secondary,
              ),
            ],
          ),
          CatchSection(
            empty: l10n.hostEventsRehearsalNoSteps,
            children: [
              for (final (index, step) in state.steps.indexed)
                HostEventStepRow.rehearsal(
                  key: ValueKey<String>('host-rehearsal-step-$index'),
                  step: step.step,
                  number: index + 1,
                  progress: step.progress,
                ),
            ],
          ),
          if (!ended)
            CatchStack(
              gap: CatchStackGap.g8,
              children: [
                CatchButton(
                  label: l10n.hostEventsRehearsalOpenDoor,
                  fullWidth: true,
                  onPressed: onOpenDoor,
                ),
                CatchButton(
                  label: l10n.hostEventsRehearsalEnd,
                  variant: CatchButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: ending ? null : onEnd,
                ),
              ],
            ),
        ],
      ),
    );
  }
}
