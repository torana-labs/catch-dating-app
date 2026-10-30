import 'dart:async';
import 'dart:io' show Platform;
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_conversation_cue.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/event_success/presentation/companion/event_success_companion_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_moment_presentation_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_motion_contract.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/event_success_moment_presentations.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lottie/lottie.dart';

part 'companion_parts/event_success_companion_afterglow_card.dart';
part 'companion_parts/event_success_companion_arrival_card.dart';
part 'companion_parts/event_success_companion_arrival_section.dart';
part 'companion_parts/event_success_companion_check_in_qr_scanner_sheet.dart';
part 'companion_parts/event_success_companion_feedback_form.dart';
part 'companion_parts/event_success_companion_group_rotation_slot_row.dart';
part 'companion_parts/event_success_companion_live_card.dart';
part 'companion_parts/event_success_companion_motion_viewport.dart';
part 'companion_parts/event_success_companion_paper_section.dart';
part 'companion_parts/event_success_companion_people_token_row.dart';
part 'companion_parts/event_success_companion_questionnaire_section.dart';
part 'companion_parts/event_success_companion_reveal_overlay.dart';
part 'companion_parts/event_success_companion_rotation_slot_row.dart';
part 'companion_parts/event_success_companion_shared.dart';
part 'companion_parts/event_success_companion_stage_viewport.dart';
part 'companion_parts/event_success_companion_wingman_section.dart';
part 'event_success_companion_body_screen.dart';

abstract final class EventSuccessCompanionKeys {
  static const scrollView = ValueKey<String>(
    'event_success.companion.scroll_view',
  );
}

bool _companionCanPop(BuildContext context) =>
    Navigator.maybeOf(context)?.canPop() ?? false;

void _popCompanion(BuildContext context) {
  Navigator.maybeOf(context)?.maybePop();
}

class CompanionScaffold extends StatelessWidget {
  const CompanionScaffold({super.key, required this.body});

  final Widget body;

  @override
  Widget build(BuildContext context) {
    final canPop = _companionCanPop(context);
    return CatchScaffold.workspace(
      backgroundColor: CatchTokens.of(context).bg,
      title: CatchTopBar.route(
        title: context
            .l10n
            .eventSuccessEventSuccessCompanionScreenTitleEventCompanion,
        emphasis: CatchTopBarEmphasis.divided,
        leading: CatchIconAction.toolbar(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: canPop ? () => _popCompanion(context) : null,
          icon: CatchIcons.back,
        ),
      ),
      body: body,
    );
  }
}

class CompanionSkeleton extends StatelessWidget {
  const CompanionSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const CompanionScaffold(
      body: EventSuccessCompanionLoadingPageBody(),
    );
  }
}

class CompanionErrorState extends StatelessWidget {
  const CompanionErrorState({
    super.key,
    required this.error,
    required this.errorContext,
    required this.onRetry,
  });

  final Object error;
  final AppErrorContext errorContext;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return CompanionScaffold(
      body: Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchLocalizedErrorState(
            error,
            context: errorContext,
            onRetry: onRetry,
            mode: CatchErrorStateMode.inline,
          ),
        ),
      ),
    );
  }
}

class CompanionEmptyState extends StatelessWidget {
  const CompanionEmptyState({
    super.key,
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return CompanionScaffold(
      body: Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchErrorState(
            title: title,
            message: message,
            mode: CatchErrorStateMode.inline,
          ),
        ),
      ),
    );
  }
}

Future<void> _noopFuture() async {}
Future<void> _noopVenueCheckIn(String _) async {}
Future<void> _noopSaveCompatibilityAnswers(List<String> answerIds) async {}
void _noopIncludeChange(bool include) {}
Future<void> _noopSaveWingmanRequest(PublicProfile target, String note) async {}
Future<void> _noopSubmitFeedback(EventSuccessFeedback feedback) async {}

Future<String?> showEventVenueSessionScanner({
  required BuildContext context,
  required String eventId,
}) => showCatchBottomSheet<String>(
  context: context,
  builder: (context) => EventCheckInQrScannerSheet(eventId: eventId),
);

class EventSuccessCompanionRouteScreen extends ConsumerWidget {
  const EventSuccessCompanionRouteScreen({
    super.key,
    required this.clubId,
    required this.eventId,
    this.initialEvent,
  });

