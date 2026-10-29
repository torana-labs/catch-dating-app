part of 'program_work_repository.dart';

/// Door-check-in surface: function-scoped roster reads, journal writes and
/// walk-in creation. Split into a part file so the work repository stays
/// under the handwritten-source size budget; `_call` remains library-private.
extension ProgramDoorRepositoryApi on ProgramWorkRepository {
  /// Function-scoped door roster: header, invited/walked-in guests, recent
  /// journal entries and live counts. Contact fields never leave the server.
  Future<ProgramDoorView> getFunctionDoorView({
    required String programId,
    required String functionId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramFunctionDoorView',
    authorityScopedRead: true,
    payload: ProgramFunctionScopeCallableRequest(
      programId: programId,
      functionId: functionId,
    ).toJson(),
    action: 'load the door roster',
    parse: ProgramDoorView.fromCallableData,
    snapshotScope: programSnapshotScope('door', programId, functionId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Records one batch of door journal operations. Journal ids derive
  /// server-side from the operation payload, so outbox replays of the same
  /// entry land as duplicates instead of double writes.
  Future<ProgramDoorJournalBatch> recordDoorJournal({
    required String programId,
    required String functionId,
    required List<Map<String, Object?>> operations,
  }) => _call(
    name: 'recordProgramDoorJournal',
    payload: RecordProgramDoorJournalCallableRequest(
      programId: programId,
      functionId: functionId,
      operations: operations,
    ).toJson(),
    action: 'record door activity',
    parse: ProgramDoorJournalBatch.fromCallableData,
  );

  /// Creates a walk-in guest record and its check-in journal entry in one
  /// transaction. Retries share the derived guest id via clientOperationId.
  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    int? partySize,
    String? note,
    String? deviceId,
    required String clientOperationId,
  }) => _call(
    name: 'createProgramWalkIn',
    payload: CreateProgramWalkInCallableRequest(
      programId: programId,
      functionId: functionId,
      displayName: displayName,
      occurredAtMillis: occurredAt.millisecondsSinceEpoch,
      partySize: partySize,
      note: note,
      deviceId: deviceId,
      clientOperationId: clientOperationId,
    ).toJson(),
    action: 'register the walk-in',
    parse: ProgramMutationResult.fromCallableData,
  );
}

@riverpod
Future<ProgramDoorView> programFunctionDoorView(
  Ref ref,
  String programId,
  String functionId,
) {
  final accountId = _watchWorkAccount(ref);
  return ref
      .read(programWorkRepositoryProvider)
      .getFunctionDoorView(
        programId: programId,
        functionId: functionId,
        snapshotAccountId: accountId,
      );
}

@riverpod
Future<ProgramReadView<ProgramDoorView>> programFunctionDoorViewWithSnapshot(
  Ref ref,
  String programId,
  String functionId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('door', programId, functionId),
    () => ref.watch(
      programFunctionDoorViewProvider(programId, functionId).future,
    ),
    ProgramDoorView.fromCallableData,
    allowsAccess: (access) => canReadProgramFunction(
      access,
      functionId,
      now: ref.read(programProjectionClockProvider)(),
      forSnapshot: true,
    ),
    onAuthorityChanged: () => ref.invalidate(
      programFunctionDoorViewProvider(programId, functionId),
      asReload: true,
    ),
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(
      result.value.accessExpiresAt,
      result.snapshotExpiresAt,
    ),
    onExpiry: () => ref.invalidate(
      programFunctionDoorViewProvider(programId, functionId),
      asReload: true,
    ),
  );
  return result;
}
