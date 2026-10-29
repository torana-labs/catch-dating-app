import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

String deliveryStatusLabel(
  AppLocalizations l10n,
  AssistanceDeliveryStatus value,
) => switch (value) {
  AssistanceDeliveryStatus.notSubmitted =>
    l10n.eventAssistanceDeliveryStatusNotSubmitted,
  AssistanceDeliveryStatus.reserved =>
    l10n.eventAssistanceDeliveryStatusReserved,
  AssistanceDeliveryStatus.unknown => l10n.eventAssistanceDeliveryStatusUnknown,
  AssistanceDeliveryStatus.accepted =>
    l10n.eventAssistanceDeliveryStatusAccepted,
  AssistanceDeliveryStatus.delivered =>
    l10n.eventAssistanceDeliveryStatusDelivered,
  AssistanceDeliveryStatus.read => l10n.eventAssistanceDeliveryStatusRead,
  AssistanceDeliveryStatus.failed => l10n.eventAssistanceDeliveryStatusFailed,
  AssistanceDeliveryStatus.notDispatched =>
    l10n.eventAssistanceDeliveryStatusNotDispatched,
  AssistanceDeliveryStatus.revoked => l10n.eventAssistanceDeliveryStatusRevoked,
  AssistanceDeliveryStatus.conflictingEvidence =>
    l10n.eventAssistanceDeliveryStatusConflictingEvidence,
};

String deliveryPurposeLabel(
  AppLocalizations l10n,
  AssistanceMessagePurpose value,
) => switch (value) {
  AssistanceMessagePurpose.joiningUpdate =>
    l10n.eventAssistanceDeliveryPurposeJoiningUpdate,
  AssistanceMessagePurpose.joiningInstructions =>
    l10n.eventAssistanceDeliveryPurposeJoiningInstructions,
  AssistanceMessagePurpose.planChanged =>
    l10n.eventAssistanceDeliveryPurposePlanChanged,
  AssistanceMessagePurpose.guestRequirement =>
    l10n.eventAssistanceDeliveryPurposeGuestRequirement,
  AssistanceMessagePurpose.assignmentChanged =>
    l10n.eventAssistanceDeliveryPurposeAssignmentChanged,
  AssistanceMessagePurpose.participationCheck =>
    l10n.eventAssistanceDeliveryPurposeParticipationCheck,
  AssistanceMessagePurpose.eventCancelled =>
    l10n.eventAssistanceDeliveryPurposeEventCancelled,
  AssistanceMessagePurpose.eventFinished =>
    l10n.eventAssistanceDeliveryPurposeEventFinished,
  AssistanceMessagePurpose.followUp =>
    l10n.eventAssistanceDeliveryPurposeFollowUp,
};

String _reviewReason(
  AppLocalizations l10n,
  AssistanceDeliveryReviewReason value,
) => switch (value) {
  AssistanceDeliveryReviewReason.noEligibleRoute =>
    l10n.eventAssistanceDeliveryReviewReasonNoEligibleRoute,
  AssistanceDeliveryReviewReason.attemptLimit =>
    l10n.eventAssistanceDeliveryReviewReasonAttemptLimit,
  AssistanceDeliveryReviewReason.policyRejected =>
    l10n.eventAssistanceDeliveryReviewReasonPolicyRejected,
  AssistanceDeliveryReviewReason.recipientNeedsReview =>
    l10n.eventAssistanceDeliveryReviewReasonRecipientNeedsReview,
  AssistanceDeliveryReviewReason.providerOwnsFallback =>
    l10n.eventAssistanceDeliveryReviewReasonProviderOwnsFallback,
  AssistanceDeliveryReviewReason.conflictingDeliveryEvidence =>
    l10n.eventAssistanceDeliveryReviewReasonConflictingDeliveryEvidence,
  AssistanceDeliveryReviewReason.providerPending =>
    l10n.eventAssistanceDeliveryReviewReasonProviderPending,
  AssistanceDeliveryReviewReason.workerUnavailable =>
    l10n.eventAssistanceDeliveryReviewReasonWorkerUnavailable,
  AssistanceDeliveryReviewReason.recoveryLimit =>
    l10n.eventAssistanceDeliveryReviewReasonRecoveryLimit,
  AssistanceDeliveryReviewReason.eventFactsStale =>
    l10n.eventAssistanceDeliveryReviewReasonEventFactsStale,
  AssistanceDeliveryReviewReason.routeFactsStale =>
    l10n.eventAssistanceDeliveryReviewReasonRouteFactsStale,
};

String _retryReason(
  AppLocalizations l10n,
  AssistanceDeliveryRetryReason value,
) => switch (value) {
  AssistanceDeliveryRetryReason.retryBackoff =>
    l10n.eventAssistanceDeliveryRetryReasonRetryBackoff,
  AssistanceDeliveryRetryReason.eventFactsStale =>
    l10n.eventAssistanceDeliveryRetryReasonEventFactsStale,
  AssistanceDeliveryRetryReason.routeFactsStale =>
    l10n.eventAssistanceDeliveryRetryReasonRouteFactsStale,
  AssistanceDeliveryRetryReason.workerUnavailable =>
    l10n.eventAssistanceDeliveryRetryReasonWorkerUnavailable,
};

