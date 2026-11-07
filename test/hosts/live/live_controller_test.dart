import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_presence_summary_provider.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../event_success/event_assistance_cases_fixtures.dart';
import '../../event_success/event_assistance_deliveries_fixtures.dart';
import '../../events/events_test_helpers.dart';
import 'live_fixtures.dart';

class _Cases extends Fake implements EventAssistanceCasesRepository {
  @override
  Stream<EventAssistanceCasesPage> watchPage(
    EventAssistanceCaseQuery query, {
    required String actorUid,
  }) => Stream.value(
    casesPage(
      rows: [
        caseRow(caseId: 'case:a-late')
          ..['receivedAt'] = 1500
          ..['displayName'] = 'Kabir',
        caseRow(caseId: 'case:b-early')..['displayName'] = 'Aanya',
      ],
    ),
  );
}

class _Deliveries extends Fake implements EventAssistanceDeliveriesRepository {
  @override
  Stream<EventAssistanceDeliveriesPage> watchPage(
    EventAssistanceDeliveryQuery query,
  ) => Stream.value(deliveryPage());
}

final _standings = EventSuccessStandings(
  id: liveEvent.id,
  eventId: liveEvent.id,
  organizerId: liveEvent.organizerId,
  unitOutcome: EventSuccessUnitOutcome.score,
  revision: 4,
  latestRoundIndex: 0,
  rounds: const [],
  entries: [liveStandings[1], liveStandings[0]],
  createdAt: liveDoors,
  updatedAt: liveDoors,
);

ProviderContainer _container({EventSuccessPlan? plan, bool planRead = true}) {
  final container = ProviderContainer.test(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value('host-1')),
      watchEventSuccessPlanProvider(liveEvent.id).overrideWith(
        (ref) => planRead ? Stream.value(plan) : const Stream.empty(),
      ),
      watchEventParticipationRosterProvider(
        liveEvent.id,
      ).overrideWith((ref) => Stream.value(EventParticipationRoster.empty())),
      watchEventSuccessStandingsProvider(
        liveEvent.id,
      ).overrideWith((ref) => Stream.value(_standings)),
      watchEventSuccessAssignmentsProvider(
        liveEvent.id,
      ).overrideWith((ref) => Stream.value(const [])),
      watchEventAttendeesProvider(
        liveEvent.id,
      ).overrideWith((ref) => Stream.value(const [])),
      eventSuccessPresenceSummaryProvider(
        organizerId: liveEvent.organizerId,
        eventId: liveEvent.id,
        eventStartMillis: liveEvent.startTime.millisecondsSinceEpoch,
      ).overrideWithValue(
        AsyncData(
          EventSuccessPresenceSummary(
            liveControlRevision: 7,
            nextRoundIndex: 1,
            policy: const EventSuccessPresencePolicy(
              heartbeatIntervalSeconds: 30,
              presentWindowSeconds: 90,
              likelyDepartedAfterSeconds: 300,
            ),
            entries: const [],
            lateArrivals: [liveArrival],
          ),
        ),
      ),
      eventAssistanceCasesRepositoryProvider.overrideWithValue(_Cases()),
      eventAssistanceDeliveriesRepositoryProvider.overrideWithValue(
        _Deliveries(),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<HostLiveState> _settle(ProviderContainer container) async {
  final provider = hostLiveControllerProvider(liveEvent);
  container.listen(provider, (_, _) {});
  for (var i = 0; i < 10; i++) {
    await container.pump();
    await Future<void>.delayed(Duration.zero);
  }
  return container.read(provider);
}

void main() {
  test('the console composes the plan, the room, the needs and the '
      'scoreboard from its listeners', () async {
    final state = await _settle(_container(plan: livePlan()));
    final steps = liveRunOfShow();

    expect(state.status, HostLiveStatus.running);
    expect(state.steps.map((step) => step.step.title), [
      for (final step in steps) step.title,
    ]);
    expect(state.steps.first.startsAt, liveDoors);
    expect(
      state.steps[1].startsAt,
      liveDoors.add(Duration(minutes: steps.first.durationMinutes)),
    );
    expect(state.steps.map((step) => step.status).take(3), [
      LivePlanStepStatus.done,
      LivePlanStepStatus.now,
      LivePlanStepStatus.next,
    ]);
    expect(state.checkedIn, 26);
    expect(state.booked, 30);
    expect(state.places, 30);
    expect(state.scores, isTrue);
    expect(state.standings.map((entry) => entry.unitLabel), [
      'Quizzy Rascals',
      'Harbour Lights',
    ]);
    expect(state.leader, 'Quizzy Rascals');
    expect(state.scoredRounds, 1);
    expect(state.presenceRevision, 7);
    expect(state.needsChecking, isFalse);
    expect(state.needs.map((need) => need.id), [
      'help-case:b-early',
      'help-case:a-late',
      'arrival-guest-rhea',
      'delivery-${deliveryId()}',
    ]);
  });

  test('a complete plan is finished with every step done', () async {
    final state = await _settle(
      _container(plan: livePlan(status: EventSuccessPlanStatus.complete)),
    );

    expect(state.status, HostLiveStatus.finished);
    expect(
      state.steps.every((step) => step.status == LivePlanStepStatus.done),
      isTrue,
    );
  });

  test('no saved plan is its own state; an unread plan is loading', () async {
    expect((await _settle(_container())).status, HostLiveStatus.noPlan);
    expect(
      (await _settle(_container(planRead: false))).status,
      HostLiveStatus.loading,
    );
  });

  test('the scores screen enters the round after the last saved one and '
      'offers the unrevealed round', () async {
    final container = _container(plan: livePlan());
    final provider = hostLiveScoresControllerProvider(liveEvent);
    container.listen(provider, (_, _) {});
    for (var i = 0; i < 10; i++) {
      await container.pump();
      await Future<void>.delayed(Duration.zero);
    }
    final state = container.read(provider);

    expect(state.status, HostLiveScoresStatus.ready);
    expect(state.units.map((unit) => unit.label), [
      'Quizzy Rascals',
      'Harbour Lights',
    ]);
    expect(state.units.first.total, 41);
    expect(state.roundIndex, 1);
    expect(state.standingsRevision, 4);
    expect(state.revealRoundIndex, 0);
    expect(state.countdownSeconds, 10);
  });

  test('a night that moves keeps the movement console', () {
    expect(hostLiveConsoleFits(liveEvent), isTrue);
    expect(
      hostLiveConsoleFits(
        buildEvent(
          eventFormat: EventFormatSnapshot.fromActivityKind(
            ActivityKind.socialRun,
          ),
        ),
      ),
      isFalse,
    );
    expect(
      hostLiveConsoleFits(
        buildEvent(
          eventFormat: EventFormatSnapshot.fromActivityKind(
            ActivityKind.pubQuiz,
          ),
          itinerary: const [
            EventItineraryItem(
              id: 'stop-2',
              kind: EventItineraryKind.stop,
              offsetMinutes: 60,
              title: 'Second bar',
              location: EventMeetingLocation(
                name: 'Bar',
                latitude: 19,
                longitude: 72,
              ),
            ),
          ],
        ),
      ),
      isFalse,
    );
  });
}
