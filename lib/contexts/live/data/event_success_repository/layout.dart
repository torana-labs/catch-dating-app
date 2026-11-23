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

  /// The event's selected organizer layout, read directly. Rules let the
  /// organizer team read its layouts; guests use [watchSpatialLayout], whose view
  /// holds only the selected layout.
  Stream<EventSuccessLayout?> watchSelectedOrganizerLayout({
    required String organizerId,
    required String layoutId,
  }) => withBackendErrorStream(
    () => _layoutsRef
        .doc('${organizerId}_$layoutId')
        .snapshots()
        .where((doc) => doc.exists || !doc.metadata.isFromCache)
        .map((doc) {
          final layout = doc.data();
          return layout?.layoutId == layoutId ? layout : null;
        }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load event room layout',
      resource: _layoutsPath,
    ),
  );

  /// The event's room layout for a guest, live from
  /// `eventSuccessLayoutViews/{eventId}` (#2306) instead of the
  /// `getEventSuccessSpatialLayout` callable: the selected layout's id,
  /// label and units, or null when the plan has no room map. Rules admit the
  /// event's managers and a guest whose own booking is signed up or attended,
  /// or whose own runtime row is ready, as the callable did. A view the
  /// server has not written reads as no map.
  Stream<EventSuccessLayout?> watchSpatialLayout(String eventId) =>
      withBackendErrorStream(
        () => _db
            .collection('eventSuccessLayoutViews')
            .doc(eventId)
            .snapshots()
            .where((doc) => doc.exists || !doc.metadata.isFromCache)
            .map((doc) {
              final view = doc.data();
              if (view == null) return null;
              if (view['eventId'] != eventId || view['version'] != 1) {
                throw const FormatException('Room layout belongs elsewhere.');
              }
              final layout = view['layout'];
              return layout is Map
                  ? EventSuccessLayout.fromJson(
                      Map<String, dynamic>.from(layout),
                    )
                  : null;
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load event room layout',
          resource: 'eventSuccessLayoutViews',
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
