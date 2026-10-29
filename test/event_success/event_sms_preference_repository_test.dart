import 'package:catch_dating_app/contexts/live/data/event_sms_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_participation_fixtures.dart';
import 'event_sms_preference_fixtures.dart';

void main() {
  late ParticipationTestFunctions functions;
  late EventSmsPreferenceRepository repository;
  setUp(() {
    functions = ParticipationTestFunctions();
    repository = EventSmsPreferenceRepository(functions);
  });

  test(
    'only the participant scope is sent on reads and exact changes on writes',
    () async {
      functions.response = smsResponse();
      final view = await repository.fetch(smsScope());
      expect(functions.calls.single.name, 'getEventAssistanceSmsPreference');
      expect(functions.calls.single.input, {
        'eventId': 'event-1',
        'attendeeId': 'attendee-1',
      });
      final change = view.prepareChange(
        requestId: 'one',
        decision: EventSmsPreferenceDecision.grant,
      );
      functions.response = smsAppliedRaw(change);
      expect(
        (await repository.apply(change)).view.preference,
        EventSmsPreference.enabled,
      );
      functions.response = smsAppliedRaw(
        change,
        outcome: 'replayed',
        patch: {'preference': 'disabled', 'revision': 2},
      );
      expect(
        (await repository.apply(change)).view.preference,
        EventSmsPreference.disabled,
      );
      expect(functions.calls[1].name, functions.calls[2].name);
      expect(functions.calls[1].input, functions.calls[2].input);
      expect(functions.calls.last.name, 'setEventAssistanceSmsPreference');
      expect(functions.calls.last.input, change.toJson());
    },
  );

  test(
    'malformed and mismatched responses stay failures instead of fake success',
    () async {
      final change = smsView().prepareChange(
        requestId: 'one',
        decision: EventSmsPreferenceDecision.grant,
      );
      for (final data in [
        null,
        {},
        smsResponse(),
        smsAppliedRaw(change, patch: {'attendeeId': 'foreign'}),
        smsAppliedRaw(change, patch: {'preference': 'disabled'}),
      ]) {
        functions.response = data;
        await expectLater(
          repository.apply(change),
          throwsA(isA<BackendOperationException>()),
        );
      }
      for (final data in [
        null,
        smsAppliedRaw(change),
        smsResponse(viewPatch: {'eventId': 'foreign'}),
      ]) {
        functions.response = data;
        await expectLater(
          repository.fetch(smsScope()),
          throwsA(isA<BackendOperationException>()),
        );
      }
    },
  );

  test(
    'missing deployment and permission/network errors keep their meanings',
    () async {
      final change = smsView().prepareChange(
        requestId: 'one',
        decision: EventSmsPreferenceDecision.grant,
      );
      for (final pair in [
        (
          'not-found',
          isA<BackendOperationException>().having(
            (e) => e.code,
            'code',
            'callable-unavailable',
          ),
        ),
        ('permission-denied', isA<PermissionException>()),
        ('unavailable', isA<NetworkException>()),
      ]) {
        functions.error = FirebaseFunctionsException(
          code: pair.$1,
          message: pair.$1 == 'not-found' ? 'NOT_FOUND' : 'Unavailable',
        );
        await expectLater(repository.fetch(smsScope()), throwsA(pair.$2));
        await expectLater(repository.apply(change), throwsA(pair.$2));
      }
    },
  );
}
