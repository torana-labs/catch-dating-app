import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter/foundation.dart';

/// Where the Events tab is: still reading the coming events, showing them,
/// or unable to read them.
enum HostEventsStatus { loading, ready, error }

/// The three lists the Events tab switches between.
enum HostEventsTab { upcoming, drafts, past }

/// The coming events in one month after this week, for a "Later in" group.
@immutable
class HostEventsMonth {
  const HostEventsMonth({required this.month, required this.events});

  /// The first day of the month.
  final DateTime month;
  final List<Event> events;
}

/// Everything the Events tab shows, as plain values.
@immutable
class HostEventsState {
  const HostEventsState({
    required this.status,
    this.upcoming = const <Event>[],
    this.drafts = const <PrivateEventSetupInventoryItem>[],
    this.past = const <Event>[],
    this.programmes = const <OrganizerProgramListRow>[],
    this.historyLoading = false,
    this.historyFailed = false,
    this.error,
  });

  const HostEventsState.loading() : this(status: HostEventsStatus.loading);

  final HostEventsStatus status;

  /// Published events that have not ended, the soonest ending first.
  final List<Event> upcoming;

  /// Events still being set up and not published yet.
  final List<PrivateEventSetupInventoryItem> drafts;

  /// Events that have ended or were cancelled, the latest first.
  final List<Event> past;

  /// The organizer's programmes; empty when it has none, and then the tab
  /// shows no Programmes section.
  final List<OrganizerProgramListRow> programmes;

  /// Drafts and past events are still being read.
  final bool historyLoading;

  /// Drafts and past events could not be read.
  final bool historyFailed;
  final Object? error;

  int countFor(HostEventsTab tab) => switch (tab) {
    HostEventsTab.upcoming => upcoming.length,
    HostEventsTab.drafts => drafts.length,
    HostEventsTab.past => past.length,
  };

  /// The event running now or starting later today, if any.
  Event? tonight(DateTime now) => upcoming
      .where(
        (event) =>
            _sameDay(event.startTime, now) ||
            (!event.startTime.isAfter(now) && event.endTime.isAfter(now)),
      )
      .firstOrNull;

  /// Coming events in the seven days after today, tonight left out.
  List<Event> thisWeek(DateTime now) {
    final today = _dateOnly(now);
    final weekEnd = today.add(const Duration(days: 8));
    final tonightEvent = tonight(now);
    return List<Event>.unmodifiable(
      _byStart(upcoming).where(
        (event) =>
            event != tonightEvent &&
            event.startTime.isBefore(weekEnd) &&
            !_sameDay(event.startTime, now),
      ),
    );
  }

  /// Coming events after this week, grouped by month.
  List<HostEventsMonth> later(DateTime now) {
    final weekEnd = _dateOnly(now).add(const Duration(days: 8));
    final groups = <DateTime, List<Event>>{};
    for (final event in _byStart(upcoming)) {
      if (event.startTime.isBefore(weekEnd)) continue;
      final month = DateTime(event.startTime.year, event.startTime.month);
      (groups[month] ??= <Event>[]).add(event);
    }
    return List<HostEventsMonth>.unmodifiable([
      for (final entry in groups.entries)
        HostEventsMonth(
          month: entry.key,
          events: List<Event>.unmodifiable(entry.value),
        ),
    ]);
  }

  static List<Event> _byStart(List<Event> events) =>
      [...events]..sort((a, b) => a.startTime.compareTo(b.startTime));
}

DateTime _dateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;
