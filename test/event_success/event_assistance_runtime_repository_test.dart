import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_runtime_fixtures.dart';

void main() {
  late RuntimeTestFunctions functions;
  late EventAssistanceRuntimeRepository repository;
  setUp(() {
    functions = RuntimeTestFunctions();
    repository = EventAssistanceRuntimeRepository(functions);
  });

  test('read requests only the selected live event configuration', () async {
    expect(
      (await repository.fetch(runtimeScope())).status,
      AssistanceRuntimeStatus.unconfigured,
    );
    expect(functions.calls.single.name, 'getEventAssistanceRuntimeConfig');
    expect(functions.calls.single.input, {'context': runtimeScope().context});
  });

  test(
    'uncertain configure retries retain the request and preserve a newer pause',
    () async {
      final change = runtimeView().prepareChange(
        requestId: 'once',
        command: AssistanceRuntimeConfigure(runtimeConfig()),
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
      functions.response = runtimeResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        status: 'paused',
        runtime: runtimeRecord(
          revision: 3,
          paused: true,
          configuration: runtimeConfiguration(),
        ),
      );
      final result = await repository.apply(change);
      expect(functions.calls[0].input, functions.calls[1].input);
      expect(functions.calls.map((call) => call.name).toSet(), {
        'setEventAssistanceRuntimeConfig',
      });
      expect(result.operationRevision, 1);
      expect(result.view.revision, 3);
      expect(result.view.status, AssistanceRuntimeStatus.paused);
    },
  );

  test(
    'configure and pause confirmations must match the reviewed command',
    () async {
      final configure = runtimeView().prepareChange(
        requestId: 'configure',
        command: AssistanceRuntimeConfigure(runtimeConfig()),
      );
      functions.response = runtimeResponse(
        outcome: 'applied',
        operationRevision: 1,
        revision: 1,
        status: 'configured',
        runtime: runtimeRecord(),
      );
      final configured = await repository.apply(configure);
      expect(
        configured.view.runtime!.configuration!.toJson(),
        runtimeConfiguration(),
      );
      final pause = configured.view.prepareChange(
        requestId: 'pause',
        command: const AssistanceRuntimePause(),
      );
      functions.response = runtimeResponse(
        outcome: 'applied',
        operationRevision: 2,
        revision: 2,
        status: 'paused',
        runtime: runtimeRecord(
          revision: 2,
          paused: true,
          configuration: runtimeConfiguration(),
        ),
      );
      expect(
        (await repository.apply(pause)).view.status,
        AssistanceRuntimeStatus.paused,
      );
      functions.response = runtimeResponse(
        outcome: 'applied',
        operationRevision: 1,
        revision: 1,
        status: 'paused',
        runtime: runtimeRecord(paused: true),
      );
      await expectLater(
        repository.apply(configure),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );

  test(
    'conflict, permission and missing endpoint errors cannot report saved permission',
    () async {
      final change = runtimeView().prepareChange(
        requestId: 'once',
        command: const AssistanceRuntimePause(),
      );
      functions.error = FirebaseFunctionsException(
        code: 'aborted',
        message: 'Changed',
      );
      await expectLater(
        repository.apply(change),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'aborted',
          ),
        ),
      );
      expect(functions.calls, hasLength(1));
      functions.error = FirebaseFunctionsException(
        code: 'permission-denied',
        message: 'Denied',
      );
      await expectLater(
        repository.fetch(runtimeScope()),
        throwsA(isA<PermissionException>()),
      );
      functions.error = FirebaseFunctionsException(
        code: 'not-found',
        message: 'NOT_FOUND',
      );
      await expectLater(
        repository.fetch(runtimeScope()),
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
    'foreign, malformed and write responses fail the read boundary',
    () async {
      for (final response in [
        null,
        {},
        runtimeResponse(eventId: 'foreign'),
        runtimeResponse(outcome: 'applied', operationRevision: 0),
      ]) {
        functions.response = response;
        await expectLater(
          repository.fetch(runtimeScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
    },
  );
}
