import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_staff_presence_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_ticket_code_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/hosts/door/door_scan_state.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'door_controller.g.dart';

/// A roster command the door sent for a Catch guest and is waiting to see
/// in the participation listener.
enum DoorAwaiting { letIn, offer }

/// The door's own state for one event: the filter, the search, the local
/// attendance outbox, check-ins in flight and roster commands not yet seen
/// by the listeners. None of it is server data.
@immutable
class DoorSessionState {
  const DoorSessionState({
    this.filter = DoorFilter.arriving,
    this.query = '',
    this.outbox = const HostAttendanceOutboxSummary([]),
    this.flips = const <String, bool>{},
    this.awaiting = const <String, DoorAwaiting>{},
    this.scannedAttendeeId,
  });

  final DoorFilter filter;
  final String query;
  final HostAttendanceOutboxSummary outbox;

  /// Check-ins in flight, by attendee id: where each row is going until the
  /// attendee listener confirms it.
  final Map<String, bool> flips;

  /// Roster commands sent, by user id, until the participation listener
  /// shows their result.
  final Map<String, DoorAwaiting> awaiting;

  /// The guest the last scanned ticket checked in, while the scanner's
  /// success sheet shows them.
  final String? scannedAttendeeId;

  DoorSessionState copyWith({
    DoorFilter? filter,
    String? query,
    HostAttendanceOutboxSummary? outbox,
    Map<String, bool>? flips,
    Map<String, DoorAwaiting>? awaiting,
    String? scannedAttendeeId,
    bool clearScanned = false,
  }) => DoorSessionState(
    filter: filter ?? this.filter,
    query: query ?? this.query,
    outbox: outbox ?? this.outbox,
    flips: flips ?? this.flips,
    awaiting: awaiting ?? this.awaiting,
    scannedAttendeeId: clearScanned
        ? null
        : scannedAttendeeId ?? this.scannedAttendeeId,
  );
}

/// The door's commands and local state. Check-in and undo go through the
/// attendance outbox; let in and offer through the roster commands. After
/// a command nothing is invalidated: the listeners deliver the result, and
/// the local state lets go once they have.
@riverpod
class DoorSession extends _$DoorSession {
  @override
  DoorSessionState build(String eventId) {
    ref.listen(watchEventAttendeesProvider(eventId), (_, next) {
      final attendees = next.value;
      if (attendees != null) _confirmFlips(attendees);
    });
    ref.listen(watchEventParticipationsForEventProvider(eventId), (_, next) {
      final participations = next.value;
      if (participations != null) _confirmAwaiting(participations);
    });
    return const DoorSessionState();
  }

  void setFilter(DoorFilter filter) => state = state.copyWith(filter: filter);

  void setQuery(String query) => state = state.copyWith(query: query);

  /// Reads the attendance changes this phone still holds for the event.
  Future<void> loadOutbox() async {
    final outbox = await ref
        .read(hostOperationalRosterControllerProvider)
        .loadAttendanceOutbox(eventId);
    if (ref.mounted) state = state.copyWith(outbox: outbox);
  }

  /// Sends the attendance changes this phone holds, once it is online.
  Future<void> flushOutbox() async {
    final outbox = await ref
        .read(hostOperationalRosterControllerProvider)
        .flushAttendanceOutbox(eventId);
    if (ref.mounted) state = state.copyWith(outbox: outbox);
  }

  /// Drops the changes the server refused, after the host has seen them.
  Future<void> discardRefused() async {
    final outbox = await ref
        .read(hostOperationalRosterControllerProvider)
        .clearAttendanceConflicts(eventId);
    if (ref.mounted) state = state.copyWith(outbox: outbox);
  }

  /// Checks a guest in, or undoes it, through the attendance outbox. The row
  /// flips now; the attendee listener confirms it.
  Future<void> toggleAttendance(String attendeeId) async {
    final attendee = ref
        .read(watchEventAttendeesProvider(eventId))
        .value
        ?.where((attendee) => attendee.id == attendeeId)
        .firstOrNull;
    if (attendee == null || state.flips.containsKey(attendeeId)) return;
    state = state.copyWith(
      flips: {...state.flips, attendeeId: !attendee.isCheckedIn},
    );
    try {
      final outbox = await ref
          .read(hostOperationalRosterControllerProvider)
          .setAttendance(
            eventId: eventId,
            attendee: attendee,
            clientOperationId: doorOperationId(attendeeId),
          );
      if (!ref.mounted) return;
      state = state.copyWith(outbox: outbox);
      _confirmFlips(ref.read(watchEventAttendeesProvider(eventId)).value);
    } catch (_) {
      if (ref.mounted) {
        state = state.copyWith(flips: {...state.flips}..remove(attendeeId));
      }
      rethrow;
    }
  }

