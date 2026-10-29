// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activity_notification.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ActivityNotification {

@JsonKey(includeToJson: false) String get id; String get uid; ActivityNotificationType get type; String get title; String get body;@TimestampConverter() DateTime get createdAt;@NullableTimestampConverter() DateTime? get readAt; String? get matchId; String? get eventId; String? get clubId; String? get organizerId; String? get postId; String? get invitationId; String? get actorUid; String? get actorName;
/// Create a copy of ActivityNotification
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivityNotificationCopyWith<ActivityNotification> get copyWith => _$ActivityNotificationCopyWithImpl<ActivityNotification>(this as ActivityNotification, _$identity);

  /// Serializes this ActivityNotification to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActivityNotification&&(identical(other.id, id) || other.id == id)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.type, type) || other.type == type)&&(identical(other.title, title) || other.title == title)&&(identical(other.body, body) || other.body == body)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.readAt, readAt) || other.readAt == readAt)&&(identical(other.matchId, matchId) || other.matchId == matchId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.postId, postId) || other.postId == postId)&&(identical(other.invitationId, invitationId) || other.invitationId == invitationId)&&(identical(other.actorUid, actorUid) || other.actorUid == actorUid)&&(identical(other.actorName, actorName) || other.actorName == actorName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,uid,type,title,body,createdAt,readAt,matchId,eventId,clubId,organizerId,postId,invitationId,actorUid,actorName);

@override
String toString() {
  return 'ActivityNotification(id: $id, uid: $uid, type: $type, title: $title, body: $body, createdAt: $createdAt, readAt: $readAt, matchId: $matchId, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, postId: $postId, invitationId: $invitationId, actorUid: $actorUid, actorName: $actorName)';
}


}

/// @nodoc
abstract mixin class $ActivityNotificationCopyWith<$Res>  {
  factory $ActivityNotificationCopyWith(ActivityNotification value, $Res Function(ActivityNotification) _then) = _$ActivityNotificationCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String uid, ActivityNotificationType type, String title, String body,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? readAt, String? matchId, String? eventId, String? clubId, String? organizerId, String? postId, String? invitationId, String? actorUid, String? actorName
});




}
/// @nodoc
class _$ActivityNotificationCopyWithImpl<$Res>
    implements $ActivityNotificationCopyWith<$Res> {
  _$ActivityNotificationCopyWithImpl(this._self, this._then);

  final ActivityNotification _self;
  final $Res Function(ActivityNotification) _then;

/// Create a copy of ActivityNotification
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? uid = null,Object? type = null,Object? title = null,Object? body = null,Object? createdAt = null,Object? readAt = freezed,Object? matchId = freezed,Object? eventId = freezed,Object? clubId = freezed,Object? organizerId = freezed,Object? postId = freezed,Object? invitationId = freezed,Object? actorUid = freezed,Object? actorName = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ActivityNotificationType,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,readAt: freezed == readAt ? _self.readAt : readAt // ignore: cast_nullable_to_non_nullable
as DateTime?,matchId: freezed == matchId ? _self.matchId : matchId // ignore: cast_nullable_to_non_nullable
as String?,eventId: freezed == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String?,clubId: freezed == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String?,organizerId: freezed == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String?,postId: freezed == postId ? _self.postId : postId // ignore: cast_nullable_to_non_nullable
as String?,invitationId: freezed == invitationId ? _self.invitationId : invitationId // ignore: cast_nullable_to_non_nullable
as String?,actorUid: freezed == actorUid ? _self.actorUid : actorUid // ignore: cast_nullable_to_non_nullable
as String?,actorName: freezed == actorName ? _self.actorName : actorName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ActivityNotification].
extension ActivityNotificationPatterns on ActivityNotification {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActivityNotification value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActivityNotification() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActivityNotification value)  $default,){
final _that = this;
switch (_that) {
case _ActivityNotification():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActivityNotification value)?  $default,){
final _that = this;
switch (_that) {
case _ActivityNotification() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String uid,  ActivityNotificationType type,  String title,  String body, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? readAt,  String? matchId,  String? eventId,  String? clubId,  String? organizerId,  String? postId,  String? invitationId,  String? actorUid,  String? actorName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActivityNotification() when $default != null:
return $default(_that.id,_that.uid,_that.type,_that.title,_that.body,_that.createdAt,_that.readAt,_that.matchId,_that.eventId,_that.clubId,_that.organizerId,_that.postId,_that.invitationId,_that.actorUid,_that.actorName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String uid,  ActivityNotificationType type,  String title,  String body, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? readAt,  String? matchId,  String? eventId,  String? clubId,  String? organizerId,  String? postId,  String? invitationId,  String? actorUid,  String? actorName)  $default,) {final _that = this;
switch (_that) {
case _ActivityNotification():
return $default(_that.id,_that.uid,_that.type,_that.title,_that.body,_that.createdAt,_that.readAt,_that.matchId,_that.eventId,_that.clubId,_that.organizerId,_that.postId,_that.invitationId,_that.actorUid,_that.actorName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String uid,  ActivityNotificationType type,  String title,  String body, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? readAt,  String? matchId,  String? eventId,  String? clubId,  String? organizerId,  String? postId,  String? invitationId,  String? actorUid,  String? actorName)?  $default,) {final _that = this;
switch (_that) {
case _ActivityNotification() when $default != null:
return $default(_that.id,_that.uid,_that.type,_that.title,_that.body,_that.createdAt,_that.readAt,_that.matchId,_that.eventId,_that.clubId,_that.organizerId,_that.postId,_that.invitationId,_that.actorUid,_that.actorName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ActivityNotification extends ActivityNotification {
  const _ActivityNotification({@JsonKey(includeToJson: false) required this.id, required this.uid, required this.type, required this.title, required this.body, @TimestampConverter() required this.createdAt, @NullableTimestampConverter() this.readAt, this.matchId, this.eventId, this.clubId, this.organizerId, this.postId, this.invitationId, this.actorUid, this.actorName}): super._();
  factory _ActivityNotification.fromJson(Map<String, dynamic> json) => _$ActivityNotificationFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String uid;
@override final  ActivityNotificationType type;
@override final  String title;
@override final  String body;
@override@TimestampConverter() final  DateTime createdAt;
@override@NullableTimestampConverter() final  DateTime? readAt;
@override final  String? matchId;
@override final  String? eventId;
@override final  String? clubId;
@override final  String? organizerId;
@override final  String? postId;
@override final  String? invitationId;
@override final  String? actorUid;
@override final  String? actorName;

/// Create a copy of ActivityNotification
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivityNotificationCopyWith<_ActivityNotification> get copyWith => __$ActivityNotificationCopyWithImpl<_ActivityNotification>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActivityNotificationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActivityNotification&&(identical(other.id, id) || other.id == id)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.type, type) || other.type == type)&&(identical(other.title, title) || other.title == title)&&(identical(other.body, body) || other.body == body)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.readAt, readAt) || other.readAt == readAt)&&(identical(other.matchId, matchId) || other.matchId == matchId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.postId, postId) || other.postId == postId)&&(identical(other.invitationId, invitationId) || other.invitationId == invitationId)&&(identical(other.actorUid, actorUid) || other.actorUid == actorUid)&&(identical(other.actorName, actorName) || other.actorName == actorName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,uid,type,title,body,createdAt,readAt,matchId,eventId,clubId,organizerId,postId,invitationId,actorUid,actorName);

@override
String toString() {
  return 'ActivityNotification(id: $id, uid: $uid, type: $type, title: $title, body: $body, createdAt: $createdAt, readAt: $readAt, matchId: $matchId, eventId: $eventId, clubId: $clubId, organizerId: $organizerId, postId: $postId, invitationId: $invitationId, actorUid: $actorUid, actorName: $actorName)';
}


}

