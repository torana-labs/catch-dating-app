// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'public_profile.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PublicProfile {

@JsonKey(includeToJson: false) String get uid; String get name; int get age; Gender get gender; List<ProfilePromptAnswer> get profilePrompts; List<ProfilePhoto> get profilePhotos; String? get city; int? get height; String? get occupation; String? get company; EducationLevel? get education; Religion? get religion; List<Language> get languages; RelationshipGoal? get relationshipGoal; DrinkingHabit? get drinking; SmokingHabit? get smoking; WorkoutFrequency? get workout; DietaryPreference? get diet; ChildrenStatus? get children; ActivityPreferences get activityPreferences;
/// Create a copy of PublicProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PublicProfileCopyWith<PublicProfile> get copyWith => _$PublicProfileCopyWithImpl<PublicProfile>(this as PublicProfile, _$identity);

  /// Serializes this PublicProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PublicProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.name, name) || other.name == name)&&(identical(other.age, age) || other.age == age)&&(identical(other.gender, gender) || other.gender == gender)&&const DeepCollectionEquality().equals(other.profilePrompts, profilePrompts)&&const DeepCollectionEquality().equals(other.profilePhotos, profilePhotos)&&(identical(other.city, city) || other.city == city)&&(identical(other.height, height) || other.height == height)&&(identical(other.occupation, occupation) || other.occupation == occupation)&&(identical(other.company, company) || other.company == company)&&(identical(other.education, education) || other.education == education)&&(identical(other.religion, religion) || other.religion == religion)&&const DeepCollectionEquality().equals(other.languages, languages)&&(identical(other.relationshipGoal, relationshipGoal) || other.relationshipGoal == relationshipGoal)&&(identical(other.drinking, drinking) || other.drinking == drinking)&&(identical(other.smoking, smoking) || other.smoking == smoking)&&(identical(other.workout, workout) || other.workout == workout)&&(identical(other.diet, diet) || other.diet == diet)&&(identical(other.children, children) || other.children == children)&&(identical(other.activityPreferences, activityPreferences) || other.activityPreferences == activityPreferences));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,name,age,gender,const DeepCollectionEquality().hash(profilePrompts),const DeepCollectionEquality().hash(profilePhotos),city,height,occupation,company,education,religion,const DeepCollectionEquality().hash(languages),relationshipGoal,drinking,smoking,workout,diet,children,activityPreferences]);

@override
String toString() {
  return 'PublicProfile(uid: $uid, name: $name, age: $age, gender: $gender, profilePrompts: $profilePrompts, profilePhotos: $profilePhotos, city: $city, height: $height, occupation: $occupation, company: $company, education: $education, religion: $religion, languages: $languages, relationshipGoal: $relationshipGoal, drinking: $drinking, smoking: $smoking, workout: $workout, diet: $diet, children: $children, activityPreferences: $activityPreferences)';
}


}

/// @nodoc
abstract mixin class $PublicProfileCopyWith<$Res>  {
  factory $PublicProfileCopyWith(PublicProfile value, $Res Function(PublicProfile) _then) = _$PublicProfileCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String uid, String name, int age, Gender gender, List<ProfilePromptAnswer> profilePrompts, List<ProfilePhoto> profilePhotos, String? city, int? height, String? occupation, String? company, EducationLevel? education, Religion? religion, List<Language> languages, RelationshipGoal? relationshipGoal, DrinkingHabit? drinking, SmokingHabit? smoking, WorkoutFrequency? workout, DietaryPreference? diet, ChildrenStatus? children, ActivityPreferences activityPreferences
});


