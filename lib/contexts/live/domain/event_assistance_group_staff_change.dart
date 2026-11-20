import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';

sealed class AssistanceGroupStaffDecision {
  const AssistanceGroupStaffDecision();
}

final class AssistanceAssignGroupDuty extends AssistanceGroupStaffDecision {
  const AssistanceAssignGroupDuty({
    required this.duty,
    required this.expiresAt,
  });
  final AssistanceGroupDuty duty;
  final int expiresAt;
}

final class AssistanceRemoveGroupDuty extends AssistanceGroupStaffDecision {
  const AssistanceRemoveGroupDuty();
}
