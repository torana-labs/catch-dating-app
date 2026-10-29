import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff.dart';

/// A Host edits fake staff using the live assignment/removal decision types.
/// Both the parent runtime and independently versioned staff review are frozen.
final class RehearsalStaffChange {
  RehearsalStaffChange({
    required this.snapshot,
    required String operatorId,
    required String displayName,
    required this.groupId,
    required this.decision,
    required this.clientActionId,
  }) : operatorId = rehearsalOperatorId(operatorId),
       displayName = assistanceText(displayName.trim(), 120) {
    final session = snapshot.session;
    if (!snapshot.isManager ||
        session.actionCount >= 500 ||
        session.runtimeRevision >= 2147483647 ||
        !RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(clientActionId)) {
      throw const FormatException('Review staff as the rehearsal Host.');
    }
    assistanceText(groupId, 180);
    assistanceInteger(snapshot.revision + 1);
    final prior = snapshot.operators[operatorId];
    switch (decision) {
      case AssistanceAssignGroupDuty(:final duty, :final expiresAt):
        assistanceInteger(expiresAt);
        final end =
            session.virtualStartedAt!.millisecondsSinceEpoch +
            session.setup.durationMinutes * 60000;
        if (!snapshot.canAssign ||
            !(snapshot.groups[groupId]?.availableDuties.contains(duty) ??
                false) ||
            expiresAt <= snapshot.serverTime ||
            expiresAt > snapshot.serverTime + 1209600000 ||
            expiresAt > end + 14400000 ||
            prior == null && snapshot.operators.length >= 50 ||
            prior != null &&
                !prior.duties.containsKey(groupId) &&
                prior.duties.length >= 20) {
          throw const FormatException(
            'Choose an available practice duty and expiry.',
          );
        }
      case AssistanceRemoveGroupDuty():
        // Removal remains available after expiry or a changed group source.
        if (prior == null) {
          throw const FormatException(
            'This practice operator has no saved duties.',
          );
        }
    }
  }
  final RehearsalStaffReview snapshot;
  final String operatorId, displayName, groupId, clientActionId;
  final AssistanceGroupStaffDecision decision;

  Map<String, Object?> toJson() => {
    'sessionId': snapshot.session.id,
    'expectedRevision': snapshot.session.runtimeRevision,
    'expectedSetupRevision': snapshot.session.setupRevision,
    'clientActionId': clientActionId,
    'action': 'staff',
    'staff': {
      'operatorId': operatorId,
      'displayName': displayName,
      'groupId': groupId,
      'expectedRevision': snapshot.revision,
      'expectedSourceHash': snapshot.sourceHash,
      'decision': switch (decision) {
        AssistanceAssignGroupDuty(:final duty, :final expiresAt) => {
          'kind': 'assign',
          'duty': duty.name,
          'expiresAtMillis': expiresAt,
        },
        AssistanceRemoveGroupDuty() => {'kind': 'remove'},
      },
    },
  };

  void requireResult(EventRehearsalBootstrap result) {
    snapshot.requireSameRole(result.staffReview);
    final next = result.staffReview!;
    final before = snapshot.session;
    final receipts = result.actions.where(
      (a) => a.clientActionId == clientActionId,
    );
    final immediate =
        result.session.runtimeRevision == before.runtimeRevision + 1;
    if (result.session.id != before.id ||
        result.session.organizerId != before.organizerId ||
        result.session.setupRevision != before.setupRevision ||
        result.session.runtimeRevision <= before.runtimeRevision ||
        result.session.actionCount <= before.actionCount ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        next.revision <= snapshot.revision ||
        receipts.length != 1 ||
        receipts.single.actorId != null ||
        receipts.single.kind != 'control' ||
        receipts.single.name !=
            'staff:${decision is AssistanceAssignGroupDuty ? 'assign' : 'remove'}' ||
        receipts.single.runtimeRevision != before.runtimeRevision + 1 ||
        receipts.single.virtualNow != before.virtualNow ||
        immediate &&
            (next.revision != snapshot.revision + 1 ||
                result.session.status != before.status ||
                result.session.virtualNow != before.virtualNow)) {
      throw const FormatException(
        'Practice response does not confirm this staff decision.',
      );
    }
    // Later staff changes are current evidence; replay cannot restore an old duty.
    if (next.revision != snapshot.revision + 1) return;
    final operator = next.operators[operatorId];
    final duty = operator?.duties[groupId];
    final expectedIds = {...snapshot.operators.keys, operatorId};
    if (operator == null ||
        operator.displayName != displayName ||
        next.operators.length != expectedIds.length ||
        !next.operators.keys.toSet().containsAll(expectedIds) ||
        !switch (decision) {
          AssistanceAssignGroupDuty(duty: final kind, :final expiresAt) =>
            duty?.duty == kind &&
                duty?.expiresAt == expiresAt &&
                duty?.grantedBy == snapshot.hostUid &&
                duty?.grantedAt == snapshot.serverTime &&
                duty?.sourceHash == snapshot.groups[groupId]?.sourceHash,
          AssistanceRemoveGroupDuty() => duty == null,
        }) {
      throw const FormatException(
        'Practice confirmation changed the intended duty.',
      );
    }
    for (final old in snapshot.operators.values) {
      final current = next.operators[old.id]!;
      final oldGroups = old.duties.keys
          .where((g) => old.id != operatorId || g != groupId)
          .toSet();
      final newGroups = current.duties.keys
          .where((g) => old.id != operatorId || g != groupId)
          .toSet();
      if (old.id != operatorId && current.displayName != old.displayName ||
          oldGroups.length != newGroups.length ||
          !newGroups.containsAll(oldGroups) ||
          oldGroups.any(
            (g) => !_sameDuty(old.duties[g]!, current.duties[g]!),
          )) {
        throw const FormatException(
          'Practice staff edit changed another duty.',
        );
      }
    }
    if (!snapshot.operators.containsKey(operatorId) &&
        operator.duties.length != 1) {
      throw const FormatException(
        'Practice staff edit added unrelated duties.',
      );
    }
  }
}

bool _sameDuty(AssistanceGroupStaffDuty a, AssistanceGroupStaffDuty b) =>
    a.duty == b.duty &&
    a.expiresAt == b.expiresAt &&
    a.sourceHash == b.sourceHash &&
    a.grantedBy == b.grantedBy &&
    a.grantedAt == b.grantedAt;
