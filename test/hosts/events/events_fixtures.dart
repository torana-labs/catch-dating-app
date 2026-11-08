import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_basics.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_step_row.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/events_state.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../events/events_test_helpers.dart';

/// The fixture night: Tuesday 27 October 2026, the afternoon before doors.
final eventsNow = DateTime(2026, 10, 27, 16);

/// Doors at 7:30 PM tonight.
final eventsDoors = DateTime(2026, 10, 27, 19, 30);

const eventsOrganizerId = 'organizer-1';

final tonightEvent = buildEvent(
  id: 'trivia',
  organizerId: eventsOrganizerId,
  name: 'Tuesday Trivia Night',
  startTime: eventsDoors,
  endTime: eventsDoors.add(const Duration(hours: 3)),
  capacityLimit: 30,
  bookedCount: 26,
  waitlistedCount: 4,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
).copyWith(setupRevision: 3);

const eventsRequest = HostEventRequest(
  organizerId: eventsOrganizerId,
  eventId: 'trivia',
);

Event _coming(
  String id,
  String name,
  DateTime start, {
  required int booked,
  required int capacity,
  ActivityKind kind = ActivityKind.socialRun,
}) => buildEvent(
  id: id,
  organizerId: eventsOrganizerId,
  name: name,
  startTime: start,
  endTime: start.add(const Duration(hours: 2)),
  capacityLimit: capacity,
  bookedCount: booked,
  eventFormat: EventFormatSnapshot.fromActivityKind(kind),
);

final comingEvents = <Event>[
  tonightEvent,
  _coming(
    'run',
    'Carter Road Social Run',
    DateTime(2026, 11, 1, 6, 30),
    booked: 32,
    capacity: 40,
  ),
  _coming(
    'supper',
    'Long Table Supper',
    DateTime(2026, 11, 4, 20),
    booked: 14,
    capacity: 14,
    kind: ActivityKind.dinner,
  ),
  _coming(
    'clay',
    'Clay and Coffee',
    DateTime(2026, 11, 21, 11),
    booked: 6,
    capacity: 12,
    kind: ActivityKind.openActivity,
  ),
];

final pastEvent = _coming(
  'past',
  'Sunday Social Run',
  DateTime(2026, 10, 25, 6, 30),
  booked: 28,
  capacity: 30,
).copyWith(checkedInCount: 26);

const draftItem = PrivateEventSetupInventoryItem(
  eventId: 'draft-1',
  name: 'Diwali Quiz',
  city: EventSetupCity(cityId: 'mumbai', marketId: 'in'),
  localDate: '2026-11-12',
  localStartTime: '19:30',
  timezone: 'Asia/Kolkata',
  startTimeMillis: 1794583800000,
  setupRevision: 2,
  detailsConfigured: false,
);

HostEventsState eventsReady({
  bool programmes = true,
  bool historyLoading = false,
}) => HostEventsState(
  status: HostEventsStatus.ready,
  upcoming: comingEvents,
  drafts: const [draftItem],
  past: [pastEvent],
  programmes: programmes
      ? [
          OrganizerProgramListRow(
            programId: 'wedding',
            title: "Aditi and Kabir's wedding",
            kind: 'wedding',
            status: 'active',
            timezone: 'Asia/Kolkata',
            revision: 4,
            startsAt: DateTime(2026, 12, 12),
            endsAt: DateTime(2026, 12, 14),
            functionCount: 5,
          ),
        ]
      : const [],
  historyLoading: historyLoading,
);

HostEventWorkspaceState workspaceReady({bool door = true}) =>
    HostEventWorkspaceState(
      status: HostEventWorkspaceStatus.ready,
      event: tonightEvent,
      newFaces: 9,
      people: const ['Aanya Mehta', 'Kabir Rao'],
      planSteps: 5,
      door: door ? const ['Kabir Rao'] : const [],
      doorChecked: true,
      ticketSalesMinor: 1297400,
    );

