import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_posts_repository.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sends_controller.g.dart';

/// Which organizer's Sends, the event an announcement prefers, and now.
@immutable
class HostSendsRequest {
  const HostSendsRequest({
    required this.organizerId,
    required this.now,
    this.preferredEventId,
  });

  final String organizerId;
  final DateTime now;
  final String? preferredEventId;

  @override
  bool operator ==(Object other) =>
      other is HostSendsRequest &&
      other.organizerId == organizerId &&
      other.now == now &&
      other.preferredEventId == preferredEventId;

  @override
  int get hashCode => Object.hash(organizerId, now, preferredEventId);
}

/// Sends, composed from the send history pages, the manual handoff pages,
/// the messaging setup, the follower update quota, and the organizer's
/// events and the announcement event's bookings.
@riverpod
HostSendsState hostSendsController(Ref ref, HostSendsRequest request) {
  final organizerId = request.organizerId;
  final history = catchAsyncStateFromAsyncValue(
    ref.watch(hostSendPagesProvider(organizerId)),
  );
  final tasks = catchAsyncStateFromAsyncValue(
    ref.watch(hostManualSendTaskPagesProvider(organizerId)),
  );
  final setup = catchAsyncStateFromAsyncValue(
    ref.watch(hostMessagingSetupProvider(organizerId)),
  );
  final quota = catchAsyncStateFromAsyncValue(
    ref.watch(watchOrganizerPostRemainingWeeklyQuotaProvider(organizerId)),
  );
  return HostSendsState(
    history: history.value,
    historyStatus: _status(history),
    historyError: history.error,
    tasks: tasks.value,
    tasksStatus: _status(tasks),
    tasksError: tasks.error,
    setup: setup.value,
    setupStatus: _status(setup),
    quota: quota.value,
    quotaStatus: _status(quota),
    announcement: _announcement(ref, request),
    embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
  );
}

HostSendsReadStatus _status<T>(CatchAsyncState<T> read) => read.value != null
    ? HostSendsReadStatus.ready
    : read.hasError
    ? HostSendsReadStatus.error
    : HostSendsReadStatus.loading;

/// The live or next event (the preferred one when it is eligible) and its
/// booked and waitlisted counts.
HostSendsAnnouncement _announcement(Ref ref, HostSendsRequest request) {
  final events = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(request.organizerId)),
  );
  final all = events.value;
  if (all == null) {
    return HostSendsAnnouncement(
      status: events.hasError
          ? HostSendsAnnouncementStatus.unavailable
          : HostSendsAnnouncementStatus.checkingEvents,
    );
  }
  final eligible = orderHostInboxEvents(all, now: request.now)
      .where(
        (event) => !event.isCancelled && event.endTime.isAfter(request.now),
      )
      .toList();
  final event =
      eligible
          .where((event) => event.id == request.preferredEventId)
          .firstOrNull ??
      eligible.firstOrNull;
  if (event == null) {
    return const HostSendsAnnouncement(
      status: HostSendsAnnouncementStatus.noEvent,
    );
  }
  final participations = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventParticipationsForEventProvider(event.id)),
  );
  final values = participations.value;
  if (values == null) {
    return HostSendsAnnouncement(
      event: event,
      status: participations.hasError
          ? HostSendsAnnouncementStatus.unavailable
          : HostSendsAnnouncementStatus.checkingAudience,
    );
  }
  final roster = EventParticipationRoster.fromParticipations(
    values.where((p) => p.eventId == event.id).toList(growable: false),
  );
  final booked = roster.bookedCount;
  final prospective = roster.waitlistedCount;
  return HostSendsAnnouncement(
    event: event,
    booked: booked,
    prospective: prospective,
    status: booked + prospective > 0
        ? HostSendsAnnouncementStatus.ready
        : HostSendsAnnouncementStatus.blocked,
  );
}

/// Reads Sends again after a failure.
void retryHostSendsReads(WidgetRef ref, String organizerId) => ref
  ..invalidate(hostSendPagesProvider(organizerId))
  ..invalidate(hostManualSendTaskPagesProvider(organizerId))
  ..invalidate(hostMessagingSetupProvider(organizerId))
  ..invalidate(watchOrganizerPostRemainingWeeklyQuotaProvider(organizerId))
  ..invalidate(watchEventsForOrganizerProvider(organizerId));
