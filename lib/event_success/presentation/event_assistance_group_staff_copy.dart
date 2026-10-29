import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';

String assistanceGroupDutyLabel(
  AppLocalizations l10n,
  AssistanceGroupDuty duty,
) => switch (duty) {
  AssistanceGroupDuty.lead => l10n.eventAssistanceDutyLead,
  AssistanceGroupDuty.pacer => l10n.eventAssistanceDutyPacer,
  AssistanceGroupDuty.sweep => l10n.eventAssistanceDutySweep,
};
String assistanceGroupDutyBody(
  AppLocalizations l10n,
  AssistanceGroupDuty duty,
) => switch (duty) {
  AssistanceGroupDuty.lead => l10n.eventAssistanceDutyLeadBody,
  AssistanceGroupDuty.pacer => l10n.eventAssistanceDutyPacerBody,
  AssistanceGroupDuty.sweep => l10n.eventAssistanceDutySweepBody,
};
