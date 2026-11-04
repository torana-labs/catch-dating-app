import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_guest_view_fixtures.dart';
import 'event_assistance_runtime_fixtures.dart';

void main() {
  late RuntimeTestFunctions functions;
  late FakeFirebaseFirestore firestore;
  late GuestViewTestClock time;
  late EventAssistanceRuntimeRepository repository;
  setUp(() {
    functions = RuntimeTestFunctions();
    firestore = FakeFirebaseFirestore();
    time = GuestViewTestClock(1000);
    repository = EventAssistanceRuntimeRepository(
      functions,
      firestore,
      clock: time.clock,
    );
  });
  Future<void> seed(Map<String, Object?> response, {bool closed = false}) =>
      seedGuestView(
        firestore,
        EventAssistanceGuestViews.runtimes,
        runtimeViewDoc(
          response,
          scope: runtimeScope(),
          evaluatedAt: 900,
          closed: closed,
        ),
      );
  Future<AssistanceRuntimeView> first() =>
      repository.watch(runtimeScope()).first;
  final configured = runtimeResponse(
    revision: 1,
    status: 'configured',
    runtime: runtimeRecord(),
  );

  test(
    'the automation is a manager listener; only sender pages call',
    () async {
      await seed(runtimeResponse());
      final view = await first();
      expect(view.status, AssistanceRuntimeStatus.unconfigured);
      expect(view.senderSetup, isNull);
      expect(functions.calls, isEmpty);
      functions.response = runtimeResponse()
        ..['view'] = {
          ...(runtimeResponse()['view']! as Map),
          'senderSetup': {'choices': [], 'nextCursors': {}},
        };
      final page = await repository.fetchSenderPage(
        runtimeScope(),
        cursors: const {},
      );
      expect(page.senderSetup!.choices, isEmpty);
      expect(functions.calls.single.name, 'getEventAssistanceRuntimeConfig');
      expect(functions.calls.single.input, {
        'context': runtimeScope().context,
        'senderCursors': <String, Object?>{},
      });
    },
  );

  test('a configured window expires by the app clock', () async {
    await seed(configured);
    expect((await first()).status, AssistanceRuntimeStatus.configured);
    time.now = 9000;
    final expired = await first();
    expect(expired.status, AssistanceRuntimeStatus.expired);
    expect(expired.canConfigure, isTrue);
  });

  test("the event end and the event's own closure stop configuring", () async {
    await seed(configured);
    time.now = 10000;
    final ended = await first();
    expect(ended.status, AssistanceRuntimeStatus.eventClosed);
    expect(ended.canConfigure, isFalse);
    time.now = 1000;
    await seed(
      runtimeResponse(
        revision: 1,
        status: 'eventClosed',
        canConfigure: false,
        runtime: runtimeRecord(),
      ),
      closed: true,
    );
    expect((await first()).status, AssistanceRuntimeStatus.eventClosed);
    await seed(
      runtimeResponse(
        revision: 1,
        status: 'paused',
        runtime: runtimeRecord(
          paused: true,
          configuration: runtimeConfiguration(),
        ),
      ),
      closed: true,
    );
    final paused = await first();
    expect(paused.status, AssistanceRuntimeStatus.paused);
    expect(paused.canConfigure, isFalse);
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
        code: 'not-found',
        message: 'NOT_FOUND',
      );
      await expectLater(
        repository.fetchSenderPage(runtimeScope(), cursors: const {}),
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
    'missing, invalid, foreign and malformed views fail the read boundary',
    () async {
      await expectLater(
        first(),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-missing',
          ),
        ),
      );
      final doc = runtimeViewDoc(
        configured,
        scope: runtimeScope(),
        evaluatedAt: 900,
      );
      await seedGuestView(firestore, EventAssistanceGuestViews.runtimes, {
        ...doc,
        'sourceCoverage': 'invalidSource',
        'incompleteSource': 'organizers',
      });
      await expectLater(
        first(),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-invalid-source',
          ),
        ),
      );
      final view = doc['view']! as Map<String, Object?>;
      final runtime = view['runtime']! as Map<String, Object?>;
      for (final raw in [
        {...doc, 'eventId': 'foreign'},
        {...doc, 'view': <String, Object?>{}},
        {
          ...doc,
          'view': {
            ...view,
            'runtime': {...runtime, 'configuration': null},
          },
        },
      ]) {
        await seedGuestView(firestore, EventAssistanceGuestViews.runtimes, raw);
        await expectLater(first(), throwsA(isA<BackendOperationException>()));
      }
    },
  );
}
