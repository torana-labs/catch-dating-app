import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_door_live_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_shell_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // A fixed clock mid-day in the programme's zone, so tonight never straddles
  // midnight.
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int>? duties,
    Map<String, int>? functionAll,
    Map<String, int>? functionScoped,
    Map<String, int>? workFunction,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : hour,
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': functionAll ?? <String, int>{},
    'functionScoped': functionScoped ?? <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': workFunction ?? <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  Map<String, Object?> row(
    String guest,
    String name, {
    String attendance = 'expected',
    int? party,
    bool invited = true,
    String rsvp = 'attending',
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'functionId': 'f1',
    'guestId': guest,
    'displayName': name,
    'invited': invited,
    'rsvpStatus': rsvp,
    'attendanceStatus': attendance,
    'partySize': party,
    'householdLabel': null,
    'responseNote': null,
    'version': 1,
  };

  Future<FakeFirebaseFirestore> seededDoor(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    await firestore.collection('programDoorFunctions').doc('f1').set({
      'programId': 'p1',
      'organizerId': 'o1',
      'functionId': 'f1',
      'name': 'Sangeet',
      'invitationMode': 'allGuests',
      'checkInEnabled': true,
      'status': 'scheduled',
      'startsAtMillis': 1000,
      'endsAtMillis': 5000,
      'venueName': 'Lawn',
      'venueNotes': 'ring Ravi',
      'dressCode': null,
      'instructions': null,
      'expectedCount': 5,
      'checkedInCount': 2,
      'version': 1,
    });
    for (final r in [
      row('g1', 'Meera', attendance: 'checkedIn', party: 3),
      row('g2', 'Anil', party: 2),
      row('g3', 'Walk-in', attendance: 'checkedIn', invited: false),
      row('g4', 'Zed', attendance: 'noShow', rsvp: 'declined'),
    ]) {
      await firestore
          .collection('programDoorRows')
          .doc('f1__${r['guestId']}')
          .set(r);
    }
    await firestore.collection('programDoorJournalViews').doc('j1').set({
      'programId': 'p1',
      'organizerId': 'o1',
      'functionId': 'f1',
      'guestId': 'g1',
      'displayName': 'Meera',
      'action': 'checkIn',
      'occurredAtMillis': 9,
      'partySize': 3,
      'note': null,
      'actorLabel': 'Arjun',
      'version': 1,
    });
    return firestore;
  }

  ProgramDoorLiveRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    final accessRepository = ProgramAccessRepository(firestore, clock);
    return ProgramDoorLiveRepository(
      firestore,
      accessRepository,
      ProgramWorkShellRepository(firestore, accessRepository, clock),
      clock,
    );
  }

  group('door', () {
    test('composes the header, roster, counts and journal tail', () async {
      final firestore = await seededDoor(
        access(
          duties: {'functionCheckIn': hour},
          functionScoped: {'functionCheckIn__f1': hour},
        ),
      );
      final door = await repository(
        firestore,
      ).watchDoorView('p1', 'f1', 'u1').first;
      expect(door.function.name, 'Sangeet');
      expect(door.function.venueNotes, 'ring Ravi');
      expect(door.guests.map((g) => g.displayName), [
        'Anil',
        'Meera',
        'Walk-in',
        'Zed',
      ]);
      expect(door.counts.listedCount, 4);
      // Attending: Meera 3 + Anil 2 + the walk-in 1 (attending, no size).
      expect(door.counts.expectedHeads, 6);
      expect(door.counts.checkedInHeads, 4);
      expect(door.counts.checkedInParties, 2);
      expect(door.counts.noShowCount, 1);
      expect(door.counts.walkInCount, 1);
      expect(door.journal.single.journalId, 'j1');
      expect(door.journal.single.actorLabel, 'Arjun');
      expect(door.accessExpiresAt, isNotNull);
    });

    test('the owner reads any function with no access end', () async {
      final firestore = await seededDoor(access(role: 'manager'));
      final door = await repository(
        firestore,
      ).watchDoorView('p1', 'f1', 'u1').first;
      expect(door.accessExpiresAt, isNull);
      expect(door.guests, hasLength(4));
    });

    test(
      'a function the duty does not cover fails with a permission error',
      () async {
        final firestore = await seededDoor(
          access(
            duties: {'functionCheckIn': hour},
            functionScoped: {'functionCheckIn__f2': hour},
          ),
        );
        await expectLater(
          repository(firestore).watchDoorView('p1', 'f1', 'u1'),
          emitsError(isA<PermissionException>()),
        );
      },
    );

    test(
      'an expired door duty stops the roster with no new snapshot',
      () async {
        final firestore = await seededDoor(
          access(
            duties: {'functionCheckIn': ms(const Duration(seconds: -1))},
            functionAll: {'functionCheckIn': ms(const Duration(seconds: -1))},
          )..['expiresAtMillis'] = ms(const Duration(seconds: -1)),
        );
        await expectLater(
          repository(firestore).watchDoorView('p1', 'f1', 'u1'),
          emitsError(isA<PermissionException>()),
        );
      },
    );

    test('a check-in changes the counts as its row changes', () async {
      final firestore = await seededDoor(access(role: 'manager'));
      final seen = <int>[];
      final subscription = repository(firestore)
          .watchDoorView('p1', 'f1', 'u1')
          .listen((door) => seen.add(door.counts.checkedInParties));
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(seen.last, 2);
      await firestore
          .collection('programDoorRows')
          .doc('f1__g2')
          .set(row('g2', 'Anil', attendance: 'checkedIn', party: 2));
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(seen.last, 3);
      await subscription.cancel();
    });
  });

  group('live board', () {
    Future<FakeFirebaseFirestore> seededBoard(Map<String, Object?> view) async {
      final firestore = FakeFirebaseFirestore();
      await firestore.collection('programAccessViews').doc('p1__u1').set(view);
      await firestore.collection('programWorkSummaries').doc('p1').set({
        'programId': 'p1',
        'organizerId': 'o1',
        'title': 'Wedding',
        'kind': 'wedding',
        'timezone': 'Asia/Kolkata',
        'status': 'active',
        'capabilities': <String>[],
        'vehicleClasses': <Map<String, Object?>>[],
        'version': 1,
      });
      Map<String, Object?> fn(
        String id,
        String name,
        Duration start,
        Duration end, {
        String status = 'scheduled',
      }) => {
        'programId': 'p1',
        'organizerId': 'o1',
        'kind': 'function',
        'resourceId': id,
        'active': true,
        'label': name,
        'pickupKind': null,
        'iataCode': null,
        'terminal': null,
        'venueName': 'Lawn',
        'startsAtMillis': ms(start),
        'endsAtMillis': ms(end),
        'checkInEnabled': true,
        'status': status,
        'expectedCount': 10,
        'checkedInCount': 4,
        'version': 1,
      };
      // Anchor tonight's functions around the current instant, inside one
      // UTC day.
      final functions = [
        fn(
          'done',
          'Mehendi',
          const Duration(minutes: -3),
          const Duration(minutes: -2),
        ),
        fn(
          'now',
          'Sangeet',
          const Duration(minutes: -1),
          const Duration(minutes: 5),
        ),
        fn(
          'next',
          'Dinner',
          const Duration(minutes: 6),
          const Duration(minutes: 7),
        ),
        fn(
          'cancelled',
          'Cancelled',
          const Duration(minutes: 8),
          const Duration(minutes: 9),
          status: 'cancelled',
        ),
      ];
      for (final f in functions) {
        await firestore
            .collection('programResourceViews')
            .doc('p1__function__${f['resourceId']}')
            .set(f);
      }
      Map<String, Object?> alert(
        String id,
        String? duty, {
        String state = 'open',
        String? assignee,
        int? expiresAt,
        int created = 100,
      }) => {
        'programId': 'p1',
        'organizerId': 'o1',
        'alertId': id,
        'source': duty == null ? 'flight' : 'staffAttention',
        'severity': 'warning',
        'title': id,
        'subjectId': 's',
        'createdAtMillis': created,
        'expiresAtMillis': expiresAt,
        'duty': duty,
        'state': state,
        'assigneeUid': assignee,
        'assigneeName': assignee == null ? null : 'Dev',
        'revision': 1,
        'version': 1,
      };
      final alerts = [
        alert(
          'lead-1',
          'functionLead',
          assignee: 'u1',
          created: 300,
          expiresAt: hour,
        ),
        alert('lead-2', 'functionLead', created: 200, expiresAt: hour),
        alert(
          'lead-old',
          'functionLead',
          expiresAt: ms(const Duration(seconds: -1)),
        ),
        alert('desk-1', 'hotelDesk', created: 250, expiresAt: hour),
        alert('flight-1', null, created: 400),
        alert(
          'done-1',
          'functionLead',
          state: 'done',
          created: 500,
          expiresAt: hour,
        ),
      ];
      for (final a in alerts) {
        await firestore
            .collection('programAlertViews')
            .doc('p1__${a['alertId']}')
            .set(a);
      }
      await firestore.collection('programTravelCountViews').doc('p1').set({
        'programId': 'p1',
        'organizerId': 'o1',
        'expected': 5,
        'atCurb': 2,
        'disrupted': 1,
        'version': 1,
      });
      return firestore;
    }

    test(
      'a lead sees its duty\'s alerts, mine, phases and no travel',
      () async {
        final firestore = await seededBoard(
          access(duties: {'functionLead': hour}, workFunction: {'*': hour}),
        );
        final board = await repository(
          firestore,
        ).watchLiveBoard('p1', 'u1').first;
        expect(board.tonight.map((f) => f.name), [
          'Mehendi',
          'Sangeet',
          'Dinner',
        ]);
        expect(board.tonight.map((f) => f.phase), [
          ProgramLivePhase.done,
          ProgramLivePhase.now,
          ProgramLivePhase.next,
        ]);
        expect(board.now!.name, 'Sangeet');
        // Open first, newest first; the expired alert is gone; no other duty's
        // alert and no travel alert.
        expect(board.alerts.map((a) => a.alertId), [
          'lead-1',
          'lead-2',
          'done-1',
        ]);
        expect(board.mine.map((a) => a.alertId), ['lead-1']);
        expect(board.expected, 0);
      },
    );

    test('full reach reads every alert and the travel counts', () async {
      final firestore = await seededBoard(
        access(
          duties: {'programCoordinator': hour, 'functionLead': hour},
          workFunction: {'*': hour},
        ),
      );
      final board = await repository(
        firestore,
      ).watchLiveBoard('p1', 'u1').first;
      expect(board.alerts.map((a) => a.alertId).toSet(), {
        'lead-1',
        'lead-2',
        'desk-1',
        'flight-1',
        'done-1',
      });
      expect(board.expected, 5);
      expect(board.atCurb, 2);
      expect(board.disrupted, 1);
    });

    test('without the lead duty the board is denied', () async {
      final firestore = await seededBoard(
        access(duties: {'airportGreeter': hour}),
      );
      await expectLater(
        repository(firestore).watchLiveBoard('p1', 'u1'),
        emitsError(isA<PermissionException>()),
      );
    });
  });
}
