import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_view.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff.dart';

export 'event_rehearsal_delivery_outcome.dart';

part 'event_rehearsal_accountability_command.dart';
part 'event_rehearsal_membership_command.dart';

sealed class RehearsalAssistanceCommand {
  RehearsalAssistanceCommand(this.actorId) {
    assistanceId(actorId);
  }
  final String actorId;
  String get kind;
  Map<String, Object?> toJson();
}

final class RehearsalPublishInstruction extends RehearsalAssistanceCommand {
  RehearsalPublishInstruction({required String actorId, required this.plan})
    : super(actorId);
  final RehearsalAssistancePlan plan;
  @override
  String get kind => 'publish';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'plan': plan.toJson(),
  };
}

final class RehearsalConfigureAutomation extends RehearsalAssistanceCommand {
  RehearsalConfigureAutomation({
    required String actorId,
    required this.plan,
    required List<RehearsalDeliveryOutcome> outcomes,
  }) : outcomes = rehearsalDeliveryScript(
         outcomes.map((o) => o.toJson()).toList(),
       ),
       super(actorId);
  final RehearsalAssistancePlan plan;
  final List<RehearsalDeliveryOutcome> outcomes;
  @override
  String get kind => 'configureAutomation';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'plan': plan.toJson(),
    'outcomes': outcomes.map((o) => o.toJson()).toList(growable: false),
  };
}

final class RehearsalPauseAutomation extends RehearsalAssistanceCommand {
  RehearsalPauseAutomation({required String actorId}) : super(actorId);
  @override
  String get kind => 'pauseAutomation';
  @override
  Map<String, Object?> toJson() => {'kind': kind, 'actorId': actorId};
}

final class RehearsalResumeAutomation extends RehearsalAssistanceCommand {
  RehearsalResumeAutomation({required String actorId}) : super(actorId);
  @override
  String get kind => 'resumeAutomation';
  @override
  Map<String, Object?> toJson() => {'kind': kind, 'actorId': actorId};
}

final class RehearsalResolveAssistance extends RehearsalAssistanceCommand {
  RehearsalResolveAssistance({
    required this.snapshot,
    required this.actorUid,
    required this.decision,
  }) : super(snapshot.actorId) {
    assistanceId(actorUid);
    assistanceInteger(snapshot.revision + 1);
  }
  final RehearsalOpenHelpCase snapshot;
  final String actorUid;
  final AssistanceCaseDecision decision;
  @override
  String get kind => 'resolveAssistance';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'expectedSourceHash': snapshot.sourceHash,
    'payload': {
      'caseId': snapshot.caseId,
      'expectedRevision': snapshot.revision,
      'outcome': switch (decision) {
        AssistanceCaseResolve() => 'resolved',
        AssistanceCaseDecline() => 'declined',
        AssistanceCaseTransfer() => 'transferred',
      },
      'owner': switch (decision) {
        AssistanceCaseTransfer(:final managerUid) => managerUid,
        AssistanceCaseResolve() || AssistanceCaseDecline() => actorUid,
      },
    },
  };

  void _requireResult(
    EventRehearsalSession before,
    EventRehearsalBootstrap result,
  ) {
    final rows = result.helpRequests?.cases.where(
      (r) => r.caseId == snapshot.caseId,
    );
    final next = rows?.firstOrNull;
    final receipts = result.actions.where(
      (a) => a.runtimeRevision == before.runtimeRevision + 1,
    );
    if (next == null ||
        result.session.virtualStartedAt != before.virtualStartedAt ||
        rows!.length != 1 ||
        next.actorId != snapshot.actorId ||
        next.category != snapshot.category ||
        next.receivedAt != snapshot.receivedAt ||
        next.revision < snapshot.revision + 1 ||
        next.sourceHash == snapshot.sourceHash ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        result.session.actionCount < before.actionCount + 1 ||
        receipts.length != 1 ||
        receipts.single.virtualNow != before.virtualNow) {
      throw const FormatException('Practice response lost its help decision.');
    }
    if (next.revision == snapshot.revision + 1) {
      final matches = switch (decision) {
        AssistanceCaseTransfer(:final managerUid) =>
          next is RehearsalOpenHelpCase &&
              next.assignment is AssistanceCaseAssigned &&
              (next.assignment as AssistanceCaseAssigned).managerUid ==
                  managerUid,
        AssistanceCaseResolve() || AssistanceCaseDecline() =>
          next is RehearsalClosedHelpCase &&
              next.resolution.actorUid == actorUid &&
              next.resolution.at == before.virtualNow.millisecondsSinceEpoch &&
              next.resolution.outcome ==
                  (decision is AssistanceCaseResolve
                      ? AssistanceCaseResolutionOutcome.resolved
                      : AssistanceCaseResolutionOutcome.declined),
      };
      if (!matches) {
        throw const FormatException('Practice help outcome changed.');
      }
    }
    if (result.session.runtimeRevision == before.runtimeRevision + 1 &&
        (result.session.status != before.status ||
            result.session.virtualNow != before.virtualNow ||
            next.revision != snapshot.revision + 1)) {
      throw const FormatException(
        'Practice help confirmation changed the runtime.',
      );
    }
  }
}

