// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventDraft {

 String get id; String get organizerId; DateTime get savedAt; String? get name; String? get eventCityId; String? get eventMarketId; String? get eventLocalDate; String? get eventLocalStartTime; String? get eventTimezone; String? get eventCityMode; String? get eventTimezoneMode; String? get eventReviewedDefaultsHash; String? get eventCreateRequestId; String? get eventCreatePayloadSignature; String? get eventCreatePayloadJson; String? get eventCreateReceiptEventId; int? get eventCreateReceiptRevision; String? get distance; String? get capacity; String? get price; String? get description;@JsonKey(includeIfNull: false) String? get accessibility;@JsonKey(includeIfNull: false) String? get included; bool get externalBookingMode; String? get externalBookingProvider; String? get externalEventUrl; String? get externalEventId; String? get runtimeWalkInPolicy; String? get rosterFileName; String? get rosterFileFingerprint; int? get rosterReadyCount; String? get activityKind; String? get customActivityLabel; String? get interactionModel; String? get paceName; Map<String, dynamic>? get routePlan;@JsonKey(includeIfNull: false) bool? get routePlanEnabled; List<EventItineraryItem> get itinerary; String? get meetingPoint; String? get locationDetails; String? get meetingLocationAddress; String? get meetingLocationPlaceId; String? get sourceVenueId; double? get startingPointLat; double? get startingPointLng; int? get selectedDateMillis; int? get selectedStartHour; int? get selectedStartMinute; int get durationMinutes; String? get minAge; String? get maxAge; String? get maxMen; String? get maxWomen; String? get admissionPreset; String? get inviteCode; bool get dynamicPricingEnabled; String? get dynamicPricingStep; String? get dynamicPricingMax; String? get cancellationPolicy; bool get crossPathsPairInventoryEnabled; String? get crossPathsPairCapacity; EventSuccessDefaults get eventSuccessDefaults;
/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventDraftCopyWith<EventDraft> get copyWith => _$EventDraftCopyWithImpl<EventDraft>(this as EventDraft, _$identity);

  /// Serializes this EventDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EventDraft;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventDraft&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.organizerId, _this.organizerId) || other.organizerId == _this.organizerId)&&(identical(other.savedAt, _this.savedAt) || other.savedAt == _this.savedAt)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.eventCityId, _this.eventCityId) || other.eventCityId == _this.eventCityId)&&(identical(other.eventMarketId, _this.eventMarketId) || other.eventMarketId == _this.eventMarketId)&&(identical(other.eventLocalDate, _this.eventLocalDate) || other.eventLocalDate == _this.eventLocalDate)&&(identical(other.eventLocalStartTime, _this.eventLocalStartTime) || other.eventLocalStartTime == _this.eventLocalStartTime)&&(identical(other.eventTimezone, _this.eventTimezone) || other.eventTimezone == _this.eventTimezone)&&(identical(other.eventCityMode, _this.eventCityMode) || other.eventCityMode == _this.eventCityMode)&&(identical(other.eventTimezoneMode, _this.eventTimezoneMode) || other.eventTimezoneMode == _this.eventTimezoneMode)&&(identical(other.eventReviewedDefaultsHash, _this.eventReviewedDefaultsHash) || other.eventReviewedDefaultsHash == _this.eventReviewedDefaultsHash)&&(identical(other.eventCreateRequestId, _this.eventCreateRequestId) || other.eventCreateRequestId == _this.eventCreateRequestId)&&(identical(other.eventCreatePayloadSignature, _this.eventCreatePayloadSignature) || other.eventCreatePayloadSignature == _this.eventCreatePayloadSignature)&&(identical(other.eventCreatePayloadJson, _this.eventCreatePayloadJson) || other.eventCreatePayloadJson == _this.eventCreatePayloadJson)&&(identical(other.eventCreateReceiptEventId, _this.eventCreateReceiptEventId) || other.eventCreateReceiptEventId == _this.eventCreateReceiptEventId)&&(identical(other.eventCreateReceiptRevision, _this.eventCreateReceiptRevision) || other.eventCreateReceiptRevision == _this.eventCreateReceiptRevision)&&(identical(other.distance, _this.distance) || other.distance == _this.distance)&&(identical(other.capacity, _this.capacity) || other.capacity == _this.capacity)&&(identical(other.price, _this.price) || other.price == _this.price)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.accessibility, _this.accessibility) || other.accessibility == _this.accessibility)&&(identical(other.included, _this.included) || other.included == _this.included)&&(identical(other.externalBookingMode, _this.externalBookingMode) || other.externalBookingMode == _this.externalBookingMode)&&(identical(other.externalBookingProvider, _this.externalBookingProvider) || other.externalBookingProvider == _this.externalBookingProvider)&&(identical(other.externalEventUrl, _this.externalEventUrl) || other.externalEventUrl == _this.externalEventUrl)&&(identical(other.externalEventId, _this.externalEventId) || other.externalEventId == _this.externalEventId)&&(identical(other.runtimeWalkInPolicy, _this.runtimeWalkInPolicy) || other.runtimeWalkInPolicy == _this.runtimeWalkInPolicy)&&(identical(other.rosterFileName, _this.rosterFileName) || other.rosterFileName == _this.rosterFileName)&&(identical(other.rosterFileFingerprint, _this.rosterFileFingerprint) || other.rosterFileFingerprint == _this.rosterFileFingerprint)&&(identical(other.rosterReadyCount, _this.rosterReadyCount) || other.rosterReadyCount == _this.rosterReadyCount)&&(identical(other.activityKind, _this.activityKind) || other.activityKind == _this.activityKind)&&(identical(other.customActivityLabel, _this.customActivityLabel) || other.customActivityLabel == _this.customActivityLabel)&&(identical(other.interactionModel, _this.interactionModel) || other.interactionModel == _this.interactionModel)&&(identical(other.paceName, _this.paceName) || other.paceName == _this.paceName)&&const DeepCollectionEquality().equals(other.routePlan, _this.routePlan)&&(identical(other.routePlanEnabled, _this.routePlanEnabled) || other.routePlanEnabled == _this.routePlanEnabled)&&const DeepCollectionEquality().equals(other.itinerary, _this.itinerary)&&(identical(other.meetingPoint, _this.meetingPoint) || other.meetingPoint == _this.meetingPoint)&&(identical(other.locationDetails, _this.locationDetails) || other.locationDetails == _this.locationDetails)&&(identical(other.meetingLocationAddress, _this.meetingLocationAddress) || other.meetingLocationAddress == _this.meetingLocationAddress)&&(identical(other.meetingLocationPlaceId, _this.meetingLocationPlaceId) || other.meetingLocationPlaceId == _this.meetingLocationPlaceId)&&(identical(other.sourceVenueId, _this.sourceVenueId) || other.sourceVenueId == _this.sourceVenueId)&&(identical(other.startingPointLat, _this.startingPointLat) || other.startingPointLat == _this.startingPointLat)&&(identical(other.startingPointLng, _this.startingPointLng) || other.startingPointLng == _this.startingPointLng)&&(identical(other.selectedDateMillis, _this.selectedDateMillis) || other.selectedDateMillis == _this.selectedDateMillis)&&(identical(other.selectedStartHour, _this.selectedStartHour) || other.selectedStartHour == _this.selectedStartHour)&&(identical(other.selectedStartMinute, _this.selectedStartMinute) || other.selectedStartMinute == _this.selectedStartMinute)&&(identical(other.durationMinutes, _this.durationMinutes) || other.durationMinutes == _this.durationMinutes)&&(identical(other.minAge, _this.minAge) || other.minAge == _this.minAge)&&(identical(other.maxAge, _this.maxAge) || other.maxAge == _this.maxAge)&&(identical(other.maxMen, _this.maxMen) || other.maxMen == _this.maxMen)&&(identical(other.maxWomen, _this.maxWomen) || other.maxWomen == _this.maxWomen)&&(identical(other.admissionPreset, _this.admissionPreset) || other.admissionPreset == _this.admissionPreset)&&(identical(other.inviteCode, _this.inviteCode) || other.inviteCode == _this.inviteCode)&&(identical(other.dynamicPricingEnabled, _this.dynamicPricingEnabled) || other.dynamicPricingEnabled == _this.dynamicPricingEnabled)&&(identical(other.dynamicPricingStep, _this.dynamicPricingStep) || other.dynamicPricingStep == _this.dynamicPricingStep)&&(identical(other.dynamicPricingMax, _this.dynamicPricingMax) || other.dynamicPricingMax == _this.dynamicPricingMax)&&(identical(other.cancellationPolicy, _this.cancellationPolicy) || other.cancellationPolicy == _this.cancellationPolicy)&&(identical(other.crossPathsPairInventoryEnabled, _this.crossPathsPairInventoryEnabled) || other.crossPathsPairInventoryEnabled == _this.crossPathsPairInventoryEnabled)&&(identical(other.crossPathsPairCapacity, _this.crossPathsPairCapacity) || other.crossPathsPairCapacity == _this.crossPathsPairCapacity)&&(identical(other.eventSuccessDefaults, _this.eventSuccessDefaults) || other.eventSuccessDefaults == _this.eventSuccessDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EventDraft;
  return Object.hashAll([runtimeType,_this.id,_this.organizerId,_this.savedAt,_this.name,_this.eventCityId,_this.eventMarketId,_this.eventLocalDate,_this.eventLocalStartTime,_this.eventTimezone,_this.eventCityMode,_this.eventTimezoneMode,_this.eventReviewedDefaultsHash,_this.eventCreateRequestId,_this.eventCreatePayloadSignature,_this.eventCreatePayloadJson,_this.eventCreateReceiptEventId,_this.eventCreateReceiptRevision,_this.distance,_this.capacity,_this.price,_this.description,_this.accessibility,_this.included,_this.externalBookingMode,_this.externalBookingProvider,_this.externalEventUrl,_this.externalEventId,_this.runtimeWalkInPolicy,_this.rosterFileName,_this.rosterFileFingerprint,_this.rosterReadyCount,_this.activityKind,_this.customActivityLabel,_this.interactionModel,_this.paceName,const DeepCollectionEquality().hash(_this.routePlan),_this.routePlanEnabled,const DeepCollectionEquality().hash(_this.itinerary),_this.meetingPoint,_this.locationDetails,_this.meetingLocationAddress,_this.meetingLocationPlaceId,_this.sourceVenueId,_this.startingPointLat,_this.startingPointLng,_this.selectedDateMillis,_this.selectedStartHour,_this.selectedStartMinute,_this.durationMinutes,_this.minAge,_this.maxAge,_this.maxMen,_this.maxWomen,_this.admissionPreset,_this.inviteCode,_this.dynamicPricingEnabled,_this.dynamicPricingStep,_this.dynamicPricingMax,_this.cancellationPolicy,_this.crossPathsPairInventoryEnabled,_this.crossPathsPairCapacity,_this.eventSuccessDefaults]);
}

