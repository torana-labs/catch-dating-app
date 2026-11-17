import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/location_coordinate.dart';

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
  EventMapItem({required this.event, required this.status, this.organizerName})
    : coordinate = _eventCoordinate(event);

  final Event event;
  final EventTileStatus status;
  final String? organizerName;

  @override
  String get mapId => event.id;

  @override
  final LocationCoordinate coordinate;

  @override
  ActivityKind get activityKind => event.activityKind;

  @override
  String get locationName => event.locationName;

  EventTileData get tileData => EventTileData.fromEvent(
    event: event,
    status: status,
    organizerName: organizerName,
  );

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
  Map<String, String> organizerNamesById = const <String, String>{},
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
          organizerName: organizerNamesById[event.organizerId],
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
