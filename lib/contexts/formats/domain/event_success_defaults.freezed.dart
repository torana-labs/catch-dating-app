// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_success_defaults.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventSuccessDefaults {

 bool get enabled; String? get layoutId; String get playbookId; List<String> get selectedModuleIds; bool get moduleSelectionConfigured; EventSuccessStructureConfig get structureConfig; String get hostGoal;@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool get wingmanRequestsEnabled;@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool get contextualOpenersEnabled; bool get compatibilityAffectsRanking; EventSuccessQuestionnaireConfig get questionnaireConfig; String? get attendeePrompt;
/// Create a copy of EventSuccessDefaults
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventSuccessDefaultsCopyWith<EventSuccessDefaults> get copyWith => _$EventSuccessDefaultsCopyWithImpl<EventSuccessDefaults>(this as EventSuccessDefaults, _$identity);

  /// Serializes this EventSuccessDefaults to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventSuccessDefaults&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.layoutId, layoutId) || other.layoutId == layoutId)&&(identical(other.playbookId, playbookId) || other.playbookId == playbookId)&&const DeepCollectionEquality().equals(other.selectedModuleIds, selectedModuleIds)&&(identical(other.moduleSelectionConfigured, moduleSelectionConfigured) || other.moduleSelectionConfigured == moduleSelectionConfigured)&&(identical(other.structureConfig, structureConfig) || other.structureConfig == structureConfig)&&(identical(other.hostGoal, hostGoal) || other.hostGoal == hostGoal)&&(identical(other.wingmanRequestsEnabled, wingmanRequestsEnabled) || other.wingmanRequestsEnabled == wingmanRequestsEnabled)&&(identical(other.contextualOpenersEnabled, contextualOpenersEnabled) || other.contextualOpenersEnabled == contextualOpenersEnabled)&&(identical(other.compatibilityAffectsRanking, compatibilityAffectsRanking) || other.compatibilityAffectsRanking == compatibilityAffectsRanking)&&(identical(other.questionnaireConfig, questionnaireConfig) || other.questionnaireConfig == questionnaireConfig)&&(identical(other.attendeePrompt, attendeePrompt) || other.attendeePrompt == attendeePrompt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,enabled,layoutId,playbookId,const DeepCollectionEquality().hash(selectedModuleIds),moduleSelectionConfigured,structureConfig,hostGoal,wingmanRequestsEnabled,contextualOpenersEnabled,compatibilityAffectsRanking,questionnaireConfig,attendeePrompt);

@override
String toString() {
  return 'EventSuccessDefaults(enabled: $enabled, layoutId: $layoutId, playbookId: $playbookId, selectedModuleIds: $selectedModuleIds, moduleSelectionConfigured: $moduleSelectionConfigured, structureConfig: $structureConfig, hostGoal: $hostGoal, wingmanRequestsEnabled: $wingmanRequestsEnabled, contextualOpenersEnabled: $contextualOpenersEnabled, compatibilityAffectsRanking: $compatibilityAffectsRanking, questionnaireConfig: $questionnaireConfig, attendeePrompt: $attendeePrompt)';
}


}

