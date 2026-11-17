import 'package:catch_dating_app/contexts/safety/data/messaging_permission_repository.dart';
import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _Functions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _row(
  String uid,
  String scope,
  String? organizerId, {
  String status = 'optedIn',
  String? receiptId = 'receipt-1',
}) => {
  'uid': uid,
  'scope': scope,
  'organizerId': organizerId,
  'preference': {
    'status': status,
    'receiptId': receiptId,
    'purposes': {
      'marketing': {'status': status, 'receiptId': receiptId},
    },
  },
  'version': 1,
};

void main() {
  late FakeFirebaseFirestore db;
  late MessagingPermissionRepository repository;

  setUp(() {
    db = FakeFirebaseFirestore();
    repository = MessagingPermissionRepository(_Functions(), db);
  });

  Future<void> seed(String id, Map<String, Object?> data) =>
      db.collection('guestMessagingPermissions').doc(id).set(data);

  test(
    'a guest without rows has an unknown Catch row and no organizers',
    () async {
      final page = await repository.list('person');

      expect(page.catchPermission.organizerId, isNull);
      expect(page.catchPermission.status, MessagingPermissionStatus.unknown);
      expect(page.catchPermission.receiptId, isNull);
      expect(page.organizers, isEmpty);
      expect(page.nextCursor, isNull);
    },
  );

  test('reads only the guest own rows', () async {
    await seed('catchpref_person', _row('person', 'catch', null));
    await seed('orgpref_a', _row('person', 'organizer', 'org-a'));
    await seed('orgpref_b', _row('person', 'organizer', 'org-gone'));
    await seed('orgpref_c', _row('someone', 'organizer', 'org-a'));

    final page = await repository.list('person');

    expect(page.catchPermission.status, MessagingPermissionStatus.optedIn);
    expect(page.catchPermission.receiptId, 'receipt-1');
    expect(page.organizers.map((row) => row.organizerId), [
      'org-a',
      'org-gone',
    ]);
    expect(page.organizers.map((row) => row.organizerName), [null, null]);
    expect(
      page
          .organizers
          .first
          .purposes[MessagingPermissionPurpose.marketing]!
          .receiptId,
      'receipt-1',
    );
  });

  test('a full page names the last row as the cursor', () async {
    for (
      var index = 0;
      index < MessagingPermissionRepository.pageSize + 1;
      index++
    ) {
      final id = 'orgpref_${index.toString().padLeft(2, '0')}';
      await seed(id, _row('person', 'organizer', 'org-$index'));
    }

    final first = await repository.list('person');
    expect(first.organizers, hasLength(MessagingPermissionRepository.pageSize));
    expect(first.nextCursor, 'orgpref_19');
    // fake_cloud_firestore cannot continue a document-id cursor; the
    // Firestore emulator and production can.
  });
}
