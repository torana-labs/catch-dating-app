// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_meeting_location.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventMeetingLocation {

 String get name; String? get address; String? get placeId; double get latitude; double get longitude; String? get notes;
/// Create a copy of EventMeetingLocation
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventMeetingLocationCopyWith<EventMeetingLocation> get copyWith => _$EventMeetingLocationCopyWithImpl<EventMeetingLocation>(this as EventMeetingLocation, _$identity);

  /// Serializes this EventMeetingLocation to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventMeetingLocation&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.placeId, placeId) || other.placeId == placeId)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,address,placeId,latitude,longitude,notes);

@override
String toString() {
  return 'EventMeetingLocation(name: $name, address: $address, placeId: $placeId, latitude: $latitude, longitude: $longitude, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $EventMeetingLocationCopyWith<$Res>  {
  factory $EventMeetingLocationCopyWith(EventMeetingLocation value, $Res Function(EventMeetingLocation) _then) = _$EventMeetingLocationCopyWithImpl;
@useResult
$Res call({
 String name, String? address, String? placeId, double latitude, double longitude, String? notes
});




}
/// @nodoc
class _$EventMeetingLocationCopyWithImpl<$Res>
    implements $EventMeetingLocationCopyWith<$Res> {
  _$EventMeetingLocationCopyWithImpl(this._self, this._then);

  final EventMeetingLocation _self;
  final $Res Function(EventMeetingLocation) _then;

/// Create a copy of EventMeetingLocation
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? address = freezed,Object? placeId = freezed,Object? latitude = null,Object? longitude = null,Object? notes = freezed,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,placeId: freezed == placeId ? _self.placeId : placeId // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventMeetingLocation].
extension EventMeetingLocationPatterns on EventMeetingLocation {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventMeetingLocation value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventMeetingLocation() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventMeetingLocation value)  $default,){
final _that = this;
switch (_that) {
case _EventMeetingLocation():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventMeetingLocation value)?  $default,){
final _that = this;
switch (_that) {
case _EventMeetingLocation() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String? address,  String? placeId,  double latitude,  double longitude,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventMeetingLocation() when $default != null:
return $default(_that.name,_that.address,_that.placeId,_that.latitude,_that.longitude,_that.notes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String? address,  String? placeId,  double latitude,  double longitude,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _EventMeetingLocation():
return $default(_that.name,_that.address,_that.placeId,_that.latitude,_that.longitude,_that.notes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String? address,  String? placeId,  double latitude,  double longitude,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _EventMeetingLocation() when $default != null:
return $default(_that.name,_that.address,_that.placeId,_that.latitude,_that.longitude,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventMeetingLocation implements EventMeetingLocation {
  const _EventMeetingLocation({required this.name, this.address, this.placeId, required this.latitude, required this.longitude, this.notes});
  factory _EventMeetingLocation.fromJson(Map<String, dynamic> json) => _$EventMeetingLocationFromJson(json);

@override final  String name;
@override final  String? address;
@override final  String? placeId;
@override final  double latitude;
@override final  double longitude;
@override final  String? notes;

/// Create a copy of EventMeetingLocation
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventMeetingLocationCopyWith<_EventMeetingLocation> get copyWith => __$EventMeetingLocationCopyWithImpl<_EventMeetingLocation>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventMeetingLocationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventMeetingLocation&&(identical(other.name, name) || other.name == name)&&(identical(other.address, address) || other.address == address)&&(identical(other.placeId, placeId) || other.placeId == placeId)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,address,placeId,latitude,longitude,notes);

@override
String toString() {
  return 'EventMeetingLocation(name: $name, address: $address, placeId: $placeId, latitude: $latitude, longitude: $longitude, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$EventMeetingLocationCopyWith<$Res> implements $EventMeetingLocationCopyWith<$Res> {
  factory _$EventMeetingLocationCopyWith(_EventMeetingLocation value, $Res Function(_EventMeetingLocation) _then) = __$EventMeetingLocationCopyWithImpl;
@override @useResult
$Res call({
 String name, String? address, String? placeId, double latitude, double longitude, String? notes
});




}
/// @nodoc
class __$EventMeetingLocationCopyWithImpl<$Res>
    implements _$EventMeetingLocationCopyWith<$Res> {
  __$EventMeetingLocationCopyWithImpl(this._self, this._then);

  final _EventMeetingLocation _self;
  final $Res Function(_EventMeetingLocation) _then;

/// Create a copy of EventMeetingLocation
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? address = freezed,Object? placeId = freezed,Object? latitude = null,Object? longitude = null,Object? notes = freezed,}) {
  return _then(_EventMeetingLocation(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,placeId: freezed == placeId ? _self.placeId : placeId // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
