import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_destination_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventAssistanceLateJoinRulesSection extends StatelessWidget {
  const EventAssistanceLateJoinRulesSection({
    super.key,
    required this.rules,
    required this.setup,
    required this.serverTime,
    required this.enabled,
    required this.onChanged,
    required this.onChooseCutoff,
  });
  final AssistanceLateJoinRules rules;
  final LateJoinSettingSetup setup;
  final int serverTime;
  final bool enabled;
  final ValueChanged<AssistanceLateJoinRules> onChanged;
  final VoidCallback onChooseCutoff;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final states = <WidgetState>{if (!enabled) WidgetState.disabled};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventAssistanceLateJoinDestinationField(
          value: rules.destination,
          setup: setup,
          enabled: enabled,
          onChanged: (v) => onChanged(rules.copyWith(destination: v)),
        ),
        CatchFieldLanes.single(
          child: CatchField<bool>.select(
            copy: catchFieldCopy(l10n),
            key: const ValueKey('lateJoin.window'),
            title: l10n.eventAssistanceLateJoinWindow,
            contractExemption:
                'Chooses event end or a reviewed custom UTC cutoff in the canonical late-join cutoff union.',
            values: const [false, true],
            value: rules.cutoff is LateJoinAtTime,
            itemLabelBuilder: (v) => v
                ? l10n.eventAssistanceLateJoinCustomTime
                : l10n.eventAssistanceLateJoinEventEnd,
            onChanged: enabled
                ? (v) {
                    if (v == true && setup.eventEnd > serverTime) {
                      onChooseCutoff();
                    } else if (v == false) {
                      onChanged(
                        rules.copyWith(cutoff: const LateJoinEventEnd()),
                      );
                    }
                  }
                : null,
            states: states,
          ),
        ),
        if (rules.cutoff case LateJoinAtTime(:final at))
          CatchFieldLanes.single(
            child: CatchField.action(
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceLateJoinCutoff,
              body: lateJoinTimeLabel(context, at),
              onTap: enabled && setup.eventEnd > serverTime
                  ? onChooseCutoff
                  : null,
            ),
          ),
        CatchFieldLanes.single(
          child: CatchField.stepper(
            copy: catchFieldCopy(l10n),
            key: const ValueKey('lateJoin.maximum'),
            title: l10n.eventAssistanceLateJoinMaximum,
            body: l10n.eventAssistanceLateJoinMaximumBody,
            contract: CatchContractConstraints
                .eventAssistanceLateJoinInputPolicyMaxMessagesPerEpisode,
            value: rules.maxMessagesPerEpisode,
            min: 0,
            max: 100,
            decreaseSemanticLabel: l10n.eventAssistanceLateJoinDecrease,
            increaseSemanticLabel: l10n.eventAssistanceLateJoinIncrease,
            states: states,
            onChanged: enabled
                ? (v) => onChanged(
                    rules.copyWith(maxMessagesPerEpisode: v.toInt()),
                  )
                : null,
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField.stepper(
            copy: catchFieldCopy(l10n),
            key: const ValueKey('lateJoin.gap'),
            title: l10n.eventAssistanceLateJoinGap,
            body: l10n.eventAssistanceLateJoinGapBody,
            contract: CatchContractConstraints
                .eventAssistanceLateJoinInputPolicyMinimumMinutesBetweenMessages,
            value: rules.minimumMinutesBetweenMessages,
            min: 0,
            max: 1440,
            decreaseSemanticLabel: l10n.eventAssistanceLateJoinDecrease,
            increaseSemanticLabel: l10n.eventAssistanceLateJoinIncrease,
            states: states,
            onChanged: enabled
                ? (v) => onChanged(
                    rules.copyWith(minimumMinutesBetweenMessages: v.toInt()),
                  )
                : null,
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField<LateJoinUnansweredRule>.choices(
            copy: catchFieldCopy(l10n),
            key: const ValueKey('lateJoin.unanswered'),
            title: l10n.eventAssistanceLateJoinUnanswered,
            body: l10n.eventAssistanceLateJoinUnansweredBody,
            contract: CatchContractConstraints
                .eventAssistanceLateJoinInputPolicyUnanswered,
            contractValueBuilder: (v) => v.name,
            values: LateJoinUnansweredRule.values,
            selected: {rules.unanswered},
            itemLabelBuilder: (v) => switch (v) {
              LateJoinUnansweredRule.keepUnknownUntilCutoff =>
                l10n.eventAssistanceLateJoinKeepUnknown,
              LateJoinUnansweredRule.hostReviewAtDeadline =>
                l10n.eventAssistanceLateJoinHostReview,
            },
            states: states,
            onSelectionChanged: enabled
                ? (v) {
                    if (v.isNotEmpty) {
                      onChanged(rules.copyWith(unanswered: v.single));
                    }
                  }
                : null,
          ),
        ),
      ],
    );
  }
}
