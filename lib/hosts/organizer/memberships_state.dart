import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:flutter/foundation.dart';

/// What a control on Memberships asks for.
enum MembershipsAction {
  enable,
  pauseBilling,
  resumeBilling,
  newPlan,
  setUpPayouts,
  retry,
}

/// Memberships as plain values: the programme, its plans, and whether a
/// command is running.
@immutable
class MembershipsState {
  const MembershipsState({
    this.program,
    this.plans = const <HostMembershipPlan>[],
    this.isOwner = false,
    this.pending = false,
    this.error,
  });

  /// Null while the programme is first read.
  final HostMembershipProgramView? program;
  final List<HostMembershipPlan> plans;

  /// Only the owner sets up payouts.
  final bool isOwner;
  final bool pending;

  /// The programme could not be read.
  final Object? error;

  List<HostMembershipPlan> get activePlans => [
    for (final plan in plans)
      if (plan.status != HostMembershipPlanStatus.archived) plan,
  ];
}
