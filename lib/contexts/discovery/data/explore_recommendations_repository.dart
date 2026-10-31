import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_recommendations_repository.g.dart';

class ExploreRecommendationsQuery {
  ExploreRecommendationsQuery({
    required this.userId,
    required Iterable<String> followedOrganizerIds,
  }) : followedOrganizerIds = List.unmodifiable(
         (followedOrganizerIds.toSet().toList()..sort()),
       );

  final String userId;
  final List<String> followedOrganizerIds;

  @override
  bool operator ==(Object other) {
    return other is ExploreRecommendationsQuery &&
        other.userId == userId &&
        listEquals(other.followedOrganizerIds, followedOrganizerIds);
  }

  @override
  int get hashCode => Object.hash(userId, Object.hashAll(followedOrganizerIds));
}

class ExploreEventRecommendationCandidate {
  const ExploreEventRecommendationCandidate({
    required this.event,
    required this.organizerName,
    this.organizerLocation,
  });

  final Event event;
  final String organizerName;
  final String? organizerLocation;
}

// Data-owned provider so Explore can consume recommendation supply without
// coupling the feed view model directly to repository providers.
@riverpod
Future<List<ExploreEventRecommendationCandidate>> exploreRecommendedEvents(
  Ref ref,
  ExploreRecommendationsQuery query,
) async {
  final events = await ref
      .watch(eventRepositoryProvider)
      .fetchUpcomingEventsForOrganizers(query.followedOrganizerIds);
  if (events.isEmpty) return const [];

  final organizersRepository = ref.watch(organizersRepositoryProvider);
  final organizerIds = events.map((event) => event.organizerId).toSet().toList()
    ..sort();
  final organizers = await Future.wait(
    organizerIds.map(organizersRepository.fetchOrganizer),
  );
  final organizersById = <String, Organizer>{};
  for (final organizer in organizers) {
    if (organizer != null) {
      organizersById[organizer.id] = organizer;
    }
  }

  return [
    for (final event in events)
      ExploreEventRecommendationCandidate(
        event: event,
        organizerName: organizersById[event.organizerId]?.name ?? 'Your organizer',
        organizerLocation: organizersById[event.organizerId]?.location,
      ),
  ];
}

List<ExploreEventRecommendation> rankExploreEventRecommendations({
  required List<ExploreEventRecommendationCandidate> candidates,
  required Set<String> signedUpEventIds,
  required List<Event> attendedEvents,
  required List<Event> signedUpEvents,
  required DateTime now,
  UserProfile? viewer,
  int limit = ReadLimitPolicy.recommendationRail,
}) {
  final timePreference = _timePreferenceFromEvents(
    attendedEvents: attendedEvents,
    signedUpEvents: signedUpEvents,
    now: now,
  );

  final recommendations = <ExploreEventRecommendation>[];
  for (final candidate in candidates) {
    final event = candidate.event;
    if (signedUpEventIds.contains(event.id) ||
        event.isCancelled ||
        !event.startTime.isAfter(now) ||
        event.isFull) {
      continue;
    }
    if (viewer != null && !_isEligibleForRecommendation(event, viewer, now)) {
      continue;
    }

    final scored = _scoreRecommendation(
      candidate: candidate,
      viewer: viewer,
      timePreference: timePreference,
      now: now,
    );
    recommendations.add(scored);
  }

  recommendations.sort((a, b) {
    final scoreOrder = b.score.compareTo(a.score);
    if (scoreOrder != 0) return scoreOrder;
    return a.event.startTime.compareTo(b.event.startTime);
  });
  return recommendations.take(limit).toList(growable: false);
}

bool _isEligibleForRecommendation(
  Event event,
  UserProfile viewer,
  DateTime now,
) {
  final viewerAge = viewer.ageOn(now);
  if (viewerAge != null &&
      (viewerAge < event.constraints.minAge ||
          viewerAge > event.constraints.maxAge)) {
    return false;
  }
  final gender = viewer.gender;
  final genderCap = gender == null
      ? null
      : event.constraints.maxForGender(gender);
  if (genderCap != null &&
      (event.genderCounts[gender?.name] ?? 0) >= genderCap) {
    return false;
  }
  return true;
}

