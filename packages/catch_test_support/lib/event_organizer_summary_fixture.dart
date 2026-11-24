import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';

/// The summary an event carries for [organizer], as the Functions triggers
/// copy it from the public organizer.
EventOrganizerSummary organizerSummaryOf(Organizer organizer) =>
    EventOrganizerSummary(
      name: organizer.name,
      location: organizer.location,
      area: organizer.area,
      hostName: organizer.hostName,
      tags: organizer.tags,
      rating: organizer.rating,
      synthetic: organizer.synthetic,
      appVisibility: EventOrganizerVisibility.values.byName(
        organizer.appVisibility.name,
      ),
      status: EventOrganizerLifecycle.values.byName(organizer.status.name),
      archived: organizer.archived,
    );

/// [events] as discovery returns them once the triggers have copied
/// [organizer] onto each: Explore reads the organizer from the event.
List<Event> eventsCarrying(Organizer organizer, Iterable<Event> events) => [
  for (final event in events)
    event.copyWith(organizerSummary: organizerSummaryOf(organizer)),
];
