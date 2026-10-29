// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'club_host_defaults.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ClubHostDefaults {

 ActivityKind get primaryActivityKind; List<ActivityKind> get supportedActivityKinds; EventPolicyDefaults get eventPolicy; EventSuccessDefaults get eventSuccess; Map<String, EventSuccessDefaults> get eventSuccessByActivityKind;/// Suggested IANA timezone for future events; never rewrites saved events.
/// Read only until the versioned updateOrganizer contract accepts it.
@JsonKey(includeToJson: false) String? get timezone;/// Server-managed revision used when an event inherits defaults.
@JsonKey(includeToJson: false) int? get revision;
/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClubHostDefaultsCopyWith<ClubHostDefaults> get copyWith => _$ClubHostDefaultsCopyWithImpl<ClubHostDefaults>(this as ClubHostDefaults, _$identity);

  /// Serializes this ClubHostDefaults to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClubHostDefaults&&(identical(other.primaryActivityKind, primaryActivityKind) || other.primaryActivityKind == primaryActivityKind)&&const DeepCollectionEquality().equals(other.supportedActivityKinds, supportedActivityKinds)&&(identical(other.eventPolicy, eventPolicy) || other.eventPolicy == eventPolicy)&&(identical(other.eventSuccess, eventSuccess) || other.eventSuccess == eventSuccess)&&const DeepCollectionEquality().equals(other.eventSuccessByActivityKind, eventSuccessByActivityKind)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.revision, revision) || other.revision == revision));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,primaryActivityKind,const DeepCollectionEquality().hash(supportedActivityKinds),eventPolicy,eventSuccess,const DeepCollectionEquality().hash(eventSuccessByActivityKind),timezone,revision);

@override
String toString() {
  return 'ClubHostDefaults(primaryActivityKind: $primaryActivityKind, supportedActivityKinds: $supportedActivityKinds, eventPolicy: $eventPolicy, eventSuccess: $eventSuccess, eventSuccessByActivityKind: $eventSuccessByActivityKind, timezone: $timezone, revision: $revision)';
}


}

