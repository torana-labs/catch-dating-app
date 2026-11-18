part of 'program_work_repository.dart';

/// The live weekend: the live board read and alert resolution. Split into
/// a part file so the work repository stays under the handwritten-source
/// size budget; `_call` remains library-private.
extension ProgramLiveRepositoryApi on ProgramWorkRepository {
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

/// One hotel's departures, saved for offline cold starts.
extension ProgramDeparturesRepositoryApi on ProgramWorkRepository {
  Future<ProgramDeparturesRoster> getDeparturesRoster({
    required String programId,
    required String hotelId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramDeparturesRoster',
    authorityScopedRead: true,
    payload: GetProgramDeparturesRosterCallableRequest(
      programId: programId,
      hotelId: hotelId,
    ).toJson(),
    action: 'load the departures',
    parse: ProgramDeparturesRoster.fromCallableData,
    snapshotScope: programSnapshotScope('departures', programId, hotelId),
    snapshotAccountId: snapshotAccountId,
  );
}

/// The departures desk, from the live read or a bounded offline snapshot.
@riverpod
Future<ProgramReadView<ProgramDeparturesRoster>> programDeparturesRosterView(
  Ref ref,
  String programId,
  String hotelId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('departures', programId, hotelId),
    () => ref
        .read(programWorkRepositoryProvider)
        .getDeparturesRoster(
          programId: programId,
          hotelId: hotelId,
          snapshotAccountId: accountId,
        ),
    ProgramDeparturesRoster.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}

/// The live board (#1339): function labels, the alerts this account may
/// read and the travel counts through listeners, gated on the account's
/// authority, with the schedule phased by the app clock.
@riverpod
Future<ProgramReadView<ProgramLiveBoard>> programLiveBoardView(
  Ref ref,
  String programId,
) async {
  final board = await ref.watch(
    programLiveBoardStreamProvider(programId).future,
  );
  return (value: board, snapshotAt: null, snapshotExpiresAt: null);
}
