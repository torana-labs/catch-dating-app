import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

void main() {
  test(
    'completion is the organizer milestone document, while listened to',
    () async {
      final db = FakeFirebaseFirestore();
      final repository = EventRehearsalRepository(
        _NoFunctions(),
        firestore: db,
      );
      final delivered = <bool>[];
      final subscription = repository
          .watchRehearsalCompletion('org-1')
          .listen(delivered.add);
      addTearDown(subscription.cancel);
      await pumpEventQueue();
      expect(delivered, [false]);
      await db.collection('eventRehearsalMilestones').doc('org-1').set({
        'organizerId': 'org-1',
      });
      await pumpEventQueue();
      expect(delivered.last, isTrue);
    },
  );

  test('a milestone for another organizer is not completion', () async {
    final db = FakeFirebaseFirestore();
    await db.collection('eventRehearsalMilestones').doc('org-1').set({
      'organizerId': 'org-2',
    });
    expect(
      await EventRehearsalRepository(
        _NoFunctions(),
        firestore: db,
      ).watchRehearsalCompletion('org-1').first,
      isFalse,
    );
  });

  test('without Firestore the read is unavailable, not false', () {
    expect(
      () => EventRehearsalRepository(
        _NoFunctions(),
      ).watchRehearsalCompletion('org-1'),
      throwsStateError,
    );
  });
}
