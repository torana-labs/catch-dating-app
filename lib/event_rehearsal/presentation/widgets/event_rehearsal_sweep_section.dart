import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_visit_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceSweepSection, EventAssistanceSweepGuest;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Uses the runtime's latest roster; opening a visit deliberately fetches authority.
class EventRehearsalSweepSection extends ConsumerWidget {
  const EventRehearsalSweepSection({
    super.key,
    required this.rehearsal,
    this.practiceOperatorId,
  });
  final EventRehearsalBootstrap rehearsal;
  final String? practiceOperatorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visits =
        rehearsal.accountabilityReviews?.rows
            .where((row) => row.evidence.checkedInAtMillis != null)
            .toList(growable: false) ??
        const <RehearsalAccountabilityRow>[];
    String name(String actorId) => rehearsal.actors
        .firstWhere((actor) => actor.actorId == actorId)
        .displayName;
    return EventAssistanceSweepSection(
      guests: [
        for (final row in visits)
          EventAssistanceSweepGuest(
            id: row.actorId,
            name: name(row.actorId),
            disposition: row.evidence.disposition,
          ),
      ],
      onReview: (actorId) {
        final row = visits.firstWhere((row) => row.actorId == actorId);
        final query = eventRehearsalAssistanceProvider(
          rehearsal.session.id,
          practiceOperatorId: practiceOperatorId,
        );
        if (ref.exists(query)) ref.read(query.notifier).reload();
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) => EventRehearsalVisitSheet(
            scope: row.scope,
            guestName: name(actorId),
            practiceOperatorId: practiceOperatorId,
          ),
        );
      },
    );
  }
}
