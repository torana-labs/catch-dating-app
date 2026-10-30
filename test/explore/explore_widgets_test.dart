import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_pins_map.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_body.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_city_picker.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_event_type_browse_grid.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_filter_rail.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_header.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_recommendations_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_screen.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_membership_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_schedule_section.dart';
import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_dating_app/organizers/shared/organizer_transition_tags.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart' show LaunchMode;

import '../events/events_test_helpers.dart' as event_test;
import '../organizers/organizers_test_helpers.dart';
import '../support/profile_readiness_fixtures.dart';
import '../test_pump_helpers.dart';
import 'explore_device_location_fakes.dart';

part 'explore_discovery_widgets_tests.dart';
part 'explore_errors_and_creation_tests.dart';
part 'explore_map_tests.dart';
part 'explore_organizer_cards_tests.dart';
part 'explore_organizer_detail_tests.dart';
part 'explore_screen_filters_tests.dart';

final _l10n = AppLocalizationsEn();

const _testCities = [
  CityData(
    name: 'mumbai',
    label: 'Mumbai',
    latitude: 19.0760,
    longitude: 72.8777,
  ),
  CityData(
    name: 'delhi',
    label: 'Delhi',
    latitude: 28.7041,
    longitude: 77.1025,
  ),
];

final _emptyExploreFeedOverride = exploreFeedViewModelProvider
    .overrideWithValue(const AsyncData(ExploreFeedViewModel(items: [])));

ExploreCityPickerState _testCityPickerState({
  CityData? selectedCity,
  Iterable<CityData> cities = _testCities,
  bool cityListLoading = false,
  Object? cityListError,
}) {
  return ExploreCityPickerState.from(
    selectedCity: selectedCity ?? _testCities.first,
    cities: cities,
    cityListLoading: cityListLoading,
    cityListError: cityListError,
  );
}

class _NoDeviceLocation extends NoDeviceLocation {}

class _FixedDeviceLocation extends FixedDeviceLocation {}

