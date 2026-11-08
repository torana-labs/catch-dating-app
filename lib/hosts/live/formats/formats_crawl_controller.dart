import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'formats_crawl_controller.g.dart';

/// The crawl board, composed from the event's route and the guest list
/// listener: who is with the crawl (checked in), the arrival groups and
/// who has not joined yet. Nothing polls.
@riverpod
HostFormatsCrawlState hostFormatsCrawlController(
  Ref ref,
  Organizer organizer,
  Event event,
) {
  final attendeesValue = ref.watch(watchEventAttendeesProvider(event.id));
  if (attendeesValue case AsyncValue(:final error?, hasValue: false)) {
    return HostFormatsCrawlState(
      status: HostFormatsCrawlStatus.error,
      error: error,
    );
  }
  final attendees = attendeesValue.value;
  if (attendees == null) return const HostFormatsCrawlState.loading();
  return hostFormatsCrawlState(
    event: event,
    host: organizer.name,
    attendees: attendees,
  );
}

/// The crawl board from the route and the guest list.
HostFormatsCrawlState hostFormatsCrawlState({
  required Event event,
  required String host,
  required List<EventAttendee> attendees,
}) {
  final located = event.itinerary.where((item) => item.location != null);
  final route = (located.isNotEmpty ? located : event.itinerary)
      .where((item) => item.kind != EventItineraryKind.finish)
      .toList();
  if (route.isEmpty) {
    return const HostFormatsCrawlState(status: HostFormatsCrawlStatus.noRoute);
  }
  final stops = [
    for (final stop in route)
      HostFormatsStop(
        stop: stop,
        startsAt: event.startTime.add(Duration(minutes: stop.offsetMinutes)),
      ),
  ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  // Booked: registered or already checked in.
  final coming = attendees
      .where(
        (a) =>
            a.status == EventAttendeeStatus.registered ||
            a.status == EventAttendeeStatus.checkedIn,
      )
      .toList();
  final groups = <String, ({int here, int total})>{};
  for (final attendee in coming) {
    final label = attendee.arrivalGroup?.trim();
    if (label == null || label.isEmpty) continue;
    final current = groups[label] ?? (here: 0, total: 0);
    groups[label] = (
      here: current.here + (attendee.isCheckedIn ? 1 : 0),
      total: current.total + 1,
    );
  }
  final missing =
      coming
          .where((a) => !a.isCheckedIn)
          .map(
            (a) => HostFormatsMissing(
              name: a.displayName,
              group: a.arrivalGroup?.trim(),
            ),
          )
          .toList()
        ..sort((a, b) => a.name.compareTo(b.name));
  final labels = groups.keys.toList()..sort();
  return HostFormatsCrawlState(
    status: HostFormatsCrawlStatus.running,
    stops: List.unmodifiable(stops),
    here: coming.where((a) => a.isCheckedIn).length,
    booked: coming.length,
    groups: List.unmodifiable([
      for (final label in labels)
        HostFormatsCrawlGroup(
          label: label,
          here: groups[label]!.here,
          total: groups[label]!.total,
        ),
    ]),
    missing: List.unmodifiable(missing),
    host: host,
  );
}
