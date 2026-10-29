import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_history_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

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

  test(
    'repository reads typed scoped pages without automatic retries',
    () async {
      final functions = ParticipationTestFunctions()
        ..response = historyResponse();
      final repository = EventAssistanceDepartureHistoryRepository(functions);
      final query = historyQuery(beforeRevision: 4);
      final page = await repository.fetch(query, actorUid: historyActor);
      expect(page.query, query);
      expect(
        functions.calls.single.name,
        'listEventAssistanceDepartureRosters',
      );
      expect(functions.calls.single.input, {
        'context': query.group.context,
        'groupId': query.group.groupId,
        'beforeRevision': 4,
      });
      for (final code in ['not-found', 'permission-denied', 'unavailable']) {
        functions.error = FirebaseFunctionsException(
          code: code,
          message: code == 'not-found' ? 'NOT_FOUND' : code,
        );
        await expectLater(
          repository.fetch(query, actorUid: historyActor),
          throwsA(isA<AppException>()),
        );
      }
      expect(functions.calls.length, 4);
      functions.error = null;
      functions.response = {...historyResponse(), 'actorUid': 'foreign'};
      await expectLater(
        repository.fetch(query, actorUid: historyActor),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
}
