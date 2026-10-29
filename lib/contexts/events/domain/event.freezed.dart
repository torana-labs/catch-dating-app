// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Event {

@JsonKey(includeToJson: false) String get id;@JsonKey(includeToJson: false) bool get synthetic;@JsonKey(includeToJson: false) String? get seedPrefix;@JsonKey(name: 'organizerId', readValue: readEventOrganizerId) String get clubId;@JsonKey(includeIfNull: false) String? get sourceVenueId; String get name;@TimestampConverter() DateTime get startTime;@JsonKey(includeIfNull: false) String? get eventTimezone;@TimestampConverter() DateTime get endTime; String get meetingPoint;@JsonKey(includeIfNull: false) EventMeetingLocation? get meetingLocation; double? get startingPointLat; double? get startingPointLng; String? get locationDetails; List<EventItineraryItem> get itinerary;@JsonKey(includeIfNull: false) String? get photoUrl; List<UploadedPhoto> get eventPhotos; EventFormatSnapshot get eventFormat; double get distanceKm; PaceLevel get pace; int get capacityLimit; String get description; int get priceInPaise; String get currency;@JsonKey(includeIfNull: false) int? get bookedCount;@JsonKey(includeIfNull: false) int? get checkedInCount;@JsonKey(includeIfNull: false) int? get waitlistedCount; int get crossPathsPairHeldCount; int get crossPathsPairConfirmedCount; Map<String, int> get crossPathsPairHeldCohortCounts; bool get crossPathsDiscoveryEnabled; EventLifecycleStatus get status;@NullableTimestampConverter() DateTime? get cancelledAt; String? get cancellationReason;@JsonKey(includeIfNull: false) int? get setupRevision; bool get publicRegistrationEnabled;@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? get publicRegistrationMode; int get publicRegistrationRevision; EventConstraints get constraints;@JsonKey(includeIfNull: false) EventPolicyBundle? get eventPolicy;@JsonKey(includeIfNull: false) EventOrigin? get eventOrigin;@JsonKey(includeIfNull: false) EventRuntimeAccess? get runtimeAccess; Map<String, int> get genderCounts; Map<String, int> get cohortCounts; Map<String, int> get waitlistedCohortCounts;
/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventCopyWith<Event> get copyWith => _$EventCopyWithImpl<Event>(this as Event, _$identity);

  /// Serializes this Event to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Event&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.name, name) || other.name == name)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.meetingLocation, meetingLocation) || other.meetingLocation == meetingLocation)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&const DeepCollectionEquality().equals(other.itinerary, itinerary)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&const DeepCollectionEquality().equals(other.eventPhotos, eventPhotos)&&(identical(other.eventFormat, eventFormat) || other.eventFormat == eventFormat)&&(identical(other.distanceKm, distanceKm) || other.distanceKm == distanceKm)&&(identical(other.pace, pace) || other.pace == pace)&&(identical(other.capacityLimit, capacityLimit) || other.capacityLimit == capacityLimit)&&(identical(other.description, description) || other.description == description)&&(identical(other.priceInPaise, priceInPaise) || other.priceInPaise == priceInPaise)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.bookedCount, bookedCount) || other.bookedCount == bookedCount)&&(identical(other.checkedInCount, checkedInCount) || other.checkedInCount == checkedInCount)&&(identical(other.waitlistedCount, waitlistedCount) || other.waitlistedCount == waitlistedCount)&&(identical(other.crossPathsPairHeldCount, crossPathsPairHeldCount) || other.crossPathsPairHeldCount == crossPathsPairHeldCount)&&(identical(other.crossPathsPairConfirmedCount, crossPathsPairConfirmedCount) || other.crossPathsPairConfirmedCount == crossPathsPairConfirmedCount)&&const DeepCollectionEquality().equals(other.crossPathsPairHeldCohortCounts, crossPathsPairHeldCohortCounts)&&(identical(other.crossPathsDiscoveryEnabled, crossPathsDiscoveryEnabled) || other.crossPathsDiscoveryEnabled == crossPathsDiscoveryEnabled)&&(identical(other.status, status) || other.status == status)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.cancellationReason, cancellationReason) || other.cancellationReason == cancellationReason)&&(identical(other.setupRevision, setupRevision) || other.setupRevision == setupRevision)&&(identical(other.publicRegistrationEnabled, publicRegistrationEnabled) || other.publicRegistrationEnabled == publicRegistrationEnabled)&&(identical(other.publicRegistrationMode, publicRegistrationMode) || other.publicRegistrationMode == publicRegistrationMode)&&(identical(other.publicRegistrationRevision, publicRegistrationRevision) || other.publicRegistrationRevision == publicRegistrationRevision)&&(identical(other.constraints, constraints) || other.constraints == constraints)&&(identical(other.eventPolicy, eventPolicy) || other.eventPolicy == eventPolicy)&&(identical(other.eventOrigin, eventOrigin) || other.eventOrigin == eventOrigin)&&(identical(other.runtimeAccess, runtimeAccess) || other.runtimeAccess == runtimeAccess)&&const DeepCollectionEquality().equals(other.genderCounts, genderCounts)&&const DeepCollectionEquality().equals(other.cohortCounts, cohortCounts)&&const DeepCollectionEquality().equals(other.waitlistedCohortCounts, waitlistedCohortCounts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,clubId,sourceVenueId,name,startTime,eventTimezone,endTime,meetingPoint,meetingLocation,startingPointLat,startingPointLng,locationDetails,const DeepCollectionEquality().hash(itinerary),photoUrl,const DeepCollectionEquality().hash(eventPhotos),eventFormat,distanceKm,pace,capacityLimit,description,priceInPaise,currency,bookedCount,checkedInCount,waitlistedCount,crossPathsPairHeldCount,crossPathsPairConfirmedCount,const DeepCollectionEquality().hash(crossPathsPairHeldCohortCounts),crossPathsDiscoveryEnabled,status,cancelledAt,cancellationReason,setupRevision,publicRegistrationEnabled,publicRegistrationMode,publicRegistrationRevision,constraints,eventPolicy,eventOrigin,runtimeAccess,const DeepCollectionEquality().hash(genderCounts),const DeepCollectionEquality().hash(cohortCounts),const DeepCollectionEquality().hash(waitlistedCohortCounts)]);

