import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_share_card.dart';
import 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Share card states',
  type: ClubShareCard,
  path: '[Club Detail]/Cards',
)
Widget clubShareCardStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubShareCard',
    catalogId: 'card.club.share',
    children: [
      WidgetbookPageStateCard(
        label: 'cover photo',
        child: ClubShareCard(club: widgetbookClubClub),
      ),
      WidgetbookPageStateCard(
        label: 'polaroid fallback',
        child: ClubShareCard(club: widgetbookClubMinimalClub),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Share artwork states',
  type: ClubShareCover,
  path: '[Club Detail]/Cards',
)
Widget clubShareArtworkStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubShareCover',
    catalogId: 'card.club.share.artwork',
    children: [
      WidgetbookPageStateCard(
        label: 'cover photo',
        child: WidgetbookClubClubMediaFrame(
          child: ClubShareCover(club: widgetbookClubClub),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'polaroid fallback',
        child: WidgetbookClubClubMediaFrame(
          child: ClubShareCover(club: widgetbookClubMinimalClub),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Share meta row states',
  type: CatchMetaRow,
  path: '[Club Detail]/Cards',
)
Widget clubShareMetaRowStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchMetaRow',
    catalogId: 'card.club.share.meta_row',
    children: [
      WidgetbookPageStateCard(
        label: 'location',
        child: CatchMetaRow(icon: CatchIcons.location, label: 'Bandra, Mumbai'),
      ),
      WidgetbookPageStateCard(
        label: 'member count',
        child: CatchMetaRow(
          icon: CatchIcons.people,
          label: clubMemberCountLabel(widgetbookClubClub),
        ),
      ),
    ],
  );
}
