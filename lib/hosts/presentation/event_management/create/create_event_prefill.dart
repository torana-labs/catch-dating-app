import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:collection/collection.dart';

/// Non-persisted values used to begin a new event from an existing event.
///
/// This is deliberately distinct from [EventDraft]. A repeat prefill must not
/// become the active saved draft, suppress the saved-draft picker, or delete a
/// local draft after the new event is published.
class CreateEventPrefill {
  const CreateEventPrefill._({
    required this.sourceEventId,
    required this.values,
  });

  factory CreateEventPrefill.repeat({
    required Event event,
    required DateTime createdAt,
  }) {
    if (!canRepeat(event)) {
      throw StateError(
        'This event policy cannot be represented safely by the create form.',
      );
    }
    final policy = event.effectiveEventPolicy;
    final admission = policy.admissionPolicy;
    final demandRule = policy.pricingPolicy.demandPricingRules.firstOrNull;
    final location = event.effectiveMeetingLocation;
    final durationMinutes = event.endTime
        .difference(event.startTime)
        .inMinutes
        .clamp(
          BusinessRules.eventMinDurationMinutes,
          BusinessRules.eventMaxDurationMinutes,
        );

    return CreateEventPrefill._(
      sourceEventId: event.id,
      values: EventDraft(
        id: 'repeat-template-${event.id}',
        clubId: event.clubId,
        savedAt: createdAt,
        name: event.name,
        externalBookingMode: event.isExternalCompanion,
        externalBookingProvider: event.isExternalCompanion
            ? event.eventOrigin?.provider.name
            : null,
        runtimeWalkInPolicy: event.isExternalCompanion
            ? event.runtimeAccess?.walkInPolicy.name
            : null,
        // A repeat is a different event: never copy its external id, link,
        // roster attachment, or guests.
        distance: event.activityKind.isDistanceBased
            ? _decimalText(event.distanceKm)
            : null,
        capacity: '${event.capacityLimit}',
        price: minorCurrencyAmountInputText(
          policy.basePriceInPaise,
          currencyCode: event.currency,
        ),
        description: event.description,
        accessibility: event.eventFormat.accessibilityNotes,
        included: event.eventFormat.includedNotes,
        activityKind: event.activityKind.name,
        customActivityLabel: event.eventFormat.customActivityLabel,
        interactionModel: event.eventFormat.interactionModel.name,
        paceName: event.pace.name,
        routePlan: event.eventFormat.routePlan?.toJson(),
        meetingPoint: event.locationName,
        locationDetails: event.locationNotes,
        meetingLocationAddress: location?.address,
        meetingLocationPlaceId: location?.placeId,
        startingPointLat: event.effectiveStartingPointLat,
        startingPointLng: event.effectiveStartingPointLng,
        // Repeating copies the event-local location snapshot, not mutable
        // saved-place provenance. The host can reselect an active saved place.
        // A repeat is a new scheduling decision. Preserve the familiar time
        // and duration, but require the host to choose a fresh date.
        selectedStartHour: event.startTime.hour,
        selectedStartMinute: event.startTime.minute,
        durationMinutes: durationMinutes,
        minAge: '${event.constraints.minAge}',
        maxAge: '${event.constraints.maxAge}',
        maxMen: _optionalIntText(
          admission.cohortCapacityLimits[EventCohortIds.menInterestedInWomen],
        ),
        maxWomen: _optionalIntText(
          admission.cohortCapacityLimits[EventCohortIds.womenInterestedInMen],
        ),
        admissionPreset:
            admission.approvedMembersSkipReview &&
                admission.format == EventAdmissionFormat.manualApproval
            ? 'requestToJoinMembersExempt'
            : _admissionPresetName(admission.format),
        // Private invite secrets and uploaded photos are intentionally not
        // copied into a new event.
        dynamicPricingEnabled: policy.usesDemandPricing,
        dynamicPricingStep: demandRule == null
            ? null
            : minorCurrencyAmountInputText(
                demandRule.stepAdjustment.inPaise,
                currencyCode: event.currency,
              ),
        dynamicPricingMax: demandRule == null
            ? null
            : minorCurrencyAmountInputText(
                demandRule.maxAdjustment.inPaise,
                currencyCode: event.currency,
              ),
        cancellationPolicy: policy.cancellationPolicy.id.name,
        crossPathsPairInventoryEnabled:
            admission.crossPathsPairInventory.isEnabled,
        crossPathsPairCapacity:
            '${admission.crossPathsPairInventory.reservedPairCapacity}',
        // Event Success is stored separately from the public event snapshot;
        // start from the current format recommendation rather than pretending
        // the old event's private plan was copied.
        eventSuccessDefaults: EventSuccessDefaults.recommendedForFormat(
          event.eventFormat,
          enabled: event.isExternalCompanion,
          targetAttendeeCount: event.capacityLimit,
        ),
      ),
    );
  }

