import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Where a run-of-show step stands tonight: already run, running now, or
/// still to come.
enum LivePlanStepStatus { done, now, next }

/// One step of tonight's plan as a timeline row: its start time, a marker
/// (muted when done, the format colour pulsing when now, a ring when next),
/// its title and its status. The row draws nothing of its own.
class LivePlanStepRow extends StatelessWidget {
  const LivePlanStepRow({
    super.key,
    required this.step,
    required this.startsAt,
    required this.status,
    this.format,
  });

  final EventRunOfShowStep step;

  /// When the step starts on tonight's schedule: the event's start plus the
  /// steps before it.
  final DateTime startsAt;
  final LivePlanStepStatus status;

  /// The format colour of the step running now.
  final CatchFormat? format;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: step.title,
      onTap: null,
      density: CatchIndexRowSize.compact,
      time: DateFormat(
        'h:mm',
        Localizations.localeOf(context).toLanguageTag(),
      ).format(startsAt),
      leading: switch (status) {
        LivePlanStepStatus.done => const CatchMarker(
          tone: CatchMarkerTone.muted,
        ),
        LivePlanStepStatus.now => CatchMarker(
          tone: CatchMarkerTone.format,
          format: format,
          live: true,
        ),
        LivePlanStepStatus.next => const CatchMarker(
          variant: CatchMarkerVariant.ring,
        ),
      },
      status: switch (status) {
        LivePlanStepStatus.done => l10n.hostLiveStepDone,
        LivePlanStepStatus.now => l10n.hostLiveStepNow,
        LivePlanStepStatus.next => l10n.hostLiveStepNext,
      },
      emphasis: status == LivePlanStepStatus.done
          ? CatchIndexRowEmphasis.done
          : CatchIndexRowEmphasis.regular,
    );
  }
}
