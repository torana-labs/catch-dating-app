import 'dart:math' as math;

import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// The live console's movement views (`hostEventGroupProgressViews`,
/// `hostEventDepartureViews`, `hostEventCheckpointViews`), turned back into
/// the read responses the domain models parse.
///
/// Only managers read these views, so the actor-specific parts of the retired
/// responses are manager constants here. Time enters only as instants the
/// views store; [movementViewNow] applies the app clock, never earlier than
/// the server's own evaluation.
abstract final class EventAssistanceMovementViews {
  static const groupProgress = 'hostEventGroupProgressViews';
  static const departures = 'hostEventDepartureViews';
  static const checkpoints = 'hostEventCheckpointViews';
}

/// Largest JavaScript-safe integer: "no expiry" for a manager.
const assistanceNoExpiry = 9007199254740991;

/// How long a manager's reporter choice list stays reviewable, as the retired
/// checkpoint read granted it.
const checkpointReporterChoiceWindow = 1800000;

/// A view the server has not written yet, or no longer writes.
BackendOperationException liveViewMissing(
  String resource,
) => BackendOperationException(
  code: 'live-view-missing',
  message:
      'Event operating information is unavailable. Refresh the event setup.',
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'watch live movement',
    resource: resource,
  ),
  retryable: true,
);

/// A view whose last evaluation read a source that failed validation.
BackendOperationException liveViewInvalidSource(
  String resource,
) => BackendOperationException(
  code: 'live-view-invalid-source',
  message:
      'Event operating information is unavailable. Refresh the event setup.',
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'watch live movement',
    resource: resource,
  ),
);

/// The app clock, but never before any server evaluation it is compared
/// with: a view cannot have been evaluated in the future.
int movementViewNow(DateTime clock, Iterable<Map<String, Object?>?> views) {
  var now = clock.millisecondsSinceEpoch;
  for (final view in views) {
    final evaluatedAt = view?['evaluatedAt'];
    if (evaluatedAt is Timestamp) {
      now = math.max(now, evaluatedAt.millisecondsSinceEpoch);
    }
  }
  return now;
}

/// The nearest of [instants] after [now], when the view must be read again
/// because a field it derives from the clock changes then; null when none is
/// ahead.
DateTime? nextMovementViewRebuild(Iterable<Object?> instants, int now) {
  int? next;
  for (final instant in instants) {
    if (instant is int && instant > now && (next == null || instant < next)) {
      next = instant;
    }
  }
  return next == null ? null : DateTime.fromMillisecondsSinceEpoch(next);
}

/// When the group view's openness and guidance next change: its event end.
DateTime? groupProgressNextRebuild(Map<String, Object?>? data, int now) =>
    nextMovementViewRebuild([data?['eventEndAtMillis']], now);

/// When the checkpoint view next changes on the clock: the request falls
/// due, the owner's authority ends, a reporter's authority ends, or the
/// manager's reporter choice window closes.
DateTime? checkpointNextRebuild(Map<String, Object?>? data, int now) {
  final view = data?['view'];
  if (view is! Map) return null;
  final request = view['request'];
  final options = view['reporterOptions'];
  final reporters = options is Map ? options['reporters'] : null;
  return nextMovementViewRebuild([
    if (request is Map) request['dueAt'],
    if (request is Map) data!['ownerValidUntilMillis'],
    if (reporters is List)
      for (final reporter in reporters)
        if (reporter is Map) reporter['validUntil'],
    if (options is Map) now + checkpointReporterChoiceWindow,
  ], now);
}

Map<String, Object?> _view(
  Map<String, Object?>? data,
  String resource, {
  required String organizerId,
  required String eventId,
  required String groupId,
}) {
  if (data == null) throw liveViewMissing(resource);
  if (data['organizerId'] != organizerId ||
      data['eventId'] != eventId ||
      data['groupId'] != groupId) {
    throw const FormatException('Foreign live movement view.');
  }
  if (data['sourceCoverage'] != 'complete') {
    throw liveViewInvalidSource(resource);
  }
  final view = data['view'];
  if (view is! Map) throw liveViewInvalidSource(resource);
  return view.cast<String, Object?>();
}

int _integer(Object? value) {
  if (value is! int) throw const FormatException('Invalid view instant.');
  return value;
}

