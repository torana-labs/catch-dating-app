// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'launch_access_application.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LaunchAccessApplication {

@JsonKey(includeToJson: false) String get uid; int get applicationVersion;@JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending) LaunchAccessApplicationStatus get status; String get city;@JsonKey(unknownEnumValue: LaunchAccessRole.member) LaunchAccessRole get role; List<LaunchAccessEventType> get eventTypes; List<LaunchAccessAvailabilityWindow> get availabilityWindows; bool get wantsToHost; String? get inviteCode; String? get instagramHandle; String? get referralSource; String? get whyCatch; String? get cohortId; String? get hostUserId; String? get reviewerUid; String? get reviewNote; int get submissionCount;@NullableTimestampConverter() DateTime? get createdAt;@NullableTimestampConverter() DateTime? get submittedAt;@NullableTimestampConverter() DateTime? get updatedAt;@NullableTimestampConverter() DateTime? get reviewedAt;
/// Create a copy of LaunchAccessApplication
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LaunchAccessApplicationCopyWith<LaunchAccessApplication> get copyWith => _$LaunchAccessApplicationCopyWithImpl<LaunchAccessApplication>(this as LaunchAccessApplication, _$identity);

  /// Serializes this LaunchAccessApplication to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LaunchAccessApplication&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.applicationVersion, applicationVersion) || other.applicationVersion == applicationVersion)&&(identical(other.status, status) || other.status == status)&&(identical(other.city, city) || other.city == city)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other.eventTypes, eventTypes)&&const DeepCollectionEquality().equals(other.availabilityWindows, availabilityWindows)&&(identical(other.wantsToHost, wantsToHost) || other.wantsToHost == wantsToHost)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.referralSource, referralSource) || other.referralSource == referralSource)&&(identical(other.whyCatch, whyCatch) || other.whyCatch == whyCatch)&&(identical(other.cohortId, cohortId) || other.cohortId == cohortId)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.reviewerUid, reviewerUid) || other.reviewerUid == reviewerUid)&&(identical(other.reviewNote, reviewNote) || other.reviewNote == reviewNote)&&(identical(other.submissionCount, submissionCount) || other.submissionCount == submissionCount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,applicationVersion,status,city,role,const DeepCollectionEquality().hash(eventTypes),const DeepCollectionEquality().hash(availabilityWindows),wantsToHost,inviteCode,instagramHandle,referralSource,whyCatch,cohortId,hostUserId,reviewerUid,reviewNote,submissionCount,createdAt,submittedAt,updatedAt,reviewedAt]);

