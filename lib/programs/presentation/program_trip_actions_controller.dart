import 'package:catch_dating_app/contexts/programmes/data/program_transport_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_trip_export.dart';
import 'package:catch_platform/device/external_share.dart';
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

  /// Shares the reconciliation CSV of the live trip ledger the account reads.
  Future<void> exportLedger({
    required String programId,
    required String programTitle,
    required String subject,
  }) async {
    final share = ref.read(externalShareControllerProvider);
    final ledger = await ref.read(programTripsStreamProvider(programId).future);
    final trips = ledger.trips;
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
