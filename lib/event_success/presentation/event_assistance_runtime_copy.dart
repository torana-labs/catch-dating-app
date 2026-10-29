import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

String runtimeRouteLabel(AppLocalizations l, AssistanceMessageRoute route) =>
    switch (route) {
      AssistanceMessageRoute.catchEventSms => l.eventAssistanceRuntimeSms,
      AssistanceMessageRoute.catchEventRcs => l.eventAssistanceRuntimeRcs,
      AssistanceMessageRoute.organizerEventWhatsapp =>
        l.eventAssistanceRuntimeWhatsapp,
    };
String runtimeStatusLabel(AppLocalizations l, AssistanceRuntimeStatus status) =>
    switch (status) {
      AssistanceRuntimeStatus.unconfigured =>
        l.eventAssistanceRuntimeUnconfigured,
      AssistanceRuntimeStatus.paused => l.eventAssistanceRuntimePaused,
      AssistanceRuntimeStatus.sourceChanged => l.eventAssistanceRuntimeChanged,
      AssistanceRuntimeStatus.expired => l.eventAssistanceRuntimeExpired,
      AssistanceRuntimeStatus.eventClosed => l.eventAssistanceRuntimeClosed,
      AssistanceRuntimeStatus.configured => l.eventAssistanceRuntimeConfigured,
    };
String runtimeIssueLabel(
  AppLocalizations l,
  AssistanceRuntimeDraftIssue issue,
) => switch (issue) {
  AssistanceRuntimeDraftIssue.eventClosed => l.eventAssistanceRuntimeClosed,
  AssistanceRuntimeDraftIssue.noChannels =>
    l.eventAssistanceRuntimeIssueChannels,
  AssistanceRuntimeDraftIssue.senderUnavailable =>
    l.eventAssistanceRuntimeSenderMissing,
  AssistanceRuntimeDraftIssue.expiry => l.eventAssistanceRuntimeIssueExpiry,
  AssistanceRuntimeDraftIssue.deadline => l.eventAssistanceRuntimeIssueDeadline,
};
String runtimeSenderIssue(
  AppLocalizations l,
  AssistanceRuntimeSenderAvailability status,
) => switch (status) {
  AssistanceRuntimeSenderAvailability.eligible => '',
  AssistanceRuntimeSenderAvailability.setupRequired =>
    l.eventAssistanceRuntimeNeedsSetup,
  AssistanceRuntimeSenderAvailability.approvalExpired =>
    l.eventAssistanceRuntimeApprovalExpired,
  AssistanceRuntimeSenderAvailability.joiningTemplateMissing =>
    l.eventAssistanceRuntimeTemplateMissing,
};
String runtimeSenderLabel(
  AppLocalizations l,
  AssistanceRuntimeSenderChoice sender,
) =>
    '${runtimeRouteLabel(l, sender.route)} · ${sender.displayName}${sender.displayAddress == null ? '' : ' · ${sender.displayAddress}'}';
