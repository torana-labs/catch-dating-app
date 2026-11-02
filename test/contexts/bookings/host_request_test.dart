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
  test('only join requests count as decisions waiting', () {
    final requests = HostRequests.fromJson({
      'complete': true,
      'rows': [_row(), _row(kind: 'waitlist', position: 1)],
    });
    expect(requests.rows, hasLength(2));
    expect(requests.decisionCount, 1);
  });

  test('a person waiting on two events is two rows', () {
    final row = HostRequest.fromJson(_row());
    expect(row.key, 'trivia_zoya');
    expect(row.kind, HostRequestKind.request);
    expect(row.hasLiveOffer, isFalse);
  });

  test('a live offer is read from when it runs out', () {
    final row = HostRequest.fromJson(
      _row(kind: 'waitlist', position: 1, expires: 1763100000000),
    );
    expect(row.hasLiveOffer, isTrue);
    expect(row.waitlistPosition, 1);
  });
}
