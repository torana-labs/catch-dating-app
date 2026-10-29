// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_invite_link.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventInviteLink {

@JsonKey(includeToJson: false) String get id; String get eventId; String get clubId; String get hostUid; String get label; String? get source; int get openCount; int get requestCount; int get confirmedCount; int get paidCount; int get checkedInCount; int get catcherCount; int get matchCount; int get chatStartedCount;@NullableTimestampConverter() DateTime? get disabledAt;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;
/// Create a copy of EventInviteLink
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventInviteLinkCopyWith<EventInviteLink> get copyWith => _$EventInviteLinkCopyWithImpl<EventInviteLink>(this as EventInviteLink, _$identity);

  /// Serializes this EventInviteLink to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventInviteLink&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.hostUid, hostUid) || other.hostUid == hostUid)&&(identical(other.label, label) || other.label == label)&&(identical(other.source, source) || other.source == source)&&(identical(other.openCount, openCount) || other.openCount == openCount)&&(identical(other.requestCount, requestCount) || other.requestCount == requestCount)&&(identical(other.confirmedCount, confirmedCount) || other.confirmedCount == confirmedCount)&&(identical(other.paidCount, paidCount) || other.paidCount == paidCount)&&(identical(other.checkedInCount, checkedInCount) || other.checkedInCount == checkedInCount)&&(identical(other.catcherCount, catcherCount) || other.catcherCount == catcherCount)&&(identical(other.matchCount, matchCount) || other.matchCount == matchCount)&&(identical(other.chatStartedCount, chatStartedCount) || other.chatStartedCount == chatStartedCount)&&(identical(other.disabledAt, disabledAt) || other.disabledAt == disabledAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,hostUid,label,source,openCount,requestCount,confirmedCount,paidCount,checkedInCount,catcherCount,matchCount,chatStartedCount,disabledAt,createdAt,updatedAt);