final class RehearsalDispatchMessage extends RehearsalAssistanceCommand {
  RehearsalDispatchMessage({
    required String actorId,
    required String messageId,
    required this.outcome,
  }) : messageId = rehearsalMessageId(messageId),
       super(actorId);
  final String messageId;
  final RehearsalDeliveryOutcome outcome;
  @override
  String get kind => 'dispatch';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'messageId': messageId,
    'outcome': outcome.toJson(),
  };
}

final class RehearsalTakeDelivery extends RehearsalAssistanceCommand {
  RehearsalTakeDelivery({required this.snapshot, required this.actorUid})
    : super(snapshot.actorId) {
    assistanceId(actorUid);
    assistanceInteger(snapshot.evidence.revision + 1);
  }
  final RehearsalActionableDelivery snapshot;
  final String actorUid;
  @override
  String get kind => 'repairDelivery';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'expectedMessageRevision': snapshot.evidence.revision,
    'expectedReviewHash': snapshot.evidence.reviewHash,
    'payload': {
      'deliveryId': snapshot.scope.messageId,
      'action': 'manualHandoff',
    },
  };

  void _requireResult(
    EventRehearsalSession before,
    EventRehearsalBootstrap result,
  ) {
    final reviews = result.deliveryReviews;
    if (reviews == null || reviews.clockId != snapshot.scope.clockId) {
      throw const FormatException('Missing practice delivery confirmation.');
    }
    final row = reviews.deliveries
        .where((r) => r.scope == snapshot.scope)
        .firstOrNull;
    final immediate =
        result.session.runtimeRevision == before.runtimeRevision + 1;
    if (row == null) {
      // A later instruction can replace this message in current-only coverage.
      if (immediate ||
          !result.actors.any(
            (a) =>
                a.actorId == actorId &&
                a.assistance?.latestMessageId != snapshot.scope.messageId,
          )) {
        throw const FormatException('Practice handoff lost its message.');
      }
      return;
    }
    final old = snapshot.evidence;
    final next = row.evidence;
    final handling = next.handling;
    if (next.revision < old.revision + 1 ||
        next.reviewHash == old.reviewHash ||
        next.createdAt != old.createdAt ||
        next.expiresAt != old.expiresAt ||
        row.actorId != actorId ||
        next.attempts.length != old.attempts.length ||
        handling is! AssistanceManualDeliveryHandling ||
        handling.at < before.virtualNow.millisecondsSinceEpoch) {
      throw const FormatException('Practice handoff evidence is inconsistent.');
    }
    for (var i = 0; i < old.attempts.length; i++) {
      if (next.attempts[i].channel != old.attempts[i].channel) {
        throw const FormatException('Practice handoff changed its channel.');
      }
    }
    if (immediate &&
        (next.revision != old.revision + 1 ||
            handling.actorUid != actorUid ||
            handling.at != before.virtualNow.millisecondsSinceEpoch ||
            handling.authority != AssistanceDeliveryOwnerAuthority.current ||
            next.lifecycle != old.lifecycle ||
            next.status != old.status ||
            List.generate(
              old.attempts.length,
              (i) => i,
            ).any((i) => old.attempts[i] != next.attempts[i]))) {
      throw const FormatException(
        'Practice handoff changed delivery evidence.',
      );
    }
  }
}

final class RehearsalRecordReceipt extends RehearsalAssistanceCommand {
  RehearsalRecordReceipt({
    required String actorId,
    required String messageId,
    required this.attemptId,
    required this.outcome,
  }) : messageId = rehearsalMessageId(messageId),
       super(actorId) {
    assistanceId(attemptId);
  }
  final String messageId;
  final String attemptId;
  final RehearsalConfirmedOutcome outcome;
  @override
  String get kind => 'receipt';
  @override
  Map<String, Object?> toJson() => {
    'kind': kind,
    'actorId': actorId,
    'messageId': messageId,
    'attemptId': attemptId,
    'outcome': outcome.toJson(),
  };
}

