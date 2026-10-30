import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessTargetAttendeesField extends StatelessWidget {
  const EventSuccessTargetAttendeesField({
    super.key,
    required this.value,
    required this.recommendedMin,
    required this.recommendedMax,
    required this.enabled,
    required this.onChanged,
  });

  final int value;
  final int recommendedMin;
  final int recommendedMax;
  final bool enabled;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.stepper(
        copy: catchFieldCopy(context.l10n),
        title:
            context.l10n.eventSuccessEventSuccessHostSetupTextTargetAttendees,
        contract: CatchContractConstraints
            .eventSuccessPlanDocumentTargetAttendeeCount,
        body: context.l10n
            .eventSuccessEventSuccessHostSetupTextRecommendedRangeRecommendedminRecommendedmax(
              recommendedMin: recommendedMin,
              recommendedMax: recommendedMax,
            ),
        value: value,
        min: 1,
        max: 1000,
        valueLabelBuilder: (number) =>
            context.l10n.eventSuccessEventSuccessHostSetupVisiblecopyToint(
              toInt: number.toInt(),
            ),
        states: <WidgetState>{if (!enabled) WidgetState.disabled},
        decreaseSemanticLabel: context
            .l10n
            .eventSuccessEventSuccessHostSetupVisiblecopyDecreaseTargetAttendees,
        increaseSemanticLabel: context
            .l10n
            .eventSuccessEventSuccessHostSetupVisiblecopyIncreaseTargetAttendees,
        onChanged: enabled ? (number) => onChanged(number.toInt()) : null,
      ),
    );
  }
}
