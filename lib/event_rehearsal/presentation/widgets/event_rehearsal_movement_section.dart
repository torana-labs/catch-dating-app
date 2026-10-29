import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_history_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceMovementSection;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalMovementSection extends ConsumerWidget {
  const EventRehearsalMovementSection({
    super.key,
    required this.rehearsal,
    this.practiceOperatorId,
  });
  final EventRehearsalBootstrap rehearsal;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceMovementSection(
        groups: [
          for (final g
              in rehearsal.movementReview?.groups ?? <RehearsalMovementGroup>[])
            (id: g.groupId, label: g.label),
        ],
        onDeparture: (id) {
          final selection = RehearsalMovementSelection(
            scope: rehearsalMovementScope(rehearsal.session, id),
            practiceOperatorId: practiceOperatorId,
          );
          final query = eventRehearsalMovementProvider(selection);
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventRehearsalDepartureSheet(selection: selection),
          );
        },
        onCheckpointHistory: (id) {
          final selection = RehearsalMovementSelection(
            scope: rehearsalMovementScope(rehearsal.session, id),
            practiceOperatorId: practiceOperatorId,
          );
          final query = eventRehearsalMovementProvider(selection);
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) =>
                EventRehearsalDepartureHistorySheet(selection: selection),
          );
        },
      );
}