@override
String toString() {
  return 'Event(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, clubId: $clubId, sourceVenueId: $sourceVenueId, name: $name, startTime: $startTime, eventTimezone: $eventTimezone, endTime: $endTime, meetingPoint: $meetingPoint, meetingLocation: $meetingLocation, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, locationDetails: $locationDetails, itinerary: $itinerary, photoUrl: $photoUrl, eventPhotos: $eventPhotos, eventFormat: $eventFormat, distanceKm: $distanceKm, pace: $pace, capacityLimit: $capacityLimit, description: $description, priceInPaise: $priceInPaise, currency: $currency, bookedCount: $bookedCount, checkedInCount: $checkedInCount, waitlistedCount: $waitlistedCount, crossPathsPairHeldCount: $crossPathsPairHeldCount, crossPathsPairConfirmedCount: $crossPathsPairConfirmedCount, crossPathsPairHeldCohortCounts: $crossPathsPairHeldCohortCounts, crossPathsDiscoveryEnabled: $crossPathsDiscoveryEnabled, status: $status, cancelledAt: $cancelledAt, cancellationReason: $cancellationReason, setupRevision: $setupRevision, publicRegistrationEnabled: $publicRegistrationEnabled, publicRegistrationMode: $publicRegistrationMode, publicRegistrationRevision: $publicRegistrationRevision, constraints: $constraints, eventPolicy: $eventPolicy, eventOrigin: $eventOrigin, runtimeAccess: $runtimeAccess, genderCounts: $genderCounts, cohortCounts: $cohortCounts, waitlistedCohortCounts: $waitlistedCohortCounts)';
}


}

