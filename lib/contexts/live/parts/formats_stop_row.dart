import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One stop on the route as a timeline row: when the group gets there, a
/// marker (muted once left, the format colour pulsing while the group is
/// there, a ring for stops to come), the stop and where it is. The row
/// draws nothing of its own.
class FormatsStopRow extends StatelessWidget {
  const FormatsStopRow({
    super.key,
    required this.stop,
    required this.startsAt,
    required this.status,
    this.format,
  });

  final EventItineraryItem stop;

  /// When the group reaches the stop: the event's start plus its offset.
  final DateTime startsAt;
  final LivePlanStepStatus status;
  final CatchFormat? format;

  @override
  Widget build(BuildContext context) {
    final location = stop.location;
    final where = location?.address?.trim();
    return CatchIndexRow(
      title: stop.title,
      subtitle: where == null || where.isEmpty ? location?.name : where,
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
      emphasis: status == LivePlanStepStatus.done
          ? CatchIndexRowEmphasis.done
          : CatchIndexRowEmphasis.regular,
    );
  }
}
