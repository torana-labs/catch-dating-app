import 'dart:async';

import 'package:catch_dating_app/clubs/presentation/detail/club_membership_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_city_controller.dart';
import 'package:catch_dating_app/explore/presentation/explore_cross_paths_provider.dart';
import 'package:catch_dating_app/explore/presentation/explore_discovery_window_controller.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_body.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_city_picker.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_feed_skeleton.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_filter_rail.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_header.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_screen_empty_state.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/initial_load_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

abstract final class ExploreScreenKeys {
  static const scrollView = PageStorageKey<String>('explore.scroll_view');
}

/// Explore — the supply-side feed (design-system Explore).
///
/// A single scrolling feed: the browse header (city + search) and filter rail
/// sit above day-grouped event tickets, club polaroids, and the editorial
/// spotlight. The map is no longer an always-on canvas — it is a focused route
/// reached from the centered floating map pill ([ExploreMapScreen]).
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  bool _searchRequested = false;
  bool? _wasExploreTabActive;
  bool _reentryRefreshQueued = false;
  bool _guestJoinedFilterResetQueued = false;
  final Set<String> _loggedCrossPathsImpressions = <String>{};
  Timer? _initialLoadDeadline;
  bool _initialLoadTimedOut = false;

  @override
  void initState() {
    super.initState();
    _startInitialLoadDeadline();
  }

  @override
  void dispose() {
    _initialLoadDeadline?.cancel();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final activeIndex = CatchTabViewportScope.maybeIndexOf(context);
    if (activeIndex == null) return;
    final isActive = activeIndex == appShellClubsTabIndex;
    final shouldRefresh = _wasExploreTabActive == false && isActive;
    _wasExploreTabActive = isActive;
    if (!shouldRefresh || _reentryRefreshQueued) return;
    _reentryRefreshQueued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _reentryRefreshQueued = false;
      if (!mounted) return;
      unawaited(_refreshExploreData());
    });
  }

  @override
  Widget build(BuildContext context) {
    final uidAsync = ref.watch(uidProvider);
    final feedAsync = ref.watch(exploreFeedViewModelProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final feedState = catchAsyncStateFromAsyncValue(feedAsync);
    final crossPathsState = catchAsyncStateFromAsyncValue(
      ref.watch(exploreCrossPathsSuggestionsProvider),
    );
    final crossPathsSuggestions =
        crossPathsState.value ?? const <CrossPathsSuggestion>[];
    final recommendationsState = catchAsyncStateFromAsyncValue(
      ref.watch(exploreRecommendationsProvider),
    );
    final viewModelAsync = ref.watch(exploreClubsViewModelProvider);
    final viewModelState = catchAsyncStateFromAsyncValue(viewModelAsync);
    ref.watch(exploreCityControllerProvider);
    final city = ref.watch(selectedExploreCityProvider);
    final cityListAsync = ref.watch(cityListProvider);
    final cityListState = catchAsyncStateFromAsyncValue(cityListAsync);
    final cityOptions = cityListState.value ?? const <CityData>[];
    final cityPickerState = ExploreCityPickerState.from(
      selectedCity: city,
      cities: cityOptions,
      cityListLoading: cityListState.isLoading && cityOptions.isEmpty,
      cityListError: cityListState.hasError ? cityListState.error : null,
    );
    final query = ref.watch(exploreSearchQueryProvider).trim();
    final filters = ref.watch(exploreFiltersProvider);
    final showAccountControls = exploreShowsAccountControls(
      authResolved: uidState.hasData,
      uid: uidState.value,
    );
    if (uidState.value == null && uidState.hasData && filters.joinedOnly) {
      _scheduleGuestJoinedFilterReset();
    }
    final visibleFilters = showAccountControls
        ? filters
        : filters.copyWith(joinedOnly: false);
    final sourceClubsAsync = ref.watch(exploreSourceClubsProvider);
    final sourceClubsState = catchAsyncStateFromAsyncValue(sourceClubsAsync);
    final sourceClubs = sourceClubsState.value ?? const [];
    final hasSourceClubs = sourceClubs.isNotEmpty;
    final featuredItem = feedState.value?.featuredItem;
    final showFeaturedCover =
        featuredItem != null && !_searchRequested && query.isEmpty;
    final filterRailState = ExploreFilterRailState.from(
      visibleFilters,
      l10n: context.l10n,
    );
    final dateStripState = ExploreDateStripState.from(
      viewModel: feedState.value,
      l10n: context.l10n,
      now: ref.watch(exploreDiscoveryReferenceNowProvider),
    );
    final filterSheetState = ExploreFilterSheetState.from(
      filters: visibleFilters,
      sourceClubs: sourceClubs,
      l10n: context.l10n,
      viewModel: feedState.value,
      feedLoading: feedState.isLoading,
    );
    final screenState = ExploreDiscoveryScreenState.from(
      l10n: context.l10n,
      cityLabel: city.label,
      query: query,
      filters: visibleFilters,
      hasSourceClubs: hasSourceClubs,
      mappableEventCount: feedState.value?.mappableEventCount,
      viewModelLoading: viewModelState.isLoading,
      viewModelError: viewModelState.hasError ? viewModelState.error : null,
      viewModel: viewModelState.value,
      eventFeedLoading: feedState.isLoading,
      eventFeedError: feedState.hasError ? feedState.error : null,
      eventFeedHasContent: feedState.value?.isEmpty == false,
    );
    final bodyState = screenState.bodyState;
    _syncInitialLoadDeadline(bodyState.kind == ExploreScreenBodyKind.loading);

    void retryBodyState(ExploreScreenRetryTarget? retryTarget) {
      _restartInitialLoadDeadline();
      switch (retryTarget) {
        case ExploreScreenRetryTarget.eventFeed:
          ref.invalidate(exploreDiscoveryWindowProvider);
          ref.invalidate(exploreFeedViewModelProvider);
        case ExploreScreenRetryTarget.explore:
        case null:
          ref.invalidate(watchClubsByLocationProvider(city.effectiveMarketId));
          ref.invalidate(exploreClubsViewModelProvider);
          ref.invalidate(exploreSourceClubsProvider);
          ref.invalidate(exploreDiscoveryWindowProvider);
          ref.invalidate(exploreFeedViewModelProvider);
      }
    }

    void openFeaturedEvent(ExploreEventItem item) {
      ref
          .read(appAnalyticsProvider)
          .logEvent(
            AnalyticsEvents.exploreEventOpened,
            parameters: {
              AnalyticsParameters.eventId: item.event.id,
              AnalyticsParameters.clubId: item.event.clubId,
              AnalyticsParameters.exploreSource:
                  context.l10n.exploreExploreScreenVisiblecopyCoverHeader,
            },
          );
      context.pushNamed(
        Routes.eventDetailScreen.name,
        pathParameters: {'clubId': item.event.clubId, 'eventId': item.event.id},
        extra: EventDetailRouteExtra(
          initialEvent: item.event,
          presentationMode: EventDetailPresentationMode.spotlightDark,
        ),
      );
    }

    void openEvent(ExploreEventItem item, String source) {
      CrossPathsSuggestion? crossPathsSuggestion;
      if (source.startsWith('cross_paths')) {
        for (final suggestion in crossPathsSuggestions) {
          if (suggestion.event.eventId == item.event.id) {
            crossPathsSuggestion = suggestion;
            break;
          }
        }
        ref
            .read(appAnalyticsProvider)
            .logEvent(
              AnalyticsEvents.crossPathsEventOpened,
              parameters: {
                AnalyticsParameters.eventId: item.event.id,
                AnalyticsParameters.surface: 'explore',
                AnalyticsParameters.viewerBookingStatus:
                    crossPathsSuggestion?.event.viewerBookingStatus.name,
                AnalyticsParameters.rankingVersion:
                    crossPathsSuggestion?.rankingVersion,
                AnalyticsParameters.reasonCodes: crossPathsSuggestion
                    ?.reasonCodes
                    .map((reason) => reason.wireValue)
                    .join(','),
              },
            );
      }
      ref
          .read(appAnalyticsProvider)
          .logEvent(
            AnalyticsEvents.exploreEventOpened,
            parameters: {
              AnalyticsParameters.eventId: item.event.id,
              AnalyticsParameters.clubId: item.club.id,
              AnalyticsParameters.exploreSource: source,
              AnalyticsParameters.activityKind: item.event.activityKind.name,
              AnalyticsParameters.availabilityStatus:
                  item.availability?.status.name,
              AnalyticsParameters.distanceKm: item.distanceFromUserKm == null
                  ? null
                  : double.parse(item.distanceFromUserKm!.toStringAsFixed(2)),
            },
          );
      context.pushNamed(
        Routes.eventDetailScreen.name,
        pathParameters: {'clubId': item.event.clubId, 'eventId': item.event.id},
        extra: EventDetailRouteExtra(
          initialEvent: item.event,
          transition: EventDetailRouteTransition.ticketCard,
          presentationMode: EventDetailPresentationMode.ticket,
          heroTag: eventTicketHeroTag(item.event.id, source),
          attribution: crossPathsSuggestion == null
              ? null
              : EventDetailAttribution(
                  source: EventDetailAttributionSource.crossPaths,
                  suggestionToken: crossPathsSuggestion.suggestionToken,
                  rankingVersion: crossPathsSuggestion.rankingVersion,
                  reasonCodes: crossPathsSuggestion.reasonCodes
                      .map((reason) => reason.wireValue)
                      .toList(growable: false),
                ),
        ),
      );
    }

    void openCrossPathsProfile(
      CrossPathsSuggestion suggestion,
      ExploreEventItem eventItem,
    ) {
      ref
          .read(appAnalyticsProvider)
          .logEvent(
            AnalyticsEvents.crossPathsProfileOpened,
            parameters: {
              AnalyticsParameters.eventId: eventItem.event.id,
              AnalyticsParameters.surface: 'explore',
              AnalyticsParameters.viewerBookingStatus:
                  suggestion.event.viewerBookingStatus.name,
              AnalyticsParameters.rankingVersion: suggestion.rankingVersion,
              AnalyticsParameters.reasonCodes: suggestion.reasonCodes
                  .map((reason) => reason.wireValue)
                  .join(','),
            },
          );
      unawaited(
        showCrossPathsProfilePreview(
          context: context,
          suggestion: suggestion,
          event: eventItem.event,
          onEventSelected: () => openEvent(eventItem, 'cross_paths_profile'),
          onPlanSelected: (matchId) => context.pushNamed(
            Routes.chatScreen.name,
            pathParameters: {'matchId': matchId},
          ),
        ),
      );
    }

    void logCrossPathsImpression(
      CrossPathsSuggestion suggestion,
      ExploreEventItem eventItem,
      int position,
    ) {
      if (!_loggedCrossPathsImpressions.add(suggestion.suggestionToken)) return;
      ref
          .read(appAnalyticsProvider)
          .logEvent(
            AnalyticsEvents.crossPathsImpression,
            parameters: {
              AnalyticsParameters.eventId: eventItem.event.id,
              AnalyticsParameters.surface: 'explore',
              AnalyticsParameters.position: position,
              AnalyticsParameters.viewerBookingStatus:
                  suggestion.event.viewerBookingStatus.name,
              AnalyticsParameters.rankingVersion: suggestion.rankingVersion,
              AnalyticsParameters.reasonCodes: suggestion.reasonCodes
                  .map((reason) => reason.wireValue)
                  .join(','),
            },
          );
    }

    void openExternalEvent(ExploreExternalEventItem item) {
      final uri = item.event.primaryExternalUri;
      if (uri == null) return;
      ref
          .read(appAnalyticsProvider)
          .logEvent(
            AnalyticsEvents.exploreEventOpened,
            parameters: {
              AnalyticsParameters.eventId: item.event.id,
              AnalyticsParameters.exploreSource:
                  context.l10n.exploreExploreScreenVisiblecopyExternalSupply,
              AnalyticsParameters.activityKind: item.event.activityKind.name,
              AnalyticsParameters.availabilityStatus:
                  context.l10n.exploreExploreScreenVisiblecopyExternalOutbound,
              context.l10n.exploreExploreScreenVisiblecopyExternalPlatform:
                  item.event.platformLabel,
              AnalyticsParameters.distanceKm: item.distanceFromUserKm == null
                  ? null
                  : double.parse(item.distanceFromUserKm!.toStringAsFixed(2)),
            },
          );
      unawaited(ref.read(externalLinkControllerProvider).openExternal(uri));
    }

    void openClub(Club club) {
      context.pushNamed(
        Routes.clubDetailScreen.name,
        pathParameters: {'clubId': club.id},
        extra: club,
      );
    }

    void openExploreFilters() {
      unawaited(
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) => Consumer(
            builder: (sheetContext, ref, _) {
              final liveFilters = ref.watch(exploreFiltersProvider);
              final liveFeed = ref.watch(exploreFeedViewModelProvider);
              final liveFeedState = catchAsyncStateFromAsyncValue(liveFeed);
              final liveUidState = catchAsyncStateFromAsyncValue(
                ref.watch(uidProvider),
              );
              final showJoinedOnly = liveUidState.value != null;
              final visibleLiveFilters = showJoinedOnly
                  ? liveFilters
                  : liveFilters.copyWith(joinedOnly: false);
              return ExploreFilterSheet(
                filters: visibleLiveFilters,
                state: filterSheetState.withLiveResults(
                  filters: visibleLiveFilters,
                  viewModel: liveFeedState.value,
                  feedLoading: liveFeedState.isLoading,
                  l10n: sheetContext.l10n,
                ),
                onDistanceFilterSelected: (filter) =>
                    unawaited(_applyDistanceFilter(filter)),
                onToggleJoinedOnly: showJoinedOnly
                    ? () => ref
                          .read(exploreFiltersProvider.notifier)
                          .toggleJoinedOnly()
                    : null,
                onToggleHighRatedOnly: () => ref
                    .read(exploreFiltersProvider.notifier)
                    .toggleHighRatedOnly(),
                onToggleActivityTag: (tag) => ref
                    .read(exploreFiltersProvider.notifier)
                    .toggleActivityTag(tag),
                onToggleArea: (area) =>
                    ref.read(exploreFiltersProvider.notifier).toggleArea(area),
                onClearFilters: () =>
                    ref.read(exploreFiltersProvider.notifier).clear(),
                showJoinedOnly: showJoinedOnly,
              );
            },
          ),
        ),
      );
    }

    Widget savedEventsAction() {
      return CatchIconAction.toolbar(
        icon: CatchIcons.bookmark,
        tooltip: context.l10n.exploreExploreScreenTooltipSavedEvents,
        onPressed: () => context.push(Routes.savedEventsScreen.path),
      );
    }

    final bodySlivers =
        _initialLoadTimedOut && bodyState.kind == ExploreScreenBodyKind.loading
        ? <Widget>[
            CatchLocalizedSliverErrorState(
              const NetworkException(
                'timeout',
                'Explore is taking longer than expected. Please try again.',
              ),
              context: AppErrorContext.explore,
              onRetry: () => retryBodyState(ExploreScreenRetryTarget.explore),
            ),
          ]
        : switch (bodyState.kind) {
            ExploreScreenBodyKind.loading => <Widget>[
              SliverToBoxAdapter(
                child: Padding(
                  padding: CatchInsets.pageBody.copyWith(bottom: 0),
                  child: const ExploreFeedSkeleton(),
                ),
              ),
            ],
            ExploreScreenBodyKind.error => [
              CatchLocalizedSliverErrorState(
                bodyState.error!,
                context:
                    bodyState.retryTarget == ExploreScreenRetryTarget.eventFeed
                    ? AppErrorContext.event
                    : AppErrorContext.explore,
                onRetry: () => retryBodyState(bodyState.retryTarget),
              ),
            ],
            ExploreScreenBodyKind.content => buildExploreBodySlivers(
              context: context,
              feedState: feedState,
              recommendationsState: recommendationsState,
              clubsViewModel: bodyState.viewModel,
              filters: visibleFilters,
              searchQuery: query,
              onRetryFeed: () => ref.invalidate(exploreFeedViewModelProvider),
              onRetryClubs: () =>
                  retryBodyState(ExploreScreenRetryTarget.explore),
              onClearSearch: () =>
                  ref.read(exploreSearchQueryProvider.notifier).clear(),
              onClearFilters: () =>
                  ref.read(exploreFiltersProvider.notifier).clear(),
              onLoadMore: () => unawaited(_loadMore(feedState.value)),
              onSetTimeFilter: (filter) => ref
                  .read(exploreFiltersProvider.notifier)
                  .setTimeFilter(filter),
              onActivitySelected: (activityKind) => ref
                  .read(exploreFiltersProvider.notifier)
                  .toggleActivityTag(activityKind.name),
              onEventSelected: openEvent,
              crossPathsSuggestions: crossPathsSuggestions,
              onCrossPathsProfileSelected: openCrossPathsProfile,
              onCrossPathsImpression: logCrossPathsImpression,
              onExternalEventOpened: openExternalEvent,
              onClubSelected: openClub,
              promoteFeaturedItem: showFeaturedCover,
            ),
            ExploreScreenBodyKind.contentWithoutClubs =>
              buildExploreBodySlivers(
                context: context,
                feedState: feedState,
                recommendationsState: recommendationsState,
                filters: visibleFilters,
                searchQuery: query,
                clubSectionError: bodyState.error,
                onRetryFeed: () => ref.invalidate(exploreFeedViewModelProvider),
                onRetryClubs: () => retryBodyState(bodyState.retryTarget),
                onClearSearch: () =>
                    ref.read(exploreSearchQueryProvider.notifier).clear(),
                onClearFilters: () =>
                    ref.read(exploreFiltersProvider.notifier).clear(),
                onLoadMore: () => unawaited(_loadMore(feedState.value)),
                onSetTimeFilter: (filter) => ref
                    .read(exploreFiltersProvider.notifier)
                    .setTimeFilter(filter),
                onActivitySelected: (activityKind) => ref
                    .read(exploreFiltersProvider.notifier)
                    .toggleActivityTag(activityKind.name),
                onEventSelected: openEvent,
                crossPathsSuggestions: crossPathsSuggestions,
                onCrossPathsProfileSelected: openCrossPathsProfile,
                onCrossPathsImpression: logCrossPathsImpression,
                onExternalEventOpened: openExternalEvent,
                onClubSelected: openClub,
                promoteFeaturedItem: showFeaturedCover,
              ),
            ExploreScreenBodyKind.empty => [
              CatchStateViewport.sliver(
                child: ExploreScreenEmptyState(
                  state: bodyState.emptyState!,
                  onClearSearch: () =>
                      ref.read(exploreSearchQueryProvider.notifier).clear(),
                  onClearFilters: () =>
                      ref.read(exploreFiltersProvider.notifier).clear(),
                  onChangeCity: cityPickerState.enabled
                      ? () => unawaited(
                          showExploreCityPickerSheet(
                            context: context,
                            state: cityPickerState,
                            onSelected: (selectedCity) => ref
                                .read(selectedExploreCityProvider.notifier)
                                .setCity(selectedCity),
                          ),
                        )
                      : null,
                ),
              ),
            ],
          };

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [ClubMembershipController.joinMutation],
    );
    return Stack(
      children: [
        CatchRootScreenScaffold.withPrimaryRail(
          topEdge: CatchRootScreenScrollViewPlacement.headerOwned,
          header: CatchRootScreenHeader.custom(
            ExploreDiscoveryCoverHeader(
              cityPickerState: cityPickerState,
              query: query,
              featuredItem: featuredItem,
              onCitySelected: (selectedCity) => ref
                  .read(selectedExploreCityProvider.notifier)
                  .setCity(selectedCity),
              onQueryChanged: (value) =>
                  ref.read(exploreSearchQueryProvider.notifier).setQuery(value),
              actions: showAccountControls ? [savedEventsAction()] : const [],
              heroActions: showAccountControls
                  ? [savedEventsAction()]
                  : const [],
              searchRequested: _searchRequested,
              onSearchRequestedChanged: (expanded) {
                if (_searchRequested == expanded) return;
                setState(() => _searchRequested = expanded);
              },
              onFeaturedEventSelected: openFeaturedEvent,
            ),
          ),
          actions: ExploreFilterRail(
            filters: visibleFilters,
            state: filterRailState,
            dateStripState: dateStripState,
            sheetState: filterSheetState,
            onTimeFilterSelected: (filter) =>
                ref.read(exploreFiltersProvider.notifier).setTimeFilter(filter),
            onDistanceFilterSelected: (filter) =>
                unawaited(_applyDistanceFilter(filter)),
            onToggleJoinedOnly: showAccountControls
                ? () => ref
                      .read(exploreFiltersProvider.notifier)
                      .toggleJoinedOnly()
                : null,
            onToggleHighRatedOnly: () =>
                ref.read(exploreFiltersProvider.notifier).toggleHighRatedOnly(),
            onToggleActivityTag: (tag) => ref
                .read(exploreFiltersProvider.notifier)
                .toggleActivityTag(tag),
            onToggleArea: (area) =>
                ref.read(exploreFiltersProvider.notifier).toggleArea(area),
            onClearFilters: () =>
                ref.read(exploreFiltersProvider.notifier).clear(),
            onOpenFilters: openExploreFilters,
            showJoinedOnly: showAccountControls,
          ),
          body: CatchRootScreenBody.single(
            page: CatchRootScreenPageSpec.scroll(
              page: CatchRootScreenPageScrollView.fullBleed(
                scrollKey: ExploreScreenKeys.scrollView,
                physics: const AlwaysScrollableScrollPhysics(),
                onRefresh: _refreshExploreData,
                children: [
                  SliverToBoxAdapter(
                    child: ExploreAppliedFilterRail(
                      filters: visibleFilters,
                      showJoinedOnly: showAccountControls,
                      onDistanceFilterSelected: (filter) =>
                          unawaited(_applyDistanceFilter(filter)),
                      onToggleJoinedOnly: showAccountControls
                          ? () => ref
                                .read(exploreFiltersProvider.notifier)
                                .toggleJoinedOnly()
                          : null,
                      onToggleHighRatedOnly: () => ref
                          .read(exploreFiltersProvider.notifier)
                          .toggleHighRatedOnly(),
                      onToggleActivityTag: (tag) => ref
                          .read(exploreFiltersProvider.notifier)
                          .toggleActivityTag(tag),
                      onToggleArea: (area) => ref
                          .read(exploreFiltersProvider.notifier)
                          .toggleArea(area),
                    ),
                  ),
                  ...bodySlivers,
                ],
              ),
            ),
          ),
        ),
        if (screenState.mapLauncherState.isVisible)
          Positioned(
            left: 0,
            right: 0,
            bottom: _mapLauncherBottomOffset(context),
            child: SafeArea(
              top: false,
              child: Center(
                child: CatchButton.floating(
                  label: screenState.mapLauncherState.actionLabel,
                  count:
                      int.tryParse(
                        screenState.mapLauncherState.countLabel ?? '',
                      ) ??
                      0,
                  icon: CatchIcons.map,
                  semanticsLabel: screenState.mapLauncherState.semanticLabel,
                  onPressed: () {
                    catchTransitionHaptic();
                    context.pushNamed(Routes.exploreMapScreen.name);
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _applyDistanceFilter(ExploreDistanceFilter filter) async {
    final failure = await ref
        .read(exploreFiltersProvider.notifier)
        .applyDistanceFilter(filter);
    if (!mounted || failure == null) return;
    _showLocationFailure(failure);
  }

  void _scheduleGuestJoinedFilterReset() {
    if (_guestJoinedFilterResetQueued) return;
    _guestJoinedFilterResetQueued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _guestJoinedFilterResetQueued = false;
      if (!mounted) return;
      final uidData = ref.read(uidProvider).asData;
      if (uidData == null || uidData.value != null) return;
      final filters = ref.read(exploreFiltersProvider);
      if (!filters.joinedOnly) return;
      ref.read(exploreFiltersProvider.notifier).toggleJoinedOnly();
    });
  }

  Future<void> _refreshExploreData() async {
    _restartInitialLoadDeadline();
    ref.invalidate(exploreDiscoveryReferenceNowProvider);
    ref.invalidate(exploreDiscoveryWindowProvider);
    ref.invalidate(watchClubsByLocationProvider);
    ref.invalidate(exploreSourceClubsProvider);
    ref.invalidate(exploreClubsViewModelProvider);
    ref.invalidate(exploreFeedViewModelProvider);
    ref.invalidate(exploreRecommendationsProvider);

    // The feed provider is a synchronous AsyncValue composition over several
    // async repositories, so it has no `.future` to await. Hold the refresh
    // indicator until the recomposed feed reaches either data or error.
    final deadline = DateTime.now().add(InitialLoadPolicy.refresh);
    while (DateTime.now().isBefore(deadline)) {
      await Future<void>.delayed(InitialLoadPolicy.settlementPoll);
      if (!mounted) return;
      if (!ref.read(exploreFeedViewModelProvider).isLoading) return;
    }
  }

  void _startInitialLoadDeadline() {
    _initialLoadDeadline?.cancel();
    _initialLoadDeadline = Timer(InitialLoadPolicy.standard, () {
      if (!mounted) return;
      setState(() => _initialLoadTimedOut = true);
    });
  }

  void _restartInitialLoadDeadline() {
    if (_initialLoadTimedOut) {
      setState(() => _initialLoadTimedOut = false);
    }
    _startInitialLoadDeadline();
  }

  void _syncInitialLoadDeadline(bool loading) {
    if (loading) {
      if (_initialLoadDeadline == null && !_initialLoadTimedOut) {
        _startInitialLoadDeadline();
      }
      return;
    }
    _initialLoadDeadline?.cancel();
    _initialLoadDeadline = null;
    _initialLoadTimedOut = false;
  }

  Future<void> _loadMore(ExploreFeedViewModel? feed) async {
    final request = feed?.windowRequest;
    if (request == null || feed?.hasMore != true || feed!.isLoadingMore) return;
    try {
      await ref
          .read(exploreDiscoveryWindowProvider(request).notifier)
          .loadNext();
    } catch (error) {
      if (!mounted) return;
      showCatchNoticeError(
        context,
        error,
        errorContext: AppErrorContext.explore,
        onRetry: () => unawaited(_loadMore(feed)),
      );
    }
  }

  void _showLocationFailure(DeviceLocationFailure failure) {
    final canOpenSettings =
        failure == DeviceLocationFailure.servicesDisabled ||
        failure == DeviceLocationFailure.permissionDeniedForever;
    final message = switch (failure) {
      DeviceLocationFailure.servicesDisabled =>
        context.l10n.exploreExploreMapScreenMessageLocationServicesDisabled,
      DeviceLocationFailure.permissionDeniedForever =>
        context
            .l10n
            .exploreExploreMapScreenMessageLocationPermissionDeniedForever,
      _ => context.l10n.exploreExploreMapScreenMessageLocationUnavailable,
    };
    showCatchNotice(
      context,
      message,
      actionLabel: canOpenSettings
          ? context.l10n.exploreExploreMapScreenActionOpenSettings
          : null,
      onAction: canOpenSettings
          ? () {
              unawaited(
                ref
                    .read(deviceLocationProvider.notifier)
                    .openRecoverySettings(),
              );
            }
          : null,
    );
  }
}

@visibleForTesting
bool exploreShowsAccountControls({
  required bool authResolved,
  required String? uid,
}) => authResolved && uid != null;

double _mapLauncherBottomOffset(BuildContext context) {
  return CatchTabViewportScope.bottomOverlayClearanceOf(
    context,
    minimum: CatchSpacing.s5,
  );
}
