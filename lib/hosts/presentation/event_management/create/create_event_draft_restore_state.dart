import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_location_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_schedule_state.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:flutter/material.dart';

class CreateEventDraftRestoreState {
  const CreateEventDraftRestoreState({
    required this.nameText,
    required this.distanceText,
    required this.capacityText,
    required this.priceText,
    required this.descriptionText,
    required this.activityKind,
    required this.customActivityLabelText,
    required this.interactionModel,
    required this.pace,
    required this.routePlan,
    required this.itinerary,
    required this.meetingPointText,
    required this.locationDetailsText,
    required this.locationState,
    required this.selectedDate,
    required this.selectedStartTime,
    required this.dateText,
    required this.startTimeText,
    required this.durationMinutes,
    required this.scheduleErrorText,
    required this.minAgeText,
    required this.maxAgeText,
    required this.maxMenText,
    required this.maxWomenText,
    required this.inviteCodeText,
    required this.dynamicPricingStepText,
    required this.dynamicPricingMaxText,
    required this.crossPathsPairCapacityText,
    required this.policyState,
    required this.eventSuccessDefaults,
  });

  factory CreateEventDraftRestoreState.fromDraft(
    EventDraft draft, {
    required DateTime now,
  }) {
    final activityKind = activityKindFromName(draft.activityKind);
    final selectedDate = draft.selectedDateMillis == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(draft.selectedDateMillis!);
    final selectedStartTime =
        draft.selectedStartHour == null || draft.selectedStartMinute == null
        ? null
        : TimeOfDay(
            hour: draft.selectedStartHour!,
            minute: draft.selectedStartMinute!,
          );
    final scheduleState = CreateEventScheduleState(
      selectedDate: selectedDate,
      selectedStartTime: selectedStartTime,
      durationMinutes: draft.durationMinutes,
    );

    return CreateEventDraftRestoreState(
      nameText: draft.name,
      distanceText: draft.distance,
      capacityText: draft.capacity,
      priceText: draft.price,
      descriptionText: draft.description,
      activityKind: activityKind,
      customActivityLabelText: draft.customActivityLabel ?? '',
      interactionModel: interactionModelFromName(
        draft.interactionModel,
        fallback: activityKind.defaultInteractionModel,
      ),
      pace: paceFromName(draft.paceName),
      routePlan: draft.routePlanEnabled == false
          ? null
          : RouteEventPlan.tryFromJson(draft.routePlan) ??
                RouteEventPlan.defaultForActivity(activityKind),
      itinerary: draft.itinerary,
      meetingPointText: draft.meetingPoint,
      locationDetailsText: draft.locationDetails,
      locationState: CreateEventLocationState(
        startingPoint: LocationCoordinate.fromNullable(
          latitude: draft.startingPointLat,
          longitude: draft.startingPointLng,
        ),
        meetingLocationAddress: draft.meetingLocationAddress,
        meetingLocationPlaceId: draft.meetingLocationPlaceId,
        sourceVenueId: draft.sourceVenueId,
      ),
      selectedDate: selectedDate,
      selectedStartTime: selectedStartTime,
      dateText: selectedDate == null
          ? ''
          : CreateEventScheduleState.formatDate(selectedDate),
      startTimeText: selectedStartTime == null
          ? ''
          : CreateEventScheduleState.formatClockTime(selectedStartTime),
      durationMinutes: draft.durationMinutes,
      scheduleErrorText: scheduleState.errorText(now: now),
      minAgeText: draft.minAge,
      maxAgeText: draft.maxAge,
      maxMenText: draft.maxMen,
      maxWomenText: draft.maxWomen,
      inviteCodeText: draft.inviteCode,
      dynamicPricingStepText: draft.dynamicPricingStep,
      dynamicPricingMaxText: draft.dynamicPricingMax,
      crossPathsPairCapacityText: draft.crossPathsPairCapacity,
      policyState: CreateEventPolicyState.fromDraft(
        admissionPreset: draft.admissionPreset,
        cancellationPolicy: draft.cancellationPolicy,
        maxMen: draft.maxMen,
        maxWomen: draft.maxWomen,
        dynamicPricingEnabled: draft.dynamicPricingEnabled,
        crossPathsPairInventoryEnabled: draft.crossPathsPairInventoryEnabled,
      ),
      eventSuccessDefaults: draft.eventSuccessDefaults,
    );
  }

  final String? distanceText;
  final String? nameText;
  final String? capacityText;
  final String? priceText;
  final String? descriptionText;
  final ActivityKind activityKind;
  final String customActivityLabelText;
  final EventInteractionModel interactionModel;
  final PaceLevel? pace;
  final RouteEventPlan? routePlan;
  final List<EventItineraryItem> itinerary;
  final String? meetingPointText;
  final String? locationDetailsText;
  final CreateEventLocationState locationState;
  final DateTime? selectedDate;
  final TimeOfDay? selectedStartTime;
  final String dateText;
  final String startTimeText;
  final int durationMinutes;
  final String? scheduleErrorText;
  final String? minAgeText;
  final String? maxAgeText;
  final String? maxMenText;
  final String? maxWomenText;
  final String? inviteCodeText;
  final String? dynamicPricingStepText;
  final String? dynamicPricingMaxText;
  final String? crossPathsPairCapacityText;
  final CreateEventPolicyState policyState;
  final EventSuccessDefaults eventSuccessDefaults;

  static ActivityKind activityKindFromName(String? name) {
    if (name == null) return ActivityKind.socialRun;
    return ActivityKind.values.firstWhere(
      (activityKind) => activityKind.name == name,
      orElse: () => ActivityKind.socialRun,
    );
  }

  static EventInteractionModel interactionModelFromName(
    String? name, {
    required EventInteractionModel fallback,
  }) {
    if (name == null) return fallback;
    return EventInteractionModel.values.firstWhere(
      (model) => model.name == name,
      orElse: () => fallback,
    );
  }

  static PaceLevel? paceFromName(String? name) {
    if (name == null) return null;
    for (final pace in PaceLevel.values) {
      if (pace.name == name) return pace;
    }
    return null;
  }
}
