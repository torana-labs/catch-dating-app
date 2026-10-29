part of '../event_success_repository.dart';

mixin _EventSuccessPreferenceRepository on _EventSuccessRepositoryCore {
  Stream<EventSuccessPreference?> watchPreferenceForUser({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _preferenceDoc(
      eventId: eventId,
      uid: uid,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load your event preference',
      resource: _preferencesPath,
    ),
  );

  Stream<List<EventSuccessPreference>> watchPreferencesForEvent(
    String eventId,
  ) => withBackendErrorStream(
    () => _preferencesRef
        .where('eventId', isEqualTo: eventId)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load event preferences',
      resource: _preferencesPath,
    ),
  );

  Future<void> setMicroPodsOptOut({
    required Event event,
    required String uid,
    required bool optedOut,
  }) => withBackendErrorContext(
    () => _setPreference(event: event, uid: uid, microPodsOptedOut: optedOut),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save event preference',
      resource: _preferencesPath,
    ),
  );

  Future<void> setGuidedRotationsOptOut({
    required Event event,
    required String uid,
    required bool optedOut,
  }) => withBackendErrorContext(
    () => _setPreference(
      event: event,
      uid: uid,
      guidedRotationsOptedOut: optedOut,
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save event preference',
      resource: _preferencesPath,
    ),
  );

  Future<void> _setPreference({
    required Event event,
    required String uid,
    bool? microPodsOptedOut,
    bool? guidedRotationsOptedOut,
  }) async {
    final ref = _preferenceDoc(eventId: event.id, uid: uid);
    final now = DateTime.now();
    // This doc is owned by a single user (event+uid), so the only writer is
    // that user; a get-then-set is safe here. (The one theoretical lost-update
    // — the same user toggling the two different flags from two sessions at the
    // same instant — is not a real scenario and isn't worth a transaction.)
    final existing = (await ref.get()).data();
    final preference = EventSuccessPreference(
      id: eventSuccessPreferenceId(eventId: event.id, uid: uid),
      eventId: event.id,
      clubId: event.clubId,
      uid: uid,
      microPodsOptedOut:
          microPodsOptedOut ?? existing?.microPodsOptedOut ?? false,
      guidedRotationsOptedOut:
          guidedRotationsOptedOut ?? existing?.guidedRotationsOptedOut ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );
    await ref.set(preference);
  }
}
