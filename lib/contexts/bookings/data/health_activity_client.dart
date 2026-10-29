import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';

enum HealthActivityPlatform { unsupported, appleHealth, healthConnect }

enum HealthConnectAvailability {
  notApplicable,
  available,
  unavailable,
  updateRequired,
}

class HealthActivityCapabilities {
  const HealthActivityCapabilities({
    required this.platform,
    this.healthConnectAvailability = HealthConnectAvailability.notApplicable,
  });

  final HealthActivityPlatform platform;
  final HealthConnectAvailability healthConnectAvailability;

  bool get isSupported =>
      platform == HealthActivityPlatform.appleHealth ||
      platform == HealthActivityPlatform.healthConnect;

  bool get canInstallHealthConnect =>
      platform == HealthActivityPlatform.healthConnect &&
      (healthConnectAvailability == HealthConnectAvailability.unavailable ||
          healthConnectAvailability ==
              HealthConnectAvailability.updateRequired);

  String get platformLabel {
    return switch (platform) {
      HealthActivityPlatform.appleHealth => 'Apple Health',
      HealthActivityPlatform.healthConnect => 'Health Connect',
      HealthActivityPlatform.unsupported => 'Health',
    };
  }
}

abstract class HealthActivityClient {
  Future<HealthActivityCapabilities> capabilities();

  Future<bool?> hasActivityReadPermission();

  Future<bool> requestActivityReadPermission();

  Future<List<PhysicalActivity>> fetchPhysicalActivities({
    required DateTime startTime,
    required DateTime endTime,
  });

  Future<void> installHealthConnect();
}