@override
String toString() {
  final _this = this as EventDraft;
  return 'EventDraft(id: ${_this.id}, organizerId: ${_this.organizerId}, savedAt: ${_this.savedAt}, name: ${_this.name}, eventCityId: ${_this.eventCityId}, eventMarketId: ${_this.eventMarketId}, eventLocalDate: ${_this.eventLocalDate}, eventLocalStartTime: ${_this.eventLocalStartTime}, eventTimezone: ${_this.eventTimezone}, eventCityMode: ${_this.eventCityMode}, eventTimezoneMode: ${_this.eventTimezoneMode}, eventReviewedDefaultsHash: ${_this.eventReviewedDefaultsHash}, eventCreateRequestId: ${_this.eventCreateRequestId}, eventCreatePayloadSignature: ${_this.eventCreatePayloadSignature}, eventCreatePayloadJson: ${_this.eventCreatePayloadJson}, eventCreateReceiptEventId: ${_this.eventCreateReceiptEventId}, eventCreateReceiptRevision: ${_this.eventCreateReceiptRevision}, distance: ${_this.distance}, capacity: ${_this.capacity}, price: ${_this.price}, description: ${_this.description}, accessibility: ${_this.accessibility}, included: ${_this.included}, externalBookingMode: ${_this.externalBookingMode}, externalBookingProvider: ${_this.externalBookingProvider}, externalEventUrl: ${_this.externalEventUrl}, externalEventId: ${_this.externalEventId}, runtimeWalkInPolicy: ${_this.runtimeWalkInPolicy}, rosterFileName: ${_this.rosterFileName}, rosterFileFingerprint: ${_this.rosterFileFingerprint}, rosterReadyCount: ${_this.rosterReadyCount}, activityKind: ${_this.activityKind}, customActivityLabel: ${_this.customActivityLabel}, interactionModel: ${_this.interactionModel}, paceName: ${_this.paceName}, routePlan: ${_this.routePlan}, routePlanEnabled: ${_this.routePlanEnabled}, itinerary: ${_this.itinerary}, meetingPoint: ${_this.meetingPoint}, locationDetails: ${_this.locationDetails}, meetingLocationAddress: ${_this.meetingLocationAddress}, meetingLocationPlaceId: ${_this.meetingLocationPlaceId}, sourceVenueId: ${_this.sourceVenueId}, startingPointLat: ${_this.startingPointLat}, startingPointLng: ${_this.startingPointLng}, selectedDateMillis: ${_this.selectedDateMillis}, selectedStartHour: ${_this.selectedStartHour}, selectedStartMinute: ${_this.selectedStartMinute}, durationMinutes: ${_this.durationMinutes}, minAge: ${_this.minAge}, maxAge: ${_this.maxAge}, maxMen: ${_this.maxMen}, maxWomen: ${_this.maxWomen}, admissionPreset: ${_this.admissionPreset}, inviteCode: ${_this.inviteCode}, dynamicPricingEnabled: ${_this.dynamicPricingEnabled}, dynamicPricingStep: ${_this.dynamicPricingStep}, dynamicPricingMax: ${_this.dynamicPricingMax}, cancellationPolicy: ${_this.cancellationPolicy}, crossPathsPairInventoryEnabled: ${_this.crossPathsPairInventoryEnabled}, crossPathsPairCapacity: ${_this.crossPathsPairCapacity}, eventSuccessDefaults: ${_this.eventSuccessDefaults})';
}


}

