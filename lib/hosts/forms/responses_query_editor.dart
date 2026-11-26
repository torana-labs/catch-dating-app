import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The most conditions one query holds, as the server allows.
const hostResponsesQueryMaxConditions = 20;

/// An operator's name, as the host reads it.
String hostResponsesOperatorText(
  AppLocalizations l10n,
  HostResponseOperator operator,
) => switch (operator) {
  HostResponseOperator.present => l10n.hostResponseQueryOperatorPresent,
  HostResponseOperator.missing => l10n.hostResponseQueryOperatorMissing,
  HostResponseOperator.choiceAny => l10n.hostResponseQueryOperatorChoiceAny,
  HostResponseOperator.choiceAll => l10n.hostResponseQueryOperatorChoiceAll,
  HostResponseOperator.choiceNone => l10n.hostResponseQueryOperatorChoiceNone,
  HostResponseOperator.textEquals => l10n.hostResponseQueryOperatorTextEquals,
  HostResponseOperator.textContains =>
    l10n.hostResponseQueryOperatorTextContains,
  HostResponseOperator.textStartsWith =>
    l10n.hostResponseQueryOperatorTextStartsWith,
  HostResponseOperator.numberEq => l10n.hostResponseQueryOperatorNumberEq,
  HostResponseOperator.numberGt => l10n.hostResponseQueryOperatorNumberGt,
  HostResponseOperator.numberGte => l10n.hostResponseQueryOperatorNumberGte,
  HostResponseOperator.numberLt => l10n.hostResponseQueryOperatorNumberLt,
  HostResponseOperator.numberLte => l10n.hostResponseQueryOperatorNumberLte,
  HostResponseOperator.numberBetween =>
    l10n.hostResponseQueryOperatorNumberBetween,
  HostResponseOperator.dateOn => l10n.hostResponseQueryOperatorDateOn,
  HostResponseOperator.dateBefore => l10n.hostResponseQueryOperatorDateBefore,
  HostResponseOperator.dateAfter => l10n.hostResponseQueryOperatorDateAfter,
  HostResponseOperator.dateBetween => l10n.hostResponseQueryOperatorDateBetween,
  HostResponseOperator.booleanIs => l10n.hostResponseQueryOperatorBooleanIs,
};

/// A new condition on [field]: Answered when the field allows it, else its
/// first operator.
HostResponseCondition hostResponsesDefaultCondition(
  HostResponseQueryField field,
) => HostResponseCondition(
  questionId: field.questionId,
  operator: field.operators.contains(HostResponseOperator.present)
      ? HostResponseOperator.present
      : field.operators.first,
);

/// Filter by answers: a group of conditions on one published version's
/// questions, matching all or any of them, with at most one nested group.
/// The draft stays here until Apply hands it over, validated against
/// [fields]; Apply with no conditions clears the filter, and Reset all
/// empties the draft.
class HostResponsesQueryEditor extends StatefulWidget {
  const HostResponsesQueryEditor({
    super.key,
    required this.fields,
    required this.initial,
    required this.onApply,
  });

  /// The questions this version lets the host filter by.
  final List<HostResponseQueryField> fields;
  final HostResponsePredicate? initial;
  final ValueChanged<HostResponsePredicate?> onApply;

  @override
  State<HostResponsesQueryEditor> createState() =>
      _HostResponsesQueryEditorState();
}

class _HostResponsesQueryEditorState extends State<HostResponsesQueryEditor> {
  late HostResponseGroup _root = _rootOf(widget.initial);

  static HostResponseGroup _rootOf(HostResponsePredicate? predicate) =>
      predicate is HostResponseGroup
      ? predicate
      : HostResponseGroup(
          match: HostResponseMatch.all,
          children: predicate == null ? const [] : [predicate],
        );

  /// Replaces (or with null removes) the node at [path].
  void _replace(List<int> path, HostResponsePredicate? node) {
    HostResponseGroup rewrite(HostResponseGroup group, int level) {
      final children = [...group.children];
      final index = path[level];
      if (level == path.length - 1) {
        if (node == null) {
          children.removeAt(index);
        } else {
          children[index] = node;
        }
      } else {
        children[index] = rewrite(
          children[index] as HostResponseGroup,
          level + 1,
        );
      }
      return HostResponseGroup(match: group.match, children: children);
    }

    setState(() => _root = rewrite(_root, 0));
  }

  void _setGroup(List<int> path, HostResponseGroup group) =>
      path.isEmpty ? setState(() => _root = group) : _replace(path, group);

