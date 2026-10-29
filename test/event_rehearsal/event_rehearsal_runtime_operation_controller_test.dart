import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operation_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_operation_controller.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final owner = eventRehearsalRuntimeOperationControllerProvider('session-1');

  setUp(() async {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    container.listen(owner, (_, _) {});
    auth.add('host-1');
    await container.pump();
  });

  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  test('an uncertain outcome round resumes the exact unit command', () async {
    final controller = container.read(owner.notifier);
    final first = controller.recordOutcomes(
      snapshot: _snapshot(),
      expectedRevision: 0,
      roundIndex: 0,
      entries: const [
        EventSuccessScoreOutcomeInput(
          unitId: 'table-1',
          unitLabel: 'Table 1',
          score: 7,
        ),
        EventSuccessScoreOutcomeInput(
          unitId: 'table-2',
          unitLabel: 'Table 2',
          score: 9,
        ),
      ],
    );
    await repository.waitForWrites(1);
    final firstChange = repository.writes[0].change as RehearsalOutcomeChange;
    repository.writes[0].result.complete(_outcomeResult(firstChange));
    await repository.waitForWrites(2);
    final uncertain = repository.writes[1].change as RehearsalOutcomeChange;
    final firstError = expectLater(first, throwsA(isA<NetworkException>()));
    repository.writes[1].result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await firstError;

    expect(container.read(owner).canRetry, isTrue);
    expect(firstChange.unitId, 'table-1');
    expect(uncertain.unitId, 'table-2');
    expect(uncertain.snapshot.outcomeReview?.revision, 1);

    final retry = controller.recordOutcomes(
      snapshot: _snapshot(),
      expectedRevision: 0,
      roundIndex: 0,
      entries: const [
        EventSuccessScoreOutcomeInput(
          unitId: 'table-1',
          unitLabel: 'Table 1',
          score: 7,
        ),
        EventSuccessScoreOutcomeInput(
          unitId: 'table-2',
          unitLabel: 'Table 2',
          score: 9,
        ),
      ],
    );
    await repository.waitForWrites(3);
    expect(repository.writes[2].change, same(uncertain));
    repository.writes[2].result.complete(_outcomeResult(uncertain));
    final result = await retry;

    expect(result.outcomeReview?.revision, 2);
    expect(result.outcomeReview?.records, hasLength(2));
    expect(container.read(owner).phase, RehearsalRuntimeOperationPhase.saved);
  });

  test('a reveal retry preserves its decision and action ids', () async {
    final controller = container.read(owner.notifier);
    final pending = controller.changeReveal(
      snapshot: _snapshot(),
      decision: RehearsalRevealAction.startCountdown,
      expectedRound: 0,
      countdownSeconds: 10,
    );
    await repository.waitForWrites(1);
    final frozen = repository.writes.single.change as RehearsalRevealChange;
    final expected = expectLater(pending, throwsA(isA<NetworkException>()));
    repository.writes.single.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await expected;

    final retry = controller.retry();
    await repository.waitForWrites(2);
    expect(repository.writes.last.change, same(frozen));
    repository.writes.last.result.complete(_revealResult(frozen));
    final result = await retry;

    expect(result.revealReview?.status, RehearsalRevealStatus.countingDown);
    expect(result.revealReview?.pendingRound, 0);
    expect(container.read(owner).phase, RehearsalRuntimeOperationPhase.saved);
  });

  test(
    'an invalid typed round is rejected before any unit is written',
    () async {
      final pending = container
          .read(owner.notifier)
          .recordOutcomes(
            snapshot: _snapshot(),
            expectedRevision: 0,
            roundIndex: 0,
            entries: const [
              EventSuccessScoreOutcomeInput(
                unitId: 'table-1',
                unitLabel: 'Table 1',
                score: 7,
              ),
              EventSuccessRankOutcomeInput(
                unitId: 'table-2',
                unitLabel: 'Table 2',
                rank: 2,
              ),
            ],
          );

      await expectLater(pending, throwsA(isA<ValidationException>()));
      expect(repository.writes, isEmpty);
    },
  );
}

final class _Write {
  _Write(this.change) : result = Completer<EventRehearsalBootstrap>();
  final RehearsalOperationChange change;
  final Completer<EventRehearsalBootstrap> result;
}

final class _Repository extends Fake implements EventRehearsalRepository {
  Completer<void> _changed = Completer<void>();
  final writes = <_Write>[];

