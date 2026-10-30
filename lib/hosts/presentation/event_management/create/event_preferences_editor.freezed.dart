// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_preferences_editor.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$EventPreferencesEditorState {

 PrivateEventBasicSummary? get event; EventOfferConfiguration? get configuration; ManagerEventSetupDefaults? get defaults; PrivateEventPreferencesUpdateRequest? get privatePending; EventOfferPreferencesUpdateRequest? get offerPending; String? get displayName; Object? get error; bool get loading; bool get saving; bool get previewing; bool get previewAvailable; PrivateEventPreferenceIntents? get draftIntents; EventOfferPreferencesPreview? get review; bool get published; bool get actorAvailable;
/// Create a copy of EventPreferencesEditorState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventPreferencesEditorStateCopyWith<EventPreferencesEditorState> get copyWith => _$EventPreferencesEditorStateCopyWithImpl<EventPreferencesEditorState>(this as EventPreferencesEditorState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventPreferencesEditorState&&(identical(other.event, event) || other.event == event)&&(identical(other.configuration, configuration) || other.configuration == configuration)&&(identical(other.defaults, defaults) || other.defaults == defaults)&&(identical(other.privatePending, privatePending) || other.privatePending == privatePending)&&(identical(other.offerPending, offerPending) || other.offerPending == offerPending)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.previewing, previewing) || other.previewing == previewing)&&(identical(other.previewAvailable, previewAvailable) || other.previewAvailable == previewAvailable)&&(identical(other.draftIntents, draftIntents) || other.draftIntents == draftIntents)&&(identical(other.review, review) || other.review == review)&&(identical(other.published, published) || other.published == published)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,event,configuration,defaults,privatePending,offerPending,displayName,const DeepCollectionEquality().hash(error),loading,saving,previewing,previewAvailable,draftIntents,review,published,actorAvailable);

