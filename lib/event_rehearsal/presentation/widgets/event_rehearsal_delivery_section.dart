import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_deliveries.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_queue_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceDeliveryEntrySection;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalDeliverySection extends ConsumerWidget {
  const EventRehearsalDeliverySection({
    super.key,
    required this.sessionId,
    this.practiceOperatorId,
  });
  final String sessionId;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceDeliveryEntrySection(
        confirmationNeeded: ref
            .watch(eventRehearsalPendingDeliveriesProvider)
            .any((s) => s.sessionId == sessionId),
        onReview: () {
          final query = eventRehearsalAssistanceProvider(
            sessionId,
            practiceOperatorId: practiceOperatorId,
          );
          if (ref.read(query.exists)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventRehearsalDeliveryQueueSheet(
              sessionId: sessionId,
              practiceOperatorId: practiceOperatorId,
            ),
          );
        },
      );
}
