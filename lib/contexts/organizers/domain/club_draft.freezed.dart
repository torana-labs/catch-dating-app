// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'club_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ClubDraft {

 DateTime get savedAt; String? get name; String? get area; String? get description; String? get location; String? get instagramHandle; String? get phoneNumber; String? get email; OrganizerType get organizerType; ClubHostDefaults get hostDefaults;
/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClubDraftCopyWith<ClubDraft> get copyWith => _$ClubDraftCopyWithImpl<ClubDraft>(this as ClubDraft, _$identity);

  /// Serializes this ClubDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClubDraft&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.area, area) || other.area == area)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,savedAt,name,area,description,location,instagramHandle,phoneNumber,email,organizerType,hostDefaults);

@override
String toString() {
  return 'ClubDraft(savedAt: $savedAt, name: $name, area: $area, description: $description, location: $location, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, organizerType: $organizerType, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class $ClubDraftCopyWith<$Res>  {
  factory $ClubDraftCopyWith(ClubDraft value, $Res Function(ClubDraft) _then) = _$ClubDraftCopyWithImpl;
@useResult
$Res call({
 DateTime savedAt, String? name, String? area, String? description, String? location, String? instagramHandle, String? phoneNumber, String? email, OrganizerType organizerType, ClubHostDefaults hostDefaults
});


$ClubHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class _$ClubDraftCopyWithImpl<$Res>
    implements $ClubDraftCopyWith<$Res> {
  _$ClubDraftCopyWithImpl(this._self, this._then);

  final ClubDraft _self;
  final $Res Function(ClubDraft) _then;

/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? savedAt = null,Object? name = freezed,Object? area = freezed,Object? description = freezed,Object? location = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? organizerType = null,Object? hostDefaults = null,}) {
  return _then(_self.copyWith(
savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,area: freezed == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as ClubHostDefaults,
  ));
}
/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClubHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $ClubHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// Adds pattern-matching-related methods to [ClubDraft].
extension ClubDraftPatterns on ClubDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClubDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClubDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClubDraft value)  $default,){
final _that = this;
switch (_that) {
case _ClubDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClubDraft value)?  $default,){
final _that = this;
switch (_that) {
case _ClubDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  ClubHostDefaults hostDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClubDraft() when $default != null:
return $default(_that.savedAt,_that.name,_that.area,_that.description,_that.location,_that.instagramHandle,_that.phoneNumber,_that.email,_that.organizerType,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  ClubHostDefaults hostDefaults)  $default,) {final _that = this;
switch (_that) {
case _ClubDraft():
return $default(_that.savedAt,_that.name,_that.area,_that.description,_that.location,_that.instagramHandle,_that.phoneNumber,_that.email,_that.organizerType,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  ClubHostDefaults hostDefaults)?  $default,) {final _that = this;
switch (_that) {
case _ClubDraft() when $default != null:
return $default(_that.savedAt,_that.name,_that.area,_that.description,_that.location,_that.instagramHandle,_that.phoneNumber,_that.email,_that.organizerType,_that.hostDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClubDraft implements ClubDraft {
  const _ClubDraft({required this.savedAt, this.name, this.area, this.description, this.location, this.instagramHandle, this.phoneNumber, this.email, this.organizerType = OrganizerType.club, this.hostDefaults = const ClubHostDefaults()});
  factory _ClubDraft.fromJson(Map<String, dynamic> json) => _$ClubDraftFromJson(json);

@override final  DateTime savedAt;
@override final  String? name;
@override final  String? area;
@override final  String? description;
@override final  String? location;
@override final  String? instagramHandle;
@override final  String? phoneNumber;
@override final  String? email;
@override@JsonKey() final  OrganizerType organizerType;
@override@JsonKey() final  ClubHostDefaults hostDefaults;

/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClubDraftCopyWith<_ClubDraft> get copyWith => __$ClubDraftCopyWithImpl<_ClubDraft>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClubDraftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClubDraft&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.area, area) || other.area == area)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,savedAt,name,area,description,location,instagramHandle,phoneNumber,email,organizerType,hostDefaults);

@override
String toString() {
  return 'ClubDraft(savedAt: $savedAt, name: $name, area: $area, description: $description, location: $location, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, organizerType: $organizerType, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class _$ClubDraftCopyWith<$Res> implements $ClubDraftCopyWith<$Res> {
  factory _$ClubDraftCopyWith(_ClubDraft value, $Res Function(_ClubDraft) _then) = __$ClubDraftCopyWithImpl;
@override @useResult
$Res call({
 DateTime savedAt, String? name, String? area, String? description, String? location, String? instagramHandle, String? phoneNumber, String? email, OrganizerType organizerType, ClubHostDefaults hostDefaults
});


@override $ClubHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class __$ClubDraftCopyWithImpl<$Res>
    implements _$ClubDraftCopyWith<$Res> {
  __$ClubDraftCopyWithImpl(this._self, this._then);

  final _ClubDraft _self;
  final $Res Function(_ClubDraft) _then;

/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? savedAt = null,Object? name = freezed,Object? area = freezed,Object? description = freezed,Object? location = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? organizerType = null,Object? hostDefaults = null,}) {
  return _then(_ClubDraft(
savedAt: null == savedAt ? _self.savedAt : savedAt // ignore: cast_nullable_to_non_nullable
as DateTime,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,area: freezed == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,location: freezed == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as ClubHostDefaults,
  ));
}

/// Create a copy of ClubDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClubHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $ClubHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}

// dart format on
