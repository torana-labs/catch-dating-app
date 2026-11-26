import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/hosts/forms/host_form_copy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The answer rules a question of [question]'s kind can have, as fields:
/// length and text format for text, a range for numbers, the earliest and
/// latest date, how many choices, files and their size and types, then the
/// custom message every kind shows when an answer breaks a rule. Each field
/// saves when it loses focus and hands the whole rule set to [onChanged].
List<Widget> hostFormQuestionRuleFields(
  BuildContext context, {
  required HostFormQuestion question,
  required ValueChanged<HostFormQuestionValidation> onChanged,
}) {
  final l10n = context.l10n;
  final copy = catchFieldCopy(l10n);
  final rules = question.validation;
  final id = question.questionId;
  return [
    if (question.kind == HostFormQuestionKind.shortText ||
        question.kind == HostFormQuestionKind.longText) ...[
      HostFormRuleField(
        name: 'min-length',
        questionId: id,
        title: l10n.hostFormMinimumLength,
        value: rules.minLength?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) =>
            onChanged(rules.copyWith(minLength: hostFormRuleWhole(text))),
      ),
      HostFormRuleField(
        name: 'max-length',
        questionId: id,
        title: l10n.hostFormMaximumLength,
        value: rules.maxLength?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) =>
            onChanged(rules.copyWith(maxLength: hostFormRuleWhole(text))),
      ),
      CatchFieldLanes.single(
        child: CatchField<HostFormPatternPreset>.select(
          key: ValueKey<String>('host-form-rule-pattern-$id'),
          copy: copy,
          title: l10n.hostFormPatternLabel,
          contract: CatchContractConstraints
              .organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsValidationPatternPreset,
          contractValueBuilder: (value) => value.name,
          values: HostFormPatternPreset.values,
          value: rules.patternPreset,
          hintText: l10n.hostFormPatternNone,
          itemLabelBuilder: (value) => hostFormPatternLabel(context, value),
          onChanged: (value) {
            if (value != null) onChanged(rules.copyWith(patternPreset: value));
          },
        ),
      ),
      if (rules.patternPreset != null)
        CatchFieldLanes.single(
          child: CatchField.action(
            key: ValueKey<String>('host-form-rule-pattern-clear-$id'),
            copy: copy,
            title: l10n.hostFormPatternNone,
            icon: CatchIcons.close,
            onTap: () => onChanged(rules.copyWith(patternPreset: null)),
          ),
        ),
    ],
    if (question.kind == HostFormQuestionKind.number) ...[
      HostFormRuleField(
        name: 'min-number',
        questionId: id,
        title: l10n.hostFormMinimumNumber,
        value: rules.minNumber?.toString(),
        input: HostFormRuleFieldInput.decimal,
        onCommitted: (text) =>
            onChanged(rules.copyWith(minNumber: hostFormRuleDecimal(text))),
      ),
      HostFormRuleField(
        name: 'max-number',
        questionId: id,
        title: l10n.hostFormMaximumNumber,
        value: rules.maxNumber?.toString(),
        input: HostFormRuleFieldInput.decimal,
        onCommitted: (text) =>
            onChanged(rules.copyWith(maxNumber: hostFormRuleDecimal(text))),
      ),
    ],
    if (question.kind == HostFormQuestionKind.date) ...[
      HostFormRuleField(
        name: 'earliest-date',
        questionId: id,
        title: l10n.hostFormEarliestDate,
        value: rules.earliestDate,
        input: HostFormRuleFieldInput.text,
        onCommitted: (text) => onChanged(rules.copyWith(earliestDate: text)),
      ),
      HostFormRuleField(
        name: 'latest-date',
        questionId: id,
        title: l10n.hostFormLatestDate,
        value: rules.latestDate,
        input: HostFormRuleFieldInput.text,
        onCommitted: (text) => onChanged(rules.copyWith(latestDate: text)),
      ),
    ],
    if (question.kind == HostFormQuestionKind.multiChoice) ...[
      HostFormRuleField(
        name: 'min-selections',
        questionId: id,
        title: l10n.hostFormMinimumSelections,
        value: rules.minSelections?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) =>
            onChanged(rules.copyWith(minSelections: hostFormRuleWhole(text))),
      ),
      HostFormRuleField(
        name: 'max-selections',
        questionId: id,
        title: l10n.hostFormMaximumSelections,
        value: rules.maxSelections?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) =>
            onChanged(rules.copyWith(maxSelections: hostFormRuleWhole(text))),
      ),
    ],
    if (question.kind == HostFormQuestionKind.file) ...[
      HostFormRuleField(
        name: 'max-files',
        questionId: id,
        title: l10n.hostFormMaximumFiles,
        value: rules.maxFileCount?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) =>
            onChanged(rules.copyWith(maxFileCount: hostFormRuleWhole(text))),
      ),
      HostFormRuleField(
        name: 'max-file-size',
        questionId: id,
        title: l10n.hostFormMaximumFileMegabytes,
        value:
            (rules.maxFileSizeBytes == null
                    ? null
                    : rules.maxFileSizeBytes! ~/ _bytesPerMegabyte)
                ?.toString(),
        input: HostFormRuleFieldInput.whole,
        onCommitted: (text) => onChanged(
          rules.copyWith(
            maxFileSizeBytes: switch (hostFormRuleWhole(text)) {
              final megabytes? => megabytes * _bytesPerMegabyte,
              null => null,
            },
          ),
        ),
      ),
      HostFormRuleField(
        name: 'mime-types',
        questionId: id,
        title: l10n.hostFormAllowedFileTypes,
        value: rules.allowedMimeTypes.isEmpty
            ? null
            : rules.allowedMimeTypes.join(', '),
        input: HostFormRuleFieldInput.text,
        onCommitted: (text) => onChanged(
          rules.copyWith(
            allowedMimeTypes: text == null
                ? const []
                : text
                      .split(',')
                      .map((item) => item.trim().toLowerCase())
                      .where((item) => item.isNotEmpty)
                      .toSet()
                      .toList(growable: false),
          ),
        ),
      ),
    ],
    HostFormRuleField(
      name: 'custom-error',
      questionId: id,
      title: l10n.hostFormCustomError,
      value: rules.customError,
      input: HostFormRuleFieldInput.text,
      onCommitted: (text) => onChanged(rules.copyWith(customError: text)),
    ),
  ];
}

