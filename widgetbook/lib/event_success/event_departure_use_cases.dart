import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_movement_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_roster_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_movement_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_movement_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_checkpoint_preview_repositories.dart';
import 'event_departure_preview_repositories.dart';

const _path = '[P1 product surfaces]/Event Success assistance';
@widgetbook.UseCase(
  name: 'Shared progressive departure form',
  type: EventAssistanceDepartureSection,
  path: _path,
)
Widget assistanceDepartureStates(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.liveSheet);
@widgetbook.UseCase(
  name: 'Searchable observed departure roster',
  type: EventAssistanceDepartureRosterSection,
  path: _path,
)
Widget assistanceDepartureRoster(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.roster);
@widgetbook.UseCase(
  name: 'Shared group departure entry',
  type: EventAssistanceMovementSection,
  path: _path,
)
Widget assistanceMovementEntry(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Live group departure entry',
  type: EventAssistanceLiveMovementSection,
  path: _path,
)
Widget assistanceLiveMovement(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.liveEntry);
@widgetbook.UseCase(
  name: 'Live departure and exact retry',
  type: EventAssistanceDepartureSheet,
  path: _path,
)
Widget assistanceLiveDeparture(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.liveSheet);
@widgetbook.UseCase(
  name: 'Practice group departure entry',
  type: EventRehearsalMovementSection,
  path: _path,
)
Widget assistancePracticeMovement(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.practiceEntry);
@widgetbook.UseCase(
  name: 'Practice departure and exact retry',
  type: EventRehearsalDepartureSheet,
  path: _path,
)
Widget assistancePracticeDeparture(BuildContext context) =>
    const _DeparturePreview(surface: _Surface.practiceSheet);

enum _Surface { liveSheet, practiceSheet, liveEntry, practiceEntry, roster }

class _DeparturePreview extends StatefulWidget {
  const _DeparturePreview({required this.surface});
  final _Surface surface;
  @override
  State<_DeparturePreview> createState() => _DeparturePreviewState();
}

class _DeparturePreviewState extends State<_DeparturePreview> {
  late final _fixtures = loadDeparturePreviewFixtures();
  Set<String> _selected = {};
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, Object?>>(
    future: _fixtures,
    builder: (context, value) {
      if (value.hasError) return Text('Preview unavailable: ${value.error}');
      if (!value.hasData) return const CatchLoadingIndicator();
      final repository = DeparturePreviewPracticeRepository(value.requireData);
      final rehearsal = repository.snapshot;
      final runtime = buildEventRehearsalRuntimeProjection(
        rehearsal,
        practiceGuestLabel: 'Practice guest',
        latePracticeGuestLabel: 'Late practice guest',
      );
      final event = runtime.event;
      final sheet =
          widget.surface == _Surface.liveSheet ||
          widget.surface == _Surface.practiceSheet;
      final surface = switch (widget.surface) {
        _Surface.liveSheet => EventAssistanceDepartureSheet(
          scope: EventAssistanceGroupScope(
            organizerId: event.organizerId,
            eventId: event.id,
            groupId: 'event:whole',
          ),
          eventEnd: event.endTime,
          groupLabel: 'Everyone',
        ),
        _Surface.practiceSheet => EventRehearsalDepartureSheet(
          selection: rehearsal.movementReview!.selection,
        ),
        _Surface.liveEntry => EventAssistanceLiveMovementSection(event: event),
        _Surface.practiceEntry => EventRehearsalMovementSection(
          rehearsal: rehearsal,
        ),
        _Surface.roster => EventAssistanceDepartureRosterSection(
          guests: [
            for (final g in rehearsal.movementReview!.candidates)
              (id: g.attendeeId, name: g.displayName),
          ],
          selectedIds: _selected,
          onChanged: (ids) => setState(() => _selected = ids),
        ),
      };
      return ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
          eventAssistanceDepartureRepositoryProvider.overrideWith(
            (ref) => DeparturePreviewLiveRepository(repository),
          ),
          eventAssistanceDepartureHistoryRepositoryProvider.overrideWith(
            (ref) => const EmptyDeparturePreviewHistoryRepository(),
          ),
          watchEventAttendeesProvider(event.id).overrideWith(
            (ref) => Stream.value(runtime.accountabilityAttendees),
          ),
        ],
        child: Navigator(
          onGenerateInitialRoutes: (_, _) => [
            MaterialPageRoute<void>(
              builder: (_) => const Scaffold(
                body: Center(child: Text('Reopen the preview to try again.')),
              ),
            ),
            MaterialPageRoute<void>(
              builder: (_) => Scaffold(
                body: sheet
                    ? Align(alignment: Alignment.bottomCenter, child: surface)
                    : SingleChildScrollView(
                        child: CatchPageBody(child: surface),
                      ),
              ),
            ),
          ],
          onGenerateRoute: (_) => null,
        ),
      );
    },
  );
}
