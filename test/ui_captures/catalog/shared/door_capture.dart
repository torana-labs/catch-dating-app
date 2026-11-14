// C// Cap// Cap// Capture// Capture// Capture f// Capture f// Capture fi// Capture fi// Capture fix// Capture fixtur// Capture fixtures sh// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/door/door_screen.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import 'package:flutter_test/flutter_test.dart' show Fake;
import 'capture_viewer.dart';

final hostTodayOrganizer = HostOperationsFixtures.primaryOrganizer;
final hostTodayTonight = HostOperationsFixtures.event(
  id: 'design-today-trivia',
  organizer: hostTodayOrganizer,
  start: DateTime(2026, 10, 27, 19, 30),
  bookedCount: 26,
  waitlistedCount: 4,
  capacityLimit: 32,
  activityKind: ActivityKind.pubQuiz,
  meetingPoint: 'Harbour Room, Bandra West',
).copyWith(name: 'Tuesday Trivia Night');

// The door on a Tuesday trivia night, doors open: nineteen of twenty-six
// in, two asking to join and one waiting.
final doorNow = DateTime(2026, 10, 27, 19, 42);
final doorEvent = hostTodayTonight;

EventAttendee doorAttendee(
  String id,
  String name, {
  EventAttendeeStatus status = EventAttendeeStatus.registered,
  String? uid,
  DateTime? checkedInAt,
  int? paidMinor,
}) => EventAttendee(
  id: 'design-door-$id',
  eventId: doorEvent.id,
  organizerId: hostTodayOrganizer.id,
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
  createdAt: doorNow.subtract(const Duration(days: 3)),
  updatedAt: doorNow.subtract(const Duration(days: 3)),
);

final doorAttendees = [
  doorAttendee('dp', 'Dev Patel', paidMinor: 99800),
  doorAttendee('rk', 'Rhea Kapoor'),
  doorAttendee('ss', 'Sameer Shah', paidMinor: 49900),
  doorAttendee('tm', 'Tara Menon'),
  doorAttendee('ir', 'Ishita Rao'),
  doorAttendee('nv', 'Neel Verma', paidMinor: 99800),
  doorAttendee('ak', 'Arjun Kulkarni'),
  for (final (index, name) in const [
    'Kabir Rao',
    'Aanya Sharma',
    'Meera Iyer',
    'Rohan Das',
    'Sana Qureshi',
    'Vikram Nair',
    'Leela Joshi',
    'Farhan Ali',
    'Priya Menon',
    'Aditya Rao',
    'Nisha Kapoor',
    'Karan Malhotra',
    'Tanvi Shah',
    'Omar Sheikh',
    'Diya Bose',
    'Raghav Sethi',
    'Ira Banerjee',
    'Zain Khan',
    'Maya Pillai',
  ].indexed)
    doorAttendee(
      'in-$index',
      name,
      status: EventAttendeeStatus.checkedIn,
      checkedInAt: doorNow.subtract(Duration(minutes: 1 + index * 2)),
    ),
  doorAttendee(
    'zm',
    'Zoya Merchant',
    status: EventAttendeeStatus.waitlisted,
    uid: 'design-door-u-zm',
  ),
  doorAttendee(
    'ib',
    'Ishaan Bose',
    status: EventAttendeeStatus.waitlisted,
    uid: 'design-door-u-ib',
  ),
  doorAttendee(
    'nr',
    'Nikhil Rao',
    status: EventAttendeeStatus.waitlisted,
    uid: 'design-door-u-nr',
  ),
];

EventParticipation doorParticipation(
  String uid, {
  EventJoinRequestStatus? request,
  required Duration ago,
}) => EventParticipation(
  id: '${doorEvent.id}_$uid',
  eventId: doorEvent.id,
  organizerId: hostTodayOrganizer.id,
  uid: uid,
  status: EventParticipationStatus.waitlisted,
  hostApprovalStatus: request,
  waitlistedAt: doorNow.subtract(ago),
  createdAt: doorNow.subtract(ago),
  updatedAt: doorNow.subtract(ago),
);

final doorParticipations = [
  doorParticipation(
    'design-door-u-zm',
    request: EventJoinRequestStatus.pending,
    ago: const Duration(minutes: 2),
  ),
  doorParticipation(
    'design-door-u-ib',
    request: EventJoinRequestStatus.pending,
    ago: const Duration(minutes: 5),
  ),
  doorParticipation('design-door-u-nr', ago: const Duration(days: 1)),
];

HostEventRosterInsight doorLabel(String id, {int prior = 0}) =>
    HostEventRosterInsight(
      attendeeId: 'design-door-$id',
      contactId: null,
      availability: HostRosterInsightAvailability.ready,
      signals: {
        prior == 0
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

final doorLabels = HostEventRosterInsights(
  eventId: doorEvent.id,
  organizerId: hostTodayOrganizer.id,
  cutoffAt: doorEvent.startTime,
  sourceCoverage: HostRosterInsightCoverage.exact,
  spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
  rows: [
    doorLabel('dp'),
    doorLabel('rk', prior: 5),
    doorLabel('tm'),
    doorLabel('ir', prior: 2),
    doorLabel('zm', prior: 3),
    doorLabel('ib'),
  ],
  computedAt: doorNow,
);

List<Object> doorCaptureOverrides() => [
  uidProvider.overrideWithValue(const AsyncData<String?>(captureViewerUid)),
  appConnectivityProvider.overrideWith(
    (ref) => Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
  ),
  hostAttendanceOutboxStoreProvider.overrideWithValue(
    CaptureHostAttendanceOutboxStore(),
  ),
  watchEventProvider(
    doorEvent.id,
  ).overrideWith((ref) => Stream.value(doorEvent)),
  watchEventAttendeesProvider(
    doorEvent.id,
  ).overrideWith((ref) => Stream.value(doorAttendees)),
  watchEventParticipationsForEventProvider(
    doorEvent.id,
  ).overrideWith((ref) => Stream.value(doorParticipations)),
  hostEventRosterInsightsProvider(
    doorEvent.id,
  ).overrideWith((ref) => Stream.value(doorLabels)),
];

Widget doorCapture({DoorFilter? filter}) => DoorScreen(
  organizerId: hostTodayOrganizer.id,
  eventId: doorEvent.id,
  initialEvent: doorEvent,
  initialFilter: filter,
);

class CaptureHostAttendanceOutboxStore extends Fake
    implements HostAttendanceOutboxStore {
  List<HostAttendanceOutboxEntry> entries = [];
  @override
  Future<List<HostAttendanceOutboxEntry>> load(
    String accountId, {
    String? scope,
    DateTime? now,
  }) async => List.of(entries);

  @override
  Future<void> flush(
    String accountId,
    String scope,
    Future<void> Function(HostAttendanceOutboxEntry) execute,
  ) async {
    if (entries.isNotEmpty) {
      throw StateError(
        'Seed an explicit replay result for pending attendance.',
      );
    }
  }
}
