part of '../event_success_repository.dart';

mixin _EventSuccessWingmanRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessWingmanRequest?> watchWingmanRequestForUser({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _wingmanRequestDoc(
      eventId: eventId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch user wingman request',
      resource: _wingmanRequestsPath,
    ),
  );

  Stream<List<EventSuccessWingmanRequest>> watchWingmanRequestsForEvent(
    String eventId,
  ) => withBackendErrorStream(
    () => _wingmanRequestsRef
        .where('eventId', isEqualTo: eventId)
        .where(
          'status',
          isEqualTo: EventSuccessWingmanRequestStatus.active.name,
        )
        .where('hostVisibleConsent', isEqualTo: true)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event wingman requests',
      resource: _wingmanRequestsPath,
    ),
  );

  Future<void> saveWingmanRequest({
    required Event event,
    required PublicProfile target,
    String? note,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('submitEventSuccessWingmanRequest')
          .call(
            SubmitEventSuccessWingmanRequestCallableRequest(
              eventId: event.id,
              targetUid: target.uid,
              note: _trimToNull(note),
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save event wingman request',
      resource: _wingmanRequestsPath,
    ),
  );

  Future<void> withdrawWingmanRequest({required Event event}) =>
      withBackendErrorContext(
        () {
          final functions = _functions;
          if (functions == null) {
            throw StateError('FirebaseFunctions is not configured.');
          }
          return functions
              .httpsCallable('withdrawEventSuccessWingmanRequest')
              .call(EventIdCallableRequest(eventId: event.id).toJson());
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'withdraw event wingman request',
          resource: _wingmanRequestsPath,
        ),
      );

  Future<List<PublicProfile>> fetchWingmanRequestCandidates({
    required String eventId,
    required UserProfile currentUser,
  }) => withBackendErrorContext(
    () async {
      if (currentUser.uid.trim().isEmpty) return const <PublicProfile>[];
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final result = await functions
          .httpsCallable('fetchEventSuccessWingmanCandidates')
          .call<Object?>(EventIdCallableRequest(eventId: eventId).toJson());
      return FetchEventSuccessWingmanCandidatesCallableResponse.fromCallableData(
        result.data,
      ).profiles;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'fetch wingman request candidates',
      resource: _wingmanRequestsPath,
    ),
  );
}
