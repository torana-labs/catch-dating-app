import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_number_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_text_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormValidationFieldLanes extends StatelessWidget {
  const HostFormValidationFieldLanes({
    super.key,
    required this.sectionIndex,
    required this.questionIndex,
    required this.question,
    required this.notifier,
  });

  final int sectionIndex;
  final int questionIndex;
  final HostFormQuestion question;
  final HostFormEditorController notifier;

  @override
  Widget build(BuildContext context) {
    final validation = question.validation;
    void update(HostFormQuestionValidation next) =>
        notifier.updateQuestion(sectionIndex, questionIndex, validation: next);
    final fields = <Widget>[];
    if (question.kind == HostFormQuestionKind.shortText ||
        question.kind == HostFormQuestionKind.longText) {
      fields.addAll([
        HostFormNumberField(
          fieldKey: 'min-length',
          questionId: question.questionId,
          title: context.l10n.hostFormMinimumLength,
          value: validation.minLength,
          onChanged: (value) => update(validation.copyWith(minLength: value)),
        ),
        HostFormNumberField(
          fieldKey: 'max-length',
          questionId: question.questionId,
          title: context.l10n.hostFormMaximumLength,
          value: validation.maxLength,
          onChanged: (value) => update(validation.copyWith(maxLength: value)),
        ),
        CatchFieldLanes.single(
          child: CatchField<HostFormPatternPreset>.select(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormPatternLabel,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsValidationPatternPreset,
            contractValueBuilder: (value) => value.name,
            values: HostFormPatternPreset.values,
            value: validation.patternPreset,
            hintText: context.l10n.hostFormPatternNone,
            itemLabelBuilder: (value) => hostFormPatternLabel(context, value),
            onChanged: (value) {
              if (value != null) {
                update(validation.copyWith(patternPreset: value));
              }
            },
          ),
        ),
        if (validation.patternPreset != null)
          CatchFieldLanes.single(
            child: CatchField.action(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormPatternNone,
              icon: CatchIcons.close,
              onTap: () => update(validation.copyWith(patternPreset: null)),
            ),
          ),
      ]);
    }
    if (question.kind == HostFormQuestionKind.number) {
      fields.addAll([
        HostFormNumberField(
          fieldKey: 'min-number',
          questionId: question.questionId,
          title: context.l10n.hostFormMinimumNumber,
          value: validation.minNumber,
          decimal: true,
          onChanged: (value) => update(validation.copyWith(minNumber: value)),
        ),
        HostFormNumberField(
          fieldKey: 'max-number',
          questionId: question.questionId,
          title: context.l10n.hostFormMaximumNumber,
          value: validation.maxNumber,
          decimal: true,
          onChanged: (value) => update(validation.copyWith(maxNumber: value)),
        ),
      ]);
    }
    if (question.kind == HostFormQuestionKind.date) {
      fields.addAll([
        HostFormValidationTextField(
          fieldKey: 'earliest-date',
          questionId: question.questionId,
          title: context.l10n.hostFormEarliestDate,
          value: validation.earliestDate,
          onChanged: (value) =>
              update(validation.copyWith(earliestDate: value)),
        ),
        HostFormValidationTextField(
          fieldKey: 'latest-date',
          questionId: question.questionId,
          title: context.l10n.hostFormLatestDate,
          value: validation.latestDate,
          onChanged: (value) => update(validation.copyWith(latestDate: value)),
        ),
      ]);
    }
    if (question.kind == HostFormQuestionKind.multiChoice) {
      fields.addAll([
        HostFormNumberField(
          fieldKey: 'min-selections',
          questionId: question.questionId,
          title: context.l10n.hostFormMinimumSelections,
          value: validation.minSelections,
          onChanged: (value) =>
              update(validation.copyWith(minSelections: value)),
        ),
        HostFormNumberField(
          fieldKey: 'max-selections',
          questionId: question.questionId,
          title: context.l10n.hostFormMaximumSelections,
          value: validation.maxSelections,
          onChanged: (value) =>
              update(validation.copyWith(maxSelections: value)),
        ),
      ]);
    }
    if (question.kind == HostFormQuestionKind.file) {
      fields.addAll([
        HostFormNumberField(
          fieldKey: 'max-files',
          questionId: question.questionId,
          title: context.l10n.hostFormMaximumFiles,
          value: validation.maxFileCount,
          onChanged: (value) =>
              update(validation.copyWith(maxFileCount: value)),
        ),
        HostFormNumberField(
          fieldKey: 'max-file-size',
          questionId: question.questionId,
          title: context.l10n.hostFormMaximumFileMegabytes,
          value: validation.maxFileSizeBytes == null
              ? null
              : validation.maxFileSizeBytes! ~/ (1024 * 1024),
          onChanged: (value) => update(
            validation.copyWith(
              maxFileSizeBytes: value == null ? null : value * 1024 * 1024,
            ),
          ),
        ),
        HostFormValidationTextField(
          fieldKey: 'mime-types',
          questionId: question.questionId,
          title: context.l10n.hostFormAllowedFileTypes,
          value: validation.allowedMimeTypes.join(', '),
          onChanged: (value) => update(
            validation.copyWith(
              allowedMimeTypes: value == null
                  ? const []
                  : value
                        .split(',')
                        .map((item) => item.trim().toLowerCase())
                        .where((item) => item.isNotEmpty)
                        .toSet()
                        .toList(growable: false),
            ),
          ),
        ),
      ]);
    }
    fields.add(
      HostFormValidationTextField(
        fieldKey: 'custom-error',
        questionId: question.questionId,
        title: context.l10n.hostFormCustomError,
        value: validation.customError,
        onChanged: (value) => update(validation.copyWith(customError: value)),
      ),
    );
    return CatchFieldLanes.custom(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: fields,
      ),
    );
  }
}
