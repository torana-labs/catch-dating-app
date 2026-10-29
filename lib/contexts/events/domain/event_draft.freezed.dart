// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventDraft {

 String get id; String get clubId; DateTime get savedAt; String? get name; String? get eventCityId; String? get eventMarketId; String? get eventLocalDate; String? get eventLocalStartTime; String? get eventTimezone; String? get eventCityMode; String? get eventTimezoneMode; String? get eventReviewedDefaultsHash; String? get eventCreateRequestId; String? get eventCreatePayloadSignature; String? get eventCreatePayloadJson; String? get eventCreateReceiptEventId; int? get eventCreateReceiptRevision; String? get distance; String? get capacity; String? get price; String? get description;@JsonKey(includeIfNull: false) String? get accessibility;@JsonKey(includeIfNull: false) String? get included; bool get externalBookingMode; String? get externalBookingProvider; String? get externalEventUrl; String? get externalEventId; String? get runtimeWalkInPolicy; String? get rosterFileName; String? get rosterFileFingerprint; int? get rosterReadyCount; String? get activityKind; String? get customActivityLabel; String? get interactionModel; String? get paceName; Map<String, dynamic>? get routePlan;@JsonKey(includeIfNull: false) bool? get routePlanEnabled; List<EventItineraryItem> get itinerary; String? get meetingPoint; String? get locationDetails; String? get meetingLocationAddress; String? get meetingLocationPlaceId; String? get sourceVenueId; double? get startingPointLat; double? get startingPointLng; int? get selectedDateMillis; int? get selectedStartHour; int? get selectedStartMinute; int get durationMinutes; String? get minAge; String? get maxAge; String? get maxMen; String? get maxWomen; String? get admissionPreset; String? get inviteCode; bool get dynamicPricingEnabled; String? get dynamicPricingStep; String? get dynamicPricingMax; String? get cancellationPolicy; bool get crossPathsPairInventoryEnabled; String? get crossPathsPairCapacity; EventSuccessDefaults get eventSuccessDefaults;
