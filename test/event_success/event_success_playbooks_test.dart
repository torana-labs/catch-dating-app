import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_coach.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;

void main() {
  group('EventSuccessPlaybookLibrary', () {
    test('marks the event success layer as live-wired and iterating', () {
      expect(
        eventSuccessLayerDevelopmentStatus,
        'live_wired_with_preview_lab_and_iterating',
      );
    });

    test('includes playbooks beyond clubs', () {
      final activities = EventSuccessPlaybookLibrary.all
          .map((playbook) => playbook.activityType)
          .toSet();

      expect(activities, contains(ActivityKind.socialRun));
      expect(activities, contains(ActivityKind.pickleball));
      expect(activities, contains(ActivityKind.pubQuiz));
      expect(activities, contains(ActivityKind.singlesMixer));
    });

    test(
      'social event playbook keeps live phone use away from the actual event',
      () {
        final event = EventSuccessPlaybookLibrary.socialRun;
        final activitySteps = event.runOfShow.where(
          (step) => step.stage == EventSuccessStage.activity,
        );

        expect(activitySteps, isNotEmpty);
        expect(
          activitySteps.expand((step) => step.moduleIds),
          isNot(contains(EventSuccessModuleCatalog.checkIn.id)),
        );
        expect(
          event.moduleIds,
          contains(EventSuccessModuleCatalog.wingmanRequests.id),
        );
        expect(
          event.moduleIds,
          contains(EventSuccessModuleCatalog.safetyControls.id),
        );
      },
    );

    test('all run-of-show module ids refer to modules in their playbook', () {
      for (final playbook in EventSuccessPlaybookLibrary.all) {
        for (final step in playbook.runOfShow) {
          expect(
            playbook.moduleIds,
            containsAll(step.moduleIds),
            reason:
                '${playbook.id} references missing modules in ${step.title}',
          );
        }
      }
    });

    test('catalog owns the complete non-configurable module set', () {
      expect(
        EventSuccessModuleCatalog.all
            .where((module) => !module.hostConfigurable)
            .map((module) => module.id)
            .toSet(),
        {
          EventSuccessModuleCatalog.crowdBalance.id,
          EventSuccessModuleCatalog.checkIn.id,
          EventSuccessModuleCatalog.wingmanRequests.id,
          EventSuccessModuleCatalog.contextualOpeners.id,
          EventSuccessModuleCatalog.decomposedFeedback.id,
          EventSuccessModuleCatalog.hostAnalytics.id,
          EventSuccessModuleCatalog.safetyControls.id,
        },
      );
      expect(EventSuccessModuleCatalog.microPods.hostConfigurable, isTrue);
      expect(
        EventSuccessModuleCatalog.compatibilityQuestionnaire.hostConfigurable,
        isTrue,
      );
    });

    test('compatibility questionnaire is a reusable opt-in module', () {
      for (final playbook in EventSuccessPlaybookLibrary.all) {
        expect(
          playbook.moduleIds,
          contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
          reason: '${playbook.id} should expose compatibility as a module',
        );
        final draft = EventSuccessHostDraft.fromPlaybook(playbook);
        if (playbook.activityType == ActivityKind.singlesMixer) {
          expect(
            draft.selectedModuleIds,
            contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
            reason:
                '${playbook.id} is the dating-forward format where questionnaire is part of the recommended setup',
          );
        } else {
          expect(
            draft.selectedModuleIds,
            isNot(
              contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
            ),
            reason:
                '${playbook.id} should not treat compatibility as the event type',
          );
        }
      }

      final runDraft = EventSuccessHostDraft.fromPlaybook(
        EventSuccessPlaybookLibrary.socialRun,
      ).toggleModule(EventSuccessModuleCatalog.compatibilityQuestionnaire.id);

      expect(
        runDraft.selectedModuleIds,
        contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
      );
      expect(runDraft.questionnaireConfig.pack.title, 'Balanced');
    });

    test('First Hello is an optional arrival module across playbooks', () {
      for (final playbook in EventSuccessPlaybookLibrary.all) {
        expect(
          playbook.moduleIds,
          contains(EventSuccessModuleCatalog.firstHelloCheckIn.id),
          reason: '${playbook.id} should expose First Hello as a module',
        );
      }

      final socialRunDraft = EventSuccessHostDraft.fromPlaybook(
        EventSuccessPlaybookLibrary.socialRun,
      );
      final mixerProfile = EventSuccessActivityProfile.forActivity(
        ActivityKind.singlesMixer,
      );

      expect(
        EventSuccessModuleCatalog.firstHelloCheckIn.productLayer,
        EventSuccessProductLayer.rosterAttendance,
      );
      expect(
        socialRunDraft.selectedModuleIds,
        isNot(contains(EventSuccessModuleCatalog.firstHelloCheckIn.id)),
      );
      expect(
        mixerProfile.isSelectable(
          EventSuccessModuleCatalog.firstHelloCheckIn.id,
        ),
        isTrue,
      );
      expect(
        mixerProfile.defaultModuleIds,
        isNot(contains(EventSuccessModuleCatalog.firstHelloCheckIn.id)),
      );
      expect(
        mixerProfile
            .recommendationFor(EventSuccessModuleCatalog.firstHelloCheckIn.id)
            ?.reason,
        contains('location-verified first hello'),
      );
    });

    test('module lookup throws for unknown module ids', () {
      expect(
        EventSuccessModuleCatalog.byId(
          EventSuccessModuleCatalog.wingmanRequests.id,
        ),
        EventSuccessModuleCatalog.wingmanRequests,
      );
      expect(
        () => EventSuccessModuleCatalog.byId('not_a_module'),
        throwsArgumentError,
      );
    });

    test('groups legacy modules into the simplified product layers', () {
      final socialRun = EventSuccessPlaybookLibrary.socialRun;
      final layers = socialRun.modulesByProductLayer;

      expect(
        layers[EventSuccessProductLayer.rosterAttendance],
        containsAll([
          EventSuccessModuleCatalog.crowdBalance,
          EventSuccessModuleCatalog.checkIn,
        ]),
      );
      expect(
        layers[EventSuccessProductLayer.assignments],
        contains(EventSuccessModuleCatalog.microPods),
      );
      expect(
        EventSuccessModuleCatalog.socialMissions.productLayer,
        EventSuccessProductLayer.conversation,
      );
      expect(
        EventSuccessModuleCatalog.contextualOpeners.productLayer,
        EventSuccessProductLayer.conversation,
      );
      expect(
        EventSuccessModuleCatalog.liveReveal.productLayer,
        EventSuccessProductLayer.liveReveal,
      );
      expect(
        EventSuccessPlaybookLibrary.algorithmicMixer.moduleIds,
        contains(EventSuccessModuleCatalog.liveReveal.id),
      );
      expect(
        EventSuccessModuleCatalog.safetyControls.productLayer,
        EventSuccessProductLayer.safety,
      );
    });

    test('sets structure defaults from the activity interaction model', () {
      final runDraft = EventSuccessHostDraft.fromPlaybook(
        EventSuccessPlaybookLibrary.socialRun,
        targetAttendeeCount: 30,
      );
      final quizDraft = EventSuccessHostDraft.fromPlaybook(
        EventSuccessPlaybookLibrary.pubQuiz,
      );
      final pickleballDraft = EventSuccessHostDraft.fromPlaybook(
        EventSuccessPlaybookLibrary.pickleball,
      );

      expect(
        runDraft.structureConfig.unitKind,
        EventSuccessUnitKind.wholeGroup,
      );
      expect(runDraft.structureConfig.unitSize, 30);
      expect(quizDraft.structureConfig.unitKind, EventSuccessUnitKind.teams);
      expect(quizDraft.structureConfig.unitCount, isNull);
      expect(quizDraft.structureConfig.estimatedUnitCount(50), 10);
      expect(pickleballDraft.structureConfig.rotationIntervalMinutes, 15);
      expect(
        pickleballDraft.structureConfig.topology,
        EventSuccessTopology.sequence,
      );
      expect(
        pickleballDraft.structureConfig.resourceCapacity,
        const EventSuccessResourceCapacity(
          concurrentUnits: null,
          resourceLabelId: EventSuccessResourceLabelId.court,
          seatsPerUnit: null,
        ),
      );
    });

    test(
      'normalizes old fixed quiz team default to capacity-aware auto count',
      () {
        final defaults = const EventSuccessDefaults(
          enabled: true,
          playbookId: 'pub_quiz_team_mixer',
          structureConfig: EventSuccessStructureConfig(
            unitKind: EventSuccessUnitKind.teams,
            unitSize: 5,
            unitCount: 3,
          ),
        ).normalizedForActivity(ActivityKind.pubQuiz, targetAttendeeCount: 50);

        final draft = defaults.toDraft(targetAttendeeCount: 50);

        expect(draft.structureConfig.unitKind, EventSuccessUnitKind.teams);
        expect(draft.structureConfig.unitSize, 5);
        expect(draft.structureConfig.unitCount, isNull);
        expect(draft.structureConfig.estimatedUnitCount(50), 10);
      },
    );

    test('estimates group count and size ranges from actual attendance', () {
      const autoTeams = EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.teams,
        unitSize: 5,
      );
      const fixedTeams = EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.teams,
        unitSize: 5,
        unitCount: 4,
      );

      final fullAttendance = autoTeams.estimateForAttendance(50);
      final partialAttendance = autoTeams.estimateForAttendance(37);
      final fixedAttendance = fixedTeams.estimateForAttendance(11);

      expect(fullAttendance.unitCount, 10);
      expect(fullAttendance.minPeoplePerUnit, 5);
      expect(fullAttendance.maxPeoplePerUnit, 5);
      expect(partialAttendance.unitCount, 8);
      expect(partialAttendance.minPeoplePerUnit, 4);
      expect(partialAttendance.maxPeoplePerUnit, 5);
      expect(fixedAttendance.unitCount, 4);
      expect(fixedAttendance.minPeoplePerUnit, 2);
      expect(fixedAttendance.maxPeoplePerUnit, 3);
    });

    test('round trips primitive assignment controls in structure config', () {
      const config = EventSuccessStructureConfig(
        unitKind: EventSuccessUnitKind.pairs,
        unitSize: 2,
        rotationIntervalMinutes: 15,
        topology: EventSuccessTopology.sequence,
        resourceCapacity: EventSuccessResourceCapacity(
          concurrentUnits: 3,
          resourceLabelId: EventSuccessResourceLabelId.court,
          seatsPerUnit: null,
        ),
        rotationRepeatStrategy:
            EventSuccessRotationRepeatStrategy.allowWhenExhausted,
        maxPairMeetings: 3,
        balanceActivityAttributes: [
          EventSuccessActivityAssignmentAttribute.skillBand,
        ],
        clusterActivityAttributes: [
          EventSuccessActivityAssignmentAttribute.paceBand,
        ],
      );

      final json = config.toJson();
      final roundTrip = EventSuccessStructureConfig.fromJson(json);

      expect(json['rotationRepeatStrategy'], 'allowWhenExhausted');
      expect(json['topology'], 'sequence');
      expect(json['resourceCapacity'], {
        'concurrentUnits': 3,
        'resourceLabelId': 'court',
        'seatsPerUnit': null,
      });
      expect(json['maxPairMeetings'], 3);
      expect(json['balanceActivityAttributes'], ['skillBand']);
      expect(json['clusterActivityAttributes'], ['paceBand']);
      expect(roundTrip, config);
    });

    test('binds seated tables to honest unsupported adjacency inputs', () {
      final config = EventSuccessStructureConfig.defaultForInteractionModel(
        EventInteractionModel.seatedTable,
        targetAttendeeCount: 18,
      );

      expect(config.topology, EventSuccessTopology.adjacency);
      expect(
        config.resourceCapacity,
        const EventSuccessResourceCapacity(
          concurrentUnits: 5,
          resourceLabelId: EventSuccessResourceLabelId.table,
          seatsPerUnit: 4,
        ),
      );
    });

    test('legacy defaults hydrate platform-owned modules as always on', () {
      final defaults = EventSuccessDefaults(
        enabled: true,
        selectedModuleIds: [EventSuccessModuleCatalog.checkIn.id],
        wingmanRequestsEnabled: false,
        contextualOpenersEnabled: false,
      ).normalizedForActivity(ActivityKind.socialRun);

      expect(
        defaults.selectedModuleIds,
        containsAll(
          EventSuccessPlaybookLibrary.socialRun.nonConfigurableModuleIds,
        ),
      );
      expect(defaults.wingmanRequestsEnabled, isTrue);
      expect(defaults.contextualOpenersEnabled, isTrue);
    });

    test(
      'legacy stored defaults stay raw while their draft projection heals',
      () {
        const empty = EventSuccessDefaults(
          enabled: true,
          moduleSelectionConfigured: true,
          wingmanRequestsEnabled: false,
          contextualOpenersEnabled: false,
        );
        final legacyJson = empty.toJson();
        final hydrated = EventSuccessDefaults.fromJson(legacyJson);
        final draft = hydrated.toDraft();

        expect(hydrated.selectedModuleIds, isEmpty);
        expect(legacyJson['selectedModuleIds'], isEmpty);
        expect(
          draft.selectedModuleIds,
          containsAll(draft.playbook.nonConfigurableModuleIds),
        );

        final recommended = EventSuccessDefaults.recommendedForActivity(
          ActivityKind.socialRun,
          enabled: true,
        );
        expect(
          recommended.selectedModuleIds,
          containsAll(
            EventSuccessPlaybookLibrary.socialRun.nonConfigurableModuleIds,
          ),
        );
        expect(recommended.wingmanRequestsEnabled, isTrue);
        expect(recommended.contextualOpenersEnabled, isTrue);
      },
    );

    test('draft write boundaries union platform-owned module ids', () {
      final playbook = EventSuccessPlaybookLibrary.socialRun;
      final draft = EventSuccessHostDraft(
        playbook: playbook,
        selectedModuleIds: const {},
        targetAttendeeCount: 22,
        structureConfig: const EventSuccessStructureConfig.legacyDefault(),
        wingmanRequestsEnabled: false,
        contextualOpenersEnabled: false,
      );

      final defaults = EventSuccessDefaults.fromDraft(draft);
      final plan = EventSuccessPlan.fromDraft(
        id: 'event-1',
        eventId: 'event-1',
        organizerId: 'club-1',
        draft: draft,
        createdAt: DateTime(2026, 7, 17),
        updatedAt: DateTime(2026, 7, 17),
      );

      expect(
        defaults.selectedModuleIds,
        containsAll(playbook.nonConfigurableModuleIds),
      );
      expect(
        plan.selectedModuleIds,
        containsAll(playbook.nonConfigurableModuleIds),
      );
      expect(defaults.wingmanRequestsEnabled, isTrue);
      expect(defaults.contextualOpenersEnabled, isTrue);
      expect(plan.wingmanRequestsEnabled, isTrue);
      expect(plan.contextualOpenersEnabled, isTrue);
    });

    test('legacy plans project platform modules without rewriting ids', () {
      final now = DateTime(2026, 7, 17);
      final legacy = EventSuccessPlan.fromJson({
        'id': 'event-1',
        'eventId': 'event-1',
        'organizerId': 'club-1',
        'playbookId': EventSuccessPlaybookLibrary.socialRun.id,
        'selectedModuleIds': <String>[],
        'targetAttendeeCount': 22,
        'hostGoal': 'Help people meet.',
        'wingmanRequestsEnabled': false,
        'contextualOpenersEnabled': false,
        'createdAt': now,
        'updatedAt': now,
      });

      expect(legacy.selectedModuleIds, isEmpty);
      expect(
        legacy.hostDraft.selectedModuleIds,
        containsAll(legacy.playbook.nonConfigurableModuleIds),
      );
      expect(legacy.hasModule(EventSuccessModuleCatalog.checkIn.id), isTrue);
      expect(
        legacy.hasModule(EventSuccessModuleCatalog.wingmanRequests.id),
        isTrue,
      );
      expect(legacy.toJson()['selectedModuleIds'], isEmpty);
    });

    test('guided rotations normalize to the supported pair topology', () {
      final draft =
          EventSuccessHostDraft.fromActivity(ActivityKind.singlesMixer)
              .copyWith(
                structureConfig: const EventSuccessStructureConfig(
                  unitKind: EventSuccessUnitKind.teams,
                  unitSize: 6,
                ),
              )
              .withModuleSelection(
                EventSuccessModuleCatalog.guidedRotations.id,
                true,
              );

      expect(draft.structureConfig.unitKind, EventSuccessUnitKind.pairs);
      expect(draft.structureConfig.unitSize, 2);
      expect(draft.structureConfig.rotationIntervalMinutes, 15);
    });

    test('people-mix projection derives grouping modules from structure', () {
      final base = EventSuccessHostDraft.fromActivity(
        ActivityKind.openActivity,
        targetAttendeeCount: 30,
      );

      final whole = base.withPeopleMixUnitKind(EventSuccessUnitKind.wholeGroup);
      final pods = base.withPeopleMixUnitKind(EventSuccessUnitKind.pods);
      final pairs = base.withPeopleMixUnitKind(EventSuccessUnitKind.pairs);
      final teams = base.withPeopleMixUnitKind(EventSuccessUnitKind.teams);
      final tables = base.withPeopleMixUnitKind(EventSuccessUnitKind.tables);

      for (final draft in [whole, pods]) {
        expect(
          draft.isModuleSelected(EventSuccessModuleCatalog.guidedRotations.id),
          isFalse,
        );
      }
      expect(
        whole.isModuleSelected(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
      expect(
        pods.isModuleSelected(EventSuccessModuleCatalog.microPods.id),
        isTrue,
      );
      for (final draft in [pairs, teams, tables]) {
        expect(
          draft.isModuleSelected(EventSuccessModuleCatalog.microPods.id),
          isFalse,
        );
        expect(
          draft.isModuleSelected(EventSuccessModuleCatalog.guidedRotations.id),
          isTrue,
        );
        expect(draft.structureConfig.rotationIntervalMinutes, isNotNull);
      }
    });

    test('removing rotation cadence removes the legacy rotation module', () {
      final rotating = EventSuccessHostDraft.fromActivity(
        ActivityKind.openActivity,
        targetAttendeeCount: 30,
      ).withPeopleMixUnitKind(EventSuccessUnitKind.teams);

      final staticTeams = rotating.withPeopleMixStructure(
        rotating.structureConfig.copyWith(rotationIntervalMinutes: null),
      );

      expect(staticTeams.structureConfig.unitKind, EventSuccessUnitKind.teams);
      expect(staticTeams.structureConfig.rotationIntervalMinutes, isNull);
      expect(
        staticTeams.isModuleSelected(
          EventSuccessModuleCatalog.guidedRotations.id,
        ),
        isFalse,
      );
      expect(
        staticTeams.isModuleSelected(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
    });

    test('activity profiles keep impossible toggles out of defaults', () {
      final racket = EventSuccessActivityProfile.forActivity(
        ActivityKind.pickleball,
      );
      final quiz = EventSuccessActivityProfile.forActivity(
        ActivityKind.pubQuiz,
      );
      final yoga = EventSuccessActivityProfile.forActivity(ActivityKind.yoga);
      final mixer = EventSuccessActivityProfile.forActivity(
        ActivityKind.singlesMixer,
      );

      expect(
        racket.defaultModuleIds,
        contains(EventSuccessModuleCatalog.guidedRotations.id),
      );
      expect(
        racket.defaultModuleIds,
        contains(EventSuccessModuleCatalog.liveReveal.id),
      );
      expect(
        racket.isSelectable(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
      expect(
        quiz.isSelectable(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
      expect(
        quiz.defaultModuleIds,
        contains(EventSuccessModuleCatalog.liveReveal.id),
      );
      expect(
        yoga.isSelectable(EventSuccessModuleCatalog.guidedRotations.id),
        isFalse,
      );
      expect(
        mixer.defaultModuleIds,
        contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
      );
      expect(mixer.compatibilityAffectsRankingByDefault, isTrue);
    });

    test('format profiles use saved interaction model for custom formats', () {
      const format = EventFormatSnapshot(
        activityKind: ActivityKind.openActivity,
        interactionModel: EventInteractionModel.teamRotations,
        customActivityLabel: 'Trivia night',
      );

      final profile = EventSuccessActivityProfile.forFormat(
        format,
        targetAttendeeCount: 40,
      );

      expect(profile.formatLabel, 'Trivia night');
      expect(profile.interactionModel, EventInteractionModel.teamRotations);
      expect(
        profile.assignmentAlgorithm,
        EventSuccessAssignmentAlgorithm.teamBalancer,
      );
      expect(profile.playbook.id, EventSuccessPlaybookLibrary.pubQuiz.id);
      expect(profile.structureConfig.unitKind, EventSuccessUnitKind.teams);
      expect(
        profile.isSelectable(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
      expect(
        profile.isSelectable(EventSuccessModuleCatalog.liveReveal.id),
        isTrue,
      );
      expect(profile.assignmentResolution.supported, isFalse);
      expect(profile.assignmentResolution.reason, contains('not implemented'));
    });

    test(
      'format primitives translate open custom formats into fixed behavior',
      () {
        const format = EventFormatSnapshot(
          activityKind: ActivityKind.openActivity,
          interactionModel: EventInteractionModel.openFormat,
          customActivityLabel: 'Trivia night',
          eventSuccessPrimitives: {
            'phoneAvailability': 'plannedPauses',
            'rotationSuitability': 'plannedBreaks',
            'assignmentAlgorithm': 'teamBalancer',
            'compatibilityPolicy': 'questionnaireClueOnly',
            'matchingObjective': 'spread',
            'unitOutcome': 'score',
            'accountability': 'rollCall',
          },
        );

        final profile = EventSuccessActivityProfile.forFormat(
          format,
          targetAttendeeCount: 40,
        );

        expect(profile.formatLabel, 'Trivia night');
        expect(profile.interactionModel, EventInteractionModel.teamRotations);
        expect(
          profile.phoneAvailability,
          EventSuccessPhoneAvailability.plannedPauses,
        );
        expect(
          profile.rotationSuitability,
          EventSuccessRotationSuitability.plannedBreaks,
        );
        expect(
          profile.assignmentAlgorithm,
          EventSuccessAssignmentAlgorithm.teamBalancer,
        );
        expect(
          profile.compatibilityPolicy,
          EventSuccessCompatibilityPolicy.questionnaireClueOnly,
        );
        expect(profile.matchingObjective, EventSuccessMatchingObjective.spread);
        expect(profile.unitOutcome, EventSuccessUnitOutcome.score);
        expect(profile.accountability, EventSuccessAccountability.rollCall);
        expect(profile.assignmentResolution.supported, isFalse);
        expect(profile.playbook.id, EventSuccessPlaybookLibrary.pubQuiz.id);
        expect(profile.structureConfig.unitKind, EventSuccessUnitKind.teams);
        expect(
          profile.isSelectable(EventSuccessModuleCatalog.microPods.id),
          isFalse,
        );
      },
    );

    test('mutual-interest primitive makes custom mixers dating-forward', () {
      const format = EventFormatSnapshot(
        activityKind: ActivityKind.openActivity,
        interactionModel: EventInteractionModel.openFormat,
        customActivityLabel: 'Algorithmic mixer',
        eventSuccessPrimitives: {
          'assignmentAlgorithm': 'socialPods',
          'compatibilityPolicy': 'mutualInterestOnly',
        },
      );

      final profile = EventSuccessActivityProfile.forFormat(format);

      expect(profile.interactionModel, EventInteractionModel.freeFormMixer);
      expect(
        profile.compatibilityPolicy,
        EventSuccessCompatibilityPolicy.mutualInterestOnly,
      );
      expect(profile.matchingObjective, EventSuccessMatchingObjective.romantic);
      expect(profile.assignmentResolution.supported, isTrue);
      expect(
        profile.playbook.id,
        EventSuccessPlaybookLibrary.algorithmicMixer.id,
      );
      expect(profile.compatibilityAffectsRankingByDefault, isTrue);
      expect(
        profile.defaultModuleIds,
        contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
      );
    });

    test('activity profiles bind matching objectives without format forks', () {
      final profiles = {
        ActivityKind.socialRun: EventSuccessMatchingObjective.affinity,
        ActivityKind.pubQuiz: EventSuccessMatchingObjective.spread,
        ActivityKind.dinner: EventSuccessMatchingObjective.affinity,
        ActivityKind.pickleball: EventSuccessMatchingObjective.balance,
        ActivityKind.singlesMixer: EventSuccessMatchingObjective.romantic,
        ActivityKind.openActivity: EventSuccessMatchingObjective.coverage,
      };

      for (final entry in profiles.entries) {
        expect(
          EventSuccessActivityProfile.forActivity(entry.key).matchingObjective,
          entry.value,
        );
      }
      expect(
        EventSuccessActivityProfile.forActivity(
          ActivityKind.pubQuiz,
        ).assignmentResolution.supported,
        isFalse,
      );
      expect(
        EventSuccessActivityProfile.forActivity(
          ActivityKind.dinner,
        ).assignmentResolution.supported,
        isFalse,
      );
    });

    test('activity profiles bind all four unit outcome shapes', () {
      final profiles = {
        ActivityKind.socialRun: EventSuccessUnitOutcome.completion,
        ActivityKind.pubQuiz: EventSuccessUnitOutcome.score,
        ActivityKind.dinner: EventSuccessUnitOutcome.none,
        ActivityKind.pickleball: EventSuccessUnitOutcome.rank,
        ActivityKind.singlesMixer: EventSuccessUnitOutcome.none,
        ActivityKind.openActivity: EventSuccessUnitOutcome.none,
      };

      for (final entry in profiles.entries) {
        expect(
          EventSuccessActivityProfile.forActivity(entry.key).unitOutcome,
          entry.value,
        );
      }
    });

    test('activity profiles bind and override all duration shapes', () {
      final profiles = {
        ActivityKind.socialRun: EventSuccessDurationShape.segments,
        ActivityKind.pubQuiz: EventSuccessDurationShape.rounds,
        ActivityKind.dinner: EventSuccessDurationShape.courses,
        ActivityKind.pickleball: EventSuccessDurationShape.rounds,
        ActivityKind.openActivity: EventSuccessDurationShape.continuous,
      };

      for (final entry in profiles.entries) {
        expect(
          EventSuccessActivityProfile.forActivity(entry.key).durationShape,
          entry.value,
        );
      }
      expect(
        EventSuccessPlaybookLibrary.all
            .map((playbook) => playbook.durationShape)
            .toSet(),
        containsAll(EventSuccessDurationShape.values),
      );
      expect(
        EventSuccessActivityProfile.forFormat(
          const EventFormatSnapshot(
            activityKind: ActivityKind.openActivity,
            interactionModel: EventInteractionModel.freeFormMixer,
          ),
        ).durationShape,
        EventSuccessDurationShape.rounds,
      );
      expect(
        EventSuccessActivityProfile.forFormat(
          const EventFormatSnapshot(
            activityKind: ActivityKind.openActivity,
            interactionModel: EventInteractionModel.openFormat,
            eventSuccessPrimitives: {'durationShape': 'courses'},
          ),
        ).durationShape,
        EventSuccessDurationShape.courses,
      );
    });

    test(
      'accountability defaults from interaction shape and stays overridable',
      () {
        expect(
          EventSuccessActivityProfile.forActivity(
            ActivityKind.socialRun,
          ).accountability,
          EventSuccessAccountability.sweep,
        );
        expect(
          EventSuccessActivityProfile.forActivity(
            ActivityKind.pubQuiz,
          ).accountability,
          EventSuccessAccountability.none,
        );
        expect(
          EventSuccessActivityProfile.forFormat(
            const EventFormatSnapshot(
              activityKind: ActivityKind.socialRun,
              interactionModel: EventInteractionModel.pacePods,
              eventSuccessPrimitives: {'accountability': 'none'},
            ),
          ).accountability,
          EventSuccessAccountability.none,
        );
      },
    );

    test('event defaults normalize to the selected activity', () {
      final racketDefaults = EventSuccessDefaults(
        enabled: true,
        selectedModuleIds: [EventSuccessModuleCatalog.microPods.id],
      ).normalizedForActivity(ActivityKind.pickleball);
      final mixerDefaults = const EventSuccessDefaults(
        enabled: true,
      ).normalizedForActivity(ActivityKind.singlesMixer);

      expect(
        racketDefaults.playbookId,
        EventSuccessPlaybookLibrary.pickleball.id,
      );
      expect(
        racketDefaults.selectedModuleIds,
        isNot(contains(EventSuccessModuleCatalog.microPods.id)),
      );
      expect(
        racketDefaults.selectedModuleIds,
        contains(EventSuccessModuleCatalog.guidedRotations.id),
      );
      expect(
        mixerDefaults.playbookId,
        EventSuccessPlaybookLibrary.algorithmicMixer.id,
      );
      expect(
        mixerDefaults.selectedModuleIds,
        contains(EventSuccessModuleCatalog.compatibilityQuestionnaire.id),
      );
      expect(mixerDefaults.compatibilityAffectsRanking, isTrue);
    });

    test('event plan factories use saved format interaction model', () {
      const format = EventFormatSnapshot(
        activityKind: ActivityKind.openActivity,
        interactionModel: EventInteractionModel.teamRotations,
        customActivityLabel: 'Trivia night',
      );
      final event = buildEvent(
        eventFormat: format,
        capacityLimit: 42,
        bookedCount: 30,
      );

      final defaultsPlan = EventSuccessPlan.fromDefaults(
        const EventSuccessDefaults(enabled: true),
        event,
        now: DateTime(2026, 5, 23, 12),
      );
      final directPlan = EventSuccessPlan.defaultForEvent(
        event,
        now: DateTime(2026, 5, 23, 12),
      );

      for (final plan in [defaultsPlan, directPlan]) {
        expect(plan.playbookId, EventSuccessPlaybookLibrary.pubQuiz.id);
        expect(plan.structureConfig.unitKind, EventSuccessUnitKind.teams);
        expect(plan.structureConfig.estimatedUnitCount(42), 9);
        expect(
          plan.selectedModuleIds,
          isNot(contains(EventSuccessModuleCatalog.microPods.id)),
        );
      }
    });

    test('activity normalization replaces legacy structure defaults', () {
      final normalizedDraft =
          EventSuccessHostDraft.fromPlaybook(
                EventSuccessPlaybookLibrary.socialRun,
              )
              .copyWith(
                structureConfig:
                    const EventSuccessStructureConfig.legacyDefault(),
              )
              .normalizeForActivity(ActivityKind.pickleball);

      expect(
        normalizedDraft.structureConfig.unitKind,
        EventSuccessUnitKind.pairs,
      );
      expect(normalizedDraft.structureConfig.unitSize, 2);
      expect(normalizedDraft.structureConfig.rotationIntervalMinutes, 15);
    });
  });

  group('EventSuccessCoach', () {
    const coach = EventSuccessCoach();

    test('prioritizes safety before growth recommendations', () {
      final brief = coach.analyze(
        playbook: EventSuccessPlaybookLibrary.socialRun,
        scorecard: EventSuccessSampleScorecards.safetyReviewRequired,
      );

      expect(brief.recommendations.first.id, 'safety_first');
      expect(
        brief.recommendations.first.priority,
        EventRecommendationPriority.critical,
      );
    });

    test('detects weak arrival and weak mixing loops', () {
      final brief = coach.analyze(
        playbook: EventSuccessPlaybookLibrary.socialRun,
        scorecard: EventSuccessSampleScorecards.needsStructure,
      );

      expect(
        brief.recommendations.map((recommendation) => recommendation.id),
        containsAll([
          'tighten_check_in',
          'increase_intro_coverage',
          'refresh_assignment_coverage',
          'reduce_assignment_pressure',
          'use_wingman_signal_live',
          'improve_first_message',
          'improve_host_welcome',
          'right_size_structure',
          'increase_feedback_response',
        ]),
      );
    });

    test('recognizes strong loops as strengths', () {
      final brief = coach.analyze(
        playbook: EventSuccessPlaybookLibrary.socialRun,
        scorecard: EventSuccessSampleScorecards.strongSocialRun,
      );

      expect(
        brief.strengths,
        contains('Arrival data is reliable enough for matching and reports.'),
      );
      expect(brief.strengths, contains('Most attendees met multiple people.'));
      expect(
        brief.strengths,
        contains('Mutual matches are converting into chat starts.'),
      );
      expect(
        brief.strengths,
        contains('Assignments reached most active attendees.'),
      );
      expect(
        brief.strengths,
        contains('Feedback response is strong enough to trust the report.'),
      );
    });
  });
}
