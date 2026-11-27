import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/create/create_draft_values.dart';
import 'package:catch_dating_app/hosts/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/business_rules.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show DateUtils;

// Editing a saved event with the create editor: the draft an event fills
// in, the rules that lock its schedule and policy, and the update the edited
// draft becomes. Pure values; the edit controller and tests share them.

/// The draft preset name for open capacity with fixed cohort caps; the
/// event policy stores it as its own admission format.
const editFixedCohortCapsPreset = 'fixedCohortCaps';

/// A cancelled event cannot be edited at all.
bool editEventCanEdit(Event event) => !event.isCancelled;

/// The schedule locks once the event has started or anyone has booked,
/// joined the waitlist or checked in.
bool editEventScheduleLocked(Event event, DateTime now) =>
    !editEventCanEdit(event) ||
    event.startTime.isBefore(now) ||
    event.signedUpCount > 0 ||
    event.waitlistCount > 0 ||
    event.attendedCount > 0;

/// Capacity, price, admission and invite setup lock with the schedule.
bool editEventPolicyLocked(Event event, DateTime now) =>
    editEventScheduleLocked(event, now);

/// The admission preset an event's policy is shown as.
EventAdmissionPreset editAdmissionPresetForPolicy(EventPolicyBundle policy) {
  if (policy.usesInviteOnly) return EventAdmissionPreset.inviteOnly;
  if (policy.admissionPolicy.manualApprovalRequired) {
    return policy.admissionPolicy.approvedMembersSkipReview
        ? EventAdmissionPreset.requestToJoinMembersExempt
        : EventAdmissionPreset.requestToJoin;
  }
  if (policy.usesBalancedRatio) return EventAdmissionPreset.balancedSingles;
  return EventAdmissionPreset.openCapacity;
}

/// The preset a draft stores, read back; fixed cohort caps read as open.
EventAdmissionPreset editAdmissionPreset(EventDraft draft) =>
    EventAdmissionPreset.values.firstWhereOrNull(
      (preset) => preset.name == draft.admissionPreset,
    ) ??
    EventAdmissionPreset.openCapacity;

/// Cohort caps are on: open capacity with per-cohort limits.
bool editCohortCapsEnabled(EventDraft draft) =>
    draft.admissionPreset == editFixedCohortCapsPreset;

/// The cancellation policy a draft stores, read back.
EventCancellationPolicyId editCancellationPolicy(EventDraft draft) =>
    EventCancellationPolicyId.values.firstWhereOrNull(
      (id) => id.name == draft.cancellationPolicy,
    ) ??
    EventCancellationPolicyId.standard;

/// The event's start as the device's wall clock, from the draft's local
/// date and start.
DateTime? editStartOf(EventDraft draft) {
  final date = DateTime.tryParse(draft.eventLocalDate ?? '');
  final minutes = createMinutesOf(draft.eventLocalStartTime);
  if (date == null || minutes == null) return null;
  return DateTime(date.year, date.month, date.day, minutes ~/ 60, minutes % 60);
}

/// The route plan a draft stores, read back.
RouteEventPlan? editRoutePlanOf(EventDraft draft) =>
    RouteEventPlan.tryFromJson(draft.routePlan);

