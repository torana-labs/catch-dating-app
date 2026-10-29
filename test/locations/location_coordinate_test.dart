import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LocationCoordinate', () {
    test('builds from nullable primitive coordinate fields', () {
      expect(
        LocationCoordinate.fromNullable(latitude: 19.0760, longitude: 72.8777),
        const LocationCoordinate(19.0760, 72.8777),
      );
      expect(
        LocationCoordinate.fromNullable(latitude: null, longitude: 72.8777),
        isNull,
      );
      expect(
        LocationCoordinate.fromNullable(latitude: 19.0760, longitude: null),
        isNull,
      );
    });

    test('computes approximate haversine distance in meters', () {
      const bandra = LocationCoordinate(19.0607, 72.8362);
      const colaba = LocationCoordinate(18.9067, 72.8147);

      expect(bandra.distanceTo(colaba), closeTo(17250, 300));
    });
  });
}