Future<void> _pumpOrganizersSlivers(
  WidgetTester tester,
  List<Widget> slivers,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(null)),
        _emptyExploreFeedOverride,
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: Scaffold(
          body: CustomScrollView(
            key: const ValueKey('explore-test-scroll-view'),
            slivers: slivers,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> _pumpOrganizerUi(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Widget _exploreBodySliverGroup({
  required ExploreViewModel organizersViewModel,
  CatchAsyncState<ExploreFeedViewModel>? feedState,
  CatchAsyncState<List<ExploreEventRecommendation>>? recommendationsState,
  AsyncValue<ExploreFeedViewModel> feedAsync = const AsyncData(
    ExploreFeedViewModel(items: []),
  ),
  ExploreFilterSelection filters = const ExploreFilterSelection(),
  String searchQuery = '',
  Object? organizerSectionError,
  VoidCallback onRetryFeed = _noop,
  VoidCallback onRetryOrganizers = _noop,
  VoidCallback onClearSearch = _noop,
  VoidCallback onClearFilters = _noop,
  VoidCallback? onLoadMore,
  ValueChanged<ExploreTimeFilter> onSetTimeFilter = _noopTimeFilter,
  ValueChanged<ActivityKind> onActivitySelected = _noopActivityKind,
  ExploreEventSelected onEventSelected = _noopExploreEventSelected,
  ValueChanged<ExploreExternalEventItem> onExternalEventOpened =
      _noopExternalEventOpened,
  bool includeJoinedOrganizersRail = true,
  bool includeOrganizerDirectory = true,
}) {
  return Builder(
    builder: (context) => SliverMainAxisGroup(
      slivers: buildExploreBodySlivers(
        context: context,
        feedState: feedState ?? catchAsyncStateFromAsyncValue(feedAsync),
        recommendationsState: recommendationsState,
        organizersViewModel: organizersViewModel,
        filters: filters,
        searchQuery: searchQuery,
        organizerSectionError: organizerSectionError,
        onRetryFeed: onRetryFeed,
        onRetryOrganizers: onRetryOrganizers,
        onClearSearch: onClearSearch,
        onClearFilters: onClearFilters,
        onLoadMore: onLoadMore,
        onSetTimeFilter: onSetTimeFilter,
        onActivitySelected: onActivitySelected,
        onEventSelected: onEventSelected,
        onExternalEventOpened: onExternalEventOpened,
        includeJoinedOrganizersRail: includeJoinedOrganizersRail,
        includeOrganizerDirectory: includeOrganizerDirectory,
        pinnedExploreDayHeaders: false,
      ),
    ),
  );
}

Widget _exploreEventsSection({
  AsyncValue<ExploreFeedViewModel> feedAsync = const AsyncData(
    ExploreFeedViewModel(items: []),
  ),
  ExploreFilterSelection filters = const ExploreFilterSelection(),
  String searchQuery = '',
  VoidCallback onRetry = _noop,
  VoidCallback onClearSearch = _noop,
  VoidCallback onClearFilters = _noop,
  ValueChanged<ExploreTimeFilter> onSetTimeFilter = _noopTimeFilter,
  ExploreEventSelected onEventSelected = _noopExploreEventSelected,
  ValueChanged<ExploreExternalEventItem> onExternalEventOpened =
      _noopExternalEventOpened,
}) {
  return SliverMainAxisGroup(
    slivers: buildExploreEventsSlivers(
      catchAsyncStateFromAsyncValue(feedAsync),
      l10n: _l10n,
      pinnedDayHeaders: false,
      filters: filters,
      searchQuery: searchQuery,
      onRetry: onRetry,
      onClearSearch: onClearSearch,
      onClearFilters: onClearFilters,
      onSetTimeFilter: onSetTimeFilter,
      onEventSelected: onEventSelected,
      onExternalEventOpened: onExternalEventOpened,
    ),
  );
}

List<Widget> _exploreEventsSlivers({
  AsyncValue<ExploreFeedViewModel> feedAsync = const AsyncData(
    ExploreFeedViewModel(items: []),
  ),
  ExploreFilterSelection filters = const ExploreFilterSelection(),
  String searchQuery = '',
  VoidCallback onRetry = _noop,
  VoidCallback onClearSearch = _noop,
  VoidCallback onClearFilters = _noop,
  ValueChanged<ExploreTimeFilter> onSetTimeFilter = _noopTimeFilter,
  ExploreEventSelected onEventSelected = _noopExploreEventSelected,
  ValueChanged<ExploreExternalEventItem> onExternalEventOpened =
      _noopExternalEventOpened,
  bool pinnedDayHeaders = true,
  bool promoteFeaturedItem = false,
  DateTime? now,
  List<Organizer> candidateOrganizers = const [],
  Set<String> joinedOrganizerIds = const {},
}) {
  return buildExploreEventsSlivers(
    catchAsyncStateFromAsyncValue(feedAsync),
    l10n: _l10n,
    filters: filters,
    searchQuery: searchQuery,
    onRetry: onRetry,
    onClearSearch: onClearSearch,
    onClearFilters: onClearFilters,
    onSetTimeFilter: onSetTimeFilter,
    onEventSelected: onEventSelected,
    onExternalEventOpened: onExternalEventOpened,
    pinnedDayHeaders: pinnedDayHeaders,
    promoteFeaturedItem: promoteFeaturedItem,
    now: now,
    candidateOrganizers: candidateOrganizers,
    joinedOrganizerIds: joinedOrganizerIds,
  );
}

ExploreDiscoveryCoverHeader _exploreCoverHeader({
  String query = '',
  ExploreEventItem? featuredItem,
  List<Widget> actions = const <Widget>[],
  List<Widget>? heroActions,
  ValueChanged<String> onQueryChanged = _noopString,
  ValueChanged<ExploreEventItem> onFeaturedEventSelected =
      _noopFeaturedEventSelected,
}) {
  return ExploreDiscoveryCoverHeader(
    query: query,
    featuredItem: featuredItem,
    cityPickerState: _testCityPickerState(),
    onCitySelected: (_) {},
    actions: actions,
    heroActions: heroActions,
    onQueryChanged: onQueryChanged,
    onFeaturedEventSelected: onFeaturedEventSelected,
  );
}

void _noop() {}
void _noopString(String _) {}
void _noopTimeFilter(ExploreTimeFilter _) {}
void _noopActivityKind(ActivityKind _) {}
void _noopExploreEventSelected(ExploreEventItem item, String source) {}
void _noopFeaturedEventSelected(ExploreEventItem _) {}
void _noopExternalEventOpened(ExploreExternalEventItem _) {}

/// Returns the network URL backing an [Image] widget, unwrapping the
/// [ResizeImage] that [CatchNetworkImage] applies for decode-sizing.
String? _networkImageUrl(Widget widget) {
  if (widget is! Image) return null;
  final image = widget.image;
  final provider = image is ResizeImage ? image.imageProvider : image;
  return provider is NetworkImage ? provider.url : null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('Explore and club discovery widgets', () {
    _registerExploreAsyncPhaseTests();
    _registerExploreDiscoveryWidgetsTests();
    _registerExploreOrganizerCardsTests();
    _registerExploreOrganizerDetailTests();
    _registerExploreScreenFiltersTests();
    _registerExploreMapTests();
    _registerExploreErrorsAndCreationTests();
  });
}

Finder _catchButtonWithLabel(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchButton && widget.label == label,
  );
}

Finder _topLevelSearchField() {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchSearchField && widget.mode != CatchSearchFieldMode.field,
  );
}

Finder _selectChip(String label, {bool? active}) {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchChip &&
        widget.label == label &&
        (active == null || widget.selected == active),
  );
}

