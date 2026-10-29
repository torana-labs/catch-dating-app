import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_checkpoint_management_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  test('backend fixtures decode every checkpoint management state', () {
    for (final entry in {
      'departed': AssistanceCheckpointCloseoutKind.open,
      'reassigned': AssistanceCheckpointCloseoutKind.open,
      'partial': AssistanceCheckpointCloseoutKind.open,
      'resolved': AssistanceCheckpointCloseoutKind.open,
      'closed': AssistanceCheckpointCloseoutKind.closedOut,
      'needsReview': AssistanceCheckpointCloseoutKind.needsReview,
      'reopened': AssistanceCheckpointCloseoutKind.reopened,
      'complete': AssistanceCheckpointCloseoutKind.superseded,
    }.entries) {
      final r = managementReview(entry.key);
      expect(
        r.checkpoint!.closeout.value!.state.kind,
        entry.value,
        reason: entry.key,
      );
      expect(
        r.selected!.toJson(),
        movementObjectAt(managementBootstrap(entry.key), [
          'movementReview',
          'selected',
        ]),
        reason: entry.key,
      );
    }
  });
  test(
    'reassignment retains the original owner and deadline as departure evidence',
    () {
      final original = managementReview('departed');
      final next = managementReview('reassigned');
      expect(
        next.selected!.departure.toJson(),
        original.selected!.departure.toJson(),
      );
      expect(
        next.selected!.departure.checkpointRequest!.responsibleOperatorId,
        'host-2',
      );
      expect(next.checkpoint!.request!.responsibleOperatorId, 'host-1');
      expect(next.checkpoint!.sourceHash, original.checkpoint!.sourceHash);
      expect(
        next.checkpoint!.assignment.value!.change!.operationId,
        'assignment_0001',
      );
      expect(next.checkpoint!.request!.dueAt, 61000);
    },
  );
  test(
    'closeout retains partial arrival evidence and the resolved exception',
    () {
      final closed = managementReview('closed');
      final partial = managementReview('partial');
      expect(
        closed.checkpoint!.report!.toJson(),
        partial.checkpoint!.report!.toJson(),
      );
      expect(closed.checkpoint!.sourceHash, partial.checkpoint!.sourceHash);
      expect(
        closed.checkpoint!.request!.state,
        AssistanceCheckpointRequestState.closedOut,
      );
      final decision =
          closed.selected!.closeout!.decision as RehearsalCheckpointClosed;
      expect(decision.report.accountedFor, ['actor-01']);
      expect(decision.dispositions.keys, ['actor-02']);
      expect(
        managementReview('resolved').checkpoint!.closeout.value!.eligibility,
        isA<AssistanceCheckpointCloseoutReady>(),
      );
      expect(
        managementReview('reopened').checkpoint!.request!.state,
        AssistanceCheckpointRequestState.discrepancy,
      );
    },
  );
  test(
    'missing legacy metadata stays distinct from an explicit absent request',
    () {
      final raw = managementBootstrap('departed');
      final checkpoint = movementObjectAt(raw, [
        'movementReview',
        'checkpoint',
      ]);
      checkpoint.remove('reporterOptions');
      checkpoint.remove('assignment');
      checkpoint.remove('closeout');
      final legacy = EventRehearsalBootstrap.fromCallableData(
        raw,
      ).movementReview!;
      expect(legacy.checkpoint!.assignment.isProvided, isFalse);
      expect(legacy.checkpoint!.closeout.isProvided, isFalse);
      final omitted = movementReview('omitted');
      expect(omitted.checkpoint!.assignment.isProvided, isTrue);
      expect(omitted.checkpoint!.assignment.value, isNull);
    },
  );
  for (final (index, mutate) in <void Function(Map<String, Object?>)>[
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
      'request',
    ])['responsibleOperatorId'] = 'host-2',
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
      'assignment',
    ])['revision'] = 2,
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
      'closeout',
    ])['state'] = {'kind': 'reopened'},
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
      'closeout',
    ])['eligibility'] = {'kind': 'ready'},
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
    ]).remove('closeout'),
    (r) => movementObjectAt(r, [
      'movementReview',
      'checkpoint',
      'closeout',
      'change',
      'decision',
      'report',
    ])['accountedFor'] = ['actor-01', 'actor-02'],
  ].indexed) {
    test('contradictory management projections fail closed $index', () {
      final raw = managementBootstrap('closed');
      mutate(raw);
      expect(
        () => EventRehearsalBootstrap.fromCallableData(raw),
        throwsFormatException,
      );
    });
  }
  test('a changed resolution cannot keep the old closeout closed', () {
    final raw = managementBootstrap('needsReview');
    movementObjectAt(raw, [
      'movementReview',
      'checkpoint',
      'closeout',
    ])['state'] = {
      'kind': 'closedOut',
    };
    expect(
      () => EventRehearsalBootstrap.fromCallableData(raw),
      throwsFormatException,
    );
  });
}