/// The draft a saved event fills in, every editable value included. The
/// invite code is not on the event; the edit controller seeds it from the
/// event's private access.
EventDraft editDraftFromEvent(Event event, {required DateTime savedAt}) {
  final policy = event.effectiveEventPolicy;
  final demand = policy.pricingPolicy.demandPricingRules.firstOrNull;
  final location = event.effectiveMeetingLocation;
  final preset = editAdmissionPresetForPolicy(policy);
  final start = event.startTime;
  return EventDraft(
    id: 'edit-${event.id}',
    organizerId: event.organizerId,
    savedAt: savedAt,
    name: event.name,
    eventLocalDate: createLocalDate(start),
    eventLocalStartTime: createLocalTime(start.hour, start.minute),
    durationMinutes: event.endTime.difference(start).inMinutes,
    distance: event.eventFormat.activityKind.isDistanceBased
        ? EventFormatters.distanceKm(event.distanceKm, includeUnit: false)
        : null,
    capacity: '${event.capacityLimit}',
    price: CreateEventPolicyState.minorUnitsText(
      event.priceInPaise,
      currencyCode: event.currency,
    ),
    description: event.description,
    accessibility: event.eventFormat.accessibilityNotes,
    included: event.eventFormat.includedNotes,
    activityKind: event.eventFormat.activityKind.name,
    interactionModel: event.eventFormat.interactionModel.name,
    paceName: event.pace.name,
    routePlan: event.eventFormat.routePlan?.toJson(),
    itinerary: event.itinerary,
    meetingPoint: event.locationName,
    locationDetails: event.locationNotes,
    meetingLocationAddress: location?.address,
    meetingLocationPlaceId: location?.placeId,
    startingPointLat: event.effectiveStartingPointLat,
    startingPointLng: event.effectiveStartingPointLng,
    minAge: event.constraints.minAge == 0 ? '' : '${event.constraints.minAge}',
    maxAge: event.constraints.maxAge == 99 ? '' : '${event.constraints.maxAge}',
    maxMen: event.constraints.maxMen?.toString(),
    maxWomen: event.constraints.maxWomen?.toString(),
    admissionPreset: policy.usesFixedCohortCaps
        ? editFixedCohortCapsPreset
        : preset.name,
    dynamicPricingEnabled: policy.usesDemandPricing,
    dynamicPricingStep: CreateEventPolicyState.minorUnitsText(
      demand?.stepAdjustment.inPaise,
      currencyCode: event.currency,
    ),
    dynamicPricingMax: CreateEventPolicyState.minorUnitsText(
      demand?.maxAdjustment.inPaise,
      currencyCode: event.currency,
    ),
    cancellationPolicy: policy.cancellationPolicy.id.name,
  );
}

/// The update an edited draft becomes: the next event, whether the policy
/// is sent, and the invite code for an invite-only event.
@immutable
class EditEventSaveRequest {
  const EditEventSaveRequest({
    required this.nextEvent,
    required this.includePolicy,
    required this.inviteCode,
  });

  final Event nextEvent;
  final bool includePolicy;
  final String? inviteCode;

  /// The update from an edited draft. A locked schedule keeps the event's
  /// times; a locked policy keeps its capacity, price, limits and policy.
  factory EditEventSaveRequest.fromDraft({
    required Event event,
    required EventDraft draft,
    required bool scheduleLocked,
    required bool policyLocked,
  }) {
    final lat = draft.startingPointLat!;
    final lng = draft.startingPointLng!;
    return EditEventSaveRequest.fromForm(
      event: event,
      name: draft.name ?? '',
      accessibility: draft.accessibility,
      included: draft.included,
      itinerary: draft.itinerary,
      routePlanChanged: true,
      routePlan: editRoutePlanOf(draft),
      scheduleLocked: scheduleLocked,
      policyLocked: policyLocked,
      selectedStartDateTime: editStartOf(draft) ?? event.startTime,
      durationMinutes: draft.durationMinutes,
      startingPoint: LocationCoordinate(lat, lng),
      meetingPoint: draft.meetingPoint ?? '',
      meetingLocationAddress: draft.meetingLocationAddress,
      meetingLocationPlaceId: draft.meetingLocationPlaceId,
      locationDetails: draft.locationDetails ?? '',
      distanceText: draft.distance ?? '',
      selectedPace: PaceLevel.values.firstWhere(
        (pace) => pace.name == draft.paceName,
        orElse: () => event.pace,
      ),
      description: draft.description ?? '',
      capacityText: draft.capacity ?? '${event.capacityLimit}',
      priceText: draft.price ?? '',
      admissionPreset: editAdmissionPreset(draft),
      cohortCapsEnabled: editCohortCapsEnabled(draft),
      dynamicPricingEnabled: draft.dynamicPricingEnabled,
      minAgeText: draft.minAge ?? '',
      maxAgeText: draft.maxAge ?? '',
      maxMenText: draft.maxMen ?? '',
      maxWomenText: draft.maxWomen ?? '',
      dynamicPricingStepText: draft.dynamicPricingStep ?? '',
      dynamicPricingMaxText: draft.dynamicPricingMax ?? '',
      cancellationPolicyId: editCancellationPolicy(draft),
      inviteCodeText: draft.inviteCode ?? '',
    );
  }

