import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const _customQuestionSetId = '__custom__';

class EventSuccessQuestionnaireConfigEditor extends StatefulWidget {
  const EventSuccessQuestionnaireConfigEditor({
    super.key,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final EventSuccessQuestionnaireConfig value;
  final ValueChanged<EventSuccessQuestionnaireConfig> onChanged;
  final bool enabled;

  @override
  State<EventSuccessQuestionnaireConfigEditor> createState() =>
      _EventSuccessQuestionnaireConfigEditorState();
}

class _EventSuccessQuestionnaireConfigEditorState
    extends State<EventSuccessQuestionnaireConfigEditor> {
  bool _questionSetOpen = false;
  String? _draftQuestionSetId;

  @override
  void didUpdateWidget(EventSuccessQuestionnaireConfigEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_questionSetOpen && oldWidget.value != widget.value) {
      _draftQuestionSetId = _selectedQuestionSetId(widget.value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final templates = EventSuccessQuestionnairePackLibrary.allTemplates;
    final questionSetIds = [
      ...templates.map((template) => template.id),
      _customQuestionSetId,
    ];
    final persistedId = _selectedQuestionSetId(widget.value);
    final previewId = _questionSetOpen
        ? (_draftQuestionSetId ?? persistedId)
        : persistedId;
    final previewConfig = _configForQuestionSetId(previewId);
    final previewPack = previewConfig.usesCustom && widget.value.usesCustom
        ? widget.value.pack
        : previewConfig.pack;

    return CatchFieldLanes.custom(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchField<String>.optionCards(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessQuestionnaireConfigEditorTextQuestionSet,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentQuestionnaireConfigTemplateId,
            contractValueBuilder: (value) => value,
            helperText: context.l10n
                .eventSuccessEventSuccessQuestionnaireConfigEditorLabelLengthQuestions(
                  length: previewPack.questions.length,
                ),
            values: questionSetIds,
            itemTitleBuilder: (id) => id == _customQuestionSetId
                ? context
                      .l10n
                      .eventSuccessEventSuccessQuestionnaireConfigEditorLabelCustom
                : templates.firstWhere((template) => template.id == id).title,
            itemDescriptionBuilder: (id) => id == _customQuestionSetId
                ? EventSuccessQuestionnairePackLibrary.resolve(
                    const EventSuccessQuestionnaireConfig.customTemplate(),
                  ).subtitle
                : templates
                      .firstWhere((template) => template.id == id)
                      .subtitle,
            selected: previewId,
            disclosureMode: _questionSetOpen
                ? CatchFieldMode.controlledExpanded
                : CatchFieldMode.controlledCollapsed,
            onOpenChanged: _setQuestionSetOpen,
            onCancel: _cancelQuestionSet,
            onSubmit: _submitQuestionSet,
            states: <WidgetState>{if (!widget.enabled) WidgetState.disabled},
            onChanged: widget.enabled
                ? (id) => setState(() => _draftQuestionSetId = id)
                : null,
          ),
          if (previewConfig.usesCustom &&
              widget.value.usesCustom &&
              !_questionSetOpen)
            CustomQuestionnaireSection(
              value: widget.value,
              enabled: widget.enabled,
              onChanged: widget.onChanged,
            ),
          if (!previewConfig.usesCustom || _questionSetOpen)
            for (final question in previewPack.questions)
              CatchField.content(
                copy: catchFieldCopy(context.l10n),
                key: ValueKey('questionnaire-pack-preview-${question.id}'),
                title: question.prompt,
                body: question.options
                    .map((option) => option.label)
                    .join(' · '),
                titleMaxLines: 3,
                bodyMaxLines: 4,
                icon: CatchIcons.help,
              ),
        ],
      ),
    );
  }

  void _setQuestionSetOpen(bool open) {
    setState(() {
      _questionSetOpen = open && widget.enabled;
      _draftQuestionSetId = _selectedQuestionSetId(widget.value);
    });
  }

  void _cancelQuestionSet() {
    setState(() {
      _draftQuestionSetId = _selectedQuestionSetId(widget.value);
      _questionSetOpen = false;
    });
  }

  void _submitQuestionSet() {
    final selectedId =
        _draftQuestionSetId ?? _selectedQuestionSetId(widget.value);
    final next = selectedId == _customQuestionSetId && widget.value.usesCustom
        ? widget.value
        : _configForQuestionSetId(selectedId);
    widget.onChanged(next);
    setState(() => _questionSetOpen = false);
  }
}

String _selectedQuestionSetId(EventSuccessQuestionnaireConfig value) =>
    value.usesCustom ? _customQuestionSetId : value.templateId;

EventSuccessQuestionnaireConfig _configForQuestionSetId(String id) =>
    id == _customQuestionSetId
    ? const EventSuccessQuestionnaireConfig.customTemplate()
    : EventSuccessQuestionnaireConfig(templateId: id);

class CustomQuestionnaireSection extends StatefulWidget {
  const CustomQuestionnaireSection({
    super.key,
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  final EventSuccessQuestionnaireConfig value;
  final bool enabled;
  final ValueChanged<EventSuccessQuestionnaireConfig> onChanged;

  @override
  State<CustomQuestionnaireSection> createState() =>
      _CustomQuestionnaireSectionState();
}

class _CustomQuestionnaireSectionState
    extends State<CustomQuestionnaireSection> {
  static const _titleKey = 'title';

  final CatchAccordionController _accordion = CatchAccordionController();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _sourceValues = {};

  @override
  void initState() {
    super.initState();
    _accordion.addListener(_handleAccordionChanged);
    _reconcileControllers();
  }

  @override
  void didUpdateWidget(CustomQuestionnaireSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    _reconcileControllers();
  }

  @override
  void dispose() {
    _accordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final questions = widget.value.customQuestions;
    return CatchFieldLanes.custom(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CustomQuestionnaireField(
            state: _fieldState(
              _titleKey,
              (title) =>
                  widget.onChanged(widget.value.copyWith(customTitle: title)),
            ),
            title: context
                .l10n
                .eventSuccessEventSuccessQuestionnaireConfigEditorTitleCustomQuestionSetName,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentQuestionnaireConfigCustomTitle,
          ),
          for (
            var questionIndex = 0;
            questionIndex < questions.length;
            questionIndex++
          ) ...[
            CustomQuestionnaireField(
              state: _fieldState(
                _promptKey(questions[questionIndex]),
                (prompt) => _updateQuestion(
                  questionIndex,
                  questions[questionIndex].copyWith(prompt: prompt),
                ),
              ),
              title: context.l10n
                  .eventSuccessEventSuccessQuestionnaireConfigEditorTextQuestionValue1(
                    value1: questionIndex + 1,
                  ),
              contract: CatchContractConstraints
                  .eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsPrompt,
              maxLines: 3,
            ),
            for (
              var optionIndex = 0;
              optionIndex < questions[questionIndex].options.length;
              optionIndex++
            )
              CustomQuestionnaireField(
                state: _fieldState(
                  _optionKey(
                    questions[questionIndex],
                    questions[questionIndex].options[optionIndex],
                  ),
                  (label) {
                    final question = questions[questionIndex];
                    final nextOptions = [...question.options];
                    nextOptions[optionIndex] = nextOptions[optionIndex]
                        .copyWith(label: label);
                    _updateQuestion(
                      questionIndex,
                      question.copyWith(options: nextOptions),
                    );
                  },
                ),
                title: context.l10n
                    .eventSuccessEventSuccessQuestionnaireConfigEditorTitleOptionValue1(
                      value1: optionIndex + 1,
                    ),
                contract: CatchContractConstraints
                    .eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsOptionsItemsLabel,
              ),
            if (questions.length > 1)
              CatchFieldLanes.single(
                child: CatchField.action(
                  copy: catchFieldCopy(context.l10n),
                  key: ValueKey(
                    'custom-question-remove-${questions[questionIndex].id}',
                  ),
                  title: context
                      .l10n
                      .eventSuccessEventSuccessQuestionnaireConfigEditorMessageRemoveQuestion,
                  icon: CatchIcons.delete,
                  tone: CatchFieldTone.danger,
                  onTap: widget.enabled
                      ? () {
                          _accordion.collapse();
                          final nextQuestions = [...questions]
                            ..removeAt(questionIndex);
                          widget.onChanged(
                            widget.value.copyWith(
                              customQuestions: nextQuestions,
                            ),
                          );
                        }
                      : null,
                ),
              ),
          ],
          CatchField.add(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessQuestionnaireConfigEditorLabelAddQuestion,
            icon: CatchIcons.add,
            onTap: widget.enabled && questions.length < 8
                ? () => widget.onChanged(
                    widget.value.copyWith(
                      customQuestions: [
                        ...questions,
                        _blankQuestion(questions, context.l10n),
                      ],
                    ),
                  )
                : null,
          ),
          CatchField.action(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessQuestionnaireConfigEditorLabelReset,
            icon: CatchIcons.refresh,
            onTap: widget.enabled
                ? () {
                    _accordion.collapse();
                    widget.onChanged(
                      const EventSuccessQuestionnaireConfig.customTemplate(),
                    );
                  }
                : null,
          ),
        ],
      ),
    );
  }

