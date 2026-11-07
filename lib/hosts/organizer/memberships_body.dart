import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_membership_plan_row.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Memberships, drawn from the system with no board: the programme and
/// whether it can run, its payouts and billing, then the plans.
class OrganizerMembershipsBody extends StatelessWidget {
  const OrganizerMembershipsBody({
    super.key,
    required this.state,
    required this.onAction,
    required this.onOpenPlan,
  });

  final OrganizerMembershipsState state;
  final ValueChanged<OrganizerMembershipsAction> onAction;
  final ValueChanged<HostMembershipPlan> onOpenPlan;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final program = state.program;
    if (program == null) {
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        children: [
          if (state.error != null)
            CatchNotice.inline(
              body: l10n.hostOrganizerMembershipsFailed,
              tone: CatchNoticeTone.warning,
              action: CatchNoticeAction(
                label: l10n.hostOrganizerRetry,
                onPressed: () => onAction(OrganizerMembershipsAction.retry),
              ),
            )
          else
            const CatchLoadingIndicator(),
        ],
      );
    }
    final pending = state.pending;
    final paused = program.billingPause.isPausedOrPausing;
    final unavailable = program.unavailableReason;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          child: CatchStack(
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                align: CatchStackAlign.center,
                children: [
                  Flexible(
                    child: CatchText(
                      l10n.hostMembershipsProgramTitle,
                      variant: CatchTextVariant.titleRow,
                    ),
                  ),
                  CatchBadge(
                    label: !program.enabled
                        ? l10n.hostMembershipsProgramOff
                        : program.testMode
                        ? l10n.hostMembershipsProgramTestMode
                        : l10n.hostMembershipsProgramLive,
                    tone: program.enabled
                        ? CatchBadgeTone.success
                        : CatchBadgeTone.neutral,
                    dot: program.enabled,
                  ),
                ],
              ),
              CatchText(
                l10n.hostMembershipsIntroBody,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              if (program.canEnable)
                CatchStack(
                  direction: CatchStackDirection.row,
                  children: [
                    CatchButton(
                      key: const ValueKey<String>('host-memberships-enable'),
                      label: l10n.hostMembershipsEnable,
                      size: CatchButtonSize.sm,
                      status: pending
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      onPressed: pending
                          ? null
                          : () => onAction(OrganizerMembershipsAction.enable),
                    ),
                  ],
                ),
            ],
          ),
        ),
        if (unavailable != null || !program.feeConfigured)
          CatchNotice.inline(
            key: const ValueKey<String>('host-memberships-unavailable'),
            title: l10n.hostMembershipsUnavailableTitle,
            body: _unavailableBody(l10n, unavailable),
            tone: CatchNoticeTone.neutral,
            icon: CatchIcons.info,
          ),
        CatchSection(
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-memberships-payout-readiness'),
              title: program.collectsOnOwnAccount
                  ? l10n.hostMembershipsRazorpayTitle
                  : l10n.hostMembershipsPayoutTitle,
              value: program.routeAccountReady
                  ? l10n.hostMembershipsPayoutReady
                  : l10n.hostMembershipsPayoutNotReady,
              density: CatchIndexRowSize.regular,
              chevron: !program.routeAccountReady && state.isOwner,
              onTap: !program.routeAccountReady && state.isOwner
                  ? () => onAction(OrganizerMembershipsAction.setUpPayouts)
                  : null,
            ),
            if (program.enabled)
              CatchIndexRow(
                title: l10n.hostMembershipsMemberCount,
                value: '${program.memberCount}',
                density: CatchIndexRowSize.regular,
                onTap: null,
              ),
            if (program.enabled)
              CatchIndexRow(
                key: const ValueKey<String>('host-memberships-billing-pause'),
                title: paused
                    ? l10n.hostMembershipsResumeBilling
                    : l10n.hostMembershipsPauseBilling,
                subtitle: switch (program.billingPause) {
                  HostMembershipBillingPauseState.pausing =>
                    l10n.hostMembershipsBillingPausing,
                  HostMembershipBillingPauseState.paused =>
                    l10n.hostMembershipsBillingPaused,
                  HostMembershipBillingPauseState.resuming =>
                    l10n.hostMembershipsBillingResuming,
                  HostMembershipBillingPauseState.active =>
                    l10n.hostMembershipsPauseBillingBody,
                },
                icon: paused ? CatchIcons.play : CatchIcons.pause,
                density: CatchIndexRowSize.regular,
                chevron: true,
                onTap: pending
                    ? null
                    : () => onAction(
                        paused
                            ? OrganizerMembershipsAction.resumeBilling
                            : OrganizerMembershipsAction.pauseBilling,
                      ),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostMembershipsPlansTitle,
          action: CatchSectionAction(
            label: l10n.hostMembershipsNewPlan,
            onPressed: pending
                ? null
                : () => onAction(OrganizerMembershipsAction.newPlan),
          ),
          empty: l10n.hostOrganizerMembershipPlansEmpty,
          children: [
            for (final plan in state.activePlans)
              HostMembershipPlanRow(
                plan: plan,
                price: hostMembershipPlanPriceSummary(l10n, plan),
                onTap: pending ? null : () => onOpenPlan(plan),
              ),
          ],
        ),
      ],
    );
  }
}

/// The host-facing reason memberships cannot run yet. Servers that predate
/// reasons report only a missing fee configuration.
String _unavailableBody(
  AppLocalizations l10n,
  HostMembershipUnavailableReason? reason,
) => switch (reason) {
  HostMembershipUnavailableReason.notOffered =>
    l10n.hostMembershipsUnavailableNotOffered,
  HostMembershipUnavailableReason.razorpayNotConnected =>
    l10n.hostMembershipsUnavailableConnectRazorpay,
  HostMembershipUnavailableReason.razorpayNeedsAttention =>
    l10n.hostMembershipsUnavailableReconnectRazorpay,
  HostMembershipUnavailableReason.subscriptionsNotEnabled =>
    l10n.hostMembershipsUnavailableSubscriptions,
  HostMembershipUnavailableReason.payoutAccountNotReady =>
    l10n.hostMembershipsUnavailablePayout,
  HostMembershipUnavailableReason.providerUnavailable =>
    l10n.hostMembershipsUnavailableProvider,
  HostMembershipUnavailableReason.termsNotConfigured ||
  HostMembershipUnavailableReason.other ||
  null => l10n.hostMembershipsUnavailableBody,
};
