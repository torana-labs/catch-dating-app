// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Event {

@JsonKey(includeToJson: false) String get id;@JsonKey(includeToJson: false) bool get synthetic;@JsonKey(includeToJson: false) String? get seedPrefix; String get organizerId;@JsonKey(includeIfNull: false) String? get sourceVenueId; String get name;@TimestampConverter() DateTime get startTime;@JsonKey(includeIfNull: false) String? get eventTimezone;@TimestampConverter() DateTime get endTime; String get meetingPoint;@JsonKey(includeIfNull: false) EventMeetingLocation? get meetingLocation; double? get startingPointLat; double? get startingPointLng; String? get locationDetails; List<EventItineraryItem> get itinerary;@JsonKey(includeIfNull: false) String? get photoUrl; List<UploadedPhoto> get eventPhotos; EventFormatSnapshot get eventFormat; double get distanceKm; PaceLevel get pace; int get capacityLimit; String get description; int get priceInPaise; String get currency;@JsonKey(includeIfNull: false) int? get bookedCount;@JsonKey(includeIfNull: false) int? get checkedInCount;@JsonKey(includeIfNull: false) int? get waitlistedCount; int get crossPathsPairHeldCount; int get crossPathsPairConfirmedCount; Map<String, int> get crossPathsPairHeldCohortCounts; bool get crossPathsDiscoveryEnabled; EventLifecycleStatus get status;@NullableTimestampConverter() DateTime? get cancelledAt; String? get cancellationReason;@JsonKey(includeIfNull: false) int? get setupRevision; bool get publicRegistrationEnabled;@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? get publicRegistrationMode; int get publicRegistrationRevision;@JsonKey(unknownEnumValue: EventListing.listed) EventListing get listing; bool get showGuestList; bool get priceHiddenUntilBookingOpens; bool get planVisibleToGuests;@JsonKey(includeIfNull: false) EventOrganizerSummary? get organizerSummary;@JsonKey(includeIfNull: false) EventExternalBooking? get externalBooking; EventConstraints get constraints;@JsonKey(includeIfNull: false) EventPolicyBundle? get eventPolicy;@JsonKey(includeIfNull: false) EventOrigin? get eventOrigin;@JsonKey(includeIfNull: false) EventRuntimeAccess? get runtimeAccess; Map<String, int> get genderCounts; Map<String, int> get cohortCounts; Map<String, int> get waitlistedCohortCounts;
/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventCopyWith<Event> get copyWith => _$EventCopyWithImpl<Event>(this as Event, _$identity);

  /// Serializes this Event to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Event;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Event&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.synthetic, _this.synthetic) || other.synthetic == _this.synthetic)&&(identical(other.seedPrefix, _this.seedPrefix) || other.seedPrefix == _this.seedPrefix)&&(identical(other.organizerId, _this.organizerId) || other.organizerId == _this.organizerId)&&(identical(other.sourceVenueId, _this.sourceVenueId) || other.sourceVenueId == _this.sourceVenueId)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.startTime, _this.startTime) || other.startTime == _this.startTime)&&(identical(other.eventTimezone, _this.eventTimezone) || other.eventTimezone == _this.eventTimezone)&&(identical(other.endTime, _this.endTime) || other.endTime == _this.endTime)&&(identical(other.meetingPoint, _this.meetingPoint) || other.meetingPoint == _this.meetingPoint)&&(identical(other.meetingLocation, _this.meetingLocation) || other.meetingLocation == _this.meetingLocation)&&(identical(other.startingPointLat, _this.startingPointLat) || other.startingPointLat == _this.startingPointLat)&&(identical(other.startingPointLng, _this.startingPointLng) || other.startingPointLng == _this.startingPointLng)&&(identical(other.locationDetails, _this.locationDetails) || other.locationDetails == _this.locationDetails)&&const DeepCollectionEquality().equals(other.itinerary, _this.itinerary)&&(identical(other.photoUrl, _this.photoUrl) || other.photoUrl == _this.photoUrl)&&const DeepCollectionEquality().equals(other.eventPhotos, _this.eventPhotos)&&(identical(other.eventFormat, _this.eventFormat) || other.eventFormat == _this.eventFormat)&&(identical(other.distanceKm, _this.distanceKm) || other.distanceKm == _this.distanceKm)&&(identical(other.pace, _this.pace) || other.pace == _this.pace)&&(identical(other.capacityLimit, _this.capacityLimit) || other.capacityLimit == _this.capacityLimit)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.priceInPaise, _this.priceInPaise) || other.priceInPaise == _this.priceInPaise)&&(identical(other.currency, _this.currency) || other.currency == _this.currency)&&(identical(other.bookedCount, _this.bookedCount) || other.bookedCount == _this.bookedCount)&&(identical(other.checkedInCount, _this.checkedInCount) || other.checkedInCount == _this.checkedInCount)&&(identical(other.waitlistedCount, _this.waitlistedCount) || other.waitlistedCount == _this.waitlistedCount)&&(identical(other.crossPathsPairHeldCount, _this.crossPathsPairHeldCount) || other.crossPathsPairHeldCount == _this.crossPathsPairHeldCount)&&(identical(other.crossPathsPairConfirmedCount, _this.crossPathsPairConfirmedCount) || other.crossPathsPairConfirmedCount == _this.crossPathsPairConfirmedCount)&&const DeepCollectionEquality().equals(other.crossPathsPairHeldCohortCounts, _this.crossPathsPairHeldCohortCounts)&&(identical(other.crossPathsDiscoveryEnabled, _this.crossPathsDiscoveryEnabled) || other.crossPathsDiscoveryEnabled == _this.crossPathsDiscoveryEnabled)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.cancelledAt, _this.cancelledAt) || other.cancelledAt == _this.cancelledAt)&&(identical(other.cancellationReason, _this.cancellationReason) || other.cancellationReason == _this.cancellationReason)&&(identical(other.setupRevision, _this.setupRevision) || other.setupRevision == _this.setupRevision)&&(identical(other.publicRegistrationEnabled, _this.publicRegistrationEnabled) || other.publicRegistrationEnabled == _this.publicRegistrationEnabled)&&(identical(other.publicRegistrationMode, _this.publicRegistrationMode) || other.publicRegistrationMode == _this.publicRegistrationMode)&&(identical(other.publicRegistrationRevision, _this.publicRegistrationRevision) || other.publicRegistrationRevision == _this.publicRegistrationRevision)&&(identical(other.listing, _this.listing) || other.listing == _this.listing)&&(identical(other.showGuestList, _this.showGuestList) || other.showGuestList == _this.showGuestList)&&(identical(other.priceHiddenUntilBookingOpens, _this.priceHiddenUntilBookingOpens) || other.priceHiddenUntilBookingOpens == _this.priceHiddenUntilBookingOpens)&&(identical(other.planVisibleToGuests, _this.planVisibleToGuests) || other.planVisibleToGuests == _this.planVisibleToGuests)&&(identical(other.organizerSummary, _this.organizerSummary) || other.organizerSummary == _this.organizerSummary)&&(identical(other.externalBooking, _this.externalBooking) || other.externalBooking == _this.externalBooking)&&(identical(other.constraints, _this.constraints) || other.constraints == _this.constraints)&&(identical(other.eventPolicy, _this.eventPolicy) || other.eventPolicy == _this.eventPolicy)&&(identical(other.eventOrigin, _this.eventOrigin) || other.eventOrigin == _this.eventOrigin)&&(identical(other.runtimeAccess, _this.runtimeAccess) || other.runtimeAccess == _this.runtimeAccess)&&const DeepCollectionEquality().equals(other.genderCounts, _this.genderCounts)&&const DeepCollectionEquality().equals(other.cohortCounts, _this.cohortCounts)&&const DeepCollectionEquality().equals(other.waitlistedCohortCounts, _this.waitlistedCohortCounts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Event;
  return Object.hashAll([runtimeType,_this.id,_this.synthetic,_this.seedPrefix,_this.organizerId,_this.sourceVenueId,_this.name,_this.startTime,_this.eventTimezone,_this.endTime,_this.meetingPoint,_this.meetingLocation,_this.startingPointLat,_this.startingPointLng,_this.locationDetails,const DeepCollectionEquality().hash(_this.itinerary),_this.photoUrl,const DeepCollectionEquality().hash(_this.eventPhotos),_this.eventFormat,_this.distanceKm,_this.pace,_this.capacityLimit,_this.description,_this.priceInPaise,_this.currency,_this.bookedCount,_this.checkedInCount,_this.waitlistedCount,_this.crossPathsPairHeldCount,_this.crossPathsPairConfirmedCount,const DeepCollectionEquality().hash(_this.crossPathsPairHeldCohortCounts),_this.crossPathsDiscoveryEnabled,_this.status,_this.cancelledAt,_this.cancellationReason,_this.setupRevision,_this.publicRegistrationEnabled,_this.publicRegistrationMode,_this.publicRegistrationRevision,_this.listing,_this.showGuestList,_this.priceHiddenUntilBookingOpens,_this.planVisibleToGuests,_this.organizerSummary,_this.externalBooking,_this.constraints,_this.eventPolicy,_this.eventOrigin,_this.runtimeAccess,const DeepCollectionEquality().hash(_this.genderCounts),const DeepCollectionEquality().hash(_this.cohortCounts),const DeepCollectionEquality().hash(_this.waitlistedCohortCounts)]);
}