  final String clubId;
  final String eventId;
  final Event? initialEvent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final watchedUid = uidState.value;
    final eventAsync = ref.watch(watchEventProvider(eventId));
    final planAsync = ref.watch(watchEventSuccessPlanProvider(eventId));
    final referenceNowAsync = ref.watch(eventSuccessCompanionClockProvider);
    final referenceNow =
        catchAsyncStateFromAsyncValue(referenceNowAsync).value ??
        DateTime.now();

    final profileAsync = watchedUid == null
        ? null
        : ref.watch(watchUserProfileProvider);
    final participationAsync = watchedUid == null
        ? null
        : ref.watch(watchEventParticipationProvider(eventId, watchedUid));
    var routeState = EventSuccessCompanionRouteState.resolveCore(
      l10n: context.l10n,
      eventState: catchAsyncStateFromAsyncValue(eventAsync),
      initialEvent: initialEvent,
      uidState: uidState,
      profileState: profileAsync == null
          ? null
          : catchAsyncStateFromAsyncValue(profileAsync),
      participationState: participationAsync == null
          ? null
          : catchAsyncStateFromAsyncValue(participationAsync),
      planState: catchAsyncStateFromAsyncValue(planAsync),
      referenceNow: referenceNow,
    );

    VoidCallback companionRouteRetryCallback(
      EventSuccessCompanionRouteState state,
    ) {
      return () {
        switch (state.retryIntent) {
          case EventSuccessCompanionRetryIntent.event:
            ref.invalidate(watchEventProvider(eventId));
          case EventSuccessCompanionRetryIntent.uid:
            ref.invalidate(uidProvider);
          case EventSuccessCompanionRetryIntent.profile:
            ref.invalidate(watchUserProfileProvider);
          case EventSuccessCompanionRetryIntent.participation:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(watchEventParticipationProvider(eventId, uid));
            }
          case EventSuccessCompanionRetryIntent.plan:
            ref.invalidate(watchEventSuccessPlanProvider(eventId));
          case EventSuccessCompanionRetryIntent.arrivalMission:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessArrivalMissionProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.compatibility:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessCompatibilityResponseProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.feedback:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessFeedbackProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.assignment:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessAssignmentProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.rotationAssignment:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessRotationAssignmentProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.standings:
            ref.invalidate(watchEventSuccessStandingsProvider(eventId));
          case EventSuccessCompanionRetryIntent.preference:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessPreferenceProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.wingmanRequest:
            final uid = state.uid;
            if (uid != null) {
              ref.invalidate(
                watchUserEventSuccessWingmanRequestProvider(
                  eventId: eventId,
                  uid: uid,
                ),
              );
            }
          case EventSuccessCompanionRetryIntent.wingmanCandidates:
            final profile = state.profile;
            if (profile != null) {
              ref.invalidate(
                wingmanRequestCandidatesProvider(
                  eventId: eventId,
                  currentUser: profile,
                ),
              );
            }
          case null:
            break;
        }
      };
    }

    if (routeState.status != EventSuccessCompanionRouteStatus.ready) {
      return _CompanionRouteGate(
        state: routeState,
        onRetry: companionRouteRetryCallback(routeState),
      );
    }

    final event = routeState.event!;
    final uid = routeState.uid!;
    final profile = routeState.profile!;
    final participation = routeState.participation!;
    final plan = routeState.plan!;
    final attendeeIsPresent =
        participation.status == EventParticipationStatus.attended;
    if (attendeeIsPresent && !routeState.eventEnded) {
      ref.watch(maintainEventSuccessPresenceProvider(eventId));
    }
    final AsyncValue<EventSuccessLateArrivalResolution?>
    lateArrivalResolutionAsync = attendeeIsPresent
        ? ref.watch(
            watchUserEventSuccessLateArrivalResolutionProvider(
              eventId: eventId,
              uid: uid,
            ),
          )
        : const AsyncData<EventSuccessLateArrivalResolution?>(null);
    final lateArrivalResolutionState = catchAsyncStateFromAsyncValue(
      lateArrivalResolutionAsync,
    );
    final AsyncValue<EventSuccessLayout?> spatialLayoutAsync =
        plan.layoutId != null &&
            plan.structureConfig.unitKind != EventSuccessUnitKind.wholeGroup
        ? ref.watch(eventSuccessSpatialLayoutProvider(eventId))
        : const AsyncData<EventSuccessLayout?>(null);
    final spatialLayoutState = catchAsyncStateFromAsyncValue(
      spatialLayoutAsync,
    );
    final AsyncValue<EventSuccessArrivalMission?> arrivalMissionAsync =
        routeState.firstHelloAvailable
        ? ref.watch(
            watchUserEventSuccessArrivalMissionProvider(
              eventId: eventId,
              uid: uid,
            ),
          )
        : const AsyncData<EventSuccessArrivalMission?>(null);

    // Wave 2: arrival mission resolves before the attendee moment so First
    // Hello can preempt questionnaire/check-in when the module is enabled.
    routeState = routeState.withArrivalMission(
      catchAsyncStateFromAsyncValue(arrivalMissionAsync),
    );
    if (routeState.status != EventSuccessCompanionRouteStatus.ready) {
      return _CompanionRouteGate(
        state: routeState,
        onRetry: companionRouteRetryCallback(routeState),
      );
    }

    final AsyncValue<EventSuccessCompatibilityResponse?> compatibilityAsync =
        !routeState.firstHelloAvailable &&
            routeState.runtime!.canUseCompatibilityQuestionnaire(
              participationStatus: participation.status,
              eventEnded: routeState.eventEnded,
            )
        ? ref.watch(
            watchUserEventSuccessCompatibilityResponseProvider(
              eventId: eventId,
              uid: uid,
            ),
          )
        : const AsyncData<EventSuccessCompatibilityResponse?>(null);

    // Wave 2: compatibility response, resolved before the attendee moment.
    routeState = routeState.withCompatibilityResponse(
      catchAsyncStateFromAsyncValue(compatibilityAsync),
    );
    if (routeState.status != EventSuccessCompanionRouteStatus.ready) {
      return _CompanionRouteGate(
        state: routeState,
        onRetry: companionRouteRetryCallback(routeState),
      );
    }

    final attendeeMoment = routeState.attendeeMoment!;
    final AsyncValue<EventSuccessPreference?> preferenceAsync =
        attendeeMoment.showPreCheckInPlanning ||
            routeState.shouldLoadAssignment ||
            routeState.shouldLoadRotations
        ? ref.watch(
            watchUserEventSuccessPreferenceProvider(eventId: eventId, uid: uid),
          )
        : const AsyncData<EventSuccessPreference?>(null);
    final preferenceState = catchAsyncStateFromAsyncValue(preferenceAsync);
    final microPodsOptedOut = preferenceState.value?.microPodsOptedOut ?? false;
    final guidedRotationsOptedOut =
        preferenceState.value?.guidedRotationsOptedOut ?? false;
    final AsyncValue<EventSuccessFeedback?> feedbackAsync =
        routeState.shouldLoadFeedback
        ? ref.watch(
            watchUserEventSuccessFeedbackProvider(eventId: eventId, uid: uid),
          )
        : const AsyncData<EventSuccessFeedback?>(null);
    final AsyncValue<List<PublicProfile>> candidatesAsync =
        routeState.shouldLoadWingmanRequest
        ? ref.watch(
            wingmanRequestCandidatesProvider(
              eventId: eventId,
              currentUser: profile,
            ),
          )
        : const AsyncData(<PublicProfile>[]);
    final AsyncValue<EventSuccessWingmanRequest?> wingmanRequestAsync =
        routeState.shouldLoadWingmanRequest
        ? ref.watch(
            watchUserEventSuccessWingmanRequestProvider(
              eventId: eventId,
              uid: uid,
            ),
          )
        : const AsyncData<EventSuccessWingmanRequest?>(null);
    final AsyncValue<EventSuccessAssignment?> assignmentAsync =
        routeState.shouldLoadAssignment &&
            !preferenceState.isLoading &&
            !microPodsOptedOut
        ? ref.watch(
            watchUserEventSuccessAssignmentProvider(eventId: eventId, uid: uid),
          )
        : const AsyncData<EventSuccessAssignment?>(null);
    final AsyncValue<EventSuccessAssignment?> rotationAsync =
        routeState.shouldLoadRotations &&
            !preferenceState.isLoading &&
            !guidedRotationsOptedOut
        ? ref.watch(
            watchUserEventSuccessRotationAssignmentProvider(
              eventId: eventId,
              uid: uid,
            ),
          )
        : const AsyncData<EventSuccessAssignment?>(null);
    final AsyncValue<EventSuccessStandings?> standingsAsync =
        routeState.shouldLoadStandings
        ? ref.watch(watchEventSuccessStandingsProvider(eventId))
        : const AsyncData<EventSuccessStandings?>(null);
    final feedbackState = catchAsyncStateFromAsyncValue(feedbackAsync);
    final candidatesState = catchAsyncStateFromAsyncValue(candidatesAsync);
    final wingmanRequestState = catchAsyncStateFromAsyncValue(
      wingmanRequestAsync,
    );
    final assignmentState = catchAsyncStateFromAsyncValue(assignmentAsync);
    final rotationState = catchAsyncStateFromAsyncValue(rotationAsync);
    final standingsState = catchAsyncStateFromAsyncValue(standingsAsync);

    // Wave 3: moment-specific feedback, preference, wingman, and assignments.
    routeState = routeState.withMomentData(
      feedbackState: feedbackState,
      preferenceState: preferenceState,
      wingmanCandidatesState: candidatesState,
      wingmanRequestState: wingmanRequestState,
      assignmentState: assignmentState,
      rotationState: rotationState,
      standingsState: standingsState,
    );
    if (routeState.status != EventSuccessCompanionRouteStatus.ready) {
      return _CompanionRouteGate(
        state: routeState,
        onRetry: companionRouteRetryCallback(routeState),
      );
    }

    final assignment = routeState.assignment;
    final rotationAssignment = routeState.rotationAssignment;
    final peerUidsKey = assignment == null
        ? ''
        : eventSuccessPeerUidsKey(assignment.allPeerUids);
    final peersAsync = peerUidsKey.isEmpty
        ? const AsyncData(<PublicProfile>[])
        : ref.watch(eventSuccessAssignmentPeerProfilesProvider(peerUidsKey));
    final peersState = catchAsyncStateFromAsyncValue(peersAsync);
    final rotationPeerUidsKey = rotationAssignment == null
        ? ''
        : eventSuccessPeerUidsKey(rotationAssignment.allPeerUids);
    final rotationPeersAsync = rotationPeerUidsKey.isEmpty
        ? const AsyncData(<PublicProfile>[])
        : ref.watch(
            eventSuccessAssignmentPeerProfilesProvider(rotationPeerUidsKey),
          );
    final rotationPeersState = catchAsyncStateFromAsyncValue(
      rotationPeersAsync,
    );
    final compatibilityMutation = ref.watch(
      EventSuccessController.compatibilityResponseMutation,
    );
    final feedbackMutation = ref.watch(EventSuccessController.feedbackMutation);
    final wingmanRequestMutation = ref.watch(
      EventSuccessController.wingmanRequestMutation,
    );
    final firstHelloStartMutation = ref.watch(
      EventSuccessController.firstHelloStartMutation,
    );
    final firstHelloCompleteMutation = ref.watch(
      EventSuccessController.firstHelloCompleteMutation,
    );
    final selfCheckInMutation = ref.watch(
      EventBookingController.selfCheckInMutation,
    );
    final microPodsOptOutMutation = ref.watch(
      EventSuccessController.microPodsOptOutMutation,
    );
    final guidedRotationsOptOutMutation = ref.watch(
      EventSuccessController.guidedRotationsOptOutMutation,
    );

    // Surface companion action failures (feedback, wingman, opt-outs, first
    // hello, match clues). These run as fire-and-forget mutations from the
    // cards, so without these listeners a failed write would be silent.
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        EventSuccessController.feedbackMutation,
        EventSuccessController.compatibilityResponseMutation,
        EventSuccessController.wingmanRequestMutation,
        EventSuccessController.firstHelloStartMutation,
        EventSuccessController.firstHelloCompleteMutation,
        EventBookingController.selfCheckInMutation,
        EventSuccessController.microPodsOptOutMutation,
        EventSuccessController.guidedRotationsOptOutMutation,
      ],
    );
    return EventSuccessCompanionScreen(
      event: event,
      plan: plan,
      spatialLayout: spatialLayoutState.value,
      userProfile: profile,
      participation: participation,
      wingmanRequestCandidates: routeState.wingmanRequestCandidates,
      wingmanRequest: routeState.wingmanRequest,
      compatibilityResponse: routeState.compatibilityResponse,
      existingFeedback: routeState.feedback,
      assignment: assignment,
      assignmentPeerProfiles: peersState.value ?? const <PublicProfile>[],
      assignmentPeersLoading: peersState.isLoading,
      microPodsOptedOut: routeState.microPodsOptedOut,
      rotationAssignment: rotationAssignment,
      standings: routeState.standings,
      rotationPeerProfiles: rotationPeersState.value ?? const <PublicProfile>[],
      rotationPeersLoading: rotationPeersState.isLoading,
      guidedRotationsOptedOut: routeState.guidedRotationsOptedOut,
      lateArrivalResolution: lateArrivalResolutionState.value,
      arrivalMission: routeState.activeArrivalMission,
      now: routeState.referenceNow!,
      compatibilityActionState: CompatibilityQuestionnaireActionState(
        isSaving: compatibilityMutation.isPending,
        error: compatibilityMutation.hasError
            ? (compatibilityMutation as MutationError).error
            : null,
      ),
      firstHelloActionState: FirstHelloActionState(
        startPending: firstHelloStartMutation.isPending,
        completePending: firstHelloCompleteMutation.isPending,
        skipPending: selfCheckInMutation.isPending,
      ),
      selfCheckInActionState: SelfCheckInActionState(
        isCheckingIn: selfCheckInMutation.isPending,
      ),
      isSavingMicroPodsOptOut: microPodsOptOutMutation.isPending,
      isSavingGuidedRotationsOptOut: guidedRotationsOptOutMutation.isPending,
      wingmanActionState: WingmanRequestActionState(
        isSaving: wingmanRequestMutation.isPending,
      ),
      feedbackActionState: EventSuccessFeedbackActionState(
        isSaving: feedbackMutation.isPending,
      ),
      onStartArrivalMission: () async {
        final venueSessionToken = await showCatchBottomSheet<String>(
          context: context,
          builder: (context) => EventCheckInQrScannerSheet(eventId: event.id),
        );
        if (venueSessionToken == null || !context.mounted) return;
        await EventSuccessController.firstHelloStartMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .startFirstHelloMission(
                event: event,
                venueSessionToken: venueSessionToken,
              ),
        );
      },
      onCompleteArrivalMission: (mission, answerId) async {
        await EventSuccessController.firstHelloCompleteMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .completeFirstHelloMission(
                event: event,
                mission: mission,
                answerId: answerId,
              ),
        );
      },
      onSkipArrivalMission: () async {
        final venueSessionToken = await showCatchBottomSheet<String>(
          context: context,
          builder: (context) => EventCheckInQrScannerSheet(eventId: event.id),
        );
        if (venueSessionToken == null || !context.mounted) return;
        await EventBookingController.selfCheckInMutation.run(
          ref,
          (tx) => tx
              .get(eventBookingControllerProvider.notifier)
              .selfCheckIn(
                eventId: event.id,
                venueSessionToken: venueSessionToken,
              ),
        );
      },
      onSetMicroPodsIncluded: (include) {
        EventSuccessController.microPodsOptOutMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .setMicroPodsOptOut(event: event, optedOut: !include),
        );
      },
      onSetGuidedRotationsIncluded: (include) {
        EventSuccessController.guidedRotationsOptOutMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .setGuidedRotationsOptOut(event: event, optedOut: !include),
        );
      },
      onSaveWingmanRequest: (target, note) async {
        await EventSuccessController.wingmanRequestMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .saveWingmanRequest(event: event, target: target, note: note),
        );
      },
      onWithdrawWingmanRequest: () async {
        await EventSuccessController.wingmanRequestMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .withdrawWingmanRequest(event: event),
        );
      },
      onSubmitFeedback: (feedback) async {
        await EventSuccessController.feedbackMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .submitFeedback(feedback),
        );
      },
      onSelfCheckIn: (venueSessionToken) async {
        unawaited(
          ref
              .read(eventSuccessLiveEffectsControllerProvider)
              .play(EventSuccessLiveEffectKind.liveEntry),
        );
        await EventBookingController.selfCheckInMutation.run(
          ref,
          (tx) => tx
              .get(eventBookingControllerProvider.notifier)
              .selfCheckIn(
                eventId: event.id,
                venueSessionToken: venueSessionToken,
              ),
        );
      },
      onPlayLiveEffect: (kind) =>
          ref.read(eventSuccessLiveEffectsControllerProvider).play(kind),
      onPlayAmbientBed: (bed) => ref
          .read(eventSuccessLiveEffectsControllerProvider)
          .playAmbientBed(bed),
    );
  }
}

class _CompanionRouteGate extends StatelessWidget {
  const _CompanionRouteGate({required this.state, required this.onRetry});

  final EventSuccessCompanionRouteState state;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => switch (state.status) {
    EventSuccessCompanionRouteStatus.loading => const CompanionSkeleton(),
    EventSuccessCompanionRouteStatus.message => CompanionEmptyState(
      title: state.message!.title,
      message: state.message!.message,
    ),
    EventSuccessCompanionRouteStatus.error => CompanionErrorState(
      error: state.error!,
      errorContext: state.errorContext!,
      onRetry: onRetry,
    ),
    EventSuccessCompanionRouteStatus.ready => const SizedBox.shrink(),
  };
}
