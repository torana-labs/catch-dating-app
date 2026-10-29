// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_attendee.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventAttendee {

@JsonKey(includeToJson: false) String get id; String get eventId; String get clubId; String get organizerId; String get displayName; String get searchName; EventAttendeeSource get source; EventAttendeeStatus get status; String? get linkedUid; String? get phoneE164; String? get email; String? get externalReference; String? get arrivalGroup; String? get ticketType; int? get revenueAmountMinor; String? get revenueCurrency; EventAttendeeRevenueSource? get revenueSource; EventAttendeeRevenueAllocation? get revenueAllocation; String? get revenueOrderReference; int? get revenueOrderAmountMinor; String? get importId; String? get sourceRowId; ExternalBookingProvider? get provider; String? get providerConnectionId; String? get providerGuestId;@NullableTimestampConverter() DateTime? get providerSyncedAt; int get providerDataRevision;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;@NullableTimestampConverter() DateTime? get registeredAt;@NullableTimestampConverter() DateTime? get waitlistedAt;@NullableTimestampConverter() DateTime? get checkedInAt;@NullableTimestampConverter() DateTime? get cancelledAt; String? get checkedInBy;@NullableTimestampConverter() DateTime? get linkedAt; int get attendanceRevision; EventAttendeeStatus? get preCheckInStatus; EventSuccessAccountabilityResolution? get accountabilityResolution;@NullableTimestampConverter() DateTime? get accountabilityResolvedForCheckInAt;@NullableTimestampConverter() DateTime? get accountabilityResolvedAt; String? get accountabilityResolvedBy;
/// Create a copy of EventAttendee
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventAttendeeCopyWith<EventAttendee> get copyWith => _$EventAttendeeCopyWithImpl<EventAttendee>(this as EventAttendee, _$identity);

  /// Serializes this EventAttendee to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventAttendee&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.searchName, searchName) || other.searchName == searchName)&&(identical(other.source, source) || other.source == source)&&(identical(other.status, status) || other.status == status)&&(identical(other.linkedUid, linkedUid) || other.linkedUid == linkedUid)&&(identical(other.phoneE164, phoneE164) || other.phoneE164 == phoneE164)&&(identical(other.email, email) || other.email == email)&&(identical(other.externalReference, externalReference) || other.externalReference == externalReference)&&(identical(other.arrivalGroup, arrivalGroup) || other.arrivalGroup == arrivalGroup)&&(identical(other.ticketType, ticketType) || other.ticketType == ticketType)&&(identical(other.revenueAmountMinor, revenueAmountMinor) || other.revenueAmountMinor == revenueAmountMinor)&&(identical(other.revenueCurrency, revenueCurrency) || other.revenueCurrency == revenueCurrency)&&(identical(other.revenueSource, revenueSource) || other.revenueSource == revenueSource)&&(identical(other.revenueAllocation, revenueAllocation) || other.revenueAllocation == revenueAllocation)&&(identical(other.revenueOrderReference, revenueOrderReference) || other.revenueOrderReference == revenueOrderReference)&&(identical(other.revenueOrderAmountMinor, revenueOrderAmountMinor) || other.revenueOrderAmountMinor == revenueOrderAmountMinor)&&(identical(other.importId, importId) || other.importId == importId)&&(identical(other.sourceRowId, sourceRowId) || other.sourceRowId == sourceRowId)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.providerConnectionId, providerConnectionId) || other.providerConnectionId == providerConnectionId)&&(identical(other.providerGuestId, providerGuestId) || other.providerGuestId == providerGuestId)&&(identical(other.providerSyncedAt, providerSyncedAt) || other.providerSyncedAt == providerSyncedAt)&&(identical(other.providerDataRevision, providerDataRevision) || other.providerDataRevision == providerDataRevision)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.registeredAt, registeredAt) || other.registeredAt == registeredAt)&&(identical(other.waitlistedAt, waitlistedAt) || other.waitlistedAt == waitlistedAt)&&(identical(other.checkedInAt, checkedInAt) || other.checkedInAt == checkedInAt)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.checkedInBy, checkedInBy) || other.checkedInBy == checkedInBy)&&(identical(other.linkedAt, linkedAt) || other.linkedAt == linkedAt)&&(identical(other.attendanceRevision, attendanceRevision) || other.attendanceRevision == attendanceRevision)&&(identical(other.preCheckInStatus, preCheckInStatus) || other.preCheckInStatus == preCheckInStatus)&&(identical(other.accountabilityResolution, accountabilityResolution) || other.accountabilityResolution == accountabilityResolution)&&(identical(other.accountabilityResolvedForCheckInAt, accountabilityResolvedForCheckInAt) || other.accountabilityResolvedForCheckInAt == accountabilityResolvedForCheckInAt)&&(identical(other.accountabilityResolvedAt, accountabilityResolvedAt) || other.accountabilityResolvedAt == accountabilityResolvedAt)&&(identical(other.accountabilityResolvedBy, accountabilityResolvedBy) || other.accountabilityResolvedBy == accountabilityResolvedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,clubId,organizerId,displayName,searchName,source,status,linkedUid,phoneE164,email,externalReference,arrivalGroup,ticketType,revenueAmountMinor,revenueCurrency,revenueSource,revenueAllocation,revenueOrderReference,revenueOrderAmountMinor,importId,sourceRowId,provider,providerConnectionId,providerGuestId,providerSyncedAt,providerDataRevision,createdAt,updatedAt,registeredAt,waitlistedAt,checkedInAt,cancelledAt,checkedInBy,linkedAt,attendanceRevision,preCheckInStatus,accountabilityResolution,accountabilityResolvedForCheckInAt,accountabilityResolvedAt,accountabilityResolvedBy]);

