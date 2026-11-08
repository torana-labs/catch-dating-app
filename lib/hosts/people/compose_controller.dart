import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'compose_controller.g.dart';

/// Which organizer is writing, the event asked for (if any), and now.
@immutable
class HostComposeRequest {
  const HostComposeRequest({
    required this.organizerId,
    required this.now,
    this.eventId,
  });

  final String organizerId;
  final String? eventId;
  final DateTime now;

  @override
  bool operator ==(Object other) =>
      other is HostComposeRequest &&
      other.organizerId == organizerId &&
      other.eventId == eventId &&
      other.now == now;

  @override
  int get hashCode => Object.hash(organizerId, eventId, now);
}

/// The compose screen, composed from the organizer's events listener and
/// the chosen event's participations listener.
@riverpod
HostComposeState hostComposeController(Ref ref, HostComposeRequest request) {
  final read = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(request.organizerId)),
  );
  final all = read.value;
  if (all == null) {
    return read.hasError
        ? HostComposeState(status: HostComposeStatus.error, error: read.error)
        : const HostComposeState.loading();
  }
  final upcoming = [
    for (final event in all)
      if (!event.isCancelled && event.endTime.isAfter(request.now)) event,
  ]..sort((a, b) => a.startTime.compareTo(b.startTime));
  final Event? event = request.eventId == null
      ? upcoming.firstOrNull
      : all.where((event) => event.id == request.eventId).firstOrNull;
  if (event == null) {
    return HostComposeState(
      status: HostComposeStatus.noEvent,
      events: upcoming,
    );
  }
  final participations = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventParticipationsForEventProvider(event.id)),
  ).value;
  final roster = participations == null
      ? null
      : EventParticipationRoster.fromParticipations(participations);
  return HostComposeState(
    status: HostComposeStatus.ready,
    events: upcoming,
    event: event,
    booked: roster?.bookedCount ?? 0,
    waitlisted: roster?.waitlistedCount ?? 0,
  );
}

/// Reads the compose screen again after a failure.
void retryHostComposeReads(WidgetRef ref, String organizerId) =>
    ref.invalidate(watchEventsForOrganizerProvider(organizerId));

/// The existing event broadcast command: one message to an event's booked
/// guests, waitlist or both, idempotent by its request id.
@riverpod
HostComposeCommands hostComposeCommands(Ref ref) =>
    HostComposeCommands(ref.watch(eventRepositoryProvider));

class HostComposeCommands {
  const HostComposeCommands(this._events);

  static final sendMutation = Mutation<SendEventBroadcastCallableResponse>();

  final EventRepository _events;

  String newRequestId() => _events.generateBroadcastRequestId();

  Future<SendEventBroadcastCallableResponse> send({
    required String requestId,
    required String eventId,
    required HostComposeAudience audience,
    required String body,
  }) => _events.sendEventBroadcast(
    requestId: requestId,
    eventId: eventId,
    audience: switch (audience) {
      HostComposeAudience.booked => EventBroadcastAudience.booked,
      HostComposeAudience.waitlist => EventBroadcastAudience.prospective,
      HostComposeAudience.everyone => EventBroadcastAudience.everyone,
    },
    body: body,
  );
}
