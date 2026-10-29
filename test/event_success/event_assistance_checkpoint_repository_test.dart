import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_checkpoint_fixtures.dart';

void main() {
  late _Functions functions;
  late EventAssistanceCheckpointRepository repository;
  setUp(() {
    functions = _Functions();
    repository = EventAssistanceCheckpointRepository(functions);
  });
  test(
    'reads use the exact departure request without writing observations',
    () async {
      functions.response = checkpointWire();
      final view = await repository.fetch(checkpointScope);
      expect(view.report, isNull);
      expect(functions.calls.single.name, 'getEventAssistanceCheckpoint');
      expect(functions.calls.single.input, {
        'context': checkpointScope.group.context,
        'groupId': checkpointScope.group.groupId,
        'checkpointId': checkpointScope.checkpointId,
        'progressRevision': checkpointScope.progressRevision,
      });
      expect(
        functions.calls.single.input.toString(),
        isNot(contains('checkedIn')),
      );
    },
  );
  test(
    'uncertain retries retain all reviewed fences and the exact original decision',
    () async {
      final change = checkpointChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = checkpointAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.report?.accountedFor, ['a']);
      expect(functions.calls.map((c) => c.name).toSet(), {
        'recordEventAssistanceCheckpoint',
      });
      expect(functions.calls.first.input, {
        'command': change.command,
        'expectedSourceHash': change.snapshot.sourceHash,
      });
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );
  test(
    'foreign reads and unconfirmed mutation responses are visible backend errors',
    () async {
      functions.response = checkpointWire()
        ..['view'] = {
          ...(checkpointWire()['view']! as Map),
          'checkpointId': 'other-stop',
        };
      await expectLater(
        repository.fetch(checkpointScope),
        throwsA(isA<BackendOperationException>()),
      );
      final change = checkpointChange();
      final wire = checkpointAppliedWire(change);
      ((wire['view']! as Map)['report']! as Map)['reportedBy'] =
          'other-observer';
      functions.response = wire;
      await expectLater(
        repository.apply(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  for (final code in ['not-found', 'permission-denied', 'unavailable']) {
    test(
      '$code never becomes an an empty or complete checkpoint report',
      () async {
        functions.error = FirebaseFunctionsException(
          code: code,
          message: 'Unavailable',
        );
        await expectLater(
          repository.fetch(checkpointScope),
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
