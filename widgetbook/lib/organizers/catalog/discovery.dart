import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_avatar_rail.dart';
import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

final _logoOrganizer = widgetbookOrganizerOrganizer.copyWith(
  profileImageUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&q=80',
);

@widgetbook.UseCase(
  name: 'Avatar rail states',
  type: OrganizerAvatarRail,
  path: '[Club Discovery]/Sections',
)
Widget organizerAvatarRailStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerAvatarRail',
    catalogId: 'section.club.avatar_rail',
    children: [
      WidgetbookPageStateCard(
        label: 'joined clubs',
        child: OrganizerAvatarRail(
          organizers: [
            widgetbookOrganizerOrganizer,
            widgetbookOrganizerMinimalOrganizer,
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Index row states',
  type: OrganizerIndexRow,
  path: '[Club Discovery]/Cards',
)
Widget organizerIndexRowStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerIndexRow',
    catalogId: 'card.club.index_row',
    children: [
      WidgetbookPageStateCard(
        label: 'photo / joined',
        child: OrganizerIndexRow(
          organizer: widgetbookOrganizerOrganizer,
          isJoined: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback / joinable',
        child: WidgetbookOrganizerOrganizerDirectoryPreviewScope(
          child: OrganizerIndexRow(
            organizer: widgetbookOrganizerMinimalOrganizer,
            isJoined: false,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo club',
        child: WidgetbookOrganizerOrganizerDirectoryPreviewScope(
          child: OrganizerIndexRow(organizer: _logoOrganizer, isJoined: false),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Avatar chip states',
  type: AvatarChip,
  path: '[Club Discovery]/Atoms',
)
Widget avatarChipStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'AvatarChip',
    catalogId: 'atom.club.avatar_chip',
    children: [
      WidgetbookPageStateCard(
        label: 'default',
        child: AvatarChip(organizer: _logoOrganizer),
      ),
      WidgetbookPageStateCard(
        label: 'event soon',
        child: AvatarChip(
          organizer: widgetbookOrganizerMinimalOrganizer,
          showLiveBadge: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Club image states',
  type: OrganizerImage,
  path: '[Club Discovery]/Atoms',
)
Widget organizerImageStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerImage',
    catalogId: 'atom.club.image',
    children: [
      WidgetbookPageStateCard(
        label: 'cover first',
        child: WidgetbookOrganizerOrganizerMediaFrame(
          child: OrganizerImage(organizer: widgetbookOrganizerOrganizer),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile first',
        child: WidgetbookOrganizerOrganizerMediaFrame(
          child: OrganizerImage(
            organizer: _logoOrganizer,
            preferProfileImage: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback',
        child: WidgetbookOrganizerOrganizerMediaFrame(
          child: OrganizerImage(organizer: widgetbookOrganizerMinimalOrganizer),
        ),
      ),
    ],
  );
}
