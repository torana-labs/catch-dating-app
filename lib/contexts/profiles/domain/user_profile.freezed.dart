// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'user_profile.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RunningPreferences {

 int get paceMinSecsPerKm; int get paceMaxSecsPerKm; List<PreferredDistance> get preferredDistances; List<RunReason> get runningReasons; List<PreferredRunTime> get preferredRunTimes;@JsonKey(name: 'version') int get version;
/// Create a copy of RunningPreferences
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunningPreferencesCopyWith<RunningPreferences> get copyWith => _$RunningPreferencesCopyWithImpl<RunningPreferences>(this as RunningPreferences, _$identity);

  /// Serializes this RunningPreferences to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RunningPreferences&&(identical(other.paceMinSecsPerKm, paceMinSecsPerKm) || other.paceMinSecsPerKm == paceMinSecsPerKm)&&(identical(other.paceMaxSecsPerKm, paceMaxSecsPerKm) || other.paceMaxSecsPerKm == paceMaxSecsPerKm)&&const DeepCollectionEquality().equals(other.preferredDistances, preferredDistances)&&const DeepCollectionEquality().equals(other.runningReasons, runningReasons)&&const DeepCollectionEquality().equals(other.preferredRunTimes, preferredRunTimes)&&(identical(other.version, version) || other.version == version));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,paceMinSecsPerKm,paceMaxSecsPerKm,const DeepCollectionEquality().hash(preferredDistances),const DeepCollectionEquality().hash(runningReasons),const DeepCollectionEquality().hash(preferredRunTimes),version);

@override
String toString() {
  return 'RunningPreferences(paceMinSecsPerKm: $paceMinSecsPerKm, paceMaxSecsPerKm: $paceMaxSecsPerKm, preferredDistances: $preferredDistances, runningReasons: $runningReasons, preferredRunTimes: $preferredRunTimes, version: $version)';
}


}

/// @nodoc
abstract mixin class $RunningPreferencesCopyWith<$Res>  {
  factory $RunningPreferencesCopyWith(RunningPreferences value, $Res Function(RunningPreferences) _then) = _$RunningPreferencesCopyWithImpl;
@useResult
$Res call({
 int paceMinSecsPerKm, int paceMaxSecsPerKm, List<PreferredDistance> preferredDistances, List<RunReason> runningReasons, List<PreferredRunTime> preferredRunTimes,@JsonKey(name: 'version') int version
});




}
/// @nodoc
class _$RunningPreferencesCopyWithImpl<$Res>
    implements $RunningPreferencesCopyWith<$Res> {
  _$RunningPreferencesCopyWithImpl(this._self, this._then);

  final RunningPreferences _self;
  final $Res Function(RunningPreferences) _then;

/// Create a copy of RunningPreferences
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? paceMinSecsPerKm = null,Object? paceMaxSecsPerKm = null,Object? preferredDistances = null,Object? runningReasons = null,Object? preferredRunTimes = null,Object? version = null,}) {
  return _then(_self.copyWith(
paceMinSecsPerKm: null == paceMinSecsPerKm ? _self.paceMinSecsPerKm : paceMinSecsPerKm // ignore: cast_nullable_to_non_nullable
as int,paceMaxSecsPerKm: null == paceMaxSecsPerKm ? _self.paceMaxSecsPerKm : paceMaxSecsPerKm // ignore: cast_nullable_to_non_nullable
as int,preferredDistances: null == preferredDistances ? _self.preferredDistances : preferredDistances // ignore: cast_nullable_to_non_nullable
as List<PreferredDistance>,runningReasons: null == runningReasons ? _self.runningReasons : runningReasons // ignore: cast_nullable_to_non_nullable
as List<RunReason>,preferredRunTimes: null == preferredRunTimes ? _self.preferredRunTimes : preferredRunTimes // ignore: cast_nullable_to_non_nullable
as List<PreferredRunTime>,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RunningPreferences].
extension RunningPreferencesPatterns on RunningPreferences {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RunningPreferences value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RunningPreferences() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RunningPreferences value)  $default,){
final _that = this;
switch (_that) {
case _RunningPreferences():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RunningPreferences value)?  $default,){
final _that = this;
switch (_that) {
case _RunningPreferences() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int paceMinSecsPerKm,  int paceMaxSecsPerKm,  List<PreferredDistance> preferredDistances,  List<RunReason> runningReasons,  List<PreferredRunTime> preferredRunTimes, @JsonKey(name: 'version')  int version)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RunningPreferences() when $default != null:
return $default(_that.paceMinSecsPerKm,_that.paceMaxSecsPerKm,_that.preferredDistances,_that.runningReasons,_that.preferredRunTimes,_that.version);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int paceMinSecsPerKm,  int paceMaxSecsPerKm,  List<PreferredDistance> preferredDistances,  List<RunReason> runningReasons,  List<PreferredRunTime> preferredRunTimes, @JsonKey(name: 'version')  int version)  $default,) {final _that = this;
switch (_that) {
case _RunningPreferences():
return $default(_that.paceMinSecsPerKm,_that.paceMaxSecsPerKm,_that.preferredDistances,_that.runningReasons,_that.preferredRunTimes,_that.version);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int paceMinSecsPerKm,  int paceMaxSecsPerKm,  List<PreferredDistance> preferredDistances,  List<RunReason> runningReasons,  List<PreferredRunTime> preferredRunTimes, @JsonKey(name: 'version')  int version)?  $default,) {final _that = this;
switch (_that) {
case _RunningPreferences() when $default != null:
return $default(_that.paceMinSecsPerKm,_that.paceMaxSecsPerKm,_that.preferredDistances,_that.runningReasons,_that.preferredRunTimes,_that.version);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RunningPreferences implements RunningPreferences {
  const _RunningPreferences({this.paceMinSecsPerKm = defaultPaceMinSecsPerKm, this.paceMaxSecsPerKm = defaultPaceMaxSecsPerKm, final  List<PreferredDistance> preferredDistances = const [], final  List<RunReason> runningReasons = const [], final  List<PreferredRunTime> preferredRunTimes = const [], @JsonKey(name: 'version') this.version = 0}): _preferredDistances = preferredDistances,_runningReasons = runningReasons,_preferredRunTimes = preferredRunTimes;
  factory _RunningPreferences.fromJson(Map<String, dynamic> json) => _$RunningPreferencesFromJson(json);

@override@JsonKey() final  int paceMinSecsPerKm;
@override@JsonKey() final  int paceMaxSecsPerKm;
 final  List<PreferredDistance> _preferredDistances;
@override@JsonKey() List<PreferredDistance> get preferredDistances {
  if (_preferredDistances is EqualUnmodifiableListView) return _preferredDistances;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_preferredDistances);
}

 final  List<RunReason> _runningReasons;
@override@JsonKey() List<RunReason> get runningReasons {
  if (_runningReasons is EqualUnmodifiableListView) return _runningReasons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_runningReasons);
}

 final  List<PreferredRunTime> _preferredRunTimes;
@override@JsonKey() List<PreferredRunTime> get preferredRunTimes {
  if (_preferredRunTimes is EqualUnmodifiableListView) return _preferredRunTimes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_preferredRunTimes);
}

