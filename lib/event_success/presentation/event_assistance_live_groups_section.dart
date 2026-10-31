import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_group_roster_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceLiveGroupsSection extends ConsumerWidget {
  const EventAssistanceLiveGroupsSection({
    super.key,
    required this.event,
    required this.attendees,
  });
  final Event event;
  final AsyncValue<List<EventAttendee>> attendees;
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      EventAssistanceGroupRosterSection(
        guests: [
          for (final a in attendees.asData?.value ?? const <EventAttendee>[])
            (id: a.id, name: a.displayName),
        ],
        loading: attendees.isLoading,
        error: attendees.error,
        onReload: () => ref.invalidate(watchEventAttendeesProvider(event.id)),
        onReview: (id) {
          final scope = EventAssistanceGuestScope(
            organizerId: event.organizerId,
            eventId: event.id,
            attendeeId: id,
          );
          final query = eventAssistanceMembershipProvider(scope);
          if (ref.exists(query)) ref.read(query.notifier).reload();
          showCatchBottomSheet<void>(
            context: context,
            builder: (_) => EventAssistanceMembershipSheet(
              scope: scope,
              guestName: attendees.requireValue
                  .firstWhere((a) => a.id == id)
                  .displayName,
            ),
          );
        },
      );
}
