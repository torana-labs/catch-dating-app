import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Opens Add a rule: when one answer matches, show or hide a question or
/// a section, or skip ahead to a later section. Save adds the rule to the
/// draft through [editor]; nothing is added when the form has no
/// questions.
Future<void> showHostFormLogicRuleSheet(
  BuildContext context, {
  required HostFormDefinition definition,
  required HostFormEditorController editor,
}) async {
  final questions = [
    for (final section in definition.sections) ...section.questions,
  ];
  if (questions.isEmpty) return;
  await showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => HostFormLogicRuleSheet(
      definition: definition,
      onSave: (rule) {
        editor.addLogicRule(
          questionId: rule.questionId,
          operator: rule.operator,
          expectedValues: rule.expectedValues,
          action: rule.action,
          targetQuestionId: rule.targetQuestionId,
          targetSectionId: rule.targetSectionId,
        );
        Navigator.of(sheetContext).pop();
      },
    ),
  );
}

/// A logic rule the host has finished drafting.
typedef HostFormLogicRuleDraft = ({
  String questionId,
  HostFormLogicOperator operator,
  List<Object?> expectedValues,
  HostFormLogicAction action,
  String? targetQuestionId,
  String? targetSectionId,
});

/// The rule builder: the question it watches, how it compares, the answer
/// it compares with, what it does and what it does it to.
class HostFormLogicRuleSheet extends StatefulWidget {
  const HostFormLogicRuleSheet({
    super.key,
    required this.definition,
    required this.onSave,
  });

  final HostFormDefinition definition;
  final ValueChanged<HostFormLogicRuleDraft> onSave;

  @override
  State<HostFormLogicRuleSheet> createState() => _HostFormLogicRuleSheetState();
}

