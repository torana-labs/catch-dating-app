import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/contexts/live/parts/formats_rule_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A published booking question and the form version it comes from.
typedef FormatsQuestionChoice = ({
  EventSuccessAssignmentFeatureSource source,
  EventSuccessAssignmentFeatureQuestion question,
});

/// Using one answer to shape the groups, in a contained sheet: the
/// question, where it comes from and its answers, how to use it, how much
/// it matters (the rule's weight, on three steps), and Add this rule, or
/// Save and Remove for a rule already saved.
class HostFormatsRuleSheet extends StatefulWidget {
  const HostFormatsRuleSheet({
    super.key,
    required this.sources,
    required this.onSave,
    required this.onRemove,
    this.current,
    this.saving = false,
  });

  final List<EventSuccessAssignmentFeatureSource> sources;

  /// The rule being changed; null adds one.
  final EventSuccessAssignmentFeatureRule? current;
  final ValueChanged<EventSuccessAssignmentFeatureRule> onSave;
  final VoidCallback onRemove;
  final bool saving;

  @override
  State<HostFormatsRuleSheet> createState() => _HostFormatsRuleSheetState();
}

class _HostFormatsRuleSheetState extends State<HostFormatsRuleSheet> {
  late final List<FormatsQuestionChoice> _choices = [
    for (final source in widget.sources)
      for (final question in source.questions)
        if (const {
          'singleChoice',
          'multiChoice',
          'number',
        }.contains(question.kind))
          (source: source, question: question),
  ];
  late FormatsQuestionChoice? _choice =
      _choices
          .where(
            (c) =>
                c.source.formId == widget.current?.formId &&
                c.question.questionId == widget.current?.questionId,
          )
          .firstOrNull ??
      _choices.firstOrNull;
  late String _mode = widget.current?.mode ?? 'preferSimilar';
  late FormatsRuleStrength _strength = widget.current == null
      ? FormatsRuleStrength.strong
      : formatsRuleStrength(widget.current!.weight);
  bool _invalid = false;

  EventSuccessAssignmentFeatureRule? _rule() {
    final choice = _choice;
    if (choice == null) return null;
    final question = choice.question;
    final current = widget.current;
    final sameQuestion =
        current != null &&
        current.formId == choice.source.formId &&
        current.questionId == question.questionId;
    final kind = sameQuestion
        ? current.kind
        : switch (question.kind) {
            'multiChoice' => 'set',
            'number' => 'number',
            _ => 'category',
          };
    try {
      return EventSuccessAssignmentFeatureRule.fromPublishedQuestion(
        source: choice.source,
        question: question,
        kind: kind,
        mode: _mode,
        weight: formatsRuleWeight(_strength),
        ordinalOrder: kind == 'ordinal' && sameQuestion
            ? (question.options.map((o) => o.optionId).toList()..sort(
                (a, b) => (current.scoreByOptionId?[a] ?? 0).compareTo(
                  current.scoreByOptionId?[b] ?? 0,
                ),
              ))
            : null,
        minimum: kind == 'number'
            ? (sameQuestion ? current.minimum : null) ?? question.minNumber
            : null,
        maximum: kind == 'number'
            ? (sameQuestion ? current.maximum : null) ?? question.maxNumber
            : null,
      );
    } on ArgumentError {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final choice = _choice;
    final answers = choice?.question.options.map((o) => o.label).join(', ');
    return CatchSheet.contained(
      key: const ValueKey<String>('formats-rule-sheet'),
      title: l10n.hostFormatsRuleSheetTitle,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('formats-rule-save'),
            label: widget.current == null
                ? l10n.hostFormatsRuleAdd
                : l10n.hostFormatsRuleSave,
            fullWidth: true,
            status: widget.saving
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: widget.saving || choice == null
                ? null
                : () {
                    final rule = _rule();
                    if (rule == null) {
                      setState(() => _invalid = true);
                      return;
                    }
                    widget.onSave(rule);
                  },
          ),
          if (widget.current != null)
            CatchButton(
              label: l10n.hostFormatsRuleRemove,
              variant: CatchButtonVariant.quiet,
              fullWidth: true,
              onPressed: widget.saving ? null : widget.onRemove,
            ),
        ],
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchSection.fieldRows(
            first: true,
            children: [
              CatchField<FormatsQuestionChoice>.select(
                copy: catchFieldCopy(l10n),
                title: l10n.hostFormatsRuleQuestion,
                values: _choices,
                itemLabelBuilder: (c) => c.question.label,
                value: choice,
                onChanged: (next) => setState(() {
                  _choice = next;
                  _invalid = false;
                }),
              ),
            ],
          ),
          if (choice != null)
            CatchText(
              answers == null || answers.isEmpty
                  ? choice.source.formTitle
                  : l10n.hostFormatsRuleSource(
                      form: choice.source.formTitle,
                      answers: answers,
                    ),
              variant: CatchTextVariant.bodySmall,
            ),
          CatchSection(
            title: l10n.hostFormatsRuleHow,
            dividers: CatchSectionPlacement.none,
            children: [
              for (final mode in [
                'preferSimilar',
                'preferDifferent',
                'balanceAcrossGroups',
                if (_choice?.question.kind != 'number') 'coverAcrossGroups',
              ])
                CatchChoiceTile(
                  key: ValueKey<String>('formats-rule-mode-$mode'),
                  variant: CatchChoiceTileVariant.row,
                  title: formatsRuleModeLabel(context, mode),
                  subtitle: switch (mode) {
                    'preferDifferent' => l10n.hostFormatsRuleDifferentNote,
                    'balanceAcrossGroups' => l10n.hostFormatsRuleSpreadNote,
                    'coverAcrossGroups' => l10n.hostFormatsRuleCoverNote,
                    _ => l10n.hostFormatsRuleSimilarNote,
                  },
                  selected: _mode == mode,
                  onTap: () => setState(() => _mode = mode),
                ),
            ],
          ),
          CatchSliderInput(
            key: const ValueKey<String>('formats-rule-strength'),
            value: (_strength.index + 1).toDouble(),
            min: 1,
            max: 3,
            divisions: 2,
            label: l10n.hostFormatsRuleMatters,
            valueLabelBuilder: (value) => formatsRuleStrengthLabel(
              context,
              FormatsRuleStrength.values[value.round() - 1],
            ),
            onChanged: (value) => setState(
              () => _strength = FormatsRuleStrength.values[value.round() - 1],
            ),
          ),
          if (_invalid)
            CatchNotice.inline(
              body: l10n.hostFormatsRuleInvalid,
              tone: CatchNoticeTone.warning,
            ),
        ],
      ),
    );
  }
}
