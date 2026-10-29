import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';

class CreateEventDraftSnapshot {
  const CreateEventDraftSnapshot({
    this.name,
    required this.distance,
    required this.capacity,
    required this.price,
    required this.description,
    this.accessibility,
    this.included,
    this.externalBookingMode = false,
    this.externalBookingProvider,
    this.externalEventUrl,
    this.externalEventId,
    this.runtimeWalkInPolicy,
    this.rosterFileName,
    this.rosterFileFingerprint,
    this.rosterReadyCount,
    required this.activityKind,
    required this.customActivityLabel,
    required this.interactionModel,
    required this.paceName,
    this.routePlan,
    this.itinerary = const [],
    required this.meetingPoint,
    required this.locationDetails,
    required this.meetingLocationAddress,
    required this.meetingLocationPlaceId,
    this.sourceVenueId,
    required this.startingPointLat,
    required this.startingPointLng,
    required this.selectedDateMillis,
    required this.selectedStartHour,
    required this.selectedStartMinute,
    required this.durationMinutes,
    required this.minAge,
    required this.maxAge,
    required this.maxMen,
    required this.maxWomen,
    required this.cohortCapsEnabled,
    required this.admissionPreset,
    required this.inviteCode,
    required this.dynamicPricingEnabled,
    required this.dynamicPricingStep,
    required this.dynamicPricingMax,
    required this.cancellationPolicy,
    this.crossPathsPairInventoryEnabled = false,
    this.crossPathsPairCapacity,
    required this.eventSuccessDefaults,
    required this.eventPhotoIds,
  });

  final String? name;
  final String? distance;
  final String? capacity;
  final String? price;
  final String? description;
  final String? accessibility;
  final String? included;
  final bool externalBookingMode;
  final String? externalBookingProvider;
  final String? externalEventUrl;
  final String? externalEventId;
  final String? runtimeWalkInPolicy;
  final String? rosterFileName;
  final String? rosterFileFingerprint;
  final int? rosterReadyCount;
  final String activityKind;
  final String? customActivityLabel;
  final String? interactionModel;
  final String? paceName;
  final RouteEventPlan? routePlan;
  final List<EventItineraryItem> itinerary;
  final String? meetingPoint;
  final String? locationDetails;
  final String? meetingLocationAddress;
  final String? meetingLocationPlaceId;
  final String? sourceVenueId;
  final double? startingPointLat;
  final double? startingPointLng;
  final int? selectedDateMillis;
  final int? selectedStartHour;
  final int? selectedStartMinute;
  final int durationMinutes;
  final String? minAge;
  final String? maxAge;
  final String? maxMen;
  final String? maxWomen;
  final bool cohortCapsEnabled;
  final String admissionPreset;
  final String? inviteCode;
  final bool dynamicPricingEnabled;
  final String? dynamicPricingStep;
  final String? dynamicPricingMax;
  final String cancellationPolicy;
  final bool crossPathsPairInventoryEnabled;
  final String? crossPathsPairCapacity;
  final EventSuccessDefaults eventSuccessDefaults;
  final String eventPhotoIds;

  Object get signature => (
    name: name,
    distance: distance,
    capacity: capacity,
    price: price,
    description: description,
    accessibility: accessibility,
    included: included,
    externalBookingMode: externalBookingMode,
    externalBookingProvider: externalBookingProvider,
    externalEventUrl: externalEventUrl,
    externalEventId: externalEventId,
    runtimeWalkInPolicy: runtimeWalkInPolicy,
    rosterFileName: rosterFileName,
    rosterFileFingerprint: rosterFileFingerprint,
    rosterReadyCount: rosterReadyCount,
    activityKind: activityKind,
    customActivityLabel: customActivityLabel,
    interactionModel: interactionModel,
    paceName: paceName,
    routePlan: routePlan,
    itinerary: itinerary,
    meetingPoint: meetingPoint,
    locationDetails: locationDetails,
    meetingLocationAddress: meetingLocationAddress,
    meetingLocationPlaceId: meetingLocationPlaceId,
    sourceVenueId: sourceVenueId,
    startingPointLat: startingPointLat,
    startingPointLng: startingPointLng,
    selectedDateMillis: selectedDateMillis,
    selectedStartHour: selectedStartHour,
    selectedStartMinute: selectedStartMinute,
    durationMinutes: durationMinutes,
    minAge: minAge,
    maxAge: maxAge,
    maxMen: maxMen,
    maxWomen: maxWomen,
    cohortCapsEnabled: cohortCapsEnabled,
    admissionPreset: admissionPreset,
    inviteCode: inviteCode,
    dynamicPricingEnabled: dynamicPricingEnabled,
    dynamicPricingStep: dynamicPricingStep,
    dynamicPricingMax: dynamicPricingMax,
    cancellationPolicy: cancellationPolicy,
    crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
    crossPathsPairCapacity: crossPathsPairCapacity,
    eventSuccessDefaults: eventSuccessDefaults,
    eventPhotoIds: eventPhotoIds,
  );

