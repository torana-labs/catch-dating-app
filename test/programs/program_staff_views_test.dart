import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_staff_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int>? duties,
    int? expiresAt,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : expiresAt ?? hour,
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'arrivalRoutes': <String, int>{},
    'tripRoutes': <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  Map<String, Object?> staffRow(
    String uid, {
    bool revoked = false,
    bool approved = true,
    int? activeUntil,
    String? name = 'Arjun',
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': uid,
    'displayName': name,
    'phoneLastFour': name == null ? null : '0001',
    'duties': [
      {
        'duty': 'hotelDesk',
        'pickupPointIds': <String>[],
        'hotelIds': ['h1'],
        'functionIds': <String>[],
        'expiresAtMillis': hour,
      },
    ],
    'revoked': revoked,
    'ownerApproved': approved,
    'activeFromMillis': 0,
    'activeUntilMillis': activeUntil,
    'expiresAtMillis': hour,
    'revision': 3,
    'version': 1,
  };

  Future<FakeFirebaseFirestore> seeded(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    for (final row in [
      staffRow('c-live', activeUntil: hour),
      staffRow('b-expired', activeUntil: ms(const Duration(minutes: -5))),
      staffRow('d-revoked', revoked: true, activeUntil: hour),
      staffRow('a-pending', approved: false),
      staffRow('e-anonymized', name: null),
    ]) {
      await firestore
          .collection('programStaffViews')
          .doc('p1__${row['uid']}')
          .set(row);
    }
    return firestore;
  }

  ProgramStaffViewsRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    return ProgramStaffViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  test('the owner reads the team, each status told from the facts', () async {
    final firestore = await seeded(access(role: 'manager'));
    final list = await repository(firestore).watchStaff('p1', 'u1').first;
    expect(list.nextCursor, isNull);
    expect(list.members.map((member) => member.uid), [
      'a-pending',
      'b-expired',
      'c-live',
      'd-revoked',
      'e-anonymized',
    ]);
    expect(list.members.map((member) => member.status), [
      ProgramStaffStatus.approvalRequired,
      ProgramStaffStatus.expired,
      ProgramStaffStatus.active,
      ProgramStaffStatus.revoked,
      ProgramStaffStatus.expired,
    ]);
    expect(list.members.last.displayName, isEmpty);
    expect(list.members[2].displayName, 'Arjun');
    expect(list.members[2].duties.single.duty, ProgramStaffDuty.hotelDesk);
  });

  test('the administration duty reads it; any other duty is denied', () async {
    final admin = await seeded(access(duties: {'programAdmin': hour}));
    expect(
      (await repository(admin).watchStaff('p1', 'u1').first).members,
      hasLength(5),
    );
    final coordinator = await seeded(
      access(duties: {'programCoordinator': hour}),
    );
    await expectLater(
      repository(coordinator).watchStaff('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('an expired administration duty stops the list offline', () async {
    final gone = ms(const Duration(seconds: -1));
    final firestore = await seeded(
      access(duties: {'programAdmin': gone}, expiresAt: gone),
    );
    await expectLater(
      repository(firestore).watchStaff('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('a grant written elsewhere appears with no new subscription', () async {
    final firestore = await seeded(access(role: 'manager'));
    final seen = <int>[];
    final subscription = repository(
      firestore,
    ).watchStaff('p1', 'u1').listen((list) => seen.add(list.members.length));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 5);
    await firestore
        .collection('programStaffViews')
        .doc('p1__f-new')
        .set(staffRow('f-new', activeUntil: hour));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 6);
    await subscription.cancel();
  });

  test('a long team is read past one page', () async {
    final firestore = await seeded(access(role: 'manager'));
    for (var i = 0; i < 120; i++) {
      final uid = 'x${i.toString().padLeft(3, '0')}';
      await firestore
          .collection('programStaffViews')
          .doc('p1__$uid')
          .set(staffRow(uid, activeUntil: hour));
    }
    final list = await repository(
      firestore,
    ).watchStaff('p1', 'u1').firstWhere((list) => list.members.length == 125);
    expect(list.members, hasLength(125));
  });
}
