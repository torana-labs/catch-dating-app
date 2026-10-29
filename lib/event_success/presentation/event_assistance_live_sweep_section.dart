import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_sweep_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Connects the shared sweep roster to live visit reviews.
class EventAssistanceLiveSweepSection extends ConsumerWidget {
  const EventAssistanceLiveSweepSection({
    super.key,
    required this.event,
    required this.attendees,
  });
  final Event event;
  final AsyncValue<List<EventAttendee>> attendees;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return EventAssistanceSweepSection(
      guests: [
        for (final attendee
            in attendees.asData?.value ?? const <EventAttendee>[])
          if (attendee.isCheckedIn)
            EventAssistanceSweepGuest(
              id: attendee.id,
              name: attendee.displayName,
              disposition: switch (attendee.currentAccountabilityResolution) {
                EventSuccessAccountabilityResolution.returned =>
                  AssistanceVisitDisposition.returned,
                EventSuccessAccountabilityResolution.departed =>
                  AssistanceVisitDisposition.departed,
                null => AssistanceVisitDisposition.unresolved,
              },
            ),
      ],
      loading: attendees.isLoading,
      error: attendees.error,
      onReload: () => ref.invalidate(watchEventAttendeesProvider(event.id)),
      onReview: (attendeeId) {
        final attendee = attendees.requireValue.firstWhere(
          (a) => a.id == attendeeId,
        );
        final scope = EventAssistanceAccountabilityScope(
          group: EventAssistanceGroupScope(
            organizerId: event.clubId,
            eventId: event.id,
            groupId: 'event:whole',
          ),
          attendeeId: attendeeId,
        );
        final query = eventAssistanceAccountabilityProvider(scope);
        if (ref.exists(query)) ref.read(query.notifier).reload();
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) => EventAssistanceVisitSheet(
            scope: scope,
            guestName: attendee.displayName,
          ),
        );
      },
    );
  }
}
