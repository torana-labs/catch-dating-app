import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);

  Map<String, Object?> view(
    String id, {
    String createdBy = 'u1',
    int startsAt = 100,
    String status = 'active',
    Map<String, Object?> counts = const {},
  }) => {
    'programId': id,
    'organizerId': 'o1',
    'createdBy': createdBy,
    'kind': 'wedding',
    'title': 'Programme $id',
    'timezone': 'Asia/Kolkata',
    'status': status,
    'startsAtMillis': startsAt,
    'endsAtMillis': startsAt + 1000,
    'revision': 2,
    'functionCount': 1,
    ...counts,
  };

  Map<String, Object?> access(
    String programId, {
    String role = 'manager',
    bool organizerManager = false,
  }) => {
    'programId': programId,
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'u1',
    'role': role,
    'status': organizerManager && role != 'manager' ? 'inactive' : 'active',
    'organizerManager': organizerManager,
    'activeFromMillis': 0,
    'expiresAtMillis': null,
    'duties': <String, int>{},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': null,
    'revision': organizerManager && role != 'manager' ? 0 : 1,
    'version': 1,
  };

  OrganizerProgramViewsRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    return OrganizerProgramViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  Future<void> seed(
    FakeFirebaseFirestore firestore,
    String collection,
    String id,
    Map<String, Object?> data,
  ) => firestore.collection(collection).doc(id).set(data);

  group('watchProgrammes', () {
    test('a creator who manages nothing lists only its own programmes, '
        'then the whole organiser once it manages it', () async {
      final firestore = FakeFirebaseFirestore();
      await seed(
        firestore,
        'organizerProgramViews',
        'mine',
        view('mine', startsAt: 200),
      );
      await seed(
        firestore,
        'organizerProgramViews',
        'theirs',
        view('theirs', createdBy: 'u2', startsAt: 300),
      );
      await seed(firestore, 'programAccessViews', 'mine__u1', access('mine'));
      // A view that would list it, so only the creator query keeps it out.
      await seed(
        firestore,
        'programAccessViews',
        'theirs__u1',
        access('theirs'),
      );
      final rows = StreamIterator(
        repository(firestore).watchProgrammes('o1', 'u1'),
      );
      expect(await rows.moveNext(), isTrue);
      expect(rows.current.map((row) => row['programId']), ['mine']);

      await seed(
        firestore,
        'programAccessViews',
        'theirs__u1',
        access('theirs', role: 'staff', organizerManager: true),
      );
      while (await rows.moveNext()) {
        if (rows.current.length == 2) break;
      }
      expect(rows.current.map((row) => row['programId']), ['theirs', 'mine']);
      await rows.cancel();
    });
  });

  group('organizerProgramListRowFromView', () {
    test('carries the counts and derives the replied share', () {
      final row = organizerProgramListRowFromView(
        view(
          'p1',
          counts: {
            'guestCount': 3,
            'repliedGuestCount': 2,
            'flyingInCount': 1,
            'guestCountsAsOfMicros': 5,
            'flyingInCountAsOfMicros': 5,
          },
        ),
        'u1',
      );
      expect(row.guestCount, 3);
      expect(row.flyingInCount, 1);
      expect(row.repliedShare, 0.667);
      expect(row.functionCount, 1);
    });

    test('no guests has no share, and an uncounted view no counts', () {
      final empty = organizerProgramListRowFromView(
        view(
          'p1',
          counts: {'guestCount': 0, 'repliedGuestCount': 0, 'flyingInCount': 0},
        ),
        'u1',
      );
      expect(empty.guestCount, 0);
      expect(empty.repliedShare, isNull);
      final uncounted = organizerProgramListRowFromView(view('p1'), 'u1');
      expect(uncounted.guestCount, isNull);
      expect(uncounted.flyingInCount, isNull);
      expect(uncounted.repliedShare, isNull);
    });

    test('only the creator may archive or unarchive, by status', () {
      final active = organizerProgramListRowFromView(view('p1'), 'u1');
      expect((active.canArchive, active.canUnarchive), (true, false));
      final archived = organizerProgramListRowFromView(
        view('p1', status: 'archived'),
        'u1',
      );
      expect((archived.canArchive, archived.canUnarchive), (false, true));
      final other = organizerProgramListRowFromView(view('p1'), 'u2');
      expect((other.canArchive, other.canUnarchive), (false, false));
    });
  });

  group('createdProgramme', () {
    test('waits for the new programme view to be written', () async {
      final firestore = FakeFirebaseFirestore();
      await seed(
        firestore,
        'organizerProgramViews',
        'other',
        view('other', createdBy: 'u2'),
      );
      final created = repository(
        firestore,
      ).createdProgramme(organizerId: 'o1', uid: 'u1', programId: 'new');
      await Future<void>.delayed(const Duration(milliseconds: 5));
      await seed(firestore, 'organizerProgramViews', 'new', view('new'));
      expect((await created)?['programId'], 'new');
    });

    test('a view not written by the deadline is null', () async {
      final firestore = FakeFirebaseFirestore();
      await seed(
        firestore,
        'organizerProgramViews',
        'new',
        view('new', createdBy: 'u2'),
      );
      expect(
        await repository(firestore).createdProgramme(
          organizerId: 'o1',
          uid: 'u1',
          programId: 'new',
          deadline: const Duration(milliseconds: 20),
        ),
        isNull,
      );
    });
  });
}
