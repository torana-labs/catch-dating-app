import 'dart:convert';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_platform/cryptography/sha256_digest.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// The live console's guest and settings views (`hostEventAccountabilityViews`,
/// `hostEventMembershipViews`, `hostEventAssistanceSettingViews`,
/// `hostEventRuntimeViews`), turned back into the read responses the domain
/// models parse.
///
/// Only managers read these views, so the actor-specific parts of the retired
/// responses are a manager's here. Time enters only as instants the views
/// store (the event's end, a transfer's or a receiver's expiry, an automation
/// window); [guestViewNow] applies the app clock, never earlier than the
/// server's own evaluation.
abstract final class EventAssistanceGuestViews {
  static const accountability = 'hostEventAccountabilityViews';
  static const memberships = 'hostEventMembershipViews';
  static const settings = 'hostEventAssistanceSettingViews';
  static const runtimes = 'hostEventRuntimeViews';

  /// Departure checkpoint views; each carries its roster members'
  /// checkpoint-scoped accountability.
  static const checkpoints = 'hostEventCheckpointViews';
}

/// How long a reviewed choice of receiving operators stays offered, as the
/// retired membership read granted it.
const membershipHandoverReviewWindow = 1800000;

/// The guest's event-wide accountability view.
String accountabilityViewId(EventAssistanceGuestScope guest) =>
    '${guest.eventId}_${guest.attendeeId}';

/// The server names these views after the record they project
/// (`membershipIdentity`, `settingId`, `runtimeConfigId`, `checkpointIdentity`
/// in Functions): SHA-256 of the canonical JSON of the scope, keys sorted.
/// Vectors pinned on both sides keep the two derivations equal.
String membershipViewId(EventAssistanceGuestScope scope) =>
    'membership:${_contentHash({'context': scope.context, 'attendeeId': scope.attendeeId})}';

String lateJoinSettingViewId(EventAssistanceGroupScope scope) =>
    'setting:${_contentHash([scope.context, scope.groupId, 'lateJoin'])}';

String runtimeViewId(EventAssistanceRuntimeScope scope) =>
    'runtime:lateJoin:${_contentHash(scope.context)}';

/// The departure checkpoint view holding a checkpoint-scoped accountability.
String checkpointAccountabilityViewId(
  EventAssistanceGroupScope group,
  AssistanceAccountabilityCheckpoint checkpoint,
) =>
    'checkpoint:${_contentHash([group.context, group.groupId, checkpoint.progressRevision, checkpoint.checkpointId])}';

/// The Functions `operationContentHash` of a JSON value.
String _contentHash(Object? value) => sha256Digest(_canonicalJson(value));

String _canonicalJson(Object? value) {
  if (value == null || value is String || value is bool || value is int) {
    return jsonEncode(value);
  }
  if (value is List) return '[${value.map(_canonicalJson).join(',')}]';
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return '{${keys.map((key) => '${jsonEncode(key)}:${_canonicalJson(value[key])}').join(',')}}';
  }
  throw ArgumentError.value(value, 'value', 'Not a canonical JSON value.');
}

/// A view the server has not written yet, or no longer writes.
BackendOperationException guestViewMissing(
  String resource,
) => BackendOperationException(
  code: 'live-view-missing',
  message:
      'Event operating information is unavailable. Refresh the event setup.',
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'watch live guests and settings',
    resource: resource,
  ),
  retryable: true,
);

/// A view whose last evaluation read a source that failed validation.
BackendOperationException guestViewInvalidSource(
  String resource,
) => BackendOperationException(
  code: 'live-view-invalid-source',
  message:
      'Event operating information is unavailable. Refresh the event setup.',
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'watch live guests and settings',
    resource: resource,
  ),
);

/// The app clock, but never before the server evaluation it is compared
/// with: a view cannot have been evaluated in the future.
int guestViewNow(DateTime clock, Map<String, Object?>? view) {
  final evaluatedAt = view?['evaluatedAt'];
  final now = clock.millisecondsSinceEpoch;
  return evaluatedAt is Timestamp
      ? math.max(now, evaluatedAt.millisecondsSinceEpoch)
      : now;
}

