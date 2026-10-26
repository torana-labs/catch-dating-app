part of 'host_response_query_editor_section.dart';

/// Recursive group rendering is a widget tree. The editor state alone owns
/// draft mutation, so replacing any branch creates one new immutable root.
class HostResponseGroupSection extends StatelessWidget {
  const HostResponseGroupSection({
    super.key,
    required this.root,
    required this.group,
    required this.path,
    required this.fields,
    required this.copy,
    required this.defaultCondition,
    required this.onAppend,
    required this.onReplace,
    required this.onSetMatch,
  });

  final HostResponseGroup root;
  final HostResponseGroup group;
  final List<int> path;
  final List<HostResponseQueryField> fields;
  final HostResponseQueryEditorCopy copy;
  final HostResponseCondition Function() defaultCondition;
  final void Function(List<int>, HostResponsePredicate) onAppend;
  final void Function(List<int>, HostResponsePredicate?) onReplace;
  final void Function(List<int>, HostResponseMatch) onSetMatch;

  @override
  Widget build(BuildContext context) {
    final canAdd = root.conditionCount < 20;
    final canNest = path.isEmpty && canAdd;
    return Padding(
      padding: path.isEmpty
          ? EdgeInsets.zero
          : CatchInsets.detailInlineRowBottomGap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchChoiceInput<HostResponseMatch>.segmented(
            key: ValueKey('response-group-${path.join('-')}'),
            options: [
              CatchOption(value: HostResponseMatch.all, label: copy.matchAll),
              CatchOption(value: HostResponseMatch.any, label: copy.matchAny),
            ],
            selected: group.match,
            contractExemption: 'Match mode is a local filter draft choice.',
            onChanged: (value) => onSetMatch(path, value),
          ),
          gapH12,
          for (var index = 0; index < group.children.length; index++) ...[
            if (group.children[index]
                case final HostResponseCondition condition)
              HostResponseConditionSection(
                path: [...path, index],
                condition: condition,
                fields: fields,
                copy: copy,
                onReplace: onReplace,
              )
            else if (group.children[index] case final HostResponseGroup nested)
              HostResponseGroupSection(
                root: root,
                group: nested,
                path: [...path, index],
                fields: fields,
                copy: copy,
                defaultCondition: defaultCondition,
                onAppend: onAppend,
                onReplace: onReplace,
                onSetMatch: onSetMatch,
              ),
            gapH12,
          ],
          Wrap(
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchButton(
                label: copy.addCondition,
                variant: CatchButtonVariant.secondary,
                onPressed: canAdd
                    ? () => onAppend(path, defaultCondition())
                    : null,
              ),
              if (canNest)
                CatchButton(
                  label: copy.addGroup,
                  variant: CatchButtonVariant.secondary,
                  onPressed: () => onAppend(
                    path,
                    HostResponseGroup(
                      match: HostResponseMatch.any,
                      children: [defaultCondition()],
                    ),
                  ),
                ),
              if (path.isNotEmpty)
                CatchButton(
                  label: copy.remove,
                  variant: CatchButtonVariant.quiet,
                  onPressed: () => onReplace(path, null),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class HostResponseConditionSection extends StatelessWidget {
  const HostResponseConditionSection({
    super.key,
    required this.path,
    required this.condition,
    required this.fields,
    required this.copy,
    required this.onReplace,
  });

  final List<int> path;
  final HostResponseCondition condition;
  final List<HostResponseQueryField> fields;
  final HostResponseQueryEditorCopy copy;
  final void Function(List<int>, HostResponsePredicate?) onReplace;

  @override
  Widget build(BuildContext context) {
    final field = fields.firstWhere(
      (item) => item.questionId == condition.questionId,
      orElse: () => fields.first,
    );
    final operator = field.operators.contains(condition.operator)
        ? condition.operator
        : field.operators.first;
    return Column(
      key: ValueKey('response-condition-${path.join('-')}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: CatchButton(
                label: '${copy.field}: ${field.label}',
                variant: CatchButtonVariant.secondary,
                onPressed: () async {
                  final chosen = await showCatchSelectionSheet<String>(
                    context: context,
                    title: copy.field,
                    value: field.questionId,
                    items: [
                      for (final option in fields)
                        CatchSelectionMenuItem(
                          value: option.questionId,
                          label: option.label,
                        ),
                    ],
                  );
                  if (chosen == null || !context.mounted) return;
                  final selected = fields.firstWhere(
                    (item) => item.questionId == chosen,
                  );
                  onReplace(
                    path,
                    HostResponseCondition(
                      questionId: chosen,
                      operator:
                          selected.operators.contains(
                            HostResponseOperator.present,
                          )
                          ? HostResponseOperator.present
                          : selected.operators.first,
                    ),
                  );
                },
              ),
            ),
            gapW8,
            CatchButton(
              label: copy.remove,
              variant: CatchButtonVariant.quiet,
              onPressed: () => onReplace(path, null),
            ),
          ],
        ),
        gapH8,
        CatchButton(
          label: '${copy.condition}: ${copy.operatorLabels[operator]}',
          variant: CatchButtonVariant.secondary,
          onPressed: () async {
            final chosen = await showCatchSelectionSheet<HostResponseOperator>(
              context: context,
              title: copy.condition,
              value: operator,
              items: [
                for (final option in field.operators)
                  CatchSelectionMenuItem(
                    value: option,
                    label: copy.operatorLabels[option]!,
                  ),
              ],
            );
            if (chosen == null || !context.mounted) return;
            onReplace(
              path,
              HostResponseCondition(
                questionId: field.questionId,
                operator: chosen,
                value: chosen == HostResponseOperator.booleanIs ? true : null,
              ),
            );
          },
        ),
        gapH8,
        HostResponseConditionValueSection(
          path: path,
          field: field,
          condition: condition,
          copy: copy,
          onReplace: onReplace,
        ),
      ],
    );
  }
}

class HostResponseConditionValueSection extends StatelessWidget {
  const HostResponseConditionValueSection({
    super.key,
    required this.path,
    required this.field,
    required this.condition,
    required this.copy,
    required this.onReplace,
  });