@override@JsonKey(name: 'version') final  int version;

/// Create a copy of RunningPreferences
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RunningPreferencesCopyWith<_RunningPreferences> get copyWith => __$RunningPreferencesCopyWithImpl<_RunningPreferences>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RunningPreferencesToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RunningPreferences&&(identical(other.paceMinSecsPerKm, paceMinSecsPerKm) || other.paceMinSecsPerKm == paceMinSecsPerKm)&&(identical(other.paceMaxSecsPerKm, paceMaxSecsPerKm) || other.paceMaxSecsPerKm == paceMaxSecsPerKm)&&const DeepCollectionEquality().equals(other._preferredDistances, _preferredDistances)&&const DeepCollectionEquality().equals(other._runningReasons, _runningReasons)&&const DeepCollectionEquality().equals(other._preferredRunTimes, _preferredRunTimes)&&(identical(other.version, version) || other.version == version));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,paceMinSecsPerKm,paceMaxSecsPerKm,const DeepCollectionEquality().hash(_preferredDistances),const DeepCollectionEquality().hash(_runningReasons),const DeepCollectionEquality().hash(_preferredRunTimes),version);

@override
String toString() {
  return 'RunningPreferences(paceMinSecsPerKm: $paceMinSecsPerKm, paceMaxSecsPerKm: $paceMaxSecsPerKm, preferredDistances: $preferredDistances, runningReasons: $runningReasons, preferredRunTimes: $preferredRunTimes, version: $version)';
}


}

/// @nodoc
abstract mixin class _$RunningPreferencesCopyWith<$Res> implements $RunningPreferencesCopyWith<$Res> {
  factory _$RunningPreferencesCopyWith(_RunningPreferences value, $Res Function(_RunningPreferences) _then) = __$RunningPreferencesCopyWithImpl;
@override @useResult
$Res call({
 int paceMinSecsPerKm, int paceMaxSecsPerKm, List<PreferredDistance> preferredDistances, List<RunReason> runningReasons, List<PreferredRunTime> preferredRunTimes,@JsonKey(name: 'version') int version
});




}
/// @nodoc
class __$RunningPreferencesCopyWithImpl<$Res>
    implements _$RunningPreferencesCopyWith<$Res> {
  __$RunningPreferencesCopyWithImpl(this._self, this._then);

  final _RunningPreferences _self;
  final $Res Function(_RunningPreferences) _then;

/// Create a copy of RunningPreferences
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? paceMinSecsPerKm = null,Object? paceMaxSecsPerKm = null,Object? preferredDistances = null,Object? runningReasons = null,Object? preferredRunTimes = null,Object? version = null,}) {
  return _then(_RunningPreferences(
paceMinSecsPerKm: null == paceMinSecsPerKm ? _self.paceMinSecsPerKm : paceMinSecsPerKm // ignore: cast_nullable_to_non_nullable
as int,paceMaxSecsPerKm: null == paceMaxSecsPerKm ? _self.paceMaxSecsPerKm : paceMaxSecsPerKm // ignore: cast_nullable_to_non_nullable
as int,preferredDistances: null == preferredDistances ? _self._preferredDistances : preferredDistances // ignore: cast_nullable_to_non_nullable
as List<PreferredDistance>,runningReasons: null == runningReasons ? _self._runningReasons : runningReasons // ignore: cast_nullable_to_non_nullable
as List<RunReason>,preferredRunTimes: null == preferredRunTimes ? _self._preferredRunTimes : preferredRunTimes // ignore: cast_nullable_to_non_nullable
as List<PreferredRunTime>,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ActivityPreferences {

 RunningPreferences get running;
/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivityPreferencesCopyWith<ActivityPreferences> get copyWith => _$ActivityPreferencesCopyWithImpl<ActivityPreferences>(this as ActivityPreferences, _$identity);

  /// Serializes this ActivityPreferences to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActivityPreferences&&(identical(other.running, running) || other.running == running));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,running);

@override
String toString() {
  return 'ActivityPreferences(running: $running)';
}


}

/// @nodoc
abstract mixin class $ActivityPreferencesCopyWith<$Res>  {
  factory $ActivityPreferencesCopyWith(ActivityPreferences value, $Res Function(ActivityPreferences) _then) = _$ActivityPreferencesCopyWithImpl;
@useResult
$Res call({
 RunningPreferences running
});


$RunningPreferencesCopyWith<$Res> get running;

}
/// @nodoc
class _$ActivityPreferencesCopyWithImpl<$Res>
    implements $ActivityPreferencesCopyWith<$Res> {
  _$ActivityPreferencesCopyWithImpl(this._self, this._then);

  final ActivityPreferences _self;
  final $Res Function(ActivityPreferences) _then;

/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? running = null,}) {
  return _then(_self.copyWith(
running: null == running ? _self.running : running // ignore: cast_nullable_to_non_nullable
as RunningPreferences,
  ));
}
/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RunningPreferencesCopyWith<$Res> get running {
  
  return $RunningPreferencesCopyWith<$Res>(_self.running, (value) {
    return _then(_self.copyWith(running: value));
  });
}
}


/// Adds pattern-matching-related methods to [ActivityPreferences].
extension ActivityPreferencesPatterns on ActivityPreferences {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActivityPreferences value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActivityPreferences() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActivityPreferences value)  $default,){
final _that = this;
switch (_that) {
case _ActivityPreferences():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActivityPreferences value)?  $default,){
final _that = this;
switch (_that) {
case _ActivityPreferences() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( RunningPreferences running)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActivityPreferences() when $default != null:
return $default(_that.running);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( RunningPreferences running)  $default,) {final _that = this;
switch (_that) {
case _ActivityPreferences():
return $default(_that.running);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( RunningPreferences running)?  $default,) {final _that = this;
switch (_that) {
case _ActivityPreferences() when $default != null:
return $default(_that.running);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ActivityPreferences implements ActivityPreferences {
  const _ActivityPreferences({this.running = const RunningPreferences()});
  factory _ActivityPreferences.fromJson(Map<String, dynamic> json) => _$ActivityPreferencesFromJson(json);

@override@JsonKey() final  RunningPreferences running;

/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivityPreferencesCopyWith<_ActivityPreferences> get copyWith => __$ActivityPreferencesCopyWithImpl<_ActivityPreferences>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActivityPreferencesToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActivityPreferences&&(identical(other.running, running) || other.running == running));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,running);

@override
String toString() {
  return 'ActivityPreferences(running: $running)';
}


}

/// @nodoc
abstract mixin class _$ActivityPreferencesCopyWith<$Res> implements $ActivityPreferencesCopyWith<$Res> {
  factory _$ActivityPreferencesCopyWith(_ActivityPreferences value, $Res Function(_ActivityPreferences) _then) = __$ActivityPreferencesCopyWithImpl;
@override @useResult
$Res call({
 RunningPreferences running
});


@override $RunningPreferencesCopyWith<$Res> get running;

}
/// @nodoc
class __$ActivityPreferencesCopyWithImpl<$Res>
    implements _$ActivityPreferencesCopyWith<$Res> {
  __$ActivityPreferencesCopyWithImpl(this._self, this._then);

  final _ActivityPreferences _self;
  final $Res Function(_ActivityPreferences) _then;

/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? running = null,}) {
  return _then(_ActivityPreferences(
running: null == running ? _self.running : running // ignore: cast_nullable_to_non_nullable
as RunningPreferences,
  ));
}

/// Create a copy of ActivityPreferences
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RunningPreferencesCopyWith<$Res> get running {
  
  return $RunningPreferencesCopyWith<$Res>(_self.running, (value) {
    return _then(_self.copyWith(running: value));
  });
}
}


