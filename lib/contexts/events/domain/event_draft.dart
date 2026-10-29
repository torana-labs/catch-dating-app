import 'dart:convert';

import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_draft.freezed.dart';
part 'event_draft.g.dart';

@freezed
abstract class EventDraft with _$EventDraft {
  const factory EventDraft({
    required String id,
    required String clubId,
    required DateTime savedAt,
    // Event Details step
    String? name,
    // Progressive private first-save fields. Older local drafts remain valid.
    String? eventCityId,
    String? eventMarketId,
    String? eventLocalDate,
    String? eventLocalStartTime,
    String? eventTimezone,
    String? eventCityMode,
    String? eventTimezoneMode,
    String? eventReviewedDefaultsHash,
    String? eventCreateRequestId,
    String? eventCreatePayloadSignature,
    String? eventCreatePayloadJson,
    String? eventCreateReceiptEventId,
    int? eventCreateReceiptRevision,
    String? distance,
    String? capacity,
    String? price,
    String? description,
    @JsonKey(includeIfNull: false) String? accessibility,
    @JsonKey(includeIfNull: false) String? included,
    @Default(false) bool externalBookingMode,
    String? externalBookingProvider,
    String? externalEventUrl,
    String? externalEventId,
    String? runtimeWalkInPolicy,
    String? rosterFileName,
    String? rosterFileFingerprint,
    int? rosterReadyCount,
    String? activityKind,
    String? customActivityLabel,
    String? interactionModel,
    String? paceName,
    Map<String, dynamic>? routePlan,
    @JsonKey(includeIfNull: false) bool? routePlanEnabled,
    @Default([]) List<EventItineraryItem> itinerary,
    // Where step
    String? meetingPoint,
    String? locationDetails,
    String? meetingLocationAddress,
    String? meetingLocationPlaceId,
    String? sourceVenueId,
    double? startingPointLat,
    double? startingPointLng,
    // When step
    int? selectedDateMillis,
    int? selectedStartHour,
    int? selectedStartMinute,
    @Default(BusinessRules.eventDefaultDurationMinutes) int durationMinutes,
    // Rules step
    String? minAge,
    String? maxAge,
    String? maxMen,
    String? maxWomen,
    String? admissionPreset,
    String? inviteCode,
    @Default(false) bool dynamicPricingEnabled,
    String? dynamicPricingStep,
    String? dynamicPricingMax,
    String? cancellationPolicy,
    @Default(false) bool crossPathsPairInventoryEnabled,
    String? crossPathsPairCapacity,
    @Default(EventSuccessDefaults()) EventSuccessDefaults eventSuccessDefaults,
  }) = _EventDraft;

  factory EventDraft.fromJson(Map<String, dynamic> json) =>
      _$EventDraftFromJson(json);

  static List<EventDraft> listFromJson(String jsonString) =>
      (jsonDecode(jsonString) as List<dynamic>)
          .map((e) => EventDraft.fromJson(e as Map<String, dynamic>))
          .toList();

  static String listToJson(List<EventDraft> drafts) =>
      jsonEncode(drafts.map((d) => d.toJson()).toList());
}

extension EventDraftX on EventDraft {
  bool get isEmpty =>
      name == null &&
      eventCityId == null &&
      eventMarketId == null &&
      eventLocalDate == null &&
      eventLocalStartTime == null &&
      eventTimezone == null &&
      distance == null &&
      capacity == null &&
      price == null &&
      description == null &&
      accessibility == null &&
      included == null &&
      externalBookingMode == false &&
      externalBookingProvider == null &&
      externalEventUrl == null &&
      externalEventId == null &&
      runtimeWalkInPolicy == null &&
      rosterFileName == null &&
      rosterFileFingerprint == null &&
      rosterReadyCount == null &&
      (activityKind == null || activityKind == 'socialRun') &&
      customActivityLabel == null &&
      interactionModel == null &&
      paceName == null &&
      _routePlanIsDefault &&
      itinerary.isEmpty &&
      meetingPoint == null &&
      locationDetails == null &&
      meetingLocationAddress == null &&
      meetingLocationPlaceId == null &&
      sourceVenueId == null &&
      startingPointLat == null &&
      startingPointLng == null &&
      selectedDateMillis == null &&
      selectedStartHour == null &&
      selectedStartMinute == null &&
      durationMinutes == BusinessRules.eventDefaultDurationMinutes &&
      minAge == null &&
      maxAge == null &&
      maxMen == null &&
      maxWomen == null &&
      admissionPreset == null &&
      inviteCode == null &&
      dynamicPricingEnabled == false &&
      dynamicPricingStep == null &&
      dynamicPricingMax == null &&
      cancellationPolicy == null &&
      crossPathsPairInventoryEnabled == false &&
      crossPathsPairCapacity == null &&
      eventSuccessDefaults == const EventSuccessDefaults();

  bool get _routePlanIsDefault {
    if (routePlanEnabled == false) return false;
    if (routePlan == null) return true;
    final activity = ActivityKind.values.firstWhere(
      (value) => value.name == activityKind,
      orElse: () => ActivityKind.socialRun,
    );
    return RouteEventPlan.tryFromJson(routePlan) ==
        RouteEventPlan.defaultForActivity(activity);
  }

  String get summary {
    final parts = <String>[];
    if (name != null) parts.add(name!);
    if (distance != null) {
      var distPart = '${distance!}km';
      if (paceName != null) distPart += ' $paceName';
      parts.add(distPart);
    } else if (customActivityLabel != null) {
      parts.add(customActivityLabel!);
    } else if (activityKind != null && activityKind != 'socialRun') {
      parts.add(_activityLabel(activityKind!));
    } else if (paceName != null) {
      parts.add(paceName!);
    }
    if (meetingPoint != null) parts.add(meetingPoint!);
    if (selectedDateMillis != null) {
      final d = DateTime.fromMillisecondsSinceEpoch(selectedDateMillis!);
      parts.add('${d.day}/${d.month}');
    }
    if (parts.isEmpty) return 'Empty draft';
    return parts.join(' · ');
  }
}

String _activityLabel(String name) {
  return ActivityKind.values
      .firstWhere(
        (activityKind) => activityKind.name == name,
        orElse: () => ActivityKind.openActivity,
      )
      .label;
}
