import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'device_location.g.dart';

abstract interface class DeviceLocationGateway {
  Future<bool> isLocationServiceEnabled();

  Future<LocationPermission> checkPermission();

  Future<LocationPermission> requestPermission();

  Future<Position> getCurrentPosition();

  Future<bool> openAppSettings();

  Future<bool> openLocationSettings();
}

enum DeviceLocationFailure {
  servicesDisabled,
  permissionDenied,
  permissionDeniedForever,
  unavailable,
}

class DeviceLocationRequestResult {
  const DeviceLocationRequestResult({this.location, this.failure});

  final LocationCoordinate? location;
  final DeviceLocationFailure? failure;
}

class GeolocatorDeviceLocationGateway implements DeviceLocationGateway {
  const GeolocatorDeviceLocationGateway();

  @override
  Future<LocationPermission> checkPermission() => Geolocator.checkPermission();

  @override
  Future<Position> getCurrentPosition() => Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.low,
      timeLimit: Duration(seconds: 10),
    ),
  );

  @override
  Future<bool> isLocationServiceEnabled() =>
      Geolocator.isLocationServiceEnabled();

  @override
  Future<bool> openAppSettings() => Geolocator.openAppSettings();

  @override
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  @override
  Future<LocationPermission> requestPermission() =>
      Geolocator.requestPermission();
}

final deviceLocationGatewayProvider = Provider<DeviceLocationGateway>(
  (ref) => const GeolocatorDeviceLocationGateway(),
);

// keepalive: device location should be resolved once and reused by discovery
// surfaces instead of re-prompting across route rebuilds.
@Riverpod(keepAlive: true)
class DeviceLocation extends _$DeviceLocation {
  DeviceLocationFailure? _lastFailure;

  @override
  Future<LocationCoordinate?> build() => _resolve(requestIfDenied: false);

  /// Resolves location after an explicit user action and may show the native
  /// permission prompt. Passive consumers only call [build], which never asks.
  Future<DeviceLocationRequestResult> request() async {
    state = const AsyncLoading<LocationCoordinate?>();
    final next = await AsyncValue.guard(() => _resolve(requestIfDenied: true));
    state = next;
    return DeviceLocationRequestResult(
      location: next.asData?.value,
      failure: _lastFailure,
    );
  }

  Future<bool> openRecoverySettings() {
    final gateway = ref.read(deviceLocationGatewayProvider);
    return switch (_lastFailure) {
      DeviceLocationFailure.servicesDisabled => gateway.openLocationSettings(),
      DeviceLocationFailure.permissionDeniedForever =>
        gateway.openAppSettings(),
      _ => Future<bool>.value(false),
    };
  }

  Future<LocationCoordinate?> _resolve({required bool requestIfDenied}) async {
    _lastFailure = null;
    try {
      final gateway = ref.read(deviceLocationGatewayProvider);
      final serviceEnabled = await gateway.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _lastFailure = DeviceLocationFailure.servicesDisabled;
        return null;
      }

      var permission = await gateway.checkPermission();
      if (permission == LocationPermission.denied && requestIfDenied) {
        permission = await gateway.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        _lastFailure = DeviceLocationFailure.permissionDenied;
        return null;
      }
      if (permission == LocationPermission.deniedForever) {
        _lastFailure = DeviceLocationFailure.permissionDeniedForever;
        return null;
      }

      final position = await gateway.getCurrentPosition();
      return LocationCoordinate(position.latitude, position.longitude);
    } catch (error, stackTrace) {
      _lastFailure = DeviceLocationFailure.unavailable;
      ref
          .read(errorLoggerProvider)
          .logAppException(
            normalizeBackendError(
              error,
              stackTrace: stackTrace,
              context: const BackendErrorContext(
                service: BackendService.external,
                action: 'read device location',
                resource: 'device_location',
              ),
            ),
          );
      return null;
    }
  }
}
