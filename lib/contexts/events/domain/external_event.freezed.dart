// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'external_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ExternalEvent {

 String get id; String get canonicalHostId; String get compatibilityClubId; String get title; String get description;@TimestampConverter() DateTime get startTime;@NullableTimestampConverter() DateTime? get endTime; String? get timezone; String get meetingPoint; String? get locationDetails; String? get photoUrl; double? get latitude; double? get longitude; ActivityKind get activityKind; EventInteractionModel get interactionModel; String? get priceDisplayText; int? get parsedPriceInPaise; String get currency; String get status; String get publicationStatus; OrganizerSupplyCapabilities get organizerCapabilities; String? get citySlug; List<ExternalEventLink> get externalLinks; String? get sourcePlatform;
/// Create a copy of ExternalEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExternalEventCopyWith<ExternalEvent> get copyWith => _$ExternalEventCopyWithImpl<ExternalEvent>(this as ExternalEvent, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExternalEvent&&(identical(other.id, id) || other.id == id)&&(identical(other.canonicalHostId, canonicalHostId) || other.canonicalHostId == canonicalHostId)&&(identical(other.compatibilityClubId, compatibilityClubId) || other.compatibilityClubId == compatibilityClubId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.activityKind, activityKind) || other.activityKind == activityKind)&&(identical(other.interactionModel, interactionModel) || other.interactionModel == interactionModel)&&(identical(other.priceDisplayText, priceDisplayText) || other.priceDisplayText == priceDisplayText)&&(identical(other.parsedPriceInPaise, parsedPriceInPaise) || other.parsedPriceInPaise == parsedPriceInPaise)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.status, status) || other.status == status)&&(identical(other.publicationStatus, publicationStatus) || other.publicationStatus == publicationStatus)&&(identical(other.organizerCapabilities, organizerCapabilities) || other.organizerCapabilities == organizerCapabilities)&&(identical(other.citySlug, citySlug) || other.citySlug == citySlug)&&const DeepCollectionEquality().equals(other.externalLinks, externalLinks)&&(identical(other.sourcePlatform, sourcePlatform) || other.sourcePlatform == sourcePlatform));
}


@override
int get hashCode => Object.hashAll([runtimeType,id,canonicalHostId,compatibilityClubId,title,description,startTime,endTime,timezone,meetingPoint,locationDetails,photoUrl,latitude,longitude,activityKind,interactionModel,priceDisplayText,parsedPriceInPaise,currency,status,publicationStatus,organizerCapabilities,citySlug,const DeepCollectionEquality().hash(externalLinks),sourcePlatform]);

@override
String toString() {
  return 'ExternalEvent(id: $id, canonicalHostId: $canonicalHostId, compatibilityClubId: $compatibilityClubId, title: $title, description: $description, startTime: $startTime, endTime: $endTime, timezone: $timezone, meetingPoint: $meetingPoint, locationDetails: $locationDetails, photoUrl: $photoUrl, latitude: $latitude, longitude: $longitude, activityKind: $activityKind, interactionModel: $interactionModel, priceDisplayText: $priceDisplayText, parsedPriceInPaise: $parsedPriceInPaise, currency: $currency, status: $status, publicationStatus: $publicationStatus, organizerCapabilities: $organizerCapabilities, citySlug: $citySlug, externalLinks: $externalLinks, sourcePlatform: $sourcePlatform)';
}


}

