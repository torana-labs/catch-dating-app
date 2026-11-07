import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// An open help request as a Needs you row: a warning marker, who asked and
/// what about, how long ago, and the one action that opens the request.
class LiveCaseRow extends StatelessWidget {
  const LiveCaseRow({
    super.key,
    required this.request,
    required this.now,
    required this.onAction,
    this.density = CatchIndexRowSize.roomy,
  });

  final AssistanceOpenHostCase request;

  /// The clock the "minutes ago" reads from.
  final DateTime now;
  final VoidCallback onAction;
  final CatchIndexRowSize density;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = request.displayName?.trim();
    final category = switch (request.category) {
      AssistanceCaseCategory.eventLogistics =>
        l10n.eventAssistanceHelpLogistics,
      AssistanceCaseCategory.accessibility =>
        l10n.eventAssistanceHelpAccessibility,
      AssistanceCaseCategory.other => l10n.eventAssistanceHelpOther,
    };
    return CatchIndexRow(
      title: name == null || name.isEmpty
          ? l10n.hostLiveNeedHelpAnonymous
          : l10n.hostLiveNeedHelp(name: name),
      subtitle: l10n.hostLiveNeedAgo(
        what: category,
        minutes: _minutesSince(request.receivedAt, now),
      ),
      onTap: null,
      density: density,
      marker: CatchIndexRowTone.warning,
      action: CatchIndexRowAction(
        label: l10n.hostLiveNeedHelpAction,
        onPressed: onAction,
      ),
    );
  }
}

/// A message a guest did not get, waiting on the host: an info marker, who
/// and which message, and the action that opens its review.
class LiveDeliveryRow extends StatelessWidget {
  const LiveDeliveryRow({
    super.key,
    required this.delivery,
    required this.onAction,
    this.density = CatchIndexRowSize.roomy,
  });

  final AssistanceActionableDelivery delivery;
  final VoidCallback onAction;
  final CatchIndexRowSize density;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = delivery.evidence.displayName?.trim();
    return CatchIndexRow(
      title: name == null || name.isEmpty
          ? l10n.hostLiveNeedDeliveryAnonymous
          : l10n.hostLiveNeedDelivery(name: name),
      subtitle: switch (delivery.purpose) {
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
      },
      onTap: null,
      density: density,
      marker: CatchIndexRowTone.info,
      action: CatchIndexRowAction(
        label: l10n.hostLiveNeedDeliveryAction,
        onPressed: onAction,
      ),
    );
  }
}

/// A guest who checked in after the start and has no place in the next
/// round yet: a success marker, when they arrived, and the action that
/// places them.
class LiveArrivalRow extends StatelessWidget {
  const LiveArrivalRow({
    super.key,
    required this.arrival,
    required this.onAction,
    this.density = CatchIndexRowSize.roomy,
  });

  final EventSuccessLateArrivalCandidate arrival;

  /// Null while the placement is being saved.
  final VoidCallback? onAction;
  final CatchIndexRowSize density;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = arrival.displayName?.trim();
    return CatchIndexRow(
      title: name == null || name.isEmpty
          ? l10n.hostLiveNeedArrivalAnonymous
          : l10n.hostLiveNeedArrival(name: name),
      subtitle: l10n.hostLiveNeedArrivalBody(
        time: AppTimeFormatters.time(
          DateTime.fromMillisecondsSinceEpoch(arrival.checkedInAtMillis),
        ),
      ),
      onTap: null,
      density: density,
      marker: CatchIndexRowTone.success,
      action: CatchIndexRowAction(
        label: l10n.hostLiveNeedArrivalAction,
        onPressed: onAction,
      ),
    );
  }
}

int _minutesSince(int millis, DateTime now) {
  final minutes = now
      .difference(DateTime.fromMillisecondsSinceEpoch(millis))
      .inMinutes;
  return minutes < 0 ? 0 : minutes;
}
