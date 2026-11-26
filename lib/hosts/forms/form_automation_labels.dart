import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';

/// When a form automation runs, in the host's words.
String hostFormAutomationTriggerText(
  AppLocalizations l10n,
  HostFormAutomationTrigger trigger,
) => switch (trigger) {
  HostFormAutomationTrigger.responseSubmitted =>
    l10n.hostFormAutomationSubmittedTrigger,
  HostFormAutomationTrigger.responseWithdrawn =>
    l10n.hostFormAutomationWithdrawnTrigger,
  HostFormAutomationTrigger.answerMatches =>
    l10n.hostFormAutomationAnswerTrigger,
  HostFormAutomationTrigger.applicationAccepted => l10n.hostAutomationAccepted,
  HostFormAutomationTrigger.eventAttended => l10n.hostAutomationAttended,
};

/// How one run of an automation went.
String hostFormAutomationRunStatusText(
  AppLocalizations l10n,
  HostFormAutomationRunStatus status,
) => switch (status) {
  HostFormAutomationRunStatus.pending => l10n.hostFormAutomationPending,
  HostFormAutomationRunStatus.running => l10n.hostFormAutomationRunning,
  HostFormAutomationRunStatus.succeeded => l10n.hostFormAutomationSucceeded,
  HostFormAutomationRunStatus.partiallyFailed =>
    l10n.hostFormAutomationPartiallyFailed,
  HostFormAutomationRunStatus.failed => l10n.hostFormAutomationFailed,
  HostFormAutomationRunStatus.skipped => l10n.hostFormAutomationSkipped,
};

/// What one automation step does.
String hostFormAutomationActionText(
  AppLocalizations l10n,
  HostFormAutomationActionKind kind,
) => switch (kind) {
  HostFormAutomationActionKind.notifyTeam =>
    l10n.hostFormAutomationNotifyPreset,
  HostFormAutomationActionKind.createCrmContact =>
    l10n.hostFormAutomationCrmPreset,
  HostFormAutomationActionKind.addApplicationQueue => l10n.hostAutomationQueue,
  HostFormAutomationActionKind.proposeEventAttendee =>
    l10n.hostAutomationAttendee,
  HostFormAutomationActionKind.addOrganizerTag => l10n.hostAutomationTag,
  HostFormAutomationActionKind.signedWebhook => l10n.hostAutomationWebhook,
  HostFormAutomationActionKind.campaignHandoff => l10n.hostAutomationMessage,
};

/// A run's detail lines: what started it and which attempt, when it is
/// next checked, its error and how each step went.
String hostFormAutomationRunBody(
  AppLocalizations l10n,
  HostFormAutomationRun run,
) {
  final trigger = switch (run.eventKind) {
    'submitted' => HostFormAutomationTrigger.responseSubmitted,
    'withdrawn' => HostFormAutomationTrigger.responseWithdrawn,
    'applicationAccepted' => HostFormAutomationTrigger.applicationAccepted,
    'eventAttended' => HostFormAutomationTrigger.eventAttended,
    _ => null,
  };
  return [
    l10n.hostFormAutomationRunSummary(
      trigger: trigger == null
          ? l10n.hostFormAutomationsTitle
          : hostFormAutomationTriggerText(l10n, trigger),
      attempt: run.attemptCount,
    ),
    if (run.dueAt case final due?)
      '${l10n.hostAutomationDue}: ${AppTimeFormatters.dateTime(due.toLocal())}',
    ?run.errorMessage,
    for (final result in run.actionResults)
      if (HostFormAutomationActionKind.values
              .where((kind) => kind.name == result['kind'])
              .firstOrNull
          case final kind?)
        '${hostFormAutomationActionText(l10n, kind)}: ${switch (result['status']) {
          'succeeded' => l10n.hostFormAutomationSucceeded,
          'skipped' => l10n.hostFormAutomationSkipped,
          _ => l10n.hostFormAutomationFailed,
        }}',
  ].join('\n');
}

/// "When this happens, then these steps", naming each step's tag or event,
/// and the delay when there is one.
String hostFormAutomationRuleSummary(
  AppLocalizations l10n,
  HostFormAutomationRule rule,
  HostSavedAudienceFilterOptions? sources,
) {
  final actions = rule.actions
      .map(
        (action) => [
          hostFormAutomationActionText(l10n, action.kind),
          if (action.tagId != null)
            sources?.tags
                    .where((tag) => tag.tagId == action.tagId)
                    .firstOrNull
                    ?.label ??
                l10n.hostAutomationConfigured,
          if (action.eventId != null)
            sources?.events
                    .where((event) => event.id == action.eventId)
                    .firstOrNull
                    ?.title ??
                l10n.hostAutomationConfigured,
        ].join(': '),
      )
      .join(' · ');
  return [
    l10n.hostAudienceAutomationConsequence(
      trigger: hostFormAutomationTriggerText(l10n, rule.trigger),
      actions: actions,
    ),
    if (rule.delayMinutes > 0)
      l10n.hostAudienceAutomationDelay(minutes: rule.delayMinutes),
  ].join('\n');
}

/// The steps a trigger allows: a withdrawal only notifies or calls a
/// webhook; an accepted application or an attended event cannot add
/// people, queue an application or propose an attendee.
List<HostFormAutomationActionKind> hostFormAutomationAllowedActions(
  HostFormAutomationTrigger trigger,
) => [
  for (final kind in HostFormAutomationActionKind.values)
    if (switch (trigger) {
      HostFormAutomationTrigger.responseWithdrawn =>
        kind == HostFormAutomationActionKind.notifyTeam ||
            kind == HostFormAutomationActionKind.signedWebhook,
      HostFormAutomationTrigger.applicationAccepted ||
      HostFormAutomationTrigger.eventAttended => !const [
        HostFormAutomationActionKind.createCrmContact,
        HostFormAutomationActionKind.addApplicationQueue,
        HostFormAutomationActionKind.proposeEventAttendee,
      ].contains(kind),
      _ => true,
    })
      kind,
];
