// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'onboarding_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OnboardingDraft {

 int get step; int get draftVersion; String get firstName; String get lastName;@NullableTimestampConverter() DateTime? get dateOfBirth; String get phoneNumber; String get countryCode; Gender? get gender; List<Gender> get interestedInGenders; String? get instagramHandle; List<ProfilePromptAnswer> get profilePrompts;
/// Create a copy of OnboardingDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingDraftCopyWith<OnboardingDraft> get copyWith => _$OnboardingDraftCopyWithImpl<OnboardingDraft>(this as OnboardingDraft, _$identity);

  /// Serializes this OnboardingDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingDraft&&(identical(other.step, step) || other.step == step)&&(identical(other.draftVersion, draftVersion) || other.draftVersion == draftVersion)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.dateOfBirth, dateOfBirth) || other.dateOfBirth == dateOfBirth)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.gender, gender) || other.gender == gender)&&const DeepCollectionEquality().equals(other.interestedInGenders, interestedInGenders)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&const DeepCollectionEquality().equals(other.profilePrompts, profilePrompts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,step,draftVersion,firstName,lastName,dateOfBirth,phoneNumber,countryCode,gender,const DeepCollectionEquality().hash(interestedInGenders),instagramHandle,const DeepCollectionEquality().hash(profilePrompts));

@override
String toString() {
  return 'OnboardingDraft(step: $step, draftVersion: $draftVersion, firstName: $firstName, lastName: $lastName, dateOfBirth: $dateOfBirth, phoneNumber: $phoneNumber, countryCode: $countryCode, gender: $gender, interestedInGenders: $interestedInGenders, instagramHandle: $instagramHandle, profilePrompts: $profilePrompts)';
}


}

