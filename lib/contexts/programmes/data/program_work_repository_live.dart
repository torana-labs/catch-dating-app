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

/// The departures desk, live from `programDepartureViews` (#1339).
@riverpod
Future<ProgramReadView<ProgramDeparturesRoster>> programDeparturesRosterView(
  Ref ref,
  String programId,
  String hotelId,
) async => (
  value: await ref.watch(
    programDeparturesStreamProvider(programId, hotelId).future,
  ),
  snapshotAt: null,
  snapshotExpiresAt: null,
);

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
