import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_share_card.dart';
import 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Share card states',
  type: OrganizerShareCard,
  path: '[Club Detail]/Cards',
)
Widget organizerShareCardStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubShareCard',
    catalogId: 'card.club.share',
    children: [
      WidgetbookPageStateCard(
        label: 'cover photo',
        child: OrganizerShareCard(organizer: widgetbookOrganizerOrganizer),
      ),
      WidgetbookPageStateCard(
        label: 'polaroid fallback',
        child: OrganizerShareCard(organizer: widgetbookOrganizerMinimalOrganizer),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Share artwork states',
  type: OrganizerShareCover,
  path: '[Club Detail]/Cards',
)
Widget organizerShareArtworkStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubShareCover',
    catalogId: 'card.club.share.artwork',
    children: [
      WidgetbookPageStateCard(
        label: 'cover photo',
        child: WidgetbookOrganizerOrganizerMediaFrame(
          child: OrganizerShareCover(organizer: widgetbookOrganizerOrganizer),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'polaroid fallback',
        child: WidgetbookOrganizerOrganizerMediaFrame(
          child: OrganizerShareCover(organizer: widgetbookOrganizerMinimalOrganizer),
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
Widget organizerShareMetaRowStates(BuildContext context) {
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
          label: organizerMemberCountLabel(widgetbookOrganizerOrganizer),
        ),
      ),
    ],
  );
}
