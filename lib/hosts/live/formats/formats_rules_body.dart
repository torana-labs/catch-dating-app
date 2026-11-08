import 'package:catch_dating_app/contexts/live/parts/formats_rule_row.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_rules_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Grouping in board order: the answers that shape the groups (each saved
/// rule, with Add), and the consent notice.
///
/// Not drawn, because nothing stores or computes them: "The aim" (meet new
/// people, balanced groups, like with like) and the "With these rules"
/// preview stats.
class HostFormatsRulesBody extends StatelessWidget {
  const HostFormatsRulesBody({
    super.key,
    required this.state,
    required this.onAdd,
    required this.onOpen,
    required this.onRetry,
  });

  final HostFormatsRulesState state;
  final VoidCallback onAdd;
  final ValueChanged<HostFormatsRule> onOpen;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostFormatsRulesStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostFormatsRulesStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostFormatsErrorTitle,
            message: l10n.hostFormatsErrorBody,
            retryLabel: l10n.hostFormatsRetry,
            onRetry: onRetry,
          ),
        );
      case HostFormatsRulesStatus.ready:
        break;
    }
    return CatchPageBody.screen(
      children: [
        CatchSection(
          title: l10n.hostFormatsRulesAnswers,
          action: state.canAdd
              ? CatchSectionAction(label: l10n.hostFormatsAdd, onPressed: onAdd)
              : null,
          empty: state.canAdd
              ? l10n.hostFormatsRulesNone
              : l10n.hostFormatsRulesNoQuestions,
          children: [
            for (final rule in state.rules)
              FormatsRuleRow(
                key: ValueKey<String>('formats-rule-${rule.rule.featureId}'),
                rule: rule.rule,
                question: rule.question,
                formTitle: rule.formTitle,
                coverage: rule.coverage,
                rosterCount: state.rosterCount,
                onTap: () => onOpen(rule),
              ),
          ],
        ),
        CatchNotice.inline(
          title: l10n.hostFormatsConsentTitle,
          body: l10n.hostFormatsConsentBody,
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.protected,
        ),
      ],
    );
  }
}
