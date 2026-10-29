// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_constraints.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventConstraints {

 int get minAge; int get maxAge; int? get maxMen; int? get maxWomen;
/// Create a copy of EventConstraints
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventConstraintsCopyWith<EventConstraints> get copyWith => _$EventConstraintsCopyWithImpl<EventConstraints>(this as EventConstraints, _$identity);

  /// Serializes this EventConstraints to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventConstraints&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,minAge,maxAge,maxMen,maxWomen);

@override
String toString() {
  return 'EventConstraints(minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen)';
}


}

/// @nodoc
abstract mixin class $EventConstraintsCopyWith<$Res>  {
  factory $EventConstraintsCopyWith(EventConstraints value, $Res Function(EventConstraints) _then) = _$EventConstraintsCopyWithImpl;
@useResult
$Res call({
 int minAge, int maxAge, int? maxMen, int? maxWomen
});




}
/// @nodoc
class _$EventConstraintsCopyWithImpl<$Res>
    implements $EventConstraintsCopyWith<$Res> {
  _$EventConstraintsCopyWithImpl(this._self, this._then);

  final EventConstraints _self;
  final $Res Function(EventConstraints) _then;

/// Create a copy of EventConstraints
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? minAge = null,Object? maxAge = null,Object? maxMen = freezed,Object? maxWomen = freezed,}) {
  return _then(_self.copyWith(
minAge: null == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as int,maxAge: null == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as int,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as int?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventConstraints].
extension EventConstraintsPatterns on EventConstraints {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventConstraints value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventConstraints() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventConstraints value)  $default,){
final _that = this;
switch (_that) {
case _EventConstraints():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventConstraints value)?  $default,){
final _that = this;
switch (_that) {
case _EventConstraints() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int minAge,  int maxAge,  int? maxMen,  int? maxWomen)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventConstraints() when $default != null:
return $default(_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int minAge,  int maxAge,  int? maxMen,  int? maxWomen)  $default,) {final _that = this;
switch (_that) {
case _EventConstraints():
return $default(_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int minAge,  int maxAge,  int? maxMen,  int? maxWomen)?  $default,) {final _that = this;
switch (_that) {
case _EventConstraints() when $default != null:
return $default(_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventConstraints implements EventConstraints {
  const _EventConstraints({this.minAge = 0, this.maxAge = 99, this.maxMen, this.maxWomen});
  factory _EventConstraints.fromJson(Map<String, dynamic> json) => _$EventConstraintsFromJson(json);

@override@JsonKey() final  int minAge;
@override@JsonKey() final  int maxAge;
@override final  int? maxMen;
@override final  int? maxWomen;

/// Create a copy of EventConstraints
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventConstraintsCopyWith<_EventConstraints> get copyWith => __$EventConstraintsCopyWithImpl<_EventConstraints>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventConstraintsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventConstraints&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,minAge,maxAge,maxMen,maxWomen);

@override
String toString() {
  return 'EventConstraints(minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen)';
}


}

/// @nodoc
abstract mixin class _$EventConstraintsCopyWith<$Res> implements $EventConstraintsCopyWith<$Res> {
  factory _$EventConstraintsCopyWith(_EventConstraints value, $Res Function(_EventConstraints) _then) = __$EventConstraintsCopyWithImpl;
@override @useResult
$Res call({
 int minAge, int maxAge, int? maxMen, int? maxWomen
});




}
/// @nodoc
class __$EventConstraintsCopyWithImpl<$Res>
    implements _$EventConstraintsCopyWith<$Res> {
  __$EventConstraintsCopyWithImpl(this._self, this._then);

  final _EventConstraints _self;
  final $Res Function(_EventConstraints) _then;

/// Create a copy of EventConstraints
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? minAge = null,Object? maxAge = null,Object? maxMen = freezed,Object? maxWomen = freezed,}) {
  return _then(_EventConstraints(
minAge: null == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as int,maxAge: null == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as int,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as int?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
