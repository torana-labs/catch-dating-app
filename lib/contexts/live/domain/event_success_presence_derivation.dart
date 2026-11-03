import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_policy.dart';

/// One `eventSuccessPresence` heartbeat as its listener delivers it.
typedef EventSuccessPresenceHeartbeatRow = ({
  String uid,
  int heartbeatAtMillis,
});

/// One `eventSuccessLateArrivals` placement as its listener delivers it.
typedef EventSuccessLateArrivalPlacementRow = ({
  String uid,
  int targetRoundIndex,
});

/// The plan facts presence reads, from the plan listener the console has.
typedef EventSuccessPresencePlanFacts = ({
  int liveControlRevision,
  int publishedRotationRoundIndex,
  int assignmentDraftRevision,
});

/// Liveness from one heartbeat and a clock; no state is ever stored.
EventSuccessPresenceState deriveEventSuccessPresenceState({
  required int heartbeatAtMillis,
  required int nowMillis,
  EventSuccessPresencePolicy policy = eventSuccessPresencePolicy,
}) {
  final elapsed = nowMillis - heartbeatAtMillis;
  final elapsedMillis = elapsed < 0 ? 0 : elapsed;
  if (elapsedMillis <= policy.presentWindowSeconds * 1000) {
    return EventSuccessPresenceState.present;
  }
  if (elapsedMillis <= policy.likelyDepartedAfterSeconds * 1000) {
    return EventSuccessPresenceState.idle;
  }
  return EventSuccessPresenceState.likelyDeparted;
}

/// The presence summary the retired getEventSuccessPresenceSummary callable
/// returned, derived on the phone. Guests come from the operational roster
/// the console already lists: a row linked to a guest's account and checked
/// in. Each heartbeat of a checked-in guest becomes an entry; a guest checked
/// in after the event started who is neither in the next round's current
/// draft nor placed for it is a late arrival.
EventSuccessPresenceSummary deriveEventSuccessPresenceSummary({
  required EventSuccessPresencePlanFacts plan,
  required List<EventSuccessPresenceHeartbeatRow> heartbeats,
  required List<EventAttendee> roster,
  required List<EventSuccessAssignmentDraft> drafts,
  required List<EventSuccessLateArrivalPlacementRow> placements,
  required int eventStartMillis,
  required int nowMillis,
  EventSuccessPresencePolicy policy = eventSuccessPresencePolicy,
}) {
  if (plan.publishedRotationRoundIndex >= 100) {
    throw const FormatException(
      'The rotation schedule has no later round to prepare.',
    );
  }
  final nextRoundIndex = plan.publishedRotationRoundIndex + 1;
  final checkedIn = <String, ({String displayName, int checkedInAtMillis})>{};
  for (final attendee in roster) {
    final uid = attendee.linkedUid;
    final checkedInAt = attendee.checkedInAt;
    if (uid == null ||
        uid.isEmpty ||
        attendee.status != EventAttendeeStatus.checkedIn ||
        checkedInAt == null) {
      continue;
    }
    final millis = checkedInAt.millisecondsSinceEpoch;
    final known = checkedIn[uid];
    if (known != null && known.checkedInAtMillis <= millis) continue;
    checkedIn[uid] = (
      displayName: _boundedDisplayName(attendee.displayName),
      checkedInAtMillis: millis,
    );
  }
  final entries = [
    for (final heartbeat in heartbeats)
      if (checkedIn[heartbeat.uid] case final guest?)
        EventSuccessPresenceEntry(
          uid: heartbeat.uid,
          displayName: guest.displayName,
          state: deriveEventSuccessPresenceState(
            heartbeatAtMillis: heartbeat.heartbeatAtMillis,
            nowMillis: nowMillis,
            policy: policy,
          ),
          heartbeatAtMillis: heartbeat.heartbeatAtMillis,
        ),
  ]..sort((left, right) => left.uid.compareTo(right.uid));
  final drafted = {
    for (final draft in drafts)
      if (draft.roundIndex == nextRoundIndex &&
          draft.baseAssignmentRevision == plan.assignmentDraftRevision)
        draft.assignment.uid,
  };
  final placed = {
    for (final placement in placements)
      if (placement.targetRoundIndex == nextRoundIndex) placement.uid,
  };
  final lateArrivals =
      [
        for (final MapEntry(key: uid, value: guest) in checkedIn.entries)
          if (guest.checkedInAtMillis > eventStartMillis &&
              !drafted.contains(uid) &&
              !placed.contains(uid))
            EventSuccessLateArrivalCandidate(
              uid: uid,
              displayName: guest.displayName,
              checkedInAtMillis: guest.checkedInAtMillis,
            ),
      ]..sort(
        (left, right) => left.checkedInAtMillis != right.checkedInAtMillis
            ? left.checkedInAtMillis.compareTo(right.checkedInAtMillis)
            : left.uid.compareTo(right.uid),
      );
  return EventSuccessPresenceSummary(
    liveControlRevision: plan.liveControlRevision,
    nextRoundIndex: nextRoundIndex,
    policy: policy,
    entries: List.unmodifiable(entries),
    lateArrivals: List.unmodifiable(lateArrivals),
  );
}

String _boundedDisplayName(String value) {
  final trimmed = value.trim();
  final name = trimmed.isEmpty ? 'Guest' : trimmed;
  return name.length > 120 ? name.substring(0, 120) : name;
}