/// @nodoc
mixin _$UserProfile {

@JsonKey(includeToJson: false) String get uid; String get name; String get firstName; String get lastName; String get displayName;@JsonKey(includeIfNull: false)@NullableTimestampConverter() DateTime? get dateOfBirth;@JsonKey(includeIfNull: false) Gender? get gender; String get phoneNumber; String get countryCode; bool get profileComplete; String get email; String? get instagramHandle; List<ProfilePromptAnswer> get profilePrompts; List<ProfilePhoto> get profilePhotos; String? get city; double? get latitude; double? get longitude; List<Gender> get interestedInGenders; int get minAgePreference; int get maxAgePreference; int? get height; String? get occupation; String? get company; EducationLevel? get education; Religion? get religion; List<Language> get languages; RelationshipGoal? get relationshipGoal; DrinkingHabit? get drinking; SmokingHabit? get smoking; WorkoutFrequency? get workout; DietaryPreference? get diet; ChildrenStatus? get children; ActivityPreferences get activityPreferences; bool get prefsNewCatches; bool get prefsMessages; bool get prefsEventReminders; bool get prefsRunStatusUpdates; bool get prefsClubUpdates; bool get prefsWeeklyDigest; bool get prefsShowOnMap; bool get prefsShowInCrossPaths; bool get prefsCrossPathsInvitations;
/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UserProfileCopyWith<UserProfile> get copyWith => _$UserProfileCopyWithImpl<UserProfile>(this as UserProfile, _$identity);

  /// Serializes this UserProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UserProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.dateOfBirth, dateOfBirth) || other.dateOfBirth == dateOfBirth)&&(identical(other.gender, gender) || other.gender == gender)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.profileComplete, profileComplete) || other.profileComplete == profileComplete)&&(identical(other.email, email) || other.email == email)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&const DeepCollectionEquality().equals(other.profilePrompts, profilePrompts)&&const DeepCollectionEquality().equals(other.profilePhotos, profilePhotos)&&(identical(other.city, city) || other.city == city)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&const DeepCollectionEquality().equals(other.interestedInGenders, interestedInGenders)&&(identical(other.minAgePreference, minAgePreference) || other.minAgePreference == minAgePreference)&&(identical(other.maxAgePreference, maxAgePreference) || other.maxAgePreference == maxAgePreference)&&(identical(other.height, height) || other.height == height)&&(identical(other.occupation, occupation) || other.occupation == occupation)&&(identical(other.company, company) || other.company == company)&&(identical(other.education, education) || other.education == education)&&(identical(other.religion, religion) || other.religion == religion)&&const DeepCollectionEquality().equals(other.languages, languages)&&(identical(other.relationshipGoal, relationshipGoal) || other.relationshipGoal == relationshipGoal)&&(identical(other.drinking, drinking) || other.drinking == drinking)&&(identical(other.smoking, smoking) || other.smoking == smoking)&&(identical(other.workout, workout) || other.workout == workout)&&(identical(other.diet, diet) || other.diet == diet)&&(identical(other.children, children) || other.children == children)&&(identical(other.activityPreferences, activityPreferences) || other.activityPreferences == activityPreferences)&&(identical(other.prefsNewCatches, prefsNewCatches) || other.prefsNewCatches == prefsNewCatches)&&(identical(other.prefsMessages, prefsMessages) || other.prefsMessages == prefsMessages)&&(identical(other.prefsEventReminders, prefsEventReminders) || other.prefsEventReminders == prefsEventReminders)&&(identical(other.prefsRunStatusUpdates, prefsRunStatusUpdates) || other.prefsRunStatusUpdates == prefsRunStatusUpdates)&&(identical(other.prefsClubUpdates, prefsClubUpdates) || other.prefsClubUpdates == prefsClubUpdates)&&(identical(other.prefsWeeklyDigest, prefsWeeklyDigest) || other.prefsWeeklyDigest == prefsWeeklyDigest)&&(identical(other.prefsShowOnMap, prefsShowOnMap) || other.prefsShowOnMap == prefsShowOnMap)&&(identical(other.prefsShowInCrossPaths, prefsShowInCrossPaths) || other.prefsShowInCrossPaths == prefsShowInCrossPaths)&&(identical(other.prefsCrossPathsInvitations, prefsCrossPathsInvitations) || other.prefsCrossPathsInvitations == prefsCrossPathsInvitations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,name,firstName,lastName,displayName,dateOfBirth,gender,phoneNumber,countryCode,profileComplete,email,instagramHandle,const DeepCollectionEquality().hash(profilePrompts),const DeepCollectionEquality().hash(profilePhotos),city,latitude,longitude,const DeepCollectionEquality().hash(interestedInGenders),minAgePreference,maxAgePreference,height,occupation,company,education,religion,const DeepCollectionEquality().hash(languages),relationshipGoal,drinking,smoking,workout,diet,children,activityPreferences,prefsNewCatches,prefsMessages,prefsEventReminders,prefsRunStatusUpdates,prefsClubUpdates,prefsWeeklyDigest,prefsShowOnMap,prefsShowInCrossPaths,prefsCrossPathsInvitations]);

@override
String toString() {
  return 'UserProfile(uid: $uid, name: $name, firstName: $firstName, lastName: $lastName, displayName: $displayName, dateOfBirth: $dateOfBirth, gender: $gender, phoneNumber: $phoneNumber, countryCode: $countryCode, profileComplete: $profileComplete, email: $email, instagramHandle: $instagramHandle, profilePrompts: $profilePrompts, profilePhotos: $profilePhotos, city: $city, latitude: $latitude, longitude: $longitude, interestedInGenders: $interestedInGenders, minAgePreference: $minAgePreference, maxAgePreference: $maxAgePreference, height: $height, occupation: $occupation, company: $company, education: $education, religion: $religion, languages: $languages, relationshipGoal: $relationshipGoal, drinking: $drinking, smoking: $smoking, workout: $workout, diet: $diet, children: $children, activityPreferences: $activityPreferences, prefsNewCatches: $prefsNewCatches, prefsMessages: $prefsMessages, prefsEventReminders: $prefsEventReminders, prefsRunStatusUpdates: $prefsRunStatusUpdates, prefsClubUpdates: $prefsClubUpdates, prefsWeeklyDigest: $prefsWeeklyDigest, prefsShowOnMap: $prefsShowOnMap, prefsShowInCrossPaths: $prefsShowInCrossPaths, prefsCrossPathsInvitations: $prefsCrossPathsInvitations)';
}


}

