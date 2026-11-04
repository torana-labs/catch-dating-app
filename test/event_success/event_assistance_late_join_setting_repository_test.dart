import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_guest_view_fixtures.dart';
import 'event_assistance_late_join_setting_fixtures.dart';

void main() {
  late SettingTestFunctions functions;
  late FakeFirebaseFirestore firestore;
  late GuestViewTestClock time;
  late EventAssistanceLateJoinSettingRepository repository;
  setUp(() {
    functions = SettingTestFunctions();
    firestore = FakeFirebaseFirestore();
    time = GuestViewTestClock(1000);
    repository = EventAssistanceLateJoinSettingRepository(
      functions,
      firestore,
      clock: time.clock,
    );
  });
  Future<void> seed(
    Map<String, Object?> response, {
    String groupId = 'event:whole',
  }) => seedGuestView(
    firestore,
    EventAssistanceGuestViews.settings,
    lateJoinSettingViewDoc(
      response,
      scope: settingScope(groupId: groupId),
      evaluatedAt: 900,
    ),
  );

  test(
    'each group workflow is its own manager listener and calls nothing',
    () async {
      await seed(settingResponse());
      await seed(
        settingResponse(
          groupId: 'easy',
          status: 'configured',
          origin: 'event',
          effective: settingTemplate(),
        ),
        groupId: 'easy',
      );
      final whole = await repository.watch(settingScope()).first;
      expect(whole.suggested, isNotNull);
      expect(whole.serverTime, 1000);
      final easy = await repository.watch(settingScope(groupId: 'easy')).first;
      expect(easy.origin, AssistanceSettingOrigin.event);
      expect(functions.calls, isEmpty);
      time.now = 500;
      expect((await repository.watch(settingScope()).first).serverTime, 900);
    },
  );

  test(
    'retries preserve consent-free preference payload and original receipt revision',
    () async {
      final change = settingView().prepareChange(
        requestId: 'retry:once',
        preference: LateJoinConfigured(lateJoinTemplate()),
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
      functions.response = settingResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        own: settingRecord(revision: 3, preference: {'kind': 'disabled'}),
        status: 'disabled',
        origin: 'event',
      );
      final result = await repository.apply(change);
      expect(functions.calls[0].input, functions.calls[1].input);
      expect(functions.calls.map((call) => call.name).toSet(), {
        'setEventAssistanceSetting',
      });
      expect(result.operationRevision, 1);
      expect(result.view.ownRevision, 3);
    },
  );

  test('applied result must confirm the exact requested choice', () async {
    final change = settingView().prepareChange(
      requestId: 'once',
      preference: const LateJoinDisabled(),
    );
    functions.response = settingResponse(
      outcome: 'applied',
      operationRevision: 1,
      revision: 1,
      own: settingRecord(preference: {'kind': 'disabled'}),
      status: 'disabled',
      origin: 'event',
    );
    expect((await repository.apply(change)).operationRevision, 1);
    functions.response = settingResponse(
      outcome: 'applied',
      operationRevision: 1,
      revision: 1,
      own: settingRecord(),
      status: 'configured',
      origin: 'event',
      effective: settingTemplate(),
    );
    await expectLater(
      repository.apply(change),
      throwsA(isA<BackendOperationException>()),
    );
  });

  test(
    'conflicts, permission failures and dormant endpoints remain visible errors',
    () async {
      final change = settingView().prepareChange(
        requestId: 'once',
        preference: const LateJoinDisabled(),
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
        repository.apply(change),
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
    'missing, invalid, malformed and foreign views cannot become read success',
    () async {
      await expectLater(
        repository.watch(settingScope()).first,
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-missing',
          ),
        ),
      );
      final doc = lateJoinSettingViewDoc(
        settingResponse(),
        scope: settingScope(),
        evaluatedAt: 900,
      );
      await seedGuestView(firestore, EventAssistanceGuestViews.settings, {
        ...doc,
        'sourceCoverage': 'invalidSource',
        'incompleteSource': 'eventAssistanceSettings',
      });
      await expectLater(
        repository.watch(settingScope()).first,
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'live-view-invalid-source',
          ),
        ),
      );
      for (final raw in [
        {...doc, 'view': <String, Object?>{}},
        {...doc, 'groupId': 'foreign'},
        {...doc, 'workflowKind': 'venueReadiness'},
      ]) {
        await seedGuestView(firestore, EventAssistanceGuestViews.settings, raw);
        await expectLater(
          repository.watch(settingScope()).first,
          throwsA(isA<BackendOperationException>()),
        );
      }
    },
  );
}
