import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events/guest_event_card_fixtures.dart';

void main() {
  test('attended cards read one history page, newest first', () async {
    final db = FakeFirebaseFirestore();
    const attended = ReadLimitPolicy.historyPage + 5;
    for (var index = 0; index < attended; index++) {
      await db.collection('guestEventStatuses').doc('e${index}_me').set({
        'eventId': 'e$index',
        'uid': 'me',
        'participationStatus': 'attended',
        'eventCard': guestEventCardData(
          eventId: 'e$index',
          startTimeMillis: 1000 + index,
        ),
      });
    }
    final container = ProviderContainer.test(
      overrides: [
        guestEventCardsRepositoryProvider.overrideWithValue(
          GuestEventCardsRepository(db),
        ),
      ],
    );

    final provider = watchAttendedEventCardsProvider('me');
    container.listen(provider, (_, _) {});
    final cards = await container.read(provider.future);

    expect(cards, hasLength(ReadLimitPolicy.historyPage));
    expect(cards.first.eventId, 'e${attended - 1}');
    expect(cards.last.eventId, 'e5');
  });
}
