import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
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
      title: widget.isNew ? CreateCopy.addStep : CreateCopy.editStep,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('create-plan-step-done'),
            label: CreateCopy.done,
            fullWidth: true,
            onPressed: title.isEmpty
                ? null
                : () => widget.onDone(_step.copyWith(title: title)),
          ),
          if (!widget.isNew)
            CatchButton(
              label: CreateCopy.removeStep,
              variant: CatchButtonVariant.quiet,
              fullWidth: true,
              onPressed: widget.onRemove,
            ),
        ],
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchField.input(
            key: ValueKey<String>('create-plan-step-title-${_step.id}'),
            copy: copy,
            title: CreateCopy.stepWhat,
            initialValue: _step.title,
            maxLength: 80,
            onChanged: (value) =>
                setState(() => _step = _step.copyWith(title: value)),
          ),
          CatchField.input(
            key: ValueKey<String>('create-plan-step-note-${_step.id}'),
            copy: copy,
            title: CreateCopy.stepNote,
            initialValue: _step.description ?? '',
            maxLength: 160,
            onChanged: (value) => setState(
              () => _step = _step.copyWith(
                description: value.trim().isEmpty ? null : value.trim(),
              ),
            ),
          ),
          CatchField.stepper(
            copy: copy,
            title: CreateCopy.minutes,
            value: _step.durationMinutes ?? 30,
            min: 5,
            max: 600,
            step: 5,
            decreaseSemanticLabel: CreateCopy.shorter,
            increaseSemanticLabel: CreateCopy.longer,
            onChanged: (value) => setState(
              () => _step = _step.copyWith(durationMinutes: value.toInt()),
            ),
          ),
        ],
      ),
    );
  }
}
