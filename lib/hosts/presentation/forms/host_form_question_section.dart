import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_field_lanes.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormQuestionSection extends StatelessWidget {
  const HostFormQuestionSection({
    super.key,
    required this.sectionIndex,
    required this.questionIndex,
    required this.question,
    required this.questionCount,
    required this.sections,
    required this.notifier,
    this.compact = false,
    this.onRemoved,
  });

  final int sectionIndex;
  final int questionIndex;
  final HostFormQuestion question;
  final int questionCount;
  final List<HostFormSection> sections;
  final HostFormEditorController notifier;
  final bool compact;
  final VoidCallback? onRemoved;

  @override
  Widget build(BuildContext context) {
    final primaryFields = <Widget>[
      CatchFieldLanes.single(
        child: CatchField.input(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey(
            'question-label-${question.questionId}-${question.label}',
          ),
          title: context.l10n.hostFormQuestionLabel,
          initialValue: question.label,
          contractExemption: 'The backend form definition validates questions.',
          onBlur: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            label: value.trim(),
          ),
        ),
      ),
      CatchFieldLanes.single(
        child: CatchField<HostFormQuestionKind>.select(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormQuestionType,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsKind,
          contractValueBuilder: (value) => value.name,
          values: HostFormQuestionKind.values,
          value: question.kind,
          itemLabelBuilder: (value) =>
              hostFormQuestionKindLabel(context, value),
          onChanged: (value) =>
              notifier.updateQuestion(sectionIndex, questionIndex, kind: value),
        ),
      ),
      for (final optionEntry in question.options.indexed)
        CatchFieldLanes.single(
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey(
              'question-option-${question.questionId}-${optionEntry.$2.optionId}',
            ),
            title: context.l10n.hostFormOptionNumber(
              number: optionEntry.$1 + 1,
            ),
            initialValue: optionEntry.$2.label,
            contractExemption: 'The backend validates form choice options.',
            onBlur: (value) => notifier.updateOption(
              sectionIndex,
              questionIndex,
              optionEntry.$1,
              label: value.trim(),
            ),
          ),
        ),
      if (question.options.isNotEmpty)
        CatchFieldLanes.single(
          child: CatchField.add(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormAddOption,
            onTap: () => notifier.addOption(sectionIndex, questionIndex),
          ),
        ),
      if (question.availablePersonFieldIds.isNotEmpty)
        CatchFieldLanes.single(
          child: CatchField<String>.select(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('question-person-field-${question.questionId}'),
            title: context.l10n.hostFormPersonField,
            helperText: context.l10n.hostFormPersonFieldHelp,
            contractExemption:
                'The empty choice serializes to null; other IDs come from the '
                'generated person-field catalog and are server validated.',
            values: [
              '',
              ...question.availablePersonFieldIds.where(
                (id) =>
                    id == question.canonicalFieldId ||
                    !sections.any(
                      (section) => section.questions.any(
                        (other) =>
                            other.questionId != question.questionId &&
                            other.canonicalFieldId == id,
                      ),
                    ),
              ),
            ],
            value: question.canonicalFieldId ?? '',
            itemLabelBuilder: (id) =>
                context.l10n.hostFormPersonFieldName(field: id),
            onChanged: (id) {
              if (id == null) return;
              notifier.updateQuestion(
                sectionIndex,
                questionIndex,
                canonicalFieldId: id.isEmpty ? null : id,
                clearCanonicalField: id.isEmpty,
              );
            },
          ),
        ),
      CatchFieldLanes.single(
        child: CatchField<HostFormAnswerDestination>.select(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormAnswerDestinationLabel,
          helperText: switch (question.answerDestination) {
            HostFormAnswerDestination.organizerOnly =>
              context.l10n.hostFormAnswerOrganizerOnlyHelp,
            HostFormAnswerDestination.catchProfile =>
              context.l10n.hostFormAnswerCatchProfileHelp,
            HostFormAnswerDestination.organizerCard =>
              context.l10n.hostFormAnswerOrganizerCardHelp,
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
              context.l10n.hostFormAnswerOrganizerOnly,
            HostFormAnswerDestination.catchProfile =>
              context.l10n.hostFormAnswerCatchProfile,
            HostFormAnswerDestination.organizerCard =>
              context.l10n.hostFormAnswerOrganizerCard,
          },
          onChanged: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            answerDestination: value,
          ),
        ),
      ),
      if (question.answerDestination ==
              HostFormAnswerDestination.organizerCard &&
          question.kind != HostFormQuestionKind.file)
        CatchFieldLanes.single(
          child: CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventProfileQuestionAudience,
            value: question.proposesEventProfile,
            contractExemption:
                'Optional event audience requires a verified profile policy '
                'and a later attendee sharing receipt.',
            onChanged: (value) => notifier.updateQuestion(
              sectionIndex,
              questionIndex,
              eventProfileAudience: value,
            ),
          ),
        ),
      if (sections.length > 1)
        CatchFieldLanes.single(
          child: CatchField<int>.select(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey(
              'question-section-${question.questionId}-$sectionIndex',
            ),
            title: context.l10n.hostFormMoveToSection,
            contractExemption:
                'Moves an existing question between sections without changing '
                'a schema-backed field value.',
            values: List<int>.generate(sections.length, (index) => index),
            value: sectionIndex,
            itemLabelBuilder: (index) => sections[index].title,
            onChanged: (targetSectionIndex) {
              if (targetSectionIndex == null ||
                  targetSectionIndex == sectionIndex) {
                return;
              }
              notifier.moveQuestionToSection(
                questionId: question.questionId,
                targetSectionIndex: targetSectionIndex,
              );
            },
          ),
        ),
      CatchFieldLanes.single(
        child: CatchField.input(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey(
            'question-help-${question.questionId}-${question.helpText}',
          ),
          title: context.l10n.hostFormQuestionHelpLabel,
          initialValue: question.helpText,
          labelMode: CatchFieldLabelTextMode.optional,
          maxLines: 3,
          contractExemption: 'The form contract validates question help.',
          onBlur: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            helpText: value.trim(),
            clearHelpText: value.trim().isEmpty,
          ),
        ),
      ),
      CatchFieldLanes.single(
        child: CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormQuestionRequired,
          value: question.required,
          contractExemption: 'Requiredness is part of the form definition.',
          onChanged: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            required: value,
          ),
        ),
      ),
    ];
    final advancedFields = <Widget>[
      CatchFieldLanes.single(
        child: CatchField<HostFormPrivacyClass>.select(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormPrivacyLabel,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrivacyClass,
          contractValueBuilder: (value) => value.name,
          values: HostFormPrivacyClass.values,
          value: question.privacyClass,
          itemLabelBuilder: (value) => hostFormPrivacyLabel(context, value),
          onChanged: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            privacyClass: value,
          ),
        ),
      ),
      CatchFieldLanes.single(
        child: CatchField<HostFormPrefillPolicy>.select(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormPrefillLabel,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrefillPolicy,
          contractValueBuilder: (value) => value.name,
          values: HostFormPrefillPolicy.values,
          value: question.prefillPolicy,
          itemLabelBuilder: (value) => hostFormPrefillLabel(context, value),
          onChanged: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            prefillPolicy: value,
          ),
        ),
      ),
      CatchFieldLanes.single(
        child: CatchField<HostFormPresentation>.select(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostFormPresentationLabel,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsHostPresentation,
          contractValueBuilder: (value) => value.name,
          values: HostFormPresentation.values,
          value: question.hostPresentation,
          itemLabelBuilder: (value) =>
              hostFormPresentationLabel(context, value),
          onChanged: (value) => notifier.updateQuestion(
            sectionIndex,
            questionIndex,
            hostPresentation: value,
          ),
        ),
      ),
      HostFormValidationFieldLanes(
        sectionIndex: sectionIndex,
        questionIndex: questionIndex,
        question: question,
        notifier: notifier,
      ),
    ];
    return CatchSection.fieldRows(
      first: true,
      children: [
        ...primaryFields,
        if (compact)
          CatchField.control(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormAdvancedQuestionSettings,
            body: context.l10n.hostFormAdvancedQuestionSettingsHelp,
            contractExemption:
                'Disclosure groups advanced fields from the form definition.',
            child: CatchFieldLanes.divided(children: advancedFields),
          )
        else
          ...advancedFields,
        if (!compact)
          Row(
            children: [
              Expanded(
                child: CatchButton(
                  label: context.l10n.hostFormMoveUp,
                  variant: CatchButtonVariant.quiet,
                  onPressed: questionIndex == 0
                      ? null
                      : () => notifier.moveQuestion(
                          sectionIndex,
                          questionIndex,
                          -1,
                        ),
                ),
              ),
              gapW8,
              Expanded(
                child: CatchButton(
                  label: context.l10n.hostFormMoveDown,
                  variant: CatchButtonVariant.quiet,
                  onPressed: questionIndex == questionCount - 1
                      ? null
                      : () => notifier.moveQuestion(
                          sectionIndex,
                          questionIndex,
                          1,
                        ),
                ),
              ),
            ],
          ),
        CatchButton(
          label: context.l10n.hostFormRemoveQuestion,
          variant: CatchButtonVariant.danger,
          fullWidth: true,
          onPressed: () {
            notifier.removeQuestion(sectionIndex, questionIndex);
            onRemoved?.call();
          },
        ),
      ],
    );
  }
}
