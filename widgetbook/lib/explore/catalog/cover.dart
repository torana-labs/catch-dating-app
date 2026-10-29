import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_header.dart';
import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Cover header states',
  type: ExploreDiscoveryCoverHeader,
  path: '[Explore]/Sections',
)
Widget exploreDiscoveryCoverHeaderStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreDiscoveryCoverHeader',
    catalogId: 'section.explore.discovery_cover_header',
    children: [
      WidgetbookPageStateCard(
        label: 'featured event',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: WidgetbookExploreScope(
            child: ExploreDiscoveryCoverHeader(
              cityPickerState: widgetbookExploreCityPickerState(),
              onCitySelected: widgetbookExploreNoopCity,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'no featured event',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.mediaPanelHeight,
          child: WidgetbookExploreScope(
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: ExploreDiscoveryCoverHeader(
              cityPickerState: widgetbookExploreCityPickerState(),
              onCitySelected: widgetbookExploreNoopCity,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Cover chrome states',
  type: FeaturedEventTopBar,
  path: '[Explore]/Sections',
)
Widget exploreCoverStoryChromeStates(BuildContext context) {
  const d = CatchTokens.dark;
  final locationStory = FeaturedEventPoster(
    title: 'Tonight in Mumbai',
    location: 'Mumbai',
    showSearch: true,
    onLocation: widgetbookNoop,
    onSearch: widgetbookNoop,
  );
  const searchStory = FeaturedEventPoster(
    title: 'Tonight in Mumbai',
    showSearch: true,
  );

  Widget frame(Widget child) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: d.bg,
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: CatchSpacing.s3),
        child: child,
      ),
    );
  }

  return WidgetbookScrollCatalogFrame(
    title: 'FeaturedEventTopBar',
    catalogId: 'section.explore.featured_event_top_bar',
    children: [
      WidgetbookPageStateCard(
        label: 'location and search',
        child: frame(FeaturedEventTopBar(paper: d.ink, story: locationStory)),
      ),
      WidgetbookPageStateCard(
        label: 'search only',
        child: frame(FeaturedEventTopBar(paper: d.ink, story: searchStory)),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Cover content states',
  type: FeaturedEventBody,
  path: '[Explore]/Sections',
)
Widget exploreCoverStoryContentStates(BuildContext context) {
  const d = CatchTokens.dark;
  final dinner = ActivityPalette.resolve(context, ActivityKind.dinner);
  final dinnerStory = FeaturedEventPoster(
    activityKind: ActivityKind.dinner,
    kicker: 'Tonight',
    title: 'Jazz supper table',
    body: 'Eight seats, one long table, and an easy first round.',
    cta: 'Book',
    onCta: widgetbookNoop,
    data: '8:00 PM · Rs 1,800',
    data2: '8 going · 4 left',
  );
  const neutralStory = FeaturedEventPoster(
    title: 'Plans that feel warm before they feel crowded',
    body: 'Browse hosted tables, runs, games, and coffee walks nearby.',
    data: 'Mumbai',
  );

  Widget frame(Widget child) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: d.bg,
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: Padding(padding: CatchInsets.contentRelaxed, child: child),
    );
  }

  return WidgetbookScrollCatalogFrame(
    title: 'FeaturedEventBody',
    catalogId: 'section.explore.featured_event_body',
    children: [
      WidgetbookPageStateCard(
        label: 'event CTA',
        child: frame(
          FeaturedEventBody(
            paper: d.ink,
            accent: dinner.accent,
            story: dinnerStory,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'neutral hook',
        child: frame(
          FeaturedEventBody(
            paper: d.ink,
            accent: d.primary,
            story: neutralStory,
          ),
        ),
      ),
    ],
  );
}