/// @nodoc
abstract mixin class $UserProfileCopyWith<$Res>  {
  factory $UserProfileCopyWith(UserProfile value, $Res Function(UserProfile) _then) = _$UserProfileCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String uid, String name, String firstName, String lastName, String displayName,@JsonKey(includeIfNull: false)@NullableTimestampConverter() DateTime? dateOfBirth,@JsonKey(includeIfNull: false) Gender? gender, String phoneNumber, String countryCode, bool profileComplete, String email, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts, List<ProfilePhoto> profilePhotos, String? city, double? latitude, double? longitude, List<Gender> interestedInGenders, int minAgePreference, int maxAgePreference, int? height, String? occupation, String? company, EducationLevel? education, Religion? religion, List<Language> languages, RelationshipGoal? relationshipGoal, DrinkingHabit? drinking, SmokingHabit? smoking, WorkoutFrequency? workout, DietaryPreference? diet, ChildrenStatus? children, ActivityPreferences activityPreferences, bool prefsNewCatches, bool prefsMessages, bool prefsEventReminders, bool prefsRunStatusUpdates, bool prefsClubUpdates, bool prefsWeeklyDigest, bool prefsShowOnMap, bool prefsShowInCrossPaths, bool prefsCrossPathsInvitations
});


$ActivityPreferencesCopyWith<$Res> get activityPreferences;

}
/// @nodoc
class _$UserProfileCopyWithImpl<$Res>
    implements $UserProfileCopyWith<$Res> {
  _$UserProfileCopyWithImpl(this._self, this._then);

  final UserProfile _self;
  final $Res Function(UserProfile) _then;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uid = null,Object? name = null,Object? firstName = null,Object? lastName = null,Object? displayName = null,Object? dateOfBirth = freezed,Object? gender = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? profileComplete = null,Object? email = null,Object? instagramHandle = freezed,Object? profilePrompts = null,Object? profilePhotos = null,Object? city = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? interestedInGenders = null,Object? minAgePreference = null,Object? maxAgePreference = null,Object? height = freezed,Object? occupation = freezed,Object? company = freezed,Object? education = freezed,Object? religion = freezed,Object? languages = null,Object? relationshipGoal = freezed,Object? drinking = freezed,Object? smoking = freezed,Object? workout = freezed,Object? diet = freezed,Object? children = freezed,Object? activityPreferences = null,Object? prefsNewCatches = null,Object? prefsMessages = null,Object? prefsEventReminders = null,Object? prefsRunStatusUpdates = null,Object? prefsClubUpdates = null,Object? prefsWeeklyDigest = null,Object? prefsShowOnMap = null,Object? prefsShowInCrossPaths = null,Object? prefsCrossPathsInvitations = null,}) {
  return _then(_self.copyWith(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,dateOfBirth: freezed == dateOfBirth ? _self.dateOfBirth : dateOfBirth // ignore: cast_nullable_to_non_nullable
as DateTime?,gender: freezed == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender?,phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,profileComplete: null == profileComplete ? _self.profileComplete : profileComplete // ignore: cast_nullable_to_non_nullable
as bool,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,profilePrompts: null == profilePrompts ? _self.profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,profilePhotos: null == profilePhotos ? _self.profilePhotos : profilePhotos // ignore: cast_nullable_to_non_nullable
as List<ProfilePhoto>,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,interestedInGenders: null == interestedInGenders ? _self.interestedInGenders : interestedInGenders // ignore: cast_nullable_to_non_nullable
as List<Gender>,minAgePreference: null == minAgePreference ? _self.minAgePreference : minAgePreference // ignore: cast_nullable_to_non_nullable
as int,maxAgePreference: null == maxAgePreference ? _self.maxAgePreference : maxAgePreference // ignore: cast_nullable_to_non_nullable
as int,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as int?,occupation: freezed == occupation ? _self.occupation : occupation // ignore: cast_nullable_to_non_nullable
as String?,company: freezed == company ? _self.company : company // ignore: cast_nullable_to_non_nullable
as String?,education: freezed == education ? _self.education : education // ignore: cast_nullable_to_non_nullable
as EducationLevel?,religion: freezed == religion ? _self.religion : religion // ignore: cast_nullable_to_non_nullable
as Religion?,languages: null == languages ? _self.languages : languages // ignore: cast_nullable_to_non_nullable
as List<Language>,relationshipGoal: freezed == relationshipGoal ? _self.relationshipGoal : relationshipGoal // ignore: cast_nullable_to_non_nullable
as RelationshipGoal?,drinking: freezed == drinking ? _self.drinking : drinking // ignore: cast_nullable_to_non_nullable
as DrinkingHabit?,smoking: freezed == smoking ? _self.smoking : smoking // ignore: cast_nullable_to_non_nullable
as SmokingHabit?,workout: freezed == workout ? _self.workout : workout // ignore: cast_nullable_to_non_nullable
as WorkoutFrequency?,diet: freezed == diet ? _self.diet : diet // ignore: cast_nullable_to_non_nullable
as DietaryPreference?,children: freezed == children ? _self.children : children // ignore: cast_nullable_to_non_nullable
as ChildrenStatus?,activityPreferences: null == activityPreferences ? _self.activityPreferences : activityPreferences // ignore: cast_nullable_to_non_nullable
as ActivityPreferences,prefsNewCatches: null == prefsNewCatches ? _self.prefsNewCatches : prefsNewCatches // ignore: cast_nullable_to_non_nullable
as bool,prefsMessages: null == prefsMessages ? _self.prefsMessages : prefsMessages // ignore: cast_nullable_to_non_nullable
as bool,prefsEventReminders: null == prefsEventReminders ? _self.prefsEventReminders : prefsEventReminders // ignore: cast_nullable_to_non_nullable
as bool,prefsRunStatusUpdates: null == prefsRunStatusUpdates ? _self.prefsRunStatusUpdates : prefsRunStatusUpdates // ignore: cast_nullable_to_non_nullable
as bool,prefsClubUpdates: null == prefsClubUpdates ? _self.prefsClubUpdates : prefsClubUpdates // ignore: cast_nullable_to_non_nullable
as bool,prefsWeeklyDigest: null == prefsWeeklyDigest ? _self.prefsWeeklyDigest : prefsWeeklyDigest // ignore: cast_nullable_to_non_nullable
as bool,prefsShowOnMap: null == prefsShowOnMap ? _self.prefsShowOnMap : prefsShowOnMap // ignore: cast_nullable_to_non_nullable
as bool,prefsShowInCrossPaths: null == prefsShowInCrossPaths ? _self.prefsShowInCrossPaths : prefsShowInCrossPaths // ignore: cast_nullable_to_non_nullable
as bool,prefsCrossPathsInvitations: null == prefsCrossPathsInvitations ? _self.prefsCrossPathsInvitations : prefsCrossPathsInvitations // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ActivityPreferencesCopyWith<$Res> get activityPreferences {
  
  return $ActivityPreferencesCopyWith<$Res>(_self.activityPreferences, (value) {
    return _then(_self.copyWith(activityPreferences: value));
  });
}
}


/// Adds pattern-matching-related methods to [UserProfile].
extension UserProfilePatterns on UserProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UserProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UserProfile value)  $default,){
final _that = this;
switch (_that) {
case _UserProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UserProfile value)?  $default,){
final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  String name,  String firstName,  String lastName,  String displayName, @JsonKey(includeIfNull: false)@NullableTimestampConverter()  DateTime? dateOfBirth, @JsonKey(includeIfNull: false)  Gender? gender,  String phoneNumber,  String countryCode,  bool profileComplete,  String email,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  double? latitude,  double? longitude,  List<Gender> interestedInGenders,  int minAgePreference,  int maxAgePreference,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences,  bool prefsNewCatches,  bool prefsMessages,  bool prefsEventReminders,  bool prefsRunStatusUpdates,  bool prefsClubUpdates,  bool prefsWeeklyDigest,  bool prefsShowOnMap,  bool prefsShowInCrossPaths,  bool prefsCrossPathsInvitations)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
return $default(_that.uid,_that.name,_that.firstName,_that.lastName,_that.displayName,_that.dateOfBirth,_that.gender,_that.phoneNumber,_that.countryCode,_that.profileComplete,_that.email,_that.instagramHandle,_that.profilePrompts,_that.profilePhotos,_that.city,_that.latitude,_that.longitude,_that.interestedInGenders,_that.minAgePreference,_that.maxAgePreference,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences,_that.prefsNewCatches,_that.prefsMessages,_that.prefsEventReminders,_that.prefsRunStatusUpdates,_that.prefsClubUpdates,_that.prefsWeeklyDigest,_that.prefsShowOnMap,_that.prefsShowInCrossPaths,_that.prefsCrossPathsInvitations);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  String name,  String firstName,  String lastName,  String displayName, @JsonKey(includeIfNull: false)@NullableTimestampConverter()  DateTime? dateOfBirth, @JsonKey(includeIfNull: false)  Gender? gender,  String phoneNumber,  String countryCode,  bool profileComplete,  String email,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  double? latitude,  double? longitude,  List<Gender> interestedInGenders,  int minAgePreference,  int maxAgePreference,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences,  bool prefsNewCatches,  bool prefsMessages,  bool prefsEventReminders,  bool prefsRunStatusUpdates,  bool prefsClubUpdates,  bool prefsWeeklyDigest,  bool prefsShowOnMap,  bool prefsShowInCrossPaths,  bool prefsCrossPathsInvitations)  $default,) {final _that = this;
switch (_that) {
case _UserProfile():
return $default(_that.uid,_that.name,_that.firstName,_that.lastName,_that.displayName,_that.dateOfBirth,_that.gender,_that.phoneNumber,_that.countryCode,_that.profileComplete,_that.email,_that.instagramHandle,_that.profilePrompts,_that.profilePhotos,_that.city,_that.latitude,_that.longitude,_that.interestedInGenders,_that.minAgePreference,_that.maxAgePreference,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences,_that.prefsNewCatches,_that.prefsMessages,_that.prefsEventReminders,_that.prefsRunStatusUpdates,_that.prefsClubUpdates,_that.prefsWeeklyDigest,_that.prefsShowOnMap,_that.prefsShowInCrossPaths,_that.prefsCrossPathsInvitations);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String uid,  String name,  String firstName,  String lastName,  String displayName, @JsonKey(includeIfNull: false)@NullableTimestampConverter()  DateTime? dateOfBirth, @JsonKey(includeIfNull: false)  Gender? gender,  String phoneNumber,  String countryCode,  bool profileComplete,  String email,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  double? latitude,  double? longitude,  List<Gender> interestedInGenders,  int minAgePreference,  int maxAgePreference,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences,  bool prefsNewCatches,  bool prefsMessages,  bool prefsEventReminders,  bool prefsRunStatusUpdates,  bool prefsClubUpdates,  bool prefsWeeklyDigest,  bool prefsShowOnMap,  bool prefsShowInCrossPaths,  bool prefsCrossPathsInvitations)?  $default,) {final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
return $default(_that.uid,_that.name,_that.firstName,_that.lastName,_that.displayName,_that.dateOfBirth,_that.gender,_that.phoneNumber,_that.countryCode,_that.profileComplete,_that.email,_that.instagramHandle,_that.profilePrompts,_that.profilePhotos,_that.city,_that.latitude,_that.longitude,_that.interestedInGenders,_that.minAgePreference,_that.maxAgePreference,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences,_that.prefsNewCatches,_that.prefsMessages,_that.prefsEventReminders,_that.prefsRunStatusUpdates,_that.prefsClubUpdates,_that.prefsWeeklyDigest,_that.prefsShowOnMap,_that.prefsShowInCrossPaths,_that.prefsCrossPathsInvitations);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UserProfile extends UserProfile {
  const _UserProfile({@JsonKey(includeToJson: false) required this.uid, required this.name, this.firstName = '', this.lastName = '', this.displayName = '', @JsonKey(includeIfNull: false)@NullableTimestampConverter() this.dateOfBirth, @JsonKey(includeIfNull: false) this.gender, required this.phoneNumber, this.countryCode = defaultCountryDialCode, required this.profileComplete, this.email = '', this.instagramHandle, final  List<ProfilePromptAnswer> profilePrompts = const [], final  List<ProfilePhoto> profilePhotos = const [], this.city, this.latitude, this.longitude, final  List<Gender> interestedInGenders = const [], this.minAgePreference = 18, this.maxAgePreference = maximumPreferredMatchAge, this.height, this.occupation, this.company, this.education, this.religion, final  List<Language> languages = const [], this.relationshipGoal, this.drinking, this.smoking, this.workout, this.diet, this.children, this.activityPreferences = const ActivityPreferences(), this.prefsNewCatches = true, this.prefsMessages = true, this.prefsEventReminders = true, this.prefsRunStatusUpdates = true, this.prefsClubUpdates = true, this.prefsWeeklyDigest = false, this.prefsShowOnMap = true, this.prefsShowInCrossPaths = false, this.prefsCrossPathsInvitations = false}): _profilePrompts = profilePrompts,_profilePhotos = profilePhotos,_interestedInGenders = interestedInGenders,_languages = languages,super._();
  factory _UserProfile.fromJson(Map<String, dynamic> json) => _$UserProfileFromJson(json);

@override@JsonKey(includeToJson: false) final  String uid;
@override final  String name;
@override@JsonKey() final  String firstName;
@override@JsonKey() final  String lastName;
@override@JsonKey() final  String displayName;
@override@JsonKey(includeIfNull: false)@NullableTimestampConverter() final  DateTime? dateOfBirth;
@override@JsonKey(includeIfNull: false) final  Gender? gender;
@override final  String phoneNumber;
@override@JsonKey() final  String countryCode;
@override final  bool profileComplete;
@override@JsonKey() final  String email;
@override final  String? instagramHandle;
 final  List<ProfilePromptAnswer> _profilePrompts;
@override@JsonKey() List<ProfilePromptAnswer> get profilePrompts {
  if (_profilePrompts is EqualUnmodifiableListView) return _profilePrompts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_profilePrompts);
}

 final  List<ProfilePhoto> _profilePhotos;
@override@JsonKey() List<ProfilePhoto> get profilePhotos {
  if (_profilePhotos is EqualUnmodifiableListView) return _profilePhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_profilePhotos);
}

