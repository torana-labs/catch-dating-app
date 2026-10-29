import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/hosts/domain/host_membership_admin.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

int? _rupeesToPaise(String text) {
  final value = int.tryParse(text.trim());
  return value == null ? null : value * 100;
}

int? _optionalInt(String text) => int.tryParse(text.trim());

String _paiseToRupees(int? paise) => paise == null ? '' : '${paise ~/ 100}';

/// Creates or edits one membership plan: prices, cap, trial, enforced
/// benefits, free-text perks and the no-show booking cap.
class HostMembershipPlanEditorSheet extends ConsumerStatefulWidget {
  const HostMembershipPlanEditorSheet({
    super.key,
    required this.organizerId,
    this.plan,
  });

  final String organizerId;
  final HostMembershipPlan? plan;

  @override
  ConsumerState<HostMembershipPlanEditorSheet> createState() =>
      _HostMembershipPlanEditorSheetState();
}

class _HostMembershipPlanEditorSheetState
    extends ConsumerState<HostMembershipPlanEditorSheet> {
  late final _name = TextEditingController(text: widget.plan?.name);
  late final _description = TextEditingController(
    text: widget.plan?.description,
  );
  late final _monthly = TextEditingController(
    text: _paiseToRupees(widget.plan?.monthlyPriceInPaise),
  );
  late final _annual = TextEditingController(
    text: _paiseToRupees(widget.plan?.annualPriceInPaise),
  );
  late final _memberCap = TextEditingController(
    text: widget.plan?.memberCap?.toString(),
  );
  late final _trialDays = TextEditingController(
    text: (widget.plan?.trialDays ?? 0).toString(),
  );
  late final _discount = TextEditingController(
    text: widget.plan?.eventDiscount?.percentOff.toString(),
  );
  late final _bookingCap = TextEditingController(
    text: widget.plan?.maxUpcomingMemberPricedBookings?.toString(),
  );
  late final _perks = TextEditingController(
    text: widget.plan?.perks.join('\n'),
  );
  final _typicalTicket = TextEditingController();
  late bool _earlyAccess = widget.plan?.hasEarlyAccess ?? false;
  late bool _membersOnly = widget.plan?.hasMembersOnlyAccess ?? false;

  @override
  void initState() {
    super.initState();
    for (final controller in [_monthly, _annual, _discount, _typicalTicket]) {
      controller.addListener(_refreshHint);
    }
  }

  void _refreshHint() => setState(() {});

  @override
  void dispose() {
    for (final controller in [
      _name,
      _description,
      _monthly,
      _annual,
      _memberCap,
      _trialDays,
      _discount,
      _bookingCap,
      _perks,
      _typicalTicket,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  HostMembershipPlanDraft get _draft {
    final discount = _optionalInt(_discount.text);
    return HostMembershipPlanDraft(
      name: _name.text,
      description: _description.text,
      monthlyPriceInPaise: _rupeesToPaise(_monthly.text),
      annualPriceInPaise: _rupeesToPaise(_annual.text),
      memberCap: _optionalInt(_memberCap.text),
      trialDays: _optionalInt(_trialDays.text) ?? 0,
      benefits: [
        if (discount != null && discount > 0)
          HostMembershipEventDiscount(discount.clamp(1, 100)),
        if (_earlyAccess) const HostMembershipEarlyAccess(),
        if (_membersOnly) const HostMembershipMembersOnlyAccess(),
      ],
      perks: _perks.text.split('\n'),
      maxUpcomingMemberPricedBookings: _optionalInt(_bookingCap.text),
      sortOrder: widget.plan?.sortOrder ?? 0,
    );
  }

  Future<void> _run(Future<void> Function(HostMembershipsController) action) =>
      HostMembershipsController.planMutation
          .run(
            ref,
            (tx) => action(
              tx.get(
                hostMembershipsControllerProvider(widget.organizerId).notifier,
              ),
            ),
          )
          .then((_) {
            if (mounted) Navigator.of(context).maybePop();
          });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final plan = widget.plan;
    final mutation = ref.watch(HostMembershipsController.planMutation);
    final draft = _draft;
    final hint = hostMembershipPricingHint(
      monthlyPriceInPaise: draft.monthlyPriceInPaise,
      annualPriceInPaise: draft.annualPriceInPaise,
      typicalEventPriceInPaise: _rupeesToPaise(_typicalTicket.text),
      discountPercent: draft.benefits
          .whereType<HostMembershipEventDiscount>()
          .firstOrNull
          ?.percentOff,
    );
    final money = [FilteringTextInputFormatter.digitsOnly];
    return CatchSheet.standard(
      title: plan == null
          ? l10n.hostMembershipsNewPlan
          : l10n.hostMembershipsEditPlan,
      glyph: CatchIcons.membership,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: l10n.hostMembershipsSavePlan,
        status: mutation.isPending
            ? CatchButtonStatus.loading
            : CatchButtonStatus.idle,
        onPressed: draft.isValid
            ? () => _run((c) => c.savePlan(draft: draft, existing: plan))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (mutation.hasError)
            CatchLocalizedErrorBanner.mutation(
              mutation: mutation,
              context: AppErrorContext.payments,
            ),
          CatchSection.fieldRows(
            first: true,
            children: [
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-name'),
                title: l10n.hostMembershipsPlanName,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanName,
                controller: _name,
                inputHint: l10n.hostMembershipsPlanNameHint,
                textCapitalization: TextCapitalization.words,
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsPlanDescription,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanDescription,
                controller: _description,
                maxLines: 4,
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-monthly'),
                title: l10n.hostMembershipsMonthlyPrice,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanPricesMonthlyAmountPaise,
                controller: _monthly,
                prefixText: '₹',
                keyboardType: TextInputType.number,
                inputFormatters: money,
                helperText: l10n.hostMembershipsPriceHelper,
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-annual'),
                title: l10n.hostMembershipsAnnualPrice,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanPricesAnnualAmountPaise,
                controller: _annual,
                prefixText: '₹',
                keyboardType: TextInputType.number,
                inputFormatters: money,
              ),
            ],
          ),
          CatchSection.fieldRows(
            title: l10n.hostMembershipsBenefitsTitle,
            children: [
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-discount'),
                title: l10n.hostMembershipsDiscount,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanBenefitsItemsPercentOff,
                controller: _discount,
                suffixText: '%',
                keyboardType: TextInputType.number,
                inputFormatters: money,
                helperText: l10n.hostMembershipsDiscountHelper,
              ),
              CatchField.toggle(
                copy: catchFieldCopy(l10n),
                title: l10n.membershipsBenefitEarlyAccess,
                body: l10n.hostMembershipsEarlyAccessBody,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanBenefitsItemsType,
                value: _earlyAccess,
                onChanged: (value) => setState(() => _earlyAccess = value),
              ),
              CatchField.toggle(
                copy: catchFieldCopy(l10n),
                title: l10n.membershipsBenefitMembersOnly,
                body: l10n.hostMembershipsMembersOnlyBody,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanBenefitsItemsType,
                value: _membersOnly,
                onChanged: (value) => setState(() => _membersOnly = value),
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsPerks,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanPerksItems,
                controller: _perks,
                maxLines: 6,
                helperText: l10n.hostMembershipsPerksHelper,
              ),
            ],
          ),
          CatchSection.fieldRows(
            title: l10n.hostMembershipsLimitsTitle,
            children: [
              CatchField.input(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsMemberCap,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanMemberCap,
                controller: _memberCap,
                keyboardType: TextInputType.number,
                inputFormatters: money,
                helperText: l10n.hostMembershipsMemberCapHelper,
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsBookingCap,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanLimitsMaxUpcomingMemberPricedBookings,
                controller: _bookingCap,
                keyboardType: TextInputType.number,
                inputFormatters: money,
                helperText: l10n.hostMembershipsBookingCapHelper,
              ),
              CatchField.input(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsTrialDays,
                contract: CatchContractConstraints
                    .manageHostMembershipPlansCallablePayloadPlanTrialDays,
                controller: _trialDays,
                keyboardType: TextInputType.number,
                inputFormatters: money,
              ),
            ],
          ),
          CatchSection.fieldRows(
            title: l10n.hostMembershipsPricingHintTitle,
            children: [
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-typical-ticket'),
                title: l10n.hostMembershipsTypicalTicket,
                contractExemption:
                    'Advisory pricing-hint input; never saved or sent.',
                controller: _typicalTicket,
                prefixText: '₹',
                keyboardType: TextInputType.number,
                inputFormatters: money,
              ),
              if (hint != HostMembershipPricingHint.none)
                CatchField.content(
                  copy: catchFieldCopy(l10n),
                  key: const ValueKey('host-membership-pricing-hint'),
                  title: hint == HostMembershipPricingHint.belowTypicalSpend
                      ? l10n.hostMembershipsPricingHintLow
                      : l10n.hostMembershipsPricingHintHealthy,
                  body: l10n.hostMembershipsPricingHintBody(
                    events: hostMembershipPricingHintEventsPerMonth,
                  ),
                  bodyMaxLines: 6,
                  tone: hint == HostMembershipPricingHint.belowTypicalSpend
                      ? CatchFieldTone.danger
                      : CatchFieldTone.normal,
                  icon: CatchIcons.tip,
                ),
            ],
          ),
          if (plan != null && plan.status == HostMembershipPlanStatus.draft)
            CatchSection.fieldRows(
              child: CatchField.action(
                copy: catchFieldCopy(l10n),
                key: const ValueKey('host-membership-plan-publish'),
                title: l10n.hostMembershipsPublishPlan,
                body: l10n.hostMembershipsPublishPlanBody,
                icon: CatchIcons.announce,
                onTap: mutation.isPending
                    ? null
                    : () => _run((c) => c.publishPlan(plan.id)),
              ),
            ),
          if (plan != null && plan.status != HostMembershipPlanStatus.archived)
            CatchSection.fieldRows(
              child: CatchField.action(
                copy: catchFieldCopy(l10n),
                title: l10n.hostMembershipsArchivePlan,
                body: l10n.hostMembershipsArchivePlanBody,
                tone: CatchFieldTone.danger,
                icon: CatchIcons.archive,
                onTap: mutation.isPending
                    ? null
                    : () => _run((c) => c.archivePlan(plan.id)),
              ),
            ),
        ],
      ),
    );
  }
}