$ActivityPreferencesCopyWith<$Res> get activityPreferences;

}
/// @nodoc
class _$PublicProfileCopyWithImpl<$Res>
    implements $PublicProfileCopyWith<$Res> {
  _$PublicProfileCopyWithImpl(this._self, this._then);

  final PublicProfile _self;
  final $Res Function(PublicProfile) _then;

/// Create a copy of PublicProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uid = null,Object? name = null,Object? age = null,Object? gender = null,Object? profilePrompts = null,Object? profilePhotos = null,Object? city = freezed,Object? height = freezed,Object? occupation = freezed,Object? company = freezed,Object? education = freezed,Object? religion = freezed,Object? languages = null,Object? relationshipGoal = freezed,Object? drinking = freezed,Object? smoking = freezed,Object? workout = freezed,Object? diet = freezed,Object? children = freezed,Object? activityPreferences = null,}) {
  return _then(_self.copyWith(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,age: null == age ? _self.age : age // ignore: cast_nullable_to_non_nullable
as int,gender: null == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender,profilePrompts: null == profilePrompts ? _self.profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,profilePhotos: null == profilePhotos ? _self.profilePhotos : profilePhotos // ignore: cast_nullable_to_non_nullable
as List<ProfilePhoto>,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
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
as ActivityPreferences,
  ));
}
/// Create a copy of PublicProfile
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ActivityPreferencesCopyWith<$Res> get activityPreferences {
  
  return $ActivityPreferencesCopyWith<$Res>(_self.activityPreferences, (value) {
    return _then(_self.copyWith(activityPreferences: value));
  });
}
}


