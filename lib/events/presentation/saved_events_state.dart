import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/pages/event/tiles/event_tile_data.dart';
import 'package:flutter/material.dart';

class SavedEventsListState {
  const SavedEventsListState({required this.orderedEvents, required this.now});

  factory SavedEventsListState.from(
    List<GuestEventCard> events, {
    required DateTime now,
  }) {
    final upcoming = <GuestEventCard>[];
    final past = <GuestEventCard>[];
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

  final List<GuestEventCard> orderedEvents;
  final DateTime now;

  DateTime get today => DateUtils.dateOnly(now);
  bool get isEmpty => orderedEvents.isEmpty;
  Iterable<String> get organizerIds =>
      orderedEvents.map((event) => event.organizerId);

  String badgeLabelFor(GuestEventCard event) =>
      _isPast(event) ? 'PAST' : 'SAVED';

  EventTileStatus statusFor(GuestEventCard event) =>
      _isPast(event) ? EventTileStatus.past : EventTileStatus.saved;

  bool _isPast(GuestEventCard event) => event.startTime.isBefore(now);
}
