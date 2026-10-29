import 'package:catch_consumer_app/mobile_health_activity_client.dart';
import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart' as health;

void main() {
  const mapper = HealthWorkoutPointMapper();

  test(
    'unsupported platforms stay fail-closed without configuring the SDK',
    () async {
      final healthClient = _FakeHealth();
      final client = MobileHealthActivityClient(
        healthClient: healthClient,
        devicePlatform: MobileHealthDevicePlatform.unsupported,
      );

      final capabilities = await client.capabilities();

      expect(capabilities.platform, HealthActivityPlatform.unsupported);
      expect(await client.hasActivityReadPermission(), isFalse);
      expect(await client.requestActivityReadPermission(), isFalse);
      expect(
        await client.fetchPhysicalActivities(
          startTime: DateTime.utc(2026, 7, 1),
          endTime: DateTime.utc(2026, 7, 2),
        ),
        isEmpty,
      );
      expect(healthClient.configureCalls, 0);
    },
  );

  test(
    'Android capability mapping configures once and exposes install state',
    () async {
      final healthClient = _FakeHealth(
        healthConnectStatus:
            health.HealthConnectSdkStatus.sdkUnavailableProviderUpdateRequired,
      );
      final client = MobileHealthActivityClient(
        healthClient: healthClient,
        devicePlatform: MobileHealthDevicePlatform.android,
      );

      final first = await client.capabilities();
      final second = await client.capabilities();
      await client.installHealthConnect();

      expect(first.platform, HealthActivityPlatform.healthConnect);
      expect(
        first.healthConnectAvailability,
        HealthConnectAvailability.updateRequired,
      );
      expect(second.canInstallHealthConnect, isTrue);
      expect(healthClient.configureCalls, 1);
      expect(healthClient.installCalls, 1);
    },
  );

  test(
    'workout mapper converts units, taxonomy, provenance, and manual state',
    () {
      final point = _workoutPoint(
        id: 'run-1',
        type: health.HealthWorkoutActivityType.RUNNING,
        distance: 2,
        distanceUnit: health.HealthDataUnit.MILE,
        platform: health.HealthPlatformType.appleHealth,
        recordingMethod: health.RecordingMethod.manual,
      );

      final activity = mapper.fromPoint(point);

      expect(activity, isNotNull);
      expect(activity!.stableId, 'health:appleHealth:run-1');
      expect(activity.provider, PhysicalActivityProvider.appleHealth);
      expect(activity.type, ActivityKind.running);
      expect(activity.distanceMeters, closeTo(3218.688, 0.001));
      expect(activity.isManualEntry, isTrue);
      expect(activity.sourceName, 'Watch');
    },
  );

  test('workout mapper rejects unsupported and empty workouts', () {
    expect(
      mapper.fromPoint(
        _workoutPoint(
          type: health.HealthWorkoutActivityType.SWIMMING,
          distance: 100,
        ),
      ),
      isNull,
    );
    expect(
      mapper.fromPoint(
        _workoutPoint(
          type: health.HealthWorkoutActivityType.WALKING,
          distance: 0,
          start: DateTime.utc(2026, 7, 1, 10),
          end: DateTime.utc(2026, 7, 1, 10),
        ),
      ),
      isNull,
    );
  });

  test('fetch maps and sorts plugin workouts chronologically', () async {
    final healthClient = _FakeHealth(
      points: [
        _workoutPoint(
          id: 'later',
          type: health.HealthWorkoutActivityType.TENNIS,
          start: DateTime.utc(2026, 7, 1, 12),
          end: DateTime.utc(2026, 7, 1, 13),
        ),
        _workoutPoint(
          id: 'earlier',
          type: health.HealthWorkoutActivityType.BIKING,
          start: DateTime.utc(2026, 7, 1, 8),
          end: DateTime.utc(2026, 7, 1, 9),
        ),
      ],
    );
    final client = MobileHealthActivityClient(
      healthClient: healthClient,
      devicePlatform: MobileHealthDevicePlatform.android,
    );

    final activities = await client.fetchPhysicalActivities(
      startTime: DateTime.utc(2026, 7, 1),
      endTime: DateTime.utc(2026, 7, 2),
    );

    expect(activities.map((activity) => activity.stableId), [
      'health:googleHealthConnect:earlier',
      'health:googleHealthConnect:later',
    ]);
    expect(healthClient.configureCalls, 1);
  });
}

health.HealthDataPoint _workoutPoint({
  String id = 'workout',
  required health.HealthWorkoutActivityType type,
  int? distance = 100,
  health.HealthDataUnit? distanceUnit = health.HealthDataUnit.METER,
  health.HealthPlatformType platform =
      health.HealthPlatformType.googleHealthConnect,
  health.RecordingMethod recordingMethod = health.RecordingMethod.automatic,
  DateTime? start,
  DateTime? end,
}) {
  final effectiveStart = start ?? DateTime.utc(2026, 7, 1, 9);
  return health.HealthDataPoint(
    uuid: id,
    value: health.WorkoutHealthValue(
      workoutActivityType: type,
      totalDistance: distance,
      totalDistanceUnit: distanceUnit,
    ),
    type: health.HealthDataType.WORKOUT,
    unit: health.HealthDataUnit.NO_UNIT,
    dateFrom: effectiveStart,
    dateTo: end ?? effectiveStart.add(const Duration(hours: 1)),
    sourcePlatform: platform,
    sourceDeviceId: 'device',
    sourceId: 'source',
    sourceName: 'Watch',
    recordingMethod: recordingMethod,
  );
}

class _FakeHealth extends Fake implements health.Health {
  _FakeHealth({
    this.healthConnectStatus = health.HealthConnectSdkStatus.sdkAvailable,
    this.points = const [],
  });

  final health.HealthConnectSdkStatus? healthConnectStatus;
  final List<health.HealthDataPoint> points;
  int configureCalls = 0;
  int installCalls = 0;

  @override
  Future<void> configure() async {
    configureCalls += 1;
  }

  @override
  Future<health.HealthConnectSdkStatus?> getHealthConnectSdkStatus() async =>
      healthConnectStatus;

  @override
  Future<void> installHealthConnect() async {
    installCalls += 1;
  }

  @override
  bool isDataTypeAvailable(health.HealthDataType dataType) => true;

  @override
  Future<List<health.HealthDataPoint>> getHealthDataFromTypes({
    required List<health.HealthDataType> types,
    Map<health.HealthDataType, health.HealthDataUnit>? preferredUnits,
    required DateTime startTime,
    required DateTime endTime,
    List<health.RecordingMethod> recordingMethodsToFilter = const [],
  }) async => points;
}