@override
String toString() {
  final _this = this as Event;
  return 'Event(id: ${_this.id}, synthetic: ${_this.synthetic}, seedPrefix: ${_this.seedPrefix}, organizerId: ${_this.organizerId}, sourceVenueId: ${_this.sourceVenueId}, name: ${_this.name}, startTime: ${_this.startTime}, eventTimezone: ${_this.eventTimezone}, endTime: ${_this.endTime}, meetingPoint: ${_this.meetingPoint}, meetingLocation: ${_this.meetingLocation}, startingPointLat: ${_this.startingPointLat}, startingPointLng: ${_this.startingPointLng}, locationDetails: ${_this.locationDetails}, itinerary: ${_this.itinerary}, photoUrl: ${_this.photoUrl}, eventPhotos: ${_this.eventPhotos}, eventFormat: ${_this.eventFormat}, distanceKm: ${_this.distanceKm}, pace: ${_this.pace}, capacityLimit: ${_this.capacityLimit}, description: ${_this.description}, priceInPaise: ${_this.priceInPaise}, currency: ${_this.currency}, bookedCount: ${_this.bookedCount}, checkedInCount: ${_this.checkedInCount}, waitlistedCount: ${_this.waitlistedCount}, crossPathsPairHeldCount: ${_this.crossPathsPairHeldCount}, crossPathsPairConfirmedCount: ${_this.crossPathsPairConfirmedCount}, crossPathsPairHeldCohortCounts: ${_this.crossPathsPairHeldCohortCounts}, crossPathsDiscoveryEnabled: ${_this.crossPathsDiscoveryEnabled}, status: ${_this.status}, cancelledAt: ${_this.cancelledAt}, cancellationReason: ${_this.cancellationReason}, setupRevision: ${_this.setupRevision}, publicRegistrationEnabled: ${_this.publicRegistrationEnabled}, publicRegistrationMode: ${_this.publicRegistrationMode}, publicRegistrationRevision: ${_this.publicRegistrationRevision}, listing: ${_this.listing}, showGuestList: ${_this.showGuestList}, priceHiddenUntilBookingOpens: ${_this.priceHiddenUntilBookingOpens}, planVisibleToGuests: ${_this.planVisibleToGuests}, organizerSummary: ${_this.organizerSummary}, externalBooking: ${_this.externalBooking}, constraints: ${_this.constraints}, eventPolicy: ${_this.eventPolicy}, eventOrigin: ${_this.eventOrigin}, runtimeAccess: ${_this.runtimeAccess}, genderCounts: ${_this.genderCounts}, cohortCounts: ${_this.cohortCounts}, waitlistedCohortCounts: ${_this.waitlistedCohortCounts})';
}


}

/// @nodoc
abstract mixin class $EventCopyWith<$Res>  {
  factory $EventCopyWith(Event value, $Res Function(Event) _then) = _$EventCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String organizerId,@JsonKey(includeIfNull: false) String? sourceVenueId, String name,@TimestampConverter() DateTime startTime,@JsonKey(includeIfNull: false) String? eventTimezone,@TimestampConverter() DateTime endTime, String meetingPoint,@JsonKey(includeIfNull: false) EventMeetingLocation? meetingLocation, double? startingPointLat, double? startingPointLng, String? locationDetails, List<EventItineraryItem> itinerary,@JsonKey(includeIfNull: false) String? photoUrl, List<UploadedPhoto> eventPhotos, EventFormatSnapshot eventFormat, double distanceKm, PaceLevel pace, int capacityLimit, String description, int priceInPaise, String currency,@JsonKey(includeIfNull: false) int? bookedCount,@JsonKey(includeIfNull: false) int? checkedInCount,@JsonKey(includeIfNull: false) int? waitlistedCount, int crossPathsPairHeldCount, int crossPathsPairConfirmedCount, Map<String, int> crossPathsPairHeldCohortCounts, bool crossPathsDiscoveryEnabled, EventLifecycleStatus status,@NullableTimestampConverter() DateTime? cancelledAt, String? cancellationReason,@JsonKey(includeIfNull: false) int? setupRevision, bool publicRegistrationEnabled,@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? publicRegistrationMode, int publicRegistrationRevision,@JsonKey(unknownEnumValue: EventListing.listed) EventListing listing, bool showGuestList, bool priceHiddenUntilBookingOpens, bool planVisibleToGuests,@JsonKey(includeIfNull: false) EventOrganizerSummary? organizerSummary,@JsonKey(includeIfNull: false) EventExternalBooking? externalBooking, EventConstraints constraints,@JsonKey(includeIfNull: false) EventPolicyBundle? eventPolicy,@JsonKey(includeIfNull: false) EventOrigin? eventOrigin,@JsonKey(includeIfNull: false) EventRuntimeAccess? runtimeAccess, Map<String, int> genderCounts, Map<String, int> cohortCounts, Map<String, int> waitlistedCohortCounts
});


