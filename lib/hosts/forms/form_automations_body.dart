import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_labels.dart';
import 'package:catch_dating_app/hosts/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One form's automations in reading order: what they cover, the rules
/// (each opens its editor), the two quick presets, then the run history
/// with each run's outcome and Load more.
class HostFormAutomationsBody extends StatelessWidget {
  const HostFormAutomationsBody({
    super.key,
    required this.formId,
    required this.state,
    required this.sources,
    required this.onEdit,
    required this.onPreset,
    required this.onLoadMore,
    required this.onRetry,
  });

  /// The form the rules are for; null lists every rule.
  final String? formId;
  final HostFormAutomationsState state;

  /// The organizer's forms, tags and events, for names; null while read.
  final HostSavedAudienceFilterOptions? sources;
  final ValueChanged<HostFormAutomationRule> onEdit;

  /// Creates a preset rule with these steps, named [String].
  final void Function(String name, HostFormAutomationActionKind kind) onPreset;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final creating = state.mutatingRuleIds.contains('new');
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchText(
            formId == null
                ? l10n.hostAudienceAutomationScopeAll
                : l10n.hostAudienceAutomationScopeForm,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          if (state.error case final error?)
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.forms,
              mode: CatchErrorStateMode.compact,
              onRetry: onRetry,
            ),
          if (state.rules.isEmpty)
            CatchEmptyState(
              icon: CatchIcons.magic,
              title: l10n.hostFormAutomationsEmptyTitle,
              message: l10n.hostFormAutomationsEmptyBody,
            )
          else
            CatchSection(
              title: l10n.hostFormAutomationsRules,
              children: [
                for (final rule in state.rules)
                  CatchIndexRow(
                    key: ValueKey<String>('automation-edit-${rule.ruleId}'),
                    title: rule.name,
                    meta: [
                      rule.enabled
                          ? l10n.hostAudienceAutomationActive
                          : l10n.hostAudienceAutomationPaused,
                      if (formId == null && rule.formId != null)
                        sources?.forms
                                .where((form) => form.id == rule.formId)
                                .firstOrNull
                                ?.title ??
                            l10n.hostAudienceThisForm,
                    ].join(' · '),
                    body: hostFormAutomationRuleSummary(l10n, rule, sources),
                    icon: CatchIcons.magic,
                    chevron: true,
                    onTap: () => onEdit(rule),
                  ),
              ],
            ),
          if (formId != null)
            CatchSection(
              title: l10n.hostAudienceAutomationShortcuts,
              dividers: CatchSectionPlacement.none,
              children: [
                for (final (kind, icon) in [
                  (
                    HostFormAutomationActionKind.notifyTeam,
                    CatchIcons.notifications,
                  ),
                  (
                    HostFormAutomationActionKind.createCrmContact,
                    CatchIcons.people,
                  ),
                ])
                  CatchButton(
                    key: ValueKey<String>('automation-preset-${kind.name}'),
                    label: hostFormAutomationActionText(l10n, kind),
                    leading: CatchIcon(icon),
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    onPressed: creating
                        ? null
                        : () => onPreset(
                            hostFormAutomationActionText(l10n, kind),
                            kind,
                          ),
                  ),
              ],
            ),
          if (state.runs.isNotEmpty)
            CatchSection(
              title: l10n.hostFormAutomationsRuns,
              children: [
                CatchText(
                  l10n.hostAutomationRunHelp,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
                for (final run in state.runs)
                  CatchIndexRow(
                    key: ValueKey<String>('automation-run-${run.runId}'),
                    title:
                        state.rules
                            .where((rule) => rule.ruleId == run.ruleId)
                            .firstOrNull
                            ?.name ??
                        run.ruleName ??
                        l10n.hostFormAutomationsTitle,
                    subtitle:
                        '${hostFormAutomationRunStatusText(l10n, run.status)} · '
                        '${AppTimeFormatters.compactRelativeTime(run.createdAt)}',
                    body: hostFormAutomationRunBody(l10n, run),
                    onTap: null,
                  ),
                if (state.hasMore)
                  CatchButton(
                    key: const ValueKey<String>('automation-runs-more'),
                    label: l10n.hostFormAutomationsLoadMore,
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    status: state.loadingMore
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: state.loadingMore ? null : onLoadMore,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