/// @nodoc
abstract mixin class $EventDraftCopyWith<$Res>  {
  factory $EventDraftCopyWith(EventDraft value, $Res Function(EventDraft) _then) = _$EventDraftCopyWithImpl;
@useResult
$Res call({
 String id, String organizerId, DateTime savedAt, String? name, String? eventCityId, String? eventMarketId, String? eventLocalDate, String? eventLocalStartTime, String? eventTimezone, String? eventCityMode, String? eventTimezoneMode, String? eventReviewedDefaultsHash, String? eventCreateRequestId, String? eventCreatePayloadSignature, String? eventCreatePayloadJson, String? eventCreateReceiptEventId, int? eventCreateReceiptRevision, String? distance, String? capacity, String? price, String? description,@JsonKey(includeIfNull: false) String? accessibility,@JsonKey(includeIfNull: false) String? included, bool externalBookingMode, String? externalBookingProvider, String? externalEventUrl, String? externalEventId, String? runtimeWalkInPolicy, String? rosterFileName, String? rosterFileFingerprint, int? rosterReadyCount, String? activityKind, String? customActivityLabel, String? interactionModel, String? paceName, Map<String, dynamic>? routePlan,@JsonKey(includeIfNull: false) bool? routePlanEnabled, List<EventItineraryItem> itinerary, String? meetingPoint, String? locationDetails, String? meetingLocationAddress, String? meetingLocationPlaceId, String? sourceVenueId, double? startingPointLat, double? startingPointLng, int? selectedDateMillis, int? selectedStartHour, int? selectedStartMinute, int durationMinutes, String? minAge, String? maxAge, String? maxMen, String? maxWomen, String? admissionPreset, String? inviteCode, bool dynamicPricingEnabled, String? dynamicPricingStep, String? dynamicPricingMax, String? cancellationPolicy, bool crossPathsPairInventoryEnabled, String? crossPathsPairCapacity, EventSuccessDefaults eventSuccessDefaults
});


$EventSuccessDefaultsCopyWith<$Res> get eventSuccessDefaults;

}
/// @nodoc
class _$EventDraftCopyWithImpl<$Res>
    implements $EventDraftCopyWith<$Res> {
  _$EventDraftCopyWithImpl(this._self, this._then);

  final EventDraft _self;
  final $Res Function(EventDraft) _then;

/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? organizerId = null,Object? savedAt = null,Object? name = freezed,Object? eventCityId = freezed,Object? eventMarketId = freezed,Object? eventLocalDate = freezed,Object? eventLocalStartTime = freezed,Object? eventTimezone = freezed,Object? eventCityMode = freezed,Object? eventTimezoneMode = freezed,Object? eventReviewedDefaultsHash = freezed,Object? eventCreateRequestId = freezed,Object? eventCreatePayloadSignature = freezed,Object? eventCreatePayloadJson = freezed,Object? eventCreateReceiptEventId = freezed,Object? eventCreateReceiptRevision = freezed,Object? distance = freezed,Object? capacity = freezed,Object? price = freezed,Object? description = freezed,Object? accessibility = freezed,Object? included = freezed,Object? externalBookingMode = null,Object? externalBookingProvider = freezed,Object? externalEventUrl = freezed,Object? externalEventId = freezed,Object? runtimeWalkInPolicy = freezed,Object? rosterFileName = freezed,Object? rosterFileFingerprint = freezed,Object? rosterReadyCount = freezed,Object? activityKind = freezed,Object? customActivityLabel = freezed,Object? interactionModel = freezed,Object? paceName = freezed,Object? routePlan = freezed,Object? routePlanEnabled = freezed,Object? itinerary = null,Object? meetingPoint = freezed,Object? locationDetails = freezed,Object? meetingLocationAddress = freezed,Object? meetingLocationPlaceId = freezed,Object? sourceVenueId = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? selectedDateMillis = freezed,Object? selectedStartHour = freezed,Object? selectedStartMinute = freezed,Object? durationMinutes = null,Object? minAge = freezed,Object? maxAge = freezed,Object? maxMen = freezed,Object? maxWomen = freezed,Object? admissionPreset = freezed,Object? inviteCode = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStep = freezed,Object? dynamicPricingMax = freezed,Object? cancellationPolicy = freezed,Object? crossPathsPairInventoryEnabled = null,Object? crossPathsPairCapacity = freezed,Object? eventSuccessDefaults = null,}) {
  return _then(EventDraft(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,eventCityId: freezed == eventCityId ? _self.eventCityId : eventCityId // ignore: cast_nullable_to_non_nullable
as String?,eventMarketId: freezed == eventMarketId ? _self.eventMarketId : eventMarketId // ignore: cast_nullable_to_non_nullable
as String?,eventLocalDate: freezed == eventLocalDate ? _self.eventLocalDate : eventLocalDate // ignore: cast_nullable_to_non_nullable
as String?,eventLocalStartTime: freezed == eventLocalStartTime ? _self.eventLocalStartTime : eventLocalStartTime // ignore: cast_nullable_to_non_nullable
as String?,eventTimezone: freezed == eventTimezone ? _self.eventTimezone : eventTimezone // ignore: cast_nullable_to_non_nullable
as String?,eventCityMode: freezed == eventCityMode ? _self.eventCityMode : eventCityMode // ignore: cast_nullable_to_non_nullable
as String?,eventTimezoneMode: freezed == eventTimezoneMode ? _self.eventTimezoneMode : eventTimezoneMode // ignore: cast_nullable_to_non_nullable
as String?,eventReviewedDefaultsHash: freezed == eventReviewedDefaultsHash ? _self.eventReviewedDefaultsHash : eventReviewedDefaultsHash // ignore: cast_nullable_to_non_nullable
as String?,eventCreateRequestId: freezed == eventCreateRequestId ? _self.eventCreateRequestId : eventCreateRequestId // ignore: cast_nullable_to_non_nullable
as String?,eventCreatePayloadSignature: freezed == eventCreatePayloadSignature ? _self.eventCreatePayloadSignature : eventCreatePayloadSignature // ignore: cast_nullable_to_non_nullable
as String?,eventCreatePayloadJson: freezed == eventCreatePayloadJson ? _self.eventCreatePayloadJson : eventCreatePayloadJson // ignore: cast_nullable_to_non_nullable
as String?,eventCreateReceiptEventId: freezed == eventCreateReceiptEventId ? _self.eventCreateReceiptEventId : eventCreateReceiptEventId // ignore: cast_nullable_to_non_nullable
as String?,eventCreateReceiptRevision: freezed == eventCreateReceiptRevision ? _self.eventCreateReceiptRevision : eventCreateReceiptRevision // ignore: cast_nullable_to_non_nullable
as int?,distance: freezed == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as String?,capacity: freezed == capacity ? _self.capacity : capacity // ignore: cast_nullable_to_non_nullable
as String?,price: freezed == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,accessibility: freezed == accessibility ? _self.accessibility : accessibility // ignore: cast_nullable_to_non_nullable
as String?,included: freezed == included ? _self.included : included // ignore: cast_nullable_to_non_nullable
as String?,externalBookingMode: null == externalBookingMode ? _self.externalBookingMode : externalBookingMode // ignore: cast_nullable_to_non_nullable
as bool,externalBookingProvider: freezed == externalBookingProvider ? _self.externalBookingProvider : externalBookingProvider // ignore: cast_nullable_to_non_nullable
as String?,externalEventUrl: freezed == externalEventUrl ? _self.externalEventUrl : externalEventUrl // ignore: cast_nullable_to_non_nullable
as String?,externalEventId: freezed == externalEventId ? _self.externalEventId : externalEventId // ignore: cast_nullable_to_non_nullable
as String?,runtimeWalkInPolicy: freezed == runtimeWalkInPolicy ? _self.runtimeWalkInPolicy : runtimeWalkInPolicy // ignore: cast_nullable_to_non_nullable
as String?,rosterFileName: freezed == rosterFileName ? _self.rosterFileName : rosterFileName // ignore: cast_nullable_to_non_nullable
as String?,rosterFileFingerprint: freezed == rosterFileFingerprint ? _self.rosterFileFingerprint : rosterFileFingerprint // ignore: cast_nullable_to_non_nullable
as String?,rosterReadyCount: freezed == rosterReadyCount ? _self.rosterReadyCount : rosterReadyCount // ignore: cast_nullable_to_non_nullable
as int?,activityKind: freezed == activityKind ? _self.activityKind : activityKind // ignore: cast_nullable_to_non_nullable
as String?,customActivityLabel: freezed == customActivityLabel ? _self.customActivityLabel : customActivityLabel // ignore: cast_nullable_to_non_nullable
as String?,interactionModel: freezed == interactionModel ? _self.interactionModel : interactionModel // ignore: cast_nullable_to_non_nullable
as String?,paceName: freezed == paceName ? _self.paceName : paceName // ignore: cast_nullable_to_non_nullable
as String?,routePlan: freezed == routePlan ? _self.routePlan : routePlan // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,routePlanEnabled: freezed == routePlanEnabled ? _self.routePlanEnabled : routePlanEnabled // ignore: cast_nullable_to_non_nullable
as bool?,itinerary: null == itinerary ? _self.itinerary : itinerary // ignore: cast_nullable_to_non_nullable
as List<EventItineraryItem>,meetingPoint: freezed == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String?,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,meetingLocationAddress: freezed == meetingLocationAddress ? _self.meetingLocationAddress : meetingLocationAddress // ignore: cast_nullable_to_non_nullable
as String?,meetingLocationPlaceId: freezed == meetingLocationPlaceId ? _self.meetingLocationPlaceId : meetingLocationPlaceId // ignore: cast_nullable_to_non_nullable
as String?,sourceVenueId: freezed == sourceVenueId ? _self.sourceVenueId : sourceVenueId // ignore: cast_nullable_to_non_nullable
as String?,startingPointLat: freezed == startingPointLat ? _self.startingPointLat : startingPointLat // ignore: cast_nullable_to_non_nullable
as double?,startingPointLng: freezed == startingPointLng ? _self.startingPointLng : startingPointLng // ignore: cast_nullable_to_non_nullable
as double?,selectedDateMillis: freezed == selectedDateMillis ? _self.selectedDateMillis : selectedDateMillis // ignore: cast_nullable_to_non_nullable
as int?,selectedStartHour: freezed == selectedStartHour ? _self.selectedStartHour : selectedStartHour // ignore: cast_nullable_to_non_nullable
as int?,selectedStartMinute: freezed == selectedStartMinute ? _self.selectedStartMinute : selectedStartMinute // ignore: cast_nullable_to_non_nullable
as int?,durationMinutes: null == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int,minAge: freezed == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as String?,maxAge: freezed == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as String?,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as String?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as String?,admissionPreset: freezed == admissionPreset ? _self.admissionPreset : admissionPreset // ignore: cast_nullable_to_non_nullable
as String?,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,dynamicPricingEnabled: null == dynamicPricingEnabled ? _self.dynamicPricingEnabled : dynamicPricingEnabled // ignore: cast_nullable_to_non_nullable
as bool,dynamicPricingStep: freezed == dynamicPricingStep ? _self.dynamicPricingStep : dynamicPricingStep // ignore: cast_nullable_to_non_nullable
as String?,dynamicPricingMax: freezed == dynamicPricingMax ? _self.dynamicPricingMax : dynamicPricingMax // ignore: cast_nullable_to_non_nullable
as String?,cancellationPolicy: freezed == cancellationPolicy ? _self.cancellationPolicy : cancellationPolicy // ignore: cast_nullable_to_non_nullable
as String?,crossPathsPairInventoryEnabled: null == crossPathsPairInventoryEnabled ? _self.crossPathsPairInventoryEnabled : crossPathsPairInventoryEnabled // ignore: cast_nullable_to_non_nullable
as bool,crossPathsPairCapacity: freezed == crossPathsPairCapacity ? _self.crossPathsPairCapacity : crossPathsPairCapacity // ignore: cast_nullable_to_non_nullable
as String?,eventSuccessDefaults: null == eventSuccessDefaults ? _self.eventSuccessDefaults : eventSuccessDefaults // ignore: cast_nullable_to_non_nullable
as EventSuccessDefaults,
  ));
}
/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventSuccessDefaultsCopyWith<$Res> get eventSuccessDefaults {
  
  return $EventSuccessDefaultsCopyWith<$Res>(_self.eventSuccessDefaults, (value) {
    return _then(_self.copyWith(eventSuccessDefaults: value));
  });
}
}


