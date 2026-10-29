import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/hosts/data/host_membership_admin_repository.dart';
import 'package:catch_dating_app/hosts/domain/host_membership_admin.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_membership_plan_editor_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_controller.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Host Memberships spoke: program and payout readiness, host-wide billing
/// pause, and the organizer's plans.
class HostMembershipsCard extends ConsumerWidget {
  const HostMembershipsCard({
    super.key,
    required this.club,
    required this.isOwner,
  });

  final Club club;
  final bool isOwner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostMembershipsControllerProvider(club.id);
    final programMutation = ref.watch(
      HostMembershipsController.programMutation,
    );
    final planMutation = ref.watch(HostMembershipsController.planMutation);
    final failed = programMutation.hasError
        ? programMutation
        : planMutation.hasError
        ? planMutation
        : null;

    void runProgram(HostMembershipProgramCommand command) =>
        HostMembershipsController.programMutation.run(
          ref,
          (tx) => tx.get(provider.notifier).runProgram(command),
        );

    return CatchAsyncBoundary<HostMembershipsState>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.payments,
      builder: (context, state) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (failed != null)
            CatchLocalizedErrorBanner.mutation(
              mutation: failed,
              context: AppErrorContext.payments,
            ),
          HostMembershipsSection(
            state: state,
            pending: programMutation.isPending || planMutation.isPending,
            onProgramCommand: runProgram,
            onOpenPlan: (plan) => showCatchBottomSheet<void>(
              context: context,
              builder: (_) => HostMembershipPlanEditorSheet(
                organizerId: club.id,
                plan: plan,
              ),
            ),
          ),
          if (!state.program.routeAccountReady && isOwner)
            HostPaymentAccountControllerCard(club: club),
        ],
      ),
    );
  }
}

/// Provider-free program and plan rows, reused by previews and tests.
class HostMembershipsSection extends StatelessWidget {
  const HostMembershipsSection({
    super.key,
    required this.state,
    required this.onProgramCommand,
    required this.onOpenPlan,
    this.pending = false,
  });

  final HostMembershipsState state;
  final ValueChanged<HostMembershipProgramCommand> onProgramCommand;
  final ValueChanged<HostMembershipPlan?> onOpenPlan;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final program = state.program;
    final paused = program.billingPause.isPausedOrPausing;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.fieldRows(
          first: true,
          title: l10n.hostMembershipsProgramTitle,
          trailing: CatchBadge.functional(
            label: !program.enabled
                ? l10n.hostMembershipsProgramOff
                : program.testMode
                ? l10n.hostMembershipsProgramTestMode
                : l10n.hostMembershipsProgramLive,
            tone: program.enabled
                ? CatchBadgeTone.success
                : CatchBadgeTone.neutral,
          ),
          children: [
            CatchField.content(
              copy: catchFieldCopy(l10n),
              title: l10n.hostMembershipsIntroTitle,
              body: l10n.hostMembershipsIntroBody,
              bodyMaxLines: 8,
              icon: CatchIcons.membership,
            ),
            CatchField.read(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('host-memberships-payout-readiness'),
              title: l10n.hostMembershipsPayoutTitle,
              valueText: program.routeAccountReady
                  ? l10n.hostMembershipsPayoutReady
                  : l10n.hostMembershipsPayoutNotReady,
              icon: CatchIcons.payment,
            ),
            if (!program.feeConfigured)
              CatchField.content(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsUnavailableTitle,
                body: l10n.hostMembershipsUnavailableBody,
                icon: CatchIcons.info,
              ),
            if (program.enabled)
              CatchField.read(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsMemberCount,
                valueText: '${program.memberCount}',
                icon: CatchIcons.people,
              ),
            if (program.canEnable)
              CatchField.action(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-memberships-enable'),
                title: l10n.hostMembershipsEnable,
                icon: CatchIcons.membership,
                status: pending
                    ? CatchFieldStatus.saving
                    : CatchFieldStatus.idle,
                onTap: pending
                    ? null
                    : () =>
                          onProgramCommand(HostMembershipProgramCommand.enable),
              ),
            if (program.enabled)
              CatchField.action(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-memberships-billing-pause'),
                title: paused
                    ? l10n.hostMembershipsResumeBilling
                    : l10n.hostMembershipsPauseBilling,
                body: switch (program.billingPause) {
                  HostMembershipBillingPauseState.pausing =>
                    l10n.hostMembershipsBillingPausing,
                  HostMembershipBillingPauseState.paused =>
                    l10n.hostMembershipsBillingPaused,
                  HostMembershipBillingPauseState.resuming =>
                    l10n.hostMembershipsBillingResuming,
                  HostMembershipBillingPauseState.active =>
                    l10n.hostMembershipsPauseBillingBody,
                },
                bodyMaxLines: 4,
                icon: paused ? CatchIcons.play : CatchIcons.pause,
                onTap: pending
                    ? null
                    : () => onProgramCommand(
                        paused
                            ? HostMembershipProgramCommand.resumeBilling
                            : HostMembershipProgramCommand.pauseBilling,
                      ),
              ),
          ],
        ),
        CatchSection.fieldRows(
          title: l10n.hostMembershipsPlansTitle,
          count: state.activePlans.length,
          children: [
            for (final plan in state.activePlans)
              CatchField.nav(
                copy: catchFieldCopy(l10n),
                key: ValueKey('host-membership-plan-${plan.id}'),
                title: plan.name,
                body: l10n.hostMembershipsPlanRowBody(
                  status: switch (plan.status) {
                    HostMembershipPlanStatus.draft =>
                      l10n.hostMembershipsPlanDraft,
                    HostMembershipPlanStatus.published =>
                      l10n.hostMembershipsPlanPublished,
                    HostMembershipPlanStatus.archived =>
                      l10n.hostMembershipsPlanArchived,
                  },
                  members: plan.activeMemberCount,
                ),
                valueText: hostMembershipPlanPriceSummary(l10n, plan),
                icon: CatchIcons.membership,
                onTap: pending ? null : () => onOpenPlan(plan),
              ),
            CatchField.action(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('host-memberships-new-plan'),
              title: l10n.hostMembershipsNewPlan,
              icon: CatchIcons.add,
              onTap: pending ? null : () => onOpenPlan(null),
            ),
          ],
        ),
      ],
    );
  }
}
