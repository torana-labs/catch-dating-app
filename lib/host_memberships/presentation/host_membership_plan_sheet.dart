import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_join_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Opens the join sheet for one published plan of an organizer.
Future<void> showHostMembershipPlanSheet(
  BuildContext context, {
  required String organizerId,
  required String planId,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (_) =>
      HostMembershipPlanSheet(organizerId: organizerId, planId: planId),
);

/// Plan details and the join flow: choose a billing interval, authorize the
/// mandate on Razorpay's hosted page, then confirm the membership started.
class HostMembershipPlanSheet extends ConsumerWidget {
  const HostMembershipPlanSheet({
    super.key,
    required this.organizerId,
    required this.planId,
  });

  final String organizerId;
  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = watchPublishedHostMembershipPlansProvider(organizerId);
    return CatchAsyncBoundary<List<HostMembershipPlan>>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.payments,
      builder: (context, plans) {
        final plan = plans.where((plan) => plan.id == planId).firstOrNull;
        if (plan == null) {
          return CatchSheet.standard(
            title: context.l10n.membershipsPlanUnavailableTitle,
            child: CatchText(
              context.l10n.membershipsPlanUnavailableBody,
              variant: CatchTextVariant.bodyM,
            ),
          );
        }
        return HostMembershipJoinSheet(plan: plan);
      },
    );
  }
}

class HostMembershipJoinSheet extends ConsumerStatefulWidget {
  const HostMembershipJoinSheet({super.key, required this.plan});

  final HostMembershipPlan plan;

  @override
  ConsumerState<HostMembershipJoinSheet> createState() =>
      _HostMembershipJoinSheetState();
}

class _HostMembershipJoinSheetState
    extends ConsumerState<HostMembershipJoinSheet> {
  late HostMembershipInterval _interval = widget.plan.intervals.first;
  HostMembershipCheckout? _checkout;

  Future<void> _start() async {
    final checkout = await HostMembershipJoinController.startMutation.run(
      ref,
      (tx) => tx
          .get(hostMembershipJoinControllerProvider.notifier)
          .start(
            organizerId: widget.plan.organizerId,
            planId: widget.plan.id,
            interval: _interval,
          ),
    );
    if (mounted) setState(() => _checkout = checkout);
  }

  Future<void> _refresh(HostMembershipCheckout checkout) async {
    final next = await HostMembershipJoinController.refreshMutation.run(
      ref,
      (tx) => tx
          .get(hostMembershipJoinControllerProvider.notifier)
          .refresh(checkout.checkoutId),
    );
    if (mounted) setState(() => _checkout = next);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final plan = widget.plan;
    final start = ref.watch(HostMembershipJoinController.startMutation);
    final refresh = ref.watch(HostMembershipJoinController.refreshMutation);
    final checkout = _checkout;
    final price = plan.priceFor(_interval) ?? 0;
    final failed = start.hasError
        ? start
        : refresh.hasError
        ? refresh
        : null;

    return CatchSheet.standard(
      title: plan.name,
      subtitle: plan.description.isEmpty ? null : plan.description,
      glyph: CatchIcons.membership,
      footer: switch (checkout?.state) {
        HostMembershipCheckoutState.authorized => CatchButton.sheet(
          role: CatchButtonEmphasis.commit,
          label: l10n.membershipsJoinDone,
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        HostMembershipCheckoutState.open => CatchButton.sheet(
          role: CatchButtonEmphasis.commit,
          label: l10n.membershipsJoinCheckStatus,
          status: refresh.isPending
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          onPressed: () => _refresh(checkout!),
        ),
        _ => CatchButton.sheet(
          role: CatchButtonEmphasis.commit,
          label: l10n.membershipsJoinAction(
            price: hostMembershipIntervalPrice(l10n, price, _interval),
          ),
          status: start.isPending
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          onPressed: plan.isFull ? null : _start,
        ),
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (failed != null)
            CatchLocalizedErrorBanner.mutation(
              mutation: failed,
              context: AppErrorContext.payments,
            ),
          if (checkout?.state == HostMembershipCheckoutState.authorized)
            CatchBanner(
              tone: CatchBannerTone.success,
              icon: CatchIcons.success,
              title: l10n.membershipsJoinWelcomeTitle(planName: plan.name),
              message: l10n.membershipsJoinWelcomeBody,
            )
          else if (checkout?.state == HostMembershipCheckoutState.open)
            CatchBanner(
              icon: CatchIcons.openExternal,
              title: l10n.membershipsJoinPendingTitle,
              message: l10n.membershipsJoinPendingBody,
              actions: [
                if (checkout!.authorizationUrl case final url?)
                  CatchButton(
                    label: l10n.membershipsJoinReopen,
                    size: CatchButtonSize.md,
                    variant: CatchButtonVariant.secondary,
                    onPressed: () => ref
                        .read(hostMembershipJoinControllerProvider.notifier)
                        .reopen(url),
                  ),
              ],
            )
          else if (checkout != null)
            CatchBanner(
              tone: CatchBannerTone.warning,
              icon: CatchIcons.warning,
              title: l10n.membershipsJoinExpiredTitle,
              message: l10n.membershipsJoinExpiredBody,
            ),
          CatchSection.fieldRows(
            first: true,
            children: [
              if (plan.intervals.length > 1)
                CatchField<HostMembershipInterval>.choices(
                  copy: catchFieldCopy(l10n),
                  title: l10n.membershipsJoinBillingTitle,
                  contract: CatchContractConstraints
                      .manageHostMembershipCheckoutCallablePayloadInterval,
                  contractValueBuilder: (interval) => interval.name,
                  values: plan.intervals,
                  itemLabelBuilder: (interval) => hostMembershipIntervalPrice(
                    l10n,
                    plan.priceFor(interval)!,
                    interval,
                  ),
                  selected: {_interval},
                  onSelectionChanged: checkout == null
                      ? (selection) {
                          if (selection.isEmpty) return;
                          setState(() => _interval = selection.first);
                        }
                      : null,
                  icon: CatchIcons.payment,
                )
              else
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  title: l10n.membershipsJoinBillingTitle,
                  valueText: hostMembershipIntervalPrice(
                    l10n,
                    price,
                    _interval,
                  ),
                  icon: CatchIcons.payment,
                ),
              for (final benefit in plan.benefits)
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  title: hostMembershipBenefitLabel(l10n, benefit),
                  icon: CatchIcons.check,
                ),
              for (final perk in plan.perks)
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  title: perk,
                  icon: CatchIcons.spark,
                ),
              if (plan.trialDays > 0)
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  title: l10n.membershipsJoinTrial(days: plan.trialDays),
                  icon: CatchIcons.time,
                ),
              if (plan.isFull)
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  title: l10n.membershipsPlanFull,
                  icon: CatchIcons.warning,
                ),
            ],
          ),
          gapH12,
          CatchText(
            l10n.membershipsJoinMandateNote,
            variant: CatchTextVariant.supporting,
          ),
        ],
      ),
    );
  }
}