  CustomQuestionnaireFieldState _fieldState(
    String key,
    ValueChanged<String> onCommit,
  ) {
    final controller = _controllers[key]!;
    return (
      fieldKey: key,
      controller: controller,
      open: _accordion.isExpanded(key),
      enabled: widget.enabled,
      onOpenChanged: (open) => _setOpen(key, open),
      onCancel: () {
        controller.text = _sourceValues[key] ?? '';
        _accordion.collapse();
      },
      onSubmit: () {
        onCommit(controller.text);
        _accordion.collapse();
      },
    );
  }

  void _setOpen(String key, bool open) {
    if (open) {
      final previous = _accordion.expanded;
      if (previous != null && previous != key) {
        _controllers[previous]?.text = _sourceValues[previous] ?? '';
      }
      if (!_accordion.isExpanded(key)) _accordion.toggle(key);
      return;
    }
    if (_accordion.isExpanded(key)) _accordion.collapse();
  }

  void _updateQuestion(
    int questionIndex,
    EventSuccessCompatibilityQuestion question,
  ) {
    final nextQuestions = [...widget.value.customQuestions];
    nextQuestions[questionIndex] = question;
    widget.onChanged(widget.value.copyWith(customQuestions: nextQuestions));
  }

  void _reconcileControllers() {
    final nextSources = <String, String>{
      _titleKey:
          widget.value.customTitle ??
          EventSuccessQuestionnairePackLibrary.resolve(
            const EventSuccessQuestionnaireConfig.customTemplate(),
          ).title,
      for (final question in widget.value.customQuestions)
        _promptKey(question): question.prompt,
      for (final question in widget.value.customQuestions)
        for (final option in question.options)
          _optionKey(question, option): option.label,
    };
    final removed = _controllers.keys
        .where((key) => !nextSources.containsKey(key))
        .toList(growable: false);
    for (final key in removed) {
      _controllers.remove(key)?.dispose();
      _sourceValues.remove(key);
    }
    for (final entry in nextSources.entries) {
      final controller = _controllers.putIfAbsent(
        entry.key,
        () => TextEditingController(text: entry.value),
      );
      if (!_accordion.isExpanded(entry.key) && controller.text != entry.value) {
        controller.text = entry.value;
      }
      _sourceValues[entry.key] = entry.value;
    }
  }

