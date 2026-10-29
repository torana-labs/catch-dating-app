// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'profile_photo.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ProfilePhoto {

 String get id; String get url; String get thumbnailUrl; String get storagePath; String get thumbnailStoragePath; int get position;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt; PhotoPromptAnswer? get prompt; ProfilePhotoModeration? get moderation;
/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ProfilePhotoCopyWith<ProfilePhoto> get copyWith => _$ProfilePhotoCopyWithImpl<ProfilePhoto>(this as ProfilePhoto, _$identity);

  /// Serializes this ProfilePhoto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ProfilePhoto&&(identical(other.id, id) || other.id == id)&&(identical(other.url, url) || other.url == url)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.storagePath, storagePath) || other.storagePath == storagePath)&&(identical(other.thumbnailStoragePath, thumbnailStoragePath) || other.thumbnailStoragePath == thumbnailStoragePath)&&(identical(other.position, position) || other.position == position)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.moderation, moderation) || other.moderation == moderation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,url,thumbnailUrl,storagePath,thumbnailStoragePath,position,createdAt,updatedAt,prompt,moderation);

@override
String toString() {
  return 'ProfilePhoto(id: $id, url: $url, thumbnailUrl: $thumbnailUrl, storagePath: $storagePath, thumbnailStoragePath: $thumbnailStoragePath, position: $position, createdAt: $createdAt, updatedAt: $updatedAt, prompt: $prompt, moderation: $moderation)';
}


}

/// @nodoc
abstract mixin class $ProfilePhotoCopyWith<$Res>  {
  factory $ProfilePhotoCopyWith(ProfilePhoto value, $Res Function(ProfilePhoto) _then) = _$ProfilePhotoCopyWithImpl;
@useResult
$Res call({
 String id, String url, String thumbnailUrl, String storagePath, String thumbnailStoragePath, int position,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt, PhotoPromptAnswer? prompt, ProfilePhotoModeration? moderation
});


$PhotoPromptAnswerCopyWith<$Res>? get prompt;$ProfilePhotoModerationCopyWith<$Res>? get moderation;

}
/// @nodoc
class _$ProfilePhotoCopyWithImpl<$Res>
    implements $ProfilePhotoCopyWith<$Res> {
  _$ProfilePhotoCopyWithImpl(this._self, this._then);

  final ProfilePhoto _self;
  final $Res Function(ProfilePhoto) _then;

/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? url = null,Object? thumbnailUrl = null,Object? storagePath = null,Object? thumbnailStoragePath = null,Object? position = null,Object? createdAt = null,Object? updatedAt = null,Object? prompt = freezed,Object? moderation = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: null == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String,storagePath: null == storagePath ? _self.storagePath : storagePath // ignore: cast_nullable_to_non_nullable
as String,thumbnailStoragePath: null == thumbnailStoragePath ? _self.thumbnailStoragePath : thumbnailStoragePath // ignore: cast_nullable_to_non_nullable
as String,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,prompt: freezed == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as PhotoPromptAnswer?,moderation: freezed == moderation ? _self.moderation : moderation // ignore: cast_nullable_to_non_nullable
as ProfilePhotoModeration?,
  ));
}
/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PhotoPromptAnswerCopyWith<$Res>? get prompt {
    if (_self.prompt == null) {
    return null;
  }

  return $PhotoPromptAnswerCopyWith<$Res>(_self.prompt!, (value) {
    return _then(_self.copyWith(prompt: value));
  });
}/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ProfilePhotoModerationCopyWith<$Res>? get moderation {
    if (_self.moderation == null) {
    return null;
  }

  return $ProfilePhotoModerationCopyWith<$Res>(_self.moderation!, (value) {
    return _then(_self.copyWith(moderation: value));
  });
}
}