@override
String toString() {
  return 'EventAttendee(id: $id, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, displayName: $displayName, searchName: $searchName, source: $source, status: $status, linkedUid: $linkedUid, phoneE164: $phoneE164, email: $email, externalReference: $externalReference, arrivalGroup: $arrivalGroup, ticketType: $ticketType, revenueAmountMinor: $revenueAmountMinor, revenueCurrency: $revenueCurrency, revenueSource: $revenueSource, revenueAllocation: $revenueAllocation, revenueOrderReference: $revenueOrderReference, revenueOrderAmountMinor: $revenueOrderAmountMinor, importId: $importId, sourceRowId: $sourceRowId, provider: $provider, providerConnectionId: $providerConnectionId, providerGuestId: $providerGuestId, providerSyncedAt: $providerSyncedAt, providerDataRevision: $providerDataRevision, createdAt: $createdAt, updatedAt: $updatedAt, registeredAt: $registeredAt, waitlistedAt: $waitlistedAt, checkedInAt: $checkedInAt, cancelledAt: $cancelledAt, checkedInBy: $checkedInBy, linkedAt: $linkedAt, attendanceRevision: $attendanceRevision, preCheckInStatus: $preCheckInStatus, accountabilityResolution: $accountabilityResolution, accountabilityResolvedForCheckInAt: $accountabilityResolvedForCheckInAt, accountabilityResolvedAt: $accountabilityResolvedAt, accountabilityResolvedBy: $accountabilityResolvedBy)';
}


}

