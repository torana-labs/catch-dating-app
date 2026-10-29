import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_cases_fixtures.dart';

void main() {
  test(
    'queries are value keys with distinct event, queue and cursor scopes',
    () {
      expect(caseQuery(), caseQuery());
      expect(caseQuery().hashCode, caseQuery().hashCode);
      for (final other in [
        caseQuery(eventId: 'other'),
        caseQuery(organizerId: 'other'),
        caseQuery(cursor: 'case:one'),
        caseQuery(status: AssistanceCaseStatus.resolved),
      ]) {
        expect(other, isNot(caseQuery()));
      }
      expect(() => caseQuery(cursor: ''), throwsFormatException);
      expect(() => caseQuery(eventId: 'event/one'), throwsFormatException);
      expect(
        caseQuery().scopeFor('case:one'),
        caseQuery().scopeFor('case:one'),
      );
    },
  );

  test(
    'current, settled, stale and legacy states preserve their distinctions',
    () {
      final open = casesPage().cases.single as AssistanceOpenHostCase;
      expect(open.revision, 0);
      expect(open.assignment, isA<AssistanceCaseUnassigned>());
      expect(open.guestScope.attendeeId, 'attendee-1');
      for (final availability in ['sourceChanged', 'legacy']) {
        final row = casesPage(
          rows: [caseRow(availability: availability)],
        ).cases.single;
        expect(
          row,
          availability == 'legacy'
              ? isA<AssistanceLegacyHostCase>()
              : isA<AssistanceStaleHostCase>(),
        );
      }
      for (final decision in [
        const AssistanceCaseDecision.resolve(),
        const AssistanceCaseDecision.decline(),
      ]) {
        final result = caseResult(caseChange(decision: decision));
        final closed = result.view as AssistanceClosedHostCase;
        expect(closed.resolution.actorUid, 'host-1');
        expect(
          closed.resolution.outcome,
          decision is AssistanceCaseResolve
              ? AssistanceCaseResolutionOutcome.resolved
              : AssistanceCaseResolutionOutcome.declined,
        );
      }
    },
  );

  test(
    'assignment authority stays separate from whether the request is open',
    () {
      final row = {
        ...caseRow(revision: 1),
        'assignment': {
          'kind': 'assigned',
          'uid': 'host-2',
          'authority': 'revoked',
        },
      };
      final open =
          casesPage(rows: [row]).cases.single as AssistanceOpenHostCase;
      expect(open.status, AssistanceCaseStatus.open);
      expect(
        (open.assignment as AssistanceCaseAssigned).authority,
        AssistanceCaseAssignmentAuthority.revoked,
      );
      expect(
        caseChange(
          decision: AssistanceCaseDecision.transfer('host-2'),
        ).command['payload'],
        {
          'caseId': 'case:one',
          'expectedRevision': 0,
          'outcome': 'transferred',
          'owner': 'host-2',
        },
      );
      expect(() => AssistanceCaseDecision.transfer(''), throwsFormatException);
    },
  );

  test(
    'server pages are bounded, immutable and retain a usable continuation',
    () {
      final rows = List.generate(
        50,
        (i) => caseRow(caseId: 'case:${i.toString().padLeft(2, '0')}'),
      );
      final page = EventAssistanceCasesPage.fromCallableData(
        casesPageResponse(rows: rows, nextCursor: 'case:49'),
        expectedQuery: caseQuery(),
      );
      expect(page.cases, hasLength(50));
      expect(page.nextQuery, caseQuery(cursor: 'case:49'));
      expect(() => page.cases.clear(), throwsUnsupportedError);
      rows.clear();
      expect(page.cases, hasLength(50));
      expect(casesPage(rows: []).nextQuery, isNull);
      final next = page.nextQuery!;
      expect(
        EventAssistanceCasesPage.fromCallableData(
          casesPageResponse(
            query: next,
            rows: [caseRow(caseId: 'case:50')],
          ),
          expectedQuery: next,
        ).cases.single.scope.caseId,
        'case:50',
      );
    },
  );

  test(
    'bad pagination, incomplete objects and foreign contexts fail visibly',
    () {
      final valid = casesPageResponse();
      for (final response in [
        null,
        {},
        {...valid, 'extra': true},
        {...valid, 'context': caseQuery(eventId: 'foreign').context},
        {
          ...valid,
          'context': {...caseQuery().context, 'mode': 'rehearsal'},
        },
        {...valid, 'coverage': 'complete'},
        {...valid, 'status': 'resolved'},
        {
          ...valid,
          'cases': List.generate(51, (i) => caseRow(caseId: 'case:$i')),
        },
        {
          ...valid,
          'cases': [caseRow(), caseRow()],
        },
        {
          ...valid,
          'cases': [caseRow(caseId: 'case:z'), caseRow(caseId: 'case:a')],
        },
        {...valid, 'nextCursor': 'case:one'},
        {...valid, 'serverTime': 0.5},
      ]) {
        expect(
          () => EventAssistanceCasesPage.fromCallableData(
            response,
            expectedQuery: caseQuery(),
          ),
          throwsFormatException,
        );
      }
      expect(
        () => EventAssistanceCasesPage.fromCallableData(
          valid,
          expectedQuery: caseQuery(cursor: 'case:one'),
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'malformed current and unavailable rows cannot acquire action authority',
    () {
      for (final patch in [
        {'attendeeId': null},
        {'canChange': false},
        {'revision': null},
        {'revision': 0.1},
        {'revision': 9007199254740992},
        {'category': 'comfortSafety'},
        {'availability': 'future-state'},
        {'sourceHash': 'not-a-hash'},
        {'receivedAt': 2001},
        {'status': 'resolved'},
        {
          'assignment': {'kind': 'assigned', 'uid': 'host-2'},
        },
        {
          'resolution': {
            'outcome': 'resolved',
            'actorUid': 'host-1',
            'at': 2000,
          },
        },
      ]) {
        expect(
          () => casesPage(
            rows: [
              {...caseRow(), ...patch},
            ],
          ),
          throwsFormatException,
        );
      }
      for (final state in ['legacy', 'sourceChanged']) {
        for (final patch in [
          {'attendeeId': 'private-guest'},
          {'canChange': true},
          {
            'assignment': {'kind': 'unassigned'},
          },
          {
            'resolution': {
              'outcome': 'resolved',
              'actorUid': 'host-1',
              'at': 2000,
            },
          },
        ]) {
          expect(
            () => casesPage(
              rows: [
                {...caseRow(availability: state), ...patch},
              ],
            ),
            throwsFormatException,
          );
        }
      }
    },
  );

  test('a command preserves review, actor, identity and revision zero', () {
    final change = caseChange();
    expect(change.command, {
      'kind': 'resolveAssistance',
      'context': caseQuery().context,
      'eventId': 'event-1',
      'operationId': 'case-action:fixture',
      'payload': {
        'caseId': 'case:one',
        'expectedRevision': 0,
        'outcome': 'resolved',
        'owner': 'host-1',
      },
    });
    final mutable = change.command;
    (mutable['payload']! as Map)['expectedRevision'] = 100;
    expect((change.command['payload']! as Map)['expectedRevision'], 0);
  });

  test(
    'applied results must exactly match the intended decision and actor',
    () {
      for (final decision in [
        const AssistanceCaseDecision.resolve(),
        const AssistanceCaseDecision.decline(),
        AssistanceCaseDecision.transfer('host-2'),
      ]) {
        final change = caseChange(decision: decision);
        final good = caseResult(change);
        expect(good.outcome, AssistanceCaseChangeOutcome.applied);
        expect(good.operationRevision, 1);
        final valid = caseResultResponse(change);
        for (final patch in [
          {'caseId': 'another-case'},
          {'revision': 2},
          {'sourceHash': 'a' * 64},
          {'attendeeId': 'another-guest'},
          {'receivedAt': 999},
          {'category': 'other'},
        ]) {
          expect(
            () => EventAssistanceCaseResult.fromCallableData({
              ...valid,
              'view': {...valid['view']! as Map, ...patch},
            }, expectedChange: change),
            throwsFormatException,
          );
        }
      }
      final resolved = caseChange();
      expect(
        () => caseResult(
          resolved,
          rowPatch: {
            'resolution': {
              'outcome': 'declined',
              'actorUid': 'host-1',
              'at': 3000,
            },
          },
        ),
        throwsFormatException,
      );
      expect(
        () => caseResult(
          resolved,
          rowPatch: {
            'resolution': {
              'outcome': 'resolved',
              'actorUid': 'another',
              'at': 3000,
            },
          },
        ),
        throwsFormatException,
      );
      final transfer = caseChange(
        decision: AssistanceCaseDecision.transfer('host-2'),
      );
      expect(
        () => caseResult(
          transfer,
          rowPatch: {
            'assignment': {
              'kind': 'assigned',
              'uid': 'host-2',
              'authority': 'revoked',
            },
          },
        ),
        throwsFormatException,
      );
    },
  );

  test('replays retain newer case state and the original receipt revision', () {
    final change = caseChange(
      decision: AssistanceCaseDecision.transfer('host-2'),
    );
    final replay = caseResult(
      change,
      outcome: 'replayed',
      rowPatch: {
        'revision': 3,
        'status': 'resolved',
        'canChange': false,
        'resolution': {'outcome': 'declined', 'actorUid': 'host-3', 'at': 3000},
      },
    );
    expect(replay.operationRevision, 1);
    expect((replay.view as AssistanceClosedHostCase).revision, 3);
    final stale = caseResult(
      change,
      outcome: 'replayed',
      rowPatch: {
        'revision': 2,
        'availability': 'sourceChanged',
        'attendeeId': null,
        'canChange': false,
        'resolution': null,
        'assignment': {'kind': 'unavailable'},
      },
    );
    expect(stale.view, isA<AssistanceStaleHostCase>());
    expect(
      () => caseResult(
        change,
        outcome: 'replayed',
        rowPatch: {
          'availability': 'legacy',
          'revision': null,
          'attendeeId': null,
          'canChange': false,
          'resolution': null,
          'assignment': {'kind': 'unavailable'},
        },
      ),
      throwsFormatException,
    );
  });

  test('client vocabularies cover the complete canonical queue contract', () {
    final contract =
        jsonDecode(
              File(
                'contracts/shared/event_assistance_cases.schema.json',
              ).readAsStringSync(),
            )
            as Object?;
    Object? at(Object? node, List<Object> path) {
      for (final key in path) {
        node = key is int
            ? (node as List<Object?>)[key]
            : (node as Map<String, Object?>)[key];
      }
      return node;
    }

    final definitions = at(contract, ['definitions']);
    final variants = at(definitions, ['View', 'oneOf']) as List<Object?>;
    expect(
      variants.map((v) => at(v, ['properties', 'availability', 'const'])),
      ['current', 'current', 'sourceChanged', 'legacy'],
    );
    expect(
      at(variants.first, ['properties', 'category', 'enum']),
      AssistanceCaseCategory.values.map((v) => v.name),
    );
    expect(
      at(definitions, ['Resolution', 'properties', 'outcome', 'enum']),
      AssistanceCaseResolutionOutcome.values.map((v) => v.name),
    );
    expect(
      at(definitions, [
        'Assignment',
        'oneOf',
        1,
        'properties',
        'authority',
        'enum',
      ]),
      AssistanceCaseAssignmentAuthority.values.map((v) => v.name),
    );
  });
}
