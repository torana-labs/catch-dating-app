import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events/guest_event_card_fixtures.dart';

void main() {
  test('saved cards read every coming event and the latest past page, by '
      'start', () async {
    final now = DateTime(2026, 11, 18, 12);
    final db = FakeFirebaseFirestore();
    Future<void> saved(String eventId, DateTime start) =>
        db.collection('savedEvents').doc('me_$eventId').set({
          'uid': 'me',
          'eventId': eventId,
          'eventCard': guestEventCardData(
            eventId: eventId,
            startTimeMillis: start.millisecondsSinceEpoch,
          ),
        });
    const pastCount = ReadLimitPolicy.directoryPage + 5;
    for (var day = 1; day <= pastCount; day++) {
      await saved('past-$day', now.subtract(Duration(days: day)));
    }
    await saved('later', now.add(const Duration(days: 9)));
    await saved('soon', now.add(const Duration(days: 1)));
    // Earlier today counts as coming: the boundary is the start of today.
    await saved('today', now.subtract(const Duration(hours: 2)));
    await db.collection('savedEvents').doc('them_soon').set({
      'uid': 'them',
      'eventId': 'soon',
      'eventCard': guestEventCardData(eventId: 'soon'),
    });

    final cards = await GuestEventCardsRepository(
      db,
      clock: AppClock.custom(() => now),
    ).watchSavedCards(uid: 'me').first;
    final ids = cards.map((card) => card.eventId).toList();

    expect(ids, hasLength(ReadLimitPolicy.directoryPage + 3));
    expect(ids.first, 'past-${ReadLimitPolicy.directoryPage}');
    expect(ids.sublist(ids.length - 4), ['past-1', 'today', 'soon', 'later']);
    expect(ids, isNot(contains('past-${ReadLimitPolicy.directoryPage + 1}')));
  });
}
