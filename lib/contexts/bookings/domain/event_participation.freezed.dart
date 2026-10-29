// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_participation.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventParticipation {

@JsonKey(includeToJson: false) String get id; String get eventId; String get clubId; String get uid; EventParticipationStatus get status;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;@NullableTimestampConverter() DateTime? get signedUpAt;@NullableTimestampConverter() DateTime? get waitlistedAt;@NullableTimestampConverter() DateTime? get attendedAt;@NullableTimestampConverter() DateTime? get cancelledAt;@NullableTimestampConverter() DateTime? get deletedAt;@JsonKey() Gender? get genderAtSignup; String? get cohortAtSignup; String? get paymentId;@JsonKey() EventJoinRequestStatus? get hostApprovalStatus;@NullableTimestampConverter() DateTime? get hostApprovalDecidedAt; String? get hostApprovalDecidedBy;@JsonKey() EventWaitlistOfferStatus? get waitlistOfferStatus;@NullableTimestampConverter() DateTime? get waitlistOfferedAt;@NullableTimestampConverter() DateTime? get waitlistOfferExpiresAt;@NullableTimestampConverter() DateTime? get waitlistOfferAcceptedAt; String? get waitlistOfferId; String? get inviteLinkId; String? get inviteSource;@NullableTimestampConverter() DateTime? get inviteCapturedAt;
/// Create a copy of EventParticipation
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventParticipationCopyWith<EventParticipation> get copyWith => _$EventParticipationCopyWithImpl<EventParticipation>(this as EventParticipation, _$identity);

  /// Serializes this EventParticipation to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventParticipation&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.status, status) || other.status == status)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.signedUpAt, signedUpAt) || other.signedUpAt == signedUpAt)&&(identical(other.waitlistedAt, waitlistedAt) || other.waitlistedAt == waitlistedAt)&&(identical(other.attendedAt, attendedAt) || other.attendedAt == attendedAt)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt)&&(identical(other.genderAtSignup, genderAtSignup) || other.genderAtSignup == genderAtSignup)&&(identical(other.cohortAtSignup, cohortAtSignup) || other.cohortAtSignup == cohortAtSignup)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.hostApprovalStatus, hostApprovalStatus) || other.hostApprovalStatus == hostApprovalStatus)&&(identical(other.hostApprovalDecidedAt, hostApprovalDecidedAt) || other.hostApprovalDecidedAt == hostApprovalDecidedAt)&&(identical(other.hostApprovalDecidedBy, hostApprovalDecidedBy) || other.hostApprovalDecidedBy == hostApprovalDecidedBy)&&(identical(other.waitlistOfferStatus, waitlistOfferStatus) || other.waitlistOfferStatus == waitlistOfferStatus)&&(identical(other.waitlistOfferedAt, waitlistOfferedAt) || other.waitlistOfferedAt == waitlistOfferedAt)&&(identical(other.waitlistOfferExpiresAt, waitlistOfferExpiresAt) || other.waitlistOfferExpiresAt == waitlistOfferExpiresAt)&&(identical(other.waitlistOfferAcceptedAt, waitlistOfferAcceptedAt) || other.waitlistOfferAcceptedAt == waitlistOfferAcceptedAt)&&(identical(other.waitlistOfferId, waitlistOfferId) || other.waitlistOfferId == waitlistOfferId)&&(identical(other.inviteLinkId, inviteLinkId) || other.inviteLinkId == inviteLinkId)&&(identical(other.inviteSource, inviteSource) || other.inviteSource == inviteSource)&&(identical(other.inviteCapturedAt, inviteCapturedAt) || other.inviteCapturedAt == inviteCapturedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,clubId,uid,status,createdAt,updatedAt,signedUpAt,waitlistedAt,attendedAt,cancelledAt,deletedAt,genderAtSignup,cohortAtSignup,paymentId,hostApprovalStatus,hostApprovalDecidedAt,hostApprovalDecidedBy,waitlistOfferStatus,waitlistOfferedAt,waitlistOfferExpiresAt,waitlistOfferAcceptedAt,waitlistOfferId,inviteLinkId,inviteSource,inviteCapturedAt]);

