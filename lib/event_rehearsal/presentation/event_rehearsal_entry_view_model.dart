import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_source_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_entry_view_model.g.dart';

@riverpod
Future<({EventSuccessPlan? plan, int guestCount})> eventRehearsalSourcePlan(
  Ref ref,
  String eventId,
) async {
  final (plan, count) = await (
    ref.watch(eventSuccessRepositoryProvider).fetchPlan(eventId),
    ref.watch(eventRehearsalSourceRepositoryProvider).fetchGuestCount(eventId),
  ).wait;
  return (plan: plan, guestCount: count);
}

final class EventRehearsalEntryData {
  const EventRehearsalEntryData({
    required this.organizerDefaults,
    required this.events,
    required this.initialConfiguration,
  });

  final ClubHostDefaults organizerDefaults;
  final List<Event> events;
  final EventRehearsalConfiguration initialConfiguration;
}

/// One bounded upcoming-event window; failed lookups remain errors rather than
/// being presented as an organizer with no event or no configured defaults.
@riverpod
Future<EventRehearsalEntryData> eventRehearsalEntry(
  Ref ref,
  String organizerId,
  String? sourceEventId,
) async {
  final clubs = ref.watch(clubsRepositoryProvider);
  final eventsRepository = ref.watch(eventRepositoryProvider);
  final clubFuture = clubs.fetchClub(organizerId);
  final upcomingFuture = eventsRepository.fetchUpcomingEventsForClubs([
    organizerId,
  ]);
  final sourceFuture = sourceEventId == null
      ? Future<Event?>.value()
      : eventsRepository.fetchEvent(sourceEventId);
  final (club, events, explicitSource) = await (
    clubFuture,
    upcomingFuture,
    sourceFuture,
  ).wait;
  if (club == null) {
    throw const DocumentNotFoundException('rehearsal organizer');
  }
  if (sourceEventId != null && explicitSource == null) {
    throw const DocumentNotFoundException('rehearsal source event');
  }
  // Event practice is an explicit entry choice. Custom practice must not
  // depend on the first upcoming event's plan or roster being readable.
  final source = explicitSource;
  if (source != null && source.organizerId != organizerId) {
    throw const PermissionException(
      'This event does not belong to the rehearsal organizer.',
    );
  }
  final sourceData = source == null
      ? null
      : await ref.watch(eventRehearsalSourcePlanProvider(source.id).future);
  return EventRehearsalEntryData(
    organizerDefaults: club.hostDefaults,
    events: List.unmodifiable([
      if (explicitSource != null &&
          !events.any((event) => event.id == explicitSource.id))
        explicitSource,
      ...events,
    ]),
    initialConfiguration: EventRehearsalConfiguration.defaults(
      organizerDefaults: club.hostDefaults,
      event: source,
      plan: sourceData?.plan,
      sourceGuestCount: sourceData?.guestCount,
    ),
  );
}
