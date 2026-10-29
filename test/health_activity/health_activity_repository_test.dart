import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test(
    'fetchWeeklyActivity returns unsupported when platform has no client',
    () async {
      final repository = HealthActivityRepository(
        _FakeHealthActivityClient(
          capabilitiesValue: const HealthActivityCapabilities(
            platform: HealthActivityPlatform.unsupported,
          ),
        ),
      );

      final snapshot = await repository.fetchWeeklyActivity(
        referenceDate: DateTime(2026, 5, 20),
      );

      expect(
        snapshot.connectionStatus,
        HealthActivityConnectionStatus.unsupported,
      );
      expect(snapshot.canRequestPermission, isFalse);
    },
  );

  test(
    'fetchWeeklyActivity requires Health Connect when unavailable',
    () async {
      final repository = HealthActivityRepository(
        _FakeHealthActivityClient(
          capabilitiesValue: const HealthActivityCapabilities(
            platform: HealthActivityPlatform.healthConnect,
            healthConnectAvailability: HealthConnectAvailability.unavailable,
          ),
        ),
      );

      final snapshot = await repository.fetchWeeklyActivity(
        referenceDate: DateTime(2026, 5, 20),
      );

      expect(
        snapshot.connectionStatus,
        HealthActivityConnectionStatus.needsHealthConnect,
      );
      expect(snapshot.canInstallHealthConnect, isTrue);
    },
  );

  test('fetchWeeklyActivity requires permission before fetching', () async {
    final client = _FakeHealthActivityClient(
      capabilitiesValue: const HealthActivityCapabilities(
        platform: HealthActivityPlatform.healthConnect,
        healthConnectAvailability: HealthConnectAvailability.available,
      ),
      hasPermission: false,
    );
    final repository = HealthActivityRepository(client);

    final snapshot = await repository.fetchWeeklyActivity(
      referenceDate: DateTime(2026, 5, 20),
    );

    expect(
      snapshot.connectionStatus,
      HealthActivityConnectionStatus.permissionRequired,
    );
    expect(snapshot.platformLabel, 'Health Connect');
    expect(client.fetchCallCount, 0);
  });

  test('fetchWeeklyActivity returns connected weekly summary', () async {
    final activity = PhysicalActivity(
      stableId: 'activity-1',
      provider: PhysicalActivityProvider.appleHealth,
      type: ActivityKind.running,
      startTime: DateTime(2026, 5, 20, 7),
      endTime: DateTime(2026, 5, 20, 7, 45),
      distanceMeters: 5000,
    );
    final client = _FakeHealthActivityClient(
      capabilitiesValue: const HealthActivityCapabilities(
        platform: HealthActivityPlatform.appleHealth,
      ),
      hasPermission: true,
      activities: [activity],
    );
    final repository = HealthActivityRepository(client);

    final snapshot = await repository.fetchWeeklyActivity(
      referenceDate: DateTime(2026, 5, 20),
    );

    expect(snapshot.connectionStatus, HealthActivityConnectionStatus.connected);
    expect(snapshot.activities, [activity]);
    expect(snapshot.summary.totalDistanceMeters, 5000);
    expect(snapshot.summary.totalActiveMinutes, 45);
    expect(client.fetchStartTime, DateTime(2026, 5, 18));
    expect(client.fetchEndTime, DateTime(2026, 5, 25));
  });

  test(
    'requestActivityReadPermission stores successful permission requests',
    () async {
      final client = _FakeHealthActivityClient(
        capabilitiesValue: const HealthActivityCapabilities(
          platform: HealthActivityPlatform.appleHealth,
        ),
        requestPermissionResult: true,
      );
      final repository = HealthActivityRepository(client);

      await expectLater(
        repository.requestActivityReadPermission(),
        completion(isTrue),
      );

      final prefs = await SharedPreferences.getInstance();
      expect(
        prefs.getBool('health_activity.activity_permission_requested'),
        isTrue,
      );
    },
  );
}

class _FakeHealthActivityClient implements HealthActivityClient {
  _FakeHealthActivityClient({
    required this.capabilitiesValue,
    this.hasPermission,
    this.requestPermissionResult = false,
    this.activities = const [],
  });

  final HealthActivityCapabilities capabilitiesValue;
  final bool? hasPermission;
  final bool requestPermissionResult;
  final List<PhysicalActivity> activities;

  int fetchCallCount = 0;
  DateTime? fetchStartTime;
  DateTime? fetchEndTime;

  @override
  Future<HealthActivityCapabilities> capabilities() async => capabilitiesValue;

  @override
  Future<List<PhysicalActivity>> fetchPhysicalActivities({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    fetchCallCount++;
    fetchStartTime = startTime;
    fetchEndTime = endTime;
    return activities;
  }

  @override
  Future<bool?> hasActivityReadPermission() async => hasPermission;

  @override
  Future<void> installHealthConnect() async {}

  @override
  Future<bool> requestActivityReadPermission() async => requestPermissionResult;
}
