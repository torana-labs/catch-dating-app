import 'dart:math' as math;

import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// What every live console view adapter shares: the errors a missing or
/// invalid view reads as, the read instant, and when time next changes a
/// view. Time enters only as instants the views store; [liveViewNow] applies
/// the app clock, never earlier than the server's own evaluation.

/// A view the server has not written yet, or no longer writes.
BackendOperationException liveViewMissing(
  String resource,
) => BackendOperationException(
  code: 'live-view-missing',
  message:
      'Event operating information is unavailable. Refresh the event setup.',
  context: BackendErrorContext(
    service: BackendService.firestore,
    action: 'watch the live console',
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
    action: 'watch the live console',
    resource: resource,
  ),
);

/// The app clock, but never before any server evaluation it is compared
/// with: a view cannot have been evaluated in the future.
int liveViewNow(DateTime clock, Iterable<Map<String, Object?>?> views) {
  var now = clock.millisecondsSinceEpoch;
  for (final view in views) {
    final evaluatedAt = view?['evaluatedAt'];
    if (evaluatedAt is Timestamp) {
      now = math.max(now, evaluatedAt.millisecondsSinceEpoch);
    }
  }
  return now;
}

/// The nearest of [instants] after [now], when a view must be read again
/// because a field it derives from the clock changes then; null when none is
/// ahead.
DateTime? nextLiveViewRebuild(Iterable<Object?> instants, int now) {
  int? next;
  for (final instant in instants) {
    if (instant is int && instant > now && (next == null || instant < next)) {
      next = instant;
    }
  }
  return next == null ? null : DateTime.fromMillisecondsSinceEpoch(next);
}
