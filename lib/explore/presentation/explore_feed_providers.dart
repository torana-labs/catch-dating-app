import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_search_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/explore/presentation/explore_discovery_window_controller.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_logic.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_feed_providers.g.dart';

/// Shared wall-clock snapshot for one mounted Explore surface.
///
/// Keeping the query window and date-strip labels on the same provider avoids
/// midnight drift and gives capture/tests one explicit deterministic seam.
@riverpod
DateTime exploreDiscoveryReferenceNow(Ref ref) => _discoveryReferenceNow();

@riverpod
AsyncValue<String?> exploreViewerCohortId(Ref ref) {
  final uidAsync = ref.watch(uidProvider);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  if (uidState.isLoading) return const AsyncLoading();
  if (uidState.hasError) {
    return AsyncError(
      uidState.error!,
      uidState.stackTrace ?? StackTrace.current,
    );
  }
  if (uidState.value == null) return const AsyncData(null);

  final userProfileAsync = ref.watch(watchUserProfileProvider);
  final userProfileState = catchAsyncStateFromAsyncValue(userProfileAsync);
  if (userProfileState.isLoading) return const AsyncLoading();
  if (userProfileState.hasError) {
    return AsyncError(
      userProfileState.error!,
      userProfileState.stackTrace ?? StackTrace.current,
    );
  }
  final userProfile = userProfileState.value;
  if (userProfile == null) return const AsyncData(null);
  final cohortId = const EventCohortResolver()
      .resolve(EventAttendeeProfile.fromUserProfile(userProfile))
      .id;
  return AsyncData(cohortId);
}

