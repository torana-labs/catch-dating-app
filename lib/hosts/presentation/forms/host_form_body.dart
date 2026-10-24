import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormBody extends StatefulWidget {
  const HostFormBody({
    super.key,
    required this.definition,
    this.preview = true,
    this.onSubmit,
  });

  final HostFormDefinition definition;
  final bool preview;
  final VoidCallback? onSubmit;

  @override
  State<HostFormBody> createState() => _HostFormBodyState();
}

class _HostFormBodyState extends State<HostFormBody> {
  final Map<String, Object?> _answers = {};

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sections = widget.definition.reachableSections(_answers);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          widget.definition.title,
          variant: CatchTextVariant.headline,
          color: t.ink,
        ),
        if (widget.definition.description case final description?) ...[
          gapH10,
          CatchText(
            description,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
        if (widget.definition.appearancePreset ==
                HostFormAppearancePreset.activity &&
            widget.definition.activityKind != null) ...[
          gapH12,
          Align(
            alignment: Alignment.centerLeft,
            child: CatchChip.tag(label: widget.definition.activityKind!),
          ),
        ],
        for (final indexedSection in sections.indexed)
          CatchSection.fieldRows(
            key: ValueKey(
              'host-form-body-section-${indexedSection.$2.sectionId}',
            ),
            title: indexedSection.$2.title,
            first: indexedSection.$1 == 0,
            footer: indexedSection.$2.description == null
                ? null
                : CatchText(
                    indexedSection.$2.description!,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
            children: [
              for (final question in indexedSection.$2.questions)
                HostFormQuestionField(
                  question: question,
                  answer: _answers[question.questionId],
                  onChanged: (answer) =>
                      setState(() => _answers[question.questionId] = answer),
                ),
            ],
          ),
        gapH24,
        CatchButton(
          label: widget.preview
              ? context.l10n.hostFormPreviewSubmitDisabled
              : context.l10n.hostFormSubmit,
          onPressed: widget.preview ? null : widget.onSubmit,
          fullWidth: true,
          size: CatchButtonSize.lg,
        ),
        gapH12,
        CatchText(
          widget.preview
              ? context.l10n.hostFormPreviewNoResponses
              : widget.definition.completionTitle,
          textAlign: TextAlign.center,
          variant: CatchTextVariant.bodyS,
          color: CatchTokens.of(context).ink2,
        ),
      ],
    );
  }
}

class HostFormQuestionField extends StatelessWidget {
  const HostFormQuestionField({
    super.key,
    required this.question,
    required this.answer,
    required this.onChanged,
  });

  final HostFormQuestion question;
  final Object? answer;
  final ValueChanged<Object?> onChanged;

  @override
  Widget build(BuildContext context) {
    final optional = !question.required;
    late final Widget field;
    switch (question.kind) {
      case HostFormQuestionKind.shortText:
      case HostFormQuestionKind.longText:
      case HostFormQuestionKind.date:
      case HostFormQuestionKind.phone:
      case HostFormQuestionKind.email:
      case HostFormQuestionKind.url:
      case HostFormQuestionKind.number:
        field = CatchFieldLanes.single(
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('host-form-body-question-${question.questionId}'),
            title: question.label,
            initialValue: switch (answer) {
              final String value => value,
              _ => null,
            },
            contractExemption:
                'Organizer-authored fields are validated by the versioned form contract.',
            helperText: question.helpText,
            labelMode: optional
                ? CatchFieldLabelTextMode.optional
                : CatchFieldLabelTextMode.visible,
            maxLines: question.kind == HostFormQuestionKind.longText ? 5 : 1,
            keyboardType: _keyboardType(question.kind),
            onChanged: (value) => onChanged(
              question.kind == HostFormQuestionKind.number
                  ? num.tryParse(value)
                  : value,
            ),
          ),
        );
        break;
      case HostFormQuestionKind.singleChoice:
      case HostFormQuestionKind.multiChoice:
        final values = question.options.map((option) => option.value).toList();
        final selected = switch (answer) {
          final Set<String> values => values,
          final List<String> values => values.toSet(),
          final String value => {value},
          _ => <String>{},
        };
        field = CatchFieldLanes.single(
          child: CatchField<String>.choices(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('host-form-body-question-${question.questionId}'),
            title: question.label,
            contract: CatchContractConstraints
                .organizerFormVersionDocumentDefinitionSectionsItemsQuestionsItemsOptions,
            contractValueBuilder: (value) => value,
            body: question.helpText,
            values: values,
            itemLabelBuilder: (value) => question.options
                .firstWhere((option) => option.value == value)
                .label,
            selected: selected,
            mode: question.kind == HostFormQuestionKind.multiChoice
                ? CatchChipMode.multiple
                : CatchChipMode.single,
            allowEmptySelection: optional,
            labelMode: optional
                ? CatchFieldLabelTextMode.optional
                : CatchFieldLabelTextMode.visible,
            onSelectionChanged: (values) => onChanged(
              question.kind == HostFormQuestionKind.multiChoice
                  ? values.toList(growable: false)
                  : values.firstOrNull,
            ),
          ),
        );
        break;
      case HostFormQuestionKind.boolean:
      case HostFormQuestionKind.acknowledgement:
        field = CatchFieldLanes.single(
          child: CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('host-form-body-question-${question.questionId}'),
            title: question.label,
            body: question.helpText,
            contractExemption:
                'Organizer-authored boolean fields are validated by the form contract.',
            value: answer == true,
            onChanged: onChanged,
          ),
        );
        break;
      case HostFormQuestionKind.file:
        field = CatchFieldLanes.single(
          child: CatchField.action(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('host-form-body-question-${question.questionId}'),
            title: question.label,
            body: question.helpText,
            icon: CatchIcons.cloudUploadOutlined,
            placeholder: context.l10n.hostFormPreviewUploadPlaceholder,
            onTap: null,
          ),
        );
        break;
      case HostFormQuestionKind.signature:
        field = CatchFieldLanes.single(
          child: CatchField.action(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('host-form-body-question-${question.questionId}'),
            title: question.label,
            body: question.helpText,
            icon: CatchIcons.editNoteOutlined,
            placeholder: context.l10n.hostFormPreviewSignaturePlaceholder,
            onTap: null,
          ),
        );
        break;
    }
    return field;
  }
}

TextInputType _keyboardType(HostFormQuestionKind kind) => switch (kind) {
  HostFormQuestionKind.phone => TextInputType.phone,
  HostFormQuestionKind.email => TextInputType.emailAddress,
  HostFormQuestionKind.url => TextInputType.url,
  HostFormQuestionKind.number => const TextInputType.numberWithOptions(
    decimal: true,
    signed: true,
  ),
  HostFormQuestionKind.date => TextInputType.datetime,
  _ => TextInputType.text,
};
