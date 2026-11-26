import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The form as people see it: its title, description and activity tag,
/// then each section the answers so far reach, with every question as the
/// field people fill in. Answers stay on this page, so the logic rules
/// can be tried; the send button is off and nothing is recorded.
class HostFormPreviewBody extends StatefulWidget {
  const HostFormPreviewBody({super.key, required this.definition});

  final HostFormDefinition definition;

  @override
  State<HostFormPreviewBody> createState() => _HostFormPreviewBodyState();
}

class _HostFormPreviewBodyState extends State<HostFormPreviewBody> {
  final Map<String, Object?> _answers = {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final definition = widget.definition;
    final sections = definition.reachableSections(_answers);
    final activity = definition.activityKind;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchText(
            l10n.hostFormPreviewSubtitle,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(definition.title, variant: CatchTextVariant.pageTitle),
              if (definition.description case final description?)
                CatchText(description, tone: CatchTextTone.secondary),
              if (definition.appearancePreset ==
                      HostFormAppearancePreset.activity &&
                  activity != null)
                CatchStack(
                  direction: CatchStackDirection.row,
                  children: [CatchChip.tag(label: activity)],
                ),
            ],
          ),
          for (final section in sections)
            CatchSection(
              key: ValueKey('host-form-preview-section-${section.sectionId}'),
              title: section.title,
              dividers: CatchSectionPlacement.none,
              children: [
                if (section.description case final description?)
                  CatchText(
                    description,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                for (final question in section.questions)
                  HostFormPreviewQuestion(
                    question: question,
                    answer: _answers[question.questionId],
                    onChanged: (answer) =>
                        setState(() => _answers[question.questionId] = answer),
                  ),
              ],
            ),
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchButton(
                label: l10n.hostFormPreviewSubmitDisabled,
                fullWidth: true,
                onPressed: null,
              ),
              CatchText(
                l10n.hostFormPreviewNoResponses,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
                align: TextAlign.center,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One question drawn as the field people fill in: text, number, date,
/// phone, email and link as inputs; choices as chips; yes-or-no and
/// acknowledgements as switches; files and signatures as their upload and
/// sign rows, which do nothing in a preview.
class HostFormPreviewQuestion extends StatelessWidget {
  const HostFormPreviewQuestion({
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
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final optional = !question.required;
    final key = ValueKey('host-form-preview-question-${question.questionId}');
    switch (question.kind) {
      case HostFormQuestionKind.shortText:
      case HostFormQuestionKind.longText:
      case HostFormQuestionKind.date:
      case HostFormQuestionKind.phone:
      case HostFormQuestionKind.email:
      case HostFormQuestionKind.url:
      case HostFormQuestionKind.number:
        return CatchFieldLanes.single(
          child: CatchField.input(
            key: key,
            copy: copy,
            title: question.label,
            initialValue: switch (answer) {
              final String value => value,
              _ => null,
            },
            contractExemption:
                'Organizer-authored fields are validated by the versioned form '
                'contract.',
            helperText: question.helpText,
            labelMode: optional
                ? CatchFieldLabelTextMode.optional
                : CatchFieldLabelTextMode.visible,
            maxLines: question.kind == HostFormQuestionKind.longText ? 5 : 1,
            keyboardType: _keyboard(question.kind),
            onChanged: (value) => onChanged(
              question.kind == HostFormQuestionKind.number
                  ? num.tryParse(value)
                  : value,
            ),
          ),
        );
      case HostFormQuestionKind.singleChoice:
      case HostFormQuestionKind.multiChoice:
        final multiple = question.kind == HostFormQuestionKind.multiChoice;
        final selected = switch (answer) {
          final List<String> values => values.toSet(),
          final String value => {value},
          _ => <String>{},
        };
        return CatchFieldLanes.single(
          child: CatchField<String>.choices(
            key: key,
            copy: copy,
            title: question.label,
            contract: CatchContractConstraints
                .organizerFormVersionDocumentDefinitionSectionsItemsQuestionsItemsOptions,
            contractValueBuilder: (value) => value,
            body: question.helpText,
            values: [for (final option in question.options) option.value],
            itemLabelBuilder: (value) => question.options
                .firstWhere((option) => option.value == value)
                .label,
            selected: selected,
            mode: multiple ? CatchChipMode.multiple : CatchChipMode.single,
            allowEmptySelection: optional,
            labelMode: optional
                ? CatchFieldLabelTextMode.optional
                : CatchFieldLabelTextMode.visible,
            onSelectionChanged: (values) => onChanged(
              multiple ? values.toList(growable: false) : values.firstOrNull,
            ),
          ),
        );
      case HostFormQuestionKind.boolean:
      case HostFormQuestionKind.acknowledgement:
        return CatchFieldLanes.single(
          child: CatchField.toggle(
            key: key,
            copy: copy,
            title: question.label,
            body: question.helpText,
            contractExemption:
                'Organizer-authored boolean fields are validated by the form '
                'contract.',
            value: answer == true,
            onChanged: onChanged,
          ),
        );
      case HostFormQuestionKind.file:
        return CatchFieldLanes.single(
          child: CatchField.action(
            key: key,
            copy: copy,
            title: question.label,
            body: question.helpText,
            icon: CatchIcons.upload,
            placeholder: l10n.hostFormPreviewUploadPlaceholder,
            onTap: null,
          ),
        );
      case HostFormQuestionKind.signature:
        return CatchFieldLanes.single(
          child: CatchField.action(
            key: key,
            copy: copy,
            title: question.label,
            body: question.helpText,
            icon: CatchIcons.note,
            placeholder: l10n.hostFormPreviewSignaturePlaceholder,
            onTap: null,
          ),
        );
    }
  }

  static TextInputType _keyboard(HostFormQuestionKind kind) => switch (kind) {
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
}
