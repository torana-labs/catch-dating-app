import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_shell_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.now();
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;

  Map<String, Object?> accessView({
    String role = 'staff',
    String status = 'active',
    Map<String, int>? workPickup,
    Map<String, int>? workHotel,
    Map<String, int>? workFunction,
    int? dutyEnds,
  }) {
    final ends = dutyEnds ?? ms(const Duration(hours: 1));
    return {
      'programId': 'p1',
      'organizerId': 'o1',
      'uid': 'u1',
      'ownerUid': 'owner',
      'role': role,
      'status': status,
      'activeFromMillis': 0,
      'expiresAtMillis': role == 'manager' ? null : ends,
      'duties': {'airportGreeter': ends},
      'pickupAll': <String, int>{},
      'pickupScoped': {'airportGreeter__pp1': ends},
      'hotelAll': <String, int>{},
      'hotelScoped': <String, int>{},
      'functionAll': <String, int>{},
      'functionScoped': <String, int>{},
      'workPickup': workPickup ?? {'pp1': ends},
      'workHotel': workHotel ?? <String, int>{},
      'workFunction': workFunction ?? <String, int>{},
      'assignments': [
        {
          'duty': 'airportGreeter',
          'pickupPointIds': ['pp1'],
          'hotelIds': <String>[],
          'expiresAtMillis': ends,
        },
      ],
      'grantExpiresAtMillis': ends,
      'revision': 2,
      'version': 1,
    };
  }

  Map<String, Object?> resource(
    String kind,
    String id, {
    bool active = true,
    String? label,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'kind': kind,
    'resourceId': id,
    'active': active,
    'label': label ?? '$kind $id',
    'pickupKind': kind == 'pickupPoint' ? 'airport' : null,
    'iataCode': kind == 'pickupPoint' ? 'DEL' : null,
    'terminal': null,
    'venueName': kind == 'function' ? 'Lawn' : null,
    'startsAtMillis': kind == 'function' ? 1000 : null,
    'endsAtMillis': kind == 'function' ? 5000 : null,
    'checkInEnabled': kind == 'function' ? true : null,
    'status': kind == 'function' ? 'scheduled' : null,
    'expectedCount': kind == 'function' ? 10 : null,
    'checkedInCount': kind == 'function' ? 4 : null,
    'version': 1,
  };

  Future<FakeFirebaseFirestore> seeded({
    Map<String, Object?>? view,
    List<Map<String, Object?>> resources = const [],
  }) async {
    final firestore = FakeFirebaseFirestore();
    await firestore
        .collection('programAccessViews')
        .doc('p1__u1')
        .set(view ?? accessView());
    await firestore.collection('programWorkSummaries').doc('p1').set({
      'programId': 'p1',
      'organizerId': 'o1',
      'title': 'Sharma wedding',
      'kind': 'wedding',
      'timezone': 'Asia/Kolkata',
      'status': 'active',
      'capabilities': ['arrivalsTransport'],
      'vehicleClasses': <Map<String, Object?>>[],
      'version': 1,
    });
    for (final row in resources) {
      await firestore
          .collection('programResourceViews')
          .doc('p1__${row['kind']}__${row['resourceId']}')
          .set(row);
    }
    return firestore;
  }

  ProgramWorkShellRepository shell(FakeFirebaseFirestore firestore) {
    const clock = AppClock.custom(DateTime.now);
    return ProgramWorkShellRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  test('a scoped staff member gets exactly their named stations', () async {
    final firestore = await seeded(
      resources: [
        resource('pickupPoint', 'pp1', label: 'DEL T3'),
        resource('pickupPoint', 'pp2', label: 'Not mine'),
        resource('hotel', 'h1'),
      ],
    );
    final access = await shell(firestore).watchWorkAccess('p1', 'u1').first;
    expect(access.title, 'Sharma wedding');
    expect(access.actorRole, ProgramActorRole.staff);
    expect(access.pickupPoints.map((p) => p.label), ['DEL T3']);
    expect(access.pickupPoints.single.iataCode, 'DEL');
    expect(access.hotels, isEmpty, reason: 'no hotel is on the work list');
    expect(access.duties.single.duty, ProgramStaffDuty.airportGreeter);
    expect(access.duties.single.pickupPointIds, {'pp1'});
    expect(access.grantExpiresAt, isNotNull);
    expect(
      access.hasDuty(ProgramStaffDuty.airportGreeter, now: DateTime.now()),
      isTrue,
    );
  });

  test(
    'an all-reaching list shows every active label, never inactive',
    () async {
      final firestore = await seeded(
        view: accessView(
          workHotel: {'*': ms(const Duration(hours: 1))},
          workFunction: {'*': ms(const Duration(hours: 1))},
        ),
        resources: [
          resource('hotel', 'h1'),
          resource('hotel', 'h2', active: false),
          resource('function', 'f1'),
        ],
      );
      final access = await shell(firestore).watchWorkAccess('p1', 'u1').first;
      expect(access.hotels.map((h) => h.hotelId), ['h1']);
      expect(access.functions.single.expectedCount, 10);
      expect(access.functions.single.checkedInCount, 4);
      expect(access.functions.single.status, ProgramFunctionStatus.scheduled);
    },
  );

  test('the owner reads everything and has no duties or grant end', () async {
    final firestore = await seeded(
      view: accessView(role: 'manager'),
      resources: [resource('pickupPoint', 'pp9'), resource('hotel', 'h1')],
    );
    final access = await shell(firestore).watchWorkAccess('p1', 'u1').first;
    expect(access.isManager, isTrue);
    expect(access.duties, isEmpty);
    expect(access.grantExpiresAt, isNull);
    expect(access.pickupPoints.single.pickupPointId, 'pp9');
    expect(access.hotels, hasLength(1));
  });

  test('a revoked grant fails the read with a permission error', () async {
    final firestore = await seeded(
      view: accessView(status: 'inactive'),
      resources: [resource('pickupPoint', 'pp1')],
    );
    await expectLater(
      shell(firestore).watchWorkAccess('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('an expired grant fails the read with no new snapshot', () async {
    final firestore = await seeded(
      view: accessView(dutyEnds: ms(const Duration(seconds: -1))),
      resources: [resource('pickupPoint', 'pp1')],
    );
    await expectLater(
      shell(firestore).watchWorkAccess('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('a widened work list reopens the read with the new resources', () async {
    final firestore = await seeded(
      resources: [
        resource('pickupPoint', 'pp1'),
        resource('pickupPoint', 'pp2', label: 'New station'),
      ],
    );
    final stream = shell(firestore).watchWorkAccess('p1', 'u1');
    final seen = <List<String>>[];
    final subscription = stream.listen(
      (access) => seen.add([for (final p in access.pickupPoints) p.label]),
    );
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(seen.last, ['pickupPoint pp1']);

    await firestore
        .collection('programAccessViews')
        .doc('p1__u1')
        .set(
          accessView(
            workPickup: {
              'pp1': ms(const Duration(hours: 1)),
              'pp2': ms(const Duration(hours: 1)),
            },
          ),
        );
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(seen.last, ['pickupPoint pp1', 'New station']);
    await subscription.cancel();
  });
}
