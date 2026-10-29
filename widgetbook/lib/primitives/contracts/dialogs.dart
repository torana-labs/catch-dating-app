import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchDialog,
  path: '[Core primitives]/Dialogs',
)
Widget catchDialogContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchDialog',
    contractId: 'catch.confirm_dialog',
    states: const [
      'default',
      'destructive',
      'no-message',
      'two-actions',
      'multi-action-stack',
      'adaptive-material',
      'short-form',
      'multiline-form',
      'actions',
      'no-actions',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'default',
        child: CatchDialog<bool>.confirmation(
          title: 'Join this event?',
          message: 'The host will review your request.',
          actions: _contractDialogActions,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'destructive',
        child: CatchDialog<bool>.confirmation(
          title: 'Leave club?',
          message: 'You will stop receiving member-only updates.',
          actions: const [
            CatchDialogAction(label: 'Cancel', value: false),
            CatchDialogAction(label: 'Leave', value: true, isDestructive: true),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'no-message',
        child: CatchDialog<bool>.confirmation(
          title: 'Confirm?',
          message: '',
          actions: _contractDialogActions,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'two-actions',
        child: CatchDialog<bool>.confirmation(
          title: 'Save changes?',
          message: 'This updates your public event page.',
          actions: _contractDialogActions,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'multi-action-stack',
        child: CatchDialog<String>.confirmation(
          title: 'Chat actions',
          message: 'Choose how to handle this conversation.',
          actions: [
            CatchDialogAction(label: 'Share', value: 'share'),
            CatchDialogAction(label: 'Mute', value: 'mute'),
            CatchDialogAction(
              label: 'Block',
              value: 'block',
              isDestructive: true,
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'adaptive-material',
        description:
            'Runtime presentation should go through showCatchAdaptiveDialog.',
        child: CatchDialog<bool>.confirmation(
          title: 'Material fallback',
          message: 'This is the non-Cupertino dialog body.',
          actions: _contractDialogActions,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'short-form',
        child: CatchDialog(
          title: 'Create invite link',
          actions: [
            CatchButton(
              label: 'Cancel',
              variant: CatchButtonVariant.secondary,
              onPressed: widgetbookNoop,
            ),
            CatchButton(label: 'Create', onPressed: widgetbookNoop),
          ],
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: 'Invite name',
            initialValue: 'Early access friends',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'multiline-form',
        child: CatchDialog(
          title: 'Host note',
          actions: [CatchButton(label: 'Save note', onPressed: widgetbookNoop)],
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: 'Arrival note',
            initialValue: 'Meet beside the cafe entrance at 7:20 PM.',
            minLines: 3,
            maxLines: 4,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'no-actions',
        child: CatchDialog(
          title: 'Read-only form',
          actions: const [],
          child: CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: 'Club',
            body: 'Bandra Social Run',
          ),
        ),
      ),
    ],
  );
}

Widget catchAdaptivePickerBehaviorStates(BuildContext context) {
  return const CatchAdaptivePickerHarness();
}

const CatchDialogCopy _contractDialogCopy = CatchDialogCopy(
  cancelLabel: 'Cancel',
  confirmLabel: 'Confirm',
);

final _contractDialogActions = [
  CatchDialogAction(label: _contractDialogCopy.cancelLabel, value: false),
  CatchDialogAction(
    label: _contractDialogCopy.confirmLabel,
    value: true,
    isDefault: true,
  ),
];

class CatchAdaptivePickerHarness extends StatefulWidget {
  const CatchAdaptivePickerHarness({super.key});

  @override
  State<CatchAdaptivePickerHarness> createState() =>
      _CatchAdaptivePickerHarnessState();
}

class _CatchAdaptivePickerHarnessState
    extends State<CatchAdaptivePickerHarness> {
  DateTime? _selectedDate = DateTime(2026, 6, 26);
  TimeOfDay? _selectedTime = const TimeOfDay(hour: 19, minute: 30);

  @override
  Widget build(BuildContext context) {
    final date = _selectedDate;
    final time = _selectedTime;

    return WidgetbookContractFrame.behavior(
      title: 'CatchAdaptivePicker behavior',
      behaviorId: 'catch.adaptive_picker.behavior',
      states: const ['date-picker', 'time-picker', 'public-api'],
      children: [
        WidgetbookContractStateCard(
          label: 'launchers',
          description:
              'Uses showCatchDatePicker and showCatchTimePicker; Cupertino sheet rendering still depends on the runtime platform.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              WidgetbookContractWrap(
                children: [
                  CatchButton(
                    label: 'Choose date',
                    onPressed: () => _pickDate(context),
                  ),
                  CatchButton(
                    label: 'Choose time',
                    variant: CatchButtonVariant.secondary,
                    onPressed: () => _pickTime(context),
                  ),
                ],
              ),
              const SizedBox(height: CatchSpacing.s4),
              CatchSection.contained(
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Date',
                    body: date == null
                        ? 'No date selected'
                        : MaterialLocalizations.of(
                            context,
                          ).formatShortDate(date),
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: 'Time',
                    body: time == null
                        ? 'No time selected'
                        : time.format(context),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context) async {
    final result = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: _selectedDate ?? DateTime(2026, 6, 26),
      firstDate: DateTime(2026),
      lastDate: DateTime(2026, 12, 31),
      title: 'Event date',
    );
    if (!mounted || result == null) return;
    setState(() => _selectedDate = result);
  }

  Future<void> _pickTime(BuildContext context) async {
    final result = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 19, minute: 30),
      title: 'Event time',
    );
    if (!mounted || result == null) return;
    setState(() => _selectedTime = result);
  }
}