String _stopReason(AppLocalizations l10n, AssistanceDeliveryStopReason value) =>
    switch (value) {
      AssistanceDeliveryStopReason.delivered =>
        l10n.eventAssistanceDeliveryStopReasonDelivered,
      AssistanceDeliveryStopReason.responded =>
        l10n.eventAssistanceDeliveryStopReasonResponded,
      AssistanceDeliveryStopReason.cancelled =>
        l10n.eventAssistanceDeliveryStopReasonCancelled,
      AssistanceDeliveryStopReason.superseded =>
        l10n.eventAssistanceDeliveryStopReasonSuperseded,
      AssistanceDeliveryStopReason.expired =>
        l10n.eventAssistanceDeliveryStopReasonExpired,
      AssistanceDeliveryStopReason.eventClosed =>
        l10n.eventAssistanceDeliveryStopReasonEventClosed,
      AssistanceDeliveryStopReason.permissionRevoked =>
        l10n.eventAssistanceDeliveryStopReasonPermissionRevoked,
      AssistanceDeliveryStopReason.guestPresent =>
        l10n.eventAssistanceDeliveryStopReasonGuestPresent,
      AssistanceDeliveryStopReason.guestDeclined =>
        l10n.eventAssistanceDeliveryStopReasonGuestDeclined,
      AssistanceDeliveryStopReason.notAdmitted =>
        l10n.eventAssistanceDeliveryStopReasonNotAdmitted,
      AssistanceDeliveryStopReason.hostStopped =>
        l10n.eventAssistanceDeliveryStopReasonHostStopped,
      AssistanceDeliveryStopReason.participationInactive =>
        l10n.eventAssistanceDeliveryStopReasonParticipationInactive,
    };

String deliveryCoordinationLabel(
  AppLocalizations l10n,
  AssistanceDeliveryCoordination value,
) => switch (value) {
  AssistanceDeliveryUntracked() => l10n.eventAssistanceDeliveryUntracked,
  AssistanceDeliveryQueued() => l10n.eventAssistanceDeliveryQueued,
  AssistanceDeliveryAwaitingReceipt() =>
    l10n.eventAssistanceDeliveryAwaitingReceipt,
  AssistanceDeliveryRetrying(:final reason) => _retryReason(l10n, reason),
  AssistanceDeliveryNeedsReview(:final reason) => _reviewReason(l10n, reason),
  AssistanceDeliveryComplete(:final reason) => _stopReason(l10n, reason),
};

String deliveryHandlingLabel(
  AppLocalizations l10n,
  AssistanceDeliveryHandling value,
  String currentUid,
) => switch (value) {
  AssistanceAutomaticDeliveryHandling() =>
    l10n.eventAssistanceDeliveryAutomatic,
  AssistanceManualDeliveryHandling(
    authority: AssistanceDeliveryOwnerAuthority.revoked,
  ) =>
    l10n.eventAssistanceDeliveryRevokedOwner,
  AssistanceManualDeliveryHandling(:final actorUid)
      when actorUid == currentUid =>
    l10n.eventAssistanceDeliveryMine,
  AssistanceManualDeliveryHandling() => l10n.eventAssistanceDeliveryAnotherHost,
};

String deliveryTimeLabel(BuildContext context, int milliseconds) {
  final date = DateTime.fromMillisecondsSinceEpoch(milliseconds);
  final localizations = MaterialLocalizations.of(context);
  return '${localizations.formatShortDate(date)} · ${localizations.formatTimeOfDay(TimeOfDay.fromDateTime(date))}';
}

String deliveryAttemptLabel(
  AppLocalizations l10n,
  AssistanceDeliveryAttemptState value,
) => switch (value) {
  AssistanceDeliveryAttemptState.reserved =>
    l10n.eventAssistanceDeliveryStatusReserved,
  AssistanceDeliveryAttemptState.unknown =>
    l10n.eventAssistanceDeliveryStatusUnknown,
  AssistanceDeliveryAttemptState.accepted =>
    l10n.eventAssistanceDeliveryStatusAccepted,
  AssistanceDeliveryAttemptState.delivered =>
    l10n.eventAssistanceDeliveryStatusDelivered,
  AssistanceDeliveryAttemptState.read => l10n.eventAssistanceDeliveryStatusRead,
  AssistanceDeliveryAttemptState.failed =>
    l10n.eventAssistanceDeliveryStatusFailed,
  AssistanceDeliveryAttemptState.notDispatched =>
    l10n.eventAssistanceDeliveryStatusNotDispatched,
  AssistanceDeliveryAttemptState.revoked =>
    l10n.eventAssistanceDeliveryStatusRevoked,
};
