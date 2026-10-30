import 'dart:typed_data';

import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/events/parts/activity_map_pin.dart';
import 'package:catch_dating_app/events/presentation/event_map_screen.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_pins_map.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

import 'events_test_helpers.dart';

void main() {
  test('distance-ring geography projects a northern radius edge', () {
    final north = eventMapCoordinateNorthOf(
      const LocationCoordinate(22.72, 75.86),
      distanceMeters: 1000,
    );

    expect(north.latitude, closeTo(22.728993, 0.00001));
    expect(north.longitude, 75.86);
  });

  test('distance-ring geography exposes all camera-fit bounds', () {
    final bounds = eventMapRingBoundsCoordinates(
      const LocationCoordinate(22.72, 75.86),
      distanceMeters: 3000,
    );

    expect(bounds, hasLength(4));
    expect(bounds[0].latitude, greaterThan(22.72));
    expect(bounds[1].longitude, greaterThan(75.86));
    expect(bounds[2].latitude, lessThan(22.72));
    expect(bounds[3].longitude, lessThan(75.86));
  });

  test('selected native pins keep the resting bitmap while art resolves', () {
    final restingBitmap = MapMarkerBitmap(
      bytes: Uint8List.fromList(<int>[1, 2, 3]),
      logicalSize: const Size(38, 58),
      imagePixelRatio: 2,
    );

    final pending = eventMapPinBitmapState(
      selectedBitmap: null,
      restingBitmap: restingBitmap,
      rasterFailed: false,
    );
    final failed = eventMapPinBitmapState(
      selectedBitmap: null,
      restingBitmap: null,
      rasterFailed: true,
    );

    expect(pending.publish, isTrue);
    expect(pending.bitmap, same(restingBitmap));
    expect(failed.publish, isTrue);
    expect(failed.bitmap, isNull);
  });

  test('fixture distance ring follows handoff sizes within its viewport', () {
    expect(
      eventMapFixtureRingSize(radiusKm: 1, viewport: const Size(390, 800)),
      150,
    );
    expect(
      eventMapFixtureRingSize(radiusKm: 5, viewport: const Size(390, 800)),
      351,
    );
  });

  testWidgets('shows a map-shaped skeleton while map events load', (
    tester,
  ) async {
    await pumpEventsTestApp(
      tester,
      const EventMap(
        enableNetworkTiles: false,
        viewModel: AsyncLoading<EventMapViewModel>(),
      ),
      overrides: [
        deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    expect(find.byType(EventMapLoadingBody), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('No mapped events yet'), findsNothing);
  });

  testWidgets('shows an empty state when no map events are available', (
    tester,
  ) async {
    await pumpEventsTestApp(
      tester,
      const EventMap(enableNetworkTiles: false),
      overrides: [
        eventMapViewModelProvider.overrideWith(
          (ref) =>
              const AsyncData(EventMapViewModel(events: [], pinnedEvents: [])),
        ),
        deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    expect(find.text('No mapped events yet'), findsOneWidget);
    expect(find.text('Nearby events'), findsNothing);
  });

  testWidgets('preserveCanvasWhenEmpty keeps map and distance ring visible', (
    tester,
  ) async {
    await pumpEventsTestApp(
      tester,
      const EventMap(
        enableNetworkTiles: false,
        preserveCanvasWhenEmpty: true,
        distanceRingRadiusKm: 3,
        distanceRingLabel: 'WITHIN 3 KM',
      ),
      overrides: [
        eventMapViewModelProvider.overrideWith(
          (ref) =>
              const AsyncData(EventMapViewModel(events: [], pinnedEvents: [])),
        ),
        deviceLocationProvider.overrideWith(
          () => _FakeDeviceLocation(const LocationCoordinate(22.72, 75.86)),
        ),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    expect(find.byType(EventPinsFallbackMap), findsOneWidget);
    expect(find.byType(CatchDistanceOverlay), findsOneWidget);
    expect(find.text('No mapped events yet'), findsNothing);
  });

  testWidgets('selecting a map marker makes its pin the camera target', (
    tester,
  ) async {
    final firstRun = buildEvent(
      id: 'first-event',
      meetingPoint: 'Race Course Road main gate',
      startingPointLat: 22.72,
      startingPointLng: 75.86,
    );
    final secondRun = buildEvent(
      id: 'second-event',
      meetingPoint: 'Vijay Nagar main gate',
      startingPointLat: 22.75,
      startingPointLng: 75.9,
    );

    await pumpEventsTestApp(
      tester,
      const EventMap(enableNetworkTiles: false),
      overrides: [
        eventMapViewModelProvider.overrideWith(
          (ref) => AsyncData(
            EventMapViewModel(
              events: [firstRun, secondRun],
              pinnedEvents: [firstRun, secondRun],
            ),
          ),
        ),
        deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    expect(
      tester
          .widget<EventPinsMap>(find.byType(EventPinsMap))
          .selectedEventCenter,
      isNull,
    );

    await tester.tap(find.bySemanticsLabel('Select Vijay Nagar main gate'));
    await tester.pump();

    final map = tester.widget<EventPinsMap>(find.byType(EventPinsMap));
    expect(map.selectedEventId, 'second-event');
    expect(map.selectedEventCenter, const LocationCoordinate(22.75, 75.9));
  });

  testWidgets('external event pins select with their exact map coordinate', (
    tester,
  ) async {
    final startTime = DateTime(2026, 7, 18, 19);
    final externalEvent = ExternalEvent(
      id: 'bandra-mixer',
      canonicalHostId: 'host-bandra',
      compatibilityOrganizerId: 'club-bandra',
      title: 'Bandra Singles Mixer',
      description: 'A reviewed external event.',
      startTime: startTime,
      endTime: startTime.add(const Duration(hours: 2)),
      meetingPoint: 'Bandra Amphitheatre',
      latitude: 19.0435,
      longitude: 72.8204,
      activityKind: ActivityKind.singlesMixer,
      interactionModel: EventInteractionModel.freeFormMixer,
      status: 'active',
      publicationStatus: 'public',
      citySlug: 'mumbai',
      externalLinks: const [],
    );
    ExternalEvent? selected;

    await pumpEventsTestApp(
      tester,
      EventMap(
        enableNetworkTiles: false,
        viewModel: AsyncData(
          EventMapViewModel(
            events: const [],
            pinnedEvents: const [],
            externalPinnedItems: [ExternalEventMapItem(event: externalEvent)],
          ),
        ),
        onExternalEventSelected: (event) => selected = event,
      ),
      overrides: [
        deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    await tester.tap(find.bySemanticsLabel('Select Bandra Amphitheatre'));
    await tester.pump();

    expect(selected, same(externalEvent));
    final map = tester.widget<EventPinsMap>(find.byType(EventPinsMap));
    expect(map.selectedEventId, 'external:bandra-mixer');
    expect(map.selectedEventCenter, const LocationCoordinate(19.0435, 72.8204));
  });

  testWidgets('background tap clears selected map marker', (tester) async {
    final firstRun = buildEvent(
      id: 'first-event',
      meetingPoint: 'Race Course Road main gate',
      startingPointLat: 22.72,
      startingPointLng: 75.86,
    );
    final secondRun = buildEvent(
      id: 'second-event',
      meetingPoint: 'Vijay Nagar main gate',
      startingPointLat: 22.75,
      startingPointLng: 75.9,
    );

    await pumpEventsTestApp(
      tester,
      const EventMap(
        enableNetworkTiles: false,
        initialSelectedEventId: 'second-event',
      ),
      overrides: [
        eventMapViewModelProvider.overrideWith(
          (ref) => AsyncData(
            EventMapViewModel(
              events: [firstRun, secondRun],
              pinnedEvents: [firstRun, secondRun],
            ),
          ),
        ),
        deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        selectedExploreCityProvider.overrideWithValue(_mumbai),
      ],
    );

    expect(
      tester.widget<EventPinsMap>(find.byType(EventPinsMap)).selectedEventId,
      'second-event',
    );

    await tester.tapAt(const Offset(24, 220));
    await tester.pump();

    expect(
      tester.widget<EventPinsMap>(find.byType(EventPinsMap)).selectedEventId,
      isNull,
    );
  });

  testWidgets('placeholder event pins use DS activity map pin states', (
    tester,
  ) async {
    final firstRun = buildEvent(
      id: 'first-event',
      meetingPoint: 'Race Course Road main gate',
      startingPointLat: 22.72,
      startingPointLng: 75.86,
      startTime: DateTime(2026, 5, 27, 6, 30),
    );
    final secondRun = buildEvent(
      id: 'second-event',
      meetingPoint: 'Vijay Nagar main gate',
      startingPointLat: 22.75,
      startingPointLng: 75.9,
      startTime: DateTime(2026, 5, 27, 18, 45),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: EventPinsMap(
          enableNetworkTiles: false,
          selectedEventId: 'second-event',
          items: [
            EventMapItem(event: firstRun, status: EventTileStatus.open),
            EventMapItem(event: secondRun, status: EventTileStatus.open),
          ],
          initialCenter: const LocationCoordinate(22.72, 75.86),
        ),
      ),
    );
    await tester.pump();

    final pins = tester
        .widgetList<ActivityMapPin>(find.byType(ActivityMapPin))
        .toList();
    final restingPin = pins.singleWhere((pin) => !pin.selected);
    final selectedPin = pins.singleWhere((pin) => pin.selected);

    expect(restingPin.size, CatchLayout.activityMapPinRestingSize);
    expect(selectedPin.size, CatchLayout.activityMapPinSelectedSize);
    expect(selectedPin.label, 'SOCIAL RUN · 6:45 PM');
    expect(find.text('SOCIAL RUN · 6:45 PM'), findsOneWidget);
  });

  testWidgets('explicit fixture is neutral and composes the distance ring', (
    tester,
  ) async {
    var ringTaps = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: EventPinsMap(
          enableNetworkTiles: false,
          items: const <EventMapItem>[],
          initialCenter: const LocationCoordinate(22.72, 75.86),
          userLocation: const LocationCoordinate(22.72, 75.86),
          distanceRingRadiusKm: 3,
          distanceRingLabel: 'Within 3 km · tap to change',
          onDistanceRingTapped: () => ringTaps += 1,
        ),
      ),
    );

    expect(find.byType(CatchDistanceOverlay), findsOneWidget);
    expect(find.text('Within 3 km · tap to change'), findsOneWidget);
    await tester.tap(find.text('Within 3 km · tap to change'));
    expect(ringTaps, 1);
  });

  testWidgets('native map wrapper supports byte-backed marker icons', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: LocationMap(
          initialCenter: const LocationCoordinate(22.72, 75.86),
          initialZoom: 14,
          markers: {
            MapMarker(
              id: 'byte-backed-marker',
              position: const LocationCoordinate(22.72, 75.86),
              bitmap: MapMarkerBitmap(
                bytes: Uint8List.fromList(<int>[1, 2, 3, 4]),
                logicalSize: const Size(38, 58),
                imagePixelRatio: 2,
              ),
              zIndex: 2,
              infoTitle: 'Saturday social run',
              consumeTapEvents: true,
            ),
          },
        ),
      ),
    );
    await tester.pump();

    final googleMap = tester.widget<gmaps.GoogleMap>(
      find.byType(gmaps.GoogleMap),
    );
    final marker = googleMap.markers.single;
    final iconJson = marker.icon.toJson() as List<Object?>;

    expect(iconJson.first, 'bytes');
    final iconPayload = iconJson[1] as Map<String, Object?>;
    expect(iconPayload['width'], greaterThan(0));
    expect(iconPayload['height'], greaterThan(0));
    expect(iconPayload['byteData'], isNotEmpty);
    expect(marker.anchor, const Offset(0.5, 1));
    expect(marker.zIndexInt, 2);
    expect(marker.infoWindow.title, 'Saturday social run');
    expect(marker.infoWindow.snippet, isNull);
    expect(marker.consumeTapEvents, isTrue);
  });

  testWidgets('event pin maps use the shared muted Catch map styling', (
    tester,
  ) async {
    final event = buildEvent(
      id: 'styled-event',
      meetingPoint: 'Race Course Road main gate',
      startingPointLat: 22.72,
      startingPointLng: 75.86,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: ThemeMode.dark,
        home: EventPinsMap(
          items: [EventMapItem(event: event, status: EventTileStatus.open)],
          initialCenter: const LocationCoordinate(22.72, 75.86),
        ),
      ),
    );
    await tester.pump();

    final googleMap = tester.widget<gmaps.GoogleMap>(
      find.byType(gmaps.GoogleMap),
    );

    expect(googleMap.style, LocationMapStyle.dark);
  });

  testWidgets('event pin clusters rasterize app-owned ink count markers', (
    tester,
  ) async {
    late MapMarkerBitmap bitmap;
    await tester.runAsync(() async {
      bitmap = await buildEventMapClusterPinBitmap(
        count: 6,
        fillColor: Colors.black,
        borderColor: Colors.white,
        pixelRatio: 2,
        textStyle: const TextStyle(fontSize: 12, color: Colors.white),
      );
    });

    expect(bitmap.bytes, isNotEmpty);
    expect(bitmap.logicalSize, const Size.square(CatchSpacing.s10));
    expect(bitmap.imagePixelRatio, 2);
  });

  testWidgets('event pin maps expose user dot and distance ring circles', (
    tester,
  ) async {
    var ringTaps = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: EventPinsMap(
          items: const <EventMapItem>[],
          initialCenter: const LocationCoordinate(22.72, 75.86),
          userLocation: const LocationCoordinate(22.72, 75.86),
          distanceRingRadiusKm: 3,
          distanceRingLabel: 'WITHIN 3 KM · TAP TO CHANGE',
          onDistanceRingTapped: () => ringTaps += 1,
        ),
      ),
    );
    await tester.pump();

    final googleMap = tester.widget<gmaps.GoogleMap>(
      find.byType(gmaps.GoogleMap),
    );
    final circleIds = googleMap.circles.map((circle) => circle.circleId.value);

    expect(circleIds, contains('event-map-user-location'));
    expect(circleIds, contains('event-map-distance-ring'));
    expect(googleMap.rotateGesturesEnabled, isFalse);
    expect(googleMap.tiltGesturesEnabled, isFalse);

    googleMap.circles
        .singleWhere(
          (circle) => circle.circleId.value == 'event-map-distance-ring',
        )
        .onTap!();
    expect(ringTaps, 1);
  });

  testWidgets('event pin maps report initial and moved camera centers', (
    tester,
  ) async {
    final centers = <LocationCoordinate>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: EventPinsMap(
          items: const <EventMapItem>[],
          initialCenter: const LocationCoordinate(22.72, 75.86),
          onCameraCenterChanged: centers.add,
        ),
      ),
    );
    await tester.pump();

    expect(centers, [const LocationCoordinate(22.72, 75.86)]);

    final googleMap = tester.widget<gmaps.GoogleMap>(
      find.byType(gmaps.GoogleMap),
    );
    googleMap.onCameraMove!(
      const gmaps.CameraPosition(target: gmaps.LatLng(22.75, 75.9), zoom: 13),
    );
    googleMap.onCameraIdle!();

    expect(centers.last, const LocationCoordinate(22.75, 75.9));
  });

  test('event pin maps cluster dense pins at low zoom', () {
    final events = [
      for (var i = 0; i < 8; i += 1)
        buildEvent(
          id: 'dense-$i',
          meetingPoint: 'Dense marker $i',
          startingPointLat: 22.72 + i * 0.0001,
          startingPointLng: 75.86 + i * 0.0001,
        ),
    ];

    final groupSizes = eventMapMarkerGroupSizes([
      for (final event in events)
        EventMapItem(event: event, status: EventTileStatus.open),
    ], cameraZoom: 12);

    expect(groupSizes, [8]);
  });
}

const _mumbai = CityData(
  name: 'mumbai',
  label: 'Mumbai',
  latitude: 19.076,
  longitude: 72.8777,
);

class _FakeDeviceLocation extends DeviceLocation {
  _FakeDeviceLocation(this.location);

  final LocationCoordinate? location;

  @override
  Future<LocationCoordinate?> build() async => location;
}
