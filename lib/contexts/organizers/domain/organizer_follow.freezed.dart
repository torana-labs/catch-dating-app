// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organizer_follow.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OrganizerFollow {

@JsonKey(includeToJson: false) String get id; String get organizerId; String get uid; OrganizerFollowStatus get status; bool get pushNotificationsEnabled;@TimestampConverter() DateTime get followedAt;@NullableTimestampConverter() DateTime? get unfollowedAt;
/// Create a copy of OrganizerFollow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizerFollowCopyWith<OrganizerFollow> get copyWith => _$OrganizerFollowCopyWithImpl<OrganizerFollow>(this as OrganizerFollow, _$identity);

  /// Serializes this OrganizerFollow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizerFollow&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.followedAt, followedAt) || other.followedAt == followedAt)&&(identical(other.unfollowedAt, unfollowedAt) || other.unfollowedAt == unfollowedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,uid,status,pushNotificationsEnabled,followedAt,unfollowedAt);

@override
String toString() {
  return 'OrganizerFollow(id: $id, organizerId: $organizerId, uid: $uid, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, followedAt: $followedAt, unfollowedAt: $unfollowedAt)';
}


}

/// @nodoc
abstract mixin class $OrganizerFollowCopyWith<$Res>  {
  factory $OrganizerFollowCopyWith(OrganizerFollow value, $Res Function(OrganizerFollow) _then) = _$OrganizerFollowCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String uid, OrganizerFollowStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime followedAt,@NullableTimestampConverter() DateTime? unfollowedAt
});




}
/// @nodoc
class _$OrganizerFollowCopyWithImpl<$Res>
    implements $OrganizerFollowCopyWith<$Res> {
  _$OrganizerFollowCopyWithImpl(this._self, this._then);

  final OrganizerFollow _self;
  final $Res Function(OrganizerFollow) _then;

/// Create a copy of OrganizerFollow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? organizerId = null,Object? uid = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? followedAt = null,Object? unfollowedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerFollowStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,followedAt: null == followedAt ? _self.followedAt : followedAt // ignore: cast_nullable_to_non_nullable
as DateTime,unfollowedAt: freezed == unfollowedAt ? _self.unfollowedAt : unfollowedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrganizerFollow].
extension OrganizerFollowPatterns on OrganizerFollow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizerFollow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizerFollow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizerFollow value)  $default,){
final _that = this;
switch (_that) {
case _OrganizerFollow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizerFollow value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizerFollow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerFollowStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime followedAt, @NullableTimestampConverter()  DateTime? unfollowedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizerFollow() when $default != null:
return $default(_that.id,_that.organizerId,_that.uid,_that.status,_that.pushNotificationsEnabled,_that.followedAt,_that.unfollowedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerFollowStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime followedAt, @NullableTimestampConverter()  DateTime? unfollowedAt)  $default,) {final _that = this;
switch (_that) {
case _OrganizerFollow():
return $default(_that.id,_that.organizerId,_that.uid,_that.status,_that.pushNotificationsEnabled,_that.followedAt,_that.unfollowedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String uid,  OrganizerFollowStatus status,  bool pushNotificationsEnabled, @TimestampConverter()  DateTime followedAt, @NullableTimestampConverter()  DateTime? unfollowedAt)?  $default,) {final _that = this;
switch (_that) {
case _OrganizerFollow() when $default != null:
return $default(_that.id,_that.organizerId,_that.uid,_that.status,_that.pushNotificationsEnabled,_that.followedAt,_that.unfollowedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizerFollow implements OrganizerFollow {
  const _OrganizerFollow({@JsonKey(includeToJson: false) required this.id, required this.organizerId, required this.uid, required this.status, this.pushNotificationsEnabled = false, @TimestampConverter() required this.followedAt, @NullableTimestampConverter() this.unfollowedAt});
  factory _OrganizerFollow.fromJson(Map<String, dynamic> json) => _$OrganizerFollowFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String organizerId;
@override final  String uid;
@override final  OrganizerFollowStatus status;
@override@JsonKey() final  bool pushNotificationsEnabled;
@override@TimestampConverter() final  DateTime followedAt;
@override@NullableTimestampConverter() final  DateTime? unfollowedAt;

/// Create a copy of OrganizerFollow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizerFollowCopyWith<_OrganizerFollow> get copyWith => __$OrganizerFollowCopyWithImpl<_OrganizerFollow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizerFollowToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizerFollow&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.status, status) || other.status == status)&&(identical(other.pushNotificationsEnabled, pushNotificationsEnabled) || other.pushNotificationsEnabled == pushNotificationsEnabled)&&(identical(other.followedAt, followedAt) || other.followedAt == followedAt)&&(identical(other.unfollowedAt, unfollowedAt) || other.unfollowedAt == unfollowedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,uid,status,pushNotificationsEnabled,followedAt,unfollowedAt);

@override
String toString() {
  return 'OrganizerFollow(id: $id, organizerId: $organizerId, uid: $uid, status: $status, pushNotificationsEnabled: $pushNotificationsEnabled, followedAt: $followedAt, unfollowedAt: $unfollowedAt)';
}


}

/// @nodoc
abstract mixin class _$OrganizerFollowCopyWith<$Res> implements $OrganizerFollowCopyWith<$Res> {
  factory _$OrganizerFollowCopyWith(_OrganizerFollow value, $Res Function(_OrganizerFollow) _then) = __$OrganizerFollowCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String uid, OrganizerFollowStatus status, bool pushNotificationsEnabled,@TimestampConverter() DateTime followedAt,@NullableTimestampConverter() DateTime? unfollowedAt
});




}
/// @nodoc
class __$OrganizerFollowCopyWithImpl<$Res>
    implements _$OrganizerFollowCopyWith<$Res> {
  __$OrganizerFollowCopyWithImpl(this._self, this._then);

  final _OrganizerFollow _self;
  final $Res Function(_OrganizerFollow) _then;

/// Create a copy of OrganizerFollow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? organizerId = null,Object? uid = null,Object? status = null,Object? pushNotificationsEnabled = null,Object? followedAt = null,Object? unfollowedAt = freezed,}) {
  return _then(_OrganizerFollow(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerFollowStatus,pushNotificationsEnabled: null == pushNotificationsEnabled ? _self.pushNotificationsEnabled : pushNotificationsEnabled // ignore: cast_nullable_to_non_nullable
as bool,followedAt: null == followedAt ? _self.followedAt : followedAt // ignore: cast_nullable_to_non_nullable
as DateTime,unfollowedAt: freezed == unfollowedAt ? _self.unfollowedAt : unfollowedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
