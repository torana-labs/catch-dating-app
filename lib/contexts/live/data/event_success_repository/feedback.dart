part of '../event_success_repository.dart';

mixin _EventSuccessFeedbackRepository on _EventSuccessRepositoryCore {
  Stream<List<EventSuccessFeedback>> watchFeedbackForEvent(String eventId) =>
      withBackendErrorStream(
        () => _feedbackRef
            .where('eventId', isEqualTo: eventId)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load event feedback',
          resource: _feedbackPath,
        ),
      );

  Stream<EventSuccessScorecard?> watchScorecardForEvent(String eventId) =>
      withBackendErrorStream(
        () => _db
            .collection(_scorecardsPath)
            .doc(eventId)
            .snapshots()
            .map(
              (doc) => doc.exists
                  ? _eventSuccessScorecardFromJson(doc.data() ?? const {})
                  : null,
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load event report',
          resource: _scorecardsPath,
        ),
      );

  Stream<EventSuccessFeedback?> watchFeedbackForUser({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _feedbackDoc(
      eventId: eventId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your event feedback',
      resource: _feedbackPath,
    ),
  );

  Future<void> submitFeedback(EventSuccessFeedback feedback) =>
      withBackendErrorContext(
        () => _feedbackDoc(eventId: feedback.eventId, uid: feedback.uid).set(
          feedback.copyWith(updatedAt: DateTime.now()),
          SetOptions(merge: true),
        ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'submit event feedback',
          resource: _feedbackPath,
        ),
      );
}
