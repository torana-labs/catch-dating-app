import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';

/// One immutable Host decision against an exact rehearsal projection.
sealed class RehearsalOperationChange {
  RehearsalOperationChange({
    required this.snapshot,
    required this.clientActionId,
    required this.action,
    required this.receiptName,
  }) {
    final session = snapshot.session;
    if (snapshot.staffReview?.isManager == false ||
        session.actionCount >= 500 ||
        session.runtimeRevision >= 2147483647 ||
        !_clientAction.hasMatch(clientActionId)) {
      throw const FormatException(
        'Review this operation as the rehearsal Host.',
      );
    }
  }

  final EventRehearsalBootstrap snapshot;
  final String clientActionId;
  final String action;
  final String receiptName;

  Map<String, Object?> get command;
  String? get receiptActorId => null;

  Map<String, Object?> toJson() => ControlEventRehearsalCallableRequest(
    sessionId: snapshot.session.id,
    expectedRevision: snapshot.session.runtimeRevision,
    expectedSetupRevision: snapshot.session.setupRevision,
    clientActionId: clientActionId,
    action: action,
    requiredData: action == 'requiredData' ? command : null,
    outcome: action == 'outcome' ? command : null,
    reveal: action == 'reveal' ? command : null,
    allocation: action == 'allocation' ? command : null,
    roster: action == 'roster' ? command : null,
  ).toJson();

  void requireResult(EventRehearsalBootstrap result) {
    _requireReceipt(result);
    if (result.session.runtimeRevision ==
        snapshot.session.runtimeRevision + 1) {
      requireImmediateResult(result);
    }
  }

  void requireImmediateResult(EventRehearsalBootstrap result);

  void _requireReceipt(EventRehearsalBootstrap result) {
    final before = snapshot.session;
    final receipts = result.actions.where(
      (record) => record.clientActionId == clientActionId,
    );
    if (result.session.id != before.id ||
        result.session.organizerId != before.organizerId ||
        result.session.setupRevision != before.setupRevision ||
        result.session.runtimeRevision <= before.runtimeRevision ||
        result.session.actionCount <= before.actionCount ||
        result.session.virtualNow.isBefore(before.virtualNow) ||
        receipts.length != 1 ||
        receipts.single.actorId != receiptActorId ||
        receipts.single.kind != 'control' ||
        receipts.single.name != receiptName ||
        receipts.single.runtimeRevision != before.runtimeRevision + 1 ||
        receipts.single.virtualNow != before.virtualNow ||
        result.session.runtimeRevision == before.runtimeRevision + 1 &&
            (result.session.actionCount != before.actionCount + 1 ||
                result.session.status != before.status ||
                result.session.virtualNow != before.virtualNow)) {
      throw const FormatException(
        'Practice response does not confirm this operation.',
      );
    }
  }
}

final class RehearsalRequiredDataChange extends RehearsalOperationChange {
  RehearsalRequiredDataChange({
    required super.snapshot,
    required this.actorId,
    required Set<RehearsalRuntimeField> fields,
    required this.expiresAt,
    required super.clientActionId,
  }) : fields = Set.unmodifiable(fields),
       super(action: 'requiredData', receiptName: 'requiredData:request') {
    final session = snapshot.session;
    final actor = snapshot.actors.where((item) => item.actorId == actorId);
    final review = actor.firstOrNull?.requiredData;
    final eventEnd = session.virtualStartedAt?.add(
      Duration(minutes: session.setup.durationMinutes),
    );
    if (!_active(session) ||
        actor.length != 1 ||
        review == null ||
        this.fields.isEmpty ||
        this.fields.length != fields.length ||
        !review.missingFields.containsAll(this.fields) ||
        eventEnd == null ||
        !expiresAt.isAfter(session.virtualNow) ||
        expiresAt.isAfter(eventEnd)) {
      throw const FormatException('Review the missing fields and deadline.');
    }
  }

  final String actorId;
  final Set<RehearsalRuntimeField> fields;
  final DateTime expiresAt;

  RehearsalRequiredDataReview get _review => snapshot.actors
      .singleWhere((actor) => actor.actorId == actorId)
      .requiredData!;

  @override
  String get receiptActorId => actorId;

  @override
  Map<String, Object?> get command => {
    'attendeeId': actorId,
    'fieldIds': RehearsalRuntimeField.values
        .where(fields.contains)
        .map((field) => field.name)
        .toList(growable: false),
    'expiresAt': expiresAt.millisecondsSinceEpoch,
    'expectedProfileRevision': _review.profileRevision,
    'expectedRequestRevision': _review.requestRevision,
    'expectedSourceHash': _review.sourceHash,
  };

