import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/data/live_listener_streams.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_history_repository.g.dart';

/// One page of a group's recorded departures through two manager listeners:
/// the group's view (the current progress revision) and the page of its
/// departure views, newest first.
class EventAssistanceDepartureHistoryRepository {
  const EventAssistanceDepartureHistoryRepository(
    this._firestore, {
    this._clock = const AppClock(),
  });
  final FirebaseFirestore _firestore;
  final AppClock _clock;

  Stream<EventAssistanceDepartureHistoryPage> watch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) {
    final group = query.group;
    final progressId = groupProgressViewId(group);
    final progress = withBackendErrorStream(
      () => _firestore
          .collection(EventAssistanceMovementViews.groupProgress)
          .doc(progressId)
          .snapshots()
          .map((snapshot) => snapshot.data()),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch departure history revision',
        resource: EventAssistanceMovementViews.groupProgress,
      ),
    );
    final rosters = withBackendErrorStream(
      () => _rosterPage(query, progressId).snapshots().map(
        (snapshot) => [for (final doc in snapshot.docs) doc.data()],
      ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch departure history',
        resource: EventAssistanceMovementViews.departures,
      ),
    );
    return combineLiveListeners(
      progress,
      rosters,
      (progressData, rosterData) =>
          EventAssistanceDepartureHistoryPage.fromCallableData(
            departureHistoryReadResponse(
              progress: progressData,
              rosters: rosterData,
              query: query,
              actorUid: actorUid,
              now: movementViewNow(_clock.now(), [progressData, ...rosterData]),
            ),
            expectedQuery: query,
            expectedActorUid: actorUid,
          ),
    );
  }

  Query<Map<String, dynamic>> _rosterPage(
    EventAssistanceDepartureHistoryQuery query,
    String progressId,
  ) {
    // firestore-index: hostEventDepartureViews (organizerId:ASCENDING,progressId:ASCENDING,progressRevision:DESCENDING)
    var page = _firestore
        .collection(EventAssistanceMovementViews.departures)
        .where('organizerId', isEqualTo: query.group.organizerId)
        .where('progressId', isEqualTo: progressId)
        .orderBy('progressRevision', descending: true);
    if (query.beforeRevision case final before?) {
      page = page.where('progressRevision', isLessThan: before);
    }
    return page.limit(departureHistoryPageSize + 1);
  }
}

@riverpod
EventAssistanceDepartureHistoryRepository
eventAssistanceDepartureHistoryRepository(Ref ref) =>
    EventAssistanceDepartureHistoryRepository(
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );
