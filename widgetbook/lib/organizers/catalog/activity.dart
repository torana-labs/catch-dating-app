import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Next run banner states',
  type: OrganizerNextRunBanner,
  path: '[Club Detail]/Sections',
)
Widget organizerNextRunBannerStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubNextRunBanner',
    catalogId: 'section.club.next_run_banner',
    children: [
      WidgetbookPageStateCard(
        label: 'tap target',
        child: OrganizerNextRunBanner(
          event: widgetbookOrganizerEvents.first,
          onTap: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'display only',
        child: OrganizerNextRunBanner(event: widgetbookOrganizerEvents[1]),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Activity section states',
  type: OrganizerActivitySection,
  path: '[Club Detail]/Sections',
)
Widget organizerActivitySectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ClubActivitySection',
    catalogId: 'section.club.activity',
    children: [
      WidgetbookPageStateCard(
        label: 'activity and tags',
        child: OrganizerActivitySection(
          organizer: widgetbookOrganizerOrganizer,
          tags: visibleOrganizerTags(widgetbookOrganizerOrganizer, limit: 6),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'generic dinner tags',
        child: OrganizerActivitySection(
          organizer: widgetbookOrganizerMinimalOrganizer,
          tags: visibleOrganizerTags(widgetbookOrganizerMinimalOrganizer, limit: 4),
        ),
      ),
    ],
  );
}