$EventMeetingLocationCopyWith<$Res>? get meetingLocation;$EventOrganizerSummaryCopyWith<$Res>? get organizerSummary;$EventExternalBookingCopyWith<$Res>? get externalBooking;$EventConstraintsCopyWith<$Res> get constraints;$EventOriginCopyWith<$Res>? get eventOrigin;$EventRuntimeAccessCopyWith<$Res>? get runtimeAccess;

}
/// @nodoc
class _$EventCopyWithImpl<$Res>
    implements $EventCopyWith<$Res> {
  _$EventCopyWithImpl(this._self, this._then);

  final Event _self;
  final $Res Function(Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? organizerId = null,Object? sourceVenueId = freezed,Object? name = null,Object? startTime = null,Object? eventTimezone = freezed,Object? endTime = null,Object? meetingPoint = null,Object? meetingLocation = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? locationDetails = freezed,Object? itinerary = null,Object? photoUrl = freezed,Object? eventPhotos = null,Object? eventFormat = null,Object? distanceKm = null,Object? pace = null,Object? capacityLimit = null,Object? description = null,Object? priceInPaise = null,Object? currency = null,Object? bookedCount = freezed,Object? checkedInCount = freezed,Object? waitlistedCount = freezed,Object? crossPathsPairHeldCount = null,Object? crossPathsPairConfirmedCount = null,Object? crossPathsPairHeldCohortCounts = null,Object? crossPathsDiscoveryEnabled = null,Object? status = null,Object? cancelledAt = freezed,Object? cancellationReason = freezed,Object? setupRevision = freezed,Object? publicRegistrationEnabled = null,Object? publicRegistrationMode = freezed,Object? publicRegistrationRevision = null,Object? listing = null,Object? showGuestList = null,Object? priceHiddenUntilBookingOpens = null,Object? planVisibleToGuests = null,Object? organizerSummary = freezed,Object? externalBooking = freezed,Object? constraints = null,Object? eventPolicy = freezed,Object? eventOrigin = freezed,Object? runtimeAccess = freezed,Object? genderCounts = null,Object? cohortCounts = null,Object? waitlistedCohortCounts = null,}) {
  return _then(Event(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,sourceVenueId: freezed == sourceVenueId ? _self.sourceVenueId : sourceVenueId // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,eventTimezone: freezed == eventTimezone ? _self.eventTimezone : eventTimezone // ignore: cast_nullable_to_non_nullable
as String?,endTime: null == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime,meetingPoint: null == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String,meetingLocation: freezed == meetingLocation ? _self.meetingLocation : meetingLocation // ignore: cast_nullable_to_non_nullable
as EventMeetingLocation?,startingPointLat: freezed == startingPointLat ? _self.startingPointLat : startingPointLat // ignore: cast_nullable_to_non_nullable
as double?,startingPointLng: freezed == startingPointLng ? _self.startingPointLng : startingPointLng // ignore: cast_nullable_to_non_nullable
as double?,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,itinerary: null == itinerary ? _self.itinerary : itinerary // ignore: cast_nullable_to_non_nullable
as List<EventItineraryItem>,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,eventPhotos: null == eventPhotos ? _self.eventPhotos : eventPhotos // ignore: cast_nullable_to_non_nullable
as List<UploadedPhoto>,eventFormat: null == eventFormat ? _self.eventFormat : eventFormat // ignore: cast_nullable_to_non_nullable
as EventFormatSnapshot,distanceKm: null == distanceKm ? _self.distanceKm : distanceKm // ignore: cast_nullable_to_non_nullable
as double,pace: null == pace ? _self.pace : pace // ignore: cast_nullable_to_non_nullable
as PaceLevel,capacityLimit: null == capacityLimit ? _self.capacityLimit : capacityLimit // ignore: cast_nullable_to_non_nullable
as int,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,priceInPaise: null == priceInPaise ? _self.priceInPaise : priceInPaise // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,bookedCount: freezed == bookedCount ? _self.bookedCount : bookedCount // ignore: cast_nullable_to_non_nullable
as int?,checkedInCount: freezed == checkedInCount ? _self.checkedInCount : checkedInCount // ignore: cast_nullable_to_non_nullable
as int?,waitlistedCount: freezed == waitlistedCount ? _self.waitlistedCount : waitlistedCount // ignore: cast_nullable_to_non_nullable
as int?,crossPathsPairHeldCount: null == crossPathsPairHeldCount ? _self.crossPathsPairHeldCount : crossPathsPairHeldCount // ignore: cast_nullable_to_non_nullable
as int,crossPathsPairConfirmedCount: null == crossPathsPairConfirmedCount ? _self.crossPathsPairConfirmedCount : crossPathsPairConfirmedCount // ignore: cast_nullable_to_non_nullable
as int,crossPathsPairHeldCohortCounts: null == crossPathsPairHeldCohortCounts ? _self.crossPathsPairHeldCohortCounts : crossPathsPairHeldCohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,crossPathsDiscoveryEnabled: null == crossPathsDiscoveryEnabled ? _self.crossPathsDiscoveryEnabled : crossPathsDiscoveryEnabled // ignore: cast_nullable_to_non_nullable
as bool,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventLifecycleStatus,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancellationReason: freezed == cancellationReason ? _self.cancellationReason : cancellationReason // ignore: cast_nullable_to_non_nullable
as String?,setupRevision: freezed == setupRevision ? _self.setupRevision : setupRevision // ignore: cast_nullable_to_non_nullable
as int?,publicRegistrationEnabled: null == publicRegistrationEnabled ? _self.publicRegistrationEnabled : publicRegistrationEnabled // ignore: cast_nullable_to_non_nullable
as bool,publicRegistrationMode: freezed == publicRegistrationMode ? _self.publicRegistrationMode : publicRegistrationMode // ignore: cast_nullable_to_non_nullable
as EventPublicRegistrationMode?,publicRegistrationRevision: null == publicRegistrationRevision ? _self.publicRegistrationRevision : publicRegistrationRevision // ignore: cast_nullable_to_non_nullable
as int,listing: null == listing ? _self.listing : listing // ignore: cast_nullable_to_non_nullable
as EventListing,showGuestList: null == showGuestList ? _self.showGuestList : showGuestList // ignore: cast_nullable_to_non_nullable
as bool,priceHiddenUntilBookingOpens: null == priceHiddenUntilBookingOpens ? _self.priceHiddenUntilBookingOpens : priceHiddenUntilBookingOpens // ignore: cast_nullable_to_non_nullable
as bool,planVisibleToGuests: null == planVisibleToGuests ? _self.planVisibleToGuests : planVisibleToGuests // ignore: cast_nullable_to_non_nullable
as bool,organizerSummary: freezed == organizerSummary ? _self.organizerSummary : organizerSummary // ignore: cast_nullable_to_non_nullable
as EventOrganizerSummary?,externalBooking: freezed == externalBooking ? _self.externalBooking : externalBooking // ignore: cast_nullable_to_non_nullable
as EventExternalBooking?,constraints: null == constraints ? _self.constraints : constraints // ignore: cast_nullable_to_non_nullable
as EventConstraints,eventPolicy: freezed == eventPolicy ? _self.eventPolicy : eventPolicy // ignore: cast_nullable_to_non_nullable
as EventPolicyBundle?,eventOrigin: freezed == eventOrigin ? _self.eventOrigin : eventOrigin // ignore: cast_nullable_to_non_nullable
as EventOrigin?,runtimeAccess: freezed == runtimeAccess ? _self.runtimeAccess : runtimeAccess // ignore: cast_nullable_to_non_nullable
as EventRuntimeAccess?,genderCounts: null == genderCounts ? _self.genderCounts : genderCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,cohortCounts: null == cohortCounts ? _self.cohortCounts : cohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,waitlistedCohortCounts: null == waitlistedCohortCounts ? _self.waitlistedCohortCounts : waitlistedCohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,
  ));
}
/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventMeetingLocationCopyWith<$Res>? get meetingLocation {
    if (_self.meetingLocation == null) {
    return null;
  }

  return $EventMeetingLocationCopyWith<$Res>(_self.meetingLocation!, (value) {
    return _then(_self.copyWith(meetingLocation: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventOrganizerSummaryCopyWith<$Res>? get organizerSummary {
    if (_self.organizerSummary == null) {
    return null;
  }

  return $EventOrganizerSummaryCopyWith<$Res>(_self.organizerSummary!, (value) {
    return _then(_self.copyWith(organizerSummary: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventExternalBookingCopyWith<$Res>? get externalBooking {
    if (_self.externalBooking == null) {
    return null;
  }

  return $EventExternalBookingCopyWith<$Res>(_self.externalBooking!, (value) {
    return _then(_self.copyWith(externalBooking: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventConstraintsCopyWith<$Res> get constraints {
  
  return $EventConstraintsCopyWith<$Res>(_self.constraints, (value) {
    return _then(_self.copyWith(constraints: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventOriginCopyWith<$Res>? get eventOrigin {
    if (_self.eventOrigin == null) {
    return null;
  }

  return $EventOriginCopyWith<$Res>(_self.eventOrigin!, (value) {
    return _then(_self.copyWith(eventOrigin: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventRuntimeAccessCopyWith<$Res>? get runtimeAccess {
    if (_self.runtimeAccess == null) {
    return null;
  }

  return $EventRuntimeAccessCopyWith<$Res>(_self.runtimeAccess!, (value) {
    return _then(_self.copyWith(runtimeAccess: value));
  });
}
}


/// Adds pattern-matching-related methods to [Event].
extension EventPatterns on Event {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Event value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Event() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Event value)  $default,){
final _that = this;
switch (_that) {
case _Event():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Event value)?  $default,){
final _that = this;
switch (_that) {
case _Event() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String organizerId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision, @JsonKey(unknownEnumValue: EventListing.listed)  EventListing listing,  bool showGuestList,  bool priceHiddenUntilBookingOpens,  bool planVisibleToGuests, @JsonKey(includeIfNull: false)  EventOrganizerSummary? organizerSummary, @JsonKey(includeIfNull: false)  EventExternalBooking? externalBooking,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.organizerId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.listing,_that.showGuestList,_that.priceHiddenUntilBookingOpens,_that.planVisibleToGuests,_that.organizerSummary,_that.externalBooking,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String organizerId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision, @JsonKey(unknownEnumValue: EventListing.listed)  EventListing listing,  bool showGuestList,  bool priceHiddenUntilBookingOpens,  bool planVisibleToGuests, @JsonKey(includeIfNull: false)  EventOrganizerSummary? organizerSummary, @JsonKey(includeIfNull: false)  EventExternalBooking? externalBooking,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)  $default,) {final _that = this;
switch (_that) {
case _Event():
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.organizerId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.listing,_that.showGuestList,_that.priceHiddenUntilBookingOpens,_that.planVisibleToGuests,_that.organizerSummary,_that.externalBooking,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String organizerId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision, @JsonKey(unknownEnumValue: EventListing.listed)  EventListing listing,  bool showGuestList,  bool priceHiddenUntilBookingOpens,  bool planVisibleToGuests, @JsonKey(includeIfNull: false)  EventOrganizerSummary? organizerSummary, @JsonKey(includeIfNull: false)  EventExternalBooking? externalBooking,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)?  $default,) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.organizerId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.listing,_that.showGuestList,_that.priceHiddenUntilBookingOpens,_that.planVisibleToGuests,_that.organizerSummary,_that.externalBooking,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Event implements Event {
  const _Event({@JsonKey(includeToJson: false) required this.id, @JsonKey(includeToJson: false) this.synthetic = false, @JsonKey(includeToJson: false) this.seedPrefix, required this.organizerId, @JsonKey(includeIfNull: false) this.sourceVenueId, this.name = '', @TimestampConverter() required this.startTime, @JsonKey(includeIfNull: false) this.eventTimezone, @TimestampConverter() required this.endTime, required this.meetingPoint, @JsonKey(includeIfNull: false) this.meetingLocation, this.startingPointLat, this.startingPointLng, this.locationDetails,  List<EventItineraryItem> itinerary = const [], @JsonKey(includeIfNull: false) this.photoUrl,  List<UploadedPhoto> eventPhotos = const [], this.eventFormat = const EventFormatSnapshot.socialRun(), required this.distanceKm, required this.pace, required this.capacityLimit, required this.description, required this.priceInPaise, this.currency = defaultCurrencyCode, @JsonKey(includeIfNull: false) this.bookedCount, @JsonKey(includeIfNull: false) this.checkedInCount, @JsonKey(includeIfNull: false) this.waitlistedCount, this.crossPathsPairHeldCount = 0, this.crossPathsPairConfirmedCount = 0,  Map<String, int> crossPathsPairHeldCohortCounts = const {}, this.crossPathsDiscoveryEnabled = false, this.status = EventLifecycleStatus.active, @NullableTimestampConverter() this.cancelledAt, this.cancellationReason, @JsonKey(includeIfNull: false) this.setupRevision, this.publicRegistrationEnabled = false, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) this.publicRegistrationMode, this.publicRegistrationRevision = 0, @JsonKey(unknownEnumValue: EventListing.listed) this.listing = EventListing.listed, this.showGuestList = true, this.priceHiddenUntilBookingOpens = false, this.planVisibleToGuests = true, @JsonKey(includeIfNull: false) this.organizerSummary, @JsonKey(includeIfNull: false) this.externalBooking, this.constraints = const EventConstraints(), @JsonKey(includeIfNull: false) this.eventPolicy, @JsonKey(includeIfNull: false) this.eventOrigin, @JsonKey(includeIfNull: false) this.runtimeAccess,  Map<String, int> genderCounts = const {},  Map<String, int> cohortCounts = const {},  Map<String, int> waitlistedCohortCounts = const {}}): _itinerary = itinerary,_eventPhotos = eventPhotos,_crossPathsPairHeldCohortCounts = crossPathsPairHeldCohortCounts,_genderCounts = genderCounts,_cohortCounts = cohortCounts,_waitlistedCohortCounts = waitlistedCohortCounts;
  factory _Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override@JsonKey(includeToJson: false) final  bool synthetic;
@override@JsonKey(includeToJson: false) final  String? seedPrefix;
@override final  String organizerId;
@override@JsonKey(includeIfNull: false) final  String? sourceVenueId;
@override@JsonKey() final  String name;
@override@TimestampConverter() final  DateTime startTime;
@override@JsonKey(includeIfNull: false) final  String? eventTimezone;
@override@TimestampConverter() final  DateTime endTime;
@override final  String meetingPoint;
@override@JsonKey(includeIfNull: false) final  EventMeetingLocation? meetingLocation;
@override final  double? startingPointLat;
@override final  double? startingPointLng;
@override final  String? locationDetails;
 final  List<EventItineraryItem> _itinerary;
@override@JsonKey() List<EventItineraryItem> get itinerary {
  if (_itinerary is EqualUnmodifiableListView) return _itinerary;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_itinerary);
}

@override@JsonKey(includeIfNull: false) final  String? photoUrl;
 final  List<UploadedPhoto> _eventPhotos;
@override@JsonKey() List<UploadedPhoto> get eventPhotos {
  if (_eventPhotos is EqualUnmodifiableListView) return _eventPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_eventPhotos);
}

@override@JsonKey() final  EventFormatSnapshot eventFormat;
@override final  double distanceKm;
@override final  PaceLevel pace;
@override final  int capacityLimit;
@override final  String description;
@override final  int priceInPaise;
@override@JsonKey() final  String currency;
@override@JsonKey(includeIfNull: false) final  int? bookedCount;
@override@JsonKey(includeIfNull: false) final  int? checkedInCount;
@override@JsonKey(includeIfNull: false) final  int? waitlistedCount;
@override@JsonKey() final  int crossPathsPairHeldCount;
@override@JsonKey() final  int crossPathsPairConfirmedCount;
 final  Map<String, int> _crossPathsPairHeldCohortCounts;
@override@JsonKey() Map<String, int> get crossPathsPairHeldCohortCounts {
  if (_crossPathsPairHeldCohortCounts is EqualUnmodifiableMapView) return _crossPathsPairHeldCohortCounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_crossPathsPairHeldCohortCounts);
}

@override@JsonKey() final  bool crossPathsDiscoveryEnabled;
@override@JsonKey() final  EventLifecycleStatus status;
@override@NullableTimestampConverter() final  DateTime? cancelledAt;
@override final  String? cancellationReason;
@override@JsonKey(includeIfNull: false) final  int? setupRevision;
@override@JsonKey() final  bool publicRegistrationEnabled;
@override@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) final  EventPublicRegistrationMode? publicRegistrationMode;
@override@JsonKey() final  int publicRegistrationRevision;
@override@JsonKey(unknownEnumValue: EventListing.listed) final  EventListing listing;
@override@JsonKey() final  bool showGuestList;
@override@JsonKey() final  bool priceHiddenUntilBookingOpens;
@override@JsonKey() final  bool planVisibleToGuests;
@override@JsonKey(includeIfNull: false) final  EventOrganizerSummary? organizerSummary;
@override@JsonKey(includeIfNull: false) final  EventExternalBooking? externalBooking;
@override@JsonKey() final  EventConstraints constraints;
@override@JsonKey(includeIfNull: false) final  EventPolicyBundle? eventPolicy;
@override@JsonKey(includeIfNull: false) final  EventOrigin? eventOrigin;
@override@JsonKey(includeIfNull: false) final  EventRuntimeAccess? runtimeAccess;
 final  Map<String, int> _genderCounts;
@override@JsonKey() Map<String, int> get genderCounts {
  if (_genderCounts is EqualUnmodifiableMapView) return _genderCounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_genderCounts);
}

 final  Map<String, int> _cohortCounts;
@override@JsonKey() Map<String, int> get cohortCounts {
  if (_cohortCounts is EqualUnmodifiableMapView) return _cohortCounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_cohortCounts);
}

 final  Map<String, int> _waitlistedCohortCounts;
@override@JsonKey() Map<String, int> get waitlistedCohortCounts {
  if (_waitlistedCohortCounts is EqualUnmodifiableMapView) return _waitlistedCohortCounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_waitlistedCohortCounts);
}


/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventCopyWith<_Event> get copyWith => __$EventCopyWithImpl<_Event>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Event&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.name, name) || other.name == name)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.meetingLocation, meetingLocation) || other.meetingLocation == meetingLocation)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&const DeepCollectionEquality().equals(other.itinerary, _itinerary)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&const DeepCollectionEquality().equals(other.eventPhotos, _eventPhotos)&&(identical(other.eventFormat, eventFormat) || other.eventFormat == eventFormat)&&(identical(other.distanceKm, distanceKm) || other.distanceKm == distanceKm)&&(identical(other.pace, pace) || other.pace == pace)&&(identical(other.capacityLimit, capacityLimit) || other.capacityLimit == capacityLimit)&&(identical(other.description, description) || other.description == description)&&(identical(other.priceInPaise, priceInPaise) || other.priceInPaise == priceInPaise)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.bookedCount, bookedCount) || other.bookedCount == bookedCount)&&(identical(other.checkedInCount, checkedInCount) || other.checkedInCount == checkedInCount)&&(identical(other.waitlistedCount, waitlistedCount) || other.waitlistedCount == waitlistedCount)&&(identical(other.crossPathsPairHeldCount, crossPathsPairHeldCount) || other.crossPathsPairHeldCount == crossPathsPairHeldCount)&&(identical(other.crossPathsPairConfirmedCount, crossPathsPairConfirmedCount) || other.crossPathsPairConfirmedCount == crossPathsPairConfirmedCount)&&const DeepCollectionEquality().equals(other.crossPathsPairHeldCohortCounts, _crossPathsPairHeldCohortCounts)&&(identical(other.crossPathsDiscoveryEnabled, crossPathsDiscoveryEnabled) || other.crossPathsDiscoveryEnabled == crossPathsDiscoveryEnabled)&&(identical(other.status, status) || other.status == status)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.cancellationReason, cancellationReason) || other.cancellationReason == cancellationReason)&&(identical(other.setupRevision, setupRevision) || other.setupRevision == setupRevision)&&(identical(other.publicRegistrationEnabled, publicRegistrationEnabled) || other.publicRegistrationEnabled == publicRegistrationEnabled)&&(identical(other.publicRegistrationMode, publicRegistrationMode) || other.publicRegistrationMode == publicRegistrationMode)&&(identical(other.publicRegistrationRevision, publicRegistrationRevision) || other.publicRegistrationRevision == publicRegistrationRevision)&&(identical(other.listing, listing) || other.listing == listing)&&(identical(other.showGuestList, showGuestList) || other.showGuestList == showGuestList)&&(identical(other.priceHiddenUntilBookingOpens, priceHiddenUntilBookingOpens) || other.priceHiddenUntilBookingOpens == priceHiddenUntilBookingOpens)&&(identical(other.planVisibleToGuests, planVisibleToGuests) || other.planVisibleToGuests == planVisibleToGuests)&&(identical(other.organizerSummary, organizerSummary) || other.organizerSummary == organizerSummary)&&(identical(other.externalBooking, externalBooking) || other.externalBooking == externalBooking)&&(identical(other.constraints, constraints) || other.constraints == constraints)&&(identical(other.eventPolicy, eventPolicy) || other.eventPolicy == eventPolicy)&&(identical(other.eventOrigin, eventOrigin) || other.eventOrigin == eventOrigin)&&(identical(other.runtimeAccess, runtimeAccess) || other.runtimeAccess == runtimeAccess)&&const DeepCollectionEquality().equals(other.genderCounts, _genderCounts)&&const DeepCollectionEquality().equals(other.cohortCounts, _cohortCounts)&&const DeepCollectionEquality().equals(other.waitlistedCohortCounts, _waitlistedCohortCounts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hashAll([runtimeType,id,synthetic,seedPrefix,organizerId,sourceVenueId,name,startTime,eventTimezone,endTime,meetingPoint,meetingLocation,startingPointLat,startingPointLng,locationDetails,const DeepCollectionEquality().hash(_itinerary),photoUrl,const DeepCollectionEquality().hash(_eventPhotos),eventFormat,distanceKm,pace,capacityLimit,description,priceInPaise,currency,bookedCount,checkedInCount,waitlistedCount,crossPathsPairHeldCount,crossPathsPairConfirmedCount,const DeepCollectionEquality().hash(_crossPathsPairHeldCohortCounts),crossPathsDiscoveryEnabled,status,cancelledAt,cancellationReason,setupRevision,publicRegistrationEnabled,publicRegistrationMode,publicRegistrationRevision,listing,showGuestList,priceHiddenUntilBookingOpens,planVisibleToGuests,organizerSummary,externalBooking,constraints,eventPolicy,eventOrigin,runtimeAccess,const DeepCollectionEquality().hash(_genderCounts),const DeepCollectionEquality().hash(_cohortCounts),const DeepCollectionEquality().hash(_waitlistedCohortCounts)]);
}

@override
String toString() {
    return 'Event(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, organizerId: $organizerId, sourceVenueId: $sourceVenueId, name: $name, startTime: $startTime, eventTimezone: $eventTimezone, endTime: $endTime, meetingPoint: $meetingPoint, meetingLocation: $meetingLocation, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, locationDetails: $locationDetails, itinerary: $itinerary, photoUrl: $photoUrl, eventPhotos: $eventPhotos, eventFormat: $eventFormat, distanceKm: $distanceKm, pace: $pace, capacityLimit: $capacityLimit, description: $description, priceInPaise: $priceInPaise, currency: $currency, bookedCount: $bookedCount, checkedInCount: $checkedInCount, waitlistedCount: $waitlistedCount, crossPathsPairHeldCount: $crossPathsPairHeldCount, crossPathsPairConfirmedCount: $crossPathsPairConfirmedCount, crossPathsPairHeldCohortCounts: $crossPathsPairHeldCohortCounts, crossPathsDiscoveryEnabled: $crossPathsDiscoveryEnabled, status: $status, cancelledAt: $cancelledAt, cancellationReason: $cancellationReason, setupRevision: $setupRevision, publicRegistrationEnabled: $publicRegistrationEnabled, publicRegistrationMode: $publicRegistrationMode, publicRegistrationRevision: $publicRegistrationRevision, listing: $listing, showGuestList: $showGuestList, priceHiddenUntilBookingOpens: $priceHiddenUntilBookingOpens, planVisibleToGuests: $planVisibleToGuests, organizerSummary: $organizerSummary, externalBooking: $externalBooking, constraints: $constraints, eventPolicy: $eventPolicy, eventOrigin: $eventOrigin, runtimeAccess: $runtimeAccess, genderCounts: $genderCounts, cohortCounts: $cohortCounts, waitlistedCohortCounts: $waitlistedCohortCounts)';
}


}

/// @nodoc
abstract mixin class _$EventCopyWith<$Res> implements $EventCopyWith<$Res> {
  factory _$EventCopyWith(_Event value, $Res Function(_Event) _then) = __$EventCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String organizerId,@JsonKey(includeIfNull: false) String? sourceVenueId, String name,@TimestampConverter() DateTime startTime,@JsonKey(includeIfNull: false) String? eventTimezone,@TimestampConverter() DateTime endTime, String meetingPoint,@JsonKey(includeIfNull: false) EventMeetingLocation? meetingLocation, double? startingPointLat, double? startingPointLng, String? locationDetails, List<EventItineraryItem> itinerary,@JsonKey(includeIfNull: false) String? photoUrl, List<UploadedPhoto> eventPhotos, EventFormatSnapshot eventFormat, double distanceKm, PaceLevel pace, int capacityLimit, String description, int priceInPaise, String currency,@JsonKey(includeIfNull: false) int? bookedCount,@JsonKey(includeIfNull: false) int? checkedInCount,@JsonKey(includeIfNull: false) int? waitlistedCount, int crossPathsPairHeldCount, int crossPathsPairConfirmedCount, Map<String, int> crossPathsPairHeldCohortCounts, bool crossPathsDiscoveryEnabled, EventLifecycleStatus status,@NullableTimestampConverter() DateTime? cancelledAt, String? cancellationReason,@JsonKey(includeIfNull: false) int? setupRevision, bool publicRegistrationEnabled,@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? publicRegistrationMode, int publicRegistrationRevision,@JsonKey(unknownEnumValue: EventListing.listed) EventListing listing, bool showGuestList, bool priceHiddenUntilBookingOpens, bool planVisibleToGuests,@JsonKey(includeIfNull: false) EventOrganizerSummary? organizerSummary,@JsonKey(includeIfNull: false) EventExternalBooking? externalBooking, EventConstraints constraints,@JsonKey(includeIfNull: false) EventPolicyBundle? eventPolicy,@JsonKey(includeIfNull: false) EventOrigin? eventOrigin,@JsonKey(includeIfNull: false) EventRuntimeAccess? runtimeAccess, Map<String, int> genderCounts, Map<String, int> cohortCounts, Map<String, int> waitlistedCohortCounts
});


@override $EventMeetingLocationCopyWith<$Res>? get meetingLocation;@override $EventOrganizerSummaryCopyWith<$Res>? get organizerSummary;@override $EventExternalBookingCopyWith<$Res>? get externalBooking;@override $EventConstraintsCopyWith<$Res> get constraints;@override $EventOriginCopyWith<$Res>? get eventOrigin;@override $EventRuntimeAccessCopyWith<$Res>? get runtimeAccess;

}
/// @nodoc
class __$EventCopyWithImpl<$Res>
    implements _$EventCopyWith<$Res> {
  __$EventCopyWithImpl(this._self, this._then);

  final _Event _self;
  final $Res Function(_Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? organizerId = null,Object? sourceVenueId = freezed,Object? name = null,Object? startTime = null,Object? eventTimezone = freezed,Object? endTime = null,Object? meetingPoint = null,Object? meetingLocation = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? locationDetails = freezed,Object? itinerary = null,Object? photoUrl = freezed,Object? eventPhotos = null,Object? eventFormat = null,Object? distanceKm = null,Object? pace = null,Object? capacityLimit = null,Object? description = null,Object? priceInPaise = null,Object? currency = null,Object? bookedCount = freezed,Object? checkedInCount = freezed,Object? waitlistedCount = freezed,Object? crossPathsPairHeldCount = null,Object? crossPathsPairConfirmedCount = null,Object? crossPathsPairHeldCohortCounts = null,Object? crossPathsDiscoveryEnabled = null,Object? status = null,Object? cancelledAt = freezed,Object? cancellationReason = freezed,Object? setupRevision = freezed,Object? publicRegistrationEnabled = null,Object? publicRegistrationMode = freezed,Object? publicRegistrationRevision = null,Object? listing = null,Object? showGuestList = null,Object? priceHiddenUntilBookingOpens = null,Object? planVisibleToGuests = null,Object? organizerSummary = freezed,Object? externalBooking = freezed,Object? constraints = null,Object? eventPolicy = freezed,Object? eventOrigin = freezed,Object? runtimeAccess = freezed,Object? genderCounts = null,Object? cohortCounts = null,Object? waitlistedCohortCounts = null,}) {
  return _then(_Event(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,sourceVenueId: freezed == sourceVenueId ? _self.sourceVenueId : sourceVenueId // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,eventTimezone: freezed == eventTimezone ? _self.eventTimezone : eventTimezone // ignore: cast_nullable_to_non_nullable
as String?,endTime: null == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime,meetingPoint: null == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String,meetingLocation: freezed == meetingLocation ? _self.meetingLocation : meetingLocation // ignore: cast_nullable_to_non_nullable
as EventMeetingLocation?,startingPointLat: freezed == startingPointLat ? _self.startingPointLat : startingPointLat // ignore: cast_nullable_to_non_nullable
as double?,startingPointLng: freezed == startingPointLng ? _self.startingPointLng : startingPointLng // ignore: cast_nullable_to_non_nullable
as double?,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,itinerary: null == itinerary ? _self._itinerary : itinerary // ignore: cast_nullable_to_non_nullable
as List<EventItineraryItem>,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,eventPhotos: null == eventPhotos ? _self._eventPhotos : eventPhotos // ignore: cast_nullable_to_non_nullable
as List<UploadedPhoto>,eventFormat: null == eventFormat ? _self.eventFormat : eventFormat // ignore: cast_nullable_to_non_nullable
as EventFormatSnapshot,distanceKm: null == distanceKm ? _self.distanceKm : distanceKm // ignore: cast_nullable_to_non_nullable
as double,pace: null == pace ? _self.pace : pace // ignore: cast_nullable_to_non_nullable
as PaceLevel,capacityLimit: null == capacityLimit ? _self.capacityLimit : capacityLimit // ignore: cast_nullable_to_non_nullable
as int,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,priceInPaise: null == priceInPaise ? _self.priceInPaise : priceInPaise // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,bookedCount: freezed == bookedCount ? _self.bookedCount : bookedCount // ignore: cast_nullable_to_non_nullable
as int?,checkedInCount: freezed == checkedInCount ? _self.checkedInCount : checkedInCount // ignore: cast_nullable_to_non_nullable
as int?,waitlistedCount: freezed == waitlistedCount ? _self.waitlistedCount : waitlistedCount // ignore: cast_nullable_to_non_nullable
as int?,crossPathsPairHeldCount: null == crossPathsPairHeldCount ? _self.crossPathsPairHeldCount : crossPathsPairHeldCount // ignore: cast_nullable_to_non_nullable
as int,crossPathsPairConfirmedCount: null == crossPathsPairConfirmedCount ? _self.crossPathsPairConfirmedCount : crossPathsPairConfirmedCount // ignore: cast_nullable_to_non_nullable
as int,crossPathsPairHeldCohortCounts: null == crossPathsPairHeldCohortCounts ? _self._crossPathsPairHeldCohortCounts : crossPathsPairHeldCohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,crossPathsDiscoveryEnabled: null == crossPathsDiscoveryEnabled ? _self.crossPathsDiscoveryEnabled : crossPathsDiscoveryEnabled // ignore: cast_nullable_to_non_nullable
as bool,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventLifecycleStatus,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancellationReason: freezed == cancellationReason ? _self.cancellationReason : cancellationReason // ignore: cast_nullable_to_non_nullable
as String?,setupRevision: freezed == setupRevision ? _self.setupRevision : setupRevision // ignore: cast_nullable_to_non_nullable
as int?,publicRegistrationEnabled: null == publicRegistrationEnabled ? _self.publicRegistrationEnabled : publicRegistrationEnabled // ignore: cast_nullable_to_non_nullable
as bool,publicRegistrationMode: freezed == publicRegistrationMode ? _self.publicRegistrationMode : publicRegistrationMode // ignore: cast_nullable_to_non_nullable
as EventPublicRegistrationMode?,publicRegistrationRevision: null == publicRegistrationRevision ? _self.publicRegistrationRevision : publicRegistrationRevision // ignore: cast_nullable_to_non_nullable
as int,listing: null == listing ? _self.listing : listing // ignore: cast_nullable_to_non_nullable
as EventListing,showGuestList: null == showGuestList ? _self.showGuestList : showGuestList // ignore: cast_nullable_to_non_nullable
as bool,priceHiddenUntilBookingOpens: null == priceHiddenUntilBookingOpens ? _self.priceHiddenUntilBookingOpens : priceHiddenUntilBookingOpens // ignore: cast_nullable_to_non_nullable
as bool,planVisibleToGuests: null == planVisibleToGuests ? _self.planVisibleToGuests : planVisibleToGuests // ignore: cast_nullable_to_non_nullable
as bool,organizerSummary: freezed == organizerSummary ? _self.organizerSummary : organizerSummary // ignore: cast_nullable_to_non_nullable
as EventOrganizerSummary?,externalBooking: freezed == externalBooking ? _self.externalBooking : externalBooking // ignore: cast_nullable_to_non_nullable
as EventExternalBooking?,constraints: null == constraints ? _self.constraints : constraints // ignore: cast_nullable_to_non_nullable
as EventConstraints,eventPolicy: freezed == eventPolicy ? _self.eventPolicy : eventPolicy // ignore: cast_nullable_to_non_nullable
as EventPolicyBundle?,eventOrigin: freezed == eventOrigin ? _self.eventOrigin : eventOrigin // ignore: cast_nullable_to_non_nullable
as EventOrigin?,runtimeAccess: freezed == runtimeAccess ? _self.runtimeAccess : runtimeAccess // ignore: cast_nullable_to_non_nullable
as EventRuntimeAccess?,genderCounts: null == genderCounts ? _self._genderCounts : genderCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,cohortCounts: null == cohortCounts ? _self._cohortCounts : cohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,waitlistedCohortCounts: null == waitlistedCohortCounts ? _self._waitlistedCohortCounts : waitlistedCohortCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,
  ));
}

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventMeetingLocationCopyWith<$Res>? get meetingLocation {
    if (_self.meetingLocation == null) {
    return null;
  }

  return $EventMeetingLocationCopyWith<$Res>(_self.meetingLocation!, (value) {
    return _then(_self.copyWith(meetingLocation: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventOrganizerSummaryCopyWith<$Res>? get organizerSummary {
    if (_self.organizerSummary == null) {
    return null;
  }

  return $EventOrganizerSummaryCopyWith<$Res>(_self.organizerSummary!, (value) {
    return _then(_self.copyWith(organizerSummary: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventExternalBookingCopyWith<$Res>? get externalBooking {
    if (_self.externalBooking == null) {
    return null;
  }

  return $EventExternalBookingCopyWith<$Res>(_self.externalBooking!, (value) {
    return _then(_self.copyWith(externalBooking: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventConstraintsCopyWith<$Res> get constraints {
  
  return $EventConstraintsCopyWith<$Res>(_self.constraints, (value) {
    return _then(_self.copyWith(constraints: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventOriginCopyWith<$Res>? get eventOrigin {
    if (_self.eventOrigin == null) {
    return null;
  }

  return $EventOriginCopyWith<$Res>(_self.eventOrigin!, (value) {
    return _then(_self.copyWith(eventOrigin: value));
  });
}/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventRuntimeAccessCopyWith<$Res>? get runtimeAccess {
    if (_self.runtimeAccess == null) {
    return null;
  }

  return $EventRuntimeAccessCopyWith<$Res>(_self.runtimeAccess!, (value) {
    return _then(_self.copyWith(runtimeAccess: value));
  });
}
}


/// @nodoc
mixin _$EventOrigin {

 EventOriginMode get mode;@JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson) EventBookingAuthority get bookingAuthority; EventRosterAuthority get rosterAuthority;@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider get provider; String? get externalEventId; String? get externalEventUrl; String? get sourceExternalEventId; String? get adapterVersion;@NullableTimestampConverter() DateTime? get connectedAt; String? get connectedBy;
/// Create a copy of EventOrigin
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventOriginCopyWith<EventOrigin> get copyWith => _$EventOriginCopyWithImpl<EventOrigin>(this as EventOrigin, _$identity);

  /// Serializes this EventOrigin to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EventOrigin;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventOrigin&&(identical(other.mode, _this.mode) || other.mode == _this.mode)&&(identical(other.bookingAuthority, _this.bookingAuthority) || other.bookingAuthority == _this.bookingAuthority)&&(identical(other.rosterAuthority, _this.rosterAuthority) || other.rosterAuthority == _this.rosterAuthority)&&(identical(other.provider, _this.provider) || other.provider == _this.provider)&&(identical(other.externalEventId, _this.externalEventId) || other.externalEventId == _this.externalEventId)&&(identical(other.externalEventUrl, _this.externalEventUrl) || other.externalEventUrl == _this.externalEventUrl)&&(identical(other.sourceExternalEventId, _this.sourceExternalEventId) || other.sourceExternalEventId == _this.sourceExternalEventId)&&(identical(other.adapterVersion, _this.adapterVersion) || other.adapterVersion == _this.adapterVersion)&&(identical(other.connectedAt, _this.connectedAt) || other.connectedAt == _this.connectedAt)&&(identical(other.connectedBy, _this.connectedBy) || other.connectedBy == _this.connectedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EventOrigin;
  return Object.hash(runtimeType,_this.mode,_this.bookingAuthority,_this.rosterAuthority,_this.provider,_this.externalEventId,_this.externalEventUrl,_this.sourceExternalEventId,_this.adapterVersion,_this.connectedAt,_this.connectedBy);
}

@override
String toString() {
  final _this = this as EventOrigin;
  return 'EventOrigin(mode: ${_this.mode}, bookingAuthority: ${_this.bookingAuthority}, rosterAuthority: ${_this.rosterAuthority}, provider: ${_this.provider}, externalEventId: ${_this.externalEventId}, externalEventUrl: ${_this.externalEventUrl}, sourceExternalEventId: ${_this.sourceExternalEventId}, adapterVersion: ${_this.adapterVersion}, connectedAt: ${_this.connectedAt}, connectedBy: ${_this.connectedBy})';
}


}

/// @nodoc
abstract mixin class $EventOriginCopyWith<$Res>  {
  factory $EventOriginCopyWith(EventOrigin value, $Res Function(EventOrigin) _then) = _$EventOriginCopyWithImpl;
@useResult
$Res call({
 EventOriginMode mode,@JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson) EventBookingAuthority bookingAuthority, EventRosterAuthority rosterAuthority,@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider provider, String? externalEventId, String? externalEventUrl, String? sourceExternalEventId, String? adapterVersion,@NullableTimestampConverter() DateTime? connectedAt, String? connectedBy
});




}
/// @nodoc
class _$EventOriginCopyWithImpl<$Res>
    implements $EventOriginCopyWith<$Res> {
  _$EventOriginCopyWithImpl(this._self, this._then);

  final EventOrigin _self;
  final $Res Function(EventOrigin) _then;

/// Create a copy of EventOrigin
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? mode = null,Object? bookingAuthority = null,Object? rosterAuthority = null,Object? provider = null,Object? externalEventId = freezed,Object? externalEventUrl = freezed,Object? sourceExternalEventId = freezed,Object? adapterVersion = freezed,Object? connectedAt = freezed,Object? connectedBy = freezed,}) {
  return _then(EventOrigin(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as EventOriginMode,bookingAuthority: null == bookingAuthority ? _self.bookingAuthority : bookingAuthority // ignore: cast_nullable_to_non_nullable
as EventBookingAuthority,rosterAuthority: null == rosterAuthority ? _self.rosterAuthority : rosterAuthority // ignore: cast_nullable_to_non_nullable
as EventRosterAuthority,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider,externalEventId: freezed == externalEventId ? _self.externalEventId : externalEventId // ignore: cast_nullable_to_non_nullable
as String?,externalEventUrl: freezed == externalEventUrl ? _self.externalEventUrl : externalEventUrl // ignore: cast_nullable_to_non_nullable
as String?,sourceExternalEventId: freezed == sourceExternalEventId ? _self.sourceExternalEventId : sourceExternalEventId // ignore: cast_nullable_to_non_nullable
as String?,adapterVersion: freezed == adapterVersion ? _self.adapterVersion : adapterVersion // ignore: cast_nullable_to_non_nullable
as String?,connectedAt: freezed == connectedAt ? _self.connectedAt : connectedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,connectedBy: freezed == connectedBy ? _self.connectedBy : connectedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventOrigin].
extension EventOriginPatterns on EventOrigin {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventOrigin value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventOrigin() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventOrigin value)  $default,){
final _that = this;
switch (_that) {
case _EventOrigin():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventOrigin value)?  $default,){
final _that = this;
switch (_that) {
case _EventOrigin() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( EventOriginMode mode, @JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson)  EventBookingAuthority bookingAuthority,  EventRosterAuthority rosterAuthority, @JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String? externalEventId,  String? externalEventUrl,  String? sourceExternalEventId,  String? adapterVersion, @NullableTimestampConverter()  DateTime? connectedAt,  String? connectedBy)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventOrigin() when $default != null:
return $default(_that.mode,_that.bookingAuthority,_that.rosterAuthority,_that.provider,_that.externalEventId,_that.externalEventUrl,_that.sourceExternalEventId,_that.adapterVersion,_that.connectedAt,_that.connectedBy);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( EventOriginMode mode, @JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson)  EventBookingAuthority bookingAuthority,  EventRosterAuthority rosterAuthority, @JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String? externalEventId,  String? externalEventUrl,  String? sourceExternalEventId,  String? adapterVersion, @NullableTimestampConverter()  DateTime? connectedAt,  String? connectedBy)  $default,) {final _that = this;
switch (_that) {
case _EventOrigin():
return $default(_that.mode,_that.bookingAuthority,_that.rosterAuthority,_that.provider,_that.externalEventId,_that.externalEventUrl,_that.sourceExternalEventId,_that.adapterVersion,_that.connectedAt,_that.connectedBy);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( EventOriginMode mode, @JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson)  EventBookingAuthority bookingAuthority,  EventRosterAuthority rosterAuthority, @JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String? externalEventId,  String? externalEventUrl,  String? sourceExternalEventId,  String? adapterVersion, @NullableTimestampConverter()  DateTime? connectedAt,  String? connectedBy)?  $default,) {final _that = this;
switch (_that) {
case _EventOrigin() when $default != null:
return $default(_that.mode,_that.bookingAuthority,_that.rosterAuthority,_that.provider,_that.externalEventId,_that.externalEventUrl,_that.sourceExternalEventId,_that.adapterVersion,_that.connectedAt,_that.connectedBy);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventOrigin implements EventOrigin {
  const _EventOrigin({required this.mode, @JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson) required this.bookingAuthority, required this.rosterAuthority, @JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) required this.provider, this.externalEventId, this.externalEventUrl, this.sourceExternalEventId, this.adapterVersion, @NullableTimestampConverter() this.connectedAt, this.connectedBy});
  factory _EventOrigin.fromJson(Map<String, dynamic> json) => _$EventOriginFromJson(json);

@override final  EventOriginMode mode;
@override@JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson) final  EventBookingAuthority bookingAuthority;
@override final  EventRosterAuthority rosterAuthority;
@override@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) final  ExternalBookingProvider provider;
@override final  String? externalEventId;
@override final  String? externalEventUrl;
@override final  String? sourceExternalEventId;
@override final  String? adapterVersion;
@override@NullableTimestampConverter() final  DateTime? connectedAt;
@override final  String? connectedBy;

/// Create a copy of EventOrigin
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventOriginCopyWith<_EventOrigin> get copyWith => __$EventOriginCopyWithImpl<_EventOrigin>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventOriginToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventOrigin&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.bookingAuthority, bookingAuthority) || other.bookingAuthority == bookingAuthority)&&(identical(other.rosterAuthority, rosterAuthority) || other.rosterAuthority == rosterAuthority)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.externalEventId, externalEventId) || other.externalEventId == externalEventId)&&(identical(other.externalEventUrl, externalEventUrl) || other.externalEventUrl == externalEventUrl)&&(identical(other.sourceExternalEventId, sourceExternalEventId) || other.sourceExternalEventId == sourceExternalEventId)&&(identical(other.adapterVersion, adapterVersion) || other.adapterVersion == adapterVersion)&&(identical(other.connectedAt, connectedAt) || other.connectedAt == connectedAt)&&(identical(other.connectedBy, connectedBy) || other.connectedBy == connectedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,mode,bookingAuthority,rosterAuthority,provider,externalEventId,externalEventUrl,sourceExternalEventId,adapterVersion,connectedAt,connectedBy);
}

@override
String toString() {
    return 'EventOrigin(mode: $mode, bookingAuthority: $bookingAuthority, rosterAuthority: $rosterAuthority, provider: $provider, externalEventId: $externalEventId, externalEventUrl: $externalEventUrl, sourceExternalEventId: $sourceExternalEventId, adapterVersion: $adapterVersion, connectedAt: $connectedAt, connectedBy: $connectedBy)';
}


}

/// @nodoc
abstract mixin class _$EventOriginCopyWith<$Res> implements $EventOriginCopyWith<$Res> {
  factory _$EventOriginCopyWith(_EventOrigin value, $Res Function(_EventOrigin) _then) = __$EventOriginCopyWithImpl;
@override @useResult
$Res call({
 EventOriginMode mode,@JsonKey(fromJson: eventBookingAuthorityFromJson, toJson: eventBookingAuthorityToJson) EventBookingAuthority bookingAuthority, EventRosterAuthority rosterAuthority,@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider provider, String? externalEventId, String? externalEventUrl, String? sourceExternalEventId, String? adapterVersion,@NullableTimestampConverter() DateTime? connectedAt, String? connectedBy
});




}
/// @nodoc
class __$EventOriginCopyWithImpl<$Res>
    implements _$EventOriginCopyWith<$Res> {
  __$EventOriginCopyWithImpl(this._self, this._then);

  final _EventOrigin _self;
  final $Res Function(_EventOrigin) _then;

/// Create a copy of EventOrigin
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? mode = null,Object? bookingAuthority = null,Object? rosterAuthority = null,Object? provider = null,Object? externalEventId = freezed,Object? externalEventUrl = freezed,Object? sourceExternalEventId = freezed,Object? adapterVersion = freezed,Object? connectedAt = freezed,Object? connectedBy = freezed,}) {
  return _then(_EventOrigin(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as EventOriginMode,bookingAuthority: null == bookingAuthority ? _self.bookingAuthority : bookingAuthority // ignore: cast_nullable_to_non_nullable
as EventBookingAuthority,rosterAuthority: null == rosterAuthority ? _self.rosterAuthority : rosterAuthority // ignore: cast_nullable_to_non_nullable
as EventRosterAuthority,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider,externalEventId: freezed == externalEventId ? _self.externalEventId : externalEventId // ignore: cast_nullable_to_non_nullable
as String?,externalEventUrl: freezed == externalEventUrl ? _self.externalEventUrl : externalEventUrl // ignore: cast_nullable_to_non_nullable
as String?,sourceExternalEventId: freezed == sourceExternalEventId ? _self.sourceExternalEventId : sourceExternalEventId // ignore: cast_nullable_to_non_nullable
as String?,adapterVersion: freezed == adapterVersion ? _self.adapterVersion : adapterVersion // ignore: cast_nullable_to_non_nullable
as String?,connectedAt: freezed == connectedAt ? _self.connectedAt : connectedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,connectedBy: freezed == connectedBy ? _self.connectedBy : connectedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$EventOrganizerSummary {

 String get name; String get location; String get area; String? get hostName; List<String> get tags; double get rating; bool get synthetic; EventOrganizerVisibility get appVisibility; EventOrganizerLifecycle get status; bool get archived;
/// Create a copy of EventOrganizerSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventOrganizerSummaryCopyWith<EventOrganizerSummary> get copyWith => _$EventOrganizerSummaryCopyWithImpl<EventOrganizerSummary>(this as EventOrganizerSummary, _$identity);

  /// Serializes this EventOrganizerSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EventOrganizerSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventOrganizerSummary&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.location, _this.location) || other.location == _this.location)&&(identical(other.area, _this.area) || other.area == _this.area)&&(identical(other.hostName, _this.hostName) || other.hostName == _this.hostName)&&const DeepCollectionEquality().equals(other.tags, _this.tags)&&(identical(other.rating, _this.rating) || other.rating == _this.rating)&&(identical(other.synthetic, _this.synthetic) || other.synthetic == _this.synthetic)&&(identical(other.appVisibility, _this.appVisibility) || other.appVisibility == _this.appVisibility)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.archived, _this.archived) || other.archived == _this.archived));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EventOrganizerSummary;
  return Object.hash(runtimeType,_this.name,_this.location,_this.area,_this.hostName,const DeepCollectionEquality().hash(_this.tags),_this.rating,_this.synthetic,_this.appVisibility,_this.status,_this.archived);
}

@override
String toString() {
  final _this = this as EventOrganizerSummary;
  return 'EventOrganizerSummary(name: ${_this.name}, location: ${_this.location}, area: ${_this.area}, hostName: ${_this.hostName}, tags: ${_this.tags}, rating: ${_this.rating}, synthetic: ${_this.synthetic}, appVisibility: ${_this.appVisibility}, status: ${_this.status}, archived: ${_this.archived})';
}


}

/// @nodoc
abstract mixin class $EventOrganizerSummaryCopyWith<$Res>  {
  factory $EventOrganizerSummaryCopyWith(EventOrganizerSummary value, $Res Function(EventOrganizerSummary) _then) = _$EventOrganizerSummaryCopyWithImpl;
@useResult
$Res call({
 String name, String location, String area, String? hostName, List<String> tags, double rating, bool synthetic, EventOrganizerVisibility appVisibility, EventOrganizerLifecycle status, bool archived
});




}
/// @nodoc
class _$EventOrganizerSummaryCopyWithImpl<$Res>
    implements $EventOrganizerSummaryCopyWith<$Res> {
  _$EventOrganizerSummaryCopyWithImpl(this._self, this._then);

  final EventOrganizerSummary _self;
  final $Res Function(EventOrganizerSummary) _then;

/// Create a copy of EventOrganizerSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? location = null,Object? area = null,Object? hostName = freezed,Object? tags = null,Object? rating = null,Object? synthetic = null,Object? appVisibility = null,Object? status = null,Object? archived = null,}) {
  return _then(EventOrganizerSummary(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,location: null == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String,area: null == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String,hostName: freezed == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String?,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as EventOrganizerVisibility,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventOrganizerLifecycle,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [EventOrganizerSummary].
extension EventOrganizerSummaryPatterns on EventOrganizerSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventOrganizerSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventOrganizerSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventOrganizerSummary value)  $default,){
final _that = this;
switch (_that) {
case _EventOrganizerSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventOrganizerSummary value)?  $default,){
final _that = this;
switch (_that) {
case _EventOrganizerSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String location,  String area,  String? hostName,  List<String> tags,  double rating,  bool synthetic,  EventOrganizerVisibility appVisibility,  EventOrganizerLifecycle status,  bool archived)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventOrganizerSummary() when $default != null:
return $default(_that.name,_that.location,_that.area,_that.hostName,_that.tags,_that.rating,_that.synthetic,_that.appVisibility,_that.status,_that.archived);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String location,  String area,  String? hostName,  List<String> tags,  double rating,  bool synthetic,  EventOrganizerVisibility appVisibility,  EventOrganizerLifecycle status,  bool archived)  $default,) {final _that = this;
switch (_that) {
case _EventOrganizerSummary():
return $default(_that.name,_that.location,_that.area,_that.hostName,_that.tags,_that.rating,_that.synthetic,_that.appVisibility,_that.status,_that.archived);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String location,  String area,  String? hostName,  List<String> tags,  double rating,  bool synthetic,  EventOrganizerVisibility appVisibility,  EventOrganizerLifecycle status,  bool archived)?  $default,) {final _that = this;
switch (_that) {
case _EventOrganizerSummary() when $default != null:
return $default(_that.name,_that.location,_that.area,_that.hostName,_that.tags,_that.rating,_that.synthetic,_that.appVisibility,_that.status,_that.archived);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventOrganizerSummary implements EventOrganizerSummary {
  const _EventOrganizerSummary({required this.name, required this.location, required this.area, this.hostName,  List<String> tags = const [], required this.rating, this.synthetic = false, required this.appVisibility, required this.status, required this.archived}): _tags = tags;
  factory _EventOrganizerSummary.fromJson(Map<String, dynamic> json) => _$EventOrganizerSummaryFromJson(json);

@override final  String name;
@override final  String location;
@override final  String area;
@override final  String? hostName;
 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override final  double rating;
@override@JsonKey() final  bool synthetic;
@override final  EventOrganizerVisibility appVisibility;
@override final  EventOrganizerLifecycle status;
@override final  bool archived;

/// Create a copy of EventOrganizerSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventOrganizerSummaryCopyWith<_EventOrganizerSummary> get copyWith => __$EventOrganizerSummaryCopyWithImpl<_EventOrganizerSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventOrganizerSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventOrganizerSummary&&(identical(other.name, name) || other.name == name)&&(identical(other.location, location) || other.location == location)&&(identical(other.area, area) || other.area == area)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&const DeepCollectionEquality().equals(other.tags, _tags)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.appVisibility, appVisibility) || other.appVisibility == appVisibility)&&(identical(other.status, status) || other.status == status)&&(identical(other.archived, archived) || other.archived == archived));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,name,location,area,hostName,const DeepCollectionEquality().hash(_tags),rating,synthetic,appVisibility,status,archived);
}

@override
String toString() {
    return 'EventOrganizerSummary(name: $name, location: $location, area: $area, hostName: $hostName, tags: $tags, rating: $rating, synthetic: $synthetic, appVisibility: $appVisibility, status: $status, archived: $archived)';
}


}

/// @nodoc
abstract mixin class _$EventOrganizerSummaryCopyWith<$Res> implements $EventOrganizerSummaryCopyWith<$Res> {
  factory _$EventOrganizerSummaryCopyWith(_EventOrganizerSummary value, $Res Function(_EventOrganizerSummary) _then) = __$EventOrganizerSummaryCopyWithImpl;
@override @useResult
$Res call({
 String name, String location, String area, String? hostName, List<String> tags, double rating, bool synthetic, EventOrganizerVisibility appVisibility, EventOrganizerLifecycle status, bool archived
});




}
/// @nodoc
class __$EventOrganizerSummaryCopyWithImpl<$Res>
    implements _$EventOrganizerSummaryCopyWith<$Res> {
  __$EventOrganizerSummaryCopyWithImpl(this._self, this._then);

  final _EventOrganizerSummary _self;
  final $Res Function(_EventOrganizerSummary) _then;

/// Create a copy of EventOrganizerSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? location = null,Object? area = null,Object? hostName = freezed,Object? tags = null,Object? rating = null,Object? synthetic = null,Object? appVisibility = null,Object? status = null,Object? archived = null,}) {
  return _then(_EventOrganizerSummary(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,location: null == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String,area: null == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String,hostName: freezed == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String?,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as EventOrganizerVisibility,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventOrganizerLifecycle,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$EventExternalBooking {

@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider get provider; String get url;
/// Create a copy of EventExternalBooking
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventExternalBookingCopyWith<EventExternalBooking> get copyWith => _$EventExternalBookingCopyWithImpl<EventExternalBooking>(this as EventExternalBooking, _$identity);

  /// Serializes this EventExternalBooking to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EventExternalBooking;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventExternalBooking&&(identical(other.provider, _this.provider) || other.provider == _this.provider)&&(identical(other.url, _this.url) || other.url == _this.url));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EventExternalBooking;
  return Object.hash(runtimeType,_this.provider,_this.url);
}

@override
String toString() {
  final _this = this as EventExternalBooking;
  return 'EventExternalBooking(provider: ${_this.provider}, url: ${_this.url})';
}


}

/// @nodoc
abstract mixin class $EventExternalBookingCopyWith<$Res>  {
  factory $EventExternalBookingCopyWith(EventExternalBooking value, $Res Function(EventExternalBooking) _then) = _$EventExternalBookingCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider provider, String url
});




}
/// @nodoc
class _$EventExternalBookingCopyWithImpl<$Res>
    implements $EventExternalBookingCopyWith<$Res> {
  _$EventExternalBookingCopyWithImpl(this._self, this._then);

  final EventExternalBooking _self;
  final $Res Function(EventExternalBooking) _then;

/// Create a copy of EventExternalBooking
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? provider = null,Object? url = null,}) {
  return _then(EventExternalBooking(
provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [EventExternalBooking].
extension EventExternalBookingPatterns on EventExternalBooking {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventExternalBooking value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventExternalBooking() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventExternalBooking value)  $default,){
final _that = this;
switch (_that) {
case _EventExternalBooking():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventExternalBooking value)?  $default,){
final _that = this;
switch (_that) {
case _EventExternalBooking() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String url)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventExternalBooking() when $default != null:
return $default(_that.provider,_that.url);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String url)  $default,) {final _that = this;
switch (_that) {
case _EventExternalBooking():
return $default(_that.provider,_that.url);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson)  ExternalBookingProvider provider,  String url)?  $default,) {final _that = this;
switch (_that) {
case _EventExternalBooking() when $default != null:
return $default(_that.provider,_that.url);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventExternalBooking implements EventExternalBooking {
  const _EventExternalBooking({@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) required this.provider, required this.url});
  factory _EventExternalBooking.fromJson(Map<String, dynamic> json) => _$EventExternalBookingFromJson(json);

@override@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) final  ExternalBookingProvider provider;
@override final  String url;

/// Create a copy of EventExternalBooking
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventExternalBookingCopyWith<_EventExternalBooking> get copyWith => __$EventExternalBookingCopyWithImpl<_EventExternalBooking>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventExternalBookingToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventExternalBooking&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.url, url) || other.url == url));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,provider,url);
}

@override
String toString() {
    return 'EventExternalBooking(provider: $provider, url: $url)';
}


}

/// @nodoc
abstract mixin class _$EventExternalBookingCopyWith<$Res> implements $EventExternalBookingCopyWith<$Res> {
  factory _$EventExternalBookingCopyWith(_EventExternalBooking value, $Res Function(_EventExternalBooking) _then) = __$EventExternalBookingCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: externalBookingProviderFromJson, toJson: externalBookingProviderToJson) ExternalBookingProvider provider, String url
});




}
/// @nodoc
class __$EventExternalBookingCopyWithImpl<$Res>
    implements _$EventExternalBookingCopyWith<$Res> {
  __$EventExternalBookingCopyWithImpl(this._self, this._then);

  final _EventExternalBooking _self;
  final $Res Function(_EventExternalBooking) _then;

/// Create a copy of EventExternalBooking
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? provider = null,Object? url = null,}) {
  return _then(_EventExternalBooking(
provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$EventRuntimeAccess {

 bool get enabled; String? get publicRuntimeId; EventRuntimeWalkInPolicy get walkInPolicy; String get termsVersion;
/// Create a copy of EventRuntimeAccess
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventRuntimeAccessCopyWith<EventRuntimeAccess> get copyWith => _$EventRuntimeAccessCopyWithImpl<EventRuntimeAccess>(this as EventRuntimeAccess, _$identity);

  /// Serializes this EventRuntimeAccess to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EventRuntimeAccess;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventRuntimeAccess&&(identical(other.enabled, _this.enabled) || other.enabled == _this.enabled)&&(identical(other.publicRuntimeId, _this.publicRuntimeId) || other.publicRuntimeId == _this.publicRuntimeId)&&(identical(other.walkInPolicy, _this.walkInPolicy) || other.walkInPolicy == _this.walkInPolicy)&&(identical(other.termsVersion, _this.termsVersion) || other.termsVersion == _this.termsVersion));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EventRuntimeAccess;
  return Object.hash(runtimeType,_this.enabled,_this.publicRuntimeId,_this.walkInPolicy,_this.termsVersion);
}

@override
String toString() {
  final _this = this as EventRuntimeAccess;
  return 'EventRuntimeAccess(enabled: ${_this.enabled}, publicRuntimeId: ${_this.publicRuntimeId}, walkInPolicy: ${_this.walkInPolicy}, termsVersion: ${_this.termsVersion})';
}


}

/// @nodoc
abstract mixin class $EventRuntimeAccessCopyWith<$Res>  {
  factory $EventRuntimeAccessCopyWith(EventRuntimeAccess value, $Res Function(EventRuntimeAccess) _then) = _$EventRuntimeAccessCopyWithImpl;
@useResult
$Res call({
 bool enabled, String? publicRuntimeId, EventRuntimeWalkInPolicy walkInPolicy, String termsVersion
});




}
/// @nodoc
class _$EventRuntimeAccessCopyWithImpl<$Res>
    implements $EventRuntimeAccessCopyWith<$Res> {
  _$EventRuntimeAccessCopyWithImpl(this._self, this._then);

  final EventRuntimeAccess _self;
  final $Res Function(EventRuntimeAccess) _then;

/// Create a copy of EventRuntimeAccess
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? enabled = null,Object? publicRuntimeId = freezed,Object? walkInPolicy = null,Object? termsVersion = null,}) {
  return _then(EventRuntimeAccess(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,publicRuntimeId: freezed == publicRuntimeId ? _self.publicRuntimeId : publicRuntimeId // ignore: cast_nullable_to_non_nullable
as String?,walkInPolicy: null == walkInPolicy ? _self.walkInPolicy : walkInPolicy // ignore: cast_nullable_to_non_nullable
as EventRuntimeWalkInPolicy,termsVersion: null == termsVersion ? _self.termsVersion : termsVersion // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [EventRuntimeAccess].
extension EventRuntimeAccessPatterns on EventRuntimeAccess {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventRuntimeAccess value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventRuntimeAccess() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventRuntimeAccess value)  $default,){
final _that = this;
switch (_that) {
case _EventRuntimeAccess():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventRuntimeAccess value)?  $default,){
final _that = this;
switch (_that) {
case _EventRuntimeAccess() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool enabled,  String? publicRuntimeId,  EventRuntimeWalkInPolicy walkInPolicy,  String termsVersion)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventRuntimeAccess() when $default != null:
return $default(_that.enabled,_that.publicRuntimeId,_that.walkInPolicy,_that.termsVersion);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool enabled,  String? publicRuntimeId,  EventRuntimeWalkInPolicy walkInPolicy,  String termsVersion)  $default,) {final _that = this;
switch (_that) {
case _EventRuntimeAccess():
return $default(_that.enabled,_that.publicRuntimeId,_that.walkInPolicy,_that.termsVersion);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool enabled,  String? publicRuntimeId,  EventRuntimeWalkInPolicy walkInPolicy,  String termsVersion)?  $default,) {final _that = this;
switch (_that) {
case _EventRuntimeAccess() when $default != null:
return $default(_that.enabled,_that.publicRuntimeId,_that.walkInPolicy,_that.termsVersion);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventRuntimeAccess implements EventRuntimeAccess {
  const _EventRuntimeAccess({required this.enabled, this.publicRuntimeId, required this.walkInPolicy, required this.termsVersion});
  factory _EventRuntimeAccess.fromJson(Map<String, dynamic> json) => _$EventRuntimeAccessFromJson(json);

@override final  bool enabled;
@override final  String? publicRuntimeId;
@override final  EventRuntimeWalkInPolicy walkInPolicy;
@override final  String termsVersion;

/// Create a copy of EventRuntimeAccess
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventRuntimeAccessCopyWith<_EventRuntimeAccess> get copyWith => __$EventRuntimeAccessCopyWithImpl<_EventRuntimeAccess>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventRuntimeAccessToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventRuntimeAccess&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.publicRuntimeId, publicRuntimeId) || other.publicRuntimeId == publicRuntimeId)&&(identical(other.walkInPolicy, walkInPolicy) || other.walkInPolicy == walkInPolicy)&&(identical(other.termsVersion, termsVersion) || other.termsVersion == termsVersion));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,enabled,publicRuntimeId,walkInPolicy,termsVersion);
}

@override
String toString() {
    return 'EventRuntimeAccess(enabled: $enabled, publicRuntimeId: $publicRuntimeId, walkInPolicy: $walkInPolicy, termsVersion: $termsVersion)';
}


}

/// @nodoc
abstract mixin class _$EventRuntimeAccessCopyWith<$Res> implements $EventRuntimeAccessCopyWith<$Res> {
  factory _$EventRuntimeAccessCopyWith(_EventRuntimeAccess value, $Res Function(_EventRuntimeAccess) _then) = __$EventRuntimeAccessCopyWithImpl;
@override @useResult
$Res call({
 bool enabled, String? publicRuntimeId, EventRuntimeWalkInPolicy walkInPolicy, String termsVersion
});




}
/// @nodoc
class __$EventRuntimeAccessCopyWithImpl<$Res>
    implements _$EventRuntimeAccessCopyWith<$Res> {
  __$EventRuntimeAccessCopyWithImpl(this._self, this._then);

  final _EventRuntimeAccess _self;
  final $Res Function(_EventRuntimeAccess) _then;

/// Create a copy of EventRuntimeAccess
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? enabled = null,Object? publicRuntimeId = freezed,Object? walkInPolicy = null,Object? termsVersion = null,}) {
  return _then(_EventRuntimeAccess(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,publicRuntimeId: freezed == publicRuntimeId ? _self.publicRuntimeId : publicRuntimeId // ignore: cast_nullable_to_non_nullable
as String?,walkInPolicy: null == walkInPolicy ? _self.walkInPolicy : walkInPolicy // ignore: cast_nullable_to_non_nullable
as EventRuntimeWalkInPolicy,termsVersion: null == termsVersion ? _self.termsVersion : termsVersion // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
