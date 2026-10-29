// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'review.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Review {

@JsonKey(includeToJson: false) String get id; String get organizerId; String? get eventId; String? get reviewerUserId; String get reviewerName; int get rating; String get comment; String get verificationStatus; String get source; String get moderationStatus; bool get isAnonymous; String? get submittedFromPath;@TimestampConverter() DateTime get createdAt;@NullableTimestampConverter() DateTime? get updatedAt; ReviewOwnerResponse? get ownerResponse;
/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReviewCopyWith<Review> get copyWith => _$ReviewCopyWithImpl<Review>(this as Review, _$identity);

  /// Serializes this Review to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Review&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.reviewerUserId, reviewerUserId) || other.reviewerUserId == reviewerUserId)&&(identical(other.reviewerName, reviewerName) || other.reviewerName == reviewerName)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus)&&(identical(other.source, source) || other.source == source)&&(identical(other.moderationStatus, moderationStatus) || other.moderationStatus == moderationStatus)&&(identical(other.isAnonymous, isAnonymous) || other.isAnonymous == isAnonymous)&&(identical(other.submittedFromPath, submittedFromPath) || other.submittedFromPath == submittedFromPath)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.ownerResponse, ownerResponse) || other.ownerResponse == ownerResponse));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,eventId,reviewerUserId,reviewerName,rating,comment,verificationStatus,source,moderationStatus,isAnonymous,submittedFromPath,createdAt,updatedAt,ownerResponse);

@override
String toString() {
  return 'Review(id: $id, organizerId: $organizerId, eventId: $eventId, reviewerUserId: $reviewerUserId, reviewerName: $reviewerName, rating: $rating, comment: $comment, verificationStatus: $verificationStatus, source: $source, moderationStatus: $moderationStatus, isAnonymous: $isAnonymous, submittedFromPath: $submittedFromPath, createdAt: $createdAt, updatedAt: $updatedAt, ownerResponse: $ownerResponse)';
}


}

/// @nodoc
abstract mixin class $ReviewCopyWith<$Res>  {
  factory $ReviewCopyWith(Review value, $Res Function(Review) _then) = _$ReviewCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String? eventId, String? reviewerUserId, String reviewerName, int rating, String comment, String verificationStatus, String source, String moderationStatus, bool isAnonymous, String? submittedFromPath,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? updatedAt, ReviewOwnerResponse? ownerResponse
});


$ReviewOwnerResponseCopyWith<$Res>? get ownerResponse;

}
/// @nodoc
class _$ReviewCopyWithImpl<$Res>
    implements $ReviewCopyWith<$Res> {
  _$ReviewCopyWithImpl(this._self, this._then);

  final Review _self;
  final $Res Function(Review) _then;

/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? organizerId = null,Object? eventId = freezed,Object? reviewerUserId = freezed,Object? reviewerName = null,Object? rating = null,Object? comment = null,Object? verificationStatus = null,Object? source = null,Object? moderationStatus = null,Object? isAnonymous = null,Object? submittedFromPath = freezed,Object? createdAt = null,Object? updatedAt = freezed,Object? ownerResponse = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,eventId: freezed == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String?,reviewerUserId: freezed == reviewerUserId ? _self.reviewerUserId : reviewerUserId // ignore: cast_nullable_to_non_nullable
as String?,reviewerName: null == reviewerName ? _self.reviewerName : reviewerName // ignore: cast_nullable_to_non_nullable
as String,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as int,comment: null == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,moderationStatus: null == moderationStatus ? _self.moderationStatus : moderationStatus // ignore: cast_nullable_to_non_nullable
as String,isAnonymous: null == isAnonymous ? _self.isAnonymous : isAnonymous // ignore: cast_nullable_to_non_nullable
as bool,submittedFromPath: freezed == submittedFromPath ? _self.submittedFromPath : submittedFromPath // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,ownerResponse: freezed == ownerResponse ? _self.ownerResponse : ownerResponse // ignore: cast_nullable_to_non_nullable
as ReviewOwnerResponse?,
  ));
}
/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReviewOwnerResponseCopyWith<$Res>? get ownerResponse {
    if (_self.ownerResponse == null) {
    return null;
  }

  return $ReviewOwnerResponseCopyWith<$Res>(_self.ownerResponse!, (value) {
    return _then(_self.copyWith(ownerResponse: value));
  });
}
}