// provider-graph: high-fan-out:exploreFeedViewModelProvider watch -- The eighteen dependencies are a cohesive discovery aggregate spanning filters, viewer eligibility, memberships, participations, saves, internal and external supply, search, and club names. Splitting now would duplicate partial-loading and precedence logic; revisit if a second route needs a stable subset or fan-out rises above twenty.
@riverpod
AsyncValue<ExploreFeedViewModel> exploreFeedViewModel(Ref ref) {
  final city = ref.watch(selectedExploreCityProvider);
  final query = ref.watch(exploreSearchQueryProvider);
  final filters = ref.watch(exploreFiltersProvider);
  final organizersAsync = ref.watch(exploreSourceOrganizersProvider);
  final uidAsync = ref.watch(uidProvider);
  final now = ref.watch(exploreDiscoveryReferenceNowProvider);
  final selectedTimeWindow = exploreTimeWindowFor(filters.timeFilter, now);
  final queryTimeWindow =
      isExploreDateStripFilter(filters.timeFilter) &&
          filters.timeFilter != ExploreTimeFilter.anytime
      ? exploreDateStripQueryWindow(now)
      : selectedTimeWindow;
  final activityKindFilter = _activityKindForFilter(filters.activityTag);
  final distanceFilterKm = exploreDistanceFilterKm(filters.distanceFilter);
  final normalizedQuery = query.trim().toLowerCase();
  final deviceLocationAsync = distanceFilterKm == null
      ? const AsyncData<LocationCoordinate?>(null)
      : ref.watch(deviceLocationProvider);
  final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final deviceLocationState = catchAsyncStateFromAsyncValue(
    deviceLocationAsync,
  );
  // Server search keys off the debounced query so typing doesn't fire a
  // Cloud Function call per keystroke. Local substring matching below uses
  // the live `normalizedQuery`, so the feed stays responsive while it settles.
  final debouncedQueryState = catchAsyncStateFromAsyncValue(
    ref.watch(debouncedExploreSearchQueryProvider),
  );
  final debouncedQuery = debouncedQueryState.value ?? '';
  final searchAsync = debouncedQuery.length < 2
      ? const AsyncData<ExploreSearchResult?>(null)
      : ref.watch(
          exploreServerSearchProvider(
            query: debouncedQuery,
            cityName: city.effectiveMarketId,
          ),
        );

  final searchState = catchAsyncStateFromAsyncValue(searchAsync);

  if (organizersState.isLoading ||
      uidState.isLoading ||
      deviceLocationState.isLoading) {
    return const AsyncLoading();
  }
  if (organizersState.hasError) {
    return AsyncError(
      organizersState.error!,
      organizersState.stackTrace ?? StackTrace.current,
    );
  }
  if (uidState.hasError) {
    return AsyncError(
      uidState.error!,
      uidState.stackTrace ?? StackTrace.current,
    );
  }
  if (deviceLocationState.hasError) {
    return AsyncError(
      deviceLocationState.error!,
      deviceLocationState.stackTrace ?? StackTrace.current,
    );
  }

  final sourceOrganizers = organizersState.value ?? const <Organizer>[];
  final sourceOrganizerIds = sourceOrganizers
      .map((organizer) => organizer.id)
      .toSet();
  final searchResult = searchState.value;
  final serverEventIds = searchResult?.eventIds.toSet();
  final serverOrganizerIds = searchResult?.organizerIds.toSet();

  final uid = uidState.value;
  final viewerCohortIdAsync = uid == null
      ? const AsyncData<String?>(null)
      : ref.watch(exploreViewerCohortIdProvider);
  final userProfileAsync = uid == null
      ? const AsyncData(null)
      : ref.watch(watchUserProfileProvider);
  final followedOrganizerIdsAsync = ref.watch(
    currentUserFollowedOrganizerIdsProvider,
  );
  final participationsAsync = uid == null
      ? const AsyncData<List<EventParticipation>>([])
      : ref.watch(watchEventParticipationsForUserProvider(uid));
  final savedEventEdgesAsync = uid == null
      ? const AsyncData<List<SavedEvent>>([])
      : ref.watch(watchSavedEventsForUserProvider(uid));
  final userProfileState = catchAsyncStateFromAsyncValue(userProfileAsync);
  final viewerCohortIdState = catchAsyncStateFromAsyncValue(
    viewerCohortIdAsync,
  );
  final followedOrganizerIdsState = catchAsyncStateFromAsyncValue(
    followedOrganizerIdsAsync,
  );
  final participationsState = catchAsyncStateFromAsyncValue(
    participationsAsync,
  );
  final savedEventEdgesState = catchAsyncStateFromAsyncValue(
    savedEventEdgesAsync,
  );

  if (userProfileState.isLoading ||
      viewerCohortIdState.isLoading ||
      followedOrganizerIdsState.isLoading ||
      participationsState.isLoading ||
      savedEventEdgesState.isLoading) {
    return const AsyncLoading();
  }
  if (viewerCohortIdState.hasError) {
    return AsyncError(
      viewerCohortIdState.error!,
      viewerCohortIdState.stackTrace ?? StackTrace.current,
    );
  }
  if (userProfileState.hasError) {
    return AsyncError(
      userProfileState.error!,
      userProfileState.stackTrace ?? StackTrace.current,
    );
  }
  if (followedOrganizerIdsState.hasError) {
    return AsyncError(
      followedOrganizerIdsState.error!,
      followedOrganizerIdsState.stackTrace ?? StackTrace.current,
    );
  }
  if (participationsState.hasError) {
    return AsyncError(
      participationsState.error!,
      participationsState.stackTrace ?? StackTrace.current,
    );
  }
  if (savedEventEdgesState.hasError) {
    return AsyncError(
      savedEventEdgesState.error!,
      savedEventEdgesState.stackTrace ?? StackTrace.current,
    );
  }

  final followedOrganizerIds = followedOrganizerIdsState.value ?? <String>{};
  final membershipOrganizerIds = followedOrganizerIds;
  final userProfile = userProfileState.value;
  final viewerCohortId = viewerCohortIdState.value;

  final windowRequest = ExploreDiscoveryWindowRequest(
    internalQuery: EventDiscoveryQuery.forCity(
      marketId: city.effectiveMarketId,
      startAt: queryTimeWindow?.start ?? now,
      endBefore: queryTimeWindow?.end,
      activityKinds: [?activityKindFilter],
      center: deviceLocationState.value,
      maxDistanceKm: distanceFilterKm,
      viewerCohortId: viewerCohortId,
    ),
    externalQuery: ExternalEventDiscoveryQuery.forCity(
      citySlug: city.effectiveSlug,
      startAt: queryTimeWindow?.start ?? now,
      endBefore: queryTimeWindow?.end,
      activityKinds: [?activityKindFilter],
    ),
  );
  final discoveryWindowAsync = ref.watch(
    exploreDiscoveryWindowProvider(windowRequest),
  );
  final discoveryWindowState = catchAsyncStateFromAsyncValue(
    discoveryWindowAsync,
  );
  if (discoveryWindowState.isLoading) {
    return const AsyncLoading();
  }
  if (discoveryWindowState.hasError) {
    return AsyncError(
      discoveryWindowState.error!,
      discoveryWindowState.stackTrace ?? StackTrace.current,
    );
  }
  final discoveryWindow =
      discoveryWindowState.value ??
      (throw StateError(
        'Explore discovery window resolved without data, loading, or error.',
      ));

  final eventsById = <String, Event>{
    for (final event in discoveryWindow.internalEvents) event.id: event,
  };
  final followedRecommendationsAsync =
      uid == null || followedOrganizerIds.isEmpty
      ? const AsyncData<List<ExploreEventRecommendationCandidate>>([])
      : ref.watch(
          exploreRecommendedEventsProvider(
            ExploreRecommendationsQuery(
              userId: uid,
              followedOrganizerIds: followedOrganizerIds,
            ),
          ),
        );
  final followedRecommendationsState = catchAsyncStateFromAsyncValue(
    followedRecommendationsAsync,
  );
  if (followedRecommendationsState.isLoading) return const AsyncLoading();
  if (followedRecommendationsState.hasError) {
    return AsyncError(
      followedRecommendationsState.error!,
      followedRecommendationsState.stackTrace ?? StackTrace.current,
    );
  }
  final savedEventIds =
      savedEventEdgesState.value
          ?.map((savedEvent) => savedEvent.eventId)
          .toSet() ??
      <String>{};
  final missingPersonalEventIds = <String>{
    for (final participation
        in participationsState.value ?? const <EventParticipation>[])
      if (participation.status == EventParticipationStatus.signedUp &&
          !eventsById.containsKey(participation.eventId))
        participation.eventId,
    for (final eventId in savedEventIds)
      if (!eventsById.containsKey(eventId)) eventId,
  };
  final personalEventsAsync = uid == null || missingPersonalEventIds.isEmpty
      ? const AsyncData<List<Event>>([])
      : ref.watch(
          watchEventsByIdsProvider(EventsByIdQuery(missingPersonalEventIds)),
        );
  final searchEventsAsync =
      searchResult == null || searchResult.eventIds.isEmpty
      ? const AsyncData<List<Event>>([])
      : ref.watch(
          watchEventsByIdsProvider(EventsByIdQuery(searchResult.eventIds)),
        );
  final personalEventsState = catchAsyncStateFromAsyncValue(
    personalEventsAsync,
  );
  final searchEventsState = catchAsyncStateFromAsyncValue(searchEventsAsync);
  // Personal event enrichment (out-of-city joined/saved events) is
  // intentionally non-blocking: the feed renders immediately from in-city
  // discovery and personal events stream in progressively, degrading
  // gracefully if that secondary query is slow or fails. Search results, by
  // contrast, are the primary content and must block/surface errors.
  if (searchEventsState.isLoading) return const AsyncLoading();
  if (searchEventsState.hasError) {
    return AsyncError(
      searchEventsState.error!,
      searchEventsState.stackTrace ?? StackTrace.current,
    );
  }

  final participationByEventId = <String, EventParticipation>{
    for (final participation
        in participationsState.value ?? const <EventParticipation>[])
      participation.eventId: participation,
  };
  for (final event in personalEventsState.value ?? const <Event>[]) {
    final participation = participationByEventId[event.id];
    if (sourceOrganizerIds.contains(event.organizerId) ||
        (event.synthetic &&
            participation?.status == EventParticipationStatus.signedUp)) {
      eventsById[event.id] = event;
    }
  }
  for (final candidate
      in followedRecommendationsState.value ??
          const <ExploreEventRecommendationCandidate>[]) {
    eventsById.putIfAbsent(candidate.event.id, () => candidate.event);
  }
  for (final event in searchEventsState.value ?? const <Event>[]) {
    eventsById[event.id] = event;
  }
  final extraOrganizerIds = <String>{
    for (final organizerId in serverOrganizerIds ?? const <String>{})
      if (!sourceOrganizerIds.contains(organizerId)) organizerId,
    for (final event in eventsById.values)
      if (!sourceOrganizerIds.contains(event.organizerId)) event.organizerId,
  };
  final extraOrganizersAsync = extraOrganizerIds.isEmpty
      ? const AsyncData<List<Organizer>>([])
      : ref.watch(
          watchOrganizersForMessagingByIdsProvider(
            OrganizersByIdQuery(extraOrganizerIds),
          ),
        );
  final extraOrganizersState = catchAsyncStateFromAsyncValue(
    extraOrganizersAsync,
  );
  if (extraOrganizersState.isLoading) return const AsyncLoading();
  if (extraOrganizersState.hasError) {
    return AsyncError(
      extraOrganizersState.error!,
      extraOrganizersState.stackTrace ?? StackTrace.current,
    );
  }
  final organizerById = {
    for (final organizer in sourceOrganizers) organizer.id: organizer,
    for (final organizer in extraOrganizersState.value ?? const <Organizer>[])
      organizer.id: organizer,
  };
  final deviceLocation = deviceLocationState.value;
  final allItems = eventsById.values
      .where((event) => event.isUpcomingAt(now))
      .map((event) {
        final organizer = organizerById[event.organizerId];
        final participation = participationByEventId[event.id];
        final isSignedUpSyntheticFixture =
            event.synthetic &&
            participation?.status == EventParticipationStatus.signedUp;
        if (event.synthetic && !isSignedUpSyntheticFixture) {
          return null;
        }
        if (organizer == null ||
            (!organizer.isPubliclyBrowseable && !isSignedUpSyntheticFixture)) {
          return null;
        }
        final isOrganizerMember = membershipOrganizerIds.contains(
          event.organizerId,
        );
        final distanceFromUserKm = _distanceFromUserKm(
          event: event,
          deviceLocation: deviceLocation,
        );
        return ExploreEventItem(
          event: event,
          organizer: organizer,
          availability: resolveViewerEventAvailability(
            event: event,
            userProfile: userProfile,
            participation: participationByEventId[event.id],
            isSaved: savedEventIds.contains(event.id),
            isOrganizerMember: isOrganizerMember,
            now: now,
          ),
          isJoinedOrganizerMember: isOrganizerMember,
          isFollowedOrganizerSignal: followedOrganizerIds.contains(
            event.organizerId,
          ),
          distanceFromUserKm: distanceFromUserKm,
        );
      })
      .nonNulls
      .where(
        (item) => _matchesOrganizerScopeFilters(
          organizer: item.organizer,
          filters: filters,
          joinedOrganizerIds: membershipOrganizerIds,
          activityKindFilter: activityKindFilter,
        ),
      )
      .where((item) => _matchesDistanceFilter(item, distanceFilterKm))
      .where(
        (item) => _matchesSearch(
          item,
          normalizedQuery,
          serverEventIds: serverEventIds,
          serverOrganizerIds: serverOrganizerIds,
        ),
      )
      .toList();
  final items =
      allItems
          .where((item) => _matchesEventTimeFilters(item.event, filters, now))
          .toList()
        ..sort((a, b) => a.event.startTime.compareTo(b.event.startTime));
  final allExternalItems = discoveryWindow.externalEvents
      .where((event) => event.isUpcomingAt(now))
      .map((event) {
        return ExploreExternalEventItem(
          event: event,
          distanceFromUserKm: _externalDistanceFromUserKm(
            event: event,
            deviceLocation: deviceLocation,
          ),
        );
      })
      .where((item) => _matchesExternalDistanceFilter(item, distanceFilterKm))
      .where((item) => _matchesExternalSearch(item, normalizedQuery))
      .toList();
  final externalItems =
      allExternalItems
          .where(
            (item) =>
                _matchesExternalEventTimeFilters(item.event, filters, now),
          )
          .toList()
        ..sort((a, b) => a.event.startTime.compareTo(b.event.startTime));
  final dateSupplyCounts = _exploreDateSupplyCounts(
    internalItems: allItems,
    externalItems: allExternalItems,
    now: now,
  );

  return AsyncData(
    ExploreFeedViewModel(
      items: List.unmodifiable(items),
      featuredEventId: selectExploreFeaturedEventId(
        items: items,
        viewer: userProfile,
        signedUpEventIds: {
          for (final participation
              in participationsState.value ?? const <EventParticipation>[])
            if (participation.status == EventParticipationStatus.signedUp)
              participation.eventId,
        },
        now: now,
      ),
      externalItems: List.unmodifiable(externalItems),
      dateSupplyCounts: dateSupplyCounts,
      isExhaustive: discoveryWindow.isExhaustive,
      isLoadingMore: discoveryWindow.isLoadingMore,
      windowRequest: windowRequest,
    ),
  );
}