  final List<int> path;
  final HostResponseQueryField field;
  final HostResponseCondition condition;
  final HostResponseQueryEditorCopy copy;
  final void Function(List<int>, HostResponsePredicate?) onReplace;

  @override
  Widget build(BuildContext context) {
    final operator = condition.operator;
    if (operator == HostResponseOperator.present ||
        operator == HostResponseOperator.missing) {
      return const SizedBox.shrink();
    }
    if (operator == HostResponseOperator.choiceAny ||
        operator == HostResponseOperator.choiceAll ||
        operator == HostResponseOperator.choiceNone) {
      return CatchChoiceInput<String>(
        key: ValueKey('response-values-${path.join('-')}'),
        values: field.options.keys.toList(growable: false),
        selected: condition.values.toSet(),
        itemLabelBuilder: (value) => field.options[value]!,
        mode: CatchChipMode.multiple,
        allowEmptySelection: true,
        onChanged: (selected) => onReplace(
          path,
          HostResponseCondition(
            questionId: field.questionId,
            operator: operator,
            values: selected.toList()..sort(),
          ),
        ),
      );
    }
    if (operator == HostResponseOperator.booleanIs) {
      return CatchChoiceInput<bool>.segmented(
        options: [
          CatchOption(value: true, label: copy.yes),
          CatchOption(value: false, label: copy.no),
        ],
        selected: condition.value == false ? false : true,
        contractExemption: 'Boolean answer filter is a local query draft.',
        onChanged: (value) => onReplace(
          path,
          HostResponseCondition(
            questionId: field.questionId,
            operator: operator,
            value: value,
          ),
        ),
      );
    }
    final range =
        operator == HostResponseOperator.numberBetween ||
        operator == HostResponseOperator.dateBetween;
    if (range) {
      return Row(
        children: [
          Expanded(
            child: HostResponseValueFieldSection(
              path: path,
              field: field,
              condition: condition,
              copy: copy,
              onReplace: onReplace,
              lower: true,
            ),
          ),
          gapW12,
          Expanded(
            child: HostResponseValueFieldSection(
              path: path,
              field: field,
              condition: condition,
              copy: copy,
              onReplace: onReplace,
              lower: false,
            ),
          ),
        ],
      );
    }
    return HostResponseValueFieldSection(
      path: path,
      field: field,
      condition: condition,
      copy: copy,
      onReplace: onReplace,
    );
  }
}

class HostResponseValueFieldSection extends StatelessWidget {
  const HostResponseValueFieldSection({
    super.key,
    required this.path,
    required this.field,
    required this.condition,
    required this.copy,
    required this.onReplace,
    this.lower,
  });

  final List<int> path;
  final HostResponseQueryField field;
  final HostResponseCondition condition;
  final HostResponseQueryEditorCopy copy;
  final void Function(List<int>, HostResponsePredicate?) onReplace;
  final bool? lower;

  @override
  Widget build(BuildContext context) {
    final operator = condition.operator;
    final number = operator.name.startsWith('number');
    final current = lower == null
        ? condition.value
        : lower!
        ? condition.minimum
        : condition.maximum;
    return CatchSection.fieldRows(
      children: [
        CatchField.input(
          key: ValueKey('response-value-${path.join('-')}-$lower-$current'),
          copy: catchFieldCopy(context.l10n),
          title: lower == null
              ? copy.value
              : lower!
              ? copy.minimum
              : copy.maximum,
          initialValue: current?.toString(),
          keyboardType: number
              ? const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                )
              : operator.name.startsWith('date')
              ? TextInputType.datetime
              : TextInputType.text,
          maxLength: number
              ? 24
              : operator.name.startsWith('date')
              ? 10
              : 200,
          contractExemption:
              'The manager query validates typed response values.',
          onBlur: (raw) {
            final parsed = number ? num.tryParse(raw.trim()) : raw.trim();
            onReplace(
              path,
              HostResponseCondition(
                questionId: field.questionId,
                operator: operator,
                value: lower == null ? parsed : null,
                minimum: lower == true ? parsed : condition.minimum,
                maximum: lower == false ? parsed : condition.maximum,
              ),
            );
          },
        ),
      ],
    );
  }
}
