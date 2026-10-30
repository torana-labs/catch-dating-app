import 'package:catch_dating_app/organizers/presentation/discovery/widgets/organizer_list_tile.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Membership trailing controller states',
  type: OrganizerJoinAction,
  path: '[Club Discovery]/Atoms',
)
Widget membershipTrailingControllerStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubJoinAction',
    catalogId: 'atom.club.membership_trailing_controller',
    children: [
      WidgetbookPageStateCard(
        label: 'joinable controller',
        child: WidgetbookOrganizerOrganizerDirectoryPreviewScope(
          child: OrganizerJoinAction(
            clubId: widgetbookOrganizerOrganizer.id,
            isJoined: false,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'joined controller',
        child: OrganizerJoinAction(
          clubId: widgetbookOrganizerOrganizerId,
          isJoined: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Membership trailing states',
  type: OrganizerJoinButton,
  path: '[Club Discovery]/Atoms',
)
Widget membershipTrailingStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubJoinButton',
    catalogId: 'atom.club.membership_trailing',
    children: [
      WidgetbookPageStateCard(
        label: 'join button',
        child: OrganizerJoinButton(
          isJoined: false,
          isPending: false,
          onJoinPressed: () {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'pending',
        child: OrganizerJoinButton(
          isJoined: false,
          isPending: true,
          onJoinPressed: null,
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'joined badge',
        child: OrganizerJoinButton(
          isJoined: true,
          isPending: false,
          onJoinPressed: null,
        ),
      ),
    ],
  );
}