/// Create a copy of EventDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventDraftCopyWith<EventDraft> get copyWith => _$EventDraftCopyWithImpl<EventDraft>(this as EventDraft, _$identity);

  /// Serializes this EventDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventDraft&&(identical(other.id, id) || other.id == id)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.eventCityId, eventCityId) || other.eventCityId == eventCityId)&&(identical(other.eventMarketId, eventMarketId) || other.eventMarketId == eventMarketId)&&(identical(other.eventLocalDate, eventLocalDate) || other.eventLocalDate == eventLocalDate)&&(identical(other.eventLocalStartTime, eventLocalStartTime) || other.eventLocalStartTime == eventLocalStartTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.eventCityMode, eventCityMode) || other.eventCityMode == eventCityMode)&&(identical(other.eventTimezoneMode, eventTimezoneMode) || other.eventTimezoneMode == eventTimezoneMode)&&(identical(other.eventReviewedDefaultsHash, eventReviewedDefaultsHash) || other.eventReviewedDefaultsHash == eventReviewedDefaultsHash)&&(identical(other.eventCreateRequestId, eventCreateRequestId) || other.eventCreateRequestId == eventCreateRequestId)&&(identical(other.eventCreatePayloadSignature, eventCreatePayloadSignature) || other.eventCreatePayloadSignature == eventCreatePayloadSignature)&&(identical(other.eventCreatePayloadJson, eventCreatePayloadJson) || other.eventCreatePayloadJson == eventCreatePayloadJson)&&(identical(other.eventCreateReceiptEventId, eventCreateReceiptEventId) || other.eventCreateReceiptEventId == eventCreateReceiptEventId)&&(identical(other.eventCreateReceiptRevision, eventCreateReceiptRevision) || other.eventCreateReceiptRevision == eventCreateReceiptRevision)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.capacity, capacity) || other.capacity == capacity)&&(identical(other.price, price) || other.price == price)&&(identical(other.description, description) || other.description == description)&&(identical(other.accessibility, accessibility) || other.accessibility == accessibility)&&(identical(other.included, included) || other.included == included)&&(identical(other.externalBookingMode, externalBookingMode) || other.externalBookingMode == externalBookingMode)&&(identical(other.externalBookingProvider, externalBookingProvider) || other.externalBookingProvider == externalBookingProvider)&&(identical(other.externalEventUrl, externalEventUrl) || other.externalEventUrl == externalEventUrl)&&(identical(other.externalEventId, externalEventId) || other.externalEventId == externalEventId)&&(identical(other.runtimeWalkInPolicy, runtimeWalkInPolicy) || other.runtimeWalkInPolicy == runtimeWalkInPolicy)&&(identical(other.rosterFileName, rosterFileName) || other.rosterFileName == rosterFileName)&&(identical(other.rosterFileFingerprint, rosterFileFingerprint) || other.rosterFileFingerprint == rosterFileFingerprint)&&(identical(other.rosterReadyCount, rosterReadyCount) || other.rosterReadyCount == rosterReadyCount)&&(identical(other.activityKind, activityKind) || other.activityKind == activityKind)&&(identical(other.customActivityLabel, customActivityLabel) || other.customActivityLabel == customActivityLabel)&&(identical(other.interactionModel, interactionModel) || other.interactionModel == interactionModel)&&(identical(other.paceName, paceName) || other.paceName == paceName)&&const DeepCollectionEquality().equals(other.routePlan, routePlan)&&(identical(other.routePlanEnabled, routePlanEnabled) || other.routePlanEnabled == routePlanEnabled)&&const DeepCollectionEquality().equals(other.itinerary, itinerary)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&(identical(other.meetingLocationAddress, meetingLocationAddress) || other.meetingLocationAddress == meetingLocationAddress)&&(identical(other.meetingLocationPlaceId, meetingLocationPlaceId) || other.meetingLocationPlaceId == meetingLocationPlaceId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.selectedDateMillis, selectedDateMillis) || other.selectedDateMillis == selectedDateMillis)&&(identical(other.selectedStartHour, selectedStartHour) || other.selectedStartHour == selectedStartHour)&&(identical(other.selectedStartMinute, selectedStartMinute) || other.selectedStartMinute == selectedStartMinute)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen)&&(identical(other.admissionPreset, admissionPreset) || other.admissionPreset == admissionPreset)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.dynamicPricingEnabled, dynamicPricingEnabled) || other.dynamicPricingEnabled == dynamicPricingEnabled)&&(identical(other.dynamicPricingStep, dynamicPricingStep) || other.dynamicPricingStep == dynamicPricingStep)&&(identical(other.dynamicPricingMax, dynamicPricingMax) || other.dynamicPricingMax == dynamicPricingMax)&&(identical(other.cancellationPolicy, cancellationPolicy) || other.cancellationPolicy == cancellationPolicy)&&(identical(other.crossPathsPairInventoryEnabled, crossPathsPairInventoryEnabled) || other.crossPathsPairInventoryEnabled == crossPathsPairInventoryEnabled)&&(identical(other.crossPathsPairCapacity, crossPathsPairCapacity) || other.crossPathsPairCapacity == crossPathsPairCapacity)&&(identical(other.eventSuccessDefaults, eventSuccessDefaults) || other.eventSuccessDefaults == eventSuccessDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,clubId,savedAt,name,eventCityId,eventMarketId,eventLocalDate,eventLocalStartTime,eventTimezone,eventCityMode,eventTimezoneMode,eventReviewedDefaultsHash,eventCreateRequestId,eventCreatePayloadSignature,eventCreatePayloadJson,eventCreateReceiptEventId,eventCreateReceiptRevision,distance,capacity,price,description,accessibility,included,externalBookingMode,externalBookingProvider,externalEventUrl,externalEventId,runtimeWalkInPolicy,rosterFileName,rosterFileFingerprint,rosterReadyCount,activityKind,customActivityLabel,interactionModel,paceName,const DeepCollectionEquality().hash(routePlan),routePlanEnabled,const DeepCollectionEquality().hash(itinerary),meetingPoint,locationDetails,meetingLocationAddress,meetingLocationPlaceId,sourceVenueId,startingPointLat,startingPointLng,selectedDateMillis,selectedStartHour,selectedStartMinute,durationMinutes,minAge,maxAge,maxMen,maxWomen,admissionPreset,inviteCode,dynamicPricingEnabled,dynamicPricingStep,dynamicPricingMax,cancellationPolicy,crossPathsPairInventoryEnabled,crossPathsPairCapacity,eventSuccessDefaults]);

