part of '../event_success_repository.dart';

mixin _EventSuccessPresenceRepository on _EventSuccessRepositoryCore {
  Future<EventSuccessPresenceHeartbeat> heartbeatPresence({
    required String eventId,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final response = await functions
          .httpsCallable('heartbeatEventSuccessPresence')
          .call(
            HeartbeatEventSuccessPresenceCallableRequest(
              eventId: eventId,
              surface: 'flutter',
            ).toJson(),
          );
      return EventSuccessPresenceHeartbeat.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'keep event presence active',
      resource: 'eventSuccessPresence',
    ),
  );

  Future<EventSuccessPresenceSummary> fetchPresenceSummary(String eventId) =>
      withBackendErrorContext(
        () async {
          final functions = _functions;
          if (functions == null) {
            throw StateError('FirebaseFunctions is not configured.');
          }
          final response = await functions
              .httpsCallable('getEventSuccessPresenceSummary')
              .call(EventIdCallableRequest(eventId: eventId).toJson());
          return EventSuccessPresenceSummary.fromJson(
            Map<String, dynamic>.from(response.data as Map),
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load event presence summary',
          resource: 'eventSuccessPresence',
        ),
      );

  Future<EventSuccessLateArrivalResolution> resolveLateArrival({
    required String eventId,
    required String uid,
    required int expectedRevision,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final response = await functions
          .httpsCallable('resolveEventSuccessLateArrival')
          .call(
            ResolveEventSuccessLateArrivalCallableRequest(
              eventId: eventId,
              uid: uid,
              expectedRevision: expectedRevision,
              confirmed: true,
            ).toJson(),
          );
      return EventSuccessLateArrivalResolution.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'place a late event attendee',
      resource: _lateArrivalsPath,
    ),
  );

  Stream<EventSuccessLateArrivalResolution?> watchLateArrivalResolution({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _db
        .collection(_lateArrivalsPath)
        .doc('${eventId}_$uid')
        .snapshots()
        .map((doc) {
          final data = doc.data();
          return data == null
              ? null
              : EventSuccessLateArrivalResolution.fromJson(data);
        }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your late-arrival placement',
      resource: _lateArrivalsPath,
    ),
  );
}
