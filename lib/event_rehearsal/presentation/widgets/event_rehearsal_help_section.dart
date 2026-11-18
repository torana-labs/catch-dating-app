import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_help.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_queue_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceHelpEntrySection;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalHelpSection extends ConsumerWidget {
  const EventRehearsalHelpSection({
    super.key,
    required this.sessionId,
    this.practiceOperatorId,
  });
  final String sessionId;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceHelpEntrySection(
        confirmationNeeded: ref
            .watch(eventRehearsalPendingHelpProvider)
            .any((s) => s.sessionId == sessionId),
        onReview: () {
          final query = eventRehearsalAssistanceProvider(
            sessionId,
            practiceOperatorId: practiceOperatorId,
          );
          if (ref.read(query.exists)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventRehearsalHelpQueueSheet(
              sessionId: sessionId,
              practiceOperatorId: practiceOperatorId,
            ),
          );
        },
      );
}
