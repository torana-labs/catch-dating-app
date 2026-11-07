import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One coming host event as a system list row: the day-and-date tile in the
/// format tint, the start time and places booked, how many are left (or
/// Full), and the fill meter.
class HostEventWeekRow extends StatelessWidget {
  const HostEventWeekRow({super.key, required this.event, this.onTap});

  final Event event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final start = event.startTime;
    final booked = event.signedUpCount;
    final capacity = event.capacityLimit;
    final counted = capacity > 0;
    return CatchIndexRow(
      title: event.title,
      onTap: onTap,
      date: CatchIndexRowDate(
        day: EventFormatters.shortWeekday(start),
        date: '${start.day}',
        format: catchFormatForActivity(event.activityKind),
      ),
      meta: l10n.hostTodayWeekMeta(
        time: EventFormatters.time(start),
        booked: booked,
        capacity: capacity,
      ),
      status: !counted
          ? null
          : event.isFull
          ? l10n.hostTodayWeekFull
          : l10n.hostTodayWeekLeft(count: event.spotsRemaining),
      statusTone: counted && event.isFull
          ? CatchIndexRowTone.success
          : CatchIndexRowTone.neutral,
      progress: !counted
          ? null
          : CatchIndexRowProgress(
              value: booked.clamp(0, capacity),
              max: capacity,
              label: l10n.hostTodayCountBooked,
            ),
      density: CatchIndexRowSize.regular,
    );
  }
}