/// Adds pattern-matching-related methods to [Review].
extension ReviewPatterns on Review {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Review value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Review() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Review value)  $default,){
final _that = this;
switch (_that) {
case _Review():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Review value)?  $default,){
final _that = this;
switch (_that) {
case _Review() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String? eventId,  String? reviewerUserId,  String reviewerName,  int rating,  String comment,  String verificationStatus,  String source,  String moderationStatus,  bool isAnonymous,  String? submittedFromPath, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? updatedAt,  ReviewOwnerResponse? ownerResponse)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Review() when $default != null:
return $default(_that.id,_that.organizerId,_that.eventId,_that.reviewerUserId,_that.reviewerName,_that.rating,_that.comment,_that.verificationStatus,_that.source,_that.moderationStatus,_that.isAnonymous,_that.submittedFromPath,_that.createdAt,_that.updatedAt,_that.ownerResponse);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String? eventId,  String? reviewerUserId,  String reviewerName,  int rating,  String comment,  String verificationStatus,  String source,  String moderationStatus,  bool isAnonymous,  String? submittedFromPath, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? updatedAt,  ReviewOwnerResponse? ownerResponse)  $default,) {final _that = this;
switch (_that) {
case _Review():
return $default(_that.id,_that.organizerId,_that.eventId,_that.reviewerUserId,_that.reviewerName,_that.rating,_that.comment,_that.verificationStatus,_that.source,_that.moderationStatus,_that.isAnonymous,_that.submittedFromPath,_that.createdAt,_that.updatedAt,_that.ownerResponse);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String organizerId,  String? eventId,  String? reviewerUserId,  String reviewerName,  int rating,  String comment,  String verificationStatus,  String source,  String moderationStatus,  bool isAnonymous,  String? submittedFromPath, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? updatedAt,  ReviewOwnerResponse? ownerResponse)?  $default,) {final _that = this;
switch (_that) {
case _Review() when $default != null:
return $default(_that.id,_that.organizerId,_that.eventId,_that.reviewerUserId,_that.reviewerName,_that.rating,_that.comment,_that.verificationStatus,_that.source,_that.moderationStatus,_that.isAnonymous,_that.submittedFromPath,_that.createdAt,_that.updatedAt,_that.ownerResponse);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Review implements Review {
  const _Review({@JsonKey(includeToJson: false) required this.id, required this.organizerId, this.eventId, this.reviewerUserId, required this.reviewerName, required this.rating, required this.comment, this.verificationStatus = 'verified', this.source = 'catchEvent', this.moderationStatus = 'published', this.isAnonymous = false, this.submittedFromPath, @TimestampConverter() required this.createdAt, @NullableTimestampConverter() this.updatedAt, this.ownerResponse});
  factory _Review.fromJson(Map<String, dynamic> json) => _$ReviewFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String organizerId;
@override final  String? eventId;
@override final  String? reviewerUserId;
@override final  String reviewerName;
@override final  int rating;
@override final  String comment;
@override@JsonKey() final  String verificationStatus;
@override@JsonKey() final  String source;
@override@JsonKey() final  String moderationStatus;
@override@JsonKey() final  bool isAnonymous;
@override final  String? submittedFromPath;
@override@TimestampConverter() final  DateTime createdAt;
@override@NullableTimestampConverter() final  DateTime? updatedAt;
@override final  ReviewOwnerResponse? ownerResponse;

/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReviewCopyWith<_Review> get copyWith => __$ReviewCopyWithImpl<_Review>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReviewToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Review&&(identical(other.id, id) || other.id == id)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.reviewerUserId, reviewerUserId) || other.reviewerUserId == reviewerUserId)&&(identical(other.reviewerName, reviewerName) || other.reviewerName == reviewerName)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.verificationStatus, verificationStatus) || other.verificationStatus == verificationStatus)&&(identical(other.source, source) || other.source == source)&&(identical(other.moderationStatus, moderationStatus) || other.moderationStatus == moderationStatus)&&(identical(other.isAnonymous, isAnonymous) || other.isAnonymous == isAnonymous)&&(identical(other.submittedFromPath, submittedFromPath) || other.submittedFromPath == submittedFromPath)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.ownerResponse, ownerResponse) || other.ownerResponse == ownerResponse));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizerId,eventId,reviewerUserId,reviewerName,rating,comment,verificationStatus,source,moderationStatus,isAnonymous,submittedFromPath,createdAt,updatedAt,ownerResponse);

