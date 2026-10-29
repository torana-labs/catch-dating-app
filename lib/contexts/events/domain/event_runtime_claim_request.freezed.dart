// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_runtime_claim_request.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventRuntimeClaimRequest {

@JsonKey(includeToJson: false) String get id; String get eventId; String get clubId; String get organizerId; String get uid; String get displayName; String get phoneLastFour; List<String> get candidateAttendeeIds; EventRuntimeClaimStatus get status; String? get reviewedBy; String? get reviewReason;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;@NullableTimestampConverter() DateTime? get reviewedAt;
/// Create a copy of EventRuntimeClaimRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventRuntimeClaimRequestCopyWith<EventRuntimeClaimRequest> get copyWith => _$EventRuntimeClaimRequestCopyWithImpl<EventRuntimeClaimRequest>(this as EventRuntimeClaimRequest, _$identity);

  /// Serializes this EventRuntimeClaimRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventRuntimeClaimRequest&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.phoneLastFour, phoneLastFour) || other.phoneLastFour == phoneLastFour)&&const DeepCollectionEquality().equals(other.candidateAttendeeIds, candidateAttendeeIds)&&(identical(other.status, status) || other.status == status)&&(identical(other.reviewedBy, reviewedBy) || other.reviewedBy == reviewedBy)&&(identical(other.reviewReason, reviewReason) || other.reviewReason == reviewReason)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,organizerId,uid,displayName,phoneLastFour,const DeepCollectionEquality().hash(candidateAttendeeIds),status,reviewedBy,reviewReason,createdAt,updatedAt,reviewedAt);

