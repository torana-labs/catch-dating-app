import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_dating_app/pages/live_room/event_success_room_map.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Contained spatial selection',
  type: EventSuccessAttendeeSpatialRow,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewSpatialAttendeeRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Spatial attendee',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessAttendeeSpatialRow(
          assignment: EventSuccessCompanionFixtures.microPodAssignment,
          profile: null,
          selected: true,
          pending: false,
          canDrag: false,
          onSelect: (_) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessCompatibilitySection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictCompatibilitySignalHostCard(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCompatibilitySection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessCompatibilitySection(
          plan: EventSuccessCompanionFixtures.basePlan,
        ),
      ],
    );
