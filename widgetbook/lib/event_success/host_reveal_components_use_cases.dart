import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_text.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_viewport.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_outcome_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_header.dart';
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

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessOutcomeSection,
  path: '[P1 product surfaces]/Event Success/Reveal components',
)
Widget eventSuccessOutcomeSectionStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessOutcomeSection',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessOutcomeSection(
          unitOutcome: EventSuccessUnitOutcome.score,
          units: const [
            EventSuccessOutcomeUnit(id: 'team-a', label: 'Team A'),
            EventSuccessOutcomeUnit(id: 'team-b', label: 'Team B'),
          ],
          nextRoundIndex: 0,
          expectedRevision: 1,
          actionState: const EventSuccessOutcomeActionState(),
          onRecord:
              ({
                required expectedRevision,
                required roundIndex,
                required entries,
              }) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostRevealViewport,
  path: '[P1 product surfaces]/Event Success/Reveal components',
)
Widget eventSuccessHostRevealViewportStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostRevealViewport',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessHostRevealViewport(
          number: EventSuccessCountdownText(value: '9', caption: 'SECONDS'),
          copy: EventSuccessRevealHeader(
            headline: 'Round 1 opens in 9s',
            body: 'Partner details unlock together.',
          ),
        ),
      ],
    );
