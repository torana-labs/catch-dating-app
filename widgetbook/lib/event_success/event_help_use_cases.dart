import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_queue_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_help_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_help_preview_repositories.dart';

const _path = '[P1 product surfaces]/Event Success/Guest help';
@widgetbook.UseCase(
  name: 'Shared help entry',
  type: EventAssistanceHelpEntrySection,
  path: _path,
)
Widget assistanceHelpEntry(BuildContext context) =>
    const _Preview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Live runtime help entry',
  type: EventAssistanceLiveHelpSection,
  path: _path,
)
Widget assistanceLiveHelpEntry(BuildContext context) =>
    const _Preview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Practice runtime help entry',
  type: EventRehearsalHelpSection,
  path: _path,
)
Widget assistancePracticeHelpEntry(BuildContext context) =>
    const _Preview(surface: _Surface.practiceEntry);
@widgetbook.UseCase(
  name: 'Shared practical request records',
  type: EventAssistanceHelpQueueSection,
  path: _path,
)
Widget assistanceHelpRecords(BuildContext context) =>
    const _Preview(surface: _Surface.liveQueue);
@widgetbook.UseCase(
  name: 'Live request queue',
  type: EventAssistanceHelpQueueSheet,
  path: _path,
)
Widget assistanceLiveHelpQueue(BuildContext context) =>
    const _Preview(surface: _Surface.liveQueue);
@widgetbook.UseCase(
  name: 'Practice request queue',
  type: EventRehearsalHelpQueueSheet,
  path: _path,
)
Widget assistancePracticeHelpQueue(BuildContext context) =>
    const _Preview(surface: _Surface.practiceQueue);
@widgetbook.UseCase(
  name: 'Shared reviewed help decision',
  type: EventAssistanceHelpDecisionSection,
  path: _path,
)
Widget assistanceHelpDecision(BuildContext context) =>
    const _Preview(surface: _Surface.liveRequest);
@widgetbook.UseCase(
  name: 'Live request and exact retry',
  type: EventAssistanceHelpSheet,
  path: _path,
)
Widget assistanceLiveHelpRequest(BuildContext context) =>
    const _Preview(surface: _Surface.liveRequest);
@widgetbook.UseCase(
  name: 'Practice request and exact retry',
  type: EventRehearsalHelpSheet,
  path: _path,
)
Widget assistancePracticeHelpRequest(BuildContext context) =>
    const _Preview(surface: _Surface.practiceRequest);

enum _Surface {
  liveEntry,
  practiceEntry,
  liveQueue,
  practiceQueue,
  liveRequest,
  practiceRequest,
}

class _Preview extends StatefulWidget {
  const _Preview({required this.surface});
  final _Surface surface;
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  late final _fixtures = loadHelpPreviewFixtures();
  @override
  Widget build(
    BuildContext context,
  ) => FutureBuilder<List<Map<String, Object?>>>(
    future: _fixtures,
    builder: (context, value) {
      if (value.hasError) return Text('Preview unavailable: ${value.error}');
      if (!value.hasData) return const CatchLoadingIndicator();
      final data = value.requireData;
      final live = HelpPreviewLiveRepository(data[0]);
      final practice = HelpPreviewPracticeRepository(data[1]);
      final raw = data[0]['initial'] as Map;
      final scope = raw['context'] as Map;
      final query = EventAssistanceCaseQuery(
        organizerId: scope['organizerId'] as String,
        eventId: scope['eventId'] as String,
      );
      final page = EventAssistanceCasesPage.fromCallableData(
        raw,
        expectedQuery: query,
      );
      final rehearsal = practice.snapshot;
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventAssistanceCasesRepositoryProvider.overrideWith((ref) => live),
          eventRehearsalRepositoryProvider.overrideWith((ref) => practice),
        ],
        child: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: switch (widget.surface) {
              _Surface.liveEntry => EventAssistanceLiveHelpSection(
                organizerId: query.organizerId,
                eventId: query.eventId,
              ),
              _Surface.practiceEntry => EventRehearsalHelpSection(
                sessionId: rehearsal.session.id,
              ),
              _Surface.liveQueue => EventAssistanceHelpQueueSheet(
                organizerId: query.organizerId,
                eventId: query.eventId,
              ),
              _Surface.practiceQueue => EventRehearsalHelpQueueSheet(
                sessionId: rehearsal.session.id,
              ),
              _Surface.liveRequest => EventAssistanceHelpSheet(
                scope: page.cases.single.scope,
                query: query,
              ),
              _Surface.practiceRequest => EventRehearsalHelpSheet(
                scope: rehearsalHelpScope(
                  rehearsal,
                  rehearsal.helpRequests!.cases.single,
                ),
              ),
            },
          ),
        ),
      );
    },
  );
}
