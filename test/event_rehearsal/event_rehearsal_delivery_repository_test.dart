import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_delivery_fixtures.dart';

void main() {
  test(
    'rehearsal handoff retries use only the frozen rehearsal callable request',
    () async {
      final functions = _Functions();
      final repository = EventRehearsalRepository(functions);
      final change = practiceDeliveryChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.applyAssistance(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = practiceDeliveryResult(
        change,
        status: 'delivered',
        laterActions: 1,
      );
      final result = await repository.applyAssistance(change);
      expect(
        result.deliveryReviews!.deliveries.single.evidence.status,
        AssistanceDeliveryStatus.delivered,
      );
      expect(functions.calls.length, 2);
      expect(
        functions.calls.every((c) => c.name == 'controlEventRehearsal'),
        isTrue,
      );
      expect(functions.calls.first.input, change.toJson());
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );

  test(
    'a callable success without confirmed handoff evidence fails verification',
    () async {
      final functions = _Functions();
      final repository = EventRehearsalRepository(functions);
      final change = practiceDeliveryChange();
      functions.response = practiceDeliveryResult(change, status: 'delivered');
      await expectLater(
        repository.applyAssistance(change),
        throwsA(isA<BackendOperationException>()),
      );
      functions.response = practiceDeliveryResult(change);
      final result = await repository.applyAssistance(change);
      expect(
        result.deliveryReviews!.deliveries.single.evidence.status,
        AssistanceDeliveryStatus.accepted,
      );
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );
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