Map<ExploreTimeFilter, int> _exploreDateSupplyCounts({
  required List<ExploreEventItem> internalItems,
  required List<ExploreExternalEventItem> externalItems,
  required DateTime now,
}) {
  final starts = <DateTime>[
    for (final item in internalItems) item.event.startTime,
    for (final item in externalItems) item.event.startTime,
  ];
  return Map.unmodifiable({
    for (final filter in displayedExploreDateFilters)
      filter: filter == ExploreTimeFilter.anytime
          ? starts.length
          : starts
                .where(
                  (start) => exploreTimeWindowFor(filter, now)!.contains(start),
                )
                .length,
  });
}

@riverpod
AsyncValue<List<ExploreEventRecommendation>> exploreRecommendations(Ref ref) {
  final uidAsync = ref.watch(uidProvider);
  final followedOrganizerIdsAsync = ref.watch(
    currentUserFollowedOrganizerIdsProvider,
  );
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  final followedOrganizerIdsState = catchAsyncStateFromAsyncValue(
    followedOrganizerIdsAsync,
  );
  if (uidState.isLoading || followedOrganizerIdsState.isLoading) {
    return const AsyncLoading();
  }
  if (uidState.hasError) {
    return AsyncError(
      uidState.error!,
      uidState.stackTrace ?? StackTrace.current,
    );
  }
  if (followedOrganizerIdsState.hasError) {
    return AsyncError(
      followedOrganizerIdsState.error!,
      followedOrganizerIdsState.stackTrace ?? StackTrace.current,
    );
  }

  final uid = uidState.value;
  final followedOrganizerIds = followedOrganizerIdsState.value ?? <String>{};
  if (uid == null || followedOrganizerIds.isEmpty) {
    return const AsyncData(<ExploreEventRecommendation>[]);
  }

  final userAsync = ref.watch(watchUserProfileProvider);
  final signedUpEventsAsync = ref.watch(watchSignedUpEventsProvider(uid));
  final attendedEventsAsync = ref.watch(watchAttendedEventsProvider(uid));
  final candidatesAsync = ref.watch(
    exploreRecommendedEventsProvider(
      ExploreRecommendationsQuery(
        userId: uid,
        followedOrganizerIds: followedOrganizerIds,
      ),
    ),
  );
  final userState = catchAsyncStateFromAsyncValue(userAsync);
  final signedUpEventsState = catchAsyncStateFromAsyncValue(
    signedUpEventsAsync,
  );
  final attendedEventsState = catchAsyncStateFromAsyncValue(
    attendedEventsAsync,
  );
  final candidatesState = catchAsyncStateFromAsyncValue(candidatesAsync);
  if (userState.isLoading ||
      signedUpEventsState.isLoading ||
      attendedEventsState.isLoading ||
      candidatesState.isLoading) {
    return const AsyncLoading();
  }
  if (userState.hasError) {
    return AsyncError(
      userState.error!,
      userState.stackTrace ?? StackTrace.current,
    );
  }
  if (signedUpEventsState.hasError) {
    return AsyncError(
      signedUpEventsState.error!,
      signedUpEventsState.stackTrace ?? StackTrace.current,
    );
  }
  if (attendedEventsState.hasError) {
    return AsyncError(
      attendedEventsState.error!,
      attendedEventsState.stackTrace ?? StackTrace.current,
    );
  }
  if (candidatesState.hasError) {
    return AsyncError(
      candidatesState.error!,
      candidatesState.stackTrace ?? StackTrace.current,
    );
  }

  final signedUpEvents = signedUpEventsState.value ?? const <Event>[];
  return AsyncData(
    rankExploreEventRecommendations(
      candidates:
          candidatesState.value ??
          const <ExploreEventRecommendationCandidate>[],
      signedUpEventIds: signedUpEvents.map((event) => event.id).toSet(),
      attendedEvents: attendedEventsState.value ?? const <Event>[],
      signedUpEvents: signedUpEvents,
      viewer: userState.value,
      now: ref.watch(exploreDiscoveryReferenceNowProvider),
    ),
  );
}

