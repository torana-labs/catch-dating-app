import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_body.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Body sliver states',
  type: ExploreFeedSliverBody,
  path: '[Explore]/Sections',
)
Widget exploreBodyStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'buildExploreBodySlivers',
    catalogId: 'section.explore.body_slivers',
    children: [
      WidgetbookPageStateCard(
        label: 'mixed body',
        child: WidgetbookExploreSliverFrame(
          child: WidgetbookExploreScope(
            child: const _ExploreBodySliverPreview(),
          ),
        ),
      ),
    ],
  );
}

class _ExploreBodySliverPreview extends ConsumerWidget {
  const _ExploreBodySliverPreview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(exploreFiltersProvider);
    return CustomScrollView(
      slivers: buildExploreBodySlivers(
        context: context,
        feedState: catchAsyncStateFromAsyncValue(
          ref.watch(exploreFeedViewModelProvider),
        ),
        clubsViewModel: ExploreViewModel.partition(
          clubs: widgetbookExploreClubs,
          joinedClubIds: widgetbookExploreJoinedClubIds,
        ),
        filters: filters,
        searchQuery: ref.watch(exploreSearchQueryProvider).trim(),
        onRetryFeed: () => ref.invalidate(exploreFeedViewModelProvider),
        onClearSearch: () =>
            ref.read(exploreSearchQueryProvider.notifier).clear(),
        onClearFilters: () => ref.read(exploreFiltersProvider.notifier).clear(),
        onSetTimeFilter: (filter) =>
            ref.read(exploreFiltersProvider.notifier).setTimeFilter(filter),
        onActivitySelected: (activityKind) => ref
            .read(exploreFiltersProvider.notifier)
            .toggleActivityTag(activityKind.name),
        onEventSelected: (_, _) {},
        onExternalEventOpened: (_) {},
        includeJoinedClubsRail: true,
        includeClubDirectory: true,
        pinnedExploreDayHeaders: false,
      ),
    );
  }
}