/// @nodoc
abstract mixin class $ExternalEventCopyWith<$Res>  {
  factory $ExternalEventCopyWith(ExternalEvent value, $Res Function(ExternalEvent) _then) = _$ExternalEventCopyWithImpl;
@useResult
$Res call({
 String id, String canonicalHostId, String compatibilityClubId, String title, String description,@TimestampConverter() DateTime startTime,@NullableTimestampConverter() DateTime? endTime, String? timezone, String meetingPoint, String? locationDetails, String? photoUrl, double? latitude, double? longitude, ActivityKind activityKind, EventInteractionModel interactionModel, String? priceDisplayText, int? parsedPriceInPaise, String currency, String status, String publicationStatus, OrganizerSupplyCapabilities organizerCapabilities, String? citySlug, List<ExternalEventLink> externalLinks, String? sourcePlatform
});




}
/// @nodoc
class _$ExternalEventCopyWithImpl<$Res>
    implements $ExternalEventCopyWith<$Res> {
  _$ExternalEventCopyWithImpl(this._self, this._then);

  final ExternalEvent _self;
  final $Res Function(ExternalEvent) _then;

/// Create a copy of ExternalEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? canonicalHostId = null,Object? compatibilityClubId = null,Object? title = null,Object? description = null,Object? startTime = null,Object? endTime = freezed,Object? timezone = freezed,Object? meetingPoint = null,Object? locationDetails = freezed,Object? photoUrl = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? activityKind = null,Object? interactionModel = null,Object? priceDisplayText = freezed,Object? parsedPriceInPaise = freezed,Object? currency = null,Object? status = null,Object? publicationStatus = null,Object? organizerCapabilities = null,Object? citySlug = freezed,Object? externalLinks = null,Object? sourcePlatform = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,canonicalHostId: null == canonicalHostId ? _self.canonicalHostId : canonicalHostId // ignore: cast_nullable_to_non_nullable
as String,compatibilityClubId: null == compatibilityClubId ? _self.compatibilityClubId : compatibilityClubId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime?,timezone: freezed == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String?,meetingPoint: null == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,activityKind: null == activityKind ? _self.activityKind : activityKind // ignore: cast_nullable_to_non_nullable
as ActivityKind,interactionModel: null == interactionModel ? _self.interactionModel : interactionModel // ignore: cast_nullable_to_non_nullable
as EventInteractionModel,priceDisplayText: freezed == priceDisplayText ? _self.priceDisplayText : priceDisplayText // ignore: cast_nullable_to_non_nullable
as String?,parsedPriceInPaise: freezed == parsedPriceInPaise ? _self.parsedPriceInPaise : parsedPriceInPaise // ignore: cast_nullable_to_non_nullable
as int?,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,publicationStatus: null == publicationStatus ? _self.publicationStatus : publicationStatus // ignore: cast_nullable_to_non_nullable
as String,organizerCapabilities: null == organizerCapabilities ? _self.organizerCapabilities : organizerCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,citySlug: freezed == citySlug ? _self.citySlug : citySlug // ignore: cast_nullable_to_non_nullable
as String?,externalLinks: null == externalLinks ? _self.externalLinks : externalLinks // ignore: cast_nullable_to_non_nullable
as List<ExternalEventLink>,sourcePlatform: freezed == sourcePlatform ? _self.sourcePlatform : sourcePlatform // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ExternalEvent].
extension ExternalEventPatterns on ExternalEvent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExternalEvent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExternalEvent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExternalEvent value)  $default,){
final _that = this;
switch (_that) {
case _ExternalEvent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExternalEvent value)?  $default,){
final _that = this;
switch (_that) {
case _ExternalEvent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String canonicalHostId,  String compatibilityClubId,  String title,  String description, @TimestampConverter()  DateTime startTime, @NullableTimestampConverter()  DateTime? endTime,  String? timezone,  String meetingPoint,  String? locationDetails,  String? photoUrl,  double? latitude,  double? longitude,  ActivityKind activityKind,  EventInteractionModel interactionModel,  String? priceDisplayText,  int? parsedPriceInPaise,  String currency,  String status,  String publicationStatus,  OrganizerSupplyCapabilities organizerCapabilities,  String? citySlug,  List<ExternalEventLink> externalLinks,  String? sourcePlatform)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExternalEvent() when $default != null:
return $default(_that.id,_that.canonicalHostId,_that.compatibilityClubId,_that.title,_that.description,_that.startTime,_that.endTime,_that.timezone,_that.meetingPoint,_that.locationDetails,_that.photoUrl,_that.latitude,_that.longitude,_that.activityKind,_that.interactionModel,_that.priceDisplayText,_that.parsedPriceInPaise,_that.currency,_that.status,_that.publicationStatus,_that.organizerCapabilities,_that.citySlug,_that.externalLinks,_that.sourcePlatform);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String canonicalHostId,  String compatibilityClubId,  String title,  String description, @TimestampConverter()  DateTime startTime, @NullableTimestampConverter()  DateTime? endTime,  String? timezone,  String meetingPoint,  String? locationDetails,  String? photoUrl,  double? latitude,  double? longitude,  ActivityKind activityKind,  EventInteractionModel interactionModel,  String? priceDisplayText,  int? parsedPriceInPaise,  String currency,  String status,  String publicationStatus,  OrganizerSupplyCapabilities organizerCapabilities,  String? citySlug,  List<ExternalEventLink> externalLinks,  String? sourcePlatform)  $default,) {final _that = this;
switch (_that) {
case _ExternalEvent():
return $default(_that.id,_that.canonicalHostId,_that.compatibilityClubId,_that.title,_that.description,_that.startTime,_that.endTime,_that.timezone,_that.meetingPoint,_that.locationDetails,_that.photoUrl,_that.latitude,_that.longitude,_that.activityKind,_that.interactionModel,_that.priceDisplayText,_that.parsedPriceInPaise,_that.currency,_that.status,_that.publicationStatus,_that.organizerCapabilities,_that.citySlug,_that.externalLinks,_that.sourcePlatform);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String canonicalHostId,  String compatibilityClubId,  String title,  String description, @TimestampConverter()  DateTime startTime, @NullableTimestampConverter()  DateTime? endTime,  String? timezone,  String meetingPoint,  String? locationDetails,  String? photoUrl,  double? latitude,  double? longitude,  ActivityKind activityKind,  EventInteractionModel interactionModel,  String? priceDisplayText,  int? parsedPriceInPaise,  String currency,  String status,  String publicationStatus,  OrganizerSupplyCapabilities organizerCapabilities,  String? citySlug,  List<ExternalEventLink> externalLinks,  String? sourcePlatform)?  $default,) {final _that = this;
switch (_that) {
case _ExternalEvent() when $default != null:
return $default(_that.id,_that.canonicalHostId,_that.compatibilityClubId,_that.title,_that.description,_that.startTime,_that.endTime,_that.timezone,_that.meetingPoint,_that.locationDetails,_that.photoUrl,_that.latitude,_that.longitude,_that.activityKind,_that.interactionModel,_that.priceDisplayText,_that.parsedPriceInPaise,_that.currency,_that.status,_that.publicationStatus,_that.organizerCapabilities,_that.citySlug,_that.externalLinks,_that.sourcePlatform);case _:
  return null;

}
}

}

