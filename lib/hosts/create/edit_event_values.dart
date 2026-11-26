import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/create/create_draft_values.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/business_rules.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';

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
    final eventPolicyDefaults = includePolicy
        ? EventPolicyDefaults(
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
              currencyCode: event.currency,
            ),
            dynamicPricingMaxInPaise: _minorUnits(
              dynamicPricingMaxText,
              currencyCode: event.currency,
            ),
            cancellationPolicyId: cancellationPolicyId,
          )
        : null;
    final capacityLimit = includePolicy
        ? int.parse(capacityText.trim())
        : event.capacityLimit;
    final priceInPaise = includePolicy
        ? _minorUnits(priceText, currencyCode: event.currency)!
        : event.priceInPaise;
    final eventPolicy = includePolicy
        ? _eventPolicyForDefaults(
            defaults: eventPolicyDefaults!,
            admissionPreset: admissionPreset,
            capacityLimit: capacityLimit,
            basePriceInPaise: priceInPaise,
            inviteCodeHint: _inviteCodeHint(inviteCodeText),
            crossPathsPairCapacity: event
                .effectiveEventPolicy
                .admissionPolicy
                .crossPathsPairInventory
                .reservedPairCapacity,
          )
        : event.eventPolicy;
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
        constraints: includePolicy
            ? eventPolicyDefaults!.toConstraints()
            : event.constraints,
        eventPolicy: eventPolicy,
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
  final preset = editAdmissionPreset(draft);
  final cohortCaps = editCohortCapsEnabled(draft);
  final invite = (draft.inviteCode ?? '').trim();
  return {
    if ((draft.name ?? '').trim().isEmpty) CreateProblem.name,
    if (event.eventFormat.activityKind.isDistanceBased &&
        (distance == null || distance <= 0))
      CreateProblem.distance,
    if (!scheduleLocked && (start == null || !start.isAfter(now)))
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
      if (preset == EventAdmissionPreset.inviteOnly &&
          (invite.length < 4 || invite.length > 64))
        CreateProblem.inviteCode,
      if (cohortCaps &&
          (!_positiveOrEmpty(draft.maxMen) ||
              !_positiveOrEmpty(draft.maxWomen)))
        CreateProblem.cohortCaps,
      if (preset == EventAdmissionPreset.balancedSingles &&
          draft.dynamicPricingEnabled &&
          (!_positive(draft.dynamicPricingStep) ||
              !_positive(draft.dynamicPricingMax)))
        CreateProblem.demandPricing,
    },
  };
}

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
