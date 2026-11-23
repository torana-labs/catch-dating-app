part of '../event_success_repository.dart';

@riverpod
EventSuccessRepository eventSuccessRepository(Ref ref) =>
    EventSuccessRepository(
      ref.watch(firebaseFirestoreProvider),
      functions: ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<void> maintainEventSuccessPresence(Ref ref, String eventId) async* {
  var disposed = false;
  Timer? timer;
  Completer<void>? waiting;
  ref.onDispose(() {
    disposed = true;
    timer?.cancel();
    if (waiting case final completer? when !completer.isCompleted) {
      completer.complete();
    }
  });
  Future<void> wait(Duration duration) {
    waiting = Completer<void>();
    timer = Timer(duration, waiting!.complete);
    return waiting!.future;
  }

  while (!disposed) {
    try {
      final heartbeat = await ref
          .read(eventSuccessRepositoryProvider)
          .heartbeatPresence(eventId: eventId);
      if (disposed) return;
      yield null;
      await wait(Duration(seconds: heartbeat.policy.heartbeatIntervalSeconds));
    } catch (error, stackTrace) {
      if (disposed) return;
      logAppError(
        error,
        stackTrace: stackTrace,
        context: const AppErrorContext(
          operation: AppOperation.runtime,
          action: 'maintain Event Success presence',
          resource: 'event success presence heartbeat',
        ),
        logError: ref.read(errorLoggerProvider),
      );
      await wait(const Duration(seconds: 10));
    }
  }
}

@riverpod
Stream<EventSuccessLateArrivalResolution?>
watchUserEventSuccessLateArrivalResolution(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchLateArrivalResolution(eventId: eventId, uid: uid);

@riverpod
Stream<EventSuccessPlan?> watchEventSuccessPlan(Ref ref, String eventId) =>
    ref.watch(eventSuccessRepositoryProvider).watchPlan(eventId);

@riverpod
Stream<EventSuccessStandings?> watchEventSuccessStandings(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).watchStandingsForEvent(eventId);

@riverpod
Stream<List<EventSuccessLayout>> watchOrganizerEventSuccessLayouts(
  Ref ref,
  String organizerId,
) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchOrganizerLayouts(organizerId);

/// The selected room layout for the Host live workspace, as a listener.
@riverpod
Stream<EventSuccessLayout?> watchEventSuccessSelectedLayout(
  Ref ref, {
  required String organizerId,
  required String layoutId,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchSelectedOrganizerLayout(organizerId: organizerId, layoutId: layoutId);

/// The selected room layout for a guest, live from its read model.
@riverpod
Stream<EventSuccessLayout?> eventSuccessSpatialLayout(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).watchSpatialLayout(eventId);

@riverpod
Stream<List<EventSuccessFeedback>> watchEventSuccessFeedback(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).watchFeedbackForEvent(eventId);

@riverpod
Stream<EventSuccessFeedback?> watchUserEventSuccessFeedback(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchFeedbackForUser(eventId: eventId, uid: uid);

@riverpod
Stream<EventSuccessAssignment?> watchUserEventSuccessAssignment(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchAssignmentForUser(eventId: eventId, uid: uid);

@riverpod
Stream<EventSuccessAssignment?> watchUserEventSuccessRotationAssignment(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchRotationAssignmentForUser(eventId: eventId, uid: uid);

@riverpod
Stream<List<EventSuccessAssignment>> watchEventSuccessAssignments(
  Ref ref,
  String eventId,
) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchAssignmentsForEvent(eventId: eventId);

@riverpod
Stream<List<EventSuccessAssignment>> watchEventSuccessRotationAssignments(
  Ref ref,
  String eventId,
) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchRotationAssignmentsForEvent(eventId: eventId);

@riverpod
Stream<List<EventSuccessAssignmentDraft>> watchEventSuccessRotationDrafts(
  Ref ref,
  String eventId,
) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchRotationDraftsForEvent(eventId: eventId);

@riverpod
Stream<EventSuccessPreference?> watchUserEventSuccessPreference(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchPreferenceForUser(eventId: eventId, uid: uid);

@riverpod
Stream<List<EventSuccessPreference>> watchEventSuccessPreferences(
  Ref ref,
  String eventId,
) =>
    ref.watch(eventSuccessRepositoryProvider).watchPreferencesForEvent(eventId);

@riverpod
Stream<EventSuccessWingmanRequest?> watchUserEventSuccessWingmanRequest(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchWingmanRequestForUser(eventId: eventId, uid: uid);

@riverpod
Stream<EventSuccessArrivalMission?> watchUserEventSuccessArrivalMission(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchArrivalMissionForUser(eventId: eventId, uid: uid);

@riverpod
Stream<List<EventSuccessWingmanRequest>> watchEventSuccessWingmanRequests(
  Ref ref,
  String eventId,
) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchWingmanRequestsForEvent(eventId);

@riverpod
Stream<EventSuccessCompatibilityResponse?>
watchUserEventSuccessCompatibilityResponse(
  Ref ref, {
  required String eventId,
  required String uid,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .watchCompatibilityResponseForUser(eventId: eventId, uid: uid);

@riverpod
Future<List<PublicProfile>> wingmanRequestCandidates(
  Ref ref, {
  required String eventId,
  required UserProfile currentUser,
}) => ref
    .watch(eventSuccessRepositoryProvider)
    .fetchWingmanRequestCandidates(eventId: eventId, currentUser: currentUser);

@riverpod
Future<List<PublicProfile>> eventSuccessAssignmentPeerProfiles(
  Ref ref,
  String peerUidsKey,
) {
  final peerUids = _decodePeerUidsKey(peerUidsKey);
  if (peerUids.isEmpty) return Future.value(const <PublicProfile>[]);
  return ref
      .watch(publicProfileRepositoryProvider)
      .fetchPublicProfiles(peerUids);
}

String eventSuccessPeerUidsKey(List<String> uids) {
  if (uids.isEmpty) return '';
  final stableUids = uids.toSet().toList()..sort();
  return stableUids.join('|');
}

String? _trimToNull(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}

List<String> _decodePeerUidsKey(String value) {
  if (value.trim().isEmpty) return const [];
  return value
      .split('|')
      .map((uid) => uid.trim())
      .where((uid) => uid.isNotEmpty)
      .toList(growable: false);
}
