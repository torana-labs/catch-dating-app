import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_standings_section.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessStandingsSection,
  path: '[P1 product surfaces]/Event Success/Reveal components',
)
Widget eventSuccessStandingsSectionStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessStandingsSection',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessStandingsSection(
          unitOutcome: EventSuccessUnitOutcome.score,
          entries: [
            EventSuccessStandingEntry(
              unitId: 'team-a',
              unitLabel: 'Team A',
              position: 1,
              value: 9,
              roundsRecorded: 1,
            ),
          ],
        ),
      ],
    );
