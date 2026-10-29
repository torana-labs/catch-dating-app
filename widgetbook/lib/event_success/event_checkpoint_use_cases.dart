import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_request_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_visit_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_history_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_roster_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_visits_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'event_assistance_preview_repositories.dart'
    show AssistancePreviewLiveRepository;
import 'event_checkpoint_preview_repositories.dart';
import 'event_departure_preview_repositories.dart';

const _path = '[P1 product surfaces]/Event Success assistance';
@widgetbook.UseCase(
  name: 'Shared checkpoint observations',
  type: EventAssistanceCheckpointSection,
  path: _path,
)
Widget assistanceCheckpointForm(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveReport);
@widgetbook.UseCase(
  name: 'Original departure roster',
  type: EventAssistanceCheckpointRosterSection,
  path: _path,
)
Widget assistanceCheckpointRoster(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveReport);

@widgetbook.UseCase(
  name: 'Live checkpoint report and retry',
  type: EventAssistanceCheckpointSheet,
  path: _path,
)
Widget assistanceLiveCheckpoint(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveReport);
@widgetbook.UseCase(
  name: 'Practice checkpoint report and retry',
  type: EventRehearsalCheckpointSheet,
  path: _path,
)
Widget assistancePracticeCheckpoint(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceReport);
@widgetbook.UseCase(
  name: 'Historical departure records',
  type: EventAssistanceDepartureHistorySection,
  path: _path,
)
Widget assistanceCheckpointHistory(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveHistory);
@widgetbook.UseCase(
  name: 'Live historical checkpoint discovery',
  type: EventAssistanceDepartureHistorySheet,
  path: _path,
)
Widget assistanceLiveCheckpointHistory(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveHistory);
@widgetbook.UseCase(
  name: 'Practice historical checkpoint discovery',
  type: EventRehearsalDepartureHistorySheet,
  path: _path,
)
Widget assistancePracticeCheckpointHistory(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceHistory);

@widgetbook.UseCase(
  name: 'Shared checkpoint reporter and closeout',
  type: EventAssistanceCheckpointRequestSection,
  path: _path,
)
Widget assistanceCheckpointRequest(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceRequest);
@widgetbook.UseCase(
  name: 'Live legacy request availability',
  type: EventAssistanceCheckpointRequestSheet,
  path: _path,
)
Widget assistanceLiveCheckpointRequest(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.liveRequest);
@widgetbook.UseCase(
  name: 'Practice checkpoint closeout and reopen',
  type: EventRehearsalCheckpointRequestSheet,
  path: _path,
)
Widget assistancePracticeCheckpointRequest(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceRequest);

@widgetbook.UseCase(
  name: 'Original guests with unconfirmed arrivals',
  type: EventAssistanceCheckpointVisitsSection,
  path: _path,
)
Widget assistanceCheckpointVisits(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceRequest);
@widgetbook.UseCase(
  name: 'Practice original departure visit outcome',
  type: EventRehearsalCheckpointVisitSheet,
  path: _path,
)
Widget assistancePracticeCheckpointVisit(BuildContext context) =>
    const _CheckpointPreview(surface: _Surface.practiceVisit);

enum _Surface {
  liveReport,
  practiceReport,
  liveHistory,
  practiceHistory,
  liveRequest,
  practiceRequest,
  practiceVisit,
}

class _CheckpointPreview extends StatefulWidget {
  const _CheckpointPreview({required this.surface});
  final _Surface surface;
  @override
  State<_CheckpointPreview> createState() => _CheckpointPreviewState();
}

class _CheckpointPreviewState extends State<_CheckpointPreview> {
  late final _fixtures = Future.wait([
    loadCheckpointPreviewFixtures(),
    loadDeparturePreviewFixtures(),
    loadCheckpointRequestPreviewFixtures(),
  ]);
  @override
  Widget build(
    BuildContext context,
  ) => FutureBuilder<List<Map<String, Object?>>>(
    future: _fixtures,
    builder: (context, value) {
      if (value.hasError) return Text('Preview unavailable: ${value.error}');
      if (!value.hasData) return const CatchLoadingIndicator();
      final fixtures = value.requireData;
      final repository =
          (widget.surface == _Surface.practiceRequest ||
              widget.surface == _Surface.practiceVisit)
          ? CheckpointRequestPreviewPracticeRepository(fixtures[2])
          : CheckpointPreviewPracticeRepository(fixtures[1]);
      final selection = repository.snapshot.movementReview!.selection;
      final reportSelection = RehearsalMovementSelection(
        scope: selection.scope,
        progressRevision: 1,
      );
      final surface = switch (widget.surface) {
        _Surface.practiceVisit => EventRehearsalCheckpointVisitSheet(
          selection: reportSelection,
          attendeeId: repository
              .snapshot
              .movementReview!
              .checkpoint!
              .accountabilityReviews
              .value!
              .last
              .attendeeId,
          guestName: repository
              .snapshot
              .movementReview!
              .checkpoint!
              .departure
              .roster!
              .members
              .last
              .displayName,
        ),
        _Surface.liveRequest => EventAssistanceCheckpointRequestSheet(
          scope: checkpointPreviewScope,
          groupLabel: 'Everyone',
        ),
        _Surface.practiceRequest => EventRehearsalCheckpointRequestSheet(
          selection: reportSelection,
        ),
        _Surface.liveReport => EventAssistanceCheckpointSheet(
          scope: checkpointPreviewScope,
          groupLabel: 'Everyone',
        ),
        _Surface.practiceReport => EventRehearsalCheckpointSheet(
          selection: reportSelection,
        ),
        _Surface.liveHistory => EventAssistanceDepartureHistorySheet(
          scope: checkpointPreviewScope.group,
          groupLabel: 'Everyone',
        ),
        _Surface.practiceHistory => EventRehearsalDepartureHistorySheet(
          selection: selection,
        ),
      };
      return ProviderScope(
        overrides: [
          eventAssistanceAccountabilityRepositoryProvider.overrideWith(
            (ref) => AssistancePreviewLiveRepository(),
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
          eventAssistanceDepartureRepositoryProvider.overrideWith(
            (ref) => DeparturePreviewLiveRepository(repository),
          ),
          eventAssistanceCheckpointRepositoryProvider.overrideWith(
            (ref) => CheckpointPreviewLiveRepository(fixtures[0]),
          ),
          eventAssistanceDepartureHistoryRepositoryProvider.overrideWith(
            (ref) => CheckpointPreviewHistoryRepository(fixtures[0]),
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
                body: Align(alignment: Alignment.bottomCenter, child: surface),
              ),
            ),
          ],
          onGenerateRoute: (_) => null,
        ),
      );
    },
  );
}