  @override
  void requireImmediateResult(EventRehearsalBootstrap result) {
    final next = result.actors
        .where((actor) => actor.actorId == actorId)
        .firstOrNull
        ?.requiredData;
    final request = next?.request;
    if (next == null ||
        request == null ||
        next.profileRevision != _review.profileRevision ||
        next.requestRevision != _review.requestRevision + 1 ||
        request.revision != next.requestRevision ||
        request.status != RehearsalRequiredDataStatus.pending ||
        request.requestedAt != snapshot.session.virtualNow ||
        request.expiresAt != expiresAt ||
        !_sameSet(request.fields, fields) ||
        request.completedFields.isNotEmpty) {
      throw const FormatException('Practice data request changed.');
    }
  }
}

final class RehearsalOutcomeChange extends RehearsalOperationChange {
  RehearsalOutcomeChange({
    required super.snapshot,
    required this.unitId,
    required this.round,
    required this.outcome,
    required super.clientActionId,
  }) : super(action: 'outcome', receiptName: 'outcome:record') {
    final review = snapshot.outcomeReview;
    final rank = outcome is RehearsalRankOutcome
        ? (outcome as RehearsalRankOutcome).rank
        : null;
    final matchingRecord = review?.records.where(
      (record) => record.unitId == unitId && record.round == round,
    );
    final roundExists = review?.records.any((record) => record.round == round);
    final nextRound = review == null || review.records.isEmpty
        ? 0
        : review.records
                  .map((record) => record.round)
                  .reduce((left, right) => left > right ? left : right) +
              1;
    final previousRoundComplete =
        round == 0 ||
        review != null &&
            review.unitIds.every(
              (id) => review.records.any(
                (record) => record.round == round - 1 && record.unitId == id,
              ),
            );
    if (!snapshot.session.hasStarted ||
        review == null ||
        review.kind == RehearsalOutcomeKind.none ||
        review.revision >= 2147483647 ||
        review.records.length >= 500 && matchingRecord!.isEmpty ||
        !review.unitIds.contains(unitId) ||
        round < 0 ||
        round > 10000 ||
        roundExists == false &&
            (round != nextRound || !previousRoundComplete) ||
        outcome.kind != review.kind ||
        rank != null &&
            (rank != rank.roundToDouble() ||
                rank < 1 ||
                rank > review.unitIds.length ||
                review.records.any(
                  (record) =>
                      record.round == round &&
                      record.unitId != unitId &&
                      record.outcome is RehearsalRankOutcome &&
                      (record.outcome as RehearsalRankOutcome).rank == rank,
                ))) {
      throw const FormatException('Review the practice unit outcome.');
    }
  }

  final String unitId;
  final int round;
  final RehearsalOutcomeValue outcome;

  @override
  Map<String, Object?> get command => {
    'unitId': unitId,
    'round': round,
    'outcome': outcome.toJson(),
    'expectedOutcomeRevision': snapshot.outcomeReview!.revision,
  };

  @override
  void requireImmediateResult(EventRehearsalBootstrap result) {
    final before = snapshot.outcomeReview!;
    final next = result.outcomeReview;
    final records = next?.records.where(
      (record) => record.unitId == unitId && record.round == round,
    );
    if (next == null ||
        next.kind != before.kind ||
        next.revision != before.revision + 1 ||
        records?.length != 1 ||
        records!.single.stateRevision != next.revision ||
        records.single.recordedAt != snapshot.session.virtualNow ||
        !_sameOutcome(records.single.outcome, outcome)) {
      throw const FormatException('Practice outcome changed.');
    }
  }
}

final class RehearsalRevealChange extends RehearsalOperationChange {
  RehearsalRevealChange({
    required super.snapshot,
    required this.decision,
    required this.decisionId,
    required super.clientActionId,
  }) : super(action: 'reveal', receiptName: 'reveal:${decision.name}') {
    final review = snapshot.revealReview;
    final needsNextRound =
        decision != RehearsalRevealAction.cancelPending &&
        review?.status != RehearsalRevealStatus.countingDown;
    if (!_active(snapshot.session) ||
        review == null ||
        review.revision >= 2147483647 ||
        !_decisionId.hasMatch(decisionId) ||
        needsNextRound && review.publishedRound >= 100 ||
        decision == RehearsalRevealAction.startCountdown &&
            review.status == RehearsalRevealStatus.countingDown ||
        decision == RehearsalRevealAction.cancelPending &&
            review.status != RehearsalRevealStatus.countingDown) {
      throw const FormatException('Review the current reveal state.');
    }
  }

