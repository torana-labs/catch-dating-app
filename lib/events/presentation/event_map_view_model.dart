import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_map_view_model.g.dart';

sealed class EventMapPinItem {
  const EventMapPinItem();

  String get mapId;
  LocationCoordinate get coordinate;
  ActivityKind get activityKind;
  String get locationName;
  String get pinFlagLabel;
  String get markerSemanticLabel;
}

class EventMapItem extends EventMapPinItem {
  EventMapItem({required this.event, required this.status, this.clubName})
    : coordinate = _eventCoordinate(event);

  final Event event;
  final EventTileStatus status;
  final String? clubName;

  @override
  String get mapId => event.id;

  @override
  final LocationCoordinate coordinate;

  @override
  ActivityKind get activityKind => event.activityKind;

  @override
  String get locationName => event.locationName;

  EventTileData get tileData =>
      EventTileData.fromEvent(event: event, status: status, clubName: clubName);

  @override
  String get pinFlagLabel {
    final eventIdentity = event.eventFormat.customActivityLabel == null
        ? event.eventFormat.label
        : event.eventFormat.eventTitleLabel;
    return '${eventIdentity.toUpperCase()} · ${tileData.timeLabel.toUpperCase()}';
  }

  @override
  String get markerSemanticLabel =>
      '${event.title}, ${tileData.longDateLabel}, ${tileData.timeLabel}, ${tileData.meetingPoint}';
}

class ExternalEventMapItem extends EventMapPinItem {
  ExternalEventMapItem({required this.event})
    : coordinate = _externalEventCoordinate(event);

  final ExternalEvent event;

  @override
  final LocationCoordinate coordinate;

  @override
  String get mapId => 'external:${event.id}';

  @override
  ActivityKind get activityKind => event.activityKind;

  @override
  String get locationName => event.meetingPoint;

  @override
  String get pinFlagLabel =>
      '${event.activityKind.eventTitleLabel.toUpperCase()} · ${EventFormatters.time(event.startTime).toUpperCase()}';

  @override
  String get markerSemanticLabel =>
      '${event.title}, ${EventFormatters.longDate(event.startTime)}, ${EventFormatters.time(event.startTime)}, ${event.meetingPoint}';
}

class EventMapViewModel {
  const EventMapViewModel({
    required this.events,
    required this.pinnedEvents,
    this.items = const [],
    this.pinnedItems = const [],
    this.externalPinnedItems = const [],
  });

  final List<Event> events;
  final List<Event> pinnedEvents;
  final List<EventMapItem> items;
  final List<EventMapItem> pinnedItems;
  final List<ExternalEventMapItem> externalPinnedItems;

  bool get isEmpty => effectivePinItems.isEmpty;
  bool get hasPinnedEvents => effectivePinItems.isNotEmpty;
  List<EventMapItem> get effectiveItems => items.isEmpty && events.isNotEmpty
      ? [
          for (final event in events)
            if (hasEventMapPin(event))
              EventMapItem(event: event, status: EventTileStatus.open),
        ]
      : items;
  List<EventMapItem> get effectivePinnedItems {
    if (pinnedItems.isNotEmpty) {
      return [
        for (final item in pinnedItems)
          if (hasEventMapPin(item.event)) item,
      ];
    }
    if (pinnedEvents.isNotEmpty) {
      return [
        for (final event in pinnedEvents)
          if (hasEventMapPin(event))
            EventMapItem(event: event, status: EventTileStatus.open),
      ];
    }
    return [
      for (final item in effectiveItems)
        if (hasEventMapPin(item.event)) item,
    ];
  }

  List<EventMapPinItem> get effectivePinItems =>
      List.unmodifiable([...effectivePinnedItems, ...externalPinnedItems]);

  Event? selectedEvent(String? eventId) {
    if (eventId == null) return null;
    for (final event in events) {
      if (event.id == eventId) return event;
    }
    return null;
  }

  EventMapItem? selectedItem(String? eventId) {
    if (eventId == null) return null;
    for (final item in effectiveItems) {
      if (item.event.id == eventId) return item;
    }
    return null;
  }

  ExternalEventMapItem? selectedExternalItem(String? mapId) {
    if (mapId == null) return null;
    for (final item in externalPinnedItems) {
      if (item.mapId == mapId) return item;
    }
    return null;
  }

  LocationCoordinate? selectedCoordinate(String? mapId) {
    if (mapId == null) return null;
    for (final item in effectivePinItems) {
      if (item.mapId == mapId) return item.coordinate;
    }
    return null;
  }
}

EventMapViewModel buildEventMapViewModel({
  required List<Event> signedUpEvents,
  List<Event> savedEvents = const <Event>[],
  required List<Event> recommendedEvents,
  Map<String, String> clubNamesById = const <String, String>{},
  DateTime? now,
}) {
  final effectiveNow = now ?? DateTime.now();
  final eventsById = <String, Event>{};
  final statusById = <String, EventTileStatus>{};

  void addRun(Event event, EventTileStatus status) {
    if (!isUpcomingMapRun(event, effectiveNow)) return;
    eventsById[event.id] = event;
    statusById[event.id] = status;
  }

  for (final event in recommendedEvents) {
    addRun(event, EventTileStatus.recommended);
  }
  for (final event in savedEvents) {
    addRun(event, EventTileStatus.saved);
  }
  for (final event in signedUpEvents) {
    addRun(event, EventTileStatus.joined);
  }

  final events = eventsById.values.toList()
    ..sort((a, b) => a.startTime.compareTo(b.startTime));
  final items = [
    for (final event in events)
      if (hasEventMapPin(event))
        EventMapItem(
          event: event,
          status: statusById[event.id]!,
          clubName: clubNamesById[event.clubId],
        ),
  ];
  final pinnedItems = List<EventMapItem>.unmodifiable(items);
  final pinnedEvents = pinnedItems
      .map((item) => item.event)
      .toList(growable: false);

  return EventMapViewModel(
    events: List.unmodifiable(events),
    pinnedEvents: List.unmodifiable(pinnedEvents),
    items: List.unmodifiable(items),
    pinnedItems: List.unmodifiable(pinnedItems),
  );
}

