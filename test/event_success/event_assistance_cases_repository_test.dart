import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_cases_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late FakeFirebaseFirestore db;
  late EventAssistanceCasesRepository repository;
  setUp(() async {
    functions = ParticipationTestFunctions();
    db = FakeFirebaseFirestore();
    repository = EventAssistanceCasesRepository(
      db,
      functions,
      OrganizersRepository(db, functions),
    );
    await db.collection('organizers').doc('organizer-1').set({
      'name': 'Fixture organizer',
      'description': '',
      'location': '',
      'area': '',
      'createdAt': Timestamp.fromMillisecondsSinceEpoch(1),
      'hostUserId': 'host-1',
      'ownerUserId': 'host-1',
      'hostUserIds': ['host-1', 'host-2'],
      'hostProfiles': [
        {'uid': 'host-1', 'displayName': 'Sam', 'role': 'owner'},
        {'uid': 'host-2', 'displayName': 'Priya', 'role': 'host'},
      ],
    });
  });

  Future<void> seed(
    Map<String, Object?> row, {
    String organizerId = 'organizer-1',
    String eventId = 'event-1',
  }) async {
    final view = caseView(
      row,
      query: caseQuery(organizerId: organizerId, eventId: eventId),
    );
    await db.collection('hostEventCaseViews').doc(view.id).set({
      ...view.data,
      'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(2000),
    });
  }

  test(
    'the listener reads one status page and builds the choices from the organizer',
    () async {
      for (var i = 51; i >= 1; i--) {
        await seed(caseRow(caseId: 'case:${i.toString().padLeft(3, '0')}'));
      }
      await seed(
        caseRow(caseId: 'case:resolved', status: 'resolved', revision: 1)
          ..['canChange'] = false
          ..['resolution'] = {
            'outcome': 'resolved',
            'actorUid': 'host-1',
            'at': 1500,
          },
      );
      await seed(caseRow(caseId: 'case:foreign'), eventId: 'another-event');
      final first = await repository
          .watchPage(caseQuery(), actorUid: 'host-1')
          .first;
      expect(first.cases, hasLength(50));
      expect(first.cases.first.scope.caseId, 'case:001');
      expect(first.nextCursor, 'case:050');
      expect(first.managerOptions!.actorUid, 'host-1');
      expect(first.managerOptions!.managers.map((m) => m.displayName), [
        'Sam',
        'Priya',
      ]);
      final resolved = await repository
          .watchPage(
            caseQuery(status: AssistanceCaseStatus.resolved),
            actorUid: 'host-1',
          )
          .first;
      expect(resolved.cases.single.scope.caseId, 'case:resolved');
    },
  );

  test('a caller who is not a manager gets no handoff choices', () async {
    await seed(caseRow());
    await expectLater(
      repository.watchPage(caseQuery(), actorUid: 'stranger').first,
      throwsA(isA<BackendOperationException>()),
    );
  });

  test(
    'resolution, decline and handoff preserve one reviewed request',
    () async {
      for (final decision in [
        const AssistanceCaseDecision.resolve(),
        const AssistanceCaseDecision.decline(),
        AssistanceCaseDecision.transfer('host-2'),
      ]) {
        final change = caseChange(decision: decision);
        functions.response = caseResultResponse(change);
        final result = await repository.apply(change);
        expect(result.operationRevision, 1);
        expect(functions.calls.last.name, 'resolveEventAssistanceCase');
        expect(functions.calls.last.input, {
          'command': change.command,
          'expectedSourceHash': change.snapshot.sourceHash,
        });
        functions.response = caseResultResponse(change, outcome: 'replayed');
        expect(
          (await repository.apply(change)).outcome,
          AssistanceCaseChangeOutcome.replayed,
        );
        expect(
          functions.calls[functions.calls.length - 2].input,
          functions.calls.last.input,
        );
      }
      expect(functions.calls, hasLength(6));
    },
  );

  test(
    'missing deployment, offline and permission failures stay visible',
    () async {
      for (final entry in [
        (
          FirebaseFunctionsException(code: 'not-found', message: 'NOT_FOUND'),
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        (
          FirebaseFunctionsException(
            code: 'permission-denied',
            message: 'Denied',
          ),
          isA<PermissionException>(),
        ),
        (
          FirebaseFunctionsException(code: 'unavailable', message: 'Offline'),
          isA<NetworkException>(),
        ),
      ]) {
        functions.error = entry.$1;
        await expectLater(repository.apply(caseChange()), throwsA(entry.$2));
      }
      expect(functions.calls, hasLength(3));
    },
  );

  test(
    'malformed or mismatched results never settle locally or retry',
    () async {
      final change = caseChange();
      for (final raw in [
        null,
        {},
        caseResultResponse(change, rowPatch: {'revision': 0}),
        caseResultResponse(change, rowPatch: {'attendeeId': 'foreign'}),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.apply(change),
          throwsA(isA<BackendOperationException>()),
        );
      }
      expect(functions.calls, hasLength(4));
    },
  );
}