@override final  String? city;
@override final  double? latitude;
@override final  double? longitude;
 final  List<Gender> _interestedInGenders;
@override@JsonKey() List<Gender> get interestedInGenders {
  if (_interestedInGenders is EqualUnmodifiableListView) return _interestedInGenders;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_interestedInGenders);
}

@override@JsonKey() final  int minAgePreference;
@override@JsonKey() final  int maxAgePreference;
@override final  int? height;
@override final  String? occupation;
@override final  String? company;
@override final  EducationLevel? education;
@override final  Religion? religion;
 final  List<Language> _languages;
@override@JsonKey() List<Language> get languages {
  if (_languages is EqualUnmodifiableListView) return _languages;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_languages);
}

@override final  RelationshipGoal? relationshipGoal;
@override final  DrinkingHabit? drinking;
@override final  SmokingHabit? smoking;
@override final  WorkoutFrequency? workout;
@override final  DietaryPreference? diet;
@override final  ChildrenStatus? children;
@override@JsonKey() final  ActivityPreferences activityPreferences;
@override@JsonKey() final  bool prefsNewCatches;
@override@JsonKey() final  bool prefsMessages;
@override@JsonKey() final  bool prefsEventReminders;
@override@JsonKey() final  bool prefsRunStatusUpdates;
@override@JsonKey() final  bool prefsClubUpdates;
@override@JsonKey() final  bool prefsWeeklyDigest;
@override@JsonKey() final  bool prefsShowOnMap;
@override@JsonKey() final  bool prefsShowInCrossPaths;
@override@JsonKey() final  bool prefsCrossPathsInvitations;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UserProfileCopyWith<_UserProfile> get copyWith => __$UserProfileCopyWithImpl<_UserProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UserProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UserProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.dateOfBirth, dateOfBirth) || other.dateOfBirth == dateOfBirth)&&(identical(other.gender, gender) || other.gender == gender)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.profileComplete, profileComplete) || other.profileComplete == profileComplete)&&(identical(other.email, email) || other.email == email)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&const DeepCollectionEquality().equals(other._profilePrompts, _profilePrompts)&&const DeepCollectionEquality().equals(other._profilePhotos, _profilePhotos)&&(identical(other.city, city) || other.city == city)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&const DeepCollectionEquality().equals(other._interestedInGenders, _interestedInGenders)&&(identical(other.minAgePreference, minAgePreference) || other.minAgePreference == minAgePreference)&&(identical(other.maxAgePreference, maxAgePreference) || other.maxAgePreference == maxAgePreference)&&(identical(other.height, height) || other.height == height)&&(identical(other.occupation, occupation) || other.occupation == occupation)&&(identical(other.company, company) || other.company == company)&&(identical(other.education, education) || other.education == education)&&(identical(other.religion, religion) || other.religion == religion)&&const DeepCollectionEquality().equals(other._languages, _languages)&&(identical(other.relationshipGoal, relationshipGoal) || other.relationshipGoal == relationshipGoal)&&(identical(other.drinking, drinking) || other.drinking == drinking)&&(identical(other.smoking, smoking) || other.smoking == smoking)&&(identical(other.workout, workout) || other.workout == workout)&&(identical(other.diet, diet) || other.diet == diet)&&(identical(other.children, children) || other.children == children)&&(identical(other.activityPreferences, activityPreferences) || other.activityPreferences == activityPreferences)&&(identical(other.prefsNewCatches, prefsNewCatches) || other.prefsNewCatches == prefsNewCatches)&&(identical(other.prefsMessages, prefsMessages) || other.prefsMessages == prefsMessages)&&(identical(other.prefsEventReminders, prefsEventReminders) || other.prefsEventReminders == prefsEventReminders)&&(identical(other.prefsRunStatusUpdates, prefsRunStatusUpdates) || other.prefsRunStatusUpdates == prefsRunStatusUpdates)&&(identical(other.prefsClubUpdates, prefsClubUpdates) || other.prefsClubUpdates == prefsClubUpdates)&&(identical(other.prefsWeeklyDigest, prefsWeeklyDigest) || other.prefsWeeklyDigest == prefsWeeklyDigest)&&(identical(other.prefsShowOnMap, prefsShowOnMap) || other.prefsShowOnMap == prefsShowOnMap)&&(identical(other.prefsShowInCrossPaths, prefsShowInCrossPaths) || other.prefsShowInCrossPaths == prefsShowInCrossPaths)&&(identical(other.prefsCrossPathsInvitations, prefsCrossPathsInvitations) || other.prefsCrossPathsInvitations == prefsCrossPathsInvitations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,name,firstName,lastName,displayName,dateOfBirth,gender,phoneNumber,countryCode,profileComplete,email,instagramHandle,const DeepCollectionEquality().hash(_profilePrompts),const DeepCollectionEquality().hash(_profilePhotos),city,latitude,longitude,const DeepCollectionEquality().hash(_interestedInGenders),minAgePreference,maxAgePreference,height,occupation,company,education,religion,const DeepCollectionEquality().hash(_languages),relationshipGoal,drinking,smoking,workout,diet,children,activityPreferences,prefsNewCatches,prefsMessages,prefsEventReminders,prefsRunStatusUpdates,prefsClubUpdates,prefsWeeklyDigest,prefsShowOnMap,prefsShowInCrossPaths,prefsCrossPathsInvitations]);