bool hasEventMapPin(Event event) =>
    event.effectiveStartingPointLat != null &&
    event.effectiveStartingPointLng != null;

bool hasExternalEventMapPin(ExternalEvent event) =>
    event.latitude != null && event.longitude != null;

LocationCoordinate _eventCoordinate(Event event) {
  return LocationCoordinate.fromNullable(
        latitude: event.effectiveStartingPointLat,
        longitude: event.effectiveStartingPointLng,
      ) ??
      (throw ArgumentError.value(
        event.id,
        'event',
        'Map items require an exact starting point.',
      ));
}

LocationCoordinate _externalEventCoordinate(ExternalEvent event) {
  return LocationCoordinate.fromNullable(
        latitude: event.latitude,
        longitude: event.longitude,
      ) ??
      (throw ArgumentError.value(
        event.id,
        'event',
        'External map items require an exact starting point.',
      ));
}

bool isUpcomingMapRun(Event event, DateTime now) =>
    !event.isCancelled && event.startTime.isAfter(now);

/// Combines the current user's booked events and recommended events for the map.
///
/// The screen owns map selection and tile rendering. This provider owns the
/// feature data seam: profile lookup, event streams, recommendation fetch, merge,
/// de-duplication, chronological sort, and pin filtering.
@riverpod
AsyncValue<EventMapViewModel> eventMapViewModel(Ref ref) {
  final userProfileAsync = ref.watch(watchUserProfileProvider);
  final userProfileState = catchAsyncStateFromAsyncValue(userProfileAsync);

  if (userProfileState.isLoading) return const AsyncLoading();
  if (userProfileState.hasError) {
    return AsyncError(
      userProfileState.error!,
      userProfileState.stackTrace ?? StackTrace.current,
    );
  }

  final user = userProfileState.value;
  if (user == null) {
    return const AsyncData(
      EventMapViewModel(events: <Event>[], pinnedEvents: <Event>[]),
    );
  }

  final signedUpAsync = ref.watch(watchSignedUpEventsProvider(user.uid));
  final savedAsync = ref.watch(watchSavedEventDetailsForUserProvider(user.uid));
  final membershipsAsync = ref.watch(
    watchActiveClubMembershipsForUserProvider(user.uid),
  );
  final signedUpState = catchAsyncStateFromAsyncValue(signedUpAsync);
  final savedState = catchAsyncStateFromAsyncValue(savedAsync);
  final membershipsState = catchAsyncStateFromAsyncValue(membershipsAsync);
  final followedClubIds =
      membershipsState.value
          ?.map((membership) => membership.clubId)
          .toList(growable: false) ??
      const <String>[];
  final recommendedAsync = ref.watch(
    recommendedEventsProvider(
      RecommendedEventsQuery.fromClubIds(followedClubIds),
    ),
  );
  final recommendedState = catchAsyncStateFromAsyncValue(recommendedAsync);

  if (signedUpState.isLoading ||
      savedState.isLoading ||
      membershipsState.isLoading ||
      recommendedState.isLoading) {
    return const AsyncLoading();
  }
  if (signedUpState.hasError) {
    return AsyncError(
      signedUpState.error!,
      signedUpState.stackTrace ?? StackTrace.current,
    );
  }
  if (savedState.hasError) {
    return AsyncError(
      savedState.error!,
      savedState.stackTrace ?? StackTrace.current,
    );
  }
  if (membershipsState.hasError) {
    return AsyncError(
      membershipsState.error!,
      membershipsState.stackTrace ?? StackTrace.current,
    );
  }
  if (recommendedState.hasError) {
    return AsyncError(
      recommendedState.error!,
      recommendedState.stackTrace ?? StackTrace.current,
    );
  }

  final allEvents = <Event>[
    ...?signedUpState.value,
    ...?savedState.value,
    ...?recommendedState.value,
  ];
  final clubNamesAsync = ref.watch(
    clubNameLookupProvider(
      ClubNameLookupQuery(allEvents.map((event) => event.clubId)),
    ),
  );
  final clubNamesState = catchAsyncStateFromAsyncValue(clubNamesAsync);
  if (clubNamesState.isLoading) return const AsyncLoading();
  if (clubNamesState.hasError) {
    return AsyncError(
      clubNamesState.error!,
      clubNamesState.stackTrace ?? StackTrace.current,
    );
  }

  return AsyncData(
    buildEventMapViewModel(
      signedUpEvents: signedUpState.value ?? const <Event>[],
      savedEvents: savedState.value ?? const <Event>[],
      recommendedEvents: recommendedState.value ?? const <Event>[],
      clubNamesById: clubNamesState.value ?? const <String, String>{},
    ),
  );
}