/// Adds pattern-matching-related methods to [ProfilePhoto].
extension ProfilePhotoPatterns on ProfilePhoto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ProfilePhoto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ProfilePhoto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ProfilePhoto value)  $default,){
final _that = this;
switch (_that) {
case _ProfilePhoto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ProfilePhoto value)?  $default,){
final _that = this;
switch (_that) {
case _ProfilePhoto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String url,  String thumbnailUrl,  String storagePath,  String thumbnailStoragePath,  int position, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt,  PhotoPromptAnswer? prompt,  ProfilePhotoModeration? moderation)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ProfilePhoto() when $default != null:
return $default(_that.id,_that.url,_that.thumbnailUrl,_that.storagePath,_that.thumbnailStoragePath,_that.position,_that.createdAt,_that.updatedAt,_that.prompt,_that.moderation);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String url,  String thumbnailUrl,  String storagePath,  String thumbnailStoragePath,  int position, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt,  PhotoPromptAnswer? prompt,  ProfilePhotoModeration? moderation)  $default,) {final _that = this;
switch (_that) {
case _ProfilePhoto():
return $default(_that.id,_that.url,_that.thumbnailUrl,_that.storagePath,_that.thumbnailStoragePath,_that.position,_that.createdAt,_that.updatedAt,_that.prompt,_that.moderation);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String url,  String thumbnailUrl,  String storagePath,  String thumbnailStoragePath,  int position, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt,  PhotoPromptAnswer? prompt,  ProfilePhotoModeration? moderation)?  $default,) {final _that = this;
switch (_that) {
case _ProfilePhoto() when $default != null:
return $default(_that.id,_that.url,_that.thumbnailUrl,_that.storagePath,_that.thumbnailStoragePath,_that.position,_that.createdAt,_that.updatedAt,_that.prompt,_that.moderation);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ProfilePhoto extends ProfilePhoto {
  const _ProfilePhoto({required this.id, required this.url, required this.thumbnailUrl, required this.storagePath, required this.thumbnailStoragePath, required this.position, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt, this.prompt, this.moderation}): super._();
  factory _ProfilePhoto.fromJson(Map<String, dynamic> json) => _$ProfilePhotoFromJson(json);

@override final  String id;
@override final  String url;
@override final  String thumbnailUrl;
@override final  String storagePath;
@override final  String thumbnailStoragePath;
@override final  int position;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;
@override final  PhotoPromptAnswer? prompt;
@override final  ProfilePhotoModeration? moderation;

/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ProfilePhotoCopyWith<_ProfilePhoto> get copyWith => __$ProfilePhotoCopyWithImpl<_ProfilePhoto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ProfilePhotoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ProfilePhoto&&(identical(other.id, id) || other.id == id)&&(identical(other.url, url) || other.url == url)&&(identical(other.thumbnailUrl, thumbnailUrl) || other.thumbnailUrl == thumbnailUrl)&&(identical(other.storagePath, storagePath) || other.storagePath == storagePath)&&(identical(other.thumbnailStoragePath, thumbnailStoragePath) || other.thumbnailStoragePath == thumbnailStoragePath)&&(identical(other.position, position) || other.position == position)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.prompt, prompt) || other.prompt == prompt)&&(identical(other.moderation, moderation) || other.moderation == moderation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,url,thumbnailUrl,storagePath,thumbnailStoragePath,position,createdAt,updatedAt,prompt,moderation);

@override
String toString() {
  return 'ProfilePhoto(id: $id, url: $url, thumbnailUrl: $thumbnailUrl, storagePath: $storagePath, thumbnailStoragePath: $thumbnailStoragePath, position: $position, createdAt: $createdAt, updatedAt: $updatedAt, prompt: $prompt, moderation: $moderation)';
}


}

/// @nodoc
abstract mixin class _$ProfilePhotoCopyWith<$Res> implements $ProfilePhotoCopyWith<$Res> {
  factory _$ProfilePhotoCopyWith(_ProfilePhoto value, $Res Function(_ProfilePhoto) _then) = __$ProfilePhotoCopyWithImpl;
@override @useResult
$Res call({
 String id, String url, String thumbnailUrl, String storagePath, String thumbnailStoragePath, int position,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt, PhotoPromptAnswer? prompt, ProfilePhotoModeration? moderation
});


@override $PhotoPromptAnswerCopyWith<$Res>? get prompt;@override $ProfilePhotoModerationCopyWith<$Res>? get moderation;

}
/// @nodoc
class __$ProfilePhotoCopyWithImpl<$Res>
    implements _$ProfilePhotoCopyWith<$Res> {
  __$ProfilePhotoCopyWithImpl(this._self, this._then);

  final _ProfilePhoto _self;
  final $Res Function(_ProfilePhoto) _then;

/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? url = null,Object? thumbnailUrl = null,Object? storagePath = null,Object? thumbnailStoragePath = null,Object? position = null,Object? createdAt = null,Object? updatedAt = null,Object? prompt = freezed,Object? moderation = freezed,}) {
  return _then(_ProfilePhoto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,thumbnailUrl: null == thumbnailUrl ? _self.thumbnailUrl : thumbnailUrl // ignore: cast_nullable_to_non_nullable
as String,storagePath: null == storagePath ? _self.storagePath : storagePath // ignore: cast_nullable_to_non_nullable
as String,thumbnailStoragePath: null == thumbnailStoragePath ? _self.thumbnailStoragePath : thumbnailStoragePath // ignore: cast_nullable_to_non_nullable
as String,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,prompt: freezed == prompt ? _self.prompt : prompt // ignore: cast_nullable_to_non_nullable
as PhotoPromptAnswer?,moderation: freezed == moderation ? _self.moderation : moderation // ignore: cast_nullable_to_non_nullable
as ProfilePhotoModeration?,
  ));
}

