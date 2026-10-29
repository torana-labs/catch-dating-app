part of '../event_success_repository.dart';

mixin _EventSuccessCompatibilityRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessCompatibilityResponse?> watchCompatibilityResponseForUser({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _compatibilityResponseDoc(
      eventId: eventId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your match clue answers',
      resource: _compatibilityResponsesPath,
    ),
  );

  Future<void> saveCompatibilityResponse({
    required Event event,
    required String uid,
    required List<String> answerIds,
    EventSuccessQuestionnaireConfig questionnaireConfig =
        const EventSuccessQuestionnaireConfig.defaultTemplate(),
  }) => withBackendErrorContext(
    () async {
      final ref = _compatibilityResponseDoc(eventId: event.id, uid: uid);
      // This doc is owned by a single user (event+uid) and each save fully
      // replaces it, so the read (only to preserve the original createdAt) is
      // not part of a contended read-modify-set.
      final existing = (await ref.get()).data();
      final now = DateTime.now();
      final response = EventSuccessCompatibilityResponse(
        id: eventSuccessCompatibilityResponseId(eventId: event.id, uid: uid),
        eventId: event.id,
        clubId: event.clubId,
        uid: uid,
        answerIds: EventSuccessCompatibilityQuestionnaire.normalizedAnswerIds(
          answerIds,
          config: questionnaireConfig,
        ),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      );
      await ref.set(response);
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save match clue answers',
      resource: _compatibilityResponsesPath,
    ),
  );
}
