// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_policy_defaults.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventPolicyDefaults {

 EventAdmissionDefaultPreset get admissionPreset; int get minAge; int get maxAge; int? get maxMen; int? get maxWomen; bool get dynamicPricingEnabled; int? get dynamicPricingStepInPaise; int? get dynamicPricingMaxInPaise; EventCancellationPolicyId get cancellationPolicyId;
/// Create a copy of EventPolicyDefaults
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventPolicyDefaultsCopyWith<EventPolicyDefaults> get copyWith => _$EventPolicyDefaultsCopyWithImpl<EventPolicyDefaults>(this as EventPolicyDefaults, _$identity);

  /// Serializes this EventPolicyDefaults to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventPolicyDefaults&&(identical(other.admissionPreset, admissionPreset) || other.admissionPreset == admissionPreset)&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen)&&(identical(other.dynamicPricingEnabled, dynamicPricingEnabled) || other.dynamicPricingEnabled == dynamicPricingEnabled)&&(identical(other.dynamicPricingStepInPaise, dynamicPricingStepInPaise) || other.dynamicPricingStepInPaise == dynamicPricingStepInPaise)&&(identical(other.dynamicPricingMaxInPaise, dynamicPricingMaxInPaise) || other.dynamicPricingMaxInPaise == dynamicPricingMaxInPaise)&&(identical(other.cancellationPolicyId, cancellationPolicyId) || other.cancellationPolicyId == cancellationPolicyId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,admissionPreset,minAge,maxAge,maxMen,maxWomen,dynamicPricingEnabled,dynamicPricingStepInPaise,dynamicPricingMaxInPaise,cancellationPolicyId);

@override
String toString() {
  return 'EventPolicyDefaults(admissionPreset: $admissionPreset, minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen, dynamicPricingEnabled: $dynamicPricingEnabled, dynamicPricingStepInPaise: $dynamicPricingStepInPaise, dynamicPricingMaxInPaise: $dynamicPricingMaxInPaise, cancellationPolicyId: $cancellationPolicyId)';
}


}

/// @nodoc
abstract mixin class $EventPolicyDefaultsCopyWith<$Res>  {
  factory $EventPolicyDefaultsCopyWith(EventPolicyDefaults value, $Res Function(EventPolicyDefaults) _then) = _$EventPolicyDefaultsCopyWithImpl;
@useResult
$Res call({
 EventAdmissionDefaultPreset admissionPreset, int minAge, int maxAge, int? maxMen, int? maxWomen, bool dynamicPricingEnabled, int? dynamicPricingStepInPaise, int? dynamicPricingMaxInPaise, EventCancellationPolicyId cancellationPolicyId
});




}
/// @nodoc
class _$EventPolicyDefaultsCopyWithImpl<$Res>
    implements $EventPolicyDefaultsCopyWith<$Res> {
  _$EventPolicyDefaultsCopyWithImpl(this._self, this._then);

  final EventPolicyDefaults _self;
  final $Res Function(EventPolicyDefaults) _then;

/// Create a copy of EventPolicyDefaults
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? admissionPreset = null,Object? minAge = null,Object? maxAge = null,Object? maxMen = freezed,Object? maxWomen = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStepInPaise = freezed,Object? dynamicPricingMaxInPaise = freezed,Object? cancellationPolicyId = null,}) {
  return _then(_self.copyWith(
admissionPreset: null == admissionPreset ? _self.admissionPreset : admissionPreset // ignore: cast_nullable_to_non_nullable
as EventAdmissionDefaultPreset,minAge: null == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as int,maxAge: null == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as int,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as int?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as int?,dynamicPricingEnabled: null == dynamicPricingEnabled ? _self.dynamicPricingEnabled : dynamicPricingEnabled // ignore: cast_nullable_to_non_nullable
as bool,dynamicPricingStepInPaise: freezed == dynamicPricingStepInPaise ? _self.dynamicPricingStepInPaise : dynamicPricingStepInPaise // ignore: cast_nullable_to_non_nullable
as int?,dynamicPricingMaxInPaise: freezed == dynamicPricingMaxInPaise ? _self.dynamicPricingMaxInPaise : dynamicPricingMaxInPaise // ignore: cast_nullable_to_non_nullable
as int?,cancellationPolicyId: null == cancellationPolicyId ? _self.cancellationPolicyId : cancellationPolicyId // ignore: cast_nullable_to_non_nullable
as EventCancellationPolicyId,
  ));
}

}


