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
Stream<EventSuccessPresenceSummary> watchEventSuccessPresenceSummary(
  Ref ref,
  String eventId,
) async* {
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
    final summary = await ref
        .read(eventSuccessRepositoryProvider)
        .fetchPresenceSummary(eventId);
    if (disposed) return;
    yield summary;
    await wait(Duration(seconds: summary.policy.heartbeatIntervalSeconds));
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

@riverpod
Future<EventSuccessLayout?> eventSuccessSpatialLayout(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).fetchSpatialLayout(eventId);

@riverpod
Stream<List<EventSuccessFeedback>> watchEventSuccessFeedback(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).watchFeedbackForEvent(eventId);

@riverpod
Stream<EventSuccessScorecard?> watchEventSuccessScorecard(
  Ref ref,
  String eventId,
) => ref.watch(eventSuccessRepositoryProvider).watchScorecardForEvent(eventId);

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

EventSuccessScorecard _eventSuccessScorecardFromJson(
  Map<String, dynamic> json,
) {
  final conversationGraph = json['conversationGraph'] is Map
      ? Map<String, dynamic>.from(json['conversationGraph'] as Map)
      : const <String, dynamic>{};
  return EventSuccessScorecard(
    bookedCount: _nonNegativeInt(json['bookedCount']),
    checkedInCount: _nonNegativeInt(json['checkedInCount']),
    attendeesWhoMetTwoPlusPeople: _nonNegativeInt(
      json['attendeesWhoMetTwoPlusPeople'],
    ),
    catchSentCount: _nonNegativeInt(json['catchSentCount']),
    attendeesWhoCaughtSomeone: _nonNegativeInt(
      json['attendeesWhoCaughtSomeone'],
    ),
    catchRecipientCount: _nonNegativeInt(json['catchRecipientCount']),
    catchRate: _unitRate(json['catchRate']),
    mutualMatchCount: _nonNegativeInt(json['mutualMatchCount']),
    chatStartedCount: _nonNegativeInt(json['chatStartedCount']),
    averageWelcomeRating: _rating(json['averageWelcomeRating']),
    averageStructureRating: _rating(json['averageStructureRating']),
    safetyIncidentCount: _nonNegativeInt(json['safetyIncidentCount']),
    feedbackResponseCount: _nonNegativeInt(json['feedbackCount']),
    conversationGraphResponseCount: _nonNegativeInt(
      conversationGraph['responseCount'],
    ),
    conversationGraphSkippedCount: _nonNegativeInt(
      conversationGraph['skippedCount'],
    ),
    conversationCount: _nonNegativeInt(conversationGraph['conversationCount']),
    attendeesWithTwoPlusConversations: _nonNegativeInt(
      conversationGraph['attendeesWithTwoPlusConversations'],
    ),
    conversationExcludedAttendeeCount: _nonNegativeInt(
      conversationGraph['excludedAttendeeCount'],
    ),
    assignedConversationCount: _nonNegativeInt(
      conversationGraph['assignedConversationCount'],
    ),
    assignedConversationOpportunityCount: _nonNegativeInt(
      conversationGraph['assignedOpportunityCount'],
    ),
    funnel: _eventSuccessHostFunnelFromJson(json['funnel']),
  );
}

EventSuccessHostFunnel _eventSuccessHostFunnelFromJson(Object? value) {
  final json = value is Map ? Map<String, dynamic>.from(value) : const {};
  return EventSuccessHostFunnel(
    inviteLinkCount: _nonNegativeInt(json['inviteLinkCount']),
    inviteOpenCount: _nonNegativeInt(json['inviteOpenCount']),
    totalDemandCount: _nonNegativeInt(json['totalDemandCount']),
    requestCount: _nonNegativeInt(json['requestCount']),
    pendingRequestCount: _nonNegativeInt(json['pendingRequestCount']),
    approvedRequestCount: _nonNegativeInt(json['approvedRequestCount']),
    declinedRequestCount: _nonNegativeInt(json['declinedRequestCount']),
    directSignupCount: _nonNegativeInt(json['directSignupCount']),
    waitlistJoinCount: _nonNegativeInt(json['waitlistJoinCount']),
    waitlistOfferCount: _nonNegativeInt(json['waitlistOfferCount']),
    waitlistOfferActiveCount: _nonNegativeInt(json['waitlistOfferActiveCount']),
    waitlistOfferAcceptedCount: _nonNegativeInt(
      json['waitlistOfferAcceptedCount'],
    ),
    waitlistOfferDeclinedCount: _nonNegativeInt(
      json['waitlistOfferDeclinedCount'],
    ),
    waitlistOfferExpiredCount: _nonNegativeInt(
      json['waitlistOfferExpiredCount'],
    ),
    checkoutStartedCount: _nonNegativeInt(json['checkoutStartedCount']),
    paymentPendingCount: _nonNegativeInt(json['paymentPendingCount']),
    paymentCompletedCount: _nonNegativeInt(json['paymentCompletedCount']),
    paymentFailedCount: _nonNegativeInt(json['paymentFailedCount']),
    paymentRefundedCount: _nonNegativeInt(json['paymentRefundedCount']),
    bookedCount: _nonNegativeInt(json['bookedCount']),
    checkedInCount: _nonNegativeInt(json['checkedInCount']),
    noShowCount: _nonNegativeInt(json['noShowCount']),
    catchSentCount: _nonNegativeInt(json['catchSentCount']),
    attendeesWhoCaughtSomeone: _nonNegativeInt(
      json['attendeesWhoCaughtSomeone'],
    ),
    mutualMatchCount: _nonNegativeInt(json['mutualMatchCount']),
    chatStartedCount: _nonNegativeInt(json['chatStartedCount']),
    repeatAttendeeCount: _nonNegativeInt(json['repeatAttendeeCount']),
  );
}

int _nonNegativeInt(Object? value) {
  if (value is int) return value < 0 ? 0 : value;
  if (value is num) return value < 0 ? 0 : value.toInt();
  return 0;
}

double _rating(Object? value) {
  if (value is! num || !value.isFinite) return 0;
  return value.clamp(0, 5).toDouble();
}

double _unitRate(Object? value) {
  if (value is! num || !value.isFinite) return 0;
  return value.clamp(0, 1).toDouble();
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
