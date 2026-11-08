import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// How strongly a grouping rule counts, on the sheet's three steps.
enum FormatsRuleStrength { light, medium, strong }

/// The strength a saved rule's weight reads as.
FormatsRuleStrength formatsRuleStrength(double weight) => weight <= 1
    ? FormatsRuleStrength.light
    : weight <= 2
    ? FormatsRuleStrength.medium
    : FormatsRuleStrength.strong;

/// The weight a strength saves as.
double formatsRuleWeight(FormatsRuleStrength strength) =>
    (strength.index + 1).toDouble();

String formatsRuleStrengthLabel(BuildContext context, FormatsRuleStrength s) {
  final l10n = context.l10n;
  return switch (s) {
    FormatsRuleStrength.light => l10n.hostFormatsRuleLight,
    FormatsRuleStrength.medium => l10n.hostFormatsRuleMedium,
    FormatsRuleStrength.strong => l10n.hostFormatsRuleStrong,
  };
}

/// How a rule uses the answer, in the host's words.
String formatsRuleModeLabel(BuildContext context, String mode) {
  final l10n = context.l10n;
  return switch (mode) {
    'preferDifferent' => l10n.hostFormatsRuleDifferent,
    'balanceAcrossGroups' => l10n.hostFormatsRuleSpread,
    _ => l10n.hostFormatsRuleSimilar,
  };
}

/// One grouping rule as a row: the question, where it comes from, how it
/// is used and how much, and how many guests agreed to their answer being
/// used. The row draws nothing of its own.
class FormatsRuleRow extends StatelessWidget {
  const FormatsRuleRow({
    super.key,
    required this.rule,
    required this.question,
    required this.formTitle,
    required this.onTap,
    this.coverage,
    this.rosterCount = 0,
  });

  final EventSuccessAssignmentFeatureRule rule;

  /// The question as the form asks it.
  final String question;
  final String formTitle;
  final VoidCallback? onTap;
  final EventSuccessAssignmentFeatureCoverage? coverage;

  /// Everyone on the event's roster now.
  final int rosterCount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final coverage = this.coverage;
    return CatchIndexRow(
      title: question,
      subtitle: l10n.hostFormatsRuleLine(
        form: formTitle,
        how: formatsRuleModeLabel(context, rule.mode),
        strength: formatsRuleStrengthLabel(
          context,
          formatsRuleStrength(rule.weight),
        ),
      ),
      meta: coverage == null
          ? null
          : l10n.hostFormatsRuleAgreed(
              agreed: coverage.grantedCount,
              total: rosterCount,
            ),
      icon: CatchIcons.forms,
      onTap: onTap,
      density: CatchIndexRowSize.roomy,
      chevron: onTap != null,
    );
  }
}
