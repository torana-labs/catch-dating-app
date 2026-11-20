import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_readiness_field.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_target_attendees_field.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessTargetAttendeesField,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictTargetAttendeeControl(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessTargetAttendeesField',
      catalogId: 'Event Success Host workspace',
      children: [
        EventSuccessTargetAttendeesField(
          value: 18,
          recommendedMin: 12,
          recommendedMax: 30,
          enabled: true,
          onChanged: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessReadinessField,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictReadinessIssues(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessReadinessField',
      catalogId: 'Event Success Host workspace',
      children: [
        const EventSuccessReadinessField(
          issues: [
            'Choose the first live prompt.',
            'Confirm the attendee target.',
          ],
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: CatchSection,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget previewEventSuccessReportStatus(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'CatchSection',
      catalogId: 'Event Success Host workspace',
      children: [
        CatchSection.status(
          icon: CatchIcons.insights,
          title: 'Waiting for attendee feedback',
          message: 'The report appears when attendee feedback is available.',
        ),
      ],
    );