@override
String toString() {
  return 'LaunchAccessApplication(uid: $uid, applicationVersion: $applicationVersion, status: $status, city: $city, role: $role, eventTypes: $eventTypes, availabilityWindows: $availabilityWindows, wantsToHost: $wantsToHost, inviteCode: $inviteCode, instagramHandle: $instagramHandle, referralSource: $referralSource, whyCatch: $whyCatch, cohortId: $cohortId, hostUserId: $hostUserId, reviewerUid: $reviewerUid, reviewNote: $reviewNote, submissionCount: $submissionCount, createdAt: $createdAt, submittedAt: $submittedAt, updatedAt: $updatedAt, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class $LaunchAccessApplicationCopyWith<$Res>  {
  factory $LaunchAccessApplicationCopyWith(LaunchAccessApplication value, $Res Function(LaunchAccessApplication) _then) = _$LaunchAccessApplicationCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String uid, int applicationVersion,@JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending) LaunchAccessApplicationStatus status, String city,@JsonKey(unknownEnumValue: LaunchAccessRole.member) LaunchAccessRole role, List<LaunchAccessEventType> eventTypes, List<LaunchAccessAvailabilityWindow> availabilityWindows, bool wantsToHost, String? inviteCode, String? instagramHandle, String? referralSource, String? whyCatch, String? cohortId, String? hostUserId, String? reviewerUid, String? reviewNote, int submissionCount,@NullableTimestampConverter() DateTime? createdAt,@NullableTimestampConverter() DateTime? submittedAt,@NullableTimestampConverter() DateTime? updatedAt,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class _$LaunchAccessApplicationCopyWithImpl<$Res>
    implements $LaunchAccessApplicationCopyWith<$Res> {
  _$LaunchAccessApplicationCopyWithImpl(this._self, this._then);

  final LaunchAccessApplication _self;
  final $Res Function(LaunchAccessApplication) _then;

/// Create a copy of LaunchAccessApplication
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uid = null,Object? applicationVersion = null,Object? status = null,Object? city = null,Object? role = null,Object? eventTypes = null,Object? availabilityWindows = null,Object? wantsToHost = null,Object? inviteCode = freezed,Object? instagramHandle = freezed,Object? referralSource = freezed,Object? whyCatch = freezed,Object? cohortId = freezed,Object? hostUserId = freezed,Object? reviewerUid = freezed,Object? reviewNote = freezed,Object? submissionCount = null,Object? createdAt = freezed,Object? submittedAt = freezed,Object? updatedAt = freezed,Object? reviewedAt = freezed,}) {
  return _then(_self.copyWith(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,applicationVersion: null == applicationVersion ? _self.applicationVersion : applicationVersion // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as LaunchAccessApplicationStatus,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LaunchAccessRole,eventTypes: null == eventTypes ? _self.eventTypes : eventTypes // ignore: cast_nullable_to_non_nullable
as List<LaunchAccessEventType>,availabilityWindows: null == availabilityWindows ? _self.availabilityWindows : availabilityWindows // ignore: cast_nullable_to_non_nullable
as List<LaunchAccessAvailabilityWindow>,wantsToHost: null == wantsToHost ? _self.wantsToHost : wantsToHost // ignore: cast_nullable_to_non_nullable
as bool,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,referralSource: freezed == referralSource ? _self.referralSource : referralSource // ignore: cast_nullable_to_non_nullable
as String?,whyCatch: freezed == whyCatch ? _self.whyCatch : whyCatch // ignore: cast_nullable_to_non_nullable
as String?,cohortId: freezed == cohortId ? _self.cohortId : cohortId // ignore: cast_nullable_to_non_nullable
as String?,hostUserId: freezed == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String?,reviewerUid: freezed == reviewerUid ? _self.reviewerUid : reviewerUid // ignore: cast_nullable_to_non_nullable
as String?,reviewNote: freezed == reviewNote ? _self.reviewNote : reviewNote // ignore: cast_nullable_to_non_nullable
as String?,submissionCount: null == submissionCount ? _self.submissionCount : submissionCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [LaunchAccessApplication].
extension LaunchAccessApplicationPatterns on LaunchAccessApplication {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LaunchAccessApplication value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LaunchAccessApplication() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LaunchAccessApplication value)  $default,){
final _that = this;
switch (_that) {
case _LaunchAccessApplication():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LaunchAccessApplication value)?  $default,){
final _that = this;
switch (_that) {
case _LaunchAccessApplication() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  int applicationVersion, @JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending)  LaunchAccessApplicationStatus status,  String city, @JsonKey(unknownEnumValue: LaunchAccessRole.member)  LaunchAccessRole role,  List<LaunchAccessEventType> eventTypes,  List<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String? inviteCode,  String? instagramHandle,  String? referralSource,  String? whyCatch,  String? cohortId,  String? hostUserId,  String? reviewerUid,  String? reviewNote,  int submissionCount, @NullableTimestampConverter()  DateTime? createdAt, @NullableTimestampConverter()  DateTime? submittedAt, @NullableTimestampConverter()  DateTime? updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LaunchAccessApplication() when $default != null:
return $default(_that.uid,_that.applicationVersion,_that.status,_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch,_that.cohortId,_that.hostUserId,_that.reviewerUid,_that.reviewNote,_that.submissionCount,_that.createdAt,_that.submittedAt,_that.updatedAt,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String uid,  int applicationVersion, @JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending)  LaunchAccessApplicationStatus status,  String city, @JsonKey(unknownEnumValue: LaunchAccessRole.member)  LaunchAccessRole role,  List<LaunchAccessEventType> eventTypes,  List<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String? inviteCode,  String? instagramHandle,  String? referralSource,  String? whyCatch,  String? cohortId,  String? hostUserId,  String? reviewerUid,  String? reviewNote,  int submissionCount, @NullableTimestampConverter()  DateTime? createdAt, @NullableTimestampConverter()  DateTime? submittedAt, @NullableTimestampConverter()  DateTime? updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)  $default,) {final _that = this;
switch (_that) {
case _LaunchAccessApplication():
return $default(_that.uid,_that.applicationVersion,_that.status,_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch,_that.cohortId,_that.hostUserId,_that.reviewerUid,_that.reviewNote,_that.submissionCount,_that.createdAt,_that.submittedAt,_that.updatedAt,_that.reviewedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String uid,  int applicationVersion, @JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending)  LaunchAccessApplicationStatus status,  String city, @JsonKey(unknownEnumValue: LaunchAccessRole.member)  LaunchAccessRole role,  List<LaunchAccessEventType> eventTypes,  List<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String? inviteCode,  String? instagramHandle,  String? referralSource,  String? whyCatch,  String? cohortId,  String? hostUserId,  String? reviewerUid,  String? reviewNote,  int submissionCount, @NullableTimestampConverter()  DateTime? createdAt, @NullableTimestampConverter()  DateTime? submittedAt, @NullableTimestampConverter()  DateTime? updatedAt, @NullableTimestampConverter()  DateTime? reviewedAt)?  $default,) {final _that = this;
switch (_that) {
case _LaunchAccessApplication() when $default != null:
return $default(_that.uid,_that.applicationVersion,_that.status,_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch,_that.cohortId,_that.hostUserId,_that.reviewerUid,_that.reviewNote,_that.submissionCount,_that.createdAt,_that.submittedAt,_that.updatedAt,_that.reviewedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LaunchAccessApplication extends LaunchAccessApplication {
  const _LaunchAccessApplication({@JsonKey(includeToJson: false) this.uid = '', this.applicationVersion = 1, @JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending) this.status = LaunchAccessApplicationStatus.pending, required this.city, @JsonKey(unknownEnumValue: LaunchAccessRole.member) this.role = LaunchAccessRole.member, final  List<LaunchAccessEventType> eventTypes = const [], final  List<LaunchAccessAvailabilityWindow> availabilityWindows = const [], this.wantsToHost = false, this.inviteCode, this.instagramHandle, this.referralSource, this.whyCatch, this.cohortId, this.hostUserId, this.reviewerUid, this.reviewNote, this.submissionCount = 1, @NullableTimestampConverter() this.createdAt, @NullableTimestampConverter() this.submittedAt, @NullableTimestampConverter() this.updatedAt, @NullableTimestampConverter() this.reviewedAt}): _eventTypes = eventTypes,_availabilityWindows = availabilityWindows,super._();
  factory _LaunchAccessApplication.fromJson(Map<String, dynamic> json) => _$LaunchAccessApplicationFromJson(json);

@override@JsonKey(includeToJson: false) final  String uid;
@override@JsonKey() final  int applicationVersion;
@override@JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending) final  LaunchAccessApplicationStatus status;
@override final  String city;
@override@JsonKey(unknownEnumValue: LaunchAccessRole.member) final  LaunchAccessRole role;
 final  List<LaunchAccessEventType> _eventTypes;
@override@JsonKey() List<LaunchAccessEventType> get eventTypes {
  if (_eventTypes is EqualUnmodifiableListView) return _eventTypes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_eventTypes);
}

 final  List<LaunchAccessAvailabilityWindow> _availabilityWindows;
@override@JsonKey() List<LaunchAccessAvailabilityWindow> get availabilityWindows {
  if (_availabilityWindows is EqualUnmodifiableListView) return _availabilityWindows;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_availabilityWindows);
}

@override@JsonKey() final  bool wantsToHost;
@override final  String? inviteCode;
@override final  String? instagramHandle;
@override final  String? referralSource;
@override final  String? whyCatch;
@override final  String? cohortId;
@override final  String? hostUserId;
@override final  String? reviewerUid;
@override final  String? reviewNote;
@override@JsonKey() final  int submissionCount;
@override@NullableTimestampConverter() final  DateTime? createdAt;
@override@NullableTimestampConverter() final  DateTime? submittedAt;
@override@NullableTimestampConverter() final  DateTime? updatedAt;
@override@NullableTimestampConverter() final  DateTime? reviewedAt;

/// Create a copy of LaunchAccessApplication
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LaunchAccessApplicationCopyWith<_LaunchAccessApplication> get copyWith => __$LaunchAccessApplicationCopyWithImpl<_LaunchAccessApplication>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LaunchAccessApplicationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LaunchAccessApplication&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.applicationVersion, applicationVersion) || other.applicationVersion == applicationVersion)&&(identical(other.status, status) || other.status == status)&&(identical(other.city, city) || other.city == city)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other._eventTypes, _eventTypes)&&const DeepCollectionEquality().equals(other._availabilityWindows, _availabilityWindows)&&(identical(other.wantsToHost, wantsToHost) || other.wantsToHost == wantsToHost)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.referralSource, referralSource) || other.referralSource == referralSource)&&(identical(other.whyCatch, whyCatch) || other.whyCatch == whyCatch)&&(identical(other.cohortId, cohortId) || other.cohortId == cohortId)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.reviewerUid, reviewerUid) || other.reviewerUid == reviewerUid)&&(identical(other.reviewNote, reviewNote) || other.reviewNote == reviewNote)&&(identical(other.submissionCount, submissionCount) || other.submissionCount == submissionCount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.reviewedAt, reviewedAt) || other.reviewedAt == reviewedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,uid,applicationVersion,status,city,role,const DeepCollectionEquality().hash(_eventTypes),const DeepCollectionEquality().hash(_availabilityWindows),wantsToHost,inviteCode,instagramHandle,referralSource,whyCatch,cohortId,hostUserId,reviewerUid,reviewNote,submissionCount,createdAt,submittedAt,updatedAt,reviewedAt]);