/// @nodoc


class _ExternalEvent extends ExternalEvent {
  const _ExternalEvent({required this.id, required this.canonicalHostId, required this.compatibilityClubId, required this.title, required this.description, @TimestampConverter() required this.startTime, @NullableTimestampConverter() this.endTime, this.timezone, required this.meetingPoint, this.locationDetails, this.photoUrl, this.latitude, this.longitude, required this.activityKind, required this.interactionModel, this.priceDisplayText, this.parsedPriceInPaise, this.currency = defaultCurrencyCode, required this.status, required this.publicationStatus, this.organizerCapabilities = const OrganizerSupplyCapabilities.unclaimedReadOnly(), this.citySlug, required final  List<ExternalEventLink> externalLinks, this.sourcePlatform}): _externalLinks = externalLinks,super._();
  

@override final  String id;
@override final  String canonicalHostId;
@override final  String compatibilityClubId;
@override final  String title;
@override final  String description;
@override@TimestampConverter() final  DateTime startTime;
@override@NullableTimestampConverter() final  DateTime? endTime;
@override final  String? timezone;
@override final  String meetingPoint;
@override final  String? locationDetails;
@override final  String? photoUrl;
@override final  double? latitude;
@override final  double? longitude;
@override final  ActivityKind activityKind;
@override final  EventInteractionModel interactionModel;
@override final  String? priceDisplayText;
@override final  int? parsedPriceInPaise;
@override@JsonKey() final  String currency;
@override final  String status;
@override final  String publicationStatus;
@override@JsonKey() final  OrganizerSupplyCapabilities organizerCapabilities;
@override final  String? citySlug;
 final  List<ExternalEventLink> _externalLinks;
@override List<ExternalEventLink> get externalLinks {
  if (_externalLinks is EqualUnmodifiableListView) return _externalLinks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_externalLinks);
}

@override final  String? sourcePlatform;