bool _matchesOrganizerScopeFilters({
  required Organizer organizer,
  required ExploreFilterSelection filters,
  required Set<String> joinedOrganizerIds,
  required ActivityKind? activityKindFilter,
}) {
  // When the selected tag resolves to a concrete ActivityKind the events query
  // already filtered on it, so the club need not also carry the tag as text.
  return organizerMatchesScopeFilters(
    organizer: organizer,
    filters: filters,
    joinedOrganizerIds: joinedOrganizerIds,
    activityHandledByEventFilter: activityKindFilter != null,
  );
}

bool _matchesEventTimeFilters(
  Event event,
  ExploreFilterSelection filters,
  DateTime now,
) {
  final window = exploreTimeWindowFor(filters.timeFilter, now);
  return window == null || window.contains(event.startTime);
}

bool _matchesExternalEventTimeFilters(
  ExternalEvent event,
  ExploreFilterSelection filters,
  DateTime now,
) {
  final window = exploreTimeWindowFor(filters.timeFilter, now);
  return window == null || window.contains(event.startTime);
}

bool _matchesDistanceFilter(ExploreEventItem item, double? maxKm) {
  if (maxKm == null) return true;
  final distance = item.distanceFromUserKm;
  return distance != null && distance <= maxKm;
}

bool _matchesExternalDistanceFilter(
  ExploreExternalEventItem item,
  double? maxKm,
) {
  if (maxKm == null) return true;
  final distance = item.distanceFromUserKm;
  return distance != null && distance <= maxKm;
}

