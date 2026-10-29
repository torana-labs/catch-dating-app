import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_accountability_fixtures.dart';

void main() {
  late _Functions functions;
  late EventAssistanceAccountabilityRepository repository;
  setUp(() {
    functions = _Functions();
    repository = EventAssistanceAccountabilityRepository(functions);
  });
  test(
    'reads use the typed live visit request without changing attendance',
    () async {
      functions.response = accountabilityWire();
      final view = await repository.fetch(accountabilityScope);
      expect(view.disposition, AssistanceVisitDisposition.unresolved);
      expect(functions.calls.single.name, 'getEventAssistanceAccountability');
      expect(functions.calls.single.input, {
        'context': accountabilityScope.group.context,
        'groupId': accountabilityScope.group.groupId,
        'attendeeId': accountabilityScope.attendeeId,
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
      final change = accountabilityChange();
      functions.error = FirebaseFunctionsException(
        code: 'unavailable',
        message: 'Offline',
      );
      await expectLater(
        repository.apply(change),
        throwsA(isA<NetworkException>()),
      );
      functions.error = null;
      functions.response = accountabilityAppliedWire(change);
      final result = await repository.apply(change);
      expect(result.view.disposition, AssistanceVisitDisposition.returned);
      expect(functions.calls.map((c) => c.name).toSet(), {
        'resolveEventAssistanceAccountability',
      });
      expect(functions.calls.first.input, {
        'groupId': accountabilityScope.group.groupId,
        'command': change.command,
        'expectedSourceHash': change.snapshot.sourceHash,
      });
      expect(functions.calls.last.input, functions.calls.first.input);
    },
  );
  test(
    'foreign reads and unconfirmed mutation responses are visible backend errors',
    () async {
      functions.response = accountabilityWire()
        ..['view'] = {
          ...(accountabilityWire()['view']! as Map),
          'attendeeId': 'other-guest',
        };
      await expectLater(
        repository.fetch(accountabilityScope),
        throwsA(isA<BackendOperationException>()),
      );
      final change = accountabilityChange();
      final wire = accountabilityAppliedWire(change);
      (wire['view']! as Map)['disposition'] = 'departed';
      functions.response = wire;
      await expectLater(
        repository.apply(change),
        throwsA(isA<BackendOperationException>()),
      );
    },
  );
  test(
    'checkpoint context survives both review and write without becoming an arrival report',
    () async {
      functions.response = accountabilityWire(
        scope: checkpointAccountabilityScope,
        episodeId: null,
      );
      final view = await repository.fetch(checkpointAccountabilityScope);
      final change = accountabilityChange(
        view: view,
        disposition: AssistanceVisitDisposition.unresolved,
      );
      functions.response = accountabilityAppliedWire(change);
      await repository.apply(change);
      for (final call in functions.calls) {
        expect(
          (call.input! as Map)['checkpoint'],
          checkpointAccountabilityScope.checkpoint!.toJson(),
        );
      }
      expect(functions.calls.last.name, 'resolveEventAssistanceAccountability');
      expect(
        ((functions.calls.last.input! as Map)['command']! as Map)['payload'],
        {
          'attendeeId': 'guest-1',
          'episodeId': null,
          'disposition': 'unresolved',
        },
      );
    },
  );

  for (final code in ['not-found', 'permission-denied', 'unavailable']) {
    test('$code never becomes a resolved visit', () async {
      functions.error = FirebaseFunctionsException(
        code: code,
        message: 'Unavailable',
      );
      await expectLater(
        repository.fetch(accountabilityScope),
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
