// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'match.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Match {

@JsonKey(includeToJson: false) String get id; String get user1Id; String get user2Id;@JsonKey(readValue: _readEventIds) List<String> get eventIds;@TimestampConverter() DateTime get createdAt;@NullableTimestampConverter() DateTime? get lastMessageAt; String? get lastMessagePreview; String? get lastMessageSenderId; Map<String, int> get unreadCounts; MatchStatus get status; String? get blockedBy;@NullableTimestampConverter() DateTime? get blockedAt;@JsonKey(unknownEnumValue: MatchConversationType.match) MatchConversationType get conversationType; String? get clubId; String? get organizerId; String? get crossPathsInvitationId;@NullableTimestampConverter() DateTime? get eventPlanExpiresAt;@NullableTimestampConverter() DateTime? get closedAt;
/// Create a copy of Match
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MatchCopyWith<Match> get copyWith => _$MatchCopyWithImpl<Match>(this as Match, _$identity);

  /// Serializes this Match to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Match&&(identical(other.id, id) || other.id == id)&&(identical(other.user1Id, user1Id) || other.user1Id == user1Id)&&(identical(other.user2Id, user2Id) || other.user2Id == user2Id)&&const DeepCollectionEquality().equals(other.eventIds, eventIds)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.lastMessageAt, lastMessageAt) || other.lastMessageAt == lastMessageAt)&&(identical(other.lastMessagePreview, lastMessagePreview) || other.lastMessagePreview == lastMessagePreview)&&(identical(other.lastMessageSenderId, lastMessageSenderId) || other.lastMessageSenderId == lastMessageSenderId)&&const DeepCollectionEquality().equals(other.unreadCounts, unreadCounts)&&(identical(other.status, status) || other.status == status)&&(identical(other.blockedBy, blockedBy) || other.blockedBy == blockedBy)&&(identical(other.blockedAt, blockedAt) || other.blockedAt == blockedAt)&&(identical(other.conversationType, conversationType) || other.conversationType == conversationType)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.crossPathsInvitationId, crossPathsInvitationId) || other.crossPathsInvitationId == crossPathsInvitationId)&&(identical(other.eventPlanExpiresAt, eventPlanExpiresAt) || other.eventPlanExpiresAt == eventPlanExpiresAt)&&(identical(other.closedAt, closedAt) || other.closedAt == closedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,user1Id,user2Id,const DeepCollectionEquality().hash(eventIds),createdAt,lastMessageAt,lastMessagePreview,lastMessageSenderId,const DeepCollectionEquality().hash(unreadCounts),status,blockedBy,blockedAt,conversationType,clubId,organizerId,crossPathsInvitationId,eventPlanExpiresAt,closedAt);

@override
String toString() {
  return 'Match(id: $id, user1Id: $user1Id, user2Id: $user2Id, eventIds: $eventIds, createdAt: $createdAt, lastMessageAt: $lastMessageAt, lastMessagePreview: $lastMessagePreview, lastMessageSenderId: $lastMessageSenderId, unreadCounts: $unreadCounts, status: $status, blockedBy: $blockedBy, blockedAt: $blockedAt, conversationType: $conversationType, clubId: $clubId, organizerId: $organizerId, crossPathsInvitationId: $crossPathsInvitationId, eventPlanExpiresAt: $eventPlanExpiresAt, closedAt: $closedAt)';
}


}

