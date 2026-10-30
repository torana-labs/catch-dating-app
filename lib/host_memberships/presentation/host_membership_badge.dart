import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Member badge for a paid host membership. Paused members keep a neutral
/// badge; expired memberships render nothing.
class HostMembershipBadge extends StatelessWidget {
  const HostMembershipBadge({
    super.key,
    this.planName,
    this.status = HostMembershipStatus.active,
  });

  final String? planName;
  final HostMembershipStatus status;

  @override
  Widget build(BuildContext context) {
    if (status == HostMembershipStatus.expired) return const SizedBox.shrink();
    final l10n = context.l10n;
    final name = planName;
    return CatchBadge.functional(
      label: name == null
          ? l10n.membershipsBadgeMember
          : l10n.membershipsBadgeMemberOf(planName: name),
      tone: status == HostMembershipStatus.paused
          ? CatchBadgeTone.neutral
          : CatchBadgeTone.gold,
      icon: CatchIcons.membership,
    );
  }
}
