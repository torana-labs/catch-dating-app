import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_question_tile.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The question kinds Add a question offers, in board order.
const hostFormAddableKinds = <HostFormQuestionKind>[
  HostFormQuestionKind.shortText,
  HostFormQuestionKind.singleChoice,
  HostFormQuestionKind.boolean,
  HostFormQuestionKind.number,
  HostFormQuestionKind.date,
];

/// The question builder in board order: the lead, one tile per question,
/// then Add a question.
class HostFormQuestionsBody extends StatelessWidget {
  const HostFormQuestionsBody({
    super.key,
    required this.state,
    required this.onOpen,
    required this.onRequiredChanged,
    required this.onLabelChanged,
    required this.onOptionChanged,
    required this.onAddOption,
    required this.onRemove,
    required this.onAdd,
    required this.onRetrySave,
  });

  final HostFormQuestionsState state;
  final ValueChanged<HostFormQuestionSlot> onOpen;
  final void Function(HostFormQuestionSlot slot, bool required)
  onRequiredChanged;
  final void Function(HostFormQuestionSlot slot, String label) onLabelChanged;
  final void Function(HostFormQuestionSlot slot, int index, String label)
  onOptionChanged;
  final ValueChanged<HostFormQuestionSlot> onAddOption;
  final ValueChanged<HostFormQuestionSlot> onRemove;
  final ValueChanged<HostFormQuestionKind> onAdd;
  final VoidCallback onRetrySave;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final lead = CatchText(
      l10n.hostFormsQuestionsLead,
      tone: CatchTextTone.secondary,
    );
    if (state.status == HostFormQuestionsStatus.loading) {
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        gap: CatchPageBodyGap.tight,
        children: [
          lead,
          CatchSkeleton.content(
            child: CatchSurface(
              child: CatchIndexRow(
                title: l10n.hostFormsQuestionUntitled,
                subtitle: l10n.hostFormsQuestionShortAnswer,
                onTap: null,
                density: CatchIndexRowSize.compact,
              ),
            ),
          ),
        ],
      );
    }
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        lead,
        if (state.save == HostFormQuestionsSave.failed)
          CatchNotice.inline(
            body: l10n.hostFormsQuestionsSaveFailed,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.hostFormsTryAgain,
              onPressed: onRetrySave,
            ),
          )
        else if (state.blocked)
          CatchNotice.inline(
            body: l10n.hostFormsQuestionsBlocked,
            tone: CatchNoticeTone.warning,
          ),
        if (state.questions.isEmpty)
          CatchText(l10n.hostFormsQuestionsEmpty, tone: CatchTextTone.secondary)
        else
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              for (final slot in state.questions)
                HostFormQuestionTile(
                  key: ValueKey<String>(
                    'host-forms-question-${slot.question.questionId}',
                  ),
                  question: slot.question,
                  open: slot.question.questionId == state.openQuestionId,
                  onOpen: () => onOpen(slot),
                  onRequiredChanged: (required) =>
                      onRequiredChanged(slot, required),
                  onLabelChanged: (label) => onLabelChanged(slot, label),
                  onOptionChanged: (index, label) =>
                      onOptionChanged(slot, index, label),
                  onAddOption: () => onAddOption(slot),
                  onRemove: () => onRemove(slot),
                ),
            ],
          ),
        CatchSection(
          title: l10n.hostFormsQuestionsAdd,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final kind in hostFormAddableKinds)
                  CatchChip.filter(
                    key: ValueKey<String>('host-forms-add-${kind.name}'),
                    label: switch (kind) {
                      HostFormQuestionKind.singleChoice =>
                        l10n.hostFormsQuestionsAddChoices,
                      HostFormQuestionKind.boolean =>
                        l10n.hostFormsQuestionYesNo,
                      HostFormQuestionKind.number =>
                        l10n.hostFormsQuestionNumber,
                      HostFormQuestionKind.date => l10n.hostFormsQuestionDate,
                      _ => l10n.hostFormsQuestionShortAnswer,
                    },
                    leading: CatchIcon(CatchIcons.add),
                    onPressed: state.busy ? null : () => onAdd(kind),
                  ),
              ],
            ),
            CatchText(
              l10n.hostFormsQuestionsTemplatesLine,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ],
    );
  }
}