@override
String toString() {
  return 'EventDraft(id: $id, clubId: $clubId, savedAt: $savedAt, name: $name, eventCityId: $eventCityId, eventMarketId: $eventMarketId, eventLocalDate: $eventLocalDate, eventLocalStartTime: $eventLocalStartTime, eventTimezone: $eventTimezone, eventCityMode: $eventCityMode, eventTimezoneMode: $eventTimezoneMode, eventReviewedDefaultsHash: $eventReviewedDefaultsHash, eventCreateRequestId: $eventCreateRequestId, eventCreatePayloadSignature: $eventCreatePayloadSignature, eventCreatePayloadJson: $eventCreatePayloadJson, eventCreateReceiptEventId: $eventCreateReceiptEventId, eventCreateReceiptRevision: $eventCreateReceiptRevision, distance: $distance, capacity: $capacity, price: $price, description: $description, accessibility: $accessibility, included: $included, externalBookingMode: $externalBookingMode, externalBookingProvider: $externalBookingProvider, externalEventUrl: $externalEventUrl, externalEventId: $externalEventId, runtimeWalkInPolicy: $runtimeWalkInPolicy, rosterFileName: $rosterFileName, rosterFileFingerprint: $rosterFileFingerprint, rosterReadyCount: $rosterReadyCount, activityKind: $activityKind, customActivityLabel: $customActivityLabel, interactionModel: $interactionModel, paceName: $paceName, routePlan: $routePlan, routePlanEnabled: $routePlanEnabled, itinerary: $itinerary, meetingPoint: $meetingPoint, locationDetails: $locationDetails, meetingLocationAddress: $meetingLocationAddress, meetingLocationPlaceId: $meetingLocationPlaceId, sourceVenueId: $sourceVenueId, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, selectedDateMillis: $selectedDateMillis, selectedStartHour: $selectedStartHour, selectedStartMinute: $selectedStartMinute, durationMinutes: $durationMinutes, minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen, admissionPreset: $admissionPreset, inviteCode: $inviteCode, dynamicPricingEnabled: $dynamicPricingEnabled, dynamicPricingStep: $dynamicPricingStep, dynamicPricingMax: $dynamicPricingMax, cancellationPolicy: $cancellationPolicy, crossPathsPairInventoryEnabled: $crossPathsPairInventoryEnabled, crossPathsPairCapacity: $crossPathsPairCapacity, eventSuccessDefaults: $eventSuccessDefaults)';
}


}

