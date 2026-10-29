import 'package:catch_dating_app/contexts/events/data/event_live_position_service.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_live_location_field.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('sharing is explicit and disposal clears the position', (
    tester,
  ) async {
    final publisher = _FakePublisher();
    final streamGateway = _FakeStreamGateway();
    final locationGateway = _FakeDeviceLocationGateway();
    final plan = RouteEventPlan.socialRun.copyWith(
      liveTrackingPolicy: const RouteLiveTrackingPolicy(
        mode: RouteLiveTrackingMode.authorizedOperators,
        staleAfterSeconds: 120,
        retentionMinutes: 15,
      ),
    );
    final event = buildEvent(
      eventFormat: EventFormatSnapshot.fromActivityKind(
        ActivityKind.socialRun,
        activityDetails: {'routePlan': plan.toJson()},
      ),
    );

    await pumpEventsTestApp(
      tester,
      HostEventLiveLocationField(event: event),
      overrides: [
        deviceLocationGatewayProvider.overrideWithValue(locationGateway),
        eventLivePositionPublisherProvider.overrideWithValue(publisher),
        eventLivePositionStreamGatewayProvider.overrideWithValue(streamGateway),
      ],
    );

    expect(find.text('Share the moving group'), findsOneWidget);
    expect(publisher.published, isEmpty);

    await tester.tap(find.byKey(const ValueKey<String>('catch-field-toggle')));
    await pumpFeatureUi(tester);

    expect(publisher.published, hasLength(1));
    expect(publisher.published.single.latitude, 22.72);
    expect(find.textContaining('Live now'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    await pumpFeatureUi(tester);

    expect(publisher.stopCount, 1);
  });
}

class _FakePublisher implements EventLivePositionPublisher {
  final published = <EventLivePositionSample>[];
  int stopCount = 0;

  @override
  Future<void> publish({
    required String eventId,
    required EventLivePositionSample position,
  }) async {
    published.add(position);
  }

  @override
  Future<void> stop({required String eventId}) async {
    stopCount += 1;
  }
}

class _FakeStreamGateway implements EventLivePositionStreamGateway {
  @override
  Stream<EventLivePositionSample> watch() => const Stream.empty();
}

class _FakeDeviceLocationGateway implements DeviceLocationGateway {
  @override
  Future<LocationPermission> checkPermission() async =>
      LocationPermission.whileInUse;

  @override
  Future<Position> getCurrentPosition() async => Position(
    longitude: 75.86,
    latitude: 22.72,
    timestamp: DateTime(2026, 8, 25),
    accuracy: 10,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    headingAccuracy: 0,
    speed: 0,
    speedAccuracy: 0,
  );

  @override
  Future<bool> isLocationServiceEnabled() async => true;

  @override
  Future<bool> openAppSettings() async => true;

  @override
  Future<bool> openLocationSettings() async => true;

  @override
  Future<LocationPermission> requestPermission() async =>
      LocationPermission.whileInUse;
}
