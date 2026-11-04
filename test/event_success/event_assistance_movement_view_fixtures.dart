import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

Map<String, Object?> _copy(Object? value) =>
    (jsonDecode(jsonEncode(value)) as Map).cast<String, Object?>();

Map<String, Object?> _evaluation(int evaluatedAt) => {
  'revision': 1,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(evaluatedAt),
  'sourceCoverage': 'complete',
  'incompleteSource': null,
};

/// The `hostEventGroupProgressViews` document the server writes for a
/// manager read [response] (its view without serverTime).
Map<String, Object?> groupProgressViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceGroupScope scope,
  required int evaluatedAt,
  required int endAt,
}) {
  final view = _copy(response['view'])..remove('serverTime');
  return {
    'schemaVersion': 1,
    'progressId': groupProgressViewId(scope),
    'eventId': scope.eventId,
    'organizerId': scope.organizerId,
    'groupId': scope.groupId,
    ..._evaluation(evaluatedAt),
    'eventEndAtMillis': endAt,
    'view': view,
  };
}

/// The `hostEventDepartureViews` document for one history [row].
Map<String, Object?> departureViewDoc(
  Map<String, Object?> row, {
  required EventAssistanceGroupScope scope,
  required int evaluatedAt,
}) => {
  'schemaVersion': 1,
  'rosterId':
      'departure-roster:${'${row['progressRevision']}'.padLeft(64, '0')}',
  'eventId': scope.eventId,
  'organizerId': scope.organizerId,
  'groupId': scope.groupId,
  'progressId': groupProgressViewId(scope),
  'progressRevision': row['progressRevision'],
  'confirmedAt': row['confirmedAt'],
  ..._evaluation(evaluatedAt),
  'view': _copy(row),
};

/// The `hostEventCheckpointViews` document for a manager read [response]:
/// no serverTime, and reporter choices without the actor or their window.
Map<String, Object?> checkpointViewDoc(
  Map<String, Object?> response, {
  required EventAssistanceCheckpointScope scope,
  required int evaluatedAt,
  int endAt = 1 << 40,
  int ownerValidUntil = 9007199254740991,
}) {
  final view = _copy(response['view'])..remove('serverTime');
  final options = view['reporterOptions'];
  view.putIfAbsent('assignment', () => null);
  view.putIfAbsent('closeout', () => null);
  view['reporterOptions'] = options is Map
      ? {'sourceHash': options['sourceHash'], 'reporters': options['reporters']}
      : null;
  return {
    'schemaVersion': 1,
    'checkpointViewId': checkpointViewId(scope),
    'eventId': scope.group.eventId,
    'organizerId': scope.group.organizerId,
    'groupId': scope.group.groupId,
    'progressRevision': scope.progressRevision,
    'checkpointId': scope.checkpointId,
    'rosterId': 'departure-roster:${'2' * 64}',
    'memberAttendeeIds': const <String>[],
    ..._evaluation(evaluatedAt),
    'eventEndAtMillis': endAt,
    'ownerValidUntilMillis': ownerValidUntil,
    'view': view,
    'accountability': const <Object?>[],
  };
}
