import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final startsAt = Timestamp.fromDate(DateTime.utc(2026, 11, 6, 17));
  final endsAt = Timestamp.fromDate(DateTime.utc(2026, 11, 6, 17, 15));

  test('a doubles slot reads partner, opponents and court', () {
    final slot = EventSuccessRotationSlot.fromJson({
      'slotId': 'round-0-court-1-side-0',
      'roundIndex': 0,
      'label': 'Round 1 · Court 2',
      'startsAt': startsAt,
      'endsAt': endsAt,
      'peerUid': 'tara',
      'partnerUid': 'tara',
      'opponentUids': ['nikhil', 'zoya'],
      'courtIndex': 1,
      'peerCount': 3,
      'compatibility': 'social',
    });

    expect(slot.isDoubles, isTrue);
    expect(slot.partnerUid, 'tara');
    expect(slot.opponentUids, ['nikhil', 'zoya']);
    expect(slot.courtIndex, 1);
    expect(slot.toJson()['opponentUids'], ['nikhil', 'zoya']);
  });

  test('a singles slot stays one peer and writes no doubles fields', () {
    final slot = EventSuccessRotationSlot.fromJson({
      'roundIndex': 0,
      'startsAt': startsAt,
      'endsAt': endsAt,
      'peerUid': 'tara',
      'compatibility': 'social',
    });

    expect(slot.isDoubles, isFalse);
    final json = slot.toJson();
    expect(json.containsKey('opponentUids'), isFalse);
    expect(json.containsKey('partnerUid'), isFalse);
    expect(json.containsKey('courtIndex'), isFalse);
  });

  test('the bench note and minutes round-trip', () {
    final sitOut = EventSuccessSitOutSlot.fromJson({
      'roundIndex': 2,
      'label': 'Round 3',
      'startsAt': startsAt,
      'endsAt': endsAt,
      'benchNote': 'commonArea',
      'whySummary': 'Sitting out this round.',
      'whyCodes': ['sit_out'],
    });
    expect(sitOut.benchNote, EventSuccessBenchNote.commonArea);
    expect(sitOut.toJson()['benchNote'], 'commonArea');

    final fairness = EventSuccessRotationFairness.fromJson({
      'assignedRoundCount': 3,
      'sitOutRoundCount': 5,
      'uniquePeerCount': 9,
      'repeatPeerCount': 0,
      'assignedMinutes': 45,
      'benchMinutes': 75,
    });
    expect(fairness.assignedMinutes, 45);
    expect(fairness.benchMinutes, 75);
    expect(
      EventSuccessRotationFairness.fromJson({
        'assignedRoundCount': 1,
      }).assignedMinutes,
      isNull,
    );
  });
}
