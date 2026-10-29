import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_cases_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAssistanceCasesRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventAssistanceCasesRepository(functions);
  });

  test(
    'reads issue one exact page request through the generated DTO',
    () async {
      final query = caseQuery(cursor: 'case:a');
      functions.response = casesPageResponse(
        query: query,
        rows: [caseRow(caseId: 'case:b')],
      );
      final page = await repository.fetch(query);
      expect(page.query, query);
      expect(functions.calls.single.name, 'listEventAssistanceCases');
      expect(functions.calls.single.input, {
        'context': query.context,
        'status': 'open',
        'cursor': 'case:a',
      });
    },
  );

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
        await expectLater(repository.fetch(caseQuery()), throwsA(entry.$2));
        await expectLater(repository.apply(caseChange()), throwsA(entry.$2));
      }
      expect(functions.calls, hasLength(6));
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
      functions.response = {'cases': []};
      await expectLater(
        repository.fetch(caseQuery()),
        throwsA(isA<BackendOperationException>()),
      );
      expect(functions.calls, hasLength(5));
    },
  );
}
