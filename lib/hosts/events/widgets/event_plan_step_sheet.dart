import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One run-of-show step in a contained sheet: what happens, how many
/// minutes and the host's note, with Save step and, for a step already in
/// the plan, Remove step.
///
/// The sheet holds only the text being typed; the screen saves the step.
class HostEventPlanStepSheet extends StatefulWidget {
  const HostEventPlanStepSheet({
    super.key,
    required this.step,
    required this.isNew,
    required this.onSave,
    this.onRemove,
    this.saving = false,
  });

  /// The step as it is now; a new step's id is already chosen.
  final EventSuccessPlanStep step;

  /// The step is not in the plan yet, so there is nothing to remove.
  final bool isNew;
  final ValueChanged<EventSuccessPlanStep> onSave;

  /// Takes the step out of the plan; null when it cannot be removed.
  final VoidCallback? onRemove;
  final bool saving;

  @override
  State<HostEventPlanStepSheet> createState() => _HostEventPlanStepSheetState();
}

class _HostEventPlanStepSheetState extends State<HostEventPlanStepSheet> {
  late String _title = widget.step.title;
  late String _note = widget.step.hostInstruction;
  late int _minutes = widget.step.durationMinutes.clamp(1, 240);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final title = _title.trim();
    final canSave = !widget.saving && title.isNotEmpty;
    return CatchSheet.contained(
      key: const ValueKey<String>('host-event-plan-step-sheet'),
      title: widget.isNew
          ? l10n.hostEventsPlanNewStep
          : l10n.hostEventsPlanEditStep,
      footer: CatchStack(
        children: [
          CatchButton(
            key: const ValueKey<String>('host-event-plan-step-save'),
            label: l10n.hostEventsPlanStepSave,
            fullWidth: true,
            status: widget.saving
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: canSave
                ? () => widget.onSave(
                    widget.step.copyWith(
                      title: title,
                      hostInstruction: _note.trim(),
                      durationMinutes: _minutes,
                    ),
                  )
                : null,
          ),
          if (!widget.isNew && widget.onRemove != null)
            CatchButton(
              key: const ValueKey<String>('host-event-plan-step-remove'),
              label: l10n.hostEventsPlanStepRemove,
              variant: CatchButtonVariant.danger,
              fullWidth: true,
              onPressed: widget.saving ? null : widget.onRemove,
            ),
        ],
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            key: const ValueKey<String>('host-event-plan-step-title'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostEventsPlanStepTitle,
            contractExemption: 'A run-of-show step title, capped at 80.',
            initialValue: widget.step.title,
            maxLength: 80,
            onChanged: (value) => setState(() => _title = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-event-plan-step-note'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostEventsPlanStepNote,
            contractExemption: 'A run-of-show host note, capped at 300.',
            initialValue: widget.step.hostInstruction,
            maxLength: 300,
            maxLines: 3,
            onChanged: (value) => setState(() => _note = value),
          ),
          CatchIndexRow(
            title: l10n.hostEventsPlanStepMinutes,
            onTap: null,
            trailing: CatchStepper(
              key: const ValueKey<String>('host-event-plan-step-minutes'),
              value: _minutes,
              min: 1,
              max: 240,
              step: 5,
              decreaseSemanticLabel: l10n.hostEventsPlanStepFewerMinutes,
              increaseSemanticLabel: l10n.hostEventsPlanStepMoreMinutes,
              onChanged: (value) =>
                  setState(() => _minutes = value.round().clamp(1, 240)),
            ),
          ),
        ],
      ),
    );
  }
}