  static String _promptKey(EventSuccessCompatibilityQuestion question) =>
      'question-${question.id}-prompt';

  static String _optionKey(
    EventSuccessCompatibilityQuestion question,
    EventSuccessCompatibilityOption option,
  ) => 'question-${question.id}-option-${option.id}';
}

EventSuccessCompatibilityQuestion _blankQuestion(
  List<EventSuccessCompatibilityQuestion> questions,
  AppLocalizations l10n,
) {
  final usedIds = questions.map((question) => question.id).toSet();
  var questionNumber = 1;
  while (usedIds.contains('custom_question_$questionNumber')) {
    questionNumber++;
  }
  return EventSuccessCompatibilityQuestion(
    id: 'custom_question_$questionNumber',
    prompt: l10n
        .eventSuccessEventSuccessQuestionnaireConfigEditorPromptCustomQuestionQuestionnumber(
          questionNumber: questionNumber,
        ),
    options: [
      EventSuccessCompatibilityOption(
        id: 'custom_question_${questionNumber}_option_1',
        label:
            l10n.eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption1,
      ),
      EventSuccessCompatibilityOption(
        id: 'custom_question_${questionNumber}_option_2',
        label:
            l10n.eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption2,
      ),
      EventSuccessCompatibilityOption(
        id: 'custom_question_${questionNumber}_option_3',
        label:
            l10n.eventSuccessEventSuccessQuestionnaireConfigEditorLabelOption3,
      ),
    ],
  );
}

/// Editing state for one [CustomQuestionnaireField], owned by
/// [CustomQuestionnaireSection].
typedef CustomQuestionnaireFieldState = ({
  String fieldKey,
  TextEditingController controller,
  bool open,
  bool enabled,
  ValueChanged<bool> onOpenChanged,
  VoidCallback onCancel,
  VoidCallback onSubmit,
});

/// One accordion text field of a custom questionnaire: the set name, a
/// question prompt or an answer option.
class CustomQuestionnaireField extends StatelessWidget {
  const CustomQuestionnaireField({
    super.key,
    required this.state,
    required this.title,
    required this.contract,
    this.maxLines = 1,
  });

  final CustomQuestionnaireFieldState state;
  final String title;
  final CatchContractFieldConstraints contract;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.inputActions(
        copy: catchFieldCopy(context.l10n),
        key: ValueKey('custom-questionnaire-${state.fieldKey}'),
        title: title,
        contract: contract,
        controller: state.controller,
        open: state.open,
        onOpenChanged: state.onOpenChanged,
        onCancel: state.onCancel,
        onSubmit: state.onSubmit,
        states: <WidgetState>{if (!state.enabled) WidgetState.disabled},
        maxLines: maxLines,
        textInputAction: maxLines == 1
            ? TextInputAction.done
            : TextInputAction.newline,
      ),
    );
  }
}
