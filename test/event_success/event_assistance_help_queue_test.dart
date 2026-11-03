import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_help_queue_fixtures.dart';

void main() {
  test('actual backend help pages and receipts retain the named request', () {
    final initial = helpQueuePage('initial');
    expect(initial.cases.single.displayName, 'Alex Morgan');
    expect(initial.managerOptions!.actorUid, 'host-1');
    expect(initial.managerOptions!.managers.map((r) => r.displayName), [
      'Sam',
      'Priya',
    ]);
    final transfer = EventAssistanceCaseChange(
      snapshot: initial.cases.single as AssistanceOpenHostCase,
      actorUid: 'host-1',
      operationId: 'case:native-transfer',
      decision: AssistanceCaseDecision.transfer('host-2'),
    );
    final applied = EventAssistanceCaseResult.fromCallableData(
      helpQueueFixture('transfer'),
      expectedChange: transfer,
    );
    final assigned = helpQueuePage('assigned');
    expect(assigned.cases.single.sourceHash, applied.view.sourceHash);
    final resolve = EventAssistanceCaseChange(
      snapshot: assigned.cases.single as AssistanceOpenHostCase,
      actorUid: 'host-1',
      operationId: 'case:native-resolve',
      decision: const AssistanceCaseDecision.resolve(),
    );
    final resolved = EventAssistanceCaseResult.fromCallableData(
      helpQueueFixture('resolved'),
      expectedChange: resolve,
    );
    expect(
      helpQueuePage('handled').cases.single.sourceHash,
      resolved.view.sourceHash,
    );
  });

  test(
    'missing names and choices remain unknown; stale identity stays hidden',
    () {
      final views = helpQueueViews(helpQueueFixture('initial'));
      final view = views.single;
      final row = Map<String, Object?>.from(view.data['view']! as Map)
        ..remove('displayName');
      EventAssistanceCasesPage page() => EventAssistanceCasesPage.fromViews(
        query: helpQueueQuery(),
        views: [
          (
            id: view.id,
            data: {...view.data, 'view': row},
            evaluatedAtMillis: view.evaluatedAtMillis,
          ),
        ],
        hasMore: false,
        managerOptions: null,
      );
      final legacy = page();
      expect(legacy.cases.single.displayName, isNull);
      expect(legacy.managerOptions, isNull);
      row.addAll({
        'availability': 'sourceChanged',
        'attendeeId': null,
        'assignment': {'kind': 'unavailable'},
        'canChange': false,
      });
      expect(page().cases.single, isA<AssistanceStaleHostCase>());
      row['displayName'] = 'Alex Morgan';
      expect(page, throwsFormatException);
    },
  );

  test(
    'manager choices reject duplicates, missing caller and unknown authority',
    () {
      final options = <String, Object?>{
        'actorUid': 'host-1',
        'managers': [
          {'uid': 'host-1', 'displayName': 'Sam'},
          {'uid': 'host-2', 'displayName': 'Priya'},
        ],
      };
      expect(
        AssistanceCaseManagerOptions.fromJson(options).managers,
        hasLength(2),
      );
      for (final patch in <Map<String, Object?>>[
        {'actorUid': 'foreign'},
        {
          'managers': [
            {'uid': 'host-1', 'displayName': 'Sam'},
            {'uid': 'host-1', 'displayName': 'Duplicate'},
          ],
        },
        {
          'managers': [
            {'uid': 'host-1', 'displayName': ''},
          ],
        },
        {'extra': 'unexpected'},
      ]) {
        expect(
          () => AssistanceCaseManagerOptions.fromJson({...options, ...patch}),
          throwsFormatException,
          reason: '$patch',
        );
      }
      expect(
        () => helpQueuePage('initial').managerOptions!.managers.clear(),
        throwsUnsupportedError,
      );
    },
  );
}
