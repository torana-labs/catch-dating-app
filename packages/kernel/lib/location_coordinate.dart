import 'dart:math' as math;

/// App-owned coordinate value object.
///
/// Keep provider/UI SDK coordinate types, such as Google Maps LatLng, at adapter
/// edges. Firestore still stores primitive latitude/longitude fields.
class LocationCoordinate {
  const LocationCoordinate(this.latitude, this.longitude);

  final double latitude;
  final double longitude;

  static const earthRadiusMeters = 6371000.0;

  static LocationCoordinate? fromNullable({
    required double? latitude,
    required double? longitude,
  }) {
    if (latitude == null || longitude == null) return null;
    return LocationCoordinate(latitude, longitude);
  }

  double distanceTo(LocationCoordinate other) {
    final dLat = _toRadians(other.latitude - latitude);
    final dLng = _toRadians(other.longitude - longitude);
    final lat1 = _toRadians(latitude);
    final lat2 = _toRadians(other.latitude);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) *
            math.cos(lat2) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocationCoordinate &&
          runtimeType == other.runtimeType &&
          latitude == other.latitude &&
          longitude == other.longitude;

  @override
  int get hashCode => Object.hash(latitude, longitude);

  @override
  String toString() => 'LocationCoordinate($latitude, $longitude)';
}

double _toRadians(double degrees) => degrees * math.pi / 180;
