import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';

List<GroupOverrideRoundDraft> eventSuccessGroupOverrideDrafts(
  List<EventSuccessAssignment> assignments,
) {
  final hasGroupRotations = assignments.any(
    (assignment) => assignment.groupRotationSlots.isNotEmpty,
  );
  if (hasGroupRotations) {
    return _groupRotationRoundDraftsFromAssignments(assignments);
  }
  return [
    GroupOverrideRoundDraft(
      roundIndex: 0,
      groups: _staticGroupDraftsFromAssignments(assignments),
    ),
  ];
}

List<GroupOverrideRoundDraft> _groupRotationRoundDraftsFromAssignments(
  List<EventSuccessAssignment> assignments,
) {
  final groupsByRound = <int, Map<String, GroupOverrideUnitDraft>>{};
  for (final assignment in assignments) {
    for (final slot in assignment.groupRotationSlots) {
      final memberUids = [assignment.uid, ...slot.peerUids]..sort();
      final key = '${slot.unitLabel}:${memberUids.join('__')}';
      groupsByRound
          .putIfAbsent(slot.roundIndex, () => {})
          .putIfAbsent(
            key,
            () => GroupOverrideUnitDraft(
              label: slot.unitLabel,
              memberUids: <String?>[...memberUids],
            ),
          );
    }
  }
  final entries = groupsByRound.entries.toList()
    ..sort((a, b) => a.key.compareTo(b.key));
  return [
    for (final entry in entries)
      GroupOverrideRoundDraft(
        roundIndex: entry.key,
        groups: entry.value.values.toList(),
      ),
  ];
}

List<GroupOverrideUnitDraft> _staticGroupDraftsFromAssignments(
  List<EventSuccessAssignment> assignments,
) {
  final memberUidsByLabel = <String, Set<String>>{};
  for (final assignment in assignments) {
    memberUidsByLabel.putIfAbsent(assignment.label, () => <String>{}).addAll([
      assignment.uid,
      ...assignment.peerUids,
    ]);
  }
  final entries = memberUidsByLabel.entries.toList()
    ..sort((a, b) => a.key.compareTo(b.key));
  return [
    for (final entry in entries)
      GroupOverrideUnitDraft(
        label: entry.key,
        memberUids: <String?>[...(entry.value.toList()..sort())],
      ),
  ];
}

final class GroupOverrideRoundDraft {
  GroupOverrideRoundDraft({required this.roundIndex, required this.groups});

  final int roundIndex;
  final List<GroupOverrideUnitDraft> groups;
}

final class GroupOverrideUnitDraft {
  GroupOverrideUnitDraft({required this.label, required this.memberUids});

  String label;
  final List<String?> memberUids;
}
