import 'package:catch_dating_app/explore/presentation/explore_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_clear_button.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_screen_empty_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Empty states',
  type: CatchEmptyState,
  path: '[Explore]/Sections',
)
Widget exploreEmptyStateStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'Explore empty states',
    catalogId: 'section.explore.empty_error',
    children: [
      WidgetbookPageStateCard(
        label: 'empty city',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'No clubs in Mumbai yet',
          message:
              'Try another city from the location control, or create the first '
              'club when you are ready to host.',
          actions: [_secondaryAction('Try another city')],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search only',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'No clubs match this search',
          message: 'Try another club, neighborhood, host, or tag.',
          actions: [_secondaryAction('Clear search')],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'filter only',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'No clubs match these filters',
          message:
              'Clear one or more filters to bring nearby clubs back into view.',
          actions: [_secondaryAction('Clear filters')],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search plus filters',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'No clubs match this search',
          message:
              'Clear the search or filters to bring nearby clubs back into view.',
          actions: [_secondaryAction('Clear search and filters')],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline copy candidate',
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: 'Explore is offline',
          message:
              'Check your connection and try again to reload clubs and events.',
          actions: [_secondaryAction('Retry')],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route empty states',
  type: ExploreScreenEmptyState,
  path: '[Explore]/Sections',
)
Widget exploreScreenEmptyStateStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreScreenEmptyState',
    catalogId: 'section.explore.empty_error',
    children: [
      WidgetbookPageStateCard(
        label: 'no source clubs',
        child: ExploreScreenEmptyState(
          state: const ExploreDiscoveryEmptyState(
            kind: ExploreDiscoveryEmptyKind.noSourceOrganizers,
            cityLabel: 'Mumbai',
            action: ExploreDiscoveryEmptyAction.none,
          ),
          onClearSearch: widgetbookNoop,
          onClearFilters: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search plus filters',
        child: ExploreScreenEmptyState(
          state: const ExploreDiscoveryEmptyState(
            kind: ExploreDiscoveryEmptyKind.noFilteredSearchResults,
            cityLabel: 'Mumbai',
            action: ExploreDiscoveryEmptyAction.clearSearchAndFilters,
          ),
          onClearSearch: widgetbookNoop,
          onClearFilters: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Clear action states',
  type: ExploreClearButton,
  path: '[Explore]/Controls',
)
Widget exploreClearActionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreClearButton',
    catalogId: 'control.explore.clear_action',
    children: [
      WidgetbookPageStateCard(
        label: 'clear search',
        child: ExploreClearButton(
          clearSearch: true,
          clearFilters: false,
          onClearSearch: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clear filters',
        child: ExploreClearButton(
          clearSearch: false,
          clearFilters: true,
          onClearFilters: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'clear search and filters',
        child: ExploreClearButton(
          clearSearch: true,
          clearFilters: true,
          onClearSearch: widgetbookNoop,
          onClearFilters: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Feed empty sliver states',
  type: ExploreFeedEmptyState,
  path: '[Explore]/Sections',
)
Widget exploreEventsEmptySliverStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreFeedEmptyState',
    catalogId: 'section.explore.empty_error',
    children: [
      WidgetbookPageStateCard(
        label: 'clear search',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.exploreMediaPreviewHeight,
          child: CustomScrollView(
            slivers: [
              ExploreFeedEmptyState(
                state: ExploreEventsEmptyState.from(
                  filters: const ExploreFilterSelection(),
                  searchQuery: 'pickleball supper',
                  l10n: context.l10n,
                ),
                onClearSearch: widgetbookNoop,
                onClearFilters: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'broaden time filter',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.exploreMediaPreviewHeight,
          child: CustomScrollView(
            slivers: [
              ExploreFeedEmptyState(
                state: ExploreEventsEmptyState.from(
                  filters: const ExploreFilterSelection(
                    timeFilter: ExploreTimeFilter.tonight,
                  ),
                  searchQuery: '',
                  l10n: context.l10n,
                ),
                onSetTimeFilter: (_) {},
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

Widget _secondaryAction(String label) {
  return CatchButton(
    label: label,
    variant: CatchButtonVariant.secondary,
    onPressed: widgetbookNoop,
  );
}
