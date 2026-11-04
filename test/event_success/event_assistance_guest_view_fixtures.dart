import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

Map<String, Object?> _copy(Object? value) =>
    (jsonDecode(jsonEncode(value)) as Map).cast<String, Object?>();

Map<String, Object?> _evaluation(int evaluatedAt) => {
  'revision': 1,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(evaluatedAt),
  'sourceCoverage': 'complete',
  'incompleteSource': null,
};

/// A clock a test moves by assigning [now].
final class GuestViewTestClock {
  GuestViewTestClock(this.now);
  int now;
  AppClock get clock =>
      AppClock.custom(() => DateTime.fromMillisecondsSinceEpoch(now));
}

/// The `hostEventAccountabilityViews` document the server writes for a
/// manager's event-wide read [response].
Map<String, Object?> accountabilityViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceAccountabilityScope scope,
  required int evaluatedAt,
}) {
  final view = _copy(response['view'])
    ..remove('serverTime')
    ..remove('context')
    ..remove('groupId')
    ..remove('attendeeId');
  return {
    'schemaVersion': 1,
    'accountabilityViewId': accountabilityViewId(scope.guest),
    'eventId': scope.group.eventId,
    'organizerId': scope.group.organizerId,
    'attendeeId': scope.attendeeId,
    ..._evaluation(evaluatedAt),
    'view': view,
  };
}

/// The departure checkpoint view carrying [response] as its one member's
/// checkpoint-scoped accountability (the rest of the view is not read here).
Map<String, Object?> checkpointAccountabilityViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceAccountabilityScope scope,
  required int evaluatedAt,
}) {
  final checkpoint = scope.checkpoint!;
  final view = _copy(response['view'])
    ..remove('serverTime')
    ..remove('context')
    ..remove('groupId')
    ..remove('attendeeId')
    ..remove('checkpoint');
  return {
    'schemaVersion': 1,
    'checkpointViewId': checkpointViewId(
      EventAssistanceCheckpointScope(
        group: scope.group,
        checkpoint: checkpoint,
      ),
    ),
    'eventId': scope.group.eventId,
    'organizerId': scope.group.organizerId,
    'groupId': scope.group.groupId,
    'progressRevision': checkpoint.progressRevision,
    'checkpointId': checkpoint.checkpointId,
    'rosterId': 'departure-roster:${'2' * 64}',
    'memberAttendeeIds': [scope.attendeeId],
    ..._evaluation(evaluatedAt),
    'eventEndAtMillis': 1 << 40,
    'ownerValidUntilMillis': 9007199254740991,
    'view': null,
    'accountability': [
      {'attendeeId': scope.attendeeId, 'view': view},
    ],
  };
}

/// The `hostEventMembershipViews` document for a manager read [response]:
/// no serverTime or handover review, and the uncapped [receivers].
Map<String, Object?> membershipViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceGuestScope scope,
  required int evaluatedAt,
  required int endAt,
  List<Map<String, Object?>> receivers = const [],
}) {
  final view = _copy(response['view'])
    ..remove('serverTime')
    ..remove('handoverReview');
  return {
    'schemaVersion': 1,
    'membershipId': membershipViewId(scope),
    'eventId': scope.eventId,
    'organizerId': scope.organizerId,
    'attendeeId': scope.attendeeId,
    ..._evaluation(evaluatedAt),
    'eventEndAtMillis': endAt,
    'view': view,
    'receivers': receivers,
  };
}

/// The `hostEventAssistanceSettingViews` document for a manager read
/// [response] of the late-join setting.
Map<String, Object?> lateJoinSettingViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceGroupScope scope,
  required int evaluatedAt,
  int endAt = 1 << 40,
}) => {
  'schemaVersion': 1,
  'settingId': lateJoinSettingViewId(scope),
  'eventId': scope.eventId,
  'organizerId': scope.organizerId,
  'groupId': scope.groupId,
  'workflowKind': 'lateJoin',
  ..._evaluation(evaluatedAt),
  'eventEndAtMillis': endAt,
  'view': _copy(response['view'])..remove('serverTime'),
};

/// The `hostEventRuntimeViews` document for a manager read [response],
/// without the sender picker.
Map<String, Object?> runtimeViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceRuntimeScope scope,
  required int evaluatedAt,
  bool closed = false,
}) {
  final view = _copy(response['view'])
    ..remove('serverTime')
    ..remove('senderSetup');
  return {
    'schemaVersion': 1,
    'runtimeId': runtimeViewId(scope),
    'eventId': scope.eventId,
    'organizerId': scope.organizerId,
    ..._evaluation(evaluatedAt),
    'eventEndAtMillis': view['eventEnd'],
    'closed': closed,
    'view': view,
  };
}

/// Writes [doc] where the repositories listen for it.
Future<void> seedGuestView(
  FirebaseFirestore firestore,
  String collection,
  Map<String, Object?> doc,
) {
  final id =
      doc['accountabilityViewId'] ??
      doc['checkpointViewId'] ??
      doc['membershipId'] ??
      doc['settingId'] ??
      doc['runtimeId'];
  return firestore.collection(collection).doc(id! as String).set(doc);
}
