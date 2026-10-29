import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_sms_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:flutter_test/flutter_test.dart';

EventSmsPreferenceScope smsScope({String attendeeId = 'attendee-1'}) =>
    EventSmsPreferenceScope(eventId: 'event-1', attendeeId: attendeeId);

Map<String, Object?> smsResponse({
  String outcome = 'read',
  Map<String, Object?> viewPatch = const {},
}) => {
  'outcome': outcome,
  'view': {
    'eventId': 'event-1',
    'attendeeId': 'attendee-1',
    'senderId': 'catch-event-sms',
    'serverTime': 1000,
    'revision': null,
    'reviewHash': 'a' * 64,
    'preference': 'notSet',
    'canEnable': true,
    'availability': 'ready',
    'phoneLastFour': '9999',
    'expiresAt': null,
    'consent': {
      'version': 'catch-event-service-sms-v1',
      'text': 'Fixture text consent for this event.',
    },
    ...viewPatch,
  },
};

EventSmsPreferenceView smsView({Map<String, Object?> patch = const {}}) =>
    EventSmsPreferenceResult.fromCallableData(
      smsResponse(viewPatch: patch),
      expectedScope: smsScope(),
    ).view;

Map<String, Object?> smsAppliedRaw(
  EventSmsPreferenceChange change, {
  String outcome = 'applied',
  Map<String, Object?> patch = const {},
}) => smsResponse(
  outcome: outcome,
  viewPatch: {
    'eventId': change.snapshot.scope.eventId,
    'attendeeId': change.snapshot.scope.attendeeId,
    'senderId': change.snapshot.scope.senderId,
    'serverTime': 2000,
    'reviewHash': 'b' * 64,
    'revision': (change.snapshot.revision ?? 0) + 1,
    'preference': change.decision == EventSmsPreferenceDecision.grant
        ? 'enabled'
        : 'disabled',
    'expiresAt': 3000,
    ...patch,
  },
);

EventSmsPreferenceResult smsApplied(
  EventSmsPreferenceChange change, {
  String outcome = 'applied',
  Map<String, Object?> patch = const {},
}) => EventSmsPreferenceResult.fromCallableData(
  smsAppliedRaw(change, outcome: outcome, patch: patch),
  expectedScope: change.snapshot.scope,
);

class SmsTestRepository extends Fake implements EventSmsPreferenceRepository {
  final reads =
      <
        ({
          EventSmsPreferenceScope scope,
          Completer<EventSmsPreferenceView> result,
        })
      >[];
  final writes =
      <
        ({
          EventSmsPreferenceChange change,
          Completer<EventSmsPreferenceResult> result,
        })
      >[];
  Completer<void> _changed = Completer<void>();

  @override
  Future<EventSmsPreferenceView> fetch(EventSmsPreferenceScope scope) {
    final result = Completer<EventSmsPreferenceView>();
    reads.add((scope: scope, result: result));
    final previous = _changed;
    _changed = Completer<void>();
    previous.complete();
    return result.future;
  }

  @override
  Future<EventSmsPreferenceResult> apply(EventSmsPreferenceChange change) {
    final result = Completer<EventSmsPreferenceResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }
}
