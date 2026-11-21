import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_discovery_repository.g.dart';

const double eventDiscoveryGeoCellSizeDegrees = 0.08;

enum EventDiscoveryAvailabilityFilter { any, open, openOrWaitlist }

class EventDiscoveryQuery {
  EventDiscoveryQuery._({
    required this.marketId,
    required this.startAt,
    required this.endBefore,
    required Iterable<ActivityKind> activityKinds,
    required this.center,
    required this.maxDistanceKm,
    required this.availabilityFilter,
    required this.viewerCohortId,
    required this.limit,
  }) : activityKinds = List.unmodifiable(
         (activityKinds.toSet().toList()
           ..sort((a, b) => a.name.compareTo(b.name))),
       );

  factory EventDiscoveryQuery.forCity({
    required String marketId,
    required DateTime startAt,
    DateTime? endBefore,
    Iterable<ActivityKind> activityKinds = const [],
    LocationCoordinate? center,
    double? maxDistanceKm,
    EventDiscoveryAvailabilityFilter availabilityFilter =
        EventDiscoveryAvailabilityFilter.any,
    String? viewerCohortId,
    int limit = ReadLimitPolicy.exploreInternalFeedPage,
  }) {
    final normalizedMarketId = marketId.trim().toLowerCase();
    final normalizedMaxDistance = maxDistanceKm == null || maxDistanceKm <= 0
        ? null
        : maxDistanceKm;
    return EventDiscoveryQuery._(
      marketId: normalizedMarketId,
      startAt: startAt,
      endBefore: endBefore,
      activityKinds: activityKinds,
      center: center,
      maxDistanceKm: normalizedMaxDistance,
      availabilityFilter: availabilityFilter,
      viewerCohortId: viewerCohortId?.trim().isEmpty ?? true
          ? null
          : viewerCohortId!.trim(),
      limit: limit.clamp(1, 200).toInt(),
    );
  }

  static const _activityEquality = ListEquality<ActivityKind>();

  final String marketId;
  final DateTime startAt;
  final DateTime? endBefore;
  final List<ActivityKind> activityKinds;
  final LocationCoordinate? center;
  final double? maxDistanceKm;
  final EventDiscoveryAvailabilityFilter availabilityFilter;
  final String? viewerCohortId;
  final int limit;

  bool get hasDistanceFilter => center != null && maxDistanceKm != null;

  @override
  bool operator ==(Object other) {
    return other is EventDiscoveryQuery &&
        other.marketId == marketId &&
        other.startAt == startAt &&
        other.endBefore == endBefore &&
        _activityEquality.equals(other.activityKinds, activityKinds) &&
        other.center == center &&
        other.maxDistanceKm == maxDistanceKm &&
        other.availabilityFilter == availabilityFilter &&
        other.viewerCohortId == viewerCohortId &&
        other.limit == limit;
  }

  @override
  int get hashCode => Object.hash(
    marketId,
    startAt,
    endBefore,
    _activityEquality.hash(activityKinds),
    center,
    maxDistanceKm,
    availabilityFilter,
    viewerCohortId,
    limit,
  );
}

/// The events behind one Explore search: the hit ids the search returned,
/// in rank order, at most one `whereIn` read.
class ExploreSearchEventsQuery {
  ExploreSearchEventsQuery(Iterable<String> eventIds)
    : eventIds = List.unmodifiable(
        (eventIds.map((id) => id.trim()).where((id) => id.isNotEmpty).toSet())
            .take(ReadLimitPolicy.multiIdChunk),
      );

  static const _equality = ListEquality<String>();

  /// Hit ids in rank order, de-duplicated and capped at one `whereIn` read.
  final List<String> eventIds;

  @override
  bool operator ==(Object other) =>
      other is ExploreSearchEventsQuery &&
      _equality.equals(other.eventIds, eventIds);

  @override
  int get hashCode => _equality.hash(eventIds);
}

class EventDiscoveryRepository {
  const EventDiscoveryRepository(this._db);

  /// Explore reads the server-written public copies (#1666): `events` is
  /// read only by the organizer's team, and rules list only listed copies,
  /// so every query asks for `listing == listed`.
  static const _collectionPath = 'publicEvents';

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _eventsRef =>
      _db.collection(_collectionPath);

  Future<List<Event>> fetchDiscoverableEvents(EventDiscoveryQuery query) async {
    return (await fetchDiscoverableEventsPage(query)).items;
  }

