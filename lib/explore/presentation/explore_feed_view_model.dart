import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_discovery_window_controller.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';

class ExploreFeedViewModel {
  const ExploreFeedViewModel({
    required this.items,
    this.featuredEventId,
    this.externalItems = const <ExploreExternalEventItem>[],
    this.dateSupplyCounts = const <ExploreTimeFilter, int>{},
    this.isExhaustive = true,
    this.isLoadingMore = false,
    this.windowRequest,
  });

  final List<ExploreEventItem> items;
  final String? featuredEventId;
  final List<ExploreExternalEventItem> externalItems;
  final Map<ExploreTimeFilter, int> dateSupplyCounts;
  final bool isExhaustive;
  final bool isLoadingMore;
  final ExploreDiscoveryWindowRequest? windowRequest;

  bool get isEmpty => items.isEmpty && externalItems.isEmpty;
  int get count => items.length + externalItems.length;
  int get mappableEventCount =>
      items.where((item) => item.event.hasExactStartingPoint).length +
      externalItems
          .where(
            (item) =>
                item.event.latitude != null && item.event.longitude != null,
          )
          .length;
  bool get hasMore => !isExhaustive;
  int? dateSupplyCount(ExploreTimeFilter filter) => dateSupplyCounts[filter];
  ExploreEventItem? get featuredItem {
    final eventId = featuredEventId;
    if (eventId == null) return null;
    return items.where((item) => item.event.id == eventId).firstOrNull;
  }

  /// All items grouped by day, including the featured one. Useful when the
  /// caller doesn't want a separate hero treatment (e.g. the map sheet HALF
  /// state, which shows a uniform feed).
  List<ExploreEventDayGroup> dayGroups({DateTime? now}) {
    final referenceNow = now ?? DateTime.now();
    return _groupByDay(items, referenceNow);
  }
}

class ExploreEventDayGroup {
  const ExploreEventDayGroup({
    required this.day,
    required this.label,
    required this.items,
  });

  /// Midnight of the local day for the events in this group.
  final DateTime day;

  /// Sticky-header label such as `TODAY · WED 27 MAY` or `SAT 30 MAY`.
  final String label;

  final List<ExploreEventItem> items;

  int get count => items.length;
}

List<ExploreEventDayGroup> _groupByDay(
  Iterable<ExploreEventItem> items,
  DateTime now,
) {
  final today = DateTime(now.year, now.month, now.day);
  final tomorrow = today.add(const Duration(days: 1));
  final groups = <DateTime, List<ExploreEventItem>>{};
  for (final item in items) {
    final start = item.event.startTime;
    final dayKey = DateTime(start.year, start.month, start.day);
    groups.putIfAbsent(dayKey, () => <ExploreEventItem>[]).add(item);
  }

  final keys = groups.keys.toList()..sort();
  return [
    for (final key in keys)
      ExploreEventDayGroup(
        day: key,
        label: exploreFeedDayLabel(key, today: today, tomorrow: tomorrow),
        items: List.unmodifiable(
          groups[key]!
            ..sort((a, b) => a.event.startTime.compareTo(b.event.startTime)),
        ),
      ),
  ];
}

String exploreFeedDayLabel(
  DateTime day, {
  required DateTime today,
  required DateTime tomorrow,
}) {
  if (day == today) {
    return 'Today · ${EventFormatters.shortDate(day)}';
  }
  if (day == tomorrow) {
    return 'Tomorrow · ${EventFormatters.shortDate(day)}';
  }
  return EventFormatters.shortDate(day);
}

class ExploreEventItem {
  const ExploreEventItem({
    required this.event,
    required this.organizer,
    this.availability,
    this._status,
    this.distanceFromUserKm,
    this.isJoinedOrganizerMember = false,
    this.isFollowedOrganizerSignal = false,
  });

  final Event event;
  final Organizer organizer;
  final ViewerEventAvailability? availability;

  /// Compatibility override for tests and legacy callers that still construct
  /// Explore items directly. New production paths should pass [availability].
  final EventTileStatus? _status;
  final double? distanceFromUserKm;
  final bool isJoinedOrganizerMember;
  final bool isFollowedOrganizerSignal;

  EventTileStatus get status =>
      _status ??
      _statusForAvailability(
        availability,
        isJoinedOrganizerMember: isJoinedOrganizerMember,
      );
  EventTileStatus get tileStatus => status;

  EventTileData get tileData => EventTileData.fromEvent(
    event: event,
    status: tileStatus,
    organizerName: organizer.name,
  );
}

