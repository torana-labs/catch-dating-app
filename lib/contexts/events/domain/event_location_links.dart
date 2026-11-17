import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';

Uri directionsUriForEvent(Event event) {
  final lat = event.effectiveStartingPointLat;
  final lng = event.effectiveStartingPointLng;

  if (lat == null || lng == null) {
    return _searchUri(query: event.locationName);
  }
  return _directionsUri(latitude: lat, longitude: lng);
}

/// The same directions link from a guest event card.
Uri directionsUriForCard(GuestEventCard card) {
  final lat = card.effectiveStartingPointLat;
  final lng = card.effectiveStartingPointLng;
  if (lat == null || lng == null) {
    return _searchUri(query: card.locationName);
  }
  return _directionsUri(latitude: lat, longitude: lng);
}

Uri _directionsUri({required double latitude, required double longitude}) {
  final destination = '$latitude,$longitude';
  return Uri.https('www.google.com', '/maps/dir/', {
    'api': '1',
    'destination': destination,
    'travelmode': 'walking',
  });
}

Uri _searchUri({required String query}) {
  return Uri.https('www.google.com', '/maps/search/', {
    'api': '1',
    'query': query,
  });
}