  final RehearsalRevealAction decision;
  final String decisionId;

  @override
  Map<String, Object?> get command => {
    'action': decision.name,
    'expectedLiveRevision': snapshot.revealReview!.revision,
    'decisionId': decisionId,
  };

  @override
  void requireImmediateResult(EventRehearsalBootstrap result) {
    final before = snapshot.revealReview!;
    final next = result.revealReview;
    if (next == null ||
        next.revision < before.revision ||
        next.revision > before.revision + 1) {
      throw const FormatException('Practice reveal changed.');
    }
    if (next.revision == before.revision) return;
    final matches = switch (decision) {
      RehearsalRevealAction.startCountdown =>
        next.status == RehearsalRevealStatus.countingDown &&
            next.pendingRound == before.publishedRound + 1 &&
            next.startedAt == snapshot.session.virtualNow,
      RehearsalRevealAction.cancelPending =>
        next.pendingRound == null &&
            next.startedAt == null &&
            next.status ==
                (before.publishedRound >= 0
                    ? RehearsalRevealStatus.revealed
                    : RehearsalRevealStatus.idle),
      RehearsalRevealAction.publish =>
        next.status == RehearsalRevealStatus.revealed &&
            next.pendingRound == null &&
            next.startedAt == null &&
            next.publishedRound ==
                (before.pendingRound ?? before.publishedRound + 1),
    };
    if (!matches) throw const FormatException('Practice reveal changed.');
  }
}

sealed class RehearsalAllocationDecision {
  const RehearsalAllocationDecision();
  String get kind;
  Map<String, Object?> toJson(RehearsalAllocationReview review);
}

final class RehearsalProposeAllocation extends RehearsalAllocationDecision {
  const RehearsalProposeAllocation(this.attendeeIds, this.targetUnitId);
  final List<String> attendeeIds;
  final String targetUnitId;
  @override
  String get kind => 'propose';
  @override
  Map<String, Object?> toJson(RehearsalAllocationReview review) => {
    'kind': kind,
    'attendeeIds': attendeeIds,
    'targetUnitId': targetUnitId,
    'expectedAllocationRevision': review.revision,
  };
}

final class RehearsalPublishAllocation extends RehearsalAllocationDecision {
  const RehearsalPublishAllocation(this.proposalId, this.decisionId);
  final String proposalId;
  final String decisionId;
  @override
  String get kind => 'publish';
  @override
  Map<String, Object?> toJson(RehearsalAllocationReview review) => {
    'kind': kind,
    'proposalId': proposalId,
    'decisionId': decisionId,
  };
}

final class RehearsalAllocationChange extends RehearsalOperationChange {
  RehearsalAllocationChange({
    required super.snapshot,
    required this.decision,
    required super.clientActionId,
  }) : super(action: 'allocation', receiptName: 'allocation:${decision.kind}') {
    final review = snapshot.allocationReview;
    if (!_active(snapshot.session) || review == null) {
      throw const FormatException('Review the current practice assignments.');
    }
    switch (decision) {
      case RehearsalProposeAllocation(:final attendeeIds, :final targetUnitId):
        final selected = attendeeIds.toSet();
        final actors = snapshot.actors.where(
          (actor) => selected.contains(actor.actorId),
        );
        final targetCount = snapshot.actors
            .where(
              (actor) =>
                  actor.layoutUnitId == targetUnitId &&
                  !selected.contains(actor.actorId),
            )
            .length;
        if (attendeeIds.isEmpty ||
            attendeeIds.length > 50 ||
            selected.length != attendeeIds.length ||
            actors.length != attendeeIds.length ||
            !review.unitIds.contains(targetUnitId) ||
            actors.every((actor) => actor.layoutUnitId == targetUnitId) ||
            actors.any(
              (actor) =>
                  actor.optedOut ||
                  const {
                    EventRehearsalActorStatus.noShow,
                    EventRehearsalActorStatus.departed,
                    EventRehearsalActorStatus.ambiguousClaim,
                  }.contains(actor.status),
            ) ||
            targetCount + actors.length > 4 ||
            review.proposals.length >= 100) {
          throw const FormatException(
            'Review the proposed practice allocation.',
          );
        }
      case RehearsalPublishAllocation(:final proposalId, :final decisionId):
        if (!_decisionId.hasMatch(proposalId) ||
            !_decisionId.hasMatch(decisionId) ||
            !review.proposals.any(
              (proposal) =>
                  proposal.id == proposalId &&
                  proposal.status ==
                      RehearsalAllocationProposalStatus.pending &&
                  proposal.baseRevision == review.revision,
            )) {
          throw const FormatException(
            'Review the current allocation proposal.',
          );
        }
    }
  }

