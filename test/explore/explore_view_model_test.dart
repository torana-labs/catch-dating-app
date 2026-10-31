import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_search_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/explore.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as event_test;
import '../organizers/organizers_test_helpers.dart';
import '../test_pump_helpers.dart';
import 'explore_device_location_fakes.dart';

final _l10n = AppLocalizationsEn();

CityData _city(String name) => cityOptionByName(name)!.toCityData();

String get _mumbaiMarketId => _city('mumbai').effectiveMarketId;

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

ExploreEventItem _exploreItem({
  required String id,
  required Organizer organizer,
  required DateTime startTime,
  bool isJoinedOrganizerMember = false,
  bool isFollowedOrganizerSignal = false,
  int? bookedCount,
  int priceInPaise = 0,
  double? distanceFromUserKm,
  ViewerEventAvailability? availability,
  double startingPointLat = 19.0608,
  double startingPointLng = 72.8365,
}) {
  final event = buildEvent(
    id: id,
    clubId: organizer.id,
    startTime: startTime,
    bookedCount: bookedCount,
    priceInPaise: priceInPaise,
  );
  return ExploreEventItem(
    event: event.copyWith(
      meetingLocation: EventMeetingLocation(
        name: event.meetingPoint,
        latitude: startingPointLat,
        longitude: startingPointLng,
      ),
      startingPointLat: startingPointLat,
      startingPointLng: startingPointLng,
    ),
    organizer: organizer,
    availability: availability,
    isJoinedOrganizerMember: isJoinedOrganizerMember,
    isFollowedOrganizerSignal: isFollowedOrganizerSignal,
    distanceFromUserKm: distanceFromUserKm,
  );
}

