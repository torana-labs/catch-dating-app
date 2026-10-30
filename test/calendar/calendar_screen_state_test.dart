import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('CalendarHomeState', () {
    test('uses the next event date as the default selected date', () {
      final now = DateTime(2026, 6, 30, 12);
      final nextEvent = buildEvent(
        id: 'next-event',
        startTime: now.add(const Duration(days: 1, hours: 3)),
      );

      final state = CalendarHomeState.from(
        signedUpEvents: [nextEvent],
        now: now,
      );

      expect(state.summary.nextEvent, nextEvent);
      expect(state.selectedDate, DateUtils.dateOnly(nextEvent.startTime));
      expect(state.expanded, isFalse);
      expect(state.hasEvents, isTrue);
      expect(state.organizerIds, [nextEvent.clubId]);
    });

    test('preserves explicit selected date and header mode', () {
      final now = DateTime(2026, 6, 30, 12);
      final selectedDate = DateTime(2026, 7, 4, 18);

      final state = CalendarHomeState.from(
        signedUpEvents: const [],
        now: now,
        selectedDate: selectedDate,
        expanded: true,
      );

      expect(state.selectedDate, DateUtils.dateOnly(selectedDate));
      expect(state.expanded, isTrue);
      expect(state.hasEvents, isFalse);
      expect(state.organizerIds, isEmpty);
    });

    test('derives agenda section state from club-name lookup phases', () {
      final now = DateTime(2026, 6, 30, 12);
      final event = buildEvent(
        id: 'calendar-event',
        startTime: now.add(const Duration(days: 1)),
      );
      final state = CalendarHomeState.from(signedUpEvents: [event], now: now);

      expect(
        state.agendaSection(
          organizerNames: const CalendarOrganizerNameLookupState.loading(),
        ),
        isA<CalendarAgendaOrganizerNamesLoadingState>().having(
          (state) => state.skeletonCount,
          'skeletonCount',
          3,
        ),
      );

      final error = Exception('club names failed');
      expect(
        state.agendaSection(
          organizerNames: CalendarOrganizerNameLookupState.failure(error),
        ),
        isA<CalendarAgendaOrganizerNamesErrorState>().having(
          (state) => state.error,
          'error',
          error,
        ),
      );

      final ready = state.agendaSection(
        organizerNames: const CalendarOrganizerNameLookupState.ready({
          'club-1': 'Stride Social',
        }),
      );

      expect(
        ready,
        isA<CalendarAgendaReadyState>()
            .having((state) => state.today, 'today', DateUtils.dateOnly(now))
            .having((state) => state.rows, 'rows', hasLength(1)),
      );
      final row = (ready as CalendarAgendaReadyState).rows.single;
      expect(row.event, event);
      expect(row.organizerName, 'Stride Social');
      expect(row.status, CalendarAgendaEventStatus.joined);
      expect(row.badgeLabel(_l10n), 'JOINED');
    });

    test('empty agenda state wins before club-name lookup state', () {
      final state = CalendarHomeState.from(
        signedUpEvents: const [],
        now: DateTime(2026, 6, 30, 12),
      );

      final agenda = state.agendaSection(
        organizerNames: CalendarOrganizerNameLookupState.failure(
          Exception('ignored'),
        ),
      );

      expect(
        agenda,
        isA<CalendarAgendaEmptyState>()
            .having(
              (state) => state.title(_l10n),
              'title',
              'No planned events yet',
            )
            .having(
              (state) => state.body(_l10n),
              'body',
              'Events you book or save will show up here by day and time.',
            ),
      );
    });
  });

  group('CalendarEventSummary', () {
    test('merges joined and saved events into the calendar display policy', () {
      final now = DateTime(2026, 6, 30, 12);
      final joinedUpcoming = buildEvent(
        id: 'joined-upcoming',
        startTime: now.add(const Duration(days: 2)),
      );
      final joinedPast = buildEvent(
        id: 'joined-past',
        startTime: now.subtract(const Duration(days: 1)),
        distanceKm: 3,
      );
      final cancelledUpcoming = buildEvent(
        id: 'cancelled-upcoming',
        startTime: now.add(const Duration(days: 1)),
        distanceKm: 9,
        status: EventLifecycleStatus.cancelled,
      );
      final savedUpcoming = buildEvent(
        id: 'saved-upcoming',
        startTime: now.add(const Duration(hours: 20)),
        distanceKm: 7,
      );
      final savedPast = buildEvent(
        id: 'saved-past',
        startTime: now.subtract(const Duration(hours: 2)),
        distanceKm: 50,
      );
      final savedDuplicate = buildEvent(
        id: joinedUpcoming.id,
        startTime: now.add(const Duration(hours: 8)),
        distanceKm: 99,
      );

      final summary = CalendarEventSummary.from(
        signedUpEvents: [joinedUpcoming, joinedPast, cancelledUpcoming],
        savedEvents: [savedUpcoming, savedPast, savedDuplicate],
        now: now,
      );

      expect(summary.events.map((event) => event.id), [
        'joined-past',
        'saved-upcoming',
        'cancelled-upcoming',
        'joined-upcoming',
      ]);
      expect(summary.agendaEvents.map((event) => event.id), [
        'saved-upcoming',
        'joined-upcoming',
        'cancelled-upcoming',
        'joined-past',
      ]);
      expect(summary.savedOnlyEventIds, {'saved-upcoming'});
      expect(summary.isSavedOnly(savedUpcoming), isTrue);
      expect(summary.isSavedOnly(joinedUpcoming), isFalse);
      expect(summary.nextEvent, savedUpcoming);
      expect(summary.anchorDate, savedUpcoming.startTime);
      expect(summary.totalDistance, 15);
    });

    test('agenda rows classify saved-only and cancelled events', () {
      final now = DateTime(2026, 6, 30, 12);
      final joined = buildEvent(
        id: 'joined',
        clubId: 'joined-club',
        startTime: now.add(const Duration(days: 2)),
      );
      final saved = buildEvent(
        id: 'saved',
        clubId: 'saved-club',
        startTime: now.add(const Duration(days: 1)),
      );
      final cancelled = buildEvent(
        id: 'cancelled',
        clubId: 'cancelled-club',
        startTime: now.add(const Duration(hours: 6)),
        status: EventLifecycleStatus.cancelled,
      );
      final state = CalendarHomeState.from(
        signedUpEvents: [joined, cancelled],
        savedEvents: [saved],
        now: now,
      );

      final agenda =
          state.agendaSection(
                organizerNames: const CalendarOrganizerNameLookupState.ready({
                  'joined-club': 'Joined Club',
                  'saved-club': 'Saved Club',
                  'cancelled-club': 'Cancelled Club',
                }),
              )
              as CalendarAgendaReadyState;

      expect(agenda.rows.map((row) => row.event.id), [
        'saved',
        'joined',
        'cancelled',
      ]);
      expect(agenda.rows.map((row) => row.organizerName), [
        'Saved Club',
        'Joined Club',
        'Cancelled Club',
      ]);
      expect(agenda.rows.map((row) => row.status), [
        CalendarAgendaEventStatus.saved,
        CalendarAgendaEventStatus.joined,
        CalendarAgendaEventStatus.cancelled,
      ]);
      expect(agenda.rows.map((row) => row.badgeLabel(_l10n)), [
        'SAVED',
        'JOINED',
        'CANCELLED',
      ]);
    });
  });
}
