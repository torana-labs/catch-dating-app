import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

Future<void> openHostFormSettings(
  BuildContext context, {
  required String organizerId,
  required String formId,
}) => context.pushNamed(
  Routes.hostFormBuilderScreen.name,
  pathParameters: {'formId': formId},
  queryParameters: {
    'organizerId': organizerId,
    'view': HostFormWorkspaceView.settings.name,
  },
);

Future<void> showHostFormSectionEditor(
  BuildContext context, {
  required String organizerId,
  required String formId,
  required int sectionIndex,
  required HostFormSection section,
  required HostFormEditorController notifier,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (sheetContext) => Consumer(
    builder: (sheetContext, ref, _) {
      final liveDefinition = catchAsyncStateFromAsyncValue(
        ref.watch(hostFormEditorControllerProvider(organizerId, formId)),
      ).value?.editor.definition;
      final liveSectionIndex =
          liveDefinition?.sections.indexWhere(
            (candidate) => candidate.sectionId == section.sectionId,
          ) ??
          -1;
      final currentSection = liveSectionIndex < 0
          ? section
          : liveDefinition!.sections[liveSectionIndex];
      final currentSectionIndex = liveSectionIndex < 0
          ? sectionIndex
          : liveSectionIndex;
      return CatchSheet.standard(
        title: context.l10n.hostFormEditSection,
        subtitle: context.l10n.hostFormQuestionCount(
          count: currentSection.questions.length,
        ),
        child: CatchSection.fieldRows(
          first: true,
          children: [
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey(
                'section-title-sheet-${currentSection.sectionId}-${currentSection.title}',
              ),
              title: context.l10n.hostFormSectionTitleLabel,
              initialValue: currentSection.title,
              autofocus: true,
              contractExemption:
                  'The backend form definition validates sections.',
              onBlur: (value) => notifier.updateSection(
                currentSectionIndex,
                title: value.trim(),
              ),
            ),
          ],
        ),
      );
    },
  ),
);

Future<void> showHostFormQuestionTypePicker(
  BuildContext context, {
  required ValueChanged<HostFormQuestionKind> onSelected,
}) async {
  const recommended = [
    HostFormQuestionKind.shortText,
    HostFormQuestionKind.phone,
    HostFormQuestionKind.longText,
    HostFormQuestionKind.singleChoice,
  ];
  final more = HostFormQuestionKind.values
      .where((value) => !recommended.contains(value))
      .toList(growable: false);
  final kind = await showCatchBottomSheet<HostFormQuestionKind>(
    context: context,
    builder: (sheetContext) => CatchSheet.standard(
      title: context.l10n.hostFormChooseQuestionType,
      subtitle: context.l10n.hostFormChooseQuestionTypeHelp,
      child: CatchSectionList(
        emptyStateOmitted: true,
        mainAxisSize: MainAxisSize.min,
        children: [
          CatchSection.fieldRows(
            title: context.l10n.hostFormRecommendedQuestionTypes,
            first: true,
            children: [
              for (final value in recommended)
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: hostFormQuestionKindLabel(context, value),
                  onTap: () => Navigator.of(sheetContext).pop(value),
                ),
            ],
          ),
          CatchSection.fieldRows(
            first: true,
            title: context.l10n.hostFormMoreQuestionTypes,
            children: [
              for (final value in more)
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: hostFormQuestionKindLabel(context, value),
                  onTap: () => Navigator.of(sheetContext).pop(value),
                ),
            ],
          ),
        ],
      ),
    ),
  );
  if (kind != null) onSelected(kind);
}