void main() {
  group('Explore state', () {
    test('ExploreDiscoveryEmptyState derives provider-free empty actions', () {
      final noSource = ExploreDiscoveryEmptyState.from(
        cityLabel: 'Mumbai',
        hasSourceOrganizers: false,
        hasSearch: false,
        filters: const ExploreFilterSelection(),
      );
      expect(noSource.kind, ExploreDiscoveryEmptyKind.noSourceOrganizers);
      expect(noSource.action, ExploreDiscoveryEmptyAction.none);

      final searchAndFilters = ExploreDiscoveryEmptyState.from(
        cityLabel: 'Mumbai',
        hasSourceOrganizers: true,
        hasSearch: true,
        filters: const ExploreFilterSelection(highRatedOnly: true),
      );
      expect(
        searchAndFilters.kind,
        ExploreDiscoveryEmptyKind.noFilteredSearchResults,
      );
      expect(
        searchAndFilters.action,
        ExploreDiscoveryEmptyAction.clearSearchAndFilters,
      );
      expect(searchAndFilters.clearSearch, true);
      expect(searchAndFilters.clearFilters, true);

      final filtersOnly = ExploreDiscoveryEmptyState.from(
        cityLabel: 'Mumbai',
        hasSourceOrganizers: true,
        hasSearch: false,
        filters: const ExploreFilterSelection(highRatedOnly: true),
      );
      expect(filtersOnly.kind, ExploreDiscoveryEmptyKind.noFilterResults);
      expect(filtersOnly.action, ExploreDiscoveryEmptyAction.clearFilters);
    });

    test('ExploreEventsEmptyState derives provider-free event actions', () {
      final search = ExploreEventsEmptyState.from(
        filters: const ExploreFilterSelection(),
        searchQuery: 'tempo',
        l10n: _l10n,
      );
      expect(search.title, 'No events match this search');
      expect(search.clearSearch, true);
      expect(search.clearFilters, true);
      expect(search.nextFilter, isNull);

      final thisWeek = ExploreEventsEmptyState.from(
        filters: const ExploreFilterSelection(
          timeFilter: ExploreTimeFilter.thisWeek,
        ),
        searchQuery: '',
        l10n: _l10n,
      );
      expect(thisWeek.title, 'Nothing this week');
      expect(thisWeek.nextFilter, ExploreTimeFilter.anytime);
      expect(thisWeek.clearFilters, false);

      final anytime = ExploreEventsEmptyState.from(
        filters: const ExploreFilterSelection(
          timeFilter: ExploreTimeFilter.anytime,
        ),
        searchQuery: '',
        l10n: _l10n,
      );
      expect(anytime.title, 'No upcoming events match this view');
      expect(anytime.clearFilters, true);
      expect(anytime.nextFilter, isNull);
    });

    test('ExploreMapLauncherState hides until mapped supply is loaded', () {
      final loading = ExploreMapLauncherState.from(
        mappableEventCount: null,
        l10n: _l10n,
      );
      expect(loading.isVisible, isFalse);
      expect(loading.actionLabel, 'Map');
      expect(loading.countLabel, isNull);

      final empty = ExploreMapLauncherState.from(
        mappableEventCount: 0,
        l10n: _l10n,
      );
      expect(empty.isVisible, isFalse);
      expect(empty.countLabel, isNull);

      final populated = ExploreMapLauncherState.from(
        mappableEventCount: 3,
        l10n: _l10n,
      );
      expect(populated.isVisible, isTrue);
      expect(populated.actionLabel, 'Map');
      expect(populated.countLabel, '3');
      expect(populated.semanticLabel, 'Map, 3 events');
    });

    test('ExploreCityButtonState derives provider-free city chrome', () {
      final idle = ExploreCityButtonState.from(
        city: _city('mumbai'),
        focused: false,
        l10n: _l10n,
      );
      expect(idle.tooltipLabel, 'Choose city: Mumbai');
      expect(idle.semanticLabel, 'Choose city: Mumbai');
      expect(idle.scopeLabel, 'EXPLORE · MUMBAI');
      expect(idle.icon, CatchIcons.location);

      final focused = ExploreCityButtonState.from(
        city: _city('mumbai'),
        focused: true,
        l10n: _l10n,
      );
      expect(focused.icon, CatchIcons.location);
    });

    test(
      'ExploreCityPickerState exposes provider-free picker availability',
      () {
        final ready = ExploreCityPickerState.from(
          selectedCity: _city('mumbai'),
          cities: [_city('mumbai'), _city('delhi')],
          cityListLoading: false,
          cityListError: null,
        );

        expect(ready.selectedCity, _city('mumbai'));
        expect(ready.cities.map((city) => city.label), ['Mumbai', 'Delhi NCR']);
        expect(ready.enabled, true);

        final loading = ExploreCityPickerState.from(
          selectedCity: _city('mumbai'),
          cities: const [],
          cityListLoading: true,
          cityListError: null,
        );
        expect(loading.enabled, false);

        final failed = ExploreCityPickerState.from(
          selectedCity: _city('mumbai'),
          cities: [_city('mumbai')],
          cityListLoading: false,
          cityListError: Object(),
        );
        expect(failed.enabled, false);
      },
    );

    test('ExploreChromeState derives browse header labels', () {
      final state = ExploreChromeState.browse(
        query: 'pickleball dinner',
        showSearchAction: true,
        l10n: _l10n,
      );

      expect(state.title, 'Explore');
      expect(state.searchValue, 'pickleball dinner');
      expect(state.searchPlaceholder, 'Search events or organizers');
      expect(state.searchTooltip, 'Search events or organizers');
      expect(state.searchSemanticLabel, 'Search events or organizers');
      expect(state.showSearchAction, true);
      expect(state.showCoverStory, false);
      expect(state.searchExpanded, false);
      expect(state.searchAutofocus, false);

      final cityOnly = ExploreChromeState.browse(
        query: '',
        showSearchAction: false,
        l10n: _l10n,
      );
      expect(cityOnly.showSearchAction, false);
    });

    test('ExploreChromeState derives discovery cover/search policy', () {
      final cover = ExploreChromeState.discovery(
        query: '',
        searchRequested: false,
        hasFeaturedItem: true,
        l10n: _l10n,
      );
      expect(cover.showCoverStory, true);
      expect(cover.searchExpanded, false);
      expect(cover.searchAutofocus, false);

      final requestedSearch = ExploreChromeState.discovery(
        query: '',
        searchRequested: true,
        hasFeaturedItem: true,
        l10n: _l10n,
      );
      expect(requestedSearch.showCoverStory, false);
      expect(requestedSearch.searchExpanded, true);
      expect(requestedSearch.searchAutofocus, true);

      final activeSearch = ExploreChromeState.discovery(
        query: 'tempo',
        searchRequested: false,
        hasFeaturedItem: true,
        l10n: _l10n,
      );
      expect(activeSearch.showCoverStory, false);
      expect(activeSearch.searchExpanded, true);
      expect(activeSearch.searchAutofocus, false);

      final noFeaturedItem = ExploreChromeState.discovery(
        query: '',
        searchRequested: false,
        hasFeaturedItem: false,
        l10n: _l10n,
      );
      expect(noFeaturedItem.showCoverStory, false);
    });

    test('ExploreFilterRailState derives active count and semantics', () {
      final empty = ExploreFilterRailState.from(
        const ExploreFilterSelection(),
        l10n: _l10n,
      );
      expect(empty.activeCount, 0);
      expect(empty.filterButtonSemanticLabel, 'Open explore filters');

      final active = ExploreFilterRailState.from(
        const ExploreFilterSelection(
          distanceFilter: ExploreDistanceFilter.threeKm,
          highRatedOnly: true,
          joinedOnly: true,
          activityTag: 'dinner',
          area: 'Bandra',
        ),
        l10n: _l10n,
      );
      expect(active.activeCount, 5);
      expect(
        active.filterButtonSemanticLabel,
        'Open explore filters, 5 active',
      );
    });

    test('ExploreFilterSheetState derives distance and area options', () {
      final sheetState = ExploreFilterSheetState.from(
        filters: const ExploreFilterSelection(area: 'Bandra'),
        sourceOrganizers: [
          buildOrganizer(id: 'area-khar', area: 'Khar'),
          buildOrganizer(id: 'area-empty', area: ''),
        ],
        l10n: _l10n,
      );

      expect(sheetState.distanceOptions.map((option) => option.label), [
        'Any',
        '1 km',
        '3 km',
        '5 km',
        '10 km',
      ]);
      expect(sheetState.areaOptions, ['Bandra', 'Khar']);
      expect(sheetState.activeCount, 1);
      expect(sheetState.actionLabel, 'Show 0 plans');
      expect(sheetState.actionLoading, isFalse);
    });

    test('ExploreDateStripState exposes seven dates with supply density', () {
      final state = ExploreDateStripState.from(
        viewModel: const ExploreFeedViewModel(
          items: [],
          dateSupplyCounts: {
            ExploreTimeFilter.tonight: 2,
            ExploreTimeFilter.tomorrow: 0,
            ExploreTimeFilter.dayTwo: 4,
            ExploreTimeFilter.anytime: 6,
          },
        ),
        l10n: _l10n,
        now: DateTime(2026, 5, 26, 10),
      );

      expect(state.options, hasLength(8));
      expect(state.options[0].label, 'Tonight · 2');
      expect(state.options[1].label, 'Tomorrow · 0');
      expect(state.options[2].label, 'Thu 28 · 4');
      expect(state.options[7].label, 'Any · 6');
      expect(
        state.options.map((option) => option.value),
        displayedExploreDateFilters,
      );
    });

    test('ExploreFilterSheetState keeps cursor counts honest', () {
      final state = ExploreFilterSheetState.from(
        filters: const ExploreFilterSelection(),
        sourceOrganizers: const [],
        viewModel: const ExploreFeedViewModel(items: [], isExhaustive: false),
        l10n: _l10n,
      );

      expect(state.actionLabel, 'Show 0+ plans');
      expect(state.actionLoading, isFalse);

      final loading = state.withLiveResults(
        filters: const ExploreFilterSelection(highRatedOnly: true),
        viewModel: null,
        feedLoading: true,
        l10n: _l10n,
      );
      expect(loading.actionLabel, 'Updating plans');
      expect(loading.actionLoading, isTrue);
      expect(loading.activeCount, 1);
    });

    test('ExploreCoverStoryState derives provider-free cover copy', () {
      final organizer = buildOrganizer(id: 'cover-club', name: 'Cover Club');
      final item = _exploreItem(
        id: 'cover-event',
        organizer: organizer,
        startTime: DateTime(2026, 7, 2, 18),
        bookedCount: 19,
      );

      final state = ExploreCoverStoryState.from(
        item,
        l10n: _l10n,
        now: DateTime(2026, 7, 2, 10),
      );

      expect(state.kicker, 'Tonight - Cover Club - Start');
      expect(state.title, item.event.title);
      expect(state.ctaLabel, 'View and book');
      expect(state.timePriceLabel, '6:00 PM - Free');
      expect(state.attendanceLabel, '19 going - 1 left');
    });

    test('ranked hero beats chronology and stays in the feed', () {
      final now = DateTime(2026, 7, 1, 10);
      final organizer = buildOrganizer(id: 'ranked-hero-club');
      final soonest = _exploreItem(
        id: 'soonest',
        organizer: organizer,
        startTime: DateTime(2026, 7, 1, 18),
        bookedCount: 0,
      );
      final socialProof = _exploreItem(
        id: 'social-proof',
        organizer: organizer,
        startTime: DateTime(2026, 7, 2, 18),
        bookedCount: 12,
      );

      final featuredEventId = selectExploreFeaturedEventId(
        items: [soonest, socialProof],
        now: now,
      );
      final viewModel = ExploreFeedViewModel(
        items: [soonest, socialProof],
        featuredEventId: featuredEventId,
      );
      final section = ExploreFeedSectionState.from(
        viewModel: viewModel,
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
        showThisWeekList: false,
        l10n: _l10n,
        now: now,
      );

      expect(featuredEventId, 'social-proof');
      expect(viewModel.featuredItem, same(socialProof));
      expect(section.bodyViewModel.items.map((item) => item.event.id), [
        'soonest',
        'social-proof',
      ]);
    });

    test('blocked events cannot become the Explore hero', () {
      final now = DateTime(2026, 7, 1, 10);
      final organizer = buildOrganizer(id: 'eligible-hero-club');
      final blocked = _exploreItem(
        id: 'members-only',
        organizer: organizer,
        startTime: DateTime(2026, 7, 1, 18),
        bookedCount: 15,
        availability: const ViewerEventAvailability(
          status: ViewerEventAvailabilityStatus.membershipRequired,
          spotsRemaining: 5,
          isSaved: false,
          isHosted: false,
          isOrganizerMember: false,
        ),
      );
      final open = _exploreItem(
        id: 'open-event',
        organizer: organizer,
        startTime: DateTime(2026, 7, 2, 18),
        availability: const ViewerEventAvailability(
          status: ViewerEventAvailabilityStatus.open,
          spotsRemaining: 20,
          isSaved: false,
          isHosted: false,
          isOrganizerMember: false,
        ),
      );

      expect(
        selectExploreFeaturedEventId(items: [blocked, open], now: now),
        'open-event',
      );
    });

    test('cover CTA describes the next detail action honestly', () {
      final organizer = buildOrganizer(id: 'cover-cta-club');
      final start = DateTime(2026, 7, 2, 18);
      ExploreCoverStoryState stateFor(ViewerEventAvailabilityStatus status) {
        return ExploreCoverStoryState.from(
          _exploreItem(
            id: status.name,
            organizer: organizer,
            startTime: start,
            availability: ViewerEventAvailability(
              status: status,
              spotsRemaining: 4,
              isSaved: false,
              isHosted: false,
              isOrganizerMember: false,
            ),
          ),
          l10n: _l10n,
        );
      }

      expect(
        stateFor(ViewerEventAvailabilityStatus.open).ctaLabel,
        'View and book',
      );
      expect(
        stateFor(ViewerEventAvailabilityStatus.requestRequired).ctaLabel,
        'View and request',
      );
      expect(
        stateFor(ViewerEventAvailabilityStatus.waitlistAvailable).ctaLabel,
        'View waitlist',
      );
      expect(
        stateFor(ViewerEventAvailabilityStatus.joined).ctaLabel,
        'View event',
      );
    });

    test(
      'ExploreFeedSectionState counts the full feed and keeps the cover event visible',
      () {
        final now = DateTime(2026, 7, 1, 10);
        final eventOrganizer = buildOrganizer(id: 'event-club');
        final joinedOrganizer = buildOrganizer(
          id: 'joined-club',
          name: 'Joined Club',
          nextEventLabel: 'Tonight',
        );
        final spotlightOrganizer = buildOrganizer(
          id: 'spotlight-club',
          name: 'Spotlight Club',
          nextEventLabel: 'Tomorrow',
          imageUrl: 'https://example.com/club.jpg',
          rating: 4.9,
          memberCount: 200,
        );

        final state = ExploreFeedSectionState.from(
          l10n: _l10n,
          viewModel: ExploreFeedViewModel(
            items: [
              _exploreItem(
                id: 'featured-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 1, 18),
              ),
              _exploreItem(
                id: 'second-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 2, 18),
              ),
              _exploreItem(
                id: 'third-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 3, 18),
              ),
            ],
          ),
          candidateOrganizers: [joinedOrganizer, spotlightOrganizer],
          joinedOrganizerIds: {'joined-club'},
          showThisWeekList: false,
          now: now,
        );

        expect(state.bodyViewModel.items.map((item) => item.event.id), [
          'featured-event',
          'second-event',
          'third-event',
        ]);
        expect(state.totalCount, 3);
        expect(state.resultCountLabel, '3 PLANS · JUL 1-3');
        expect(state.cards, hasLength(4));
        expect(
          (state.cards[0] as ExploreMixedEventRowCard).item.event.id,
          'featured-event',
        );
        expect(
          (state.cards[1] as ExploreMixedEventRowCard).item.event.id,
          'second-event',
        );
        expect(
          (state.cards[2] as ExploreMixedOrganizerSpotlightCard).organizer.id,
          'spotlight-club',
        );
        expect(
          (state.cards[3] as ExploreMixedEventRowCard).item.event.id,
          'third-event',
        );
        expect(state.cardGroups, hasLength(3));
        expect(state.cardGroups.first.label, startsWith('Today ·'));

        final searchState = ExploreFeedSectionState.from(
          l10n: _l10n,
          viewModel: ExploreFeedViewModel(
            items: [
              _exploreItem(
                id: 'featured-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 1, 18),
              ),
              _exploreItem(
                id: 'second-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 2, 18),
              ),
              _exploreItem(
                id: 'third-event',
                organizer: eventOrganizer,
                startTime: DateTime(2026, 7, 3, 18),
              ),
            ],
          ),
          candidateOrganizers: const [],
          joinedOrganizerIds: const {},
          showThisWeekList: false,
          promoteFeaturedItem: false,
          now: now,
        );
        expect(searchState.bodyViewModel.items.map((item) => item.event.id), [
          'featured-event',
          'second-event',
          'third-event',
        ]);
        expect(searchState.resultCountLabel, '3 PLANS · JUL 1-3');
      },
    );

    test('ExploreFeedSectionState promotes a real two-day This week strip', () {
      final now = DateTime(2026, 7, 1, 10);
      final organizer = buildOrganizer(id: 'week-club');
      final featured = _exploreItem(
        id: 'featured-event',
        organizer: organizer,
        startTime: DateTime(2026, 7, 1, 18),
      );
      final weekItems = [
        for (var index = 0; index < 5; index += 1)
          _exploreItem(
            id: 'week-event-$index',
            organizer: organizer,
            startTime: DateTime(2026, 7, index + 2, 18),
          ),
      ];

      final promoted = ExploreFeedSectionState.from(
        l10n: _l10n,
        viewModel: ExploreFeedViewModel(items: [featured, ...weekItems]),
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
        showThisWeekList: true,
        now: now,
      );
      expect(promoted.thisWeekItems, hasLength(6));
      expect(promoted.cards, isEmpty);
      expect(promoted.isEmpty, false);

      final twoDayStrip = ExploreFeedSectionState.from(
        l10n: _l10n,
        viewModel: ExploreFeedViewModel(
          items: [
            featured,
            ...weekItems.take(minimumExploreThisWeekRecommendationCount),
          ],
        ),
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
        showThisWeekList: true,
        now: now,
      );
      expect(twoDayStrip.thisWeekItems, hasLength(3));
      expect(twoDayStrip.cards, isEmpty);

      final oneDayFallback = ExploreFeedSectionState.from(
        l10n: _l10n,
        viewModel: ExploreFeedViewModel(
          items: [
            featured,
            _exploreItem(
              id: 'same-day-event',
              organizer: organizer,
              startTime: DateTime(2026, 7, 1, 20),
            ),
          ],
        ),
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
        showThisWeekList: true,
        now: now,
      );
      expect(oneDayFallback.thisWeekItems, isEmpty);
      expect(
        oneDayFallback.cards.whereType<ExploreMixedEventRowCard>(),
        hasLength(2),
      );
    });

    test(
      'mixed feed chronologically merges internal and external plans before clubs',
      () {
        final organizer = buildOrganizer(id: 'event-club');
        final spotlightOrganizer = buildOrganizer(
          id: 'spotlight-club',
          nextEventLabel: 'Friday',
        );
        final external = ExploreExternalEventItem(
          event: _externalEvent(
            id: 'external-early',
            title: 'External Early',
            citySlug: 'mumbai',
            startTime: DateTime(2026, 7, 2, 12),
          ),
        );
        final cards = buildExploreMixedFeedCards(
          viewModel: ExploreFeedViewModel(
            items: [
              _exploreItem(
                id: 'internal-late',
                organizer: organizer,
                startTime: DateTime(2026, 7, 3, 18),
              ),
              _exploreItem(
                id: 'internal-middle',
                organizer: organizer,
                startTime: DateTime(2026, 7, 2, 18),
              ),
            ],
            externalItems: [external],
          ),
          candidateOrganizers: [spotlightOrganizer],
          joinedOrganizerIds: const {},
        );

        expect(cards, hasLength(4));
        expect(
          (cards[0] as ExploreMixedExternalEventRowCard).item.event.id,
          'external-early',
        );
        expect(
          (cards[1] as ExploreMixedEventRowCard).item.event.id,
          'internal-middle',
        );
        expect(
          (cards[2] as ExploreMixedOrganizerSpotlightCard).organizer.id,
          'spotlight-club',
        );
        expect(
          (cards[3] as ExploreMixedEventRowCard).item.event.id,
          'internal-late',
        );

        final groups = groupExploreMixedFeedCards(
          cards,
          l10n: _l10n,
          now: DateTime(2026, 7, 1, 10),
        );
        expect(groups, hasLength(2));
        expect(groups.first.timedCardCount, 2);
        expect(groups.first.cards, hasLength(3));
        expect(groups.last.timedCardCount, 1);
      },
    );

    test('mixed feed does not silently truncate external results', () {
      final externalItems = [
        for (var index = 0; index < 9; index += 1)
          ExploreExternalEventItem(
            event: _externalEvent(
              id: 'external-$index',
              title: 'External $index',
              citySlug: 'mumbai',
              startTime: DateTime(2026, 7, 2, 10 + index),
            ),
          ),
      ];

      final cards = buildExploreMixedFeedCards(
        viewModel: ExploreFeedViewModel(
          items: const [],
          externalItems: externalItems,
        ),
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
      );

      expect(cards.whereType<ExploreMixedExternalEventRowCard>(), hasLength(9));
    });

    test('ticket strip joins only uninterrupted internal event rows', () {
      final organizer = buildOrganizer(id: 'event-club');
      ExploreMixedEventRowCard internal(String id, int hour) =>
          ExploreMixedEventRowCard(
            _exploreItem(
              id: id,
              organizer: organizer,
              startTime: DateTime(2026, 7, 2, hour),
            ),
          );
      final cards = <ExploreMixedCard>[
        internal('first', 10),
        internal('second', 11),
        ExploreMixedOrganizerRowCard(buildOrganizer(id: 'club-break')),
        internal('third', 12),
        ExploreMixedExternalEventRowCard(
          ExploreExternalEventItem(
            event: _externalEvent(
              id: 'external-break',
              title: 'External Break',
              citySlug: 'mumbai',
              startTime: DateTime(2026, 7, 2, 13),
            ),
          ),
        ),
        internal('fourth', 14),
      ];

      expect(
        exploreMixedEventStripPosition(cards, 0),
        EventDateRailCardStripPosition.first,
      );
      expect(
        exploreMixedEventStripPosition(cards, 1),
        EventDateRailCardStripPosition.last,
      );
      expect(
        exploreMixedEventStripPosition(cards, 3),
        EventDateRailCardStripPosition.single,
      );
      expect(
        exploreMixedEventStripPosition(cards, 5),
        EventDateRailCardStripPosition.single,
      );
    });

    test('mappableEventCount includes required-location event supply', () {
      final organizer = buildOrganizer(id: 'map-club');
      final unpinned = _exploreItem(
        id: 'unpinned',
        organizer: organizer,
        startTime: DateTime(2026, 7, 2, 11),
      );
      final viewModel = ExploreFeedViewModel(
        items: [
          _exploreItem(
            id: 'pinned',
            organizer: organizer,
            startTime: DateTime(2026, 7, 2, 10),
            startingPointLat: 19.06,
            startingPointLng: 72.83,
          ),
          ExploreEventItem(
            event: unpinned.event.copyWith(
              meetingLocation: null,
              startingPointLat: null,
              startingPointLng: null,
            ),
            organizer: organizer,
          ),
        ],
        externalItems: [
          ExploreExternalEventItem(
            event: _externalEvent(
              id: 'external',
              title: 'External',
              citySlug: 'mumbai',
              startTime: DateTime(2026, 7, 2, 12),
            ),
          ),
        ],
      );

      expect(viewModel.count, 3);
      expect(viewModel.mappableEventCount, 2);
    });

    test('result count uses a plus while cursor pages remain', () {
      final organizer = buildOrganizer(id: 'windowed-count-club');
      final state = ExploreFeedSectionState.from(
        viewModel: ExploreFeedViewModel(
          items: [
            _exploreItem(
              id: 'windowed-one',
              organizer: organizer,
              startTime: DateTime(2026, 7, 2, 10),
            ),
            _exploreItem(
              id: 'windowed-two',
              organizer: organizer,
              startTime: DateTime(2026, 7, 2, 11),
            ),
          ],
          isExhaustive: false,
        ),
        candidateOrganizers: const [],
        joinedOrganizerIds: const {},
        showThisWeekList: false,
        promoteFeaturedItem: false,
        l10n: _l10n,
      );

      expect(state.resultCountLabel, '2+ PLANS · JUL 2');
    });

    test('map view model preserves external event identity and coordinate', () {
      final external = _externalEvent(
        id: 'external-map-event',
        title: 'Bandra Mixer',
        citySlug: 'mumbai',
        startTime: DateTime(2026, 7, 18, 19),
      );

      final mapViewModel = exploreMapViewModelFromFeed(
        ExploreFeedViewModel(
          items: const [],
          externalItems: [ExploreExternalEventItem(event: external)],
        ),
      );

      expect(mapViewModel.externalPinnedItems, hasLength(1));
      expect(
        mapViewModel.externalPinnedItems.single.mapId,
        'external:external-map-event',
      );
      expect(
        mapViewModel.externalPinnedItems.single.coordinate,
        const LocationCoordinate(19.0435, 72.8204),
      );
    });

    test('ExploreEventRowState derives provider-free event row labels', () {
      final organizer = buildOrganizer(id: 'row-club', name: 'Row Club');
      final item = _exploreItem(
        id: 'row-event',
        organizer: organizer,
        startTime: DateTime(2026, 7, 2, 18),
        isJoinedOrganizerMember: true,
      );

      final state = ExploreEventRowState.from(item, l10n: _l10n);

      expect(state.kicker, 'Row Club');
      expect(state.title, 'Social run');
      expect(state.supportingLabel, contains('Start'));
      expect(state.priceLabel, 'Free');
      expect(state.capacityLabel, isNotEmpty);
      expect(state.statusLabel, isNull);
    });

    test(
      'ExploreEventRowState keeps organizer identity for followed clubs',
      () {
        final organizer = buildOrganizer(
          id: 'member-row-club',
          name: 'Member Club',
        );
        final item = _exploreItem(
          id: 'member-row-event',
          organizer: organizer,
          startTime: DateTime(2026, 7, 2, 18),
          isJoinedOrganizerMember: true,
          isFollowedOrganizerSignal: true,
        );

        expect(
          ExploreEventRowState.from(item, l10n: _l10n).kicker,
          'Member Club',
        );
      },
    );

    test('ExploreExternalEventRowState derives provider-free row labels', () {
      final event = _externalEvent(
        id: 'external-row',
        title: 'Afterfly Social',
        citySlug: 'mumbai',
        startTime: DateTime(2026, 7, 2, 18),
      );
      final item = ExploreExternalEventItem(
        event: event,
        distanceFromUserKm: 2.4,
      );

      final state = ExploreExternalEventRowState.from(item, l10n: _l10n);

      expect(state.sourceLabel, 'FROM LUMA');
      expect(
        state.supportingLabel,
        'Singles mixer · Bandra Amphitheatre · 2.4 km away',
      );
      expect(state.timePriceLabel, '6:00 PM · Price on source');
      expect(state.actionLabel, 'Open');
      expect(state.actionSemanticsLabel, 'Open external event source');
      expect(state.readOnlySupplyLabel, 'READ-ONLY SUPPLY · NO CATCH BOOKING');
      expect(state.hasExternalLink, true);
    });

    test(
      'unclaimed organizer external event without link renders No link row state',
      () {
        final event = _externalEvent(
          id: 'external-unclaimed-organizer',
          title: 'Unclaimed Organizer Social',
          citySlug: 'mumbai',
          startTime: DateTime(2026, 7, 2, 18),
          externalLinks: const [],
        ).copyWith(canonicalHostId: '', compatibilityOrganizerId: '');
        final state = ExploreExternalEventRowState.from(
          ExploreExternalEventItem(event: event),
          l10n: _l10n,
        );

        expect(state.actionLabel, 'No link');
        expect(state.actionSemanticsLabel, 'External event link unavailable');
        expect(state.hasExternalLink, false);
        expect(state.supportingLabel, contains('Bandra Amphitheatre'));
      },
    );

    test('ExploreOrganizerCardState derives shared club card labels', () {
      final organizer = buildOrganizer(
        id: 'club-card',
        name: 'Tempo House',
        tags: const ['Bandra', 'music', 'social', 'late'],
        memberCount: 42,
        nextEventLabel: 'Fri 8 PM',
      );

      final state = ExploreOrganizerCardState.from(organizer, l10n: _l10n);

      expect(state.memberCountLabel, '42 followers');
      expect(state.caption, 'FRI 8 PM');
      expect(state.title, 'Tempo House');
      expect(state.supportingLabel, 'Next: Fri 8 PM');
      expect(state.ratingReviewLabel, '0.0 · NO REVIEWS');
      expect(state.semanticLabel, contains('Tempo House'));
      expect(state.rowKicker, 'ORGANIZER TO KNOW');
      expect(state.tags, ['music', 'social']);
    });

    test('event price copy distinguishes demand floor from viewer quote', () {
      final demandEvent = event_test.buildEvent(
        priceInPaise: 50000,
        eventPolicy: EventPolicyBundle.demandPricedBalancedSinglesEvent(
          capacityLimit: 20,
          basePriceInPaise: 50000,
          stepAdjustmentInPaise: 10000,
          maxAdjustmentInPaise: 30000,
        ),
      );

      expect(eventPriceLabel(_l10n, demandEvent), startsWith('From '));
      expect(
        eventPriceLabel(_l10n, demandEvent, quotedPriceInPaise: 70000),
        isNot(startsWith('From ')),
      );
      expect(
        eventPriceLabel(_l10n, demandEvent.copyWith(priceInPaise: 0)),
        'Free',
      );
    });

    test('ExploreScreenBodyState derives route branch precedence', () {
      final emptyState = ExploreDiscoveryEmptyState.from(
        cityLabel: 'Mumbai',
        hasSourceOrganizers: false,
        hasSearch: false,
        filters: const ExploreFilterSelection(),
      );
      const emptyViewModel = ExploreViewModel(
        joinedOrganizers: [],
        allOrganizers: [],
      );
      final populatedViewModel = ExploreViewModel(
        joinedOrganizers: const [],
        allOrganizers: [buildOrganizer(id: 'club-content')],
      );

      ExploreScreenBodyState body({
        bool viewModelLoading = false,
        Object? viewModelError,
        ExploreViewModel? viewModel,
        bool eventFeedLoading = false,
        Object? eventFeedError,
        bool eventFeedHasContent = false,
      }) {
        return ExploreScreenBodyState.from(
          viewModelLoading: viewModelLoading,
          viewModelError: viewModelError,
          viewModel: viewModel ?? emptyViewModel,
          eventFeedLoading: eventFeedLoading,
          eventFeedError: eventFeedError,
          eventFeedHasContent: eventFeedHasContent,
          emptyState: emptyState,
        );
      }

      expect(body(viewModelLoading: true).kind, ExploreScreenBodyKind.loading);

      final viewModelError = body(viewModelError: StateError('clubs failed'));
      expect(viewModelError.kind, ExploreScreenBodyKind.error);
      expect(viewModelError.retryTarget, ExploreScreenRetryTarget.explore);
      expect(
        body(
          viewModelLoading: true,
          viewModelError: StateError('clubs failed'),
        ).kind,
        ExploreScreenBodyKind.error,
      );

      final viewModelErrorWithFeed = body(
        viewModelError: StateError('clubs failed'),
        eventFeedHasContent: true,
      );
      expect(
        viewModelErrorWithFeed.kind,
        ExploreScreenBodyKind.contentWithoutOrganizers,
      );
      expect(
        viewModelErrorWithFeed.retryTarget,
        ExploreScreenRetryTarget.explore,
      );

      final populatedOrganizers = body(viewModel: populatedViewModel);
      expect(populatedOrganizers.kind, ExploreScreenBodyKind.content);
      expect(populatedOrganizers.viewModel, populatedViewModel);

      final populatedEvents = body(eventFeedHasContent: true);
      expect(populatedEvents.kind, ExploreScreenBodyKind.content);
      expect(populatedEvents.viewModel, emptyViewModel);

      expect(body(eventFeedLoading: true).kind, ExploreScreenBodyKind.loading);

      final feedError = body(eventFeedError: StateError('events failed'));
      expect(feedError.kind, ExploreScreenBodyKind.error);
      expect(feedError.retryTarget, ExploreScreenRetryTarget.eventFeed);
      expect(
        body(
          eventFeedLoading: true,
          eventFeedError: StateError('events failed'),
        ).kind,
        ExploreScreenBodyKind.error,
      );

      final empty = body();
      expect(empty.kind, ExploreScreenBodyKind.empty);
      expect(empty.emptyState, emptyState);
    });

    test('ExploreDiscoveryScreenState derives route display state', () {
      const emptyViewModel = ExploreViewModel(
        joinedOrganizers: [],
        allOrganizers: [],
      );
      final state = ExploreDiscoveryScreenState.from(
        l10n: _l10n,
        cityLabel: 'Mumbai',
        query: 'padel',
        filters: const ExploreFilterSelection(
          distanceFilter: ExploreDistanceFilter.threeKm,
        ),
        hasSourceOrganizers: true,
        mappableEventCount: 4,
        viewModelLoading: false,
        viewModel: emptyViewModel,
        eventFeedLoading: false,
        eventFeedHasContent: false,
      );

      expect(state.mapLauncherState.isVisible, isTrue);
      expect(state.mapLauncherState.countLabel, '4');
      expect(
        state.emptyState.kind,
        ExploreDiscoveryEmptyKind.noFilteredSearchResults,
      );
      expect(
        state.emptyState.action,
        ExploreDiscoveryEmptyAction.clearSearchAndFilters,
      );
      expect(state.bodyState.kind, ExploreScreenBodyKind.empty);
      expect(state.bodyState.emptyState, state.emptyState);

      final content = ExploreDiscoveryScreenState.from(
        l10n: _l10n,
        cityLabel: 'Mumbai',
        query: '',
        filters: const ExploreFilterSelection(),
        hasSourceOrganizers: false,
        mappableEventCount: 1,
        viewModelLoading: false,
        viewModel: emptyViewModel,
        eventFeedLoading: false,
        eventFeedHasContent: true,
      );

      expect(content.mapLauncherState.isVisible, isTrue);
      expect(content.mapLauncherState.countLabel, '1');
      expect(content.bodyState.kind, ExploreScreenBodyKind.content);
    });

    test(
      'selectedExploreCityProvider defaults to Mumbai and clears search on change',
      () {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        expect(container.read(selectedExploreCityProvider), _city('mumbai'));

        container.read(exploreSearchQueryProvider.notifier).setQuery('stride');
        container
            .read(selectedExploreCityProvider.notifier)
            .setCity(_city('delhi'));

        expect(container.read(selectedExploreCityProvider), _city('delhi'));
        expect(container.read(exploreSearchQueryProvider), isEmpty);
        expect(
          container.read(selectedExploreCityWasUserSelectedProvider),
          true,
        );
      },
    );

    test('autoSelectCity sets city when user has not made a manual pick', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(selectedExploreCityProvider), _city('mumbai'));

      container
          .read(selectedExploreCityProvider.notifier)
          .autoSelectCity(_city('delhi'));

      expect(container.read(selectedExploreCityProvider), _city('delhi'));
      expect(container.read(selectedExploreCityWasUserSelectedProvider), false);
    });

    test('autoSelectCityByName uses known profile cities', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container
          .read(selectedExploreCityProvider.notifier)
          .autoSelectCityByName('indore');

      expect(container.read(selectedExploreCityProvider), _city('indore'));
    });

    test('autoSelectCity does not override a manual city choice', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container
          .read(selectedExploreCityProvider.notifier)
          .setCity(_city('bangalore'));
      expect(container.read(selectedExploreCityProvider), _city('bangalore'));

      container
          .read(selectedExploreCityProvider.notifier)
          .autoSelectCity(_city('mumbai'));
      expect(container.read(selectedExploreCityProvider), _city('bangalore'));
    });

    test('setCity clears search query while autoSelectCity also clears it', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(exploreSearchQueryProvider.notifier).setQuery('stride');
      container
          .read(selectedExploreCityProvider.notifier)
          .autoSelectCity(_city('delhi'));

      expect(container.read(exploreSearchQueryProvider), isEmpty);
    });

    test('setCity clears city-local filters but keeps global filters', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final filters = container.read(exploreFiltersProvider.notifier);
      filters.toggleThisWeekOnly();
      filters.toggleHighRatedOnly();
      filters.toggleDistanceFilter(ExploreDistanceFilter.threeKm);
      filters.toggleActivityTag('tempo');
      filters.toggleArea('Bandra');

      container
          .read(selectedExploreCityProvider.notifier)
          .setCity(_city('delhi'));

      final selection = container.read(exploreFiltersProvider);
      expect(selection.timeFilter, ExploreTimeFilter.thisWeek);
      expect(selection.thisWeekOnly, isTrue);
      expect(selection.distanceFilter, ExploreDistanceFilter.any);
      expect(selection.highRatedOnly, isTrue);
      expect(selection.activityTag, isNull);
      expect(selection.area, isNull);
    });

    test('time filters define discovery windows', () {
      final now = DateTime(2026, 5, 26, 10);

      final tonight = exploreTimeWindowFor(ExploreTimeFilter.tonight, now)!;
      expect(tonight.start, DateTime(2026, 5, 26, 18));
      expect(tonight.end, DateTime(2026, 5, 27, 3));

      final tomorrow = exploreTimeWindowFor(ExploreTimeFilter.tomorrow, now)!;
      expect(tomorrow.start, DateTime(2026, 5, 27, 3));
      expect(tomorrow.end, DateTime(2026, 5, 28, 3));

      final daySix = exploreTimeWindowFor(ExploreTimeFilter.daySix, now)!;
      expect(daySix.start, DateTime(2026, 6, 1, 3));
      expect(daySix.end, DateTime(2026, 6, 2, 3));

      final stripWindow = exploreDateStripQueryWindow(now);
      expect(stripWindow.start, now);
      expect(stripWindow.end, DateTime(2026, 6, 2, 3));

      final weekend = exploreTimeWindowFor(ExploreTimeFilter.weekend, now)!;
      expect(weekend.start, DateTime(2026, 5, 29));
      expect(weekend.end, DateTime(2026, 6));

      final thisWeek = exploreTimeWindowFor(ExploreTimeFilter.thisWeek, now)!;
      expect(thisWeek.start, now);
      expect(thisWeek.end, DateTime(2026, 6, 2, 10));
    });

    test('Explore defaults to the highest-intent Tonight scope', () {
      const selection = ExploreFilterSelection();
      expect(selection.timeFilter, ExploreTimeFilter.tonight);
      expect(selection.hasActiveFilters, isFalse);
    });

    test('distance filter values define proximity radii', () {
      expect(exploreDistanceFilterKm(ExploreDistanceFilter.any), isNull);
      expect(exploreDistanceFilterKm(ExploreDistanceFilter.oneKm), 1);
      expect(exploreDistanceFilterKm(ExploreDistanceFilter.threeKm), 3);
      expect(exploreDistanceFilterKm(ExploreDistanceFilter.fiveKm), 5);
      expect(exploreDistanceFilterKm(ExploreDistanceFilter.tenKm), 10);
    });

    test('distance filter requires a resolved device location', () async {
      final container = ProviderContainer(
        overrides: [
          deviceLocationProvider.overrideWith(() => _FakeDeviceLocation(null)),
        ],
      );
      addTearDown(container.dispose);

      final failure = await container
          .read(exploreFiltersProvider.notifier)
          .applyDistanceFilter(ExploreDistanceFilter.threeKm);

      expect(failure, DeviceLocationFailure.unavailable);
      expect(
        container.read(exploreFiltersProvider).distanceFilter,
        ExploreDistanceFilter.any,
      );
    });

    test('distance filter applies after device location resolves', () async {
      final container = ProviderContainer(
        overrides: [
          deviceLocationProvider.overrideWith(
            () =>
                _FakeDeviceLocation(const LocationCoordinate(19.0608, 72.8365)),
          ),
        ],
      );
      addTearDown(container.dispose);

      final failure = await container
          .read(exploreFiltersProvider.notifier)
          .applyDistanceFilter(ExploreDistanceFilter.threeKm);

      expect(failure, isNull);
      expect(
        container.read(exploreFiltersProvider).distanceFilter,
        ExploreDistanceFilter.threeKm,
      );
    });

    test('empty map recovery widens only bounded radius filters', () {
      expect(
        widerExploreMapDistanceFilter(ExploreDistanceFilter.oneKm),
        ExploreDistanceFilter.threeKm,
      );
      expect(
        widerExploreMapDistanceFilter(ExploreDistanceFilter.threeKm),
        ExploreDistanceFilter.fiveKm,
      );
      expect(
        widerExploreMapDistanceFilter(ExploreDistanceFilter.fiveKm),
        ExploreDistanceFilter.tenKm,
      );
      expect(
        widerExploreMapDistanceFilter(ExploreDistanceFilter.tenKm),
        isNull,
      );
      expect(widerExploreMapDistanceFilter(ExploreDistanceFilter.any), isNull);
    });

    test(
      'matchesExploreOrganizerSearchQuery matches name, area, host, and tags',
      () {
        final bandraOrganizer = buildOrganizer();
        final hostOrganizer = buildOrganizer(
          id: 'club-2',
          name: 'Sunrise Crew',
          hostName: 'Asha',
        );
        final taggedOrganizer = buildOrganizer(
          id: 'club-3',
          name: 'Night Pacers',
          tags: const ['tempo', 'community'],
        );

        expect(
          matchesExploreOrganizerSearchQuery(bandraOrganizer, 'bandra'),
          isTrue,
        );
        expect(
          matchesExploreOrganizerSearchQuery(hostOrganizer, 'asha'),
          isTrue,
        );
        expect(
          matchesExploreOrganizerSearchQuery(taggedOrganizer, 'tempo'),
          isTrue,
        );
        expect(
          matchesExploreOrganizerSearchQuery(taggedOrganizer, 'missing'),
          isFalse,
        );
      },
    );

    test('applyExploreFilters combines quick filters', () {
      final now = DateTime(2026, 1, 1, 8);
      final matchingOrganizer = buildOrganizer(
        id: 'matching-club',
        tags: const ['tempo'],
        rating: 4.8,
        nextEventAt: now.add(const Duration(days: 2)),
      );
      final staleEventOrganizer = buildOrganizer(
        id: 'stale-event-club',
        tags: const ['tempo'],
        rating: 4.9,
        nextEventAt: now.subtract(const Duration(hours: 1)),
      );
      final lowRatedOrganizer = buildOrganizer(
        id: 'low-rated-club',
        tags: const ['tempo'],
        rating: 4.2,
        nextEventAt: now.add(const Duration(days: 2)),
      );
      final wrongAreaOrganizer = buildOrganizer(
        id: 'wrong-area-club',
        area: 'Juhu',
        tags: const ['tempo'],
        rating: 4.8,
        nextEventAt: now.add(const Duration(days: 2)),
      );

      final filtered = applyExploreFilters(
        organizers: [
          matchingOrganizer,
          staleEventOrganizer,
          lowRatedOrganizer,
          wrongAreaOrganizer,
        ],
        filters: const ExploreFilterSelection(
          timeFilter: ExploreTimeFilter.thisWeek,
          highRatedOnly: true,
          joinedOnly: true,
          activityTag: 'Tempo',
          area: 'bandra',
        ),
        joinedOrganizerIds: {
          'matching-club',
          'stale-event-club',
          'wrong-area-club',
        },
        now: now,
      );

      expect(filtered.map((organizer) => organizer.id), ['matching-club']);
    });

    test('applyExploreFilters uses the selected time window', () {
      final now = DateTime(2026, 5, 26, 10);
      final tonightOrganizer = buildOrganizer(
        id: 'tonight-club',
        nextEventAt: DateTime(2026, 5, 26, 19),
      );
      final tomorrowOrganizer = buildOrganizer(
        id: 'tomorrow-club',
        nextEventAt: DateTime(2026, 5, 27, 8),
      );
      final weekendOrganizer = buildOrganizer(
        id: 'weekend-club',
        nextEventAt: DateTime(2026, 5, 30, 8),
      );

      final filtered = applyExploreFilters(
        organizers: [tonightOrganizer, tomorrowOrganizer, weekendOrganizer],
        filters: const ExploreFilterSelection(
          timeFilter: ExploreTimeFilter.weekend,
        ),
        joinedOrganizerIds: const {},
        now: now,
      );

      expect(filtered.map((organizer) => organizer.id), ['weekend-club']);
    });

    test('applyExploreFilters ignores a distance-only selection on clubs', () {
      final now = DateTime(2026, 1, 1, 8);
      // Well outside the default "this week" window: if a distance-only
      // selection wrongly triggered club time-filtering, this club would vanish.
      final organizer = buildOrganizer(
        id: 'club-distance-only',
        nextEventAt: now.add(const Duration(days: 30)),
      );
      const filters = ExploreFilterSelection(
        distanceFilter: ExploreDistanceFilter.fiveKm,
      );

      // Distance is an active filter globally (it narrows the events feed)...
      expect(filters.hasActiveFilters, isTrue);
      // ...but not for the club list, which has no coordinates to filter on.
      expect(filters.hasActiveOrganizerFilters, isFalse);

      final filtered = applyExploreFilters(
        organizers: [organizer],
        filters: filters,
        joinedOrganizerIds: const {},
        now: now,
      );

      expect(filtered.map((organizer) => organizer.id), ['club-distance-only']);
    });

    test('organizerMatchesScopeFilters short-circuits the tag check for events', () {
      // Default tags are ['social'] — the club does not carry 'running'.
      final organizer = buildOrganizer(id: 'club-social');
      const filters = ExploreFilterSelection(activityTag: 'running');

      // The events query already filtered by ActivityKind, so the club need not
      // also carry the tag as free text.
      expect(
        organizerMatchesScopeFilters(
          organizer: organizer,
          filters: filters,
          joinedOrganizerIds: const {},
          activityHandledByEventFilter: true,
        ),
        isTrue,
      );
      // The club list has no event filter behind it, so the tag must match.
      expect(
        organizerMatchesScopeFilters(
          organizer: organizer,
          filters: filters,
          joinedOrganizerIds: const {},
        ),
        isFalse,
      );
    });

    test('debouncedExploreSearchQuery debounces and trims the server key', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(exploreSearchQueryProvider.notifier).setQuery('asha ');

      // Keep the autoDispose provider mounted while it debounces, the way the
      // view models do by watching it (otherwise the pending timer is disposed).
      final subscription = container.listen(
        debouncedExploreSearchQueryProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);

      // The live query is available immediately, but the debounced server key
      // lags until the typing pause elapses — so a keystroke can't fire a call.
      expect(container.read(exploreSearchQueryProvider), 'asha ');
      expect(subscription.read().isLoading, isTrue);

      // After the debounce window it settles to the trimmed query, so a trailing
      // space no longer mints a distinct search key.
      expect(
        await container.read(debouncedExploreSearchQueryProvider.future),
        'asha',
      );
    });

    test(
      'debouncedExploreSearchQuery settles immediately for short queries',
      () async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        container.read(exploreSearchQueryProvider.notifier).setQuery('a');

        final subscription = container.listen(
          debouncedExploreSearchQueryProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);

        // Clears and single characters bypass the debounce: nothing to search.
        expect(
          await container.read(debouncedExploreSearchQueryProvider.future),
          'a',
        );
      },
    );

    test(
      'exploreOrganizersViewModelProvider partitions joined and discover clubs',
      () async {
        final memberOrganizer = buildOrganizer(id: 'member-club');
        final followedOrganizer = buildOrganizer(
          id: 'followed-club',
          hostUserId: 'host-2',
        );
        final discoverOrganizer = buildOrganizer(
          id: 'discover-club',
          hostUserId: 'host-3',
        );
        final hostedOrganizer = buildOrganizer(
          id: 'hosted-club',
          hostUserId: 'runner-1',
        );

        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchActiveOrganizerMembershipsForUserProvider(
              'runner-1',
            ).overrideWith(
              (ref) => Stream.value([
                _membership(clubId: 'member-club'),
                _membership(clubId: 'followed-club'),
              ]),
            ),
            watchOrganizersByLocationProvider(_mumbaiMarketId).overrideWith(
              (ref) => Stream.value([
                memberOrganizer,
                followedOrganizer,
                discoverOrganizer,
                hostedOrganizer,
              ]),
            ),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          exploreOrganizersViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);

        await flushTestEventQueue();

        expect(
          subscription.read().hasValue,
          isTrue,
          reason: '${subscription.read()}',
        );
        final viewModel = subscription.read().value!;

        expect(viewModel.joinedOrganizers.map((organizer) => organizer.id), [
          'member-club',
          'followed-club',
        ]);
        expect(viewModel.allOrganizers.map((organizer) => organizer.id), [
          'member-club',
          'followed-club',
          'discover-club',
          'hosted-club',
        ]);
        expect(viewModel.joinedOrganizerIds, {'member-club', 'followed-club'});
      },
    );

    test(
      'exploreOrganizersViewModelProvider shows empty city without waiting for auth',
      () async {
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => const Stream.empty()),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value(const <Organizer>[])),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          exploreOrganizersViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);
        await container.pump();
        await flushTestEventQueue();
        await container.pump();

        final viewModel = subscription.read().value!;

        expect(viewModel.isEmpty, isTrue);
        expect(viewModel.joinedOrganizers, isEmpty);
        expect(viewModel.allOrganizers, isEmpty);
      },
    );

    test(
      'filteredExploreOrganizersProvider applies the normalized search query',
      () async {
        final bandraOrganizer = buildOrganizer(id: 'bandra-club');
        final ashaOrganizer = buildOrganizer(
          id: 'asha-club',
          hostName: 'Asha',
          area: 'Juhu',
        );
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(null)),
            exploreSearchRepositoryProvider.overrideWithValue(
              _FakeExploreSearchRepository(error: StateError('search offline')),
            ),
            watchOrganizersByLocationProvider(_mumbaiMarketId).overrideWith(
              (ref) => Stream.value([bandraOrganizer, ashaOrganizer]),
            ),
          ],
        );
        addTearDown(container.dispose);
        container.read(exploreSearchQueryProvider.notifier).setQuery('  asha');

        final subscription = container.listen(
          filteredExploreOrganizersProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);
        await container.pump();

        expect(subscription.read().value, [ashaOrganizer]);
      },
    );

    test(
      'exploreFeedViewModelProvider filters events by device distance',
      () async {
        final organizer = buildOrganizer(id: 'club-distance');
        final near = event_test.buildEvent(
          id: 'near-event',
          clubId: organizer.id,
          meetingPoint: 'Near plaza',
          startTime: DateTime.now().add(const Duration(days: 1)),
          startingPointLat: 19.0,
          startingPointLng: 72.01,
        );
        final far = event_test.buildEvent(
          id: 'far-event',
          clubId: organizer.id,
          meetingPoint: 'Far park',
          startTime: DateTime.now().add(const Duration(days: 2)),
          startingPointLat: 19.0,
          startingPointLng: 72.09,
        );
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(null)),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value([organizer])),
            eventDiscoveryRepositoryProvider.overrideWithValue(
              _FakeEventDiscoveryRepository([far, near]),
            ),
            externalEventRepositoryProvider.overrideWithValue(
              _FakeExternalEventRepository([]),
            ),
            deviceLocationProvider.overrideWith(
              () => _FakeDeviceLocation(const LocationCoordinate(19.0, 72.0)),
            ),
          ],
        );
        addTearDown(container.dispose);
        container
            .read(exploreFiltersProvider.notifier)
            .setTimeFilter(ExploreTimeFilter.anytime);
        container
            .read(exploreFiltersProvider.notifier)
            .setDistanceFilter(ExploreDistanceFilter.threeKm);

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
        final viewModel = subscription.read().value!;

        expect(viewModel.items.map((item) => item.event.id), ['near-event']);
        expect(viewModel.items.single.distanceFromUserKm, lessThan(3));
        expect(
          ExploreEventRowState.from(
            viewModel.items.single,
            l10n: _l10n,
          ).supportingLabel,
          contains('km away'),
        );
      },
    );

    test(
      'exploreFeedViewModelProvider reuses one dated window and counts days',
      () async {
        final referenceNow = DateTime(2026, 5, 26, 10);
        final organizer = buildOrganizer(id: 'club-date-strip');
        final tonight = event_test.buildEvent(
          id: 'date-strip-tonight',
          clubId: organizer.id,
          startTime: DateTime(2026, 5, 26, 20),
        );
        final tomorrow = event_test.buildEvent(
          id: 'date-strip-tomorrow',
          clubId: organizer.id,
          startTime: DateTime(2026, 5, 27, 8),
        );
        final dayTwo = event_test.buildEvent(
          id: 'date-strip-day-two',
          clubId: organizer.id,
          startTime: DateTime(2026, 5, 28, 12),
        );
        final container = ProviderContainer(
          overrides: [
            exploreDiscoveryReferenceNowProvider.overrideWithValue(
              referenceNow,
            ),
            uidProvider.overrideWith((ref) => Stream.value(null)),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value([organizer])),
            eventDiscoveryRepositoryProvider.overrideWithValue(
              _FakeEventDiscoveryRepository([dayTwo, tomorrow, tonight]),
            ),
            externalEventRepositoryProvider.overrideWithValue(
              _FakeExternalEventRepository([]),
            ),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          exploreFeedViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);
        await container.pump();
        await flushTestEventQueue();
        await container.pump();

        final viewModel = subscription.read().requireValue;
        expect(viewModel.items.map((item) => item.event.id), [
          'date-strip-tonight',
        ]);
        expect(viewModel.dateSupplyCount(ExploreTimeFilter.tonight), 1);
        expect(viewModel.dateSupplyCount(ExploreTimeFilter.tomorrow), 1);
        expect(viewModel.dateSupplyCount(ExploreTimeFilter.dayTwo), 1);
        expect(viewModel.dateSupplyCount(ExploreTimeFilter.anytime), 3);
        expect(viewModel.windowRequest?.internalQuery.startAt, referenceNow);
        expect(
          viewModel.windowRequest?.internalQuery.endBefore,
          DateTime(2026, 6, 2, 3),
        );
      },
    );

    test(
      'exploreFeedViewModelProvider keeps external supply separate',
      () async {
        final externalEvent = _externalEvent(
          id: 'external-mumbai-mixer',
          title: 'Mumbai Singles Mixer',
          citySlug: 'mumbai',
          startTime: DateTime.now().add(const Duration(days: 1)),
        );
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(null)),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value(const <Organizer>[])),
            eventDiscoveryRepositoryProvider.overrideWithValue(
              _FakeEventDiscoveryRepository([]),
            ),
            externalEventRepositoryProvider.overrideWithValue(
              _FakeExternalEventRepository([externalEvent]),
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

        expect(
          subscription.read().hasValue,
          isTrue,
          reason: '${subscription.read()}',
        );
        final viewModel = subscription.read().value!;

        expect(viewModel.items, isEmpty);
        expect(viewModel.externalItems.map((item) => item.event.id), [
          'external-mumbai-mixer',
        ]);
        expect(viewModel.isEmpty, isFalse);
        expect(viewModel.count, 1);
        expect(viewModel.dateSupplyCount(ExploreTimeFilter.anytime), 1);
      },
    );

    test(
      'exploreFeedViewModelProvider resolves viewer-specific availability',
      () async {
        final user = event_test.buildUser();
        final organizer = buildOrganizer(id: 'club-availability');
        final joinedEvent = event_test.buildEvent(
          id: 'joined-event',
          clubId: organizer.id,
          startTime: DateTime.now().add(const Duration(days: 1)),
        );
        final savedEvent = event_test.buildEvent(
          id: 'saved-event',
          clubId: organizer.id,
          startTime: DateTime.now().add(const Duration(days: 2)),
        );
        final requestEvent = event_test.buildEvent(
          id: 'request-event',
          clubId: organizer.id,
          startTime: DateTime.now().add(const Duration(days: 3)),
          eventPolicy: EventPolicyBundle.requestToJoinEvent(
            capacityLimit: 12,
            basePriceInPaise: 0,
          ),
        );
        final savedEdge = SavedEvent(
          id: savedEventId(uid: user.uid, eventId: savedEvent.id),
          uid: user.uid,
          eventId: savedEvent.id,
          savedAt: DateTime(2026, 5, 26),
        );

        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(user.uid)),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value([organizer])),
            watchActiveOrganizerMembershipsForUserProvider(
              user.uid,
            ).overrideWith(
              (ref) => Stream.value(const <OrganizerMembership>[]),
            ),
            watchEventParticipationsForUserProvider(user.uid).overrideWith(
              (ref) => Stream.value([
                event_test.buildEventParticipation(
                  event: joinedEvent,
                  uid: user.uid,
                ),
              ]),
            ),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWith((ref) => Stream.value([joinedEvent])),
            watchSavedEventsForUserProvider(
              user.uid,
            ).overrideWith((ref) => Stream.value([savedEdge])),
            watchSavedEventDetailsForUserProvider(
              user.uid,
            ).overrideWith((ref) => Stream.value([savedEvent])),
            watchEventsByIdsProvider(
              EventsByIdQuery([joinedEvent.id]),
            ).overrideWith((ref) => Stream.value([joinedEvent])),
            eventDiscoveryRepositoryProvider.overrideWithValue(
              _FakeEventDiscoveryRepository([requestEvent, savedEvent]),
            ),
            externalEventRepositoryProvider.overrideWithValue(
              _FakeExternalEventRepository([]),
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

        expect(
          subscription.read().hasValue,
          isTrue,
          reason: '${subscription.read()}',
        );
        final byId = {
          for (final item in subscription.read().value!.items)
            item.event.id: item,
        };

        expect(byId['joined-event']?.status, EventTileStatus.joined);
        expect(byId['saved-event']?.status, EventTileStatus.saved);
        expect(
          byId['request-event']?.availability?.status,
          ViewerEventAvailabilityStatus.requestRequired,
        );
        expect(
          ExploreEventRowState.from(
            byId['request-event']!,
            l10n: _l10n,
          ).statusLabel,
          'Request required',
        );
      },
    );

    test(
      'exploreFeedViewModelProvider does not block on personal event enrichment',
      () async {
        final user = event_test.buildUser(uid: 'runner-enrichment');
        final organizer = buildOrganizer(id: 'club-enrichment');
        final joinedEvent = event_test.buildEvent(
          id: 'joined-enrichment',
          clubId: organizer.id,
          startTime: DateTime.now().add(const Duration(days: 1)),
        );
        final discoverableEvent = event_test.buildEvent(
          id: 'discoverable-enrichment',
          clubId: organizer.id,
          startTime: DateTime.now().add(const Duration(days: 2)),
        );
        final personalEvents = StreamController<List<Event>>();
        addTearDown(personalEvents.close);

        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(user.uid)),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            watchOrganizersByLocationProvider(
              _mumbaiMarketId,
            ).overrideWith((ref) => Stream.value([organizer])),
            watchActiveOrganizerMembershipsForUserProvider(
              user.uid,
            ).overrideWith(
              (ref) => Stream.value(const <OrganizerMembership>[]),
            ),
            watchEventParticipationsForUserProvider(user.uid).overrideWith(
              (ref) => Stream.value([
                event_test.buildEventParticipation(
                  event: joinedEvent,
                  uid: user.uid,
                ),
              ]),
            ),
            watchSavedEventsForUserProvider(
              user.uid,
            ).overrideWith((ref) => Stream.value(const <SavedEvent>[])),
            watchEventsByIdsProvider(
              EventsByIdQuery([joinedEvent.id]),
            ).overrideWith((ref) => personalEvents.stream),
            eventDiscoveryRepositoryProvider.overrideWithValue(
              _FakeEventDiscoveryRepository([discoverableEvent]),
            ),
            externalEventRepositoryProvider.overrideWithValue(
              _FakeExternalEventRepository([]),
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
          'discoverable-enrichment',
        ]);

        personalEvents.add([joinedEvent]);
        await flushTestEventQueue();
        await container.pump();

        expect(subscription.read().value!.items.map((item) => item.event.id), [
          'joined-enrichment',
          'discoverable-enrichment',
        ]);
      },
    );

    test(
      'exploreOrganizersViewModelProvider surfaces auth uid errors',
      () async {
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith(
              (ref) => Stream.error(StateError('uid failed')),
            ),
            filteredExploreOrganizersProvider.overrideWithValue(
              AsyncData([buildOrganizer(id: 'available-club')]),
            ),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          exploreOrganizersViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);
        await container.pump();

        expect(subscription.read().hasError, isTrue);
        expect(subscription.read().error, isA<StateError>());
      },
    );

    test(
      'exploreOrganizersViewModelProvider surfaces filtered list errors',
      () async {
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            filteredExploreOrganizersProvider.overrideWithValue(
              AsyncError(StateError('filter failed'), StackTrace.empty),
            ),
          ],
        );
        addTearDown(container.dispose);

        final subscription = container.listen(
          exploreOrganizersViewModelProvider,
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(subscription.close);
        await container.pump();

        expect(subscription.read().hasError, isTrue);
        expect(subscription.read().error, isA<StateError>());
      },
    );
  });
}

