part of 'program_work_repository.dart';

/// Door-check-in surface: function-scoped roster reads, journal writes and
/// walk-in creation. Split into a part file so the work repository stays
/// under the handwritten-source size budget; `_call` remains library-private.
extension ProgramDoorRepositoryApi on ProgramWorkRepository {
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

/// The door of one function, live (#1339): the function's header, roster
/// rows and newest journal entries through listeners, gated on the account's
/// authority. The same type as the callable read it replaces.
@riverpod
Future<ProgramDoorView> programFunctionDoorView(
  Ref ref,
  String programId,
  String functionId,
) => ref.watch(programDoorViewStreamProvider(programId, functionId).future);

/// The door for the screen: the live door, which opens offline from the
/// device cache while the account's duty holds.
@riverpod
Future<ProgramReadView<ProgramDoorView>> programFunctionDoorViewWithSnapshot(
  Ref ref,
  String programId,
  String functionId,
) async {
  final view = await ref.watch(
    programFunctionDoorViewProvider(programId, functionId).future,
  );
  return (value: view, snapshotAt: null, snapshotExpiresAt: null);
}