  void _apply() {
    if (_root.children.isEmpty) {
      widget.onApply(null);
      return;
    }
    try {
      _root.validate({
        for (final field in widget.fields) field.questionId: field,
      });
      widget.onApply(_root);
    } on ArgumentError {
      showCatchNotice(context, context.l10n.hostResponseQueryInvalidCondition);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.standard(
      title: l10n.hostResponseQueryEditorTitle,
      footer: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        equal: true,
        children: [
          CatchButton(
            key: const ValueKey<String>('response-query-reset'),
            label: l10n.hostFiltersResetAll,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => setState(() => _root = _rootOf(null)),
          ),
          CatchButton(
            key: const ValueKey<String>('response-query-apply'),
            label: l10n.hostResponseQueryApply,
            fullWidth: true,
            onPressed: widget.fields.isEmpty ? null : _apply,
          ),
        ],
      ),
      child: widget.fields.isEmpty
          ? CatchText(
              l10n.hostResponseQueryInvalidCondition,
              tone: CatchTextTone.secondary,
            )
          : HostResponsesQueryGroupSection(
              group: _root,
              path: const [],
              fields: widget.fields,
              conditionCount: _root.conditionCount,
              onChanged: _setGroup,
              onReplace: _replace,
            ),
    );
  }
}

/// One group of conditions: Match all or Match any, its conditions and its
/// nested group, then Add a condition, Add a group (top level only) and,
/// for a nested group, Remove.
class HostResponsesQueryGroupSection extends StatelessWidget {
  const HostResponsesQueryGroupSection({
    super.key,
    required this.group,
    required this.path,
    required this.fields,
    required this.conditionCount,
    required this.onChanged,
    required this.onReplace,
  });

  final HostResponseGroup group;

  /// Where the group sits in the draft; empty for the top level.
  final List<int> path;
  final List<HostResponseQueryField> fields;

