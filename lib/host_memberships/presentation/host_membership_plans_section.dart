import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/host_memberships/data/host_membership_repository.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_plan.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plan_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer page's membership offer. Renders nothing until the
/// organizer has a published plan, so it never adds an empty section.
class HostMembershipPlansSection extends ConsumerWidget {
  const HostMembershipPlansSection({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = catchAsyncStateFromAsyncValue(
      ref.watch(watchPublishedHostMembershipPlansProvider(organizerId)),
    ).value;
    if (plans == null || plans.isEmpty) return const SizedBox.shrink();
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
    final memberships = uid == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(watchMyHostMembershipsProvider(uid)),
          ).value;
    final current = memberships
        ?.where(
          (membership) =>
              membership.organizerId == organizerId && membership.isCurrent,
        )
        .firstOrNull;
    return HostMembershipPlansList(
      plans: plans,
      currentMembership: current,
      onOpenPlan: (plan) => showHostMembershipPlanSheet(
        context,
        organizerId: organizerId,
        planId: plan.id,
      ),
    );
  }
}

/// Provider-free plan rows, reused by previews and tests.
class HostMembershipPlansList extends StatelessWidget {
  const HostMembershipPlansList({
    super.key,
    required this.plans,
    required this.currentMembership,
    required this.onOpenPlan,
  });

  final List<HostMembershipPlan> plans;
  final HostMembership? currentMembership;
  final ValueChanged<HostMembershipPlan> onOpenPlan;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection.fieldRows(
      title: l10n.membershipsPlansSectionTitle,
      children: [
        for (final plan in plans)
          CatchField.nav(
            copy: catchFieldCopy(l10n),
            key: ValueKey('host-membership-plan-${plan.id}'),
            title: plan.name,
            body: [
              for (final benefit in plan.benefits)
                hostMembershipBenefitLabel(l10n, benefit),
              ...plan.perks,
            ].join(' · '),
            valueText: currentMembership?.planId == plan.id
                ? l10n.membershipsPlanYourPlan
                : plan.isFull
                ? l10n.membershipsPlanFull
                : hostMembershipPlanPriceSummary(l10n, plan),
            icon: CatchIcons.membership,
            // A current member cannot buy a second membership here.
            onTap: currentMembership == null && !plan.isFull
                ? () => onOpenPlan(plan)
                : null,
          ),
      ],
    );
  }
}
