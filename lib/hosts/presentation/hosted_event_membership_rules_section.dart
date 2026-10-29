import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_event_membership_rules_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Event editor rules for paid members: per-plan member price (100% off is
/// included), an early-access window and a members-only flag. Saved on its
/// own so it never changes the event's booking policy.
class HostedEventMembershipRulesSection extends ConsumerWidget {
  const HostedEventMembershipRulesSection({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostEventMembershipRulesControllerProvider(eventId);
    return CatchAsyncBoundary<HostEventMembershipRules>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.event,
      builder: (context, rules) => rules.hasPlans
          ? HostedEventMembershipRulesEditor(
              key: ValueKey('membership-rules-${rules.revision}'),
              rules: rules,
            )
          : const SizedBox.shrink(),
    );
  }
}

class HostedEventMembershipRulesEditor extends ConsumerStatefulWidget {
  const HostedEventMembershipRulesEditor({super.key, required this.rules});

  final HostEventMembershipRules rules;

  @override
  ConsumerState<HostedEventMembershipRulesEditor> createState() =>
      _HostedEventMembershipRulesEditorState();
}

class _HostedEventMembershipRulesEditorState
    extends ConsumerState<HostedEventMembershipRulesEditor> {
  late final Map<String, TextEditingController> _percentOff = {
    for (final plan in widget.rules.plans)
      plan.planId: TextEditingController(
        text: switch (widget.rules.overrideFor(plan.planId)) {
          HostEventMemberPriceOverride(:final percentOff?) => '$percentOff',
          HostEventMemberPriceOverride(priceInPaise: 0) => '100',
          _ => '',
        },
      ),
  };
  late final _earlyAccessHours = TextEditingController(
    text: widget.rules.earlyAccessHours?.toString(),
  );
  late bool _membersOnly = widget.rules.membersOnly;

  @override
  void dispose() {
    for (final controller in _percentOff.values) {
      controller.dispose();
    }
    _earlyAccessHours.dispose();
    super.dispose();
  }

  List<HostEventMemberPriceOverride> get _overrides => [
    for (final entry in _percentOff.entries)
      if (int.tryParse(entry.value.text.trim()) case final percent?
          when percent > 0)
        HostEventMemberPriceOverride.percentOff(
          planId: entry.key,
          percentOff: percent.clamp(1, 100),
        ),
  ];

  Future<void> _save() => HostEventMembershipRulesController.saveMutation.run(
    ref,
    (tx) => tx
        .get(
          hostEventMembershipRulesControllerProvider(
            widget.rules.eventId,
          ).notifier,
        )
        .save(
          overrides: _overrides,
          earlyAccessHours: int.tryParse(_earlyAccessHours.text.trim()),
          membersOnly: _membersOnly,
        ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rules = widget.rules;
    final mutation = ref.watch(HostEventMembershipRulesController.saveMutation);
    final opensAt = rules.generalSaleOpensAt;
    final digits = [FilteringTextInputFormatter.digitsOnly];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (mutation.hasError)
          CatchLocalizedErrorBanner.mutation(
            mutation: mutation,
            context: AppErrorContext.event,
          ),
        CatchSection.fieldRows(
          key: const ValueKey('hosted-event-membership-rules'),
          title: l10n.hostMembershipsEventRulesTitle,
          children: [
            for (final plan in rules.plans)
              CatchField.input(
                copy: catchFieldCopy(l10n),
                key: ValueKey('membership-rules-percent-${plan.planId}'),
                title: l10n.hostMembershipsEventRulesPlanDiscount(
                  planName: plan.name,
                ),
                contract: CatchContractConstraints
                    .manageEventMembershipRulesCallablePayloadMemberPriceOverridesItemsPercentOff,
                controller: _percentOff[plan.planId],
                suffixText: '%',
                inputHint: l10n.hostMembershipsEventRulesDiscountHint,
                keyboardType: TextInputType.number,
                inputFormatters: digits,
                icon: CatchIcons.pricing,
              ),
            CatchField.input(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('membership-rules-early-access'),
              title: l10n.hostMembershipsEventRulesEarlyAccess,
              contract: CatchContractConstraints
                  .manageEventMembershipRulesCallablePayloadEarlyAccessHours,
              controller: _earlyAccessHours,
              suffixText: l10n.hostMembershipsEventRulesHoursSuffix,
              keyboardType: TextInputType.number,
              inputFormatters: digits,
              helperText: opensAt == null
                  ? l10n.hostMembershipsEventRulesEarlyAccessHelper
                  : l10n.hostMembershipsEventRulesGeneralSale(
                      date: EventFormatters.shortDate(opensAt),
                      time: EventFormatters.time(opensAt),
                    ),
              icon: CatchIcons.timer,
            ),
            CatchField.toggle(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('membership-rules-members-only'),
              title: l10n.hostMembershipsEventRulesMembersOnly,
              body: l10n.hostMembershipsEventRulesMembersOnlyBody,
              contract: CatchContractConstraints
                  .manageEventMembershipRulesCallablePayloadMembersOnly,
              value: _membersOnly,
              onChanged: (value) => setState(() => _membersOnly = value),
            ),
            CatchField.action(
              copy: catchFieldCopy(l10n),
              key: const ValueKey('membership-rules-save'),
              title: l10n.hostMembershipsEventRulesSave,
              icon: CatchIcons.saveChanges,
              status: mutation.isPending
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: mutation.isPending ? null : _save,
            ),
          ],
        ),
      ],
    );
  }
}
