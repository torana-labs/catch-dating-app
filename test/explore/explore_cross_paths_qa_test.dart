import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_test_support/event_organizer_summary_fixture.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as event_test;

void main() {
  test(
    'signed-in synthetic viewer can see only its hidden-organizer QA event',
    () async {
      final user = event_test.buildUser(uid: 'cross_paths_mumbai_qa_user_002');
      final organizer = buildOrganizer(
        id: 'courtside',
        appVisibility: OrganizerAppVisibility.hidden,
      );
      final qaEvent = event_test.buildEvent(
        id: 'cross_paths_mumbai_qa_run_mumbai_01_01',
        organizerId: organizer.id,
        synthetic: true,
        seedPrefix: 'cross_paths_mumbai_qa',
        startTime: DateTime.now().add(const Duration(days: 1)),
      );
      final otherQaEvent = event_test.buildEvent(
        id: 'cross_paths_mumbai_qa_run_mumbai_01_02',
        organizerId: organizer.id,
        synthetic: true,
        seedPrefix: 'cross_paths_mumbai_qa',
        startTime: DateTime.now().add(const Duration(days: 2)),
      );
      final participation = event_test.buildEventParticipation(
        event: qaEvent,
        uid: user.uid,
      );

      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(user.uid)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
          watchOrganizersByLocationProvider(
            'in-mh-mumbai',
          ).overrideWith((ref) => Stream.value(const <Organizer>[])),
          watchActiveOrganizerFollowsForUserProvider(
            user.uid,
          ).overrideWith((ref) => Stream.value(const <OrganizerFollow>[])),
          watchEventParticipationsForUserProvider(
            user.uid,
          ).overrideWith((ref) => Stream.value([participation])),
          watchSavedEventsForUserProvider(
            user.uid,
          ).overrideWith((ref) => Stream.value(const <SavedEvent>[])),
          // Discovery returns the city's synthetic events; the feed keeps
          // only the one this viewer is booked on.
          eventDiscoveryRepositoryProvider.overrideWithValue(
            _FakeEventDiscoveryRepository(
              eventsCarrying(organizer, [qaEvent, otherQaEvent]),
            ),
          ),
          externalEventRepositoryProvider.overrideWithValue(
            _FakeExternalEventRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);
      container
          .read(exploreFiltersProvider.notifier)
          .setTimeFilter(ExploreTimeFilter.anytime);

      final subscription = container.listen(
        exploreFeedViewModelProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      await container.pump();
      await flushTestEventQueue();
      await container.pump();

      expect(subscription.read().hasValue, isTrue);
      expect(subscription.read().value!.items.map((item) => item.event.id), [
        qaEvent.id,
      ]);
      expect(
        subscription.read().value!.items.single.status,
        EventTileStatus.joined,
      );
    },
  );
}

class _FakeEventDiscoveryRepository extends Fake
    implements EventDiscoveryRepository {
  _FakeEventDiscoveryRepository(this.events);

  final List<Event> events;

  @override
  Future<List<Event>> fetchDiscoverableEvents(EventDiscoveryQuery query) async {
    return events;
  }

  @override
  Future<CursorPage<Event, PageCursor<Event>>> fetchDiscoverableEventsPage(
    EventDiscoveryQuery query, {
    PageCursor<Event>? startAfter,
  }) async => CursorPage(items: events, hasMore: false);
}

class _FakeExternalEventRepository extends Fake
    implements ExternalEventRepository {
  @override
  Future<List<ExternalEvent>> fetchDiscoverableExternalEvents(
    ExternalEventDiscoveryQuery query,
  ) async {
    return const [];
  }

  @override
  Future<CursorPage<ExternalEvent, PageCursor<ExternalEvent>>>
  fetchDiscoverableExternalEventsPage(
    ExternalEventDiscoveryQuery query, {
    PageCursor<ExternalEvent>? startAfter,
  }) async => const CursorPage(items: [], hasMore: false);
}
