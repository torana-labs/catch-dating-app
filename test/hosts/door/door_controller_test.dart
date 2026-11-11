import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_staff_presence_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_ticket_code_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/hosts/door/door_controller.dart';
import 'package:catch_dating_app/hosts/door/door_scan_state.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'door_fixtures.dart';

/// The attendance outbox path on fakes: each change is recorded and comes
/// back as the outbox summary the test chose.
class _FakeRoster implements HostOperationalRosterController {
  final calls = <(String, bool)>[];
  HostAttendanceOutboxSummary next = const HostAttendanceOutboxSummary([]);
  Completer<void>? gate;

  @override
  Future<HostAttendanceOutboxSummary> setAttendance({
    required String eventId,
    required EventAttendee attendee,
    required String clientOperationId,
  }) async {
    calls.add((attendee.id, !attendee.isCheckedIn));
    await gate?.future;
    return next;
  }

  @override
  Future<HostAttendanceOutboxSummary> loadAttendanceOutbox(String eventId) =>
      Future.value(next);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// The door's ticket lookup on a fake: each code names the attendee the
/// test chose, or fails the way the test chose.
class _RecordingErrorLogger extends ErrorLogger {
  _RecordingErrorLogger() : super.silent();

  final errors = <Object?>[];

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) => errors.add(error);
}

class _FakeTickets implements EventTicketCodeRepository {
  final codes = <String, EventTicketResolution>{};
  Object? error;