/// Adds pattern-matching-related methods to [EventDraft].
extension EventDraftPatterns on EventDraft {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventDraft value)  $default,){
final _that = this;
switch (_that) {
case _EventDraft():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventDraft value)?  $default,){
final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String organizerId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that.id,_that.organizerId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String organizerId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)  $default,) {final _that = this;
switch (_that) {
case _EventDraft():
return $default(_that.id,_that.organizerId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String organizerId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)?  $default,) {final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that.id,_that.organizerId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventDraft implements EventDraft {
  const _EventDraft({required this.id, required this.organizerId, required this.savedAt, this.name, this.eventCityId, this.eventMarketId, this.eventLocalDate, this.eventLocalStartTime, this.eventTimezone, this.eventCityMode, this.eventTimezoneMode, this.eventReviewedDefaultsHash, this.eventCreateRequestId, this.eventCreatePayloadSignature, this.eventCreatePayloadJson, this.eventCreateReceiptEventId, this.eventCreateReceiptRevision, this.distance, this.capacity, this.price, this.description, @JsonKey(includeIfNull: false) this.accessibility, @JsonKey(includeIfNull: false) this.included, this.externalBookingMode = false, this.externalBookingProvider, this.externalEventUrl, this.externalEventId, this.runtimeWalkInPolicy, this.rosterFileName, this.rosterFileFingerprint, this.rosterReadyCount, this.activityKind, this.customActivityLabel, this.interactionModel, this.paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false) this.routePlanEnabled,  List<EventItineraryItem> itinerary = const [], this.meetingPoint, this.locationDetails, this.meetingLocationAddress, this.meetingLocationPlaceId, this.sourceVenueId, this.startingPointLat, this.startingPointLng, this.selectedDateMillis, this.selectedStartHour, this.selectedStartMinute, this.durationMinutes = BusinessRules.eventDefaultDurationMinutes, this.minAge, this.maxAge, this.maxMen, this.maxWomen, this.admissionPreset, this.inviteCode, this.dynamicPricingEnabled = false, this.dynamicPricingStep, this.dynamicPricingMax, this.cancellationPolicy, this.crossPathsPairInventoryEnabled = false, this.crossPathsPairCapacity, this.eventSuccessDefaults = const EventSuccessDefaults()}): _routePlan = routePlan,_itinerary = itinerary;
  factory _EventDraft.fromJson(Map<String, dynamic> json) => _$EventDraftFromJson(json);

@override final  String id;
@override final  String organizerId;
@override final  DateTime savedAt;
@override final  String? name;
@override final  String? eventCityId;
@override final  String? eventMarketId;
@override final  String? eventLocalDate;
@override final  String? eventLocalStartTime;
@override final  String? eventTimezone;
@override final  String? eventCityMode;
@override final  String? eventTimezoneMode;
@override final  String? eventReviewedDefaultsHash;
@override final  String? eventCreateRequestId;
@override final  String? eventCreatePayloadSignature;
@override final  String? eventCreatePayloadJson;
@override final  String? eventCreateReceiptEventId;
@override final  int? eventCreateReceiptRevision;
@override final  String? distance;
@override final  String? capacity;
@override final  String? price;
@override final  String? description;
@override@JsonKey(includeIfNull: false) final  String? accessibility;
@override@JsonKey(includeIfNull: false) final  String? included;
@override@JsonKey() final  bool externalBookingMode;
@override final  String? externalBookingProvider;
@override final  String? externalEventUrl;
@override final  String? externalEventId;
@override final  String? runtimeWalkInPolicy;
@override final  String? rosterFileName;
@override final  String? rosterFileFingerprint;
@override final  int? rosterReadyCount;
@override final  String? activityKind;
@override final  String? customActivityLabel;
@override final  String? interactionModel;
@override final  String? paceName;
 final  Map<String, dynamic>? _routePlan;
@override Map<String, dynamic>? get routePlan {
  final value = _routePlan;
  if (value == null) return null;
  if (_routePlan is EqualUnmodifiableMapView) return _routePlan;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

@override@JsonKey(includeIfNull: false) final  bool? routePlanEnabled;
 final  List<EventItineraryItem> _itinerary;
@override@JsonKey() List<EventItineraryItem> get itinerary {
  if (_itinerary is EqualUnmodifiableListView) return _itinerary;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_itinerary);
}

@override final  String? meetingPoint;
@override final  String? locationDetails;
@override final  String? meetingLocationAddress;
@override final  String? meetingLocationPlaceId;
@override final  String? sourceVenueId;
@override final  double? startingPointLat;
@override final  double? startingPointLng;
@override final  int? selectedDateMillis;
@override final  int? selectedStartHour;
@override final  int? selectedStartMinute;
@override@JsonKey() final  int durationMinutes;
@override final  String? minAge;
@override final  String? maxAge;
@override final  String? maxMen;
@override final  String? maxWomen;
@override final  String? admissionPreset;
@override final  String? inviteCode;
@override@JsonKey() final  bool dynamicPricingEnabled;
@override final  String? dynamicPricingStep;
@override final  String? dynamicPricingMax;
@override final  String? cancellationPolicy;
@override@JsonKey() final  bool crossPathsPairInventoryEnabled;
@override final  String? crossPathsPairCapacity;
@override@JsonKey() final  EventSuccessDefaults eventSuccessDefaults;

/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventDraftCopyWith<_EventDraft> get copyWith => __$EventDraftCopyWithImpl<_EventDraft>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventDraftToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventDraft&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.eventCityId, eventCityId) || other.eventCityId == eventCityId)&&(identical(other.eventMarketId, eventMarketId) || other.eventMarketId == eventMarketId)&&(identical(other.eventLocalDate, eventLocalDate) || other.eventLocalDate == eventLocalDate)&&(identical(other.eventLocalStartTime, eventLocalStartTime) || other.eventLocalStartTime == eventLocalStartTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.eventCityMode, eventCityMode) || other.eventCityMode == eventCityMode)&&(identical(other.eventTimezoneMode, eventTimezoneMode) || other.eventTimezoneMode == eventTimezoneMode)&&(identical(other.eventReviewedDefaultsHash, eventReviewedDefaultsHash) || other.eventReviewedDefaultsHash == eventReviewedDefaultsHash)&&(identical(other.eventCreateRequestId, eventCreateRequestId) || other.eventCreateRequestId == eventCreateRequestId)&&(identical(other.eventCreatePayloadSignature, eventCreatePayloadSignature) || other.eventCreatePayloadSignature == eventCreatePayloadSignature)&&(identical(other.eventCreatePayloadJson, eventCreatePayloadJson) || other.eventCreatePayloadJson == eventCreatePayloadJson)&&(identical(other.eventCreateReceiptEventId, eventCreateReceiptEventId) || other.eventCreateReceiptEventId == eventCreateReceiptEventId)&&(identical(other.eventCreateReceiptRevision, eventCreateReceiptRevision) || other.eventCreateReceiptRevision == eventCreateReceiptRevision)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.capacity, capacity) || other.capacity == capacity)&&(identical(other.price, price) || other.price == price)&&(identical(other.description, description) || other.description == description)&&(identical(other.accessibility, accessibility) || other.accessibility == accessibility)&&(identical(other.included, included) || other.included == included)&&(identical(other.externalBookingMode, externalBookingMode) || other.externalBookingMode == externalBookingMode)&&(identical(other.externalBookingProvider, externalBookingProvider) || other.externalBookingProvider == externalBookingProvider)&&(identical(other.externalEventUrl, externalEventUrl) || other.externalEventUrl == externalEventUrl)&&(identical(other.externalEventId, externalEventId) || other.externalEventId == externalEventId)&&(identical(other.runtimeWalkInPolicy, runtimeWalkInPolicy) || other.runtimeWalkInPolicy == runtimeWalkInPolicy)&&(identical(other.rosterFileName, rosterFileName) || other.rosterFileName == rosterFileName)&&(identical(other.rosterFileFingerprint, rosterFileFingerprint) || other.rosterFileFingerprint == rosterFileFingerprint)&&(identical(other.rosterReadyCount, rosterReadyCount) || other.rosterReadyCount == rosterReadyCount)&&(identical(other.activityKind, activityKind) || other.activityKind == activityKind)&&(identical(other.customActivityLabel, customActivityLabel) || other.customActivityLabel == customActivityLabel)&&(identical(other.interactionModel, interactionModel) || other.interactionModel == interactionModel)&&(identical(other.paceName, paceName) || other.paceName == paceName)&&const DeepCollectionEquality().equals(other.routePlan, _routePlan)&&(identical(other.routePlanEnabled, routePlanEnabled) || other.routePlanEnabled == routePlanEnabled)&&const DeepCollectionEquality().equals(other.itinerary, _itinerary)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&(identical(other.meetingLocationAddress, meetingLocationAddress) || other.meetingLocationAddress == meetingLocationAddress)&&(identical(other.meetingLocationPlaceId, meetingLocationPlaceId) || other.meetingLocationPlaceId == meetingLocationPlaceId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.selectedDateMillis, selectedDateMillis) || other.selectedDateMillis == selectedDateMillis)&&(identical(other.selectedStartHour, selectedStartHour) || other.selectedStartHour == selectedStartHour)&&(identical(other.selectedStartMinute, selectedStartMinute) || other.selectedStartMinute == selectedStartMinute)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen)&&(identical(other.admissionPreset, admissionPreset) || other.admissionPreset == admissionPreset)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.dynamicPricingEnabled, dynamicPricingEnabled) || other.dynamicPricingEnabled == dynamicPricingEnabled)&&(identical(other.dynamicPricingStep, dynamicPricingStep) || other.dynamicPricingStep == dynamicPricingStep)&&(identical(other.dynamicPricingMax, dynamicPricingMax) || other.dynamicPricingMax == dynamicPricingMax)&&(identical(other.cancellationPolicy, cancellationPolicy) || other.cancellationPolicy == cancellationPolicy)&&(identical(other.crossPathsPairInventoryEnabled, crossPathsPairInventoryEnabled) || other.crossPathsPairInventoryEnabled == crossPathsPairInventoryEnabled)&&(identical(other.crossPathsPairCapacity, crossPathsPairCapacity) || other.crossPathsPairCapacity == crossPathsPairCapacity)&&(identical(other.eventSuccessDefaults, eventSuccessDefaults) || other.eventSuccessDefaults == eventSuccessDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hashAll([runtimeType,id,organizerId,savedAt,name,eventCityId,eventMarketId,eventLocalDate,eventLocalStartTime,eventTimezone,eventCityMode,eventTimezoneMode,eventReviewedDefaultsHash,eventCreateRequestId,eventCreatePayloadSignature,eventCreatePayloadJson,eventCreateReceiptEventId,eventCreateReceiptRevision,distance,capacity,price,description,accessibility,included,externalBookingMode,externalBookingProvider,externalEventUrl,externalEventId,runtimeWalkInPolicy,rosterFileName,rosterFileFingerprint,rosterReadyCount,activityKind,customActivityLabel,interactionModel,paceName,const DeepCollectionEquality().hash(_routePlan),routePlanEnabled,const DeepCollectionEquality().hash(_itinerary),meetingPoint,locationDetails,meetingLocationAddress,meetingLocationPlaceId,sourceVenueId,startingPointLat,startingPointLng,selectedDateMillis,selectedStartHour,selectedStartMinute,durationMinutes,minAge,maxAge,maxMen,maxWomen,admissionPreset,inviteCode,dynamicPricingEnabled,dynamicPricingStep,dynamicPricingMax,cancellationPolicy,crossPathsPairInventoryEnabled,crossPathsPairCapacity,eventSuccessDefaults]);
}

