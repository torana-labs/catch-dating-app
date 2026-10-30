import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final _externalFeedItem = ExploreExternalEventItem(
  event: _externalEvent(
    id: 'widgetbook-external-jazz-supper',
    title: 'Jazz supper table',
    startTime: DateTime(2026, 6, 25, 20),
    meetingPoint: 'Blue room terrace',
    activityKind: ActivityKind.dinner,
    priceDisplayText: 'Rs 1,800',
    sourcePlatform: 'luma',
  ),
  distanceFromUserKm: 2.4,
);

@widgetbook.UseCase(
  name: 'Feed states',
  type: ExploreFeedSliverBody,
  path: '[Explore]/Sections',
)
Widget exploreEventsSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'Explore feed slivers',
    catalogId: 'section.explore.feed',
    children: [
      WidgetbookPageStateCard(
        label: 'mixed event and club feed',
        child: WidgetbookExploreSliverFrame(
          child: WidgetbookExploreScope(
            child: const AbsorbPointer(child: _ExploreEventsSliverPreview()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.sliverPreviewHeight,
          child: WidgetbookExploreScope(
            feed: const AsyncLoading<ExploreFeedViewModel>(),
            child: const _ExploreEventsSliverPreview(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'feed error',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: WidgetbookExploreScope(
            feed: AsyncError<ExploreFeedViewModel>(
              StateError('Widgetbook Explore feed failed'),
              StackTrace.empty,
            ),
            child: const _ExploreEventsSliverPreview(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search-only empty',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: WidgetbookExploreScope(
            searchQuery: 'silent supper cycling crew',
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: const _ExploreEventsSliverPreview(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'filter-only empty',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: WidgetbookExploreScope(
            seedFilters: const WidgetbookExploreFilterSeed(
              time: ExploreTimeFilter.weekend,
              distance: ExploreDistanceFilter.tenKm,
            ),
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: const _ExploreEventsSliverPreview(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'combined empty',
        child: WidgetbookExploreSliverFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: WidgetbookExploreScope(
            searchQuery: 'late-night padel supper',
            seedFilters: const WidgetbookExploreFilterSeed(
              distance: ExploreDistanceFilter.threeKm,
              activity: ActivityKind.padel,
            ),
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: const _ExploreEventsSliverPreview(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'This week states',
  type: ThisWeekRecommendationsSection,
  path: '[Explore]/Sections',
)
Widget thisWeekRecommendationsSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ThisWeekRecommendationsSection',
    catalogId: 'section.explore.feed.this_week',
    children: [
      WidgetbookPageStateCard(
        label: 'ticket strip',
        child: WidgetbookExploreScope(
          child: AbsorbPointer(
            child: ThisWeekRecommendationsSection(
              items: widgetbookExploreFeedItems.take(3).toList(),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Event row states',
  type: ExploreFeedEventRow,
  path: '[Explore]/Rows',
)
Widget exploreFeedEventRowStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreFeedEventRow',
    catalogId: 'row.explore.feed.event',
    children: [
      WidgetbookPageStateCard(
        label: 'open event',
        child: WidgetbookExploreScope(
          child: AbsorbPointer(
            child: ExploreFeedEventRow(item: widgetbookExploreFeedItems[1]),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'joined club recommendation',
        child: WidgetbookExploreScope(
          child: AbsorbPointer(
            child: ExploreFeedEventRow(
              item: widgetbookExploreFeedItems.first,
              analyticsSource: 'widgetbook_joined',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'External event row states',
  type: ExploreExternalEventRow,
  path: '[Explore]/Rows',
)
Widget exploreExternalEventRowStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreExternalEventRow',
    catalogId: 'row.explore.feed.external_event',
    children: [
      WidgetbookPageStateCard(
        label: 'source link available',
        child: WidgetbookExploreScope(
          child: AbsorbPointer(
            child: ExploreExternalEventRow(item: _externalFeedItem),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing source link',
        child: WidgetbookExploreScope(
          child: AbsorbPointer(
            child: ExploreExternalEventRow(
              item: ExploreExternalEventItem(
                event: _externalFeedItem.event.copyWith(externalLinks: []),
                distanceFromUserKm: null,
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _ExploreEventsSliverPreview extends ConsumerWidget {
  const _ExploreEventsSliverPreview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(exploreFiltersProvider);
    return CustomScrollView(
      slivers: buildExploreEventsSlivers(
        catchAsyncStateFromAsyncValue(ref.watch(exploreFeedViewModelProvider)),
        l10n: context.l10n,
        filters: filters,
        searchQuery: ref.watch(exploreSearchQueryProvider).trim(),
        onRetry: () => ref.invalidate(exploreFeedViewModelProvider),
        onClearSearch: () =>
            ref.read(exploreSearchQueryProvider.notifier).clear(),
        onClearFilters: () => ref.read(exploreFiltersProvider.notifier).clear(),
        onSetTimeFilter: (filter) =>
            ref.read(exploreFiltersProvider.notifier).setTimeFilter(filter),
        onEventSelected: (_, _) {},
        onExternalEventOpened: (_) {},
        pinnedDayHeaders: false,
        candidateOrganizers: widgetbookExploreOrganizers,
        joinedOrganizerIds: widgetbookExploreJoinedOrganizerIds,
      ),
    );
  }
}

ExternalEvent _externalEvent({
  required String id,
  required String title,
  required DateTime startTime,
  required String meetingPoint,
  required ActivityKind activityKind,
  required String priceDisplayText,
  required String sourcePlatform,
}) {
  return ExternalEvent(
    id: id,
    canonicalHostId: 'widgetbook-external-host',
    compatibilityOrganizerId: widgetbookExploreOrganizers[1].id,
    title: title,
    description:
        'A reviewed external plan shown as read-only supply in Explore with outbound booking only.',
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 2)),
    timezone: 'Asia/Kolkata',
    meetingPoint: meetingPoint,
    locationDetails: 'Hosted outside Catch; confirm final details on source.',
    photoUrl: widgetbookExploreOrganizers[1].imageUrl,
    latitude: widgetbookExploreMumbai.latitude + 0.03,
    longitude: widgetbookExploreMumbai.longitude + 0.03,
    activityKind: activityKind,
    interactionModel: activityKind.defaultInteractionModel,
    priceDisplayText: priceDisplayText,
    parsedPriceInPaise: 180000,
    status: 'active',
    publicationStatus: 'public',
    citySlug: widgetbookExploreMumbai.name,
    sourcePlatform: sourcePlatform,
    externalLinks: [
      ExternalEventLink(
        platform: sourcePlatform,
        url: 'https://example.com/events/$id',
        linkType: 'booking',
        sourceEventKey: id,
        candidateId: 'candidate-$id',
        primary: true,
      ),
    ],
  );
}
