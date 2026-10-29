import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_trip_export.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_trip_actions_controller.g.dart';

/// Trip-lifecycle mutations for the hotel desk and ledger surfaces.
/// Widgets go through this controller rather than reaching into
/// repository providers directly.
@riverpod
class ProgramTripActions extends _$ProgramTripActions {
  @override
  void build() {}

  Future<ProgramMutationResult> markArrived({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String clientOperationId,
  }) => ref
      .read(programWorkRepositoryProvider)
      .markTripArrived(
        programId: programId,
        tripId: tripId,
        expectedRevision: expectedRevision,
        clientOperationId: clientOperationId,
      );

  Future<ProgramMutationResult> voidTrip({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String reason,
    required String clientOperationId,
  }) => ref
      .read(programWorkRepositoryProvider)
      .voidTrip(
        programId: programId,
        tripId: tripId,
        expectedRevision: expectedRevision,
        reason: reason,
        clientOperationId: clientOperationId,
      );

  /// Walks the bounded ledger pages and shares the reconciliation CSV.
  Future<void> exportLedger({
    required String programId,
    required String programTitle,
    required String subject,
    int pageLimit = 20,
  }) async {
    final repository = ref.read(programWorkRepositoryProvider);
    final share = ref.read(externalShareControllerProvider);
    final trips = <ProgramTripSummary>[];
    String? cursor;
    for (var page = 0; page < pageLimit; page++) {
      final result = await repository.listTrips(programId, cursor: cursor);
      trips.addAll(result.trips);
      cursor = result.nextCursor;
      if (cursor == null) break;
    }
    final export = buildProgramTripLedgerExport(
      programId: programId,
      programTitle: programTitle,
      trips: trips,
      exportedAt: DateTime.now().toUtc(),
    );
    await share.shareCsvFile(
      csv: export.csv,
      fileName: export.fileName,
      subject: subject,
      text: subject,
    );
  }
}