/// @nodoc
abstract mixin class $EventCopyWith<$Res>  {
  factory $EventCopyWith(Event value, $Res Function(Event) _then) = _$EventCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix,@JsonKey(name: 'organizerId', readValue: readEventOrganizerId) String clubId,@JsonKey(includeIfNull: false) String? sourceVenueId, String name,@TimestampConverter() DateTime startTime,@JsonKey(includeIfNull: false) String? eventTimezone,@TimestampConverter() DateTime endTime, String meetingPoint,@JsonKey(includeIfNull: false) EventMeetingLocation? meetingLocation, double? startingPointLat, double? startingPointLng, String? locationDetails, List<EventItineraryItem> itinerary,@JsonKey(includeIfNull: false) String? photoUrl, List<UploadedPhoto> eventPhotos, EventFormatSnapshot eventFormat, double distanceKm, PaceLevel pace, int capacityLimit, String description, int priceInPaise, String currency,@JsonKey(includeIfNull: false) int? bookedCount,@JsonKey(includeIfNull: false) int? checkedInCount,@JsonKey(includeIfNull: false) int? waitlistedCount, int crossPathsPairHeldCount, int crossPathsPairConfirmedCount, Map<String, int> crossPathsPairHeldCohortCounts, bool crossPathsDiscoveryEnabled, EventLifecycleStatus status,@NullableTimestampConverter() DateTime? cancelledAt, String? cancellationReason,@JsonKey(includeIfNull: false) int? setupRevision, bool publicRegistrationEnabled,@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? publicRegistrationMode, int publicRegistrationRevision, EventConstraints constraints,@JsonKey(includeIfNull: false) EventPolicyBundle? eventPolicy,@JsonKey(includeIfNull: false) EventOrigin? eventOrigin,@JsonKey(includeIfNull: false) EventRuntimeAccess? runtimeAccess, Map<String, int> genderCounts, Map<String, int> cohortCounts, Map<String, int> waitlistedCohortCounts
});