@override
String toString() {
  return 'UserProfile(uid: $uid, name: $name, firstName: $firstName, lastName: $lastName, displayName: $displayName, dateOfBirth: $dateOfBirth, gender: $gender, phoneNumber: $phoneNumber, countryCode: $countryCode, profileComplete: $profileComplete, email: $email, instagramHandle: $instagramHandle, profilePrompts: $profilePrompts, profilePhotos: $profilePhotos, city: $city, latitude: $latitude, longitude: $longitude, interestedInGenders: $interestedInGenders, minAgePreference: $minAgePreference, maxAgePreference: $maxAgePreference, height: $height, occupation: $occupation, company: $company, education: $education, religion: $religion, languages: $languages, relationshipGoal: $relationshipGoal, drinking: $drinking, smoking: $smoking, workout: $workout, diet: $diet, children: $children, activityPreferences: $activityPreferences, prefsNewCatches: $prefsNewCatches, prefsMessages: $prefsMessages, prefsEventReminders: $prefsEventReminders, prefsRunStatusUpdates: $prefsRunStatusUpdates, prefsClubUpdates: $prefsClubUpdates, prefsWeeklyDigest: $prefsWeeklyDigest, prefsShowOnMap: $prefsShowOnMap, prefsShowInCrossPaths: $prefsShowInCrossPaths, prefsCrossPathsInvitations: $prefsCrossPathsInvitations)';
}


}

