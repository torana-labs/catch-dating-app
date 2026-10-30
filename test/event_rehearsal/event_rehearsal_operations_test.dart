import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  test('operation projection parses every bounded review', () {
    final snapshot = _snapshot();
    expect(
      snapshot.actors.first.requiredData!.missingFields,
      contains(RehearsalRuntimeField.gender),
    );
    expect(snapshot.outcomeReview!.unitIds, ['table-1', 'table-2']);
    expect(snapshot.revealReview!.status, RehearsalRevealStatus.idle);
    expect(snapshot.allocationReview!.assignments, hasLength(2));
    expect(snapshot.rosterReview!.importedCount, 2);
  });

  test('legacy private required-data state remains non-actionable', () {
    final actor = practiceActor();
    actor['requiredData'] = {
      'profileRevision': 0,
      'completedFieldIds': ['displayName'],
      'requestRevision': 0,
      'request': null,
    };
    expect(EventRehearsalActor.fromMap(actor).requiredData, isNull);
    actor['requiredData'] = {
      'profileRevision': 0,
      'completedFieldIds': ['displayName'],
      'requestRevision': 0,
      'request': null,
      'sourceHash': 'a' * 64,
    };
    expect(() => EventRehearsalActor.fromMap(actor), throwsFormatException);
  });

  test('operation projection rejects cross-scope state', () {
    final allocation = _wire();
    (allocation['allocationReview']! as Map<String, Object?>)['assignments'] = [
      {'attendeeId': 'actor-01', 'unitId': 'table-2'},
      {'attendeeId': 'actor-02', 'unitId': 'table-2'},
    ];
    final outcome = _wire();
    (outcome['outcomeReview']! as Map<String, Object?>)['unitIds'] = [
      'table-1',
    ];
    final roster = _wire();
    final rosterReview = roster['rosterReview']! as Map<String, Object?>;
    rosterReview['rows'] = [
      {
        'rowId': 'source-row:actor-01',
        'outcome': 'imported',
        'actorId': 'actor-01',
      },
      {'rowId': 'source-row:failed', 'outcome': 'failed', 'actorId': null},
    ];
    rosterReview['importedCount'] = 1;
    rosterReview['failedCount'] = 1;
    final requiredData = _wire();
    final actors = requiredData['actors']! as List<Map<String, Object?>>;
    (actors.first['requiredData']!
        as Map<String, Object?>)['completedFieldIds'] = [
      'unknown',
    ];

    for (final wire in [allocation, outcome, roster, requiredData]) {
      expect(
        () => EventRehearsalBootstrap.fromCallableData(wire),
        throwsFormatException,
      );
    }
  });

  test('typed changes match the control callable contract', () {
    final snapshot = _snapshot();
    final proposalSnapshot = _snapshot(proposals: [_pendingProposal()]);
    final changes = <RehearsalOperationChange>[
      RehearsalRequiredDataChange(
        snapshot: snapshot,
        actorId: 'actor-01',
        fields: {RehearsalRuntimeField.gender},
        expiresAt: DateTime.fromMillisecondsSinceEpoch(2000),
        clientActionId: 'request_data_1',
      ),
      RehearsalOutcomeChange(
        snapshot: snapshot,
        unitId: 'table-1',
        round: 0,
        outcome: const RehearsalCompletionOutcome(true),
        clientActionId: 'record_outcome_1',
      ),
      RehearsalRevealChange(
        snapshot: snapshot,
        decision: RehearsalRevealAction.startCountdown,
        decisionId: 'reveal-decision-1',
        clientActionId: 'start_reveal_1',
      ),
      RehearsalAllocationChange(
        snapshot: snapshot,
        decision: const RehearsalProposeAllocation(['actor-01'], 'table-2'),
        clientActionId: 'propose_move_1',
      ),
      RehearsalAllocationChange(
        snapshot: proposalSnapshot,
        decision: const RehearsalPublishAllocation(
          'proposal-1',
          'allocation-decision-1',
        ),
        clientActionId: 'publish_move_1',
      ),
      RehearsalRosterChange(
        snapshot: snapshot,
        clientActionId: 'reconcile_roster_1',
      ),
    ];
    final schema = JsonSchema.create(
      schemas.schemaContractsByName['ControlEventRehearsalCallablePayload']!,
    );
    for (final change in changes) {
      final validation = schema.validate(change.toJson());
      expect(
        validation.isValid,
        isTrue,
        reason: '${change.toJson()}: ${validation.errors}',
      );
      expect(
        change.toJson()['expectedSetupRevision'],
        snapshot.session.setupRevision,
      );
    }
  });

  test('immediate results prove the exact reviewed operation', () {
    final snapshot = _snapshot();
    final requiredData = RehearsalRequiredDataChange(
      snapshot: snapshot,
      actorId: 'actor-01',
      fields: {RehearsalRuntimeField.gender},
      expiresAt: DateTime.fromMillisecondsSinceEpoch(2000),
      clientActionId: 'request_data_1',
    );
    final requiredWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(requiredData, actorId: 'actor-01')],
    );
    final actors = requiredWire['actors']! as List<Map<String, Object?>>;
    actors[0]['requiredData'] = _requiredData(
      requestRevision: 1,
      request: {
        'revision': 1,
        'fieldIds': ['gender'],
        'completedFieldIds': <String>[],
        'status': 'pending',
        'requestedAt': 1000,
        'expiresAt': 2000,
        'completedAt': null,
      },
    );
    expect(
      () => requiredData.requireResult(
        EventRehearsalBootstrap.fromCallableData(requiredWire),
      ),
      returnsNormally,
    );

    final outcome = RehearsalOutcomeChange(
      snapshot: snapshot,
      unitId: 'table-1',
      round: 0,
      outcome: const RehearsalCompletionOutcome(true),
      clientActionId: 'record_outcome_1',
    );
    final outcomeWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(outcome)],
      outcomeRevision: 1,
      outcomeRecords: [
        {
          'unitId': 'table-1',
          'round': 0,
          'outcome': {'kind': 'completion', 'completed': true},
          'stateRevision': 1,
          'recordedAt': 1000,
        },
      ],
    );
    expect(
      () => outcome.requireResult(
        EventRehearsalBootstrap.fromCallableData(outcomeWire),
      ),
      returnsNormally,
    );

    final roster = RehearsalRosterChange(
      snapshot: snapshot,
      clientActionId: 'reconcile_roster_1',
    );
    final rosterWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(roster)],
      rosterStatus: 'reconciled',
      rosterRevision: 1,
      reconciledAt: 1000,
    );
    expect(
      () => roster.requireResult(
        EventRehearsalBootstrap.fromCallableData(rosterWire),
      ),
      returnsNormally,
    );

    final reveal = RehearsalRevealChange(
      snapshot: snapshot,
      decision: RehearsalRevealAction.startCountdown,
      decisionId: 'reveal-decision-1',
      clientActionId: 'start_reveal_1',
    );
    final revealWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(reveal)],
      revealStatus: 'countingDown',
      pendingRound: 0,
      startedAt: 1000,
    );
    expect(
      () => reveal.requireResult(
        EventRehearsalBootstrap.fromCallableData(revealWire),
      ),
      returnsNormally,
    );

    final propose = RehearsalAllocationChange(
      snapshot: snapshot,
      decision: const RehearsalProposeAllocation(['actor-01'], 'table-2'),
      clientActionId: 'propose_move_1',
    );
    final proposeWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(propose)],
      proposals: [_pendingProposal()],
    );
    expect(
      () => propose.requireResult(
        EventRehearsalBootstrap.fromCallableData(proposeWire),
      ),
      returnsNormally,
    );

    final proposalSnapshot = _snapshot(proposals: [_pendingProposal()]);
    final publish = RehearsalAllocationChange(
      snapshot: proposalSnapshot,
      decision: const RehearsalPublishAllocation(
        'proposal-1',
        'allocation-decision-1',
      ),
      clientActionId: 'publish_move_1',
    );
    final publishWire = _wire(
      runtimeRevision: 5,
      actionCount: 2,
      actions: [_receipt(publish)],
      allocationRevision: 1,
      proposals: [_publishedProposal()],
    );
    final publishActors = publishWire['actors']! as List<Map<String, Object?>>;
    publishActors.first['layoutUnitId'] = 'table-2';
    final publishOutcome =
        publishWire['outcomeReview']! as Map<String, Object?>;
    publishOutcome['unitIds'] = ['table-2'];
    final publishAllocation =
        publishWire['allocationReview']! as Map<String, Object?>;
    publishAllocation['unitIds'] = ['table-2'];
    publishAllocation['assignments'] = [
      {'attendeeId': 'actor-01', 'unitId': 'table-2'},
      {'attendeeId': 'actor-02', 'unitId': 'table-2'},
    ];
    expect(
      () => publish.requireResult(
        EventRehearsalBootstrap.fromCallableData(publishWire),
      ),
      returnsNormally,
    );
  });

  test('changes reject stale or unexecutable reviews before dispatch', () {
    final snapshot = _snapshot();
    expect(
      () => RehearsalOutcomeChange(
        snapshot: snapshot,
        unitId: 'table-1',
        round: 1,
        outcome: const RehearsalCompletionOutcome(true),
        clientActionId: 'record_outcome_1',
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalRequiredDataChange(
        snapshot: snapshot,
        actorId: 'actor-01',
        fields: {RehearsalRuntimeField.displayName},
        expiresAt: DateTime.fromMillisecondsSinceEpoch(2000),
        clientActionId: 'request_data_1',
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalRevealChange(
        snapshot: _snapshot(
          revealStatus: 'countingDown',
          pendingRound: 0,
          startedAt: 1000,
        ),
        decision: RehearsalRevealAction.startCountdown,
        decisionId: 'reveal-decision-1',
        clientActionId: 'start_reveal_1',
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalAllocationChange(
        snapshot: snapshot,
        decision: const RehearsalProposeAllocation(['actor-02'], 'table-2'),
        clientActionId: 'propose_move_1',
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalRosterChange(
        snapshot: _snapshot(
          rosterStatus: 'reconciled',
          rosterRevision: 1,
          reconciledAt: 1000,
        ),
        clientActionId: 'reconcile_roster_1',
      ),
      throwsFormatException,
    );
  });
}

EventRehearsalBootstrap _snapshot({
  List<Map<String, Object?>> proposals = const [],
  int allocationRevision = 0,
  String revealStatus = 'idle',
  int? pendingRound,
  int? startedAt,
  String rosterStatus = 'pending',
  int rosterRevision = 0,
  int? reconciledAt,
}) => EventRehearsalBootstrap.fromCallableData(
  _wire(
    proposals: proposals,
    allocationRevision: allocationRevision,
    revealStatus: revealStatus,
    pendingRound: pendingRound,
    startedAt: startedAt,
    rosterStatus: rosterStatus,
    rosterRevision: rosterRevision,
    reconciledAt: reconciledAt,
  ),
);

Map<String, Object?> _wire({
  int runtimeRevision = 4,
  int actionCount = 1,
  List<Map<String, Object?>> actions = const [],
  List<Map<String, Object?>> proposals = const [],
  int allocationRevision = 0,
  int outcomeRevision = 0,
  List<Map<String, Object?>> outcomeRecords = const [],
  String revealStatus = 'idle',
  int? pendingRound,
  int? startedAt,
  String rosterStatus = 'pending',
  int rosterRevision = 0,
  int? reconciledAt,
}) {
  final wire = practiceBootstrap(
    runtimeRevision: runtimeRevision,
    actionCount: actionCount,
    actions: actions,
    actors: [
      {
        ...practiceActor(),
        'layoutUnitId': 'table-1',
        'requiredData': _requiredData(),
      },
      {
        ...practiceActor(),
        'actorId': 'actor-02',
        'layoutUnitId': 'table-2',
        'requiredData': _requiredData(),
      },
    ],
  );
  final setup =
      (wire['session']! as Map<String, Object?>)['setup']!
          as Map<String, Object?>;
  setup['moduleIds'] = ['arrival', 'pods'];
  wire['outcomeReview'] = {
    'unitOutcome': 'completion',
    'revision': outcomeRevision,
    'unitIds': ['table-1', 'table-2'],
    'records': outcomeRecords,
  };
  wire['revealReview'] = {
    'revision': revealStatus == 'idle' ? 0 : 1,
    'status': revealStatus,
    'publishedRound': -1,
    'pendingRound': pendingRound,
    'startedAt': startedAt,
    'countdownSeconds': 10,
  };
  wire['allocationReview'] = {
    'revision': allocationRevision,
    'unitIds': ['table-1', 'table-2'],
    'assignments': [
      {'attendeeId': 'actor-01', 'unitId': 'table-1'},
      {'attendeeId': 'actor-02', 'unitId': 'table-2'},
    ],
    'proposals': proposals,
  };
  wire['rosterReview'] = {
    'sourceId': 'practice-roster:source-1',
    'sourceRevision': 1,
    'status': rosterStatus,
    'reconciliationRevision': rosterRevision,
    'reconciledAt': reconciledAt,
    'importedCount': 2,
    'duplicateCount': 0,
    'ambiguousCount': 0,
    'failedCount': 0,
    'rows': [
      {
        'rowId': 'source-row:actor-01',
        'outcome': 'imported',
        'actorId': 'actor-01',
      },
      {
        'rowId': 'source-row:actor-02',
        'outcome': 'imported',
        'actorId': 'actor-02',
      },
    ],
  };
  return wire;
}

Map<String, Object?> _requiredData({
  int requestRevision = 0,
  Map<String, Object?>? request,
}) => {
  'sourceHash': 'a' * 64,
  'profileRevision': 0,
  'requestRevision': requestRevision,
  'availableFieldIds': ['displayName', 'gender'],
  'completedFieldIds': ['displayName'],
  'request': request,
};

Map<String, Object?> _pendingProposal() => {
  'proposalId': 'proposal-1',
  'attendeeIds': ['actor-01'],
  'targetUnitId': 'table-2',
  'baseRevision': 0,
  'status': 'pending',
  'decisionId': null,
  'publishedRevision': null,
  'proposedAt': 1000,
  'publishedAt': null,
};

Map<String, Object?> _publishedProposal() => {
  ..._pendingProposal(),
  'status': 'published',
  'decisionId': 'allocation-decision-1',
  'publishedRevision': 1,
  'publishedAt': 1000,
};

Map<String, Object?> _receipt(
  RehearsalOperationChange change, {
  String? actorId,
}) => {
  'clientActionId': change.clientActionId,
  'actorId': actorId,
  'kind': 'control',
  'name': change.receiptName,
  'runtimeRevision': 5,
  'virtualNowMillis': 1000,
};