$EventMeetingLocationCopyWith<$Res>? get meetingLocation;$EventConstraintsCopyWith<$Res> get constraints;$EventOriginCopyWith<$Res>? get eventOrigin;$EventRuntimeAccessCopyWith<$Res>? get runtimeAccess;

}
/// @nodoc
class _$EventCopyWithImpl<$Res>
    implements $EventCopyWith<$Res> {
  _$EventCopyWithImpl(this._self, this._then);

  final Event _self;
  final $Res Function(Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? clubId = null,Object? sourceVenueId = freezed,Object? name = null,Object? startTime = null,Object? eventTimezone = freezed,Object? endTime = null,Object? meetingPoint = null,Object? meetingLocation = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? locationDetails = freezed,Object? itinerary = null,Object? photoUrl = freezed,Object? eventPhotos = null,Object? eventFormat = null,Object? distanceKm = null,Object? pace = null,Object? capacityLimit = null,Object? description = null,Object? priceInPaise = null,Object? currency = null,Object? bookedCount = freezed,Object? checkedInCount = freezed,Object? waitlistedCount = freezed,Object? crossPathsPairHeldCount = null,Object? crossPathsPairConfirmedCount = null,Object? crossPathsPairHeldCohortCounts = null,Object? crossPathsDiscoveryEnabled = null,Object? status = null,Object? cancelledAt = freezed,Object? cancellationReason = freezed,Object? setupRevision = freezed,Object? publicRegistrationEnabled = null,Object? publicRegistrationMode = freezed,Object? publicRegistrationRevision = null,Object? constraints = null,Object? eventPolicy = freezed,Object? eventOrigin = freezed,Object? runtimeAccess = freezed,Object? genderCounts = null,Object? cohortCounts = null,Object? waitlistedCohortCounts = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
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
as int,constraints: null == constraints ? _self.constraints : constraints // ignore: cast_nullable_to_non_nullable
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix, @JsonKey(name: 'organizerId', readValue: readEventOrganizerId)  String clubId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.clubId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix, @JsonKey(name: 'organizerId', readValue: readEventOrganizerId)  String clubId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)  $default,) {final _that = this;
switch (_that) {
case _Event():
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.clubId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix, @JsonKey(name: 'organizerId', readValue: readEventOrganizerId)  String clubId, @JsonKey(includeIfNull: false)  String? sourceVenueId,  String name, @TimestampConverter()  DateTime startTime, @JsonKey(includeIfNull: false)  String? eventTimezone, @TimestampConverter()  DateTime endTime,  String meetingPoint, @JsonKey(includeIfNull: false)  EventMeetingLocation? meetingLocation,  double? startingPointLat,  double? startingPointLng,  String? locationDetails,  List<EventItineraryItem> itinerary, @JsonKey(includeIfNull: false)  String? photoUrl,  List<UploadedPhoto> eventPhotos,  EventFormatSnapshot eventFormat,  double distanceKm,  PaceLevel pace,  int capacityLimit,  String description,  int priceInPaise,  String currency, @JsonKey(includeIfNull: false)  int? bookedCount, @JsonKey(includeIfNull: false)  int? checkedInCount, @JsonKey(includeIfNull: false)  int? waitlistedCount,  int crossPathsPairHeldCount,  int crossPathsPairConfirmedCount,  Map<String, int> crossPathsPairHeldCohortCounts,  bool crossPathsDiscoveryEnabled,  EventLifecycleStatus status, @NullableTimestampConverter()  DateTime? cancelledAt,  String? cancellationReason, @JsonKey(includeIfNull: false)  int? setupRevision,  bool publicRegistrationEnabled, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed)  EventPublicRegistrationMode? publicRegistrationMode,  int publicRegistrationRevision,  EventConstraints constraints, @JsonKey(includeIfNull: false)  EventPolicyBundle? eventPolicy, @JsonKey(includeIfNull: false)  EventOrigin? eventOrigin, @JsonKey(includeIfNull: false)  EventRuntimeAccess? runtimeAccess,  Map<String, int> genderCounts,  Map<String, int> cohortCounts,  Map<String, int> waitlistedCohortCounts)?  $default,) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.clubId,_that.sourceVenueId,_that.name,_that.startTime,_that.eventTimezone,_that.endTime,_that.meetingPoint,_that.meetingLocation,_that.startingPointLat,_that.startingPointLng,_that.locationDetails,_that.itinerary,_that.photoUrl,_that.eventPhotos,_that.eventFormat,_that.distanceKm,_that.pace,_that.capacityLimit,_that.description,_that.priceInPaise,_that.currency,_that.bookedCount,_that.checkedInCount,_that.waitlistedCount,_that.crossPathsPairHeldCount,_that.crossPathsPairConfirmedCount,_that.crossPathsPairHeldCohortCounts,_that.crossPathsDiscoveryEnabled,_that.status,_that.cancelledAt,_that.cancellationReason,_that.setupRevision,_that.publicRegistrationEnabled,_that.publicRegistrationMode,_that.publicRegistrationRevision,_that.constraints,_that.eventPolicy,_that.eventOrigin,_that.runtimeAccess,_that.genderCounts,_that.cohortCounts,_that.waitlistedCohortCounts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Event implements Event {
  const _Event({@JsonKey(includeToJson: false) required this.id, @JsonKey(includeToJson: false) this.synthetic = false, @JsonKey(includeToJson: false) this.seedPrefix, @JsonKey(name: 'organizerId', readValue: readEventOrganizerId) required this.clubId, @JsonKey(includeIfNull: false) this.sourceVenueId, this.name = '', @TimestampConverter() required this.startTime, @JsonKey(includeIfNull: false) this.eventTimezone, @TimestampConverter() required this.endTime, required this.meetingPoint, @JsonKey(includeIfNull: false) this.meetingLocation, this.startingPointLat, this.startingPointLng, this.locationDetails, final  List<EventItineraryItem> itinerary = const [], @JsonKey(includeIfNull: false) this.photoUrl, final  List<UploadedPhoto> eventPhotos = const [], this.eventFormat = const EventFormatSnapshot.socialRun(), required this.distanceKm, required this.pace, required this.capacityLimit, required this.description, required this.priceInPaise, this.currency = defaultCurrencyCode, @JsonKey(includeIfNull: false) this.bookedCount, @JsonKey(includeIfNull: false) this.checkedInCount, @JsonKey(includeIfNull: false) this.waitlistedCount, this.crossPathsPairHeldCount = 0, this.crossPathsPairConfirmedCount = 0, final  Map<String, int> crossPathsPairHeldCohortCounts = const {}, this.crossPathsDiscoveryEnabled = false, this.status = EventLifecycleStatus.active, @NullableTimestampConverter() this.cancelledAt, this.cancellationReason, @JsonKey(includeIfNull: false) this.setupRevision, this.publicRegistrationEnabled = false, @JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) this.publicRegistrationMode, this.publicRegistrationRevision = 0, this.constraints = const EventConstraints(), @JsonKey(includeIfNull: false) this.eventPolicy, @JsonKey(includeIfNull: false) this.eventOrigin, @JsonKey(includeIfNull: false) this.runtimeAccess, final  Map<String, int> genderCounts = const {}, final  Map<String, int> cohortCounts = const {}, final  Map<String, int> waitlistedCohortCounts = const {}}): _itinerary = itinerary,_eventPhotos = eventPhotos,_crossPathsPairHeldCohortCounts = crossPathsPairHeldCohortCounts,_genderCounts = genderCounts,_cohortCounts = cohortCounts,_waitlistedCohortCounts = waitlistedCohortCounts;
  factory _Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override@JsonKey(includeToJson: false) final  bool synthetic;
