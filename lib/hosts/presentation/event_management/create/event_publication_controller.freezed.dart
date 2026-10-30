// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_publication_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$EventPublicationState {

 PrivateEventBasicSummary? get event; EventPublicationRequest? get pending; EventPublicationReceipt? get receipt; Object? get error; bool get loading; bool get saving; bool get actorAvailable;
/// Create a copy of EventPublicationState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventPublicationStateCopyWith<EventPublicationState> get copyWith => _$EventPublicationStateCopyWithImpl<EventPublicationState>(this as EventPublicationState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventPublicationState&&(identical(other.event, event) || other.event == event)&&(identical(other.pending, pending) || other.pending == pending)&&(identical(other.receipt, receipt) || other.receipt == receipt)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,event,pending,receipt,const DeepCollectionEquality().hash(error),loading,saving,actorAvailable);

@override
String toString() {
  return 'EventPublicationState(event: $event, pending: $pending, receipt: $receipt, error: $error, loading: $loading, saving: $saving, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class $EventPublicationStateCopyWith<$Res>  {
  factory $EventPublicationStateCopyWith(EventPublicationState value, $Res Function(EventPublicationState) _then) = _$EventPublicationStateCopyWithImpl;
@useResult
$Res call({
 PrivateEventBasicSummary? event, EventPublicationRequest? pending, EventPublicationReceipt? receipt, Object? error, bool loading, bool saving, bool actorAvailable
});




}
/// @nodoc
class _$EventPublicationStateCopyWithImpl<$Res>
    implements $EventPublicationStateCopyWith<$Res> {
  _$EventPublicationStateCopyWithImpl(this._self, this._then);

  final EventPublicationState _self;
  final $Res Function(EventPublicationState) _then;

/// Create a copy of EventPublicationState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? event = freezed,Object? pending = freezed,Object? receipt = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? actorAvailable = null,}) {
  return _then(_self.copyWith(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as EventPublicationRequest?,receipt: freezed == receipt ? _self.receipt : receipt // ignore: cast_nullable_to_non_nullable
as EventPublicationReceipt?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [EventPublicationState].
extension EventPublicationStatePatterns on EventPublicationState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventPublicationState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventPublicationState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventPublicationState value)  $default,){
final _that = this;
switch (_that) {
case _EventPublicationState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventPublicationState value)?  $default,){
final _that = this;
switch (_that) {
case _EventPublicationState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  EventPublicationRequest? pending,  EventPublicationReceipt? receipt,  Object? error,  bool loading,  bool saving,  bool actorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventPublicationState() when $default != null:
return $default(_that.event,_that.pending,_that.receipt,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  EventPublicationRequest? pending,  EventPublicationReceipt? receipt,  Object? error,  bool loading,  bool saving,  bool actorAvailable)  $default,) {final _that = this;
switch (_that) {
case _EventPublicationState():
return $default(_that.event,_that.pending,_that.receipt,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( PrivateEventBasicSummary? event,  EventPublicationRequest? pending,  EventPublicationReceipt? receipt,  Object? error,  bool loading,  bool saving,  bool actorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _EventPublicationState() when $default != null:
return $default(_that.event,_that.pending,_that.receipt,_that.error,_that.loading,_that.saving,_that.actorAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _EventPublicationState extends EventPublicationState {
  const _EventPublicationState({this.event, this.pending, this.receipt, this.error, this.loading = false, this.saving = false, this.actorAvailable = true}): super._();
  

@override final  PrivateEventBasicSummary? event;
@override final  EventPublicationRequest? pending;
@override final  EventPublicationReceipt? receipt;
@override final  Object? error;
@override@JsonKey() final  bool loading;
@override@JsonKey() final  bool saving;
@override@JsonKey() final  bool actorAvailable;

/// Create a copy of EventPublicationState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventPublicationStateCopyWith<_EventPublicationState> get copyWith => __$EventPublicationStateCopyWithImpl<_EventPublicationState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventPublicationState&&(identical(other.event, event) || other.event == event)&&(identical(other.pending, pending) || other.pending == pending)&&(identical(other.receipt, receipt) || other.receipt == receipt)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,event,pending,receipt,const DeepCollectionEquality().hash(error),loading,saving,actorAvailable);

@override
String toString() {
  return 'EventPublicationState(event: $event, pending: $pending, receipt: $receipt, error: $error, loading: $loading, saving: $saving, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class _$EventPublicationStateCopyWith<$Res> implements $EventPublicationStateCopyWith<$Res> {
  factory _$EventPublicationStateCopyWith(_EventPublicationState value, $Res Function(_EventPublicationState) _then) = __$EventPublicationStateCopyWithImpl;
@override @useResult
$Res call({
 PrivateEventBasicSummary? event, EventPublicationRequest? pending, EventPublicationReceipt? receipt, Object? error, bool loading, bool saving, bool actorAvailable
});




}
/// @nodoc
class __$EventPublicationStateCopyWithImpl<$Res>
    implements _$EventPublicationStateCopyWith<$Res> {
  __$EventPublicationStateCopyWithImpl(this._self, this._then);

  final _EventPublicationState _self;
  final $Res Function(_EventPublicationState) _then;

/// Create a copy of EventPublicationState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? event = freezed,Object? pending = freezed,Object? receipt = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? actorAvailable = null,}) {
  return _then(_EventPublicationState(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,pending: freezed == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as EventPublicationRequest?,receipt: freezed == receipt ? _self.receipt : receipt // ignore: cast_nullable_to_non_nullable
as EventPublicationReceipt?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
