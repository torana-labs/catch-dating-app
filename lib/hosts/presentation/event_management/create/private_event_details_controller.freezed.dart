// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'private_event_details_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$PrivateEventDetailsState {

 PrivateEventBasicSummary? get event; ManagerEventSetupDefaults? get defaults; PrivateEventDetailsUpdateRequest? get pending; PrivateSeatReconciliationProgress? get reconciliationProgress; Object? get error; bool get loading; bool get saving; bool get uploading; bool get actorAvailable; bool get discardUnavailable; bool get photoUploadAvailable; bool get reconciliationAvailable;
/// Create a copy of PrivateEventDetailsState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PrivateEventDetailsStateCopyWith<PrivateEventDetailsState> get copyWith => _$PrivateEventDetailsStateCopyWithImpl<PrivateEventDetailsState>(this as PrivateEventDetailsState, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as PrivateEventDetailsState;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PrivateEventDetailsState&&(identical(other.event, _this.event) || other.event == _this.event)&&(identical(other.defaults, _this.defaults) || other.defaults == _this.defaults)&&(identical(other.pending, _this.pending) || other.pending == _this.pending)&&(identical(other.reconciliationProgress, _this.reconciliationProgress) || other.reconciliationProgress == _this.reconciliationProgress)&&const DeepCollectionEquality().equals(other.error, _this.error)&&(identical(other.loading, _this.loading) || other.loading == _this.loading)&&(identical(other.saving, _this.saving) || other.saving == _this.saving)&&(identical(other.uploading, _this.uploading) || other.uploading == _this.uploading)&&(identical(other.actorAvailable, _this.actorAvailable) || other.actorAvailable == _this.actorAvailable)&&(identical(other.discardUnavailable, _this.discardUnavailable) || other.discardUnavailable == _this.discardUnavailable)&&(identical(other.photoUploadAvailable, _this.photoUploadAvailable) || other.photoUploadAvailable == _this.photoUploadAvailable)&&(identical(other.reconciliationAvailable, _this.reconciliationAvailable) || other.reconciliationAvailable == _this.reconciliationAvailable));
}


@override
int get hashCode {
  final _this = this as PrivateEventDetailsState;
  return Object.hash(runtimeType,_this.event,_this.defaults,_this.pending,_this.reconciliationProgress,const DeepCollectionEquality().hash(_this.error),_this.loading,_this.saving,_this.uploading,_this.actorAvailable,_this.discardUnavailable,_this.photoUploadAvailable,_this.reconciliationAvailable);
}

@override
String toString() {
  final _this = this as PrivateEventDetailsState;
  return 'PrivateEventDetailsState(event: ${_this.event}, defaults: ${_this.defaults}, pending: ${_this.pending}, reconciliationProgress: ${_this.reconciliationProgress}, error: ${_this.error}, loading: ${_this.loading}, saving: ${_this.saving}, uploading: ${_this.uploading}, actorAvailable: ${_this.actorAvailable}, discardUnavailable: ${_this.discardUnavailable}, photoUploadAvailable: ${_this.photoUploadAvailable}, reconciliationAvailable: ${_this.reconciliationAvailable})';
}


}

