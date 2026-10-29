import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

sealed class AssistanceCaseDecision {
  const AssistanceCaseDecision();
  const factory AssistanceCaseDecision.resolve() = AssistanceCaseResolve;
  const factory AssistanceCaseDecision.decline() = AssistanceCaseDecline;
  factory AssistanceCaseDecision.transfer(String managerUid) =>
      AssistanceCaseTransfer._(assistanceId(managerUid));
}

final class AssistanceCaseResolve extends AssistanceCaseDecision {
  const AssistanceCaseResolve();
}

final class AssistanceCaseDecline extends AssistanceCaseDecision {
  const AssistanceCaseDecline();
}

final class AssistanceCaseTransfer extends AssistanceCaseDecision {
  const AssistanceCaseTransfer._(this.managerUid);
  final String managerUid;
}

/// An immutable reviewed command. Only a current open case can create one.
final class EventAssistanceCaseChange {
  EventAssistanceCaseChange({
    required this.snapshot,
    required this.actorUid,
    required this.operationId,
    required this.decision,
  }) {
    assistanceId(actorUid);
    assistanceId(operationId);
    assistanceInteger(snapshot.revision + 1);
  }

  final AssistanceOpenHostCase snapshot;
  final String actorUid;
  final String operationId;
  final AssistanceCaseDecision decision;

  Map<String, Object?> get command => {
    'kind': 'resolveAssistance',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'caseId': snapshot.scope.caseId,
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
}

enum AssistanceCaseChangeOutcome { applied, replayed }

final class EventAssistanceCaseResult {
  const EventAssistanceCaseResult._({
    required this.outcome,
    required this.operationRevision,
    required this.view,
  });
  final AssistanceCaseChangeOutcome outcome;
  final int operationRevision;
  final AssistanceHostCase view;

  factory EventAssistanceCaseResult.fromCallableData(
    Object? value, {
    required EventAssistanceCaseChange expectedChange,
  }) {
    final map = assistanceObject(value, {
      'context',
      'serverTime',
      'outcome',
      'operationRevision',
      'view',
    });
    final snapshot = expectedChange.snapshot;
    final scope = snapshot.scope;
    validateAssistanceCaseContext(
      map['context'],
      organizerId: scope.organizerId,
      eventId: scope.eventId,
    );
    final serverTime = assistanceInteger(map['serverTime']);
    final outcome = assistanceEnum(
      AssistanceCaseChangeOutcome.values,
      map['outcome'],
    );
    final operationRevision = assistanceInteger(map['operationRevision']);
    final view = AssistanceHostCase.fromJson(
      map['view'],
      scope: scope,
      serverTime: serverTime,
    );
    final result = EventAssistanceCaseResult._(
      outcome: outcome,
      operationRevision: operationRevision,
      view: view,
    );
    result.requireChange(expectedChange);
    return result;
  }

  /// Verify the operation again at the state owner, including injected repositories.
  void requireChange(EventAssistanceCaseChange expectedChange) {
    final snapshot = expectedChange.snapshot;
    final serverTime = view.observedAt;
    final currentRevision = switch (view) {
      AssistanceOpenHostCase(:final revision) ||
      AssistanceClosedHostCase(:final revision) ||
      AssistanceStaleHostCase(:final revision) => revision,
      AssistanceLegacyHostCase() => null,
    };
    if (view.scope != snapshot.scope ||
        serverTime < snapshot.observedAt ||
        operationRevision != snapshot.revision + 1 ||
        currentRevision == null ||
        currentRevision < operationRevision ||
        view.receivedAt != snapshot.receivedAt ||
        view.category != snapshot.category ||
        view.sourceHash == snapshot.sourceHash) {
      throw const FormatException(
        'Help request receipt does not match the action.',
      );
    }
    final guestScope = switch (view) {
      AssistanceOpenHostCase(:final guestScope) ||
      AssistanceClosedHostCase(:final guestScope) => guestScope,
      AssistanceStaleHostCase() || AssistanceLegacyHostCase() => null,
    };
    if (guestScope != null && guestScope != snapshot.guestScope) {
      throw const FormatException('Help request guest identity changed.');
    }
    if (outcome == AssistanceCaseChangeOutcome.applied) {
      if (currentRevision != operationRevision ||
          !_matchesDecision(view, expectedChange, serverTime)) {
        throw const FormatException(
          'Applied help action returned a different result.',
        );
      }
    }
    // Replayed receipts may accompany a later resolution or stale identity.
    // Their original operation revision never replaces the current view.
  }
}

bool _matchesDecision(
  AssistanceHostCase view,
  EventAssistanceCaseChange change,
  int serverTime,
) {
  switch (change.decision) {
    case AssistanceCaseTransfer(:final managerUid):
      return view is AssistanceOpenHostCase &&
          view.assignment is AssistanceCaseAssigned &&
          (view.assignment as AssistanceCaseAssigned).managerUid ==
              managerUid &&
          (view.assignment as AssistanceCaseAssigned).authority ==
              AssistanceCaseAssignmentAuthority.current;
    case AssistanceCaseResolve():
    case AssistanceCaseDecline():
      return view is AssistanceClosedHostCase &&
          view.resolution.actorUid == change.actorUid &&
          view.resolution.at == serverTime &&
          view.resolution.outcome ==
              (change.decision is AssistanceCaseResolve
                  ? AssistanceCaseResolutionOutcome.resolved
                  : AssistanceCaseResolutionOutcome.declined);
  }
}
