import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _row({
  String kind = 'request',
  int? position,
  int? expires,
}) => {
  'uid': 'zoya',
  'kind': kind,
  'eventId': 'trivia',
  'eventName': 'Tuesday Trivia',
  'eventStartMillis': 1763164800000,
  'placesLeft': 2,
  'capacityLimit': 32,
  'name': 'Zoya Merchant',
  'askedAtMillis': 1763000000000,
  'waitlistPosition': position,
  'attendedEventCount': 3,
  'offerExpiresAtMillis': expires,
};

void main() {
  test('event views read every row, soonest event and oldest ask first', () {
    final requests = HostRequests.fromViews(
      [
        {
          'complete': true,
          'rows': [
            {..._row(), 'eventId': 'later', 'eventStartMillis': 1763164900000},
          ],
        },
        {
          'complete': true,
          'rows': [
            {..._row(), 'uid': 'nikhil', 'askedAtMillis': 2},
            {..._row(kind: 'waitlist', position: 1), 'askedAtMillis': 1},
          ],
        },
      ],
      hidden: const {},
      moreEvents: false,
    );
    expect(requests.rows.map((row) => row.key), [
      'trivia_zoya',
      'trivia_nikhil',
      'later_zoya',
    ]);
    expect(requests.complete, isTrue);
  });

  test('a block either way hides the person; a cut view is incomplete', () {
    final requests = HostRequests.fromViews(
      [
        {
          'complete': false,
          'rows': [
            _row(),
            {..._row(), 'uid': 'nikhil'},
          ],
        },
      ],
      hidden: const {'zoya'},
      moreEvents: false,
    );
    expect(requests.rows.map((row) => row.uid), ['nikhil']);
    expect(requests.complete, isFalse);
    expect(
      HostRequests.fromViews(
        const [],
        hidden: const {},
        moreEvents: true,
      ).complete,
      isFalse,
    );
  });

  test('a person waiting on two events is two rows', () {
    final row = HostRequest.fromJson(_row());
    expect(row.key, 'trivia_zoya');
    expect(row.kind, HostRequestKind.request);
    expect(row.hasLiveOfferAt(DateTime(2025)), isFalse);
  });

  test('an offer is live until the clock passes its expiry', () {
    final row = HostRequest.fromJson(
      _row(kind: 'waitlist', position: 1, expires: 1763100000000),
    );
    final expiry = DateTime.fromMillisecondsSinceEpoch(1763100000000);
    expect(
      row.hasLiveOfferAt(expiry.subtract(const Duration(minutes: 1))),
      isTrue,
    );
    expect(row.hasLiveOfferAt(expiry), isFalse);
    expect(row.waitlistPosition, 1);
  });
}
