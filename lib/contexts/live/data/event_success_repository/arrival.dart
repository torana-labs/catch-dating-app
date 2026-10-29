part of '../event_success_repository.dart';

mixin _EventSuccessArrivalRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessArrivalMission?> watchArrivalMissionForUser({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _arrivalMissionDoc(
      eventId: eventId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your First Hello mission',
      resource: _arrivalMissionsPath,
    ),
  );

  Future<void> startFirstHelloMission({
    required Event event,
    required String venueSessionToken,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('startEventSuccessFirstHelloMission')
          .call(
            StartEventSuccessFirstHelloMissionCallableRequest(
              eventId: event.id,
              venueSessionToken: venueSessionToken,
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'start First Hello mission',
      resource: _arrivalMissionsPath,
    ),
  );

  Future<void> completeFirstHelloMission({
    required Event event,
    required String answerId,
  }) => withBackendErrorContext(
    () {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      return functions
          .httpsCallable('completeEventSuccessFirstHelloMission')
          .call(
            CompleteEventSuccessFirstHelloMissionCallableRequest(
              eventId: event.id,
              answerId: answerId,
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'complete First Hello mission',
      resource: _arrivalMissionsPath,
    ),
  );
}