@override
String toString() {
  return 'LaunchAccessApplication(uid: $uid, applicationVersion: $applicationVersion, status: $status, city: $city, role: $role, eventTypes: $eventTypes, availabilityWindows: $availabilityWindows, wantsToHost: $wantsToHost, inviteCode: $inviteCode, instagramHandle: $instagramHandle, referralSource: $referralSource, whyCatch: $whyCatch, cohortId: $cohortId, hostUserId: $hostUserId, reviewerUid: $reviewerUid, reviewNote: $reviewNote, submissionCount: $submissionCount, createdAt: $createdAt, submittedAt: $submittedAt, updatedAt: $updatedAt, reviewedAt: $reviewedAt)';
}


}

/// @nodoc
abstract mixin class _$LaunchAccessApplicationCopyWith<$Res> implements $LaunchAccessApplicationCopyWith<$Res> {
  factory _$LaunchAccessApplicationCopyWith(_LaunchAccessApplication value, $Res Function(_LaunchAccessApplication) _then) = __$LaunchAccessApplicationCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String uid, int applicationVersion,@JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending) LaunchAccessApplicationStatus status, String city,@JsonKey(unknownEnumValue: LaunchAccessRole.member) LaunchAccessRole role, List<LaunchAccessEventType> eventTypes, List<LaunchAccessAvailabilityWindow> availabilityWindows, bool wantsToHost, String? inviteCode, String? instagramHandle, String? referralSource, String? whyCatch, String? cohortId, String? hostUserId, String? reviewerUid, String? reviewNote, int submissionCount,@NullableTimestampConverter() DateTime? createdAt,@NullableTimestampConverter() DateTime? submittedAt,@NullableTimestampConverter() DateTime? updatedAt,@NullableTimestampConverter() DateTime? reviewedAt
});




}
/// @nodoc
class __$LaunchAccessApplicationCopyWithImpl<$Res>
    implements _$LaunchAccessApplicationCopyWith<$Res> {
  __$LaunchAccessApplicationCopyWithImpl(this._self, this._then);

  final _LaunchAccessApplication _self;
  final $Res Function(_LaunchAccessApplication) _then;

/// Create a copy of LaunchAccessApplication
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uid = null,Object? applicationVersion = null,Object? status = null,Object? city = null,Object? role = null,Object? eventTypes = null,Object? availabilityWindows = null,Object? wantsToHost = null,Object? inviteCode = freezed,Object? instagramHandle = freezed,Object? referralSource = freezed,Object? whyCatch = freezed,Object? cohortId = freezed,Object? hostUserId = freezed,Object? reviewerUid = freezed,Object? reviewNote = freezed,Object? submissionCount = null,Object? createdAt = freezed,Object? submittedAt = freezed,Object? updatedAt = freezed,Object? reviewedAt = freezed,}) {
  return _then(_LaunchAccessApplication(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,applicationVersion: null == applicationVersion ? _self.applicationVersion : applicationVersion // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as LaunchAccessApplicationStatus,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LaunchAccessRole,eventTypes: null == eventTypes ? _self._eventTypes : eventTypes // ignore: cast_nullable_to_non_nullable
as List<LaunchAccessEventType>,availabilityWindows: null == availabilityWindows ? _self._availabilityWindows : availabilityWindows // ignore: cast_nullable_to_non_nullable
as List<LaunchAccessAvailabilityWindow>,wantsToHost: null == wantsToHost ? _self.wantsToHost : wantsToHost // ignore: cast_nullable_to_non_nullable
as bool,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,referralSource: freezed == referralSource ? _self.referralSource : referralSource // ignore: cast_nullable_to_non_nullable
as String?,whyCatch: freezed == whyCatch ? _self.whyCatch : whyCatch // ignore: cast_nullable_to_non_nullable
as String?,cohortId: freezed == cohortId ? _self.cohortId : cohortId // ignore: cast_nullable_to_non_nullable
as String?,hostUserId: freezed == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String?,reviewerUid: freezed == reviewerUid ? _self.reviewerUid : reviewerUid // ignore: cast_nullable_to_non_nullable
as String?,reviewNote: freezed == reviewNote ? _self.reviewNote : reviewNote // ignore: cast_nullable_to_non_nullable
as String?,submissionCount: null == submissionCount ? _self.submissionCount : submissionCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,reviewedAt: freezed == reviewedAt ? _self.reviewedAt : reviewedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

/// @nodoc
mixin _$LaunchAccessApplicationDraft {

 String get city; LaunchAccessRole get role; Set<LaunchAccessEventType> get eventTypes; Set<LaunchAccessAvailabilityWindow> get availabilityWindows; bool get wantsToHost; String get inviteCode; String get instagramHandle; String get referralSource; String get whyCatch;
/// Create a copy of LaunchAccessApplicationDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LaunchAccessApplicationDraftCopyWith<LaunchAccessApplicationDraft> get copyWith => _$LaunchAccessApplicationDraftCopyWithImpl<LaunchAccessApplicationDraft>(this as LaunchAccessApplicationDraft, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LaunchAccessApplicationDraft&&(identical(other.city, city) || other.city == city)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other.eventTypes, eventTypes)&&const DeepCollectionEquality().equals(other.availabilityWindows, availabilityWindows)&&(identical(other.wantsToHost, wantsToHost) || other.wantsToHost == wantsToHost)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.referralSource, referralSource) || other.referralSource == referralSource)&&(identical(other.whyCatch, whyCatch) || other.whyCatch == whyCatch));
}


@override
int get hashCode => Object.hash(runtimeType,city,role,const DeepCollectionEquality().hash(eventTypes),const DeepCollectionEquality().hash(availabilityWindows),wantsToHost,inviteCode,instagramHandle,referralSource,whyCatch);

@override
String toString() {
  return 'LaunchAccessApplicationDraft(city: $city, role: $role, eventTypes: $eventTypes, availabilityWindows: $availabilityWindows, wantsToHost: $wantsToHost, inviteCode: $inviteCode, instagramHandle: $instagramHandle, referralSource: $referralSource, whyCatch: $whyCatch)';
}


}

/// @nodoc
abstract mixin class $LaunchAccessApplicationDraftCopyWith<$Res>  {
  factory $LaunchAccessApplicationDraftCopyWith(LaunchAccessApplicationDraft value, $Res Function(LaunchAccessApplicationDraft) _then) = _$LaunchAccessApplicationDraftCopyWithImpl;
@useResult
$Res call({
 String city, LaunchAccessRole role, Set<LaunchAccessEventType> eventTypes, Set<LaunchAccessAvailabilityWindow> availabilityWindows, bool wantsToHost, String inviteCode, String instagramHandle, String referralSource, String whyCatch
});




}
/// @nodoc
class _$LaunchAccessApplicationDraftCopyWithImpl<$Res>
    implements $LaunchAccessApplicationDraftCopyWith<$Res> {
  _$LaunchAccessApplicationDraftCopyWithImpl(this._self, this._then);

  final LaunchAccessApplicationDraft _self;
  final $Res Function(LaunchAccessApplicationDraft) _then;

/// Create a copy of LaunchAccessApplicationDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? city = null,Object? role = null,Object? eventTypes = null,Object? availabilityWindows = null,Object? wantsToHost = null,Object? inviteCode = null,Object? instagramHandle = null,Object? referralSource = null,Object? whyCatch = null,}) {
  return _then(_self.copyWith(
city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LaunchAccessRole,eventTypes: null == eventTypes ? _self.eventTypes : eventTypes // ignore: cast_nullable_to_non_nullable
as Set<LaunchAccessEventType>,availabilityWindows: null == availabilityWindows ? _self.availabilityWindows : availabilityWindows // ignore: cast_nullable_to_non_nullable
as Set<LaunchAccessAvailabilityWindow>,wantsToHost: null == wantsToHost ? _self.wantsToHost : wantsToHost // ignore: cast_nullable_to_non_nullable
as bool,inviteCode: null == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String,instagramHandle: null == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String,referralSource: null == referralSource ? _self.referralSource : referralSource // ignore: cast_nullable_to_non_nullable
as String,whyCatch: null == whyCatch ? _self.whyCatch : whyCatch // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [LaunchAccessApplicationDraft].
extension LaunchAccessApplicationDraftPatterns on LaunchAccessApplicationDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LaunchAccessApplicationDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LaunchAccessApplicationDraft value)  $default,){
final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LaunchAccessApplicationDraft value)?  $default,){
final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String city,  LaunchAccessRole role,  Set<LaunchAccessEventType> eventTypes,  Set<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String inviteCode,  String instagramHandle,  String referralSource,  String whyCatch)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft() when $default != null:
return $default(_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String city,  LaunchAccessRole role,  Set<LaunchAccessEventType> eventTypes,  Set<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String inviteCode,  String instagramHandle,  String referralSource,  String whyCatch)  $default,) {final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft():
return $default(_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String city,  LaunchAccessRole role,  Set<LaunchAccessEventType> eventTypes,  Set<LaunchAccessAvailabilityWindow> availabilityWindows,  bool wantsToHost,  String inviteCode,  String instagramHandle,  String referralSource,  String whyCatch)?  $default,) {final _that = this;
switch (_that) {
case _LaunchAccessApplicationDraft() when $default != null:
return $default(_that.city,_that.role,_that.eventTypes,_that.availabilityWindows,_that.wantsToHost,_that.inviteCode,_that.instagramHandle,_that.referralSource,_that.whyCatch);case _:
  return null;

}
}

}

