part of 'program_work_repository.dart';

/// The live weekend: the live board read and alert resolution. Split into
/// a part file so the work repository stays under the handwritten-source
/// size budget; `_call` remains library-private.
extension ProgramLiveRepositoryApi on ProgramWorkRepository {
  /// The live board for the caller's duties, saved for offline cold starts
  /// like the other staff projections.
  Future<ProgramLiveBoard> getLiveBoard({
    required String programId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramLiveBoard',
    authorityScopedRead: true,
    payload: GetProgramLiveBoardCallableRequest(programId: programId).toJson(),
    action: 'load the live board',
    parse: ProgramLiveBoard.fromCallableData,
    snapshotScope: programSnapshotScope('live', programId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Takes, finishes or reopens one alert, fenced by its revision.
  /// [requestId] makes a retried tap return the stored result.
  Future<ProgramAlertResolution> resolveAlert({
    required String programId,
    required ProgramLiveAlert alert,
    required ProgramAlertAction action,
    required String requestId,
  }) => _call(
    name: 'resolveProgramAlert',
    payload: ResolveProgramAlertCallableRequest(
      programId: programId,
      alertId: alert.alertId,
      action: action.name,
      expectedRevision: alert.revision,
      requestId: requestId,
    ).toJson(),
    action: 'update the alert',
    parse: ProgramAlertResolution.fromCallableData,
  );
}

/// The live board, from the live read or a bounded offline snapshot.
@riverpod
Future<ProgramReadView<ProgramLiveBoard>> programLiveBoardView(
  Ref ref,
  String programId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('live', programId),
    () => ref
        .read(programWorkRepositoryProvider)
        .getLiveBoard(programId: programId, snapshotAccountId: accountId),
    ProgramLiveBoard.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}
