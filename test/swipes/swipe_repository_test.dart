import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SwipeRepository', () {
    test(
      'recordSwipe writes optional reaction fields for section likes',
      () async {
        final firestore = FakeFirebaseFirestore();
        final repository = SwipeRepository(firestore);

        await repository.recordSwipe(
          swipe: Swipe(
            swiperId: 'runner-1',
            targetId: 'runner-2',
            eventId: 'event-1',
            direction: SwipeDirection.like,
            reactionTargetId: 'profile-prompt-perfectRun',
            reactionTargetType: SwipeReactionTargetType.profilePrompt,
            reactionTargetLabel: 'A perfect event with me looks like...',
            reactionTargetPreview: 'Always up for a sunrise event.',
            comment: '  Same here.  ',
            createdAt: DateTime(2026, 5, 14),
          ),
        );

        final doc = await firestore
            .collection('profileDecisions')
            .doc('runner-1')
            .collection('outgoing')
            .doc('runner-2')
            .get();
        final data = doc.data();

        expect(data?['swiperId'], 'runner-1');
        expect(data?['targetId'], 'runner-2');
        expect(data?['direction'], 'like');
        expect(data?['reactionTargetId'], 'profile-prompt-perfectRun');
        expect(data?['reactionTargetType'], 'profilePrompt');
        expect(
          data?['reactionTargetLabel'],
          'A perfect event with me looks like...',
        );
        expect(
          data?['reactionTargetPreview'],
          'Always up for a sunrise event.',
        );
        expect(data?['comment'], 'Same here.');
      },
    );

    test('recordSwipe omits reaction fields for plain passes', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = SwipeRepository(firestore);

      await repository.recordSwipe(
        swipe: Swipe(
          swiperId: 'runner-1',
          targetId: 'runner-2',
          eventId: 'event-1',
          direction: SwipeDirection.pass,
          createdAt: DateTime(2026, 5, 14),
        ),
      );

      final doc = await firestore
          .collection('profileDecisions')
          .doc('runner-1')
          .collection('outgoing')
          .doc('runner-2')
          .get();
      final data = doc.data();

      expect(data?['direction'], 'pass');
      expect(data?.containsKey('reactionTargetId'), isFalse);
      expect(data?.containsKey('comment'), isFalse);
    });

    test('fetchSwipedUserIds reads profile decision paths', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = SwipeRepository(firestore);

      await firestore
          .collection('profileDecisions')
          .doc('runner-1')
          .collection('outgoing')
          .doc('runner-2')
          .set({'targetId': 'runner-2'});

      await expectLater(
        repository.fetchSwipedUserIds(uid: 'runner-1'),
        completion({'runner-2'}),
      );
    });
  });
}
