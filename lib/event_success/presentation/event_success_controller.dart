import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment_features.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_success_controller.g.dart';

@riverpod
class EventSuccessController extends _$EventSuccessController {
  static final ensurePlanMutation = Mutation<EventSuccessPlan>();
  static final saveSetupMutation = Mutation<void>();
  static final updateStepMutation = Mutation<void>();
  static final startRevealCountdownMutation = Mutation<void>();
  static final revealRoundMutation = Mutation<void>();
  static final cancelRevealCountdownMutation = Mutation<void>();
  static final publishRotationRoundMutation = Mutation<void>();
  static final completePlanMutation = Mutation<void>();
  static final feedbackMutation = Mutation<void>();
  static final compatibilityResponseMutation = Mutation<void>();
  static final firstHelloStartMutation = Mutation<void>();
  static final firstHelloCompleteMutation = Mutation<void>();
  static final wingmanRequestMutation = Mutation<void>();
  static final generateMicroPodsMutation = Mutation<void>();
  static final generateGuidedRotationsMutation = Mutation<void>();
  static final overrideGuidedRotationsMutation = Mutation<void>();
  static final overrideGroupAssignmentsMutation = Mutation<void>();
  static final microPodsOptOutMutation = Mutation<void>();
  static final guidedRotationsOptOutMutation = Mutation<void>();
  static final upsertLayoutMutation = Mutation<EventSuccessLayout>();
  static final spatialControlMutation =
      Mutation<EventSuccessSpatialActionResult>();
  static final recordUnitOutcomesMutation = Mutation<void>();
  static final resolveLateArrivalMutation =
      Mutation<EventSuccessLateArrivalResolution>();
  static final accountabilityResolutionMutation = Mutation<void>();
  static final configureAssignmentFeaturesMutation =
      Mutation<EventSuccessAssignmentFeatureSaveResult>();

  @override
  void build() {}

  Future<EventSuccessAssignmentFeaturePreview> previewAssignmentFeatures({
    required String eventId,
    required List<EventSuccessAssignmentFeatureRule> rules,
    List<String> sourceFormIds = const [],
  }) async {
    requireSignedInUid(ref, action: 'preview event matching coverage');
    return ref
        .read(eventSuccessRepositoryProvider)
        .previewAssignmentFeatures(
          eventId: eventId,
          rules: rules,
          sourceFormIds: sourceFormIds,
        );
  }

  Future<EventSuccessAssignmentFeatureSaveResult> configureAssignmentFeatures({
    required String eventId,
    required int expectedRevision,
    required String requestId,
    required List<EventSuccessAssignmentFeatureRule> rules,
  }) async {
    requireSignedInUid(ref, action: 'save event matching preferences');
    return ref
        .read(eventSuccessRepositoryProvider)
        .configureAssignmentFeatures(
          eventId: eventId,
          expectedRevision: expectedRevision,
          requestId: requestId,
          rules: rules,
        );
  }

  Future<EventSuccessPlan> ensurePlan(Event event) async {
    requireSignedInUid(ref, action: 'set up the live event guide');
    return ref.read(eventSuccessRepositoryProvider).ensurePlanForEvent(event);
  }

  Future<EventSuccessLayout> upsertLayout({
    required String organizerId,
    required EventSuccessLayout layout,
    String? layoutId,
  }) async {
    requireSignedInUid(ref, action: 'save a reusable event room layout');
    return ref
        .read(eventSuccessRepositoryProvider)
        .upsertOrganizerLayout(
          organizerId: organizerId,
          layout: layout,
          layoutId: layoutId,
        );
  }

  Future<EventSuccessSpatialActionResult> controlSpatialPlacement({
    required String eventId,
    required int expectedRevision,
    required EventSuccessSpatialAction action,
    required String moduleId,
    required String uid,
    String? destinationUnitId,
    EventSuccessSpatialScope? scope,
  }) async {
    requireSignedInUid(ref, action: 'control event room placement');
    return ref
        .read(eventSuccessRepositoryProvider)
        .controlSpatialPlacement(
          eventId: eventId,
          expectedRevision: expectedRevision,
          action: action,
          moduleId: moduleId,
          uid: uid,
          destinationUnitId: destinationUnitId,
          scope: scope,
        );
  }