const _bytesPerMegabyte = 1024 * 1024;

/// How a rule field reads what the host types.
enum HostFormRuleFieldInput { whole, decimal, text }

/// A whole number from a rule field, or null when it is empty or not one.
int? hostFormRuleWhole(String? text) =>
    text == null ? null : int.tryParse(text);

/// A number from a rule field, or null when it is empty or not one.
num? hostFormRuleDecimal(String? text) =>
    text == null ? null : num.tryParse(text);

/// One answer rule as an optional field. It hands over the trimmed text,
/// or null when empty, when it loses focus.
class HostFormRuleField extends StatelessWidget {
  const HostFormRuleField({
    super.key,
    required this.name,
    required this.questionId,
    required this.title,
    required this.value,
    required this.input,
    required this.onCommitted,
  });

  /// The rule, as in min-length; it keys the field with [questionId].
  final String name;
  final String questionId;
  final String title;
  final String? value;
  final HostFormRuleFieldInput input;
  final ValueChanged<String?> onCommitted;

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.input(
      key: ValueKey<String>('host-form-rule-$name-$questionId-$value'),
      copy: catchFieldCopy(context.l10n),
      title: title,
      initialValue: value,
      labelMode: CatchFieldLabelTextMode.optional,
      keyboardType: switch (input) {
        HostFormRuleFieldInput.whole => TextInputType.number,
        HostFormRuleFieldInput.decimal => const TextInputType.numberWithOptions(
          decimal: true,
          signed: true,
        ),
        HostFormRuleFieldInput.text => null,
      },
      contractExemption: 'The form contract validates this answer rule.',
      onBlur: (text) => onCommitted(text.trim().isEmpty ? null : text.trim()),
    ),
  );
}
