import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Optional timing and delivery limits preserve the rest of the configuration.
class EventAssistanceRuntimeLimitsSection extends StatelessWidget {
  factory EventAssistanceRuntimeLimitsSection({
    Key? key,
    required AssistanceRuntimeDraft draft,
    required int eventEnd,
    required bool enabled,
    required ValueChanged<AssistanceRuntimeDraft> onChanged,
    required ValueChanged<bool> onChooseTime,
  }) => EventAssistanceRuntimeLimitsSection.values(
    key: key,
    expiresAt: draft.expiresAt,
    responseDeadline: draft.responseDeadline,
    deliveryPolicy: draft.deliveryPolicy,
    eventEnd: eventEnd,
    enabled: enabled,
    onDeliveryChanged: (policy) => onChanged(draft.withDelivery(policy)),
    onClearDeadline: () => onChanged(draft.withDeadline(null)),
    onUseEventEnd: () => onChanged(draft.withExpiry(eventEnd)),
    onChooseTime: onChooseTime,
  );

  /// Both modes share these value controls. No sender or execution scope is needed.
  const EventAssistanceRuntimeLimitsSection.values({
    super.key,
    required this.expiresAt,
    required this.responseDeadline,
    required this.deliveryPolicy,
    required this.eventEnd,
    required this.enabled,
    required this.onDeliveryChanged,
    required this.onClearDeadline,
    required this.onChooseTime,
    this.onUseEventEnd,
  });
  final int expiresAt, eventEnd;
  final int? responseDeadline;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final bool enabled;
  final ValueChanged<AssistanceDeliveryPolicy> onDeliveryChanged;
  final VoidCallback onClearDeadline;
  final VoidCallback? onUseEventEnd;
  final ValueChanged<bool> onChooseTime;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final policy = deliveryPolicy;
    final states = <WidgetState>{if (!enabled) WidgetState.disabled};
    void change({int? total, int? perRoute, int? gap}) => onDeliveryChanged(
      AssistanceDeliveryPolicy(
        maxAttempts: total ?? policy.maxAttempts,
        maxAttemptsPerRoute: perRoute ?? policy.maxAttemptsPerRoute,
        minimumRetrySeconds: gap ?? policy.minimumRetrySeconds,
      ),
    );
    if (!enabled) {
      return CatchSection.fieldRows(
        children: [
          CatchField.content(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeUntil,
            body: lateJoinTimeLabel(context, expiresAt),
          ),
          CatchField.content(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeDeadline,
            body: responseDeadline == null
                ? l.eventAssistanceRuntimeNoDeadline
                : lateJoinTimeLabel(context, responseDeadline!),
          ),
          CatchField.content(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeAttempts,
            body: '${policy.maxAttempts}',
          ),
          CatchField.content(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimePerChannel,
            body: '${policy.maxAttemptsPerRoute}',
          ),
          CatchField.content(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeGap,
            body: '${policy.minimumRetrySeconds}',
          ),
        ],
      );
    }
    return CatchSection.fieldRows(
      children: [
        CatchField.action(
          copy: catchFieldCopy(l),
          title: l.eventAssistanceRuntimeUntil,
          body: lateJoinTimeLabel(context, expiresAt),
          onTap: enabled && onUseEventEnd != null
              ? () => onChooseTime(false)
              : null,
        ),
        if (expiresAt != eventEnd && onUseEventEnd != null)
          CatchField.action(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeUseEventEnd,
            onTap: enabled ? onUseEventEnd : null,
          ),
        CatchField.action(
          copy: catchFieldCopy(l),
          title: l.eventAssistanceRuntimeDeadline,
          body: responseDeadline == null
              ? l.eventAssistanceRuntimeSetDeadline
              : lateJoinTimeLabel(context, responseDeadline!),
          onTap: enabled ? () => onChooseTime(true) : null,
        ),
        if (responseDeadline != null)
          CatchField.action(
            copy: catchFieldCopy(l),
            title: l.eventAssistanceRuntimeNoDeadline,
            onTap: enabled ? onClearDeadline : null,
          ),
        CatchField.content(
          copy: catchFieldCopy(l),
          title: l.eventAssistanceLateJoinUnanswered,
          body: l.eventAssistanceRuntimeDeadlineBody,
        ),
        CatchField.stepper(
          copy: catchFieldCopy(l),
          key: const ValueKey('runtime.attempts'),
          title: l.eventAssistanceRuntimeAttempts,
          body: l.eventAssistanceRuntimeAttemptsBody,
          contract: CatchContractConstraints
              .setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttempts,
          value: policy.maxAttempts,
          min: 1,
          max: 6,
          states: states,
          decreaseSemanticLabel: l.eventAssistanceLateJoinDecrease,
          increaseSemanticLabel: l.eventAssistanceLateJoinIncrease,
          onChanged: enabled ? (v) => change(total: v.toInt()) : null,
        ),
        CatchField.stepper(
          copy: catchFieldCopy(l),
          key: const ValueKey('runtime.perChannel'),
          title: l.eventAssistanceRuntimePerChannel,
          contract: CatchContractConstraints
              .setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttemptsPerRoute,
          value: policy.maxAttemptsPerRoute,
          min: 1,
          max: 3,
          states: states,
          decreaseSemanticLabel: l.eventAssistanceLateJoinDecrease,
          increaseSemanticLabel: l.eventAssistanceLateJoinIncrease,
          onChanged: enabled ? (v) => change(perRoute: v.toInt()) : null,
        ),
        CatchField.stepper(
          copy: catchFieldCopy(l),
          key: const ValueKey('runtime.retryGap'),
          title: l.eventAssistanceRuntimeGap,
          body: l.eventAssistanceRuntimeGapBody,
          contract: CatchContractConstraints
              .setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMinimumRetrySeconds,
          value: policy.minimumRetrySeconds,
          min: 1,
          max: 3600,
          states: states,
          decreaseSemanticLabel: l.eventAssistanceLateJoinDecrease,
          increaseSemanticLabel: l.eventAssistanceLateJoinIncrease,
          onChanged: enabled ? (v) => change(gap: v.toInt()) : null,
        ),
      ],
    );
  }
}

Future<int?> chooseRuntimeTime(
  BuildContext context, {
  required int serverTime,
  required int eventEnd,
  required int initial,
}) async {
  if (eventEnd <= serverTime) return null;
  final first = DateTime.fromMillisecondsSinceEpoch(serverTime);
  final last = DateTime.fromMillisecondsSinceEpoch(eventEnd);
  var chosen = DateTime.fromMillisecondsSinceEpoch(
    initial.clamp(serverTime, eventEnd),
  );
  if (!DateUtils.isSameDay(first, last)) {
    final date = await showCatchDatePicker(
      context: context,
      initialDate: chosen,
      firstDate: first,
      lastDate: last,
      copy: catchDatePickerCopy(context.l10n),
    );
    if (!context.mounted || date == null) return null;
    chosen = DateTime(
      date.year,
      date.month,
      date.day,
      chosen.hour,
      chosen.minute,
    );
  }
  final time = await showCatchTimePicker(
    context: context,
    initialTime: TimeOfDay.fromDateTime(chosen),
    copy: catchTimePickerCopy(context.l10n),
  );
  if (!context.mounted || time == null) return null;
  return DateTime(
    chosen.year,
    chosen.month,
    chosen.day,
    time.hour,
    time.minute,
  ).millisecondsSinceEpoch;
}
