import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_departure_history_fixtures.dart';
import 'event_assistance_movement_view_fixtures.dart';

void main() {
  test(
    'backend history exposes exact historical scopes and explicit empty roster',
    () {
      final page = historyPage();
      expect(page.rosters.map((r) => r.progressRevision), [3, 2]);
      expect(page.rosters.map((r) => r.rosterSize), [0, 1]);
      expect(
        page.rosters.first.checkpoint!.status,
        AssistanceCheckpointReportStatus.unreported,
      );
      final earlier = page.rosters.last.checkpoint!;
      expect(earlier.scope.group, historyQuery().group);
      expect(earlier.scope.progressRevision, 2);
      expect(earlier.scope.checkpointId, 'one');
      expect(earlier.originalRequestedDueAt, 1030000);
      expect(page.nextBeforeRevision, isNull);
      expect(() => page.rosters.clear(), throwsUnsupportedError);
    },
  );

  test(
    'historical states cannot fabricate completion, labels or continuation',
    () {
      for (final mutate in <void Function(Map<String, Object?>)>[
        (m) => m['actorUid'] = 'foreign',
        (m) => m['groupId'] = 'foreign',
        (m) => m['validUntil'] = m['serverTime'],
        (m) => m['coverage'] = 'complete',
        (m) => m['progressRevision'] = 2,
        (m) => m['nextBeforeRevision'] = 2,
        (m) => m['rosters'] = (m['rosters']! as List).reversed.toList(),
        (m) => (m['rosters']! as List).add((m['rosters']! as List).last),
        (m) => ((m['rosters']! as List).first as Map)['confirmedAt'] = 2000000,
        (m) => ((m['rosters']! as List).first as Map)['sourceState'] =
            'setupChanged',
        (m) => ((m['rosters']! as List).first as Map)['checkpoint'] = null,
        (m) =>
            (((m['rosters']! as List).first as Map)['checkpoint']
                    as Map)['reportStatus'] =
                'complete',
        (m) =>
            (((m['rosters']! as List).first as Map)['checkpoint']
                    as Map)['reportRevision'] =
                1,
        (m) =>
            (((m['rosters']! as List).first as Map)['checkpoint']
                    as Map)['accountedForCount'] =
                1,
        (m) =>
            (((m['rosters']! as List).first as Map)['checkpoint']
                    as Map)['checkpointId'] =
                'two',
        (m) =>
            (((m['rosters']! as List).last as Map)['checkpoint']
                    as Map)['originalRequestedDueAt'] =
                999999,
      ]) {
        final raw = historyResponse();
        mutate(raw);
        expect(() => historyPage(response: raw), throwsFormatException);
      }
    },
  );

  test(
    'cursor is exclusive; continuation needs a full strictly descending page',
    () {
      final raw = historyResponse();
      final sample = (raw['rosters']! as List).first as Map;
      raw['progressRevision'] = 20;
      raw['rosters'] = [
        for (var rev = 19; rev >= 10; rev--)
          {...sample, 'progressRevision': rev},
      ];
      raw['nextBeforeRevision'] = 10;
      final query = historyQuery(beforeRevision: 20);
      expect(historyPage(response: raw, query: query).nextBeforeRevision, 10);
      expect(
        () =>
            historyPage(response: raw, query: historyQuery(beforeRevision: 19)),
        throwsFormatException,
      );
      expect(() => historyQuery(beforeRevision: 0), throwsFormatException);
    },
  );

  test('changed source and original deadline remain historical evidence', () {
    final raw = historyResponse();
    final row = (raw['rosters']! as List).last as Map;
    row['sourceState'] = 'setupChanged';
    row['label'] = null;
    raw['serverTime'] = 2000000;
    final page = historyPage(response: raw);
    expect(
      page.rosters.last.sourceState,
      AssistanceDepartureHistorySource.setupChanged,
    );
    expect(page.rosters.last.label, isNull);
    expect(
      page.rosters.last.checkpoint!.status,
      AssistanceCheckpointReportStatus.unreported,
    );
  });

  group('repository', () {
    late FakeFirebaseFirestore firestore;
    late EventAssistanceDepartureHistoryRepository repository;
    final group = historyQuery().group;
    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = EventAssistanceDepartureHistoryRepository(
        firestore,
        clock: AppClock.custom(
          () => DateTime.fromMillisecondsSinceEpoch(2000000),
        ),
      );
    });
    Future<void> seedGroup(int revision) => firestore
        .collection(EventAssistanceMovementViews.groupProgress)
        .doc(groupProgressViewId(group))
        .set(
          groupProgressViewDoc(
            departureResponse(scope: group)
              ..['view'] = {
                ...(departureResponse(scope: group)['view']! as Map),
                'revision': revision,
              },
            scope: group,
            evaluatedAt: 1500000,
            endAt: 3000000,
          ),
        );
    Future<void> seedRow(Map<String, Object?> row) {
      final doc = departureViewDoc(row, scope: group, evaluatedAt: 1500000);
      return firestore
          .collection(EventAssistanceMovementViews.departures)
          .doc(doc['rosterId']! as String)
          .set(doc);
    }

    Map<String, Object?> unrecorded(int revision) => {
      'progressRevision': revision,
      'confirmedAt': 1000000 + revision,
      'destination': null,
      'label': null,
      'sourceState': 'destinationNotRecorded',
      'rosterSize': 0,
      'checkpoint': null,
    };

    test('listens to the group view and its newest departure views', () async {
      await seedGroup(3);
      for (final row in historyResponse()['rosters']! as List) {
        await seedRow((row as Map).cast<String, Object?>());
      }
      final page = await repository
          .watch(historyQuery(), actorUid: historyActor)
          .first;
      expect(page.rosters.map((r) => r.progressRevision), [3, 2]);
      expect(page.progressRevision, 3);
      expect(page.validUntil, assistanceNoExpiry);
      expect(page.nextBeforeRevision, isNull);
      expect(page.rosters.last.checkpoint!.scope.checkpointId, 'one');
    });

    test('pages by revision with one extra row for the next page', () async {
      await seedGroup(12);
      for (var revision = 1; revision <= 12; revision++) {
        await seedRow(unrecorded(revision));
      }
      final first = await repository
          .watch(historyQuery(), actorUid: historyActor)
          .first;
      expect(first.rosters.map((r) => r.progressRevision), [
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
      ]);
      expect(first.nextBeforeRevision, 3);
      final next = await repository
          .watch(historyQuery(beforeRevision: 3), actorUid: historyActor)
          .first;
      expect(next.rosters.map((r) => r.progressRevision), [2, 1]);
      expect(next.nextBeforeRevision, isNull);
    });

    test('a departure ahead of its group view raises the revision', () async {
      await seedGroup(1);
      await seedRow(unrecorded(2));
      final page = await repository
          .watch(historyQuery(), actorUid: historyActor)
          .first;
      expect(page.progressRevision, 2);
    });

    test('a missing group view or an invalid row is an error', () async {
      await seedRow(unrecorded(1));
      await expectLater(
        repository.watch(historyQuery(), actorUid: historyActor).first,
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-missing',
          ),
        ),
      );
      await seedGroup(1);
      final rows = await firestore
          .collection(EventAssistanceMovementViews.departures)
          .get();
      await rows.docs.single.reference.update({
        'sourceCoverage': 'invalidSource',
      });
      await expectLater(
        repository.watch(historyQuery(), actorUid: historyActor).first,
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-invalid-source',
          ),
        ),
      );
    });
  });
}
