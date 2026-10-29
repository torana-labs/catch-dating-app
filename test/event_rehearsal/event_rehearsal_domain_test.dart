import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_operations.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'projects selected format, structure and copied roster into Host runtime',
    () {
      final rehearsal = EventRehearsalBootstrap.fromCallableData({
        'session': {
          'id': 'session-runtime',
          'guestSource': 'event',
          'organizerId': 'organizer-1',
          'sourceEventId': null,
          'scenarioId': 'lateAndNoShow',
          'seed': 7,
          'actorCount': 8,
          'actionCount': 1,
          'status': 'running',
          'setup': {
            'title': 'Sunday run',
            'eventFormat': EventFormatSnapshot.fromActivityKind(
              ActivityKind.socialRun,
            ).toJson(),
            'successDefaults':
                EventSuccessDefaults.recommendedForActivity(
                      ActivityKind.socialRun,
                      targetAttendeeCount: 8,
                    )
                    .copyWith(
                      structureConfig:
                          const EventSuccessStructureConfig.legacyDefault()
                              .copyWith(
                                unitKind: EventSuccessUnitKind.teams,
                                unitSize: 3,
                                unitCount: 3,
                              ),
                    )
                    .toJson(),
            'locationName': 'Courtyard',
            'durationMinutes': 90,
            'hostGoal': 'Learn the runtime',
            'attendeePrompt': 'Meet someone new',
            'moduleIds': ['arrival', 'rotations'],
          },
          'setupRevision': 1,
          'runtimeRevision': 4,
          'activeStepIndex': 1,
          'virtualNowMillis': 100000,
          'faultId': 'none',
          'expiresAtMillis': 900000,
        },
        'actors': [
          {
            'actorId': 'actor-present',
            'displayName': 'Maya',
            'persona': 'firstTimer',
            'status': 'present',
            'guestMoment': 'assignment',
            'optedOut': false,
            'keepApartActorIds': <String>[],
            'helpRequested': false,
            'promptCompleted': false,
            'layoutUnitId': 'table-2',
            'confirmedLayoutUnitId': 'table-2',
          },
          {
            'actorId': 'actor-late',
            'displayName': 'Jordan',
            'persona': 'lateArrival',
            'status': 'late',
            'guestMoment': 'assignment',
            'optedOut': false,
            'keepApartActorIds': <String>[],
            'helpRequested': false,
            'promptCompleted': false,
          },
        ],
        'actions': <Map<String, Object?>>[],
        'guestUrl': 'https://catchdates.com/rehearse/public-runtime',
        'canUseInternalFaults': true,
      });

      final runtime = buildEventRehearsalRuntimeProjection(
        rehearsal,
        practiceGuestLabel: 'Practice guest',
        latePracticeGuestLabel: 'Late arrival · Practice guest',
      );

      expect(runtime.event.synthetic, isTrue);
      expect(runtime.plan.status, EventSuccessPlanStatus.live);
      expect(runtime.plan.liveControlRevision, 4);
      expect(runtime.roster.checkedInIds, ['actor-present', 'actor-late']);
      expect(runtime.event.title, 'Sunday run');
      expect(runtime.event.eventFormat.activityKind, ActivityKind.socialRun);
      expect(runtime.plan.structureConfig.unitKind, EventSuccessUnitKind.teams);
      expect(runtime.plan.structureConfig.unitSize, 3);
      expect(runtime.layout.units, hasLength(3));
      expect(runtime.layout.units.first.capacity, 3);
      expect(runtime.profiles, isEmpty);
      expect(runtime.presence.entries.first.displayName, 'Maya');
      expect(runtime.assignments.first.displayTitle, 'Maya');
      expect(runtime.assignments, hasLength(2));
      expect(runtime.assignments.first.confirmedLayoutUnitId, isNotNull);
      expect(runtime.assignments.first.layoutUnitId, 'table-2');
      expect(runtime.assignments.last.confirmedLayoutUnitId, isNull);
      expect(runtime.presence.lateArrivals.single.uid, 'actor-late');
    },
  );
  test('parses a bounded isolated rehearsal projection', () {
    final rehearsal = EventRehearsalBootstrap.fromCallableData({
      'session': {
        'id': 'session-1',
        'organizerId': 'organizer-1',
        'sourceEventId': null,
        'scenarioId': 'lateAndNoShow',
        'seed': 42,
        'actorCount': 12,
        'actionCount': 3,
        'status': 'running',
        'setup': {
          'title': 'Practice',
          'locationName': 'Studio',
          'durationMinutes': 120,
          'hostGoal': 'Learn',
          'attendeePrompt': 'Say hello',
          'moduleIds': ['arrival', 'firstHello'],
          'movementSimulation': {
            'itinerary': [
              {
                'id': 'stop-1',
                'kind': 'stop',
                'offsetMinutes': 30,
                'durationMinutes': 20,
                'title': 'Courtyard stop',
              },
            ],
            'routePlan': {
              'version': 2,
              'movementMode': 'walk',
              'routeShape': 'pointToPoint',
              'groupStrategy': 'together',
              'stopCadence': 'hostedStops',
              'stopKinds': ['venue'],
              'roleKinds': ['routeLead'],
              'path': [
                {'latitude': 12.9716, 'longitude': 77.5946},
                {'latitude': 12.975, 'longitude': 77.6},
              ],
              'paceGroups': [],
              'liveTrackingPolicy': {
                'mode': 'hostOnly',
                'staleAfterSeconds': 120,
                'retentionMinutes': 60,
              },
            },
            'livePositions': [
              {
                'role': 'host',
                'latitude': 12.972,
                'longitude': 77.595,
                'recordedOffsetMinutes': 15,
              },
            ],
            'lateArrivalGuidance': 'Meet the group at Courtyard stop.',
          },
        },
        'setupRevision': 1,
        'runtimeRevision': 3,
        'activeStepIndex': 2,
        'virtualNowMillis': 1,
        'faultId': 'none',
        'expiresAtMillis': 86400001,
      },
      'actors': [
        {
          'actorId': 'actor-01',
          'displayName': 'Rhea',
          'persona': 'firstTimer',
          'status': 'present',
          'guestMoment': 'firstHello',
          'optedOut': false,
          'keepApartActorIds': <String>[],
          'helpRequested': false,
          'promptCompleted': false,
          'layoutUnitId': 'table-2',
          'confirmedLayoutUnitId': 'table-2',
        },
      ],
      'actions': [
        {
          'clientActionId': 'action-1',
          'actorId': 'actor-01',
          'kind': 'behavior',
          'name': 'arrive',
          'runtimeRevision': 3,
          'virtualNowMillis': 1,
        },
      ],
      'guestUrl': 'https://catchdates.com/rehearse/public-1',
      'canUseInternalFaults': true,
    });

    expect(rehearsal.session.actionCount, 3);
    expect(rehearsal.session.canEditSetup, isFalse);
    expect(rehearsal.presentCount, 1);
    expect(rehearsal.unresolvedCount, 0);
    expect(rehearsal.canUseInternalFaults, isTrue);
    final movement = rehearsal.session.setup.movementSimulation;
    expect(movement, isNotNull);
    expect(movement!.itinerary.single.kind, EventItineraryKind.stop);
    expect(movement.routePlan?.version, 2);
    expect(movement.routePlan?.path, hasLength(2));
    expect(movement.livePositions.single.role, 'host');
    expect(
      rehearsal.session.setup.toJson()['movementSimulation'],
      isA<Map<String, Object?>>(),
    );
    final runtime = buildEventRehearsalRuntimeProjection(
      rehearsal,
      practiceGuestLabel: 'Practice guest',
      latePracticeGuestLabel: 'Late arrival · Practice guest',
    );
    expect(runtime.event.itinerary.single.title, 'Courtyard stop');
    expect(runtime.event.eventFormat.routePlan?.path, hasLength(2));
  });

  test('rejects malformed callable projections', () {
    expect(
      () => EventRehearsalBootstrap.fromCallableData(const {}),
      throwsFormatException,
    );
  });

  test('maps reserved behavior wire values explicitly', () {
    expect(EventRehearsalBehavior.returnActor.wireValue, 'return');
    expect(EventRehearsalBehavior.arriveLate.wireValue, 'arriveLate');
  });

  test('projects rehearsal state into the canonical Host runtime', () {
    final rehearsal = EventRehearsalBootstrap.fromCallableData({
      'session': {
        'id': 'session-runtime',
        'organizerId': 'organizer-1',
        'sourceEventId': null,
        'scenarioId': 'lateAndNoShow',
        'seed': 7,
        'actorCount': 8,
        'actionCount': 1,
        'status': 'running',
        'setup': {
          'title': 'Sunday mixer',
          'locationName': 'Courtyard',
          'durationMinutes': 90,
          'hostGoal': 'Learn the runtime',
          'attendeePrompt': 'Meet someone new',
          'moduleIds': ['arrival', 'rotations', 'reveal'],
          'unitOutcome': 'score',
        },
        'setupRevision': 1,
        'runtimeRevision': 4,
        'activeStepIndex': 1,
        'virtualNowMillis': 100000,
        'faultId': 'none',
        'expiresAtMillis': 900000,
      },
      'actors': [
        {
          'actorId': 'actor-present',
          'displayName': 'Maya',
          'persona': 'firstTimer',
          'status': 'present',
          'guestMoment': 'assignment',
          'optedOut': false,
          'keepApartActorIds': <String>[],
          'helpRequested': false,
          'promptCompleted': false,
          'layoutUnitId': 'table-2',
          'confirmedLayoutUnitId': 'table-2',
        },
        {
          'actorId': 'actor-late',
          'displayName': 'Jordan',
          'persona': 'lateArrival',
          'status': 'late',
          'guestMoment': 'assignment',
          'optedOut': false,
          'keepApartActorIds': <String>[],
          'helpRequested': false,
          'promptCompleted': false,
          'layoutUnitId': 'table-1',
        },
      ],
      'outcomeReview': {
        'unitOutcome': 'score',
        'revision': 3,
        'unitIds': ['table-1', 'table-2'],
        'records': [
          {
            'unitId': 'table-1',
            'round': 0,
            'outcome': {'kind': 'score', 'score': 7},
            'stateRevision': 1,
            'recordedAt': 90000,
          },
          {
            'unitId': 'table-2',
            'round': 0,
            'outcome': {'kind': 'score', 'score': 9},
            'stateRevision': 2,
            'recordedAt': 91000,
          },
          {
            'unitId': 'table-1',
            'round': 1,
            'outcome': {'kind': 'score', 'score': 2},
            'stateRevision': 3,
            'recordedAt': 92000,
          },
        ],
      },
      'revealReview': {
        'revision': 1,
        'status': 'countingDown',
        'publishedRound': -1,
        'pendingRound': 0,
        'startedAt': 100000,
        'countdownSeconds': 15,
      },
      'actions': <Map<String, Object?>>[],
      'guestUrl': 'https://catchdates.com/rehearse/public-runtime',
      'canUseInternalFaults': true,
    });

    final runtime = buildEventRehearsalRuntimeProjection(
      rehearsal,
      practiceGuestLabel: 'Practice guest',
      latePracticeGuestLabel: 'Late arrival · Practice guest',
    );

    expect(runtime.event.synthetic, isTrue);
    expect(runtime.plan.status, EventSuccessPlanStatus.live);
    expect(runtime.plan.liveControlRevision, 4);
    expect(runtime.plan.revealStatus, EventSuccessRevealStatus.countingDown);
    expect(runtime.plan.activeRevealRoundIndex, 0);
    expect(runtime.plan.structureConfig.revealCountdownSeconds, 15);
    expect(runtime.plan.revealStartedAt?.millisecondsSinceEpoch, 100000);
    expect(
      EventSuccessActivityProfile.forFormat(
        runtime.event.eventFormat,
      ).unitOutcome,
      EventSuccessUnitOutcome.score,
    );
    expect(rehearsal.session.setup.unitOutcome, RehearsalOutcomeKind.score);
    expect(rehearsal.session.setup.toJson()['unitOutcome'], 'score');
    expect(runtime.roster.checkedInIds, ['actor-present', 'actor-late']);
    expect(runtime.layout.units, hasLength(2));
    expect(runtime.assignments, hasLength(2));
    expect(runtime.assignments.first.confirmedLayoutUnitId, isNotNull);
    expect(runtime.assignments.first.layoutUnitId, 'table-2');
    expect(runtime.assignments.last.confirmedLayoutUnitId, isNull);
    expect(runtime.presence.lateArrivals.single.uid, 'actor-late');
    expect(runtime.outcomeUnits.map((unit) => (unit.id, unit.label)), [
      ('table-1', 'Table 1'),
      ('table-2', 'Table 2'),
    ]);
    expect(runtime.standings?.revision, 3);
    expect(runtime.standings?.latestRoundIndex, 0);
    expect(runtime.standings?.rounds, hasLength(1));
    expect(runtime.standings?.entries.first.unitId, 'table-2');
    expect(runtime.standings?.entries.first.value, 9);
  });
}