  factory EditEventSaveRequest.fromForm({
    required Event event,
    String? name,
    String? accessibility,
    String? included,
    List<EventItineraryItem>? itinerary,
    bool routePlanChanged = false,
    RouteEventPlan? routePlan,
    required bool scheduleLocked,
    required bool policyLocked,
    required DateTime selectedStartDateTime,
    required int durationMinutes,
    required LocationCoordinate startingPoint,
    required String meetingPoint,
    required String? meetingLocationAddress,
    required String? meetingLocationPlaceId,
    required String locationDetails,
    required String distanceText,
    required PaceLevel selectedPace,
    required String description,
    required String capacityText,
    required String priceText,
    required EventAdmissionPreset admissionPreset,
    required bool cohortCapsEnabled,
    required bool dynamicPricingEnabled,
    required String minAgeText,
    required String maxAgeText,
    required String maxMenText,
    required String maxWomenText,
    required String dynamicPricingStepText,
    required String dynamicPricingMaxText,
    required EventCancellationPolicyId cancellationPolicyId,
    required String inviteCodeText,
  }) {
    final distanceKm = event.eventFormat.activityKind.isDistanceBased
        ? double.parse(distanceText.trim())
        : event.distanceKm;
    final startTime = scheduleLocked ? event.startTime : selectedStartDateTime;
    final endTime = scheduleLocked
        ? event.endTime
        : startTime.add(BusinessRules.eventDuration(durationMinutes));
    final meetingLocation = EventMeetingLocation(
      name: meetingPoint.trim(),
      address: meetingLocationAddress,
      placeId: meetingLocationPlaceId,
      latitude: startingPoint.latitude,
      longitude: startingPoint.longitude,
      notes: _trimToNull(locationDetails),
    ).normalized();
    final includePolicy = !policyLocked;
    final capacityLimit = includePolicy
        ? int.parse(capacityText.trim())
        : event.capacityLimit;
    final priceInPaise = includePolicy
        ? _minorUnits(priceText, currencyCode: event.currency)!
        : event.priceInPaise;
    final terms = includePolicy
        ? editPolicyTermsFor(
            admissionPreset: admissionPreset,
            cohortCapsEnabled: cohortCapsEnabled,
            dynamicPricingEnabled: dynamicPricingEnabled,
            minAgeText: minAgeText,
            maxAgeText: maxAgeText,
            maxMenText: maxMenText,
            maxWomenText: maxWomenText,
            dynamicPricingStepText: dynamicPricingStepText,
            dynamicPricingMaxText: dynamicPricingMaxText,
            cancellationPolicyId: cancellationPolicyId,
            inviteCodeText: inviteCodeText,
            currencyCode: event.currency,
            capacityLimit: capacityLimit,
            basePriceInPaise: priceInPaise,
            crossPathsPairCapacity: event
                .effectiveEventPolicy
                .admissionPolicy
                .crossPathsPairInventory
                .reservedPairCapacity,
          )
        : null;
    final eventFormat = routePlanChanged
        ? _eventFormatWithRoutePlan(event.eventFormat, routePlan)
        : event.eventFormat;

    return EditEventSaveRequest(
      nextEvent: event.copyWith(
        name: (name ?? event.name).trim(),
        startTime: startTime,
        endTime: endTime,
        meetingPoint: meetingLocation.name,
        meetingLocation: meetingLocation,
        startingPointLat: meetingLocation.latitude,
        startingPointLng: meetingLocation.longitude,
        locationDetails: meetingLocation.notes,
        itinerary: itinerary ?? event.itinerary,
        eventFormat: eventFormat.withPublicDetails(
          accessibility: accessibility,
          included: included,
        ),
        distanceKm: distanceKm,
        pace: event.eventFormat.activityKind.isDistanceBased
            ? selectedPace
            : event.pace,
        description: description.trim(),
        capacityLimit: capacityLimit,
        priceInPaise: priceInPaise,
        constraints: terms?.constraints ?? event.constraints,
        eventPolicy: terms == null ? event.eventPolicy : terms.eventPolicy,
      ),
      includePolicy: includePolicy,
      inviteCode: _trimToNull(inviteCodeText),
    );
  }
}

