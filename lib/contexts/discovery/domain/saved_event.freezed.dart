// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'saved_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SavedEvent {

@JsonKey(includeToJson: false) String get id; String get uid; String get eventId;@TimestampConverter() DateTime get savedAt;
/// Create a copy of SavedEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SavedEventCopyWith<SavedEvent> get copyWith => _$SavedEventCopyWithImpl<SavedEvent>(this as SavedEvent, _$identity);

  /// Serializes this SavedEvent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SavedEvent&&(identical(other.id, id) || other.id == id)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,uid,eventId,savedAt);

@override
String toString() {
  return 'SavedEvent(id: $id, uid: $uid, eventId: $eventId, savedAt: $savedAt)';
}


}

/// @nodoc
abstract mixin class $SavedEventCopyWith<$Res>  {
  factory $SavedEventCopyWith(SavedEvent value, $Res Function(SavedEvent) _then) = _$SavedEventCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String uid, String eventId,@TimestampConverter() DateTime savedAt
});




}
/// @nodoc
class _$SavedEventCopyWithImpl<$Res>
    implements $SavedEventCopyWith<$Res> {
  _$SavedEventCopyWithImpl(this._self, this._then);

  final SavedEvent _self;
  final $Res Function(SavedEvent) _then;

/// Create a copy of SavedEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? uid = null,Object? eventId = null,Object? savedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [SavedEvent].
extension SavedEventPatterns on SavedEvent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SavedEvent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SavedEvent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SavedEvent value)  $default,){
final _that = this;
switch (_that) {
case _SavedEvent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SavedEvent value)?  $default,){
final _that = this;
switch (_that) {
case _SavedEvent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String uid,  String eventId, @TimestampConverter()  DateTime savedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SavedEvent() when $default != null:
return $default(_that.id,_that.uid,_that.eventId,_that.savedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String uid,  String eventId, @TimestampConverter()  DateTime savedAt)  $default,) {final _that = this;
switch (_that) {
case _SavedEvent():
return $default(_that.id,_that.uid,_that.eventId,_that.savedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String uid,  String eventId, @TimestampConverter()  DateTime savedAt)?  $default,) {final _that = this;
switch (_that) {
case _SavedEvent() when $default != null:
return $default(_that.id,_that.uid,_that.eventId,_that.savedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SavedEvent implements SavedEvent {
  const _SavedEvent({@JsonKey(includeToJson: false) required this.id, required this.uid, required this.eventId, @TimestampConverter() required this.savedAt});
  factory _SavedEvent.fromJson(Map<String, dynamic> json) => _$SavedEventFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String uid;
@override final  String eventId;
@override@TimestampConverter() final  DateTime savedAt;

/// Create a copy of SavedEvent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SavedEventCopyWith<_SavedEvent> get copyWith => __$SavedEventCopyWithImpl<_SavedEvent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SavedEventToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SavedEvent&&(identical(other.id, id) || other.id == id)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,uid,eventId,savedAt);

@override
String toString() {
  return 'SavedEvent(id: $id, uid: $uid, eventId: $eventId, savedAt: $savedAt)';
}


}

/// @nodoc
abstract mixin class _$SavedEventCopyWith<$Res> implements $SavedEventCopyWith<$Res> {
  factory _$SavedEventCopyWith(_SavedEvent value, $Res Function(_SavedEvent) _then) = __$SavedEventCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String uid, String eventId,@TimestampConverter() DateTime savedAt
});




}
/// @nodoc
class __$SavedEventCopyWithImpl<$Res>
    implements _$SavedEventCopyWith<$Res> {
  __$SavedEventCopyWithImpl(this._self, this._then);

  final _SavedEvent _self;
  final $Res Function(_SavedEvent) _then;

/// Create a copy of SavedEvent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? uid = null,Object? eventId = null,Object? savedAt = null,}) {
  return _then(_SavedEvent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