/// @nodoc
abstract mixin class $MatchCopyWith<$Res>  {
  factory $MatchCopyWith(Match value, $Res Function(Match) _then) = _$MatchCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String user1Id, String user2Id,@JsonKey(readValue: _readEventIds) List<String> eventIds,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? lastMessageAt, String? lastMessagePreview, String? lastMessageSenderId, Map<String, int> unreadCounts, MatchStatus status, String? blockedBy,@NullableTimestampConverter() DateTime? blockedAt,@JsonKey(unknownEnumValue: MatchConversationType.match) MatchConversationType conversationType, String? clubId, String? organizerId, String? crossPathsInvitationId,@NullableTimestampConverter() DateTime? eventPlanExpiresAt,@NullableTimestampConverter() DateTime? closedAt
});




}
/// @nodoc
class _$MatchCopyWithImpl<$Res>
    implements $MatchCopyWith<$Res> {
  _$MatchCopyWithImpl(this._self, this._then);

  final Match _self;
  final $Res Function(Match) _then;

/// Create a copy of Match
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? user1Id = null,Object? user2Id = null,Object? eventIds = null,Object? createdAt = null,Object? lastMessageAt = freezed,Object? lastMessagePreview = freezed,Object? lastMessageSenderId = freezed,Object? unreadCounts = null,Object? status = null,Object? blockedBy = freezed,Object? blockedAt = freezed,Object? conversationType = null,Object? clubId = freezed,Object? organizerId = freezed,Object? crossPathsInvitationId = freezed,Object? eventPlanExpiresAt = freezed,Object? closedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,user1Id: null == user1Id ? _self.user1Id : user1Id // ignore: cast_nullable_to_non_nullable
as String,user2Id: null == user2Id ? _self.user2Id : user2Id // ignore: cast_nullable_to_non_nullable
as String,eventIds: null == eventIds ? _self.eventIds : eventIds // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,lastMessageAt: freezed == lastMessageAt ? _self.lastMessageAt : lastMessageAt // ignore: cast_nullable_to_non_nullable
as DateTime?,lastMessagePreview: freezed == lastMessagePreview ? _self.lastMessagePreview : lastMessagePreview // ignore: cast_nullable_to_non_nullable
as String?,lastMessageSenderId: freezed == lastMessageSenderId ? _self.lastMessageSenderId : lastMessageSenderId // ignore: cast_nullable_to_non_nullable
as String?,unreadCounts: null == unreadCounts ? _self.unreadCounts : unreadCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MatchStatus,blockedBy: freezed == blockedBy ? _self.blockedBy : blockedBy // ignore: cast_nullable_to_non_nullable
as String?,blockedAt: freezed == blockedAt ? _self.blockedAt : blockedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,conversationType: null == conversationType ? _self.conversationType : conversationType // ignore: cast_nullable_to_non_nullable
as MatchConversationType,clubId: freezed == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String?,organizerId: freezed == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String?,crossPathsInvitationId: freezed == crossPathsInvitationId ? _self.crossPathsInvitationId : crossPathsInvitationId // ignore: cast_nullable_to_non_nullable
as String?,eventPlanExpiresAt: freezed == eventPlanExpiresAt ? _self.eventPlanExpiresAt : eventPlanExpiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,closedAt: freezed == closedAt ? _self.closedAt : closedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [Match].
extension MatchPatterns on Match {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Match value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Match() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Match value)  $default,){
final _that = this;
switch (_that) {
case _Match():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Match value)?  $default,){
final _that = this;
switch (_that) {
case _Match() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String user1Id,  String user2Id, @JsonKey(readValue: _readEventIds)  List<String> eventIds, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? lastMessageAt,  String? lastMessagePreview,  String? lastMessageSenderId,  Map<String, int> unreadCounts,  MatchStatus status,  String? blockedBy, @NullableTimestampConverter()  DateTime? blockedAt, @JsonKey(unknownEnumValue: MatchConversationType.match)  MatchConversationType conversationType,  String? clubId,  String? organizerId,  String? crossPathsInvitationId, @NullableTimestampConverter()  DateTime? eventPlanExpiresAt, @NullableTimestampConverter()  DateTime? closedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Match() when $default != null:
return $default(_that.id,_that.user1Id,_that.user2Id,_that.eventIds,_that.createdAt,_that.lastMessageAt,_that.lastMessagePreview,_that.lastMessageSenderId,_that.unreadCounts,_that.status,_that.blockedBy,_that.blockedAt,_that.conversationType,_that.clubId,_that.organizerId,_that.crossPathsInvitationId,_that.eventPlanExpiresAt,_that.closedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String user1Id,  String user2Id, @JsonKey(readValue: _readEventIds)  List<String> eventIds, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? lastMessageAt,  String? lastMessagePreview,  String? lastMessageSenderId,  Map<String, int> unreadCounts,  MatchStatus status,  String? blockedBy, @NullableTimestampConverter()  DateTime? blockedAt, @JsonKey(unknownEnumValue: MatchConversationType.match)  MatchConversationType conversationType,  String? clubId,  String? organizerId,  String? crossPathsInvitationId, @NullableTimestampConverter()  DateTime? eventPlanExpiresAt, @NullableTimestampConverter()  DateTime? closedAt)  $default,) {final _that = this;
switch (_that) {
case _Match():
return $default(_that.id,_that.user1Id,_that.user2Id,_that.eventIds,_that.createdAt,_that.lastMessageAt,_that.lastMessagePreview,_that.lastMessageSenderId,_that.unreadCounts,_that.status,_that.blockedBy,_that.blockedAt,_that.conversationType,_that.clubId,_that.organizerId,_that.crossPathsInvitationId,_that.eventPlanExpiresAt,_that.closedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String user1Id,  String user2Id, @JsonKey(readValue: _readEventIds)  List<String> eventIds, @TimestampConverter()  DateTime createdAt, @NullableTimestampConverter()  DateTime? lastMessageAt,  String? lastMessagePreview,  String? lastMessageSenderId,  Map<String, int> unreadCounts,  MatchStatus status,  String? blockedBy, @NullableTimestampConverter()  DateTime? blockedAt, @JsonKey(unknownEnumValue: MatchConversationType.match)  MatchConversationType conversationType,  String? clubId,  String? organizerId,  String? crossPathsInvitationId, @NullableTimestampConverter()  DateTime? eventPlanExpiresAt, @NullableTimestampConverter()  DateTime? closedAt)?  $default,) {final _that = this;
switch (_that) {
case _Match() when $default != null:
return $default(_that.id,_that.user1Id,_that.user2Id,_that.eventIds,_that.createdAt,_that.lastMessageAt,_that.lastMessagePreview,_that.lastMessageSenderId,_that.unreadCounts,_that.status,_that.blockedBy,_that.blockedAt,_that.conversationType,_that.clubId,_that.organizerId,_that.crossPathsInvitationId,_that.eventPlanExpiresAt,_that.closedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Match extends Match {
  const _Match({@JsonKey(includeToJson: false) required this.id, required this.user1Id, required this.user2Id, @JsonKey(readValue: _readEventIds) final  List<String> eventIds = const <String>[], @TimestampConverter() required this.createdAt, @NullableTimestampConverter() this.lastMessageAt, this.lastMessagePreview, this.lastMessageSenderId, final  Map<String, int> unreadCounts = const {}, this.status = MatchStatus.active, this.blockedBy, @NullableTimestampConverter() this.blockedAt, @JsonKey(unknownEnumValue: MatchConversationType.match) this.conversationType = MatchConversationType.match, this.clubId, this.organizerId, this.crossPathsInvitationId, @NullableTimestampConverter() this.eventPlanExpiresAt, @NullableTimestampConverter() this.closedAt}): _eventIds = eventIds,_unreadCounts = unreadCounts,super._();
  factory _Match.fromJson(Map<String, dynamic> json) => _$MatchFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String user1Id;
@override final  String user2Id;
 final  List<String> _eventIds;
@override@JsonKey(readValue: _readEventIds) List<String> get eventIds {
  if (_eventIds is EqualUnmodifiableListView) return _eventIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_eventIds);
}

@override@TimestampConverter() final  DateTime createdAt;
@override@NullableTimestampConverter() final  DateTime? lastMessageAt;
@override final  String? lastMessagePreview;
@override final  String? lastMessageSenderId;
 final  Map<String, int> _unreadCounts;
@override@JsonKey() Map<String, int> get unreadCounts {
  if (_unreadCounts is EqualUnmodifiableMapView) return _unreadCounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_unreadCounts);
}

@override@JsonKey() final  MatchStatus status;
@override final  String? blockedBy;
@override@NullableTimestampConverter() final  DateTime? blockedAt;
@override@JsonKey(unknownEnumValue: MatchConversationType.match) final  MatchConversationType conversationType;
@override final  String? clubId;
@override final  String? organizerId;
@override final  String? crossPathsInvitationId;
@override@NullableTimestampConverter() final  DateTime? eventPlanExpiresAt;
@override@NullableTimestampConverter() final  DateTime? closedAt;

/// Create a copy of Match
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MatchCopyWith<_Match> get copyWith => __$MatchCopyWithImpl<_Match>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MatchToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Match&&(identical(other.id, id) || other.id == id)&&(identical(other.user1Id, user1Id) || other.user1Id == user1Id)&&(identical(other.user2Id, user2Id) || other.user2Id == user2Id)&&const DeepCollectionEquality().equals(other._eventIds, _eventIds)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.lastMessageAt, lastMessageAt) || other.lastMessageAt == lastMessageAt)&&(identical(other.lastMessagePreview, lastMessagePreview) || other.lastMessagePreview == lastMessagePreview)&&(identical(other.lastMessageSenderId, lastMessageSenderId) || other.lastMessageSenderId == lastMessageSenderId)&&const DeepCollectionEquality().equals(other._unreadCounts, _unreadCounts)&&(identical(other.status, status) || other.status == status)&&(identical(other.blockedBy, blockedBy) || other.blockedBy == blockedBy)&&(identical(other.blockedAt, blockedAt) || other.blockedAt == blockedAt)&&(identical(other.conversationType, conversationType) || other.conversationType == conversationType)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.crossPathsInvitationId, crossPathsInvitationId) || other.crossPathsInvitationId == crossPathsInvitationId)&&(identical(other.eventPlanExpiresAt, eventPlanExpiresAt) || other.eventPlanExpiresAt == eventPlanExpiresAt)&&(identical(other.closedAt, closedAt) || other.closedAt == closedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,user1Id,user2Id,const DeepCollectionEquality().hash(_eventIds),createdAt,lastMessageAt,lastMessagePreview,lastMessageSenderId,const DeepCollectionEquality().hash(_unreadCounts),status,blockedBy,blockedAt,conversationType,clubId,organizerId,crossPathsInvitationId,eventPlanExpiresAt,closedAt);