/// What an edited draft still needs before it can be sent, in the order the
/// fields appear. Locked sections are not checked.
Set<CreateProblem> editEventProblems({
  required Event event,
  required EventDraft draft,
  required bool scheduleLocked,
  required bool policyLocked,
  required DateTime now,
}) {
  final distance = double.tryParse((draft.distance ?? '').trim());
  final start = editStartOf(draft);
  return {
    if ((draft.name ?? '').trim().isEmpty) CreateProblem.name,
    if (event.eventFormat.activityKind.isDistanceBased &&
        (distance == null || distance <= 0))
      CreateProblem.distance,
    if (!scheduleLocked &&
        (start == null ||
            !start.isAfter(now) ||
            DateUtils.dateOnly(start).isAfter(
              DateUtils.dateOnly(
                now,
              ).add(BusinessRules.eventEditDatePickerWindow),
            )))
      CreateProblem.schedule,
    if ((draft.meetingPoint ?? '').trim().isEmpty) CreateProblem.placeName,
    if (draft.startingPointLat == null || draft.startingPointLng == null)
      CreateProblem.place,
    if (!policyLocked) ...{
      if (parseMajorCurrencyAmountToMinorUnits(
            draft.price ?? '',
            currencyCode: event.currency,
          ) ==
          null)
        CreateProblem.price,
      if ((int.tryParse((draft.capacity ?? '').trim()) ?? 0) < 1)
        CreateProblem.capacity,
      ...editPolicyProblems(draft),
    },
  };
}

/// What a draft's admission fields still need: an invite-only event's code
/// of 4 to 64 characters, cohort caps above zero and demand pricing's step
/// and maximum. [savedInviteCode] lets the code stay empty when the event
/// may already have one the backend keeps.
Set<CreateProblem> editPolicyProblems(
  EventDraft draft, {
  bool savedInviteCode = false,
}) {
  final preset = editAdmissionPreset(draft);
  final invite = (draft.inviteCode ?? '').trim();
  return {
    if (preset == EventAdmissionPreset.inviteOnly &&
        !(savedInviteCode && invite.isEmpty) &&
        (invite.length < 4 || invite.length > 64))
      CreateProblem.inviteCode,
    if (editCohortCapsEnabled(draft) &&
        (!_positiveOrEmpty(draft.maxMen) || !_positiveOrEmpty(draft.maxWomen)))
      CreateProblem.cohortCaps,
    if (preset == EventAdmissionPreset.balancedSingles &&
        draft.dynamicPricingEnabled &&
        (!_positive(draft.dynamicPricingStep) ||
            !_positive(draft.dynamicPricingMax)))
      CreateProblem.demandPricing,
  };
}

// ---- the admission fields, shared by create and edit ----

/// Who can book. Leaving open capacity turns cohort caps off; leaving
/// balanced singles turns demand pricing off.
EventDraft editDraftWithAdmission(
  EventDraft draft,
  EventAdmissionPreset preset,
) => draft.copyWith(
  admissionPreset: preset.name,
  dynamicPricingEnabled:
      preset == EventAdmissionPreset.balancedSingles &&
      draft.dynamicPricingEnabled,
);

/// Cohort caps on or off, as open capacity with or without its limits.
EventDraft editDraftWithCohortCaps(EventDraft draft, bool on) => draft.copyWith(
  admissionPreset: on
      ? editFixedCohortCapsPreset
      : EventAdmissionPreset.openCapacity.name,
);