@override@JsonKey(includeToJson: false) final  String? seedPrefix;
@override@JsonKey(name: 'organizerId', readValue: readEventOrganizerId) final  String clubId;
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Event&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.sourceVenueId, sourceVenueId) || other.sourceVenueId == sourceVenueId)&&(identical(other.name, name) || other.name == name)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.eventTimezone, eventTimezone) || other.eventTimezone == eventTimezone)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.meetingLocation, meetingLocation) || other.meetingLocation == meetingLocation)&&(identical(other.startingPointLat, startingPointLat) || other.startingPointLat == startingPointLat)&&(identical(other.startingPointLng, startingPointLng) || other.startingPointLng == startingPointLng)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&const DeepCollectionEquality().equals(other._itinerary, _itinerary)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&const DeepCollectionEquality().equals(other._eventPhotos, _eventPhotos)&&(identical(other.eventFormat, eventFormat) || other.eventFormat == eventFormat)&&(identical(other.distanceKm, distanceKm) || other.distanceKm == distanceKm)&&(identical(other.pace, pace) || other.pace == pace)&&(identical(other.capacityLimit, capacityLimit) || other.capacityLimit == capacityLimit)&&(identical(other.description, description) || other.description == description)&&(identical(other.priceInPaise, priceInPaise) || other.priceInPaise == priceInPaise)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.bookedCount, bookedCount) || other.bookedCount == bookedCount)&&(identical(other.checkedInCount, checkedInCount) || other.checkedInCount == checkedInCount)&&(identical(other.waitlistedCount, waitlistedCount) || other.waitlistedCount == waitlistedCount)&&(identical(other.crossPathsPairHeldCount, crossPathsPairHeldCount) || other.crossPathsPairHeldCount == crossPathsPairHeldCount)&&(identical(other.crossPathsPairConfirmedCount, crossPathsPairConfirmedCount) || other.crossPathsPairConfirmedCount == crossPathsPairConfirmedCount)&&const DeepCollectionEquality().equals(other._crossPathsPairHeldCohortCounts, _crossPathsPairHeldCohortCounts)&&(identical(other.crossPathsDiscoveryEnabled, crossPathsDiscoveryEnabled) || other.crossPathsDiscoveryEnabled == crossPathsDiscoveryEnabled)&&(identical(other.status, status) || other.status == status)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.cancellationReason, cancellationReason) || other.cancellationReason == cancellationReason)&&(identical(other.setupRevision, setupRevision) || other.setupRevision == setupRevision)&&(identical(other.publicRegistrationEnabled, publicRegistrationEnabled) || other.publicRegistrationEnabled == publicRegistrationEnabled)&&(identical(other.publicRegistrationMode, publicRegistrationMode) || other.publicRegistrationMode == publicRegistrationMode)&&(identical(other.publicRegistrationRevision, publicRegistrationRevision) || other.publicRegistrationRevision == publicRegistrationRevision)&&(identical(other.constraints, constraints) || other.constraints == constraints)&&(identical(other.eventPolicy, eventPolicy) || other.eventPolicy == eventPolicy)&&(identical(other.eventOrigin, eventOrigin) || other.eventOrigin == eventOrigin)&&(identical(other.runtimeAccess, runtimeAccess) || other.runtimeAccess == runtimeAccess)&&const DeepCollectionEquality().equals(other._genderCounts, _genderCounts)&&const DeepCollectionEquality().equals(other._cohortCounts, _cohortCounts)&&const DeepCollectionEquality().equals(other._waitlistedCohortCounts, _waitlistedCohortCounts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,clubId,sourceVenueId,name,startTime,eventTimezone,endTime,meetingPoint,meetingLocation,startingPointLat,startingPointLng,locationDetails,const DeepCollectionEquality().hash(_itinerary),photoUrl,const DeepCollectionEquality().hash(_eventPhotos),eventFormat,distanceKm,pace,capacityLimit,description,priceInPaise,currency,bookedCount,checkedInCount,waitlistedCount,crossPathsPairHeldCount,crossPathsPairConfirmedCount,const DeepCollectionEquality().hash(_crossPathsPairHeldCohortCounts),crossPathsDiscoveryEnabled,status,cancelledAt,cancellationReason,setupRevision,publicRegistrationEnabled,publicRegistrationMode,publicRegistrationRevision,constraints,eventPolicy,eventOrigin,runtimeAccess,const DeepCollectionEquality().hash(_genderCounts),const DeepCollectionEquality().hash(_cohortCounts),const DeepCollectionEquality().hash(_waitlistedCohortCounts)]);