@override
String toString() {
  return 'EventPreferencesEditorState(event: $event, configuration: $configuration, defaults: $defaults, privatePending: $privatePending, offerPending: $offerPending, displayName: $displayName, error: $error, loading: $loading, saving: $saving, previewing: $previewing, previewAvailable: $previewAvailable, draftIntents: $draftIntents, review: $review, published: $published, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class $EventPreferencesEditorStateCopyWith<$Res>  {
  factory $EventPreferencesEditorStateCopyWith(EventPreferencesEditorState value, $Res Function(EventPreferencesEditorState) _then) = _$EventPreferencesEditorStateCopyWithImpl;
@useResult
$Res call({
 PrivateEventBasicSummary? event, EventOfferConfiguration? configuration, ManagerEventSetupDefaults? defaults, PrivateEventPreferencesUpdateRequest? privatePending, EventOfferPreferencesUpdateRequest? offerPending, String? displayName, Object? error, bool loading, bool saving, bool previewing, bool previewAvailable, PrivateEventPreferenceIntents? draftIntents, EventOfferPreferencesPreview? review, bool published, bool actorAvailable
});




}
/// @nodoc
class _$EventPreferencesEditorStateCopyWithImpl<$Res>
    implements $EventPreferencesEditorStateCopyWith<$Res> {
  _$EventPreferencesEditorStateCopyWithImpl(this._self, this._then);

  final EventPreferencesEditorState _self;
  final $Res Function(EventPreferencesEditorState) _then;

/// Create a copy of EventPreferencesEditorState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? event = freezed,Object? configuration = freezed,Object? defaults = freezed,Object? privatePending = freezed,Object? offerPending = freezed,Object? displayName = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? previewing = null,Object? previewAvailable = null,Object? draftIntents = freezed,Object? review = freezed,Object? published = null,Object? actorAvailable = null,}) {
  return _then(_self.copyWith(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,configuration: freezed == configuration ? _self.configuration : configuration // ignore: cast_nullable_to_non_nullable
as EventOfferConfiguration?,defaults: freezed == defaults ? _self.defaults : defaults // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,privatePending: freezed == privatePending ? _self.privatePending : privatePending // ignore: cast_nullable_to_non_nullable
as PrivateEventPreferencesUpdateRequest?,offerPending: freezed == offerPending ? _self.offerPending : offerPending // ignore: cast_nullable_to_non_nullable
as EventOfferPreferencesUpdateRequest?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,previewing: null == previewing ? _self.previewing : previewing // ignore: cast_nullable_to_non_nullable
as bool,previewAvailable: null == previewAvailable ? _self.previewAvailable : previewAvailable // ignore: cast_nullable_to_non_nullable
as bool,draftIntents: freezed == draftIntents ? _self.draftIntents : draftIntents // ignore: cast_nullable_to_non_nullable
as PrivateEventPreferenceIntents?,review: freezed == review ? _self.review : review // ignore: cast_nullable_to_non_nullable
as EventOfferPreferencesPreview?,published: null == published ? _self.published : published // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [EventPreferencesEditorState].
extension EventPreferencesEditorStatePatterns on EventPreferencesEditorState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventPreferencesEditorState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventPreferencesEditorState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventPreferencesEditorState value)  $default,){
final _that = this;
switch (_that) {
case _EventPreferencesEditorState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventPreferencesEditorState value)?  $default,){
final _that = this;
switch (_that) {
case _EventPreferencesEditorState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  EventOfferConfiguration? configuration,  ManagerEventSetupDefaults? defaults,  PrivateEventPreferencesUpdateRequest? privatePending,  EventOfferPreferencesUpdateRequest? offerPending,  String? displayName,  Object? error,  bool loading,  bool saving,  bool previewing,  bool previewAvailable,  PrivateEventPreferenceIntents? draftIntents,  EventOfferPreferencesPreview? review,  bool published,  bool actorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventPreferencesEditorState() when $default != null:
return $default(_that.event,_that.configuration,_that.defaults,_that.privatePending,_that.offerPending,_that.displayName,_that.error,_that.loading,_that.saving,_that.previewing,_that.previewAvailable,_that.draftIntents,_that.review,_that.published,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( PrivateEventBasicSummary? event,  EventOfferConfiguration? configuration,  ManagerEventSetupDefaults? defaults,  PrivateEventPreferencesUpdateRequest? privatePending,  EventOfferPreferencesUpdateRequest? offerPending,  String? displayName,  Object? error,  bool loading,  bool saving,  bool previewing,  bool previewAvailable,  PrivateEventPreferenceIntents? draftIntents,  EventOfferPreferencesPreview? review,  bool published,  bool actorAvailable)  $default,) {final _that = this;
switch (_that) {
case _EventPreferencesEditorState():
return $default(_that.event,_that.configuration,_that.defaults,_that.privatePending,_that.offerPending,_that.displayName,_that.error,_that.loading,_that.saving,_that.previewing,_that.previewAvailable,_that.draftIntents,_that.review,_that.published,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( PrivateEventBasicSummary? event,  EventOfferConfiguration? configuration,  ManagerEventSetupDefaults? defaults,  PrivateEventPreferencesUpdateRequest? privatePending,  EventOfferPreferencesUpdateRequest? offerPending,  String? displayName,  Object? error,  bool loading,  bool saving,  bool previewing,  bool previewAvailable,  PrivateEventPreferenceIntents? draftIntents,  EventOfferPreferencesPreview? review,  bool published,  bool actorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _EventPreferencesEditorState() when $default != null:
return $default(_that.event,_that.configuration,_that.defaults,_that.privatePending,_that.offerPending,_that.displayName,_that.error,_that.loading,_that.saving,_that.previewing,_that.previewAvailable,_that.draftIntents,_that.review,_that.published,_that.actorAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _EventPreferencesEditorState extends EventPreferencesEditorState {
  const _EventPreferencesEditorState({this.event, this.configuration, this.defaults, this.privatePending, this.offerPending, this.displayName, this.error, this.loading = false, this.saving = false, this.previewing = false, this.previewAvailable = false, this.draftIntents, this.review, this.published = false, this.actorAvailable = true}): super._();
  

@override final  PrivateEventBasicSummary? event;
@override final  EventOfferConfiguration? configuration;
@override final  ManagerEventSetupDefaults? defaults;
@override final  PrivateEventPreferencesUpdateRequest? privatePending;
@override final  EventOfferPreferencesUpdateRequest? offerPending;
@override final  String? displayName;
@override final  Object? error;
@override@JsonKey() final  bool loading;
@override@JsonKey() final  bool saving;
@override@JsonKey() final  bool previewing;
@override@JsonKey() final  bool previewAvailable;
@override final  PrivateEventPreferenceIntents? draftIntents;
@override final  EventOfferPreferencesPreview? review;
@override@JsonKey() final  bool published;
@override@JsonKey() final  bool actorAvailable;

/// Create a copy of EventPreferencesEditorState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventPreferencesEditorStateCopyWith<_EventPreferencesEditorState> get copyWith => __$EventPreferencesEditorStateCopyWithImpl<_EventPreferencesEditorState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventPreferencesEditorState&&(identical(other.event, event) || other.event == event)&&(identical(other.configuration, configuration) || other.configuration == configuration)&&(identical(other.defaults, defaults) || other.defaults == defaults)&&(identical(other.privatePending, privatePending) || other.privatePending == privatePending)&&(identical(other.offerPending, offerPending) || other.offerPending == offerPending)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.loading, loading) || other.loading == loading)&&(identical(other.saving, saving) || other.saving == saving)&&(identical(other.previewing, previewing) || other.previewing == previewing)&&(identical(other.previewAvailable, previewAvailable) || other.previewAvailable == previewAvailable)&&(identical(other.draftIntents, draftIntents) || other.draftIntents == draftIntents)&&(identical(other.review, review) || other.review == review)&&(identical(other.published, published) || other.published == published)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hash(runtimeType,event,configuration,defaults,privatePending,offerPending,displayName,const DeepCollectionEquality().hash(error),loading,saving,previewing,previewAvailable,draftIntents,review,published,actorAvailable);

@override
String toString() {
  return 'EventPreferencesEditorState(event: $event, configuration: $configuration, defaults: $defaults, privatePending: $privatePending, offerPending: $offerPending, displayName: $displayName, error: $error, loading: $loading, saving: $saving, previewing: $previewing, previewAvailable: $previewAvailable, draftIntents: $draftIntents, review: $review, published: $published, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class _$EventPreferencesEditorStateCopyWith<$Res> implements $EventPreferencesEditorStateCopyWith<$Res> {
  factory _$EventPreferencesEditorStateCopyWith(_EventPreferencesEditorState value, $Res Function(_EventPreferencesEditorState) _then) = __$EventPreferencesEditorStateCopyWithImpl;
@override @useResult
$Res call({
 PrivateEventBasicSummary? event, EventOfferConfiguration? configuration, ManagerEventSetupDefaults? defaults, PrivateEventPreferencesUpdateRequest? privatePending, EventOfferPreferencesUpdateRequest? offerPending, String? displayName, Object? error, bool loading, bool saving, bool previewing, bool previewAvailable, PrivateEventPreferenceIntents? draftIntents, EventOfferPreferencesPreview? review, bool published, bool actorAvailable
});




}
/// @nodoc
class __$EventPreferencesEditorStateCopyWithImpl<$Res>
    implements _$EventPreferencesEditorStateCopyWith<$Res> {
  __$EventPreferencesEditorStateCopyWithImpl(this._self, this._then);

  final _EventPreferencesEditorState _self;
  final $Res Function(_EventPreferencesEditorState) _then;

/// Create a copy of EventPreferencesEditorState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? event = freezed,Object? configuration = freezed,Object? defaults = freezed,Object? privatePending = freezed,Object? offerPending = freezed,Object? displayName = freezed,Object? error = freezed,Object? loading = null,Object? saving = null,Object? previewing = null,Object? previewAvailable = null,Object? draftIntents = freezed,Object? review = freezed,Object? published = null,Object? actorAvailable = null,}) {
  return _then(_EventPreferencesEditorState(
event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as PrivateEventBasicSummary?,configuration: freezed == configuration ? _self.configuration : configuration // ignore: cast_nullable_to_non_nullable
as EventOfferConfiguration?,defaults: freezed == defaults ? _self.defaults : defaults // ignore: cast_nullable_to_non_nullable
as ManagerEventSetupDefaults?,privatePending: freezed == privatePending ? _self.privatePending : privatePending // ignore: cast_nullable_to_non_nullable
as PrivateEventPreferencesUpdateRequest?,offerPending: freezed == offerPending ? _self.offerPending : offerPending // ignore: cast_nullable_to_non_nullable
as EventOfferPreferencesUpdateRequest?,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,error: freezed == error ? _self.error : error ,loading: null == loading ? _self.loading : loading // ignore: cast_nullable_to_non_nullable
as bool,saving: null == saving ? _self.saving : saving // ignore: cast_nullable_to_non_nullable
as bool,previewing: null == previewing ? _self.previewing : previewing // ignore: cast_nullable_to_non_nullable
as bool,previewAvailable: null == previewAvailable ? _self.previewAvailable : previewAvailable // ignore: cast_nullable_to_non_nullable
as bool,draftIntents: freezed == draftIntents ? _self.draftIntents : draftIntents // ignore: cast_nullable_to_non_nullable
as PrivateEventPreferenceIntents?,review: freezed == review ? _self.review : review // ignore: cast_nullable_to_non_nullable
as EventOfferPreferencesPreview?,published: null == published ? _self.published : published // ignore: cast_nullable_to_non_nullable
as bool,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