HostEventRosterInsight _insight(
  String id, {
  int prior = 3,
  bool first = false,
}) => HostEventRosterInsight(
  attendeeId: id,
  contactId: null,
  availability: HostRosterInsightAvailability.ready,
  signals: {if (first) HostRosterInsightSignal.firstTime},
  priorAttendedEventCount: prior,
  priorExpectedEventCount: prior,
  priorNoShowCount: 0,
  lastAttendedAt: null,
  attendanceRate: null,
  catchSpend: const [],
);

HostEventGuestsState guestsReady() => HostEventGuestsState(
  status: HostEventGuestsStatus.ready,
  event: tonightEvent,
  firstTime: 9,
  lists: {
    HostEventGuestList.booked: [
      HostEventGuest(
        id: 'a-aanya',
        name: 'Aanya Sharma',
        uid: 'u-aanya',
        insight: _insight('a-aanya', prior: 10),
      ),
      HostEventGuest(
        id: 'a-dev',
        name: 'Dev Patel',
        uid: 'u-dev',
        insight: _insight('a-dev', prior: 0, first: true),
      ),
    ],
    HostEventGuestList.asked: const [
      HostEventGuest(id: 'u-zoya', name: 'Zoya Merchant', uid: 'u-zoya'),
    ],
    HostEventGuestList.waitlist: const [
      HostEventGuest(id: 'a-nikhil', name: 'Nikhil Rao', uid: 'u-nikhil'),
    ],
    HostEventGuestList.cancelled: const [],
  },
);

EventAttendee eventsAttendee(
  String id,
  String name, {
  EventAttendeeStatus status = EventAttendeeStatus.registered,
}) => EventAttendee(
  id: id,
  eventId: tonightEvent.id,
  organizerId: eventsOrganizerId,
  displayName: name,
  searchName: name.toLowerCase(),
  source: EventAttendeeSource.catchBooking,
  status: status,
  createdAt: eventsDoors,
  updatedAt: eventsDoors,
);

HostEventCloseOutState closeOutReady() => HostEventCloseOutState(
  status: HostEventCloseOutStatus.ready,
  eventTitle: tonightEvent.title,
  came: 26,
  booked: 28,
  unchecked: [
    eventsAttendee('a-ishaan', 'Ishaan Bose'),
    eventsAttendee('a-neel', 'Neel Verma'),
  ],
);

const publishReady = HostEventPublishState(
  status: HostEventPublishStatus.ready,
  eventTitle: 'Tuesday Trivia Night',
  published: true,
  canPublish: true,
  setupRevision: 3,
);

EventSuccessPlan eventsPlan() =>
    EventSuccessPlan.defaultForEvent(tonightEvent, now: eventsNow);

HostEventPlanState planReady() {
  final plan = eventsPlan();
  final steps = <HostEventPlanStep>[];
  var startsAt = eventsDoors;
  for (final step in EventSuccessRuntime(
    plan: plan,
    event: tonightEvent,
    now: eventsDoors,
  ).runOfShowSteps) {
    steps.add(HostEventPlanStep(step: step, startsAt: startsAt));
    startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
  }
  return HostEventPlanState(
    status: HostEventPlanStatus.ready,
    eventTitle: tonightEvent.title,
    plan: plan,
    formatLabel: 'Trivia',
    playbookTitle: plan.playbook.title,
    steps: steps,
    unitKind: plan.structureConfig.unitKind,
    unitSize: plan.structureConfig.unitSize,
    unitCount: plan.structureConfig.unitCount ?? 8,
    options: hostEventPlanOptions(plan),
    editable: true,
  );
}

HostRehearsalState rehearsalReady() {
  final steps = planReady().steps;
  return HostRehearsalState(
    status: HostRehearsalStatus.running,
    title: tonightEvent.title,
    guests: 6,
    steps: [
      for (final (index, step) in steps.indexed)
        HostRehearsalStep(
          step: step.step,
          progress: index == 0
              ? HostEventStepProgress.done
              : index == 1
              ? HostEventStepProgress.now
              : HostEventStepProgress.next,
        ),
    ],
  );
}
