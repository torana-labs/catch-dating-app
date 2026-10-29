import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_late_join_setting_fixtures.dart';

void main() {
  late SettingTestFunctions functions;
  late EventAssistanceLateJoinSettingRepository repository;
  setUp(() {
    functions = SettingTestFunctions();
    repository = EventAssistanceLateJoinSettingRepository(functions);
  });

  test(
    'read is limited to the requested live event and group workflow',
    () async {
      final view = await repository.fetch(settingScope());
      expect(view.suggested, isNotNull);
      expect(functions.calls.single.name, 'getEventAssistanceSetting');
      expect(functions.calls.single.input, {
        'context': settingScope().context,
        'groupId': 'event:whole',
        'workflowKind': 'lateJoin',
      });
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
        code: 'permission-denied',
        message: 'Denied',
      );
      await expectLater(
        repository.fetch(settingScope()),
        throwsA(isA<PermissionException>()),
      );
      functions.error = FirebaseFunctionsException(
        code: 'not-found',
        message: 'NOT_FOUND',
      );
      await expectLater(
        repository.fetch(settingScope()),
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
    'malformed, foreign and mutation responses cannot become read success',
    () async {
      for (final raw in [
        null,
        {},
        settingResponse(groupId: 'foreign'),
        settingResponse(outcome: 'applied', operationRevision: 0),
      ]) {
        functions.response = raw;
        await expectLater(
          repository.fetch(settingScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
    },
  );
}
