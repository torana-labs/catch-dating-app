import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('OrganizerFollowRepository', () {
    late FakeFirebaseFirestore firestore;
    late OrganizerFollowRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = OrganizerFollowRepository(firestore);
    });

    test('watchMembership emits null when the edge is absent', () async {
      await expectLater(
        repository.watchFollow(organizerId: 'club-1', uid: 'runner-1'),
        emits(isNull),
      );
    });

    test('watchMembership emits the matching membership edge', () async {
      final id = organizerFollowId(organizerId: 'club-1', uid: 'runner-1');
      await firestore.collection('organizerFollows').doc(id).set({
        'organizerId': 'club-1',
        'uid': 'runner-1',
        'status': OrganizerFollowStatus.active.name,
        'followedAt': DateTime(2026),
        'unfollowedAt': null,
        'pushNotificationsEnabled': true,
      });

      await expectLater(
        repository.watchFollow(organizerId: 'club-1', uid: 'runner-1'),
        emits(
          isA<OrganizerFollow>()
              .having((membership) => membership.id, 'id', id)
              .having(
                (membership) => membership.organizerId,
                'organizerId',
                'club-1',
              )
              .having((membership) => membership.uid, 'uid', 'runner-1'),
        ),
      );
    });
  });
}
