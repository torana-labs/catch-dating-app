import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_actions.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_notice.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_question_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

enum _SectionAction { edit, moveUp, moveDown, remove }

class HostFormQuestionsPageBody extends StatefulWidget {
  const HostFormQuestionsPageBody({
    super.key,
    required this.organizerId,
    required this.formId,
    required this.state,
    required this.notifier,
    required this.onSelectionChanged,
  });

  final String organizerId;
  final String formId;
  final HostFormEditorState state;
  final HostFormEditorController notifier;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  State<HostFormQuestionsPageBody> createState() =>
      _HostFormQuestionsPageBodyState();
}

class _HostFormQuestionsPageBodyState extends State<HostFormQuestionsPageBody> {
  String? _expandedQuestionId;

  @override
  Widget build(BuildContext context) {
    final definition = widget.state.editor.definition;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HostFormEditorNotice(state: widget.state, notifier: widget.notifier),
        HostFormQuestionSectionList(
          organizerId: widget.organizerId,
          formId: widget.formId,
          definition: definition,
          status: widget.state.editor.form.status,
          notifier: widget.notifier,
          expandedQuestionId: _expandedQuestionId,
          onQuestionExpansionChanged: (questionId) {
            setState(() {
              _expandedQuestionId = _expandedQuestionId == questionId
                  ? null
                  : questionId;
            });
          },
          onSelectionChanged: widget.onSelectionChanged,
        ),
        gapH24,
        HostFormSettingsMenu(
          organizerId: widget.organizerId,
          formId: widget.formId,
        ),
        gapH24,
        HostFormPublishText(state: widget.state),
      ],
    );
  }
}

class HostFormQuestionSectionList extends StatelessWidget {
  const HostFormQuestionSectionList({
    super.key,
    required this.organizerId,
    required this.formId,
    required this.definition,
    required this.status,
    required this.notifier,
    required this.expandedQuestionId,
    required this.onQuestionExpansionChanged,
    required this.onSelectionChanged,
  });

  final String organizerId;
  final String formId;
  final HostFormDefinition definition;
  final HostFormLifecycleStatus status;
  final HostFormEditorController notifier;
  final String? expandedQuestionId;
  final ValueChanged<String> onQuestionExpansionChanged;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final sectionEntry in definition.sections.indexed) ...[
          HostFormSectionAccordion(
            organizerId: organizerId,
            formId: formId,
            definition: definition,
            sectionIndex: sectionEntry.$1,
            section: sectionEntry.$2,
            sectionCount: definition.sections.length,
            notifier: notifier,
            expandedQuestionId: expandedQuestionId,
            onQuestionExpansionChanged: onQuestionExpansionChanged,
            onSelectionChanged: onSelectionChanged,
          ),
          gapH20,
        ],
        CatchSection.fieldRows(
          children: [
            CatchField.add(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormAddSection,
              icon: CatchIcons.addRounded,
              onTap: notifier.addSection,
            ),
          ],
        ),
      ],
    );
  }
}

class HostFormSettingsMenu extends StatelessWidget {
  const HostFormSettingsMenu({
    super.key,
    required this.organizerId,
    required this.formId,
  });
  final String organizerId;
  final String formId;
  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    children: [
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        key: const ValueKey('host-form-settings-entry'),
        title: context.l10n.hostFormSettings,
        icon: CatchIcons.settingsOutlined,
        emphasis: CatchFieldEmphasis.title,
        onTap: () => openHostFormSettings(
          context,
          organizerId: organizerId,
          formId: formId,
        ),
      ),
      CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostAudienceQuestionPreview,
        icon: CatchIcons.visibilityOutlined,
        emphasis: CatchFieldEmphasis.title,
        onTap: () => context.pushNamed(
          Routes.hostFormPreviewScreen.name,
          pathParameters: {'formId': formId},
          queryParameters: {'organizerId': organizerId},
        ),
      ),
    ],
  );
}

class HostFormPublishText extends StatelessWidget {
  const HostFormPublishText({super.key, required this.state});

  final HostFormEditorState state;

  @override
  Widget build(BuildContext context) {
    final definition = state.editor.definition;
    final questionCount = definition.sections.fold<int>(
      0,
      (count, section) => count + section.questions.length,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const CatchDivider.section(),
        Padding(
          padding: CatchInsets.contentVerticalMedium,
          child: CatchText(
            '${context.l10n.hostFormQuestionCount(count: questionCount)} · '
            '${context.l10n.hostFormPublishPrompt}',
            key: const ValueKey('host-form-readiness-summary'),
            textAlign: TextAlign.center,
            variant: CatchTextVariant.supporting,
          ),
        ),
      ],
    );
  }
}

class HostFormSectionAccordion extends StatelessWidget {
  const HostFormSectionAccordion({
    super.key,
    required this.organizerId,
    required this.formId,
    required this.definition,
    required this.sectionIndex,
    required this.section,
    required this.sectionCount,
    required this.notifier,
    required this.expandedQuestionId,
    required this.onQuestionExpansionChanged,
    required this.onSelectionChanged,
  });