/// The retired group progress read for a manager: openness and guidance end
/// at the event's end by the app clock.
Map<String, Object?> groupProgressReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceGroupScope scope,
  required String actorUid,
  required int now,
}) {
  final view = _view(
    data,
    EventAssistanceMovementViews.groupProgress,
    organizerId: scope.organizerId,
    eventId: scope.eventId,
    groupId: scope.groupId,
  );
  final open =
      view['eventOpen'] == true && now < _integer(data!['eventEndAtMillis']);
  return {
    'outcome': 'read',
    'operationRevision': null,
    'actorUid': actorUid,
    'departureAuthority': {
      'kind': 'canConfirm',
      'validUntil': assistanceNoExpiry,
      'checkpointReporter': 'anyAuthorizedOperator',
    },
    'view': {
      ...view,
      'serverTime': now,
      'eventOpen': open,
      'guidance': open ? view['guidance'] : null,
    },
  };
}

/// The retired departure history page for a manager. [rosters] are the
/// group's departure views, newest first, at most one beyond the page.
Map<String, Object?> departureHistoryReadResponse({
  required Map<String, Object?>? progress,
  required List<Map<String, Object?>> rosters,
  required EventAssistanceDepartureHistoryQuery query,
  required String actorUid,
  required int now,
}) {
  final group = query.group;
  final current = _view(
    progress,
    EventAssistanceMovementViews.groupProgress,
    organizerId: group.organizerId,
    eventId: group.eventId,
    groupId: group.groupId,
  );
  final rows = [
    for (final data in rosters)
      _view(
        data,
        EventAssistanceMovementViews.departures,
        organizerId: group.organizerId,
        eventId: group.eventId,
        groupId: group.groupId,
      ),
  ];
  final page = rows.take(departureHistoryPageSize).toList(growable: false);
  // A roster's view can land before its group's view catches up; the newest
  // recorded departure bounds the current revision from below.
  var revision = _integer(current['revision']);
  for (final row in page) {
    revision = math.max(revision, _integer(row['progressRevision']));
  }
  return {
    'context': group.context,
    'groupId': group.groupId,
    'actorUid': actorUid,
    'validUntil': assistanceNoExpiry,
    'serverTime': now,
    'progressRevision': revision,
    'coverage': 'page',
    'rosters': page,
    'nextBeforeRevision': rows.length > departureHistoryPageSize
        ? page.last['progressRevision']
        : null,
  };
}

/// The retired checkpoint read for a manager: the request's due state, the
/// reporter's access and the reporter choices follow the app clock.
Map<String, Object?> checkpointReadResponse(
  Map<String, Object?>? data, {
  required EventAssistanceCheckpointScope scope,
  required String actorUid,
  required int now,
}) {
  final view = _view(
    data,
    EventAssistanceMovementViews.checkpoints,
    organizerId: scope.group.organizerId,
    eventId: scope.group.eventId,
    groupId: scope.group.groupId,
  );
  final rawRequest = view['request'];
  Map<String, Object?>? request;
  var dueAt = 0;
  if (rawRequest is Map) {
    request = rawRequest.cast<String, Object?>();
    dueAt = _integer(request['dueAt']);
    final state = switch (request['state']) {
      'awaitingReport' ||
      'overdue' => now >= dueAt ? 'overdue' : 'awaitingReport',
      final other => other,
    };
    final settled = state == 'complete' || state == 'closedOut';
    final ownerUntil = _integer(data!['ownerValidUntilMillis']);
    request = {
      ...request,
      'state': state,
      'ownerAvailability': settled
          ? 'notRequired'
          : ownerUntil > math.max(now, dueAt)
          ? 'current'
          : 'needsReassignment',
    };
  }
  final rawOptions = view['reporterOptions'];
  Map<String, Object?>? options;
  if (rawOptions is Map) {
    final reporters = rawOptions['reporters'];
    if (reporters is! List) {
      throw const FormatException('Invalid reporter choices.');
    }
    options = {
      'actorUid': actorUid,
      'sourceHash': rawOptions['sourceHash'],
      'validUntil': now + checkpointReporterChoiceWindow,
      'reporters': [
        for (final reporter in reporters.cast<Map<Object?, Object?>>())
          if (_integer(reporter['validUntil']) > math.max(now, dueAt))
            reporter.cast<String, Object?>(),
      ],
    };
  }
  return {
    'outcome': 'read',
    'operationRevision': null,
    'view': {
      ...view,
      'serverTime': now,
      'request': request,
      'reporterOptions': options,
    },
  };
}
