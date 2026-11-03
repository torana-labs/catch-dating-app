import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../event_success/event_assistance_checkpoint_fixtures.dart';
import '../../event_success/event_assistance_checkpoint_request_fixtures.dart';
import '../../event_success/event_assistance_departure_history_fixtures.dart';
import '../../event_success/event_assistance_movement_view_fixtures.dart';

void main() {
  test('the app clock never runs before the server evaluation', () {
    final evaluated = Timestamp.fromMillisecondsSinceEpoch(5000);
    expect(
      movementViewNow(DateTime.fromMillisecondsSinceEpoch(10), [
        {'evaluatedAt': evaluated},
        null,
      ]),
      5000,
    );
    expect(
      movementViewNow(DateTime.fromMillisecondsSinceEpoch(9000), [
        {'evaluatedAt': evaluated},
      ]),
      9000,
    );
  });

  test('reporter choices are the manager\'s, for thirty minutes, and drop '
      'reporters whose access ends first', () {
    final wire = requestReadyWire();
    final reporters =
        (checkpointBody(wire)['reporterOptions']! as Map)['reporters']! as List;
    (reporters.last as Map)['validUntil'] = 1600;
    final doc = checkpointViewDoc(
      wire,
      scope: checkpointScope,
      evaluatedAt: 900,
    );
    expect(
      ((doc['view']! as Map)['reporterOptions']! as Map).keys,
      unorderedEquals(['sourceHash', 'reporters']),
    );
    EventAssistanceCheckpointView read(int now) =>
        EventAssistanceCheckpointResult.fromCallableData(
          checkpointReadResponse(
            doc,
            scope: checkpointScope,
            actorUid: 'host-1',
            now: now,
          ),
          expectedScope: checkpointScope,
        ).view;
    final early = read(1000).reporterOptions.value!;
    expect(early.actorUid, 'host-1');
    expect(early.validUntil, 1000 + checkpointReporterChoiceWindow);
    expect(early.reporters.map((r) => r.operatorId), ['host-1', 'sweep-2']);
    expect(
      read(1700).reporterOptions.value!.reporters.map((r) => r.operatorId),
      ['host-1'],
    );
  });

  test('a history page reads one extra row to name the next page', () {
    final query = historyQuery();
    final row = (historyResponse()['rosters']! as List).first as Map;
    Map<String, Object?> rowAt(int revision) => {
      ...row.cast<String, Object?>(),
      'progressRevision': revision,
      'confirmedAt': 1000000 + revision,
      'destination': null,
      'label': null,
      'sourceState': 'destinationNotRecorded',
      'checkpoint': null,
    };
    final rows = [
      for (var r = 11; r >= 1; r--)
        departureViewDoc(rowAt(r), scope: query.group, evaluatedAt: 1500000),
    ];
    final progress = groupProgressViewDoc(
      {
        'view': <String, Object?>{'revision': 11},
      },
      scope: query.group,
      evaluatedAt: 1500000,
      endAt: 3000000,
    );
    final page = EventAssistanceDepartureHistoryPage.fromCallableData(
      departureHistoryReadResponse(
        progress: progress,
        rosters: rows,
        query: query,
        actorUid: historyActor,
        now: 2000000,
      ),
      expectedQuery: query,
      expectedActorUid: historyActor,
    );
    expect(page.rosters, hasLength(departureHistoryPageSize));
    expect(page.nextBeforeRevision, 2);
    expect(page.progressRevision, 11);
  });
}