  /// Checks in the guest a scanned ticket names: the server says whose
  /// ticket it is, and the attendance outbox checks them in like a tap on
  /// their row. Returns why nobody was checked in, or null when the success
  /// sheet now shows the guest.
  Future<DoorScanNotice?> scanTicket(String ticketCode) async {
    final EventTicketResolution ticket;
    try {
      ticket = await ref
          .read(eventTicketCodeRepositoryProvider)
          .resolveTicketCode(eventId: eventId, ticketCode: ticketCode);
    } catch (error) {
      return doorTicketNoticeFor(error);
    }
    if (!ref.mounted) return null;
    if (ticket.eventId != eventId) return DoorScanNotice.otherEvent;
    if (ticket.status == EventAttendeeStatus.invited ||
        ticket.status == EventAttendeeStatus.waitlisted) {
      return DoorScanNotice.notBooked;
    }
    final attendee = ref
        .read(watchEventAttendeesProvider(eventId))
        .value
        ?.where((attendee) => attendee.id == ticket.attendeeId)
        .firstOrNull;
    if (attendee == null) return DoorScanNotice.notBooked;
    state = state.copyWith(scannedAttendeeId: ticket.attendeeId);
    if (!attendee.isCheckedIn && !ticket.isCheckedIn) {
      await toggleAttendance(ticket.attendeeId);
    }
    return null;
  }

  /// Says this phone's manager or staff member is on the door. A refused or
  /// failed heartbeat only leaves them out of the others' door team.
  Future<void> heartbeat() async {
    try {
      await ref.read(eventStaffPresenceRepositoryProvider).heartbeat(eventId);
    } on Object {
      return;
    }
  }

  /// Lets the success sheet go, for the next ticket.
  void clearScanned() => state = state.copyWith(clearScanned: true);

  /// Undoes the check-in the last scanned ticket made.
  Future<void> undoScanned() async {
    final attendeeId = state.scannedAttendeeId;
    if (attendeeId == null) return;
    state = state.copyWith(clearScanned: true);
    await toggleAttendance(attendeeId);
  }

  /// Approves a guest's request to join.
  Future<void> letIn(String userId) => _roster(
    userId,
    DoorAwaiting.letIn,
    () => ref
        .read(hostEventBookingControllerProvider.notifier)
        .approveJoinRequest(eventId: eventId, userId: userId),
  );

  /// Offers a waitlisted guest a place.
  Future<void> offer(String userId) => _roster(
    userId,
    DoorAwaiting.offer,
    () => ref
        .read(hostEventBookingControllerProvider.notifier)
        .createWaitlistOffer(eventId: eventId, userId: userId),
  );

  /// Adds a walk-in to tonight's guest list.
  Future<EventAttendeeImportResult> addWalkIn(EventAttendeeImportRow row) => ref
      .read(hostOperationalRosterControllerProvider)
      .importAttendees(
        eventId: eventId,
        importKey: 'door-${DateTime.now().microsecondsSinceEpoch}',
        fileName: 'manual-entry',
        format: EventAttendeeImportFormat.manual,
        rows: [row],
      );

  Future<void> _roster(
    String userId,
    DoorAwaiting kind,
    Future<void> Function() command,
  ) async {
    if (state.awaiting.containsKey(userId)) return;
    state = state.copyWith(awaiting: {...state.awaiting, userId: kind});
    try {
      await command();
      if (!ref.mounted) return;
      _confirmAwaiting(
        ref.read(watchEventParticipationsForEventProvider(eventId)).value,
      );
    } catch (_) {
      if (ref.mounted) {
        state = state.copyWith(awaiting: {...state.awaiting}..remove(userId));
      }
      rethrow;
    }
  }

