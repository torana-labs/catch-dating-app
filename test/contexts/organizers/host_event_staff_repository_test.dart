import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

final _now = DateTime.utc(2026, 11, 17, 12);

Map<String, Object?> _grant(
  String uid, {
  String eventId = 'event',
  String organizerId = 'org',
  String status = 'active',
  required Duration expiresIn,
  required int updatedMinutesAgo,
}) => {
  'organizerId': organizerId,
  'eventId': eventId,
  'uid': uid,
  'displayName': 'Staff $uid',
  'phoneLastFour': '1234',
  'role': 'checkInOperator',
  'permissions': ['viewRoster'],
  'status': status,
  'createdBy': 'host',
  'createdAt': Timestamp.fromDate(_now),
  'expiresAt': Timestamp.fromDate(_now.add(expiresIn)),
  'revokedBy': null,
  'revokedAt': null,
  'updatedAt': Timestamp.fromDate(
    _now.subtract(Duration(minutes: updatedMinutesAgo)),
  ),
  'revision': 3,
};

void main() {
  test(
    'lists the event\'s grants, newest change first, with live status',
    () async {
      final db = FakeFirebaseFirestore();
      final grants = db.collection('eventStaffGrants');
      await grants
          .doc('event_a')
          .set(
            _grant(
              'a',
              expiresIn: const Duration(hours: 2),
              updatedMinutesAgo: 5,
            ),
          );
      await grants
          .doc('event_b')
          .set(
            _grant(
              'b',
              status: 'revoked',
              expiresIn: const Duration(hours: 2),
              updatedMinutesAgo: 1,
            ),
          );
      await grants
          .doc('event_c')
          .set(
            _grant(
              'c',
              expiresIn: const Duration(minutes: -1),
              updatedMinutesAgo: 30,
            ),
          );
      await grants
          .doc('other_d')
          .set(
            _grant(
              'd',
              eventId: 'other',
              expiresIn: const Duration(hours: 2),
              updatedMinutesAgo: 0,
            ),
          );
      final repository = HostEventStaffRepository(
        _NoFunctions(),
        db,
        AppClock.custom(() => _now),
      );
      final list = await repository.listStaff(
        organizerId: 'org',
        eventId: 'event',
      );
      expect(list.eventId, 'event');
      expect(list.members.map((member) => member.uid), ['b', 'a', 'c']);
      expect(list.members.map((member) => member.status), [
        HostEventStaffStatus.revoked,
        HostEventStaffStatus.active,
        HostEventStaffStatus.expired,
      ]);
      expect(list.members[1].displayName, 'Staff a');
      expect(list.members[1].revision, 3);
      expect(
        list.members[1].expiresAt.isAtSameMomentAs(
          _now.add(const Duration(hours: 2)),
        ),
        isTrue,
      );
    },
  );
}
