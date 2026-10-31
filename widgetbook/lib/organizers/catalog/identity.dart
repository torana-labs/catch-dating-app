import 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Tag wrap states',
  type: OrganizerTagList,
  path: '[Club Discovery]/Atoms',
)
Widget organizerTagWrapStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerTagList',
    catalogId: 'atom.club.tag_wrap',
    children: [
      WidgetbookPageStateCard(
        label: 'brand tags',
        child: OrganizerTagList(
          tags: visibleOrganizerTags(widgetbookOrganizerOrganizer, limit: 4),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'neutral mixed case',
        child: OrganizerTagList(
          tags: ['coffee', 'first timers'],
          tone: CatchBadgeTone.neutral,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Host identity states',
  type: OrganizerHostIdentityRow,
  path: '[Club Discovery]/Atoms',
)
Widget organizerHostIdentityLineStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerHostIdentityRow',
    catalogId: 'atom.club.host_identity_line',
    children: [
      WidgetbookPageStateCard(
        label: 'with trailing',
        child: OrganizerHostIdentityRow(
          hostName: widgetbookOrganizerOrganizer.displayHostName,
          hostAvatarUrl: widgetbookOrganizerOrganizer.hostAvatarUrl,
          trailing: const CatchBadge(label: 'Owner'),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'fallback avatar',
        child: OrganizerHostIdentityRow(
          hostName: widgetbookOrganizerMinimalOrganizer.displayHostName,
        ),
      ),
    ],
  );
}
