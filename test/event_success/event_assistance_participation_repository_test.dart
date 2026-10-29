import 'package:catch_dating_app/contexts/live/data/event_assistance_participation_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventAssistanceParticipationRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventAssistanceParticipationRepository(functions);
  });

  test('reads the requested attendee through the live callable', () async {
    final view = await repository.fetch(participationScope());
    expect(view.checkedIn, isFalse);
    expect(functions.calls.single.name, 'getEventAssistanceParticipation');
    expect(functions.calls.single.input, {
      'context': participationScope().context,
      'attendeeId': 'attendee-1',
    });
  });

  test(
    'retries preserve the exact command and never call attendance',
    () async {
      final change = participationView().prepareChange(
        operationId: 'retry-1',
        participation: const EventAssistanceParticipation.onBreak(),
      );
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = participationResponse(
        outcome: 'replayed',
        operationRevision: 3,
        revision: 5,
        participation: const {'state': 'departed', 'resumeAtUnit': null},
      );
      final result = await repository.apply(change);
      expect(functions.calls[0].input, functions.calls[1].input);
      expect(functions.calls.map((c) => c.name).toSet(), {
        'setEventAssistanceParticipation',
      });
      expect(result.view.participation, isA<EventParticipationDeparted>());
      expect(result.operationRevision, 3);
    },
  );

  test(
    'conflicts are exposed without refetching or rebasing the command',
    () async {
      functions.error = FirebaseFunctionsException(
        code: 'aborted',
        message: 'Changed',
      );
      await expectLater(
        repository.apply(
          participationView().prepareChange(
            operationId: 'op-1',
            participation: const EventAssistanceParticipation.active(),
          ),
        ),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'aborted',
          ),
        ),
      );
      expect(functions.calls, hasLength(1));
    },
  );

  test(
    'a dormant endpoint is unavailable rather than an empty guest',
    () async {
      functions.error = FirebaseFunctionsException(
        code: 'not-found',
        message: 'NOT_FOUND',
      );
      await expectLater(
        repository.fetch(participationScope()),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
      );
    },
  );

  test(
    'permission errors and malformed results cannot become success',
    () async {
      functions.error = FirebaseFunctionsException(
        code: 'permission-denied',
        message: 'Denied',
      );
      await expectLater(
        repository.fetch(participationScope()),
        throwsA(isA<PermissionException>()),
      );
      functions.error = null;
      for (final response in [
        null,
        {},
        participationResponse(outcome: 'applied', operationRevision: 1),
      ]) {
        functions.response = response;
        await expectLater(
          repository.fetch(participationScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
      functions.response = participationResponse(
        outcome: 'applied',
        operationRevision: 4,
        revision: 4,
      );
      await expectLater(
        repository.apply(
          participationView().prepareChange(
            operationId: 'op-1',
            participation: const EventAssistanceParticipation.active(),
          ),
        ),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
}
