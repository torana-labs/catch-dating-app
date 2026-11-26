import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/form_rule_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Opens a question's settings over the question builder. The sheet reads
/// the live draft, so an undo or a move shows at once, and closes itself
/// when the question is removed.
Future<void> showHostFormQuestionSheet(
  BuildContext context, {
  required String organizerId,
  required String formId,
  required String questionId,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (sheetContext) => Consumer(
    builder: (sheetContext, ref, _) {
      final provider = hostFormEditorControllerProvider(organizerId, formId);
      final definition = catchAsyncStateFromAsyncValue(
        ref.watch(provider),
      ).value?.editor.definition;
      final place = definition == null
          ? null
          : hostFormQuestionPlace(definition, questionId);
      if (definition == null || place == null) {
        return const SizedBox.shrink();
      }
      return HostFormQuestionSheet(
        definition: definition,
        sectionIndex: place.$1,
        questionIndex: place.$2,
        editor: ref.read(provider.notifier),
        onRemoved: () => Navigator.of(sheetContext).pop(),
      );
    },
  ),
);

/// Where the question with [questionId] sits: its section and its place in
/// that section; null when the draft no longer has it.
(int, int)? hostFormQuestionPlace(
  HostFormDefinition definition,
  String questionId,
) {
  for (final (sectionIndex, section) in definition.sections.indexed) {
    final questionIndex = section.questions.indexWhere(
      (question) => question.questionId == questionId,
    );
    if (questionIndex >= 0) return (sectionIndex, questionIndex);
  }
  return null;
}

/// Everything about one question past its wording, choices and Required:
/// its answer type, help text, the person field it fills, where the answer
/// goes and whether event members see it, its section and place, how it
/// is classified, prefilled and shown to the host, and its answer rules.
/// Each change goes straight to the draft through [editor].
class HostFormQuestionSheet extends StatelessWidget {
  const HostFormQuestionSheet({
    super.key,
    required this.definition,
    required this.sectionIndex,
    required this.questionIndex,
    required this.editor,
    required this.onRemoved,
  });

  final HostFormDefinition definition;
  final int sectionIndex;
  final int questionIndex;
  final HostFormEditorController editor;

  /// Called after Remove question takes the question out of the draft.
  final VoidCallback onRemoved;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final sections = definition.sections;
    final section = sections[sectionIndex];
    final question = section.questions[questionIndex];
    final id = question.questionId;
    void update({
      HostFormQuestionKind? kind,
      String? helpText,
      bool clearHelpText = false,
      String? canonicalFieldId,
      bool clearCanonicalField = false,
      HostFormAnswerDestination? answerDestination,
      bool? eventProfileAudience,
      HostFormPrivacyClass? privacyClass,
      HostFormPrefillPolicy? prefillPolicy,
      HostFormPresentation? hostPresentation,
    }) => editor.updateQuestion(
      sectionIndex,
      questionIndex,
      kind: kind,
      helpText: helpText,
      clearHelpText: clearHelpText,
      canonicalFieldId: canonicalFieldId,
      clearCanonicalField: clearCanonicalField,
      answerDestination: answerDestination,
      eventProfileAudience: eventProfileAudience,
      privacyClass: privacyClass,
      prefillPolicy: prefillPolicy,
      hostPresentation: hostPresentation,
    );
    // A person field another question already fills is not offered again.
    final personFields = [
      '',
      for (final field in question.availablePersonFieldIds)
        if (field == question.canonicalFieldId ||
            !sections.any(
              (other) => other.questions.any(
                (candidate) =>
                    candidate.questionId != id &&
                    candidate.canonicalFieldId == field,
              ),
            ))
          field,
    ];
    final label = question.label.trim();
    return CatchSheet.standard(
      title: label.isEmpty ? l10n.hostFormsQuestionUntitled : label,
      subtitle: hostFormQuestionKindText(l10n, question.kind),
      footer: CatchButton(
        key: ValueKey<String>('host-form-question-remove-$id'),
        label: l10n.hostFormRemoveQuestion,
        variant: CatchButtonVariant.danger,
        fullWidth: true,
        onPressed: () {
          editor.removeQuestion(sectionIndex, questionIndex);
          onRemoved();
        },
      ),
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField<HostFormQuestionKind>.select(
                key: ValueKey<String>('host-form-question-kind-$id'),
                copy: copy,
                title: l10n.hostFormQuestionType,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsKind,
                contractValueBuilder: (value) => value.name,
                values: HostFormQuestionKind.values,
                value: question.kind,
                itemLabelBuilder: (value) =>
                    hostFormQuestionKindText(l10n, value),
                onChanged: (value) => update(kind: value),
              ),
              CatchField.input(
                key: ValueKey<String>(
                  'host-form-question-help-$id-${question.helpText}',
                ),
                copy: copy,
                title: l10n.hostFormQuestionHelpLabel,
                initialValue: question.helpText,
                labelMode: CatchFieldLabelTextMode.optional,
                maxLines: 3,
                contractExemption: 'The form contract validates question help.',
                onBlur: (value) => update(
                  helpText: value.trim(),
                  clearHelpText: value.trim().isEmpty,
                ),
              ),
              if (question.availablePersonFieldIds.isNotEmpty)
                CatchField<String>.select(
                  key: ValueKey<String>('host-form-question-person-$id'),
                  copy: copy,
                  title: l10n.hostFormPersonField,
                  helperText: l10n.hostFormPersonFieldHelp,
                  contractExemption:
                      'The empty choice serializes to null; other IDs come '
                      'from the generated person-field catalog and are '
                      'server validated.',
                  values: personFields,
                  value: question.canonicalFieldId ?? '',
                  itemLabelBuilder: (field) =>
                      l10n.hostFormPersonFieldName(field: field),
                  onChanged: (field) {
                    if (field == null) return;
                    update(
                      canonicalFieldId: field.isEmpty ? null : field,
                      clearCanonicalField: field.isEmpty,
                    );
                  },
                ),
              CatchField<HostFormAnswerDestination>.select(
                key: ValueKey<String>('host-form-question-destination-$id'),
                copy: copy,
                title: l10n.hostFormAnswerDestinationLabel,
                helperText: switch (question.answerDestination) {
                  HostFormAnswerDestination.organizerOnly =>
                    l10n.hostFormAnswerOrganizerOnlyHelp,
                  HostFormAnswerDestination.catchProfile =>
                    l10n.hostFormAnswerCatchProfileHelp,
                  HostFormAnswerDestination.organizerCard =>
                    l10n.hostFormAnswerOrganizerCardHelp,
                },
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsAnswerDestination,
                contractValueBuilder: (value) => value.name,
                values: {
                  ...question.availableAnswerDestinations,
                  question.answerDestination,
                }.toList(growable: false),
                value: question.answerDestination,
                itemLabelBuilder: (value) => switch (value) {
                  HostFormAnswerDestination.organizerOnly =>
                    l10n.hostFormAnswerOrganizerOnly,
                  HostFormAnswerDestination.catchProfile =>
                    l10n.hostFormAnswerCatchProfile,
                  HostFormAnswerDestination.organizerCard =>
                    l10n.hostFormAnswerOrganizerCard,
                },
                onChanged: (value) => update(answerDestination: value),
              ),
              if (question.answerDestination ==
                      HostFormAnswerDestination.organizerCard &&
                  question.kind != HostFormQuestionKind.file)
                CatchField.toggle(
                  key: ValueKey<String>('host-form-question-members-$id'),
                  copy: copy,
                  title: l10n.eventProfileQuestionAudience,
                  value: question.proposesEventProfile,
                  contractExemption:
                      'Optional event audience requires a verified profile '
                      'policy and a later attendee sharing receipt.',
                  onChanged: (value) => update(eventProfileAudience: value),
                ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormsQuestionPlace,
            dividers: CatchSectionPlacement.none,
            children: [
              if (sections.length > 1)
                CatchField<int>.select(
                  key: ValueKey<String>(
                    'host-form-question-section-$id-$sectionIndex',
                  ),
                  copy: copy,
                  title: l10n.hostFormMoveToSection,
                  contractExemption:
                      'Moves an existing question between sections without '
                      'changing a schema-backed field value.',
                  values: List<int>.generate(sections.length, (index) => index),
                  value: sectionIndex,
                  itemLabelBuilder: (index) =>
                      hostFormSectionTitle(l10n, sections[index].title, index),
                  onChanged: (target) {
                    if (target == null || target == sectionIndex) return;
                    editor.moveQuestionToSection(
                      questionId: id,
                      targetSectionIndex: target,
                    );
                  },
                ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                equal: true,
                children: [
                  CatchButton(
                    key: ValueKey<String>('host-form-question-up-$id'),
                    label: l10n.hostFormMoveUp,
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    onPressed: questionIndex == 0
                        ? null
                        : () => editor.moveQuestion(
                            sectionIndex,
                            questionIndex,
                            -1,
                          ),
                  ),
                  CatchButton(
                    key: ValueKey<String>('host-form-question-down-$id'),
                    label: l10n.hostFormMoveDown,
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    onPressed: questionIndex == section.questions.length - 1
                        ? null
                        : () => editor.moveQuestion(
                            sectionIndex,
                            questionIndex,
                            1,
                          ),
                  ),
                ],
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormsQuestionRules,
            dividers: CatchSectionPlacement.none,
            children: hostFormQuestionRuleFields(
              context,
              question: question,
              onChanged: (validation) => editor.updateQuestion(
                sectionIndex,
                questionIndex,
                validation: validation,
              ),
            ),
          ),
          CatchSection(
            title: l10n.hostFormAdvancedQuestionSettings,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField<HostFormPrivacyClass>.select(
                key: ValueKey<String>('host-form-question-privacy-$id'),
                copy: copy,
                title: l10n.hostFormPrivacyLabel,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrivacyClass,
                contractValueBuilder: (value) => value.name,
                values: HostFormPrivacyClass.values,
                value: question.privacyClass,
                itemLabelBuilder: (value) =>
                    hostFormPrivacyLabel(context, value),
                onChanged: (value) => update(privacyClass: value),
              ),
              CatchField<HostFormPrefillPolicy>.select(
                key: ValueKey<String>('host-form-question-prefill-$id'),
                copy: copy,
                title: l10n.hostFormPrefillLabel,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrefillPolicy,
                contractValueBuilder: (value) => value.name,
                values: HostFormPrefillPolicy.values,
                value: question.prefillPolicy,
                itemLabelBuilder: (value) =>
                    hostFormPrefillLabel(context, value),
                onChanged: (value) => update(prefillPolicy: value),
              ),
              CatchField<HostFormPresentation>.select(
                key: ValueKey<String>('host-form-question-presentation-$id'),
                copy: copy,
                title: l10n.hostFormPresentationLabel,
                contract: CatchContractConstraints
                    .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsHostPresentation,
                contractValueBuilder: (value) => value.name,
                values: HostFormPresentation.values,
                value: question.hostPresentation,
                itemLabelBuilder: (value) =>
                    hostFormPresentationLabel(context, value),
                onChanged: (value) => update(hostPresentation: value),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A section's title, or "Section 2" while it has none.
String hostFormSectionTitle(AppLocalizations l10n, String title, int index) =>
    title.trim().isEmpty
    ? l10n.hostFormSectionNumber(number: index + 1)
    : title.trim();
