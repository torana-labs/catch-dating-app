import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One membership plan as a row: its name, whether it is on sale, how many
/// members it has, and its price.
class HostMembershipPlanRow extends StatelessWidget {
  const HostMembershipPlanRow({
    super.key,
    required this.plan,
    required this.price,
    this.onTap,
  });

  final HostMembershipPlan plan;

  /// The plan's first price with its interval, as the caller words it.
  final String? price;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final (label, tone) = switch (plan.status) {
      HostMembershipPlanStatus.draft => (
        l10n.hostMembershipsPlanDraft,
        CatchBadgeTone.neutral,
      ),
      HostMembershipPlanStatus.published => (
        l10n.hostMembershipsPlanPublished,
        CatchBadgeTone.success,
      ),
      HostMembershipPlanStatus.archived => (
        l10n.hostMembershipsPlanArchived,
        CatchBadgeTone.neutral,
      ),
    };
    return CatchIndexRow(
      key: ValueKey<String>('host-membership-plan-${plan.id}'),
      title: plan.name,
      subtitle: l10n.hostOrganizerMembershipMembers(
        count: plan.activeMemberCount,
      ),
      badge: CatchIndexRowBadge(label: label, tone: tone),
      value: price,
      density: CatchIndexRowSize.regular,
      chevron: onTap != null,
      onTap: onTap,
    );
  }
}
