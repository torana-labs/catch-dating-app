import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Published-question transform editor for one soft event matching feature.
class EventSuccessAssignmentFeatureRuleSheet extends StatefulWidget {
  const EventSuccessAssignmentFeatureRuleSheet({
    super.key,
    required this.source,
    required this.question,
    this.current,
  });

  final EventSuccessAssignmentFeatureSource source;
  final EventSuccessAssignmentFeatureQuestion question;
  final EventSuccessAssignmentFeatureRule? current;

  @override
  State<EventSuccessAssignmentFeatureRuleSheet> createState() =>
      _EventSuccessAssignmentFeatureRuleSheetState();
}

class _EventSuccessAssignmentFeatureRuleSheetState
    extends State<EventSuccessAssignmentFeatureRuleSheet> {
  late String _kind =
      widget.current?.kind ??
      switch (widget.question.kind) {
        'multiChoice' => 'set',
        'number' => 'number',
        _ => 'category',
      };
  late String _mode = widget.current?.mode ?? 'preferSimilar';
  late double _weight = widget.current?.weight ?? 1;
  late final List<String> _ordinalOrder =
      widget.current?.scoreByOptionId == null
      ? widget.question.options.map((item) => item.optionId).toList()
      : (widget.question.options.map((item) => item.optionId).toList()..sort(
          (a, b) => (widget.current!.scoreByOptionId![a] ?? 0).compareTo(
            widget.current!.scoreByOptionId![b] ?? 0,
          ),
        ));
  late final TextEditingController _minimum = TextEditingController(
    text: (widget.current?.minimum ?? widget.question.minNumber)?.toString(),
  );
  late final TextEditingController _maximum = TextEditingController(
    text: (widget.current?.maximum ?? widget.question.maxNumber)?.toString(),
  );
  bool _invalid = false;

  @override
  void dispose() {
    _minimum.dispose();
    _maximum.dispose();
    super.dispose();
  }

  void _submit() {
    try {
      final rule = EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: widget.source,
        question: widget.question,
        kind: _kind,
        mode: _mode,
        weight: _weight,
        ordinalOrder: _kind == 'ordinal' ? _ordinalOrder : null,
        minimum: _kind == 'number'
            ? double.tryParse(_minimum.text.trim())
            : null,
        maximum: _kind == 'number'
            ? double.tryParse(_maximum.text.trim())
            : null,
      );
      Navigator.of(context).pop(rule);
    } on ArgumentError {
      setState(() => _invalid = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final kinds = widget.question.kind == 'singleChoice'
        ? const ['category', 'ordinal']
        : [widget.question.kind == 'number' ? 'number' : 'set'];
    return CatchSheet.standard(
      title: widget.question.label,
      subtitle: widget.source.formTitle,
      child: CatchSectionList(
        emptyStateOmitted: true,
        children: [
          CatchSection.fieldRows(
            first: true,
            children: [
              CatchField<String>.select(
                copy: catchFieldCopy(l10n),
                title: l10n.eventMatchingHostTransform,
                contract: CatchContractConstraints
                    .configureEventAssignmentFeaturesCallablePayloadRulesItemsKind,
                values: kinds,
                itemLabelBuilder: (kind) => switch (kind) {
                  'set' => l10n.eventMatchingHostSet,
                  'number' => l10n.eventMatchingHostNumber,
                  'ordinal' => l10n.eventMatchingHostOrdinal,
                  _ => l10n.eventMatchingHostCategory,
                },
                value: _kind,
                onChanged: (kind) {
                  if (kind != null) setState(() => _kind = kind);
                },
              ),
              CatchField<String>.select(
                copy: catchFieldCopy(l10n),
                title: l10n.eventMatchingHostPreference,
                contract: CatchContractConstraints
                    .configureEventAssignmentFeaturesCallablePayloadRulesItemsMode,
                values: const [
                  'preferSimilar',
                  'preferDifferent',
                  'balanceAcrossGroups',
                ],
                itemLabelBuilder: (mode) => switch (mode) {
                  'preferDifferent' => l10n.eventMatchingHostDifferent,
                  'balanceAcrossGroups' => l10n.eventMatchingHostBalance,
                  _ => l10n.eventMatchingHostSimilar,
                },
                value: _mode,
                onChanged: (mode) {
                  if (mode != null) setState(() => _mode = mode);
                },
              ),
              CatchField.stepper(
                copy: catchFieldCopy(l10n),
                title: l10n.eventMatchingHostWeight,
                contract: CatchContractConstraints
                    .configureEventAssignmentFeaturesCallablePayloadRulesItemsWeight,
                value: _weight,
                min: 0,
                max: 100,
                step: 1,
                decreaseSemanticLabel: l10n.eventMatchingHostDecreaseWeight,
                increaseSemanticLabel: l10n.eventMatchingHostIncreaseWeight,
                onChanged: (weight) =>
                    setState(() => _weight = weight.toDouble()),
              ),
              if (_kind == 'number') ...[
                if (widget.question.minNumber == null ||
                    widget.question.maxNumber == null)
                  CatchField.content(
                    copy: catchFieldCopy(l10n),
                    title: l10n.eventMatchingHostMissingBounds,
                    body: l10n.eventMatchingHostValidation,
                  ),
                CatchField.input(
                  copy: catchFieldCopy(l10n),
                  title: l10n.eventMatchingHostMinimum,
                  contract: CatchContractConstraints
                      .configureEventAssignmentFeaturesCallablePayloadRulesItemsMinimum,
                  controller: _minimum,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                    signed: true,
                  ),
                ),
                CatchField.input(
                  copy: catchFieldCopy(l10n),
                  title: l10n.eventMatchingHostMaximum,
                  contract: CatchContractConstraints
                      .configureEventAssignmentFeaturesCallablePayloadRulesItemsMaximum,
                  controller: _maximum,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                    signed: true,
                  ),
                ),
              ],
              if (_kind == 'ordinal')
                for (var index = 0; index < _ordinalOrder.length; index++)
                  CatchField.nav(
                    copy: catchFieldCopy(l10n),
                    title: widget.question.options
                        .firstWhere(
                          (option) => option.optionId == _ordinalOrder[index],
                        )
                        .label,
                    body: l10n.eventMatchingHostMoveEarlier,
                    valueText: '${index + 1}',
                    onTap: index == 0
                        ? null
                        : () => setState(() {
                            final item = _ordinalOrder.removeAt(index);
                            _ordinalOrder.insert(index - 1, item);
                          }),
                  ),
              if (_invalid)
                CatchField.content(
                  copy: catchFieldCopy(l10n),
                  title: l10n.eventMatchingHostValidation,
                  body: l10n.eventMatchingHostDescription,
                ),
            ],
          ),
          CatchButton(
            label: widget.current == null
                ? l10n.eventMatchingHostAddQuestion
                : l10n.eventMatchingHostSave,
            fullWidth: true,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