/// @nodoc
abstract mixin class $ClubHostDefaultsCopyWith<$Res>  {
  factory $ClubHostDefaultsCopyWith(ClubHostDefaults value, $Res Function(ClubHostDefaults) _then) = _$ClubHostDefaultsCopyWithImpl;
@useResult
$Res call({
 ActivityKind primaryActivityKind, List<ActivityKind> supportedActivityKinds, EventPolicyDefaults eventPolicy, EventSuccessDefaults eventSuccess, Map<String, EventSuccessDefaults> eventSuccessByActivityKind,@JsonKey(includeToJson: false) String? timezone,@JsonKey(includeToJson: false) int? revision
});


$EventPolicyDefaultsCopyWith<$Res> get eventPolicy;$EventSuccessDefaultsCopyWith<$Res> get eventSuccess;

}
/// @nodoc
class _$ClubHostDefaultsCopyWithImpl<$Res>
    implements $ClubHostDefaultsCopyWith<$Res> {
  _$ClubHostDefaultsCopyWithImpl(this._self, this._then);

  final ClubHostDefaults _self;
  final $Res Function(ClubHostDefaults) _then;

/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? primaryActivityKind = null,Object? supportedActivityKinds = null,Object? eventPolicy = null,Object? eventSuccess = null,Object? eventSuccessByActivityKind = null,Object? timezone = freezed,Object? revision = freezed,}) {
  return _then(_self.copyWith(
primaryActivityKind: null == primaryActivityKind ? _self.primaryActivityKind : primaryActivityKind // ignore: cast_nullable_to_non_nullable
as ActivityKind,supportedActivityKinds: null == supportedActivityKinds ? _self.supportedActivityKinds : supportedActivityKinds // ignore: cast_nullable_to_non_nullable
as List<ActivityKind>,eventPolicy: null == eventPolicy ? _self.eventPolicy : eventPolicy // ignore: cast_nullable_to_non_nullable
as EventPolicyDefaults,eventSuccess: null == eventSuccess ? _self.eventSuccess : eventSuccess // ignore: cast_nullable_to_non_nullable
as EventSuccessDefaults,eventSuccessByActivityKind: null == eventSuccessByActivityKind ? _self.eventSuccessByActivityKind : eventSuccessByActivityKind // ignore: cast_nullable_to_non_nullable
as Map<String, EventSuccessDefaults>,timezone: freezed == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String?,revision: freezed == revision ? _self.revision : revision // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}
/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventPolicyDefaultsCopyWith<$Res> get eventPolicy {
  
  return $EventPolicyDefaultsCopyWith<$Res>(_self.eventPolicy, (value) {
    return _then(_self.copyWith(eventPolicy: value));
  });
}/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventSuccessDefaultsCopyWith<$Res> get eventSuccess {
  
  return $EventSuccessDefaultsCopyWith<$Res>(_self.eventSuccess, (value) {
    return _then(_self.copyWith(eventSuccess: value));
  });
}
}


/// Adds pattern-matching-related methods to [ClubHostDefaults].
extension ClubHostDefaultsPatterns on ClubHostDefaults {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClubHostDefaults value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClubHostDefaults() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClubHostDefaults value)  $default,){
final _that = this;
switch (_that) {
case _ClubHostDefaults():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClubHostDefaults value)?  $default,){
final _that = this;
switch (_that) {
case _ClubHostDefaults() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ActivityKind primaryActivityKind,  List<ActivityKind> supportedActivityKinds,  EventPolicyDefaults eventPolicy,  EventSuccessDefaults eventSuccess,  Map<String, EventSuccessDefaults> eventSuccessByActivityKind, @JsonKey(includeToJson: false)  String? timezone, @JsonKey(includeToJson: false)  int? revision)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClubHostDefaults() when $default != null:
return $default(_that.primaryActivityKind,_that.supportedActivityKinds,_that.eventPolicy,_that.eventSuccess,_that.eventSuccessByActivityKind,_that.timezone,_that.revision);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ActivityKind primaryActivityKind,  List<ActivityKind> supportedActivityKinds,  EventPolicyDefaults eventPolicy,  EventSuccessDefaults eventSuccess,  Map<String, EventSuccessDefaults> eventSuccessByActivityKind, @JsonKey(includeToJson: false)  String? timezone, @JsonKey(includeToJson: false)  int? revision)  $default,) {final _that = this;
switch (_that) {
case _ClubHostDefaults():
return $default(_that.primaryActivityKind,_that.supportedActivityKinds,_that.eventPolicy,_that.eventSuccess,_that.eventSuccessByActivityKind,_that.timezone,_that.revision);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ActivityKind primaryActivityKind,  List<ActivityKind> supportedActivityKinds,  EventPolicyDefaults eventPolicy,  EventSuccessDefaults eventSuccess,  Map<String, EventSuccessDefaults> eventSuccessByActivityKind, @JsonKey(includeToJson: false)  String? timezone, @JsonKey(includeToJson: false)  int? revision)?  $default,) {final _that = this;
switch (_that) {
case _ClubHostDefaults() when $default != null:
return $default(_that.primaryActivityKind,_that.supportedActivityKinds,_that.eventPolicy,_that.eventSuccess,_that.eventSuccessByActivityKind,_that.timezone,_that.revision);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClubHostDefaults extends ClubHostDefaults {
  const _ClubHostDefaults({this.primaryActivityKind = ActivityKind.socialRun, final  List<ActivityKind> supportedActivityKinds = const <ActivityKind>[], this.eventPolicy = const EventPolicyDefaults(), this.eventSuccess = const EventSuccessDefaults(), final  Map<String, EventSuccessDefaults> eventSuccessByActivityKind = const <String, EventSuccessDefaults>{}, @JsonKey(includeToJson: false) this.timezone, @JsonKey(includeToJson: false) this.revision}): _supportedActivityKinds = supportedActivityKinds,_eventSuccessByActivityKind = eventSuccessByActivityKind,super._();
  factory _ClubHostDefaults.fromJson(Map<String, dynamic> json) => _$ClubHostDefaultsFromJson(json);

@override@JsonKey() final  ActivityKind primaryActivityKind;
 final  List<ActivityKind> _supportedActivityKinds;
@override@JsonKey() List<ActivityKind> get supportedActivityKinds {
  if (_supportedActivityKinds is EqualUnmodifiableListView) return _supportedActivityKinds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_supportedActivityKinds);
}

@override@JsonKey() final  EventPolicyDefaults eventPolicy;
@override@JsonKey() final  EventSuccessDefaults eventSuccess;
 final  Map<String, EventSuccessDefaults> _eventSuccessByActivityKind;
@override@JsonKey() Map<String, EventSuccessDefaults> get eventSuccessByActivityKind {
  if (_eventSuccessByActivityKind is EqualUnmodifiableMapView) return _eventSuccessByActivityKind;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_eventSuccessByActivityKind);
}

/// Suggested IANA timezone for future events; never rewrites saved events.
/// Read only until the versioned updateOrganizer contract accepts it.
@override@JsonKey(includeToJson: false) final  String? timezone;
/// Server-managed revision used when an event inherits defaults.
@override@JsonKey(includeToJson: false) final  int? revision;

/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClubHostDefaultsCopyWith<_ClubHostDefaults> get copyWith => __$ClubHostDefaultsCopyWithImpl<_ClubHostDefaults>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClubHostDefaultsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClubHostDefaults&&(identical(other.primaryActivityKind, primaryActivityKind) || other.primaryActivityKind == primaryActivityKind)&&const DeepCollectionEquality().equals(other._supportedActivityKinds, _supportedActivityKinds)&&(identical(other.eventPolicy, eventPolicy) || other.eventPolicy == eventPolicy)&&(identical(other.eventSuccess, eventSuccess) || other.eventSuccess == eventSuccess)&&const DeepCollectionEquality().equals(other._eventSuccessByActivityKind, _eventSuccessByActivityKind)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.revision, revision) || other.revision == revision));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,primaryActivityKind,const DeepCollectionEquality().hash(_supportedActivityKinds),eventPolicy,eventSuccess,const DeepCollectionEquality().hash(_eventSuccessByActivityKind),timezone,revision);