Map<String, Object?> _view(
  Map<String, Object?>? data,
  String resource, {
  required String organizerId,
  required String eventId,
  Map<String, Object?> keys = const {},
}) {
  if (data == null) throw guestViewMissing(resource);
  if (data['organizerId'] != organizerId ||
      data['eventId'] != eventId ||
      keys.entries.any((key) => data[key.key] != key.value)) {
    throw const FormatException('Foreign live guest view.');
  }
  if (data['sourceCoverage'] != 'complete') {
    throw guestViewInvalidSource(resource);
  }
  final view = data['view'];
  if (view is! Map) throw guestViewInvalidSource(resource);
  return view.cast<String, Object?>();
}

int _integer(Object? value) {
  if (value is! int) throw const FormatException('Invalid view instant.');
  return value;
}

Map<String, Object?> _read(Map<String, Object?> view) => {
  'outcome': 'read',
  'operationRevision': null,
  'view': view,
};

/// The retired accountability read for a manager: the event-wide sweep
/// review of one guest.
Map<String, Object?> accountabilityReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceAccountabilityScope scope,
  required int now,
}) {
  if (scope.checkpoint != null || scope.group.groupId != 'event:whole') {
    throw const FormatException('Visit results are reviewed event-wide.');
  }
  final view = _view(
    data,
    EventAssistanceGuestViews.accountability,
    organizerId: scope.group.organizerId,
    eventId: scope.group.eventId,
    keys: {'attendeeId': scope.attendeeId},
  );
  return _read({
    ...view,
    'context': scope.group.context,
    'groupId': scope.group.groupId,
    'attendeeId': scope.attendeeId,
    'serverTime': now,
  });
}

/// The retired accountability read for a manager reviewing one member of a
/// recorded departure: the member's entry on that departure's checkpoint
/// view.
Map<String, Object?> checkpointAccountabilityReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceAccountabilityScope scope,
  required int now,
}) {
  final checkpoint = scope.checkpoint;
  if (checkpoint == null) {
    throw const FormatException('Choose a recorded departure.');
  }
  const resource = EventAssistanceGuestViews.checkpoints;
  if (data == null) throw guestViewMissing(resource);
  if (data['organizerId'] != scope.group.organizerId ||
      data['eventId'] != scope.group.eventId ||
      data['groupId'] != scope.group.groupId ||
      data['progressRevision'] != checkpoint.progressRevision ||
      data['checkpointId'] != checkpoint.checkpointId) {
    throw const FormatException('Foreign live guest view.');
  }
  if (data['sourceCoverage'] != 'complete') {
    throw guestViewInvalidSource(resource);
  }
  final entries = data['accountability'];
  if (entries is! List) throw guestViewInvalidSource(resource);
  final entry = entries
      .whereType<Map<Object?, Object?>>()
      .where((entry) => entry['attendeeId'] == scope.attendeeId)
      .firstOrNull;
  if (entry == null) throw guestViewMissing(resource);
  final view = entry['view'];
  if (view is! Map) throw guestViewInvalidSource(resource);
  return _read({
    ...view.cast<String, Object?>(),
    'context': scope.group.context,
    'groupId': scope.group.groupId,
    'attendeeId': scope.attendeeId,
    'checkpoint': checkpoint.toJson(),
    'serverTime': now,
  });
}

