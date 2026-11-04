import 'package:catch_dating_app/contexts/live/data/event_assistance_movement_views.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_view_support.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
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
    // The page compares the clock with nothing: it is rebuilt per delivery
    // only, so its read instant follows the app clock.
    return clockedListener<
      ({Map<String, Object?>? progress, List<Map<String, Object?>> rosters}),
      EventAssistanceDepartureHistoryPage
    >(
      combineLatest(
        progress,
        rosters,
        (progressData, rosterData) =>
            (progress: progressData, rosters: rosterData),
      ),
      clock: _clock,
      build: (views, clock) =>
          EventAssistanceDepartureHistoryPage.fromCallableData(
            departureHistoryReadResponse(
              progress: views.progress,
              rosters: views.rosters,
              query: query,
              actorUid: actorUid,
              now: liveViewNow(clock, [views.progress, ...views.rosters]),
            ),
            expectedQuery: query,
            expectedActorUid: actorUid,
          ),
      nextRebuildAt: (_) => null,
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
