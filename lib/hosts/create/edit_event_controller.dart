import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_draft_values.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_kernel/business_rules.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'edit_event_controller.g.dart';

/// One edit session: the organizer and the event as it was opened. The
/// screen keeps one instance, so the provider family keys on its identity.
class EditEventArgs {
  EditEventArgs({required this.organizer, required this.event, this.now});

  final Organizer organizer;
  final Event event;

  /// A fixed clock for previews and tests.
  final DateTime Function()? now;
}

/// Editing a saved event with the create editor. The event fills the draft;
/// what bookings lock is worked out once, when editing starts; Save checks
/// the draft and hands back the update the backend checks again.
///
/// It reads the event's private access for an invite-only event's code;
/// it writes nothing itself.
@riverpod
class EditEventController extends _$EditEventController {
  ProviderSubscription<AsyncValue<EventPrivateAccess?>>? _invite;
  bool _inviteSeeded = false;

  DateTime get _now => args.now?.call() ?? DateTime.now();

  @override
  CreateFlowState build(EditEventArgs args) {
    ref.onDispose(() => _invite?.close());
    final event = args.event;
    final now = _now;
    final scheduleLocked = editEventScheduleLocked(event, now);
    final draft = editDraftFromEvent(event, savedAt: now);
    if (editAdmissionPreset(draft) == EventAdmissionPreset.inviteOnly) {
      Future.microtask(_followInviteCode);
    }
    return CreateFlowState(
      organizer: args.organizer,
      draft: draft,
      eventId: event.id,
      photoUrls: [for (final photo in event.eventPhotos) photo.url],
      edit: CreateEditFacts(
        event: event,
        scheduleLocked: scheduleLocked,
        policyLocked: editEventPolicyLocked(event, now),
      ),
    );
  }

  // ---- the form ----

  void edit(EventDraft Function(EventDraft draft) change) {
    if (!state.canChange) return;
    state = state.copyWith(
      draft: change(state.draft),
      problems: const <CreateProblem>{},
      clearError: true,
    );
  }

  void goTo(CreateStep step) {
    if (state.working || step == CreateStep.share) return;
    state = state.copyWith(step: step);
  }

  void setDate(DateTime date) =>
      edit((draft) => draft.copyWith(eventLocalDate: createLocalDate(date)));

  void setStart(int hour, int minute) => edit(
    (draft) =>
        draft.copyWith(eventLocalStartTime: createLocalTime(hour, minute)),
  );

  /// The end as minutes after the start, crossing midnight when earlier,
  /// kept within the length an event can run.
  void setEnd(int hour, int minute) {
    final start = createMinutesOf(state.draft.eventLocalStartTime);
    if (start == null) return;
    var duration = hour * 60 + minute - start;
    if (duration <= 0) duration += 24 * 60;
    final clamped = duration.clamp(
      BusinessRules.eventMinDurationMinutes,
      BusinessRules.eventMaxDurationMinutes,
    );
    edit((draft) => draft.copyWith(durationMinutes: clamped));
  }

  /// A picked place; its name replaces the shown name when it has one.
  void setPlace(EventMeetingLocation place) => edit(
    (draft) => draft.copyWith(
      meetingPoint: place.name.trim().isEmpty ? draft.meetingPoint : place.name,
      meetingLocationAddress: place.address,
      meetingLocationPlaceId: place.placeId,
      startingPointLat: place.latitude,
      startingPointLng: place.longitude,
    ),
  );

  void useTemplate(List<EventItineraryItem> steps) =>
      edit((draft) => draft.copyWith(itinerary: steps));

  /// Adds or replaces a plan step. Saved plans keep their own start times,
  /// so steps are ordered by when they start rather than re-timed.
  void putStep(EventItineraryItem step) => edit((draft) {
    final steps = [...draft.itinerary];
    final index = steps.indexWhere((item) => item.id == step.id);
    if (index == -1) {
      steps.add(step);
    } else {
      steps[index] = step;
    }
    steps.sort((a, b) => a.offsetMinutes.compareTo(b.offsetMinutes));
    return draft.copyWith(itinerary: steps);
  });

  void removeStep(String id) => edit(
    (draft) => draft.copyWith(
      itinerary: draft.itinerary.where((item) => item.id != id).toList(),
    ),
  );

  void setRoutePlan(RouteEventPlan? plan) =>
      edit((draft) => draft.copyWith(routePlan: plan?.toJson()));

