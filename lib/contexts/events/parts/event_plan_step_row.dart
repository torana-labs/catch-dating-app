import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One step of an event's plan as a list row: the clock time it starts
/// (the event's start plus the step's offset), its title and the caller's
/// subtitle, with an edit button at the end.
class EventPlanStepRow extends StatelessWidget {
  const EventPlanStepRow({
    super.key,
    required this.step,
    required this.eventStartMinutes,
    required this.subtitle,
    required this.editLabel,
    required this.onEdit,
  });

  final EventItineraryItem step;

  /// The event's start as minutes after midnight; null leaves the time out.
  final int? eventStartMinutes;
  final String subtitle;
  final String editLabel;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final start = eventStartMinutes;
    String? time;
    if (start != null) {
      final minutes = (start + step.offsetMinutes) % (24 * 60);
      final hour = minutes ~/ 60;
      final hour12 = hour % 12 == 0 ? 12 : hour % 12;
      time = '$hour12:${(minutes % 60).toString().padLeft(2, '0')}';
    }
    return CatchIndexRow(
      title: step.title,
      subtitle: subtitle,
      time: time,
      density: CatchIndexRowSize.compact,
      onTap: onEdit,
      trailing: CatchIconAction.icon(
        icon: CatchIcons.edit,
        tooltip: editLabel,
        variant: CatchIconActionVariant.plain,
        onPressed: onEdit,
      ),
    );
  }
}
