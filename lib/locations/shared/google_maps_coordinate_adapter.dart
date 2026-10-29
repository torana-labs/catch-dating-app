import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

extension GoogleMapsLocationCoordinateX on LocationCoordinate {
  gmaps.LatLng toGoogleMapsLatLng() => gmaps.LatLng(latitude, longitude);
}

extension GoogleMapsLatLngX on gmaps.LatLng {
  LocationCoordinate toLocationCoordinate() =>
      LocationCoordinate(latitude, longitude);
}
