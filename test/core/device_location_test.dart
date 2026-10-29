import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  test('passive device-location reads never request permission', () async {
    final gateway = _FakeDeviceLocationGateway(
      permission: LocationPermission.denied,
    );
    final container = ProviderContainer(
      overrides: [deviceLocationGatewayProvider.overrideWithValue(gateway)],
    );
    addTearDown(container.dispose);

    expect(await container.read(deviceLocationProvider.future), isNull);
    expect(gateway.requestCount, 0);
    expect(gateway.positionCount, 0);
  });

  test(
    'explicit device-location request asks once and publishes location',
    () async {
      final gateway = _FakeDeviceLocationGateway(
        permission: LocationPermission.denied,
        requestedPermission: LocationPermission.whileInUse,
      );
      final container = ProviderContainer(
        overrides: [deviceLocationGatewayProvider.overrideWithValue(gateway)],
      );
      addTearDown(container.dispose);

      await container.read(deviceLocationProvider.future);
      final result = await container
          .read(deviceLocationProvider.notifier)
          .request();

      expect(result.location?.latitude, 22.72);
      expect(result.location?.longitude, 75.86);
      expect(result.failure, isNull);
      expect(gateway.requestCount, 1);
      expect(gateway.positionCount, 1);
      expect(
        container.read(deviceLocationProvider).asData?.value,
        same(result.location),
      );
    },
  );

  test('already-granted location resolves passively', () async {
    final gateway = _FakeDeviceLocationGateway(
      permission: LocationPermission.always,
    );
    final container = ProviderContainer(
      overrides: [deviceLocationGatewayProvider.overrideWithValue(gateway)],
    );
    addTearDown(container.dispose);

    final location = await container.read(deviceLocationProvider.future);

    expect(location?.latitude, 22.72);
    expect(gateway.requestCount, 0);
    expect(gateway.positionCount, 1);
  });

  test('disabled services expose a location-settings recovery', () async {
    final gateway = _FakeDeviceLocationGateway(
      permission: LocationPermission.denied,
      serviceEnabled: false,
    );
    final container = ProviderContainer(
      overrides: [deviceLocationGatewayProvider.overrideWithValue(gateway)],
    );
    addTearDown(container.dispose);

    expect(await container.read(deviceLocationProvider.future), isNull);
    final controller = container.read(deviceLocationProvider.notifier);
    expect(await controller.openRecoverySettings(), isTrue);
    expect(gateway.locationSettingsCount, 1);
  });

  test('permanent denial exposes an app-settings recovery', () async {
    final gateway = _FakeDeviceLocationGateway(
      permission: LocationPermission.deniedForever,
    );
    final container = ProviderContainer(
      overrides: [deviceLocationGatewayProvider.overrideWithValue(gateway)],
    );
    addTearDown(container.dispose);

    expect(await container.read(deviceLocationProvider.future), isNull);
    final controller = container.read(deviceLocationProvider.notifier);
    expect(await controller.openRecoverySettings(), isTrue);
    expect(gateway.appSettingsCount, 1);
  });
}

class _FakeDeviceLocationGateway implements DeviceLocationGateway {
  _FakeDeviceLocationGateway({
    required this.permission,
    this.requestedPermission = LocationPermission.denied,
    this.serviceEnabled = true,
  });

  LocationPermission permission;
  final LocationPermission requestedPermission;
  final bool serviceEnabled;
  int requestCount = 0;
  int positionCount = 0;
  int appSettingsCount = 0;
  int locationSettingsCount = 0;

  @override
  Future<LocationPermission> checkPermission() async => permission;

  @override
  Future<Position> getCurrentPosition() async {
    positionCount += 1;
    return Position(
      longitude: 75.86,
      latitude: 22.72,
      timestamp: DateTime(2026, 7, 13),
      accuracy: 10,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
  }

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<bool> openAppSettings() async {
    appSettingsCount += 1;
    return true;
  }

  @override
  Future<bool> openLocationSettings() async {
    locationSettingsCount += 1;
    return true;
  }

  @override
  Future<LocationPermission> requestPermission() async {
    requestCount += 1;
    permission = requestedPermission;
    return permission;
  }
}