  /// Who can book. Leaving open capacity turns cohort caps off; leaving
  /// balanced singles turns demand pricing off; an invite-only event reads
  /// its current code.
  void setAdmission(EventAdmissionPreset preset) {
    edit(
      (draft) => draft.copyWith(
        admissionPreset: preset.name,
        dynamicPricingEnabled:
            preset == EventAdmissionPreset.balancedSingles &&
            draft.dynamicPricingEnabled,
      ),
    );
    if (preset == EventAdmissionPreset.inviteOnly) _followInviteCode();
  }

  void setCohortCaps(bool on) => edit(
    (draft) => draft.copyWith(
      admissionPreset: on
          ? editFixedCohortCapsPreset
          : EventAdmissionPreset.openCapacity.name,
    ),
  );

  /// Demand pricing starts from a small step and a ceiling when its fields
  /// are empty.
  void setDemandPricing(bool on) => edit(
    (draft) => draft.copyWith(
      dynamicPricingEnabled: on,
      dynamicPricingStep: on && (draft.dynamicPricingStep ?? '').isEmpty
          ? '250'
          : draft.dynamicPricingStep,
      dynamicPricingMax: on && (draft.dynamicPricingMax ?? '').isEmpty
          ? '1500'
          : draft.dynamicPricingMax,
    ),
  );

  /// The age range, stored with 0 and 99 as no limit.
  void setAgeRange(int minAge, int maxAge) => edit(
    (draft) => draft.copyWith(
      minAge: minAge <= 18 ? '' : '$minAge',
      maxAge: maxAge >= 99 ? '' : '$maxAge',
    ),
  );

  void setCancellationPolicy(EventCancellationPolicyId id) =>
      edit((draft) => draft.copyWith(cancellationPolicy: id.name));

  // ---- saving ----

  /// The update the edit becomes, or null with the problems shown on their
  /// fields. The screen sends it through
  /// [HostEventBookingController.updateHostedEventMutation], so its pending
  /// and error states are the command's own.
  EditEventSaveRequest? checkedRequest() {
    final facts = state.edit;
    if (facts == null || !state.canChange) return null;
    final problems = editEventProblems(
      event: facts.event,
      draft: state.draft,
      scheduleLocked: facts.scheduleLocked,
      policyLocked: facts.policyLocked,
      now: _now,
    );
    if (problems.isNotEmpty) {
      state = state.copyWith(problems: problems, step: _stepOf(problems));
      return null;
    }
    return EditEventSaveRequest.fromDraft(
      event: facts.event,
      draft: state.draft,
      scheduleLocked: facts.scheduleLocked,
      policyLocked: facts.policyLocked,
    );
  }

  /// The first step that shows one of [problems], for the expanded editor.
  CreateStep _stepOf(Set<CreateProblem> problems) {
    bool any(Set<CreateProblem> of) => problems.any(of.contains);
    if (any({CreateProblem.name, CreateProblem.distance})) {
      return CreateStep.basics;
    }
    if (any({
      CreateProblem.schedule,
      CreateProblem.placeName,
      CreateProblem.place,
    })) {
      return CreateStep.when;
    }
    return CreateStep.tickets;
  }

  // ---- the invite code ----

  /// Reads the event's current invite code once and fills an empty field.
  void _followInviteCode() {
    if (!ref.mounted || _invite != null || _inviteSeeded) return;
    state = state.copyWith(edit: state.edit?.copyWith(inviteCodeLoading: true));
    _invite = ref.listen<AsyncValue<EventPrivateAccess?>>(
      watchEventPrivateAccessProvider(args.event.id),
      (_, access) => _onInviteCode(access),
      fireImmediately: true,
    );
  }

  void _onInviteCode(AsyncValue<EventPrivateAccess?> access) {
    if (access.isLoading || _inviteSeeded) return;
    _inviteSeeded = true;
    final code = access.asData?.value?.inviteCode.trim() ?? '';
    final facts = state.edit;
    final fill = code.isNotEmpty && (state.draft.inviteCode ?? '').isEmpty;
    state = state.copyWith(
      draft: fill ? state.draft.copyWith(inviteCode: code) : null,
      edit: facts?.copyWith(
        inviteCodeLoading: false,
        inviteCodeSeed: fill ? facts.inviteCodeSeed + 1 : null,
      ),
    );
    // One read is enough; the field owns the code from here.
    Future.microtask(() {
      _invite?.close();
      _invite = null;
    });
  }
}