/// Demand pricing starts from a small step and a ceiling when its fields
/// are empty.
EventDraft editDraftWithDemandPricing(EventDraft draft, bool on) =>
    draft.copyWith(
      dynamicPricingEnabled: on,
      dynamicPricingStep: on && (draft.dynamicPricingStep ?? '').isEmpty
          ? '250'
          : draft.dynamicPricingStep,
      dynamicPricingMax: on && (draft.dynamicPricingMax ?? '').isEmpty
          ? '1500'
          : draft.dynamicPricingMax,
    );

/// The age range, stored with 0 and 99 as no limit.
EventDraft editDraftWithAgeRange(EventDraft draft, int minAge, int maxAge) =>
    draft.copyWith(
      minAge: minAge <= 18 ? '' : '$minAge',
      maxAge: maxAge >= 99 ? '' : '$maxAge',
    );

/// The event policy and the age and cohort limits that admission fields
/// describe, for an event of [capacityLimit] places at [basePriceInPaise].
/// A request-to-join format keeps the cancellation policy and asks the host
/// to approve each booking; the others follow the organizer-default presets.
/// Editing and creating both send these.
({EventPolicyBundle eventPolicy, EventConstraints constraints})
editPolicyTermsFor({
  required EventAdmissionPreset admissionPreset,
  required bool cohortCapsEnabled,
  required bool dynamicPricingEnabled,
  required String minAgeText,
  required String maxAgeText,
  required String maxMenText,
  required String maxWomenText,
  required String dynamicPricingStepText,
  required String dynamicPricingMaxText,
  required EventCancellationPolicyId cancellationPolicyId,
  required String inviteCodeText,
  required String currencyCode,
  required int capacityLimit,
  required int basePriceInPaise,
  required int crossPathsPairCapacity,
}) {
  final defaults = EventPolicyDefaults(
    admissionPreset: _admissionDefaultPresetFromSelected(
      admissionPreset,
      cohortCapsEnabled: cohortCapsEnabled,
    ),
    minAge: int.tryParse(minAgeText.trim()) ?? 0,
    maxAge: int.tryParse(maxAgeText.trim()) ?? 99,
    maxMen: int.tryParse(maxMenText.trim()),
    maxWomen: int.tryParse(maxWomenText.trim()),
    dynamicPricingEnabled: dynamicPricingEnabled,
    dynamicPricingStepInPaise: _minorUnits(
      dynamicPricingStepText,
      currencyCode: currencyCode,
    ),
    dynamicPricingMaxInPaise: _minorUnits(
      dynamicPricingMaxText,
      currencyCode: currencyCode,
    ),
    cancellationPolicyId: cancellationPolicyId,
  );
  return (
    eventPolicy: _eventPolicyForDefaults(
      defaults: defaults,
      admissionPreset: admissionPreset,
      capacityLimit: capacityLimit,
      basePriceInPaise: basePriceInPaise,
      inviteCodeHint: _inviteCodeHint(inviteCodeText),
      crossPathsPairCapacity: crossPathsPairCapacity,
    ),
    constraints: defaults.toConstraints(),
  );
}

/// [editPolicyTermsFor] read from a draft's admission fields.
({EventPolicyBundle eventPolicy, EventConstraints constraints})
editPolicyTermsOfDraft(
  EventDraft draft, {
  required String currencyCode,
  required int capacityLimit,
  required int basePriceInPaise,
  required EventCancellationPolicyId cancellationPolicyId,
  int crossPathsPairCapacity = 0,
}) => editPolicyTermsFor(
  admissionPreset: editAdmissionPreset(draft),
  cohortCapsEnabled: editCohortCapsEnabled(draft),
  dynamicPricingEnabled: draft.dynamicPricingEnabled,
  minAgeText: draft.minAge ?? '',
  maxAgeText: draft.maxAge ?? '',
  maxMenText: draft.maxMen ?? '',
  maxWomenText: draft.maxWomen ?? '',
  dynamicPricingStepText: draft.dynamicPricingStep ?? '',
  dynamicPricingMaxText: draft.dynamicPricingMax ?? '',
  cancellationPolicyId: cancellationPolicyId,
  inviteCodeText: draft.inviteCode ?? '',
  currencyCode: currencyCode,
  capacityLimit: capacityLimit,
  basePriceInPaise: basePriceInPaise,
  crossPathsPairCapacity: crossPathsPairCapacity,
);