/// @nodoc
abstract mixin class $EventAttendeeCopyWith<$Res>  {
  factory $EventAttendeeCopyWith(EventAttendee value, $Res Function(EventAttendee) _then) = _$EventAttendeeCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String organizerId, String displayName, String searchName, EventAttendeeSource source, EventAttendeeStatus status, String? linkedUid, String? phoneE164, String? email, String? externalReference, String? arrivalGroup, String? ticketType, int? revenueAmountMinor, String? revenueCurrency, EventAttendeeRevenueSource? revenueSource, EventAttendeeRevenueAllocation? revenueAllocation, String? revenueOrderReference, int? revenueOrderAmountMinor, String? importId, String? sourceRowId, ExternalBookingProvider? provider, String? providerConnectionId, String? providerGuestId,@NullableTimestampConverter() DateTime? providerSyncedAt, int providerDataRevision,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? registeredAt,@NullableTimestampConverter() DateTime? waitlistedAt,@NullableTimestampConverter() DateTime? checkedInAt,@NullableTimestampConverter() DateTime? cancelledAt, String? checkedInBy,@NullableTimestampConverter() DateTime? linkedAt, int attendanceRevision, EventAttendeeStatus? preCheckInStatus, EventSuccessAccountabilityResolution? accountabilityResolution,@NullableTimestampConverter() DateTime? accountabilityResolvedForCheckInAt,@NullableTimestampConverter() DateTime? accountabilityResolvedAt, String? accountabilityResolvedBy
});




}
/// @nodoc
class _$EventAttendeeCopyWithImpl<$Res>
    implements $EventAttendeeCopyWith<$Res> {
  _$EventAttendeeCopyWithImpl(this._self, this._then);

  final EventAttendee _self;
  final $Res Function(EventAttendee) _then;

/// Create a copy of EventAttendee
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? organizerId = null,Object? displayName = null,Object? searchName = null,Object? source = null,Object? status = null,Object? linkedUid = freezed,Object? phoneE164 = freezed,Object? email = freezed,Object? externalReference = freezed,Object? arrivalGroup = freezed,Object? ticketType = freezed,Object? revenueAmountMinor = freezed,Object? revenueCurrency = freezed,Object? revenueSource = freezed,Object? revenueAllocation = freezed,Object? revenueOrderReference = freezed,Object? revenueOrderAmountMinor = freezed,Object? importId = freezed,Object? sourceRowId = freezed,Object? provider = freezed,Object? providerConnectionId = freezed,Object? providerGuestId = freezed,Object? providerSyncedAt = freezed,Object? providerDataRevision = null,Object? createdAt = null,Object? updatedAt = null,Object? registeredAt = freezed,Object? waitlistedAt = freezed,Object? checkedInAt = freezed,Object? cancelledAt = freezed,Object? checkedInBy = freezed,Object? linkedAt = freezed,Object? attendanceRevision = null,Object? preCheckInStatus = freezed,Object? accountabilityResolution = freezed,Object? accountabilityResolvedForCheckInAt = freezed,Object? accountabilityResolvedAt = freezed,Object? accountabilityResolvedBy = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,searchName: null == searchName ? _self.searchName : searchName // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as EventAttendeeSource,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventAttendeeStatus,linkedUid: freezed == linkedUid ? _self.linkedUid : linkedUid // ignore: cast_nullable_to_non_nullable
as String?,phoneE164: freezed == phoneE164 ? _self.phoneE164 : phoneE164 // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,externalReference: freezed == externalReference ? _self.externalReference : externalReference // ignore: cast_nullable_to_non_nullable
as String?,arrivalGroup: freezed == arrivalGroup ? _self.arrivalGroup : arrivalGroup // ignore: cast_nullable_to_non_nullable
as String?,ticketType: freezed == ticketType ? _self.ticketType : ticketType // ignore: cast_nullable_to_non_nullable
as String?,revenueAmountMinor: freezed == revenueAmountMinor ? _self.revenueAmountMinor : revenueAmountMinor // ignore: cast_nullable_to_non_nullable
as int?,revenueCurrency: freezed == revenueCurrency ? _self.revenueCurrency : revenueCurrency // ignore: cast_nullable_to_non_nullable
as String?,revenueSource: freezed == revenueSource ? _self.revenueSource : revenueSource // ignore: cast_nullable_to_non_nullable
as EventAttendeeRevenueSource?,revenueAllocation: freezed == revenueAllocation ? _self.revenueAllocation : revenueAllocation // ignore: cast_nullable_to_non_nullable
as EventAttendeeRevenueAllocation?,revenueOrderReference: freezed == revenueOrderReference ? _self.revenueOrderReference : revenueOrderReference // ignore: cast_nullable_to_non_nullable
as String?,revenueOrderAmountMinor: freezed == revenueOrderAmountMinor ? _self.revenueOrderAmountMinor : revenueOrderAmountMinor // ignore: cast_nullable_to_non_nullable
as int?,importId: freezed == importId ? _self.importId : importId // ignore: cast_nullable_to_non_nullable
as String?,sourceRowId: freezed == sourceRowId ? _self.sourceRowId : sourceRowId // ignore: cast_nullable_to_non_nullable
as String?,provider: freezed == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider?,providerConnectionId: freezed == providerConnectionId ? _self.providerConnectionId : providerConnectionId // ignore: cast_nullable_to_non_nullable
as String?,providerGuestId: freezed == providerGuestId ? _self.providerGuestId : providerGuestId // ignore: cast_nullable_to_non_nullable
as String?,providerSyncedAt: freezed == providerSyncedAt ? _self.providerSyncedAt : providerSyncedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,providerDataRevision: null == providerDataRevision ? _self.providerDataRevision : providerDataRevision // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,registeredAt: freezed == registeredAt ? _self.registeredAt : registeredAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistedAt: freezed == waitlistedAt ? _self.waitlistedAt : waitlistedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,checkedInAt: freezed == checkedInAt ? _self.checkedInAt : checkedInAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,checkedInBy: freezed == checkedInBy ? _self.checkedInBy : checkedInBy // ignore: cast_nullable_to_non_nullable
as String?,linkedAt: freezed == linkedAt ? _self.linkedAt : linkedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendanceRevision: null == attendanceRevision ? _self.attendanceRevision : attendanceRevision // ignore: cast_nullable_to_non_nullable
as int,preCheckInStatus: freezed == preCheckInStatus ? _self.preCheckInStatus : preCheckInStatus // ignore: cast_nullable_to_non_nullable
as EventAttendeeStatus?,accountabilityResolution: freezed == accountabilityResolution ? _self.accountabilityResolution : accountabilityResolution // ignore: cast_nullable_to_non_nullable
as EventSuccessAccountabilityResolution?,accountabilityResolvedForCheckInAt: freezed == accountabilityResolvedForCheckInAt ? _self.accountabilityResolvedForCheckInAt : accountabilityResolvedForCheckInAt // ignore: cast_nullable_to_non_nullable
as DateTime?,accountabilityResolvedAt: freezed == accountabilityResolvedAt ? _self.accountabilityResolvedAt : accountabilityResolvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,accountabilityResolvedBy: freezed == accountabilityResolvedBy ? _self.accountabilityResolvedBy : accountabilityResolvedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventAttendee].
extension EventAttendeePatterns on EventAttendee {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventAttendee value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventAttendee() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventAttendee value)  $default,){
final _that = this;
switch (_that) {
case _EventAttendee():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventAttendee value)?  $default,){
final _that = this;
switch (_that) {
case _EventAttendee() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String displayName,  String searchName,  EventAttendeeSource source,  EventAttendeeStatus status,  String? linkedUid,  String? phoneE164,  String? email,  String? externalReference,  String? arrivalGroup,  String? ticketType,  int? revenueAmountMinor,  String? revenueCurrency,  EventAttendeeRevenueSource? revenueSource,  EventAttendeeRevenueAllocation? revenueAllocation,  String? revenueOrderReference,  int? revenueOrderAmountMinor,  String? importId,  String? sourceRowId,  ExternalBookingProvider? provider,  String? providerConnectionId,  String? providerGuestId, @NullableTimestampConverter()  DateTime? providerSyncedAt,  int providerDataRevision, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? registeredAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? checkedInAt, @NullableTimestampConverter()  DateTime? cancelledAt,  String? checkedInBy, @NullableTimestampConverter()  DateTime? linkedAt,  int attendanceRevision,  EventAttendeeStatus? preCheckInStatus,  EventSuccessAccountabilityResolution? accountabilityResolution, @NullableTimestampConverter()  DateTime? accountabilityResolvedForCheckInAt, @NullableTimestampConverter()  DateTime? accountabilityResolvedAt,  String? accountabilityResolvedBy)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventAttendee() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.displayName,_that.searchName,_that.source,_that.status,_that.linkedUid,_that.phoneE164,_that.email,_that.externalReference,_that.arrivalGroup,_that.ticketType,_that.revenueAmountMinor,_that.revenueCurrency,_that.revenueSource,_that.revenueAllocation,_that.revenueOrderReference,_that.revenueOrderAmountMinor,_that.importId,_that.sourceRowId,_that.provider,_that.providerConnectionId,_that.providerGuestId,_that.providerSyncedAt,_that.providerDataRevision,_that.createdAt,_that.updatedAt,_that.registeredAt,_that.waitlistedAt,_that.checkedInAt,_that.cancelledAt,_that.checkedInBy,_that.linkedAt,_that.attendanceRevision,_that.preCheckInStatus,_that.accountabilityResolution,_that.accountabilityResolvedForCheckInAt,_that.accountabilityResolvedAt,_that.accountabilityResolvedBy);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String displayName,  String searchName,  EventAttendeeSource source,  EventAttendeeStatus status,  String? linkedUid,  String? phoneE164,  String? email,  String? externalReference,  String? arrivalGroup,  String? ticketType,  int? revenueAmountMinor,  String? revenueCurrency,  EventAttendeeRevenueSource? revenueSource,  EventAttendeeRevenueAllocation? revenueAllocation,  String? revenueOrderReference,  int? revenueOrderAmountMinor,  String? importId,  String? sourceRowId,  ExternalBookingProvider? provider,  String? providerConnectionId,  String? providerGuestId, @NullableTimestampConverter()  DateTime? providerSyncedAt,  int providerDataRevision, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? registeredAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? checkedInAt, @NullableTimestampConverter()  DateTime? cancelledAt,  String? checkedInBy, @NullableTimestampConverter()  DateTime? linkedAt,  int attendanceRevision,  EventAttendeeStatus? preCheckInStatus,  EventSuccessAccountabilityResolution? accountabilityResolution, @NullableTimestampConverter()  DateTime? accountabilityResolvedForCheckInAt, @NullableTimestampConverter()  DateTime? accountabilityResolvedAt,  String? accountabilityResolvedBy)  $default,) {final _that = this;
switch (_that) {
case _EventAttendee():
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.displayName,_that.searchName,_that.source,_that.status,_that.linkedUid,_that.phoneE164,_that.email,_that.externalReference,_that.arrivalGroup,_that.ticketType,_that.revenueAmountMinor,_that.revenueCurrency,_that.revenueSource,_that.revenueAllocation,_that.revenueOrderReference,_that.revenueOrderAmountMinor,_that.importId,_that.sourceRowId,_that.provider,_that.providerConnectionId,_that.providerGuestId,_that.providerSyncedAt,_that.providerDataRevision,_that.createdAt,_that.updatedAt,_that.registeredAt,_that.waitlistedAt,_that.checkedInAt,_that.cancelledAt,_that.checkedInBy,_that.linkedAt,_that.attendanceRevision,_that.preCheckInStatus,_that.accountabilityResolution,_that.accountabilityResolvedForCheckInAt,_that.accountabilityResolvedAt,_that.accountabilityResolvedBy);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String displayName,  String searchName,  EventAttendeeSource source,  EventAttendeeStatus status,  String? linkedUid,  String? phoneE164,  String? email,  String? externalReference,  String? arrivalGroup,  String? ticketType,  int? revenueAmountMinor,  String? revenueCurrency,  EventAttendeeRevenueSource? revenueSource,  EventAttendeeRevenueAllocation? revenueAllocation,  String? revenueOrderReference,  int? revenueOrderAmountMinor,  String? importId,  String? sourceRowId,  ExternalBookingProvider? provider,  String? providerConnectionId,  String? providerGuestId, @NullableTimestampConverter()  DateTime? providerSyncedAt,  int providerDataRevision, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? registeredAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? checkedInAt, @NullableTimestampConverter()  DateTime? cancelledAt,  String? checkedInBy, @NullableTimestampConverter()  DateTime? linkedAt,  int attendanceRevision,  EventAttendeeStatus? preCheckInStatus,  EventSuccessAccountabilityResolution? accountabilityResolution, @NullableTimestampConverter()  DateTime? accountabilityResolvedForCheckInAt, @NullableTimestampConverter()  DateTime? accountabilityResolvedAt,  String? accountabilityResolvedBy)?  $default,) {final _that = this;
switch (_that) {
case _EventAttendee() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.displayName,_that.searchName,_that.source,_that.status,_that.linkedUid,_that.phoneE164,_that.email,_that.externalReference,_that.arrivalGroup,_that.ticketType,_that.revenueAmountMinor,_that.revenueCurrency,_that.revenueSource,_that.revenueAllocation,_that.revenueOrderReference,_that.revenueOrderAmountMinor,_that.importId,_that.sourceRowId,_that.provider,_that.providerConnectionId,_that.providerGuestId,_that.providerSyncedAt,_that.providerDataRevision,_that.createdAt,_that.updatedAt,_that.registeredAt,_that.waitlistedAt,_that.checkedInAt,_that.cancelledAt,_that.checkedInBy,_that.linkedAt,_that.attendanceRevision,_that.preCheckInStatus,_that.accountabilityResolution,_that.accountabilityResolvedForCheckInAt,_that.accountabilityResolvedAt,_that.accountabilityResolvedBy);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventAttendee extends EventAttendee {
  const _EventAttendee({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.clubId, required this.organizerId, required this.displayName, required this.searchName, required this.source, required this.status, this.linkedUid, this.phoneE164, this.email, this.externalReference, this.arrivalGroup, this.ticketType, this.revenueAmountMinor, this.revenueCurrency, this.revenueSource, this.revenueAllocation, this.revenueOrderReference, this.revenueOrderAmountMinor, this.importId, this.sourceRowId, this.provider, this.providerConnectionId, this.providerGuestId, @NullableTimestampConverter() this.providerSyncedAt, this.providerDataRevision = 0, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt, @NullableTimestampConverter() this.registeredAt, @NullableTimestampConverter() this.waitlistedAt, @NullableTimestampConverter() this.checkedInAt, @NullableTimestampConverter() this.cancelledAt, this.checkedInBy, @NullableTimestampConverter() this.linkedAt, this.attendanceRevision = 0, this.preCheckInStatus, this.accountabilityResolution, @NullableTimestampConverter() this.accountabilityResolvedForCheckInAt, @NullableTimestampConverter() this.accountabilityResolvedAt, this.accountabilityResolvedBy}): super._();
  factory _EventAttendee.fromJson(Map<String, dynamic> json) => _$EventAttendeeFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String clubId;
@override final  String organizerId;
@override final  String displayName;
@override final  String searchName;
@override final  EventAttendeeSource source;
@override final  EventAttendeeStatus status;
@override final  String? linkedUid;
@override final  String? phoneE164;
@override final  String? email;
@override final  String? externalReference;
@override final  String? arrivalGroup;
@override final  String? ticketType;
@override final  int? revenueAmountMinor;
@override final  String? revenueCurrency;
@override final  EventAttendeeRevenueSource? revenueSource;
@override final  EventAttendeeRevenueAllocation? revenueAllocation;
@override final  String? revenueOrderReference;
@override final  int? revenueOrderAmountMinor;
@override final  String? importId;
@override final  String? sourceRowId;
@override final  ExternalBookingProvider? provider;
@override final  String? providerConnectionId;
@override final  String? providerGuestId;
@override@NullableTimestampConverter() final  DateTime? providerSyncedAt;
@override@JsonKey() final  int providerDataRevision;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;
@override@NullableTimestampConverter() final  DateTime? registeredAt;
@override@NullableTimestampConverter() final  DateTime? waitlistedAt;
@override@NullableTimestampConverter() final  DateTime? checkedInAt;
@override@NullableTimestampConverter() final  DateTime? cancelledAt;
@override final  String? checkedInBy;
@override@NullableTimestampConverter() final  DateTime? linkedAt;
@override@JsonKey() final  int attendanceRevision;
@override final  EventAttendeeStatus? preCheckInStatus;
@override final  EventSuccessAccountabilityResolution? accountabilityResolution;
@override@NullableTimestampConverter() final  DateTime? accountabilityResolvedForCheckInAt;
@override@NullableTimestampConverter() final  DateTime? accountabilityResolvedAt;
@override final  String? accountabilityResolvedBy;

/// Create a copy of EventAttendee
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventAttendeeCopyWith<_EventAttendee> get copyWith => __$EventAttendeeCopyWithImpl<_EventAttendee>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventAttendeeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventAttendee&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.searchName, searchName) || other.searchName == searchName)&&(identical(other.source, source) || other.source == source)&&(identical(other.status, status) || other.status == status)&&(identical(other.linkedUid, linkedUid) || other.linkedUid == linkedUid)&&(identical(other.phoneE164, phoneE164) || other.phoneE164 == phoneE164)&&(identical(other.email, email) || other.email == email)&&(identical(other.externalReference, externalReference) || other.externalReference == externalReference)&&(identical(other.arrivalGroup, arrivalGroup) || other.arrivalGroup == arrivalGroup)&&(identical(other.ticketType, ticketType) || other.ticketType == ticketType)&&(identical(other.revenueAmountMinor, revenueAmountMinor) || other.revenueAmountMinor == revenueAmountMinor)&&(identical(other.revenueCurrency, revenueCurrency) || other.revenueCurrency == revenueCurrency)&&(identical(other.revenueSource, revenueSource) || other.revenueSource == revenueSource)&&(identical(other.revenueAllocation, revenueAllocation) || other.revenueAllocation == revenueAllocation)&&(identical(other.revenueOrderReference, revenueOrderReference) || other.revenueOrderReference == revenueOrderReference)&&(identical(other.revenueOrderAmountMinor, revenueOrderAmountMinor) || other.revenueOrderAmountMinor == revenueOrderAmountMinor)&&(identical(other.importId, importId) || other.importId == importId)&&(identical(other.sourceRowId, sourceRowId) || other.sourceRowId == sourceRowId)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.providerConnectionId, providerConnectionId) || other.providerConnectionId == providerConnectionId)&&(identical(other.providerGuestId, providerGuestId) || other.providerGuestId == providerGuestId)&&(identical(other.providerSyncedAt, providerSyncedAt) || other.providerSyncedAt == providerSyncedAt)&&(identical(other.providerDataRevision, providerDataRevision) || other.providerDataRevision == providerDataRevision)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.registeredAt, registeredAt) || other.registeredAt == registeredAt)&&(identical(other.waitlistedAt, waitlistedAt) || other.waitlistedAt == waitlistedAt)&&(identical(other.checkedInAt, checkedInAt) || other.checkedInAt == checkedInAt)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.checkedInBy, checkedInBy) || other.checkedInBy == checkedInBy)&&(identical(other.linkedAt, linkedAt) || other.linkedAt == linkedAt)&&(identical(other.attendanceRevision, attendanceRevision) || other.attendanceRevision == attendanceRevision)&&(identical(other.preCheckInStatus, preCheckInStatus) || other.preCheckInStatus == preCheckInStatus)&&(identical(other.accountabilityResolution, accountabilityResolution) || other.accountabilityResolution == accountabilityResolution)&&(identical(other.accountabilityResolvedForCheckInAt, accountabilityResolvedForCheckInAt) || other.accountabilityResolvedForCheckInAt == accountabilityResolvedForCheckInAt)&&(identical(other.accountabilityResolvedAt, accountabilityResolvedAt) || other.accountabilityResolvedAt == accountabilityResolvedAt)&&(identical(other.accountabilityResolvedBy, accountabilityResolvedBy) || other.accountabilityResolvedBy == accountabilityResolvedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,clubId,organizerId,displayName,searchName,source,status,linkedUid,phoneE164,email,externalReference,arrivalGroup,ticketType,revenueAmountMinor,revenueCurrency,revenueSource,revenueAllocation,revenueOrderReference,revenueOrderAmountMinor,importId,sourceRowId,provider,providerConnectionId,providerGuestId,providerSyncedAt,providerDataRevision,createdAt,updatedAt,registeredAt,waitlistedAt,checkedInAt,cancelledAt,checkedInBy,linkedAt,attendanceRevision,preCheckInStatus,accountabilityResolution,accountabilityResolvedForCheckInAt,accountabilityResolvedAt,accountabilityResolvedBy]);

