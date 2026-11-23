// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$AuthScreenState implements DiagnosticableTreeMixin {

 String get phoneNumber; String get countryCode; String? get verificationId; AuthStep get step;
/// Create a copy of AuthScreenState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AuthScreenStateCopyWith<AuthScreenState> get copyWith => _$AuthScreenStateCopyWithImpl<AuthScreenState>(this as AuthScreenState, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  final _this = this as AuthScreenState;
  properties
    ..add(DiagnosticsProperty('type', 'AuthScreenState'))
    ..add(DiagnosticsProperty('phoneNumber', _this.phoneNumber))..add(DiagnosticsProperty('countryCode', _this.countryCode))..add(DiagnosticsProperty('verificationId', _this.verificationId))..add(DiagnosticsProperty('step', _this.step));
}

@override
bool operator ==(Object other) {
  final _this = this as AuthScreenState;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AuthScreenState&&(identical(other.phoneNumber, _this.phoneNumber) || other.phoneNumber == _this.phoneNumber)&&(identical(other.countryCode, _this.countryCode) || other.countryCode == _this.countryCode)&&(identical(other.verificationId, _this.verificationId) || other.verificationId == _this.verificationId)&&(identical(other.step, _this.step) || other.step == _this.step));
}


@override
int get hashCode {
  final _this = this as AuthScreenState;
  return Object.hash(runtimeType,_this.phoneNumber,_this.countryCode,_this.verificationId,_this.step);
}

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  final _this = this as AuthScreenState;
  return 'AuthScreenState(phoneNumber: ${_this.phoneNumber}, countryCode: ${_this.countryCode}, verificationId: ${_this.verificationId}, step: ${_this.step})';
}


}

/// @nodoc
abstract mixin class $AuthScreenStateCopyWith<$Res>  {
  factory $AuthScreenStateCopyWith(AuthScreenState value, $Res Function(AuthScreenState) _then) = _$AuthScreenStateCopyWithImpl;
@useResult
$Res call({
 String phoneNumber, String countryCode, String? verificationId, AuthStep step
});




}
/// @nodoc
class _$AuthScreenStateCopyWithImpl<$Res>
    implements $AuthScreenStateCopyWith<$Res> {
  _$AuthScreenStateCopyWithImpl(this._self, this._then);

  final AuthScreenState _self;
  final $Res Function(AuthScreenState) _then;

/// Create a copy of AuthScreenState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? phoneNumber = null,Object? countryCode = null,Object? verificationId = freezed,Object? step = null,}) {
  return _then(AuthScreenState(
phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,verificationId: freezed == verificationId ? _self.verificationId : verificationId // ignore: cast_nullable_to_non_nullable
as String?,step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as AuthStep,
  ));
}

}


/// Adds pattern-matching-related methods to [AuthScreenState].
extension AuthScreenStatePatterns on AuthScreenState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AuthScreenState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AuthScreenState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AuthScreenState value)  $default,){
final _that = this;
switch (_that) {
case _AuthScreenState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AuthScreenState value)?  $default,){
final _that = this;
switch (_that) {
case _AuthScreenState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String phoneNumber,  String countryCode,  String? verificationId,  AuthStep step)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AuthScreenState() when $default != null:
return $default(_that.phoneNumber,_that.countryCode,_that.verificationId,_that.step);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String phoneNumber,  String countryCode,  String? verificationId,  AuthStep step)  $default,) {final _that = this;
switch (_that) {
case _AuthScreenState():
return $default(_that.phoneNumber,_that.countryCode,_that.verificationId,_that.step);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String phoneNumber,  String countryCode,  String? verificationId,  AuthStep step)?  $default,) {final _that = this;
switch (_that) {
case _AuthScreenState() when $default != null:
return $default(_that.phoneNumber,_that.countryCode,_that.verificationId,_that.step);case _:
  return null;

}
}

}

/// @nodoc


class _AuthScreenState with DiagnosticableTreeMixin implements AuthScreenState {
  const _AuthScreenState({this.phoneNumber = '', this.countryCode = defaultCountryDialCode, this.verificationId, this.step = AuthStep.phone});
  

@override@JsonKey() final  String phoneNumber;
@override@JsonKey() final  String countryCode;
@override final  String? verificationId;
@override@JsonKey() final  AuthStep step;

/// Create a copy of AuthScreenState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AuthScreenStateCopyWith<_AuthScreenState> get copyWith => __$AuthScreenStateCopyWithImpl<_AuthScreenState>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    properties
    ..add(DiagnosticsProperty('type', 'AuthScreenState'))
    ..add(DiagnosticsProperty('phoneNumber', phoneNumber))..add(DiagnosticsProperty('countryCode', countryCode))..add(DiagnosticsProperty('verificationId', verificationId))..add(DiagnosticsProperty('step', step));
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AuthScreenState&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.verificationId, verificationId) || other.verificationId == verificationId)&&(identical(other.step, step) || other.step == step));
}


@override
int get hashCode {
    return Object.hash(runtimeType,phoneNumber,countryCode,verificationId,step);
}

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
    return 'AuthScreenState(phoneNumber: $phoneNumber, countryCode: $countryCode, verificationId: $verificationId, step: $step)';
}


}

/// @nodoc
abstract mixin class _$AuthScreenStateCopyWith<$Res> implements $AuthScreenStateCopyWith<$Res> {
  factory _$AuthScreenStateCopyWith(_AuthScreenState value, $Res Function(_AuthScreenState) _then) = __$AuthScreenStateCopyWithImpl;
@override @useResult
$Res call({
 String phoneNumber, String countryCode, String? verificationId, AuthStep step
});




}
/// @nodoc
class __$AuthScreenStateCopyWithImpl<$Res>
    implements _$AuthScreenStateCopyWith<$Res> {
  __$AuthScreenStateCopyWithImpl(this._self, this._then);

  final _AuthScreenState _self;
  final $Res Function(_AuthScreenState) _then;

/// Create a copy of AuthScreenState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? phoneNumber = null,Object? countryCode = null,Object? verificationId = freezed,Object? step = null,}) {
  return _then(_AuthScreenState(
phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,verificationId: freezed == verificationId ? _self.verificationId : verificationId // ignore: cast_nullable_to_non_nullable
as String?,step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as AuthStep,
  ));
}


}

// dart format on
