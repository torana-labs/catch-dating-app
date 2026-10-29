import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_conversation_cue.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_copy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;

final _l10n = AppLocalizationsEn();

void main() {
  group('EventSuccessRuntime', () {
    test('gates capabilities from selected modules and feature toggles', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.checkIn.id,
              EventSuccessModuleCatalog.hostScript.id,
              EventSuccessModuleCatalog.decomposedFeedback.id,
            ],
            wingmanRequestsEnabled: true,
            contextualOpenersEnabled: true,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.checkInEnabled, isTrue);
      expect(runtime.attendeePromptEnabled, isTrue);
      expect(runtime.wingmanRequestsEnabled, isTrue);
      expect(runtime.contextualOpenersConfigured, isTrue);
      expect(runtime.liveRevealEnabled, isFalse);
      expect(runtime.compatibilityQuestionnaireEnabled, isFalse);
      expect(runtime.compatibilityCanAffectRanking, isFalse);
      expect(runtime.hostReportEnabled, isTrue);
      expect(runtime.canShowSelfCheckIn(checkInOpen: true), isTrue);
      expect(runtime.canShowLiveReveal(attended: true), isFalse);
      expect(
        runtime.canShowWingmanRequest(attended: true, eventEnded: false),
        isTrue,
      );
      expect(runtime.canShowFeedback(attended: true, eventEnded: true), isTrue);
    });

    test('gates compatibility questionnaire and ranking opt-in separately', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
            ],
            compatibilityAffectsRanking: true,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.compatibilityQuestionnaireEnabled, isTrue);
      expect(runtime.compatibilityCanAffectRanking, isTrue);
      expect(
        runtime.canUseCompatibilityQuestionnaire(
          participationStatus: EventParticipationStatus.signedUp,
          eventEnded: false,
        ),
        isTrue,
      );
      expect(
        runtime.canUseCompatibilityQuestionnaire(
          participationStatus: EventParticipationStatus.attended,
          eventEnded: true,
        ),
        isFalse,
      );
    });

    test('prioritizes assigned First Hello mission during arrival', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.singlesMixer,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.checkIn.id,
              EventSuccessModuleCatalog.firstHelloCheckIn.id,
              EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
            ],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime.subtract(const Duration(minutes: 5)),
      );

      expect(
        runtime
            .attendeeMoment(
              participationStatus: EventParticipationStatus.signedUp,
              checkInOpen: true,
              eventEnded: false,
              arrivalMissionAssigned: true,
            )
            .kind,
        EventSuccessAttendeeMomentKind.firstHelloCheckIn,
      );
      expect(
        runtime
            .attendeeMoment(
              participationStatus: EventParticipationStatus.signedUp,
              checkInOpen: true,
              eventEnded: false,
            )
            .kind,
        EventSuccessAttendeeMomentKind.compatibilityQuestionnaire,
      );
    });

    test('requires a booked arrival state for First Hello mission', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.checkIn.id,
              EventSuccessModuleCatalog.firstHelloCheckIn.id,
            ],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(
        runtime.canShowFirstHelloCheckIn(
          participationStatus: EventParticipationStatus.signedUp,
          checkInOpen: true,
          eventEnded: false,
          arrivalMissionAssigned: true,
        ),
        isTrue,
      );
      expect(
        runtime.canShowFirstHelloCheckIn(
          participationStatus: EventParticipationStatus.attended,
          checkInOpen: true,
          eventEnded: false,
          arrivalMissionAssigned: true,
        ),
        isFalse,
      );
      expect(
        runtime.canShowFirstHelloCheckIn(
          participationStatus: EventParticipationStatus.signedUp,
          checkInOpen: false,
          eventEnded: false,
          arrivalMissionAssigned: true,
        ),
        isFalse,
      );
    });

    test('prioritizes unanswered questionnaire during check-in arrival', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            playbookId: EventSuccessPlaybookLibrary.pickleball.id,
            selectedModuleIds: [
              EventSuccessModuleCatalog.checkIn.id,
              EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
              EventSuccessModuleCatalog.guidedRotations.id,
              EventSuccessModuleCatalog.liveReveal.id,
            ],
            activeStepIndex: 0,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      final unanswered = runtime.attendeeMoment(
        participationStatus: EventParticipationStatus.attended,
        checkInOpen: false,
        eventEnded: false,
      );
      final answered = runtime.attendeeMoment(
        participationStatus: EventParticipationStatus.attended,
        checkInOpen: false,
        eventEnded: false,
        compatibilityResponseSaved: true,
      );

      expect(
        unanswered.kind,
        EventSuccessAttendeeMomentKind.compatibilityQuestionnaire,
      );
      expect(answered.kind, EventSuccessAttendeeMomentKind.liveStepContext);
    });

    test('does not interrupt active reveal for unanswered questionnaire', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            playbookId: EventSuccessPlaybookLibrary.pickleball.id,
            selectedModuleIds: [
              EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
              EventSuccessModuleCatalog.guidedRotations.id,
              EventSuccessModuleCatalog.liveReveal.id,
            ],
            activeStepIndex: 1,
            revealStatus: EventSuccessRevealStatus.countingDown,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      final moment = runtime.attendeeMoment(
        participationStatus: EventParticipationStatus.attended,
        checkInOpen: false,
        eventEnded: false,
      );

      expect(moment.kind, EventSuccessAttendeeMomentKind.liveReveal);
    });

    test('gates live reveal behind assignment modules', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.liveReveal.id,
              EventSuccessModuleCatalog.guidedRotations.id,
            ],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.liveRevealEnabled, isTrue);
      expect(runtime.canShowLiveReveal(attended: true), isTrue);
      expect(runtime.canShowLiveReveal(attended: false), isFalse);
    });

    test('allows quiz standings reveal without generated assignments', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(selectedModuleIds: [EventSuccessModuleCatalog.liveReveal.id]);
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.liveRevealEnabled, isTrue);
      expect(runtime.guidedRotationsEnabled, isFalse);
      expect(runtime.microPodsEnabled, isFalse);
      expect(runtime.canShowLiveReveal(attended: true), isTrue);
      expect(runtime.canShowLiveReveal(attended: false), isFalse);
    });

    test('keeps booked attendees in pre-arrival planning state', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.microPods.id,
              EventSuccessModuleCatalog.guidedRotations.id,
              EventSuccessModuleCatalog.socialMissions.id,
              EventSuccessModuleCatalog.liveReveal.id,
            ],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(
        runtime.canShowPreCheckInPlanning(isBooked: true, eventEnded: false),
        isTrue,
      );
      expect(
        runtime.canShowAttendeePrompt(attended: false, eventEnded: false),
        isFalse,
      );
      expect(runtime.canShowPodAssignment(attended: false), isFalse);
      expect(runtime.canShowGuidedRotations(attended: false), isFalse);
      expect(runtime.canShowLiveReveal(attended: false), isFalse);
      expect(
        runtime
            .attendeeMoment(
              participationStatus: EventParticipationStatus.signedUp,
              checkInOpen: false,
              eventEnded: false,
            )
            .kind,
        EventSuccessAttendeeMomentKind.preArrival,
      );
    });

    test('maps checked-in attendee content to the host active step', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(activeStepIndex: 3);
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      final moment = runtime.attendeeMoment(
        participationStatus: EventParticipationStatus.attended,
        checkInOpen: false,
        eventEnded: false,
      );

      expect(moment.kind, EventSuccessAttendeeMomentKind.conversationCues);
      expect(moment.activeStep?.title, 'Cooldown social mission');
    });

    test('keeps idle reveal steps as context until countdown starts', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            playbookId: EventSuccessPlaybookLibrary.pickleball.id,
            selectedModuleIds: [
              EventSuccessModuleCatalog.guidedRotations.id,
              EventSuccessModuleCatalog.liveReveal.id,
            ],
            // Platform-owned arrival remains the first live step even though
            // it is no longer configurable in setup. The opening step is the
            // first reveal-capable step.
            activeStepIndex: 1,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      final idle = runtime.attendeeMoment(
        participationStatus: EventParticipationStatus.attended,
        checkInOpen: false,
        eventEnded: false,
      );
      final countingDown =
          EventSuccessRuntime(
            plan: plan.copyWith(
              revealStatus: EventSuccessRevealStatus.countingDown,
            ),
            event: event,
            now: event.startTime,
          ).attendeeMoment(
            participationStatus: EventParticipationStatus.attended,
            checkInOpen: false,
            eventEnded: false,
          );

      expect(idle.kind, EventSuccessAttendeeMomentKind.liveStepContext);
      expect(countingDown.kind, EventSuccessAttendeeMomentKind.liveReveal);
    });

    test('filters run-of-show steps to selected live modules', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.microPods.id,
              EventSuccessModuleCatalog.safetyControls.id,
            ],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.runOfShowSteps.map((step) => step.title), [
        'Check in and pace sort',
        'Run in pace pods',
        'Host-help last call',
      ]);
      expect(
        runtime.livePlan(bookedCount: 12, checkedInCount: 8)?.steps,
        hasLength(3),
      );
    });

    test('keeps platform-owned live steps when host tools are absent', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [EventSuccessModuleCatalog.hostAnalytics.id],
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.runOfShowSteps.map((step) => step.title), [
        'Host-help last call',
      ]);
      expect(
        runtime.livePlan(bookedCount: 12, checkedInCount: 8)?.steps,
        hasLength(1),
      );
    });

    test('gates live prompts and post-match openers separately', () {
      final event = buildEvent();
      final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
          .copyWith(
            selectedModuleIds: [
              EventSuccessModuleCatalog.socialMissions.id,
              EventSuccessModuleCatalog.contextualOpeners.id,
            ],
            contextualOpenersEnabled: true,
          );
      final runtime = EventSuccessRuntime(
        plan: plan,
        event: event,
        now: event.startTime,
      );

      expect(runtime.conversationCuesEnabled, isTrue);
      expect(
        runtime.canShowLiveConversationCues(attended: true, eventEnded: false),
        isTrue,
      );
      expect(
        runtime.canShowLiveConversationCues(attended: false, eventEnded: false),
        isFalse,
      );
      expect(
        runtime.canShowPostEventOpeners(attended: true, eventEnded: true),
        isTrue,
      );
      expect(
        EventSuccessConversationCueLibrary.liveCuesFor(
          event: event,
          plan: plan,
          l10n: _l10n,
        ).first.moment,
        EventSuccessConversationCueMoment.live,
      );
      expect(
        EventSuccessConversationCueLibrary.postEventOpenersFor(
          event,
          l10n: _l10n,
        ).first.moment,
        EventSuccessConversationCueMoment.postEvent,
      );
    });

    test('walks every format from light to reflective disclosure', () {
      for (final interactionModel in EventInteractionModel.values) {
        final event = buildEvent(
          eventFormat: EventFormatSnapshot.custom(
            label: interactionModel.label,
            interactionModel: interactionModel,
          ),
        );
        final plan = EventSuccessPlan.defaultForEvent(
          event,
          now: event.startTime,
        );
        final levels = <EventSuccessDisclosureLevel?>[
          for (final activeStepIndex in [0, 1, 2, 3])
            EventSuccessConversationCueLibrary.liveCuesFor(
              event: event,
              plan: plan.copyWith(activeStepIndex: activeStepIndex),
              l10n: _l10n,
            ).last.disclosureLevel,
        ];
        expect(levels, [
          EventSuccessDisclosureLevel.light,
          EventSuccessDisclosureLevel.personal,
          EventSuccessDisclosureLevel.reflective,
          EventSuccessDisclosureLevel.reflective,
        ]);
      }
    });

    test('always exposes the platform-owned post-event surface', () {
      final event = buildEvent();
      final basePlan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );

      final withoutSurface =
          EventSuccessRuntime(
            plan: basePlan.copyWith(
              selectedModuleIds: [EventSuccessModuleCatalog.hostScript.id],
            ),
            event: event,
            now: event.endTime.add(const Duration(minutes: 1)),
          ).attendeeMoment(
            participationStatus: EventParticipationStatus.attended,
            checkInOpen: false,
            eventEnded: true,
          );
      final withSurface =
          EventSuccessRuntime(
            plan: basePlan.copyWith(
              selectedModuleIds: [
                EventSuccessModuleCatalog.contextualOpeners.id,
                EventSuccessModuleCatalog.decomposedFeedback.id,
              ],
              contextualOpenersEnabled: true,
            ),
            event: event,
            now: event.endTime.add(const Duration(minutes: 1)),
          ).attendeeMoment(
            participationStatus: EventParticipationStatus.attended,
            checkInOpen: false,
            eventEnded: true,
          );

      expect(withoutSurface.kind, EventSuccessAttendeeMomentKind.postEvent);
      expect(withSurface.kind, EventSuccessAttendeeMomentKind.postEvent);
      expect(withSurface.showPostEventOpeners, isTrue);
      expect(withSurface.showFeedback, isTrue);
    });
  });
}
