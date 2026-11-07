import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/today/host_today_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'host_today_fixtures.dart';

const _uid = 'host-1';
final _request = HostTodayRequest(
  organizerId: 'org-1',
  accountId: _uid,
  now: todayNow,
  cityName: 'Mumbai',
);

HostAttentionProjection _projection(
  List<HostAttentionItem> items, {
  HostAttentionSourceCoverage coverage = HostAttentionSourceCoverage.complete,
}) => HostAttentionProjection(
  organizerId: 'org-1',
  policyVersion: hostAttentionPolicyVersion,
  items: items,
  coverage: hostAttentionCatalogCoverage,
  evaluatedAt: todayNow,
  sourceCoverage: coverage,
);

EventAttendee _attendee(String name) => EventAttendee(
  id: 'a-$name',
  eventId: 'tonight',
  organizerId: 'org-1',
  displayName: name,
  searchName: name.toLowerCase(),
  source: EventAttendeeSource.catchBooking,
  status: EventAttendeeStatus.registered,
  createdAt: todayNow,
  updatedAt: todayNow,
);

HostEventRosterInsight _rosterRow(String id, HostRosterInsightSignal signal) =>
    HostEventRosterInsight(
      attendeeId: id,
      contactId: null,
      availability: HostRosterInsightAvailability.ready,
      signals: {signal},
      priorAttendedEventCount: 0,
      priorExpectedEventCount: 0,
      priorNoShowCount: 0,
      lastAttendedAt: null,
      attendanceRate: null,
      catchSpend: const [],
    );

ProviderContainer _container({
  required Stream<List<Event>> events,
  Stream<HostAttentionProjection>? attention,
  Future<HostAttendanceOutboxSummary>? outbox,
}) {
  final container = ProviderContainer.test(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value(_uid)),
      watchActiveEventsForOrganizerProvider(
        _request.eventsQuery,
      ).overrideWith((ref) => events),
      hostAttentionProjectionProvider(
        'org-1',
      ).overrideWith((ref) => attention ?? Stream.value(_projection(const []))),
      hostTodayAttendanceOutboxProvider(_uid).overrideWith(
        (ref) => outbox ?? Future.value(const HostAttendanceOutboxSummary([])),
      ),
      hostAnalyticsRepositoryProvider.overrideWithValue(
        const HostFixtureAnalyticsRepository(),
      ),
      hostAnalyticsDeviceTimezoneProvider.overrideWith(
        (ref) async => 'Asia/Kolkata',
      ),
      watchEventAttendeesProvider('tonight').overrideWith(
        (ref) => Stream.value([
          _attendee('Aanya Mehta'),
          _attendee('Ishaan Sen'),
          _attendee('Kabir Rao'),
          _attendee('Zoya Merchant'),
        ]),
      ),
      hostEventRosterInsightsProvider('tonight').overrideWith(
        (ref) => Stream.value(
          HostEventRosterInsights(
            eventId: 'tonight',
            organizerId: 'org-1',
            cutoffAt: todayNow,
            sourceCoverage: HostRosterInsightCoverage.exact,
            spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
            rows: [
              _rosterRow('r1', HostRosterInsightSignal.firstTime),
              _rosterRow('r2', HostRosterInsightSignal.firstTime),
              _rosterRow('r3', HostRosterInsightSignal.returning),
            ],
            computedAt: todayNow,
          ),
        ),
      ),
    ],
  );
  container.listen(hostTodayControllerProvider(_request), (_, _) {});
  return container;
}

Future<HostTodayState> _settle(ProviderContainer container) async {
  await flushTestEventQueue();
  return container.read(hostTodayControllerProvider(_request));
}