/// @nodoc
abstract mixin class _$UserProfileCopyWith<$Res> implements $UserProfileCopyWith<$Res> {
  factory _$UserProfileCopyWith(_UserProfile value, $Res Function(_UserProfile) _then) = __$UserProfileCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String uid, String name, String firstName, String lastName, String displayName,@JsonKey(includeIfNull: false)@NullableTimestampConverter() DateTime? dateOfBirth,@JsonKey(includeIfNull: false) Gender? gender, String phoneNumber, String countryCode, bool profileComplete, String email, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts, List<ProfilePhoto> profilePhotos, String? city, double? latitude, double? longitude, List<Gender> interestedInGenders, int minAgePreference, int maxAgePreference, int? height, String? occupation, String? company, EducationLevel? education, Religion? religion, List<Language> languages, RelationshipGoal? relationshipGoal, DrinkingHabit? drinking, SmokingHabit? smoking, WorkoutFrequency? workout, DietaryPreference? diet, ChildrenStatus? children, ActivityPreferences activityPreferences, bool prefsNewCatches, bool prefsMessages, bool prefsEventReminders, bool prefsRunStatusUpdates, bool prefsClubUpdates, bool prefsWeeklyDigest, bool prefsShowOnMap, bool prefsShowInCrossPaths, bool prefsCrossPathsInvitations
});