@override
String toString() {
  return 'EventRuntimeClaimRequest(id: $id, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, uid: $uid, displayName: $displayName, phoneLastFour: $phoneLastFour, candidateAttendeeIds: $candidateAttendeeIds, status: $status, reviewedBy: $reviewedBy, reviewReason: $reviewReason, createdAt: $createdAt, updatedAt: $updatedAt, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class $EventRuntimeClaimRequestCopyWith<$Res>  {
  factory $EventRuntimeClaimRequestCopyWith(EventRuntimeClaimRequest value, $Res Function(EventRuntimeClaimRequest) _then) = _$EventRuntimeClaimRequestCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String organizerId, String uid, String displayName, String phoneLastFour, List<String> candidateAttendeeIds, EventRuntimeClaimStatus status, String? reviewedBy, String? reviewReason,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class _$EventRuntimeClaimRequestCopyWithImpl<$Res>
    implements $EventRuntimeClaimRequestCopyWith<$Res> {
  _$EventRuntimeClaimRequestCopyWithImpl(this._self, this._then);

  final EventRuntimeClaimRequest _self;
  final $Res Function(EventRuntimeClaimRequest) _then;

/// Create a copy of EventRuntimeClaimRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? organizerId = null,Object? uid = null,Object? displayName = null,Object? phoneLastFour = null,Object? candidateAttendeeIds = null,Object? status = null,Object? reviewedBy = freezed,Object? reviewReason = freezed,Object? createdAt = null,Object? updatedAt = null,Object? reviewedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,phoneLastFour: null == phoneLastFour ? _self.phoneLastFour : phoneLastFour // ignore: cast_nullable_to_non_nullable
as String,candidateAttendeeIds: null == candidateAttendeeIds ? _self.candidateAttendeeIds : candidateAttendeeIds // ignore: cast_nullable_to_non_nullable
as List<String>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventRuntimeClaimStatus,reviewedBy: freezed == reviewedBy ? _self.reviewedBy : reviewedBy // ignore: cast_nullable_to_non_nullable
as String?,reviewReason: freezed == reviewReason ? _self.reviewReason : reviewReason // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventRuntimeClaimRequest].
extension EventRuntimeClaimRequestPatterns on EventRuntimeClaimRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventRuntimeClaimRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventRuntimeClaimRequest value)  $default,){
final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventRuntimeClaimRequest value)?  $default,){
final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String uid,  String displayName,  String phoneLastFour,  List<String> candidateAttendeeIds,  EventRuntimeClaimStatus status,  String? reviewedBy,  String? reviewReason, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.uid,_that.displayName,_that.phoneLastFour,_that.candidateAttendeeIds,_that.status,_that.reviewedBy,_that.reviewReason,_that.createdAt,_that.updatedAt,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String uid,  String displayName,  String phoneLastFour,  List<String> candidateAttendeeIds,  EventRuntimeClaimStatus status,  String? reviewedBy,  String? reviewReason, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)  $default,) {final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest():
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.uid,_that.displayName,_that.phoneLastFour,_that.candidateAttendeeIds,_that.status,_that.reviewedBy,_that.reviewReason,_that.createdAt,_that.updatedAt,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String organizerId,  String uid,  String displayName,  String phoneLastFour,  List<String> candidateAttendeeIds,  EventRuntimeClaimStatus status,  String? reviewedBy,  String? reviewReason, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,) {final _that = this;
switch (_that) {
case _EventRuntimeClaimRequest() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.organizerId,_that.uid,_that.displayName,_that.phoneLastFour,_that.candidateAttendeeIds,_that.status,_that.reviewedBy,_that.reviewReason,_that.createdAt,_that.updatedAt,_that.reviewedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventRuntimeClaimRequest extends EventRuntimeClaimRequest {
  const _EventRuntimeClaimRequest({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.clubId, required this.organizerId, required this.uid, required this.displayName, required this.phoneLastFour, final  List<String> candidateAttendeeIds = const <String>[], required this.status, this.reviewedBy, this.reviewReason, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt, @NullableTimestampConverter() this.reviewedAt}): _candidateAttendeeIds = candidateAttendeeIds,super._();
  factory _EventRuntimeClaimRequest.fromJson(Map<String, dynamic> json) => _$EventRuntimeClaimRequestFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String clubId;
@override final  String organizerId;
@override final  String uid;
@override final  String displayName;
@override final  String phoneLastFour;
 final  List<String> _candidateAttendeeIds;
@override@JsonKey() List<String> get candidateAttendeeIds {
  if (_candidateAttendeeIds is EqualUnmodifiableListView) return _candidateAttendeeIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_candidateAttendeeIds);
}

@override final  EventRuntimeClaimStatus status;
@override final  String? reviewedBy;
@override final  String? reviewReason;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;
@override@NullableTimestampConverter() final  DateTime? reviewedAt;

/// Create a copy of EventRuntimeClaimRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventRuntimeClaimRequestCopyWith<_EventRuntimeClaimRequest> get copyWith => __$EventRuntimeClaimRequestCopyWithImpl<_EventRuntimeClaimRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventRuntimeClaimRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventRuntimeClaimRequest&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.phoneLastFour, phoneLastFour) || other.phoneLastFour == phoneLastFour)&&const DeepCollectionEquality().equals(other._candidateAttendeeIds, _candidateAttendeeIds)&&(identical(other.status, status) || other.status == status)&&(identical(other.reviewedBy, reviewedBy) || other.reviewedBy == reviewedBy)&&(identical(other.reviewReason, reviewReason) || other.reviewReason == reviewReason)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,organizerId,uid,displayName,phoneLastFour,const DeepCollectionEquality().hash(_candidateAttendeeIds),status,reviewedBy,reviewReason,createdAt,updatedAt,reviewedAt);

@override
String toString() {
  return 'EventRuntimeClaimRequest(id: $id, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, uid: $uid, displayName: $displayName, phoneLastFour: $phoneLastFour, candidateAttendeeIds: $candidateAttendeeIds, status: $status, reviewedBy: $reviewedBy, reviewReason: $reviewReason, createdAt: $createdAt, updatedAt: $updatedAt, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class _$EventRuntimeClaimRequestCopyWith<$Res> implements $EventRuntimeClaimRequestCopyWith<$Res> {
  factory _$EventRuntimeClaimRequestCopyWith(_EventRuntimeClaimRequest value, $Res Function(_EventRuntimeClaimRequest) _then) = __$EventRuntimeClaimRequestCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String organizerId, String uid, String displayName, String phoneLastFour, List<String> candidateAttendeeIds, EventRuntimeClaimStatus status, String? reviewedBy, String? reviewReason,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class __$EventRuntimeClaimRequestCopyWithImpl<$Res>
    implements _$EventRuntimeClaimRequestCopyWith<$Res> {
  __$EventRuntimeClaimRequestCopyWithImpl(this._self, this._then);

  final _EventRuntimeClaimRequest _self;
  final $Res Function(_EventRuntimeClaimRequest) _then;

/// Create a copy of EventRuntimeClaimRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? organizerId = null,Object? uid = null,Object? displayName = null,Object? phoneLastFour = null,Object? candidateAttendeeIds = null,Object? status = null,Object? reviewedBy = freezed,Object? reviewReason = freezed,Object? createdAt = null,Object? updatedAt = null,Object? reviewedAt = freezed,}) {
  return _then(_EventRuntimeClaimRequest(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,phoneLastFour: null == phoneLastFour ? _self.phoneLastFour : phoneLastFour // ignore: cast_nullable_to_non_nullable
as String,candidateAttendeeIds: null == candidateAttendeeIds ? _self._candidateAttendeeIds : candidateAttendeeIds // ignore: cast_nullable_to_non_nullable
as List<String>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventRuntimeClaimStatus,reviewedBy: freezed == reviewedBy ? _self.reviewedBy : reviewedBy // ignore: cast_nullable_to_non_nullable
as String?,reviewReason: freezed == reviewReason ? _self.reviewReason : reviewReason // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
