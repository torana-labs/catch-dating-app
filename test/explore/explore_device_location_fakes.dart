import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';

class NoDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async => null;

  @override
  Future<DeviceLocationRequestResult> request() async =>
      const DeviceLocationRequestResult(
        failure: DeviceLocationFailure.unavailable,
      );
}

class FixedDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async =>
      const LocationCoordinate(19.0608, 72.8365);

  @override
  Future<DeviceLocationRequestResult> request() async =>
      const DeviceLocationRequestResult(
        location: LocationCoordinate(19.0608, 72.8365),
      );
}

class FakeDeviceLocation extends DeviceLocation {
  FakeDeviceLocation(this.location);

  final LocationCoordinate? location;

  @override
  Future<LocationCoordinate?> build() async => location;

  @override
  Future<DeviceLocationRequestResult> request() async =>
      DeviceLocationRequestResult(location: location);
}