/// @nodoc


class _LaunchAccessApplicationDraft extends LaunchAccessApplicationDraft {
  const _LaunchAccessApplicationDraft({this.city = '', this.role = LaunchAccessRole.member, final  Set<LaunchAccessEventType> eventTypes = const {}, final  Set<LaunchAccessAvailabilityWindow> availabilityWindows = const {}, this.wantsToHost = false, this.inviteCode = '', this.instagramHandle = '', this.referralSource = '', this.whyCatch = ''}): _eventTypes = eventTypes,_availabilityWindows = availabilityWindows,super._();
  

@override@JsonKey() final  String city;
@override@JsonKey() final  LaunchAccessRole role;
 final  Set<LaunchAccessEventType> _eventTypes;
@override@JsonKey() Set<LaunchAccessEventType> get eventTypes {
  if (_eventTypes is EqualUnmodifiableSetView) return _eventTypes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_eventTypes);
}

 final  Set<LaunchAccessAvailabilityWindow> _availabilityWindows;
@override@JsonKey() Set<LaunchAccessAvailabilityWindow> get availabilityWindows {
  if (_availabilityWindows is EqualUnmodifiableSetView) return _availabilityWindows;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_availabilityWindows);
}

@override@JsonKey() final  bool wantsToHost;
@override@JsonKey() final  String inviteCode;
@override@JsonKey() final  String instagramHandle;
@override@JsonKey() final  String referralSource;
@override@JsonKey() final  String whyCatch;

