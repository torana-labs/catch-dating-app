import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';

List<String> eventSuccessAssignmentParticipantUids(
  List<EventSuccessAssignment> assignments,
) {
  final uids = <String>{};
  for (final assignment in assignments) {
    uids.add(assignment.uid);
    uids.addAll(assignment.allPeerUids);
  }
  return uids.toList()..sort();
}

List<String> eventSuccessWingmanProfileUids(
  List<EventSuccessWingmanRequest> requests,
) {
  final uids = <String>{};
  for (final request in requests) {
    if (!request.isActive) continue;
    uids
      ..add(request.requesterUid)
      ..add(request.targetUid);
  }
  return uids.toList()..sort();
}
