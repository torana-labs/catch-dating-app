import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('event success assignment ids are stable by event module and user', () {
    expect(
      eventSuccessAssignmentId(
        eventId: 'event-1',
        moduleId: EventSuccessModuleCatalog.microPods.id,
        uid: 'runner-1',
      ),
      'event-1_micro_pods_runner-1',
    );
  });

  test('decodes Firestore assignment data with document id injected', () {
    final createdAt = DateTime(2026, 5, 21, 8);
    final assignment = EventSuccessAssignment.fromJson({
      'id': 'event-1_micro_pods_runner-1',
      'eventId': 'event-1',
      'clubId': 'club-1',
      'uid': 'runner-1',
      'moduleId': 'micro_pods',
      'label': 'Pod A',
      'displayTitle': 'Pod A',
      'displaySubtitle': '4 people in this event pod.',
      'peerUids': ['runner-2', 'runner-3', 'runner-4'],
      'unitKind': 'tables',
      'unitIndex': 0,
      'unitLabel': 'Table A',
      'whySummary': 'Table A balances 3 peers with compatible dyads.',
      'whyCodes': ['table_slot', 'balanced_group'],
      'rotationFairness': {
        'assignedRoundCount': 2,
        'sitOutRoundCount': 1,
        'uniquePeerCount': 3,
        'repeatPeerCount': 0,
      },
      'rotationSlots': [
        <String, Object?>{
          'slotId': 'round-0-pair-0',
          'roundIndex': 0,
          'label': 'Round 1',
          'startsAt': Timestamp.fromDate(createdAt),
          'endsAt': Timestamp.fromDate(
            createdAt.add(const Duration(minutes: 15)),
          ),
          'peerUid': 'runner-2',
          'unitKind': 'pairs',
          'unitIndex': 0,
          'peerCount': 1,
          'compatibility': 'mutual_interest',
          'whySummary': 'Matched with a new partner.',
          'whyCodes': ['pair_slot', 'fresh_peer', 'mutual_interest'],
        },
      ],
      'groupRotationSlots': [
        <String, Object?>{
          'slotId': 'round-1-unit-1',
          'roundIndex': 1,
          'label': 'Round 2',
          'unitLabel': 'Table B',
          'unitKind': 'tables',
          'unitIndex': 1,
          'startsAt': Timestamp.fromDate(
            createdAt.add(const Duration(minutes: 15)),
          ),
          'endsAt': Timestamp.fromDate(
            createdAt.add(const Duration(minutes: 30)),
          ),
          'peerUids': ['runner-3', 'runner-4'],
          'peerCount': 2,
          'compatibility': 'mixed',
          'whySummary': 'Table B balances 2 peers with compatible dyads.',
          'whyCodes': ['table_slot', 'balanced_group'],
        },
      ],
      'sitOutSlots': [
        <String, Object?>{
          'roundIndex': 2,
          'label': 'Round 3',
          'startsAt': Timestamp.fromDate(
            createdAt.add(const Duration(minutes: 30)),
          ),
          'endsAt': Timestamp.fromDate(
            createdAt.add(const Duration(minutes: 45)),
          ),
          'whySummary': 'Planned break to keep rotation counts fair.',
          'whyCodes': ['sit_out'],
        },
      ],
      'source': 'server_v1',
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(createdAt),
    });

    expect(assignment.displayTitle, 'Pod A');
    expect(assignment.peerUids, ['runner-2', 'runner-3', 'runner-4']);
    expect(assignment.unitKind, 'tables');
    expect(assignment.unitIndex, 0);
    expect(assignment.unitLabel, 'Table A');
    expect(assignment.whyCodes, ['table_slot', 'balanced_group']);
    expect(assignment.rotationFairness?.sitOutRoundCount, 1);
    expect(assignment.rotationSlots.single.peerUid, 'runner-2');
    expect(assignment.rotationSlots.single.compatibility, 'mutual_interest');
    expect(assignment.rotationSlots.single.slotId, 'round-0-pair-0');
    expect(assignment.rotationSlots.single.whyCodes, [
      'pair_slot',
      'fresh_peer',
      'mutual_interest',
    ]);
    expect(assignment.groupRotationSlots.single.unitLabel, 'Table B');
    expect(assignment.groupRotationSlots.single.peerCount, 2);
    expect(assignment.sitOutSlots.single.whyCodes, ['sit_out']);
    expect(assignment.allPeerUids, ['runner-2', 'runner-3', 'runner-4']);
    expect(assignment.toJson(), isNot(contains('id')));
    expect(assignment.toJson()['rotationFairness'], isA<Map>());
    expect(
      assignment.toJson()['sitOutSlots'],
      isA<List<Object?>>().having((slots) => slots.length, 'length', 1),
    );
    expect(
      assignment.toJson()['groupRotationSlots'],
      isA<List<Object?>>().having((slots) => slots.length, 'length', 1),
    );
  });
}
