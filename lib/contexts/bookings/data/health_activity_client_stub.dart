import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';

HealthActivityClient createHealthActivityClient() {
  return const UnsupportedHealthActivityClient();
}

class UnsupportedHealthActivityClient implements HealthActivityClient {
  const UnsupportedHealthActivityClient();

  @override
  Future<HealthActivityCapabilities> capabilities() async {
    return const HealthActivityCapabilities(
      platform: HealthActivityPlatform.unsupported,
    );
  }

  @override
  Future<List<PhysicalActivity>> fetchPhysicalActivities({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    return const [];
  }

  @override
  Future<bool?> hasActivityReadPermission() async {
    return false;
  }

  @override
  Future<void> installHealthConnect() async {}

  @override
  Future<bool> requestActivityReadPermission() async {
    return false;
  }
}