/// The retired membership read for the manager [actorUid]: readiness, a
/// pending transfer's state, the actions and the receiver review follow the
/// app clock and the actor.
Map<String, Object?> membershipReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceGuestScope scope,
  required String actorUid,
  required int now,
}) {
  final view = _view(
    data,
    EventAssistanceGuestViews.memberships,
    organizerId: scope.organizerId,
    eventId: scope.eventId,
    keys: {'attendeeId': scope.attendeeId},
  );
  final eventEnd = _integer(data!['eventEndAtMillis']);
  final ready = view['ready'] == true && now < eventEnd;
  final rawTransfer = view['transfer'];
  final transfer = rawTransfer is Map
      ? rawTransfer.cast<String, Object?>()
      : null;
  var transferState = view['transferState'];
  if (transfer != null &&
      (transferState == 'pending' || transferState == 'expired')) {
    transferState = now >= _integer(transfer['expiresAt'])
        ? 'expired'
        : 'pending';
  }
  final rawGroups = view['groups'];
  if (rawGroups is! List) {
    throw const FormatException('Invalid membership groups.');
  }
  final groupIds = {
    for (final group in rawGroups.whereType<Map<Object?, Object?>>())
      group['groupId'],
  };
  final accepted = view['accepted'];
  final currentAccepted = view['freshness'] == 'current' ? accepted : null;
  final pending = transferState == 'pending';
  // availableMembershipActions for a manager: every saved group is theirs.
  final actions = [
    if (view['episodeId'] != null) ...[
      if (ready && !pending) ...[
        if (currentAccepted == null) 'place',
        'propose',
      ],
      if (pending &&
          transfer!['receivingOperatorId'] == actorUid &&
          groupIds.contains(transfer['to'])) ...[
        if (ready) 'accept',
        'reject',
      ],
      if (transfer?['status'] == 'pending') 'cancel',
      if (accepted != null) 'leave',
    ],
  ];
  return _read({
    ...view,
    'serverTime': now,
    'ready': ready,
    'transferState': transferState,
    'actions': actions,
    if (actions.contains('propose'))
      'handoverReview': _handoverReview(data['receivers'], eventEnd, now),
  });
}

/// The offered review at [now]: it ends with the event or the review window,
/// and each receiver keeps only the groups their authority still covers.
Map<String, Object?> _handoverReview(Object? receivers, int eventEnd, int now) {
  if (receivers is! List) {
    throw const FormatException('Invalid receiving operators.');
  }
  final expiresAt = math.min(eventEnd, now + membershipHandoverReviewWindow);
  return {
    'expiresAt': expiresAt,
    'receivers': [
      for (final receiver in receivers.cast<Map<Object?, Object?>>())
        if (_coveredGroups(receiver['groups'], expiresAt, now) case final groups
            when groups.isNotEmpty)
          {...receiver.cast<String, Object?>(), 'groups': groups},
    ],
  };
}

List<Map<String, Object?>> _coveredGroups(
  Object? groups,
  int expiresAt,
  int now,
) {
  if (groups is! List) {
    throw const FormatException('Invalid receiving operator groups.');
  }
  return [
    for (final group in groups.cast<Map<Object?, Object?>>())
      if (math.min(expiresAt, _integer(group['validUntil'])) case final until
          when until > now)
        {'groupId': group['groupId'], 'validUntil': until},
  ];
}

/// The retired late-join setting read for a manager. Nothing in it depends
/// on time beyond the read instant.
Map<String, Object?> lateJoinSettingReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceGroupScope scope,
  required int now,
}) {
  final view = _view(
    data,
    EventAssistanceGuestViews.settings,
    organizerId: scope.organizerId,
    eventId: scope.eventId,
    keys: {'groupId': scope.groupId, 'workflowKind': 'lateJoin'},
  );
  return _read({...view, 'serverTime': now});
}

/// The retired automation read for a manager, without the sender picker:
/// the event's end by the app clock closes it, and a configured window
/// expires by it.
Map<String, Object?> runtimeReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceRuntimeScope scope,
  required int now,
}) {
  final view = _view(
    data,
    EventAssistanceGuestViews.runtimes,
    organizerId: scope.organizerId,
    eventId: scope.eventId,
  );
  final closed =
      data!['closed'] == true || now >= _integer(data['eventEndAtMillis']);
  var status = view['status'];
  if (status != 'unconfigured' && status != 'paused') {
    if (closed) {
      status = 'eventClosed';
    } else if (status != 'sourceChanged') {
      final runtime = view['runtime'];
      final configuration = runtime is Map ? runtime['configuration'] : null;
      if (configuration is! Map) {
        throw const FormatException('Invalid event automation window.');
      }
      status = _integer(configuration['expiresAt']) <= now
          ? 'expired'
          : 'configured';
    }
  }
  return _read({
    ...view,
    'serverTime': now,
    'status': status,
    'canConfigure': !closed,
  });
}