  Future<CursorPage<Event, PageCursor<Event>>> fetchDiscoverableEventsPage(
    EventDiscoveryQuery query, {
    PageCursor<Event>? startAfter,
  }) {
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryActivityKind:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryActivityKind:ASCENDING,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryAvailability:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryAvailability:ASCENDING,discoveryActivityKind:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryAvailability:ASCENDING,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryAvailability:ASCENDING,discoveryActivityKind:ASCENDING,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryOpenCohorts:CONTAINS,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryOpenCohorts:CONTAINS,discoveryActivityKind:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryOpenCohorts:CONTAINS,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    // firestore-index: publicEvents (discoveryMarketId:ASCENDING,listing:ASCENDING,status:ASCENDING,discoveryOpenCohorts:CONTAINS,discoveryActivityKind:ASCENDING,discoveryGeoCell:ASCENDING,startTime:ASCENDING)
    return withBackendErrorContext(
      () async {
        if (query.marketId.isEmpty) {
          return CursorPage.empty<Event, PageCursor<Event>>();
        }

        Query<Map<String, dynamic>> firestoreQuery = _eventsRef
            .where('listing', isEqualTo: 'listed')
            .where('discoveryMarketId', isEqualTo: query.marketId)
            .where('status', isEqualTo: EventLifecycleStatus.active.name)
            .where(
              'startTime',
              isGreaterThanOrEqualTo: Timestamp.fromDate(query.startAt),
            );
        final endBefore = query.endBefore;
        if (endBefore != null) {
          firestoreQuery = firestoreQuery.where(
            'startTime',
            isLessThan: Timestamp.fromDate(endBefore),
          );
        }

        firestoreQuery = _applyActivityFilter(firestoreQuery, query);
        firestoreQuery = _applyAvailabilityFilter(firestoreQuery, query);
        firestoreQuery = _applyGeoCellFilter(firestoreQuery, query);
        firestoreQuery = firestoreQuery.orderBy('startTime');

        final windowed = firestoreQuery.startAfterCursor(startAfter);
        final page = await decodePublishedEventQuery(windowed)
            .fetchDocumentCursorPage(
              limit: query.limit,
              errorContext: const BackendErrorContext(
                service: BackendService.firestore,
                action: 'fetch event discovery',
                resource: _collectionPath,
              ),
            );
        final events =
            page.items
                .map((doc) => doc.data())
                .where((event) => _matchesPostQueryFilters(event, query))
                .toList(growable: false)
              ..sort((a, b) => a.startTime.compareTo(b.startTime));
        return CursorPage(
          items: List.unmodifiable(events),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        );
      },
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'fetch event discovery',
        resource: _collectionPath,
      ),
    );
  }

  /// The published events behind [query]'s search hits, as one listener so
  /// the rows keep their live counts. Hits the search index still holds for
  /// an unpublished or deleted event are left out.
  Stream<List<Event>> watchSearchHitEvents(ExploreSearchEventsQuery query) {
    if (query.eventIds.isEmpty) return Stream.value(const []);
    return withBackendErrorStream(
      () => _eventsRef
          .where('listing', isEqualTo: 'listed')
          .where(FieldPath.documentId, whereIn: query.eventIds)
          .limit(ReadLimitPolicy.multiIdChunk)
          .snapshots()
          .map(
            (snapshot) => List<Event>.unmodifiable(
              snapshot.docs.map(publishedRichEvent).whereType<Event>(),
            ),
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch explore search events',
        resource: _collectionPath,
      ),
    );
  }

  Query<Map<String, dynamic>> _applyActivityFilter(
    Query<Map<String, dynamic>> firestoreQuery,
    EventDiscoveryQuery query,
  ) {
    final activityKinds = query.activityKinds;
    if (activityKinds.isEmpty) return firestoreQuery;
    if (activityKinds.length == 1) {
      return firestoreQuery.where(
        'discoveryActivityKind',
        isEqualTo: activityKinds.single.name,
      );
    }
    if (activityKinds.length <= 10 && !query.hasDistanceFilter) {
      return firestoreQuery.where(
        'discoveryActivityKind',
        whereIn: activityKinds.map((kind) => kind.name).toList(),
      );
    }
    return firestoreQuery;
  }

  Query<Map<String, dynamic>> _applyAvailabilityFilter(
    Query<Map<String, dynamic>> firestoreQuery,
    EventDiscoveryQuery query,
  ) {
    return switch (query.availabilityFilter) {
      EventDiscoveryAvailabilityFilter.any => firestoreQuery,
      EventDiscoveryAvailabilityFilter.open =>
        query.viewerCohortId == null
            ? firestoreQuery.where('discoveryAvailability', isEqualTo: 'open')
            : firestoreQuery.where(
                'discoveryOpenCohorts',
                arrayContains: query.viewerCohortId,
              ),
      EventDiscoveryAvailabilityFilter.openOrWaitlist =>
        query.hasDistanceFilter
            ? firestoreQuery
            : firestoreQuery.where(
                'discoveryAvailability',
                whereIn: const ['open', 'waitlist'],
              ),
    };
  }

  Query<Map<String, dynamic>> _applyGeoCellFilter(
    Query<Map<String, dynamic>> firestoreQuery,
    EventDiscoveryQuery query,
  ) {
    final cells = eventDiscoveryGeoCellsForRadius(
      center: query.center,
      radiusKm: query.maxDistanceKm,
    );
    if (cells.isEmpty || cells.length > 30) return firestoreQuery;
    return firestoreQuery.where('discoveryGeoCell', whereIn: cells);
  }
}