@override
String toString() {
  return 'Review(id: $id, organizerId: $organizerId, eventId: $eventId, reviewerUserId: $reviewerUserId, reviewerName: $reviewerName, rating: $rating, comment: $comment, verificationStatus: $verificationStatus, source: $source, moderationStatus: $moderationStatus, isAnonymous: $isAnonymous, submittedFromPath: $submittedFromPath, createdAt: $createdAt, updatedAt: $updatedAt, ownerResponse: $ownerResponse)';
}


}

/// @nodoc
abstract mixin class _$ReviewCopyWith<$Res> implements $ReviewCopyWith<$Res> {
  factory _$ReviewCopyWith(_Review value, $Res Function(_Review) _then) = __$ReviewCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String organizerId, String? eventId, String? reviewerUserId, String reviewerName, int rating, String comment, String verificationStatus, String source, String moderationStatus, bool isAnonymous, String? submittedFromPath,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? updatedAt, ReviewOwnerResponse? ownerResponse
});


@override $ReviewOwnerResponseCopyWith<$Res>? get ownerResponse;

}
/// @nodoc
class __$ReviewCopyWithImpl<$Res>
    implements _$ReviewCopyWith<$Res> {
  __$ReviewCopyWithImpl(this._self, this._then);

  final _Review _self;
  final $Res Function(_Review) _then;

/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? organizerId = null,Object? eventId = freezed,Object? reviewerUserId = freezed,Object? reviewerName = null,Object? rating = null,Object? comment = null,Object? verificationStatus = null,Object? source = null,Object? moderationStatus = null,Object? isAnonymous = null,Object? submittedFromPath = freezed,Object? createdAt = null,Object? updatedAt = freezed,Object? ownerResponse = freezed,}) {
  return _then(_Review(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,eventId: freezed == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String?,reviewerUserId: freezed == reviewerUserId ? _self.reviewerUserId : reviewerUserId // ignore: cast_nullable_to_non_nullable
as String?,reviewerName: null == reviewerName ? _self.reviewerName : reviewerName // ignore: cast_nullable_to_non_nullable
as String,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as int,comment: null == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String,verificationStatus: null == verificationStatus ? _self.verificationStatus : verificationStatus // ignore: cast_nullable_to_non_nullable
as String,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String,moderationStatus: null == moderationStatus ? _self.moderationStatus : moderationStatus // ignore: cast_nullable_to_non_nullable
as String,isAnonymous: null == isAnonymous ? _self.isAnonymous : isAnonymous // ignore: cast_nullable_to_non_nullable
as bool,submittedFromPath: freezed == submittedFromPath ? _self.submittedFromPath : submittedFromPath // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,ownerResponse: freezed == ownerResponse ? _self.ownerResponse : ownerResponse // ignore: cast_nullable_to_non_nullable
as ReviewOwnerResponse?,
  ));
}

/// Create a copy of Review
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReviewOwnerResponseCopyWith<$Res>? get ownerResponse {
    if (_self.ownerResponse == null) {
    return null;
  }

  return $ReviewOwnerResponseCopyWith<$Res>(_self.ownerResponse!, (value) {
    return _then(_self.copyWith(ownerResponse: value));
  });
}
}