bool _positive(String? value) => (int.tryParse((value ?? '').trim()) ?? 0) > 0;

bool _positiveOrEmpty(String? value) =>
    (value ?? '').trim().isEmpty || _positive(value);

String? _trimToNull(String? value) {
  final normalized = value?.trim() ?? '';
  return normalized.isEmpty ? null : normalized;
}

EventAdmissionDefaultPreset _admissionDefaultPresetFromSelected(
  EventAdmissionPreset preset, {
  required bool cohortCapsEnabled,
}) {
  if (preset == EventAdmissionPreset.openCapacity && cohortCapsEnabled) {
    return EventAdmissionDefaultPreset.fixedCohortCaps;
  }
  return switch (preset) {
    EventAdmissionPreset.openCapacity =>
      EventAdmissionDefaultPreset.openCapacity,
    EventAdmissionPreset.inviteOnly => EventAdmissionDefaultPreset.inviteOnly,
    EventAdmissionPreset.requestToJoin ||
    EventAdmissionPreset.requestToJoinMembersExempt =>
      EventAdmissionDefaultPreset.openCapacity,
    EventAdmissionPreset.balancedSingles =>
      EventAdmissionDefaultPreset.balancedSingles,
  };
}

int? _minorUnits(String value, {required String currencyCode}) =>
    parseMajorCurrencyAmountToMinorUnits(value, currencyCode: currencyCode);

EventPolicyBundle _eventPolicyForDefaults({
  required EventPolicyDefaults defaults,
  required EventAdmissionPreset admissionPreset,
  required int capacityLimit,
  required int basePriceInPaise,
  required String? inviteCodeHint,
  required int crossPathsPairCapacity,
}) {
  final policy = admissionPreset.requiresReview
      ? EventPolicyBundle.requestToJoinEvent(
          approvedMembersSkipReview:
              admissionPreset ==
              EventAdmissionPreset.requestToJoinMembersExempt,
          capacityLimit: capacityLimit,
          basePriceInPaise: basePriceInPaise,
          cancellationPolicy: defaults.cancellationPolicy,
        )
      : defaults.toEventPolicyBundle(
          capacityLimit: capacityLimit,
          basePriceInPaise: basePriceInPaise,
          inviteCodeHint: inviteCodeHint,
        );
  return policy.withCrossPathsPairInventory(
    reservedPairCapacity: crossPathsPairCapacity.clamp(0, capacityLimit),
  );
}

String? _inviteCodeHint(String value) {
  final code = value.trim();
  if (code.length <= 4) return code.isEmpty ? null : code;
  return '${code.substring(0, 2)}...${code.substring(code.length - 2)}';
}

EventFormatSnapshot _eventFormatWithRoutePlan(
  EventFormatSnapshot format,
  RouteEventPlan? routePlan,
) {
  final activityDetails = Map<String, Object?>.of(format.activityDetails);
  if (routePlan == null) {
    activityDetails.remove('routePlan');
  } else {
    activityDetails['routePlan'] = routePlan.toJson();
  }
  return EventFormatSnapshot(
    version: format.version,
    activityKind: format.activityKind,
    interactionModel: format.interactionModel,
    customActivityLabel: format.customActivityLabel,
    defaultPlaybookId: format.defaultPlaybookId,
    defaultModuleIds: format.defaultModuleIds,
    eventSuccessPrimitives: format.eventSuccessPrimitives,
    activityDetails: activityDetails,
  );
}