@override
String toString() {
  return 'EventParticipation(id: $id, eventId: $eventId, clubId: $clubId, uid: $uid, status: $status, createdAt: $createdAt, updatedAt: $updatedAt, signedUpAt: $signedUpAt, waitlistedAt: $waitlistedAt, attendedAt: $attendedAt, cancelledAt: $cancelledAt, deletedAt: $deletedAt, genderAtSignup: $genderAtSignup, cohortAtSignup: $cohortAtSignup, paymentId: $paymentId, hostApprovalStatus: $hostApprovalStatus, hostApprovalDecidedAt: $hostApprovalDecidedAt, hostApprovalDecidedBy: $hostApprovalDecidedBy, waitlistOfferStatus: $waitlistOfferStatus, waitlistOfferedAt: $waitlistOfferedAt, waitlistOfferExpiresAt: $waitlistOfferExpiresAt, waitlistOfferAcceptedAt: $waitlistOfferAcceptedAt, waitlistOfferId: $waitlistOfferId, inviteLinkId: $inviteLinkId, inviteSource: $inviteSource, inviteCapturedAt: $inviteCapturedAt)';
}


}

/// @nodoc
abstract mixin class $EventParticipationCopyWith<$Res>  {
  factory $EventParticipationCopyWith(EventParticipation value, $Res Function(EventParticipation) _then) = _$EventParticipationCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String uid, EventParticipationStatus status,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? signedUpAt,@NullableTimestampConverter() DateTime? waitlistedAt,@NullableTimestampConverter() DateTime? attendedAt,@NullableTimestampConverter() DateTime? cancelledAt,@NullableTimestampConverter() DateTime? deletedAt,@JsonKey() Gender? genderAtSignup, String? cohortAtSignup, String? paymentId,@JsonKey() EventJoinRequestStatus? hostApprovalStatus,@NullableTimestampConverter() DateTime? hostApprovalDecidedAt, String? hostApprovalDecidedBy,@JsonKey() EventWaitlistOfferStatus? waitlistOfferStatus,@NullableTimestampConverter() DateTime? waitlistOfferedAt,@NullableTimestampConverter() DateTime? waitlistOfferExpiresAt,@NullableTimestampConverter() DateTime? waitlistOfferAcceptedAt, String? waitlistOfferId, String? inviteLinkId, String? inviteSource,@NullableTimestampConverter() DateTime? inviteCapturedAt
});




}
/// @nodoc
class _$EventParticipationCopyWithImpl<$Res>
    implements $EventParticipationCopyWith<$Res> {
  _$EventParticipationCopyWithImpl(this._self, this._then);

  final EventParticipation _self;
  final $Res Function(EventParticipation) _then;

/// Create a copy of EventParticipation
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? uid = null,Object? status = null,Object? createdAt = null,Object? updatedAt = null,Object? signedUpAt = freezed,Object? waitlistedAt = freezed,Object? attendedAt = freezed,Object? cancelledAt = freezed,Object? deletedAt = freezed,Object? genderAtSignup = freezed,Object? cohortAtSignup = freezed,Object? paymentId = freezed,Object? hostApprovalStatus = freezed,Object? hostApprovalDecidedAt = freezed,Object? hostApprovalDecidedBy = freezed,Object? waitlistOfferStatus = freezed,Object? waitlistOfferedAt = freezed,Object? waitlistOfferExpiresAt = freezed,Object? waitlistOfferAcceptedAt = freezed,Object? waitlistOfferId = freezed,Object? inviteLinkId = freezed,Object? inviteSource = freezed,Object? inviteCapturedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventParticipationStatus,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,signedUpAt: freezed == signedUpAt ? _self.signedUpAt : signedUpAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistedAt: freezed == waitlistedAt ? _self.waitlistedAt : waitlistedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendedAt: freezed == attendedAt ? _self.attendedAt : attendedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,genderAtSignup: freezed == genderAtSignup ? _self.genderAtSignup : genderAtSignup // ignore: cast_nullable_to_non_nullable
as Gender?,cohortAtSignup: freezed == cohortAtSignup ? _self.cohortAtSignup : cohortAtSignup // ignore: cast_nullable_to_non_nullable
as String?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,hostApprovalStatus: freezed == hostApprovalStatus ? _self.hostApprovalStatus : hostApprovalStatus // ignore: cast_nullable_to_non_nullable
as EventJoinRequestStatus?,hostApprovalDecidedAt: freezed == hostApprovalDecidedAt ? _self.hostApprovalDecidedAt : hostApprovalDecidedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,hostApprovalDecidedBy: freezed == hostApprovalDecidedBy ? _self.hostApprovalDecidedBy : hostApprovalDecidedBy // ignore: cast_nullable_to_non_nullable
as String?,waitlistOfferStatus: freezed == waitlistOfferStatus ? _self.waitlistOfferStatus : waitlistOfferStatus // ignore: cast_nullable_to_non_nullable
as EventWaitlistOfferStatus?,waitlistOfferedAt: freezed == waitlistOfferedAt ? _self.waitlistOfferedAt : waitlistOfferedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferExpiresAt: freezed == waitlistOfferExpiresAt ? _self.waitlistOfferExpiresAt : waitlistOfferExpiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferAcceptedAt: freezed == waitlistOfferAcceptedAt ? _self.waitlistOfferAcceptedAt : waitlistOfferAcceptedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferId: freezed == waitlistOfferId ? _self.waitlistOfferId : waitlistOfferId // ignore: cast_nullable_to_non_nullable
as String?,inviteLinkId: freezed == inviteLinkId ? _self.inviteLinkId : inviteLinkId // ignore: cast_nullable_to_non_nullable
as String?,inviteSource: freezed == inviteSource ? _self.inviteSource : inviteSource // ignore: cast_nullable_to_non_nullable
as String?,inviteCapturedAt: freezed == inviteCapturedAt ? _self.inviteCapturedAt : inviteCapturedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventParticipation].
extension EventParticipationPatterns on EventParticipation {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventParticipation value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventParticipation() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventParticipation value)  $default,){
final _that = this;
switch (_that) {
case _EventParticipation():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventParticipation value)?  $default,){
final _that = this;
switch (_that) {
case _EventParticipation() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String uid,  EventParticipationStatus status, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? signedUpAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? attendedAt, @NullableTimestampConverter()  DateTime? cancelledAt, @NullableTimestampConverter()  DateTime? deletedAt, @JsonKey()  Gender? genderAtSignup,  String? cohortAtSignup,  String? paymentId, @JsonKey()  EventJoinRequestStatus? hostApprovalStatus, @NullableTimestampConverter()  DateTime? hostApprovalDecidedAt,  String? hostApprovalDecidedBy, @JsonKey()  EventWaitlistOfferStatus? waitlistOfferStatus, @NullableTimestampConverter()  DateTime? waitlistOfferedAt, @NullableTimestampConverter()  DateTime? waitlistOfferExpiresAt, @NullableTimestampConverter()  DateTime? waitlistOfferAcceptedAt,  String? waitlistOfferId,  String? inviteLinkId,  String? inviteSource, @NullableTimestampConverter()  DateTime? inviteCapturedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventParticipation() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.uid,_that.status,_that.createdAt,_that.updatedAt,_that.signedUpAt,_that.waitlistedAt,_that.attendedAt,_that.cancelledAt,_that.deletedAt,_that.genderAtSignup,_that.cohortAtSignup,_that.paymentId,_that.hostApprovalStatus,_that.hostApprovalDecidedAt,_that.hostApprovalDecidedBy,_that.waitlistOfferStatus,_that.waitlistOfferedAt,_that.waitlistOfferExpiresAt,_that.waitlistOfferAcceptedAt,_that.waitlistOfferId,_that.inviteLinkId,_that.inviteSource,_that.inviteCapturedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String uid,  EventParticipationStatus status, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? signedUpAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? attendedAt, @NullableTimestampConverter()  DateTime? cancelledAt, @NullableTimestampConverter()  DateTime? deletedAt, @JsonKey()  Gender? genderAtSignup,  String? cohortAtSignup,  String? paymentId, @JsonKey()  EventJoinRequestStatus? hostApprovalStatus, @NullableTimestampConverter()  DateTime? hostApprovalDecidedAt,  String? hostApprovalDecidedBy, @JsonKey()  EventWaitlistOfferStatus? waitlistOfferStatus, @NullableTimestampConverter()  DateTime? waitlistOfferedAt, @NullableTimestampConverter()  DateTime? waitlistOfferExpiresAt, @NullableTimestampConverter()  DateTime? waitlistOfferAcceptedAt,  String? waitlistOfferId,  String? inviteLinkId,  String? inviteSource, @NullableTimestampConverter()  DateTime? inviteCapturedAt)  $default,) {final _that = this;
switch (_that) {
case _EventParticipation():
return $default(_that.id,_that.eventId,_that.clubId,_that.uid,_that.status,_that.createdAt,_that.updatedAt,_that.signedUpAt,_that.waitlistedAt,_that.attendedAt,_that.cancelledAt,_that.deletedAt,_that.genderAtSignup,_that.cohortAtSignup,_that.paymentId,_that.hostApprovalStatus,_that.hostApprovalDecidedAt,_that.hostApprovalDecidedBy,_that.waitlistOfferStatus,_that.waitlistOfferedAt,_that.waitlistOfferExpiresAt,_that.waitlistOfferAcceptedAt,_that.waitlistOfferId,_that.inviteLinkId,_that.inviteSource,_that.inviteCapturedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String uid,  EventParticipationStatus status, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? signedUpAt, @NullableTimestampConverter()  DateTime? waitlistedAt, @NullableTimestampConverter()  DateTime? attendedAt, @NullableTimestampConverter()  DateTime? cancelledAt, @NullableTimestampConverter()  DateTime? deletedAt, @JsonKey()  Gender? genderAtSignup,  String? cohortAtSignup,  String? paymentId, @JsonKey()  EventJoinRequestStatus? hostApprovalStatus, @NullableTimestampConverter()  DateTime? hostApprovalDecidedAt,  String? hostApprovalDecidedBy, @JsonKey()  EventWaitlistOfferStatus? waitlistOfferStatus, @NullableTimestampConverter()  DateTime? waitlistOfferedAt, @NullableTimestampConverter()  DateTime? waitlistOfferExpiresAt, @NullableTimestampConverter()  DateTime? waitlistOfferAcceptedAt,  String? waitlistOfferId,  String? inviteLinkId,  String? inviteSource, @NullableTimestampConverter()  DateTime? inviteCapturedAt)?  $default,) {final _that = this;
switch (_that) {
case _EventParticipation() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.uid,_that.status,_that.createdAt,_that.updatedAt,_that.signedUpAt,_that.waitlistedAt,_that.attendedAt,_that.cancelledAt,_that.deletedAt,_that.genderAtSignup,_that.cohortAtSignup,_that.paymentId,_that.hostApprovalStatus,_that.hostApprovalDecidedAt,_that.hostApprovalDecidedBy,_that.waitlistOfferStatus,_that.waitlistOfferedAt,_that.waitlistOfferExpiresAt,_that.waitlistOfferAcceptedAt,_that.waitlistOfferId,_that.inviteLinkId,_that.inviteSource,_that.inviteCapturedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventParticipation extends EventParticipation {
  const _EventParticipation({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.clubId, required this.uid, required this.status, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt, @NullableTimestampConverter() this.signedUpAt, @NullableTimestampConverter() this.waitlistedAt, @NullableTimestampConverter() this.attendedAt, @NullableTimestampConverter() this.cancelledAt, @NullableTimestampConverter() this.deletedAt, @JsonKey() this.genderAtSignup, this.cohortAtSignup, this.paymentId, @JsonKey() this.hostApprovalStatus, @NullableTimestampConverter() this.hostApprovalDecidedAt, this.hostApprovalDecidedBy, @JsonKey() this.waitlistOfferStatus, @NullableTimestampConverter() this.waitlistOfferedAt, @NullableTimestampConverter() this.waitlistOfferExpiresAt, @NullableTimestampConverter() this.waitlistOfferAcceptedAt, this.waitlistOfferId, this.inviteLinkId, this.inviteSource, @NullableTimestampConverter() this.inviteCapturedAt}): super._();
  factory _EventParticipation.fromJson(Map<String, dynamic> json) => _$EventParticipationFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String clubId;
@override final  String uid;
@override final  EventParticipationStatus status;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;
@override@NullableTimestampConverter() final  DateTime? signedUpAt;
@override@NullableTimestampConverter() final  DateTime? waitlistedAt;
@override@NullableTimestampConverter() final  DateTime? attendedAt;
@override@NullableTimestampConverter() final  DateTime? cancelledAt;
@override@NullableTimestampConverter() final  DateTime? deletedAt;
@override@JsonKey() final  Gender? genderAtSignup;
@override final  String? cohortAtSignup;
@override final  String? paymentId;
@override@JsonKey() final  EventJoinRequestStatus? hostApprovalStatus;
@override@NullableTimestampConverter() final  DateTime? hostApprovalDecidedAt;
@override final  String? hostApprovalDecidedBy;
@override@JsonKey() final  EventWaitlistOfferStatus? waitlistOfferStatus;
@override@NullableTimestampConverter() final  DateTime? waitlistOfferedAt;
@override@NullableTimestampConverter() final  DateTime? waitlistOfferExpiresAt;
@override@NullableTimestampConverter() final  DateTime? waitlistOfferAcceptedAt;
@override final  String? waitlistOfferId;
@override final  String? inviteLinkId;
@override final  String? inviteSource;
@override@NullableTimestampConverter() final  DateTime? inviteCapturedAt;

/// Create a copy of EventParticipation
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventParticipationCopyWith<_EventParticipation> get copyWith => __$EventParticipationCopyWithImpl<_EventParticipation>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventParticipationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventParticipation&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.status, status) || other.status == status)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.signedUpAt, signedUpAt) || other.signedUpAt == signedUpAt)&&(identical(other.waitlistedAt, waitlistedAt) || other.waitlistedAt == waitlistedAt)&&(identical(other.attendedAt, attendedAt) || other.attendedAt == attendedAt)&&(identical(other.cancelledAt, cancelledAt) || other.cancelledAt == cancelledAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt)&&(identical(other.genderAtSignup, genderAtSignup) || other.genderAtSignup == genderAtSignup)&&(identical(other.cohortAtSignup, cohortAtSignup) || other.cohortAtSignup == cohortAtSignup)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.hostApprovalStatus, hostApprovalStatus) || other.hostApprovalStatus == hostApprovalStatus)&&(identical(other.hostApprovalDecidedAt, hostApprovalDecidedAt) || other.hostApprovalDecidedAt == hostApprovalDecidedAt)&&(identical(other.hostApprovalDecidedBy, hostApprovalDecidedBy) || other.hostApprovalDecidedBy == hostApprovalDecidedBy)&&(identical(other.waitlistOfferStatus, waitlistOfferStatus) || other.waitlistOfferStatus == waitlistOfferStatus)&&(identical(other.waitlistOfferedAt, waitlistOfferedAt) || other.waitlistOfferedAt == waitlistOfferedAt)&&(identical(other.waitlistOfferExpiresAt, waitlistOfferExpiresAt) || other.waitlistOfferExpiresAt == waitlistOfferExpiresAt)&&(identical(other.waitlistOfferAcceptedAt, waitlistOfferAcceptedAt) || other.waitlistOfferAcceptedAt == waitlistOfferAcceptedAt)&&(identical(other.waitlistOfferId, waitlistOfferId) || other.waitlistOfferId == waitlistOfferId)&&(identical(other.inviteLinkId, inviteLinkId) || other.inviteLinkId == inviteLinkId)&&(identical(other.inviteSource, inviteSource) || other.inviteSource == inviteSource)&&(identical(other.inviteCapturedAt, inviteCapturedAt) || other.inviteCapturedAt == inviteCapturedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,clubId,uid,status,createdAt,updatedAt,signedUpAt,waitlistedAt,attendedAt,cancelledAt,deletedAt,genderAtSignup,cohortAtSignup,paymentId,hostApprovalStatus,hostApprovalDecidedAt,hostApprovalDecidedBy,waitlistOfferStatus,waitlistOfferedAt,waitlistOfferExpiresAt,waitlistOfferAcceptedAt,waitlistOfferId,inviteLinkId,inviteSource,inviteCapturedAt]);

