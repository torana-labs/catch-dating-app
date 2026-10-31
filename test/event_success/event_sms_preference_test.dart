import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_sms_preference_fixtures.dart';

void main() {
  test('withdrawal may leave a corrected recipient without a permission', () {
    final granted = smsView().prepareChange(
      requestId: 'grant-original',
      decision: EventSmsPreferenceDecision.grant,
    );
    final withdrawal = smsApplied(granted).view.prepareChange(
      requestId: 'withdraw-original',
      decision: EventSmsPreferenceDecision.revoke,
    );
    final result = smsApplied(
      withdrawal,
      patch: {
        'preference': 'notSet',
        'expiresAt': null,
        'phoneLastFour': '1234',
      },
    );
    expect(() => result.requireChange(withdrawal), returnsNormally);
    expect(result.view.canEnable, isTrue);
    expect(result.view.canDisable, isFalse);
    expect(
      () => smsApplied(
        withdrawal,
        patch: {'preference': 'enabled'},
      ).requireChange(withdrawal),
      throwsFormatException,
    );
    expect(
      () => smsApplied(
        withdrawal,
        patch: {'preference': 'notSet', 'expiresAt': null, 'revision': 3},
      ).requireChange(withdrawal),
      throwsFormatException,
    );
  });
  test(
    'closed decisions preserve reviewed fields and match the source schema',
    () {
      final first = smsView().prepareChange(
        requestId: 'grant-1',
        decision: EventSmsPreferenceDecision.grant,
      );
      final enabled = smsApplied(first).view;
      final second = enabled.prepareChange(
        requestId: 'revoke-1',
        decision: EventSmsPreferenceDecision.revoke,
      );
      final schema = JsonSchema.create(
        contractSchema('SetEventAssistanceSmsPreferenceCallablePayload'),
      );
      for (final change in [first, second]) {
        final wire = change.toJson();
        expect(schema.validate(wire).isValid, isTrue);
        expect(wire['expectedReviewHash'], change.snapshot.reviewHash);
        expect(wire['expectedRevision'], change.snapshot.revision);
        expect(wire['eventId'], 'event-1');
        expect(wire['attendeeId'], 'attendee-1');
        (wire['decision']! as Map<String, Object?>)['kind'] = 'changed';
        expect(change.toJson()['decision'], isNot(wire['decision']));
      }
      expect(first.toJson()['decision'], {
        'kind': 'grant',
        'copyVersion': 'catch-event-service-sms-v1',
      });
      expect(second.toJson()['decision'], {'kind': 'revoke'});
    },
  );

  test(
    'server states remain typed with withdrawal independent of readiness',
    () {
      final schema = JsonSchema.create(
        contractSchema('EventAssistanceSmsPreferenceCallableResponse'),
      );
      for (final availability in EventSmsAvailability.values) {
        for (final preference in EventSmsPreference.values) {
          final raw = smsResponse(
            viewPatch: {
              'availability': availability.name,
              'canEnable': availability == EventSmsAvailability.ready,
              'preference': preference.name,
              'revision': preference == EventSmsPreference.notSet ? null : 1,
              'expiresAt': switch (preference) {
                EventSmsPreference.notSet => null,
                EventSmsPreference.expired => 999,
                _ => 3000,
              },
            },
          );
          expect(schema.validate(raw).isValid, isTrue);
          final view = EventSmsPreferenceResult.fromCallableData(
            raw,
            expectedScope: smsScope(),
          ).view;
          expect(view.preference, preference);
          expect(view.availability, availability);
          expect(view.canDisable, preference == EventSmsPreference.enabled);
        }
      }
    },
  );

  test(
    'invalid identity, privacy leaks and contradictory replies are rejected',
    () {
      for (final patch in <Map<String, Object?>>[
        {'eventId': 'foreign'},
        {'attendeeId': 'foreign'},
        {'revision': 0},
        {'serverTime': -1},
        {'serverTime': double.nan},
        {'revision': 1.2},
        {'serverTime': 9007199254740992},
        {'reviewHash': 'stale'},
        {'phoneLastFour': '+919999999999'},
        {'phoneLastFour': null},
        {'phoneE164': '+919999999999'},
        {'preference': 'delivered'},
        {'availability': 'online'},
        {'canEnable': false},
        {
          'consent': {'version': 'unknown', 'text': 'Other terms'},
        },
        {
          'consent': {'version': 'catch-event-service-sms-v1', 'text': ''},
        },
        {'preference': 'enabled', 'expiresAt': 3000},
        {'preference': 'enabled', 'revision': 1, 'expiresAt': 1000},
        {'preference': 'expired', 'revision': 1, 'expiresAt': 2000},
      ]) {
        expect(
          () => smsView(patch: patch),
          throwsFormatException,
          reason: patch.toString(),
        );
      }
      for (final data in [
        null,
        {},
        {...smsResponse(), 'private': true},
        smsResponse(outcome: 'sent'),
      ]) {
        expect(
          () => EventSmsPreferenceResult.fromCallableData(
            data,
            expectedScope: smsScope(),
          ),
          throwsFormatException,
        );
      }
      expect(
        () => EventSmsPreferenceScope(eventId: 'a/b', attendeeId: 'one'),
        throwsFormatException,
      );
    },
  );

  test(
    'unavailable grants are impossible; current grants can still be withdrawn',
    () {
      final paused = smsView(
        patch: {'availability': 'senderUnavailable', 'canEnable': false},
      );
      expect(paused.isOptionalOfferHidden, isTrue);
      expect(
        () => paused.prepareChange(
          requestId: 'one',
          decision: EventSmsPreferenceDecision.grant,
        ),
        throwsStateError,
      );
      final enabled = smsView(
        patch: {
          'revision': 1,
          'preference': 'enabled',
          'expiresAt': 3000,
          'availability': 'verifyPhone',
          'canEnable': false,
        },
      );
      expect(
        enabled
            .prepareChange(
              requestId: 'one',
              decision: EventSmsPreferenceDecision.revoke,
            )
            .decision,
        EventSmsPreferenceDecision.revoke,
      );
    },
  );

  test(
    'only the applied result must match the submitted decision and revision',
    () {
      final change = smsView().prepareChange(
        requestId: 'one',
        decision: EventSmsPreferenceDecision.grant,
      );
      smsApplied(change).requireChange(change);
      for (final patch in <Map<String, Object?>>[
        {'revision': 2},
        {'preference': 'disabled'},
      ]) {
        expect(
          () => smsApplied(change, patch: patch).requireChange(change),
          throwsFormatException,
        );
      }
      final current = smsApplied(
        change,
        outcome: 'replayed',
        patch: {'revision': 4, 'preference': 'disabled'},
      );
      current.requireChange(change);
      expect(current.view.preference, EventSmsPreference.disabled);
      final conflict = EventSmsPreferenceResult.fromCallableData(
        smsResponse(outcome: 'conflict', viewPatch: {'reviewHash': 'c' * 64}),
        expectedScope: smsScope(),
      );
      conflict.requireChange(change);
      expect(conflict.view.revision, isNull);
    },
  );
}