@override
String toString() {
  return 'Event(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, clubId: $clubId, sourceVenueId: $sourceVenueId, name: $name, startTime: $startTime, eventTimezone: $eventTimezone, endTime: $endTime, meetingPoint: $meetingPoint, meetingLocation: $meetingLocation, startingPointLat: $startingPointLat, startingPointLng: $startingPointLng, locationDetails: $locationDetails, itinerary: $itinerary, photoUrl: $photoUrl, eventPhotos: $eventPhotos, eventFormat: $eventFormat, distanceKm: $distanceKm, pace: $pace, capacityLimit: $capacityLimit, description: $description, priceInPaise: $priceInPaise, currency: $currency, bookedCount: $bookedCount, checkedInCount: $checkedInCount, waitlistedCount: $waitlistedCount, crossPathsPairHeldCount: $crossPathsPairHeldCount, crossPathsPairConfirmedCount: $crossPathsPairConfirmedCount, crossPathsPairHeldCohortCounts: $crossPathsPairHeldCohortCounts, crossPathsDiscoveryEnabled: $crossPathsDiscoveryEnabled, status: $status, cancelledAt: $cancelledAt, cancellationReason: $cancellationReason, setupRevision: $setupRevision, publicRegistrationEnabled: $publicRegistrationEnabled, publicRegistrationMode: $publicRegistrationMode, publicRegistrationRevision: $publicRegistrationRevision, constraints: $constraints, eventPolicy: $eventPolicy, eventOrigin: $eventOrigin, runtimeAccess: $runtimeAccess, genderCounts: $genderCounts, cohortCounts: $cohortCounts, waitlistedCohortCounts: $waitlistedCohortCounts)';
}


}

/// @nodoc
abstract mixin class _$EventCopyWith<$Res> implements $EventCopyWith<$Res> {
  factory _$EventCopyWith(_Event value, $Res Function(_Event) _then) = __$EventCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix,@JsonKey(name: 'organizerId', readValue: readEventOrganizerId) String clubId,@JsonKey(includeIfNull: false) String? sourceVenueId, String name,@TimestampConverter() DateTime startTime,@JsonKey(includeIfNull: false) String? eventTimezone,@TimestampConverter() DateTime endTime, String meetingPoint,@JsonKey(includeIfNull: false) EventMeetingLocation? meetingLocation, double? startingPointLat, double? startingPointLng, String? locationDetails, List<EventItineraryItem> itinerary,@JsonKey(includeIfNull: false) String? photoUrl, List<UploadedPhoto> eventPhotos, EventFormatSnapshot eventFormat, double distanceKm, PaceLevel pace, int capacityLimit, String description, int priceInPaise, String currency,@JsonKey(includeIfNull: false) int? bookedCount,@JsonKey(includeIfNull: false) int? checkedInCount,@JsonKey(includeIfNull: false) int? waitlistedCount, int crossPathsPairHeldCount, int crossPathsPairConfirmedCount, Map<String, int> crossPathsPairHeldCohortCounts, bool crossPathsDiscoveryEnabled, EventLifecycleStatus status,@NullableTimestampConverter() DateTime? cancelledAt, String? cancellationReason,@JsonKey(includeIfNull: false) int? setupRevision, bool publicRegistrationEnabled,@JsonKey(includeIfNull: false, unknownEnumValue: EventPublicRegistrationMode.closed) EventPublicRegistrationMode? publicRegistrationMode, int publicRegistrationRevision, EventConstraints constraints,@JsonKey(includeIfNull: false) EventPolicyBundle? eventPolicy,@JsonKey(includeIfNull: false) EventOrigin? eventOrigin,@JsonKey(includeIfNull: false) EventRuntimeAccess? runtimeAccess, Map<String, int> genderCounts, Map<String, int> cohortCounts, Map<String, int> waitlistedCohortCounts
});


