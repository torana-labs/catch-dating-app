// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'host_form_admission_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$HostFormAdmissionState {

 HostFormAdmissionPreview? get preview; PendingFormAdmission? get pending; HostFormAdmissionReceipt? get receipt; Object? get error; bool get busy; bool get actorAvailable;
/// Create a copy of HostFormAdmissionState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HostFormAdmissionStateCopyWith<HostFormAdmissionState> get copyWith => _$HostFormAdmissionStateCopyWithImpl<HostFormAdmissionState>(this as HostFormAdmissionState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HostFormAdmissionState&&(identical(other.preview, preview) || other.preview == preview)&&(identical(other.pending, pending) || other.pending == pending)&&(identical(other.receipt, receipt) || other.receipt == receipt)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.busy, busy) || other.busy == busy)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,preview,pending,receipt,const DeepCollectionEquality().hash(error),busy,actorAvailable);

@override
String toString() {
  return 'HostFormAdmissionState(preview: $preview, pending: $pending, receipt: $receipt, error: $error, busy: $busy, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class $HostFormAdmissionStateCopyWith<$Res>  {
  factory $HostFormAdmissionStateCopyWith(HostFormAdmissionState value, $Res Function(HostFormAdmissionState) _then) = _$HostFormAdmissionStateCopyWithImpl;
@useResult
$Res call({
 HostFormAdmissionPreview? preview, PendingFormAdmission? pending, HostFormAdmissionReceipt? receipt, Object? error, bool busy, bool actorAvailable
});




}
/// @nodoc
class _$HostFormAdmissionStateCopyWithImpl<$Res>
    implements $HostFormAdmissionStateCopyWith<$Res> {
  _$HostFormAdmissionStateCopyWithImpl(this._self, this._then);

  final HostFormAdmissionState _self;
  final $Res Function(HostFormAdmissionState) _then;

/// Create a copy of HostFormAdmissionState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? preview = freezed,Object? pending = freezed,Object? receipt = freezed,Object? error = freezed,Object? busy = null,Object? actorAvailable = null,}) {
  return _then(_self.copyWith(
preview: freezed == preview ? _self.preview : preview // ignore: cast_nullable_to_non_nullable
as HostFormAdmissionPreview?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as PendingFormAdmission?,receipt: freezed == receipt ? _self.receipt : receipt // ignore: cast_nullable_to_non_nullable
as HostFormAdmissionReceipt?,error: freezed == error ? _self.error : error ,busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [HostFormAdmissionState].
extension HostFormAdmissionStatePatterns on HostFormAdmissionState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HostFormAdmissionState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HostFormAdmissionState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HostFormAdmissionState value)  $default,){
final _that = this;
switch (_that) {
case _HostFormAdmissionState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HostFormAdmissionState value)?  $default,){
final _that = this;
switch (_that) {
case _HostFormAdmissionState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( HostFormAdmissionPreview? preview,  PendingFormAdmission? pending,  HostFormAdmissionReceipt? receipt,  Object? error,  bool busy,  bool actorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HostFormAdmissionState() when $default != null:
return $default(_that.preview,_that.pending,_that.receipt,_that.error,_that.busy,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( HostFormAdmissionPreview? preview,  PendingFormAdmission? pending,  HostFormAdmissionReceipt? receipt,  Object? error,  bool busy,  bool actorAvailable)  $default,) {final _that = this;
switch (_that) {
case _HostFormAdmissionState():
return $default(_that.preview,_that.pending,_that.receipt,_that.error,_that.busy,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( HostFormAdmissionPreview? preview,  PendingFormAdmission? pending,  HostFormAdmissionReceipt? receipt,  Object? error,  bool busy,  bool actorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _HostFormAdmissionState() when $default != null:
return $default(_that.preview,_that.pending,_that.receipt,_that.error,_that.busy,_that.actorAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _HostFormAdmissionState implements HostFormAdmissionState {
  const _HostFormAdmissionState({this.preview, this.pending, this.receipt, this.error, this.busy = false, this.actorAvailable = true});
  

@override final  HostFormAdmissionPreview? preview;
@override final  PendingFormAdmission? pending;
@override final  HostFormAdmissionReceipt? receipt;
@override final  Object? error;
@override@JsonKey() final  bool busy;
@override@JsonKey() final  bool actorAvailable;

/// Create a copy of HostFormAdmissionState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HostFormAdmissionStateCopyWith<_HostFormAdmissionState> get copyWith => __$HostFormAdmissionStateCopyWithImpl<_HostFormAdmissionState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HostFormAdmissionState&&(identical(other.preview, preview) || other.preview == preview)&&(identical(other.pending, pending) || other.pending == pending)&&(identical(other.receipt, receipt) || other.receipt == receipt)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.busy, busy) || other.busy == busy)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,preview,pending,receipt,const DeepCollectionEquality().hash(error),busy,actorAvailable);

@override
String toString() {
  return 'HostFormAdmissionState(preview: $preview, pending: $pending, receipt: $receipt, error: $error, busy: $busy, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class _$HostFormAdmissionStateCopyWith<$Res> implements $HostFormAdmissionStateCopyWith<$Res> {
  factory _$HostFormAdmissionStateCopyWith(_HostFormAdmissionState value, $Res Function(_HostFormAdmissionState) _then) = __$HostFormAdmissionStateCopyWithImpl;
@override @useResult
$Res call({
 HostFormAdmissionPreview? preview, PendingFormAdmission? pending, HostFormAdmissionReceipt? receipt, Object? error, bool busy, bool actorAvailable
});




}
/// @nodoc
class __$HostFormAdmissionStateCopyWithImpl<$Res>
    implements _$HostFormAdmissionStateCopyWith<$Res> {
  __$HostFormAdmissionStateCopyWithImpl(this._self, this._then);

  final _HostFormAdmissionState _self;
  final $Res Function(_HostFormAdmissionState) _then;

/// Create a copy of HostFormAdmissionState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? preview = freezed,Object? pending = freezed,Object? receipt = freezed,Object? error = freezed,Object? busy = null,Object? actorAvailable = null,}) {
  return _then(_HostFormAdmissionState(
preview: freezed == preview ? _self.preview : preview // ignore: cast_nullable_to_non_nullable
as HostFormAdmissionPreview?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as PendingFormAdmission?,receipt: freezed == receipt ? _self.receipt : receipt // ignore: cast_nullable_to_non_nullable
as HostFormAdmissionReceipt?,error: freezed == error ? _self.error : error ,busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
