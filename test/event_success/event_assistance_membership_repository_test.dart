import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_membership_fixtures.dart';

void main() {
  late _Functions functions;
  late EventAssistanceMembershipRepository repository;
  setUp(() {
    functions = _Functions();
    repository = EventAssistanceMembershipRepository(functions);
  });
  test(
    'reads use the generated live guest request without initializing membership',
    () async {
      functions.response = membershipWire();
      final view = await repository.fetch(membershipScope);
      expect(view.membership, isA<AssistanceUninitializedMembership>());
      expect(functions.calls.single.name, 'getEventAssistanceMembership');
      expect(functions.calls.single.input, {
        'context': membershipScope.context,
        'attendeeId': membershipScope.attendeeId,
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
      final change = membershipChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = membershipAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.accepted?.groupId, 'easy');
      expect(functions.calls.map((c) => c.name).toSet(), {
        'transferEventAssistanceGroup',
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
      functions.response = membershipWire()
        ..['view'] = {
          ...(membershipWire()['view']! as Map),
          'attendeeId': 'other-guest',
        };
      await expectLater(
        repository.fetch(membershipScope),
        throwsA(isA<BackendOperationException>()),
      );
      final change = membershipChange();
      final wire = membershipAppliedWire(change);
      (wire['view']! as Map)['accepted'] = acceptedGroupWire(
        group: 'tempo',
        at: 2000,
      );
      functions.response = wire;
      await expectLater(
        repository.apply(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  for (final code in ['not-found', 'permission-denied', 'unavailable']) {
    test('$code never becomes an empty group selection', () async {
      functions.error = FirebaseFunctionsException(
        code: code,
        message: 'Unavailable',
      );
      await expectLater(
        repository.fetch(membershipScope),
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
