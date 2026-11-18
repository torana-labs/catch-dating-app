import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  Map<String, Object?> doc(DateTime dutyEnds) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': 'staff',
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': dutyEnds.millisecondsSinceEpoch,
    'duties': {'functionLead': dutyEnds.millisecondsSinceEpoch},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': {'functionLead': dutyEnds.millisecondsSinceEpoch},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': {'*': dutyEnds.millisecondsSinceEpoch},
    'revision': 2,
    'version': 1,
  };

  test('reads the derived id and reports a missing view as null', () async {
    final firestore = FakeFirebaseFirestore();
    final repository = ProgramAccessRepository(
      firestore,
      AppClock.custom(() => now),
    );
    expect(await repository.watchView('p1', 'u1').first, isNull);

    await firestore
        .collection('programAccessViews')
        .doc('p1__u1')
        .set(doc(now.add(const Duration(hours: 1))));
    final view = await repository.watchView('p1', 'u1').first;
    expect(view!.programId, 'p1');
    expect(view.revision, 2);
    expect(view.holdsDuty(ProgramStaffDuty.functionLead, now), isTrue);
  });

  test('the state is live, then denied by the clock alone', () async {
    final firestore = FakeFirebaseFirestore();
    await firestore
        .collection('programAccessViews')
        .doc('p1__u1')
        .set(doc(now.add(const Duration(milliseconds: 40))));
    var offset = Duration.zero;
    final repository = ProgramAccessRepository(
      firestore,
      AppClock.custom(() => now.add(offset)),
    );
    final states = <ProgramAccessState>[];
    final subscription = repository.watchState('p1', 'u1').listen(states.add);
    await Future<void>.delayed(const Duration(milliseconds: 10));
    expect(states.single.isLive, isTrue);

    offset = const Duration(milliseconds: 50);
    await Future<void>.delayed(const Duration(milliseconds: 60));
    expect(states.last.denial, ProgramAccessDenial.expired);
    expect(states.last.epoch, greaterThan(states.first.epoch));
    await subscription.cancel();
  });
}
