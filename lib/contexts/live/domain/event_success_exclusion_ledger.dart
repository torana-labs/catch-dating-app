import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';

const defaultEventSuccessExclusionAlertThreshold = Duration(minutes: 40);

final class EventSuccessExclusionLedgerEntry {
  const EventSuccessExclusionLedgerEntry({
    required this.uid,
    required this.cumulativeExclusion,
    required this.isAccumulating,
    this.accumulationResumesIn,
  });

  final String uid;
  final Duration cumulativeExclusion;
  final bool isAccumulating;
  final Duration? accumulationResumesIn;
}

final class EventSuccessExclusionLedgerSnapshot {
  const EventSuccessExclusionLedgerSnapshot({
    required this.entries,
    required this.alertThreshold,
  });

  final List<EventSuccessExclusionLedgerEntry> entries;
  final Duration alertThreshold;

  List<EventSuccessExclusionLedgerEntry> get alertEntries => List.unmodifiable(
    entries.where((entry) => entry.cumulativeExclusion >= alertThreshold),
  );

  Duration? get nextAlertDelay {
    Duration? next;
    for (final entry in entries) {
      final remaining = alertThreshold - entry.cumulativeExclusion;
      if (remaining <= Duration.zero) continue;
      final resumesIn = entry.isAccumulating
          ? Duration.zero
          : entry.accumulationResumesIn;
      if (resumesIn == null) continue;
      final delay = resumesIn + remaining;
      if (next == null || delay < next) next = delay;
    }
    return next;
  }
}

