import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_event_type_browse_grid.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Activity states',
  type: ExploreEventTypeBrowseGrid,
  path: '[Explore]/Sections',
)
Widget exploreEventTypeBrowseGridStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreEventTypeBrowseGrid',
    catalogId: 'section.explore.activity_grid',
    children: [
      WidgetbookPageStateCard(
        label: 'counts ready',
        child: WidgetbookExploreScope(
          child: const ExploreEventTypeBrowseGrid(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active activity',
        child: WidgetbookExploreScope(
          seedFilters: const WidgetbookExploreFilterSeed(
            activity: ActivityKind.dinner,
          ),
          child: const ExploreEventTypeBrowseGrid(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: WidgetbookExploreScope(
          feed: const AsyncLoading<ExploreFeedViewModel>(),
          child: const ExploreEventTypeBrowseGrid(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'narrow width',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediumComponentWidth,
          child: WidgetbookExploreScope(
            child: const ExploreEventTypeBrowseGrid(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Activity content states',
  type: EventTypeBrowseBody,
  path: '[Explore]/Sections',
)
Widget eventTypeBrowseContentStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventTypeBrowseBody',
    catalogId: 'section.explore.activity_grid.content',
    children: [
      WidgetbookPageStateCard(
        label: 'collapsed preview',
        child: EventTypeBrowseBody(
          items: widgetbookExploreFeedItems,
          activeActivityTag: ActivityKind.dinner.name,
          expanded: false,
          onCategoryTap: _ignoreActivityKind,
          onExpand: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'expanded list',
        child: EventTypeBrowseBody(
          items: widgetbookExploreFeedItems,
          activeActivityTag: null,
          expanded: true,
          onCategoryTap: _ignoreActivityKind,
          onExpand: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Activity rows states',
  type: ActivityTypeList,
  path: '[Explore]/Sections',
)
Widget activityTypeRowsStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ActivityTypeList',
    catalogId: 'section.explore.activity_grid.rows',
    children: [
      WidgetbookPageStateCard(
        label: 'single column',
        child: SizedBox(
          width: WidgetbookPreviewLayout.mediumComponentWidth,
          child: ActivityTypeList(
            slots: _activitySlots,
            activeActivityTag: ActivityKind.socialRun.name,
            onCategoryTap: _ignoreActivityKind,
            onExpand: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'two columns',
        child: SizedBox(
          width: WidgetbookPreviewLayout.exploreComparisonWidth,
          child: ActivityTypeList(
            slots: _activitySlots,
            activeActivityTag: ActivityKind.pickleball.label,
            onCategoryTap: _ignoreActivityKind,
            onExpand: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Activity slot states',
  type: ActivitySlotRow,
  path: '[Explore]/Sections',
)
Widget activitySlotViewStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ActivitySlotRow',
    catalogId: 'section.explore.activity_grid.slot',
    children: [
      WidgetbookPageStateCard(
        label: 'activity entry',
        child: ActivitySlotRow(
          slot: const ActivitySlot.entry(_socialRunActivityEntry),
          activeActivityTag: ActivityKind.socialRun.name,
          onCategoryTap: _ignoreActivityKind,
          onExpand: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'more slot',
        child: ActivitySlotRow(
          slot: const ActivitySlot.more(3),
          activeActivityTag: null,
          onCategoryTap: _ignoreActivityKind,
          onExpand: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Activity row states',
  type: ActivityTypeRow,
  path: '[Explore]/Rows',
)
Widget activityTypeRowStates(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'ActivityTypeRow',
    catalogId: 'row.explore.activity_type',
    children: [
      WidgetbookPageStateCard(
        label: 'inactive row',
        child: ActivityTypeRow(
          entry: _dinnerActivityEntry,
          active: false,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'active row',
        child: ActivityTypeRow(
          entry: _socialRunActivityEntry,
          active: true,
          onTap: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'More row states',
  type: MoreActivityTypesRow,
  path: '[Explore]/Rows',
)
Widget moreActivityTypesRowStates(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'MoreActivityTypesRow',
    catalogId: 'row.explore.activity_type.more',
    children: [
      WidgetbookPageStateCard(
        label: 'collapsed overflow',
        child: MoreActivityTypesRow(remainingCount: 3, onTap: widgetbookNoop),
      ),
    ],
  );
}

void _ignoreActivityKind(ActivityKind _) {}

const _socialRunActivityEntry = ActivityEntry(
  activityKind: ActivityKind.socialRun,
  count: 3,
  firstSeenIndex: 0,
);

const _dinnerActivityEntry = ActivityEntry(
  activityKind: ActivityKind.dinner,
  count: 2,
  firstSeenIndex: 1,
);

const _pickleballActivityEntry = ActivityEntry(
  activityKind: ActivityKind.pickleball,
  count: 1,
  firstSeenIndex: 2,
);

const _activitySlots = [
  ActivitySlot.entry(_socialRunActivityEntry),
  ActivitySlot.entry(_dinnerActivityEntry),
  ActivitySlot.entry(_pickleballActivityEntry),
  ActivitySlot.more(3),
];
