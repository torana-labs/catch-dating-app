import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../event_success/event_assistance_cases_fixtures.dart';
import '../../event_success/event_assistance_deliveries_fixtures.dart';
import '../../events/events_test_helpers.dart';

/// Doors at 7:30 PM on a Tuesday.
final liveDoors = DateTime(2026, 10, 27, 19, 30);

final liveEvent = buildEvent(
  organizerId: 'organizer-1',
  name: 'Tuesday Trivia Night',
  startTime: liveDoors,
  endTime: liveDoors.add(const Duration(hours: 3)),
  capacityLimit: 30,
  bookedCount: 30,
  checkedInCount: 26,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
);

EventSuccessPlan livePlan({
  int activeStepIndex = 1,
  EventSuccessPlanStatus status = EventSuccessPlanStatus.live,
}) => EventSuccessPlan.defaultForEvent(
  liveEvent,
  now: liveDoors,
).copyWith(activeStepIndex: activeStepIndex, status: status);

/// Tonight's run of show as the console schedules it from the doors.
List<EventRunOfShowStep> liveRunOfShow() => EventSuccessRuntime(
  plan: livePlan(),
  event: liveEvent,
  now: liveDoors,
).runOfShowSteps;

List<HostLivePlanStep> livePlanSteps(int activeIndex, {bool done = false}) {
  final steps = <HostLivePlanStep>[];
  var startsAt = liveDoors;
  for (final (index, step) in liveRunOfShow().indexed) {
    steps.add(
      HostLivePlanStep(
        step: step,
        startsAt: startsAt,
        status: done || index < activeIndex
            ? LivePlanStepStatus.done
            : index == activeIndex
            ? LivePlanStepStatus.now
            : LivePlanStepStatus.next,
      ),
    );
    startsAt = startsAt.add(Duration(minutes: step.durationMinutes));
  }
  return steps;
}

/// Asked two minutes before the capture clock, four minutes into round two.
final int _askedAt = liveDoors
    .add(const Duration(minutes: 14))
    .millisecondsSinceEpoch;

AssistanceOpenHostCase liveHelpRequest({
  String caseId = 'case:one',
  String name = 'Aanya',
}) =>
    casesPage(
          rows: [
            caseRow(caseId: caseId)
              ..['displayName'] = name
              ..['receivedAt'] = _askedAt,
          ],
          evaluatedAt: _askedAt,
        ).cases.single
        as AssistanceOpenHostCase;

AssistanceActionableDelivery liveDelivery() =>
    deliveryPage(
          rows: [
            deliveryRow(patch: {'displayName': 'Dev'}),
          ],
        ).deliveries.single
        as AssistanceActionableDelivery;

final liveArrival = EventSuccessLateArrivalCandidate(
  uid: 'guest-rhea',
  displayName: 'Rhea',
  checkedInAtMillis: liveDoors
      .add(const Duration(minutes: 12))
      .millisecondsSinceEpoch,
);

const liveStandings = [
  EventSuccessStandingEntry(
    unitId: 'qr',
    unitLabel: 'Quizzy Rascals',
    position: 1,
    value: 41,
    roundsRecorded: 1,
  ),
  EventSuccessStandingEntry(
    unitId: 'hl',
    unitLabel: 'Harbour Lights',
    position: 2,
    value: 38,
    roundsRecorded: 1,
  ),
];

HostLiveState liveState({
  int activeIndex = 1,
  HostLiveStatus status = HostLiveStatus.running,
  List<HostLiveNeed>? needs,
  List<HostLiveUnit> units = const [],
}) => HostLiveState(
  status: status,
  steps: livePlanSteps(activeIndex, done: status == HostLiveStatus.finished),
  activeIndex: activeIndex,
  liveControlRevision: 3,
  checkedIn: 26,
  booked: 30,
  places: 30,
  teams: 2,
  leader: 'Quizzy Rascals',
  needs:
      needs ??
      [HostLiveHelpNeed(liveHelpRequest()), HostLiveArrivalNeed(liveArrival)],
  standings: liveStandings,
  scoredRounds: 1,
  scores: true,
  units: units,
);
