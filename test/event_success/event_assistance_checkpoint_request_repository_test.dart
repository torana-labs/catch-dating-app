import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';

void main() {
  for (final decision in <CheckpointRequestDecision>[
    reassignReporter,
    CloseCheckpointRequest('Departed'),
    ReopenCheckpointRequest('Review again'),
  ]) {
    test(
      '${decision.runtimeType} uses its generated request and frozen retries',
      () async {
        final before = decision is ReopenCheckpointRequest
            ? checkpointClosedWire()
            : requestReadyWire();
        final change = requestChange(decision: decision, wire: before);
        final functions = _Functions()
          ..error = FirebaseFunctionsException(
            code: 'unavailable',
            message: 'Offline',
          );
        final repository = EventAssistanceCheckpointRepository(functions);
        await expectLater(
          repository.manageRequest(change),
          throwsA(isA<NetworkException>()),
        );
        functions.error = null;
        functions.response = requestAppliedWire(change, before: before);
        await repository.manageRequest(change);
        expect(functions.calls.map((c) => c.name).toSet(), {
          decision is ReassignCheckpointReporter
              ? 'reassignEventAssistanceCheckpointReporter'
              : 'setEventAssistanceCheckpointCloseout',
        });
        expect(functions.calls.first.input, {
          'command': change.command,
          'expectedSourceHash': change.sourceHash,
        });
        expect(functions.calls.last.input, functions.calls.first.input);
      },
    );
  }
  test(
    'wrong actor and receipt failures are surfaced, never silently successful',
    () async {
      final change = requestChange();
      final wire = requestAppliedWire(change);
      ((checkpointBody(wire)['closeout']! as Map)['change']!
              as Map)['changedBy'] =
          'other';
      final functions = _Functions()..response = wire;
      await expectLater(
        EventAssistanceCheckpointRepository(functions).manageRequest(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  for (final code in [
    'not-found',
    'permission-denied',
    'failed-precondition',
  ]) {
    test(
      '$code never becomes success or an automatic alternative action',
      () async {
        final functions = _Functions()
          ..error = FirebaseFunctionsException(
            code: code,
            message: 'Unavailable',
          );
        await expectLater(
          EventAssistanceCheckpointRepository(
            functions,
          ).manageRequest(requestChange()),
          throwsA(isA<AppException>()),
        );
        expect(functions.calls.length, 1);
      },
    );
  }
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response, error;
  final calls = <({String name, Object? input})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _Callable(this, name);
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.owner, this.name);
  final _Functions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _Result<T>(owner.response as T);
  }
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
