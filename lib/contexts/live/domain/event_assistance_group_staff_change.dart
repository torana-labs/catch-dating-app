import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

sealed class AssistanceGroupStaffDecision {
  const AssistanceGroupStaffDecision();
}

final class AssistanceAssignGroupDuty extends AssistanceGroupStaffDecision {
  const AssistanceAssignGroupDuty({
    required this.duty,
    required this.expiresAt,
  });
  final AssistanceGroupDuty duty;
  final int expiresAt;
}

final class AssistanceRemoveGroupDuty extends AssistanceGroupStaffDecision {
  const AssistanceRemoveGroupDuty();
}

/// The lookup, verified UID, staff revision, group source and decision are frozen.
final class EventAssistanceGroupStaffChange {
  EventAssistanceGroupStaffChange({
    required this.snapshot,
    required this.decision,
    required this.actorUid,
    required this.operationId,
  }) {
    assistanceText(actorUid, 180);
    assistanceId(operationId);
    assistanceInteger(snapshot.revision + 1);
    switch (decision) {
      case AssistanceAssignGroupDuty(:final duty, :final expiresAt):
        assistanceInteger(expiresAt);
        if (!snapshot.canAssign ||
            !snapshot.availableDuties.contains(duty) ||
            expiresAt <= snapshot.serverTime ||
            expiresAt - snapshot.serverTime > 1209600000) {
          throw const FormatException(
            'Choose an available duty and a future expiry within 14 days.',
          );
        }
      // The server also checks the event end plus four hours and duty limits.
      case AssistanceRemoveGroupDuty():
        if (!snapshot.canRemove) {
          throw const FormatException(
            'This person has no group duty to remove.',
          );
        }
    }
  }
  final EventAssistanceGroupStaffView snapshot;
  final AssistanceGroupStaffDecision decision;
  final String actorUid, operationId;

  /// The canonical nested decision union is not emitted as a generated DTO.
  /// Its complete wire shape is checked against the generated schema in tests.
  Map<String, Object?> toJson() => {
    'context': snapshot.target.group.context,
    'groupId': snapshot.target.group.groupId,
    'phoneNumber': snapshot.lookup.phoneNumber,
    'expectedUid': snapshot.target.uid,
    'expectedRevision': snapshot.revision,
    'expectedSourceHash': snapshot.sourceHash,
    'requestId': operationId,
    'decision': switch (decision) {
      AssistanceAssignGroupDuty(:final duty, :final expiresAt) => {
        'kind': 'assign',
        'duty': duty.name,
        'expiresAtMillis': expiresAt,
      },
      AssistanceRemoveGroupDuty() => {'kind': 'remove'},
    },
  };

  void requireResult(EventAssistanceGroupStaffResult result) {
    final next = result.view;
    if (next.target != snapshot.target ||
        next.lookup != snapshot.lookup ||
        next.sourceHash != snapshot.sourceHash ||
        next.serverTime < snapshot.serverTime ||
        result.outcome == AssistanceGroupStaffOutcome.read ||
        result.operationRevision != snapshot.revision + 1 ||
        next.revision < result.operationRevision!) {
      throw const FormatException(
        'Group staff receipt does not confirm this decision.',
      );
    }
    // Replays return current duties, including later removal or revocation.
    if (result.outcome == AssistanceGroupStaffOutcome.replayed) return;
    final operatorExpiry = snapshot.operatorExpiresAt;
    final preserved = operatorExpiry != null && operatorExpiry > next.serverTime
        ? operatorExpiry
        : null;
    if (next.revision != result.operationRevision ||
        next.operatorExpiresAt != preserved) {
      throw const FormatException(
        'Group duty changed unrelated event-wide access.',
      );
    }
    final valid = switch (decision) {
      AssistanceAssignGroupDuty(:final duty, :final expiresAt) =>
        next.currentDuty?.duty == duty &&
            next.currentDuty?.expiresAt == expiresAt &&
            next.currentDuty?.grantedBy == actorUid &&
            next.currentDuty?.grantedAt == next.serverTime,
      AssistanceRemoveGroupDuty() => next.recordedDuty == null,
    };
    if (!valid) {
      throw const FormatException(
        'Group staff confirmation changed the intended duty.',
      );
    }
  }
}
