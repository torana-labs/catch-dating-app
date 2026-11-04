import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_accountability_fixtures.dart';
import 'event_assistance_guest_view_fixtures.dart';

void main() {
  late _Functions functions;
  late FakeFirebaseFirestore firestore;
  late GuestViewTestClock time;
  late EventAssistanceAccountabilityRepository repository;
  setUp(() {
    functions = _Functions();
    firestore = FakeFirebaseFirestore();
    time = GuestViewTestClock(1000);
    repository = EventAssistanceAccountabilityRepository(
      functions,
      firestore,
      clock: time.clock,
    );
  });
  Future<void> seed(
    Map<String, Object?> response, {
    EventAssistanceAccountabilityScope? scope,
    int evaluatedAt = 900,
  }) {
    final selected = scope ?? accountabilityScope;
    return selected.checkpoint == null
        ? seedGuestView(
            firestore,
            EventAssistanceGuestViews.accountability,
            accountabilityViewDoc(
              response,
              scope: selected,
              evaluatedAt: evaluatedAt,
            ),
          )
        : seedGuestView(
            firestore,
            EventAssistanceMovementViews.checkpoints,
            checkpointAccountabilityViewDoc(
              response,
              scope: selected,
              evaluatedAt: evaluatedAt,
            ),
          );
  }

  test(
    'the event-wide review is a manager listener and calls nothing',
    () async {
      await seed(accountabilityWire());
      final view = await repository.watch(accountabilityScope).first;
      expect(view.disposition, AssistanceVisitDisposition.unresolved);
      expect(view.serverTime, 1000);
      expect(view.canResolve, isTrue);
      expect(functions.calls, isEmpty);
      time.now = 500;
      expect(
        (await repository.watch(accountabilityScope).first).serverTime,
        900,
        reason: 'a device clock behind the server reads at the evaluation',
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
  test('missing, invalid and foreign views and unconfirmed mutation responses '
      'are visible errors', () async {
    await expectLater(
      repository.watch(accountabilityScope).first,
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-missing',
        ),
      ),
    );
    final doc = accountabilityViewDoc(
      accountabilityWire(),
      scope: accountabilityScope,
      evaluatedAt: 900,
    );
    await seedGuestView(firestore, EventAssistanceGuestViews.accountability, {
      ...doc,
      'sourceCoverage': 'invalidSource',
      'incompleteSource': 'eventAttendees',
    });
    await expectLater(
      repository.watch(accountabilityScope).first,
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-invalid-source',
        ),
      ),
    );
    await seedGuestView(firestore, EventAssistanceGuestViews.accountability, {
      ...doc,
      'attendeeId': 'other-guest',
    });
    await expectLater(
      repository.watch(accountabilityScope).first,
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
  });
  test(
    'a departure member review reads the departure checkpoint view and its '
    'context survives the write without becoming an arrival report',
    () async {
      await seed(
        accountabilityWire(
          scope: checkpointAccountabilityScope,
          episodeId: null,
        ),
        scope: checkpointAccountabilityScope,
      );
      final view = await repository.watch(checkpointAccountabilityScope).first;
      expect(view.scope, checkpointAccountabilityScope);
      expect(functions.calls, isEmpty);
      final change = accountabilityChange(
        view: view,
        disposition: AssistanceVisitDisposition.unresolved,
      );
      functions.response = accountabilityAppliedWire(change);
      await repository.apply(change);
      expect(
        (functions.calls.single.input! as Map)['checkpoint'],
        checkpointAccountabilityScope.checkpoint!.toJson(),
      );
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

  test('a guest missing from the departure has no member review', () async {
    final doc = checkpointAccountabilityViewDoc(
      accountabilityWire(scope: checkpointAccountabilityScope),
      scope: checkpointAccountabilityScope,
      evaluatedAt: 900,
    );
    await seedGuestView(firestore, EventAssistanceMovementViews.checkpoints, {
      ...doc,
      'accountability': [
        {'attendeeId': 'other-guest', 'view': null},
      ],
    });
    await expectLater(
      repository.watch(checkpointAccountabilityScope).first,
      throwsA(
        isA<BackendOperationException>().having(
          (e) => e.code,
          'code',
          'live-view-missing',
        ),
      ),
    );
  });
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
