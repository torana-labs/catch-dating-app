import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/explore.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as event_test;
import '../organizers/organizers_test_helpers.dart';
import '../support/event_organizer_summary_fixture.dart';
import '../test_pump_helpers.dart';

/// Explore reads each event's organizer from the summary the event carries.
/// None of these containers overrides an organizer provider, so a lookup by
/// id would fail the test.
void main() {
  Event eventOf(String id, Organizer organizer, {int days = 1}) =>
      event_test.buildEvent(
        id: id,
        organizerId: organizer.id,
        startTime: DateTime.now().add(Duration(days: days)),
      );

  Future<List<ExploreEventItem>> feed(
    List<Event> events, {
    void Function(ProviderContainer container)? configure,
  }) async {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(null)),
        eventDiscoveryRepositoryProvider.overrideWithValue(
          _FakeEventDiscoveryRepository(events),
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
    configure?.call(container);
    final subscription = container.listen(
      exploreFeedViewModelProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(subscription.close);
    await container.pump();
    await flushTestEventQueue();
    await container.pump();
    expect(
      subscription.read().hasValue,
      isTrue,
      reason: '${subscription.read()}',
    );
    return subscription.read().value!.items;
  }

  group('Explore organizer summary', () {
    test('cards read the organizer from the event, never by id', () async {
      final organizer = buildOrganizer(
        id: 'club-summary',
        name: 'Bandra Run Club',
        hostName: 'Asha',
      );
      final items = await feed(
        eventsCarrying(organizer, [eventOf('listed', organizer)]),
      );

      expect(items.map((item) => item.event.id), ['listed']);
      final shown = items.single.organizer;
      expect(shown.id, 'club-summary');
      expect(shown.name, 'Bandra Run Club');
      expect(shown.area, 'Bandra');
      expect(shown.displayHostName, 'Asha');
      expect(items.single.tileData.organizerName, 'Bandra Run Club');
    });

    test('an event without a summary reads as a hidden organizer', () async {
      final organizer = buildOrganizer(id: 'club-not-copied');
      final items = await feed([eventOf('no-summary', organizer)]);

      expect(items, isEmpty);
    });

    test('hidden, archived and synthetic organizers are not listed', () async {
      final shown = buildOrganizer(id: 'club-shown');
      final hidden = buildOrganizer(
        id: 'club-hidden',
        appVisibility: OrganizerAppVisibility.hidden,
      );
      final archived = buildOrganizer(
        id: 'club-archived',
      ).copyWith(archived: true);
      final synthetic = buildOrganizer(
        id: 'club-synthetic',
      ).copyWith(synthetic: true);
      final items = await feed([
        ...eventsCarrying(shown, [eventOf('shown', shown)]),
        ...eventsCarrying(hidden, [eventOf('hidden', hidden)]),
        ...eventsCarrying(archived, [eventOf('archived', archived)]),
        ...eventsCarrying(synthetic, [eventOf('synthetic', synthetic)]),
      ]);

      expect(items.map((item) => item.event.id), ['shown']);
    });

    test('the area and rating filters read the summary', () async {
      final loved = buildOrganizer(id: 'club-loved', rating: 4.8);
      final plain = buildOrganizer(id: 'club-plain', area: 'Juhu', rating: 3.9);
      final events = [
        ...eventsCarrying(loved, [eventOf('loved', loved)]),
        ...eventsCarrying(plain, [eventOf('plain', plain, days: 2)]),
      ];

      expect((await feed(events)).map((item) => item.event.id), [
        'loved',
        'plain',
      ]);
      expect(
        (await feed(
          events,
          configure: (container) => container
              .read(exploreFiltersProvider.notifier)
              .toggleHighRatedOnly(),
        )).map((item) => item.event.id),
        ['loved'],
      );
      expect(
        (await feed(
          events,
          configure: (container) => container
              .read(exploreFiltersProvider.notifier)
              .toggleArea('Juhu'),
        )).map((item) => item.event.id),
        ['plain'],
      );
    });

    test('the organizer is built from the summary and nothing private', () {
      final organizer = buildOrganizer(
        id: 'club-9',
        name: 'Bandra Run Club',
        hostName: 'Asha',
        tags: const ['running', 'social'],
        rating: 4.6,
      );
      final event = eventsCarrying(organizer, [
        eventOf('built', organizer),
      ]).single;

      final built = exploreOrganizerOf(event)!;

      expect(built.id, 'club-9');
      expect(built.name, 'Bandra Run Club');
      expect(built.location, organizer.location);
      expect(built.area, 'Bandra');
      expect(built.displayHostName, 'Asha');
      expect(built.tags, ['running', 'social']);
      expect(built.rating, 4.6);
      expect(built.isPubliclyBrowseable, isTrue);
      expect(built.email, isNull);
      expect(built.phoneNumber, isNull);
      expect(built.description, isEmpty);
      expect(exploreOrganizerOf(eventOf('bare', organizer)), isNull);
    });

    test('the hidden summary builds a non-browseable organizer', () {
      final organizer = buildOrganizer(id: 'gone');
      final event = eventOf('hidden-summary', organizer).copyWith(
        organizerSummary: const EventOrganizerSummary(
          name: '',
          location: '',
          area: '',
          rating: 0,
          appVisibility: EventOrganizerVisibility.hidden,
          status: EventOrganizerLifecycle.archived,
          archived: true,
        ),
      );

      expect(exploreOrganizerOf(event)!.isPubliclyBrowseable, isFalse);
    });

    test('recommendations take the name and city from the event', () async {
      final organizer = buildOrganizer(
        id: 'club-followed',
        name: 'Juhu Striders',
      );
      final nameless = buildOrganizer(id: 'club-nameless', name: '');
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWithValue(
            _FakeEventRepository([
              ...eventsCarrying(organizer, [
                eventOf('with-summary', organizer),
              ]),
              ...eventsCarrying(nameless, [eventOf('empty-name', nameless)]),
              eventOf('no-summary', organizer),
            ]),
          ),
        ],
      );
      addTearDown(container.dispose);

      final candidates = await container.read(
        exploreRecommendedEventsProvider(
          ExploreRecommendationsQuery(
            userId: 'runner-1',
            followedOrganizerIds: const ['club-followed'],
          ),
        ).future,
      );

      final byId = {
        for (final candidate in candidates) candidate.event.id: candidate,
      };
      expect(byId['with-summary']!.organizerName, 'Juhu Striders');
      expect(byId['with-summary']!.organizerLocation, 'in-mh-mumbai');
      expect(byId['empty-name']!.organizerName, 'Your organizer');
      expect(byId['no-summary']!.organizerName, 'Your organizer');
      expect(byId['no-summary']!.organizerLocation, isNull);
    });
  });
}

class _FakeEventRepository extends Fake implements EventRepository {
  _FakeEventRepository(this.events);

  final List<Event> events;

  @override
  Future<List<Event>> fetchUpcomingEventsForOrganizers(
    List<String> organizerIds,
  ) async => events;
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
  ) async => const [];

  @override
  Future<CursorPage<ExternalEvent, PageCursor<ExternalEvent>>>
  fetchDiscoverableExternalEventsPage(
    ExternalEventDiscoveryQuery query, {
    PageCursor<ExternalEvent>? startAfter,
  }) async => const CursorPage(items: [], hasMore: false);
}
