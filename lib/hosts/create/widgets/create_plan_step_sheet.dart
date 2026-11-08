import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One plan step in a contained sheet: what happens, a note and how long,
/// with Done, and Remove for a step already in the plan.
class CreatePlanStepSheet extends StatefulWidget {
  const CreatePlanStepSheet({
    super.key,
    required this.step,
    required this.isNew,
    required this.onDone,
    required this.onRemove,
  });

  final EventItineraryItem step;
  final bool isNew;
  final ValueChanged<EventItineraryItem> onDone;
  final VoidCallback onRemove;

  @override
  State<CreatePlanStepSheet> createState() => _CreatePlanStepSheetState();
}

class _CreatePlanStepSheetState extends State<CreatePlanStepSheet> {
  late EventItineraryItem _step = widget.step;

  @override
  void didUpdateWidget(CreatePlanStepSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.step.id != widget.step.id) _step = widget.step;
  }

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final title = _step.title.trim();
    return CatchSheet.contained(
      key: const ValueKey<String>('create-plan-step-sheet'),
      title: widget.isNew
          ? context.l10n.hostCreateAddStep
          : context.l10n.hostCreateEditStep,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('create-plan-step-done'),
            label: context.l10n.hostCreateDone,
            fullWidth: true,
            onPressed: title.isEmpty
                ? null
                : () => widget.onDone(_step.copyWith(title: title)),
          ),
          if (!widget.isNew)
            CatchButton(
              label: context.l10n.hostCreateRemoveStep,
              variant: CatchButtonVariant.quiet,
              fullWidth: true,
              onPressed: widget.onRemove,
            ),
        ],
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchFieldLanes.single(
            child: CatchField.input(
              key: ValueKey<String>('create-plan-step-title-${_step.id}'),
              copy: copy,
              title: context.l10n.hostCreateStepWhat,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsTitle,
              initialValue: _step.title,
              maxLength: 80,
              onChanged: (value) =>
                  setState(() => _step = _step.copyWith(title: value)),
            ),
          ),
          CatchFieldLanes.single(
            child: CatchField.input(
              key: ValueKey<String>('create-plan-step-note-${_step.id}'),
              copy: copy,
              title: context.l10n.hostCreateStepNote,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsDescription,
              initialValue: _step.description ?? '',
              maxLength: 160,
              onChanged: (value) => setState(
                () => _step = _step.copyWith(
                  description: value.trim().isEmpty ? null : value.trim(),
                ),
              ),
            ),
          ),
          CatchFieldLanes.single(
            child: CatchField.stepper(
              copy: copy,
              title: context.l10n.hostCreateMinutes,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsDurationMinutes,
              value: _step.durationMinutes ?? 30,
              min: 5,
              max: 600,
              step: 5,
              decreaseSemanticLabel: context.l10n.hostCreateShorter,
              increaseSemanticLabel: context.l10n.hostCreateLonger,
              onChanged: (value) => setState(
                () => _step = _step.copyWith(durationMinutes: value.toInt()),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