bool _matchesPostQueryFilters(Event event, EventDiscoveryQuery query) {
  // Synthetic worlds are internal QA data, kept here so a signed-in synthetic
  // viewer finds their own event in its city. The Explore feed shows a
  // synthetic event only to a viewer booked on it.
  // Link-only events are for people with the link. Rules already keep them
  // out of every list of public copies; this keeps the filter explicit.
  if (event.listing == EventListing.link) return false;
  if (!event.isUpcomingAt(query.startAt)) return false;
  final endBefore = query.endBefore;
  if (endBefore != null && !event.startTime.isBefore(endBefore)) return false;
  if (event.isCancelled) return false;
  if (query.activityKinds.isNotEmpty &&
      !query.activityKinds.contains(event.activityKind)) {
    return false;
  }
  if (!_matchesAvailability(
    event,
    query.availabilityFilter,
    query.viewerCohortId,
  )) {
    return false;
  }
  if (!_matchesDistance(event, query)) return false;
  return true;
}

bool _matchesAvailability(
  Event event,
  EventDiscoveryAvailabilityFilter filter,
  String? viewerCohortId,
) {
  if (filter == EventDiscoveryAvailabilityFilter.any) return true;
  if (viewerCohortId != null) {
    return _matchesViewerCohortAvailability(event, filter, viewerCohortId);
  }
  return switch (filter) {
    EventDiscoveryAvailabilityFilter.any => true,
    EventDiscoveryAvailabilityFilter.open => !event.isFull,
    EventDiscoveryAvailabilityFilter.openOrWaitlist =>
      !event.isFull ||
          event.effectiveEventPolicy.admissionPolicy.waitlistPolicy.isEnabled,
  };
}

bool _matchesViewerCohortAvailability(
  Event event,
  EventDiscoveryAvailabilityFilter filter,
  String viewerCohortId,
) {
  final cohortAvailability = _eventCohortAvailability(event, viewerCohortId);
  return switch (filter) {
    EventDiscoveryAvailabilityFilter.any => cohortAvailability != null,
    EventDiscoveryAvailabilityFilter.open => cohortAvailability == _open,
    EventDiscoveryAvailabilityFilter.openOrWaitlist =>
      cohortAvailability == _open || cohortAvailability == _waitlist,
  };
}

const _open = 'open';
const _waitlist = 'waitlist';