@override
String toString() {
  return 'EventInviteLink(id: $id, eventId: $eventId, clubId: $clubId, hostUid: $hostUid, label: $label, source: $source, openCount: $openCount, requestCount: $requestCount, confirmedCount: $confirmedCount, paidCount: $paidCount, checkedInCount: $checkedInCount, catcherCount: $catcherCount, matchCount: $matchCount, chatStartedCount: $chatStartedCount, disabledAt: $disabledAt, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $EventInviteLinkCopyWith<$Res>  {
  factory $EventInviteLinkCopyWith(EventInviteLink value, $Res Function(EventInviteLink) _then) = _$EventInviteLinkCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String hostUid, String label, String? source, int openCount, int requestCount, int confirmedCount, int paidCount, int checkedInCount, int catcherCount, int matchCount, int chatStartedCount,@NullableTimestampConverter() DateTime? disabledAt,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class _$EventInviteLinkCopyWithImpl<$Res>
    implements $EventInviteLinkCopyWith<$Res> {
  _$EventInviteLinkCopyWithImpl(this._self, this._then);

  final EventInviteLink _self;
  final $Res Function(EventInviteLink) _then;

/// Create a copy of EventInviteLink
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? hostUid = null,Object? label = null,Object? source = freezed,Object? openCount = null,Object? requestCount = null,Object? confirmedCount = null,Object? paidCount = null,Object? checkedInCount = null,Object? catcherCount = null,Object? matchCount = null,Object? chatStartedCount = null,Object? disabledAt = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,hostUid: null == hostUid ? _self.hostUid : hostUid // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,openCount: null == openCount ? _self.openCount : openCount // ignore: cast_nullable_to_non_nullable
as int,requestCount: null == requestCount ? _self.requestCount : requestCount // ignore: cast_nullable_to_non_nullable
as int,confirmedCount: null == confirmedCount ? _self.confirmedCount : confirmedCount // ignore: cast_nullable_to_non_nullable
as int,paidCount: null == paidCount ? _self.paidCount : paidCount // ignore: cast_nullable_to_non_nullable
as int,checkedInCount: null == checkedInCount ? _self.checkedInCount : checkedInCount // ignore: cast_nullable_to_non_nullable
as int,catcherCount: null == catcherCount ? _self.catcherCount : catcherCount // ignore: cast_nullable_to_non_nullable
as int,matchCount: null == matchCount ? _self.matchCount : matchCount // ignore: cast_nullable_to_non_nullable
as int,chatStartedCount: null == chatStartedCount ? _self.chatStartedCount : chatStartedCount // ignore: cast_nullable_to_non_nullable
as int,disabledAt: freezed == disabledAt ? _self.disabledAt : disabledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [EventInviteLink].
extension EventInviteLinkPatterns on EventInviteLink {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventInviteLink value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventInviteLink() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventInviteLink value)  $default,){
final _that = this;
switch (_that) {
case _EventInviteLink():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventInviteLink value)?  $default,){
final _that = this;
switch (_that) {
case _EventInviteLink() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String hostUid,  String label,  String? source,  int openCount,  int requestCount,  int confirmedCount,  int paidCount,  int checkedInCount,  int catcherCount,  int matchCount,  int chatStartedCount, @NullableTimestampConverter()  DateTime? disabledAt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventInviteLink() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.hostUid,_that.label,_that.source,_that.openCount,_that.requestCount,_that.confirmedCount,_that.paidCount,_that.checkedInCount,_that.catcherCount,_that.matchCount,_that.chatStartedCount,_that.disabledAt,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String hostUid,  String label,  String? source,  int openCount,  int requestCount,  int confirmedCount,  int paidCount,  int checkedInCount,  int catcherCount,  int matchCount,  int chatStartedCount, @NullableTimestampConverter()  DateTime? disabledAt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _EventInviteLink():
return $default(_that.id,_that.eventId,_that.clubId,_that.hostUid,_that.label,_that.source,_that.openCount,_that.requestCount,_that.confirmedCount,_that.paidCount,_that.checkedInCount,_that.catcherCount,_that.matchCount,_that.chatStartedCount,_that.disabledAt,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String clubId,  String hostUid,  String label,  String? source,  int openCount,  int requestCount,  int confirmedCount,  int paidCount,  int checkedInCount,  int catcherCount,  int matchCount,  int chatStartedCount, @NullableTimestampConverter()  DateTime? disabledAt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _EventInviteLink() when $default != null:
return $default(_that.id,_that.eventId,_that.clubId,_that.hostUid,_that.label,_that.source,_that.openCount,_that.requestCount,_that.confirmedCount,_that.paidCount,_that.checkedInCount,_that.catcherCount,_that.matchCount,_that.chatStartedCount,_that.disabledAt,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventInviteLink extends EventInviteLink {
  const _EventInviteLink({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.clubId, required this.hostUid, required this.label, this.source, this.openCount = 0, this.requestCount = 0, this.confirmedCount = 0, this.paidCount = 0, this.checkedInCount = 0, this.catcherCount = 0, this.matchCount = 0, this.chatStartedCount = 0, @NullableTimestampConverter() this.disabledAt, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt}): super._();
  factory _EventInviteLink.fromJson(Map<String, dynamic> json) => _$EventInviteLinkFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String clubId;
@override final  String hostUid;
@override final  String label;
@override final  String? source;
@override@JsonKey() final  int openCount;
@override@JsonKey() final  int requestCount;
@override@JsonKey() final  int confirmedCount;
@override@JsonKey() final  int paidCount;
@override@JsonKey() final  int checkedInCount;
@override@JsonKey() final  int catcherCount;
@override@JsonKey() final  int matchCount;
@override@JsonKey() final  int chatStartedCount;
@override@NullableTimestampConverter() final  DateTime? disabledAt;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;

/// Create a copy of EventInviteLink
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventInviteLinkCopyWith<_EventInviteLink> get copyWith => __$EventInviteLinkCopyWithImpl<_EventInviteLink>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventInviteLinkToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventInviteLink&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.clubId, clubId) || other.clubId == clubId)&&(identical(other.hostUid, hostUid) || other.hostUid == hostUid)&&(identical(other.label, label) || other.label == label)&&(identical(other.source, source) || other.source == source)&&(identical(other.openCount, openCount) || other.openCount == openCount)&&(identical(other.requestCount, requestCount) || other.requestCount == requestCount)&&(identical(other.confirmedCount, confirmedCount) || other.confirmedCount == confirmedCount)&&(identical(other.paidCount, paidCount) || other.paidCount == paidCount)&&(identical(other.checkedInCount, checkedInCount) || other.checkedInCount == checkedInCount)&&(identical(other.catcherCount, catcherCount) || other.catcherCount == catcherCount)&&(identical(other.matchCount, matchCount) || other.matchCount == matchCount)&&(identical(other.chatStartedCount, chatStartedCount) || other.chatStartedCount == chatStartedCount)&&(identical(other.disabledAt, disabledAt) || other.disabledAt == disabledAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,clubId,hostUid,label,source,openCount,requestCount,confirmedCount,paidCount,checkedInCount,catcherCount,matchCount,chatStartedCount,disabledAt,createdAt,updatedAt);

@override
String toString() {
  return 'EventInviteLink(id: $id, eventId: $eventId, clubId: $clubId, hostUid: $hostUid, label: $label, source: $source, openCount: $openCount, requestCount: $requestCount, confirmedCount: $confirmedCount, paidCount: $paidCount, checkedInCount: $checkedInCount, catcherCount: $catcherCount, matchCount: $matchCount, chatStartedCount: $chatStartedCount, disabledAt: $disabledAt, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$EventInviteLinkCopyWith<$Res> implements $EventInviteLinkCopyWith<$Res> {
  factory _$EventInviteLinkCopyWith(_EventInviteLink value, $Res Function(_EventInviteLink) _then) = __$EventInviteLinkCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String clubId, String hostUid, String label, String? source, int openCount, int requestCount, int confirmedCount, int paidCount, int checkedInCount, int catcherCount, int matchCount, int chatStartedCount,@NullableTimestampConverter() DateTime? disabledAt,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class __$EventInviteLinkCopyWithImpl<$Res>
    implements _$EventInviteLinkCopyWith<$Res> {
  __$EventInviteLinkCopyWithImpl(this._self, this._then);

  final _EventInviteLink _self;
  final $Res Function(_EventInviteLink) _then;

/// Create a copy of EventInviteLink
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? clubId = null,Object? hostUid = null,Object? label = null,Object? source = freezed,Object? openCount = null,Object? requestCount = null,Object? confirmedCount = null,Object? paidCount = null,Object? checkedInCount = null,Object? catcherCount = null,Object? matchCount = null,Object? chatStartedCount = null,Object? disabledAt = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_EventInviteLink(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,clubId: null == clubId ? _self.clubId : clubId // ignore: cast_nullable_to_non_nullable
as String,hostUid: null == hostUid ? _self.hostUid : hostUid // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,openCount: null == openCount ? _self.openCount : openCount // ignore: cast_nullable_to_non_nullable
as int,requestCount: null == requestCount ? _self.requestCount : requestCount // ignore: cast_nullable_to_non_nullable
as int,confirmedCount: null == confirmedCount ? _self.confirmedCount : confirmedCount // ignore: cast_nullable_to_non_nullable
as int,paidCount: null == paidCount ? _self.paidCount : paidCount // ignore: cast_nullable_to_non_nullable
as int,checkedInCount: null == checkedInCount ? _self.checkedInCount : checkedInCount // ignore: cast_nullable_to_non_nullable
as int,catcherCount: null == catcherCount ? _self.catcherCount : catcherCount // ignore: cast_nullable_to_non_nullable
as int,matchCount: null == matchCount ? _self.matchCount : matchCount // ignore: cast_nullable_to_non_nullable
as int,chatStartedCount: null == chatStartedCount ? _self.chatStartedCount : chatStartedCount // ignore: cast_nullable_to_non_nullable
as int,disabledAt: freezed == disabledAt ? _self.disabledAt : disabledAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