/// Picks one honest Explore hero from viewer-actionable events.
///
/// The existing recommendation scorer supplies preference, distance, and
/// recency relevance. Explore then adds availability priority and bounded
/// social proof so the chronologically first event cannot win merely by being
/// first. Joined/hosted and blocked events stay in the feed but cannot become
/// acquisition CTAs in the cover story.
String? selectExploreFeaturedEventId({
  required List<ExploreEventItem> items,
  required DateTime now,
  UserProfile? viewer,
  Set<String> signedUpEventIds = const <String>{},
  List<Event> attendedEvents = const <Event>[],
  List<Event> signedUpEvents = const <Event>[],
}) {
  final candidates = items
      .where((item) => _isExploreHeroCandidate(item, now))
      .toList(growable: false);
  if (candidates.isEmpty) return null;

  final recommendationScores = <String, double>{
    for (final recommendation in rankExploreEventRecommendations(
      candidates: [
        for (final item in candidates)
          ExploreEventRecommendationCandidate(
            event: item.event,
            organizerName: item.organizer.name,
            organizerLocation: item.organizer.location,
          ),
      ],
      signedUpEventIds: signedUpEventIds,
      attendedEvents: attendedEvents,
      signedUpEvents: signedUpEvents,
      viewer: viewer,
      now: now,
      limit: candidates.length,
    ))
      recommendation.event.id: recommendation.score,
  };

  final ranked = [...candidates]
    ..sort((a, b) {
      final bScore = _exploreHeroScore(b, recommendationScores);
      final aScore = _exploreHeroScore(a, recommendationScores);
      final byScore = bScore.compareTo(aScore);
      if (byScore != 0) return byScore;
      return a.event.startTime.compareTo(b.event.startTime);
    });
  return ranked.first.event.id;
}

bool _isExploreHeroCandidate(ExploreEventItem item, DateTime now) {
  final event = item.event;
  if (event.isCancelled || !event.startTime.isAfter(now)) return false;
  final availability = item.availability;
  if (availability == null) {
    return !event.isFull &&
        item.status != EventTileStatus.ineligible &&
        item.status != EventTileStatus.full &&
        item.status != EventTileStatus.joined &&
        item.status != EventTileStatus.hosted;
  }
  return switch (availability.status) {
    ViewerEventAvailabilityStatus.open ||
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.approvedToBook ||
    ViewerEventAvailabilityStatus.requestRequired ||
    ViewerEventAvailabilityStatus.waitlistAvailable => true,
    ViewerEventAvailabilityStatus.hosted ||
    ViewerEventAvailabilityStatus.joined ||
    ViewerEventAvailabilityStatus.waitlisted ||
    ViewerEventAvailabilityStatus.attended ||
    ViewerEventAvailabilityStatus.full ||
    ViewerEventAvailabilityStatus.fullForViewer ||
    ViewerEventAvailabilityStatus.inviteRequired ||
    ViewerEventAvailabilityStatus.membershipRequired ||
    ViewerEventAvailabilityStatus.runPreferencesRequired ||
    ViewerEventAvailabilityStatus.profileRequired ||
    ViewerEventAvailabilityStatus.ageRestricted ||
    ViewerEventAvailabilityStatus.past ||
    ViewerEventAvailabilityStatus.cancelled => false,
  };
}

double _exploreHeroScore(
  ExploreEventItem item,
  Map<String, double> recommendationScores,
) {
  final availabilityScore = switch (item.availability?.status) {
    ViewerEventAvailabilityStatus.approvedToBook => 48.0,
    ViewerEventAvailabilityStatus.saved => 46.0,
    ViewerEventAvailabilityStatus.open || null => 44.0,
    ViewerEventAvailabilityStatus.requestRequired => 34.0,
    ViewerEventAvailabilityStatus.waitlistAvailable => 24.0,
    _ => 0.0,
  };
  final attendanceScore =
      item.event.signedUpCount.clamp(0, 20).toDouble() * 0.8;
  return availabilityScore +
      attendanceScore +
      (recommendationScores[item.event.id] ?? 0);
}

class ExploreExternalEventItem {
  const ExploreExternalEventItem({
    required this.event,
    this.distanceFromUserKm,
  });

  final ExternalEvent event;
  final double? distanceFromUserKm;
}

EventTileStatus _statusForAvailability(
  ViewerEventAvailability? availability, {
  required bool isJoinedOrganizerMember,
}) {
  return switch (availability?.status) {
    ViewerEventAvailabilityStatus.joined => EventTileStatus.joined,
    ViewerEventAvailabilityStatus.saved => EventTileStatus.saved,
    ViewerEventAvailabilityStatus.hosted => EventTileStatus.hosted,
    ViewerEventAvailabilityStatus.waitlisted => EventTileStatus.waitlisted,
    ViewerEventAvailabilityStatus.attended => EventTileStatus.attended,
    ViewerEventAvailabilityStatus.waitlistAvailable ||
    ViewerEventAvailabilityStatus.full => EventTileStatus.full,
    ViewerEventAvailabilityStatus.fullForViewer ||
    ViewerEventAvailabilityStatus.inviteRequired ||
    ViewerEventAvailabilityStatus.membershipRequired ||
    ViewerEventAvailabilityStatus.profileRequired ||
    ViewerEventAvailabilityStatus.ageRestricted => EventTileStatus.ineligible,
    ViewerEventAvailabilityStatus.past => EventTileStatus.past,
    ViewerEventAvailabilityStatus.cancelled => EventTileStatus.cancelled,
    ViewerEventAvailabilityStatus.approvedToBook ||
    ViewerEventAvailabilityStatus.requestRequired ||
    ViewerEventAvailabilityStatus.runPreferencesRequired ||
    ViewerEventAvailabilityStatus.open ||
    null =>
      isJoinedOrganizerMember ? EventTileStatus.recommended : EventTileStatus.open,
  };
}