  @override
  Future<EventTicketResolution> resolveTicketCode({
    required String eventId,
    required String ticketCode,
  }) async {
    if (error case final error?) throw error;
    return codes[ticketCode]!;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

EventTicketResolution _ticket(
  String attendeeId, {
  EventAttendeeStatus status = EventAttendeeStatus.registered,
}) => EventTicketResolution(
  eventId: doorEventId,
  attendeeId: attendeeId,
  displayName: attendeeId,
  status: status,
  attendanceRevision: 0,
  partySize: 1,
);

EventStaffPresence _presence(
  String uid,
  String name, {
  Duration left = const Duration(minutes: 1),
}) => EventStaffPresence(
  eventId: doorEventId,
  uid: uid,
  displayName: name,
  role: EventStaffPresenceRole.operator,
  lastSeenAt: doorNow,
  expiresAt: doorNow.add(left),
);

HostAttendanceOutboxEntry _entry(
  String attendeeId, {
  required bool checkedIn,
  HostAttendanceOutboxStatus status = HostAttendanceOutboxStatus.pending,
}) => HostAttendanceOutboxEntry(
  eventId: doorEventId,
  attendeeId: attendeeId,
  desiredCheckedIn: checkedIn,
  expectedRevision: 0,
  clientOperationId: 'op-$attendeeId',
  createdAt: doorNow,
  status: status,
);

HostDoorGuest _guest(DoorState state, String id) =>
    state.guests.singleWhere((guest) => guest.attendeeId == id);

void main() {
  group('doorGuests', () {
    test('sorts attendees into arriving, in, waitlist and asked with their '
        'labels and history', () {
      final guests = doorGuests(
        attendees: [
          doorAttendee('dp', 'Dev Patel', paidMinor: 99800),
          doorAttendee(
            'as',
            'Aanya Sharma',
            status: EventAttendeeStatus.checkedIn,
            checkedInAt: DateTime(2026, 10, 27, 19, 38),
          ),
          doorAttendee(
            'zm',
            'Zoya Merchant',
            status: EventAttendeeStatus.waitlisted,
            uid: 'u-zm',
          ),
          doorAttendee(
            'nr',
            'Nikhil Rao',
            status: EventAttendeeStatus.waitlisted,
            uid: 'u-nr',
          ),
          doorAttendee(
            'gone',
            'Gone Guest',
            status: EventAttendeeStatus.cancelled,
          ),
        ],
        participations: [
          doorParticipation('u-zm', request: EventJoinRequestStatus.pending),
          doorParticipation('u-nr', waitlistedAt: doorNow),
        ],
        insights: doorLabels([
          doorLabel('dp', firstTime: true),
          doorLabel('as', prior: 4),
        ]),
        session: const DoorSessionState(),
      );

      expect(guests.map((guest) => (guest.attendeeId, guest.status)), [
        ('dp', HostDoorGuestStatus.arriving),
        ('as', HostDoorGuestStatus.checkedIn),
        ('nr', HostDoorGuestStatus.waitlist),
        ('zm', HostDoorGuestStatus.asked),
      ]);
      expect(guests.first.firstTime, isTrue);
      expect(guests.first.paidMinor, 99800);
      expect(guests[1].priorNights, 4);
      expect(guests[2].waitlistPosition, 1);
      expect(guests[2].canAct, isTrue);
    });

    test('a row that holds several places carries them to the door', () {
      final guests = doorGuests(
        attendees: [
          doorAttendee('dp', 'Dev Patel', partySize: 3),
          doorAttendee('rk', 'Rhea Kapoor'),
        ],
        participations: const [],
        insights: null,
        session: const DoorSessionState(),
      );

      expect(guests.map((guest) => guest.partySize), [3, 1]);
    });

    test('a pending outbox change flips the row and marks it syncing', () {
      final guests = doorGuests(
        attendees: [doorAttendee('dp', 'Dev Patel')],
        participations: const [],
        insights: null,
        session: DoorSessionState(
          outbox: HostAttendanceOutboxSummary([_entry('dp', checkedIn: true)]),
        ),
      );

      expect(guests.single.status, HostDoorGuestStatus.checkedIn);
      expect(guests.single.syncing, isTrue);
      expect(guests.single.canAct, isFalse);
    });

    test('a refused change leaves the row where the server has it', () {
      final guests = doorGuests(
        attendees: [doorAttendee('dp', 'Dev Patel')],
        participations: const [],
        insights: null,
        session: DoorSessionState(
          outbox: HostAttendanceOutboxSummary([
            _entry(
              'dp',
              checkedIn: true,
              status: HostAttendanceOutboxStatus.needsReview,
            ),
          ]),
        ),
      );

      expect(guests.single.status, HostDoorGuestStatus.arriving);
      expect(guests.single.syncing, isFalse);
    });

    test('an offered waitlist place cannot be offered again', () {
      final guests = doorGuests(
        attendees: [
          doorAttendee(
            'nr',
            'Nikhil Rao',
            status: EventAttendeeStatus.waitlisted,
            uid: 'u-nr',
          ),
        ],
        participations: [
          doorParticipation('u-nr', offer: EventWaitlistOfferStatus.active),
        ],
        insights: null,
        session: const DoorSessionState(),
      );

      expect(guests.single.offered, isTrue);
      expect(guests.single.canAct, isFalse);
    });
  });

  test('the door team is everyone else whose heartbeat has not lapsed', () {
    expect(
      doorTeam(
        presence: [
          _presence('host-1', 'Me'),
          _presence('staff-1', 'Kabir'),
          _presence('staff-2', 'Gone', left: const Duration(minutes: -1)),
          _presence('staff-3', 'Priya'),
        ],
        selfUid: 'host-1',
        now: doorNow,
      ),
      ['Kabir', 'Priya'],
    );
    expect(doorTeam(presence: null, selfUid: null, now: doorNow), isEmpty);
  });

  group('doorController', () {
    late StreamController<List<EventAttendee>> attendees;
    late _FakeRoster roster;
    late ProviderContainer container;

    late _FakeTickets tickets;
    late _RecordingErrorLogger errors;

    setUp(() {
      errors = _RecordingErrorLogger();
      attendees = StreamController<List<EventAttendee>>.broadcast();
      roster = _FakeRoster();
      tickets = _FakeTickets();
      container = ProviderContainer.test(
        overrides: [
          watchEventAttendeesProvider(
            doorEventId,
          ).overrideWith((ref) => attendees.stream),
          watchEventParticipationsForEventProvider(
            doorEventId,
          ).overrideWith((ref) => Stream.value(const <EventParticipation>[])),
          hostEventRosterInsightsProvider(doorEventId).overrideWith(
            (ref) => Stream.value(
              const HostEventRosterInsights.missing(doorEventId),
            ),
          ),
          watchEventProvider(
            doorEventId,
          ).overrideWith((ref) => Stream.value(null)),
          hostOperationalRosterControllerProvider.overrideWithValue(roster),
          eventTicketCodeRepositoryProvider.overrideWithValue(tickets),
          watchEventStaffPresenceProvider(
            doorEventId,
          ).overrideWith((ref) => Stream.value([_presence('host-1', 'Me')])),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          errorLoggerProvider.overrideWithValue(errors),
        ],
      );
      addTearDown(attendees.close);
    });

    test('is loading until the attendees arrive, then shows them', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      expect(sub.read().status, DoorStatus.loading);

      attendees.add([doorAttendee('dp', 'Dev Patel')]);
      await flushTestEventQueue();

      expect(sub.read().status, DoorStatus.content);
      expect(sub.read().expected, 1);
      expect(sub.read().checkedIn, 0);
    });

    test('check in flips the row through the outbox and the listener '
        'confirms it; nothing is invalidated', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      attendees.add([doorAttendee('dp', 'Dev Patel')]);
      await flushTestEventQueue();

      roster.gate = Completer<void>();
      final command = container
          .read(doorSessionProvider(doorEventId).notifier)
          .toggleAttendance('dp');
      await flushTestEventQueue();

      expect(roster.calls, [('dp', true)]);
      expect(_guest(sub.read(), 'dp').status, HostDoorGuestStatus.checkedIn);
      expect(_guest(sub.read(), 'dp').busy, isTrue);

      roster.gate!.complete();
      await command;
      // The server has the change but the listener has not delivered it:
      // the row stays where it is going.
      expect(_guest(sub.read(), 'dp').status, HostDoorGuestStatus.checkedIn);

      attendees.add([
        doorAttendee(
          'dp',
          'Dev Patel',
          status: EventAttendeeStatus.checkedIn,
          checkedInAt: doorNow,
          revision: 1,
        ),
      ]);
      await flushTestEventQueue();

      final guest = _guest(sub.read(), 'dp');
      expect(guest.status, HostDoorGuestStatus.checkedIn);
      expect(guest.busy, isFalse);
      expect(guest.checkedInAt, doorNow);
      expect(container.read(doorSessionProvider(doorEventId)).flips, isEmpty);
    });

    test('a failed check in puts the row back', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      attendees.add([doorAttendee('dp', 'Dev Patel')]);
      await flushTestEventQueue();

      roster.gate = Completer<void>()..completeError(StateError('offline'));
      await expectLater(
        container
            .read(doorSessionProvider(doorEventId).notifier)
            .toggleAttendance('dp'),
        throwsStateError,
      );

      expect(_guest(sub.read(), 'dp').status, HostDoorGuestStatus.arriving);
      expect(_guest(sub.read(), 'dp').busy, isFalse);
    });

    test('filter and search narrow the shown guests', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      attendees.add([
        doorAttendee('dp', 'Dev Patel'),
        doorAttendee('rk', 'Rhea Kapoor'),
        doorAttendee(
          'as',
          'Aanya Sharma',
          status: EventAttendeeStatus.checkedIn,
        ),
      ]);
      await flushTestEventQueue();
      final session = container.read(doorSessionProvider(doorEventId).notifier)
        ..setQuery('rhea');

      expect(sub.read().shown.map((guest) => guest.name), ['Rhea Kapoor']);
      session
        ..setQuery('')
        ..setFilter(DoorFilter.checkedIn);
      expect(sub.read().shown.map((guest) => guest.name), ['Aanya Sharma']);
    });

