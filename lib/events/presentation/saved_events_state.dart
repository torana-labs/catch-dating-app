import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:flutter/material.dart';

class SavedEventsListState {
  const SavedEventsListState({required this.orderedEvents, required this.now});

  factory SavedEventsListState.from(
    List<Event> events, {
    required DateTime now,
  }) {
    final upcoming = <Event>[];
    final past = <Event>[];
    for (final event in events) {
      if (event.startTime.isBefore(now)) {
        past.add(event);
      } else {
        upcoming.add(event);
      }
    }

    upcoming.sort((a, b) => a.startTime.compareTo(b.startTime));
    past.sort((a, b) => b.startTime.compareTo(a.startTime));

    return SavedEventsListState(
      orderedEvents: List.unmodifiable([...upcoming, ...past]),
      now: now,
    );
  }

  final List<Event> orderedEvents;
  final DateTime now;

  DateTime get today => DateUtils.dateOnly(now);
  bool get isEmpty => orderedEvents.isEmpty;
  Iterable<String> get organizerIds =>
      orderedEvents.map((event) => event.clubId);

  String badgeLabelFor(Event event) => _isPast(event) ? 'PAST' : 'SAVED';

  EventTileStatus statusFor(Event event) =>
      _isPast(event) ? EventTileStatus.past : EventTileStatus.saved;

  bool _isPast(Event event) => event.startTime.isBefore(now);
}