@override
String toString() {
    return 'EventDraft(id: $id, organizerId: $organizerId, savedAt: $savedAt, name: $name, eventCityId: $eventCityId, eventMarketId: $eventMarketId, eventLocalDate: $eventLocalDate, eventLocalStartTime: $eventLocalStartTime, eventTimezone: $eventTimezone, eventCityMode: $eventCityMode, eventTimezoneMode: $eventTimezoneMode, eventReviewedDefaultsHash: $eventReviewedDefaultsHash, eventCreateRequestId: $eventCreateRequestId, eventCreatePayloadSignature: $eventCreatePayloadSignature, eventCreatePayloadJson: $eventCreatePayloadJson, eventCreateReceiptEventId: $eventCreateReceiptEventId, eventCreateReceiptRevision: $eventCreateReceiptRevision, distance: $distance, capacity: $capacity, price: $price, description: $description, accessibility: $accessibility, included: $included, externalBookingMode: $externalBookingMode, externalBookingProvider: $externalBookingProvider, externalEventUrl: $externalEventUrl, externalEventId: $externalEventId, runtimeWalkInPolicy: $runtimeWalkInPolicy, rosterFileName: $rosterFileName, rosterFileFingerprint: $rosterFileFingerprint, rosterReadyCount: $rosterReadyCount, activityKind: $activityKind, customActivityLabel: $customActivityLabel, interactionModel: $interactionModel, paceName: $paceName, routePlan: $routePlan, routePlanEnabled: $routePlanEnabled, itinerary: $itinerary, meetingPoint: $meetingPoint, locationDetails: $locationDetails, meetingLocationAddress: $meetingLocationAddress, meetingLocationPlaceId: $meetingLocationPlaceId, sourceVenueId: $sourceVenueId, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, selectedDateMillis: $selectedDateMillis, selectedStartHour: $selectedStartHour, selectedStartMinute: $selectedStartMinute, durationMinutes: $durationMinutes, minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen, admissionPreset: $admissionPreset, inviteCode: $inviteCode, dynamicPricingEnabled: $dynamicPricingEnabled, dynamicPricingStep: $dynamicPricingStep, dynamicPricingMax: $dynamicPricingMax, cancellationPolicy: $cancellationPolicy, crossPathsPairInventoryEnabled: $crossPathsPairInventoryEnabled, crossPathsPairCapacity: $crossPathsPairCapacity, eventSuccessDefaults: $eventSuccessDefaults)';
}


}

