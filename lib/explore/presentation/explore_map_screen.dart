import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/device_location.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/external_event.dart';
import 'package:catch_dating_app/events/events.dart'
    show
        EventMapItem,
        EventMap,
        EventMapViewModel,
        ExternalEventMapItem,
        hasEventMapPin,
        hasExternalEventMapPin;
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_event_display_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_event_row.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Full-screen event map opened from the Explore feed's map pill.
///
/// Design-system Explore demotes the map from an always-on canvas to a focused,
/// dismissible view: the feed is the primary surface, and this route shows the
/// same nearby events as pins. Tapping a pin selects it; tapping the selected
/// event card opens that event; the distance ring cycles the shared Explore
/// distance filter.
class ExploreMapScreen extends ConsumerStatefulWidget {
  const ExploreMapScreen({
    super.key,
    // Tests, captures, and Widgetbook may opt into the deterministic fixture.
    this.enableNetworkTiles = true,
    this.initialSelectedEventId,
  });

  final bool enableNetworkTiles;
  final String? initialSelectedEventId;

  @override
  ConsumerState<ExploreMapScreen> createState() => _ExploreMapScreenState();
}

class _ExploreMapScreenState extends ConsumerState<ExploreMapScreen> {
  String? _selectedEventId;
  String? _lastMarketId;
  String? _lastViewerCacheKey;
  AsyncValue<EventMapViewModel>? _lastSuccessfulMapViewModel;
  bool _guestJoinedFilterResetQueued = false;

  @override
  void initState() {
    super.initState();
    _selectedEventId = widget.initialSelectedEventId;
  }

