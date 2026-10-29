import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_entry_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_deliveries.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceLiveDeliverySection extends ConsumerWidget {
  const EventAssistanceLiveDeliverySection({
    super.key,
    required this.organizerId,
    required this.eventId,
  });
  final String organizerId, eventId;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceDeliveryEntrySection(
        confirmationNeeded: ref
            .watch(eventAssistancePendingDeliveriesProvider)
            .any((s) => s.organizerId == organizerId && s.eventId == eventId),
        onReview: () {
          final query = eventAssistanceDeliveriesProvider(
            EventAssistanceDeliveryQuery(
              organizerId: organizerId,
              eventId: eventId,
            ),
          );
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventAssistanceDeliveryQueueSheet(
              organizerId: organizerId,
              eventId: eventId,
            ),
          );
        },
      );
}
