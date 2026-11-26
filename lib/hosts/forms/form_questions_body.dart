import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_question_tile.dart';
import 'package:catch_dating_app/hosts/forms/form_question_sheet.dart';
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

/// The question builder in board order: the lead, what stops the draft
/// saving or publishing, the questions (under their sections when the
/// state lists them), Add a section, then Add a question.
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
    this.onSettings,
    this.onEditSection,
    this.onAddSection,
    this.onMoreKinds,
    this.onReload,
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

  /// Opens a question's other settings.
  final ValueChanged<HostFormQuestionSlot>? onSettings;

  /// Opens a section's sheet, by section id.
  final ValueChanged<String>? onEditSection;
  final VoidCallback? onAddSection;

  /// Opens the picker with every answer type.
  final VoidCallback? onMoreKinds;

  /// Reloads the form after it changed elsewhere.
  final VoidCallback? onReload;

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
    final sections = state.sections;
    final issues = state.issues;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        lead,
        if (state.save == HostFormQuestionsSave.conflict)
          CatchNotice.inline(
            key: const ValueKey<String>('host-forms-questions-conflict'),
            title: l10n.hostFormConflictTitle,
            body: l10n.hostFormConflictBody,
            tone: CatchNoticeTone.warning,
            action: onReload == null
                ? null
                : CatchNoticeAction(
                    label: l10n.hostFormReload,
                    onPressed: onReload!,
                  ),
          )
        else if (state.save == HostFormQuestionsSave.failed)
          CatchNotice.inline(
            body: l10n.hostFormsQuestionsSaveFailed,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.hostFormsTryAgain,
              onPressed: onRetrySave,
            ),
          ),
        if (issues.isNotEmpty)
          CatchNotice.inline(
            key: const ValueKey<String>('host-forms-questions-issues'),
            title: l10n.hostFormValidationTitle(count: issues.length),
            body: issues.first,
            tone: state.blocked
                ? CatchNoticeTone.danger
                : CatchNoticeTone.warning,
          )
        else if (state.blocked)
          CatchNotice.inline(
            body: l10n.hostFormsQuestionsBlocked,
            tone: CatchNoticeTone.warning,
          ),
        if (state.questions.isEmpty && sections.length < 2)
          CatchText(l10n.hostFormsQuestionsEmpty, tone: CatchTextTone.secondary)
        else
          // With no sections listed, the questions show as one untitled group.
          for (final (index, section)
              in (sections.isEmpty
                      ? const <HostFormQuestionsSection?>[null]
                      : sections)
                  .indexed)
            CatchSection(
              key: section == null
                  ? null
                  : ValueKey<String>('host-forms-section-${section.sectionId}'),
              title: section == null
                  ? null
                  : hostFormSectionTitle(l10n, section.title, index),
              action: section == null || onEditSection == null
                  ? null
                  : CatchSectionAction(
                      label: l10n.hostFormsSectionEdit,
                      onPressed: state.busy
                          ? null
                          : () => onEditSection!(section.sectionId),
                    ),
              dividers: CatchSectionPlacement.none,
              empty: section == null ? null : l10n.hostFormsSectionEmpty,
              children: [
                if (state.questions.any(
                  (slot) => section == null || slot.sectionIndex == index,
                ))
                  CatchStack(
                    gap: CatchStackGap.g8,
                    children: [
                      for (final slot in state.questions)
                        if (section == null || slot.sectionIndex == index)
                          HostFormQuestionTile(
                            key: ValueKey<String>(
                              'host-forms-question-${slot.question.questionId}',
                            ),
                            question: slot.question,
                            open:
                                slot.question.questionId ==
                                state.openQuestionId,
                            onOpen: () => onOpen(slot),
                            onRequiredChanged: (required) =>
                                onRequiredChanged(slot, required),
                            onLabelChanged: (label) =>
                                onLabelChanged(slot, label),
                            onOptionChanged: (index, label) =>
                                onOptionChanged(slot, index, label),
                            onAddOption: () => onAddOption(slot),
                            onRemove: () => onRemove(slot),
                            onSettings: onSettings == null
                                ? null
                                : () => onSettings!(slot),
                          ),
                    ],
                  ),
              ],
            ),
        if (onAddSection != null)
          CatchButton(
            key: const ValueKey<String>('host-forms-add-section'),
            label: l10n.hostFormAddSection,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.add),
            fullWidth: true,
            onPressed: state.busy ? null : onAddSection,
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
                if (onMoreKinds != null)
                  CatchChip.filter(
                    key: const ValueKey<String>('host-forms-add-more'),
                    label: l10n.hostFormsQuestionsMoreKinds,
                    leading: CatchIcon(CatchIcons.more),
                    onPressed: state.busy ? null : onMoreKinds,
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