/// Create a copy of ExternalEvent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExternalEventCopyWith<_ExternalEvent> get copyWith => __$ExternalEventCopyWithImpl<_ExternalEvent>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExternalEvent&&(identical(other.id, id) || other.id == id)&&(identical(other.canonicalHostId, canonicalHostId) || other.canonicalHostId == canonicalHostId)&&(identical(other.compatibilityClubId, compatibilityClubId) || other.compatibilityClubId == compatibilityClubId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.meetingPoint, meetingPoint) || other.meetingPoint == meetingPoint)&&(identical(other.locationDetails, locationDetails) || other.locationDetails == locationDetails)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.activityKind, activityKind) || other.activityKind == activityKind)&&(identical(other.interactionModel, interactionModel) || other.interactionModel == interactionModel)&&(identical(other.priceDisplayText, priceDisplayText) || other.priceDisplayText == priceDisplayText)&&(identical(other.parsedPriceInPaise, parsedPriceInPaise) || other.parsedPriceInPaise == parsedPriceInPaise)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.status, status) || other.status == status)&&(identical(other.publicationStatus, publicationStatus) || other.publicationStatus == publicationStatus)&&(identical(other.organizerCapabilities, organizerCapabilities) || other.organizerCapabilities == organizerCapabilities)&&(identical(other.citySlug, citySlug) || other.citySlug == citySlug)&&const DeepCollectionEquality().equals(other._externalLinks, _externalLinks)&&(identical(other.sourcePlatform, sourcePlatform) || other.sourcePlatform == sourcePlatform));
}


@override
int get hashCode => Object.hashAll([runtimeType,id,canonicalHostId,compatibilityClubId,title,description,startTime,endTime,timezone,meetingPoint,locationDetails,photoUrl,latitude,longitude,activityKind,interactionModel,priceDisplayText,parsedPriceInPaise,currency,status,publicationStatus,organizerCapabilities,citySlug,const DeepCollectionEquality().hash(_externalLinks),sourcePlatform]);

@override
String toString() {
  return 'ExternalEvent(id: $id, canonicalHostId: $canonicalHostId, compatibilityClubId: $compatibilityClubId, title: $title, description: $description, startTime: $startTime, endTime: $endTime, timezone: $timezone, meetingPoint: $meetingPoint, locationDetails: $locationDetails, photoUrl: $photoUrl, latitude: $latitude, longitude: $longitude, activityKind: $activityKind, interactionModel: $interactionModel, priceDisplayText: $priceDisplayText, parsedPriceInPaise: $parsedPriceInPaise, currency: $currency, status: $status, publicationStatus: $publicationStatus, organizerCapabilities: $organizerCapabilities, citySlug: $citySlug, externalLinks: $externalLinks, sourcePlatform: $sourcePlatform)';
}


}

