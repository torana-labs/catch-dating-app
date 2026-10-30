// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organizer_draft.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OrganizerDraft {

 DateTime get savedAt; String? get name; String? get area; String? get description; String? get location; String? get instagramHandle; String? get phoneNumber; String? get email; OrganizerType get organizerType; OrganizerHostDefaults get hostDefaults;
/// Create a copy of OrganizerDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizerDraftCopyWith<OrganizerDraft> get copyWith => _$OrganizerDraftCopyWithImpl<OrganizerDraft>(this as OrganizerDraft, _$identity);

  /// Serializes this OrganizerDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizerDraft&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.area, area) || other.area == area)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
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
abstract mixin class $OrganizerDraftCopyWith<$Res>  {
  factory $OrganizerDraftCopyWith(OrganizerDraft value, $Res Function(OrganizerDraft) _then) = _$OrganizerDraftCopyWithImpl;
@useResult
$Res call({
 DateTime savedAt, String? name, String? area, String? description, String? location, String? instagramHandle, String? phoneNumber, String? email, OrganizerType organizerType, OrganizerHostDefaults hostDefaults
});


$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class _$OrganizerDraftCopyWithImpl<$Res>
    implements $OrganizerDraftCopyWith<$Res> {
  _$OrganizerDraftCopyWithImpl(this._self, this._then);

  final OrganizerDraft _self;
  final $Res Function(OrganizerDraft) _then;

/// Create a copy of OrganizerDraft
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
as OrganizerHostDefaults,
  ));
}
/// Create a copy of OrganizerDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $OrganizerHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// Adds pattern-matching-related methods to [OrganizerDraft].
extension OrganizerDraftPatterns on OrganizerDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizerDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizerDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizerDraft value)  $default,){
final _that = this;
switch (_that) {
case _OrganizerDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizerDraft value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizerDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  OrganizerHostDefaults hostDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizerDraft() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  OrganizerHostDefaults hostDefaults)  $default,) {final _that = this;
switch (_that) {
case _OrganizerDraft():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DateTime savedAt,  String? name,  String? area,  String? description,  String? location,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerType organizerType,  OrganizerHostDefaults hostDefaults)?  $default,) {final _that = this;
switch (_that) {
case _OrganizerDraft() when $default != null:
return $default(_that.savedAt,_that.name,_that.area,_that.description,_that.location,_that.instagramHandle,_that.phoneNumber,_that.email,_that.organizerType,_that.hostDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizerDraft implements OrganizerDraft {
  const _OrganizerDraft({required this.savedAt, this.name, this.area, this.description, this.location, this.instagramHandle, this.phoneNumber, this.email, this.organizerType = OrganizerType.club, this.hostDefaults = const OrganizerHostDefaults()});
  factory _OrganizerDraft.fromJson(Map<String, dynamic> json) => _$OrganizerDraftFromJson(json);

@override final  DateTime savedAt;
@override final  String? name;
@override final  String? area;
@override final  String? description;
@override final  String? location;
@override final  String? instagramHandle;
@override final  String? phoneNumber;
@override final  String? email;
@override@JsonKey() final  OrganizerType organizerType;
@override@JsonKey() final  OrganizerHostDefaults hostDefaults;

/// Create a copy of OrganizerDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizerDraftCopyWith<_OrganizerDraft> get copyWith => __$OrganizerDraftCopyWithImpl<_OrganizerDraft>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizerDraftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizerDraft&&(identical(other.savedAt, savedAt) || other.savedAt == savedAt)&&(identical(other.name, name) || other.name == name)&&(identical(other.area, area) || other.area == area)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
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
abstract mixin class _$OrganizerDraftCopyWith<$Res> implements $OrganizerDraftCopyWith<$Res> {
  factory _$OrganizerDraftCopyWith(_OrganizerDraft value, $Res Function(_OrganizerDraft) _then) = __$OrganizerDraftCopyWithImpl;
@override @useResult
$Res call({
 DateTime savedAt, String? name, String? area, String? description, String? location, String? instagramHandle, String? phoneNumber, String? email, OrganizerType organizerType, OrganizerHostDefaults hostDefaults
});


@override $OrganizerHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class __$OrganizerDraftCopyWithImpl<$Res>
    implements _$OrganizerDraftCopyWith<$Res> {
  __$OrganizerDraftCopyWithImpl(this._self, this._then);

  final _OrganizerDraft _self;
  final $Res Function(_OrganizerDraft) _then;

/// Create a copy of OrganizerDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? savedAt = null,Object? name = freezed,Object? area = freezed,Object? description = freezed,Object? location = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? organizerType = null,Object? hostDefaults = null,}) {
  return _then(_OrganizerDraft(
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
as OrganizerHostDefaults,
  ));
}

/// Create a copy of OrganizerDraft
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $OrganizerHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}

// dart format on
