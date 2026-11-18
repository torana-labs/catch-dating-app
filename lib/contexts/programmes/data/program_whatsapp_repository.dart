part of 'program_work_repository.dart';

/// The wedding's WhatsApp inbox commands (reply, take-over, mark read, saved
/// replies) and the assistant settings; the threads, conversations and saved
/// replies themselves are listeners in `program_inbox_views_repository.dart`.
extension ProgramWhatsappRepositoryApi on ProgramWorkRepository {
  /// The wedding's number, for the inbox header: the one part of the inbox
  /// that is not a listener row (the sender connection stays on the server).
  Future<ProgramWhatsappSender?> getWhatsappSender(String programId) => _call(
    name: 'listProgramWhatsappThreads',
    authorityScopedRead: true,
    payload: ListProgramWhatsappThreadsCallableRequest(
      programId: programId,
      filter: ProgramWhatsappFilter.all.name,
      limit: 1,
    ).toJson(),
    action: 'load the wedding number',
    parse: (value) => ProgramWhatsappInbox.fromCallableData(value).sender,
  );

  /// Marks a thread read, the write half of opening it. Answers with the
  /// thread's revision.
  Future<int> markWhatsappThreadRead({
    required String programId,
    required String threadId,
  }) => _call(
    name: 'markProgramWhatsappThreadRead',
    payload: GetProgramWhatsappThreadCallableRequest(
      programId: programId,
      threadId: threadId,
    ).toJson(),
    action: 'mark the conversation read',
    parse: (data) => requiredInt(requiredMap(data, 'read'), 'revision'),
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

  /// Takes a thread over from the assistant or hands it back, fenced by
  /// [expectedRevision]: the thread's revision as the view shows it, or the
  /// newer one marking it read answered (a view lags its thread by a trigger).
  Future<int> setWhatsappThreadHandling({
    required String programId,
    required String threadId,
    required int expectedRevision,
    required ProgramWhatsappHandledBy handledBy,
    ProgramWhatsappThreadState? state,
  }) => _call(
    name: 'setProgramWhatsappThreadHandling',
    payload: SetProgramWhatsappThreadHandlingCallableRequest(
      programId: programId,
      threadId: threadId,
      handledBy: handledBy.name,
      state: state?.name,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'change who answers',
    parse: (data) => requiredInt(requiredMap(data, 'handling'), 'revision'),
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

/// "Try it": what the assistant would answer, sending nothing.
extension ProgramAssistantPreviewApi on ProgramWorkRepository {
  Future<ProgramAssistantPreview> previewAssistantReply({
    required String programId,
    required String text,
    required String requestId,
  }) => _call(
    name: 'previewProgramAssistantReply',
    payload: PreviewProgramAssistantReplyCallableRequest(
      programId: programId,
      requestId: requestId,
      text: text,
    ).toJson(),
    action: 'try the assistant',
    parse: ProgramAssistantPreview.fromCallableData,
  );
}

/// The guest inbox and assistant settings commands, so presentation code
/// never reaches into the repository provider itself.
@riverpod
ProgramWorkRepository programmeInboxCommands(Ref ref) =>
    ref.watch(programWorkRepositoryProvider);

/// One inbox segment, live from `programWhatsappThreadViews` (#1339). The
/// wedding's number comes from the server; without it the inbox still shows.
@riverpod
Future<ProgramReadView<ProgramWhatsappInbox>> programWhatsappInbox(
  Ref ref,
  String programId,
  ProgramWhatsappFilter filter,
) async {
  final rows = await ref.watch(
    programWhatsappThreadRowsStreamProvider(programId).future,
  );
  final sender = await ref.watch(
    programWhatsappSenderProvider(programId).future,
  );
  final inbox = programWhatsappInboxFromViews(
    programId: programId,
    filter: filter,
    rows: rows,
    sender: sender,
    now: ref.read(appClockProvider).now(),
  );
  return (value: inbox, snapshotAt: null, snapshotExpiresAt: null);
}

/// The wedding's WhatsApp number for the inbox header, or null when it
/// cannot be read now.
@riverpod
Future<ProgramWhatsappSender?> programWhatsappSender(
  Ref ref,
  String programId,
) async {
  _watchWorkAccount(ref);
  try {
    return await ref
        .read(programWorkRepositoryProvider)
        .getWhatsappSender(programId);
  } on AppException {
    return null;
  }
}

/// One conversation, live.
@riverpod
Future<ProgramReadView<ProgramWhatsappThread>> programWhatsappThread(
  Ref ref,
  String programId,
  String threadId,
) async => (
  value: await ref.watch(
    programWhatsappThreadStreamProvider(programId, threadId).future,
  ),
  snapshotAt: null,
  snapshotExpiresAt: null,
);

/// The programme's saved replies, live.
@riverpod
Future<ProgramReadView<List<ProgramCannedReply>>> programCannedReplies(
  Ref ref,
  String programId,
) async => (
  value: await ref.watch(programCannedRepliesStreamProvider(programId).future),
  snapshotAt: null,
  snapshotExpiresAt: null,
);

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
