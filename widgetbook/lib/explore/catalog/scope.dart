import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/widgetbook_harness.dart';
import 'cross_paths_fixtures.dart';
import 'fixtures.dart';

class WidgetbookExploreScope extends StatelessWidget {
  const WidgetbookExploreScope({
    super.key,
    required this.child,
    this.searchQuery,
    this.seedFilters = const WidgetbookExploreFilterSeed(),
    this.sourceClubs,
    this.viewModel,
    this.feed,
    this.uid = widgetbookExploreViewerUid,
    this.deviceLocation,
    this.outgoingInvitation,
  });

  final Widget child;
  final String? searchQuery;
  final WidgetbookExploreFilterSeed seedFilters;
  final AsyncValue<List<Club>>? sourceClubs;
  final AsyncValue<ExploreViewModel>? viewModel;
  final AsyncValue<ExploreFeedViewModel>? feed;
  final String? uid;
  final LocationCoordinate? deviceLocation;
  final CrossPathsInvitation? outgoingInvitation;

  @override
  Widget build(BuildContext context) {
    final effectiveSourceClubs =
        sourceClubs ??
        AsyncData<List<Club>>(List.unmodifiable(widgetbookExploreClubs));
    final effectiveViewModel =
        viewModel ??
        AsyncData(
          ExploreViewModel.partition(
            clubs: widgetbookExploreClubs,
            joinedClubIds: widgetbookExploreJoinedClubIds,
          ),
        );
    final effectiveFeed =
        feed ??
        AsyncData(
          ExploreFeedViewModel(
            items: List.unmodifiable(widgetbookExploreFeedItems),
          ),
        );
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream<String?>.value(uid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(
            uid == null ? null : widgetbookExploreViewer,
          ),
        ),
        cityListProvider.overrideWith(
          (ref) async => const [
            widgetbookExploreMumbai,
            widgetbookExploreDelhi,
          ],
        ),
        deviceLocationProvider.overrideWith(
          () => _PreviewDeviceLocation(deviceLocation),
        ),
        exploreSourceClubsProvider.overrideWithValue(effectiveSourceClubs),
        exploreClubsViewModelProvider.overrideWithValue(effectiveViewModel),
        exploreFeedViewModelProvider.overrideWithValue(effectiveFeed),
        if (uid != null)
          watchOutgoingCrossPathsInvitationProvider(
            uid!,
            widgetbookExploreCrossPathsSuggestion.event.eventId,
          ).overrideWith((ref) => Stream.value(outgoingInvitation)),
      ],
      child: _SeedExploreState(
        searchQuery: searchQuery,
        seedFilters: seedFilters,
        child: child,
      ),
    );
  }
}

class _SeedExploreState extends ConsumerStatefulWidget {
  const _SeedExploreState({
    required this.child,
    this.searchQuery,
    this.seedFilters = const WidgetbookExploreFilterSeed(),
  });

  final Widget child;
  final String? searchQuery;
  final WidgetbookExploreFilterSeed seedFilters;

  @override
  ConsumerState<_SeedExploreState> createState() => _SeedExploreStateState();
}

class _SeedExploreStateState extends ConsumerState<_SeedExploreState> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(selectedExploreCityProvider.notifier)
          .setCity(widgetbookExploreMumbai);
      final query = widget.searchQuery;
      if (query != null) {
        ref.read(exploreSearchQueryProvider.notifier).setQuery(query);
      }
      widget.seedFilters.apply(ref.read(exploreFiltersProvider.notifier));
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class WidgetbookExploreFilterSeed {
  const WidgetbookExploreFilterSeed({
    this.time,
    this.distance,
    this.activity,
    this.joinedOnly = false,
    this.highRatedOnly = false,
  });

  final ExploreTimeFilter? time;
  final ExploreDistanceFilter? distance;
  final ActivityKind? activity;
  final bool joinedOnly;
  final bool highRatedOnly;

  void apply(ExploreFilters notifier) {
    final seedTime = time;
    if (seedTime != null) notifier.setTimeFilter(seedTime);
    final seedDistance = distance;
    if (seedDistance != null) notifier.setDistanceFilter(seedDistance);
    final seedActivity = activity;
    if (seedActivity != null) notifier.toggleActivityTag(seedActivity.name);
    if (joinedOnly) notifier.toggleJoinedOnly();
    if (highRatedOnly) notifier.toggleHighRatedOnly();
  }
}

class _PreviewDeviceLocation extends DeviceLocation {
  _PreviewDeviceLocation(this.value);

  final LocationCoordinate? value;

  @override
  Future<LocationCoordinate?> build() async => value;
}
