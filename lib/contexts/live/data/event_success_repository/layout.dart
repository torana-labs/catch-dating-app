part of '../event_success_repository.dart';

mixin _EventSuccessLayoutRepository on _EventSuccessRepositoryCore {
  Stream<List<EventSuccessLayout>> watchOrganizerLayouts(String organizerId) =>
      withBackendErrorStream(
        () => _layoutsRef
            .where('organizerId', isEqualTo: organizerId)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snapshot) {
              final layouts = snapshot.docs.map((doc) => doc.data()).toList();
              layouts.sort((a, b) => a.label.compareTo(b.label));
              return layouts;
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load organizer room layouts',
          resource: _layoutsPath,
        ),
      );

  Future<EventSuccessLayout> upsertOrganizerLayout({
    required String organizerId,
    required EventSuccessLayout layout,
    String? layoutId,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final response = await functions
          .httpsCallable('upsertEventSuccessLayout')
          .call(
            UpsertEventSuccessLayoutCallableRequest(
              organizerId: organizerId,
              layoutId: layoutId,
              label: layout.label,
              units: layout.units.map((unit) => unit.toJson()).toList(),
            ).toJson(),
          );
      final data = Map<String, dynamic>.from(response.data as Map);
      return EventSuccessLayout.fromJson(
        Map<String, dynamic>.from(data['layout'] as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save organizer room layout',
      resource: _layoutsPath,
    ),
  );

  Future<EventSuccessLayout?> fetchSpatialLayout(String eventId) =>
      withBackendErrorContext(
        () async {
          final functions = _functions;
          if (functions == null) {
            throw StateError('FirebaseFunctions is not configured.');
          }
          final response = await functions
              .httpsCallable('getEventSuccessSpatialLayout')
              .call(
                GetEventSuccessSpatialLayoutCallableRequest(
                  eventId: eventId,
                ).toJson(),
              );
          final data = Map<String, dynamic>.from(response.data as Map);
          final layout = data['layout'];
          return layout is Map
              ? EventSuccessLayout.fromJson(Map<String, dynamic>.from(layout))
              : null;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load event room layout',
          resource: _layoutsPath,
        ),
      );

  Future<EventSuccessSpatialActionResult> controlSpatialPlacement({
    required String eventId,
    required int expectedRevision,
    required EventSuccessSpatialAction action,
    required String moduleId,
    required String uid,
    String? destinationUnitId,
    EventSuccessSpatialScope? scope,
  }) => withBackendErrorContext(
    () async {
      final functions = _functions;
      if (functions == null) {
        throw StateError('FirebaseFunctions is not configured.');
      }
      final response = await functions
          .httpsCallable('controlEventSuccessSpatial')
          .call(
            EventSuccessSpatialActionCallableRequest(
              eventId: eventId,
              expectedRevision: expectedRevision,
              action: action.name,
              moduleId: moduleId,
              uid: uid,
              destinationUnitId: destinationUnitId,
              scope: scope?.name,
            ).toJson(),
          );
      return EventSuccessSpatialActionResult.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'control event room placement',
      resource: _assignmentsPath,
    ),
  );
}
