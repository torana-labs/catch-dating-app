import 'package:catch_dating_app/explore/presentation/explore_organizer_display_state.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/shared/organizer_cover.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Organizer poster states',
  type: OrganizerCard,
  path: '[Explore]/Cards',
)
Widget exploreOrganizerPosterCardStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubCard',
    catalogId: 'card.explore.feed.club_card',
    children: [
      WidgetbookPageStateCard(
        label: 'image-backed club',
        child: AbsorbPointer(
          child: OrganizerCard(organizer: widgetbookExploreOrganizers[1]),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback artwork',
        child: AbsorbPointer(
          child: OrganizerCard(
            organizer: widgetbookExploreOrganizers[2].copyWith(imageUrl: null),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Club row states',
  type: ExploreFeedOrganizerRow,
  path: '[Explore]/Rows',
)
Widget exploreFeedOrganizerRowStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreFeedClubRow',
    catalogId: 'row.explore.feed.club',
    children: [
      WidgetbookPageStateCard(
        label: 'compact club',
        child: AbsorbPointer(
          child: ExploreFeedOrganizerRow(
            organizer: widgetbookExploreOrganizers[0],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host unknown',
        child: AbsorbPointer(
          child: ExploreFeedOrganizerRow(
            organizer: widgetbookExploreOrganizers[2],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Club cover states',
  type: OrganizerCover,
  path: '[Explore]/Cards',
)
Widget exploreOrganizerCoverStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubCover',
    catalogId: 'card.explore.feed.club_cover',
    children: [
      WidgetbookPageStateCard(
        label: 'graded image',
        child: SizedBox(
          width: WidgetbookPreviewLayout.compactComponentWidth,
          height: WidgetbookPreviewLayout.compactPreviewExtent,
          child: OrganizerCover(organizer: widgetbookExploreOrganizers[0]),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compact fallback',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.smallPreviewExtent,
          child: OrganizerCover(
            organizer: widgetbookExploreOrganizers[2].copyWith(imageUrl: null),
            compact: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Club tags states',
  type: ExploreOrganizerTagList,
  path: '[Explore]/Cards',
)
Widget exploreOrganizerTagsStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreClubTagList',
    catalogId: 'card.explore.feed.club_tags',
    children: [
      WidgetbookPageStateCard(
        label: 'visible tags',
        child: ExploreOrganizerTagList(
          state: ExploreOrganizerCardState.from(
            widgetbookExploreOrganizers[0],
            l10n: context.l10n,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member fallback',
        child: ExploreOrganizerTagList(
          state: ExploreOrganizerCardState.from(
            widgetbookExploreOrganizers[0].copyWith(tags: []),
            l10n: context.l10n,
          ),
        ),
      ),
    ],
  );
}
