import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: ExploreScreen,
  path: '[Explore]/Screen',
)
Widget exploreScreenStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreScreen',
    catalogId: 'screen.explore.discovery',
    children: [
      WidgetbookPageStateCard(
        label: 'discovery feed',
        description:
            'Default browse chrome with mixed event/club discovery and map pill count.',
        child: WidgetbookExploreDeviceFrame(
          child: WidgetbookExploreScope(child: const ExploreScreen()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading with sticky chrome',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreRoutePreviewHeight,
          child: WidgetbookExploreScope(
            viewModel: const AsyncLoading<ExploreViewModel>(),
            feed: const AsyncLoading<ExploreFeedViewModel>(),
            child: const ExploreScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club source error',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreRoutePreviewHeight,
          child: WidgetbookExploreScope(
            sourceOrganizers: AsyncError<List<Organizer>>(
              StateError('Widgetbook club source failed'),
              StackTrace.empty,
            ),
            viewModel: AsyncError<ExploreViewModel>(
              StateError('Widgetbook club source failed'),
              StackTrace.empty,
            ),
            child: const ExploreScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search and filters empty',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreRoutePreviewHeight,
          child: WidgetbookExploreScope(
            searchQuery: 'supperclub for marathoners near worli',
            seedFilters: const WidgetbookExploreFilterSeed(
              distance: ExploreDistanceFilter.threeKm,
              activity: ActivityKind.dinner,
            ),
            viewModel: const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: const ExploreScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'anonymous guest',
        child: WidgetbookExploreDeviceFrame(
          child: WidgetbookExploreScope(
            uid: null,
            child: const ExploreScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookExploreMediaOverride(
          textScaler: const TextScaler.linear(2),
          child: WidgetbookExploreDeviceFrame(
            height: WidgetbookPreviewLayout.profilePhonePreviewHeight,
            child: WidgetbookExploreScope(child: const ExploreScreen()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookExploreMediaOverride(
          disableAnimations: true,
          child: WidgetbookExploreDeviceFrame(
            child: WidgetbookExploreScope(child: const ExploreScreen()),
          ),
        ),
      ),
    ],
  );
}
