// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organizer_membership.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OrganizerMembership {

@JsonKey(includeToJson: false) String get id; String get organizerId; String get uid; OrganizerMembershipRole get role; OrganizerMembershipStatus get status; bool get pushNotificationsEnabled;@TimestampConverter() DateTime get joinedAt;@NullableTimestampConverter() DateTime? get leftAt;@NullableTimestampConverter() DateTime? get deletedAt;
/// Create a copy of OrganizerMembership
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizerMembershipCopyWith<OrganizerMembership> get copyWith => _$OrganizerMembershipCopyWithImpl<OrganizerMembership>(this as OrganizerMembership, _$identity);

  /// Serializes this OrganizerMembership to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizerMembership&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.role, role) || other.role == role)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.leftAt, leftAt) || other.leftAt == leftAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,uid,role,status,pushNotificationsEnabled,joinedAt,leftAt,deletedAt);

@override
String toString() {
  return 'OrganizerMembership(id: $id, organizerId: $organizerId, uid: $uid, role: $role, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, joinedAt: $joinedAt, leftAt: $leftAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class $OrganizerMembershipCopyWith<$Res>  {
  factory $OrganizerMembershipCopyWith(OrganizerMembership value, $Res Function(OrganizerMembership) _then) = _$OrganizerMembershipCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String uid, OrganizerMembershipRole role, OrganizerMembershipStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime joinedAt,@NullableTimestampConverter() DateTime? leftAt,@NullableTimestampConverter() DateTime? deletedAt
});




}
/// @nodoc
class _$OrganizerMembershipCopyWithImpl<$Res>
    implements $OrganizerMembershipCopyWith<$Res> {
  _$OrganizerMembershipCopyWithImpl(this._self, this._then);

  final OrganizerMembership _self;
  final $Res Function(OrganizerMembership) _then;

/// Create a copy of OrganizerMembership
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? organizerId = null,Object? uid = null,Object? role = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? joinedAt = null,Object? leftAt = freezed,Object? deletedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizerMembershipRole,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerMembershipStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,leftAt: freezed == leftAt ? _self.leftAt : leftAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrganizerMembership].
extension OrganizerMembershipPatterns on OrganizerMembership {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizerMembership value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizerMembership() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizerMembership value)  $default,){
final _that = this;
switch (_that) {
case _OrganizerMembership():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizerMembership value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizerMembership() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerMembershipRole role,  OrganizerMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizerMembership() when $default != null:
return $default(_that.id,_that.organizerId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerMembershipRole role,  OrganizerMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)  $default,) {final _that = this;
switch (_that) {
case _OrganizerMembership():
return $default(_that.id,_that.organizerId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerMembershipRole role,  OrganizerMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)?  $default,) {final _that = this;
switch (_that) {
case _OrganizerMembership() when $default != null:
return $default(_that.id,_that.organizerId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizerMembership implements OrganizerMembership {
  const _OrganizerMembership({@JsonKey(includeToJson: false) required this.id, required this.organizerId, required this.uid, required this.role, required this.status, this.pushNotificationsEnabled = false, @TimestampConverter() required this.joinedAt, @NullableTimestampConverter() this.leftAt, @NullableTimestampConverter() this.deletedAt});
  factory _OrganizerMembership.fromJson(Map<String, dynamic> json) => _$OrganizerMembershipFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String organizerId;
@override final  String uid;
@override final  OrganizerMembershipRole role;
@override final  OrganizerMembershipStatus status;
@override@JsonKey() final  bool pushNotificationsEnabled;
@override@TimestampConverter() final  DateTime joinedAt;
@override@NullableTimestampConverter() final  DateTime? leftAt;
@override@NullableTimestampConverter() final  DateTime? deletedAt;

/// Create a copy of OrganizerMembership
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizerMembershipCopyWith<_OrganizerMembership> get copyWith => __$OrganizerMembershipCopyWithImpl<_OrganizerMembership>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizerMembershipToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizerMembership&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.role, role) || other.role == role)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.leftAt, leftAt) || other.leftAt == leftAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,uid,role,status,pushNotificationsEnabled,joinedAt,leftAt,deletedAt);

@override
String toString() {
  return 'OrganizerMembership(id: $id, organizerId: $organizerId, uid: $uid, role: $role, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, joinedAt: $joinedAt, leftAt: $leftAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class _$OrganizerMembershipCopyWith<$Res> implements $OrganizerMembershipCopyWith<$Res> {
  factory _$OrganizerMembershipCopyWith(_OrganizerMembership value, $Res Function(_OrganizerMembership) _then) = __$OrganizerMembershipCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String uid, OrganizerMembershipRole role, OrganizerMembershipStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime joinedAt,@NullableTimestampConverter() DateTime? leftAt,@NullableTimestampConverter() DateTime? deletedAt
});




}
/// @nodoc
class __$OrganizerMembershipCopyWithImpl<$Res>
    implements _$OrganizerMembershipCopyWith<$Res> {
  __$OrganizerMembershipCopyWithImpl(this._self, this._then);

  final _OrganizerMembership _self;
  final $Res Function(_OrganizerMembership) _then;

/// Create a copy of OrganizerMembership
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? organizerId = null,Object? uid = null,Object? role = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? joinedAt = null,Object? leftAt = freezed,Object? deletedAt = freezed,}) {
  return _then(_OrganizerMembership(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizerMembershipRole,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerMembershipStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,leftAt: freezed == leftAt ? _self.leftAt : leftAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