  final String organizerId;
  final String formId;
  final HostFormDefinition definition;
  final int sectionIndex;
  final HostFormSection section;
  final int sectionCount;
  final HostFormEditorController notifier;
  final String? expandedQuestionId;
  final ValueChanged<String> onQuestionExpansionChanged;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    title: section.title,
    first: sectionIndex == 0,
    trailing: CatchActionMenu<_SectionAction>(
      tooltip: context.l10n.hostFormSectionActions,
      variant: CatchIconActionVariant.plain,
      items: [
        CatchActionMenuItem(
          value: _SectionAction.edit,
          label: context.l10n.hostFormEditSection,
          icon: CatchIcons.editOutlined,
        ),
        if (sectionIndex > 0)
          CatchActionMenuItem(
            value: _SectionAction.moveUp,
            label: context.l10n.hostFormMoveSectionUp,
            icon: CatchIcons.arrowUpwardRounded,
          ),
        if (sectionIndex < sectionCount - 1)
          CatchActionMenuItem(
            value: _SectionAction.moveDown,
            label: context.l10n.hostFormMoveSectionDown,
            icon: CatchIcons.arrowDownwardRounded,
          ),
        if (sectionCount > 1)
          CatchActionMenuItem(
            value: _SectionAction.remove,
            label: context.l10n.hostFormRemoveSection,
            icon: CatchIcons.deleteOutlineRounded,
            isDestructive: true,
          ),
      ],
      onSelected: (action) {
        switch (action) {
          case _SectionAction.edit:
            onSelectionChanged(sectionIndex, null);
            showHostFormSectionEditor(
              context,
              organizerId: organizerId,
              formId: formId,
              sectionIndex: sectionIndex,
              section: section,
              notifier: notifier,
            );
          case _SectionAction.moveUp:
            notifier.moveSection(sectionIndex, -1);
          case _SectionAction.moveDown:
            notifier.moveSection(sectionIndex, 1);
          case _SectionAction.remove:
            notifier.removeSection(sectionIndex);
        }
      },
    ),
    child: HostFormQuestionRowList(
      organizerId: organizerId,
      formId: formId,
      definition: definition,
      sectionIndex: sectionIndex,
      section: section,
      notifier: notifier,
      expandedQuestionId: expandedQuestionId,
      onQuestionExpansionChanged: onQuestionExpansionChanged,
      onSelectionChanged: onSelectionChanged,
    ),
  );
}

class HostFormQuestionRowList extends StatelessWidget {
  const HostFormQuestionRowList({
    super.key,
    required this.organizerId,
    required this.formId,
    required this.definition,
    required this.sectionIndex,
    required this.section,
    required this.notifier,
    required this.expandedQuestionId,
    required this.onQuestionExpansionChanged,
    required this.onSelectionChanged,
  });

  final String organizerId;
  final String formId;
  final HostFormDefinition definition;
  final int sectionIndex;
  final HostFormSection section;
  final HostFormEditorController notifier;
  final String? expandedQuestionId;
  final ValueChanged<String> onQuestionExpansionChanged;
  final void Function(int section, int? question) onSelectionChanged;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      ReorderableListView.builder(
        key: ValueKey('form-section-${section.sectionId}-questions'),
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        buildDefaultDragHandles: false,
        itemCount: section.questions.length,
        onReorderItem: (oldIndex, newIndex) {
          final targetIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
          notifier.moveQuestion(sectionIndex, oldIndex, targetIndex - oldIndex);
        },
        itemBuilder: (context, questionIndex) {
          final question = section.questions[questionIndex];
          final expanded = expandedQuestionId == question.questionId;
          return Column(
            key: ValueKey('form-question-${question.questionId}'),
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchFieldLanes.single(
                child: CatchField.sortable(
                  copy: catchFieldCopy(context.l10n),
                  title: question.label,
                  metadata: hostFormQuestionSummary(context, question),
                  leading: section.questions.length > 1
                      ? ReorderableDragStartListener(
                          index: questionIndex,
                          child: Tooltip(
                            message: context.l10n.hostFormReorderQuestion,
                            child: SizedBox.square(
                              key: ValueKey(
                                'form-question-${question.questionId}-drag',
                              ),
                              dimension: CatchSpacing.s11,
                              child: Icon(CatchIcons.dragIndicatorRounded),
                            ),
                          ),
                        )
                      : const SizedBox.square(dimension: CatchSpacing.s11),
                  onTap: () {
                    onSelectionChanged(sectionIndex, questionIndex);
                    onQuestionExpansionChanged(question.questionId);
                  },
                ),
              ),
              AnimatedSize(
                duration: MediaQuery.maybeOf(context)?.disableAnimations == true
                    ? CatchMotion.none
                    : CatchMotion.base,
                curve: CatchMotion.easeOutCubicCurve,
                alignment: Alignment.topCenter,
                child: expanded
                    ? Padding(
                        key: ValueKey(
                          'form-question-${question.questionId}-editor',
                        ),
                        padding: CatchInsets.sectionItemBottomGap,
                        child: HostFormQuestionSection(
                          sectionIndex: sectionIndex,
                          questionIndex: questionIndex,
                          question: question,
                          questionCount: section.questions.length,
                          sections: definition.sections,
                          notifier: notifier,
                          compact: true,
                          onRemoved: () =>
                              onQuestionExpansionChanged(question.questionId),
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          );
        },
      ),
      CatchFieldLanes.single(
        child: CatchField.add(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey('form-section-${section.sectionId}-add-question'),
          title: context.l10n.hostFormAddQuestion,
          icon: CatchIcons.addRounded,
          onTap: () => showHostFormQuestionTypePicker(
            context,
            onSelected: (kind) => notifier.addQuestion(sectionIndex, kind),
          ),
        ),
      ),
    ],
  );
}
