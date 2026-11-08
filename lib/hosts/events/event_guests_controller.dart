import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/events/presentation/event_attendee_lookup_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_guests_controller.g.dart';

/// Names and photos for guest accounts, keyed by their ids joined with
/// commas so the same set reads once.
@riverpod
Future<Map<String, (String, String?)>> hostEventGuestNames(
  Ref ref,
  String uids,
) async {
  final ids = uids.split(',').where((id) => id.isNotEmpty).toList();
  if (ids.isEmpty) return const {};
  final profiles = await ref
      .watch(eventAttendeeLookupProvider)
      .fetchProfiles(ids);
  return {
    for (final profile in profiles)
      profile.uid: (profile.name, profile.primaryPhotoThumbnailUrl),
  };
}

/// The guest lists, composed from the event, its attendees, its
/// participations (for the guests who asked) and the roster insight view,
/// all listeners.
@riverpod
HostEventGuestsState hostEventGuestsController(
  Ref ref,
  HostEventRequest request,
) {
  final eventValue = ref.watch(watchEventProvider(request.eventId));
  final attendeesValue = ref.watch(
    watchEventAttendeesProvider(request.eventId),
  );
  final participationsValue = ref.watch(
    watchEventParticipationsForEventProvider(request.eventId),
  );
  final error =
      eventValue.error ?? attendeesValue.error ?? participationsValue.error;
  final event = eventValue.value;
  final attendees = attendeesValue.value;
  if (error != null && (event == null || attendees == null)) {
    return HostEventGuestsState(
      status: HostEventGuestsStatus.error,
      error: error,
    );
  }
  if (event == null || attendees == null) {
    return const HostEventGuestsState.loading();
  }
  final insights = ref
      .watch(hostEventRosterInsightsProvider(request.eventId))
      .value;
  final insightById = insights?.byAttendeeId ?? const {};
  HostEventGuest guest(EventAttendee attendee) => HostEventGuest(
    id: attendee.id,
    name: attendee.displayName,
    uid: attendee.linkedUid,
    insight: insightById[attendee.id],
  );
  List<HostEventGuest> where(Set<EventAttendeeStatus> statuses) =>
      List<HostEventGuest>.unmodifiable(
        (attendees
                .where((attendee) => statuses.contains(attendee.status))
                .toList()
              ..sort((a, b) => a.searchName.compareTo(b.searchName)))
            .map(guest),
      );

  final attendeeByUid = <String, EventAttendee>{
    for (final attendee in attendees)
      if (attendee.linkedUid != null) attendee.linkedUid!: attendee,
  };
  final askedParticipations =
      (participationsValue.value ?? const <EventParticipation>[])
          .where(
            (participation) =>
                participation.hostApprovalStatus ==
                    EventJoinRequestStatus.pending &&
                participation.status != EventParticipationStatus.cancelled &&
                participation.status != EventParticipationStatus.deleted,
          )
          .toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  final unnamed = [
    for (final participation in askedParticipations)
      if (!attendeeByUid.containsKey(participation.uid)) participation.uid,
  ]..sort();
  final names = unnamed.isEmpty
      ? const <String, (String, String?)>{}
      : ref.watch(hostEventGuestNamesProvider(unnamed.join(','))).value ??
            const <String, (String, String?)>{};
  final asked = [
    for (final participation in askedParticipations)
      if (attendeeByUid[participation.uid] case final attendee?)
        guest(attendee)
      else if (names[participation.uid] case (final name, final photo))
        HostEventGuest(
          id: participation.uid,
          name: name,
          uid: participation.uid,
          photoUrl: photo,
        ),
  ];

  return HostEventGuestsState(
    status: HostEventGuestsStatus.ready,
    event: event,
    lists: {
      HostEventGuestList.booked: where({
        EventAttendeeStatus.registered,
        EventAttendeeStatus.checkedIn,
      }),
      HostEventGuestList.asked: List<HostEventGuest>.unmodifiable(asked),
      HostEventGuestList.waitlist: where({EventAttendeeStatus.waitlisted}),
      HostEventGuestList.cancelled: where({EventAttendeeStatus.cancelled}),
    },
    firstTime:
        insights == null ||
            insights.sourceCoverage == HostRosterInsightCoverage.missing
        ? null
        : insights.rows
              .where(
                (row) =>
                    row.signals.contains(HostRosterInsightSignal.firstTime),
              )
              .length,
  );
}

/// Starts the guest reads again after one failed.
void retryHostEventGuestsReads(WidgetRef ref, HostEventRequest request) {
  ref.invalidate(watchEventProvider(request.eventId));
  ref.invalidate(watchEventAttendeesProvider(request.eventId));
  ref.invalidate(watchEventParticipationsForEventProvider(request.eventId));
}
