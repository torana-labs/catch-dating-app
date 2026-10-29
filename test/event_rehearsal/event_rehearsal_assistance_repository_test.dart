import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_controller.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  late _Functions functions;
  late EventRehearsalRepository repository;
  setUp(() {
    functions = _Functions();
    repository = EventRehearsalRepository(functions);
  });
  test(
    'uncertain retries preserve the exact reviewed payload and current response',
    () async {
      final change = practiceChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.applyAssistance(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = practiceBootstrap(
        runtimeRevision: 8,
        actions: [practiceReceipt(change)],
      );
      final result = await repository.applyAssistance(change);
      expect(result.session.runtimeRevision, 8);
      expect(functions.calls, hasLength(2));
      expect(functions.calls[0].input, change.toJson());
      expect(functions.calls[1].input, functions.calls[0].input);
      expect(functions.calls.map((call) => call.name).toSet(), {
        'controlEventRehearsal',
      });
    },
  );
  test(
    'an unconfirmed mutation response is an error, not a saved command',
    () async {
      final change = practiceChange();
      functions.response = practiceBootstrap(runtimeRevision: 5);
      await expectLater(
        repository.applyAssistance(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  test(
    'the existing action controller forwards the frozen practice change',
    () async {
      final change = practiceChange();
      functions.response = practiceBootstrap(
        runtimeRevision: 5,
        actions: [practiceReceipt(change)],
      );
      final container = ProviderContainer(
        overrides: [
          eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
        ],
      );
      addTearDown(container.dispose);
      final subscription = container.listen(
        eventRehearsalControllerProvider,
        (_, _) {},
      );
      addTearDown(subscription.close);
      final result = await container
          .read(eventRehearsalControllerProvider.notifier)
          .applyAssistance(change);
      expect(result.session.runtimeRevision, 5);
      expect(functions.calls.single.input, change.toJson());
      expect(functions.calls.single.name, 'controlEventRehearsal');
    },
  );
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? error;
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