/// @nodoc
abstract mixin class $EventSuccessDefaultsCopyWith<$Res>  {
  factory $EventSuccessDefaultsCopyWith(EventSuccessDefaults value, $Res Function(EventSuccessDefaults) _then) = _$EventSuccessDefaultsCopyWithImpl;
@useResult
$Res call({
 bool enabled, String? layoutId, String playbookId, List<String> selectedModuleIds, bool moduleSelectionConfigured, EventSuccessStructureConfig structureConfig, String hostGoal,@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool wingmanRequestsEnabled,@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool contextualOpenersEnabled, bool compatibilityAffectsRanking, EventSuccessQuestionnaireConfig questionnaireConfig, String? attendeePrompt
});




}
/// @nodoc
class _$EventSuccessDefaultsCopyWithImpl<$Res>
    implements $EventSuccessDefaultsCopyWith<$Res> {
  _$EventSuccessDefaultsCopyWithImpl(this._self, this._then);

  final EventSuccessDefaults _self;
  final $Res Function(EventSuccessDefaults) _then;

/// Create a copy of EventSuccessDefaults
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? enabled = null,Object? layoutId = freezed,Object? playbookId = null,Object? selectedModuleIds = null,Object? moduleSelectionConfigured = null,Object? structureConfig = null,Object? hostGoal = null,Object? wingmanRequestsEnabled = null,Object? contextualOpenersEnabled = null,Object? compatibilityAffectsRanking = null,Object? questionnaireConfig = null,Object? attendeePrompt = freezed,}) {
  return _then(_self.copyWith(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,layoutId: freezed == layoutId ? _self.layoutId : layoutId // ignore: cast_nullable_to_non_nullable
as String?,playbookId: null == playbookId ? _self.playbookId : playbookId // ignore: cast_nullable_to_non_nullable
as String,selectedModuleIds: null == selectedModuleIds ? _self.selectedModuleIds : selectedModuleIds // ignore: cast_nullable_to_non_nullable
as List<String>,moduleSelectionConfigured: null == moduleSelectionConfigured ? _self.moduleSelectionConfigured : moduleSelectionConfigured // ignore: cast_nullable_to_non_nullable
as bool,structureConfig: null == structureConfig ? _self.structureConfig : structureConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessStructureConfig,hostGoal: null == hostGoal ? _self.hostGoal : hostGoal // ignore: cast_nullable_to_non_nullable
as String,wingmanRequestsEnabled: null == wingmanRequestsEnabled ? _self.wingmanRequestsEnabled : wingmanRequestsEnabled // ignore: cast_nullable_to_non_nullable
as bool,contextualOpenersEnabled: null == contextualOpenersEnabled ? _self.contextualOpenersEnabled : contextualOpenersEnabled // ignore: cast_nullable_to_non_nullable
as bool,compatibilityAffectsRanking: null == compatibilityAffectsRanking ? _self.compatibilityAffectsRanking : compatibilityAffectsRanking // ignore: cast_nullable_to_non_nullable
as bool,questionnaireConfig: null == questionnaireConfig ? _self.questionnaireConfig : questionnaireConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessQuestionnaireConfig,attendeePrompt: freezed == attendeePrompt ? _self.attendeePrompt : attendeePrompt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventSuccessDefaults].
extension EventSuccessDefaultsPatterns on EventSuccessDefaults {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventSuccessDefaults value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventSuccessDefaults() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventSuccessDefaults value)  $default,){
final _that = this;
switch (_that) {
case _EventSuccessDefaults():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventSuccessDefaults value)?  $default,){
final _that = this;
switch (_that) {
case _EventSuccessDefaults() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool enabled,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  bool moduleSelectionConfigured,  EventSuccessStructureConfig structureConfig,  String hostGoal, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool wingmanRequestsEnabled, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  String? attendeePrompt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventSuccessDefaults() when $default != null:
return $default(_that.enabled,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.moduleSelectionConfigured,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.attendeePrompt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool enabled,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  bool moduleSelectionConfigured,  EventSuccessStructureConfig structureConfig,  String hostGoal, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool wingmanRequestsEnabled, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  String? attendeePrompt)  $default,) {final _that = this;
switch (_that) {
case _EventSuccessDefaults():
return $default(_that.enabled,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.moduleSelectionConfigured,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.attendeePrompt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool enabled,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  bool moduleSelectionConfigured,  EventSuccessStructureConfig structureConfig,  String hostGoal, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool wingmanRequestsEnabled, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.')  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  String? attendeePrompt)?  $default,) {final _that = this;
switch (_that) {
case _EventSuccessDefaults() when $default != null:
return $default(_that.enabled,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.moduleSelectionConfigured,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.attendeePrompt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventSuccessDefaults extends EventSuccessDefaults {
  const _EventSuccessDefaults({this.enabled = false, this.layoutId, this.playbookId = 'social_run_light', final  List<String> selectedModuleIds = const <String>[], this.moduleSelectionConfigured = false, this.structureConfig = const EventSuccessStructureConfig.legacyDefault(), this.hostGoal = StructuredDomainCopy.eventSuccessDefaultHostGoal, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') this.wingmanRequestsEnabled = true, @Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') this.contextualOpenersEnabled = true, this.compatibilityAffectsRanking = false, this.questionnaireConfig = const EventSuccessQuestionnaireConfig.defaultTemplate(), this.attendeePrompt}): _selectedModuleIds = selectedModuleIds,super._();
  factory _EventSuccessDefaults.fromJson(Map<String, dynamic> json) => _$EventSuccessDefaultsFromJson(json);

@override@JsonKey() final  bool enabled;
@override final  String? layoutId;
@override@JsonKey() final  String playbookId;
 final  List<String> _selectedModuleIds;
@override@JsonKey() List<String> get selectedModuleIds {
  if (_selectedModuleIds is EqualUnmodifiableListView) return _selectedModuleIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_selectedModuleIds);
}

@override@JsonKey() final  bool moduleSelectionConfigured;
@override@JsonKey() final  EventSuccessStructureConfig structureConfig;
@override@JsonKey() final  String hostGoal;
@override@JsonKey()@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') final  bool wingmanRequestsEnabled;
@override@JsonKey()@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') final  bool contextualOpenersEnabled;
@override@JsonKey() final  bool compatibilityAffectsRanking;
@override@JsonKey() final  EventSuccessQuestionnaireConfig questionnaireConfig;
@override final  String? attendeePrompt;

/// Create a copy of EventSuccessDefaults
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventSuccessDefaultsCopyWith<_EventSuccessDefaults> get copyWith => __$EventSuccessDefaultsCopyWithImpl<_EventSuccessDefaults>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventSuccessDefaultsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventSuccessDefaults&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.layoutId, layoutId) || other.layoutId == layoutId)&&(identical(other.playbookId, playbookId) || other.playbookId == playbookId)&&const DeepCollectionEquality().equals(other._selectedModuleIds, _selectedModuleIds)&&(identical(other.moduleSelectionConfigured, moduleSelectionConfigured) || other.moduleSelectionConfigured == moduleSelectionConfigured)&&(identical(other.structureConfig, structureConfig) || other.structureConfig == structureConfig)&&(identical(other.hostGoal, hostGoal) || other.hostGoal == hostGoal)&&(identical(other.wingmanRequestsEnabled, wingmanRequestsEnabled) || other.wingmanRequestsEnabled == wingmanRequestsEnabled)&&(identical(other.contextualOpenersEnabled, contextualOpenersEnabled) || other.contextualOpenersEnabled == contextualOpenersEnabled)&&(identical(other.compatibilityAffectsRanking, compatibilityAffectsRanking) || other.compatibilityAffectsRanking == compatibilityAffectsRanking)&&(identical(other.questionnaireConfig, questionnaireConfig) || other.questionnaireConfig == questionnaireConfig)&&(identical(other.attendeePrompt, attendeePrompt) || other.attendeePrompt == attendeePrompt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,enabled,layoutId,playbookId,const DeepCollectionEquality().hash(_selectedModuleIds),moduleSelectionConfigured,structureConfig,hostGoal,wingmanRequestsEnabled,contextualOpenersEnabled,compatibilityAffectsRanking,questionnaireConfig,attendeePrompt);

@override
String toString() {
  return 'EventSuccessDefaults(enabled: $enabled, layoutId: $layoutId, playbookId: $playbookId, selectedModuleIds: $selectedModuleIds, moduleSelectionConfigured: $moduleSelectionConfigured, structureConfig: $structureConfig, hostGoal: $hostGoal, wingmanRequestsEnabled: $wingmanRequestsEnabled, contextualOpenersEnabled: $contextualOpenersEnabled, compatibilityAffectsRanking: $compatibilityAffectsRanking, questionnaireConfig: $questionnaireConfig, attendeePrompt: $attendeePrompt)';
}


}

/// @nodoc
abstract mixin class _$EventSuccessDefaultsCopyWith<$Res> implements $EventSuccessDefaultsCopyWith<$Res> {
  factory _$EventSuccessDefaultsCopyWith(_EventSuccessDefaults value, $Res Function(_EventSuccessDefaults) _then) = __$EventSuccessDefaultsCopyWithImpl;
@override @useResult
$Res call({
 bool enabled, String? layoutId, String playbookId, List<String> selectedModuleIds, bool moduleSelectionConfigured, EventSuccessStructureConfig structureConfig, String hostGoal,@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool wingmanRequestsEnabled,@Deprecated('Platform-owned and always true; retained only for stored-schema compatibility.') bool contextualOpenersEnabled, bool compatibilityAffectsRanking, EventSuccessQuestionnaireConfig questionnaireConfig, String? attendeePrompt
});




}
/// @nodoc
class __$EventSuccessDefaultsCopyWithImpl<$Res>
    implements _$EventSuccessDefaultsCopyWith<$Res> {
  __$EventSuccessDefaultsCopyWithImpl(this._self, this._then);

  final _EventSuccessDefaults _self;
  final $Res Function(_EventSuccessDefaults) _then;

/// Create a copy of EventSuccessDefaults
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? enabled = null,Object? layoutId = freezed,Object? playbookId = null,Object? selectedModuleIds = null,Object? moduleSelectionConfigured = null,Object? structureConfig = null,Object? hostGoal = null,Object? wingmanRequestsEnabled = null,Object? contextualOpenersEnabled = null,Object? compatibilityAffectsRanking = null,Object? questionnaireConfig = null,Object? attendeePrompt = freezed,}) {
  return _then(_EventSuccessDefaults(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,layoutId: freezed == layoutId ? _self.layoutId : layoutId // ignore: cast_nullable_to_non_nullable
as String?,playbookId: null == playbookId ? _self.playbookId : playbookId // ignore: cast_nullable_to_non_nullable
as String,selectedModuleIds: null == selectedModuleIds ? _self._selectedModuleIds : selectedModuleIds // ignore: cast_nullable_to_non_nullable
as List<String>,moduleSelectionConfigured: null == moduleSelectionConfigured ? _self.moduleSelectionConfigured : moduleSelectionConfigured // ignore: cast_nullable_to_non_nullable
as bool,structureConfig: null == structureConfig ? _self.structureConfig : structureConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessStructureConfig,hostGoal: null == hostGoal ? _self.hostGoal : hostGoal // ignore: cast_nullable_to_non_nullable
as String,wingmanRequestsEnabled: null == wingmanRequestsEnabled ? _self.wingmanRequestsEnabled : wingmanRequestsEnabled // ignore: cast_nullable_to_non_nullable
as bool,contextualOpenersEnabled: null == contextualOpenersEnabled ? _self.contextualOpenersEnabled : contextualOpenersEnabled // ignore: cast_nullable_to_non_nullable
as bool,compatibilityAffectsRanking: null == compatibilityAffectsRanking ? _self.compatibilityAffectsRanking : compatibilityAffectsRanking // ignore: cast_nullable_to_non_nullable
as bool,questionnaireConfig: null == questionnaireConfig ? _self.questionnaireConfig : questionnaireConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessQuestionnaireConfig,attendeePrompt: freezed == attendeePrompt ? _self.attendeePrompt : attendeePrompt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
