part of 'program_work_repository.dart';

/// The wedding's WhatsApp inbox: guest threads (saved for offline cold
/// starts like every programme read), the reply and take-over commands,
/// saved replies and the assistant settings.
extension ProgramWhatsappRepositoryApi on ProgramWorkRepository {
  Future<ProgramWhatsappInbox> listWhatsappThreads({
    required String programId,
    required ProgramWhatsappFilter filter,
    String? cursor,
    String? snapshotAccountId,
  }) => _call(
    name: 'listProgramWhatsappThreads',
    authorityScopedRead: true,
    payload: ListProgramWhatsappThreadsCallableRequest(
      programId: programId,
      filter: filter.name,
      cursor: cursor,
    ).toJson(),
    action: 'load the guest messages',
    parse: ProgramWhatsappInbox.fromCallableData,
    snapshotScope: cursor == null
        ? programSnapshotScope('whatsappInbox', programId, filter.name)
        : null,
    snapshotAccountId: snapshotAccountId,
  );

  Future<ProgramWhatsappThread> getWhatsappThread({
    required String programId,
    required String threadId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramWhatsappThread',
    authorityScopedRead: true,
    payload: GetProgramWhatsappThreadCallableRequest(
      programId: programId,
      threadId: threadId,
    ).toJson(),
    action: 'load the conversation',
    parse: ProgramWhatsappThread.fromCallableData,
    snapshotScope: programSnapshotScope('whatsappThread', programId, threadId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Sends [text] inside the 24-hour window the planner saw
  /// ([lastInboundAt]); [idempotencyKey] makes a retry return the stored
  /// reply instead of sending twice.
  Future<String> sendWhatsappReply({
    required String programId,
    required String threadId,
    required String text,
    required String idempotencyKey,
    required DateTime lastInboundAt,
    String? cannedReplyId,
  }) => _call(
    name: 'sendProgramWhatsappReply',
    payload: SendProgramWhatsappReplyCallableRequest(
      programId: programId,
      threadId: threadId,
      text: text,
      idempotencyKey: idempotencyKey,
      expectedLastInboundAtMillis: lastInboundAt.millisecondsSinceEpoch,
      cannedReplyId: cannedReplyId,
    ).toJson(),
    action: 'send the reply',
    parse: (data) => requiredString(requiredMap(data, 'reply'), 'messageId'),
  );

  /// Takes a thread over from the assistant or hands it back.
  Future<int> setWhatsappThreadHandling({
    required String programId,
    required ProgramWhatsappThreadSummary thread,
    required ProgramWhatsappHandledBy handledBy,
    ProgramWhatsappThreadState? state,
  }) => _call(
    name: 'setProgramWhatsappThreadHandling',
    payload: SetProgramWhatsappThreadHandlingCallableRequest(
      programId: programId,
      threadId: thread.threadId,
      handledBy: handledBy.name,
      state: state?.name,
      expectedRevision: thread.revision,
    ).toJson(),
    action: 'change who answers',
    parse: (data) => requiredInt(requiredMap(data, 'handling'), 'revision'),
  );

  Future<List<ProgramCannedReply>> listCannedReplies({
    required String programId,
    String? snapshotAccountId,
  }) => _call(
    name: 'listProgramWhatsappCannedReplies',
    authorityScopedRead: true,
    payload: ListProgramWhatsappCannedRepliesCallableRequest(
      programId: programId,
    ).toJson(),
    action: 'load the saved replies',
    parse: ProgramCannedReply.listFromCallableData,
    snapshotScope: programSnapshotScope('cannedReplies', programId),
    snapshotAccountId: snapshotAccountId,
  );

  Future<int> upsertCannedReply({
    required String programId,
    required String cannedReplyId,
    required String label,
    required List<ProgramCannedReplyVariant> variants,
    required int expectedRevision,
    required String requestId,
    bool? archived,
  }) => _call(
    name: 'upsertProgramWhatsappCannedReply',
    payload: UpsertProgramWhatsappCannedReplyCallableRequest(
      programId: programId,
      cannedReplyId: cannedReplyId,
      label: label,
      variants: [for (final variant in variants) variant.toJson()],
      archived: archived,
      expectedRevision: expectedRevision,
      requestId: requestId,
    ).toJson(),
    action: 'save the reply',
    parse: (data) => requiredInt(
      requiredMap(requiredMap(data, 'saved reply')['cannedReply'], 'reply'),
      'revision',
    ),
  );

  Future<ProgramAssistantSettings> getAssistantSettings({
    required String programId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramAssistantSettings',
    authorityScopedRead: true,
    payload: GetProgramAssistantSettingsCallableRequest(
      programId: programId,
    ).toJson(),
    action: 'load the assistant settings',
    parse: ProgramAssistantSettings.fromCallableData,
    snapshotScope: programSnapshotScope('assistantSettings', programId),
    snapshotAccountId: snapshotAccountId,
  );

  Future<ProgramAssistantSettings> updateAssistantSettings({
    required String programId,
    required ProgramAssistantSettingsChange change,
    required int expectedRevision,
    required String requestId,
  }) => _call(
    name: 'updateProgramAssistantSettings',
    payload: {
      ...change.toJson(),
      'programId': programId,
      'expectedRevision': expectedRevision,
      'requestId': requestId,
    },
    action: 'save the assistant settings',
    parse: ProgramAssistantSettings.fromCallableData,
  );
}

/// One inbox segment, from the live read or a bounded snapshot.
@riverpod
Future<ProgramReadView<ProgramWhatsappInbox>> programWhatsappInbox(
  Ref ref,
  String programId,
  ProgramWhatsappFilter filter,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('whatsappInbox', programId, filter.name),
    () => ref
        .read(programWorkRepositoryProvider)
        .listWhatsappThreads(
          programId: programId,
          filter: filter,
          snapshotAccountId: accountId,
        ),
    ProgramWhatsappInbox.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}

/// One conversation, from the live read or a bounded snapshot.
@riverpod
Future<ProgramReadView<ProgramWhatsappThread>> programWhatsappThread(
  Ref ref,
  String programId,
  String threadId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('whatsappThread', programId, threadId),
    () => ref
        .read(programWorkRepositoryProvider)
        .getWhatsappThread(
          programId: programId,
          threadId: threadId,
          snapshotAccountId: accountId,
        ),
    ProgramWhatsappThread.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}

/// The programme's saved replies.
@riverpod
Future<ProgramReadView<List<ProgramCannedReply>>> programCannedReplies(
  Ref ref,
  String programId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('cannedReplies', programId),
    () => ref
        .read(programWorkRepositoryProvider)
        .listCannedReplies(programId: programId, snapshotAccountId: accountId),
    ProgramCannedReply.listFromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}

/// The assistant settings and the wedding's number.
@riverpod
Future<ProgramReadView<ProgramAssistantSettings>> programAssistantSettings(
  Ref ref,
  String programId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('assistantSettings', programId),
    () => ref
        .read(programWorkRepositoryProvider)
        .getAssistantSettings(
          programId: programId,
          snapshotAccountId: accountId,
        ),
    ProgramAssistantSettings.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}