double? _distanceFromUserKm({
  required Event event,
  required LocationCoordinate? deviceLocation,
}) {
  if (deviceLocation == null) return null;
  final eventLocation = LocationCoordinate.fromNullable(
    latitude: event.effectiveStartingPointLat,
    longitude: event.effectiveStartingPointLng,
  );
  if (eventLocation == null) return null;
  return deviceLocation.distanceTo(eventLocation) / 1000;
}

double? _externalDistanceFromUserKm({
  required ExternalEvent event,
  required LocationCoordinate? deviceLocation,
}) {
  if (deviceLocation == null) return null;
  final eventLocation = LocationCoordinate.fromNullable(
    latitude: event.latitude,
    longitude: event.longitude,
  );
  if (eventLocation == null) return null;
  return deviceLocation.distanceTo(eventLocation) / 1000;
}

bool _matchesSearch(
  ExploreEventItem item,
  String normalizedQuery, {
  Set<String>? serverEventIds,
  Set<String>? serverOrganizerIds,
}) {
  if (normalizedQuery.isEmpty) return true;
  if (serverEventIds != null || serverOrganizerIds != null) {
    return (serverEventIds?.contains(item.event.id) ?? false) ||
        (serverOrganizerIds?.contains(item.organizer.id) ?? false);
  }
  final event = item.event;
  final organizer = item.organizer;
  final searchable = [
    event.title,
    event.locationName,
    event.description,
    event.eventFormat.label,
    event.pace.label,
    organizer.name,
    organizer.area,
    organizer.displayHostName,
    ...organizer.tags,
  ].join(' ').toLowerCase();
  return searchable.contains(normalizedQuery);
}

bool _matchesExternalSearch(
  ExploreExternalEventItem item,
  String normalizedQuery,
) {
  if (normalizedQuery.isEmpty) return true;
  final event = item.event;
  final searchable = [
    event.title,
    event.description,
    event.meetingPoint,
    event.locationDetails,
    event.activityKind.label,
    event.platformLabel,
  ].whereType<String>().join(' ').toLowerCase();
  return searchable.contains(normalizedQuery);
}

DateTime _discoveryReferenceNow() {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day, now.hour, now.minute);
}

ActivityKind? _activityKindForFilter(String? value) {
  final normalized = value?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return null;
  for (final kind in ActivityKind.values) {
    if (kind.name.toLowerCase() == normalized ||
        kind.label.toLowerCase() == normalized) {
      return kind;
    }
  }
  return null;
}