/// @nodoc
abstract mixin class _$ExternalEventCopyWith<$Res> implements $ExternalEventCopyWith<$Res> {
  factory _$ExternalEventCopyWith(_ExternalEvent value, $Res Function(_ExternalEvent) _then) = __$ExternalEventCopyWithImpl;
@override @useResult
$Res call({
 String id, String canonicalHostId, String compatibilityClubId, String title, String description,@TimestampConverter() DateTime startTime,@NullableTimestampConverter() DateTime? endTime, String? timezone, String meetingPoint, String? locationDetails, String? photoUrl, double? latitude, double? longitude, ActivityKind activityKind, EventInteractionModel interactionModel, String? priceDisplayText, int? parsedPriceInPaise, String currency, String status, String publicationStatus, OrganizerSupplyCapabilities organizerCapabilities, String? citySlug, List<ExternalEventLink> externalLinks, String? sourcePlatform
});




}
/// @nodoc
class __$ExternalEventCopyWithImpl<$Res>
    implements _$ExternalEventCopyWith<$Res> {
  __$ExternalEventCopyWithImpl(this._self, this._then);

  final _ExternalEvent _self;
  final $Res Function(_ExternalEvent) _then;

/// Create a copy of ExternalEvent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? canonicalHostId = null,Object? compatibilityClubId = null,Object? title = null,Object? description = null,Object? startTime = null,Object? endTime = freezed,Object? timezone = freezed,Object? meetingPoint = null,Object? locationDetails = freezed,Object? photoUrl = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? activityKind = null,Object? interactionModel = null,Object? priceDisplayText = freezed,Object? parsedPriceInPaise = freezed,Object? currency = null,Object? status = null,Object? publicationStatus = null,Object? organizerCapabilities = null,Object? citySlug = freezed,Object? externalLinks = null,Object? sourcePlatform = freezed,}) {
  return _then(_ExternalEvent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,canonicalHostId: null == canonicalHostId ? _self.canonicalHostId : canonicalHostId // ignore: cast_nullable_to_non_nullable
as String,compatibilityClubId: null == compatibilityClubId ? _self.compatibilityClubId : compatibilityClubId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime?,timezone: freezed == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String?,meetingPoint: null == meetingPoint ? _self.meetingPoint : meetingPoint // ignore: cast_nullable_to_non_nullable
as String,locationDetails: freezed == locationDetails ? _self.locationDetails : locationDetails // ignore: cast_nullable_to_non_nullable
as String?,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,activityKind: null == activityKind ? _self.activityKind : activityKind // ignore: cast_nullable_to_non_nullable
as ActivityKind,interactionModel: null == interactionModel ? _self.interactionModel : interactionModel // ignore: cast_nullable_to_non_nullable
as EventInteractionModel,priceDisplayText: freezed == priceDisplayText ? _self.priceDisplayText : priceDisplayText // ignore: cast_nullable_to_non_nullable
as String?,parsedPriceInPaise: freezed == parsedPriceInPaise ? _self.parsedPriceInPaise : parsedPriceInPaise // ignore: cast_nullable_to_non_nullable
as int?,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,publicationStatus: null == publicationStatus ? _self.publicationStatus : publicationStatus // ignore: cast_nullable_to_non_nullable
as String,organizerCapabilities: null == organizerCapabilities ? _self.organizerCapabilities : organizerCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,citySlug: freezed == citySlug ? _self.citySlug : citySlug // ignore: cast_nullable_to_non_nullable
as String?,externalLinks: null == externalLinks ? _self._externalLinks : externalLinks // ignore: cast_nullable_to_non_nullable
as List<ExternalEventLink>,sourcePlatform: freezed == sourcePlatform ? _self.sourcePlatform : sourcePlatform // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ExternalEventLink {

 String get platform; String get url; String get linkType; String get sourceEventKey; String get candidateId; bool get primary;
/// Create a copy of ExternalEventLink
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExternalEventLinkCopyWith<ExternalEventLink> get copyWith => _$ExternalEventLinkCopyWithImpl<ExternalEventLink>(this as ExternalEventLink, _$identity);

  /// Serializes this ExternalEventLink to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExternalEventLink&&(identical(other.platform, platform) || other.platform == platform)&&(identical(other.url, url) || other.url == url)&&(identical(other.linkType, linkType) || other.linkType == linkType)&&(identical(other.sourceEventKey, sourceEventKey) || other.sourceEventKey == sourceEventKey)&&(identical(other.candidateId, candidateId) || other.candidateId == candidateId)&&(identical(other.primary, primary) || other.primary == primary));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,platform,url,linkType,sourceEventKey,candidateId,primary);

@override
String toString() {
  return 'ExternalEventLink(platform: $platform, url: $url, linkType: $linkType, sourceEventKey: $sourceEventKey, candidateId: $candidateId, primary: $primary)';
}


}

/// @nodoc
abstract mixin class $ExternalEventLinkCopyWith<$Res>  {
  factory $ExternalEventLinkCopyWith(ExternalEventLink value, $Res Function(ExternalEventLink) _then) = _$ExternalEventLinkCopyWithImpl;
@useResult
$Res call({
 String platform, String url, String linkType, String sourceEventKey, String candidateId, bool primary
});




}
/// @nodoc
class _$ExternalEventLinkCopyWithImpl<$Res>
    implements $ExternalEventLinkCopyWith<$Res> {
  _$ExternalEventLinkCopyWithImpl(this._self, this._then);

  final ExternalEventLink _self;
  final $Res Function(ExternalEventLink) _then;

/// Create a copy of ExternalEventLink
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? platform = null,Object? url = null,Object? linkType = null,Object? sourceEventKey = null,Object? candidateId = null,Object? primary = null,}) {
  return _then(_self.copyWith(
platform: null == platform ? _self.platform : platform // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,linkType: null == linkType ? _self.linkType : linkType // ignore: cast_nullable_to_non_nullable
as String,sourceEventKey: null == sourceEventKey ? _self.sourceEventKey : sourceEventKey // ignore: cast_nullable_to_non_nullable
as String,candidateId: null == candidateId ? _self.candidateId : candidateId // ignore: cast_nullable_to_non_nullable
as String,primary: null == primary ? _self.primary : primary // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ExternalEventLink].
extension ExternalEventLinkPatterns on ExternalEventLink {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExternalEventLink value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExternalEventLink() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExternalEventLink value)  $default,){
final _that = this;
switch (_that) {
case _ExternalEventLink():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExternalEventLink value)?  $default,){
final _that = this;
switch (_that) {
case _ExternalEventLink() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String platform,  String url,  String linkType,  String sourceEventKey,  String candidateId,  bool primary)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExternalEventLink() when $default != null:
return $default(_that.platform,_that.url,_that.linkType,_that.sourceEventKey,_that.candidateId,_that.primary);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String platform,  String url,  String linkType,  String sourceEventKey,  String candidateId,  bool primary)  $default,) {final _that = this;
switch (_that) {
case _ExternalEventLink():
return $default(_that.platform,_that.url,_that.linkType,_that.sourceEventKey,_that.candidateId,_that.primary);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String platform,  String url,  String linkType,  String sourceEventKey,  String candidateId,  bool primary)?  $default,) {final _that = this;
switch (_that) {
case _ExternalEventLink() when $default != null:
return $default(_that.platform,_that.url,_that.linkType,_that.sourceEventKey,_that.candidateId,_that.primary);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ExternalEventLink implements ExternalEventLink {
  const _ExternalEventLink({this.platform = '', this.url = '', this.linkType = '', this.sourceEventKey = '', this.candidateId = '', required this.primary});
  factory _ExternalEventLink.fromJson(Map<String, dynamic> json) => _$ExternalEventLinkFromJson(json);

@override@JsonKey() final  String platform;
@override@JsonKey() final  String url;
@override@JsonKey() final  String linkType;
@override@JsonKey() final  String sourceEventKey;
@override@JsonKey() final  String candidateId;
@override final  bool primary;

/// Create a copy of ExternalEventLink
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExternalEventLinkCopyWith<_ExternalEventLink> get copyWith => __$ExternalEventLinkCopyWithImpl<_ExternalEventLink>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ExternalEventLinkToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExternalEventLink&&(identical(other.platform, platform) || other.platform == platform)&&(identical(other.url, url) || other.url == url)&&(identical(other.linkType, linkType) || other.linkType == linkType)&&(identical(other.sourceEventKey, sourceEventKey) || other.sourceEventKey == sourceEventKey)&&(identical(other.candidateId, candidateId) || other.candidateId == candidateId)&&(identical(other.primary, primary) || other.primary == primary));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,platform,url,linkType,sourceEventKey,candidateId,primary);

@override
String toString() {
  return 'ExternalEventLink(platform: $platform, url: $url, linkType: $linkType, sourceEventKey: $sourceEventKey, candidateId: $candidateId, primary: $primary)';
}


}

/// @nodoc
abstract mixin class _$ExternalEventLinkCopyWith<$Res> implements $ExternalEventLinkCopyWith<$Res> {
  factory _$ExternalEventLinkCopyWith(_ExternalEventLink value, $Res Function(_ExternalEventLink) _then) = __$ExternalEventLinkCopyWithImpl;
@override @useResult
$Res call({
 String platform, String url, String linkType, String sourceEventKey, String candidateId, bool primary
});




}
/// @nodoc
class __$ExternalEventLinkCopyWithImpl<$Res>
    implements _$ExternalEventLinkCopyWith<$Res> {
  __$ExternalEventLinkCopyWithImpl(this._self, this._then);

  final _ExternalEventLink _self;
  final $Res Function(_ExternalEventLink) _then;

/// Create a copy of ExternalEventLink
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? platform = null,Object? url = null,Object? linkType = null,Object? sourceEventKey = null,Object? candidateId = null,Object? primary = null,}) {
  return _then(_ExternalEventLink(
platform: null == platform ? _self.platform : platform // ignore: cast_nullable_to_non_nullable
as String,url: null == url ? _self.url : url // ignore: cast_nullable_to_non_nullable
as String,linkType: null == linkType ? _self.linkType : linkType // ignore: cast_nullable_to_non_nullable
as String,sourceEventKey: null == sourceEventKey ? _self.sourceEventKey : sourceEventKey // ignore: cast_nullable_to_non_nullable
as String,candidateId: null == candidateId ? _self.candidateId : candidateId // ignore: cast_nullable_to_non_nullable
as String,primary: null == primary ? _self.primary : primary // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
