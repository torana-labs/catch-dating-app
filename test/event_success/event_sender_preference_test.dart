import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_sender_preference_fixtures.dart';

void main() {
  for (final channel in EventSenderChannel.values) {
    group(channel.name, () {
      final scope = senderScope(channel);
      test(
        'reviewed grants and original-binding withdrawals match canonical schemas',
        () {
          final schema = JsonSchema.create(
            channel == EventSenderChannel.whatsapp
                ? contractSchema('SetEventWhatsappPreferenceCallablePayload')
                : channel == EventSenderChannel.sms
                ? contractSchema(
                    'SetEventAssistanceSmsPreferenceCallablePayload',
                  )
                : contractSchema('SetEventRcsPreferenceCallablePayload'),
          );
          final grant = senderView(scope).prepareChange(
            requestId: 'grant-1',
            decision: EventSenderPreferenceDecision.grant,
          );
          final stop = senderApplied(grant).view.prepareChange(
            requestId: 'stop-1',
            decision: EventSenderPreferenceDecision.revoke,
          );
          for (final change in [grant, stop]) {
            final raw = change.toJson();
            expect(schema.validate(raw).isValid, isTrue);
            expect(raw['senderId'], 'sender-1');
            expect(raw['expectedRevision'], change.snapshot.revision);
            (raw['decision']! as Map<String, Object?>)['kind'] = 'corrupted';
            expect(change.toJson()['decision'], isNot(raw['decision']));
          }
          expect(stop.toJson()['decision'], {'kind': 'revoke'});
          expect(grant.toJson()['decision'], {
            'kind': 'grant',
            'copyVersion': 'catch-event-service-${channel.name}-v1',
            if (channel != EventSenderChannel.sms) 'reviewHash': 'a' * 64,
            if (channel == EventSenderChannel.whatsapp) ...{
              'senderHash': 'b' * 64,
              'stopRecordHash': null,
            },
          });
        },
      );

      test(
        'typed states preserve disabled sender withdrawal and closed channel fields',
        () {
          final schema = JsonSchema.create(
            channel == EventSenderChannel.whatsapp
                ? contractSchema('EventWhatsappPreferenceCallableResponse')
                : channel == EventSenderChannel.sms
                ? contractSchema('EventAssistanceSmsPreferenceCallableResponse')
                : contractSchema('EventRcsPreferenceCallableResponse'),
          );
          for (final availability in EventSenderAvailability.values) {
            if (channel != EventSenderChannel.rcs &&
                availability ==
                    EventSenderAvailability.subscriptionUnavailable) {
              continue;
            }
            final raw = senderResponse(
              scope,
              patch: {
                'availability': availability.name,
                'canEnable': availability == EventSenderAvailability.ready,
                'revision': 1,
                'preference': 'enabled',
                'expiresAt': 3000,
              },
            );
            expect(schema.validate(raw).isValid, isTrue);
            final view = EventSenderPreferenceResult.fromCallableData(
              raw,
              expectedScope: scope,
              expectedSenderId: 'sender-1',
            ).view;
            expect(view.canDisable, isTrue);
            expect(view.canEnable, isFalse);
            expect(view.senderDisplayName, isNotEmpty);
          }
          expect(
            senderView(scope),
            channel == EventSenderChannel.whatsapp
                ? isA<EventWhatsappPreferenceView>()
                : channel == EventSenderChannel.sms
                ? isA<EventSmsSenderPreferenceView>()
                : isA<EventRcsPreferenceView>(),
          );
        },
      );

      test(
        'foreign scope, leaked data, malformed values and contradictory grants fail',
        () {
          for (final patch in <Map<String, Object?>>[
            {'eventId': 'foreign'},
            {'attendeeId': 'foreign'},
            {'senderId': 'foreign'},
            {'phoneE164': '+919999999999'},
            {'phoneLastFour': 'phone'},
            {'phoneLastFour': null},
            {'serverTime': -1},
            {'serverTime': double.nan},
            {'revision': 0},
            {'revision': 1.1},
            {'serverTime': 9007199254740992},
            {'reviewHash': 'old'},
            {'canEnable': false},
            {'sender': null},
            {
              'sender': {'displayName': 'Host', 'providerId': 'private'},
            },
            {'preference': 'delivered'},
            {'availability': 'online'},
            {'preference': 'enabled', 'revision': 1, 'expiresAt': 1000},
            {'preference': 'disabled', 'revision': null, 'expiresAt': 3000},
            {
              'consent': {
                'version':
                    'catch-event-service-${channel == EventSenderChannel.sms ? 'rcs' : 'sms'}-v1',
                'text': 'Wrong channel',
              },
            },
            if (channel == EventSenderChannel.whatsapp) ...[
              {'stopRecordHash': 'old'},
              {'eventTitle': 'Wrong fields'},
              {'availability': 'subscriptionUnavailable', 'canEnable': false},
            ] else
              {'stopRecordHash': null},
          ]) {
            expect(
              () => senderView(scope, patch: patch),
              throwsFormatException,
              reason: patch.toString(),
            );
          }
          final unavailable = senderView(
            scope,
            patch: {'availability': 'senderUnavailable', 'canEnable': false},
          );
          expect(
            () => unavailable.prepareChange(
              requestId: 'one',
              decision: EventSenderPreferenceDecision.grant,
            ),
            throwsStateError,
          );
          expect(
            () => senderView(scope).prepareChange(
              requestId: 'a/b',
              decision: EventSenderPreferenceDecision.grant,
            ),
            throwsFormatException,
          );
        },
      );

      test(
        'discovery is bounded and rejects leaked, foreign and non-advancing pages',
        () {
          final schema = JsonSchema.create(
            channel == EventSenderChannel.whatsapp
                ? contractSchema('ListEventWhatsappPreferencesCallableResponse')
                : channel == EventSenderChannel.sms
                ? contractSchema('ListEventSmsPreferencesCallableResponse')
                : contractSchema('ListEventRcsPreferencesCallableResponse'),
          );
          final cursor = senderCursor(channel, 'a');
          final raw = senderPageRaw(
            scope,
            configured: null,
            nextCursor: cursor,
          );
          expect(schema.validate(raw).isValid, isTrue);
          final empty = EventSenderPreferencePage.fromCallableData(
            raw,
            expectedScope: scope,
            after: null,
          );
          expect(empty.previousSenderIds, isEmpty);
          expect(empty.nextCursor, cursor);
          expect(
            () => empty.previousSenderIds.add('other'),
            throwsUnsupportedError,
          );
          for (final patch in <Map<String, Object?>>[
            {'eventId': 'foreign'},
            {
              'previousSenderIds': ['old', 'old'],
            },
            {
              'previousSenderIds': ['sender-1'],
            },
            {
              'previousSenderIds': ['bad/id'],
            },
            {'previousSenderIds': List.generate(51, (i) => 'old-$i')},
            {
              'nextCursor': senderCursor(
                channel == EventSenderChannel.rcs
                    ? EventSenderChannel.whatsapp
                    : EventSenderChannel.rcs,
                'b',
              ),
            },
            {'nextCursor': cursor},
            {'serverTime': -1},
            {'privatePhone': 'private'},
          ]) {
            expect(
              () => EventSenderPreferencePage.fromCallableData(
                senderPageRaw(scope, patch: patch),
                expectedScope: scope,
                after: cursor,
              ),
              throwsFormatException,
              reason: patch.toString(),
            );
          }
        },
      );

      test(
        'replay uses current state and revoke can confirm the old recipient binding',
        () {
          final grant = senderView(scope).prepareChange(
            requestId: 'one',
            decision: EventSenderPreferenceDecision.grant,
          );
          senderApplied(grant).requireChange(grant);
          for (final patch in <Map<String, Object?>>[
            {'revision': 2},
            {'preference': 'disabled'},
            if (channel != EventSenderChannel.sms) {'reviewHash': 'c' * 64},
          ]) {
            expect(
              () => senderApplied(grant, patch: patch).requireChange(grant),
              throwsFormatException,
            );
          }
          senderApplied(
            grant,
            outcome: 'replayed',
            patch: {'revision': 3, 'preference': 'notSet', 'expiresAt': null},
          ).requireChange(grant);
          final stop = senderApplied(grant).view.prepareChange(
            requestId: 'two',
            decision: EventSenderPreferenceDecision.revoke,
          );
          final result = senderApplied(
            stop,
            patch: {
              'preference': 'notSet',
              'expiresAt': null,
              'phoneLastFour': null,
              'availability': 'verifyPhone',
              'canEnable': false,
              'reviewHash': 'c' * 64,
            },
          );
          result.requireChange(stop);
          expect(result.view.preference, EventSenderPreference.notSet);
        },
      );
    });
  }

  test(
    'RCS can expire under a shortened event before the saved grant expiry',
    () {
      final view = senderView(
        senderScope(EventSenderChannel.rcs),
        patch: {
          'revision': 1,
          'preference': 'expired',
          'expiresAt': 3000,
          'availability': 'eventClosed',
          'canEnable': false,
        },
      );
      expect(view.canEnable, isFalse);
      expect(view.canDisable, isFalse);
    },
  );

  test('channel and attendee form independent scope identities', () {
    final whatsapp = senderScope(EventSenderChannel.whatsapp);
    expect(whatsapp, senderScope(EventSenderChannel.whatsapp));
    expect(whatsapp, isNot(senderScope(EventSenderChannel.rcs)));
    expect(
      whatsapp,
      isNot(senderScope(EventSenderChannel.whatsapp, attendeeId: 'other')),
    );
  });
}