/// Frozen review scope. Retrying never changes the revision or request identity.
final class RehearsalAssistanceChange {
  RehearsalAssistanceChange({
    required EventRehearsalBootstrap snapshot,
    required this.command,
    required this.clientActionId,
  }) : session = snapshot.session,
       staffReview = snapshot.staffReview {
    if (staffReview?.isManager == false &&
        command is! RehearsalResolveAccountability &&
        command is! RehearsalTransferGroup) {
      throw const FormatException(
        'Switch to the Host to manage practice messages.',
      );
    }
    if (!RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(clientActionId) ||
        !snapshot.actors.any((actor) => actor.actorId == command.actorId) ||
        session.actionCount >= 500 ||
        !([
              EventRehearsalStatus.running,
              EventRehearsalStatus.paused,
            ].contains(session.status) ||
            (command is RehearsalRecordReceipt ||
                    command is RehearsalResolveAccountability ||
                    command is RehearsalTransferGroup ||
                    command is RehearsalResolveAssistance) &&
                session.status == EventRehearsalStatus.complete)) {
      throw const FormatException(
        'Refresh this practice review before continuing.',
      );
    }
    if (command case RehearsalResolveAssistance(snapshot: final request)) {
      if (request.sessionId != session.id ||
          request.setupRevision != session.setupRevision ||
          !(snapshot.helpRequests?.cases.any((c) => identical(c, request)) ??
              false)) {
        throw const FormatException(
          'Review the current practice help request.',
        );
      }
    }
    if (command case RehearsalTakeDelivery(snapshot: final delivery)) {
      final scope = delivery.scope;
      if (scope.sessionId != session.id ||
          scope.organizerId != session.organizerId ||
          scope.setupRevision != session.setupRevision ||
          !(snapshot.deliveryReviews?.deliveries.any(
                (r) => identical(r, delivery),
              ) ??
              false)) {
        throw const FormatException('Review the current practice delivery.');
      }
    }
    if (command case RehearsalResolveAccountability(snapshot: final visit)) {
      staffReview?.requireSameRole(visit.staffReview);
      if (visit.scope.sessionId != session.id ||
          visit.scope.organizerId != session.organizerId ||
          visit.scope.setupRevision != session.setupRevision ||
          !(snapshot.accountabilityReviews?.rows.any(
                (r) => identical(r, visit),
              ) ??
              false)) {
        throw const FormatException('Review the current practice visit.');
      }
    }
    if (command case RehearsalTransferGroup(snapshot: final membership)) {
      staffReview?.requireSameRole(membership.staffReview);
      if (membership.scope.sessionId != session.id ||
          membership.scope.organizerId != session.organizerId ||
          membership.scope.setupRevision != session.setupRevision ||
          !(snapshot.membershipReviews?.rows.any(
                (r) => identical(r, membership),
              ) ??
              false)) {
        throw const FormatException('Review the current practice membership.');
      }
    }
  }
  final EventRehearsalSession session;
  final RehearsalStaffReview? staffReview;
  final RehearsalAssistanceCommand command;
  final String clientActionId;
  Map<String, Object?> toJson() => {
    'sessionId': session.id,
    'expectedRevision': session.runtimeRevision,
    'expectedSetupRevision': session.setupRevision,
    'clientActionId': clientActionId,
    if (staffReview?.practiceOperatorId != null)
      'practiceOperatorId': staffReview!.practiceOperatorId,
    'action': 'assistance',
    'assistance': command.toJson(),
  };

  void requireResult(EventRehearsalBootstrap result) {
    staffReview?.requireSameRole(result.staffReview);
    if (result.session.id != session.id ||
        result.session.organizerId != session.organizerId ||
        result.session.setupRevision != session.setupRevision ||
        result.session.runtimeRevision <= session.runtimeRevision ||
        !result.actions.any(
          (action) =>
              action.clientActionId == clientActionId &&
              action.actorId == command.actorId &&
              action.kind == 'control' &&
              action.name == 'assistance:${command.kind}' &&
              action.runtimeRevision == session.runtimeRevision + 1,
        )) {
      throw const FormatException(
        'Practice response does not confirm this command.',
      );
    }
    if (command case final RehearsalTakeDelivery handoff) {
      if (result.actions
              .where((a) => a.clientActionId == clientActionId)
              .length !=
          1) {
        throw const FormatException('Ambiguous practice handoff receipt.');
      }
      handoff._requireResult(session, result);
    }
    if (command case final RehearsalResolveAccountability decision) {
      if (result.actions
              .where((a) => a.clientActionId == clientActionId)
              .length !=
          1) {
        throw const FormatException('Ambiguous practice visit receipt.');
      }
      decision._requireResult(session, result);
    }
    if (command case final RehearsalTransferGroup decision) {
      if (result.actions
              .where((a) => a.clientActionId == clientActionId)
              .length !=
          1) {
        throw const FormatException('Ambiguous practice membership receipt.');
      }
      decision._requireResult(session, result);
    }
    if (command case final RehearsalResolveAssistance decision) {
      if (result.actions
              .where((a) => a.clientActionId == clientActionId)
              .length !=
          1) {
        throw const FormatException('Ambiguous practice help receipt.');
      }
      decision._requireResult(session, result);
    }
  }
}
