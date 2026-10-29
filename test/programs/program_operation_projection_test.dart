import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operation_projection.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'program_operations_fixture.dart';

void main() {
  final now = DateTime(2026, 9, 23, 10);
  ProgramOperationOutboxEntry observation(String action) =>
      ProgramOperationOutboxEntry.legObservation(
        programId: 'program-1',
        legId: 'leg-1',
        action: action,
        expectedRevision: 7,
        clientOperationId: action,
        createdAt: now,
      );
  test(
    'a server terminal state cannot be rolled back by a saved observation',
    () {
      for (final readiness in [
        TravelLegReadiness.dispatched,
        TravelLegReadiness.arrived,
      ]) {
        final view = projectProgramArrival(
          arrivalRow(readiness: readiness),
          ProgramOperationOutboxSummary([observation('markReady')]),
        );
        expect(view.row.readiness, readiness);
        expect(view.blocked, isTrue);
        expect(view.afterObservation, isNull);
      }
    },
  );
  test('conflicts block subsequent optimistic changes to the same journey', () {
    final view = projectProgramArrival(
      arrivalRow(),
      ProgramOperationOutboxSummary([
        observation(
          'claim',
        ).copyWith(status: ProgramOperationOutboxStatus.needsReview),
        observation('markReady'),
      ]),
    );
    expect(view.blocked, isTrue);
    expect(view.row.readiness, TravelLegReadiness.expected);
    expect(view.afterObservation, isNull);
  });
  test(
    'disrupted then ready restores local readiness at its observed time',
    () {
      final view = projectProgramArrival(
        arrivalRow(),
        ProgramOperationOutboxSummary([
          observation('markDisrupted'),
          observation('markReady'),
        ]),
      );
      expect(view.row.readiness, TravelLegReadiness.ready);
      expect(view.row.curbAt, now);
      expect(view.row.curbSource, CurbSource.ready);
      expect(view.row.revision, 7);
      expect(view.afterObservation?.clientOperationId, 'markReady');
    },
  );
}
