import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

class CalendarHomeState {
  const CalendarHomeState({
    required this.summary,
    required this.selectedDate,
    required this.expanded,
  });

  factory CalendarHomeState.from({
    required List<Event> signedUpEvents,
    List<Event> savedEvents = const <Event>[],
    required DateTime now,
    DateTime? selectedDate,
    bool expanded = false,
  }) {
    final summary = CalendarEventSummary.from(
      signedUpEvents: signedUpEvents,
      savedEvents: savedEvents,
      now: now,
    );
    return CalendarHomeState(
      summary: summary,
      selectedDate: DateUtils.dateOnly(selectedDate ?? summary.anchorDate),
      expanded: expanded,
    );
  }

  final CalendarEventSummary summary;
  final DateTime selectedDate;
  final bool expanded;

  bool get hasEvents => summary.events.isNotEmpty;
  Iterable<String> get organizerIds =>
      summary.events.map((event) => event.clubId);

  CalendarAgendaSectionState agendaSection({
    required CalendarOrganizerNameLookupState organizerNames,
  }) {
    return CalendarAgendaSectionState.from(
      summary: summary,
      organizerNames: organizerNames,
    );
  }
}

enum CalendarOrganizerNameLookupStatus { loading, failure, ready }

class CalendarOrganizerNameLookupState {
  const CalendarOrganizerNameLookupState.loading()
    : status = CalendarOrganizerNameLookupStatus.loading,
      names = const <String, String>{},
      error = null;

  const CalendarOrganizerNameLookupState.failure(Object this.error)
    : status = CalendarOrganizerNameLookupStatus.failure,
      names = const <String, String>{};

  const CalendarOrganizerNameLookupState.ready(this.names)
    : status = CalendarOrganizerNameLookupStatus.ready,
      error = null;

  final CalendarOrganizerNameLookupStatus status;
  final Map<String, String> names;
  final Object? error;
}

sealed class CalendarAgendaSectionState {
  const CalendarAgendaSectionState();

  factory CalendarAgendaSectionState.from({
    required CalendarEventSummary summary,
    required CalendarOrganizerNameLookupState organizerNames,
  }) {
    if (summary.events.isEmpty) return const CalendarAgendaEmptyState();

    return switch (organizerNames.status) {
      CalendarOrganizerNameLookupStatus.loading =>
        const CalendarAgendaOrganizerNamesLoadingState(),
      CalendarOrganizerNameLookupStatus.failure =>
        CalendarAgendaOrganizerNamesErrorState(organizerNames.error!),
      CalendarOrganizerNameLookupStatus.ready => CalendarAgendaReadyState(
        rows: [
          for (final event in summary.agendaEvents)
            CalendarAgendaEventRowState(
              event: event,
              organizerName: organizerNames.names[event.clubId],
              status: event.isCancelled
                  ? CalendarAgendaEventStatus.cancelled
                  : summary.isSavedOnly(event)
                  ? CalendarAgendaEventStatus.saved
                  : CalendarAgendaEventStatus.joined,
            ),
        ],
        today: summary.today,
      ),
    };
  }
}

class CalendarAgendaEmptyState extends CalendarAgendaSectionState {
  const CalendarAgendaEmptyState();

  String title(AppLocalizations l10n) =>
      l10n.eventsCalendarScreenStateTitleNoPlannedEventsYet;
  String body(AppLocalizations l10n) =>
      l10n.eventsCalendarScreenStateBodyEventsYouBookOr;
}

class CalendarAgendaOrganizerNamesLoadingState
    extends CalendarAgendaSectionState {
  const CalendarAgendaOrganizerNamesLoadingState();

  int get skeletonCount => 3;
}

class CalendarAgendaOrganizerNamesErrorState
    extends CalendarAgendaSectionState {
  const CalendarAgendaOrganizerNamesErrorState(this.error);

  final Object error;
}

class CalendarAgendaReadyState extends CalendarAgendaSectionState {
  const CalendarAgendaReadyState({required this.rows, required this.today});

  final List<CalendarAgendaEventRowState> rows;
  final DateTime today;
}

enum CalendarAgendaEventStatus { joined, saved, cancelled }

class CalendarAgendaEventRowState {
  const CalendarAgendaEventRowState({
    required this.event,
    required this.organizerName,
    required this.status,
  });

  final Event event;
  final String? organizerName;
  final CalendarAgendaEventStatus status;

  String badgeLabel(AppLocalizations l10n) {
    return switch (status) {
      CalendarAgendaEventStatus.cancelled =>
        l10n.eventsCalendarScreenStateBadgelabelCancelled,
      CalendarAgendaEventStatus.saved =>
        l10n.eventsCalendarScreenStateBadgelabelSaved,
      CalendarAgendaEventStatus.joined =>
        l10n.eventsCalendarScreenStateBadgelabelJoined,
    };
  }
}

class CalendarEventSummary {
  const CalendarEventSummary({
    required this.events,
    required this.agendaEvents,
    required this.savedOnlyEventIds,
    required this.today,
    required this.anchorDate,
    required this.totalDistance,
    this.nextEvent,
  });

  final List<Event> events;
  final List<Event> agendaEvents;
  final Set<String> savedOnlyEventIds;
  final DateTime today;
  final DateTime anchorDate;
  final double totalDistance;
  final Event? nextEvent;

  bool isSavedOnly(Event event) => savedOnlyEventIds.contains(event.id);

  static CalendarEventSummary from({
    required List<Event> signedUpEvents,
    List<Event> savedEvents = const <Event>[],
    required DateTime now,
  }) {
    final signedUpIds = signedUpEvents.map((event) => event.id).toSet();
    final savedOnlyEventIds = <String>{};
    final byId = <String, Event>{};

    for (final event in savedEvents) {
      if (event.isCancelled || !event.startTime.isAfter(now)) continue;
      byId[event.id] = event;
      if (!signedUpIds.contains(event.id)) savedOnlyEventIds.add(event.id);
    }
    for (final event in signedUpEvents) {
      byId[event.id] = event;
    }

    final sorted = byId.values.toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final today = DateUtils.dateOnly(now);
    // Cancelled events stay visible in the agenda but never count toward
    // distance stats and are never the user's next event.
    final totalDistance = sorted
        .where((event) => !event.isCancelled)
        .fold<double>(0, (sum, event) => sum + event.distanceKm);

    final upcoming = <Event>[];
    final cancelledUpcoming = <Event>[];
    final past = <Event>[];
    for (final event in sorted) {
      if (!event.startTime.isBefore(now) && event.isCancelled) {
        cancelledUpcoming.add(event);
      } else if (event.startTime.isBefore(now)) {
        past.add(event);
      } else {
        upcoming.add(event);
      }
    }

    final nextEvent = upcoming.isEmpty ? null : upcoming.first;
    final latestPastFirst = [...past]
      ..sort((a, b) => b.startTime.compareTo(a.startTime));
    final anchorDate = nextEvent?.startTime ?? today;

    return CalendarEventSummary(
      events: List.unmodifiable(sorted),
      agendaEvents: List.unmodifiable([
        ...upcoming,
        ...cancelledUpcoming,
        ...latestPastFirst,
      ]),
      savedOnlyEventIds: Set.unmodifiable(savedOnlyEventIds),
      today: today,
      anchorDate: anchorDate,
      totalDistance: totalDistance,
      nextEvent: nextEvent,
    );
  }
}
