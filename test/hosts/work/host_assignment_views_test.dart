import 'package:catch_dating_app/contexts/programmes/data/host_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;

  Map<String, Object?> row(String uid, String kind, String scopeId) => {
    'uid': uid,
    'kind': kind,
    'scopeId': scopeId,
    'organizerId': 'org_1',
    'title': 'Sharma-Rao Wedding',
    'organizerName': 'Sharma Weddings',
    'status': 'active',
    'activeFromMillis': 0,
    'grantExpiresAtMillis': kind == 'team' ? null : ms(const Duration(days: 1)),
    'duties': kind == 'team'
        ? const <Object?>[]
        : [
            {
              'duty': 'hotelDesk',
              'hotelIds': ['h1'],
              'expiresAtMillis': ms(const Duration(days: 1)),
            },
          ],
    'version': 1,
  };

  test('lists only the account\'s own rows, live', () async {
    final firestore = FakeFirebaseFirestore();
    final views = firestore.collection('hostAssignmentViews');
    await views.doc('staff_1__program_p1').set(row('staff_1', 'program', 'p1'));
    await views.doc('staff_2__program_p2').set(row('staff_2', 'program', 'p2'));
    final repository = FirebaseHostWorkRepository(
      firestore,
      AppClock.custom(() => now),
    );
    final seen = <HostWorkAssignments>[];
    final subscription = repository
        .watchAssignments('staff_1')
        .listen(seen.add);
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last.assignments.map((a) => a.scopeId), ['p1']);
    expect(seen.last.shellEntry, HostWorkShellEntry.workShell);
    await views.doc('staff_1__team_org_1').set(row('staff_1', 'team', 'org_1'));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last.shellEntry, HostWorkShellEntry.managerShell);
    await subscription.cancel();
  });
}