  void _confirmFlips(List<EventAttendee>? attendees) {
    if (attendees == null || state.flips.isEmpty) return;
    final byId = {for (final attendee in attendees) attendee.id: attendee};
    final waiting = state.outbox.entries
        .where((entry) => entry.status == HostAttendanceOutboxStatus.pending)
        .map((entry) => entry.attendeeId)
        .toSet();
    final flips = {
      for (final MapEntry(:key, :value) in state.flips.entries)
        if (byId[key] case final attendee?
            when attendee.isCheckedIn != value || waiting.contains(key))
          key: value,
    };
    if (flips.length != state.flips.length) {
      state = state.copyWith(flips: flips);
    }
  }

  void _confirmAwaiting(List<EventParticipation>? participations) {
    if (participations == null || state.awaiting.isEmpty) return;
    final byUid = {for (final p in participations) p.uid: p};
    final awaiting = {
      for (final MapEntry(:key, :value) in state.awaiting.entries)
        if (byUid[key] case final participation?
            when switch (value) {
              DoorAwaiting.letIn =>
                participation.hostApprovalStatus ==
                    EventJoinRequestStatus.pending,
              DoorAwaiting.offer =>
                participation.status == EventParticipationStatus.waitlisted &&
                    participation.waitlistOfferStatus !=
                        EventWaitlistOfferStatus.active &&
                    participation.waitlistOfferStatus !=
                        EventWaitlistOfferStatus.accepted,
            })
          key: value,
    };
    if (awaiting.length != state.awaiting.length) {
      state = state.copyWith(awaiting: awaiting);
    }
  }
}

/// What the scanner says when the server would not resolve a ticket.
DoorScanNotice doorTicketNoticeFor(Object error) {
  final reason = backendCallableErrorDetails(
    error,
    code: 'failed-precondition',
  )?['reason'];
  return switch (reason) {
    'invalidTicket' => DoorScanNotice.notATicket,
    'ticketCancelled' => DoorScanNotice.cancelled,
    _ => DoorScanNotice.unavailable,
  };
}

/// A fresh idempotency key for one attendance change.
String doorOperationId(String attendeeId) =>
    'door_${attendeeId.hashCode.abs().toRadixString(36)}_'
    '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

/// The door for one event, composed from its listeners: the attendees
/// (who is booked and who is in), the participations (who is waiting or
/// asking), the roster labels (first-timers and history) and the event,
/// with the door's own outbox, filter and search over them.
@riverpod
DoorState doorController(Ref ref, String eventId) {
  final attendeesValue = ref.watch(watchEventAttendeesProvider(eventId));
  final attendees = attendeesValue.value;
  if (attendees == null) {
    return switch (attendeesValue) {
      AsyncValue(:final error?, :final stackTrace) => DoorState(
        status: DoorStatus.error,
        error: error,
        stackTrace: stackTrace,
      ),
      _ => const DoorState.loading(),
    };
  }
  final participations = ref
      .watch(watchEventParticipationsForEventProvider(eventId))
      .value;
  final insights = ref.watch(hostEventRosterInsightsProvider(eventId)).value;
  final session = ref.watch(doorSessionProvider(eventId));
  return DoorState(
    status: DoorStatus.content,
    event: ref.watch(watchEventProvider(eventId)).value,
    guests: doorGuests(
      attendees: attendees,
      participations: participations ?? const [],
      insights: insights,
      session: session,
    ),
    filter: session.filter,
    query: session.query,
    needsReview: session.outbox.needsReviewCount,
    scannedAttendeeId: session.scannedAttendeeId,
    team: doorTeam(
      presence: ref.watch(watchEventStaffPresenceProvider(eventId)).value,
      selfUid: ref.watch(uidProvider).value,
      now: DateTime.now(),
    ),
  );
}

/// The other managers and staff on the door at [now], most recent first: a
/// lapsed heartbeat or this phone's own row is left out.
List<String> doorTeam({
  required List<EventStaffPresence>? presence,
  required String? selfUid,
  required DateTime now,
}) => [
  for (final row in presence ?? const <EventStaffPresence>[])
    if (row.uid != selfUid && row.isCurrentAt(now)) row.displayName,
];

/// Starts the door's listeners again after the guest list failed.
void retryDoorReads(WidgetRef ref, String eventId) {
  ref.invalidate(watchEventAttendeesProvider(eventId));
  if (ref.read(watchEventParticipationsForEventProvider(eventId)).hasError) {
    ref.invalidate(watchEventParticipationsForEventProvider(eventId));
  }
  if (ref.read(hostEventRosterInsightsProvider(eventId)).hasError) {
    ref.invalidate(hostEventRosterInsightsProvider(eventId));
  }
}