/// @nodoc
abstract mixin class $PrivateEventDetailsStateCopyWith<$Res>  {
  factory $PrivateEventDetailsStateCopyWith(PrivateEventDetailsState value, $Res Function(PrivateEventDetailsState) _then) = _$PrivateEventDetailsStateCopyWithImpl;
@useResult
$Res call({
 PrivateEventBasicSummary? event, ManagerEventSetupDefaults? defaults, PrivateEventDetailsUpdateRequest? pending, PrivateSeatReconciliationProgress? reconciliationProgress, Object? error, bool loading, bool saving, bool uploading, bool actorAvailable, bool discardUnavailable, bool photoUploadAvailable, bool reconciliationAvailable
});




}
/// @nodoc
class _$PrivateEventDetailsStateCopyWithImpl<$Res>
    implements $PrivateEventDetailsStateCopyWith<$Res> {
  _$PrivateEventDetailsStateCopyWithImpl(this._self, this._then);

  final PrivateEventDetailsState _self;
  final $Res Function(PrivateEventDetailsState) _then;

/// Create a copy of PrivateEventDetailsState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? event = freezed,Object? defaults = freezed,Object? pending = freezed,Object? reconciliationProgress = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? uploading = null,Object? actorAvailable = null,Object? discardUnavailable = null,Object? photoUploadAvailable = null,Object? reconciliationAvailable = null,}) {
  return _then(PrivateEventDetailsState(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,defaults: freezed == defaults ? _self.defaults : defaults // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as PrivateEventDetailsUpdateRequest?,reconciliationProgress: freezed == reconciliationProgress ? _self.reconciliationProgress : reconciliationProgress // ignore: cast_nullable_to_non_nullable
as PrivateSeatReconciliationProgress?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,uploading: null == uploading ? _self.uploading : uploading // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,discardUnavailable: null == discardUnavailable ? _self.discardUnavailable : discardUnavailable // ignore: cast_nullable_to_non_nullable
as bool,photoUploadAvailable: null == photoUploadAvailable ? _self.photoUploadAvailable : photoUploadAvailable // ignore: cast_nullable_to_non_nullable
as bool,reconciliationAvailable: null == reconciliationAvailable ? _self.reconciliationAvailable : reconciliationAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [PrivateEventDetailsState].
extension PrivateEventDetailsStatePatterns on PrivateEventDetailsState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PrivateEventDetailsState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PrivateEventDetailsState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PrivateEventDetailsState value)  $default,){
final _that = this;
switch (_that) {
case _PrivateEventDetailsState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PrivateEventDetailsState value)?  $default,){
final _that = this;
switch (_that) {
case _PrivateEventDetailsState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  ManagerEventSetupDefaults? defaults,  PrivateEventDetailsUpdateRequest? pending,  PrivateSeatReconciliationProgress? reconciliationProgress,  Object? error,  bool loading,  bool saving,  bool uploading,  bool actorAvailable,  bool discardUnavailable,  bool photoUploadAvailable,  bool reconciliationAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PrivateEventDetailsState() when $default != null:
return $default(_that.event,_that.defaults,_that.pending,_that.reconciliationProgress,_that.error,_that.loading,_that.saving,_that.uploading,_that.actorAvailable,_that.discardUnavailable,_that.photoUploadAvailable,_that.reconciliationAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  ManagerEventSetupDefaults? defaults,  PrivateEventDetailsUpdateRequest? pending,  PrivateSeatReconciliationProgress? reconciliationProgress,  Object? error,  bool loading,  bool saving,  bool uploading,  bool actorAvailable,  bool discardUnavailable,  bool photoUploadAvailable,  bool reconciliationAvailable)  $default,) {final _that = this;
switch (_that) {
case _PrivateEventDetailsState():
return $default(_that.event,_that.defaults,_that.pending,_that.reconciliationProgress,_that.error,_that.loading,_that.saving,_that.uploading,_that.actorAvailable,_that.discardUnavailable,_that.photoUploadAvailable,_that.reconciliationAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( PrivateEventBasicSummary? event,  ManagerEventSetupDefaults? defaults,  PrivateEventDetailsUpdateRequest? pending,  PrivateSeatReconciliationProgress? reconciliationProgress,  Object? error,  bool loading,  bool saving,  bool uploading,  bool actorAvailable,  bool discardUnavailable,  bool photoUploadAvailable,  bool reconciliationAvailable)?  $default,) {final _that = this;
switch (_that) {
case _PrivateEventDetailsState() when $default != null:
return $default(_that.event,_that.defaults,_that.pending,_that.reconciliationProgress,_that.error,_that.loading,_that.saving,_that.uploading,_that.actorAvailable,_that.discardUnavailable,_that.photoUploadAvailable,_that.reconciliationAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _PrivateEventDetailsState extends PrivateEventDetailsState {
  const _PrivateEventDetailsState({this.event, this.defaults, this.pending, this.reconciliationProgress, this.error, this.loading = false, this.saving = false, this.uploading = false, this.actorAvailable = true, this.discardUnavailable = false, this.photoUploadAvailable = false, this.reconciliationAvailable = false}): super._();
  

@override final  PrivateEventBasicSummary? event;
@override final  ManagerEventSetupDefaults? defaults;
@override final  PrivateEventDetailsUpdateRequest? pending;
@override final  PrivateSeatReconciliationProgress? reconciliationProgress;
@override final  Object? error;
@override@JsonKey() final  bool loading;
@override@JsonKey() final  bool saving;
@override@JsonKey() final  bool uploading;
@override@JsonKey() final  bool actorAvailable;
@override@JsonKey() final  bool discardUnavailable;
@override@JsonKey() final  bool photoUploadAvailable;
@override@JsonKey() final  bool reconciliationAvailable;

/// Create a copy of PrivateEventDetailsState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PrivateEventDetailsStateCopyWith<_PrivateEventDetailsState> get copyWith => __$PrivateEventDetailsStateCopyWithImpl<_PrivateEventDetailsState>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _PrivateEventDetailsState&&(identical(other.event, event) || other.event == event)&&(identical(other.defaults, defaults) || other.defaults == defaults)&&(identical(other.pending, pending) || other.pending == pending)&&(identical(other.reconciliationProgress, reconciliationProgress) || other.reconciliationProgress == reconciliationProgress)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.uploading, uploading) || other.uploading == uploading)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable)&&(identical(other.discardUnavailable, discardUnavailable) || other.discardUnavailable == discardUnavailable)&&(identical(other.photoUploadAvailable, photoUploadAvailable) || other.photoUploadAvailable == photoUploadAvailable)&&(identical(other.reconciliationAvailable, reconciliationAvailable) || other.reconciliationAvailable == reconciliationAvailable));
}


@override
int get hashCode {
    return Object.hash(runtimeType,event,defaults,pending,reconciliationProgress,const DeepCollectionEquality().hash(error),loading,saving,uploading,actorAvailable,discardUnavailable,photoUploadAvailable,reconciliationAvailable);
}

@override
String toString() {
    return 'PrivateEventDetailsState(event: $event, defaults: $defaults, pending: $pending, reconciliationProgress: $reconciliationProgress, error: $error, loading: $loading, saving: $saving, uploading: $uploading, actorAvailable: $actorAvailable, discardUnavailable: $discardUnavailable, photoUploadAvailable: $photoUploadAvailable, reconciliationAvailable: $reconciliationAvailable)';
}


}

/// @nodoc
abstract mixin class _$PrivateEventDetailsStateCopyWith<$Res> implements $PrivateEventDetailsStateCopyWith<$Res> {
  factory _$PrivateEventDetailsStateCopyWith(_PrivateEventDetailsState value, $Res Function(_PrivateEventDetailsState) _then) = __$PrivateEventDetailsStateCopyWithImpl;
@override @useResult
$Res call({
 PrivateEventBasicSummary? event, ManagerEventSetupDefaults? defaults, PrivateEventDetailsUpdateRequest? pending, PrivateSeatReconciliationProgress? reconciliationProgress, Object? error, bool loading, bool saving, bool uploading, bool actorAvailable, bool discardUnavailable, bool photoUploadAvailable, bool reconciliationAvailable
});




}
/// @nodoc
class __$PrivateEventDetailsStateCopyWithImpl<$Res>
    implements _$PrivateEventDetailsStateCopyWith<$Res> {
  __$PrivateEventDetailsStateCopyWithImpl(this._self, this._then);

  final _PrivateEventDetailsState _self;
  final $Res Function(_PrivateEventDetailsState) _then;

/// Create a copy of PrivateEventDetailsState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? event = freezed,Object? defaults = freezed,Object? pending = freezed,Object? reconciliationProgress = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? uploading = null,Object? actorAvailable = null,Object? discardUnavailable = null,Object? photoUploadAvailable = null,Object? reconciliationAvailable = null,}) {
  return _then(_PrivateEventDetailsState(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,defaults: freezed == defaults ? _self.defaults : defaults // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as PrivateEventDetailsUpdateRequest?,reconciliationProgress: freezed == reconciliationProgress ? _self.reconciliationProgress : reconciliationProgress // ignore: cast_nullable_to_non_nullable
as PrivateSeatReconciliationProgress?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,uploading: null == uploading ? _self.uploading : uploading // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,discardUnavailable: null == discardUnavailable ? _self.discardUnavailable : discardUnavailable // ignore: cast_nullable_to_non_nullable
as bool,photoUploadAvailable: null == photoUploadAvailable ? _self.photoUploadAvailable : photoUploadAvailable // ignore: cast_nullable_to_non_nullable
as bool,reconciliationAvailable: null == reconciliationAvailable ? _self.reconciliationAvailable : reconciliationAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
