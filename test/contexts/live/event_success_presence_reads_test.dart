import 'package:catch_dating_app/contexts/live/data/event_success_presence_reads.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late FakeFirebaseFirestore db;
  late EventSuccessPresenceReads reads;
  setUp(() {
    db = FakeFirebaseFirestore();
    reads = EventSuccessPresenceReads(db);
  });

  test(
    'heartbeats are read for the organizer and event the query names',
    () async {
      Future<void> heartbeat(String id, Map<String, Object?> data) =>
          db.collection('eventSuccessPresence').doc(id).set({
            'eventId': 'event-1',
            'organizerId': 'org-1',
            'surface': 'flutter',
            'heartbeatAt': Timestamp.fromMillisecondsSinceEpoch(5000),
            ...data,
          });
      await heartbeat('event-1_b', {'uid': 'b'});
      await heartbeat('event-1_a', {
        'uid': 'a',
        'heartbeatAt': Timestamp.fromMillisecondsSinceEpoch(4000),
      });
      await heartbeat('event-2_c', {'uid': 'c', 'eventId': 'event-2'});
      await heartbeat('event-1_d', {'uid': 'd', 'organizerId': 'org-2'});
      await heartbeat('event-1_e', {'uid': 'e', 'heartbeatAt': null});
      await heartbeat('event-1_f', {'uid': ''});
      final rows = await reads
          .watchHeartbeats(organizerId: 'org-1', eventId: 'event-1')
          .first;
      expect(rows, [
        (uid: 'a', heartbeatAtMillis: 4000),
        (uid: 'b', heartbeatAtMillis: 5000),
      ]);
    },
  );

  test('late-arrival placements carry their target round', () async {
    Future<void> placement(String id, Map<String, Object?> data) =>
        db.collection('eventSuccessLateArrivals').doc(id).set({
          'eventId': 'event-1',
          'organizerId': 'org-1',
          'status': 'heldForNextRound',
          'targetRoundIndex': 2,
          'reason': 'Held',
          ...data,
        });
    await placement('event-1_a', {'uid': 'a'});
    await placement('event-1_b', {'uid': 'b', 'targetRoundIndex': 3});
    await placement('event-1_c', {'uid': 'c', 'organizerId': 'org-2'});
    final rows = await reads
        .watchPlacements(organizerId: 'org-1', eventId: 'event-1')
        .first;
    expect(rows, [
      (uid: 'a', targetRoundIndex: 2),
      (uid: 'b', targetRoundIndex: 3),
    ]);
  });
}