  @override
  void didUpdateWidget(covariant ExploreMapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSelectedEventId != widget.initialSelectedEventId &&
        _selectedEventId == oldWidget.initialSelectedEventId) {
      _selectedEventId = widget.initialSelectedEventId;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final viewerCacheKey = exploreMapViewerCacheKey(uidAsync);
    if (_lastViewerCacheKey != viewerCacheKey) {
      final hadViewer = _lastViewerCacheKey != null;
      _lastViewerCacheKey = viewerCacheKey;
      _lastSuccessfulMapViewModel = null;
      if (hadViewer) {
        _selectedEventId = widget.initialSelectedEventId;
      }
    }
    final feedAsync = ref.watch(exploreFeedViewModelProvider);
    final feedState = catchAsyncStateFromAsyncValue(feedAsync);
    final selectedCity = ref.watch(selectedExploreCityProvider);
    final marketId = selectedCity.effectiveMarketId;
    if (_lastMarketId != marketId) {
      _lastMarketId = marketId;
      _lastSuccessfulMapViewModel = null;
    }
    final filters = ref.watch(exploreFiltersProvider);
    if (uidState.value == null && uidState.hasData && filters.joinedOnly) {
      _scheduleGuestJoinedFilterReset();
    }
    final deviceLocationAsync = ref.watch(deviceLocationProvider);
    final deviceLocationState = catchAsyncStateFromAsyncValue(
      deviceLocationAsync,
    );
    final deviceLocation = deviceLocationState.value;
    final distanceRingRadiusKm = exploreDistanceFilterKm(
      filters.distanceFilter,
    );
    final distanceRingLabel = distanceRingRadiusKm == null
        ? null
        : context.l10n.exploreExploreMapScreenLabelWithinDistance(
            distanceKm: distanceRingRadiusKm.round(),
          );
    final distanceControlValue = distanceRingRadiusKm == null
        ? context.l10n.exploreExploreMapScreenValueAnyDistance
        : context.l10n.exploreExploreMapScreenValueDistanceKm(
            distanceKm: distanceRingRadiusKm.round(),
          );
    final hasDeviceLocation = deviceLocation != null;
    final locationLoading = deviceLocationState.isLoading;
    final distanceControlLabel = locationLoading
        ? context.l10n.exploreExploreMapScreenActionLocating
        : hasDeviceLocation
        ? context.l10n.exploreExploreMapScreenLabelDistance
        : context.l10n.exploreExploreMapScreenActionUseMyLocation;
    final distanceControlSemantics = locationLoading
        ? context.l10n.exploreExploreMapScreenSemanticsLocating
        : hasDeviceLocation
        ? context.l10n.exploreExploreMapScreenSemanticsDistanceValue(
            distance: distanceControlValue,
          )
        : context.l10n.exploreExploreMapScreenSemanticsUseMyLocation;
    final feed = feedState.value;
    final freshMapViewModel = feed == null
        ? null
        : AsyncData(exploreMapViewModelFromFeed(feed));
    if (freshMapViewModel != null) {
      _lastSuccessfulMapViewModel = freshMapViewModel;
    }
    final mapViewModel = feedState.isLoading
        ? _lastSuccessfulMapViewModel ?? const AsyncLoading<EventMapViewModel>()
        : feedAsync.whenData(exploreMapViewModelFromFeed);
    final selectedItem = _selectedItemFor(feed);
    final selectedExternalItem = _selectedExternalItemFor(feed);
    _clearSelectionIfMissing(feed);

    void cycleDistanceFilter() {
      catchTransitionHaptic();
      final current = ref.read(exploreFiltersProvider).distanceFilter;
      unawaited(_applyDistanceFilter(nextExploreMapDistanceFilter(current)));
    }

    final emptyDistanceKm = exploreDistanceFilterKm(
      filters.distanceFilter,
    )?.round();
    final widerEmptyFilter = widerExploreMapDistanceFilter(
      filters.distanceFilter,
    );
    final widerEmptyDistanceKm = widerEmptyFilter == null
        ? null
        : exploreDistanceFilterKm(widerEmptyFilter)?.round();
    final emptyHasDistance = emptyDistanceKm != null;
    final emptyHasRecoveryAction = emptyHasDistance || filters.hasActiveFilters;
    final emptyOverlay = feed?.isEmpty != true
        ? null
        : Positioned(
            left: CatchSpacing.s4,
            right: CatchSpacing.s4,
            bottom: CatchSpacing.s4,
            child: SafeArea(
              top: false,
              child: CatchEmptyState(
                surface: true,
                variant: CatchEmptyStateVariant.inline,
                icon: emptyHasDistance ? CatchIcons.nearMe : CatchIcons.filters,
                title: emptyHasDistance
                    ? context.l10n
                          .exploreExploreMapScreenTitleNoEventsWithinDistance(
                            distanceKm: emptyDistanceKm,
                          )
                    : context.l10n.exploreExploreMapScreenTitleNoEventsMatchMap,
                message: emptyHasDistance
                    ? context.l10n
                          .exploreExploreMapScreenMessageTryWiderOrShowCity(
                            cityLabel: selectedCity.label,
                          )
                    : context
                          .l10n
                          .exploreExploreMapScreenMessageChangeFiltersToBringEventsBack,
                actions: [
                  ?!emptyHasRecoveryAction
                      ? null
                      : Wrap(
                          spacing: CatchSpacing.s2,
                          runSpacing: CatchSpacing.s2,
                          children: [
                            if (widerEmptyFilter != null &&
                                widerEmptyDistanceKm != null)
                              CatchButton(
                                label: context.l10n
                                    .exploreExploreMapScreenActionExpandToDistance(
                                      distanceKm: widerEmptyDistanceKm,
                                    ),
                                size: CatchButtonSize.md,
                                onPressed: () => unawaited(
                                  _applyDistanceFilter(widerEmptyFilter),
                                ),
                              ),
                            if (emptyHasDistance)
                              CatchButton(
                                label: context
                                    .l10n
                                    .exploreExploreMapScreenActionShowAll,
                                size: CatchButtonSize.md,
                                variant: CatchButtonVariant.secondary,
                                onPressed: () => unawaited(
                                  _applyDistanceFilter(
                                    ExploreDistanceFilter.any,
                                  ),
                                ),
                              )
                            else if (filters.hasActiveFilters)
                              CatchButton(
                                label: context
                                    .l10n
                                    .exploreExploreScreenLabelClearFilters,
                                size: CatchButtonSize.md,
                                onPressed: () => ref
                                    .read(exploreFiltersProvider.notifier)
                                    .clear(),
                              ),
                          ],
                        ),
                ],
              ),
            ),
          );

    return CatchScaffold.workspace(
      backgroundColor: t.bg,
      body: Stack(
        children: [
          Positioned.fill(
            child: EventMap(
              enableNetworkTiles: widget.enableNetworkTiles,
              viewModel: mapViewModel,
              deviceLocation: deviceLocationAsync,
              distanceRingRadiusKm: distanceRingRadiusKm,
              distanceRingLabel: distanceRingLabel,
              distanceRingSemanticHint:
                  context.l10n.exploreExploreMapScreenHintChangeDistance,
              showOverviewControl: true,
              preserveCanvasWhenEmpty: true,
              selectedEventId: _selectedEventId,
              overlay: emptyOverlay,
              onRetry: () => ref.invalidate(exploreFeedViewModelProvider),
              onEventSelected: _selectEvent,
              onExternalEventSelected: _selectExternalEvent,
              onSelectionCleared: _clearSelection,
              onDistanceRingTapped: cycleDistanceFilter,
            ),
          ),
          Positioned(
            top: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: CatchInsets.pageBody.copyWith(
                  top: CatchSpacing.s5,
                  bottom: CatchSpacing.s5,
                ),
                child: CatchButton.floating(
                  icon: CatchIcons.nearMe,
                  label: distanceControlLabel,
                  value: hasDeviceLocation ? distanceControlValue : null,
                  semanticsLabel: distanceControlSemantics,
                  onPressed: () {
                    if (!locationLoading) _activateOrCycleDistance();
                  },
                ),
              ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            child: SafeArea(
              child: Padding(
                padding: CatchInsets.pageBody.copyWith(
                  top: CatchSpacing.s5,
                  bottom: CatchSpacing.s5,
                ),
                child: CatchIconAction(
                  variant: CatchIconActionVariant.float,
                  tooltip:
                      context.l10n.exploreExploreMapScreenTooltipBackToExplore,
                  onPressed: () {
                    catchTransitionHaptic();
                    if (context.canPop()) context.pop();
                  },
                  child: Icon(CatchIcons.back),
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: CatchInsets.pageBody.copyWith(top: 0),
                child: AnimatedSwitcher(
                  duration: _mapCardMotionDuration(context),
                  switchInCurve: CatchMotion.easeOutCubicCurve,
                  switchOutCurve: CatchMotion.easeInCubicCurve,
                  transitionBuilder: (child, animation) =>
                      _ExploreSelectedCardTransition(
                        animation: animation,
                        child: child,
                      ),
                  child: selectedItem == null && selectedExternalItem == null
                      ? SizedBox.shrink(
                          key: ValueKey<String>(
                            context
                                .l10n
                                .exploreExploreMapScreenBodyNoSelectedMapEvent,
                          ),
                        )
                      : selectedItem != null
                      ? _ExploreMapSelectedEventCard(
                          key: ValueKey<String>(selectedItem.event.id),
                          item: selectedItem,
                          onTap: (event, heroTag) =>
                              _openEvent(context, event, heroTag: heroTag),
                        )
                      : ExploreExternalEventRow(
                          key: ValueKey<String>(
                            'external:${selectedExternalItem!.event.id}',
                          ),
                          item: selectedExternalItem,
                          onExternalEventOpened: _openExternalEvent,
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _selectEvent(Event event) {
    catchSelectionHaptic();
    setState(() => _selectedEventId = event.id);
  }

  void _selectExternalEvent(ExternalEvent event) {
    catchSelectionHaptic();
    setState(() => _selectedEventId = 'external:${event.id}');
  }

  Future<void> _activateOrCycleDistance() async {
    catchTransitionHaptic();
    final current = ref.read(exploreFiltersProvider).distanceFilter;
    await _applyDistanceFilter(nextExploreMapDistanceFilter(current));
  }

  Future<void> _applyDistanceFilter(ExploreDistanceFilter filter) async {
    final failure = await ref
        .read(exploreFiltersProvider.notifier)
        .applyDistanceFilter(filter);
    if (!mounted || failure == null) return;
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
    final locationController = ref.read(deviceLocationProvider.notifier);
    showCatchNotice(
      context,
      message,
      actionLabel: canOpenSettings
          ? context.l10n.exploreExploreMapScreenActionOpenSettings
          : null,
      onAction: canOpenSettings
          ? () {
              unawaited(locationController.openRecoverySettings());
            }
          : null,
    );
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

  void _clearSelection() {
    if (_selectedEventId == null) return;
    catchSelectionHaptic();
    setState(() => _selectedEventId = null);
  }

  ExploreEventItem? _selectedItemFor(ExploreFeedViewModel? feed) {
    final selectedEventId = _selectedEventId;
    if (selectedEventId == null || feed == null) return null;
    for (final item in feed.items) {
      if (item.event.id == selectedEventId && hasEventMapPin(item.event)) {
        return item;
      }
    }
    return null;
  }

  ExploreExternalEventItem? _selectedExternalItemFor(
    ExploreFeedViewModel? feed,
  ) {
    final selectedEventId = _selectedEventId;
    if (selectedEventId == null || feed == null) return null;
    for (final item in feed.externalItems) {
      if ('external:${item.event.id}' == selectedEventId) return item;
    }
    return null;
  }

  void _clearSelectionIfMissing(ExploreFeedViewModel? feed) {
    final selectedEventId = _selectedEventId;
    if (selectedEventId == null || feed == null) return;
    if (_selectedItemFor(feed) != null ||
        _selectedExternalItemFor(feed) != null) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _selectedEventId != selectedEventId) return;
      setState(() => _selectedEventId = null);
    });
  }

  void _openEvent(BuildContext context, Event event, {Object? heroTag}) {
    catchSelectionHaptic();
    context.pushNamed(
      Routes.eventDetailScreen.name,
      pathParameters: {'clubId': event.clubId, 'eventId': event.id},
      extra: EventDetailRouteExtra(
        initialEvent: event,
        transition: EventDetailRouteTransition.mapSelectedCard,
        presentationMode: EventDetailPresentationMode.ticket,
        heroTag: heroTag,
      ),
    );
  }

  void _openExternalEvent(ExploreExternalEventItem item) {
    final uri = item.event.primaryExternalUri;
    if (uri == null) return;
    catchSelectionHaptic();
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
}

@visibleForTesting
String exploreMapViewerCacheKey(AsyncValue<String?> uidAsync) {
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  if (!uidState.hasData) return 'auth-resolving';
  return uidState.value == null ? 'guest' : 'viewer:${uidState.value}';
}

@visibleForTesting
ExploreDistanceFilter nextExploreMapDistanceFilter(
  ExploreDistanceFilter current,
) {
  return switch (current) {
    ExploreDistanceFilter.any => ExploreDistanceFilter.oneKm,
    ExploreDistanceFilter.oneKm => ExploreDistanceFilter.threeKm,
    ExploreDistanceFilter.threeKm => ExploreDistanceFilter.fiveKm,
    ExploreDistanceFilter.fiveKm => ExploreDistanceFilter.tenKm,
    ExploreDistanceFilter.tenKm => ExploreDistanceFilter.any,
  };
}

@visibleForTesting
ExploreDistanceFilter? widerExploreMapDistanceFilter(
  ExploreDistanceFilter current,
) {
  return switch (current) {
    ExploreDistanceFilter.oneKm => ExploreDistanceFilter.threeKm,
    ExploreDistanceFilter.threeKm => ExploreDistanceFilter.fiveKm,
    ExploreDistanceFilter.fiveKm => ExploreDistanceFilter.tenKm,
    ExploreDistanceFilter.any || ExploreDistanceFilter.tenKm => null,
  };
}

class _ExploreMapSelectedEventCard extends StatelessWidget {
  const _ExploreMapSelectedEventCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final ExploreEventItem item;
  final void Function(Event event, Object heroTag) onTap;

  @override
  Widget build(BuildContext context) {
    final state = ExploreEventRowState.from(item, l10n: context.l10n);
    final heroTag = eventTicketHeroTag(item.event.id, 'map');
    return EventDateRailCard(
      event: item.event,
      kicker: exploreEventMapKicker(item),
      title: state.title,
      supportingLabel: state.supportingLabel,
      priceLabel: state.priceLabel,
      capacityLabel: state.capacityLabel,
      statusLabel: state.statusLabel,
      heroTag: heroTag,
      onTap: () => onTap(item.event, heroTag),
    );
  }
}

class _ExploreSelectedCardTransition extends StatelessWidget {
  const _ExploreSelectedCardTransition({
    required this.animation,
    required this.child,
  });

  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final offsetAnimation = animation.drive(
      Tween<Offset>(
        begin: const Offset(0, 0.08),
        end: Offset.zero,
      ).chain(CurveTween(curve: CatchMotion.easeOutCubicCurve)),
    );
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(position: offsetAnimation, child: child),
    );
  }
}

Duration _mapCardMotionDuration(BuildContext context) {
  return MediaQuery.maybeOf(context)?.disableAnimations == true
      ? Duration.zero
      : CatchMotion.fast;
}

/// Builds the [EventMapViewModel] (pins + ordering) from the Explore feed.
EventMapViewModel exploreMapViewModelFromFeed(ExploreFeedViewModel feed) {
  final events = feed.items.map((item) => item.event).toList(growable: false);
  final items = [
    for (final item in feed.items)
      if (hasEventMapPin(item.event))
        EventMapItem(
          event: item.event,
          status: item.status,
          clubName: item.club.name,
        ),
  ]..sort((a, b) => a.event.startTime.compareTo(b.event.startTime));
  final externalPinnedItems = [
    for (final item in feed.externalItems)
      if (hasExternalEventMapPin(item.event))
        ExternalEventMapItem(event: item.event),
  ]..sort((a, b) => a.event.startTime.compareTo(b.event.startTime));

  return EventMapViewModel(
    events: List.unmodifiable(events),
    pinnedEvents: List.unmodifiable(items.map((item) => item.event)),
    items: List.unmodifiable(items),
    pinnedItems: List.unmodifiable(items),
    externalPinnedItems: List.unmodifiable(externalPinnedItems),
  );
}