  final RehearsalAllocationDecision decision;

  @override
  Map<String, Object?> get command =>
      decision.toJson(snapshot.allocationReview!);

  @override
  void requireImmediateResult(EventRehearsalBootstrap result) {
    final before = snapshot.allocationReview!;
    final next = result.allocationReview;
    if (next == null) {
      throw const FormatException('Practice allocation changed.');
    }
    switch (decision) {
      case RehearsalProposeAllocation(:final attendeeIds, :final targetUnitId):
        final additions = next.proposals.where(
          (proposal) => !before.proposals.any((old) => old.id == proposal.id),
        );
        if (next.revision != before.revision ||
            next.proposals.length != before.proposals.length + 1 ||
            additions.length != 1 ||
            !_sameSet(
              additions.single.attendeeIds.toSet(),
              attendeeIds.toSet(),
            ) ||
            additions.single.targetUnitId != targetUnitId ||
            additions.single.baseRevision != before.revision ||
            additions.single.status !=
                RehearsalAllocationProposalStatus.pending ||
            additions.single.proposedAt != snapshot.session.virtualNow) {
          throw const FormatException('Practice allocation proposal changed.');
        }
      case RehearsalPublishAllocation(:final proposalId, :final decisionId):
        final proposal = next.proposals.where((item) => item.id == proposalId);
        if (next.revision != before.revision + 1 ||
            proposal.length != 1 ||
            proposal.single.status !=
                RehearsalAllocationProposalStatus.published ||
            proposal.single.decisionId != decisionId ||
            proposal.single.publishedRevision != next.revision ||
            proposal.single.publishedAt != snapshot.session.virtualNow ||
            proposal.single.attendeeIds.any(
              (id) => !result.actors.any(
                (actor) =>
                    actor.actorId == id &&
                    actor.layoutUnitId == proposal.single.targetUnitId,
              ),
            )) {
          throw const FormatException(
            'Practice allocation publication changed.',
          );
        }
    }
  }
}

final class RehearsalRosterChange extends RehearsalOperationChange {
  RehearsalRosterChange({
    required super.snapshot,
    required super.clientActionId,
  }) : super(action: 'roster', receiptName: 'roster:reconcile') {
    final review = snapshot.rosterReview;
    if (review == null ||
        review.status != RehearsalRosterStatus.pending ||
        snapshot.session.status == EventRehearsalStatus.complete ||
        snapshot.session.status == EventRehearsalStatus.expired ||
        review.reconciliationRevision >= 2147483647) {
      throw const FormatException('Review the committed practice roster.');
    }
  }

  RehearsalRosterReview get _review => snapshot.rosterReview!;

  @override
  Map<String, Object?> get command => {
    'sourceId': _review.sourceId,
    'sourceRevision': _review.sourceRevision,
  };

  @override
  void requireImmediateResult(EventRehearsalBootstrap result) {
    final next = result.rosterReview;
    if (next == null ||
        next.sourceId != _review.sourceId ||
        next.sourceRevision != _review.sourceRevision ||
        next.status != RehearsalRosterStatus.reconciled ||
        next.reconciliationRevision != _review.reconciliationRevision + 1 ||
        next.reconciledAt != snapshot.session.virtualNow ||
        next.importedCount != _review.importedCount ||
        next.duplicateCount != _review.duplicateCount ||
        next.ambiguousCount != _review.ambiguousCount ||
        next.failedCount != _review.failedCount) {
      throw const FormatException('Practice roster reconciliation changed.');
    }
  }
}

bool _active(EventRehearsalSession session) =>
    session.status == EventRehearsalStatus.running ||
    session.status == EventRehearsalStatus.paused;

bool _sameSet<T>(Set<T> left, Set<T> right) =>
    left.length == right.length && left.containsAll(right);

bool _sameOutcome(RehearsalOutcomeValue left, RehearsalOutcomeValue right) {
  if (left.runtimeType != right.runtimeType) return false;
  return switch ((left, right)) {
    (RehearsalCompletionOutcome a, RehearsalCompletionOutcome b) =>
      a.completed == b.completed,
    (RehearsalScoreOutcome a, RehearsalScoreOutcome b) => a.score == b.score,
    (RehearsalRankOutcome a, RehearsalRankOutcome b) => a.rank == b.rank,
    _ => false,
  };
}

final RegExp _clientAction = RegExp(r'^[A-Za-z0-9_-]{8,120}$');
final RegExp _decisionId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$');