/// Create a copy of LaunchAccessApplicationDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LaunchAccessApplicationDraftCopyWith<_LaunchAccessApplicationDraft> get copyWith => __$LaunchAccessApplicationDraftCopyWithImpl<_LaunchAccessApplicationDraft>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LaunchAccessApplicationDraft&&(identical(other.city, city) || other.city == city)&&(identical(other.role, role) || other.role == role)&&const DeepCollectionEquality().equals(other._eventTypes, _eventTypes)&&const DeepCollectionEquality().equals(other._availabilityWindows, _availabilityWindows)&&(identical(other.wantsToHost, wantsToHost) || other.wantsToHost == wantsToHost)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.referralSource, referralSource) || other.referralSource == referralSource)&&(identical(other.whyCatch, whyCatch) || other.whyCatch == whyCatch));
}


@override
int get hashCode => Object.hash(runtimeType,city,role,const DeepCollectionEquality().hash(_eventTypes),const DeepCollectionEquality().hash(_availabilityWindows),wantsToHost,inviteCode,instagramHandle,referralSource,whyCatch);

@override
String toString() {
  return 'LaunchAccessApplicationDraft(city: $city, role: $role, eventTypes: $eventTypes, availabilityWindows: $availabilityWindows, wantsToHost: $wantsToHost, inviteCode: $inviteCode, instagramHandle: $instagramHandle, referralSource: $referralSource, whyCatch: $whyCatch)';
}


}