@override
String toString() {
  return 'Match(id: $id, user1Id: $user1Id, user2Id: $user2Id, eventIds: $eventIds, createdAt: $createdAt, lastMessageAt: $lastMessageAt, lastMessagePreview: $lastMessagePreview, lastMessageSenderId: $lastMessageSenderId, unreadCounts: $unreadCounts, status: $status, blockedBy: $blockedBy, blockedAt: $blockedAt, conversationType: $conversationType, clubId: $clubId, organizerId: $organizerId, crossPathsInvitationId: $crossPathsInvitationId, eventPlanExpiresAt: $eventPlanExpiresAt, closedAt: $closedAt)';
}


}

/// @nodoc
abstract mixin class _$MatchCopyWith<$Res> implements $MatchCopyWith<$Res> {
  factory _$MatchCopyWith(_Match value, $Res Function(_Match) _then) = __$MatchCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String user1Id, String user2Id,@JsonKey(readValue: _readEventIds) List<String> eventIds,@TimestampConverter() DateTime createdAt,@NullableTimestampConverter() DateTime? lastMessageAt, String? lastMessagePreview, String? lastMessageSenderId, Map<String, int> unreadCounts, MatchStatus status, String? blockedBy,@NullableTimestampConverter() DateTime? blockedAt,@JsonKey(unknownEnumValue: MatchConversationType.match) MatchConversationType conversationType, String? clubId, String? organizerId, String? crossPathsInvitationId,@NullableTimestampConverter() DateTime? eventPlanExpiresAt,@NullableTimestampConverter() DateTime? closedAt
});




}
/// @nodoc
class __$MatchCopyWithImpl<$Res>
    implements _$MatchCopyWith<$Res> {
  __$MatchCopyWithImpl(this._self, this._then);

  final _Match _self;
  final $Res Function(_Match) _then;

/// Create a copy of Match
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? user1Id = null,Object? user2Id = null,Object? eventIds = null,Object? createdAt = null,Object? lastMessageAt = freezed,Object? lastMessagePreview = freezed,Object? lastMessageSenderId = freezed,Object? unreadCounts = null,Object? status = null,Object? blockedBy = freezed,Object? blockedAt = freezed,Object? conversationType = null,Object? clubId = freezed,Object? organizerId = freezed,Object? crossPathsInvitationId = freezed,Object? eventPlanExpiresAt = freezed,Object? closedAt = freezed,}) {
  return _then(_Match(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,user1Id: null == user1Id ? _self.user1Id : user1Id // ignore: cast_nullable_to_non_nullable
as String,user2Id: null == user2Id ? _self.user2Id : user2Id // ignore: cast_nullable_to_non_nullable
as String,eventIds: null == eventIds ? _self._eventIds : eventIds // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,lastMessageAt: freezed == lastMessageAt ? _self.lastMessageAt : lastMessageAt // ignore: cast_nullable_to_non_nullable
as DateTime?,lastMessagePreview: freezed == lastMessagePreview ? _self.lastMessagePreview : lastMessagePreview // ignore: cast_nullable_to_non_nullable
as String?,lastMessageSenderId: freezed == lastMessageSenderId ? _self.lastMessageSenderId : lastMessageSenderId // ignore: cast_nullable_to_non_nullable
as String?,unreadCounts: null == unreadCounts ? _self._unreadCounts : unreadCounts // ignore: cast_nullable_to_non_nullable
as Map<String, int>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MatchStatus,blockedBy: freezed == blockedBy ? _self.blockedBy : blockedBy // ignore: cast_nullable_to_non_nullable
as String?,blockedAt: freezed == blockedAt ? _self.blockedAt : blockedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,conversationType: null == conversationType ? _self.conversationType : conversationType // ignore: cast_nullable_to_non_nullable
as MatchConversationType,clubId: freezed == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String?,organizerId: freezed == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String?,crossPathsInvitationId: freezed == crossPathsInvitationId ? _self.crossPathsInvitationId : crossPathsInvitationId // ignore: cast_nullable_to_non_nullable
as String?,eventPlanExpiresAt: freezed == eventPlanExpiresAt ? _self.eventPlanExpiresAt : eventPlanExpiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,closedAt: freezed == closedAt ? _self.closedAt : closedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}

// dart format on
