import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operation_projection.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';

export 'travel_leg_revision.dart';

void validateDispatchRevisionFences(
  List<String> legIds,
  List<DispatchLegRevision> fences,
) {
  if (legIds.isEmpty ||
      legIds.toSet().length != legIds.length ||
      fences.length != legIds.length ||
      fences.map((fence) => fence.legId).toSet().length != legIds.length ||
      fences.any(
        (fence) => fence.revision < 1 || !legIds.contains(fence.legId),
      )) {
    throw const ValidationException(
      'Reload the manifest before dispatching. Every passenger needs a '
      'current revision.',
      code: 'dispatch-manifest-needs-review',
    );
  }
}

/// Captures the actual roster shown to the dispatcher, including a saved view.
/// The server revalidates every revision when this immutable command replays.
List<DispatchLegRevision> captureDispatchLegRevisions(
  ProgramArrivalsRoster roster,
  List<String> legIds, {
  ProgramOperationOutboxSummary outbox = const ProgramOperationOutboxSummary(
    [],
  ),
}) {
  final rows = {for (final row in roster.rows) row.legId: row};
  final fences = <DispatchLegRevision>[];
  for (final legId in legIds) {
    final row = rows[legId];
    final projected = row == null ? null : projectProgramArrival(row, outbox);
    if (projected?.blocked == true) {
      throw const ValidationException(
        'Review this journey before dispatch.',
        code: 'program-operation-needs-review',
      );
    }
    if (row == null || projected?.row.readiness != TravelLegReadiness.ready) {
      throw const ValidationException(
        'Every passenger must be marked ready before the vehicle departs. '
        'Refresh the arrivals roster after the waiting guests reach the curb.',
        code: 'dispatch-passengers-not-ready',
      );
    }
    fences.add(
      DispatchLegRevision(
        legId: legId,
        revision: row.revision,
        afterObservation: projected!.afterObservation,
      ),
    );
  }
  validateDispatchRevisionFences(legIds, fences);
  return fences;
}
