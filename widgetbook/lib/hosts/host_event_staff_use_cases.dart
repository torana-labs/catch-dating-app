import 'package:catch_dating_app/hosts/events/access/host_event_staff_grant_sheet.dart';
import 'package:catch_dating_app/hosts/events/access/host_event_staff_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';
import 'package:widgetbook_workspace/utility/preview.dart';

const _path = '[P1 product surfaces]/Host/Door';

@widgetbook.UseCase(
  name: 'Closed field before the list loads',
  type: HostEventStaffSection,
  path: _path,
)
Widget hostEventStaffSectionState(BuildContext context) =>
    const WidgetbookFixtureScope(
      overrides: [],
      child: WidgetbookScrollCatalogFrame(
        title: 'HostEventStaffSection',
        catalogId: 'host.event_staff.section',
        children: [
          WidgetbookPageStateCard(
            label: 'Event staff, closed',
            child: WidgetbookContentFrame(
              child: HostEventStaffSection(
                organizerId: 'organizer-preview',
                eventId: 'event-preview',
              ),
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Phone number and access window',
  type: HostEventStaffGrantSheet,
  path: _path,
)
Widget hostEventStaffGrantSheetState(BuildContext context) =>
    const WidgetbookScrollCatalogFrame(
      title: 'HostEventStaffGrantSheet',
      catalogId: 'host.event_staff.grant_sheet',
      children: [
        WidgetbookPageStateCard(
          label: 'Grant door access',
          child: WidgetbookUtilitySheetFrame(child: HostEventStaffGrantSheet()),
        ),
      ],
    );
