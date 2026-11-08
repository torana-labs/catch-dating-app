import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_guests_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/events_controller.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

import '../../test_pump_helpers.dart';
import 'events_fixtures.dart';

final _eventsRequest = HostEventsRequest(
  organizerId: eventsOrganizerId,
  now: eventsNow,
);

HostEventRosterInsight _row(String id, HostRosterInsightSignal signal) =>
    HostEventRosterInsight(
      attendeeId: id,
      contactId: null,
      availability: HostRosterInsightAvailability.ready,
      signals: {signal},
      priorAttendedEventCount: 2,
      priorExpectedEventCount: 2,
      priorNoShowCount: 0,
      lastAttendedAt: null,
      attendanceRate: null,
      catchSpend: const [],
    );

final _insights = HostEventRosterInsights(
  eventId: tonightEvent.id,
  organizerId: eventsOrganizerId,
  cutoffAt: eventsNow,
  sourceCoverage: HostRosterInsightCoverage.exact,
  spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
  rows: [
    _row('a-dev', HostRosterInsightSignal.firstTime),
    _row('a-aanya', HostRosterInsightSignal.regular),
  ],
  computedAt: eventsNow,
);

final _attendees = [
  eventsAttendee('a-aanya', 'Aanya Sharma'),
  eventsAttendee('a-dev', 'Dev Patel', status: EventAttendeeStatus.checkedIn),
  eventsAttendee(
    'a-nikhil',
    'Nikhil Rao',
    status: EventAttendeeStatus.waitlisted,
  ),
  eventsAttendee('a-old', 'Old Guest', status: EventAttendeeStatus.cancelled),
];

EventParticipation _asked(String uid) => EventParticipation(
  id: '${tonightEvent.id}_$uid',
  eventId: tonightEvent.id,
  organizerId: eventsOrganizerId,
  uid: uid,
  status: EventParticipationStatus.waitlisted,
  createdAt: eventsNow,
  updatedAt: eventsNow,
  hostApprovalStatus: EventJoinRequestStatus.pending,
);

ProviderContainer _container(List<Override> overrides) =>
    ProviderContainer.test(overrides: overrides);