ExternalEvent _buildExternalExploreEvent({
  required String id,
  required String title,
}) {
  final startTime = DateTime(2026, 7, 8, 19);
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
    citySlug: 'mumbai',
    externalLinks: const [
      ExternalEventLink(
        platform: 'district',
        url: 'https://district.example/events/external-event-only',
        linkType: 'booking_or_event_page',
        sourceEventKey: 'external-source-key',
        candidateId: 'candidate-external',
        primary: true,
      ),
    ],
  );
}

Finder _field(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == label,
  );
}

Finder _fieldChoice(String label, {bool? selected}) {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchChip &&
        widget.label == label &&
        (selected == null || widget.selected == selected),
  );
}

Finder _fieldOptionCard(String title, {bool? selected}) {
  return find.byWidgetPredicate(
    (widget) =>
        widget is CatchChoiceTile &&
        widget.title == title &&
        (selected == null || widget.selected == selected),
  );
}

// Obtain combined states from Riverpod's public lifecycle rather than using its
// package-internal copyWithPrevious constructor in presentation tests.
Future<Map<String, CatchAsyncState<T>>> _exploreAsyncPhases<T>(
  WidgetTester tester,
  T value,
) async {
  final dependency = Provider<int>((ref) => 0);
  var pending = Completer<T>();
  final provider = FutureProvider<T>((ref) {
    ref.watch(dependency);
    return pending.future;
  });
  final container = ProviderContainer(
    overrides: [dependency.overrideWithValue(0)],
    retry: (_, _) => null,
  );
  try {
    container.listen(provider, (_, _) {});
    final phases = <String, CatchAsyncState<T>>{
      'initial loading': catchAsyncStateFromAsyncValue(
        container.read(provider),
      ),
    };
    pending.complete(value);
    await tester.pump();
    phases['data'] = catchAsyncStateFromAsyncValue(container.read(provider));
    pending = Completer<T>();
    container.invalidate(provider);
    phases['refresh'] = catchAsyncStateFromAsyncValue(container.read(provider));
    pending.completeError(StateError('refresh failed'), StackTrace.empty);
    await tester.pump();
    phases['stale error'] = catchAsyncStateFromAsyncValue(
      container.read(provider),
    );
    pending = Completer<T>();
    container.invalidate(provider);
    phases['stale retry'] = catchAsyncStateFromAsyncValue(
      container.read(provider),
    );
    pending.complete(value);
    await tester.pump();
    pending = Completer<T>();
    container.updateOverrides([dependency.overrideWithValue(1)]);
    phases['reload'] = catchAsyncStateFromAsyncValue(container.read(provider));
    pending.complete(value);
    await tester.pump();

    final failedProvider = FutureProvider<T>((ref) => pending.future);
    pending = Completer<T>();
    container.listen(failedProvider, (_, _) {});
    pending.completeError(StateError('initial failed'), StackTrace.empty);
    await tester.pump();
    phases['terminal error'] = catchAsyncStateFromAsyncValue(
      container.read(failedProvider),
    );
    pending = Completer<T>();
    container.invalidate(failedProvider);
    phases['retry'] = catchAsyncStateFromAsyncValue(
      container.read(failedProvider),
    );
    pending.complete(value);
    await tester.pump();
    expect(phases.map((name, state) => MapEntry(name, state.phase)), {
      'initial loading': CatchAsyncPhase.initialLoading,
      'data': CatchAsyncPhase.data,
      'refresh': CatchAsyncPhase.refreshing,
      'stale error': CatchAsyncPhase.staleDataWithError,
      'stale retry': CatchAsyncPhase.staleDataWithError,
      'reload': CatchAsyncPhase.refreshing,
      'terminal error': CatchAsyncPhase.terminalError,
      'retry': CatchAsyncPhase.retrying,
    });
    return phases;
  } finally {
    container.dispose();
  }
}

