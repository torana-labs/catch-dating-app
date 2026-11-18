import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events/guest_event_card_fixtures.dart';

void main() {
  test(
    'history titles read only the named events, the guest own rows',
    () async {
      final db = FakeFirebaseFirestore();
      Future<void> status(String eventId, String uid) =>
          db.collection('guestEventStatuses').doc('${eventId}_$uid').set({
            'eventId': eventId,
            'uid': uid,
            'participationStatus': 'attended',
            'eventCard': guestEventCardData(eventId: eventId),
          });
      for (var index = 0; index < 40; index++) {
        await status('e$index', 'me');
      }
      await status('e1', 'them');
      final repository = GuestEventCardsRepository(db);

      final cards = await repository
          .watchOwnCardsForEvents(
            uid: 'me',
            eventIds: [for (var index = 0; index < 35; index += 1) 'e$index'],
          )
          .first;

      expect(cards.keys.toSet(), {for (var i = 0; i < 35; i++) 'e$i'});
      expect(
        await repository.watchOwnCardsForEvents(uid: 'me', eventIds: []).first,
        isEmpty,
      );
    },
  );

  test('the query key ignores order and duplicates', () {
    expect(
      OwnEventCardsQuery(uid: 'me', eventIds: const ['b', 'a', 'b']),
      OwnEventCardsQuery(uid: 'me', eventIds: const ['a', 'b']),
    );
  });
}
