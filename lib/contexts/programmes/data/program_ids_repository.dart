part of 'program_work_repository.dart';

/// Guest IDs for the hotels: the planner's tracker and its decisions.
/// The tracker is never saved for offline use: it carries ID details and
/// image links that expire within minutes.
extension ProgramIdsRepositoryApi on ProgramWorkRepository {
  Future<ProgramIdTracker> listIdTracker({
    required String programId,
    String? hotelId,
  }) => _call(
    name: 'listProgramIdTracker',
    payload: ListProgramIdTrackerCallableRequest(
      programId: programId,
      hotelId: hotelId,
    ).toJson(),
    action: 'load the guest IDs',
    parse: ProgramIdTracker.fromCallableData,
  );

  /// Accepts an ID or asks the household for a clearer one, fenced by the
  /// row's revision. [requestId] makes a retried tap return the stored
  /// result.
  Future<ProgramGuestIdResult> decideGuestId({
    required String programId,
    required ProgramIdTrackerRow row,
    required ProgramGuestIdDecision decision,
    required String requestId,
    String? note,
  }) => _call(
    name: 'decideProgramGuestId',
    payload: DecideProgramGuestIdCallableRequest(
      programId: programId,
      guestId: row.guestId,
      decision: decision.name,
      note: note,
      expectedRevision: row.revision,
      requestId: requestId,
    ).toJson(),
    action: 'update the guest ID',
    parse: ProgramGuestIdResult.fromCallableData,
  );
}

/// The ID tracker for one programme, optionally one hotel.
@riverpod
Future<ProgramIdTracker> programIdTracker(
  Ref ref,
  String programId,
  String? hotelId,
) {
  _watchWorkAccount(ref);
  return ref
      .read(programWorkRepositoryProvider)
      .listIdTracker(programId: programId, hotelId: hotelId);
}
