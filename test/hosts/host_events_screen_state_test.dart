import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_basics.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_view_model.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import '../organizers/organizers_test_helpers.dart' show buildEvent;

final _l10n = AppLocalizationsEn();

void main() {
  test('repeat selects latest-ended event regardless of input order', () {
    final now = DateTime(2026, 9);
    final older = buildEvent(
      id: 'older',
      startTime: now.subtract(const Duration(days: 3)),
      endTime: now.subtract(const Duration(days: 2)),
    );
    final latest = buildEvent(
      id: 'latest',
      startTime: now.subtract(const Duration(days: 2)),
      endTime: now.subtract(const Duration(days: 1)),
    );
    final state = HostEventsWorkspaceState.fromEvents(
      events: [older, latest],
      now: now,
    );
    expect(state.repeatSource?.id, 'latest');
  });

  setUpAll(() => initializeDateFormatting('en'));
  test('Host event entry resolves organizer capabilities once', () {
    final draft = EventDraft(
      id: 'draft-1',
      clubId: 'club-1',
      savedAt: DateTime(2026, 6, 15, 10),
      customActivityLabel: 'Quiz night',
    );
    final past = buildEvent(
      id: 'past',
      startTime: DateTime(2026, 6, 14, 9),
      endTime: DateTime(2026, 6, 14, 10),
    );

    final firstEvent = HostEventEntryState.resolve(organizerId: 'club-1');
    expect(firstEvent.continueIntents, isEmpty);
    expect(firstEvent.startIntents, [
      HostEventEntryIntent.createEvent,
      HostEventEntryIntent.createProgram,
    ]);

    final returning = HostEventEntryState.resolve(
      organizerId: 'club-1',
      drafts: [draft],
      repeatSource: past,
    );
    expect(returning.continueIntents, [
      HostEventEntryIntent.resumeDraft,
      HostEventEntryIntent.repeatLastEvent,
    ]);
    expect(returning.mostRecentDraft, draft);
    expect(returning.repeatSource, past);

    final noOrganizer = HostEventEntryState.resolve(
      organizerId: null,
      drafts: [draft],
      repeatSource: past,
    );
    expect(noOrganizer.hasOrganizer, isFalse);
    expect(noOrganizer.intents, isEmpty);
  });

  test(
    'Host event entry ignores drafts and repeats from another organizer',
    () {
      final state = HostEventEntryState.resolve(
        organizerId: 'club-1',
        drafts: [
          EventDraft(
            id: 'other-draft',
            clubId: 'club-2',
            savedAt: DateTime(2026, 6, 15),
          ),
        ],
        repeatSource: buildEvent(id: 'other-event', clubId: 'club-2'),
      );

      expect(state.continueIntents, isEmpty);
      expect(state.drafts, isEmpty);
      expect(state.repeatSource, isNull);
    },
  );

  test('Host Events groups upcoming rows and derives truthful metadata', () {
    final now = DateTime(2026, 6, 15, 12);
    final today = buildEvent(
      id: 'today',
      startTime: DateTime(2026, 6, 15, 18),
      bookedCount: 24,
    ).copyWith(capacityLimit: 30);
    final july = buildEvent(
      id: 'july',
      startTime: DateTime(2026, 7, 2, 9),
      bookedCount: 40,
    );
    final nextYear = buildEvent(
      id: 'next-year',
      startTime: DateTime(2027, 6, 1, 9),
    );
    final past = buildEvent(
      id: 'past',
      startTime: DateTime(2026, 6, 14, 9),
      endTime: DateTime(2026, 6, 14, 10),
    );
    final cancelled = buildEvent(
      id: 'cancelled',
      startTime: DateTime(2026, 6, 15, 17),
    ).copyWith(status: EventLifecycleStatus.cancelled);

    final state = HostEventsWorkspaceState.fromEvents(
      events: [nextYear, july, cancelled, past, today],
      now: now,
    );

    expect(state.status, HostEventsWorkspaceStatus.populated);
    expect(state.activeSections.map((section) => section.label(_l10n)), [
      'Today · Mon, 15 Jun',
      'Thu, 2 Jul',
      'Tue, 1 Jun 2027',
    ]);
    expect(
      state.activeSections
          .expand((section) => section.rows)
          .map((row) => row.id),
      ['today', 'july', 'next-year'],
    );
    final todayRow = state.activeSections.first.rows.single;
    expect(todayRow.isToday, isTrue);
    expect(todayRow.facts(_l10n, time: '18:00').last, '24 of 30 registered');
    expect(
      state.activeSections.every(
        (section) => section.grouping == HostEventsGrouping.day,
      ),
      isTrue,
    );
    expect(state.pastSections.single.label(_l10n), 'June 2026');
    expect(state.pastSections.single.rows.single.event, past);
    expect(state.repeatSource, past);
  });

  test('Host Events classifies exact lifecycle boundaries', () {
    final now = DateTime(2026, 6, 15, 12);
    final startsNow = buildEvent(
      id: 'starts-now',
      startTime: now,
      endTime: now.add(const Duration(hours: 1)),
    );
    final endsNow = buildEvent(
      id: 'ends-now',
      startTime: now.subtract(const Duration(hours: 1)),
      endTime: now,
      checkedInCount: 12,
      bookedCount: 15,
    );

    final state = HostEventsWorkspaceState.fromEvents(
      events: [endsNow, startsNow],
      now: now,
    );
    expect(state.activeSections.single.rows.single.event, startsNow);
    expect(state.activeSections.single.rows.single.isLive, isTrue);
    expect(state.pastSections.single.rows.single.event, endsNow);
    expect(
      state.pastSections.single.rows.single.facts(_l10n, time: '11:00').last,
      '12 attended',
    );
    expect(
      state.activeSections.single.rows.single.facts(_l10n, time: '12:00').first,
      startsWith('Live · 12:00'),
    );
  });

  test(
    'Host Events async state maps loading, error, and timeline empty copy',
    () {
      final now = DateTime(2026, 6, 15, 12);
      final cancelled = buildEvent(
        id: 'cancelled',
        startTime: DateTime(2026, 6, 14),
      ).copyWith(status: EventLifecycleStatus.cancelled);
      final stackTrace = StackTrace.current;
      final error = StateError('events failed');

      expect(
        buildHostEventsWorkspaceState(
          const CatchAsyncState<List<Event>>.loading(),
          now: now,
        ).status,
        HostEventsWorkspaceStatus.loading,
      );

      final errorState = buildHostEventsWorkspaceState(
        CatchAsyncState<List<Event>>.error(error, stackTrace),
        now: now,
      );
      expect(errorState.status, HostEventsWorkspaceStatus.error);
      expect(errorState.error, error);

      final emptyState = buildHostEventsWorkspaceState(
        CatchAsyncState<List<Event>>.data([cancelled]),
        now: now,
      );
      expect(emptyState.status, HostEventsWorkspaceStatus.empty);
      expect(emptyState.emptyTitle(_l10n), 'No upcoming events');
      expect(emptyState.emptyBody(_l10n), contains('Create your next event'));

      final continuationState = HostEventsWorkspaceState.fromEvents(
        events: [cancelled],
        now: now,
        hasMoreActive: true,
      );
      expect(continuationState.status, HostEventsWorkspaceStatus.populated);
      expect(continuationState.canLoadMoreActive, isTrue);
    },
  );

  test(
    'Host Events merges unpublished and cancelled events into the timeline',
    () {
      final now = DateTime(2026, 6, 15, 12);
      final published = buildEvent(
        id: 'published',
        startTime: DateTime(2026, 6, 16, 18),
        endTime: DateTime(2026, 6, 16, 21),
      );
      final unpublished = PrivateEventSetupInventoryItem(
        eventId: 'offer-created',
        name: 'Offer mixer',
        city: const EventSetupCity(
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
        ),
        localDate: '2026-06-16',
        localStartTime: '19:00',
        timezone: 'Asia/Kolkata',
        startTimeMillis: DateTime(2026, 6, 16, 19).millisecondsSinceEpoch,
        setupRevision: 1,
        detailsConfigured: false,
      );
      final cancelled = buildEvent(
        id: 'cancelled',
        startTime: DateTime(2026, 6, 10),
      ).copyWith(status: EventLifecycleStatus.cancelled);
      final cancelledSetup = PrivateEventSetupInventoryItem(
        eventId: 'cancelled-draft',
        name: 'Shelved mixer',
        city: const EventSetupCity(
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
        ),
        localDate: '2026-06-12',
        localStartTime: '20:00',
        timezone: 'Asia/Kolkata',
        startTimeMillis: DateTime(2026, 6, 12, 20).millisecondsSinceEpoch,
        setupRevision: 2,
        detailsConfigured: true,
        status: 'cancelled',
      );

      final state = HostEventsWorkspaceState.fromEvents(
        events: [published],
        unpublishedUpcoming: [unpublished],
        unpublishedHistory: [cancelledSetup],
        cancelledEvents: [cancelled],
        now: now,
      );

      // The offer-created unpublished event joins upcoming, ordered by
      // the authored local date rather than the viewer's timezone.
      expect(state.activeSections.single.rows.map((row) => row.id), [
        'published',
        'offer-created',
      ]);
      final setupRow = state.activeSections.single.rows.last;
      expect(setupRow.isUnpublished, isTrue);
      expect(setupRow.event, isNull);
      expect(
        setupRow.facts(_l10n, time: unpublished.localStartTime).last,
        'Setup in progress',
      );

      // Cancelled events — published and unpublished — land in history
      // newest-first with a cancelled fact instead of attendance counts.
      expect(state.pastSections.single.rows.map((row) => row.id), [
        'cancelled-draft',
        'cancelled',
      ]);
      expect(
        state.pastSections.single.rows.first.facts(_l10n, time: '20:00').last,
        'Cancelled',
      );
      expect(
        state.pastSections.single.rows.last.facts(_l10n, time: '18:00').last,
        'Cancelled',
      );
    },
  );
}
