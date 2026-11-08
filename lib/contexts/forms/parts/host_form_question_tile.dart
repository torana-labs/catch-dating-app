import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The question kinds that carry choices.
bool hostFormQuestionHasChoices(HostFormQuestionKind kind) =>
    kind == HostFormQuestionKind.singleChoice ||
    kind == HostFormQuestionKind.multiChoice;

/// One question in the builder: a tile with the question, its kind, the
/// Required or Optional chip and its choices as tags. Opened, it edits the
/// wording and the choices in place.
class HostFormQuestionTile extends StatelessWidget {
  const HostFormQuestionTile({
    super.key,
    required this.question,
    required this.open,
    required this.onOpen,
    required this.onRequiredChanged,
    required this.onLabelChanged,
    required this.onOptionChanged,
    required this.onAddOption,
    required this.onRemove,
  });

  final HostFormQuestion question;

  /// Whether the editing fields show under the question.
  final bool open;
  final VoidCallback onOpen;
  final ValueChanged<bool> onRequiredChanged;
  final ValueChanged<String> onLabelChanged;
  final void Function(int index, String label) onOptionChanged;
  final VoidCallback onAddOption;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final label = question.label.trim();
    final choices = hostFormQuestionHasChoices(question.kind);
    return CatchSurface(
      child: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchIndexRow(
            title: label.isEmpty ? l10n.hostFormsQuestionUntitled : label,
            titleMaxLines: 3,
            subtitle: hostFormQuestionKindText(l10n, question.kind),
            icon: CatchIcons.dragHandle,
            onTap: onOpen,
            density: CatchIndexRowSize.compact,
            trailing: CatchChip.choice(
              label: question.required
                  ? l10n.hostFormsQuestionRequired
                  : l10n.hostFormsQuestionOptional,
              selected: question.required,
              mode: CatchChipMode.multiple,
              size: CatchChipSize.sm,
              onPressed: () => onRequiredChanged(!question.required),
            ),
          ),
          if (choices && !open && question.options.isNotEmpty)
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g6,
              wrap: true,
              children: [
                for (final option in question.options)
                  CatchChip.tag(label: option.label, size: CatchChipSize.sm),
              ],
            ),
          if (open) ...[
            CatchSection.fieldRows(
              children: [
                CatchField.input(
                  key: ValueKey(
                    'host-forms-question-label-${question.questionId}',
                  ),
                  copy: catchFieldCopy(l10n),
                  title: l10n.hostFormsQuestionWording,
                  initialValue: question.label,
                  contractExemption:
                      'The wording is saved with the form draft, whose own '
                      'validation runs before it publishes.',
                  onChanged: onLabelChanged,
                ),
                if (choices)
                  for (final (index, option) in question.options.indexed)
                    CatchField.input(
                      key: ValueKey('host-forms-option-${option.optionId}'),
                      copy: catchFieldCopy(l10n),
                      title: l10n.hostFormsQuestionChoice(number: index + 1),
                      initialValue: option.label,
                      contractExemption:
                          'Choice labels are saved with the form draft.',
                      onChanged: (value) => onOptionChanged(index, value),
                    ),
              ],
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                if (choices)
                  CatchChip.filter(
                    label: l10n.hostFormsQuestionAddChoice,
                    leading: CatchIcon(CatchIcons.add),
                    size: CatchChipSize.sm,
                    onPressed: onAddOption,
                  ),
                CatchButton(
                  label: l10n.hostFormsQuestionRemove,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  onPressed: onRemove,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