/// @nodoc
abstract mixin class $EventDraftCopyWith<$Res>  {
  factory $EventDraftCopyWith(EventDraft value, $Res Function(EventDraft) _then) = _$EventDraftCopyWithImpl;
@useResult
$Res call({
 String id, String clubId, DateTime savedAt, String? name, String? eventCityId, String? eventMarketId, String? eventLocalDate, String? eventLocalStartTime, String? eventTimezone, String? eventCityMode, String? eventTimezoneMode, String? eventReviewedDefaultsHash, String? eventCreateRequestId, String? eventCreatePayloadSignature, String? eventCreatePayloadJson, String? eventCreateReceiptEventId, int? eventCreateReceiptRevision, String? distance, String? capacity, String? price, String? description,@JsonKey(includeIfNull: false) String? accessibility,@JsonKey(includeIfNull: false) String? included, bool externalBookingMode, String? externalBookingProvider, String? externalEventUrl, String? externalEventId, String? runtimeWalkInPolicy, String? rosterFileName, String? rosterFileFingerprint, int? rosterReadyCount, String? activityKind, String? customActivityLabel, String? interactionModel, String? paceName, Map<String, dynamic>? routePlan,@JsonKey(includeIfNull: false) bool? routePlanEnabled, List<EventItineraryItem> itinerary, String? meetingPoint, String? locationDetails, String? meetingLocationAddress, String? meetingLocationPlaceId, String? sourceVenueId, double? startingPointLat, double? startingPointLng, int? selectedDateMillis, int? selectedStartHour, int? selectedStartMinute, int durationMinutes, String? minAge, String? maxAge, String? maxMen, String? maxWomen, String? admissionPreset, String? inviteCode, bool dynamicPricingEnabled, String? dynamicPricingStep, String? dynamicPricingMax, String? cancellationPolicy, bool crossPathsPairInventoryEnabled, String? crossPathsPairCapacity, EventSuccessDefaults eventSuccessDefaults
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? clubId = null,Object? savedAt = null,Object? name = freezed,Object? eventCityId = freezed,Object? eventMarketId = freezed,Object? eventLocalDate = freezed,Object? eventLocalStartTime = freezed,Object? eventTimezone = freezed,Object? eventCityMode = freezed,Object? eventTimezoneMode = freezed,Object? eventReviewedDefaultsHash = freezed,Object? eventCreateRequestId = freezed,Object? eventCreatePayloadSignature = freezed,Object? eventCreatePayloadJson = freezed,Object? eventCreateReceiptEventId = freezed,Object? eventCreateReceiptRevision = freezed,Object? distance = freezed,Object? capacity = freezed,Object? price = freezed,Object? description = freezed,Object? accessibility = freezed,Object? included = freezed,Object? externalBookingMode = null,Object? externalBookingProvider = freezed,Object? externalEventUrl = freezed,Object? externalEventId = freezed,Object? runtimeWalkInPolicy = freezed,Object? rosterFileName = freezed,Object? rosterFileFingerprint = freezed,Object? rosterReadyCount = freezed,Object? activityKind = freezed,Object? customActivityLabel = freezed,Object? interactionModel = freezed,Object? paceName = freezed,Object? routePlan = freezed,Object? routePlanEnabled = freezed,Object? itinerary = null,Object? meetingPoint = freezed,Object? locationDetails = freezed,Object? meetingLocationAddress = freezed,Object? meetingLocationPlaceId = freezed,Object? sourceVenueId = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? selectedDateMillis = freezed,Object? selectedStartHour = freezed,Object? selectedStartMinute = freezed,Object? durationMinutes = null,Object? minAge = freezed,Object? maxAge = freezed,Object? maxMen = freezed,Object? maxWomen = freezed,Object? admissionPreset = freezed,Object? inviteCode = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStep = freezed,Object? dynamicPricingMax = freezed,Object? cancellationPolicy = freezed,Object? crossPathsPairInventoryEnabled = null,Object? crossPathsPairCapacity = freezed,Object? eventSuccessDefaults = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String clubId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that.id,_that.clubId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String clubId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)  $default,) {final _that = this;
switch (_that) {
case _EventDraft():
return $default(_that.id,_that.clubId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String clubId,  DateTime savedAt,  String? name,  String? eventCityId,  String? eventMarketId,  String? eventLocalDate,  String? eventLocalStartTime,  String? eventTimezone,  String? eventCityMode,  String? eventTimezoneMode,  String? eventReviewedDefaultsHash,  String? eventCreateRequestId,  String? eventCreatePayloadSignature,  String? eventCreatePayloadJson,  String? eventCreateReceiptEventId,  int? eventCreateReceiptRevision,  String? distance,  String? capacity,  String? price,  String? description, @JsonKey(includeIfNull: false)  String? accessibility, @JsonKey(includeIfNull: false)  String? included,  bool externalBookingMode,  String? externalBookingProvider,  String? externalEventUrl,  String? externalEventId,  String? runtimeWalkInPolicy,  String? rosterFileName,  String? rosterFileFingerprint,  int? rosterReadyCount,  String? activityKind,  String? customActivityLabel,  String? interactionModel,  String? paceName,  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false)  bool? routePlanEnabled,  List<EventItineraryItem> itinerary,  String? meetingPoint,  String? locationDetails,  String? meetingLocationAddress,  String? meetingLocationPlaceId,  String? sourceVenueId,  double? startingPointLat,  double? startingPointLng,  int? selectedDateMillis,  int? selectedStartHour,  int? selectedStartMinute,  int durationMinutes,  String? minAge,  String? maxAge,  String? maxMen,  String? maxWomen,  String? admissionPreset,  String? inviteCode,  bool dynamicPricingEnabled,  String? dynamicPricingStep,  String? dynamicPricingMax,  String? cancellationPolicy,  bool crossPathsPairInventoryEnabled,  String? crossPathsPairCapacity,  EventSuccessDefaults eventSuccessDefaults)?  $default,) {final _that = this;
switch (_that) {
case _EventDraft() when $default != null:
return $default(_that.id,_that.clubId,_that.savedAt,_that.name,_that.eventCityId,_that.eventMarketId,_that.eventLocalDate,_that.eventLocalStartTime,_that.eventTimezone,_that.eventCityMode,_that.eventTimezoneMode,_that.eventReviewedDefaultsHash,_that.eventCreateRequestId,_that.eventCreatePayloadSignature,_that.eventCreatePayloadJson,_that.eventCreateReceiptEventId,_that.eventCreateReceiptRevision,_that.distance,_that.capacity,_that.price,_that.description,_that.accessibility,_that.included,_that.externalBookingMode,_that.externalBookingProvider,_that.externalEventUrl,_that.externalEventId,_that.runtimeWalkInPolicy,_that.rosterFileName,_that.rosterFileFingerprint,_that.rosterReadyCount,_that.activityKind,_that.customActivityLabel,_that.interactionModel,_that.paceName,_that.routePlan,_that.routePlanEnabled,_that.itinerary,_that.meetingPoint,_that.locationDetails,_that.meetingLocationAddress,_that.meetingLocationPlaceId,_that.sourceVenueId,_that.startingPointLat,_that.startingPointLng,_that.selectedDateMillis,_that.selectedStartHour,_that.selectedStartMinute,_that.durationMinutes,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.admissionPreset,_that.inviteCode,_that.dynamicPricingEnabled,_that.dynamicPricingStep,_that.dynamicPricingMax,_that.cancellationPolicy,_that.crossPathsPairInventoryEnabled,_that.crossPathsPairCapacity,_that.eventSuccessDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventDraft implements EventDraft {
  const _EventDraft({required this.id, required this.clubId, required this.savedAt, this.name, this.eventCityId, this.eventMarketId, this.eventLocalDate, this.eventLocalStartTime, this.eventTimezone, this.eventCityMode, this.eventTimezoneMode, this.eventReviewedDefaultsHash, this.eventCreateRequestId, this.eventCreatePayloadSignature, this.eventCreatePayloadJson, this.eventCreateReceiptEventId, this.eventCreateReceiptRevision, this.distance, this.capacity, this.price, this.description, @JsonKey(includeIfNull: false) this.accessibility, @JsonKey(includeIfNull: false) this.included, this.externalBookingMode = false, this.externalBookingProvider, this.externalEventUrl, this.externalEventId, this.runtimeWalkInPolicy, this.rosterFileName, this.rosterFileFingerprint, this.rosterReadyCount, this.activityKind, this.customActivityLabel, this.interactionModel, this.paceName, final  Map<String, dynamic>? routePlan, @JsonKey(includeIfNull: false) this.routePlanEnabled, final  List<EventItineraryItem> itinerary = const [], this.meetingPoint, this.locationDetails, this.meetingLocationAddress, this.meetingLocationPlaceId, this.sourceVenueId, this.startingPointLat, this.startingPointLng, this.selectedDateMillis, this.selectedStartHour, this.selectedStartMinute, this.durationMinutes = BusinessRules.eventDefaultDurationMinutes, this.minAge, this.maxAge, this.maxMen, this.maxWomen, this.admissionPreset, this.inviteCode, this.dynamicPricingEnabled = false, this.dynamicPricingStep, this.dynamicPricingMax, this.cancellationPolicy, this.crossPathsPairInventoryEnabled = false, this.crossPathsPairCapacity, this.eventSuccessDefaults = const EventSuccessDefaults()}): _routePlan = routePlan,_itinerary = itinerary;
  factory _EventDraft.fromJson(Map<String, dynamic> json) => _$EventDraftFromJson(json);

@override final  String id;
@override final  String clubId;
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventDraft&&(identical(other.id, id) || other.id == id)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.eventCityId, eventCityId) || other.eventCityId == eventCityId)&&(identical(other.eventMarketId, eventMarketId) || other.eventMarketId == eventMarketId)&&(identical(other.eventLocalDate, eventLocalDate) || other.eventLocalDate == eventLocalDate)&&(identical(other.eventLocalStartTime, eventLocalStartTime) || other.eventLocalStartTime == eventLocalStartTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.eventCityMode, eventCityMode) || other.eventCityMode == eventCityMode)&&(identical(other.eventTimezoneMode, eventTimezoneMode) || other.eventTimezoneMode == eventTimezoneMode)&&(identical(other.eventReviewedDefaultsHash, eventReviewedDefaultsHash) || other.eventReviewedDefaultsHash == eventReviewedDefaultsHash)&&(identical(other.eventCreateRequestId, eventCreateRequestId) || other.eventCreateRequestId == eventCreateRequestId)&&(identical(other.eventCreatePayloadSignature, eventCreatePayloadSignature) || other.eventCreatePayloadSignature == eventCreatePayloadSignature)&&(identical(other.eventCreatePayloadJson, eventCreatePayloadJson) || other.eventCreatePayloadJson == eventCreatePayloadJson)&&(identical(other.eventCreateReceiptEventId, eventCreateReceiptEventId) || other.eventCreateReceiptEventId == eventCreateReceiptEventId)&&(identical(other.eventCreateReceiptRevision, eventCreateReceiptRevision) || other.eventCreateReceiptRevision == eventCreateReceiptRevision)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.capacity, capacity) || other.capacity == capacity)&&(identical(other.price, price) || other.price == price)&&(identical(other.description, description) || other.description == description)&&(identical(other.accessibility, accessibility) || other.accessibility == accessibility)&&(identical(other.included, included) || other.included == included)&&(identical(other.externalBookingMode, externalBookingMode) || other.externalBookingMode == externalBookingMode)&&(identical(other.externalBookingProvider, externalBookingProvider) || other.externalBookingProvider == externalBookingProvider)&&(identical(other.externalEventUrl, externalEventUrl) || other.externalEventUrl == externalEventUrl)&&(identical(other.externalEventId, externalEventId) || other.externalEventId == externalEventId)&&(identical(other.runtimeWalkInPolicy, runtimeWalkInPolicy) || other.runtimeWalkInPolicy == runtimeWalkInPolicy)&&(identical(other.rosterFileName, rosterFileName) || other.rosterFileName == rosterFileName)&&(identical(other.rosterFileFingerprint, rosterFileFingerprint) || other.rosterFileFingerprint == rosterFileFingerprint)&&(identical(other.rosterReadyCount, rosterReadyCount) || other.rosterReadyCount == rosterReadyCount)&&(identical(other.activityKind, activityKind) || other.activityKind == activityKind)&&(identical(other.customActivityLabel, customActivityLabel) || other.customActivityLabel == customActivityLabel)&&(identical(other.interactionModel, interactionModel) || other.interactionModel == interactionModel)&&(identical(other.paceName, paceName) || other.paceName == paceName)&&const DeepCollectionEquality().equals(other._routePlan, _routePlan)&&(identical(other.routePlanEnabled, routePlanEnabled) || other.routePlanEnabled == routePlanEnabled)&&const DeepCollectionEquality().equals(other._itinerary, _itinerary)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&(identical(other.meetingLocationAddress, meetingLocationAddress) || other.meetingLocationAddress == meetingLocationAddress)&&(identical(other.meetingLocationPlaceId, meetingLocationPlaceId) || other.meetingLocationPlaceId == meetingLocationPlaceId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.selectedDateMillis, selectedDateMillis) || other.selectedDateMillis == selectedDateMillis)&&(identical(other.selectedStartHour, selectedStartHour) || other.selectedStartHour == selectedStartHour)&&(identical(other.selectedStartMinute, selectedStartMinute) || other.selectedStartMinute == selectedStartMinute)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen)&&(identical(other.admissionPreset, admissionPreset) || other.admissionPreset == admissionPreset)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.dynamicPricingEnabled, dynamicPricingEnabled) || other.dynamicPricingEnabled == dynamicPricingEnabled)&&(identical(other.dynamicPricingStep, dynamicPricingStep) || other.dynamicPricingStep == dynamicPricingStep)&&(identical(other.dynamicPricingMax, dynamicPricingMax) || other.dynamicPricingMax == dynamicPricingMax)&&(identical(other.cancellationPolicy, cancellationPolicy) || other.cancellationPolicy == cancellationPolicy)&&(identical(other.crossPathsPairInventoryEnabled, crossPathsPairInventoryEnabled) || other.crossPathsPairInventoryEnabled == crossPathsPairInventoryEnabled)&&(identical(other.crossPathsPairCapacity, crossPathsPairCapacity) || other.crossPathsPairCapacity == crossPathsPairCapacity)&&(identical(other.eventSuccessDefaults, eventSuccessDefaults) || other.eventSuccessDefaults == eventSuccessDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,clubId,savedAt,name,eventCityId,eventMarketId,eventLocalDate,eventLocalStartTime,eventTimezone,eventCityMode,eventTimezoneMode,eventReviewedDefaultsHash,eventCreateRequestId,eventCreatePayloadSignature,eventCreatePayloadJson,eventCreateReceiptEventId,eventCreateReceiptRevision,distance,capacity,price,description,accessibility,included,externalBookingMode,externalBookingProvider,externalEventUrl,externalEventId,runtimeWalkInPolicy,rosterFileName,rosterFileFingerprint,rosterReadyCount,activityKind,customActivityLabel,interactionModel,paceName,const DeepCollectionEquality().hash(_routePlan),routePlanEnabled,const DeepCollectionEquality().hash(_itinerary),meetingPoint,locationDetails,meetingLocationAddress,meetingLocationPlaceId,sourceVenueId,startingPointLat,startingPointLng,selectedDateMillis,selectedStartHour,selectedStartMinute,durationMinutes,minAge,maxAge,maxMen,maxWomen,admissionPreset,inviteCode,dynamicPricingEnabled,dynamicPricingStep,dynamicPricingMax,cancellationPolicy,crossPathsPairInventoryEnabled,crossPathsPairCapacity,eventSuccessDefaults]);

