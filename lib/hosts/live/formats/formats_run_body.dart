import 'package:catch_dating_app/hosts/live/formats/formats_clock.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The run console in board order: the step on now with how many runners
/// are back, the pace pods with each pod's count, who is still out (each
/// with Back and Call), and Close the route, which opens the return sweep.
///
/// Not drawn, because nothing stores them: a pod's lead, a note per runner
/// ("walking with Dev, knee") and where a runner was last seen. "Fine" is
/// Back: the one state the event keeps for a runner is accounted for.
class HostFormatsRunBody extends StatelessWidget {
  const HostFormatsRunBody({
    super.key,
    required this.state,
    required this.now,
    required this.onAccounted,
    required this.onCall,
    required this.onClose,
    required this.onRetry,
    this.marking = const <String>{},
    this.location,
    this.onGuests,
  });

  final HostFormatsRunState state;
  final DateTime now;

  /// Marks a runner back.
  final ValueChanged<HostFormatsOut> onAccounted;

  /// Opens the door, where a late runner is checked in; null hides Guests.
  final VoidCallback? onGuests;

  /// Calls a runner on the number they gave.
  final ValueChanged<String> onCall;

  /// Opens the return sweep.
  final VoidCallback onClose;
  final VoidCallback onRetry;

  /// Runners whose mark is on its way, by attendee.
  final Set<String> marking;

  /// Sharing the host's live location, on a night that tracks it.
  final Widget? location;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsRunStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsRunStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsRunStatus.noPlan:
        // Without a plan there are no steps or pods, but the door and the
        // return sweep still work.
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.route,
            title: l10n.hostFormatsRunNoPlanTitle,
            message: l10n.hostFormatsRunNoPlanBody,
            actions: [
              if (onGuests case final onGuests?)
                CatchButton(
                  key: const ValueKey<String>('formats-run-guests'),
                  label: l10n.hostLiveViewGuests,
                  leading: CatchIcon(CatchIcons.people),
                  onPressed: onGuests,
                ),
              CatchButton(
                key: const ValueKey<String>('formats-run-close'),
                label: l10n.hostFormatsRunClose,
                variant: CatchButtonVariant.secondary,
                onPressed: onClose,
              ),
            ],
          ),
        );
      case HostFormatsRunStatus.running:
        break;
    }
    final sweep = state.sweep;
    final anyoneBack = sweep.accounted > 0;
    // Before anyone is back the whole field is out on the route; the list
    // opens once runners start coming in, or on the way back.
    final showOut = anyoneBack || state.onLastStep;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.run,
          child: CatchStack(
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                gap: CatchStackGap.g8,
                children: [
                  CatchText(
                    l10n.hostFormatsRunNow,
                    variant: CatchTextVariant.labelKicker,
                  ),
                  CatchText(
                    AppTimeFormatters.time(now),
                    variant: CatchTextVariant.labelKicker,
                    numeric: true,
                  ),
                ],
              ),
              if (state.stepTitle case final title?)
                CatchText(title, variant: CatchTextVariant.displayLg),
              CatchMeter(
                value: sweep.checkedIn == 0 ? 0 : sweep.accounted.toDouble(),
                max: sweep.checkedIn == 0 ? 1 : sweep.checkedIn.toDouble(),
                label: l10n.hostFormatsRunBack(
                  back: sweep.accounted,
                  total: sweep.checkedIn,
                ),
                showLabel: true,
              ),
            ],
          ),
        ),
        ?location,
        if (state.pods.isNotEmpty)
          CatchSection(
            title: l10n.hostFormatsRunPods,
            note: state.checking ? l10n.hostFormatsChecking : null,
            children: [
              for (final pod in state.pods)
                CatchIndexRow(
                  key: ValueKey<String>('formats-run-pod-${pod.id}'),
                  title: pod.id.isEmpty ? l10n.hostFormatsRunNoPod : pod.label,
                  subtitle: switch (pod.paceSecondsPerKm) {
                    final pace? => l10n.hostFormatsPodPace(
                      pace: formatsClockSeconds(pace),
                    ),
                    null => null,
                  },
                  onTap: null,
                  marker: pod.back >= pod.total
                      ? CatchIndexRowTone.success
                      : CatchIndexRowTone.warning,
                  status: l10n.hostFormatsRunPodBack(
                    back: pod.back,
                    total: pod.total,
                  ),
                ),
            ],
          ),
        CatchSection(
          title: l10n.hostFormatsRunStillOut(count: sweep.out.length),
          empty: showOut ? l10n.hostFormatsSweepAllAccounted : null,
          children: [
            if (!showOut)
              CatchText(
                l10n.hostFormatsRunAllOut,
                tone: CatchTextTone.secondary,
              )
            else
              for (final person in sweep.out)
                HostFormatsOutRow(
                  key: ValueKey<String>('formats-out-${person.attendeeId}'),
                  person: person,
                  crawl: false,
                  pending: marking.contains(person.attendeeId),
                  onAccounted: () => onAccounted(person),
                  onCall: onCall,
                ),
          ],
        ),
        if (onGuests case final onGuests?)
          CatchButton(
            key: const ValueKey<String>('formats-run-guests'),
            label: l10n.hostLiveViewGuests,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.people),
            fullWidth: true,
            onPressed: onGuests,
          ),
        CatchButton(
          key: const ValueKey<String>('formats-run-close'),
          label: sweep.out.isEmpty && sweep.checkedIn > 0
              ? l10n.hostFormatsRunCloseAllBack
              : l10n.hostFormatsRunClose,
          variant: CatchButtonVariant.secondary,
          fullWidth: true,
          onPressed: onClose,
        ),
      ],
    );
  }
}