/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PhotoPromptAnswerCopyWith<$Res>? get prompt {
    if (_self.prompt == null) {
    return null;
  }

  return $PhotoPromptAnswerCopyWith<$Res>(_self.prompt!, (value) {
    return _then(_self.copyWith(prompt: value));
  });
}/// Create a copy of ProfilePhoto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ProfilePhotoModerationCopyWith<$Res>? get moderation {
    if (_self.moderation == null) {
    return null;
  }

  return $ProfilePhotoModerationCopyWith<$Res>(_self.moderation!, (value) {
    return _then(_self.copyWith(moderation: value));
  });
}
}


/// @nodoc
mixin _$ProfilePhotoModeration {

 String get status; String? get reason;@NullableTimestampConverter() DateTime? get reviewedAt;
/// Create a copy of ProfilePhotoModeration
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ProfilePhotoModerationCopyWith<ProfilePhotoModeration> get copyWith => _$ProfilePhotoModerationCopyWithImpl<ProfilePhotoModeration>(this as ProfilePhotoModeration, _$identity);

  /// Serializes this ProfilePhotoModeration to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ProfilePhotoModeration&&(identical(other.status, status) || other.status == status)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,reason,reviewedAt);

@override
String toString() {
  return 'ProfilePhotoModeration(status: $status, reason: $reason, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class $ProfilePhotoModerationCopyWith<$Res>  {
  factory $ProfilePhotoModerationCopyWith(ProfilePhotoModeration value, $Res Function(ProfilePhotoModeration) _then) = _$ProfilePhotoModerationCopyWithImpl;
@useResult
$Res call({
 String status, String? reason,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class _$ProfilePhotoModerationCopyWithImpl<$Res>
    implements $ProfilePhotoModerationCopyWith<$Res> {
  _$ProfilePhotoModerationCopyWithImpl(this._self, this._then);

  final ProfilePhotoModeration _self;
  final $Res Function(ProfilePhotoModeration) _then;

/// Create a copy of ProfilePhotoModeration
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? reason = freezed,Object? reviewedAt = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [ProfilePhotoModeration].
extension ProfilePhotoModerationPatterns on ProfilePhotoModeration {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ProfilePhotoModeration value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ProfilePhotoModeration() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ProfilePhotoModeration value)  $default,){
final _that = this;
switch (_that) {
case _ProfilePhotoModeration():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ProfilePhotoModeration value)?  $default,){
final _that = this;
switch (_that) {
case _ProfilePhotoModeration() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String status,  String? reason, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ProfilePhotoModeration() when $default != null:
return $default(_that.status,_that.reason,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String status,  String? reason, @NullableTimestampConverter()  DateTime? reviewedAt)  $default,) {final _that = this;
switch (_that) {
case _ProfilePhotoModeration():
return $default(_that.status,_that.reason,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String status,  String? reason, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,) {final _that = this;
switch (_that) {
case _ProfilePhotoModeration() when $default != null:
return $default(_that.status,_that.reason,_that.reviewedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ProfilePhotoModeration extends ProfilePhotoModeration {
  const _ProfilePhotoModeration({required this.status, this.reason, @NullableTimestampConverter() this.reviewedAt}): super._();
  factory _ProfilePhotoModeration.fromJson(Map<String, dynamic> json) => _$ProfilePhotoModerationFromJson(json);

@override final  String status;
@override final  String? reason;
@override@NullableTimestampConverter() final  DateTime? reviewedAt;

/// Create a copy of ProfilePhotoModeration
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ProfilePhotoModerationCopyWith<_ProfilePhotoModeration> get copyWith => __$ProfilePhotoModerationCopyWithImpl<_ProfilePhotoModeration>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ProfilePhotoModerationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ProfilePhotoModeration&&(identical(other.status, status) || other.status == status)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,reason,reviewedAt);

@override
String toString() {
  return 'ProfilePhotoModeration(status: $status, reason: $reason, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class _$ProfilePhotoModerationCopyWith<$Res> implements $ProfilePhotoModerationCopyWith<$Res> {
  factory _$ProfilePhotoModerationCopyWith(_ProfilePhotoModeration value, $Res Function(_ProfilePhotoModeration) _then) = __$ProfilePhotoModerationCopyWithImpl;
@override @useResult
$Res call({
 String status, String? reason,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class __$ProfilePhotoModerationCopyWithImpl<$Res>
    implements _$ProfilePhotoModerationCopyWith<$Res> {
  __$ProfilePhotoModerationCopyWithImpl(this._self, this._then);

  final _ProfilePhotoModeration _self;
  final $Res Function(_ProfilePhotoModeration) _then;

/// Create a copy of ProfilePhotoModeration
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? reason = freezed,Object? reviewedAt = freezed,}) {
  return _then(_ProfilePhotoModeration(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