/// @nodoc
abstract mixin class _$ActivityNotificationCopyWith<$Res> implements $ActivityNotificationCopyWith<$Res> {
  factory _$ActivityNotificationCopyWith(_ActivityNotification value, $Res Function(_ActivityNotification) _then) = __$ActivityNotificationCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String uid, ActivityNotificationType type, String title, String body,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? readAt, String? matchId, String? eventId, String? clubId, String? organizerId, String? postId, String? invitationId, String? actorUid, String? actorName
});




}
/// @nodoc
class __$ActivityNotificationCopyWithImpl<$Res>
    implements _$ActivityNotificationCopyWith<$Res> {
  __$ActivityNotificationCopyWithImpl(this._self, this._then);

  final _ActivityNotification _self;
  final $Res Function(_ActivityNotification) _then;

/// Create a copy of ActivityNotification
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? uid = null,Object? type = null,Object? title = null,Object? body = null,Object? createdAt = null,Object? readAt = freezed,Object? matchId = freezed,Object? eventId = freezed,Object? clubId = freezed,Object? organizerId = freezed,Object? postId = freezed,Object? invitationId = freezed,Object? actorUid = freezed,Object? actorName = freezed,}) {
  return _then(_ActivityNotification(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ActivityNotificationType,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,readAt: freezed == readAt ? _self.readAt : readAt // ignore: cast_nullable_to_non_nullable
as DateTime?,matchId: freezed == matchId ? _self.matchId : matchId // ignore: cast_nullable_to_non_nullable
as String?,eventId: freezed == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String?,clubId: freezed == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String?,organizerId: freezed == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String?,postId: freezed == postId ? _self.postId : postId // ignore: cast_nullable_to_non_nullable
as String?,invitationId: freezed == invitationId ? _self.invitationId : invitationId // ignore: cast_nullable_to_non_nullable
as String?,actorUid: freezed == actorUid ? _self.actorUid : actorUid // ignore: cast_nullable_to_non_nullable
as String?,actorName: freezed == actorName ? _self.actorName : actorName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
