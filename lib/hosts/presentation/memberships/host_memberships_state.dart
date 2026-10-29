import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';

/// Provider-free Host memberships settings state.
class HostMembershipsState {
  const HostMembershipsState({required this.program, required this.plans});

  final HostMembershipProgramView program;
  final List<HostMembershipPlan> plans;

  List<HostMembershipPlan> get activePlans => [
    for (final plan in plans)
      if (plan.status != HostMembershipPlanStatus.archived) plan,
  ];

  HostMembershipsState withProgram(HostMembershipProgramView program) =>
      HostMembershipsState(program: program, plans: plans);

  HostMembershipsState withPlans(List<HostMembershipPlan> plans) =>
      HostMembershipsState(program: program, plans: plans);
}
