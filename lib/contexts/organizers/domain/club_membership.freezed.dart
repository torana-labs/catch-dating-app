// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'club_membership.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ClubMembership {

@JsonKey(includeToJson: false) String get id; String get clubId; String get uid; ClubMembershipRole get role; ClubMembershipStatus get status; bool get pushNotificationsEnabled;@TimestampConverter() DateTime get joinedAt;@NullableTimestampConverter() DateTime? get leftAt;@NullableTimestampConverter() DateTime? get deletedAt;
/// Create a copy of ClubMembership
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClubMembershipCopyWith<ClubMembership> get copyWith => _$ClubMembershipCopyWithImpl<ClubMembership>(this as ClubMembership, _$identity);

  /// Serializes this ClubMembership to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClubMembership&&(identical(other.id, id) || other.id == id)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.role, role) || other.role == role)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.leftAt, leftAt) || other.leftAt == leftAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,clubId,uid,role,status,pushNotificationsEnabled,joinedAt,leftAt,deletedAt);

@override
String toString() {
  return 'ClubMembership(id: $id, clubId: $clubId, uid: $uid, role: $role, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, joinedAt: $joinedAt, leftAt: $leftAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class $ClubMembershipCopyWith<$Res>  {
  factory $ClubMembershipCopyWith(ClubMembership value, $Res Function(ClubMembership) _then) = _$ClubMembershipCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String clubId, String uid, ClubMembershipRole role, ClubMembershipStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime joinedAt,@NullableTimestampConverter() DateTime? leftAt,@NullableTimestampConverter() DateTime? deletedAt
});




}
/// @nodoc
class _$ClubMembershipCopyWithImpl<$Res>
    implements $ClubMembershipCopyWith<$Res> {
  _$ClubMembershipCopyWithImpl(this._self, this._then);

  final ClubMembership _self;
  final $Res Function(ClubMembership) _then;

/// Create a copy of ClubMembership
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? clubId = null,Object? uid = null,Object? role = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? joinedAt = null,Object? leftAt = freezed,Object? deletedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ClubMembershipRole,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ClubMembershipStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,leftAt: freezed == leftAt ? _self.leftAt : leftAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [ClubMembership].
extension ClubMembershipPatterns on ClubMembership {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClubMembership value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClubMembership() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClubMembership value)  $default,){
final _that = this;
switch (_that) {
case _ClubMembership():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClubMembership value)?  $default,){
final _that = this;
switch (_that) {
case _ClubMembership() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String clubId,  String uid,  ClubMembershipRole role,  ClubMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClubMembership() when $default != null:
return $default(_that.id,_that.clubId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String clubId,  String uid,  ClubMembershipRole role,  ClubMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)  $default,) {final _that = this;
switch (_that) {
case _ClubMembership():
return $default(_that.id,_that.clubId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String clubId,  String uid,  ClubMembershipRole role,  ClubMembershipStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime joinedAt, @NullableTimestampConverter()  DateTime? leftAt, @NullableTimestampConverter()  DateTime? deletedAt)?  $default,) {final _that = this;
switch (_that) {
case _ClubMembership() when $default != null:
return $default(_that.id,_that.clubId,_that.uid,_that.role,_that.status,_that.pushNotificationsEnabled,_that.joinedAt,_that.leftAt,_that.deletedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClubMembership implements ClubMembership {
  const _ClubMembership({@JsonKey(includeToJson: false) required this.id, required this.clubId, required this.uid, required this.role, required this.status, this.pushNotificationsEnabled = false, @TimestampConverter() required this.joinedAt, @NullableTimestampConverter() this.leftAt, @NullableTimestampConverter() this.deletedAt});
  factory _ClubMembership.fromJson(Map<String, dynamic> json) => _$ClubMembershipFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String clubId;
@override final  String uid;
@override final  ClubMembershipRole role;
@override final  ClubMembershipStatus status;
@override@JsonKey() final  bool pushNotificationsEnabled;
@override@TimestampConverter() final  DateTime joinedAt;
@override@NullableTimestampConverter() final  DateTime? leftAt;
@override@NullableTimestampConverter() final  DateTime? deletedAt;

/// Create a copy of ClubMembership
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClubMembershipCopyWith<_ClubMembership> get copyWith => __$ClubMembershipCopyWithImpl<_ClubMembership>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClubMembershipToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClubMembership&&(identical(other.id, id) || other.id == id)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.role, role) || other.role == role)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.leftAt, leftAt) || other.leftAt == leftAt)&&(identical(other.deletedAt, deletedAt) || other.deletedAt == deletedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,clubId,uid,role,status,pushNotificationsEnabled,joinedAt,leftAt,deletedAt);

@override
String toString() {
  return 'ClubMembership(id: $id, clubId: $clubId, uid: $uid, role: $role, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, joinedAt: $joinedAt, leftAt: $leftAt, deletedAt: $deletedAt)';
}


}

/// @nodoc
abstract mixin class _$ClubMembershipCopyWith<$Res> implements $ClubMembershipCopyWith<$Res> {
  factory _$ClubMembershipCopyWith(_ClubMembership value, $Res Function(_ClubMembership) _then) = __$ClubMembershipCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String clubId, String uid, ClubMembershipRole role, ClubMembershipStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime joinedAt,@NullableTimestampConverter() DateTime? leftAt,@NullableTimestampConverter() DateTime? deletedAt
});




}
/// @nodoc
class __$ClubMembershipCopyWithImpl<$Res>
    implements _$ClubMembershipCopyWith<$Res> {
  __$ClubMembershipCopyWithImpl(this._self, this._then);

  final _ClubMembership _self;
  final $Res Function(_ClubMembership) _then;

/// Create a copy of ClubMembership
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? clubId = null,Object? uid = null,Object? role = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? joinedAt = null,Object? leftAt = freezed,Object? deletedAt = freezed,}) {
  return _then(_ClubMembership(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ClubMembershipRole,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ClubMembershipStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,leftAt: freezed == leftAt ? _self.leftAt : leftAt // ignore: cast_nullable_to_non_nullable
as DateTime?,deletedAt: freezed == deletedAt ? _self.deletedAt : deletedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