EventSuccessExclusionLedgerSnapshot buildEventSuccessExclusionLedger({
  required Iterable<String> attendeeUids,
  required Iterable<EventSuccessAssignment> assignments,
  required DateTime trackingStartedAt,
  required DateTime now,
  Map<String, DateTime> trackingStartedAtByUid = const {},
  DateTime? trackingEndedAt,
  Duration alertThreshold = defaultEventSuccessExclusionAlertThreshold,
}) {
  assert(alertThreshold > Duration.zero);
  final safeThreshold = alertThreshold > Duration.zero
      ? alertThreshold
      : defaultEventSuccessExclusionAlertThreshold;
  final staticEngagedUids = <String>{};
  final engagementIntervalsByUid = <String, List<_ExclusionInterval>>{};
  for (final assignment in assignments) {
    final hasTimedEngagement =
        assignment.rotationSlots.isNotEmpty ||
        assignment.groupRotationSlots.isNotEmpty;
    if (assignment.peerUids.isNotEmpty && !hasTimedEngagement) {
      final staticUids = [assignment.uid, ...assignment.peerUids];
      staticEngagedUids.addAll(staticUids);
      final interval = _ExclusionInterval(
        assignment.createdAt,
        trackingEndedAt ?? now,
      );
      for (final uid in staticUids) {
        engagementIntervalsByUid.putIfAbsent(uid, () => []).add(interval);
      }
    }
    for (final slot in assignment.rotationSlots) {
      final interval = _ExclusionInterval(slot.startsAt, slot.endsAt);
      for (final uid in [assignment.uid, slot.peerUid]) {
        engagementIntervalsByUid.putIfAbsent(uid, () => []).add(interval);
      }
    }
    for (final slot in assignment.groupRotationSlots) {
      final interval = _ExclusionInterval(slot.startsAt, slot.endsAt);
      for (final uid in [assignment.uid, ...slot.peerUids]) {
        engagementIntervalsByUid.putIfAbsent(uid, () => []).add(interval);
      }
    }
  }

  final uniqueUids = attendeeUids.toSet().toList()..sort();
  final entries = <EventSuccessExclusionLedgerEntry>[];
  for (final uid in uniqueUids) {
    final attendeeStart = trackingStartedAtByUid[uid];
    final startsAt =
        attendeeStart != null && attendeeStart.isAfter(trackingStartedAt)
        ? attendeeStart
        : trackingStartedAt;
    final endsAt = trackingEndedAt != null && trackingEndedAt.isBefore(now)
        ? trackingEndedAt
        : now;
    if (!endsAt.isAfter(startsAt)) {
      final eventStillTracking =
          trackingEndedAt == null || now.isBefore(trackingEndedAt);
      entries.add(
        EventSuccessExclusionLedgerEntry(
          uid: uid,
          cumulativeExclusion: Duration.zero,
          isAccumulating: eventStillTracking && !now.isBefore(startsAt),
          accumulationResumesIn: eventStillTracking && now.isBefore(startsAt)
              ? startsAt.difference(now)
              : null,
        ),
      );
      continue;
    }

    final mergedEngagement = _mergeIntervals(
      engagementIntervalsByUid[uid] ?? const [],
      startsAt: startsAt,
      endsAt: endsAt,
    );
    final engagedDuration = mergedEngagement.fold(
      Duration.zero,
      (total, interval) =>
          total + interval.endsAt.difference(interval.startsAt),
    );
    final trackingDuration = endsAt.difference(startsAt);
    final exclusion = trackingDuration - engagedDuration;
    final rawEngagement = engagementIntervalsByUid[uid] ?? const [];
    final activeEngagementEndsAt = rawEngagement
        .where(
          (interval) =>
              !now.isBefore(interval.startsAt) && now.isBefore(interval.endsAt),
        )
        .map((interval) => interval.endsAt)
        .fold<DateTime?>(
          null,
          (latest, end) => latest == null || end.isAfter(latest) ? end : latest,
        );
    final eventStillTracking =
        trackingEndedAt == null || now.isBefore(trackingEndedAt);
    final staticEngagement = staticEngagedUids.contains(uid);
    final accumulationResumesAt = activeEngagementEndsAt == null
        ? null
        : trackingEndedAt != null &&
              trackingEndedAt.isBefore(activeEngagementEndsAt)
        ? trackingEndedAt
        : activeEngagementEndsAt;
    final accumulationResumesIn =
        eventStillTracking &&
            !staticEngagement &&
            accumulationResumesAt != null &&
            (trackingEndedAt == null ||
                accumulationResumesAt.isBefore(trackingEndedAt))
        ? accumulationResumesAt.difference(now)
        : null;
    final isAccumulating =
        !staticEngagement &&
        eventStillTracking &&
        activeEngagementEndsAt == null;
    entries.add(
      EventSuccessExclusionLedgerEntry(
        uid: uid,
        cumulativeExclusion: exclusion.isNegative ? Duration.zero : exclusion,
        isAccumulating: isAccumulating,
        accumulationResumesIn: accumulationResumesIn,
      ),
    );
  }

  entries.sort((a, b) {
    final byDuration = b.cumulativeExclusion.compareTo(a.cumulativeExclusion);
    return byDuration != 0 ? byDuration : a.uid.compareTo(b.uid);
  });
  return EventSuccessExclusionLedgerSnapshot(
    entries: List.unmodifiable(entries),
    alertThreshold: safeThreshold,
  );
}

final class _ExclusionInterval {
  const _ExclusionInterval(this.startsAt, this.endsAt);

  final DateTime startsAt;
  final DateTime endsAt;
}

List<_ExclusionInterval> _mergeIntervals(
  Iterable<_ExclusionInterval> intervals, {
  required DateTime startsAt,
  required DateTime endsAt,
}) {
  final clipped =
      intervals
          .map((interval) {
            final start = interval.startsAt.isBefore(startsAt)
                ? startsAt
                : interval.startsAt;
            final end = interval.endsAt.isAfter(endsAt)
                ? endsAt
                : interval.endsAt;
            return _ExclusionInterval(start, end);
          })
          .where((interval) => interval.endsAt.isAfter(interval.startsAt))
          .toList()
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  final merged = <_ExclusionInterval>[];
  for (final interval in clipped) {
    if (merged.isEmpty || interval.startsAt.isAfter(merged.last.endsAt)) {
      merged.add(interval);
      continue;
    }
    if (interval.endsAt.isAfter(merged.last.endsAt)) {
      merged[merged.length - 1] = _ExclusionInterval(
        merged.last.startsAt,
        interval.endsAt,
      );
    }
  }
  return merged;
}
