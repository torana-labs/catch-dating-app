import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_location_links.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';

class EventLocationMapState {
  const EventLocationMapState._({
    required this.event,
    required this.enableNetworkTiles,
    required this.startingPoint,
    required this.directionsUri,
  });

  factory EventLocationMapState.fromEvent(
    Event event, {
    bool enableNetworkTiles = true,
  }) {
    return EventLocationMapState._(
      event: event,
      enableNetworkTiles: enableNetworkTiles,
      startingPoint: LocationCoordinate.fromNullable(
        latitude: event.effectiveStartingPointLat,
        longitude: event.effectiveStartingPointLng,
      ),
      directionsUri: directionsUriForEvent(event),
    );
  }

  final Event event;
  final bool enableNetworkTiles;

  final LocationCoordinate? startingPoint;
  final Uri directionsUri;

  bool get hasExactStartingPoint => startingPoint != null;

  String get locationName => event.locationName;

  String? get locationNotes {
    final notes = event.locationNotes;
    if (notes == null || notes.isEmpty) return null;
    return notes;
  }
}