@override
String toString() {
  return 'EventDraft(id: $id, clubId: $clubId, savedAt: $savedAt, name: $name, eventCityId: $eventCityId, eventMarketId: $eventMarketId, eventLocalDate: $eventLocalDate, eventLocalStartTime: $eventLocalStartTime, eventTimezone: $eventTimezone, eventCityMode: $eventCityMode, eventTimezoneMode: $eventTimezoneMode, eventReviewedDefaultsHash: $eventReviewedDefaultsHash, eventCreateRequestId: $eventCreateRequestId, eventCreatePayloadSignature: $eventCreatePayloadSignature, eventCreatePayloadJson: $eventCreatePayloadJson, eventCreateReceiptEventId: $eventCreateReceiptEventId, eventCreateReceiptRevision: $eventCreateReceiptRevision, distance: $distance, capacity: $capacity, price: $price, description: $description, accessibility: $accessibility, included: $included, externalBookingMode: $externalBookingMode, externalBookingProvider: $externalBookingProvider, externalEventUrl: $externalEventUrl, externalEventId: $externalEventId, runtimeWalkInPolicy: $runtimeWalkInPolicy, rosterFileName: $rosterFileName, rosterFileFingerprint: $rosterFileFingerprint, rosterReadyCount: $rosterReadyCount, activityKind: $activityKind, customActivityLabel: $customActivityLabel, interactionModel: $interactionModel, paceName: $paceName, routePlan: $routePlan, routePlanEnabled: $routePlanEnabled, itinerary: $itinerary, meetingPoint: $meetingPoint, locationDetails: $locationDetails, meetingLocationAddress: $meetingLocationAddress, meetingLocationPlaceId: $meetingLocationPlaceId, sourceVenueId: $sourceVenueId, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, selectedDateMillis: $selectedDateMillis, selectedStartHour: $selectedStartHour, selectedStartMinute: $selectedStartMinute, durationMinutes: $durationMinutes, minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen, admissionPreset: $admissionPreset, inviteCode: $inviteCode, dynamicPricingEnabled: $dynamicPricingEnabled, dynamicPricingStep: $dynamicPricingStep, dynamicPricingMax: $dynamicPricingMax, cancellationPolicy: $cancellationPolicy, crossPathsPairInventoryEnabled: $crossPathsPairInventoryEnabled, crossPathsPairCapacity: $crossPathsPairCapacity, eventSuccessDefaults: $eventSuccessDefaults)';
}


}

