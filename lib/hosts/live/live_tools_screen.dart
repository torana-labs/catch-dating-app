import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_delivery_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_groups_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_help_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_movement_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_settings_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The night's assistance tools the old console carried, each shown when
/// the night uses it.
enum HostLiveTool {
  /// Channels, senders, limits and the late-join setting.
  settings,

  /// Departures and checkpoints, for a night with stops on a route.
  movement,

  /// Pace groups and who runs in each.
  groups,

  /// Every help request, paged.
  help,

  /// Every message delivery, paged.
  deliveries,
}

/// The tools [event] uses, in the order the screen shows them.
List<HostLiveTool> hostLiveTools(Event event) {
  final route = event.eventFormat.routePlan;
  final paceGroups =
      route?.groupStrategy == RouteGroupStrategy.paceGroups &&
      (route?.paceGroups.isNotEmpty ?? false);
  return [
    HostLiveTool.settings,
    if (event.itinerary.any((stop) => stop.location != null))
      HostLiveTool.movement,
    if (paceGroups) HostLiveTool.groups,
    HostLiveTool.help,
    HostLiveTool.deliveries,
  ];
}

/// Night tools, on the night theme: the old console's assistance sections,
/// reused as they are, for the settings, departures and checkpoints, pace
/// groups and the full help and delivery queues the rebuilt console does
/// not draw. Each section owns its reads and its existing commands.
class HostLiveToolsScreen extends ConsumerWidget {
  const HostLiveToolsScreen({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tools = hostLiveTools(event);
    final attendees = tools.contains(HostLiveTool.groups)
        ? ref.watch(watchEventAttendeesProvider(event.id))
        : null;
    return CatchRoot(
      theme: CatchThemeMode.night,
      child: CatchScreen(
        key: const ValueKey<String>('host-live-tools-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostFormatsBackToEvent),
          kicker: event.title,
          title: l10n.hostLiveTools,
        ),
        body: CatchPageBody.screen(
          child: CatchStack(
            gap: CatchStackGap.section,
            children: [
              for (final tool in tools)
                switch (tool) {
                  HostLiveTool.settings => EventAssistanceLiveSettingsSection(
                    event: event,
                  ),
                  HostLiveTool.movement => EventAssistanceLiveMovementSection(
                    event: event,
                  ),
                  HostLiveTool.groups => EventAssistanceLiveGroupsSection(
                    event: event,
                    attendees: attendees!,
                  ),
                  HostLiveTool.help => EventAssistanceLiveHelpSection(
                    organizerId: event.organizerId,
                    eventId: event.id,
                  ),
                  HostLiveTool.deliveries => EventAssistanceLiveDeliverySection(
                    organizerId: event.organizerId,
                    eventId: event.id,
                  ),
                },
            ],
          ),
        ),
      ),
    );
  }
}

/// Opens night tools over the console or board.
void openHostLiveTools(BuildContext context, Event event) => unawaited(
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => HostLiveToolsScreen(event: event)),
  ),
);