/// Adds pattern-matching-related methods to [PublicProfile].
extension PublicProfilePatterns on PublicProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PublicProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PublicProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PublicProfile value)  $default,){
final _that = this;
switch (_that) {
case _PublicProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PublicProfile value)?  $default,){
final _that = this;
switch (_that) {
case _PublicProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  String name,  int age,  Gender gender,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PublicProfile() when $default != null:
return $default(_that.uid,_that.name,_that.age,_that.gender,_that.profilePrompts,_that.profilePhotos,_that.city,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  String name,  int age,  Gender gender,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences)  $default,) {final _that = this;
switch (_that) {
case _PublicProfile():
return $default(_that.uid,_that.name,_that.age,_that.gender,_that.profilePrompts,_that.profilePhotos,_that.city,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String uid,  String name,  int age,  Gender gender,  List<ProfilePromptAnswer> profilePrompts,  List<ProfilePhoto> profilePhotos,  String? city,  int? height,  String? occupation,  String? company,  EducationLevel? education,  Religion? religion,  List<Language> languages,  RelationshipGoal? relationshipGoal,  DrinkingHabit? drinking,  SmokingHabit? smoking,  WorkoutFrequency? workout,  DietaryPreference? diet,  ChildrenStatus? children,  ActivityPreferences activityPreferences)?  $default,) {final _that = this;
switch (_that) {
case _PublicProfile() when $default != null:
return $default(_that.uid,_that.name,_that.age,_that.gender,_that.profilePrompts,_that.profilePhotos,_that.city,_that.height,_that.occupation,_that.company,_that.education,_that.religion,_that.languages,_that.relationshipGoal,_that.drinking,_that.smoking,_that.workout,_that.diet,_that.children,_that.activityPreferences);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PublicProfile implements PublicProfile {
  const _PublicProfile({@JsonKey(includeToJson: false) required this.uid, required this.name, required this.age, required this.gender, final  List<ProfilePromptAnswer> profilePrompts = const [], final  List<ProfilePhoto> profilePhotos = const [], this.city, this.height, this.occupation, this.company, this.education, this.religion, final  List<Language> languages = const [], this.relationshipGoal, this.drinking, this.smoking, this.workout, this.diet, this.children, this.activityPreferences = const ActivityPreferences()}): _profilePrompts = profilePrompts,_profilePhotos = profilePhotos,_languages = languages;
  factory _PublicProfile.fromJson(Map<String, dynamic> json) => _$PublicProfileFromJson(json);

@override@JsonKey(includeToJson: false) final  String uid;
@override final  String name;
@override final  int age;
@override final  Gender gender;
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

/// Create a copy of PublicProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PublicProfileCopyWith<_PublicProfile> get copyWith => __$PublicProfileCopyWithImpl<_PublicProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PublicProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PublicProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.name, name) || other.name == name)&&(identical(other.age, age) || other.age == age)&&(identical(other.gender, gender) || other.gender == gender)&&const DeepCollectionEquality().equals(other._profilePrompts, _profilePrompts)&&const DeepCollectionEquality().equals(other._profilePhotos, _profilePhotos)&&(identical(other.city, city) || other.city == city)&&(identical(other.height, height) || other.height == height)&&(identical(other.occupation, occupation) || other.occupation == occupation)&&(identical(other.company, company) || other.company == company)&&(identical(other.education, education) || other.education == education)&&(identical(other.religion, religion) || other.religion == religion)&&const DeepCollectionEquality().equals(other._languages, _languages)&&(identical(other.relationshipGoal, relationshipGoal) || other.relationshipGoal == relationshipGoal)&&(identical(other.drinking, drinking) || other.drinking == drinking)&&(identical(other.smoking, smoking) || other.smoking == smoking)&&(identical(other.workout, workout) || other.workout == workout)&&(identical(other.diet, diet) || other.diet == diet)&&(identical(other.children, children) || other.children == children)&&(identical(other.activityPreferences, activityPreferences) || other.activityPreferences == activityPreferences));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,name,age,gender,const DeepCollectionEquality().hash(_profilePrompts),const DeepCollectionEquality().hash(_profilePhotos),city,height,occupation,company,education,religion,const DeepCollectionEquality().hash(_languages),relationshipGoal,drinking,smoking,workout,diet,children,activityPreferences]);

@override
String toString() {
  return 'PublicProfile(uid: $uid, name: $name, age: $age, gender: $gender, profilePrompts: $profilePrompts, profilePhotos: $profilePhotos, city: $city, height: $height, occupation: $occupation, company: $company, education: $education, religion: $religion, languages: $languages, relationshipGoal: $relationshipGoal, drinking: $drinking, smoking: $smoking, workout: $workout, diet: $diet, children: $children, activityPreferences: $activityPreferences)';
}


}

/// @nodoc
abstract mixin class _$PublicProfileCopyWith<$Res> implements $PublicProfileCopyWith<$Res> {
  factory _$PublicProfileCopyWith(_PublicProfile value, $Res Function(_PublicProfile) _then) = __$PublicProfileCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String uid, String name, int age, Gender gender, List<ProfilePromptAnswer> profilePrompts, List<ProfilePhoto> profilePhotos, String? city, int? height, String? occupation, String? company, EducationLevel? education, Religion? religion, List<Language> languages, RelationshipGoal? relationshipGoal, DrinkingHabit? drinking, SmokingHabit? smoking, WorkoutFrequency? workout, DietaryPreference? diet, ChildrenStatus? children, ActivityPreferences activityPreferences
});


@override $ActivityPreferencesCopyWith<$Res> get activityPreferences;

}
/// @nodoc
class __$PublicProfileCopyWithImpl<$Res>
    implements _$PublicProfileCopyWith<$Res> {
  __$PublicProfileCopyWithImpl(this._self, this._then);

  final _PublicProfile _self;
  final $Res Function(_PublicProfile) _then;

/// Create a copy of PublicProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uid = null,Object? name = null,Object? age = null,Object? gender = null,Object? profilePrompts = null,Object? profilePhotos = null,Object? city = freezed,Object? height = freezed,Object? occupation = freezed,Object? company = freezed,Object? education = freezed,Object? religion = freezed,Object? languages = null,Object? relationshipGoal = freezed,Object? drinking = freezed,Object? smoking = freezed,Object? workout = freezed,Object? diet = freezed,Object? children = freezed,Object? activityPreferences = null,}) {
  return _then(_PublicProfile(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,age: null == age ? _self.age : age // ignore: cast_nullable_to_non_nullable
as int,gender: null == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender,profilePrompts: null == profilePrompts ? _self._profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,profilePhotos: null == profilePhotos ? _self._profilePhotos : profilePhotos // ignore: cast_nullable_to_non_nullable
as List<ProfilePhoto>,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
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
as ActivityPreferences,
  ));
}

/// Create a copy of PublicProfile
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
