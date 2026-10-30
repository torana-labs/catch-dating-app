import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/events/presentation/event_map_center.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart' as organizer_test;
import 'events_test_helpers.dart';

OrganizerMembership _membership({
  required String clubId,
  String uid = 'runner-1',
}) => OrganizerMembership(
  id: organizerMembershipId(clubId: clubId, uid: uid),
  clubId: clubId,
  uid: uid,
  role: OrganizerMembershipRole.member,
  status: OrganizerMembershipStatus.active,
  joinedAt: DateTime(2026),
);

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

  group('eventMapViewModelProvider', () {
    test(
      'combines profile, signed-up, saved, and recommended events',
      () async {
        final repository = FakeEventRepository();
        final savedEventRepository = FakeSavedEventRepository();
        final user = buildUser();
        final signedUpEvent = buildEvent(
          id: 'signed-up',
          startTime: DateTime.now().add(const Duration(days: 1)),
          startingPointLat: 19.0,
          startingPointLng: 72.8,
        );
        final recommendedRun = buildEvent(
          id: 'recommended',
          startTime: DateTime.now().add(const Duration(days: 2)),
          startingPointLat: 19.1,
          startingPointLng: 72.9,
        );
        final savedEvent = buildEvent(
          id: 'saved',
          startTime: DateTime.now().add(const Duration(hours: 12)),
          startingPointLat: 19.2,
          startingPointLng: 72.7,
        );
        repository.signedUpEvents[user.uid] = [signedUpEvent];
        repository.recommendedEvents = [recommendedRun];
        savedEventRepository.savedEventDetails[user.uid] = [savedEvent];

        final container = ProviderContainer(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            watchActiveOrganizerMembershipsForUserProvider(
              user.uid,
            ).overrideWith(
              (ref) => Stream.value([_membership(clubId: 'club-1')]),
            ),
            eventRepositoryProvider.overrideWith((ref) => repository),
            bookedEventsRepositoryProvider.overrideWith(
              (ref) => FakeBookedEventsRepository(repository),
            ),
            organizersRepositoryProvider.overrideWith(
              (ref) =>
                  organizer_test.FakeOrganizersRepository()
                    ..organizersById['club-1'] = buildOrganizer(),
            ),
            savedEventRepositoryProvider.overrideWithValue(
              savedEventRepository,
            ),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          eventMapViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);

        await container.read(watchUserProfileProvider.future);
        await container.read(
          watchActiveOrganizerMembershipsForUserProvider(user.uid).future,
        );
        await container.read(watchSignedUpEventsProvider(user.uid).future);
        await container.read(
          watchSavedEventDetailsForUserProvider(user.uid).future,
        );
        await container.read(
          recommendedEventsProvider(
            RecommendedEventsQuery.fromOrganizerIds(const ['club-1']),
          ).future,
        );
        await container.read(
          organizerNameLookupProvider(
            OrganizerNameLookupQuery(const ['club-1']),
          ).future,
        );
        await container.pump();

        final viewModel = subscription.read().requireValue;
        expect(viewModel.events.map((event) => event.id), [
          'saved',
          'signed-up',
          'recommended',
        ]);
        expect(viewModel.effectiveItems.map((item) => item.status), [
          EventTileStatus.saved,
          EventTileStatus.joined,
          EventTileStatus.recommended,
        ]);
        expect(
          viewModel.effectiveItems.map((item) => item.organizerName).toSet(),
          {'Stride Social'},
        );
        expect(viewModel.pinnedEvents.length, 3);
        expect(repository.recommendedOrganizerIds, ['club-1']);
      },
    );
  });
}
