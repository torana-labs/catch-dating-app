import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/form_question_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The answer types the picker recommends first; every other type follows.
const hostFormRecommendedKinds = <HostFormQuestionKind>[
  HostFormQuestionKind.shortText,
  HostFormQuestionKind.phone,
  HostFormQuestionKind.longText,
  HostFormQuestionKind.singleChoice,
];

/// Opens the answer-type picker with every kind a question can have, the
/// recommended ones first. Resolves to the kind picked, or null.
Future<HostFormQuestionKind?> showHostFormKindPicker(BuildContext context) =>
    showCatchBottomSheet<HostFormQuestionKind>(
      context: context,
      builder: (sheetContext) => const HostFormKindPicker(),
    );

/// Every answer type, the recommended ones first, each one tap away.
class HostFormKindPicker extends StatelessWidget {
  const HostFormKindPicker({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: l10n.hostFormChooseQuestionType,
      subtitle: l10n.hostFormChooseQuestionTypeHelp,
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchSection(
            title: l10n.hostFormRecommendedQuestionTypes,
            children: [
              for (final kind in hostFormRecommendedKinds)
                CatchIndexRow(
                  key: ValueKey<String>('host-form-kind-${kind.name}'),
                  title: hostFormQuestionKindText(l10n, kind),
                  onTap: () => Navigator.of(context).pop(kind),
                  density: CatchIndexRowSize.compact,
                  chevron: true,
                ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormMoreQuestionTypes,
            children: [
              for (final kind in HostFormQuestionKind.values)
                if (!hostFormRecommendedKinds.contains(kind))
                  CatchIndexRow(
                    key: ValueKey<String>('host-form-kind-${kind.name}'),
                    title: hostFormQuestionKindText(l10n, kind),
                    onTap: () => Navigator.of(context).pop(kind),
                    density: CatchIndexRowSize.compact,
                    chevron: true,
                  ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Opens one section's sheet over the question builder: its title, Add a
/// question to it, moving it up or down and removing it. The sheet reads
/// the live draft by section id, so it follows the section as it moves.
Future<void> showHostFormSectionSheet(
  BuildContext context, {
  required String organizerId,
  required String formId,
  required String sectionId,
  required ValueChanged<int> onAddQuestion,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (sheetContext) => Consumer(
    builder: (sheetContext, ref, _) {
      final provider = hostFormEditorControllerProvider(organizerId, formId);
      final sections = catchAsyncStateFromAsyncValue(
        ref.watch(provider),
      ).value?.editor.definition.sections;
      final index =
          sections?.indexWhere((section) => section.sectionId == sectionId) ??
          -1;
      if (sections == null || index < 0) return const SizedBox.shrink();
      final editor = ref.read(provider.notifier);
      void close() => Navigator.of(sheetContext).pop();
      return HostFormSectionSheet(
        title: sections[index].title,
        index: index,
        count: sections.length,
        questionCount: sections[index].questions.length,
        sectionId: sectionId,
        onTitleChanged: (title) => editor.updateSection(index, title: title),
        onAddQuestion: () {
          close();
          onAddQuestion(index);
        },
        onMove: (delta) => editor.moveSection(index, delta),
        onRemove: () {
          close();
          editor.removeSection(index);
        },
      );
    },
  ),
);

/// One section's title and what the host can do with it.
class HostFormSectionSheet extends StatelessWidget {
  const HostFormSectionSheet({
    super.key,
    required this.title,
    required this.index,
    required this.count,
    required this.questionCount,
    required this.sectionId,
    required this.onTitleChanged,
    required this.onAddQuestion,
    required this.onMove,
    required this.onRemove,
  });

  final String title;

  /// Where the section sits, and how many sections the form has.
  final int index;
  final int count;
  final int questionCount;
  final String sectionId;
  final ValueChanged<String> onTitleChanged;
  final VoidCallback onAddQuestion;

  /// Moves the section by -1 (up) or 1 (down).
  final ValueChanged<int> onMove;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSheet.standard(
      title: hostFormSectionTitle(l10n, title, index),
      subtitle: l10n.hostFormQuestionCount(count: questionCount),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: ValueKey<String>(
                  'host-form-section-title-$sectionId-$title',
                ),
                copy: copy,
                title: l10n.hostFormSectionTitleLabel,
                initialValue: title,
                contractExemption:
                    'The backend form definition validates sections.',
                onBlur: (value) => onTitleChanged(value.trim()),
              ),
            ],
          ),
          CatchButton(
            key: ValueKey<String>('host-form-section-add-$sectionId'),
            label: l10n.hostFormAddQuestion,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.add),
            fullWidth: true,
            onPressed: onAddQuestion,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            equal: true,
            children: [
              CatchButton(
                key: ValueKey<String>('host-form-section-up-$sectionId'),
                label: l10n.hostFormMoveSectionUp,
                variant: CatchButtonVariant.quiet,
                fullWidth: true,
                onPressed: index == 0 ? null : () => onMove(-1),
              ),
              CatchButton(
                key: ValueKey<String>('host-form-section-down-$sectionId'),
                label: l10n.hostFormMoveSectionDown,
                variant: CatchButtonVariant.quiet,
                fullWidth: true,
                onPressed: index == count - 1 ? null : () => onMove(1),
              ),
            ],
          ),
          if (count > 1)
            CatchButton(
              key: ValueKey<String>('host-form-section-remove-$sectionId'),
              label: l10n.hostFormRemoveSection,
              variant: CatchButtonVariant.danger,
              fullWidth: true,
              onPressed: onRemove,
            ),
        ],
      ),
    );
  }
}
