import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_checkpoint_management_fixtures.dart';
import '../event_rehearsal/event_rehearsal_movement_fixtures.dart';
import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_fixtures.dart';

void main() {
  test('only a reviewed candidate can become the new reporter', () {
    expect(requestChange(decision: reassignReporter).isReassignment, isTrue);
    expect(
      () => requestChange(
        decision: ReassignCheckpointReporter(
          reporterId: 'unknown',
          reason: 'Shift changed',
        ),
      ),
      throwsFormatException,
    );
    final wire = requestReadyWire();
    checkpointBody(wire).remove('reporterOptions');
    final legacy = requestReview(wire: wire);
    expect(legacy.canClose, isTrue);
    expect(legacy.canReassign, isFalse);
    expect(legacy.checkpoint.reporterOptions.isProvided, isFalse);
    checkpointBody(wire)['reporterOptions'] = null;
    expect(
      requestReview(wire: wire).checkpoint.reporterOptions.isProvided,
      isTrue,
    );
    expect(requestReview(wire: wire).canReassign, isFalse);
  });
  final mutations = <void Function(Map)>[
    (m) => m['actorUid'] = 'other',
    (m) => m['sourceHash'] = 'b' * 64,
    (m) => m['validUntil'] = 1000,
    (m) => m['validUntil'] = 9007199254740991,
    (m) => (m['reporters'] as List).add((m['reporters'] as List).first),
    (m) => ((m['reporters'] as List).last as Map)['validUntil'] = 1000,
    (m) => ((m['reporters'] as List).last as Map)['operatorId'] = 'bad/id',
    (m) => ((m['reporters'] as List).last as Map)['phone'] = 'private',
  ];
  for (final (index, mutate) in mutations.indexed) {
    test('invalid reporter choice evidence fails closed $index', () {
      final wire = checkpointCopy(requestReadyWire());
      mutate(checkpointBody(wire)['reporterOptions'] as Map);
      expect(() => requestReview(wire: wire), throwsFormatException);
    });
  }
  test('candidate duty must extend strictly beyond the original deadline', () {
    final wire = checkpointCopy(requestReadyWire());
    final body = checkpointBody(wire);
    (((body['reporterOptions'] as Map)['reporters'] as List).last
            as Map)['validUntil'] =
        (body['request'] as Map)['dueAt'];
    expect(() => requestReview(wire: wire), throwsFormatException);
  });
  test('practice choices bind the manager and original assignment', () {
    final review = managementReview('departed');
    expect(RehearsalCheckpointRequestPermissions(review).canReassign, isTrue);
    expect(
      review.checkpoint!.reporterOptions.value!.contains('host-1'),
      isTrue,
    );
    final raw = managementBootstrap('departed');
    movementObjectAt(raw, [
      'movementReview',
      'checkpoint',
      'reporterOptions',
    ])['actorUid'] = 'other';
    expect(
      () => EventRehearsalBootstrap.fromCallableData(raw),
      throwsFormatException,
    );
  });
  test('legacy practice metadata cannot enable an arbitrary reporter', () {
    final raw = managementBootstrap('departed');
    movementObjectAt(raw, [
      'movementReview',
      'checkpoint',
    ]).remove('reporterOptions');
    final review = EventRehearsalBootstrap.fromCallableData(
      raw,
    ).movementReview!;
    expect(RehearsalCheckpointRequestPermissions(review).canReassign, isFalse);
  });
}