/// @nodoc
abstract mixin class _$EventDraftCopyWith<$Res> implements $EventDraftCopyWith<$Res> {
  factory _$EventDraftCopyWith(_EventDraft value, $Res Function(_EventDraft) _then) = __$EventDraftCopyWithImpl;
@override @useResult
$Res call({
 String id, String organizerId, DateTime savedAt, String? name, String? eventCityId, String? eventMarketId, String? eventLocalDate, String? eventLocalStartTime, String? eventTimezone, String? eventCityMode, String? eventTimezoneMode, String? eventReviewedDefaultsHash, String? eventCreateRequestId, String? eventCreatePayloadSignature, String? eventCreatePayloadJson, String? eventCreateReceiptEventId, int? eventCreateReceiptRevision, String? distance, String? capacity, String? price, String? description,@JsonKey(includeIfNull: false) String? accessibility,@JsonKey(includeIfNull: false) String? included, bool externalBookingMode, String? externalBookingProvider, String? externalEventUrl, String? externalEventId, String? runtimeWalkInPolicy, String? rosterFileName, String? rosterFileFingerprint, int? rosterReadyCount, String? activityKind, String? customActivityLabel, String? interactionModel, String? paceName, Map<String, dynamic>? routePlan,@JsonKey(includeIfNull: false) bool? routePlanEnabled, List<EventItineraryItem> itinerary, String? meetingPoint, String? locationDetails, String? meetingLocationAddress, String? meetingLocationPlaceId, String? sourceVenueId, double? startingPointLat, double? startingPointLng, int? selectedDateMillis, int? selectedStartHour, int? selectedStartMinute, int durationMinutes, String? minAge, String? maxAge, String? maxMen, String? maxWomen, String? admissionPreset, String? inviteCode, bool dynamicPricingEnabled, String? dynamicPricingStep, String? dynamicPricingMax, String? cancellationPolicy, bool crossPathsPairInventoryEnabled, String? crossPathsPairCapacity, EventSuccessDefaults eventSuccessDefaults
});


@override $EventSuccessDefaultsCopyWith<$Res> get eventSuccessDefaults;

}
/// @nodoc
class __$EventDraftCopyWithImpl<$Res>
    implements _$EventDraftCopyWith<$Res> {
  __$EventDraftCopyWithImpl(this._self, this._then);

  final _EventDraft _self;
  final $Res Function(_EventDraft) _then;

/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? organizerId = null,Object? savedAt = null,Object? name = freezed,Object? eventCityId = freezed,Object? eventMarketId = freezed,Object? eventLocalDate = freezed,Object? eventLocalStartTime = freezed,Object? eventTimezone = freezed,Object? eventCityMode = freezed,Object? eventTimezoneMode = freezed,Object? eventReviewedDefaultsHash = freezed,Object? eventCreateRequestId = freezed,Object? eventCreatePayloadSignature = freezed,Object? eventCreatePayloadJson = freezed,Object? eventCreateReceiptEventId = freezed,Object? eventCreateReceiptRevision = freezed,Object? distance = freezed,Object? capacity = freezed,Object? price = freezed,Object? description = freezed,Object? accessibility = freezed,Object? included = freezed,Object? externalBookingMode = null,Object? externalBookingProvider = freezed,Object? externalEventUrl = freezed,Object? externalEventId = freezed,Object? runtimeWalkInPolicy = freezed,Object? rosterFileName = freezed,Object? rosterFileFingerprint = freezed,Object? rosterReadyCount = freezed,Object? activityKind = freezed,Object? customActivityLabel = freezed,Object? interactionModel = freezed,Object? paceName = freezed,Object? routePlan = freezed,Object? routePlanEnabled = freezed,Object? itinerary = null,Object? meetingPoint = freezed,Object? locationDetails = freezed,Object? meetingLocationAddress = freezed,Object? meetingLocationPlaceId = freezed,Object? sourceVenueId = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? selectedDateMillis = freezed,Object? selectedStartHour = freezed,Object? selectedStartMinute = freezed,Object? durationMinutes = null,Object? minAge = freezed,Object? maxAge = freezed,Object? maxMen = freezed,Object? maxWomen = freezed,Object? admissionPreset = freezed,Object? inviteCode = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStep = freezed,Object? dynamicPricingMax = freezed,Object? cancellationPolicy = freezed,Object? crossPathsPairInventoryEnabled = null,Object? crossPathsPairCapacity = freezed,Object? eventSuccessDefaults = null,}) {
  return _then(_EventDraft(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,eventCityId: freezed == eventCityId ? _self.eventCityId : eventCityId // ignore: cast_nullable_to_non_nullable
as String?,eventMarketId: freezed == eventMarketId ? _self.eventMarketId : eventMarketId // ignore: cast_nullable_to_non_nullable
as String?,eventLocalDate: freezed == eventLocalDate ? _self.eventLocalDate : eventLocalDate // ignore: cast_nullable_to_non_nullable
as String?,eventLocalStartTime: freezed == eventLocalStartTime ? _self.eventLocalStartTime : eventLocalStartTime // ignore: cast_nullable_to_non_nullable
as String?,eventTimezone: freezed == eventTimezone ? _self.eventTimezone : eventTimezone // ignore: cast_nullable_to_non_nullable
as String?,eventCityMode: freezed == eventCityMode ? _self.eventCityMode : eventCityMode // ignore: cast_nullable_to_non_nullable
as String?,eventTimezoneMode: freezed == eventTimezoneMode ? _self.eventTimezoneMode : eventTimezoneMode // ignore: cast_nullable_to_non_nullable
as String?,eventReviewedDefaultsHash: freezed == eventReviewedDefaultsHash ? _self.eventReviewedDefaultsHash : eventReviewedDefaultsHash // ignore: cast_nullable_to_non_nullable
as String?,eventCreateRequestId: freezed == eventCreateRequestId ? _self.eventCreateRequestId : eventCreateRequestId // ignore: cast_nullable_to_non_nullable
as String?,eventCreatePayloadSignature: freezed == eventCreatePayloadSignature ? _self.eventCreatePayloadSignature : eventCreatePayloadSignature // ignore: cast_nullable_to_non_nullable
as String?,eventCreatePayloadJson: freezed == eventCreatePayloadJson ? _self.eventCreatePayloadJson : eventCreatePayloadJson // ignore: cast_nullable_to_non_nullable
as String?,eventCreateReceiptEventId: freezed == eventCreateReceiptEventId ? _self.eventCreateReceiptEventId : eventCreateReceiptEventId // ignore: cast_nullable_to_non_nullable
as String?,eventCreateReceiptRevision: freezed == eventCreateReceiptRevision ? _self.eventCreateReceiptRevision : eventCreateReceiptRevision // ignore: cast_nullable_to_non_nullable
as int?,distance: freezed == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as String?,capacity: freezed == capacity ? _self.capacity : capacity // ignore: cast_nullable_to_non_nullable
as String?,price: freezed == price ? _self.price : price // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,accessibility: freezed == accessibility ? _self.accessibility : accessibility // ignore: cast_nullable_to_non_nullable
as String?,included: freezed == included ? _self.included : included // ignore: cast_nullable_to_non_nullable
as String?,externalBookingMode: null == externalBookingMode ? _self.externalBookingMode : externalBookingMode // ignore: cast_nullable_to_non_nullable
as bool,externalBookingProvider: freezed == externalBookingProvider ? _self.externalBookingProvider : externalBookingProvider // ignore: cast_nullable_to_non_nullable
as String?,externalEventUrl: freezed == externalEventUrl ? _self.externalEventUrl : externalEventUrl // ignore: cast_nullable_to_non_nullable
as String?,externalEventId: freezed == externalEventId ? _self.externalEventId : externalEventId // ignore: cast_nullable_to_non_nullable
as String?,runtimeWalkInPolicy: freezed == runtimeWalkInPolicy ? _self.runtimeWalkInPolicy : runtimeWalkInPolicy // ignore: cast_nullable_to_non_nullable
as String?,rosterFileName: freezed == rosterFileName ? _self.rosterFileName : rosterFileName // ignore: cast_nullable_to_non_nullable
as String?,rosterFileFingerprint: freezed == rosterFileFingerprint ? _self.rosterFileFingerprint : rosterFileFingerprint // ignore: cast_nullable_to_non_nullable
as String?,rosterReadyCount: freezed == rosterReadyCount ? _self.rosterReadyCount : rosterReadyCount // ignore: cast_nullable_to_non_nullable
as int?,activityKind: freezed == activityKind ? _self.activityKind : activityKind // ignore: cast_nullable_to_non_nullable
as String?,customActivityLabel: freezed == customActivityLabel ? _self.customActivityLabel : customActivityLabel // ignore: cast_nullable_to_non_nullable
as String?,interactionModel: freezed == interactionModel ? _self.interactionModel : interactionModel // ignore: cast_nullable_to_non_nullable
as String?,paceName: freezed == paceName ? _self.paceName : paceName // ignore: cast_nullable_to_non_nullable
as String?,routePlan: freezed == routePlan ? _self._routePlan : routePlan // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,routePlanEnabled: freezed == routePlanEnabled ? _self.routePlanEnabled : routePlanEnabled // ignore: cast_nullable_to_non_nullable
as bool?,itinerary: null == itinerary ? _self._itinerary : itinerary // ignore: cast_nullable_to_non_nullable
as List<EventItineraryItem>,meetingPoint: freezed == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String?,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,meetingLocationAddress: freezed == meetingLocationAddress ? _self.meetingLocationAddress : meetingLocationAddress // ignore: cast_nullable_to_non_nullable
as String?,meetingLocationPlaceId: freezed == meetingLocationPlaceId ? _self.meetingLocationPlaceId : meetingLocationPlaceId // ignore: cast_nullable_to_non_nullable
as String?,sourceVenueId: freezed == sourceVenueId ? _self.sourceVenueId : sourceVenueId // ignore: cast_nullable_to_non_nullable
as String?,startingPointLat: freezed == startingPointLat ? _self.startingPointLat : startingPointLat // ignore: cast_nullable_to_non_nullable
as double?,startingPointLng: freezed == startingPointLng ? _self.startingPointLng : startingPointLng // ignore: cast_nullable_to_non_nullable
as double?,selectedDateMillis: freezed == selectedDateMillis ? _self.selectedDateMillis : selectedDateMillis // ignore: cast_nullable_to_non_nullable
as int?,selectedStartHour: freezed == selectedStartHour ? _self.selectedStartHour : selectedStartHour // ignore: cast_nullable_to_non_nullable
as int?,selectedStartMinute: freezed == selectedStartMinute ? _self.selectedStartMinute : selectedStartMinute // ignore: cast_nullable_to_non_nullable
as int?,durationMinutes: null == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int,minAge: freezed == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as String?,maxAge: freezed == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as String?,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as String?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as String?,admissionPreset: freezed == admissionPreset ? _self.admissionPreset : admissionPreset // ignore: cast_nullable_to_non_nullable
as String?,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,dynamicPricingEnabled: null == dynamicPricingEnabled ? _self.dynamicPricingEnabled : dynamicPricingEnabled // ignore: cast_nullable_to_non_nullable
as bool,dynamicPricingStep: freezed == dynamicPricingStep ? _self.dynamicPricingStep : dynamicPricingStep // ignore: cast_nullable_to_non_nullable
as String?,dynamicPricingMax: freezed == dynamicPricingMax ? _self.dynamicPricingMax : dynamicPricingMax // ignore: cast_nullable_to_non_nullable
as String?,cancellationPolicy: freezed == cancellationPolicy ? _self.cancellationPolicy : cancellationPolicy // ignore: cast_nullable_to_non_nullable
as String?,crossPathsPairInventoryEnabled: null == crossPathsPairInventoryEnabled ? _self.crossPathsPairInventoryEnabled : crossPathsPairInventoryEnabled // ignore: cast_nullable_to_non_nullable
as bool,crossPathsPairCapacity: freezed == crossPathsPairCapacity ? _self.crossPathsPairCapacity : crossPathsPairCapacity // ignore: cast_nullable_to_non_nullable
as String?,eventSuccessDefaults: null == eventSuccessDefaults ? _self.eventSuccessDefaults : eventSuccessDefaults // ignore: cast_nullable_to_non_nullable
as EventSuccessDefaults,
  ));
}

/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventSuccessDefaultsCopyWith<$Res> get eventSuccessDefaults {
  
  return $EventSuccessDefaultsCopyWith<$Res>(_self.eventSuccessDefaults, (value) {
    return _then(_self.copyWith(eventSuccessDefaults: value));
  });
}
}

// dart format on