/// @nodoc
abstract mixin class _$LaunchAccessApplicationDraftCopyWith<$Res> implements $LaunchAccessApplicationDraftCopyWith<$Res> {
  factory _$LaunchAccessApplicationDraftCopyWith(_LaunchAccessApplicationDraft value, $Res Function(_LaunchAccessApplicationDraft) _then) = __$LaunchAccessApplicationDraftCopyWithImpl;
@override @useResult
$Res call({
 String city, LaunchAccessRole role, Set<LaunchAccessEventType> eventTypes, Set<LaunchAccessAvailabilityWindow> availabilityWindows, bool wantsToHost, String inviteCode, String instagramHandle, String referralSource, String whyCatch
});




}
/// @nodoc
class __$LaunchAccessApplicationDraftCopyWithImpl<$Res>
    implements _$LaunchAccessApplicationDraftCopyWith<$Res> {
  __$LaunchAccessApplicationDraftCopyWithImpl(this._self, this._then);

  final _LaunchAccessApplicationDraft _self;
  final $Res Function(_LaunchAccessApplicationDraft) _then;

/// Create a copy of LaunchAccessApplicationDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? city = null,Object? role = null,Object? eventTypes = null,Object? availabilityWindows = null,Object? wantsToHost = null,Object? inviteCode = null,Object? instagramHandle = null,Object? referralSource = null,Object? whyCatch = null,}) {
  return _then(_LaunchAccessApplicationDraft(
city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LaunchAccessRole,eventTypes: null == eventTypes ? _self._eventTypes : eventTypes // ignore: cast_nullable_to_non_nullable
as Set<LaunchAccessEventType>,availabilityWindows: null == availabilityWindows ? _self._availabilityWindows : availabilityWindows // ignore: cast_nullable_to_non_nullable
as Set<LaunchAccessAvailabilityWindow>,wantsToHost: null == wantsToHost ? _self.wantsToHost : wantsToHost // ignore: cast_nullable_to_non_nullable
as bool,inviteCode: null == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String,instagramHandle: null == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String,referralSource: null == referralSource ? _self.referralSource : referralSource // ignore: cast_nullable_to_non_nullable
as String,whyCatch: null == whyCatch ? _self.whyCatch : whyCatch // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