@override
String toString() {
  return 'EventAttendee(id: $id, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, displayName: $displayName, searchName: $searchName, source: $source, status: $status, linkedUid: $linkedUid, phoneE164: $phoneE164, email: $email, externalReference: $externalReference, arrivalGroup: $arrivalGroup, ticketType: $ticketType, revenueAmountMinor: $revenueAmountMinor, revenueCurrency: $revenueCurrency, revenueSource: $revenueSource, revenueAllocation: $revenueAllocation, revenueOrderReference: $revenueOrderReference, revenueOrderAmountMinor: $revenueOrderAmountMinor, importId: $importId, sourceRowId: $sourceRowId, provider: $provider, providerConnectionId: $providerConnectionId, providerGuestId: $providerGuestId, providerSyncedAt: $providerSyncedAt, providerDataRevision: $providerDataRevision, createdAt: $createdAt, updatedAt: $updatedAt, registeredAt: $registeredAt, waitlistedAt: $waitlistedAt, checkedInAt: $checkedInAt, cancelledAt: $cancelledAt, checkedInBy: $checkedInBy, linkedAt: $linkedAt, attendanceRevision: $attendanceRevision, preCheckInStatus: $preCheckInStatus, accountabilityResolution: $accountabilityResolution, accountabilityResolvedForCheckInAt: $accountabilityResolvedForCheckInAt, accountabilityResolvedAt: $accountabilityResolvedAt, accountabilityResolvedBy: $accountabilityResolvedBy)';
}


}