@override $ActivityPreferencesCopyWith<$Res> get activityPreferences;

}
/// @nodoc
class __$UserProfileCopyWithImpl<$Res>
    implements _$UserProfileCopyWith<$Res> {
  __$UserProfileCopyWithImpl(this._self, this._then);

  final _UserProfile _self;
  final $Res Function(_UserProfile) _then;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uid = null,Object? name = null,Object? firstName = null,Object? lastName = null,Object? displayName = null,Object? dateOfBirth = freezed,Object? gender = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? profileComplete = null,Object? email = null,Object? instagramHandle = freezed,Object? profilePrompts = null,Object? profilePhotos = null,Object? city = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? interestedInGenders = null,Object? minAgePreference = null,Object? maxAgePreference = null,Object? height = freezed,Object? occupation = freezed,Object? company = freezed,Object? education = freezed,Object? religion = freezed,Object? languages = null,Object? relationshipGoal = freezed,Object? drinking = freezed,Object? smoking = freezed,Object? workout = freezed,Object? diet = freezed,Object? children = freezed,Object? activityPreferences = null,Object? prefsNewCatches = null,Object? prefsMessages = null,Object? prefsEventReminders = null,Object? prefsRunStatusUpdates = null,Object? prefsClubUpdates = null,Object? prefsWeeklyDigest = null,Object? prefsShowOnMap = null,Object? prefsShowInCrossPaths = null,Object? prefsCrossPathsInvitations = null,}) {
  return _then(_UserProfile(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,dateOfBirth: freezed == dateOfBirth ? _self.dateOfBirth : dateOfBirth // ignore: cast_nullable_to_non_nullable
as DateTime?,gender: freezed == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender?,phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,profileComplete: null == profileComplete ? _self.profileComplete : profileComplete // ignore: cast_nullable_to_non_nullable
as bool,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,profilePrompts: null == profilePrompts ? _self._profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,profilePhotos: null == profilePhotos ? _self._profilePhotos : profilePhotos // ignore: cast_nullable_to_non_nullable
as List<ProfilePhoto>,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,interestedInGenders: null == interestedInGenders ? _self._interestedInGenders : interestedInGenders // ignore: cast_nullable_to_non_nullable
as List<Gender>,minAgePreference: null == minAgePreference ? _self.minAgePreference : minAgePreference // ignore: cast_nullable_to_non_nullable
as int,maxAgePreference: null == maxAgePreference ? _self.maxAgePreference : maxAgePreference // ignore: cast_nullable_to_non_nullable
as int,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as int?,occupation: freezed == occupation ? _self.occupation : occupation // ignore: cast_nullable_to_non_nullable
as String?,company: freezed == company ? _self.company : company // ignore: cast_nullable_to_non_nullable
as String?,education: freezed == education ? _self.education : education // ignore: cast_nullable_to_non_nullable
as EducationLevel?,religion: freezed == religion ? _self.religion : religion // ignore: cast_nullable_to_non_nullable
as Religion?,languages: null == languages ? _self._languages : languages // ignore: cast_nullable_to_non_nullable
as List<Language>,relationshipGoal: freezed == relationshipGoal ? _self.relationshipGoal : relationshipGoal // ignore: cast_nullable_to_non_nullable
as RelationshipGoal?,drinking: freezed == drinking ? _self.drinking : drinking // ignore: cast_nullable_to_non_nullable
as DrinkingHabit?,smoking: freezed == smoking ? _self.smoking : smoking // ignore: cast_nullable_to_non_nullable
as SmokingHabit?,workout: freezed == workout ? _self.workout : workout // ignore: cast_nullable_to_non_nullable
as WorkoutFrequency?,diet: freezed == diet ? _self.diet : diet // ignore: cast_nullable_to_non_nullable
as DietaryPreference?,children: freezed == children ? _self.children : children // ignore: cast_nullable_to_non_nullable
as ChildrenStatus?,activityPreferences: null == activityPreferences ? _self.activityPreferences : activityPreferences // ignore: cast_nullable_to_non_nullable
as ActivityPreferences,prefsNewCatches: null == prefsNewCatches ? _self.prefsNewCatches : prefsNewCatches // ignore: cast_nullable_to_non_nullable
as bool,prefsMessages: null == prefsMessages ? _self.prefsMessages : prefsMessages // ignore: cast_nullable_to_non_nullable
as bool,prefsEventReminders: null == prefsEventReminders ? _self.prefsEventReminders : prefsEventReminders // ignore: cast_nullable_to_non_nullable
as bool,prefsRunStatusUpdates: null == prefsRunStatusUpdates ? _self.prefsRunStatusUpdates : prefsRunStatusUpdates // ignore: cast_nullable_to_non_nullable
as bool,prefsClubUpdates: null == prefsClubUpdates ? _self.prefsClubUpdates : prefsClubUpdates // ignore: cast_nullable_to_non_nullable
as bool,prefsWeeklyDigest: null == prefsWeeklyDigest ? _self.prefsWeeklyDigest : prefsWeeklyDigest // ignore: cast_nullable_to_non_nullable
as bool,prefsShowOnMap: null == prefsShowOnMap ? _self.prefsShowOnMap : prefsShowOnMap // ignore: cast_nullable_to_non_nullable
as bool,prefsShowInCrossPaths: null == prefsShowInCrossPaths ? _self.prefsShowInCrossPaths : prefsShowInCrossPaths // ignore: cast_nullable_to_non_nullable
as bool,prefsCrossPathsInvitations: null == prefsCrossPathsInvitations ? _self.prefsCrossPathsInvitations : prefsCrossPathsInvitations // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ActivityPreferencesCopyWith<$Res> get activityPreferences {
  
  return $ActivityPreferencesCopyWith<$Res>(_self.activityPreferences, (value) {
    return _then(_self.copyWith(activityPreferences: value));
  });
}
}

// dart format on
