import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_filter_rail.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Filter sheet states',
  type: ExploreFilterSheet,
  path: '[Explore]/Controls',
)
Widget exploreFilterSheetStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreFilterSheet',
    catalogId: 'control.explore.filter_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: WidgetbookContentFrame(
          child: WidgetbookExploreScope(
            child: const AbsorbPointer(child: ExploreFilterSheet()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active filters',
        child: WidgetbookContentFrame(
          child: WidgetbookExploreScope(
            seedFilters: const WidgetbookExploreFilterSeed(
              distance: ExploreDistanceFilter.threeKm,
              joinedOnly: true,
            ),
            child: const AbsorbPointer(child: ExploreFilterSheet()),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Filter states',
  type: ExploreFilterRail,
  path: '[Explore]/Sections',
)
Widget exploreFilterRailStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreFilterRail',
    catalogId: 'section.explore.filters',
    children: [
      WidgetbookPageStateCard(
        label: 'default time scope',
        child: WidgetbookExploreScope(child: const ExploreFilterRail()),
      ),
      WidgetbookPageStateCard(
        label: 'active distance and activity',
        child: WidgetbookExploreScope(
          seedFilters: const WidgetbookExploreFilterSeed(
            time: ExploreTimeFilter.weekend,
            distance: ExploreDistanceFilter.threeKm,
            activity: ActivityKind.pickleball,
            highRatedOnly: true,
          ),
          child: const ExploreFilterRail(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'joined only',
        child: WidgetbookExploreScope(
          seedFilters: const WidgetbookExploreFilterSeed(joinedOnly: true),
          child: const ExploreFilterRail(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'sheet content',
        description:
            'The same public sheet widget the rail opens from the filter pill.',
        child: WidgetbookContentFrame(
          child: WidgetbookExploreScope(
            seedFilters: const WidgetbookExploreFilterSeed(
              distance: ExploreDistanceFilter.fiveKm,
              joinedOnly: true,
            ),
            child: const AbsorbPointer(child: ExploreFilterSheet()),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Applied filter states',
  type: ExploreAppliedFilterRail,
  path: '[Explore]/Sections',
)
Widget exploreAppliedFilterChipsStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreAppliedFilterRail',
    catalogId: 'section.explore.applied_filters',
    children: [
      WidgetbookPageStateCard(
        label: 'secondary filters scroll with content',
        description:
            'This row is deliberately separate from the pinned time rail.',
        child: WidgetbookExploreScope(
          child: ExploreAppliedFilterRail(
            filters: const ExploreFilterSelection(
              distanceFilter: ExploreDistanceFilter.threeKm,
              highRatedOnly: true,
              joinedOnly: true,
              activityTag: 'pickleball',
              area: 'Bandra',
            ),
            showJoinedOnly: true,
            onDistanceFilterSelected: (_) {},
            onToggleJoinedOnly: widgetbookNoop,
            onToggleHighRatedOnly: widgetbookNoop,
            onToggleActivityTag: (_) {},
            onToggleArea: (_) {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Filter option item states',
  type: CatchChoiceButton,
  path: '[Explore]/Controls',
)
Widget exploreFilterOptionItemStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchChoiceButton',
    catalogId: 'control.explore.filter_option_item',
    children: [
      WidgetbookPageStateCard(
        label: 'time scope options',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchChoiceButton<ExploreTimeFilter>(
              option: const CatchOption(
                value: ExploreTimeFilter.tonight,
                label: 'Tonight',
              ),
              selected: true,
              onTap: widgetbookNoop,
            ),
            gapW12,
            CatchChoiceButton<ExploreTimeFilter>(
              option: const CatchOption(
                value: ExploreTimeFilter.weekend,
                label: 'Weekend',
              ),
              selected: false,
              onTap: widgetbookNoop,
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long copy',
        child: CatchChoiceButton<ExploreTimeFilter>(
          option: const CatchOption(
            value: ExploreTimeFilter.thisWeek,
            label: 'This week',
          ),
          selected: false,
          onTap: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Counted filter action',
  type: CatchIconAction,
  path: '[Explore]/Controls',
)
Widget exploreCountedFilterActionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchIconAction.counted filter action',
    catalogId: 'catch.icon_button',
    children: [
      WidgetbookPageStateCard(
        label: 'inactive',
        child: Center(
          child: CatchIconAction.counted(
            icon: CatchIcons.filters,
            count: 0,
            variant: CatchIconActionVariant.plain,
            tooltip: 'Filters',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active count',
        child: Center(
          child: CatchIconAction.counted(
            icon: CatchIcons.filters,
            count: 3,
            variant: CatchIconActionVariant.plain,
            tooltip: 'Filters, 3 active',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}