  EventDraft toDraft({
    required String id,
    required String clubId,
    required DateTime savedAt,
  }) {
    return EventDraft(
      id: id,
      clubId: clubId,
      savedAt: savedAt,
      name: name,
      distance: distance,
      capacity: capacity,
      price: price,
      description: description,
      accessibility: accessibility,
      included: included,
      externalBookingMode: externalBookingMode,
      externalBookingProvider: externalBookingProvider,
      externalEventUrl: externalEventUrl,
      externalEventId: externalEventId,
      runtimeWalkInPolicy: runtimeWalkInPolicy,
      rosterFileName: rosterFileName,
      rosterFileFingerprint: rosterFileFingerprint,
      rosterReadyCount: rosterReadyCount,
      activityKind: activityKind,
      customActivityLabel: customActivityLabel,
      interactionModel: interactionModel,
      paceName: paceName,
      routePlan: routePlan?.toJson(),
      routePlanEnabled: routePlan != null,
      itinerary: itinerary,
      meetingPoint: meetingPoint,
      locationDetails: locationDetails,
      meetingLocationAddress: meetingLocationAddress,
      meetingLocationPlaceId: meetingLocationPlaceId,
      sourceVenueId: sourceVenueId,
      startingPointLat: startingPointLat,
      startingPointLng: startingPointLng,
      selectedDateMillis: selectedDateMillis,
      selectedStartHour: selectedStartHour,
      selectedStartMinute: selectedStartMinute,
      durationMinutes: durationMinutes,
      minAge: minAge,
      maxAge: maxAge,
      maxMen: maxMen,
      maxWomen: maxWomen,
      admissionPreset: admissionPreset,
      inviteCode: inviteCode,
      dynamicPricingEnabled: dynamicPricingEnabled,
      dynamicPricingStep: dynamicPricingStep,
      dynamicPricingMax: dynamicPricingMax,
      cancellationPolicy: cancellationPolicy,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      crossPathsPairCapacity: crossPathsPairCapacity,
      eventSuccessDefaults: eventSuccessDefaults,
    );
  }
}

class CreateEventDraftActionState {
  const CreateEventDraftActionState({
    required this.activeDraftId,
    required this.initialDraftContentSignature,
    required this.lastSavedDraftSignature,
    required this.currentDraftContentSignature,
  });

  final String? activeDraftId;
  final Object? initialDraftContentSignature;
  final Object? lastSavedDraftSignature;
  final Object currentDraftContentSignature;

  bool get isUpdatingDraft => activeDraftId != null;

  bool get hasUnsavedChanges {
    if (isUpdatingDraft) {
      return currentDraftContentSignature != lastSavedDraftSignature;
    }
    return currentDraftContentSignature != initialDraftContentSignature;
  }

  String draftIdForSave({required DateTime now}) {
    return activeDraftId ?? now.millisecondsSinceEpoch.toString();
  }

  String get saveSuccessMessage =>
      isUpdatingDraft ? 'Draft updated' : 'Draft saved';
}

enum CreateEventDraftDeleteReason { picker, successfulSubmit }

class CreateEventDraftDeleteIntent {
  const CreateEventDraftDeleteIntent({
    required this.draftId,
    required this.reason,
  });

  final String draftId;
  final CreateEventDraftDeleteReason reason;
}

class CreateEventDraftSideEffectState {
  const CreateEventDraftSideEffectState({
    required this.hasCheckedDrafts,
    required this.activeDraftId,
  });

  final bool hasCheckedDrafts;
  final String? activeDraftId;

  bool get shouldLoadDrafts => !hasCheckedDrafts;

  bool shouldShowDraftPicker(List<EventDraft> drafts) => drafts.isNotEmpty;

  CreateEventDraftDeleteIntent? get deleteAfterSuccessfulSubmitIntent {
    final draftId = activeDraftId;
    if (draftId == null) return null;
    return CreateEventDraftDeleteIntent(
      draftId: draftId,
      reason: CreateEventDraftDeleteReason.successfulSubmit,
    );
  }

  CreateEventDraftDeleteIntent deleteFromPickerIntent(EventDraft draft) {
    return CreateEventDraftDeleteIntent(
      draftId: draft.id,
      reason: CreateEventDraftDeleteReason.picker,
    );
  }
}
