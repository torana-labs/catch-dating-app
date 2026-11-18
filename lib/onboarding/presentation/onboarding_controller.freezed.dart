// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'onboarding_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$OnboardingData implements DiagnosticableTreeMixin {

 OnboardingStep get step; bool get phoneVerified; OnboardingProfileDraft get profileDraft; bool get operationPending;
/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingDataCopyWith<OnboardingData> get copyWith => _$OnboardingDataCopyWithImpl<OnboardingData>(this as OnboardingData, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  final _this = this as OnboardingData;
  properties
    ..add(DiagnosticsProperty('type', 'OnboardingData'))
    ..add(DiagnosticsProperty('step', _this.step))..add(DiagnosticsProperty('phoneVerified', _this.phoneVerified))..add(DiagnosticsProperty('profileDraft', _this.profileDraft))..add(DiagnosticsProperty('operationPending', _this.operationPending));
}

@override
bool operator ==(Object other) {
  final _this = this as OnboardingData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingData&&(identical(other.step, _this.step) || other.step == _this.step)&&(identical(other.phoneVerified, _this.phoneVerified) || other.phoneVerified == _this.phoneVerified)&&(identical(other.profileDraft, _this.profileDraft) || other.profileDraft == _this.profileDraft)&&(identical(other.operationPending, _this.operationPending) || other.operationPending == _this.operationPending));
}


@override
int get hashCode {
  final _this = this as OnboardingData;
  return Object.hash(runtimeType,_this.step,_this.phoneVerified,_this.profileDraft,_this.operationPending);
}

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  final _this = this as OnboardingData;
  return 'OnboardingData(step: ${_this.step}, phoneVerified: ${_this.phoneVerified}, profileDraft: ${_this.profileDraft}, operationPending: ${_this.operationPending})';
}


}

/// @nodoc
abstract mixin class $OnboardingDataCopyWith<$Res>  {
  factory $OnboardingDataCopyWith(OnboardingData value, $Res Function(OnboardingData) _then) = _$OnboardingDataCopyWithImpl;
@useResult
$Res call({
 OnboardingStep step, bool phoneVerified, OnboardingProfileDraft profileDraft, bool operationPending
});


$OnboardingProfileDraftCopyWith<$Res> get profileDraft;

}
/// @nodoc
class _$OnboardingDataCopyWithImpl<$Res>
    implements $OnboardingDataCopyWith<$Res> {
  _$OnboardingDataCopyWithImpl(this._self, this._then);

  final OnboardingData _self;
  final $Res Function(OnboardingData) _then;

/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? step = null,Object? phoneVerified = null,Object? profileDraft = null,Object? operationPending = null,}) {
  return _then(OnboardingData(
step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as OnboardingStep,phoneVerified: null == phoneVerified ? _self.phoneVerified : phoneVerified // ignore: cast_nullable_to_non_nullable
as bool,profileDraft: null == profileDraft ? _self.profileDraft : profileDraft // ignore: cast_nullable_to_non_nullable
as OnboardingProfileDraft,operationPending: null == operationPending ? _self.operationPending : operationPending // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingProfileDraftCopyWith<$Res> get profileDraft {
  
  return $OnboardingProfileDraftCopyWith<$Res>(_self.profileDraft, (value) {
    return _then(_self.copyWith(profileDraft: value));
  });
}
}


/// Adds pattern-matching-related methods to [OnboardingData].
extension OnboardingDataPatterns on OnboardingData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingData value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingData value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( OnboardingStep step,  bool phoneVerified,  OnboardingProfileDraft profileDraft,  bool operationPending)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingData() when $default != null:
return $default(_that.step,_that.phoneVerified,_that.profileDraft,_that.operationPending);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( OnboardingStep step,  bool phoneVerified,  OnboardingProfileDraft profileDraft,  bool operationPending)  $default,) {final _that = this;
switch (_that) {
case _OnboardingData():
return $default(_that.step,_that.phoneVerified,_that.profileDraft,_that.operationPending);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( OnboardingStep step,  bool phoneVerified,  OnboardingProfileDraft profileDraft,  bool operationPending)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingData() when $default != null:
return $default(_that.step,_that.phoneVerified,_that.profileDraft,_that.operationPending);case _:
  return null;

}
}

}

/// @nodoc


class _OnboardingData extends OnboardingData with DiagnosticableTreeMixin {
  const _OnboardingData({this.step = OnboardingStep.welcome, this.phoneVerified = false, this.profileDraft = const OnboardingProfileDraft(), this.operationPending = false}): super._();
  

@override@JsonKey() final  OnboardingStep step;
@override@JsonKey() final  bool phoneVerified;
@override@JsonKey() final  OnboardingProfileDraft profileDraft;
@override@JsonKey() final  bool operationPending;

/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingDataCopyWith<_OnboardingData> get copyWith => __$OnboardingDataCopyWithImpl<_OnboardingData>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    properties
    ..add(DiagnosticsProperty('type', 'OnboardingData'))
    ..add(DiagnosticsProperty('step', step))..add(DiagnosticsProperty('phoneVerified', phoneVerified))..add(DiagnosticsProperty('profileDraft', profileDraft))..add(DiagnosticsProperty('operationPending', operationPending));
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingData&&(identical(other.step, step) || other.step == step)&&(identical(other.phoneVerified, phoneVerified) || other.phoneVerified == phoneVerified)&&(identical(other.profileDraft, profileDraft) || other.profileDraft == profileDraft)&&(identical(other.operationPending, operationPending) || other.operationPending == operationPending));
}


@override
int get hashCode {
    return Object.hash(runtimeType,step,phoneVerified,profileDraft,operationPending);
}

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
    return 'OnboardingData(step: $step, phoneVerified: $phoneVerified, profileDraft: $profileDraft, operationPending: $operationPending)';
}


}

/// @nodoc
abstract mixin class _$OnboardingDataCopyWith<$Res> implements $OnboardingDataCopyWith<$Res> {
  factory _$OnboardingDataCopyWith(_OnboardingData value, $Res Function(_OnboardingData) _then) = __$OnboardingDataCopyWithImpl;
@override @useResult
$Res call({
 OnboardingStep step, bool phoneVerified, OnboardingProfileDraft profileDraft, bool operationPending
});


@override $OnboardingProfileDraftCopyWith<$Res> get profileDraft;

}
/// @nodoc
class __$OnboardingDataCopyWithImpl<$Res>
    implements _$OnboardingDataCopyWith<$Res> {
  __$OnboardingDataCopyWithImpl(this._self, this._then);

  final _OnboardingData _self;
  final $Res Function(_OnboardingData) _then;

/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? step = null,Object? phoneVerified = null,Object? profileDraft = null,Object? operationPending = null,}) {
  return _then(_OnboardingData(
step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as OnboardingStep,phoneVerified: null == phoneVerified ? _self.phoneVerified : phoneVerified // ignore: cast_nullable_to_non_nullable
as bool,profileDraft: null == profileDraft ? _self.profileDraft : profileDraft // ignore: cast_nullable_to_non_nullable
as OnboardingProfileDraft,operationPending: null == operationPending ? _self.operationPending : operationPending // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of OnboardingData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingProfileDraftCopyWith<$Res> get profileDraft {
  
  return $OnboardingProfileDraftCopyWith<$Res>(_self.profileDraft, (value) {
    return _then(_self.copyWith(profileDraft: value));
  });
}
}

// dart format on
