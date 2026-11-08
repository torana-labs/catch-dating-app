import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_moment_presentation_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;

final _l10n = AppLocalizationsEn();

void main() {
  group('phone availability policy', () {
    const timings = EventSuccessGuestCueTiming.values;

    test('continuous allows every cue, mid-step included', () {
      for (final timing in timings) {
        for (final underway in [true, false]) {
          expect(
            EventSuccessPhoneAvailability.continuous.allowsGuestCue(
              timing,
              activityUnderway: underway,
            ),
            isTrue,
            reason: '$timing underway=$underway',
          );
        }
      }
    });

    test('planned pauses allow step changes but never mid-step cues', () {
      for (final underway in [true, false]) {
        const policy = EventSuccessPhoneAvailability.plannedPauses;
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.stepChange,
            activityUnderway: underway,
          ),
          isTrue,
        );
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.arrival,
            activityUnderway: underway,
          ),
          isTrue,
        );
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.postEvent,
            activityUnderway: underway,
          ),
          isTrue,
        );
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.midStep,
            activityUnderway: underway,
          ),
          isFalse,
        );
      }
    });

    test('arrival-and-post-event-only stays silent mid-activity', () {
      for (final policy in [
        EventSuccessPhoneAvailability.arrivalAndPostEventOnly,
        EventSuccessPhoneAvailability.hostOnlyLive,
        EventSuccessPhoneAvailability.noneDuringActivity,
      ]) {
        expect(policy.guestPhoneAwayDuringActivity, isTrue);
        // Mid-activity: nothing reaches the phone.
        for (final timing in [
          EventSuccessGuestCueTiming.arrival,
          EventSuccessGuestCueTiming.stepChange,
          EventSuccessGuestCueTiming.midStep,
        ]) {
          expect(
            policy.allowsGuestCue(timing, activityUnderway: true),
            isFalse,
            reason: '$policy $timing',
          );
        }
        // Check-in and planned stops, when the activity is not underway.
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.arrival,
            activityUnderway: false,
          ),
          isTrue,
        );
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.stepChange,
            activityUnderway: false,
          ),
          isTrue,
        );
        // After the finish.
        expect(
          policy.allowsGuestCue(
            EventSuccessGuestCueTiming.postEvent,
            activityUnderway: true,
          ),
          isTrue,
        );
      }
    });

    test('built-in formats resolve the owner-reviewed availability', () {
      final expected = {
        ActivityKind.socialRun:
            EventSuccessPhoneAvailability.arrivalAndPostEventOnly,
        ActivityKind.pickleball: EventSuccessPhoneAvailability.plannedPauses,
        ActivityKind.pubQuiz: EventSuccessPhoneAvailability.plannedPauses,
        ActivityKind.dinner: EventSuccessPhoneAvailability.continuous,
        ActivityKind.barCrawl: EventSuccessPhoneAvailability.plannedPauses,
        ActivityKind.cycling: EventSuccessPhoneAvailability.hostOnlyLive,
        ActivityKind.yoga: EventSuccessPhoneAvailability.plannedPauses,
      };
      for (final entry in expected.entries) {
        expect(
          EventSuccessActivityProfile.forActivity(entry.key).phoneAvailability,
          entry.value,
          reason: entry.key.name,
        );
      }
    });

    test('setup explains phone use beside each guest-facing module', () {
      final run = EventSuccessActivityProfile.forActivity(
        ActivityKind.socialRun,
      );
      final crawl = EventSuccessActivityProfile.forActivity(
        ActivityKind.barCrawl,
      );
      final dinner = EventSuccessActivityProfile.forActivity(
        ActivityKind.dinner,
      );
      final quiz = EventSuccessActivityProfile.forActivity(
        ActivityKind.pubQuiz,
      );

      expect(
        run.recommendationFor(EventSuccessModuleCatalog.socialMissions.id)!
            .reason,
        contains('away while the activity runs'),
      );
      expect(
        crawl.recommendationFor(EventSuccessModuleCatalog.socialMissions.id)!
            .reason,
        contains('only between stops'),
      );
      expect(
        quiz.recommendationFor(EventSuccessModuleCatalog.liveReveal.id)!.reason,
        contains('only between rounds'),
      );
      expect(
        dinner.recommendationFor(EventSuccessModuleCatalog.socialMissions.id)!
            .reason,
        contains('allowed at any time'),
      );
      // Modules that never reach a guest phone keep their plain reason.
      expect(
        run.recommendationFor(EventSuccessModuleCatalog.hostScript.id)!.reason,
        isNot(contains('Phones:')),
      );
    });
  });

  group('phone availability in the live runtime', () {
    EventSuccessRuntime runtimeFor(
      ActivityKind activityKind, {
      required int activeStepIndex,
      Map<String, Object?> eventSuccessPrimitives = const {},
    }) {
      final base = EventFormatSnapshot.fromActivityKind(activityKind);
      final event = buildEvent(
        eventFormat: EventFormatSnapshot(
          activityKind: base.activityKind,
          interactionModel: base.interactionModel,
          defaultPlaybookId: base.defaultPlaybookId,
          eventSuccessPrimitives: eventSuccessPrimitives,
        ),
      );
      final profile = EventSuccessActivityProfile.forFormat(event.eventFormat);
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              ...profile.playbook.moduleIds,
            ],
            activeStepIndex: activeStepIndex,
            wingmanRequestsEnabled: true,
            contextualOpenersEnabled: true,
          );
      return EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime.add(const Duration(minutes: 10)),
      );
    }

    int stepIndex(EventSuccessRuntime runtime, EventSuccessStage stage) =>
        runtime.runOfShowSteps.indexWhere((step) => step.stage == stage);

    EventSuccessAttendeeMoment checkedInMoment(EventSuccessRuntime runtime) =>
        runtime.attendeeMoment(
          participationStatus: EventParticipationStatus.attended,
          checkInOpen: false,
          eventEnded: false,
        );

    test('a run is quiet during the activity step', () {
      final probe = runtimeFor(ActivityKind.socialRun, activeStepIndex: 0);
      final runStep = stepIndex(probe, EventSuccessStage.activity);
      final runtime = runtimeFor(
        ActivityKind.socialRun,
        activeStepIndex: runStep,
      );

      final moment = checkedInMoment(runtime);

      expect(moment.kind, EventSuccessAttendeeMomentKind.liveStepContext);
      expect(moment.phoneAway, isTrue);
      expect(
        runtime.allowsGuestCue(EventSuccessGuestCueTiming.stepChange),
        isFalse,
      );

      final presentation = EventSuccessMomentPresentation.forMoment(
        l10n: _l10n,
        event: runtime.event,
        plan: runtime.plan,
        moment: moment,
        attended: true,
        showSelfCheckIn: false,
        eventEnded: false,
      );
      expect(presentation.effectKind, isNull);
      expect(presentation.ambientBed, EventSuccessAmbientBed.silent);
      expect(
        presentation.body,
        _l10n.eventSuccessEventSuccessCompanionScreenStateBodyPhoneAway,
      );
    });

    test('a run prompts again after the finish', () {
      final probe = runtimeFor(ActivityKind.socialRun, activeStepIndex: 0);
      final cooldown = stepIndex(probe, EventSuccessStage.mixing);
      final runtime = runtimeFor(
        ActivityKind.socialRun,
        activeStepIndex: cooldown,
      );

      final moment = checkedInMoment(runtime);

      expect(moment.phoneAway, isFalse);
      expect(moment.kind, EventSuccessAttendeeMomentKind.conversationCues);
    });

    test('planned pauses keep step-change prompts on activity steps', () {
      final probe = runtimeFor(ActivityKind.pubQuiz, activeStepIndex: 0);
      final rounds = stepIndex(probe, EventSuccessStage.activity);
      final runtime = runtimeFor(ActivityKind.pubQuiz, activeStepIndex: rounds);

      final moment = checkedInMoment(runtime);

      expect(moment.phoneAway, isFalse);
      expect(moment.kind, EventSuccessAttendeeMomentKind.conversationCues);
      expect(
        runtime.allowsGuestCue(EventSuccessGuestCueTiming.midStep),
        isFalse,
      );
    });

    test('an override switches the same format to continuous', () {
      final probe = runtimeFor(ActivityKind.socialRun, activeStepIndex: 0);
      final runStep = stepIndex(probe, EventSuccessStage.activity);
      final runtime = runtimeFor(
        ActivityKind.socialRun,
        activeStepIndex: runStep,
        eventSuccessPrimitives: const {'phoneAvailability': 'continuous'},
      );

      final moment = checkedInMoment(runtime);

      expect(moment.phoneAway, isFalse);
      expect(
        runtime.allowsGuestCue(EventSuccessGuestCueTiming.midStep),
        isTrue,
      );
    });

    test('dinner moments are not gated to steps', () {
      final probe = runtimeFor(ActivityKind.dinner, activeStepIndex: 0);
      for (var index = 0; index < probe.runOfShowSteps.length; index++) {
        final runtime = runtimeFor(ActivityKind.dinner, activeStepIndex: index);
        final moment = checkedInMoment(runtime);
        expect(moment.phoneAway, isFalse, reason: 'step $index');
        expect(
          runtime.allowsGuestCue(EventSuccessGuestCueTiming.midStep),
          isTrue,
        );
      }
    });
  });

  group('dinner is continuous and phone-light', () {
    final profile = EventSuccessActivityProfile.forActivity(
      ActivityKind.dinner,
    );

    test('resolves continuous phone use with table seating', () {
      expect(profile.interactionModel, EventInteractionModel.seatedTable);
      expect(profile.phoneAvailability, EventSuccessPhoneAvailability.continuous);
      expect(profile.durationShape, EventSuccessDurationShape.courses);
      expect(profile.summary, contains('keep phones away'));
    });

    test('conversation cards are a host opt-in, not a default', () {
      expect(
        profile.defaultModuleIds,
        isNot(contains(EventSuccessModuleCatalog.socialMissions.id)),
      );
      expect(
        profile.isSelectable(EventSuccessModuleCatalog.socialMissions.id),
        isTrue,
      );
      expect(
        profile
            .recommendationFor(EventSuccessModuleCatalog.socialMissions.id)!
            .level,
        EventSuccessRecommendationLevel.recommended,
      );
    });

    test('the dinner welcome step stays visible without phone prompts', () {
      final welcome = EventSuccessPlaybookLibrary.dinner.runOfShow.firstWhere(
        (step) => step.stage == EventSuccessStage.opening,
      );
      expect(
        welcome.moduleIds,
        isNot(contains(EventSuccessModuleCatalog.socialMissions.id)),
      );
      expect(
        EventSuccessPlaybookLibrary.dinner.antiPatterns.join(' '),
        contains('phones away'),
      );
    });
  });

  group('crawls are a route with stops', () {
    final profile = EventSuccessActivityProfile.forActivity(
      ActivityKind.barCrawl,
    );

    test('the taxonomy maps bar crawls to their own model and playbook', () {
      expect(
        ActivityKind.barCrawl.defaultInteractionModel,
        EventInteractionModel.routeStops,
      );
      expect(ActivityKind.barCrawl.defaultPlaybookId, 'bar_crawl_route');
      expect(profile.interactionModel, EventInteractionModel.routeStops);
      expect(profile.playbook.id, EventSuccessPlaybookLibrary.barCrawl.id);
      expect(
        EventSuccessPlaybookLibrary.byIdOrDefault('bar_crawl_route'),
        same(EventSuccessPlaybookLibrary.barCrawl),
      );
    });

    test('resolves stops, sweep accountability and between-stop phones', () {
      expect(profile.durationShape, EventSuccessDurationShape.stops);
      expect(profile.accountability, EventSuccessAccountability.sweep);
      expect(
        profile.phoneAvailability,
        EventSuccessPhoneAvailability.plannedPauses,
      );
      expect(
        profile.rotationSuitability,
        EventSuccessRotationSuitability.none,
      );
      expect(profile.assignmentAlgorithm, EventSuccessAssignmentAlgorithm.none);
      expect(profile.unitOutcome, EventSuccessUnitOutcome.none);
      expect(profile.structureConfig.unitKind, EventSuccessUnitKind.wholeGroup);
      expect(
        EventSuccessPlaybookLibrary.barCrawl.durationShape,
        EventSuccessDurationShape.stops,
      );
    });

    test('defaults: first hello on, no rotations, no reveal', () {
      expect(
        profile.defaultModuleIds,
        contains(EventSuccessModuleCatalog.firstHelloCheckIn.id),
      );
      expect(
        profile.defaultModuleIds,
        isNot(contains(EventSuccessModuleCatalog.guidedRotations.id)),
      );
      expect(
        profile.defaultModuleIds,
        isNot(contains(EventSuccessModuleCatalog.liveReveal.id)),
      );
      expect(
        profile.isSelectable(EventSuccessModuleCatalog.guidedRotations.id),
        isFalse,
      );
      final draft = EventSuccessHostDraft.fromActivity(ActivityKind.barCrawl);
      expect(draft.readinessIssues, isEmpty);
    });

    test('prompts sit on the walk between stops, not at a stop', () {
      final steps = EventSuccessPlaybookLibrary.barCrawl.runOfShow;
      final atStop = steps.where(
        (step) => step.stage == EventSuccessStage.activity,
      );
      expect(atStop, isNotEmpty);
      expect(
        atStop.expand((step) => step.moduleIds),
        isNot(contains(EventSuccessModuleCatalog.socialMissions.id)),
      );
      expect(
        steps
            .where((step) => step.stage == EventSuccessStage.mixing)
            .expand((step) => step.moduleIds),
        contains(EventSuccessModuleCatalog.socialMissions.id),
      );
    });

    test('saved crawl formats round-trip the new model', () {
      final format = EventFormatSnapshot.fromActivityKind(ActivityKind.barCrawl);
      final restored = EventFormatSnapshot.fromJson(
        Map<String, dynamic>.from(format.toJson()),
      );
      expect(restored.interactionModel, EventInteractionModel.routeStops);
    });
  });

  group('setup readiness', () {
    test('a quiz with score standings can reveal without pods or rotations', () {
      final draft = EventSuccessHostDraft.fromActivity(ActivityKind.pubQuiz);

      expect(
        draft.isModuleSelected(EventSuccessModuleCatalog.liveReveal.id),
        isTrue,
      );
      expect(
        draft.isModuleSelected(EventSuccessModuleCatalog.microPods.id),
        isFalse,
      );
      expect(draft.readinessIssues, isEmpty);
      expect(draft.status, EventSuccessSetupStatus.readyForLaunch);
    });

    test('a reveal without standings still needs pods or rotations', () {
      final draft = EventSuccessHostDraft.fromActivity(
        ActivityKind.openActivity,
      ).withModuleSelection(EventSuccessModuleCatalog.liveReveal.id, true);

      expect(
        draft.readinessIssues,
        contains('Live reveal needs a pod or rotation tool selected.'),
      );
    });
  });
}