  Future<void> waitForWrites(int count) async {
    while (writes.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventRehearsalBootstrap> applyOperation(
    RehearsalOperationChange change,
  ) {
    final write = _Write(change);
    writes.add(write);
    _changed.complete();
    _changed = Completer<void>();
    return write.result.future;
  }
}

EventRehearsalBootstrap _snapshot({
  int runtimeRevision = 4,
  int actionCount = 1,
  int outcomeRevision = 0,
  List<Map<String, Object?>> outcomeRecords = const [],
  String revealStatus = 'idle',
  int revealRevision = 0,
  int publishedRound = -1,
  int? pendingRound,
  int? startedAt,
  List<Map<String, Object?>> actions = const [],
}) => EventRehearsalBootstrap.fromCallableData(
  _wire(
    runtimeRevision: runtimeRevision,
    actionCount: actionCount,
    outcomeRevision: outcomeRevision,
    outcomeRecords: outcomeRecords,
    revealStatus: revealStatus,
    revealRevision: revealRevision,
    publishedRound: publishedRound,
    pendingRound: pendingRound,
    startedAt: startedAt,
    actions: actions,
  ),
);

Map<String, Object?> _wire({
  required int runtimeRevision,
  required int actionCount,
  required int outcomeRevision,
  required List<Map<String, Object?>> outcomeRecords,
  required String revealStatus,
  required int revealRevision,
  required int publishedRound,
  required int? pendingRound,
  required int? startedAt,
  required List<Map<String, Object?>> actions,
}) {
  final wire = practiceBootstrap(
    runtimeRevision: runtimeRevision,
    actionCount: actionCount,
    actions: actions,
    actors: [
      {...practiceActor(), 'layoutUnitId': 'table-1'},
      {...practiceActor(), 'actorId': 'actor-02', 'layoutUnitId': 'table-2'},
    ],
  );
  final setup =
      (wire['session']! as Map<String, Object?>)['setup']!
          as Map<String, Object?>;
  setup['moduleIds'] = ['pods', 'reveal'];
  setup['unitOutcome'] = 'score';
  wire['outcomeReview'] = {
    'unitOutcome': 'score',
    'revision': outcomeRevision,
    'unitIds': ['table-1', 'table-2'],
    'records': outcomeRecords,
  };
  wire['revealReview'] = {
    'revision': revealRevision,
    'status': revealStatus,
    'publishedRound': publishedRound,
    'pendingRound': pendingRound,
    'startedAt': startedAt,
    'countdownSeconds': 10,
  };
  return wire;
}

EventRehearsalBootstrap _outcomeResult(RehearsalOutcomeChange change) {
  final before = change.snapshot;
  final records = [
    for (final record in before.outcomeReview!.records)
      if (record.unitId != change.unitId || record.round != change.round)
        {
          'unitId': record.unitId,
          'round': record.round,
          'outcome': record.outcome.toJson(),
          'stateRevision': record.stateRevision,
          'recordedAt': record.recordedAt.millisecondsSinceEpoch,
        },
    {
      'unitId': change.unitId,
      'round': change.round,
      'outcome': change.outcome.toJson(),
      'stateRevision': before.outcomeReview!.revision + 1,
      'recordedAt': before.session.virtualNow.millisecondsSinceEpoch,
    },
  ];
  records.sort(
    (left, right) =>
        (left['unitId']! as String).compareTo(right['unitId']! as String),
  );
  return _snapshot(
    runtimeRevision: before.session.runtimeRevision + 1,
    actionCount: before.session.actionCount + 1,
    outcomeRevision: before.outcomeReview!.revision + 1,
    outcomeRecords: records,
    actions: [
      for (final action in before.actions) _action(action),
      _receipt(change),
    ],
  );
}

EventRehearsalBootstrap _revealResult(RehearsalRevealChange change) {
  final before = change.snapshot;
  return _snapshot(
    runtimeRevision: before.session.runtimeRevision + 1,
    actionCount: before.session.actionCount + 1,
    revealStatus: 'countingDown',
    revealRevision: before.revealReview!.revision + 1,
    pendingRound: 0,
    startedAt: before.session.virtualNow.millisecondsSinceEpoch,
    actions: [
      for (final action in before.actions) _action(action),
      _receipt(change),
    ],
  );
}

Map<String, Object?> _receipt(RehearsalOperationChange change) => {
  'clientActionId': change.clientActionId,
  'actorId': change.receiptActorId,
  'kind': 'control',
  'name': change.receiptName,
  'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
  'virtualNowMillis': change.snapshot.session.virtualNow.millisecondsSinceEpoch,
};

Map<String, Object?> _action(EventRehearsalActionRecord action) => {
  'clientActionId': action.clientActionId,
  'actorId': action.actorId,
  'kind': action.kind,
  'name': action.name,
  'runtimeRevision': action.runtimeRevision,
  'virtualNowMillis': action.virtualNow.millisecondsSinceEpoch,
};