@override $EventMeetingLocationCopyWith<$Res>? get meetingLocation;@override $EventConstraintsCopyWith<$Res> get constraints;@override $EventOriginCopyWith<$Res>? get eventOrigin;@override $EventRuntimeAccessCopyWith<$Res>? get runtimeAccess;

}
/// @nodoc
class __$EventCopyWithImpl<$Res>
    implements _$EventCopyWith<$Res> {
  __$EventCopyWithImpl(this._self, this._then);

  final _Event _self;
  final $Res Function(_Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? clubId = null,Object? sourceVenueId = freezed,Object? name = null,Object? startTime = null,Object? eventTimezone = freezed,Object? endTime = null,Object? meetingPoint = null,Object? meetingLocation = freezed,Object? startingPointLat = freezed,Object? startingPointLng = freezed,Object? locationDetails = freezed,Object? itinerary = null,Object? photoUrl = freezed,Object? eventPhotos = null,Object? eventFormat = null,Object? distanceKm = null,Object? pace = null,Object? capacityLimit = null,Object? description = null,Object? priceInPaise = null,Object? currency = null,Object? bookedCount = freezed,Object? checkedInCount = freezed,Object? waitlistedCount = freezed,Object? crossPathsPairHeldCount = null,Object? crossPathsPairConfirmedCount = null,Object? crossPathsPairHeldCohortCounts = null,Object? crossPathsDiscoveryEnabled = null,Object? status = null,Object? cancelledAt = freezed,Object? cancellationReason = freezed,Object? setupRevision = freezed,Object? publicRegistrationEnabled = null,Object? publicRegistrationMode = freezed,Object? publicRegistrationRevision = null,Object? constraints = null,Object? eventPolicy = freezed,Object? eventOrigin = freezed,Object? runtimeAccess = freezed,Object? genderCounts = null,Object? cohortCounts = null,Object? waitlistedCohortCounts = null,}) {
  return _then(_Event(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
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
as int,constraints: null == constraints ? _self.constraints : constraints // ignore: cast_nullable_to_non_nullable
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventOrigin&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.bookingAuthority, bookingAuthority) || other.bookingAuthority == bookingAuthority)&&(identical(other.rosterAuthority, rosterAuthority) || other.rosterAuthority == rosterAuthority)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.externalEventId, externalEventId) || other.externalEventId == externalEventId)&&(identical(other.externalEventUrl, externalEventUrl) || other.externalEventUrl == externalEventUrl)&&(identical(other.sourceExternalEventId, sourceExternalEventId) || other.sourceExternalEventId == sourceExternalEventId)&&(identical(other.adapterVersion, adapterVersion) || other.adapterVersion == adapterVersion)&&(identical(other.connectedAt, connectedAt) || other.connectedAt == connectedAt)&&(identical(other.connectedBy, connectedBy) || other.connectedBy == connectedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,mode,bookingAuthority,rosterAuthority,provider,externalEventId,externalEventUrl,sourceExternalEventId,adapterVersion,connectedAt,connectedBy);

@override
String toString() {
  return 'EventOrigin(mode: $mode, bookingAuthority: $bookingAuthority, rosterAuthority: $rosterAuthority, provider: $provider, externalEventId: $externalEventId, externalEventUrl: $externalEventUrl, sourceExternalEventId: $sourceExternalEventId, adapterVersion: $adapterVersion, connectedAt: $connectedAt, connectedBy: $connectedBy)';
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
  return _then(_self.copyWith(
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
int get hashCode => Object.hash(runtimeType,mode,bookingAuthority,rosterAuthority,provider,externalEventId,externalEventUrl,sourceExternalEventId,adapterVersion,connectedAt,connectedBy);

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventRuntimeAccess&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.publicRuntimeId, publicRuntimeId) || other.publicRuntimeId == publicRuntimeId)&&(identical(other.walkInPolicy, walkInPolicy) || other.walkInPolicy == walkInPolicy)&&(identical(other.termsVersion, termsVersion) || other.termsVersion == termsVersion));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,enabled,publicRuntimeId,walkInPolicy,termsVersion);

@override
String toString() {
  return 'EventRuntimeAccess(enabled: $enabled, publicRuntimeId: $publicRuntimeId, walkInPolicy: $walkInPolicy, termsVersion: $termsVersion)';
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
  return _then(_self.copyWith(
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
int get hashCode => Object.hash(runtimeType,enabled,publicRuntimeId,walkInPolicy,termsVersion);

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
