import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

String lateJoinModeLabel(AppLocalizations l10n, LateJoinDraftMode mode) =>
    switch (mode) {
      LateJoinDraftMode.inherit => l10n.eventAssistanceLateJoinInherit,
      LateJoinDraftMode.disabled => l10n.eventAssistanceLateJoinOff,
      LateJoinDraftMode.observe => l10n.eventAssistanceLateJoinObserve,
      LateJoinDraftMode.prepare => l10n.eventAssistanceLateJoinPrepare,
      LateJoinDraftMode.automatic => l10n.eventAssistanceLateJoinAutomatic,
    };
String lateJoinModeBody(AppLocalizations l10n, LateJoinDraftMode mode) =>
    switch (mode) {
      LateJoinDraftMode.inherit => l10n.eventAssistanceLateJoinInheritBody,
      LateJoinDraftMode.disabled => l10n.eventAssistanceLateJoinOffBody,
      LateJoinDraftMode.observe => l10n.eventAssistanceLateJoinObserveBody,
      LateJoinDraftMode.prepare => l10n.eventAssistanceLateJoinPrepareBody,
      LateJoinDraftMode.automatic => l10n.eventAssistanceLateJoinAutomaticBody,
    };
String lateJoinStatusLabel(
  AppLocalizations l10n,
  AssistanceSettingStatus status,
) => switch (status) {
  AssistanceSettingStatus.unconfigured =>
    l10n.eventAssistanceLateJoinUnconfigured,
  AssistanceSettingStatus.configured => l10n.eventAssistanceLateJoinConfigured,
  AssistanceSettingStatus.disabled => l10n.eventAssistanceLateJoinDisabled,
  AssistanceSettingStatus.sourceChanged =>
    l10n.eventAssistanceLateJoinSourceChanged,
};
String? lateJoinOriginLabel(
  AppLocalizations l10n,
  AssistanceSettingOrigin origin,
  String groupId,
) => switch (origin) {
  AssistanceSettingOrigin.none => null,
  AssistanceSettingOrigin.event =>
    groupId == 'event:whole'
        ? l10n.eventAssistanceLateJoinEventOrigin
        : l10n.eventAssistanceLateJoinInheritedOrigin,
  AssistanceSettingOrigin.group => l10n.eventAssistanceLateJoinGroupOrigin,
};
String lateJoinIssueLabel(AppLocalizations l10n, LateJoinDraftIssue issue) =>
    switch (issue) {
      LateJoinDraftIssue.missingRules || LateJoinDraftIssue.eventInheritance =>
        l10n.eventAssistanceLateJoinMissingRules,
      LateJoinDraftIssue.setupUnavailable =>
        l10n.eventAssistanceLateJoinSetupUnknown,
      LateJoinDraftIssue.destinationChanged =>
        l10n.eventAssistanceLateJoinDestinationChanged,
      LateJoinDraftIssue.missingResponseDeadline =>
        l10n.eventAssistanceRuntimeSetDeadline,
      LateJoinDraftIssue.invalidCutoff =>
        l10n.eventAssistanceLateJoinInvalidCutoff,
    };

String lateJoinDestinationLabel(
  AppLocalizations l10n,
  LateJoinDestination destination,
  LateJoinSettingSetup? setup,
) {
  if (destination is LateJoinConfirmedProgress) {
    return l10n.eventAssistanceLateJoinConfirmed;
  }
  final labels =
      setup?.destinations
          .where(
            (d) => switch ((destination, d.target)) {
              (
                LateJoinFixedPlace(:final placeId),
                AssistanceFixedPlace(placeId: final id),
              ) =>
                placeId == id,
              (
                LateJoinItinerary(:final itineraryId, :final permittedStopIds),
                AssistanceItineraryStop(
                  itineraryId: final route,
                  stopId: final id,
                ),
              ) =>
                itineraryId == route && permittedStopIds.contains(id),
              (
                LateJoinGroupCheckpoints(
                  :final routeId,
                  :final groupId,
                  :final permittedCheckpointIds,
                ),
                AssistanceGroupCheckpoint(
                  routeId: final route,
                  groupId: final group,
                  checkpointId: final id,
                ),
              ) =>
                routeId == route &&
                    groupId == group &&
                    permittedCheckpointIds.contains(id),
              _ => false,
            },
          )
          .map((d) => d.label)
          .toList() ??
      [];
  return labels.isEmpty
      ? l10n.eventAssistanceLateJoinDestinationChanged
      : labels.join(' · ');
}

String lateJoinTimeLabel(BuildContext context, int at) => DateFormat.yMMMd(
  Localizations.localeOf(context).toLanguageTag(),
).add_jm().format(DateTime.fromMillisecondsSinceEpoch(at));