String? _eventCohortAvailability(Event event, String cohortId) {
  if (event.isCancelled) return null;
  final policy = event.effectiveEventPolicy;
  final admission = policy.admissionPolicy;
  if (admission.inviteRequired ||
      admission.membershipRequired ||
      admission.manualApprovalRequired) {
    return null;
  }

  final roster = EventRosterSnapshot(
    bookedCountsByCohort: event.effectiveCohortCounts,
    bookedTotal: event.bookedCount,
    waitlistedCountsByCohort: event.effectiveWaitlistedCohortCounts,
    crossPathsPairConfirmedCount: event.crossPathsPairConfirmedCount,
  );
  final generalCapacity = admission.crossPathsPairInventory.isEnabled
      ? admission.capacityLimit -
            admission.crossPathsPairInventory.reservedPairCapacity
      : admission.capacityLimit;
  final generalBooked = math.max(
    0,
    event.signedUpCount - event.crossPathsPairConfirmedCount,
  );
  if (generalBooked >= generalCapacity) {
    return admission.waitlistPolicy.isEnabled ? _waitlist : null;
  }

  final cohortLimit = admission.cohortCapacityLimits[cohortId];
  if (cohortLimit != null && roster.bookedCountFor(cohortId) >= cohortLimit) {
    return admission.waitlistPolicy.isEnabled ? _waitlist : null;
  }

  final ratioPolicy = admission.balancedRatioPolicy;
  if (ratioPolicy == null) return _open;
  if (!ratioPolicy.appliesTo(cohortId)) {
    return switch (ratioPolicy.outOfRatioCohortPolicy) {
      EventOutOfRatioCohortPolicy.admitWithinGeneralCapacity => _open,
      EventOutOfRatioCohortPolicy.waitlist =>
        admission.waitlistPolicy.isEnabled ? _waitlist : null,
      EventOutOfRatioCohortPolicy.manualReview ||
      EventOutOfRatioCohortPolicy.reject => null,
    };
  }
  if (ratioPolicy.allowsAdmission(cohortId: cohortId, roster: roster)) {
    return _open;
  }
  return admission.waitlistPolicy.isEnabled ? _waitlist : null;
}

bool _matchesDistance(Event event, EventDiscoveryQuery query) {
  final center = query.center;
  final maxDistanceKm = query.maxDistanceKm;
  if (center == null || maxDistanceKm == null) return true;
  final eventLocation = LocationCoordinate.fromNullable(
    latitude: event.effectiveStartingPointLat,
    longitude: event.effectiveStartingPointLng,
  );
  if (eventLocation == null) return false;
  return center.distanceTo(eventLocation) / 1000 <= maxDistanceKm;
}

String eventDiscoveryGeoCellFor({
  required double latitude,
  required double longitude,
}) {
  final latBucket = (latitude / eventDiscoveryGeoCellSizeDegrees).floor();
  final lngBucket = (longitude / eventDiscoveryGeoCellSizeDegrees).floor();
  return '$latBucket:$lngBucket';
}

List<String> eventDiscoveryGeoCellsForRadius({
  required LocationCoordinate? center,
  required double? radiusKm,
}) {
  if (center == null || radiusKm == null || radiusKm <= 0) return const [];
  final latDelta = radiusKm / 111.32;
  final cosLatitude = math.cos(center.latitude * math.pi / 180).abs();
  final lngDelta = radiusKm / (111.32 * math.max(cosLatitude, 0.2));
  final minLatBucket =
      ((center.latitude - latDelta) / eventDiscoveryGeoCellSizeDegrees).floor();
  final maxLatBucket =
      ((center.latitude + latDelta) / eventDiscoveryGeoCellSizeDegrees).floor();
  final minLngBucket =
      ((center.longitude - lngDelta) / eventDiscoveryGeoCellSizeDegrees)
          .floor();
  final maxLngBucket =
      ((center.longitude + lngDelta) / eventDiscoveryGeoCellSizeDegrees)
          .floor();
  final cells = <String>[];
  for (var lat = minLatBucket; lat <= maxLatBucket; lat += 1) {
    for (var lng = minLngBucket; lng <= maxLngBucket; lng += 1) {
      cells.add('$lat:$lng');
    }
  }
  return cells;
}

@riverpod
EventDiscoveryRepository eventDiscoveryRepository(Ref ref) {
  return EventDiscoveryRepository(ref.watch(firebaseFirestoreProvider));
}

/// The live events behind one Explore search. Explore keeps the live
/// "N going" label, so search rows read the events, not a guest's cards.
@riverpod
Stream<List<Event>> watchExploreSearchEvents(
  Ref ref,
  ExploreSearchEventsQuery query,
) => ref.watch(eventDiscoveryRepositoryProvider).watchSearchHitEvents(query);

@riverpod
Future<List<Event>> discoverableEvents(Ref ref, EventDiscoveryQuery query) {
  return ref
      .watch(eventDiscoveryRepositoryProvider)
      .fetchDiscoverableEvents(query);
}