  final String sourceEventId;
  final EventDraft values;

  static bool canRepeat(Event event) {
    final policy = event.effectiveEventPolicy;
    final admission = policy.admissionPolicy;
    if (admission.format == EventAdmissionFormat.membersOnly) return false;
    if (admission.format != EventAdmissionFormat.fixedCohortCaps &&
        (event.constraints.maxMen != null ||
            event.constraints.maxWomen != null)) {
      return false;
    }

    final expected = switch (admission.format) {
      EventAdmissionFormat.open => EventPolicyBundle.openEvent(
        capacityLimit: event.capacityLimit,
        basePriceInPaise: policy.basePriceInPaise,
        cancellationPolicy: policy.cancellationPolicy,
      ),
      EventAdmissionFormat.inviteOnly => EventPolicyBundle.inviteOnlyEvent(
        capacityLimit: event.capacityLimit,
        basePriceInPaise: policy.basePriceInPaise,
        cancellationPolicy: policy.cancellationPolicy,
      ),
      EventAdmissionFormat.manualApproval =>
        EventPolicyBundle.requestToJoinEvent(
          approvedMembersSkipReview: admission.approvedMembersSkipReview,
          capacityLimit: event.capacityLimit,
          basePriceInPaise: policy.basePriceInPaise,
          cancellationPolicy: policy.cancellationPolicy,
        ),
      EventAdmissionFormat.fixedCohortCaps =>
        EventPolicyBundle.fixedCohortCapsEvent(
          capacityLimit: event.capacityLimit,
          basePriceInPaise: policy.basePriceInPaise,
          maxMenInterestedInWomen: admission
              .cohortCapacityLimits[EventCohortIds.menInterestedInWomen],
          maxWomenInterestedInMen: admission
              .cohortCapacityLimits[EventCohortIds.womenInterestedInMen],
          cancellationPolicy: policy.cancellationPolicy,
        ),
      EventAdmissionFormat.balancedRatio => _canonicalBalancedPolicy(
        event: event,
        policy: policy,
      ),
      EventAdmissionFormat.membersOnly => null,
    };
    if (expected == null) return false;

    return const DeepCollectionEquality().equals(
      _repeatComparablePolicyJson(policy),
      _repeatComparablePolicyJson(expected),
    );
  }
}

EventPolicyBundle? _canonicalBalancedPolicy({
  required Event event,
  required EventPolicyBundle policy,
}) {
  final rules = policy.pricingPolicy.demandPricingRules;
  if (rules.length > 1) return null;
  if (rules.isEmpty) {
    return EventPolicyBundle.balancedSinglesEvent(
      capacityLimit: event.capacityLimit,
      basePriceInPaise: policy.basePriceInPaise,
      cancellationPolicy: policy.cancellationPolicy,
    );
  }
  final rule = rules.single;
  if (rule.pricedCohortId != EventCohortIds.menInterestedInWomen ||
      rule.balancingCohortId != EventCohortIds.womenInterestedInMen ||
      rule.freeSkew != 1 ||
      rule.demandStep != 1) {
    return null;
  }
  return EventPolicyBundle.demandPricedBalancedSinglesEvent(
    capacityLimit: event.capacityLimit,
    basePriceInPaise: policy.basePriceInPaise,
    stepAdjustmentInPaise: rule.stepAdjustment.inPaise,
    maxAdjustmentInPaise: rule.maxAdjustment.inPaise,
    cancellationPolicy: policy.cancellationPolicy,
  );
}

Map<String, Object?> _repeatComparablePolicyJson(EventPolicyBundle policy) {
  final json = Map<String, Object?>.from(policy.toJson());
  final admission = Map<String, Object?>.from(
    json['admission']! as Map<Object?, Object?>,
  );
  final privateAccess = Map<String, Object?>.from(
    admission['privateAccessPolicy']! as Map<Object?, Object?>,
  );
  // Repeat intentionally requires a fresh private code, so the non-secret
  // display hint is the only policy field excluded from exact comparison.
  privateAccess['inviteCodeHint'] = null;
  admission['privateAccessPolicy'] = privateAccess;
  json['admission'] = admission;
  return json;
}

String _admissionPresetName(EventAdmissionFormat format) => switch (format) {
  EventAdmissionFormat.open => 'openCapacity',
  EventAdmissionFormat.inviteOnly => 'inviteOnly',
  EventAdmissionFormat.manualApproval => 'requestToJoin',
  EventAdmissionFormat.fixedCohortCaps => 'fixedCohortCaps',
  EventAdmissionFormat.balancedRatio => 'balancedSingles',
  EventAdmissionFormat.membersOnly => throw StateError(
    'Members-only events cannot be repeated by the current create flow.',
  ),
};

String? _optionalIntText(int? value) => value == null ? null : '$value';

String _decimalText(double value) => value == value.roundToDouble()
    ? '${value.round()}'
    : value.toStringAsFixed(1);
