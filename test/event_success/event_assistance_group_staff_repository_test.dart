import 'package:catch_dating_app/contexts/live/data/event_assistance_group_staff_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_group_staff_fixtures.dart';

void main() {
  late _Functions functions;
  late EventAssistanceGroupStaffRepository repository;
  setUp(() {
    functions = _Functions();
    repository = EventAssistanceGroupStaffRepository(functions);
  });
  test(
    'lookup uses the generated live group request without granting access',
    () async {
      functions.response = staffWire();
      final view = await repository.fetch(staffLookup);
      expect(view.currentDuty, isNull);
      expect(functions.calls.single.name, 'getEventAssistanceGroupStaff');
      expect(functions.calls.single.input, {
        'context': staffLookup.group.context,
        'groupId': staffLookup.group.groupId,
        'phoneNumber': staffLookup.phoneNumber,
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
      final change = staffChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = staffAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.currentDuty?.duty, AssistanceGroupDuty.lead);
      expect(functions.calls.map((c) => c.name).toSet(), {
        'setEventAssistanceGroupStaff',
      });
      expect(functions.calls.first.input, change.toJson());
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );
  test(
    'foreign reads and unconfirmed mutation responses are visible backend errors',
    () async {
      functions.response = staffWire()
        ..['view'] = {
          ...(staffWire()['view']! as Map),
          'groupId': 'other-group',
        };
      await expectLater(
        repository.fetch(staffLookup),
        throwsA(isA<BackendOperationException>()),
      );
      final change = staffChange();
      final wire = staffAppliedWire(change);
      (wire['view']! as Map)['uid'] = 'reassigned-phone';
      functions.response = wire;
      await expectLater(
        repository.apply(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  for (final code in ['not-found', 'permission-denied', 'unavailable']) {
    test('$code never becomes an empty staff result', () async {
      functions.error = FirebaseFunctionsException(
        code: code,
        message: 'Unavailable',
      );
      await expectLater(
        repository.fetch(staffLookup),
        throwsA(isA<AppException>()),
      );
      expect(functions.calls.length, 1);
    });
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
