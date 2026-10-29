import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  group('SavedEventRepository', () {
    late FakeFirebaseFirestore firestore;
    late SavedEventRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = SavedEventRepository(firestore);
    });

    test('saveRun writes only the saved-event edge document', () async {
      await repository.saveEvent(uid: 'runner-1', eventId: 'event-1');

      final edge = await firestore
          .collection('savedEvents')
          .doc(savedEventId(uid: 'runner-1', eventId: 'event-1'))
          .get();
      final user = await firestore.collection('users').doc('runner-1').get();

      expect(edge.data(), containsPair('uid', 'runner-1'));
      expect(edge.data(), containsPair('eventId', 'event-1'));
      expect(edge.data(), contains('savedAt'));
      expect(user.exists, isFalse);
    });

    test('unsaveRun deletes only the saved-event edge document', () async {
      final id = savedEventId(uid: 'runner-1', eventId: 'event-1');
      await firestore.collection('savedEvents').doc(id).set({
        'uid': 'runner-1',
        'eventId': 'event-1',
        'savedAt': DateTime(2026),
      });

      await repository.unsaveEvent(uid: 'runner-1', eventId: 'event-1');

      final edge = await firestore.collection('savedEvents').doc(id).get();
      final user = await firestore.collection('users').doc('runner-1').get();

      expect(edge.exists, isFalse);
      expect(user.exists, isFalse);
    });

    test(
      'watchSavedEvent emits null when the saved-event edge is absent',
      () async {
        await expectLater(
          repository.watchSavedEvent(uid: 'runner-1', eventId: 'event-1'),
          emits(isNull),
        );
      },
    );

    test('watchSavedEvent emits the matching saved-event edge', () async {
      final id = savedEventId(uid: 'runner-1', eventId: 'event-1');
      await firestore.collection('savedEvents').doc(id).set({
        'uid': 'runner-1',
        'eventId': 'event-1',
        'savedAt': DateTime(2026),
      });

      await expectLater(
        repository.watchSavedEvent(uid: 'runner-1', eventId: 'event-1'),
        emits(
          isA<SavedEvent>()
              .having((savedEvent) => savedEvent.id, 'id', id)
              .having((savedEvent) => savedEvent.uid, 'uid', 'runner-1')
              .having((savedEvent) => savedEvent.eventId, 'eventId', 'event-1'),
        ),
      );
    });

    test(
      'watchSavedEventDetailsForUser streams saved event documents in time order',
      () async {
        final later = buildEvent(
          id: 'event-later',
          startTime: DateTime(2026, 1, 3, 7),
        );
        final earlier = buildEvent(
          id: 'event-earlier',
          startTime: DateTime(2026, 1, 2, 7),
        );
        await firestore.collection('events').doc(later.id).set({
          ...later.toJson(),
          'publicationState': 'published',
        });
        await firestore.collection('events').doc(earlier.id).set({
          ...earlier.toJson(),
          'publicationState': 'published',
        });
        await firestore.collection('events').doc('private-basics').set({
          'organizerId': 'club-1',
          'publicationState': 'private',
          'status': 'active',
        });
        await firestore
            .collection('savedEvents')
            .doc(savedEventId(uid: 'runner-1', eventId: later.id))
            .set({
              'uid': 'runner-1',
              'eventId': later.id,
              'savedAt': DateTime(2026),
            });
        await firestore
            .collection('savedEvents')
            .doc(savedEventId(uid: 'runner-1', eventId: earlier.id))
            .set({
              'uid': 'runner-1',
              'eventId': earlier.id,
              'savedAt': DateTime(2026),
            });
        await firestore
            .collection('savedEvents')
            .doc(savedEventId(uid: 'runner-1', eventId: 'deleted-event'))
            .set({
              'uid': 'runner-1',
              'eventId': 'deleted-event',
              'savedAt': DateTime(2026),
            });
        await firestore
            .collection('savedEvents')
            .doc(savedEventId(uid: 'runner-1', eventId: 'private-basics'))
            .set({
              'uid': 'runner-1',
              'eventId': 'private-basics',
              'savedAt': DateTime(2026),
            });

        await expectLater(
          repository.watchSavedEventDetailsForUser(uid: 'runner-1'),
          emits([
            isA<Event>().having((event) => event.id, 'id', earlier.id),
            isA<Event>().having((event) => event.id, 'id', later.id),
          ]),
        );
      },
    );
  });
}
