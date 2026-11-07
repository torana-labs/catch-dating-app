import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';

/// Doors open on a Tuesday trivia night.
final doorNow = DateTime(2026, 10, 27, 19, 42);
const doorEventId = 'tonight';

EventAttendee doorAttendee(
  String id,
  String name, {
  EventAttendeeStatus status = EventAttendeeStatus.registered,
  String? uid,
  DateTime? checkedInAt,
  int? paidMinor,
  int revision = 0,
}) => EventAttendee(
  id: id,
  eventId: doorEventId,
  organizerId: 'org-1',
  displayName: name,
  searchName: name.toLowerCase(),
  source: uid == null
      ? EventAttendeeSource.hostImport
      : EventAttendeeSource.catchBooking,
  status: status,
  linkedUid: uid,
  checkedInAt: checkedInAt,
  revenueAmountMinor: paidMinor,
  revenueCurrency: paidMinor == null ? null : 'INR',
  attendanceRevision: revision,
  createdAt: doorNow.subtract(const Duration(days: 2)),
  updatedAt: doorNow.subtract(const Duration(days: 2)),
);

EventParticipation doorParticipation(
  String uid, {
  EventParticipationStatus status = EventParticipationStatus.waitlisted,
  EventJoinRequestStatus? request,
  EventWaitlistOfferStatus? offer,
  DateTime? waitlistedAt,
}) => EventParticipation(
  id: '${doorEventId}_$uid',
  eventId: doorEventId,
  organizerId: 'org-1',
  uid: uid,
  status: status,
  hostApprovalStatus: request,
  waitlistOfferStatus: offer,
  waitlistedAt: waitlistedAt,
  createdAt: doorNow.subtract(const Duration(hours: 1)),
  updatedAt: doorNow.subtract(const Duration(hours: 1)),
);

HostEventRosterInsight doorLabel(
  String attendeeId, {
  bool firstTime = false,
  int prior = 0,
}) => HostEventRosterInsight(
  attendeeId: attendeeId,
  contactId: null,
  availability: HostRosterInsightAvailability.ready,
  signals: {
    firstTime
        ? HostRosterInsightSignal.firstTime
        : HostRosterInsightSignal.returning,
  },
  priorAttendedEventCount: prior,
  priorExpectedEventCount: prior,
  priorNoShowCount: 0,
  lastAttendedAt: null,
  attendanceRate: null,
  catchSpend: const [],
);

HostEventRosterInsights doorLabels(List<HostEventRosterInsight> rows) =>
    HostEventRosterInsights(
      eventId: doorEventId,
      organizerId: 'org-1',
      cutoffAt: doorNow,
      sourceCoverage: HostRosterInsightCoverage.exact,
      spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
      rows: rows,
      computedAt: doorNow,
    );

/// The board's door: four still to come, two in, two asking and one
/// waiting.
DoorState doorBoardState({
  DoorFilter filter = DoorFilter.arriving,
  String query = '',
  int needsReview = 0,
}) => DoorState(
  status: DoorStatus.content,
  filter: filter,
  query: query,
  needsReview: needsReview,
  guests: [
    const HostDoorGuest(
      attendeeId: 'dp',
      name: 'Dev Patel',
      status: HostDoorGuestStatus.arriving,
      firstTime: true,
      paidMinor: 99800,
      paidCurrency: 'INR',
    ),
    const HostDoorGuest(
      attendeeId: 'rk',
      name: 'Rhea Kapoor',
      status: HostDoorGuestStatus.arriving,
      priorNights: 5,
    ),
    const HostDoorGuest(
      attendeeId: 'ss',
      name: 'Sameer Shah',
      status: HostDoorGuestStatus.arriving,
      paidMinor: 49900,
      paidCurrency: 'INR',
    ),
    const HostDoorGuest(
      attendeeId: 'tm',
      name: 'Tara Menon',
      status: HostDoorGuestStatus.arriving,
      firstTime: true,
    ),
    HostDoorGuest(
      attendeeId: 'kr',
      name: 'Kabir Rao',
      status: HostDoorGuestStatus.checkedIn,
      checkedInAt: DateTime(2026, 10, 27, 19, 40),
    ),
    HostDoorGuest(
      attendeeId: 'as',
      name: 'Aanya Sharma',
      status: HostDoorGuestStatus.checkedIn,
      checkedInAt: DateTime(2026, 10, 27, 19, 38),
    ),
    HostDoorGuest(
      attendeeId: 'zm',
      userId: 'u-zm',
      name: 'Zoya Merchant',
      status: HostDoorGuestStatus.asked,
      askedAt: DateTime(2026, 10, 27, 19, 40),
      priorNights: 3,
    ),
    HostDoorGuest(
      attendeeId: 'ib',
      userId: 'u-ib',
      name: 'Ishaan Bose',
      status: HostDoorGuestStatus.asked,
      askedAt: DateTime(2026, 10, 27, 19, 37),
      firstTime: true,
    ),
    const HostDoorGuest(
      attendeeId: 'nr',
      userId: 'u-nr',
      name: 'Nikhil Rao',
      status: HostDoorGuestStatus.waitlist,
      waitlistPosition: 1,
    ),
  ],
);
