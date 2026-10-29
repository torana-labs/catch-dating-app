import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:flutter/foundation.dart';

@immutable
class HostEventEditSaveRequest {
  const HostEventEditSaveRequest({
    required this.nextEvent,
    required this.includePolicy,
    required this.inviteCode,
  });

  final Event nextEvent;
  final bool includePolicy;
  final String? inviteCode;

  factory HostEventEditSaveRequest.fromForm({
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
            dynamicPricingStepInPaise: _currencyTextValueInMinorUnits(
              dynamicPricingStepText,
              currencyCode: event.currency,
            ),
            dynamicPricingMaxInPaise: _currencyTextValueInMinorUnits(
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
        ? _currencyTextValueInMinorUnits(
            priceText,
            currencyCode: event.currency,
          )!
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

    return HostEventEditSaveRequest(
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

String? _trimToNull(String value) {
  final normalized = value.trim();
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

int? _currencyTextValueInMinorUnits(
  String value, {
  required String currencyCode,
}) => parseMajorCurrencyAmountToMinorUnits(value, currencyCode: currencyCode);

EventPolicyBundle _eventPolicyForDefaults({
  required EventPolicyDefaults defaults,
  required EventAdmissionPreset admissionPreset,
  required int capacityLimit,
  required int basePriceInPaise,
  required String? inviteCodeHint,
  required int crossPathsPairCapacity,
}) {
  EventPolicyBundle policy;
  if (admissionPreset.requiresReview) {
    policy = EventPolicyBundle.requestToJoinEvent(
      approvedMembersSkipReview:
          admissionPreset == EventAdmissionPreset.requestToJoinMembersExempt,
      capacityLimit: capacityLimit,
      basePriceInPaise: basePriceInPaise,
      cancellationPolicy: defaults.cancellationPolicy,
    );
  } else {
    policy = defaults.toEventPolicyBundle(
      capacityLimit: capacityLimit,
      basePriceInPaise: basePriceInPaise,
      inviteCodeHint: inviteCodeHint,
    );
  }
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
