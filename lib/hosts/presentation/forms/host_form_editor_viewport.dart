import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_actions.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_notice.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_question_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_settings_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormEditorViewport extends StatelessWidget {
  const HostFormEditorViewport({
    super.key,
    required this.organizerId,
    required this.state,
    required this.notifier,
    required this.sectionIndex,
    required this.questionIndex,
    required this.onSelectionChanged,
  });

  final String organizerId;
  final HostFormEditorState state;
  final HostFormEditorController notifier;
  final int? sectionIndex;
  final int? questionIndex;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final definition = state.editor.definition;
    return Column(
      children: [
        HostFormEditorNotice(state: state, notifier: notifier, padded: true),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: CatchFormWorkspaceTokens.formBuilderOutlineWidth,
                child: SingleChildScrollView(
                  padding: CatchInsets.pageBody,
                  child: HostFormOutlineMenu(
                    definition: definition,
                    selectedSection: sectionIndex,
                    selectedQuestion: questionIndex,
                    onSelected: onSelectionChanged,
                    notifier: notifier,
                  ),
                ),
              ),
              CatchDivider.vertical(color: t.line),
              Expanded(
                child: ColoredBox(
                  color: t.surface,
                  child: SingleChildScrollView(
                    padding: CatchInsets.pageBody,
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(
                          maxWidth: CatchLayout.maxContentWidth,
                        ),
                        child: HostFormBody(definition: definition),
                      ),
                    ),
                  ),
                ),
              ),
              CatchDivider.vertical(color: t.line),
              SizedBox(
                width: CatchFormWorkspaceTokens.formBuilderInspectorWidth,
                child: SingleChildScrollView(
                  padding: CatchInsets.pageBody,
                  child: HostFormInspectorSection(
                    organizerId: organizerId,
                    definition: definition,
                    sectionIndex: sectionIndex,
                    questionIndex: questionIndex,
                    notifier: notifier,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class HostFormSectionField extends StatelessWidget {
  const HostFormSectionField({
    super.key,
    required this.sectionIndex,
    required this.section,
    required this.sectionCount,
    required this.notifier,
    required this.onSelectionChanged,
  });

  final int sectionIndex;
  final HostFormSection section;
  final int sectionCount;
  final HostFormEditorController notifier;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    title: context.l10n.hostFormSectionNumber(number: sectionIndex + 1),
    first: sectionIndex == 0,
    children: [
      CatchField.input(
        copy: catchFieldCopy(context.l10n),
        key: ValueKey('section-title-${section.sectionId}-${section.title}'),
        title: context.l10n.hostFormSectionTitleLabel,
        initialValue: section.title,
        contractExemption: 'The backend form definition validates sections.',
        onFocusChanged: (focused) {
          if (focused) onSelectionChanged(sectionIndex, null);
        },
        onBlur: (value) =>
            notifier.updateSection(sectionIndex, title: value.trim()),
      ),
      for (final questionEntry in section.questions.indexed)
        CatchField.nav(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey(questionEntry.$2.questionId),
          title: questionEntry.$2.label,
          body: hostFormQuestionSummary(context, questionEntry.$2),
          onTap: () => onSelectionChanged(sectionIndex, questionEntry.$1),
        ),
      CatchField.add(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormAddQuestion,
        icon: CatchIcons.addRounded,
        onTap: () => showHostFormQuestionTypePicker(
          context,
          onSelected: (kind) => notifier.addQuestion(sectionIndex, kind),
        ),
      ),
      CatchField.action(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormMoveSectionUp,
        icon: CatchIcons.arrowUpwardRounded,
        onTap: sectionIndex == 0
            ? null
            : () => notifier.moveSection(sectionIndex, -1),
      ),
      CatchField.action(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormMoveSectionDown,
        icon: CatchIcons.arrowDownwardRounded,
        onTap: sectionIndex == sectionCount - 1
            ? null
            : () => notifier.moveSection(sectionIndex, 1),
      ),
      CatchField.action(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostFormRemoveSection,
        icon: CatchIcons.deleteOutlineRounded,
        tone: CatchFieldTone.danger,
        onTap: sectionCount <= 1
            ? null
            : () => notifier.removeSection(sectionIndex),
      ),
    ],
  );
}

class HostFormOutlineMenu extends StatelessWidget {
  const HostFormOutlineMenu({
    super.key,
    required this.definition,
    required this.selectedSection,
    required this.selectedQuestion,
    required this.onSelected,
    required this.notifier,
  });

  final HostFormDefinition definition;
  final int? selectedSection;
  final int? selectedQuestion;
  final void Function(int section, int? question) onSelected;
  final HostFormEditorController notifier;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      CatchText(
        context.l10n.hostFormOutline,
        variant: CatchTextVariant.sectionTitle,
      ),
      gapH12,
      CatchSection.containedFieldRows(
        children: [
          for (final sectionEntry in definition.sections.indexed) ...[
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: sectionEntry.$2.title,
              body: context.l10n.hostFormQuestionCount(
                count: sectionEntry.$2.questions.length,
              ),
              emphasis:
                  selectedSection == sectionEntry.$1 && selectedQuestion == null
                  ? CatchFieldEmphasis.title
                  : CatchFieldEmphasis.body,
              onTap: () => onSelected(sectionEntry.$1, null),
            ),
            for (final questionEntry in sectionEntry.$2.questions.indexed)
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: questionEntry.$2.label,
                body: hostFormQuestionKindLabel(context, questionEntry.$2.kind),
                emphasis:
                    selectedSection == sectionEntry.$1 &&
                        selectedQuestion == questionEntry.$1
                    ? CatchFieldEmphasis.title
                    : CatchFieldEmphasis.body,
                onTap: () => onSelected(sectionEntry.$1, questionEntry.$1),
              ),
          ],
        ],
      ),
      gapH12,
      CatchButton(
        label: context.l10n.hostFormAddSection,
        variant: CatchButtonVariant.secondary,
        onPressed: notifier.addSection,
      ),
    ],
  );
}

class HostFormInspectorSection extends StatelessWidget {
  const HostFormInspectorSection({
    super.key,
    required this.organizerId,
    required this.definition,
    required this.sectionIndex,
    required this.questionIndex,
    required this.notifier,
  });

  final String organizerId;
  final HostFormDefinition definition;
  final int? sectionIndex;
  final int? questionIndex;
  final HostFormEditorController notifier;

  @override
  Widget build(BuildContext context) {
    if (sectionIndex == null) {
      return HostFormSettingsSectionList(
        organizerId: organizerId,
        definition: definition,
        notifier: notifier,
      );
    }
    final section = definition.sections[sectionIndex!];
    if (questionIndex == null) {
      return HostFormSectionField(
        sectionIndex: sectionIndex!,
        section: section,
        sectionCount: definition.sections.length,
        notifier: notifier,
        onSelectionChanged: (_, _) {},
      );
    }
    final question = section.questions[questionIndex!];
    return HostFormQuestionSection(
      sectionIndex: sectionIndex!,
      questionIndex: questionIndex!,
      question: question,
      questionCount: section.questions.length,
      sections: definition.sections,
      notifier: notifier,
    );
  }
}