    test('a scanned ticket checks its guest in through the outbox and the '
        'success sheet shows them', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      attendees.add([doorAttendee('dp', 'Dev Patel')]);
      await flushTestEventQueue();
      tickets.codes['code-dp'] = _ticket('dp');
      final session = container.read(doorSessionProvider(doorEventId).notifier);

      expect(await session.scanTicket('code-dp'), isNull);

      expect(roster.calls, [('dp', true)]);
      expect(sub.read().scanned?.name, 'Dev Patel');
      expect(sub.read().scanned?.status, HostDoorGuestStatus.checkedIn);

      session.clearScanned();
      expect(sub.read().scanned, isNull);
    });

    test('a ticket for a guest already in shows them without a second '
        'check in; undo checks them out', () async {
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      attendees.add([
        doorAttendee(
          'dp',
          'Dev Patel',
          status: EventAttendeeStatus.checkedIn,
          checkedInAt: doorNow,
        ),
      ]);
      await flushTestEventQueue();
      tickets.codes['code-dp'] = _ticket(
        'dp',
        status: EventAttendeeStatus.checkedIn,
      );
      final session = container.read(doorSessionProvider(doorEventId).notifier);

      expect(await session.scanTicket('code-dp'), isNull);
      expect(roster.calls, isEmpty);
      expect(sub.read().scanned?.name, 'Dev Patel');

      await session.undoScanned();
      expect(roster.calls, [('dp', false)]);
      expect(sub.read().scanned, isNull);
    });

    test('a ticket that checks nobody in says why', () async {
      attendees.add([doorAttendee('dp', 'Dev Patel')]);
      final sub = container.listen(
        doorControllerProvider(doorEventId),
        (_, _) {},
      );
      addTearDown(sub.close);
      await flushTestEventQueue();
      final session = container.read(doorSessionProvider(doorEventId).notifier);

      tickets.codes['code-wait'] = _ticket(
        'dp',
        status: EventAttendeeStatus.waitlisted,
      );
      expect(await session.scanTicket('code-wait'), DoorScanNotice.notBooked);
      for (final (reason, notice) in const [
        ('invalidTicket', DoorScanNotice.notATicket),
        ('ticketCancelled', DoorScanNotice.cancelled),
        ('somethingElse', DoorScanNotice.unavailable),
      ]) {
        tickets.error = FirebaseFunctionsException(
          code: 'failed-precondition',
          message: 'refused',
          details: {'reason': reason},
        );
        expect(await session.scanTicket('code-any'), notice);
      }
      // Only the unrecognised refusal is logged; a known refusal is an answer.
      expect(errors.errors, hasLength(1));
      tickets.error = StateError('ticket service down');
      expect(await session.scanTicket('code-any'), DoorScanNotice.unavailable);
      expect(errors.errors.last, same(tickets.error));
      expect(roster.calls, isEmpty);
      expect(sub.read().scanned, isNull);
    });
  });
}
