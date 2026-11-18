import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_exclusion_ledger.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/hosts/live/live_night_alerts_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'live_night_alerts_controller.g.dart';

/// The night alerts for [event] as of [now], which the console passes to
/// the minute: open intro requests while the plan takes them, and guests
/// left out of every group past the threshold once the night has groups.
///
/// It reads the plan, the intro requests, the group and rotation
/// assignments and the roster through their listeners, and the names
/// through the profile read the old console used.
@riverpod
HostLiveNightAlerts hostLiveNightAlerts(Ref ref, Event event, DateTime now) {
  final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
  if (plan == null) return const HostLiveNightAlerts();
  final requests = plan.wingmanRequestsEnabled
      ? ref.watch(watchEventSuccessWingmanRequestsProvider(event.id)).value ??
            const <EventSuccessWingmanRequest>[]
      : const <EventSuccessWingmanRequest>[];
  final assignments =
      ref.watch(watchEventSuccessAssignmentsProvider(event.id)).value ??
      const <EventSuccessAssignment>[];
  final rotations =
      ref.watch(watchEventSuccessRotationAssignmentsProvider(event.id)).value ??
      const <EventSuccessAssignment>[];
  final roster = ref
      .watch(watchEventParticipationRosterProvider(event.id))
      .value;
  final leftOutUids = hostLiveLeftOutUids(
    event: event,
    roster: roster,
    assignments: [...assignments, ...rotations],
    now: now,
  );
  final uids = <String>{
    ...leftOutUids,
    for (final request in requests)
      if (request.isActive) ...[request.requesterUid, request.targetUid],
  }.toList();
  final key = eventSuccessPeerUidsKey(uids);
  final profiles = key.isEmpty
      ? const <PublicProfile>[]
      : ref.watch(eventSuccessAssignmentPeerProfilesProvider(key)).value ??
            const <PublicProfile>[];
  return hostLiveNightAlertsFrom(
    requests: requests,
    leftOutUids: leftOutUids,
    profiles: profiles,
  );
}

/// Checked-in guests nobody has been grouped with for the threshold or
/// longer. A night without any groups or rotations has none, since nobody
/// is meant to be grouped.
List<String> hostLiveLeftOutUids({
  required Event event,
  required EventParticipationRoster? roster,
  required List<EventSuccessAssignment> assignments,
  required DateTime now,
}) {
  if (roster == null || assignments.isEmpty) return const <String>[];
  final ledger = buildEventSuccessExclusionLedger(
    attendeeUids: roster.checkedInIds,
    trackingStartedAtByUid: roster.checkedInAtByUid,
    assignments: assignments,
    trackingStartedAt: event.startTime,
    trackingEndedAt: event.endTime,
    now: now,
  );
  return [for (final entry in ledger.alertEntries) entry.uid];
}

/// The alerts as plain values: open requests newest first, and the left
/// out with their names.
HostLiveNightAlerts hostLiveNightAlertsFrom({
  required List<EventSuccessWingmanRequest> requests,
  required List<String> leftOutUids,
  required List<PublicProfile> profiles,
}) {
  final byUid = {for (final profile in profiles) profile.uid: profile};
  final open = requests.where((request) => request.isActive).toList()
    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  String? note(String? text) =>
      text == null || text.trim().isEmpty ? null : text.trim();
  return HostLiveNightAlerts(
    intros: [
      for (final request in open)
        HostLiveIntroRequest(
          id: request.id,
          requesterName: byUid[request.requesterUid]?.name,
          requesterPhotoUrl:
              byUid[request.requesterUid]?.primaryPhotoThumbnailUrl,
          targetName: byUid[request.targetUid]?.name,
          note: note(request.note),
        ),
    ],
    leftOut: [
      for (final uid in leftOutUids)
        HostLiveLeftOut(
          uid: uid,
          name: byUid[uid]?.name,
          photoUrl: byUid[uid]?.primaryPhotoThumbnailUrl,
        ),
    ],
    leftOutMinutes: defaultEventSuccessExclusionAlertThreshold.inMinutes,
  );
}