/// @nodoc
abstract mixin class $OnboardingDraftCopyWith<$Res>  {
  factory $OnboardingDraftCopyWith(OnboardingDraft value, $Res Function(OnboardingDraft) _then) = _$OnboardingDraftCopyWithImpl;
@useResult
$Res call({
 int step, int draftVersion, String firstName, String lastName,@NullableTimestampConverter() DateTime? dateOfBirth, String phoneNumber, String countryCode, Gender? gender, List<Gender> interestedInGenders, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts
});




}
/// @nodoc
class _$OnboardingDraftCopyWithImpl<$Res>
    implements $OnboardingDraftCopyWith<$Res> {
  _$OnboardingDraftCopyWithImpl(this._self, this._then);

  final OnboardingDraft _self;
  final $Res Function(OnboardingDraft) _then;

/// Create a copy of OnboardingDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? step = null,Object? draftVersion = null,Object? firstName = null,Object? lastName = null,Object? dateOfBirth = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? gender = freezed,Object? interestedInGenders = null,Object? instagramHandle = freezed,Object? profilePrompts = null,}) {
  return _then(_self.copyWith(
step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as int,draftVersion: null == draftVersion ? _self.draftVersion : draftVersion // ignore: cast_nullable_to_non_nullable
as int,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,dateOfBirth: freezed == dateOfBirth ? _self.dateOfBirth : dateOfBirth // ignore: cast_nullable_to_non_nullable
as DateTime?,phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,gender: freezed == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender?,interestedInGenders: null == interestedInGenders ? _self.interestedInGenders : interestedInGenders // ignore: cast_nullable_to_non_nullable
as List<Gender>,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,profilePrompts: null == profilePrompts ? _self.profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingDraft].
extension OnboardingDraftPatterns on OnboardingDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingDraft value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingDraft value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int step,  int draftVersion,  String firstName,  String lastName, @NullableTimestampConverter()  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingDraft() when $default != null:
return $default(_that.step,_that.draftVersion,_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int step,  int draftVersion,  String firstName,  String lastName, @NullableTimestampConverter()  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)  $default,) {final _that = this;
switch (_that) {
case _OnboardingDraft():
return $default(_that.step,_that.draftVersion,_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int step,  int draftVersion,  String firstName,  String lastName, @NullableTimestampConverter()  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingDraft() when $default != null:
return $default(_that.step,_that.draftVersion,_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingDraft extends OnboardingDraft {
  const _OnboardingDraft({required this.step, this.draftVersion = 0, this.firstName = '', this.lastName = '', @NullableTimestampConverter() this.dateOfBirth, this.phoneNumber = '', this.countryCode = defaultCountryDialCode, this.gender, final  List<Gender> interestedInGenders = const [], this.instagramHandle, final  List<ProfilePromptAnswer> profilePrompts = const []}): _interestedInGenders = interestedInGenders,_profilePrompts = profilePrompts,super._();
  factory _OnboardingDraft.fromJson(Map<String, dynamic> json) => _$OnboardingDraftFromJson(json);

@override final  int step;
@override@JsonKey() final  int draftVersion;
@override@JsonKey() final  String firstName;
@override@JsonKey() final  String lastName;
@override@NullableTimestampConverter() final  DateTime? dateOfBirth;
@override@JsonKey() final  String phoneNumber;
@override@JsonKey() final  String countryCode;
@override final  Gender? gender;
 final  List<Gender> _interestedInGenders;
@override@JsonKey() List<Gender> get interestedInGenders {
  if (_interestedInGenders is EqualUnmodifiableListView) return _interestedInGenders;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_interestedInGenders);
}

@override final  String? instagramHandle;
 final  List<ProfilePromptAnswer> _profilePrompts;
@override@JsonKey() List<ProfilePromptAnswer> get profilePrompts {
  if (_profilePrompts is EqualUnmodifiableListView) return _profilePrompts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_profilePrompts);
}


/// Create a copy of OnboardingDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingDraftCopyWith<_OnboardingDraft> get copyWith => __$OnboardingDraftCopyWithImpl<_OnboardingDraft>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingDraftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingDraft&&(identical(other.step, step) || other.step == step)&&(identical(other.draftVersion, draftVersion) || other.draftVersion == draftVersion)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.dateOfBirth, dateOfBirth) || other.dateOfBirth == dateOfBirth)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.gender, gender) || other.gender == gender)&&const DeepCollectionEquality().equals(other._interestedInGenders, _interestedInGenders)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&const DeepCollectionEquality().equals(other._profilePrompts, _profilePrompts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,step,draftVersion,firstName,lastName,dateOfBirth,phoneNumber,countryCode,gender,const DeepCollectionEquality().hash(_interestedInGenders),instagramHandle,const DeepCollectionEquality().hash(_profilePrompts));

@override
String toString() {
  return 'OnboardingDraft(step: $step, draftVersion: $draftVersion, firstName: $firstName, lastName: $lastName, dateOfBirth: $dateOfBirth, phoneNumber: $phoneNumber, countryCode: $countryCode, gender: $gender, interestedInGenders: $interestedInGenders, instagramHandle: $instagramHandle, profilePrompts: $profilePrompts)';
}


}

/// @nodoc
abstract mixin class _$OnboardingDraftCopyWith<$Res> implements $OnboardingDraftCopyWith<$Res> {
  factory _$OnboardingDraftCopyWith(_OnboardingDraft value, $Res Function(_OnboardingDraft) _then) = __$OnboardingDraftCopyWithImpl;
@override @useResult
$Res call({
 int step, int draftVersion, String firstName, String lastName,@NullableTimestampConverter() DateTime? dateOfBirth, String phoneNumber, String countryCode, Gender? gender, List<Gender> interestedInGenders, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts
});




}
/// @nodoc
class __$OnboardingDraftCopyWithImpl<$Res>
    implements _$OnboardingDraftCopyWith<$Res> {
  __$OnboardingDraftCopyWithImpl(this._self, this._then);

  final _OnboardingDraft _self;
  final $Res Function(_OnboardingDraft) _then;

/// Create a copy of OnboardingDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? step = null,Object? draftVersion = null,Object? firstName = null,Object? lastName = null,Object? dateOfBirth = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? gender = freezed,Object? interestedInGenders = null,Object? instagramHandle = freezed,Object? profilePrompts = null,}) {
  return _then(_OnboardingDraft(
step: null == step ? _self.step : step // ignore: cast_nullable_to_non_nullable
as int,draftVersion: null == draftVersion ? _self.draftVersion : draftVersion // ignore: cast_nullable_to_non_nullable
as int,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,dateOfBirth: freezed == dateOfBirth ? _self.dateOfBirth : dateOfBirth // ignore: cast_nullable_to_non_nullable
as DateTime?,phoneNumber: null == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,gender: freezed == gender ? _self.gender : gender // ignore: cast_nullable_to_non_nullable
as Gender?,interestedInGenders: null == interestedInGenders ? _self._interestedInGenders : interestedInGenders // ignore: cast_nullable_to_non_nullable
as List<Gender>,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,profilePrompts: null == profilePrompts ? _self._profilePrompts : profilePrompts // ignore: cast_nullable_to_non_nullable
as List<ProfilePromptAnswer>,
  ));
}


}

// dart format on