@override
String toString() {
  return 'EventParticipation(id: $id, eventId: $eventId, clubId: $clubId, uid: $uid, status: $status, createdAt: $createdAt, updatedAt: $updatedAt, signedUpAt: $signedUpAt, waitlistedAt: $waitlistedAt, attendedAt: $attendedAt, cancelledAt: $cancelledAt, deletedAt: $deletedAt, genderAtSignup: $genderAtSignup, cohortAtSignup: $cohortAtSignup, paymentId: $paymentId, hostApprovalStatus: $hostApprovalStatus, hostApprovalDecidedAt: $hostApprovalDecidedAt, hostApprovalDecidedBy: $hostApprovalDecidedBy, waitlistOfferStatus: $waitlistOfferStatus, waitlistOfferedAt: $waitlistOfferedAt, waitlistOfferExpiresAt: $waitlistOfferExpiresAt, waitlistOfferAcceptedAt: $waitlistOfferAcceptedAt, waitlistOfferId: $waitlistOfferId, inviteLinkId: $inviteLinkId, inviteSource: $inviteSource, inviteCapturedAt: $inviteCapturedAt)';
}


}

/// @nodoc
abstract mixin class _$EventParticipationCopyWith<$Res> implements $EventParticipationCopyWith<$Res> {
  factory _$EventParticipationCopyWith(_EventParticipation value, $Res Function(_EventParticipation) _then) = __$EventParticipationCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String uid, EventParticipationStatus status,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? signedUpAt,@NullableTimestampConverter() DateTime? waitlistedAt,@NullableTimestampConverter() DateTime? attendedAt,@NullableTimestampConverter() DateTime? cancelledAt,@NullableTimestampConverter() DateTime? deletedAt,@JsonKey() Gender? genderAtSignup, String? cohortAtSignup, String? paymentId,@JsonKey() EventJoinRequestStatus? hostApprovalStatus,@NullableTimestampConverter() DateTime? hostApprovalDecidedAt, String? hostApprovalDecidedBy,@JsonKey() EventWaitlistOfferStatus? waitlistOfferStatus,@NullableTimestampConverter() DateTime? waitlistOfferedAt,@NullableTimestampConverter() DateTime? waitlistOfferExpiresAt,@NullableTimestampConverter() DateTime? waitlistOfferAcceptedAt, String? waitlistOfferId, String? inviteLinkId, String? inviteSource,@NullableTimestampConverter() DateTime? inviteCapturedAt
});




}
/// @nodoc
class __$EventParticipationCopyWithImpl<$Res>
    implements _$EventParticipationCopyWith<$Res> {
  __$EventParticipationCopyWithImpl(this._self, this._then);

  final _EventParticipation _self;
  final $Res Function(_EventParticipation) _then;

/// Create a copy of EventParticipation
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? uid = null,Object? status = null,Object? createdAt = null,Object? updatedAt = null,Object? signedUpAt = freezed,Object? waitlistedAt = freezed,Object? attendedAt = freezed,Object? cancelledAt = freezed,Object? deletedAt = freezed,Object? genderAtSignup = freezed,Object? cohortAtSignup = freezed,Object? paymentId = freezed,Object? hostApprovalStatus = freezed,Object? hostApprovalDecidedAt = freezed,Object? hostApprovalDecidedBy = freezed,Object? waitlistOfferStatus = freezed,Object? waitlistOfferedAt = freezed,Object? waitlistOfferExpiresAt = freezed,Object? waitlistOfferAcceptedAt = freezed,Object? waitlistOfferId = freezed,Object? inviteLinkId = freezed,Object? inviteSource = freezed,Object? inviteCapturedAt = freezed,}) {
  return _then(_EventParticipation(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventParticipationStatus,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,signedUpAt: freezed == signedUpAt ? _self.signedUpAt : signedUpAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistedAt: freezed == waitlistedAt ? _self.waitlistedAt : waitlistedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendedAt: freezed == attendedAt ? _self.attendedAt : attendedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,cancelledAt: freezed == cancelledAt ? _self.cancelledAt : cancelledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,genderAtSignup: freezed == genderAtSignup ? _self.genderAtSignup : genderAtSignup // ignore: cast_nullable_to_non_nullable
as Gender?,cohortAtSignup: freezed == cohortAtSignup ? _self.cohortAtSignup : cohortAtSignup // ignore: cast_nullable_to_non_nullable
as String?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,hostApprovalStatus: freezed == hostApprovalStatus ? _self.hostApprovalStatus : hostApprovalStatus // ignore: cast_nullable_to_non_nullable
as EventJoinRequestStatus?,hostApprovalDecidedAt: freezed == hostApprovalDecidedAt ? _self.hostApprovalDecidedAt : hostApprovalDecidedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,hostApprovalDecidedBy: freezed == hostApprovalDecidedBy ? _self.hostApprovalDecidedBy : hostApprovalDecidedBy // ignore: cast_nullable_to_non_nullable
as String?,waitlistOfferStatus: freezed == waitlistOfferStatus ? _self.waitlistOfferStatus : waitlistOfferStatus // ignore: cast_nullable_to_non_nullable
as EventWaitlistOfferStatus?,waitlistOfferedAt: freezed == waitlistOfferedAt ? _self.waitlistOfferedAt : waitlistOfferedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferExpiresAt: freezed == waitlistOfferExpiresAt ? _self.waitlistOfferExpiresAt : waitlistOfferExpiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferAcceptedAt: freezed == waitlistOfferAcceptedAt ? _self.waitlistOfferAcceptedAt : waitlistOfferAcceptedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,waitlistOfferId: freezed == waitlistOfferId ? _self.waitlistOfferId : waitlistOfferId // ignore: cast_nullable_to_non_nullable
as String?,inviteLinkId: freezed == inviteLinkId ? _self.inviteLinkId : inviteLinkId // ignore: cast_nullable_to_non_nullable
as String?,inviteSource: freezed == inviteSource ? _self.inviteSource : inviteSource // ignore: cast_nullable_to_non_nullable
as String?,inviteCapturedAt: freezed == inviteCapturedAt ? _self.inviteCapturedAt : inviteCapturedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
