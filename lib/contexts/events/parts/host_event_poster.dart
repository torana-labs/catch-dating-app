import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The hour from which an event later today reads as tonight.
const int hostEventEveningHour = 17;

/// One host event as the system poster: the format tint and name, when it
/// is (live now, tonight, today or a later day), where, then Booked,
/// Waitlist and, when the roster view has counted them, New faces, with
/// the first [people] who are coming.
class HostEventPoster extends StatelessWidget {
  const HostEventPoster({
    super.key,
    required this.event,
    required this.now,
    this.newFaces,
    this.people = const <String>[],
    this.onTap,
  });

  final Event event;

  /// The clock that decides live, tonight, today or a later day.
  final DateTime now;

  /// Booked guests coming for the first time; null leaves the count out.
  final int? newFaces;

  /// Names of the first guests coming.
  final List<String> people;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final start = event.startTime;
    final time = EventFormatters.time(start);
    final live = !start.isAfter(now) && event.endTime.isAfter(now);
    final when = switch (start) {
      _ when live => l10n.hostTodayWhenLive,
      _
          when DateUtils.isSameDay(start, now) &&
              start.hour >= hostEventEveningHour =>
        l10n.hostTodayWhenTonight(time: time),
      _ when DateUtils.isSameDay(start, now) => l10n.hostTodayWhenToday(
        time: time,
      ),
      _ => l10n.hostTodayWhenLater(
        day:
            '${EventFormatters.shortWeekday(start)} ${start.day} '
            '${EventFormatters.shortMonth(start)}',
        time: time,
      ),
    };
    final format = event.eventFormat;
    final newFaces = this.newFaces;
    return CatchEventCard(
      format: catchFormatForActivity(format.activityKind),
      formatLabel: format.customActivityLabel ?? format.activityKind.label,
      when: when,
      title: event.title,
      place: event.locationName,
      counts: [
        CatchMetricValue(
          value: '${event.signedUpCount}',
          label: l10n.hostTodayCountBooked,
        ),
        CatchMetricValue(
          value: '${event.waitlistCount}',
          label: l10n.hostTodayCountWaitlist,
        ),
        if (newFaces != null)
          CatchMetricValue(
            value: '$newFaces',
            label: l10n.hostTodayCountNewFaces,
          ),
      ],
      people: [for (final name in people) CatchPersonAvatarItem(name: name)],
      peopleTotal: people.isEmpty ? null : event.signedUpCount,
      onTap: onTap,
    );
  }
}
