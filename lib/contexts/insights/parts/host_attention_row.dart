import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What one attention item says: its title, the line under it and the
/// label of its one action.
@immutable
class HostAttentionCopy {
  const HostAttentionCopy({
    required this.title,
    required this.body,
    required this.action,
  });

  factory HostAttentionCopy.of(HostAttentionItem item, AppLocalizations l10n) {
    final eventName =
        item.context.eventName ?? l10n.hostTodayAttentionFallbackEvent;
    final subjectLabel =
        item.context.subjectLabel ?? l10n.hostTodayAttentionFallbackSubject;
    final count = item.context.count ?? 0;
    return switch (item.kind) {
      HostAttentionKind.eventLiveOperations => HostAttentionCopy(
        title: l10n.hostTodayAttentionLiveTitle,
        body: l10n.hostTodayAttentionLiveBody(eventName: eventName),
        action: l10n.hostTodayAttentionOpenLive,
      ),
      HostAttentionKind.eventAssistanceCaseReview => HostAttentionCopy(
        title: l10n.eventAssistanceHelpTitle,
        body: l10n.hostTodayAttentionHelpBody(
          count: count,
          eventName: eventName,
        ),
        action: l10n.eventAssistanceHelpReview,
      ),
      HostAttentionKind.eventAssistanceDeliveryReview => HostAttentionCopy(
        title: l10n.eventAssistanceDeliveryTitle,
        body: l10n.hostTodayAttentionDeliveryBody(
          count: count,
          eventName: eventName,
        ),
        action: l10n.eventAssistanceDeliveryReview,
      ),
      HostAttentionKind.eventWaitlistReview => HostAttentionCopy(
        title: l10n.hostsHostHomeScreenStateTitleReviewWaitlist,
        body: l10n.hostTodayAttentionWaitlistBody(
          count: count,
          eventName: eventName,
        ),
        action: l10n.hostsHostHomeScreenStateVisiblecopyReview,
      ),
      HostAttentionKind.eventJoinRequestReview => HostAttentionCopy(
        title: l10n.hostTodayAttentionJoinTitle,
        body: l10n.hostTodayAttentionJoinBody(
          count: count,
          eventName: eventName,
        ),
        action: l10n.hostTodayAttentionReview,
      ),
      HostAttentionKind.applicationReview => HostAttentionCopy(
        title: l10n.hostTodayAttentionApplicationTitle,
        body: l10n.hostTodayAttentionApplicationBody(
          subjectLabel: subjectLabel,
        ),
        action: l10n.hostTodayAttentionReview,
      ),
      HostAttentionKind.providerSyncFailure => HostAttentionCopy(
        title: l10n.hostTodayAttentionProviderTitle,
        body: l10n.hostTodayAttentionProviderBody(eventName: eventName),
        action: l10n.hostTodayAttentionReview,
      ),
      HostAttentionKind.formAutomationFailure => HostAttentionCopy(
        title: l10n.hostTodayAttentionAutomationTitle,
        body: l10n.hostTodayAttentionAutomationBody(subjectLabel: subjectLabel),
        action: l10n.hostTodayAttentionFix,
      ),
      HostAttentionKind.payoutSetup => HostAttentionCopy(
        title: l10n.hostTodayAttentionPayoutTitle,
        body: l10n.hostTodayAttentionPayoutBody(
          count: count,
          provider: item.context.provider ?? subjectLabel,
        ),
        action: l10n.hostTodayAttentionSetUpPayouts,
      ),
      HostAttentionKind.attendanceSync => HostAttentionCopy(
        title: l10n.hostTodayAttentionAttendanceTitle,
        body: l10n.hostTodayAttentionAttendanceBody(eventName: eventName),
        action: l10n.hostTodayAttentionReviewAttendance,
      ),
      HostAttentionKind.eventOfferPaymentFollowUp => HostAttentionCopy(
        title: l10n.hostTodayAttentionOfferPaymentTitle,
        body: l10n.hostTodayAttentionOfferPaymentBody(
          count: count,
          eventName: eventName,
        ),
        action: l10n.hostTodayAttentionOfferPaymentOpen,
      ),
      HostAttentionKind.momentStaffAttention ||
      HostAttentionKind.dressRehearsal ||
      HostAttentionKind.eventSuccessPreparation ||
      HostAttentionKind.roomLayoutSetup ||
      HostAttentionKind.eventStaffing ||
      HostAttentionKind.formResponseReview ||
      HostAttentionKind.inboxReply ||
      HostAttentionKind.postEventReconciliation => HostAttentionCopy(
        title: l10n.hostTodayAttentionGenericTitle,
        body: l10n.hostTodayAttentionGenericBody,
        action: l10n.hostTodayAttentionOpen,
      ),
    };
  }

  final String title;
  final String body;
  final String action;
}

/// The marker tone of an item: now is a warning, soon is information, and
/// work that is only coming up is on track.
CatchIndexRowTone hostAttentionTone(HostAttentionItem item) =>
    switch (item.urgency) {
      HostAttentionUrgency.immediate => CatchIndexRowTone.warning,
      HostAttentionUrgency.soon => CatchIndexRowTone.info,
      HostAttentionUrgency.upcoming => CatchIndexRowTone.success,
    };

/// One open attention item as a system list row: the tone marker, what it
/// is, the line under it and its one action. The row and the action both
/// call [onOpen], which goes to the item's destination.
class HostAttentionRow extends StatelessWidget {
  const HostAttentionRow({super.key, required this.item, this.onOpen});

  final HostAttentionItem item;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final copy = HostAttentionCopy.of(item, context.l10n);
    return CatchIndexRow(
      title: copy.title,
      subtitle: copy.body,
      onTap: onOpen,
      marker: hostAttentionTone(item),
      action: CatchIndexRowAction(label: copy.action, onPressed: onOpen),
      density: CatchIndexRowSize.roomy,
    );
  }
}
