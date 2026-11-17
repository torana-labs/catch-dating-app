import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

DateTime _now() => DateTime.fromMillisecondsSinceEpoch(1000);

Map<String, Object?> _row(String uid, String eventId, int asked) => {
  'uid': uid,
  'kind': 'request',
  'eventId': eventId,
  'eventName': 'Tuesday Trivia',
  'eventStartMillis': 5000,
  'placesLeft': 2,
  'capacityLimit': 32,
  'name': null,
  'askedAtMillis': asked,
  'waitlistPosition': null,
  'attendedEventCount': null,
  'offerExpiresAtMillis': null,
};

Future<void> _view(
  FakeFirebaseFirestore db,
  String eventId, {
  String organizerId = 'org',
  int end = 9000,
  List<Map<String, Object?>> rows = const [],
}) => db.collection('hostEventRequestViews').doc(eventId).set({
  'organizerId': organizerId,
  'eventId': eventId,
  'eventEndMillis': end,
  'rows': rows,
  'complete': true,
  'version': 1,
});

void main() {
  late FakeFirebaseFirestore db;
  late HostRequestsRepository repository;

  setUp(() {
    db = FakeFirebaseFirestore();
    String actor() => 'host';
    repository = HostRequestsRepository(
      db,
      HostSummaryReader(db, actorId: actor),
      actorId: actor,
      clock: const AppClock.custom(_now),
    );
  });

  test('lists coming events of this organizer and follows changes', () async {
    await _view(db, 'trivia', rows: [_row('zoya', 'trivia', 10)]);
    await _view(db, 'over', end: 1000, rows: [_row('old', 'over', 1)]);
    await _view(
      db,
      'theirs',
      organizerId: 'other',
      rows: [_row('x', 'theirs', 1)],
    );
    final seen = <List<String>>[];
    final subscription = repository
        .watch('org')
        .listen(
          (requests) => seen.add([for (final row in requests.rows) row.uid]),
        );
    await pumpEventQueue();
    expect(seen.last, ['zoya']);

    await _view(
      db,
      'trivia',
      rows: [_row('zoya', 'trivia', 10), _row('nikhil', 'trivia', 20)],
    );
    await pumpEventQueue();
    expect(seen.last, ['zoya', 'nikhil']);
    await subscription.cancel();
  });

  test('hides anyone with a block either way with the reader', () async {
    await _view(
      db,
      'trivia',
      rows: [
        _row('zoya', 'trivia', 10),
        _row('nikhil', 'trivia', 20),
        _row('ishaan', 'trivia', 30),
      ],
    );
    await db.collection('blocks').doc('host_zoya').set({
      'blockerUserId': 'host',
      'blockedUserId': 'zoya',
    });
    await db.collection('blocks').doc('ishaan_host').set({
      'blockerUserId': 'ishaan',
      'blockedUserId': 'host',
    });
    final requests = await repository.watch('org').first;
    expect(requests.rows.map((HostRequest row) => row.uid), ['nikhil']);
    expect(requests.complete, isTrue);
  });

  test('a signed-out reader gets an error, not a list', () async {
    final signedOut = HostRequestsRepository(
      db,
      HostSummaryReader(db, actorId: () => null),
      actorId: () => null,
    );
    await expectLater(signedOut.watch('org'), emitsError(isStateError));
  });
}
