import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';

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
