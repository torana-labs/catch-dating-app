// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'onboarding_profile_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$OnboardingProfileDraft {

 String get firstName; String get lastName; DateTime? get dateOfBirth; String get phoneNumber; String get countryCode; Gender? get gender; List<Gender> get interestedInGenders; String? get instagramHandle; List<ProfilePromptAnswer> get profilePrompts;
/// Create a copy of OnboardingProfileDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingProfileDraftCopyWith<OnboardingProfileDraft> get copyWith => _$OnboardingProfileDraftCopyWithImpl<OnboardingProfileDraft>(this as OnboardingProfileDraft, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as OnboardingProfileDraft;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingProfileDraft&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.dateOfBirth, _this.dateOfBirth) || other.dateOfBirth == _this.dateOfBirth)&&(identical(other.phoneNumber, _this.phoneNumber) || other.phoneNumber == _this.phoneNumber)&&(identical(other.countryCode, _this.countryCode) || other.countryCode == _this.countryCode)&&(identical(other.gender, _this.gender) || other.gender == _this.gender)&&const DeepCollectionEquality().equals(other.interestedInGenders, _this.interestedInGenders)&&(identical(other.instagramHandle, _this.instagramHandle) || other.instagramHandle == _this.instagramHandle)&&const DeepCollectionEquality().equals(other.profilePrompts, _this.profilePrompts));
}


@override
int get hashCode {
  final _this = this as OnboardingProfileDraft;
  return Object.hash(runtimeType,_this.firstName,_this.lastName,_this.dateOfBirth,_this.phoneNumber,_this.countryCode,_this.gender,const DeepCollectionEquality().hash(_this.interestedInGenders),_this.instagramHandle,const DeepCollectionEquality().hash(_this.profilePrompts));
}

@override
String toString() {
  final _this = this as OnboardingProfileDraft;
  return 'OnboardingProfileDraft(firstName: ${_this.firstName}, lastName: ${_this.lastName}, dateOfBirth: ${_this.dateOfBirth}, phoneNumber: ${_this.phoneNumber}, countryCode: ${_this.countryCode}, gender: ${_this.gender}, interestedInGenders: ${_this.interestedInGenders}, instagramHandle: ${_this.instagramHandle}, profilePrompts: ${_this.profilePrompts})';
}


}

/// @nodoc
abstract mixin class $OnboardingProfileDraftCopyWith<$Res>  {
  factory $OnboardingProfileDraftCopyWith(OnboardingProfileDraft value, $Res Function(OnboardingProfileDraft) _then) = _$OnboardingProfileDraftCopyWithImpl;
@useResult
$Res call({
 String firstName, String lastName, DateTime? dateOfBirth, String phoneNumber, String countryCode, Gender? gender, List<Gender> interestedInGenders, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts
});




}
/// @nodoc
class _$OnboardingProfileDraftCopyWithImpl<$Res>
    implements $OnboardingProfileDraftCopyWith<$Res> {
  _$OnboardingProfileDraftCopyWithImpl(this._self, this._then);

  final OnboardingProfileDraft _self;
  final $Res Function(OnboardingProfileDraft) _then;

/// Create a copy of OnboardingProfileDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? firstName = null,Object? lastName = null,Object? dateOfBirth = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? gender = freezed,Object? interestedInGenders = null,Object? instagramHandle = freezed,Object? profilePrompts = null,}) {
  return _then(OnboardingProfileDraft(
firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
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


/// Adds pattern-matching-related methods to [OnboardingProfileDraft].
extension OnboardingProfileDraftPatterns on OnboardingProfileDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingProfileDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingProfileDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingProfileDraft value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingProfileDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingProfileDraft value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingProfileDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String firstName,  String lastName,  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingProfileDraft() when $default != null:
return $default(_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String firstName,  String lastName,  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)  $default,) {final _that = this;
switch (_that) {
case _OnboardingProfileDraft():
return $default(_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String firstName,  String lastName,  DateTime? dateOfBirth,  String phoneNumber,  String countryCode,  Gender? gender,  List<Gender> interestedInGenders,  String? instagramHandle,  List<ProfilePromptAnswer> profilePrompts)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingProfileDraft() when $default != null:
return $default(_that.firstName,_that.lastName,_that.dateOfBirth,_that.phoneNumber,_that.countryCode,_that.gender,_that.interestedInGenders,_that.instagramHandle,_that.profilePrompts);case _:
  return null;

}
}

}

/// @nodoc


class _OnboardingProfileDraft extends OnboardingProfileDraft {
  const _OnboardingProfileDraft({this.firstName = '', this.lastName = '', this.dateOfBirth, this.phoneNumber = '', this.countryCode = defaultCountryDialCode, this.gender,  List<Gender> interestedInGenders = const [], this.instagramHandle,  List<ProfilePromptAnswer> profilePrompts = const []}): _interestedInGenders = interestedInGenders,_profilePrompts = profilePrompts,super._();
  

@override@JsonKey() final  String firstName;
@override@JsonKey() final  String lastName;
@override final  DateTime? dateOfBirth;
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


/// Create a copy of OnboardingProfileDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingProfileDraftCopyWith<_OnboardingProfileDraft> get copyWith => __$OnboardingProfileDraftCopyWithImpl<_OnboardingProfileDraft>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingProfileDraft&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.dateOfBirth, dateOfBirth) || other.dateOfBirth == dateOfBirth)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.gender, gender) || other.gender == gender)&&const DeepCollectionEquality().equals(other.interestedInGenders, _interestedInGenders)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&const DeepCollectionEquality().equals(other.profilePrompts, _profilePrompts));
}


@override
int get hashCode {
    return Object.hash(runtimeType,firstName,lastName,dateOfBirth,phoneNumber,countryCode,gender,const DeepCollectionEquality().hash(_interestedInGenders),instagramHandle,const DeepCollectionEquality().hash(_profilePrompts));
}

@override
String toString() {
    return 'OnboardingProfileDraft(firstName: $firstName, lastName: $lastName, dateOfBirth: $dateOfBirth, phoneNumber: $phoneNumber, countryCode: $countryCode, gender: $gender, interestedInGenders: $interestedInGenders, instagramHandle: $instagramHandle, profilePrompts: $profilePrompts)';
}


}

/// @nodoc
abstract mixin class _$OnboardingProfileDraftCopyWith<$Res> implements $OnboardingProfileDraftCopyWith<$Res> {
  factory _$OnboardingProfileDraftCopyWith(_OnboardingProfileDraft value, $Res Function(_OnboardingProfileDraft) _then) = __$OnboardingProfileDraftCopyWithImpl;
@override @useResult
$Res call({
 String firstName, String lastName, DateTime? dateOfBirth, String phoneNumber, String countryCode, Gender? gender, List<Gender> interestedInGenders, String? instagramHandle, List<ProfilePromptAnswer> profilePrompts
});




}
/// @nodoc
class __$OnboardingProfileDraftCopyWithImpl<$Res>
    implements _$OnboardingProfileDraftCopyWith<$Res> {
  __$OnboardingProfileDraftCopyWithImpl(this._self, this._then);

  final _OnboardingProfileDraft _self;
  final $Res Function(_OnboardingProfileDraft) _then;

/// Create a copy of OnboardingProfileDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? firstName = null,Object? lastName = null,Object? dateOfBirth = freezed,Object? phoneNumber = null,Object? countryCode = null,Object? gender = freezed,Object? interestedInGenders = null,Object? instagramHandle = freezed,Object? profilePrompts = null,}) {
  return _then(_OnboardingProfileDraft(
firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
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
