import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart'
    show buildEvent, buildPublicProfile, buildUser;

void main() {
  group('EventSuccessRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late EventSuccessRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = EventSuccessRepository(firestore, functions: functions);
    });

    test('creates a default host plan for an event once', () async {
      final event = buildEvent(capacityLimit: 28);

      final plan = await repository.ensurePlanForEvent(event);
      final samePlan = await repository.ensurePlanForEvent(event);

      expect(plan.eventId, 'event-1');
      expect(plan.organizerId, event.organizerId);
      expect(plan.targetAttendeeCount, 28);
      expect(plan.playbookId, EventSuccessPlaybookLibrary.socialRun.id);
      expect(
        plan.selectedModuleIds,
        containsAll(plan.playbook.nonConfigurableModuleIds),
      );
      expect(samePlan.createdAt, plan.createdAt);
      final rawPlan = await firestore
          .collection('eventSuccessPlans')
          .doc(event.id)
          .get();
      expect(rawPlan.data(), isNot(contains('liveControlRevision')));
      expect(rawPlan.data(), isNot(contains('assignmentDraftRevision')));
      expect(rawPlan.data(), isNot(contains('publishedRotationRoundIndex')));
      expect(rawPlan.data(), isNot(contains('publishedRevealRoundIndex')));
    });

    test('fetches a saved plan by event id', () async {
      final event = buildEvent();

      expect(await repository.fetchPlan(event.id), isNull);

      final plan = await repository.ensurePlanForEvent(event);
      final fetched = await repository.fetchPlan(event.id);

      expect(fetched?.eventId, plan.eventId);
      expect(fetched?.organizerId, plan.organizerId);
      expect(fetched?.playbookId, plan.playbookId);
    });

    test(
      'saves host setup and routes live steps through the fenced callable',
      () async {
        final event = buildEvent();
        final plan = await repository.ensurePlanForEvent(event);
        final draft = plan.hostDraft
            .withModuleSelection('wingman_requests', false)
            .copyWith(
              conversationGraphConsentMode:
                  EventSuccessConversationGraphConsentMode.optOut,
            );

        await repository.savePlan(
          plan.copyWithDraft(draft, updatedAt: plan.updatedAt),
          expectedUpdatedAt: plan.updatedAt,
        );
        await repository.updateActiveStep(
          eventId: event.id,
          activeStepIndex: 2,
          expectedRevision: 7,
        );

        final saved = await repository.watchPlan(event.id).first;
        expect(saved, isNotNull);
        expect(saved!.activeStepIndex, 0);
        expect(saved.hasModule('wingman_requests'), isTrue);
        expect(
          saved.conversationGraphConsentMode,
          EventSuccessConversationGraphConsentMode.optOut,
        );
        final callable =
            functions.httpsCallable('controlEventSuccessLive')
                as TestHttpsCallable;
        expect(callable.calls, [
          {
            'eventId': event.id,
            'expectedRevision': 7,
            'action': 'setActiveStep',
            'activeStepIndex': 2,
          },
        ]);
      },
    );

    test(
      'sends confirmed reveal actions through the fenced callable',
      () async {
        await repository.startLiveRevealCountdown(
          eventId: 'event-1',
          roundIndex: 0,
          expectedRevision: 3,
          confirmed: true,
        );
        await repository.revealLiveRound(
          eventId: 'event-1',
          roundIndex: 0,
          expectedRevision: 4,
          confirmed: true,
        );
        await repository.cancelLiveRevealCountdown(
          eventId: 'event-1',
          expectedRevision: 5,
        );

        final callable =
            functions.httpsCallable('controlEventSuccessLive')
                as TestHttpsCallable;
        expect(callable.calls, [
          {
            'eventId': 'event-1',
            'expectedRevision': 3,
            'action': 'startRevealCountdown',
            'roundIndex': 0,
            'confirmed': true,
          },
          {
            'eventId': 'event-1',
            'expectedRevision': 4,
            'action': 'publishReveal',
            'roundIndex': 0,
            'confirmed': true,
          },
          {
            'eventId': 'event-1',
            'expectedRevision': 5,
            'action': 'cancelRevealCountdown',
          },
        ]);
      },
    );

    test(
      'sends accountability acknowledgement and attendee resolutions',
      () async {
        await repository.completePlan(
          eventId: 'event-1',
          expectedRevision: 8,
          accountabilityAcknowledged: true,
        );
        await repository.setAccountabilityResolution(
          eventId: 'event-1',
          attendeeId: 'imported-guest-1',
          resolution: EventSuccessAccountabilityResolution.returned,
        );
        await repository.setAccountabilityResolution(
          eventId: 'event-1',
          attendeeId: 'imported-guest-1',
          resolution: null,
        );

        final live =
            functions.httpsCallable('controlEventSuccessLive')
                as TestHttpsCallable;
        expect(live.calls, [
          {
            'eventId': 'event-1',
            'expectedRevision': 8,
            'action': 'complete',
            'accountabilityAcknowledged': true,
          },
        ]);
        final resolution =
            functions.httpsCallable('setEventSuccessAccountabilityResolution')
                as TestHttpsCallable;
        expect(resolution.calls, [
          {
            'eventId': 'event-1',
            'attendeeId': 'imported-guest-1',
            'resolution': 'returned',
          },
          {
            'eventId': 'event-1',
            'attendeeId': 'imported-guest-1',
            'resolution': 'unresolved',
          },
        ]);
      },
    );

    test('watches standings and records a typed outcome round', () async {
      final now = DateTime.utc(2026, 8, 13, 12);
      await firestore.collection('eventSuccessStandings').doc('event-1').set({
        'eventId': 'event-1',
        'organizerId': 'club-1',
        'unitOutcome': 'score',
        'revision': 1,
        'latestRoundIndex': 0,
        'rounds': [
          {
            'roundIndex': 0,
            'entries': [
              {
                'unitId': 'team-a',
                'unitLabel': 'Team A',
                'position': 1,
                'value': 4,
                'roundsRecorded': 1,
              },
            ],
          },
        ],
        'entries': [
          {
            'unitId': 'team-a',
            'unitLabel': 'Team A',
            'position': 1,
            'value': 4,
            'roundsRecorded': 1,
          },
        ],
        'createdAt': now,
        'updatedAt': now,
      });

      final standings = await repository
          .watchStandingsForEvent('event-1')
          .first;
      expect(standings?.entries.single.value, 4);

      await repository.recordUnitOutcomes(
        eventId: 'event-1',
        expectedRevision: 1,
        roundIndex: 1,
        entries: const [
          EventSuccessScoreOutcomeInput(
            unitId: 'team-a',
            unitLabel: 'Team A',
            score: 7,
          ),
        ],
      );

      final callable =
          functions.httpsCallable('recordEventSuccessUnitOutcomes')
              as TestHttpsCallable;
      expect(callable.calls, [
        {
          'eventId': 'event-1',
          'expectedRevision': 1,
          'roundIndex': 1,
          'entries': [
            {'unitId': 'team-a', 'unitLabel': 'Team A', 'score': 7},
          ],
        },
      ]);
    });

    test('writes attendee feedback under stable event-user id', () async {
      final event = buildEvent();
      final now = DateTime(2026, 5, 18, 12);
      final feedback = EventSuccessFeedback(
        id: eventSuccessFeedbackId(eventId: event.id, uid: 'runner-1'),
        eventId: event.id,
        organizerId: event.organizerId,
        uid: 'runner-1',
        welcomeRating: 5,
        structureRating: 4,
        metNewPeopleCount: 3,
        createdAt: now,
        updatedAt: now,
      );

      await repository.submitFeedback(feedback);

      final saved = await repository
          .watchFeedbackForUser(eventId: event.id, uid: 'runner-1')
          .first;
      expect(saved?.id, 'event-1_runner-1');
      expect(saved?.metNewPeopleCount, 3);
    });

    test('saves attendee micro-pod opt-out preference', () async {
      final event = buildEvent();

      await repository.setMicroPodsOptOut(
        event: event,
        uid: 'runner-1',
        optedOut: true,
      );

      final saved = await repository
          .watchPreferenceForUser(eventId: event.id, uid: 'runner-1')
          .first;
      expect(saved?.id, 'event-1_runner-1');
      expect(saved?.organizerId, 'club-1');
      expect(saved?.microPodsOptedOut, isTrue);

      await repository.setMicroPodsOptOut(
        event: event,
        uid: 'runner-1',
        optedOut: false,
      );

      final eventPreferences = await repository
          .watchPreferencesForEvent(event.id)
          .first;
      expect(eventPreferences.single.microPodsOptedOut, isFalse);
    });

    test(
      'saves guided-rotation opt-out without clearing micro-pod preference',
      () async {
        final event = buildEvent();

        await repository.setMicroPodsOptOut(
          event: event,
          uid: 'runner-1',
          optedOut: true,
        );
        await repository.setGuidedRotationsOptOut(
          event: event,
          uid: 'runner-1',
          optedOut: true,
        );

        final saved = await repository
            .watchPreferenceForUser(eventId: event.id, uid: 'runner-1')
            .first;
        expect(saved?.microPodsOptedOut, isTrue);
        expect(saved?.guidedRotationsOptedOut, isTrue);

        await repository.setGuidedRotationsOptOut(
          event: event,
          uid: 'runner-1',
          optedOut: false,
        );

        final updated = await repository
            .watchPreferenceForUser(eventId: event.id, uid: 'runner-1')
            .first;
        expect(updated?.microPodsOptedOut, isTrue);
        expect(updated?.guidedRotationsOptedOut, isFalse);
      },
    );

    test('saves attendee compatibility questionnaire answers', () async {
      final event = buildEvent();

      await repository.saveCompatibilityResponse(
        event: event,
        uid: 'runner-1',
        answerIds: const [
          'event_energy_new_people',
          'first_conversation_activity',
          'unknown-answer',
        ],
      );

      final saved = await repository
          .watchCompatibilityResponseForUser(eventId: event.id, uid: 'runner-1')
          .first;
      expect(
        saved?.id,
        eventSuccessCompatibilityResponseId(eventId: event.id, uid: 'runner-1'),
      );
      expect(saved?.organizerId, 'club-1');
      expect(saved?.answerIds, [
        'event_energy_new_people',
        'first_conversation_activity',
      ]);

      await repository.saveCompatibilityResponse(
        event: event,
        uid: 'runner-1',
        answerIds: const ['event_energy_playful_competition'],
      );

      final updated = await repository
          .watchCompatibilityResponseForUser(eventId: event.id, uid: 'runner-1')
          .first;
      expect(updated?.createdAt, saved?.createdAt);
      expect(updated?.answerIds, ['event_energy_playful_competition']);
    });

    test('calls server-owned wingman request callables', () async {
      final event = buildEvent();
      final target = buildPublicProfile(uid: 'runner-2', name: 'Riya');

      await repository.saveWingmanRequest(
        event: event,
        target: target,
        note: '  Please help us land in the same rotation.  ',
      );
      await repository.withdrawWingmanRequest(event: event);

      final submit =
          functions.httpsCallable('submitEventSuccessWingmanRequest')
              as TestHttpsCallable;
      final withdraw =
          functions.httpsCallable('withdrawEventSuccessWingmanRequest')
              as TestHttpsCallable;
      expect(submit.calls, [
        {
          'eventId': 'event-1',
          'targetUid': 'runner-2',
          'note': 'Please help us land in the same rotation.',
        },
      ]);
      expect(withdraw.calls, [
        {'eventId': 'event-1'},
      ]);
    });

    test(
      'watches server-owned micro-pod assignments for one attendee',
      () async {
        final now = DateTime(2026, 5, 21, 8);
        final assignment = EventSuccessAssignment(
          id: eventSuccessAssignmentId(
            eventId: 'event-1',
            moduleId: EventSuccessModuleCatalog.microPods.id,
            uid: 'runner-1',
          ),
          eventId: 'event-1',
          organizerId: 'club-1',
          uid: 'runner-1',
          moduleId: EventSuccessModuleCatalog.microPods.id,
          label: 'Pod A',
          displayTitle: 'Pod A',
          displaySubtitle: '4 people in this event pod.',
          peerUids: const ['runner-2', 'runner-3', 'runner-4'],
          groupRotationSlots: [
            EventSuccessGroupRotationSlot(
              roundIndex: 0,
              label: 'Round 1',
              unitLabel: 'Table A',
              startsAt: now,
              endsAt: now.add(const Duration(minutes: 20)),
              peerUids: const ['runner-2', 'runner-3'],
              compatibility: 'mixed',
            ),
          ],
          source: 'server_v1',
          createdAt: now,
          updatedAt: now,
        );
        await firestore
            .collection('eventSuccessAssignments')
            .doc(assignment.id)
            .set(assignment.toJson());

        final saved = await repository
            .watchAssignmentForUser(eventId: 'event-1', uid: 'runner-1')
            .first;

        expect(saved?.displayTitle, 'Pod A');
        expect(saved?.peerUids, ['runner-2', 'runner-3', 'runner-4']);
        expect(saved?.groupRotationSlots.single.unitLabel, 'Table A');
        expect(saved?.allPeerUids, ['runner-2', 'runner-3', 'runner-4']);
      },
    );

    test(
      'watches server-owned guided rotation assignments for event and attendee',
      () async {
        final now = DateTime(2026, 5, 21, 8);
        final rotationAssignment = EventSuccessAssignment(
          id: eventSuccessAssignmentId(
            eventId: 'event-1',
            moduleId: EventSuccessModuleCatalog.guidedRotations.id,
            uid: 'runner-1',
          ),
          eventId: 'event-1',
          organizerId: 'club-1',
          uid: 'runner-1',
          moduleId: EventSuccessModuleCatalog.guidedRotations.id,
          label: 'Guided rotations',
          displayTitle: '2 guided rotations',
          displaySubtitle: '15-minute pairings during the event.',
          peerUids: const ['runner-2'],
          rotationSlots: [
            EventSuccessRotationSlot(
              roundIndex: 0,
              label: 'Round 1',
              startsAt: now,
              endsAt: now.add(const Duration(minutes: 15)),
              peerUid: 'runner-2',
              compatibility: 'mutual_interest',
            ),
          ],
          source: 'server_v1',
          createdAt: now,
          updatedAt: now,
        );
        await firestore
            .collection('eventSuccessAssignments')
            .doc(rotationAssignment.id)
            .set(rotationAssignment.toJson());

        final savedForUser = await repository
            .watchRotationAssignmentForUser(eventId: 'event-1', uid: 'runner-1')
            .first;
        final savedForEvent = await repository
            .watchRotationAssignmentsForEvent(eventId: 'event-1')
            .first;

        expect(savedForUser?.displayTitle, '2 guided rotations');
        expect(savedForUser?.rotationSlots.single.peerUid, 'runner-2');
        expect(savedForEvent.single.uid, 'runner-1');
      },
    );

    test(
      'calls guided rotation override callable with round payload',
      () async {
        await repository.overrideGuidedRotations(
          eventId: 'event-1',
          expectedRevision: 6,
          rounds: const [
            EventSuccessRotationOverrideRound(
              roundIndex: 0,
              pairings: [
                EventSuccessRotationOverridePair(
                  uidA: 'runner-1',
                  uidB: 'runner-2',
                ),
              ],
            ),
          ],
        );

        final callable =
            functions.httpsCallable('overrideEventSuccessRotations')
                as TestHttpsCallable;
        expect(callable.calls, [
          {
            'eventId': 'event-1',
            'expectedRevision': 6,
            'rounds': [
              {
                'roundIndex': 0,
                'pairings': [
                  {'uidA': 'runner-1', 'uidB': 'runner-2'},
                ],
              },
            ],
          },
        ]);
      },
    );

    test('calls group override callable with group payload', () async {
      await repository.overrideGroupAssignments(
        eventId: 'event-1',
        rounds: const [
          EventSuccessGroupOverrideRound(
            roundIndex: 0,
            groups: [
              EventSuccessGroupOverrideUnit(
                label: 'Table A',
                participantUids: ['runner-1', 'runner-2', 'runner-3'],
              ),
            ],
          ),
        ],
      );

      final callable =
          functions.httpsCallable('overrideEventSuccessGroups')
              as TestHttpsCallable;
      expect(callable.calls, [
        {
          'eventId': 'event-1',
          'rounds': [
            {
              'roundIndex': 0,
              'groups': [
                {
                  'label': 'Table A',
                  'participantUids': ['runner-1', 'runner-2', 'runner-3'],
                },
              ],
            },
          ],
        },
      ]);
    });

    test('fetches wingman request candidates through callable', () async {
      final profile = buildPublicProfile(
        uid: 'runner-2',
        name: 'Rhea',
        gender: Gender.woman,
      );
      functions.setResponse('fetchEventSuccessWingmanCandidates', {
        'profiles': [
          {'uid': profile.uid, ...profile.toJson()},
        ],
      });

      final candidates = await repository.fetchWingmanRequestCandidates(
        eventId: 'event-1',
        currentUser: buildUser(),
      );

      final callable =
          functions.httpsCallable('fetchEventSuccessWingmanCandidates')
              as TestHttpsCallable;
      expect(callable.calls, [
        {'eventId': 'event-1'},
      ]);
      expect(candidates.map((profile) => profile.uid), ['runner-2']);
      expect(candidates.single.name, 'Rhea');
    });
  });
}

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  void setResponse(String name, Object? response) {
    (httpsCallable(name) as TestHttpsCallable).response = response;
  }

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? response;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(response as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}