@override
String toString() {
  return 'ClubHostDefaults(primaryActivityKind: $primaryActivityKind, supportedActivityKinds: $supportedActivityKinds, eventPolicy: $eventPolicy, eventSuccess: $eventSuccess, eventSuccessByActivityKind: $eventSuccessByActivityKind, timezone: $timezone, revision: $revision)';
}


}

/// @nodoc
abstract mixin class _$ClubHostDefaultsCopyWith<$Res> implements $ClubHostDefaultsCopyWith<$Res> {
  factory _$ClubHostDefaultsCopyWith(_ClubHostDefaults value, $Res Function(_ClubHostDefaults) _then) = __$ClubHostDefaultsCopyWithImpl;
@override @useResult
$Res call({
 ActivityKind primaryActivityKind, List<ActivityKind> supportedActivityKinds, EventPolicyDefaults eventPolicy, EventSuccessDefaults eventSuccess, Map<String, EventSuccessDefaults> eventSuccessByActivityKind,@JsonKey(includeToJson: false) String? timezone,@JsonKey(includeToJson: false) int? revision
});


@override $EventPolicyDefaultsCopyWith<$Res> get eventPolicy;@override $EventSuccessDefaultsCopyWith<$Res> get eventSuccess;

}
/// @nodoc
class __$ClubHostDefaultsCopyWithImpl<$Res>
    implements _$ClubHostDefaultsCopyWith<$Res> {
  __$ClubHostDefaultsCopyWithImpl(this._self, this._then);

  final _ClubHostDefaults _self;
  final $Res Function(_ClubHostDefaults) _then;

/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? primaryActivityKind = null,Object? supportedActivityKinds = null,Object? eventPolicy = null,Object? eventSuccess = null,Object? eventSuccessByActivityKind = null,Object? timezone = freezed,Object? revision = freezed,}) {
  return _then(_ClubHostDefaults(
primaryActivityKind: null == primaryActivityKind ? _self.primaryActivityKind : primaryActivityKind // ignore: cast_nullable_to_non_nullable
as ActivityKind,supportedActivityKinds: null == supportedActivityKinds ? _self._supportedActivityKinds : supportedActivityKinds // ignore: cast_nullable_to_non_nullable
as List<ActivityKind>,eventPolicy: null == eventPolicy ? _self.eventPolicy : eventPolicy // ignore: cast_nullable_to_non_nullable
as EventPolicyDefaults,eventSuccess: null == eventSuccess ? _self.eventSuccess : eventSuccess // ignore: cast_nullable_to_non_nullable
as EventSuccessDefaults,eventSuccessByActivityKind: null == eventSuccessByActivityKind ? _self._eventSuccessByActivityKind : eventSuccessByActivityKind // ignore: cast_nullable_to_non_nullable
as Map<String, EventSuccessDefaults>,timezone: freezed == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String?,revision: freezed == revision ? _self.revision : revision // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventPolicyDefaultsCopyWith<$Res> get eventPolicy {
  
  return $EventPolicyDefaultsCopyWith<$Res>(_self.eventPolicy, (value) {
    return _then(_self.copyWith(eventPolicy: value));
  });
}/// Create a copy of ClubHostDefaults
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$EventSuccessDefaultsCopyWith<$Res> get eventSuccess {
  
  return $EventSuccessDefaultsCopyWith<$Res>(_self.eventSuccess, (value) {
    return _then(_self.copyWith(eventSuccess: value));
  });
}
}

// dart format on
