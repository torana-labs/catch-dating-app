// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_itinerary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventItineraryItem {

 String get id; EventItineraryKind get kind; int get offsetMinutes; int? get durationMinutes; String get title; String? get description; EventMeetingLocation? get location; int? get routeDistanceMeters;
/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventItineraryItemCopyWith<EventItineraryItem> get copyWith => _$EventItineraryItemCopyWithImpl<EventItineraryItem>(this as EventItineraryItem, _$identity);

  /// Serializes this EventItineraryItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventItineraryItem&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.offsetMinutes, offsetMinutes) || other.offsetMinutes == offsetMinutes)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.routeDistanceMeters, routeDistanceMeters) || other.routeDistanceMeters == routeDistanceMeters));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,kind,offsetMinutes,durationMinutes,title,description,location,routeDistanceMeters);

@override
String toString() {
  return 'EventItineraryItem(id: $id, kind: $kind, offsetMinutes: $offsetMinutes, durationMinutes: $durationMinutes, title: $title, description: $description, location: $location, routeDistanceMeters: $routeDistanceMeters)';
}


}

/// @nodoc
abstract mixin class $EventItineraryItemCopyWith<$Res>  {
  factory $EventItineraryItemCopyWith(EventItineraryItem value, $Res Function(EventItineraryItem) _then) = _$EventItineraryItemCopyWithImpl;
@useResult
$Res call({
 String id, EventItineraryKind kind, int offsetMinutes, int? durationMinutes, String title, String? description, EventMeetingLocation? location, int? routeDistanceMeters
});


$EventMeetingLocationCopyWith<$Res>? get location;

}
/// @nodoc
class _$EventItineraryItemCopyWithImpl<$Res>
    implements $EventItineraryItemCopyWith<$Res> {
  _$EventItineraryItemCopyWithImpl(this._self, this._then);

  final EventItineraryItem _self;
  final $Res Function(EventItineraryItem) _then;

/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? kind = null,Object? offsetMinutes = null,Object? durationMinutes = freezed,Object? title = null,Object? description = freezed,Object? location = freezed,Object? routeDistanceMeters = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as EventItineraryKind,offsetMinutes: null == offsetMinutes ? _self.offsetMinutes : offsetMinutes // ignore: cast_nullable_to_non_nullable
as int,durationMinutes: freezed == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as EventMeetingLocation?,routeDistanceMeters: freezed == routeDistanceMeters ? _self.routeDistanceMeters : routeDistanceMeters // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}
/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventMeetingLocationCopyWith<$Res>? get location {
    if (_self.location == null) {
    return null;
  }

  return $EventMeetingLocationCopyWith<$Res>(_self.location!, (value) {
    return _then(_self.copyWith(location: value));
  });
}
}


/// Adds pattern-matching-related methods to [EventItineraryItem].
extension EventItineraryItemPatterns on EventItineraryItem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventItineraryItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventItineraryItem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventItineraryItem value)  $default,){
final _that = this;
switch (_that) {
case _EventItineraryItem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventItineraryItem value)?  $default,){
final _that = this;
switch (_that) {
case _EventItineraryItem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  EventItineraryKind kind,  int offsetMinutes,  int? durationMinutes,  String title,  String? description,  EventMeetingLocation? location,  int? routeDistanceMeters)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventItineraryItem() when $default != null:
return $default(_that.id,_that.kind,_that.offsetMinutes,_that.durationMinutes,_that.title,_that.description,_that.location,_that.routeDistanceMeters);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  EventItineraryKind kind,  int offsetMinutes,  int? durationMinutes,  String title,  String? description,  EventMeetingLocation? location,  int? routeDistanceMeters)  $default,) {final _that = this;
switch (_that) {
case _EventItineraryItem():
return $default(_that.id,_that.kind,_that.offsetMinutes,_that.durationMinutes,_that.title,_that.description,_that.location,_that.routeDistanceMeters);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  EventItineraryKind kind,  int offsetMinutes,  int? durationMinutes,  String title,  String? description,  EventMeetingLocation? location,  int? routeDistanceMeters)?  $default,) {final _that = this;
switch (_that) {
case _EventItineraryItem() when $default != null:
return $default(_that.id,_that.kind,_that.offsetMinutes,_that.durationMinutes,_that.title,_that.description,_that.location,_that.routeDistanceMeters);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventItineraryItem implements EventItineraryItem {
  const _EventItineraryItem({required this.id, required this.kind, required this.offsetMinutes, this.durationMinutes, required this.title, this.description, this.location, this.routeDistanceMeters});
  factory _EventItineraryItem.fromJson(Map<String, dynamic> json) => _$EventItineraryItemFromJson(json);

@override final  String id;
@override final  EventItineraryKind kind;
@override final  int offsetMinutes;
@override final  int? durationMinutes;
@override final  String title;
@override final  String? description;
@override final  EventMeetingLocation? location;
@override final  int? routeDistanceMeters;

/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventItineraryItemCopyWith<_EventItineraryItem> get copyWith => __$EventItineraryItemCopyWithImpl<_EventItineraryItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventItineraryItemToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventItineraryItem&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.offsetMinutes, offsetMinutes) || other.offsetMinutes == offsetMinutes)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.routeDistanceMeters, routeDistanceMeters) || other.routeDistanceMeters == routeDistanceMeters));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,kind,offsetMinutes,durationMinutes,title,description,location,routeDistanceMeters);

@override
String toString() {
  return 'EventItineraryItem(id: $id, kind: $kind, offsetMinutes: $offsetMinutes, durationMinutes: $durationMinutes, title: $title, description: $description, location: $location, routeDistanceMeters: $routeDistanceMeters)';
}


}

/// @nodoc
abstract mixin class _$EventItineraryItemCopyWith<$Res> implements $EventItineraryItemCopyWith<$Res> {
  factory _$EventItineraryItemCopyWith(_EventItineraryItem value, $Res Function(_EventItineraryItem) _then) = __$EventItineraryItemCopyWithImpl;
@override @useResult
$Res call({
 String id, EventItineraryKind kind, int offsetMinutes, int? durationMinutes, String title, String? description, EventMeetingLocation? location, int? routeDistanceMeters
});


@override $EventMeetingLocationCopyWith<$Res>? get location;

}
/// @nodoc
class __$EventItineraryItemCopyWithImpl<$Res>
    implements _$EventItineraryItemCopyWith<$Res> {
  __$EventItineraryItemCopyWithImpl(this._self, this._then);

  final _EventItineraryItem _self;
  final $Res Function(_EventItineraryItem) _then;

/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? kind = null,Object? offsetMinutes = null,Object? durationMinutes = freezed,Object? title = null,Object? description = freezed,Object? location = freezed,Object? routeDistanceMeters = freezed,}) {
  return _then(_EventItineraryItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as EventItineraryKind,offsetMinutes: null == offsetMinutes ? _self.offsetMinutes : offsetMinutes // ignore: cast_nullable_to_non_nullable
as int,durationMinutes: freezed == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as EventMeetingLocation?,routeDistanceMeters: freezed == routeDistanceMeters ? _self.routeDistanceMeters : routeDistanceMeters // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

/// Create a copy of EventItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventMeetingLocationCopyWith<$Res>? get location {
    if (_self.location == null) {
    return null;
  }

  return $EventMeetingLocationCopyWith<$Res>(_self.location!, (value) {
    return _then(_self.copyWith(location: value));
  });
}
}

// dart format on