/// The door's guests in door order: arriving by name, in with the latest
/// first, the waitlist in its order and requests oldest first. A pending
/// outbox change or a check-in in flight shows where the row is going.
List<HostDoorGuest> doorGuests({
  required List<EventAttendee> attendees,
  required List<EventParticipation> participations,
  required HostEventRosterInsights? insights,
  required DoorSessionState session,
}) {
  final byUid = {for (final p in participations) p.uid: p};
  final labels =
      insights == null ||
          insights.sourceCoverage == HostRosterInsightCoverage.missing ||
          insights.sourceCoverage == HostRosterInsightCoverage.invalidSource
      ? const <String, HostEventRosterInsight>{}
      : insights.byAttendeeId;
  final waitlisted =
      participations
          .where(
            (p) =>
                p.status == EventParticipationStatus.waitlisted &&
                p.hostApprovalStatus != EventJoinRequestStatus.pending,
          )
          .toList()
        ..sort(
          (a, b) => (a.waitlistedAt ?? a.createdAt).compareTo(
            b.waitlistedAt ?? b.createdAt,
          ),
        );
  final positions = {
    for (final (index, p) in waitlisted.indexed) p.uid: index + 1,
  };
  final guests = <HostDoorGuest>[];
  for (final attendee in attendees) {
    if (attendee.status == EventAttendeeStatus.cancelled) continue;
    final uid = attendee.linkedUid;
    final participation = uid == null ? null : byUid[uid];
    final label = labels[attendee.id];
    final entry = session.outbox.forAttendee(attendee.id);
    final pending = entry?.status == HostAttendanceOutboxStatus.pending;
    final flip = session.flips[attendee.id];
    final HostDoorGuestStatus status;
    if (attendee.status == EventAttendeeStatus.waitlisted) {
      status =
          participation?.hostApprovalStatus == EventJoinRequestStatus.pending
          ? HostDoorGuestStatus.asked
          : HostDoorGuestStatus.waitlist;
    } else {
      final checkedIn = pending
          ? entry!.desiredCheckedIn
          : flip ?? attendee.isCheckedIn;
      status = checkedIn
          ? HostDoorGuestStatus.checkedIn
          : HostDoorGuestStatus.arriving;
    }
    final offerStatus = participation?.waitlistOfferStatus;
    guests.add(
      HostDoorGuest(
        attendeeId: attendee.id,
        userId: uid,
        name: attendee.displayName,
        status: status,
        firstTime:
            label?.signals.contains(HostRosterInsightSignal.firstTime) ?? false,
        priorNights: label?.priorAttendedEventCount,
        paidMinor: attendee.revenueAmountMinor,
        paidCurrency: attendee.revenueCurrency,
        partySize: attendee.partySize,
        checkedInAt: attendee.isCheckedIn ? attendee.checkedInAt : null,
        askedAt: participation?.waitlistedAt ?? participation?.createdAt,
        waitlistPosition: uid == null ? null : positions[uid],
        offered:
            offerStatus == EventWaitlistOfferStatus.active ||
            offerStatus == EventWaitlistOfferStatus.accepted,
        syncing: pending,
        busy:
            (flip != null && !pending) ||
            (uid != null && session.awaiting.containsKey(uid)),
      ),
    );
  }
  int order(HostDoorGuest a, HostDoorGuest b) {
    if (a.status != b.status) return a.status.index - b.status.index;
    return switch (a.status) {
      HostDoorGuestStatus.arriving => a.name.toLowerCase().compareTo(
        b.name.toLowerCase(),
      ),
      HostDoorGuestStatus.checkedIn => (b.checkedInAt ?? _farFuture).compareTo(
        a.checkedInAt ?? _farFuture,
      ),
      HostDoorGuestStatus.waitlist => (a.waitlistPosition ?? 1 << 20).compareTo(
        b.waitlistPosition ?? 1 << 20,
      ),
      HostDoorGuestStatus.asked => (a.askedAt ?? _farFuture).compareTo(
        b.askedAt ?? _farFuture,
      ),
    };
  }

  return List<HostDoorGuest>.unmodifiable(guests..sort(order));
}

final _farFuture = DateTime(9999);