void main() {
  group('hostEventsController', () {
    List<Override> base(Stream<List<Event>> upcoming) => [
      watchActiveEventsForOrganizerProvider(
        ActiveOrganizerEventsQuery(
          organizerId: eventsOrganizerId,
          day: eventsNow,
        ),
      ).overrideWith((ref) => upcoming),
      authenticatedSessionProvider.overrideWithValue(const AsyncLoading()),
      hostEventsProgrammesProvider(eventsOrganizerId).overrideWith(
        (ref) async => [
          const OrganizerProgramListRow(
            programId: 'wedding',
            title: 'Wedding',
            kind: 'wedding',
            status: 'active',
            timezone: 'Asia/Kolkata',
            revision: 1,
            functionCount: 5,
          ),
        ],
      ),
    ];

    test('reads loading until the coming events listener reports', () {
      final container = _container(base(const Stream.empty()));
      container.listen(hostEventsControllerProvider(_eventsRequest), (_, _) {});
      expect(
        container.read(hostEventsControllerProvider(_eventsRequest)).status,
        HostEventsStatus.loading,
      );
    });

    test('lists the coming events and the programmes; history waits for '
        'the session', () async {
      final container = _container(base(Stream.value(comingEvents)));
      container.listen(hostEventsControllerProvider(_eventsRequest), (_, _) {});
      await flushTestEventQueue();
      final state = container.read(
        hostEventsControllerProvider(_eventsRequest),
      );
      expect(state.status, HostEventsStatus.ready);
      expect(state.upcoming, comingEvents);
      expect(state.tonight(eventsNow), tonightEvent);
      expect(state.programmes.single.title, 'Wedding');
      expect(state.historyLoading, isTrue);
      expect(state.later(eventsNow).single.events.map((e) => e.id), [
        'supper',
        'clay',
      ]);
    });

    test('a failed listener is the error state', () async {
      final container = _container(
        base(Stream<List<Event>>.error(StateError('offline'))),
      );
      container.listen(hostEventsControllerProvider(_eventsRequest), (_, _) {});
      await flushTestEventQueue();
      expect(
        container.read(hostEventsControllerProvider(_eventsRequest)).status,
        HostEventsStatus.error,
      );
    });
  });

  group('hostEventWorkspaceController', () {
    test('composes new faces, people, the plan, the door and no sales '
        'without a session', () async {
      final container = _container([
        watchEventProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(tonightEvent)),
        hostEventRosterInsightsProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(_insights)),
        watchEventAttendeesProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(_attendees)),
        watchEventSuccessPlanProvider(
          tonightEvent.id,
        ).overrideWith((ref) => Stream.value(eventsPlan())),
        hostEventWorkspaceStaffProvider(tonightEvent.id).overrideWith(
          (ref) async => HostEventStaffList(
            eventId: tonightEvent.id,
            members: [
              HostEventStaffMember(
                uid: 'kabir',
                displayName: 'Kabir Rao',
                phoneLastFour: '1234',
                status: HostEventStaffStatus.active,
                expiresAt: eventsDoors,
                revision: 1,
              ),
              HostEventStaffMember(
                uid: 'gone',
                displayName: 'Gone Away',
                phoneLastFour: '9999',
                status: HostEventStaffStatus.revoked,
                expiresAt: eventsDoors,
                revision: 2,
              ),
            ],
          ),
        ),
        authenticatedSessionProvider.overrideWithValue(const AsyncLoading()),
      ]);
      container.listen(
        hostEventWorkspaceControllerProvider(eventsRequest),
        (_, _) {},
      );
      await flushTestEventQueue();
      final state = container.read(
        hostEventWorkspaceControllerProvider(eventsRequest),
      );
      expect(state.status, HostEventWorkspaceStatus.ready);
      expect(state.newFaces, 1);
      expect(state.people, hasLength(3));
      expect(state.planSet, isTrue);
      expect(state.door, ['Kabir Rao']);
      expect(state.doorChecked, isTrue);
      expect(state.ticketSalesMinor, isNull);
    });

    test('an event of another organizer reads as missing', () async {
      final container = _container([
        watchEventProvider(tonightEvent.id).overrideWith(
          (ref) => Stream.value(tonightEvent.copyWith(organizerId: 'other')),
        ),
      ]);
      container.listen(
        hostEventWorkspaceControllerProvider(eventsRequest),
        (_, _) {},
      );
      await flushTestEventQueue();
      expect(
        container
            .read(hostEventWorkspaceControllerProvider(eventsRequest))
            .status,
        HostEventWorkspaceStatus.missing,
      );
    });
  });

  test('close-out counts who came and lists the unchecked by name', () async {
    final container = _container([
      watchEventProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(tonightEvent)),
      watchEventAttendeesProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(_attendees)),
    ]);
    container.listen(
      hostEventCloseOutControllerProvider(eventsRequest),
      (_, _) {},
    );
    await flushTestEventQueue();
    final state = container.read(
      hostEventCloseOutControllerProvider(eventsRequest),
    );
    expect(state.status, HostEventCloseOutStatus.ready);
    expect(state.came, 1);
    expect(state.booked, 2);
    expect(state.unchecked.map((a) => a.id), ['a-aanya']);
  });

  test('guests split attendees into lists and name who asked', () async {
    final container = _container([
      watchEventProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(tonightEvent)),
      watchEventAttendeesProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(_attendees)),
      watchEventParticipationsForEventProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value([_asked('u-zoya')])),
      hostEventRosterInsightsProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(_insights)),
      hostEventGuestNamesProvider(
        'u-zoya',
      ).overrideWith((ref) async => {'u-zoya': ('Zoya Merchant', null)}),
    ]);
    container.listen(
      hostEventGuestsControllerProvider(eventsRequest),
      (_, _) {},
    );
    await flushTestEventQueue();
    final state = container.read(
      hostEventGuestsControllerProvider(eventsRequest),
    );
    expect(state.status, HostEventGuestsStatus.ready);
    expect(state.listOf(HostEventGuestList.booked).map((g) => g.name), [
      'Aanya Sharma',
      'Dev Patel',
    ]);
    expect(state.listOf(HostEventGuestList.asked).single.name, 'Zoya Merchant');
    expect(state.listOf(HostEventGuestList.waitlist).single.id, 'a-nikhil');
    expect(state.listOf(HostEventGuestList.cancelled).single.id, 'a-old');
    expect(state.firstTime, 1);
    expect(state.placesLeft, 28);
  });

  test('the plan lists its steps from the doors and its options', () async {
    final container = _container([
      watchEventProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(tonightEvent)),
      watchEventSuccessPlanProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(eventsPlan())),
    ]);
    container.listen(hostEventPlanControllerProvider(eventsRequest), (_, _) {});
    await flushTestEventQueue();
    final state = container.read(
      hostEventPlanControllerProvider(eventsRequest),
    );
    expect(state.status, HostEventPlanStatus.ready);
    expect(state.steps.first.startsAt, eventsDoors);
    expect(state.editable, isTrue);
    expect(state.options.keys, HostEventPlanOption.values);
  });

  test('no saved plan reads as no plan', () async {
    final container = _container([
      watchEventProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(tonightEvent)),
      watchEventSuccessPlanProvider(
        tonightEvent.id,
      ).overrideWith((ref) => Stream.value(null)),
    ]);
    container.listen(hostEventPlanControllerProvider(eventsRequest), (_, _) {});
    await flushTestEventQueue();
    expect(
      container.read(hostEventPlanControllerProvider(eventsRequest)).status,
      HostEventPlanStatus.noPlan,
    );
  });
}
