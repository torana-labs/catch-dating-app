import 'package:flutter/foundation.dart';

abstract final class CreateEventFormKeys {
  static const name = ValueKey('create-event-name-field');
  static const distance = ValueKey('create-event-distance-field');
  static const activityType = ValueKey('create-event-activity-type');
  static const customActivityLabel = ValueKey(
    'create-event-custom-activity-label-field',
  );
  static const customInteractionModel = ValueKey(
    'create-event-custom-interaction-model',
  );
  static const capacity = ValueKey('create-event-capacity-field');
  static const price = ValueKey('create-event-price-field');
  static const accessibility = ValueKey('create-event-accessibility-field');
  static const included = ValueKey('create-event-included-field');
  static const description = ValueKey('create-event-description-field');
  static const routePlanEnabled = ValueKey('create-event-route-plan-enabled');
  static const routePlanSummary = ValueKey('create-event-route-plan-summary');
  static const routeMovement = ValueKey('create-event-route-movement');
  static const routeShape = ValueKey('create-event-route-shape');
  static const routeGroupStrategy = ValueKey('create-event-route-group');
  static const routeStopCadence = ValueKey('create-event-route-stop-cadence');
  static const routeStopKinds = ValueKey('create-event-route-stop-kinds');
  static const routeRoleKinds = ValueKey('create-event-route-role-kinds');
  static const routePath = ValueKey('create-event-route-path');
  static const routePaceGroups = ValueKey('create-event-route-pace-groups');
  static const routeLiveTracking = ValueKey('create-event-route-live-tracking');
  static const itineraryTitle = ValueKey('create-event-itinerary-title');
  static const itineraryOffset = ValueKey('create-event-itinerary-offset');
  static const itineraryDuration = ValueKey('create-event-itinerary-duration');
  static const itineraryDescription = ValueKey(
    'create-event-itinerary-description',
  );
  static const externalBookingProvider = ValueKey(
    'create-event-external-booking-provider',
  );
  static const externalEventUrl = ValueKey(
    'create-event-external-event-url-field',
  );
  static const externalEventId = ValueKey(
    'create-event-external-event-id-field',
  );
  static const runtimeWalkInPolicy = ValueKey(
    'create-event-runtime-walk-in-policy',
  );
  static const meetingPoint = ValueKey('create-event-meeting-point-field');
  static const locationDetails = ValueKey(
    'create-event-location-details-field',
  );
  static const datePicker = ValueKey('create-event-date-picker');
  static const timePicker = ValueKey('create-event-time-picker');
  static const mapPicker = ValueKey('create-event-map-picker');
  static const minAge = ValueKey('create-event-min-age-field');
  static const maxAge = ValueKey('create-event-max-age-field');
  static const maxMen = ValueKey('create-event-max-men-field');
  static const maxWomen = ValueKey('create-event-max-women-field');
  static const inviteCode = ValueKey('create-event-invite-code-field');
  static const cohortCapsToggle = ValueKey('create-event-cohort-caps-toggle');
  static const dynamicPricingToggle = ValueKey(
    'create-event-dynamic-pricing-toggle',
  );
  static const crossPathsPairInventoryToggle = ValueKey(
    'create-event-cross-paths-pair-inventory-toggle',
  );
  static const crossPathsPairCapacity = ValueKey(
    'create-event-cross-paths-pair-capacity-field',
  );
  static const dynamicPricingStep = ValueKey(
    'create-event-dynamic-pricing-step-field',
  );
  static const dynamicPricingMax = ValueKey(
    'create-event-dynamic-pricing-max-field',
  );

  static ValueKey<String> admissionPreset(String presetName) =>
      ValueKey('create-event-admission-preset-$presetName');

  static ValueKey<String> interactionModel(String interactionModelName) =>
      ValueKey('create-event-interaction-model-$interactionModelName');

  static ValueKey<String> deleteDraft(String draftId) =>
      ValueKey('create-event-delete-draft-$draftId');
}
