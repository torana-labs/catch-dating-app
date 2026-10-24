import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

part 'host_automation_rule_editor.dart';

class HostFormAutomationsScreen extends ConsumerStatefulWidget {
  const HostFormAutomationsScreen({
    super.key,
    required this.organizerId,
    this.formId,
  });

  final String organizerId;
  final String? formId;
  @override
  ConsumerState<HostFormAutomationsScreen> createState() =>
      _HostFormAutomationsScreenState();
}

class _HostFormAutomationsScreenState
    extends ConsumerState<HostFormAutomationsScreen> {
  bool _editing = false;
  HostFormAutomationRule? _selectedRule;
  String get organizerId => widget.organizerId;
  String? get formId => widget.formId;
  @override
  Widget build(BuildContext context) {
    if (_editing) {
      return HostAutomationRuleEditor(
        organizerId: organizerId,
        scopeFormId: formId,
        initialRule: _selectedRule,
        onCancel: () => setState(() => _editing = false),
        onSaved: () {
          ref.invalidate(
            hostFormAutomationsControllerProvider(organizerId, formId),
          );
          setState(() => _editing = false);
        },
      );
    }
    final provider = hostFormAutomationsControllerProvider(organizerId, formId);
    final automations = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final sources = catchAsyncStateFromAsyncValue(
      ref.watch(hostSavedAudienceFilterOptionsProvider(organizerId)),
    ).value;
    final scopeTitle = formId == null
        ? context.l10n.hostAudienceAllAutomations
        : sources?.forms
                  .where((form) => form.id == formId)
                  .firstOrNull
                  ?.title ??
              context.l10n.hostAudienceThisForm;
    final scopeHeader = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(scopeTitle, variant: CatchTextVariant.headline),
        gapH8,
        CatchText(
          formId == null
              ? context.l10n.hostAudienceAutomationScopeAll
              : context.l10n.hostAudienceAutomationScopeForm,
          variant: CatchTextVariant.supporting,
        ),
      ],
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostFormAutomationsTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          CatchIconAction.toolbar(
            key: const ValueKey('automation-create'),
            icon: CatchIcons.add,
            tooltip: context.l10n.hostAutomationNew,
            onPressed: () => setState(() {
              _selectedRule = null;
              _editing = true;
            }),
          ),
        ],
      ),
      body: CatchRouteBody.standardConstrained(
        child: CatchAsyncBoundary<HostFormAutomationsState>(
          value: automations,
          onRetry: () => ref.invalidate(provider),
          initialLoadTimeout: null,
          loadingBuilder: (_) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              scopeHeader,
              gapH24,
              CatchSection.containedLoadingRows(
                title: context.l10n.hostFormAutomationsRules,
                layouts: List.generate(
                  7,
                  (_) => CatchRecordLayout.placeholder(
                    icon: CatchIcons.autoAwesomeOutlined,
                    hasMetadata: true,
                    hasDescription: true,
                  ),
                ),
              ),
            ],
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              scopeHeader,
              gapH24,
              CatchLocalizedErrorState(
                error,
                context: AppErrorContext.forms,
                onRetry: onBoundaryRetry,
              ),
            ],
          ),
          builder: (context, state) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              scopeHeader,
              if (state.error case final error?) ...[
                gapH12,
                CatchLocalizedErrorState(
                  error,
                  context: AppErrorContext.forms,
                  mode: CatchErrorStateMode.compact,
                  onRetry: () => ref.invalidate(provider),
                ),
              ],
              gapH24,
              if (state.rules.isEmpty)
                CatchEmptyState(
                  icon: CatchIcons.autoAwesomeOutlined,
                  title: context.l10n.hostFormAutomationsEmptyTitle,
                  message: context.l10n.hostFormAutomationsEmptyBody,
                )
              else
                CatchSection.containedRows(
                  title: context.l10n.hostFormAutomationsRules,
                  children: [
                    for (final rule in state.rules)
                      CatchField.navigate(
                        key: ValueKey('automation-edit-${rule.ruleId}'),
                        onActivate: () => setState(() {
                          _selectedRule = rule;
                          _editing = true;
                        }),
                        content: CatchRecordLayout(
                          title: rule.name,
                          icon: CatchIcons.autoAwesomeOutlined,
                          metadata: [
                            rule.enabled
                                ? context.l10n.hostAudienceAutomationActive
                                : context.l10n.hostAudienceAutomationPaused,
                            if (formId == null && rule.formId != null)
                              sources?.forms
                                      .where((form) => form.id == rule.formId)
                                      .firstOrNull
                                      ?.title ??
                                  context.l10n.hostAudienceThisForm,
                          ].join(' · '),
                          description: _automationRuleSummary(
                            context,
                            rule,
                            sources,
                          ),
                        ),
                      ),
                  ],
                ),
              if (formId != null) ...[
                gapH24,
                CatchFieldLanes.single(
                  child: CatchField.control(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostAudienceAutomationShortcuts,
                    contractExemption:
                        'Action group that creates server-validated automation presets; no scalar field value is persisted.',
                    child: Wrap(
                      spacing: CatchSpacing.s3,
                      runSpacing: CatchSpacing.s3,
                      children: [
                        CatchButton.command(
                          label: context.l10n.hostFormAutomationNotifyPreset,
                          leading: Icon(CatchIcons.notificationsNoneRounded),
                          onPressed: state.mutatingRuleIds.contains('new')
                              ? null
                              : () => _createPreset(
                                  context,
                                  controller,
                                  () => ref.read(provider).asData?.value.error,
                                  context.l10n.hostFormAutomationNotifyPreset,
                                  const [
                                    HostFormAutomationActionKind.notifyTeam,
                                  ],
                                ),
                        ),
                        CatchButton.command(
                          label: context.l10n.hostFormAutomationCrmPreset,
                          leading: Icon(CatchIcons.peopleOutlineRounded),
                          onPressed: state.mutatingRuleIds.contains('new')
                              ? null
                              : () => _createPreset(
                                  context,
                                  controller,
                                  () => ref.read(provider).asData?.value.error,
                                  context.l10n.hostFormAutomationCrmPreset,
                                  const [
                                    HostFormAutomationActionKind
                                        .createCrmContact,
                                  ],
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (state.runs.isNotEmpty) ...[
                gapH24,
                CatchSection.divided(
                  title: context.l10n.hostFormAutomationsRuns,
                  children: [
                    for (final run in state.runs)
                      CatchField.control(
                        copy: catchFieldCopy(context.l10n),
                        title:
                            state.rules
                                .where((rule) => rule.ruleId == run.ruleId)
                                .firstOrNull
                                ?.name ??
                            context.l10n.hostFormAutomationsTitle,
                        contractExemption:
                            'Read-only disclosure of a server-owned automation run outcome; no scalar value is persisted.',
                        body:
                            '${_runStatusLabel(context, run.status)} · ${AppTimeFormatters.compactRelativeTime(run.createdAt)}',
                        child: CatchText(
                          _runBody(context, run),
                          variant: CatchTextVariant.bodyL,
                          color: CatchTokens.of(context).ink,
                        ),
                      ),
                  ],
                ),
                gapH8,
                CatchText(
                  context.l10n.hostAutomationRunHelp,
                  variant: CatchTextVariant.bodyS,
                  color: CatchTokens.of(context).ink2,
                ),
                if (state.canLoadMore) ...[
                  gapH16,
                  CatchButton(
                    label: context.l10n.hostFormAutomationsLoadMore,
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    status: (state.loadingMore)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: state.loadingMore
                        ? null
                        : () => ref.read(provider.notifier).loadMore(),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createPreset(
    BuildContext context,
    HostFormAutomationsController controller,
    Object? Function() readError,
    String name,
    List<HostFormAutomationActionKind> actions,
  ) async {
    final saved = await controller.createPreset(
      name: name,
      trigger: HostFormAutomationTrigger.responseSubmitted,
      actions: actions,
    );
    if (!saved && context.mounted) {
      final error = readError();
      if (error != null) showCatchNoticeError(context, error);
    }
  }
}

String _triggerLabel(BuildContext context, HostFormAutomationTrigger trigger) =>
    switch (trigger) {
      HostFormAutomationTrigger.responseSubmitted =>
        context.l10n.hostFormAutomationSubmittedTrigger,
      HostFormAutomationTrigger.responseWithdrawn =>
        context.l10n.hostFormAutomationWithdrawnTrigger,
      HostFormAutomationTrigger.answerMatches =>
        context.l10n.hostFormAutomationAnswerTrigger,
      HostFormAutomationTrigger.applicationAccepted =>
        context.l10n.hostAutomationAccepted,
      HostFormAutomationTrigger.eventAttended =>
        context.l10n.hostAutomationAttended,
    };

String _runStatusLabel(
  BuildContext context,
  HostFormAutomationRunStatus status,
) => switch (status) {
  HostFormAutomationRunStatus.pending => context.l10n.hostFormAutomationPending,
  HostFormAutomationRunStatus.running => context.l10n.hostFormAutomationRunning,
  HostFormAutomationRunStatus.succeeded =>
    context.l10n.hostFormAutomationSucceeded,
  HostFormAutomationRunStatus.partiallyFailed =>
    context.l10n.hostFormAutomationPartiallyFailed,
  HostFormAutomationRunStatus.failed => context.l10n.hostFormAutomationFailed,
  HostFormAutomationRunStatus.skipped => context.l10n.hostFormAutomationSkipped,
};

String _actionLabel(BuildContext context, HostFormAutomationActionKind kind) =>
    switch (kind) {
      HostFormAutomationActionKind.notifyTeam =>
        context.l10n.hostFormAutomationNotifyPreset,
      HostFormAutomationActionKind.createCrmContact =>
        context.l10n.hostFormAutomationCrmPreset,
      HostFormAutomationActionKind.addApplicationQueue =>
        context.l10n.hostAutomationQueue,
      HostFormAutomationActionKind.proposeEventAttendee =>
        context.l10n.hostAutomationAttendee,
      HostFormAutomationActionKind.addOrganizerTag =>
        context.l10n.hostAutomationTag,
      HostFormAutomationActionKind.signedWebhook =>
        context.l10n.hostAutomationWebhook,
      HostFormAutomationActionKind.campaignHandoff =>
        context.l10n.hostAutomationMessage,
    };

String _runBody(BuildContext context, HostFormAutomationRun run) {
  final trigger = switch (run.eventKind) {
    'submitted' => HostFormAutomationTrigger.responseSubmitted,
    'withdrawn' => HostFormAutomationTrigger.responseWithdrawn,
    'applicationAccepted' => HostFormAutomationTrigger.applicationAccepted,
    'eventAttended' => HostFormAutomationTrigger.eventAttended,
    _ => null,
  };
  return [
    context.l10n.hostFormAutomationRunSummary(
      trigger: trigger == null
          ? context.l10n.hostFormAutomationsTitle
          : _triggerLabel(context, trigger),
      attempt: run.attemptCount,
    ),
    if (run.dueAt case final due?)
      '${context.l10n.hostAutomationDue}: ${AppTimeFormatters.dateTime(due.toLocal())}',
    ?run.errorMessage,
    for (final result in run.actionResults)
      if (HostFormAutomationActionKind.values
              .where((k) => k.name == result['kind'])
              .firstOrNull
          case final kind?)
        '${_actionLabel(context, kind)}: ${switch (result['status']) {
          'succeeded' => context.l10n.hostFormAutomationSucceeded,
          'skipped' => context.l10n.hostFormAutomationSkipped,
          _ => context.l10n.hostFormAutomationFailed,
        }}',
  ].join('\n');
}

String _automationRuleSummary(
  BuildContext context,
  HostFormAutomationRule rule,
  HostSavedAudienceFilterOptions? sources,
) {
  final when = _triggerLabel(context, rule.trigger);
  final actions = rule.actions
      .map(
        (action) => [
          _actionLabel(context, action.kind),
          if (action.tagId != null)
            sources?.tags
                    .where((tag) => tag.tagId == action.tagId)
                    .firstOrNull
                    ?.label ??
                context.l10n.hostAutomationConfigured,
          if (action.eventId != null)
            sources?.events
                    .where((event) => event.id == action.eventId)
                    .firstOrNull
                    ?.title ??
                context.l10n.hostAutomationConfigured,
        ].join(': '),
      )
      .join(' · ');
  return [
    context.l10n.hostAudienceAutomationConsequence(
      trigger: when,
      actions: actions,
    ),
    if (rule.delayMinutes > 0)
      context.l10n.hostAudienceAutomationDelay(minutes: rule.delayMinutes),
  ].join('\n');
}