void main() {
  test('reads loading until the events listener reports', () async {
    final container = _container(events: const Stream.empty());

    expect(
      container.read(hostTodayControllerProvider(_request)).status,
      HostTodayStatus.loading,
    );
  });

  test('a failed events listener is the screen error', () async {
    final container = _container(
      events: Stream.error(StateError('events failed')),
    );

    final state = await _settle(container);
    expect(state.status, HostTodayStatus.error);
    expect(state.error, isA<StateError>());
  });

  test(
    'features the live or next event and lists the rest of the week',
    () async {
      final container = _container(
        events: Stream.value([
          todayEvent('later', start: DateTime(2026, 10, 30, 19)),
          todayEvent('tonight', start: DateTime(2026, 10, 27, 19, 30)),
          todayEvent('over', start: DateTime(2026, 10, 27, 9)),
          todayEvent('far', start: DateTime(2026, 11, 10, 19)),
          todayEvent(
            'cancelled',
            start: DateTime(2026, 10, 28, 19),
            status: EventLifecycleStatus.cancelled,
          ),
        ]),
      );

      final state = await _settle(container);
      expect(state.status, HostTodayStatus.content);
      expect(state.tonight!.event.id, 'tonight');
      expect(state.tonight!.isLive, isFalse);
      expect(state.tonight!.newFaces, 2);
      expect(state.tonight!.people, ['Aanya Mehta', 'Ishaan Sen', 'Kabir Rao']);
      expect(state.thisWeek.map((event) => event.id), ['later']);
      expect(state.actions, [
        HostTodayAction.openDoor,
        HostTodayAction.messageGuests,
      ]);
    },
  );

  test('an event under way comes first and adds the live console', () async {
    final container = _container(
      events: Stream.value([
        todayEvent('tonight', start: DateTime(2026, 10, 27, 19, 30)),
        todayEvent('now', start: DateTime(2026, 10, 27, 17)),
      ]),
    );

    final state = await _settle(container);
    expect(state.tonight!.event.id, 'now');
    expect(state.tonight!.isLive, isTrue);
    expect(state.actions, contains(HostTodayAction.liveConsole));
  });

  test('nothing within the week is the empty day', () async {
    final container = _container(
      events: Stream.value([
        todayEvent('far', start: DateTime(2026, 11, 10, 19)),
      ]),
    );

    final state = await _settle(container);
    expect(state.status, HostTodayStatus.empty);
    expect(state.tonight, isNull);
    expect(state.thisWeek, isEmpty);
    expect(state.actions, [HostTodayAction.newEvent]);
  });

  test(
    'orders the work by urgency and counts what is due before doors',
    () async {
      final container = _container(
        events: Stream.value([
          todayEvent('tonight', start: DateTime(2026, 10, 27, 19, 30)),
        ]),
        attention: Stream.value(
          _projection([
            todayAttention(
              'later',
              urgency: HostAttentionUrgency.upcoming,
              dueAt: DateTime(2026, 10, 28, 9),
            ),
            todayAttention('now', dueAt: DateTime(2026, 10, 27, 18)),
            todayAttention(
              'soon',
              urgency: HostAttentionUrgency.soon,
              dueAt: DateTime(2026, 10, 27, 19),
            ),
          ]),
        ),
      );

      final state = await _settle(container);
      expect(state.needsYou.items.map((item) => item.id), [
        'now',
        'soon',
        'later',
      ]);
      expect(state.needsYou.dueBeforeDoors, 2);
      expect(state.needsYou.checking, isFalse);
      expect(state.needsYou.failed, isFalse);
    },
  );

  test('an incomplete evaluation is still checking', () async {
    final container = _container(
      events: Stream.value(const <Event>[]),
      attention: Stream.value(
        _projection(const [], coverage: HostAttentionSourceCoverage.overCap),
      ),
    );

    final state = await _settle(container);
    expect(state.needsYou.checking, isTrue);
  });

  test('a failed attention listener fails only Needs you', () async {
    final container = _container(
      events: Stream.value(const <Event>[]),
      attention: Stream.error(StateError('attention failed')),
    );

    final state = await _settle(container);
    expect(state.status, HostTodayStatus.empty);
    expect(state.needsYou.failed, isTrue);
  });

  test('device-local attendance writes join the work', () async {
    final container = _container(
      events: Stream.value(const <Event>[]),
      outbox: Future.value(
        HostAttendanceOutboxSummary([
          HostAttendanceOutboxEntry(
            clientOperationId: 'op-1',
            eventId: 'tonight',
            attendeeId: 'a-1',
            desiredCheckedIn: true,
            expectedRevision: 1,
            createdAt: todayNow.subtract(const Duration(hours: 1)),
            status: HostAttendanceOutboxStatus.needsReview,
          ),
        ]),
      ),
    );

    final state = await _settle(container);
    expect(state.needsYou.items.single.kind, HostAttentionKind.attendanceSync);
  });

  test('the thirty-day report gives bookings and ticket sales', () async {
    final container = _container(events: Stream.value(const <Event>[]));

    final state = await _settle(container);
    expect(state.statsPending, isFalse);
    expect(state.lastThirtyDays.map((stat) => stat.kind), [
      HostTodayStatKind.bookings,
      HostTodayStatKind.ticketSales,
    ]);
    expect(state.lastThirtyDays.first.value, 126);
    expect(state.lastThirtyDays.first.previousValue, 107);
    expect(state.lastThirtyDays.last.currencyCode, 'INR');
  });
}