  /// Conditions across the whole draft, against the server's limit.
  final int conditionCount;
  final void Function(List<int> path, HostResponseGroup group) onChanged;
  final void Function(List<int> path, HostResponsePredicate? node) onReplace;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final canAdd = conditionCount < hostResponsesQueryMaxConditions;
    final key = path.join('-');
    return CatchSurface(
      child: CatchStack(
        children: [
          CatchPageTabBar<HostResponseMatch>.segmented(
            key: ValueKey<String>('response-group-$key'),
            selected: group.match,
            size: CatchPageTabBarSize.sm,
            label: l10n.hostResponseQueryEditorTitle,
            options: [
              CatchOption(
                value: HostResponseMatch.all,
                label: l10n.hostResponseQueryMatchAll,
              ),
              CatchOption(
                value: HostResponseMatch.any,
                label: l10n.hostResponseQueryMatchAny,
              ),
            ],
            onChanged: (match) => onChanged(
              path,
              HostResponseGroup(match: match, children: group.children),
            ),
          ),
          for (final (index, child) in group.children.indexed)
            if (child case final HostResponseCondition condition)
              HostResponsesQueryConditionCard(
                key: ValueKey<String>(
                  'response-condition-${[...path, index].join('-')}',
                ),
                path: [...path, index],
                condition: condition,
                fields: fields,
                onReplace: onReplace,
              )
            else if (child case final HostResponseGroup nested)
              HostResponsesQueryGroupSection(
                group: nested,
                path: [...path, index],
                fields: fields,
                conditionCount: conditionCount,
                onChanged: onChanged,
                onReplace: onReplace,
              ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            wrap: true,
            children: [
              CatchButton(
                key: ValueKey<String>('response-add-condition-$key'),
                label: l10n.hostResponseQueryAddCondition,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
                onPressed: !canAdd
                    ? null
                    : () => onChanged(
                        path,
                        HostResponseGroup(
                          match: group.match,
                          children: [
                            ...group.children,
                            hostResponsesDefaultCondition(fields.first),
                          ],
                        ),
                      ),
              ),
              if (path.isEmpty)
                CatchButton(
                  key: const ValueKey<String>('response-add-group'),
                  label: l10n.hostResponseQueryAddGroup,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  onPressed: !canAdd
                      ? null
                      : () => onChanged(
                          path,
                          HostResponseGroup(
                            match: group.match,
                            children: [
                              ...group.children,
                              HostResponseGroup(
                                match: HostResponseMatch.any,
                                children: [
                                  hostResponsesDefaultCondition(fields.first),
                                ],
                              ),
                            ],
                          ),
                        ),
                ),
              if (path.isNotEmpty)
                CatchButton(
                  key: ValueKey<String>('response-remove-group-$key'),
                  label: l10n.hostResponseQueryRemove,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  onPressed: () => onReplace(path, null),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One condition: the question, how it compares and the answer it compares
/// with. Choice operators pick from the question's choices, Yes or no picks
/// one, Between takes a minimum and a maximum, Answered and Not answered
/// take nothing, and every other operator takes one typed value (a number,
/// a YYYY-MM-DD date or text), saved when the field loses focus.
class HostResponsesQueryConditionCard extends StatelessWidget {
  const HostResponsesQueryConditionCard({
    super.key,
    required this.path,
    required this.condition,
    required this.fields,
    required this.onReplace,
  });

  final List<int> path;
  final HostResponseCondition condition;
  final List<HostResponseQueryField> fields;
  final void Function(List<int> path, HostResponsePredicate? node) onReplace;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final key = path.join('-');
    final field = fields.firstWhere(
      (item) => item.questionId == condition.questionId,
      orElse: () => fields.first,
    );
    final operator = field.operators.contains(condition.operator)
        ? condition.operator
        : field.operators.first;
    final number = operator.name.startsWith('number');
    final date = operator.name.startsWith('date');
    final choices =
        operator == HostResponseOperator.choiceAny ||
        operator == HostResponseOperator.choiceAll ||
        operator == HostResponseOperator.choiceNone;
    final range =
        operator == HostResponseOperator.numberBetween ||
        operator == HostResponseOperator.dateBetween;
    final typed =
        !choices &&
        operator != HostResponseOperator.booleanIs &&
        operator != HostResponseOperator.present &&
        operator != HostResponseOperator.missing;
    // A typed value as the server reads it: a number or trimmed text.
    Object? parse(String raw) => number ? num.tryParse(raw.trim()) : raw.trim();
    HostResponseCondition withValues({
      Object? value,
      List<String>? values,
      Object? minimum,
      Object? maximum,
    }) => HostResponseCondition(
      questionId: field.questionId,
      operator: operator,
      value: value,
      values: values ?? const [],
      minimum: minimum,
      maximum: maximum,
    );
    return CatchSection(
      dividers: CatchSectionPlacement.none,
      children: [
        CatchField<String>.select(
          key: ValueKey<String>('response-field-$key'),
          copy: copy,
          title: l10n.hostResponseQueryField,
          contractExemption:
              'The question comes from the version catalog the server sent.',
          values: [for (final item in fields) item.questionId],
          value: field.questionId,
          itemLabelBuilder: (id) =>
              fields.firstWhere((item) => item.questionId == id).label,
          onChanged: (id) {
            if (id == null || id == field.questionId) return;
            onReplace(
              path,
              hostResponsesDefaultCondition(
                fields.firstWhere((item) => item.questionId == id),
              ),
            );
          },
        ),
        CatchField<HostResponseOperator>.select(
          key: ValueKey<String>('response-operator-$key'),
          copy: copy,
          title: l10n.hostFormRuleOperator,
          contractExemption:
              'The operators come from the version catalog the server sent.',
          values: field.operators.toList(growable: false),
          value: operator,
          itemLabelBuilder: (value) => hostResponsesOperatorText(l10n, value),
          onChanged: (value) {
            if (value == null || value == operator) return;
            onReplace(
              path,
              HostResponseCondition(
                questionId: field.questionId,
                operator: value,
                value: value == HostResponseOperator.booleanIs ? true : null,
              ),
            );
          },
        ),
        if (choices)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            wrap: true,
            children: [
              for (final MapEntry(key: value, value: label)
                  in field.options.entries)
                CatchChip.choice(
                  key: ValueKey<String>('response-value-$key-$value'),
                  label: label,
                  selected: condition.values.contains(value),
                  mode: CatchChipMode.multiple,
                  size: CatchChipSize.sm,
                  onPressed: () {
                    final chosen = {...condition.values};
                    if (!chosen.remove(value)) chosen.add(value);
                    onReplace(
                      path,
                      withValues(values: chosen.toList()..sort()),
                    );
                  },
                ),
            ],
          ),
        if (operator == HostResponseOperator.booleanIs)
          CatchPageTabBar<bool>.segmented(
            key: ValueKey<String>('response-boolean-$key'),
            selected: condition.value != false,
            size: CatchPageTabBarSize.sm,
            label: l10n.hostResponseQueryValue,
            options: [
              CatchOption(value: true, label: l10n.hostFormRuleTrue),
              CatchOption(value: false, label: l10n.hostFormRuleFalse),
            ],
            onChanged: (value) => onReplace(path, withValues(value: value)),
          ),
        if (typed)
          for (final bound in range ? const [true, false] : const [null])
            CatchField.input(
              key: ValueKey<String>(
                'response-value-$key-$bound-${switch (bound) {
                  null => condition.value,
                  true => condition.minimum,
                  false => condition.maximum,
                }}',
              ),
              copy: copy,
              title: switch (bound) {
                null => l10n.hostResponseQueryValue,
                true => l10n.hostResponseQueryMinimum,
                false => l10n.hostResponseQueryMaximum,
              },
              initialValue: switch (bound) {
                null => condition.value,
                true => condition.minimum,
                false => condition.maximum,
              }?.toString(),
              keyboardType: number
                  ? const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    )
                  : date
                  ? TextInputType.datetime
                  : TextInputType.text,
              maxLength: number
                  ? 24
                  : date
                  ? 10
                  : 200,
              contractExemption:
                  'The manager query validates typed response values.',
              onBlur: (raw) => onReplace(
                path,
                withValues(
                  value: bound == null ? parse(raw) : null,
                  minimum: bound == true ? parse(raw) : condition.minimum,
                  maximum: bound == false ? parse(raw) : condition.maximum,
                ),
              ),
            ),
        CatchButton(
          key: ValueKey<String>('response-remove-condition-$key'),
          label: l10n.hostResponseQueryRemove,
          variant: CatchButtonVariant.quiet,
          size: CatchButtonSize.sm,
          onPressed: () => onReplace(path, null),
        ),
      ],
    );
  }
}
