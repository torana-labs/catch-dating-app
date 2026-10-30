import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class WhenStep extends StatelessWidget {
  const WhenStep({
    super.key,
    this.embedded = false,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.dateController,
    required this.startTimeController,
    required this.durationMinutes,
    required this.onPickDate,
    required this.onPickTime,
    required this.onDecreaseDuration,
    required this.onIncreaseDuration,
    required this.formatDuration,
    this.scheduleErrorText,
  });

  /// When composed by the shared editor, its parent owns scrolling and Form.
  final bool embedded;
  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;
  final TextEditingController dateController;
  final TextEditingController startTimeController;
  final int durationMinutes;
  final VoidCallback onPickDate;
  final VoidCallback onPickTime;
  final VoidCallback? onDecreaseDuration;
  final VoidCallback? onIncreaseDuration;
  final String Function(int) formatDuration;
  final String? scheduleErrorText;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchFieldLanes.divided(
          children: [
            FormField<String>(
              validator: (_) => dateController.text.isEmpty
                  ? context.l10n.hostsWhenStepVisiblecopyPleaseSelectADate
                  : null,
              builder: (field) => CatchFieldLanes.single(
                child: CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.datePicker,
                  title: context.l10n.hostsWhenStepLabelDate,
                  body: dateController.text.isEmpty
                      ? context.l10n.hostsWhenStepPlaceholderSelectADate
                      : dateController.text,
                  icon: CatchIcons.date,
                  error: field.errorText,
                  onTap: onPickDate,
                ),
              ),
            ),
            FormField<String>(
              validator: (_) => startTimeController.text.isEmpty
                  ? context.l10n.hostsWhenStepVisiblecopyRequired
                  : null,
              builder: (field) => CatchFieldLanes.single(
                child: CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.timePicker,
                  title: context.l10n.hostsWhenStepLabelStartTime,
                  body: startTimeController.text.isEmpty
                      ? context.l10n.hostsWhenStepPlaceholderSelectStartTime
                      : startTimeController.text,
                  icon: CatchIcons.time,
                  error: field.errorText ?? scheduleErrorText,
                  onTap: onPickTime,
                ),
              ),
            ),
            CatchField.stepper(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsWhenStepLabelDuration,
              contract:
                  CatchContractConstraints.mobileFormStateEventDurationMinutes,
              body: formatDuration(durationMinutes),
              value: durationMinutes,
              min: BusinessRules.eventMinDurationMinutes,
              max: BusinessRules.eventMaxDurationMinutes,
              step: BusinessRules.eventDurationStepMinutes,
              valueLabelBuilder: (value) => formatDuration(value.round()),
              decreaseSemanticLabel:
                  context.l10n.hostsWhenStepVisiblecopyDecreaseDuration,
              increaseSemanticLabel:
                  context.l10n.hostsWhenStepVisiblecopyIncreaseDuration,
              onChanged: (value) {
                if (value < durationMinutes) {
                  onDecreaseDuration?.call();
                } else if (value > durationMinutes) {
                  onIncreaseDuration?.call();
                }
              },
              icon: CatchIcons.timer,
            ),
          ],
        ),
      ],
    );
    if (embedded) return content;
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: SingleChildScrollView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        child: content,
      ),
    );
  }
}
