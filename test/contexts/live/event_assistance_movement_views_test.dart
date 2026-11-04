import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_support.dart';
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
      liveViewNow(DateTime.fromMillisecondsSinceEpoch(10), [
        {'evaluatedAt': evaluated},
        null,
      ]),
      5000,
    );
    expect(
      liveViewNow(DateTime.fromMillisecondsSinceEpoch(9000), [
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

  test('views are read again at the nearest instant the clock is compared '
      'with, and never for a past one', () {
    DateTime at(int millis) => DateTime.fromMillisecondsSinceEpoch(millis);
    expect(nextLiveViewRebuild([5000, null, 3000, 'x', 900], 1000), at(3000));
    expect(nextLiveViewRebuild([900, 1000], 1000), isNull);
    expect(
      groupProgressNextRebuild({'eventEndAtMillis': 8000}, 1000),
      at(8000),
    );
    expect(groupProgressNextRebuild({'eventEndAtMillis': 8000}, 8000), isNull);
    expect(groupProgressNextRebuild(null, 1000), isNull);
    final doc = {
      'ownerValidUntilMillis': 4000,
      'view': {
        'request': {'dueAt': 6000},
        'reporterOptions': {
          'reporters': [
            {'validUntil': 2500},
            {'validUntil': 9007199254740991},
          ],
        },
      },
    };
    expect(checkpointNextRebuild(doc, 1000), at(2500));
    expect(checkpointNextRebuild(doc, 3000), at(4000));
    expect(checkpointNextRebuild(doc, 4500), at(6000));
    expect(
      checkpointNextRebuild(doc, 7000),
      at(7000 + checkpointReporterChoiceWindow),
      reason: 'the manager\'s reporter choices are offered for a window',
    );
    expect(
      checkpointNextRebuild({
        'ownerValidUntilMillis': 4000,
        'view': {'request': null, 'reporterOptions': null},
      }, 1000),
      isNull,
      reason: 'with no request the owner\'s authority is not compared',
    );
  });
}