/// @nodoc
abstract mixin class _$EventDraftCopyWith<$Res> implements $EventDraftCopyWith<$Res> {
  factory _$EventDraftCopyWith(_EventDraft value, $Res Function(_EventDraft) _then) = __$EventDraftCopyWithImpl;
@override @useResult
$Res call({
 String id, String clubId, DateTime savedAt, String? name, String? eventCityId, String? eventMarketId, String? eventLocalDate, String? eventLocalStartTime, String? eventTimezone, String? eventCityMode, String? eventTimezoneMode, String? eventReviewedDefaultsHash, String? eventCreateRequestId, String? eventCreatePayloadSignature, String? eventCreatePayloadJson, String? eventCreateReceiptEventId, int? eventCreateReceiptRevision, String? distance, String? capacity, String? price, String? description,@JsonKey(includeIfNull: false) String? accessibility,@JsonKey(includeIfNull: false) String? included, bool externalBookingMode, String? externalBookingProvider, String? externalEventUrl, String? externalEventId, String? runtimeWalkInPolicy, String? rosterFileName, String? rosterFileFingerprint, int? rosterReadyCount, String? activityKind, String? customActivityLabel, String? interactionModel, String? paceName, Map<String, dynamic>? routePlan,@JsonKey(includeIfNull: false) bool? routePlanEnabled, List<EventItineraryItem> itinerary, String? meetingPoint, String? locationDetails, String? meetingLocationAddress, String? meetingLocationPlaceId, String? sourceVenueId, double? startingPointLat, double? startingPointLng, int? selectedDateMillis, int? selectedStartHour, int? selectedStartMinute, int durationMinutes, String? minAge, String? maxAge, String? maxMen, String? maxWomen, String? admissionPreset, String? inviteCode, bool dynamicPricingEnabled, String? dynamicPricingStep, String? dynamicPricingMax, String? cancellationPolicy, bool crossPathsPairInventoryEnabled, String? crossPathsPairCapacity, EventSuccessDefaults eventSuccessDefaults
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? clubId = null,Object? savedAt = null,Object? name = freezed,Object? eventCityId = freezed,Object? eventMarketId = freezed,Object? eventLocalDate = freezed,Object? eventLocalStartTime = freezed,Object? eventTimezone = freezed,Object? eventCityMode = freezed,Object? eventTimezoneMode = freezed,Object? eventReviewedDefaultsHash = freezed,Object? eventCreateRequestId = freezed,Object? eventCreatePayloadSignature = freezed,Object? eventCreatePayloadJson = freezed,Object? eventCreateReceiptEventId = freezed,Object? eventCreateReceiptRevision = freezed,Object? distance = freezed,Object? capacity = freezed,Object? price = freezed,Object? description = freezed,Object? accessibility = freezed,Object? included = freezed,Object? externalBookingMode = null,Object? externalBookingProvider = freezed,Object? externalEventUrl = freezed,Object? externalEventId = freezed,Object? runtimeWalkInPolicy = freezed,Object? rosterFileName = freezed,Object? rosterFileFingerprint = freezed,Object? rosterReadyCount = freezed,Object? activityKind = freezed,Object? customActivityLabel = freezed,Object? interactionModel = freezed,Object? paceName = freezed,Object? routePlan = freezed,Object? routePlanEnabled = freezed,Object? itinerary = null,Object? meetingPoint = freezed,Object? locationDetails = freezed,Object? meetingLocationAddress = freezed,Object? meetingLocationPlaceId = freezed,Object? sourceVenueId = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? selectedDateMillis = freezed,Object? selectedStartHour = freezed,Object? selectedStartMinute = freezed,Object? durationMinutes = null,Object? minAge = freezed,Object? maxAge = freezed,Object? maxMen = freezed,Object? maxWomen = freezed,Object? admissionPreset = freezed,Object? inviteCode = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStep = freezed,Object? dynamicPricingMax = freezed,Object? cancellationPolicy = freezed,Object? crossPathsPairInventoryEnabled = null,Object? crossPathsPairCapacity = freezed,Object? eventSuccessDefaults = null,}) {
  return _then(_EventDraft(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
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
