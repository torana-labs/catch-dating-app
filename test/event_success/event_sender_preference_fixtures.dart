import 'dart:async';

import 'package:catch_dating_app/contexts/live/data/event_sender_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sender_preference.dart';
import 'package:flutter_test/flutter_test.dart';

EventSenderPreferenceScope senderScope(
  EventSenderChannel channel, {
  String eventId = 'event-1',
  String attendeeId = 'attendee-1',
}) => EventSenderPreferenceScope(
  channel: channel,
  eventId: eventId,
  attendeeId: attendeeId,
);

String senderCursor(EventSenderChannel channel, String hash) =>
    '${channel == EventSenderChannel.whatsapp ? 'wa' : channel.name}-permission:${hash * 64}';

Map<String, Object?> senderPageRaw(
  EventSenderPreferenceScope scope, {
  String? configured = 'sender-1',
  List<String> previous = const [],
  String? nextCursor,
  Map<String, Object?> patch = const {},
}) => {
  'eventId': scope.eventId,
  'attendeeId': scope.attendeeId,
  'serverTime': 1000,
  'configuredSenderId': configured,
  'previousSenderIds': previous,
  'nextCursor': nextCursor,
  ...patch,
};

EventSenderPreferencePage senderPage(
  EventSenderPreferenceScope scope, {
  String? configured = 'sender-1',
  List<String> previous = const [],
  String? nextCursor,
  String? after,
}) => EventSenderPreferencePage.fromCallableData(
  senderPageRaw(
    scope,
    configured: configured,
    previous: previous,
    nextCursor: nextCursor,
  ),
  expectedScope: scope,
  after: after,
);

Map<String, Object?> senderResponse(
  EventSenderPreferenceScope scope, {
  String senderId = 'sender-1',
  String outcome = 'read',
  Map<String, Object?> patch = const {},
}) => {
  'outcome': outcome,
  'view': {
    'eventId': scope.eventId,
    'attendeeId': scope.attendeeId,
    'senderId': senderId,
    'serverTime': 1000,
    'revision': null,
    'reviewHash': 'a' * 64,
    'preference': 'notSet',
    'canEnable': true,
    'availability': 'ready',
    'phoneLastFour': '9999',
    'expiresAt': null,
    'consent': {
      'version': 'catch-event-service-${scope.channel.name}-v1',
      'text': 'Fixture consent for this event.',
    },
    if (scope.channel == EventSenderChannel.whatsapp) ...{
      'stopRecordHash': null,
      'sender': {
        'displayName': 'Organizer',
        'displayPhoneNumber': '+919000000001',
        'bindingHash': 'b' * 64,
      },
    } else if (scope.channel == EventSenderChannel.rcs) ...{
      'eventTitle': 'Evening run',
      'sender': {'displayName': 'Catch Events'},
    },
    ...patch,
  },
};

EventSenderPreferenceView senderView(
  EventSenderPreferenceScope scope, {
  String senderId = 'sender-1',
  Map<String, Object?> patch = const {},
}) => EventSenderPreferenceResult.fromCallableData(
  senderResponse(scope, senderId: senderId, patch: patch),
  expectedScope: scope,
  expectedSenderId: senderId,
).view;

Map<String, Object?> senderAppliedRaw(
  EventSenderPreferenceChange change, {
  String outcome = 'applied',
  Map<String, Object?> patch = const {},
}) => senderResponse(
  change.snapshot.scope,
  senderId: change.snapshot.senderId,
  outcome: outcome,
  patch: {
    'serverTime': 2000,
    'reviewHash': change.snapshot.reviewHash,
    'revision': (change.snapshot.revision ?? 0) + 1,
    'preference': change.decision == EventSenderPreferenceDecision.grant
        ? 'enabled'
        : 'disabled',
    'expiresAt': 3000,
    ...patch,
  },
);

EventSenderPreferenceResult senderApplied(
  EventSenderPreferenceChange change, {
  String outcome = 'applied',
  Map<String, Object?> patch = const {},
}) => EventSenderPreferenceResult.fromCallableData(
  senderAppliedRaw(change, outcome: outcome, patch: patch),
  expectedScope: change.snapshot.scope,
  expectedSenderId: change.snapshot.senderId,
);

class SenderTestRepository extends Fake
    implements EventSenderPreferenceRepository {
  final pages =
      <
        ({
          EventSenderPreferenceScope scope,
          String? cursor,
          Completer<EventSenderPreferencePage> result,
        })
      >[];
  final reads =
      <
        ({
          EventSenderPreferenceScope scope,
          String senderId,
          Completer<EventSenderPreferenceView> result,
        })
      >[];
  final writes =
      <
        ({
          EventSenderPreferenceChange change,
          Completer<EventSenderPreferenceResult> result,
        })
      >[];
  Completer<void> _changed = Completer<void>();

  void _signal() {
    final old = _changed;
    _changed = Completer<void>();
    old.complete();
  }

  @override
  Future<EventSenderPreferencePage> list(
    EventSenderPreferenceScope scope, {
    String? cursor,
  }) {
    final result = Completer<EventSenderPreferencePage>();
    pages.add((scope: scope, cursor: cursor, result: result));
    _signal();
    return result.future;
  }

  @override
  Future<EventSenderPreferenceView> fetch(
    EventSenderPreferenceScope scope,
    String senderId,
  ) {
    final result = Completer<EventSenderPreferenceView>();
    reads.add((scope: scope, senderId: senderId, result: result));
    _signal();
    return result.future;
  }

  @override
  Future<EventSenderPreferenceResult> apply(
    EventSenderPreferenceChange change,
  ) {
    final result = Completer<EventSenderPreferenceResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  Future<void> waitForPages(int count) async {
    while (pages.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }
}
