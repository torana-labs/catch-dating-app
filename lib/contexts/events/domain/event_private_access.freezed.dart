// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_private_access.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventPrivateAccess {

@JsonKey(includeToJson: false) String get id; String get eventId; String get clubId; String get inviteCode;@TimestampConverter() DateTime get createdAt;
/// Create a copy of EventPrivateAccess
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventPrivateAccessCopyWith<EventPrivateAccess> get copyWith => _$EventPrivateAccessCopyWithImpl<EventPrivateAccess>(this as EventPrivateAccess, _$identity);

  /// Serializes this EventPrivateAccess to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventPrivateAccess&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,inviteCode,createdAt);

@override
String toString() {
  return 'EventPrivateAccess(id: $id, eventId: $eventId, clubId: $clubId, inviteCode: $inviteCode, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $EventPrivateAccessCopyWith<$Res>  {
  factory $EventPrivateAccessCopyWith(EventPrivateAccess value, $Res Function(EventPrivateAccess) _then) = _$EventPrivateAccessCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String inviteCode,@TimestampConverter() DateTime createdAt
});




}
/// @nodoc
class _$EventPrivateAccessCopyWithImpl<$Res>
    implements $EventPrivateAccessCopyWith<$Res> {
  _$EventPrivateAccessCopyWithImpl(this._self, this._then);

  final EventPrivateAccess _self;
  final $Res Function(EventPrivateAccess) _then;

/// Create a copy of EventPrivateAccess
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? inviteCode = null,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,inviteCode: null == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [EventPrivateAccess].
extension EventPrivateAccessPatterns on EventPrivateAccess {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventPrivateAccess value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventPrivateAccess() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventPrivateAccess value)  $default,){
final _that = this;
switch (_that) {
case _EventPrivateAccess():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventPrivateAccess value)?  $default,){
final _that = this;
switch (_that) {
case _EventPrivateAccess() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String inviteCode, @TimestampConverter()  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventPrivateAccess() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.inviteCode,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String inviteCode, @TimestampConverter()  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _EventPrivateAccess():
return $default(_that.id,_that.eventId,_that.clubId,_that.inviteCode,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String inviteCode, @TimestampConverter()  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _EventPrivateAccess() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.inviteCode,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventPrivateAccess implements EventPrivateAccess {
  const _EventPrivateAccess({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.clubId, required this.inviteCode, @TimestampConverter() required this.createdAt});
  factory _EventPrivateAccess.fromJson(Map<String, dynamic> json) => _$EventPrivateAccessFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String clubId;
@override final  String inviteCode;
@override@TimestampConverter() final  DateTime createdAt;

/// Create a copy of EventPrivateAccess
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventPrivateAccessCopyWith<_EventPrivateAccess> get copyWith => __$EventPrivateAccessCopyWithImpl<_EventPrivateAccess>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventPrivateAccessToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventPrivateAccess&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,inviteCode,createdAt);

@override
String toString() {
  return 'EventPrivateAccess(id: $id, eventId: $eventId, clubId: $clubId, inviteCode: $inviteCode, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$EventPrivateAccessCopyWith<$Res> implements $EventPrivateAccessCopyWith<$Res> {
  factory _$EventPrivateAccessCopyWith(_EventPrivateAccess value, $Res Function(_EventPrivateAccess) _then) = __$EventPrivateAccessCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String inviteCode,@TimestampConverter() DateTime createdAt
});




}
/// @nodoc
class __$EventPrivateAccessCopyWithImpl<$Res>
    implements _$EventPrivateAccessCopyWith<$Res> {
  __$EventPrivateAccessCopyWithImpl(this._self, this._then);

  final _EventPrivateAccess _self;
  final $Res Function(_EventPrivateAccess) _then;

/// Create a copy of EventPrivateAccess
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? inviteCode = null,Object? createdAt = null,}) {
  return _then(_EventPrivateAccess(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,inviteCode: null == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
