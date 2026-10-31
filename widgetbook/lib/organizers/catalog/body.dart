import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_read_only_preview.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_body.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

@widgetbook.UseCase(
  name: 'Body composition',
  type: OrganizerDetailBody,
  path: '[Club Detail]/Sections',
)
Widget organizerDetailBodyComposition(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerDetailBody',
    catalogId: 'screen.club.detail.sections.body',
    children: [
      WidgetbookPageStateCard(
        label: 'host / overview / photos / contact',
        description:
            'Body composition exercises the screen-local hosts, about, photo, and contact sections together.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerComposedPreview(
            isMember: true,
            isAuthenticated: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'minimal club',
        description:
            'No cover, no photos, no contact, no reviews, empty schedule.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerComposedPreview(
            organizer: widgetbookOrganizerMinimalOrganizer,
            events: const [],
            reviews: const [],
            isMember: false,
            isAuthenticated: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion candidate',
        description:
            'Same composition in a static review frame; future motion checks should pin route transitions separately.',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerComposedPreview(
            isMember: true,
            isAuthenticated: true,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Embedded read-only preview',
  type: OrganizerDetailReadOnlyPreview,
  path: '[Club Detail]/Sections',
)
Widget organizerDetailReadOnlyPreviewComposition(BuildContext context) {
  return const WidgetbookScrollCatalogFrame(
    title: 'OrganizerDetailReadOnlyPreview',
    catalogId: 'screen.club.detail.sections.read_only_preview',
    children: [
      WidgetbookPageStateCard(
        label: 'consumer composition / interactions disabled',
        child: WidgetbookOrganizerDeviceFrame(
          child: WidgetbookOrganizerOrganizerReadOnlyPreview(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Shared sliver composition',
  type: OrganizerDetailSliverBody,
  path: '[Club Detail]/Sections',
)
Widget organizerDetailSliverBodyComposition(BuildContext context) =>
    organizerDetailReadOnlyPreviewComposition(context);