  Future<void> saveSetup({
    required EventSuccessPlan plan,
    required EventSuccessHostDraft draft,
    required String? layoutId,
    String? attendeePrompt,
  }) async {
    requireSignedInUid(ref, action: 'save the live event guide');
    final normalizedPrompt = attendeePrompt?.trim();
    final nextPlan = plan
        .copyWithDraft(draft, updatedAt: DateTime.now())
        .copyWith(
          layoutId: layoutId,
          attendeePrompt: normalizedPrompt == null || normalizedPrompt.isEmpty
              ? null
              : normalizedPrompt,
        );
    await ref
        .read(eventSuccessRepositoryProvider)
        .savePlan(nextPlan, expectedUpdatedAt: plan.updatedAt);
  }

  Future<void> updateActiveStep({
    required String eventId,
    required int activeStepIndex,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'run live event guide');
    await ref
        .read(eventSuccessRepositoryProvider)
        .updateActiveStep(
          eventId: eventId,
          activeStepIndex: activeStepIndex,
          expectedRevision: expectedRevision,
        );
  }

  Future<void> startRevealCountdown({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) async {
    requireSignedInUid(ref, action: 'start event reveal countdown');
    await ref
        .read(eventSuccessRepositoryProvider)
        .startLiveRevealCountdown(
          eventId: eventId,
          roundIndex: roundIndex,
          expectedRevision: expectedRevision,
          confirmed: confirmed,
        );
  }

  Future<void> revealRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) async {
    requireSignedInUid(ref, action: 'reveal event round');
    await ref
        .read(eventSuccessRepositoryProvider)
        .revealLiveRound(
          eventId: eventId,
          roundIndex: roundIndex,
          expectedRevision: expectedRevision,
          confirmed: confirmed,
        );
  }

  Future<void> cancelRevealCountdown({
    required String eventId,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'cancel event reveal countdown');
    await ref
        .read(eventSuccessRepositoryProvider)
        .cancelLiveRevealCountdown(
          eventId: eventId,
          expectedRevision: expectedRevision,
        );
  }

