import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/event_map_center.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_kernel/city_data.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('buildEventMapViewModel', () {
    final now = DateTime(2026);

    test(
      'deduplicates events, keeps signed-up data, and sorts chronologically',
      () {
        final laterRecommended = buildEvent(
          id: 'event-2',
          meetingPoint: 'Later',
          startTime: DateTime(2026, 1, 3, 7),
          startingPointLat: 19.1,
          startingPointLng: 72.9,
        );
        final recommendedDuplicate = buildEvent(
          meetingPoint: 'Recommended copy',
          startTime: DateTime(2026, 1, 2, 7),
        );
        final signedUpDuplicate = buildEvent(
          meetingPoint: 'Signed-up copy',
          startTime: DateTime(2026, 1, 2, 7),
          startingPointLat: 19.0,
          startingPointLng: 72.8,
        );

        final viewModel = buildEventMapViewModel(
          signedUpEvents: [signedUpDuplicate],
          recommendedEvents: [laterRecommended, recommendedDuplicate],
          now: now,
        );

        expect(viewModel.events.map((event) => event.id), [
          'event-1',
          'event-2',
        ]);
        expect(viewModel.events.first.meetingPoint, 'Signed-up copy');
        expect(viewModel.pinnedEvents.map((event) => event.id), [
          'event-1',
          'event-2',
        ]);
      },
    );

    test('filters map pins without dropping unpinned event rows', () {
      final pinned = buildEvent(
        id: 'pinned',
        startTime: DateTime(2026, 1, 2, 7),
        startingPointLat: 19.0,
        startingPointLng: 72.8,
      );
      final unpinned =
          buildEvent(
            id: 'unpinned',
            startTime: DateTime(2026, 1, 3, 7),
          ).copyWith(
            meetingLocation: null,
            startingPointLat: null,
            startingPointLng: null,
          );

      final viewModel = buildEventMapViewModel(
        signedUpEvents: [unpinned],
        recommendedEvents: [pinned],
        now: now,
      );

      expect(viewModel.events.map((event) => event.id), ['pinned', 'unpinned']);
      expect(viewModel.pinnedEvents.map((event) => event.id), ['pinned']);
      expect(viewModel.effectivePinnedItems.map((item) => item.event.id), [
        'pinned',
      ]);
      expect(
        viewModel.effectivePinnedItems.single.coordinate,
        const LocationCoordinate(19.0, 72.8),
      );
      expect(viewModel.selectedEvent('unpinned'), unpinned);
      expect(viewModel.selectedItem('unpinned'), isNull);
      expect(
        () => EventMapItem(event: unpinned, status: EventTileStatus.open),
        throwsArgumentError,
      );

      final fallbackViewModel = EventMapViewModel(
        events: [unpinned],
        pinnedEvents: const [],
      );
      expect(fallbackViewModel.effectiveItems, isEmpty);
      expect(fallbackViewModel.effectivePinnedItems, isEmpty);
      expect(fallbackViewModel.hasPinnedEvents, isFalse);
    });

    test('filters past and cancelled events out of the map surface', () {
      final past = buildEvent(id: 'past', startTime: DateTime(2025, 12, 31, 7));
      final cancelled = buildEvent(
        id: 'cancelled',
        startTime: DateTime(2026, 1, 2, 7),
        status: EventLifecycleStatus.cancelled,
      );
      final upcoming = buildEvent(
        id: 'upcoming',
        startTime: DateTime(2026, 1, 2, 8),
        startingPointLat: 19.0,
        startingPointLng: 72.8,
      );

      final viewModel = buildEventMapViewModel(
        signedUpEvents: [past, upcoming],
        recommendedEvents: [cancelled],
        now: now,
      );

      expect(viewModel.events.map((event) => event.id), ['upcoming']);
      expect(viewModel.pinnedEvents.map((event) => event.id), ['upcoming']);
    });
  });

  group('resolveEventMapInitialCenter', () {
    const selectedCity = CityData(
      name: 'mumbai',
      label: 'Mumbai',
      latitude: 19.076,
      longitude: 72.8777,
    );

    test('uses device location while the city is auto-selected', () {
      final center = resolveEventMapInitialCenter(
        deviceLocation: const LocationCoordinate(22.7, 75.8),
        selectedCity: selectedCity,
        selectedCityWasUserSelected: false,
      );

      expect(center.latitude, 22.7);
      expect(center.longitude, 75.8);
    });

    test('uses selected city when device location is unavailable', () {
      final center = resolveEventMapInitialCenter(
        selectedCity: selectedCity,
        selectedCityWasUserSelected: false,
      );

      expect(center.latitude, 19.076);
      expect(center.longitude, 72.8777);
    });

    test('uses selected city when the user overrides the city', () {
      final center = resolveEventMapInitialCenter(
        deviceLocation: const LocationCoordinate(22.7, 75.8),
        selectedCity: selectedCity,
        selectedCityWasUserSelected: true,
      );

      expect(center.latitude, 19.076);
      expect(center.longitude, 72.8777);
    });
  });
}
