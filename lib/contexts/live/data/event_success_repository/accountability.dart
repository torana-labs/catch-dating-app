part of '../event_success_repository.dart';

mixin _EventSuccessAccountabilityRepository on _EventSuccessRepositoryCore {
  Future<void> setAccountabilityResolution({
    required String eventId,
    required String attendeeId,
    required EventSuccessAccountabilityResolution? resolution,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      await functions
          .httpsCallable('setEventSuccessAccountabilityResolution')
          .call(
            SetEventSuccessAccountabilityResolutionCallableRequest(
              eventId: eventId,
              attendeeId: attendeeId,
              resolution: resolution?.name ?? 'unresolved',
            ).toJson(),
          );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'resolve event accountability sweep',
      resource: 'eventAttendees',
    ),
  );
}
