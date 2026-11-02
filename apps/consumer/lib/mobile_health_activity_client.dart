import 'dart:io';

import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:health/health.dart' as health;

enum MobileHealthDevicePlatform { ios, android, unsupported }

MobileHealthDevicePlatform _defaultDevicePlatform() {
  if (Platform.isIOS) return MobileHealthDevicePlatform.ios;
  if (Platform.isAndroid) return MobileHealthDevicePlatform.android;
  return MobileHealthDevicePlatform.unsupported;
}

class MobileHealthActivityClient implements HealthActivityClient {
  MobileHealthActivityClient({
    health.Health? healthClient,
    MobileHealthDevicePlatform? devicePlatform,
  }) : _health = healthClient ?? health.Health(),
       _devicePlatform = devicePlatform ?? _defaultDevicePlatform();

  final health.Health _health;
  final MobileHealthDevicePlatform _devicePlatform;
  final HealthWorkoutPointMapper _mapper = const HealthWorkoutPointMapper();
  bool _configured = false;

  bool get _isSupportedDevice =>
      _devicePlatform != MobileHealthDevicePlatform.unsupported;

  @override
  Future<HealthActivityCapabilities> capabilities() async {
    if (!_isSupportedDevice) {
      return const HealthActivityCapabilities(
        platform: HealthActivityPlatform.unsupported,
      );
    }

    await _configure();
    if (_devicePlatform == MobileHealthDevicePlatform.ios) {
      return const HealthActivityCapabilities(
        platform: HealthActivityPlatform.appleHealth,
      );
    }

    final status = await _health.getHealthConnectSdkStatus();
    return HealthActivityCapabilities(
      platform: HealthActivityPlatform.healthConnect,
      healthConnectAvailability: switch (status) {
        health.HealthConnectSdkStatus.sdkAvailable =>
          HealthConnectAvailability.available,
        health.HealthConnectSdkStatus.sdkUnavailableProviderUpdateRequired =>
          HealthConnectAvailability.updateRequired,
        _ => HealthConnectAvailability.unavailable,
      },
    );
  }

  @override
  Future<List<PhysicalActivity>> fetchPhysicalActivities({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    if (!_isSupportedDevice) return const [];
    await _configure();

    final points = await _health.getHealthDataFromTypes(
      types: const [health.HealthDataType.WORKOUT],
      startTime: startTime,
      endTime: endTime,
    );

    final activities = <PhysicalActivity>[];
    for (final point in points) {
      final activity = _mapper.fromPoint(point);
      if (activity != null) activities.add(activity);
    }
    activities.sort((a, b) => a.startTime.compareTo(b.startTime));
    return activities;
  }

  @override
  Future<bool?> hasActivityReadPermission() async {
    if (!_isSupportedDevice) return false;
    await _configure();
    return _health.hasPermissions(
      _activityReadTypes,
      permissions: _activityReadPermissions,
    );
  }

  @override
  Future<void> installHealthConnect() async {
    if (_devicePlatform == MobileHealthDevicePlatform.android) {
      await _health.installHealthConnect();
    }
  }

  @override
  Future<bool> requestActivityReadPermission() async {
    if (!_isSupportedDevice) return false;
    await _configure();
    return _health.requestAuthorization(
      _activityReadTypes,
      permissions: _activityReadPermissions,
    );
  }

  Future<void> _configure() async {
    if (_configured) return;
    await _health.configure();
    _configured = true;
  }

  List<health.HealthDataType> get _activityReadTypes {
    final types = <health.HealthDataType>[health.HealthDataType.WORKOUT];
    if (_devicePlatform == MobileHealthDevicePlatform.ios &&
        _health.isDataTypeAvailable(
          health.HealthDataType.DISTANCE_WALKING_RUNNING,
        )) {
      types.add(health.HealthDataType.DISTANCE_WALKING_RUNNING);
    } else if (_devicePlatform == MobileHealthDevicePlatform.android &&
        _health.isDataTypeAvailable(health.HealthDataType.DISTANCE_DELTA)) {
      types.add(health.HealthDataType.DISTANCE_DELTA);
    }
    return types;
  }

  List<health.HealthDataAccess> get _activityReadPermissions =>
      List<health.HealthDataAccess>.filled(
        _activityReadTypes.length,
        health.HealthDataAccess.READ,
      );
}

/// Pure translation from plugin-owned workout payloads into Catch domain data.
///
/// Keeping this mapper free of platform channels makes unit conversion,
/// activity taxonomy, filtering, and stable-id behavior directly testable in
/// the Consumer app package.
class HealthWorkoutPointMapper {
  const HealthWorkoutPointMapper();

  PhysicalActivity? fromPoint(health.HealthDataPoint point) {
    final value = point.value;
    if (value is! health.WorkoutHealthValue) return null;
    final type = _activityType(value.workoutActivityType);
    if (type == null) return null;
    final distanceMeters = _distanceMeters(value);
    final duration = point.dateTo.difference(point.dateFrom);
    if ((distanceMeters == null || distanceMeters <= 0) &&
        duration.inMinutes <= 0) {
      return null;
    }

    return PhysicalActivity(
      stableId: 'health:${point.sourcePlatform.name}:${point.uuid}',
      provider: _providerFor(point.sourcePlatform),
      type: type,
      startTime: point.dateFrom,
      endTime: point.dateTo,
      distanceMeters: distanceMeters,
      isManualEntry: point.recordingMethod == health.RecordingMethod.manual,
      sourceName: point.sourceName,
    );
  }

  PhysicalActivityProvider _providerFor(health.HealthPlatformType platform) {
    return switch (platform) {
      health.HealthPlatformType.appleHealth =>
        PhysicalActivityProvider.appleHealth,
      health.HealthPlatformType.googleHealthConnect =>
        PhysicalActivityProvider.healthConnect,
    };
  }

  ActivityKind? _activityType(health.HealthWorkoutActivityType workoutType) {
    return switch (workoutType) {
      health.HealthWorkoutActivityType.RUNNING ||
      health.HealthWorkoutActivityType.RUNNING_TREADMILL =>
        ActivityKind.running,
      health.HealthWorkoutActivityType.WALKING ||
      health.HealthWorkoutActivityType.WALKING_TREADMILL =>
        ActivityKind.walking,
      health.HealthWorkoutActivityType.PICKLEBALL => ActivityKind.pickleball,
      health.HealthWorkoutActivityType.TENNIS ||
      health.HealthWorkoutActivityType.TABLE_TENNIS => ActivityKind.tennis,
      health.HealthWorkoutActivityType.BADMINTON => ActivityKind.badminton,
      health.HealthWorkoutActivityType.BIKING => ActivityKind.cycling,
      health.HealthWorkoutActivityType.YOGA => ActivityKind.yoga,
      _ => null,
    };
  }

  double? _distanceMeters(health.WorkoutHealthValue value) {
    final distance = value.totalDistance?.toDouble();
    if (distance == null) return null;

    return switch (value.totalDistanceUnit) {
      health.HealthDataUnit.METER || null => distance,
      health.HealthDataUnit.CENTIMETER => distance / 100,
      health.HealthDataUnit.INCH => distance * 0.0254,
      health.HealthDataUnit.FOOT => distance * 0.3048,
      health.HealthDataUnit.YARD => distance * 0.9144,
      health.HealthDataUnit.MILE => distance * 1609.344,
      _ => distance,
    };
  }
}