/// @nodoc
abstract mixin class _$EventAttendeeCopyWith<$Res> implements $EventAttendeeCopyWith<$Res> {
  factory _$EventAttendeeCopyWith(_EventAttendee value, $Res Function(_EventAttendee) _then) = __$EventAttendeeCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String organizerId, String displayName, String searchName, EventAttendeeSource source, EventAttendeeStatus status, String? linkedUid, String? phoneE164, String? email, String? externalReference, String? arrivalGroup, String? ticketType, int? revenueAmountMinor, String? revenueCurrency, EventAttendeeRevenueSource? revenueSource, EventAttendeeRevenueAllocation? revenueAllocation, String? revenueOrderReference, int? revenueOrderAmountMinor, String? importId, String? sourceRowId, ExternalBookingProvider? provider, String? providerConnectionId, String? providerGuestId,@NullableTimestampConverter() DateTime? providerSyncedAt, int providerDataRevision,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? registeredAt,@NullableTimestampConverter() DateTime? waitlistedAt,@NullableTimestampConverter() DateTime? checkedInAt,@NullableTimestampConverter() DateTime? cancelledAt, String? checkedInBy,@NullableTimestampConverter() DateTime? linkedAt, int attendanceRevision, EventAttendeeStatus? preCheckInStatus, EventSuccessAccountabilityResolution? accountabilityResolution,@NullableTimestampConverter() DateTime? accountabilityResolvedForCheckInAt,@NullableTimestampConverter() DateTime? accountabilityResolvedAt, String? accountabilityResolvedBy
});




}
/// @nodoc
class __$EventAttendeeCopyWithImpl<$Res>
    implements _$EventAttendeeCopyWith<$Res> {
  __$EventAttendeeCopyWithImpl(this._self, this._then);

  final _EventAttendee _self;
  final $Res Function(_EventAttendee) _then;

/// Create a copy of EventAttendee
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? organizerId = null,Object? displayName = null,Object? searchName = null,Object? source = null,Object? status = null,Object? linkedUid = freezed,Object? phoneE164 = freezed,Object? email = freezed,Object? externalReference = freezed,Object? arrivalGroup = freezed,Object? ticketType = freezed,Object? revenueAmountMinor = freezed,Object? revenueCurrency = freezed,Object? revenueSource = freezed,Object? revenueAllocation = freezed,Object? revenueOrderReference = freezed,Object? revenueOrderAmountMinor = freezed,Object? importId = freezed,Object? sourceRowId = freezed,Object? provider = freezed,Object? providerConnectionId = freezed,Object? providerGuestId = freezed,Object? providerSyncedAt = freezed,Object? providerDataRevision = null,Object? createdAt = null,Object? updatedAt = null,Object? registeredAt = freezed,Object? waitlistedAt = freezed,Object? checkedInAt = freezed,Object? cancelledAt = freezed,Object? checkedInBy = freezed,Object? linkedAt = freezed,Object? attendanceRevision = null,Object? preCheckInStatus = freezed,Object? accountabilityResolution = freezed,Object? accountabilityResolvedForCheckInAt = freezed,Object? accountabilityResolvedAt = freezed,Object? accountabilityResolvedBy = freezed,}) {
  return _then(_EventAttendee(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,searchName: null == searchName ? _self.searchName : searchName // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as EventAttendeeSource,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventAttendeeStatus,linkedUid: freezed == linkedUid ? _self.linkedUid : linkedUid // ignore: cast_nullable_to_non_nullable
as String?,phoneE164: freezed == phoneE164 ? _self.phoneE164 : phoneE164 // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,externalReference: freezed == externalReference ? _self.externalReference : externalReference // ignore: cast_nullable_to_non_nullable
as String?,arrivalGroup: freezed == arrivalGroup ? _self.arrivalGroup : arrivalGroup // ignore: cast_nullable_to_non_nullable
as String?,ticketType: freezed == ticketType ? _self.ticketType : ticketType // ignore: cast_nullable_to_non_nullable
as String?,revenueAmountMinor: freezed == revenueAmountMinor ? _self.revenueAmountMinor : revenueAmountMinor // ignore: cast_nullable_to_non_nullable
as int?,revenueCurrency: freezed == revenueCurrency ? _self.revenueCurrency : revenueCurrency // ignore: cast_nullable_to_non_nullable
as String?,revenueSource: freezed == revenueSource ? _self.revenueSource : revenueSource // ignore: cast_nullable_to_non_nullable
as EventAttendeeRevenueSource?,revenueAllocation: freezed == revenueAllocation ? _self.revenueAllocation : revenueAllocation // ignore: cast_nullable_to_non_nullable
as EventAttendeeRevenueAllocation?,revenueOrderReference: freezed == revenueOrderReference ? _self.revenueOrderReference : revenueOrderReference // ignore: cast_nullable_to_non_nullable
as String?,revenueOrderAmountMinor: freezed == revenueOrderAmountMinor ? _self.revenueOrderAmountMinor : revenueOrderAmountMinor // ignore: cast_nullable_to_non_nullable
as int?,importId: freezed == importId ? _self.importId : importId // ignore: cast_nullable_to_non_nullable
as String?,sourceRowId: freezed == sourceRowId ? _self.sourceRowId : sourceRowId // ignore: cast_nullable_to_non_nullable
as String?,provider: freezed == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as ExternalBookingProvider?,providerConnectionId: freezed == providerConnectionId ? _self.providerConnectionId : providerConnectionId // ignore: cast_nullable_to_non_nullable
as String?,providerGuestId: freezed == providerGuestId ? _self.providerGuestId : providerGuestId // ignore: cast_nullable_to_non_nullable
as String?,providerSyncedAt: freezed == providerSyncedAt ? _self.providerSyncedAt : providerSyncedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,providerDataRevision: null == providerDataRevision ? _self.providerDataRevision : providerDataRevision // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,registeredAt: freezed == registeredAt ? _self.registeredAt : registeredAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistedAt: freezed == waitlistedAt ? _self.waitlistedAt : waitlistedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,checkedInAt: freezed == checkedInAt ? _self.checkedInAt : checkedInAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,checkedInBy: freezed == checkedInBy ? _self.checkedInBy : checkedInBy // ignore: cast_nullable_to_non_nullable
as String?,linkedAt: freezed == linkedAt ? _self.linkedAt : linkedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendanceRevision: null == attendanceRevision ? _self.attendanceRevision : attendanceRevision // ignore: cast_nullable_to_non_nullable
as int,preCheckInStatus: freezed == preCheckInStatus ? _self.preCheckInStatus : preCheckInStatus // ignore: cast_nullable_to_non_nullable
as EventAttendeeStatus?,accountabilityResolution: freezed == accountabilityResolution ? _self.accountabilityResolution : accountabilityResolution // ignore: cast_nullable_to_non_nullable
as EventSuccessAccountabilityResolution?,accountabilityResolvedForCheckInAt: freezed == accountabilityResolvedForCheckInAt ? _self.accountabilityResolvedForCheckInAt : accountabilityResolvedForCheckInAt // ignore: cast_nullable_to_non_nullable
as DateTime?,accountabilityResolvedAt: freezed == accountabilityResolvedAt ? _self.accountabilityResolvedAt : accountabilityResolvedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,accountabilityResolvedBy: freezed == accountabilityResolvedBy ? _self.accountabilityResolvedBy : accountabilityResolvedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