  Future<void> recordUnitOutcomes({
    required String eventId,
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) async {
    requireSignedInUid(ref, action: 'record event outcomes');
    await ref
        .read(eventSuccessRepositoryProvider)
        .recordUnitOutcomes(
          eventId: eventId,
          expectedRevision: expectedRevision,
          roundIndex: roundIndex,
          entries: entries,
        );
  }

  Future<void> completePlan({
    required String eventId,
    required int expectedRevision,
    required bool accountabilityAcknowledged,
  }) async {
    requireSignedInUid(ref, action: 'complete the live event guide');
    await ref
        .read(eventSuccessRepositoryProvider)
        .completePlan(
          eventId: eventId,
          expectedRevision: expectedRevision,
          accountabilityAcknowledged: accountabilityAcknowledged,
        );
  }

  Future<void> setAccountabilityResolution({
    required String eventId,
    required String attendeeId,
    required EventSuccessAccountabilityResolution? resolution,
  }) async {
    requireSignedInUid(ref, action: 'resolve the event accountability sweep');
    await ref
        .read(eventSuccessRepositoryProvider)
        .setAccountabilityResolution(
          eventId: eventId,
          attendeeId: attendeeId,
          resolution: resolution,
        );
  }

  Future<void> submitFeedback(EventSuccessFeedback feedback) async {
    requireSignedInUid(ref, action: 'submit event feedback');
    await ref.read(eventSuccessRepositoryProvider).submitFeedback(feedback);
  }

  Future<void> saveCompatibilityResponse({
    required Event event,
    required List<String> answerIds,
    EventSuccessQuestionnaireConfig questionnaireConfig =
        const EventSuccessQuestionnaireConfig.defaultTemplate(),
  }) async {
    final uid = requireSignedInUid(ref, action: 'save match clue answers');
    await ref
        .read(eventSuccessRepositoryProvider)
        .saveCompatibilityResponse(
          event: event,
          uid: uid,
          answerIds: EventSuccessCompatibilityQuestionnaire.normalizedAnswerIds(
            answerIds,
            config: questionnaireConfig,
          ),
          questionnaireConfig: questionnaireConfig,
        );
  }

  Future<void> startFirstHelloMission({
    required Event event,
    required String venueSessionToken,
  }) async {
    requireSignedInUid(ref, action: 'start First Hello check-in');
    await ref
        .read(eventSuccessRepositoryProvider)
        .startFirstHelloMission(
          event: event,
          venueSessionToken: venueSessionToken,
        );
  }

  Future<void> completeFirstHelloMission({
    required Event event,
    required EventSuccessArrivalMission mission,
    required String answerId,
  }) async {
    requireSignedInUid(ref, action: 'complete First Hello check-in');
    if (mission.eventId != event.id) {
      throw StateError('First Hello mission does not belong to this event.');
    }
    await ref
        .read(eventSuccessRepositoryProvider)
        .completeFirstHelloMission(event: event, answerId: answerId);
  }

  Future<void> saveWingmanRequest({
    required Event event,
    required PublicProfile target,
    String? note,
  }) async {
    requireSignedInUid(ref, action: 'ask host for help');
    await ref
        .read(eventSuccessRepositoryProvider)
        .saveWingmanRequest(event: event, target: target, note: note);
  }

  Future<void> withdrawWingmanRequest({required Event event}) async {
    requireSignedInUid(ref, action: 'withdraw host help request');
    await ref
        .read(eventSuccessRepositoryProvider)
        .withdrawWingmanRequest(event: event);
  }

  Future<void> generateMicroPods({required String eventId}) async {
    requireSignedInUid(ref, action: 'generate event micro-pods');
    await ref
        .read(eventSuccessRepositoryProvider)
        .generateMicroPodAssignments(eventId: eventId);
  }

  Future<void> generateGuidedRotations({
    required String eventId,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'generate event rotations');
    await ref
        .read(eventSuccessRepositoryProvider)
        .generateGuidedRotations(
          eventId: eventId,
          expectedRevision: expectedRevision,
        );
  }

  Future<EventSuccessLateArrivalResolution> resolveLateArrival({
    required String eventId,
    required String uid,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'place a late event attendee');
    return ref
        .read(eventSuccessRepositoryProvider)
        .resolveLateArrival(
          eventId: eventId,
          uid: uid,
          expectedRevision: expectedRevision,
        );
  }

  Future<void> overrideGuidedRotations({
    required String eventId,
    required int expectedRevision,
    required List<EventSuccessRotationOverrideRound> rounds,
  }) async {
    requireSignedInUid(ref, action: 'override event rotations');
    await ref
        .read(eventSuccessRepositoryProvider)
        .overrideGuidedRotations(
          eventId: eventId,
          expectedRevision: expectedRevision,
          rounds: rounds,
        );
  }

  Future<void> publishGuidedRotationRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
    required bool confirmed,
  }) async {
    requireSignedInUid(ref, action: 'publish event rotation round');
    await ref
        .read(eventSuccessRepositoryProvider)
        .publishGuidedRotationRound(
          eventId: eventId,
          roundIndex: roundIndex,
          expectedRevision: expectedRevision,
          confirmed: confirmed,
        );
  }

  Future<void> overrideGroupAssignments({
    required String eventId,
    required List<EventSuccessGroupOverrideRound> rounds,
  }) async {
    requireSignedInUid(ref, action: 'override event groups');
    await ref
        .read(eventSuccessRepositoryProvider)
        .overrideGroupAssignments(eventId: eventId, rounds: rounds);
  }

  Future<void> setMicroPodsOptOut({
    required Event event,
    required bool optedOut,
  }) async {
    final uid = requireSignedInUid(ref, action: 'update micro-pod preference');
    await ref
        .read(eventSuccessRepositoryProvider)
        .setMicroPodsOptOut(event: event, uid: uid, optedOut: optedOut);
  }

  Future<void> setGuidedRotationsOptOut({
    required Event event,
    required bool optedOut,
  }) async {
    final uid = requireSignedInUid(
      ref,
      action: 'update guided rotation preference',
    );
    await ref
        .read(eventSuccessRepositoryProvider)
        .setGuidedRotationsOptOut(event: event, uid: uid, optedOut: optedOut);
  }
}
