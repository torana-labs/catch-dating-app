import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_movement_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceLiveMovementSection extends ConsumerWidget {
  const EventAssistanceLiveMovementSection({super.key, required this.event});
  final Event event;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final route = event.eventFormat.routePlan;
    return EventAssistanceMovementSection(
      groups: route?.groupStrategy == RouteGroupStrategy.paceGroups
          ? [for (final g in route!.paceGroups) (id: g.id, label: g.label)]
          : [
              (
                id: 'event:whole',
                label: context.l10n.eventAssistanceMovementEveryone,
              ),
            ],
      onDeparture: (id) {
        final scope = EventAssistanceGroupScope(
          organizerId: event.organizerId,
          eventId: event.id,
          groupId: id,
        );
        final query = eventAssistanceDepartureProvider(scope);
        if (ref.exists(query)) ref.read(query.notifier).reload();
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) => EventAssistanceDepartureSheet(
            scope: scope,
            eventEnd: event.endTime,
            groupLabel: route?.groupStrategy == RouteGroupStrategy.paceGroups
                ? route!.paceGroups.firstWhere((g) => g.id == id).label
                : context.l10n.eventAssistanceMovementEveryone,
          ),
        );
      },
      onCheckpointHistory: (id) {
        final scope = EventAssistanceGroupScope(
          organizerId: event.organizerId,
          eventId: event.id,
          groupId: id,
        );
        final query = eventAssistanceDepartureHistoryProvider(
          EventAssistanceDepartureHistoryQuery(scope),
        );
        if (ref.exists(query)) ref.read(query.notifier).reload();
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) => EventAssistanceDepartureHistorySheet(
            scope: scope,
            groupLabel: route?.groupStrategy == RouteGroupStrategy.paceGroups
                ? route!.paceGroups.firstWhere((g) => g.id == id).label
                : context.l10n.eventAssistanceMovementEveryone,
          ),
        );
      },
    );
  }
}