/// Adds pattern-matching-related methods to [EventPolicyDefaults].
extension EventPolicyDefaultsPatterns on EventPolicyDefaults {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventPolicyDefaults value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventPolicyDefaults() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventPolicyDefaults value)  $default,){
final _that = this;
switch (_that) {
case _EventPolicyDefaults():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventPolicyDefaults value)?  $default,){
final _that = this;
switch (_that) {
case _EventPolicyDefaults() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( EventAdmissionDefaultPreset admissionPreset,  int minAge,  int maxAge,  int? maxMen,  int? maxWomen,  bool dynamicPricingEnabled,  int? dynamicPricingStepInPaise,  int? dynamicPricingMaxInPaise,  EventCancellationPolicyId cancellationPolicyId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventPolicyDefaults() when $default != null:
return $default(_that.admissionPreset,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.dynamicPricingEnabled,_that.dynamicPricingStepInPaise,_that.dynamicPricingMaxInPaise,_that.cancellationPolicyId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( EventAdmissionDefaultPreset admissionPreset,  int minAge,  int maxAge,  int? maxMen,  int? maxWomen,  bool dynamicPricingEnabled,  int? dynamicPricingStepInPaise,  int? dynamicPricingMaxInPaise,  EventCancellationPolicyId cancellationPolicyId)  $default,) {final _that = this;
switch (_that) {
case _EventPolicyDefaults():
return $default(_that.admissionPreset,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.dynamicPricingEnabled,_that.dynamicPricingStepInPaise,_that.dynamicPricingMaxInPaise,_that.cancellationPolicyId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( EventAdmissionDefaultPreset admissionPreset,  int minAge,  int maxAge,  int? maxMen,  int? maxWomen,  bool dynamicPricingEnabled,  int? dynamicPricingStepInPaise,  int? dynamicPricingMaxInPaise,  EventCancellationPolicyId cancellationPolicyId)?  $default,) {final _that = this;
switch (_that) {
case _EventPolicyDefaults() when $default != null:
return $default(_that.admissionPreset,_that.minAge,_that.maxAge,_that.maxMen,_that.maxWomen,_that.dynamicPricingEnabled,_that.dynamicPricingStepInPaise,_that.dynamicPricingMaxInPaise,_that.cancellationPolicyId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventPolicyDefaults extends EventPolicyDefaults {
  const _EventPolicyDefaults({this.admissionPreset = EventAdmissionDefaultPreset.openCapacity, this.minAge = 0, this.maxAge = 99, this.maxMen, this.maxWomen, this.dynamicPricingEnabled = false, this.dynamicPricingStepInPaise, this.dynamicPricingMaxInPaise, this.cancellationPolicyId = EventCancellationPolicyId.standard}): super._();
  factory _EventPolicyDefaults.fromJson(Map<String, dynamic> json) => _$EventPolicyDefaultsFromJson(json);

@override@JsonKey() final  EventAdmissionDefaultPreset admissionPreset;
@override@JsonKey() final  int minAge;
@override@JsonKey() final  int maxAge;
@override final  int? maxMen;
@override final  int? maxWomen;
@override@JsonKey() final  bool dynamicPricingEnabled;
@override final  int? dynamicPricingStepInPaise;
@override final  int? dynamicPricingMaxInPaise;
@override@JsonKey() final  EventCancellationPolicyId cancellationPolicyId;

/// Create a copy of EventPolicyDefaults
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventPolicyDefaultsCopyWith<_EventPolicyDefaults> get copyWith => __$EventPolicyDefaultsCopyWithImpl<_EventPolicyDefaults>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventPolicyDefaultsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventPolicyDefaults&&(identical(other.admissionPreset, admissionPreset) || other.admissionPreset == admissionPreset)&&(identical(other.minAge, minAge) || other.minAge == minAge)&&(identical(other.maxAge, maxAge) || other.maxAge == maxAge)&&(identical(other.maxMen, maxMen) || other.maxMen == maxMen)&&(identical(other.maxWomen, maxWomen) || other.maxWomen == maxWomen)&&(identical(other.dynamicPricingEnabled, dynamicPricingEnabled) || other.dynamicPricingEnabled == dynamicPricingEnabled)&&(identical(other.dynamicPricingStepInPaise, dynamicPricingStepInPaise) || other.dynamicPricingStepInPaise == dynamicPricingStepInPaise)&&(identical(other.dynamicPricingMaxInPaise, dynamicPricingMaxInPaise) || other.dynamicPricingMaxInPaise == dynamicPricingMaxInPaise)&&(identical(other.cancellationPolicyId, cancellationPolicyId) || other.cancellationPolicyId == cancellationPolicyId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,admissionPreset,minAge,maxAge,maxMen,maxWomen,dynamicPricingEnabled,dynamicPricingStepInPaise,dynamicPricingMaxInPaise,cancellationPolicyId);

@override
String toString() {
  return 'EventPolicyDefaults(admissionPreset: $admissionPreset, minAge: $minAge, maxAge: $maxAge, maxMen: $maxMen, maxWomen: $maxWomen, dynamicPricingEnabled: $dynamicPricingEnabled, dynamicPricingStepInPaise: $dynamicPricingStepInPaise, dynamicPricingMaxInPaise: $dynamicPricingMaxInPaise, cancellationPolicyId: $cancellationPolicyId)';
}


}

/// @nodoc
abstract mixin class _$EventPolicyDefaultsCopyWith<$Res> implements $EventPolicyDefaultsCopyWith<$Res> {
  factory _$EventPolicyDefaultsCopyWith(_EventPolicyDefaults value, $Res Function(_EventPolicyDefaults) _then) = __$EventPolicyDefaultsCopyWithImpl;
@override @useResult
$Res call({
 EventAdmissionDefaultPreset admissionPreset, int minAge, int maxAge, int? maxMen, int? maxWomen, bool dynamicPricingEnabled, int? dynamicPricingStepInPaise, int? dynamicPricingMaxInPaise, EventCancellationPolicyId cancellationPolicyId
});




}
/// @nodoc
class __$EventPolicyDefaultsCopyWithImpl<$Res>
    implements _$EventPolicyDefaultsCopyWith<$Res> {
  __$EventPolicyDefaultsCopyWithImpl(this._self, this._then);

  final _EventPolicyDefaults _self;
  final $Res Function(_EventPolicyDefaults) _then;

/// Create a copy of EventPolicyDefaults
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? admissionPreset = null,Object? minAge = null,Object? maxAge = null,Object? maxMen = freezed,Object? maxWomen = freezed,Object? dynamicPricingEnabled = null,Object? dynamicPricingStepInPaise = freezed,Object? dynamicPricingMaxInPaise = freezed,Object? cancellationPolicyId = null,}) {
  return _then(_EventPolicyDefaults(
admissionPreset: null == admissionPreset ? _self.admissionPreset : admissionPreset // ignore: cast_nullable_to_non_nullable
as EventAdmissionDefaultPreset,minAge: null == minAge ? _self.minAge : minAge // ignore: cast_nullable_to_non_nullable
as int,maxAge: null == maxAge ? _self.maxAge : maxAge // ignore: cast_nullable_to_non_nullable
as int,maxMen: freezed == maxMen ? _self.maxMen : maxMen // ignore: cast_nullable_to_non_nullable
as int?,maxWomen: freezed == maxWomen ? _self.maxWomen : maxWomen // ignore: cast_nullable_to_non_nullable
as int?,dynamicPricingEnabled: null == dynamicPricingEnabled ? _self.dynamicPricingEnabled : dynamicPricingEnabled // ignore: cast_nullable_to_non_nullable
as bool,dynamicPricingStepInPaise: freezed == dynamicPricingStepInPaise ? _self.dynamicPricingStepInPaise : dynamicPricingStepInPaise // ignore: cast_nullable_to_non_nullable
as int?,dynamicPricingMaxInPaise: freezed == dynamicPricingMaxInPaise ? _self.dynamicPricingMaxInPaise : dynamicPricingMaxInPaise // ignore: cast_nullable_to_non_nullable
as int?,cancellationPolicyId: null == cancellationPolicyId ? _self.cancellationPolicyId : cancellationPolicyId // ignore: cast_nullable_to_non_nullable
as EventCancellationPolicyId,
  ));
}


}

// dart format on