/// @nodoc
mixin _$ReviewOwnerResponse {

 String get hostUserId; String get hostName; String? get hostAvatarUrl; String get message;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;
/// Create a copy of ReviewOwnerResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReviewOwnerResponseCopyWith<ReviewOwnerResponse> get copyWith => _$ReviewOwnerResponseCopyWithImpl<ReviewOwnerResponse>(this as ReviewOwnerResponse, _$identity);

  /// Serializes this ReviewOwnerResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReviewOwnerResponse&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.message, message) || other.message == message)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hostUserId,hostName,hostAvatarUrl,message,createdAt,updatedAt);

@override
String toString() {
  return 'ReviewOwnerResponse(hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, message: $message, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $ReviewOwnerResponseCopyWith<$Res>  {
  factory $ReviewOwnerResponseCopyWith(ReviewOwnerResponse value, $Res Function(ReviewOwnerResponse) _then) = _$ReviewOwnerResponseCopyWithImpl;
@useResult
$Res call({
 String hostUserId, String hostName, String? hostAvatarUrl, String message,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class _$ReviewOwnerResponseCopyWithImpl<$Res>
    implements $ReviewOwnerResponseCopyWith<$Res> {
  _$ReviewOwnerResponseCopyWithImpl(this._self, this._then);

  final ReviewOwnerResponse _self;
  final $Res Function(ReviewOwnerResponse) _then;

/// Create a copy of ReviewOwnerResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? hostUserId = null,Object? hostName = null,Object? hostAvatarUrl = freezed,Object? message = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
hostUserId: null == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String,hostName: null == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String,hostAvatarUrl: freezed == hostAvatarUrl ? _self.hostAvatarUrl : hostAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [ReviewOwnerResponse].
extension ReviewOwnerResponsePatterns on ReviewOwnerResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReviewOwnerResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReviewOwnerResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReviewOwnerResponse value)  $default,){
final _that = this;
switch (_that) {
case _ReviewOwnerResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReviewOwnerResponse value)?  $default,){
final _that = this;
switch (_that) {
case _ReviewOwnerResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String hostUserId,  String hostName,  String? hostAvatarUrl,  String message, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReviewOwnerResponse() when $default != null:
return $default(_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.message,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String hostUserId,  String hostName,  String? hostAvatarUrl,  String message, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _ReviewOwnerResponse():
return $default(_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.message,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String hostUserId,  String hostName,  String? hostAvatarUrl,  String message, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _ReviewOwnerResponse() when $default != null:
return $default(_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.message,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReviewOwnerResponse implements ReviewOwnerResponse {
  const _ReviewOwnerResponse({required this.hostUserId, required this.hostName, this.hostAvatarUrl, required this.message, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt});
  factory _ReviewOwnerResponse.fromJson(Map<String, dynamic> json) => _$ReviewOwnerResponseFromJson(json);

@override final  String hostUserId;
@override final  String hostName;
@override final  String? hostAvatarUrl;
@override final  String message;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;

/// Create a copy of ReviewOwnerResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReviewOwnerResponseCopyWith<_ReviewOwnerResponse> get copyWith => __$ReviewOwnerResponseCopyWithImpl<_ReviewOwnerResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReviewOwnerResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReviewOwnerResponse&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.message, message) || other.message == message)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hostUserId,hostName,hostAvatarUrl,message,createdAt,updatedAt);

@override
String toString() {
  return 'ReviewOwnerResponse(hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, message: $message, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$ReviewOwnerResponseCopyWith<$Res> implements $ReviewOwnerResponseCopyWith<$Res> {
  factory _$ReviewOwnerResponseCopyWith(_ReviewOwnerResponse value, $Res Function(_ReviewOwnerResponse) _then) = __$ReviewOwnerResponseCopyWithImpl;
@override @useResult
$Res call({
 String hostUserId, String hostName, String? hostAvatarUrl, String message,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class __$ReviewOwnerResponseCopyWithImpl<$Res>
    implements _$ReviewOwnerResponseCopyWith<$Res> {
  __$ReviewOwnerResponseCopyWithImpl(this._self, this._then);

  final _ReviewOwnerResponse _self;
  final $Res Function(_ReviewOwnerResponse) _then;

/// Create a copy of ReviewOwnerResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? hostUserId = null,Object? hostName = null,Object? hostAvatarUrl = freezed,Object? message = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_ReviewOwnerResponse(
hostUserId: null == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String,hostName: null == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String,hostAvatarUrl: freezed == hostAvatarUrl ? _self.hostAvatarUrl : hostAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
