import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_schedule_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

final _sameDayScheduleEvents = [
  widgetbookOrganizerEvent(
    id: 'widgetbook-thursday-dawn-5k',
    startTime: DateTime(2026, 6, 25, 6, 30),
    meetingPoint: 'Bandra Fort gate',
    distanceKm: 5,
    bookedCount: 12,
    capacityLimit: 18,
    description: 'A steady start for weekday regulars.',
  ),
  widgetbookOrganizerEvent(
    id: 'widgetbook-thursday-evening-8k',
    startTime: DateTime(2026, 6, 25, 18, 15),
    meetingPoint: 'Carter Road amphitheatre',
    distanceKm: 8,
    bookedCount: 17,
    capacityLimit: 20,
    description: 'A social evening loop with a cool-down walk.',
  ),
];

@widgetbook.UseCase(
  name: 'Schedule states',
  type: OrganizerScheduleSection,
  path: '[Club Detail]/Sections',
)
Widget organizerScheduleSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerScheduleSection',
    catalogId: 'section.club.schedule',
    children: [
      WidgetbookPageStateCard(
        label: 'upcoming events',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
          slivers: [
            OrganizerScheduleSection(events: widgetbookOrganizerEvents),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'same-day strip',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          slivers: [OrganizerScheduleSection(events: _sameDayScheduleEvents)],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'hosted events',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          slivers: [
            OrganizerScheduleSection(
              events: _sameDayScheduleEvents,
              isHost: true,
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty consumer',
        child: const WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.routeViewportHeight,
          slivers: [OrganizerScheduleSection(events: [])],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty host',
        child: const WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.routeViewportHeight,
          slivers: [OrganizerScheduleSection(events: [], isHost: true)],
        ),
      ),
    ],
  );
}
