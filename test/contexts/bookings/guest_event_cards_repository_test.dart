import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/guest_event_card_fixtures.dart';

void main() {
  late FakeFirebaseFirestore db;
  late GuestEventCardsRepository repository;

  Future<void> status(
    String eventId,
    String uid, {
    String? participationStatus,
    Map<String, Object?>? card,
  }) => db.collection('guestEventStatuses').doc('${eventId}_$uid').set({
    'eventId': eventId,
    'uid': uid,
    'participationStatus': participationStatus,
    'eventCard': card,
  });

  setUp(() async {
    db = FakeFirebaseFirestore();
    repository = GuestEventCardsRepository(db);
    await status(
      'late',
      'me',
      participationStatus: 'signedUp',
      card: guestEventCardData(eventId: 'late', startTimeMillis: 3000),
    );
    await status(
      'early',
      'me',
      participationStatus: 'signedUp',
      card: guestEventCardData(eventId: 'early', startTimeMillis: 1000),
    );
    await status(
      'wait',
      'me',
      participationStatus: 'waitlisted',
      card: guestEventCardData(eventId: 'wait', startTimeMillis: 2000),
    );
    await status(
      'draft',
      'me',
      participationStatus: 'signedUp',
      card: guestEventCardData(eventId: 'draft', publicationState: 'private'),
    );
    await status('nocard', 'me', participationStatus: 'signedUp');
    await status(
      'paid',
      'me',
      card: guestEventCardData(eventId: 'paid', startTimeMillis: 500),
    );
    await status(
      'theirs',
      'them',
      participationStatus: 'signedUp',
      card: guestEventCardData(eventId: 'theirs'),
    );
  });

  test(
    'booked lists read only the guest own published rows, by start',
    () async {
      final signedUp = await repository
          .watchBookedCards(
            uid: 'me',
            statuses: const {EventParticipationStatus.signedUp},
          )
          .first;
      expect(signedUp.map((card) => card.eventId), ['early', 'late']);

      final scheduled = await repository
          .watchBookedCards(
            uid: 'me',
            statuses: const {
              EventParticipationStatus.signedUp,
              EventParticipationStatus.waitlisted,
            },
          )
          .first;
      expect(scheduled.map((card) => card.eventId), ['early', 'wait', 'late']);
    },
  );

  test('history reads only the named events own cards by event id', () async {
    final cards = await repository
        .watchOwnCardsForEvents(
          uid: 'me',
          eventIds: const ['late', 'paid', 'theirs', 'unknown'],
        )
        .first;
    expect(cards.keys.toSet(), {'late', 'paid'});
  });

  test('saved cards come from the guest saved edges, by start', () async {
    for (final (eventId, start) in [('b', 2000), ('a', 1000)]) {
      await db.collection('savedEvents').doc('me_$eventId').set({
        'uid': 'me',
        'eventId': eventId,
        'eventCard': guestEventCardData(
          eventId: eventId,
          startTimeMillis: start,
        ),
      });
    }
    await db.collection('savedEvents').doc('me_pending').set({
      'uid': 'me',
      'eventId': 'pending',
    });

    final saved = await repository.watchSavedCards(uid: 'me').first;
    expect(saved.map((card) => card.eventId), ['a', 'b']);
  });
}