void _registerExploreAsyncPhaseTests() {
  testWidgets('Explore feed preserves canonical phases and paging ownership', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'phase-club');
    final event = event_test.buildEvent(id: 'phase-event', clubId: organizer.id);
    final feed = ExploreFeedViewModel(
      items: [
        ExploreEventItem(
          event: event,
          organizer: organizer,
          status: EventTileStatus.open,
        ),
      ],
      isExhaustive: false,
    );
    final phases = await _exploreAsyncPhases(tester, feed);
    for (final entry in phases.entries) {
      var retries = 0;
      var loads = 0;
      final state = entry.value;
      final content =
          state.phase == CatchAsyncPhase.data ||
          state.phase == CatchAsyncPhase.refreshing;
      final failed = state.hasStaleError || state.isTerminalError;
      await _pumpOrganizersSlivers(tester, [
        _exploreBodySliverGroup(
          organizersViewModel: const ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
          feedState: state,
          onRetryFeed: () => retries++,
          onLoadMore: () => loads++,
        ),
      ]);
      expect(
        find.byType(ExploreEventsSkeleton),
        state.isLoading ? findsOneWidget : findsNothing,
        reason: entry.key,
      );
      expect(
        find.bySubtype<CatchErrorState>(),
        failed ? findsOneWidget : findsNothing,
        reason: entry.key,
      );
      expect(
        find.byType(ExploreFeedSliverBody),
        content ? findsOneWidget : findsNothing,
        reason: entry.key,
      );
      expect(
        find.byType(ExploreEventTypeBrowseGrid),
        content ? findsOneWidget : findsNothing,
        reason: entry.key,
      );
      final pager = _catchButtonWithLabel(
        _l10n.exploreExploreScreenActionLoadMorePlans,
      );
      expect(pager, content ? findsOneWidget : findsNothing, reason: entry.key);
      if (content) {
        tester.widget<CatchButton>(pager).onPressed!();
        expect(loads, 1);
      }
      if (failed) {
        tester.widget<CatchErrorState>(find.byType(CatchErrorState)).onRetry!();
        expect(retries, 1);
      }
      expect(tester.takeException(), isNull, reason: entry.key);
    }
    await _pumpOrganizersSlivers(tester, [
      _exploreBodySliverGroup(
        organizersViewModel: const ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
        feedAsync: AsyncData(
          ExploreFeedViewModel(
            items: feed.items,
            isExhaustive: false,
            isLoadingMore: true,
          ),
        ),
        onLoadMore: () => fail('Pending paging cannot dispatch again'),
      ),
    ]);
    final pendingPager = tester.widget<CatchButton>(
      _catchButtonWithLabel(_l10n.exploreExploreScreenActionLoadMorePlans),
    );
    expect(pendingPager.onPressed, isNull);
    expect(pendingPager.status, CatchButtonStatus.loading);
  });

  testWidgets('Explore recommendation phases preserve independent recovery', (
    tester,
  ) async {
    final recommendation = ExploreEventRecommendation(
      event: event_test.buildEvent(
        id: 'phase-recommendation',
        clubId: 'phase-club',
      ),
      organizerName: 'Phase club',
      reasonLabel: 'For this test',
      score: 1,
    );
    final phases = await _exploreAsyncPhases(tester, [recommendation]);
    for (final entry in phases.entries) {
      var retries = 0;
      final state = entry.value;
      final failed = state.hasStaleError || state.isTerminalError;
      await _pumpOrganizersSlivers(tester, [
        _exploreBodySliverGroup(
          organizersViewModel: const ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
          recommendationsState: state,
          onRetryFeed: () => retries++,
        ),
      ]);
      expect(find.byType(ExploreFeedEmptyState), findsOneWidget);
      expect(
        find.byType(ExploreRecommendationsSection),
        failed ? findsNothing : findsOneWidget,
        reason: entry.key,
      );
      expect(
        find.bySubtype<CatchErrorState>(),
        failed ? findsOneWidget : findsNothing,
        reason: entry.key,
      );
      if (failed) {
        tester.widget<CatchErrorState>(find.byType(CatchErrorState)).onRetry!();
        expect(retries, 1);
      } else {
        final rail = tester.widget<ExploreRecommendationsSection>(
          find.byType(ExploreRecommendationsSection),
        );
        expect(
          rail.recommendations,
          state.isLoading ? isEmpty : [recommendation],
          reason: entry.key,
        );
      }
      expect(tester.takeException(), isNull, reason: entry.key);
    }
    for (final recommendations in [
      null,
      const CatchAsyncState<List<ExploreEventRecommendation>>.data([]),
    ]) {
      await _pumpOrganizersSlivers(tester, [
        _exploreBodySliverGroup(
          organizersViewModel: const ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
          recommendationsState: recommendations,
        ),
      ]);
      expect(find.byType(ExploreRecommendationsSection), findsNothing);
      expect(find.bySubtype<CatchErrorState>(), findsNothing);
      expect(find.byType(ExploreFeedEmptyState), findsOneWidget);
    }
  });
}
