import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

String helpCategoryLabel(
  AppLocalizations l10n,
  AssistanceCaseCategory category,
) => switch (category) {
  AssistanceCaseCategory.eventLogistics => l10n.eventAssistanceHelpLogistics,
  AssistanceCaseCategory.accessibility => l10n.eventAssistanceHelpAccessibility,
  AssistanceCaseCategory.other => l10n.eventAssistanceHelpOther,
};

String helpManagerName(
  AppLocalizations l10n,
  AssistanceCaseManagerOptions? options,
  String uid,
) {
  if (uid == options?.actorUid) return l10n.eventAssistanceGroupYou;
  return options?.managers
          .where((m) => m.uid == uid)
          .firstOrNull
          ?.displayName ??
      l10n.eventAssistanceHelpUnknownHost;
}

String helpAssignmentLabel(
  AppLocalizations l10n,
  AssistanceCaseAssignment assignment,
  AssistanceCaseManagerOptions? options,
) => switch (assignment) {
  AssistanceCaseUnassigned() => l10n.eventAssistanceHelpUnassigned,
  AssistanceCaseAssigned(
    authority: AssistanceCaseAssignmentAuthority.revoked,
  ) =>
    l10n.eventAssistanceHelpOwnerRemoved,
  AssistanceCaseAssigned(:final managerUid) => l10n.eventAssistanceHelpAssigned(
    name: helpManagerName(l10n, options, managerUid),
  ),
};

String helpReceivedLabel(BuildContext context, int at) {
  final local = MaterialLocalizations.of(context);
  final date = DateTime.fromMillisecondsSinceEpoch(at);
  return context.l10n.eventAssistanceHelpReceived(
    date: local.formatMediumDate(date),
    time: local.formatTimeOfDay(TimeOfDay.fromDateTime(date)),
  );
}