ExploreEventRecommendation _scoreRecommendation({
  required ExploreEventRecommendationCandidate candidate,
  required UserProfile? viewer,
  required _EventTimeBucket? timePreference,
  required DateTime now,
}) {
  final event = candidate.event;
  var score = 0.0;
  var reason = 'From organizers you follow';

  if (event.eventFormat.isDistanceBased) {
    final distanceReason = _distancePreferenceReason(viewer, event);
    if (distanceReason != null) {
      score += 28;
      reason = distanceReason;
    } else if (_hasNearbyPreferredDistance(viewer, event)) {
      score += 12;
    }

    final paceScore = _paceFitScore(viewer, event);
    score += paceScore;
    if (reason == 'From organizers you follow' && paceScore >= 18) {
      reason = 'Fits your pace';
    }
  }

  final eventTimeBucket = _EventTimeBucket.fromHour(event.startTime.hour);
  if (timePreference != null && eventTimeBucket == timePreference) {
    score += 18;
    if (reason == 'From organizers you follow') {
      reason = '${timePreference.label} event pattern';
    }
  }

  final proximityScore = _proximityScore(viewer, event);
  score += proximityScore;
  if (reason == 'From organizers you follow' && proximityScore >= 14) {
    reason = 'Near you';
  }

  if (_isSameCity(viewer, candidate.organizerLocation)) {
    score += 10;
  }

  score += _startTimeScore(event, now);
  score += event.spotsRemaining >= 5 ? 5 : 2;

  return ExploreEventRecommendation(
    event: event,
    organizerName: candidate.organizerName,
    reasonLabel: reason,
    score: score,
  );
}

String? _distancePreferenceReason(UserProfile? viewer, Event event) {
  final preferredDistances = viewer?.preferredDistances ?? const [];
  for (final preferred in preferredDistances) {
    if ((event.distanceKm - preferred.targetKm).abs() <= 0.75) {
      return 'Matches your ${preferred.label} preference';
    }
  }
  return null;
}

bool _hasNearbyPreferredDistance(UserProfile? viewer, Event event) {
  final preferredDistances = viewer?.preferredDistances ?? const [];
  return preferredDistances.any(
    (preferred) => (event.distanceKm - preferred.targetKm).abs() <= 2,
  );
}

double _paceFitScore(UserProfile? viewer, Event event) {
  if (viewer == null) return 0;
  final eventPace = event.pace.secondsPerKm;
  if (eventPace >= viewer.paceMinSecsPerKm &&
      eventPace <= viewer.paceMaxSecsPerKm) {
    return 18;
  }
  final minDelta = (eventPace - viewer.paceMinSecsPerKm).abs();
  final maxDelta = (eventPace - viewer.paceMaxSecsPerKm).abs();
  return minDelta < 45 || maxDelta < 45 ? 8 : 0;
}

double _proximityScore(UserProfile? viewer, Event event) {
  final userLocation = LocationCoordinate.fromNullable(
    latitude: viewer?.latitude,
    longitude: viewer?.longitude,
  );
  final eventLocation = LocationCoordinate.fromNullable(
    latitude: event.effectiveStartingPointLat,
    longitude: event.effectiveStartingPointLng,
  );
  if (userLocation == null || eventLocation == null) return 0;

  final distanceKm = userLocation.distanceTo(eventLocation) / 1000;
  if (distanceKm <= 3) return 18;
  if (distanceKm <= 8) return 12;
  if (distanceKm <= 15) return 6;
  return 0;
}

bool _isSameCity(UserProfile? viewer, String? organizerLocation) {
  final userCity = viewer?.city?.trim().toLowerCase();
  final location = organizerLocation?.trim().toLowerCase();
  return userCity != null &&
      userCity.isNotEmpty &&
      location != null &&
      location.isNotEmpty &&
      userCity == location;
}

double _startTimeScore(Event event, DateTime now) {
  final daysAway = event.startTime.difference(now).inDays;
  if (daysAway <= 7) return 8;
  if (daysAway <= 14) return 5;
  if (daysAway <= 30) return 2;
  return 0;
}

_EventTimeBucket? _timePreferenceFromEvents({
  required List<Event> attendedEvents,
  required List<Event> signedUpEvents,
  required DateTime now,
}) {
  final counts = <_EventTimeBucket, int>{};
  void addRun(Event event, int weight) {
    if (event.startTime.isAfter(now)) return;
    final bucket = _EventTimeBucket.fromHour(event.startTime.hour);
    counts[bucket] = (counts[bucket] ?? 0) + weight;
  }

  for (final event in attendedEvents) {
    addRun(event, 2);
  }
  for (final event in signedUpEvents) {
    addRun(event, 1);
  }
  if (counts.isEmpty) return null;

  final ranked = counts.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  return ranked.first.value > 1 ? ranked.first.key : null;
}

enum _EventTimeBucket {
  morning('Morning'),
  afternoon('Afternoon'),
  evening('Evening');

  const _EventTimeBucket(this.label);

  final String label;

  factory _EventTimeBucket.fromHour(int hour) {
    if (hour < 12) return _EventTimeBucket.morning;
    if (hour < 17) return _EventTimeBucket.afternoon;
    return _EventTimeBucket.evening;
  }
}

extension on PreferredDistance {
  double get targetKm => switch (this) {
    PreferredDistance.fiveK => 5,
    PreferredDistance.tenK => 10,
    PreferredDistance.halfMarathon => 21,
    PreferredDistance.marathon => 42,
  };
}

extension on PaceLevel {
  int get secondsPerKm => switch (this) {
    PaceLevel.easy => 420,
    PaceLevel.moderate => 360,
    PaceLevel.fast => 300,
    PaceLevel.competitive => 255,
  };
}
