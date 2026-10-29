import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_membership_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceGroupRosterSection;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalGroupsSection extends ConsumerWidget {
  const EventRehearsalGroupsSection({
    super.key,
    required this.rehearsal,
    this.practiceOperatorId,
  });
  final EventRehearsalBootstrap rehearsal;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceGroupRosterSection(
        guests: [
          for (final actor in rehearsal.actors)
            (id: actor.actorId, name: actor.displayName),
        ],
        onReview: (id) {
          final row = rehearsal.membershipReviews?.rows
              .where((r) => r.scope.actorId == id)
              .firstOrNull;
          if (row == null) return;
          final query = eventRehearsalAssistanceProvider(
            rehearsal.session.id,
            practiceOperatorId: practiceOperatorId,
          );
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventRehearsalMembershipSheet(
              scope: row.scope,
              guestName: rehearsal.actors
                  .firstWhere((a) => a.actorId == id)
                  .displayName,
              practiceOperatorId: practiceOperatorId,
            ),
          );
        },
      );
}
