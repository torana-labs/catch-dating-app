import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where an event row sits in the Events tab: tonight, coming, or over.
enum HostEventsRowKind { tonight, coming, past }

/// One host event as a system list row: the day-and-date tile in the
/// format tint, the start time with places booked (and the waitlist
/// tonight), how it stands (Tonight, N left, Full, Cancelled, N came) and
/// the booked meter. It draws nothing of its own.
class HostEventsEventRow extends StatelessWidget {
  const HostEventsEventRow({
    super.key,
    required this.event,
    required this.kind,
    this.onTap,
  });

  final Event event;
  final HostEventsRowKind kind;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final start = event.startTime;
    final booked = event.signedUpCount;
    final capacity = event.capacityLimit;
    final counted = capacity > 0;
    final cancelled = event.status == EventLifecycleStatus.cancelled;
    final time = EventFormatters.time(start);
    final meta = !counted
        ? time
        : kind == HostEventsRowKind.tonight && event.waitlistCount > 0
        ? l10n.hostEventsRowMetaWaiting(
            time: time,
            booked: booked,
            capacity: capacity,
            waiting: event.waitlistCount,
          )
        : l10n.hostEventsRowMeta(
            time: time,
            booked: booked,
            capacity: capacity,
          );
    final (String? status, CatchIndexRowTone tone) = switch (kind) {
      _ when cancelled => (
        l10n.hostEventsRowWasCancelled,
        CatchIndexRowTone.danger,
      ),
      HostEventsRowKind.tonight => (
        l10n.hostEventsRowTonight,
        CatchIndexRowTone.neutral,
      ),
      HostEventsRowKind.coming when !counted => (
        null,
        CatchIndexRowTone.neutral,
      ),
      HostEventsRowKind.coming when event.isFull => (
        l10n.hostEventsRowFull,
        CatchIndexRowTone.success,
      ),
      HostEventsRowKind.coming => (
        l10n.hostEventsRowLeft(count: event.spotsRemaining),
        CatchIndexRowTone.neutral,
      ),
      HostEventsRowKind.past => (
        l10n.hostEventsRowCame(count: event.attendedCount),
        CatchIndexRowTone.neutral,
      ),
    };
    return CatchIndexRow(
      title: event.title,
      onTap: onTap,
      date: CatchIndexRowDate(
        day: EventFormatters.shortWeekday(start),
        date: '${start.day}',
        format: catchFormatForActivity(event.activityKind),
      ),
      meta: meta,
      status: status,
      statusTone: tone,
      progress: !counted || kind == HostEventsRowKind.past || cancelled
          ? null
          : CatchIndexRowProgress(
              value: booked.clamp(0, capacity),
              max: capacity,
              label: l10n.hostEventsBooked,
            ),
      density: CatchIndexRowSize.regular,
    );
  }
}
