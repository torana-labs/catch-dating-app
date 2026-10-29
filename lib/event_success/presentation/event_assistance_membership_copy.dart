import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

String assistanceMembershipActionLabel(
  AppLocalizations l10n,
  AssistanceMembershipAction action,
) => switch (action) {
  AssistanceMembershipAction.place => l10n.eventAssistanceGroupPlace,
  AssistanceMembershipAction.propose => l10n.eventAssistanceGroupPropose,
  AssistanceMembershipAction.accept => l10n.eventAssistanceGroupAccept,
  AssistanceMembershipAction.reject => l10n.eventAssistanceGroupReject,
  AssistanceMembershipAction.cancel => l10n.eventAssistanceGroupCancel,
  AssistanceMembershipAction.leave => l10n.eventAssistanceGroupLeave,
};
String assistanceMembershipActionBody(
  AppLocalizations l10n,
  AssistanceMembershipAction action,
) => switch (action) {
  AssistanceMembershipAction.place => l10n.eventAssistanceGroupPlaceBody,
  AssistanceMembershipAction.propose => l10n.eventAssistanceGroupProposeBody,
  AssistanceMembershipAction.accept => l10n.eventAssistanceGroupAcceptBody,
  AssistanceMembershipAction.reject => l10n.eventAssistanceGroupRejectBody,
  AssistanceMembershipAction.cancel => l10n.eventAssistanceGroupCancelBody,
  AssistanceMembershipAction.leave => l10n.eventAssistanceGroupLeaveBody,
};
String assistanceMembershipGroupLabel(
  AppLocalizations l10n,
  AssistanceMembershipFacts facts,
  String? groupId,
) => groupId == null
    ? l10n.eventAssistanceGroupNone
    : facts.groups.where((g) => g.groupId == groupId).firstOrNull?.label ??
          l10n.eventAssistanceGroupUnknown;
String? assistanceMembershipTransferCopy(
  AppLocalizations l10n,
  AssistanceMembershipFacts facts,
) => switch (facts.transfer) {
  null => null,
  AssistancePendingTransfer(:final state, :final proposal) => switch (state) {
    AssistancePendingTransferState.pending => l10n.eventAssistanceGroupPending(
      group: assistanceMembershipGroupLabel(l10n, facts, proposal.to),
    ),
    AssistancePendingTransferState.expired => l10n.eventAssistanceGroupExpired,
    AssistancePendingTransferState.sourceChanged =>
      l10n.eventAssistanceGroupChanged,
  },
  AssistanceClosedTransfer(:final state) => switch (state) {
    AssistanceClosedTransferState.accepted =>
      l10n.eventAssistanceGroupClosedAccepted,
    AssistanceClosedTransferState.rejected =>
      l10n.eventAssistanceGroupClosedRejected,
    AssistanceClosedTransferState.cancelled =>
      l10n.eventAssistanceGroupClosedCancelled,
  },
};
