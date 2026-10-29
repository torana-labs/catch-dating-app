import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_cases.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceLiveHelpSection extends ConsumerWidget {
  const EventAssistanceLiveHelpSection({
    super.key,
    required this.organizerId,
    required this.eventId,
  });
  final String organizerId, eventId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceHelpEntrySection(
        confirmationNeeded: ref
            .watch(eventAssistancePendingCasesProvider)
            .any((s) => s.organizerId == organizerId && s.eventId == eventId),
        onReview: () {
          final query = eventAssistanceCasesProvider(
            EventAssistanceCaseQuery(
              organizerId: organizerId,
              eventId: eventId,
            ),
          );
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventAssistanceHelpQueueSheet(
              organizerId: organizerId,
              eventId: eventId,
            ),
          );
        },
      );
}