class _HostFormLogicRuleSheetState extends State<HostFormLogicRuleSheet> {
  late final List<HostFormQuestion> _questions = [
    for (final section in widget.definition.sections) ...section.questions,
  ];
  late String _sourceId = _questions.first.questionId;
  HostFormLogicOperator _operator = HostFormLogicOperator.equals;
  HostFormLogicAction _action = HostFormLogicAction.showQuestion;
  String _expectedText = '';
  String? _expectedChoice;
  late String? _targetQuestionId = _questions.length > 1
      ? _questions[1].questionId
      : null;
  late String? _targetSectionId =
      widget.definition.sections.firstOrNull?.sectionId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final sections = widget.definition.sections;
    final source = _questions.firstWhere(
      (question) => question.questionId == _sourceId,
    );
    final operators = hostFormLogicOperatorsFor(source.kind);
    final operator = operators.contains(_operator)
        ? _operator
        : operators.first;
    final needsValue =
        operator != HostFormLogicOperator.answered &&
        operator != HostFormLogicOperator.notAnswered;
    final choiceValues = switch (source.kind) {
      HostFormQuestionKind.singleChoice || HostFormQuestionKind.multiChoice => [
        for (final option in source.options) option.value,
      ],
      HostFormQuestionKind.boolean => const ['true', 'false'],
      _ => const <String>[],
    };
    final expectedChoice = choiceValues.contains(_expectedChoice)
        ? _expectedChoice
        : choiceValues.firstOrNull;
    final targetQuestions = [
      for (final question in _questions)
        if (question.questionId != _sourceId) question,
    ];
    final targetQuestionId =
        targetQuestions.any((q) => q.questionId == _targetQuestionId)
        ? _targetQuestionId
        : targetQuestions.firstOrNull?.questionId;
    final sourceSectionIndex = sections.indexWhere(
      (section) => section.questions.any((q) => q.questionId == _sourceId),
    );
    final targetSections = <HostFormSection>[
      for (final (index, section) in sections.indexed)
        if (_action != HostFormLogicAction.routeToSection ||
            index > sourceSectionIndex)
          section,
    ];
    final targetSectionId =
        targetSections.any((s) => s.sectionId == _targetSectionId)
        ? _targetSectionId
        : targetSections.firstOrNull?.sectionId;
    final questionAction =
        _action == HostFormLogicAction.showQuestion ||
        _action == HostFormLogicAction.hideQuestion;
    final sectionAction =
        _action == HostFormLogicAction.showSection ||
        _action == HostFormLogicAction.hideSection ||
        _action == HostFormLogicAction.routeToSection;
    final expectedValues = !needsValue
        ? const <Object?>[]
        : source.kind == HostFormQuestionKind.boolean
        ? <Object?>[expectedChoice == 'true']
        : source.kind == HostFormQuestionKind.number
        ? <Object?>[num.tryParse(_expectedText)]
        : choiceValues.isNotEmpty
        ? <Object?>[expectedChoice]
        : <Object?>[_expectedText.trim()];
    final canSave =
        (!needsValue ||
            expectedValues.every(
              (value) => value != null && value.toString().isNotEmpty,
            )) &&
        (!questionAction || targetQuestionId != null) &&
        (!sectionAction || targetSectionId != null);
    return CatchSheet.standard(
      title: l10n.hostFormAddRule,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        key: const ValueKey<String>('host-form-logic-save'),
        label: l10n.hostFormRuleSave,
        onPressed: !canSave
            ? null
            : () => widget.onSave((
                questionId: _sourceId,
                operator: operator,
                expectedValues: expectedValues,
                action: _action,
                targetQuestionId: questionAction ? targetQuestionId : null,
                targetSectionId: sectionAction ? targetSectionId : null,
              )),
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField<String>.select(
            key: ValueKey('logic-source-$_sourceId'),
            copy: copy,
            title: l10n.hostFormRuleQuestion,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsQuestionId,
            contractValueBuilder: (value) => value,
            values: [for (final question in _questions) question.questionId],
            value: _sourceId,
            itemLabelBuilder: (value) =>
                _questions.firstWhere((q) => q.questionId == value).label,
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _sourceId = value;
                _expectedText = '';
                _expectedChoice = null;
              });
            },
          ),
          CatchField<HostFormLogicOperator>.select(
            key: ValueKey('logic-operator-$operator-$_sourceId'),
            copy: copy,
            title: l10n.hostFormRuleOperator,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsOperator,
            contractValueBuilder: (value) => value.name,
            values: operators,
            value: operator,
            itemLabelBuilder: (value) =>
                hostFormLogicOperatorLabel(context, value),
            onChanged: (value) {
              if (value != null) setState(() => _operator = value);
            },
          ),
          if (needsValue && choiceValues.isNotEmpty)
            CatchField<String>.select(
              key: ValueKey('logic-value-$_sourceId-$expectedChoice'),
              copy: copy,
              title: l10n.hostFormRuleValue,
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsExpectedValuesItems,
              contractValueBuilder: (value) => value,
              values: choiceValues,
              value: expectedChoice!,
              itemLabelBuilder: (value) =>
                  source.kind == HostFormQuestionKind.boolean
                  ? value == 'true'
                        ? l10n.hostFormRuleTrue
                        : l10n.hostFormRuleFalse
                  : source.options
                        .firstWhere((option) => option.value == value)
                        .label,
              onChanged: (value) => setState(() => _expectedChoice = value),
            )
          else if (needsValue)
            CatchField.input(
              key: ValueKey('logic-value-$_sourceId'),
              copy: copy,
              title: l10n.hostFormRuleValue,
              initialValue: _expectedText,
              keyboardType: source.kind == HostFormQuestionKind.number
                  ? const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    )
                  : TextInputType.text,
              contractExemption:
                  'The form contract validates comparison values.',
              onChanged: (value) => setState(() => _expectedText = value),
            ),
          CatchField<HostFormLogicAction>.select(
            key: ValueKey('logic-action-$_action'),
            copy: copy,
            title: l10n.hostFormRuleAction,
            contract: CatchContractConstraints
                .organizerFormDraftDocumentDefinitionLogicRulesItemsAction,
            contractValueBuilder: (value) => value.name,
            values: HostFormLogicAction.values,
            value: _action,
            itemLabelBuilder: (value) =>
                hostFormLogicActionLabel(context, value),
            onChanged: (value) {
              if (value != null) setState(() => _action = value);
            },
          ),
          if (questionAction && targetQuestionId != null)
            CatchField<String>.select(
              copy: copy,
              title: l10n.hostFormRuleTargetQuestion,
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionLogicRulesItemsTargetQuestionId,
              contractValueBuilder: (value) => value,
              values: [
                for (final question in targetQuestions) question.questionId,
              ],
              value: targetQuestionId,
              itemLabelBuilder: (value) => targetQuestions
                  .firstWhere((q) => q.questionId == value)
                  .label,
              onChanged: (value) => setState(() => _targetQuestionId = value),
            ),
          if (sectionAction && targetSectionId != null)
            CatchField<String>.select(
              copy: copy,
              title: l10n.hostFormRuleTargetSection,
              contract: CatchContractConstraints
                  .organizerFormDraftDocumentDefinitionLogicRulesItemsTargetSectionId,
              contractValueBuilder: (value) => value,
              values: [for (final section in targetSections) section.sectionId],
              value: targetSectionId,
              itemLabelBuilder: (value) =>
                  targetSections.firstWhere((s) => s.sectionId == value).title,
              onChanged: (value) => setState(() => _targetSectionId = value),
            ),
        ],
      ),
    );
  }
}

/// The comparisons a question of [kind] supports, in menu order.
List<HostFormLogicOperator> hostFormLogicOperatorsFor(
  HostFormQuestionKind kind,
) => switch (kind) {
  HostFormQuestionKind.number => const [
    HostFormLogicOperator.equals,
    HostFormLogicOperator.notEquals,
    HostFormLogicOperator.greaterThan,
    HostFormLogicOperator.lessThan,
    HostFormLogicOperator.answered,
    HostFormLogicOperator.notAnswered,
  ],
  HostFormQuestionKind.multiChoice => const [
    HostFormLogicOperator.contains,
    HostFormLogicOperator.notContains,
    HostFormLogicOperator.answered,
    HostFormLogicOperator.notAnswered,
  ],
  HostFormQuestionKind.singleChoice || HostFormQuestionKind.boolean => const [
    HostFormLogicOperator.equals,
    HostFormLogicOperator.notEquals,
    HostFormLogicOperator.answered,
    HostFormLogicOperator.notAnswered,
  ],
  _ => const [
    HostFormLogicOperator.equals,
    HostFormLogicOperator.notEquals,
    HostFormLogicOperator.contains,
    HostFormLogicOperator.notContains,
    HostFormLogicOperator.answered,
    HostFormLogicOperator.notAnswered,
  ],
};