class _FakeDeviceLocation extends FakeDeviceLocation {
  _FakeDeviceLocation(super.location);
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
  Future<CursorPage<Event, DocumentSnapshot<Event>>>
  fetchDiscoverableEventsPage(
    EventDiscoveryQuery query, {
    DocumentSnapshot<Event>? startAfter,
  }) async => CursorPage(items: events, hasMore: false);
}

class _FakeExternalEventRepository extends Fake
    implements ExternalEventRepository {
  _FakeExternalEventRepository(this.events);

  final List<ExternalEvent> events;

  @override
  Future<List<ExternalEvent>> fetchDiscoverableExternalEvents(
    ExternalEventDiscoveryQuery query,
  ) async {
    return events;
  }

  @override
  Future<CursorPage<ExternalEvent, DocumentSnapshot<ExternalEvent>>>
  fetchDiscoverableExternalEventsPage(
    ExternalEventDiscoveryQuery query, {
    DocumentSnapshot<ExternalEvent>? startAfter,
  }) async => CursorPage(items: events, hasMore: false);
}

ExternalEvent _externalEvent({
  required String id,
  required String title,
  required String citySlug,
  required DateTime startTime,
  List<ExternalEventLink> externalLinks = const [
    ExternalEventLink(
      platform: 'luma',
      url: 'https://luma.com/e',
      linkType: 'booking_or_event_page',
      sourceEventKey: 'external-source-key',
      candidateId: 'candidate-external',
      primary: true,
    ),
  ],
}) {
  return ExternalEvent(
    id: id,
    canonicalHostId: 'host-afterfly',
    compatibilityOrganizerId: 'club-afterfly',
    title: title,
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
    citySlug: citySlug,
    externalLinks: externalLinks,
  );
}

class _FakeExploreSearchRepository implements ExploreSearchRepository {
  const _FakeExploreSearchRepository({this.error});

  final Object? error;

  @override
  Future<ExploreSearchResult> searchExplore({
    required String query,
    required String cityName,
    int limit = 20,
  }) async {
    final error = this.error;
    if (error != null) throw error;
    return ExploreSearchResult.empty;
  }
}
