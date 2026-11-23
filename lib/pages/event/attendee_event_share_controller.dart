import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'attendee_event_share_controller.g.dart';

abstract interface class AttendeeEventShareActions {
  Future<CreateEventInviteLinkCallableResponse> createInviteLink({
    required String eventId,
    required bool isExternalEvent,
    required String label,
  });

  Future<void> recordShareIntent({
    required String eventId,
    required String inviteLinkId,
  });
}

@riverpod
AttendeeEventShareActions attendeeEventShareActions(Ref ref) =>
    RepositoryAttendeeEventShareActions(ref.watch(eventRepositoryProvider));

class RepositoryAttendeeEventShareActions implements AttendeeEventShareActions {
  const RepositoryAttendeeEventShareActions(this._repository);

  final EventRepository _repository;

  @override
  Future<CreateEventInviteLinkCallableResponse> createInviteLink({
    required String eventId,
    required bool isExternalEvent,
    required String label,
  }) => _repository.createAttendeeInviteLink(
    eventId: eventId,
    label: label,
    source: 'consumer_app',
    destinationKind: isExternalEvent ? 'externalBooking' : 'catchEvent',
  );

  @override
  Future<void> recordShareIntent({
    required String eventId,
    required String inviteLinkId,
  }) => _repository.recordShareIntent(
    eventId: eventId,
    inviteLinkId: inviteLinkId,
    surface: 'consumerApp',
    creativeId: 'event-share-card',
    channelHint: 'systemShare',
  );
}
