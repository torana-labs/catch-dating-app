// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'host_manager_event_setup_defaults_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$HostManagerEventSetupDefaultsState {

 ManagerEventSetupDefaults? get current; ManagerEventSetupDefaultsUpdateRequest? get pending; Object? get error; bool get loading; bool get saving; bool get actorAvailable;
/// Create a copy of HostManagerEventSetupDefaultsState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HostManagerEventSetupDefaultsStateCopyWith<HostManagerEventSetupDefaultsState> get copyWith => _$HostManagerEventSetupDefaultsStateCopyWithImpl<HostManagerEventSetupDefaultsState>(this as HostManagerEventSetupDefaultsState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HostManagerEventSetupDefaultsState&&(identical(other.current, current) || other.current == current)&&(identical(other.pending, pending) || other.pending == pending)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,current,pending,const DeepCollectionEquality().hash(error),loading,saving,actorAvailable);

@override
String toString() {
  return 'HostManagerEventSetupDefaultsState(current: $current, pending: $pending, error: $error, loading: $loading, saving: $saving, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class $HostManagerEventSetupDefaultsStateCopyWith<$Res>  {
  factory $HostManagerEventSetupDefaultsStateCopyWith(HostManagerEventSetupDefaultsState value, $Res Function(HostManagerEventSetupDefaultsState) _then) = _$HostManagerEventSetupDefaultsStateCopyWithImpl;
@useResult
$Res call({
 ManagerEventSetupDefaults? current, ManagerEventSetupDefaultsUpdateRequest? pending, Object? error, bool loading, bool saving, bool actorAvailable
});




}
/// @nodoc
class _$HostManagerEventSetupDefaultsStateCopyWithImpl<$Res>
    implements $HostManagerEventSetupDefaultsStateCopyWith<$Res> {
  _$HostManagerEventSetupDefaultsStateCopyWithImpl(this._self, this._then);

  final HostManagerEventSetupDefaultsState _self;
  final $Res Function(HostManagerEventSetupDefaultsState) _then;

/// Create a copy of HostManagerEventSetupDefaultsState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? current = freezed,Object? pending = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? actorAvailable = null,}) {
  return _then(_self.copyWith(
current: freezed == current ? _self.current : current // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaultsUpdateRequest?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [HostManagerEventSetupDefaultsState].
extension HostManagerEventSetupDefaultsStatePatterns on HostManagerEventSetupDefaultsState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HostManagerEventSetupDefaultsState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HostManagerEventSetupDefaultsState value)  $default,){
final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HostManagerEventSetupDefaultsState value)?  $default,){
final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ManagerEventSetupDefaults? current,  ManagerEventSetupDefaultsUpdateRequest? pending,  Object? error,  bool loading,  bool saving,  bool actorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState() when $default != null:
return $default(_that.current,_that.pending,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ManagerEventSetupDefaults? current,  ManagerEventSetupDefaultsUpdateRequest? pending,  Object? error,  bool loading,  bool saving,  bool actorAvailable)  $default,) {final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState():
return $default(_that.current,_that.pending,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ManagerEventSetupDefaults? current,  ManagerEventSetupDefaultsUpdateRequest? pending,  Object? error,  bool loading,  bool saving,  bool actorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _HostManagerEventSetupDefaultsState() when $default != null:
return $default(_that.current,_that.pending,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _HostManagerEventSetupDefaultsState extends HostManagerEventSetupDefaultsState {
  const _HostManagerEventSetupDefaultsState({this.current, this.pending, this.error, this.loading = false, this.saving = false, this.actorAvailable = true}): super._();
  

@override final  ManagerEventSetupDefaults? current;
@override final  ManagerEventSetupDefaultsUpdateRequest? pending;
@override final  Object? error;
@override@JsonKey() final  bool loading;
@override@JsonKey() final  bool saving;
@override@JsonKey() final  bool actorAvailable;

/// Create a copy of HostManagerEventSetupDefaultsState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HostManagerEventSetupDefaultsStateCopyWith<_HostManagerEventSetupDefaultsState> get copyWith => __$HostManagerEventSetupDefaultsStateCopyWithImpl<_HostManagerEventSetupDefaultsState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HostManagerEventSetupDefaultsState&&(identical(other.current, current) || other.current == current)&&(identical(other.pending, pending) || other.pending == pending)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,current,pending,const DeepCollectionEquality().hash(error),loading,saving,actorAvailable);

@override
String toString() {
  return 'HostManagerEventSetupDefaultsState(current: $current, pending: $pending, error: $error, loading: $loading, saving: $saving, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class _$HostManagerEventSetupDefaultsStateCopyWith<$Res> implements $HostManagerEventSetupDefaultsStateCopyWith<$Res> {
  factory _$HostManagerEventSetupDefaultsStateCopyWith(_HostManagerEventSetupDefaultsState value, $Res Function(_HostManagerEventSetupDefaultsState) _then) = __$HostManagerEventSetupDefaultsStateCopyWithImpl;
@override @useResult
$Res call({
 ManagerEventSetupDefaults? current, ManagerEventSetupDefaultsUpdateRequest? pending, Object? error, bool loading, bool saving, bool actorAvailable
});




}
/// @nodoc
class __$HostManagerEventSetupDefaultsStateCopyWithImpl<$Res>
    implements _$HostManagerEventSetupDefaultsStateCopyWith<$Res> {
  __$HostManagerEventSetupDefaultsStateCopyWithImpl(this._self, this._then);

  final _HostManagerEventSetupDefaultsState _self;
  final $Res Function(_HostManagerEventSetupDefaultsState) _then;

/// Create a copy of HostManagerEventSetupDefaultsState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? current = freezed,Object? pending = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? actorAvailable = null,}) {
  return _then(_HostManagerEventSetupDefaultsState(
current: freezed == current ? _self.current : current // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaultsUpdateRequest?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
