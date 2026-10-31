// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organizer.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Organizer {

@JsonKey(includeToJson: false) String get id;@JsonKey(includeToJson: false) bool get synthetic;@JsonKey(includeToJson: false) String? get seedPrefix; String get name; String get description; String get location; String get locationCityId; String get locationMarketId; String get area; String? get hostUserId; String? get hostName; String? get hostAvatarUrl; String? get ownerUserId; List<String> get hostUserIds; List<OrganizerHostProfile> get hostProfiles;@TimestampConverter() DateTime get createdAt; String? get imageUrl; String? get profileImageUrl;@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> get organizerPhotos; UploadedPhoto? get logoPhoto; List<String> get tags;@JsonKey(name: 'followerCount') int get memberCount; double get rating; int get reviewCount;@NullableTimestampConverter() DateTime? get nextEventAt; String? get nextEventLabel; String? get instagramHandle; String? get phoneNumber; String? get email; OrganizerLifecycleStatus get status; bool get archived;@NullableTimestampConverter() DateTime? get archivedAt; String? get archiveReason; OrganizerAppVisibility get appVisibility; OrganizerOwnership? get ownership; OrganizerClaim? get claim; OrganizerPublicPage? get publicPage; OrganizerProvenance? get provenance;@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities get supplyCapabilities;@JsonKey(name: 'organizerType') OrganizerType get organizerType; String? get publicCategoryLabel; OrganizerHostDefaults get hostDefaults;
/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizerCopyWith<Organizer> get copyWith => _$OrganizerCopyWithImpl<Organizer>(this as Organizer, _$identity);

  /// Serializes this Organizer to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Organizer&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.locationCityId, locationCityId) || other.locationCityId == locationCityId)&&(identical(other.locationMarketId, locationMarketId) || other.locationMarketId == locationMarketId)&&(identical(other.area, area) || other.area == area)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.ownerUserId, ownerUserId) || other.ownerUserId == ownerUserId)&&const DeepCollectionEquality().equals(other.hostUserIds, hostUserIds)&&const DeepCollectionEquality().equals(other.hostProfiles, hostProfiles)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.imageUrl, imageUrl) || other.imageUrl == imageUrl)&&(identical(other.profileImageUrl, profileImageUrl) || other.profileImageUrl == profileImageUrl)&&const DeepCollectionEquality().equals(other.organizerPhotos, organizerPhotos)&&(identical(other.logoPhoto, logoPhoto) || other.logoPhoto == logoPhoto)&&const DeepCollectionEquality().equals(other.tags, tags)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.reviewCount, reviewCount) || other.reviewCount == reviewCount)&&(identical(other.nextEventAt, nextEventAt) || other.nextEventAt == nextEventAt)&&(identical(other.nextEventLabel, nextEventLabel) || other.nextEventLabel == nextEventLabel)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.status, status) || other.status == status)&&(identical(other.archived, archived) || other.archived == archived)&&(identical(other.archivedAt, archivedAt) || other.archivedAt == archivedAt)&&(identical(other.archiveReason, archiveReason) || other.archiveReason == archiveReason)&&(identical(other.appVisibility, appVisibility) || other.appVisibility == appVisibility)&&(identical(other.ownership, ownership) || other.ownership == ownership)&&(identical(other.claim, claim) || other.claim == claim)&&(identical(other.publicPage, publicPage) || other.publicPage == publicPage)&&(identical(other.provenance, provenance) || other.provenance == provenance)&&(identical(other.supplyCapabilities, supplyCapabilities) || other.supplyCapabilities == supplyCapabilities)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.publicCategoryLabel, publicCategoryLabel) || other.publicCategoryLabel == publicCategoryLabel)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,name,description,location,locationCityId,locationMarketId,area,hostUserId,hostName,hostAvatarUrl,ownerUserId,const DeepCollectionEquality().hash(hostUserIds),const DeepCollectionEquality().hash(hostProfiles),createdAt,imageUrl,profileImageUrl,const DeepCollectionEquality().hash(organizerPhotos),logoPhoto,const DeepCollectionEquality().hash(tags),memberCount,rating,reviewCount,nextEventAt,nextEventLabel,instagramHandle,phoneNumber,email,status,archived,archivedAt,archiveReason,appVisibility,ownership,claim,publicPage,provenance,supplyCapabilities,organizerType,publicCategoryLabel,hostDefaults]);

@override
String toString() {
  return 'Organizer(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, name: $name, description: $description, location: $location, locationCityId: $locationCityId, locationMarketId: $locationMarketId, area: $area, hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, ownerUserId: $ownerUserId, hostUserIds: $hostUserIds, hostProfiles: $hostProfiles, createdAt: $createdAt, imageUrl: $imageUrl, profileImageUrl: $profileImageUrl, clubPhotos: $organizerPhotos, logoPhoto: $logoPhoto, tags: $tags, memberCount: $memberCount, rating: $rating, reviewCount: $reviewCount, nextEventAt: $nextEventAt, nextEventLabel: $nextEventLabel, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, status: $status, archived: $archived, archivedAt: $archivedAt, archiveReason: $archiveReason, appVisibility: $appVisibility, ownership: $ownership, claim: $claim, publicPage: $publicPage, provenance: $provenance, supplyCapabilities: $supplyCapabilities, organizerType: $organizerType, publicCategoryLabel: $publicCategoryLabel, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class $OrganizerCopyWith<$Res>  {
  factory $OrganizerCopyWith(Organizer value, $Res Function(Organizer) _then) = _$OrganizerCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String name, String description, String location, String locationCityId, String locationMarketId, String area, String? hostUserId, String? hostName, String? hostAvatarUrl, String? ownerUserId, List<String> hostUserIds, List<OrganizerHostProfile> hostProfiles,@TimestampConverter() DateTime createdAt, String? imageUrl, String? profileImageUrl,@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> organizerPhotos, UploadedPhoto? logoPhoto, List<String> tags,@JsonKey(name: 'followerCount') int memberCount, double rating, int reviewCount,@NullableTimestampConverter() DateTime? nextEventAt, String? nextEventLabel, String? instagramHandle, String? phoneNumber, String? email, OrganizerLifecycleStatus status, bool archived,@NullableTimestampConverter() DateTime? archivedAt, String? archiveReason, OrganizerAppVisibility appVisibility, OrganizerOwnership? ownership, OrganizerClaim? claim, OrganizerPublicPage? publicPage, OrganizerProvenance? provenance,@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities supplyCapabilities,@JsonKey(name: 'organizerType') OrganizerType organizerType, String? publicCategoryLabel, OrganizerHostDefaults hostDefaults
});


$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class _$OrganizerCopyWithImpl<$Res>
    implements $OrganizerCopyWith<$Res> {
  _$OrganizerCopyWithImpl(this._self, this._then);

  final Organizer _self;
  final $Res Function(Organizer) _then;

/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? name = null,Object? description = null,Object? location = null,Object? locationCityId = null,Object? locationMarketId = null,Object? area = null,Object? hostUserId = freezed,Object? hostName = freezed,Object? hostAvatarUrl = freezed,Object? ownerUserId = freezed,Object? hostUserIds = null,Object? hostProfiles = null,Object? createdAt = null,Object? imageUrl = freezed,Object? profileImageUrl = freezed,Object? organizerPhotos = null,Object? logoPhoto = freezed,Object? tags = null,Object? memberCount = null,Object? rating = null,Object? reviewCount = null,Object? nextEventAt = freezed,Object? nextEventLabel = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? status = null,Object? archived = null,Object? archivedAt = freezed,Object? archiveReason = freezed,Object? appVisibility = null,Object? ownership = freezed,Object? claim = freezed,Object? publicPage = freezed,Object? provenance = freezed,Object? supplyCapabilities = null,Object? organizerType = null,Object? publicCategoryLabel = freezed,Object? hostDefaults = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,location: null == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String,locationCityId: null == locationCityId ? _self.locationCityId : locationCityId // ignore: cast_nullable_to_non_nullable
as String,locationMarketId: null == locationMarketId ? _self.locationMarketId : locationMarketId // ignore: cast_nullable_to_non_nullable
as String,area: null == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String,hostUserId: freezed == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String?,hostName: freezed == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String?,hostAvatarUrl: freezed == hostAvatarUrl ? _self.hostAvatarUrl : hostAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,ownerUserId: freezed == ownerUserId ? _self.ownerUserId : ownerUserId // ignore: cast_nullable_to_non_nullable
as String?,hostUserIds: null == hostUserIds ? _self.hostUserIds : hostUserIds // ignore: cast_nullable_to_non_nullable
as List<String>,hostProfiles: null == hostProfiles ? _self.hostProfiles : hostProfiles // ignore: cast_nullable_to_non_nullable
as List<OrganizerHostProfile>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,imageUrl: freezed == imageUrl ? _self.imageUrl : imageUrl // ignore: cast_nullable_to_non_nullable
as String?,profileImageUrl: freezed == profileImageUrl ? _self.profileImageUrl : profileImageUrl // ignore: cast_nullable_to_non_nullable
as String?,organizerPhotos: null == organizerPhotos ? _self.organizerPhotos : organizerPhotos // ignore: cast_nullable_to_non_nullable
as List<UploadedPhoto>,logoPhoto: freezed == logoPhoto ? _self.logoPhoto : logoPhoto // ignore: cast_nullable_to_non_nullable
as UploadedPhoto?,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,memberCount: null == memberCount ? _self.memberCount : memberCount // ignore: cast_nullable_to_non_nullable
as int,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double,reviewCount: null == reviewCount ? _self.reviewCount : reviewCount // ignore: cast_nullable_to_non_nullable
as int,nextEventAt: freezed == nextEventAt ? _self.nextEventAt : nextEventAt // ignore: cast_nullable_to_non_nullable
as DateTime?,nextEventLabel: freezed == nextEventLabel ? _self.nextEventLabel : nextEventLabel // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerLifecycleStatus,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,archivedAt: freezed == archivedAt ? _self.archivedAt : archivedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,archiveReason: freezed == archiveReason ? _self.archiveReason : archiveReason // ignore: cast_nullable_to_non_nullable
as String?,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as OrganizerAppVisibility,ownership: freezed == ownership ? _self.ownership : ownership // ignore: cast_nullable_to_non_nullable
as OrganizerOwnership?,claim: freezed == claim ? _self.claim : claim // ignore: cast_nullable_to_non_nullable
as OrganizerClaim?,publicPage: freezed == publicPage ? _self.publicPage : publicPage // ignore: cast_nullable_to_non_nullable
as OrganizerPublicPage?,provenance: freezed == provenance ? _self.provenance : provenance // ignore: cast_nullable_to_non_nullable
as OrganizerProvenance?,supplyCapabilities: null == supplyCapabilities ? _self.supplyCapabilities : supplyCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,publicCategoryLabel: freezed == publicCategoryLabel ? _self.publicCategoryLabel : publicCategoryLabel // ignore: cast_nullable_to_non_nullable
as String?,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as OrganizerHostDefaults,
  ));
}
/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $OrganizerHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// Adds pattern-matching-related methods to [Organizer].
extension OrganizerPatterns on Organizer {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Organizer value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Organizer() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Organizer value)  $default,){
final _that = this;
switch (_that) {
case _Organizer():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Organizer value)?  $default,){
final _that = this;
switch (_that) {
case _Organizer() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<OrganizerHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> organizerPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  OrganizerAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  OrganizerHostDefaults hostDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Organizer() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.organizerPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<OrganizerHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> organizerPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  OrganizerAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  OrganizerHostDefaults hostDefaults)  $default,) {final _that = this;
switch (_that) {
case _Organizer():
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.organizerPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<OrganizerHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> organizerPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  OrganizerLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  OrganizerAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  OrganizerHostDefaults hostDefaults)?  $default,) {final _that = this;
switch (_that) {
case _Organizer() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.organizerPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Organizer extends Organizer {
  const _Organizer({@JsonKey(includeToJson: false) required this.id, @JsonKey(includeToJson: false) this.synthetic = false, @JsonKey(includeToJson: false) this.seedPrefix, required this.name, required this.description, required this.location, this.locationCityId = '', this.locationMarketId = '', required this.area, this.hostUserId, this.hostName, this.hostAvatarUrl, this.ownerUserId, final  List<String> hostUserIds = const [], final  List<OrganizerHostProfile> hostProfiles = const [], @TimestampConverter() required this.createdAt, this.imageUrl, this.profileImageUrl, @JsonKey(name: 'organizerPhotos') final  List<UploadedPhoto> organizerPhotos = const [], this.logoPhoto, final  List<String> tags = const [], @JsonKey(name: 'followerCount') this.memberCount = 0, this.rating = 0.0, this.reviewCount = 0, @NullableTimestampConverter() this.nextEventAt, this.nextEventLabel, this.instagramHandle, this.phoneNumber, this.email, this.status = OrganizerLifecycleStatus.active, this.archived = false, @NullableTimestampConverter() this.archivedAt, this.archiveReason, this.appVisibility = OrganizerAppVisibility.hidden, this.ownership, this.claim, this.publicPage, this.provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities) this.supplyCapabilities = const OrganizerSupplyCapabilities.claimedManaged(), @JsonKey(name: 'organizerType') this.organizerType = OrganizerType.club, this.publicCategoryLabel, this.hostDefaults = const OrganizerHostDefaults()}): _hostUserIds = hostUserIds,_hostProfiles = hostProfiles,_organizerPhotos = organizerPhotos,_tags = tags,super._();
  factory _Organizer.fromJson(Map<String, dynamic> json) => _$OrganizerFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override@JsonKey(includeToJson: false) final  bool synthetic;
@override@JsonKey(includeToJson: false) final  String? seedPrefix;
@override final  String name;
@override final  String description;
@override final  String location;
@override@JsonKey() final  String locationCityId;
@override@JsonKey() final  String locationMarketId;
@override final  String area;
@override final  String? hostUserId;
@override final  String? hostName;
@override final  String? hostAvatarUrl;
@override final  String? ownerUserId;
 final  List<String> _hostUserIds;
@override@JsonKey() List<String> get hostUserIds {
  if (_hostUserIds is EqualUnmodifiableListView) return _hostUserIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_hostUserIds);
}

 final  List<OrganizerHostProfile> _hostProfiles;
@override@JsonKey() List<OrganizerHostProfile> get hostProfiles {
  if (_hostProfiles is EqualUnmodifiableListView) return _hostProfiles;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_hostProfiles);
}

@override@TimestampConverter() final  DateTime createdAt;
@override final  String? imageUrl;
@override final  String? profileImageUrl;
 final  List<UploadedPhoto> _organizerPhotos;
@override@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> get organizerPhotos {
  if (_organizerPhotos is EqualUnmodifiableListView) return _organizerPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_organizerPhotos);
}

@override final  UploadedPhoto? logoPhoto;
 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override@JsonKey(name: 'followerCount') final  int memberCount;
@override@JsonKey() final  double rating;
@override@JsonKey() final  int reviewCount;
@override@NullableTimestampConverter() final  DateTime? nextEventAt;
@override final  String? nextEventLabel;
@override final  String? instagramHandle;
@override final  String? phoneNumber;
@override final  String? email;
@override@JsonKey() final  OrganizerLifecycleStatus status;
@override@JsonKey() final  bool archived;
@override@NullableTimestampConverter() final  DateTime? archivedAt;
@override final  String? archiveReason;
@override@JsonKey() final  OrganizerAppVisibility appVisibility;
@override final  OrganizerOwnership? ownership;
@override final  OrganizerClaim? claim;
@override final  OrganizerPublicPage? publicPage;
@override final  OrganizerProvenance? provenance;
@override@JsonKey(readValue: readOrganizerSupplyCapabilities) final  OrganizerSupplyCapabilities supplyCapabilities;
@override@JsonKey(name: 'organizerType') final  OrganizerType organizerType;
@override final  String? publicCategoryLabel;
@override@JsonKey() final  OrganizerHostDefaults hostDefaults;

/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizerCopyWith<_Organizer> get copyWith => __$OrganizerCopyWithImpl<_Organizer>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizerToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Organizer&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.locationCityId, locationCityId) || other.locationCityId == locationCityId)&&(identical(other.locationMarketId, locationMarketId) || other.locationMarketId == locationMarketId)&&(identical(other.area, area) || other.area == area)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.ownerUserId, ownerUserId) || other.ownerUserId == ownerUserId)&&const DeepCollectionEquality().equals(other._hostUserIds, _hostUserIds)&&const DeepCollectionEquality().equals(other._hostProfiles, _hostProfiles)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.imageUrl, imageUrl) || other.imageUrl == imageUrl)&&(identical(other.profileImageUrl, profileImageUrl) || other.profileImageUrl == profileImageUrl)&&const DeepCollectionEquality().equals(other._organizerPhotos, _organizerPhotos)&&(identical(other.logoPhoto, logoPhoto) || other.logoPhoto == logoPhoto)&&const DeepCollectionEquality().equals(other._tags, _tags)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.reviewCount, reviewCount) || other.reviewCount == reviewCount)&&(identical(other.nextEventAt, nextEventAt) || other.nextEventAt == nextEventAt)&&(identical(other.nextEventLabel, nextEventLabel) || other.nextEventLabel == nextEventLabel)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.status, status) || other.status == status)&&(identical(other.archived, archived) || other.archived == archived)&&(identical(other.archivedAt, archivedAt) || other.archivedAt == archivedAt)&&(identical(other.archiveReason, archiveReason) || other.archiveReason == archiveReason)&&(identical(other.appVisibility, appVisibility) || other.appVisibility == appVisibility)&&(identical(other.ownership, ownership) || other.ownership == ownership)&&(identical(other.claim, claim) || other.claim == claim)&&(identical(other.publicPage, publicPage) || other.publicPage == publicPage)&&(identical(other.provenance, provenance) || other.provenance == provenance)&&(identical(other.supplyCapabilities, supplyCapabilities) || other.supplyCapabilities == supplyCapabilities)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.publicCategoryLabel, publicCategoryLabel) || other.publicCategoryLabel == publicCategoryLabel)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,name,description,location,locationCityId,locationMarketId,area,hostUserId,hostName,hostAvatarUrl,ownerUserId,const DeepCollectionEquality().hash(_hostUserIds),const DeepCollectionEquality().hash(_hostProfiles),createdAt,imageUrl,profileImageUrl,const DeepCollectionEquality().hash(_organizerPhotos),logoPhoto,const DeepCollectionEquality().hash(_tags),memberCount,rating,reviewCount,nextEventAt,nextEventLabel,instagramHandle,phoneNumber,email,status,archived,archivedAt,archiveReason,appVisibility,ownership,claim,publicPage,provenance,supplyCapabilities,organizerType,publicCategoryLabel,hostDefaults]);

@override
String toString() {
  return 'Organizer(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, name: $name, description: $description, location: $location, locationCityId: $locationCityId, locationMarketId: $locationMarketId, area: $area, hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, ownerUserId: $ownerUserId, hostUserIds: $hostUserIds, hostProfiles: $hostProfiles, createdAt: $createdAt, imageUrl: $imageUrl, profileImageUrl: $profileImageUrl, clubPhotos: $organizerPhotos, logoPhoto: $logoPhoto, tags: $tags, memberCount: $memberCount, rating: $rating, reviewCount: $reviewCount, nextEventAt: $nextEventAt, nextEventLabel: $nextEventLabel, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, status: $status, archived: $archived, archivedAt: $archivedAt, archiveReason: $archiveReason, appVisibility: $appVisibility, ownership: $ownership, claim: $claim, publicPage: $publicPage, provenance: $provenance, supplyCapabilities: $supplyCapabilities, organizerType: $organizerType, publicCategoryLabel: $publicCategoryLabel, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class _$OrganizerCopyWith<$Res> implements $OrganizerCopyWith<$Res> {
  factory _$OrganizerCopyWith(_Organizer value, $Res Function(_Organizer) _then) = __$OrganizerCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String name, String description, String location, String locationCityId, String locationMarketId, String area, String? hostUserId, String? hostName, String? hostAvatarUrl, String? ownerUserId, List<String> hostUserIds, List<OrganizerHostProfile> hostProfiles,@TimestampConverter() DateTime createdAt, String? imageUrl, String? profileImageUrl,@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> organizerPhotos, UploadedPhoto? logoPhoto, List<String> tags,@JsonKey(name: 'followerCount') int memberCount, double rating, int reviewCount,@NullableTimestampConverter() DateTime? nextEventAt, String? nextEventLabel, String? instagramHandle, String? phoneNumber, String? email, OrganizerLifecycleStatus status, bool archived,@NullableTimestampConverter() DateTime? archivedAt, String? archiveReason, OrganizerAppVisibility appVisibility, OrganizerOwnership? ownership, OrganizerClaim? claim, OrganizerPublicPage? publicPage, OrganizerProvenance? provenance,@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities supplyCapabilities,@JsonKey(name: 'organizerType') OrganizerType organizerType, String? publicCategoryLabel, OrganizerHostDefaults hostDefaults
});


@override $OrganizerHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class __$OrganizerCopyWithImpl<$Res>
    implements _$OrganizerCopyWith<$Res> {
  __$OrganizerCopyWithImpl(this._self, this._then);

  final _Organizer _self;
  final $Res Function(_Organizer) _then;

/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? name = null,Object? description = null,Object? location = null,Object? locationCityId = null,Object? locationMarketId = null,Object? area = null,Object? hostUserId = freezed,Object? hostName = freezed,Object? hostAvatarUrl = freezed,Object? ownerUserId = freezed,Object? hostUserIds = null,Object? hostProfiles = null,Object? createdAt = null,Object? imageUrl = freezed,Object? profileImageUrl = freezed,Object? organizerPhotos = null,Object? logoPhoto = freezed,Object? tags = null,Object? memberCount = null,Object? rating = null,Object? reviewCount = null,Object? nextEventAt = freezed,Object? nextEventLabel = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? status = null,Object? archived = null,Object? archivedAt = freezed,Object? archiveReason = freezed,Object? appVisibility = null,Object? ownership = freezed,Object? claim = freezed,Object? publicPage = freezed,Object? provenance = freezed,Object? supplyCapabilities = null,Object? organizerType = null,Object? publicCategoryLabel = freezed,Object? hostDefaults = null,}) {
  return _then(_Organizer(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,synthetic: null == synthetic ? _self.synthetic : synthetic // ignore: cast_nullable_to_non_nullable
as bool,seedPrefix: freezed == seedPrefix ? _self.seedPrefix : seedPrefix // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,location: null == location ? _self.location : location // ignore: cast_nullable_to_non_nullable
as String,locationCityId: null == locationCityId ? _self.locationCityId : locationCityId // ignore: cast_nullable_to_non_nullable
as String,locationMarketId: null == locationMarketId ? _self.locationMarketId : locationMarketId // ignore: cast_nullable_to_non_nullable
as String,area: null == area ? _self.area : area // ignore: cast_nullable_to_non_nullable
as String,hostUserId: freezed == hostUserId ? _self.hostUserId : hostUserId // ignore: cast_nullable_to_non_nullable
as String?,hostName: freezed == hostName ? _self.hostName : hostName // ignore: cast_nullable_to_non_nullable
as String?,hostAvatarUrl: freezed == hostAvatarUrl ? _self.hostAvatarUrl : hostAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,ownerUserId: freezed == ownerUserId ? _self.ownerUserId : ownerUserId // ignore: cast_nullable_to_non_nullable
as String?,hostUserIds: null == hostUserIds ? _self._hostUserIds : hostUserIds // ignore: cast_nullable_to_non_nullable
as List<String>,hostProfiles: null == hostProfiles ? _self._hostProfiles : hostProfiles // ignore: cast_nullable_to_non_nullable
as List<OrganizerHostProfile>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,imageUrl: freezed == imageUrl ? _self.imageUrl : imageUrl // ignore: cast_nullable_to_non_nullable
as String?,profileImageUrl: freezed == profileImageUrl ? _self.profileImageUrl : profileImageUrl // ignore: cast_nullable_to_non_nullable
as String?,organizerPhotos: null == organizerPhotos ? _self._organizerPhotos : organizerPhotos // ignore: cast_nullable_to_non_nullable
as List<UploadedPhoto>,logoPhoto: freezed == logoPhoto ? _self.logoPhoto : logoPhoto // ignore: cast_nullable_to_non_nullable
as UploadedPhoto?,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,memberCount: null == memberCount ? _self.memberCount : memberCount // ignore: cast_nullable_to_non_nullable
as int,rating: null == rating ? _self.rating : rating // ignore: cast_nullable_to_non_nullable
as double,reviewCount: null == reviewCount ? _self.reviewCount : reviewCount // ignore: cast_nullable_to_non_nullable
as int,nextEventAt: freezed == nextEventAt ? _self.nextEventAt : nextEventAt // ignore: cast_nullable_to_non_nullable
as DateTime?,nextEventLabel: freezed == nextEventLabel ? _self.nextEventLabel : nextEventLabel // ignore: cast_nullable_to_non_nullable
as String?,instagramHandle: freezed == instagramHandle ? _self.instagramHandle : instagramHandle // ignore: cast_nullable_to_non_nullable
as String?,phoneNumber: freezed == phoneNumber ? _self.phoneNumber : phoneNumber // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizerLifecycleStatus,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,archivedAt: freezed == archivedAt ? _self.archivedAt : archivedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,archiveReason: freezed == archiveReason ? _self.archiveReason : archiveReason // ignore: cast_nullable_to_non_nullable
as String?,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as OrganizerAppVisibility,ownership: freezed == ownership ? _self.ownership : ownership // ignore: cast_nullable_to_non_nullable
as OrganizerOwnership?,claim: freezed == claim ? _self.claim : claim // ignore: cast_nullable_to_non_nullable
as OrganizerClaim?,publicPage: freezed == publicPage ? _self.publicPage : publicPage // ignore: cast_nullable_to_non_nullable
as OrganizerPublicPage?,provenance: freezed == provenance ? _self.provenance : provenance // ignore: cast_nullable_to_non_nullable
as OrganizerProvenance?,supplyCapabilities: null == supplyCapabilities ? _self.supplyCapabilities : supplyCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,publicCategoryLabel: freezed == publicCategoryLabel ? _self.publicCategoryLabel : publicCategoryLabel // ignore: cast_nullable_to_non_nullable
as String?,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as OrganizerHostDefaults,
  ));
}

/// Create a copy of Organizer
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizerHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $OrganizerHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// @nodoc
mixin _$OrganizerHostProfile {

 String get uid; String get displayName; String? get avatarUrl; OrganizerHostRole get role;
/// Create a copy of OrganizerHostProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizerHostProfileCopyWith<OrganizerHostProfile> get copyWith => _$OrganizerHostProfileCopyWithImpl<OrganizerHostProfile>(this as OrganizerHostProfile, _$identity);

  /// Serializes this OrganizerHostProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizerHostProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uid,displayName,avatarUrl,role);

@override
String toString() {
  return 'OrganizerHostProfile(uid: $uid, displayName: $displayName, avatarUrl: $avatarUrl, role: $role)';
}


}

/// @nodoc
abstract mixin class $OrganizerHostProfileCopyWith<$Res>  {
  factory $OrganizerHostProfileCopyWith(OrganizerHostProfile value, $Res Function(OrganizerHostProfile) _then) = _$OrganizerHostProfileCopyWithImpl;
@useResult
$Res call({
 String uid, String displayName, String? avatarUrl, OrganizerHostRole role
});




}
/// @nodoc
class _$OrganizerHostProfileCopyWithImpl<$Res>
    implements $OrganizerHostProfileCopyWith<$Res> {
  _$OrganizerHostProfileCopyWithImpl(this._self, this._then);

  final OrganizerHostProfile _self;
  final $Res Function(OrganizerHostProfile) _then;

/// Create a copy of OrganizerHostProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uid = null,Object? displayName = null,Object? avatarUrl = freezed,Object? role = null,}) {
  return _then(_self.copyWith(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizerHostRole,
  ));
}

}


/// Adds pattern-matching-related methods to [OrganizerHostProfile].
extension OrganizerHostProfilePatterns on OrganizerHostProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizerHostProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizerHostProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizerHostProfile value)  $default,){
final _that = this;
switch (_that) {
case _OrganizerHostProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizerHostProfile value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizerHostProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String uid,  String displayName,  String? avatarUrl,  OrganizerHostRole role)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizerHostProfile() when $default != null:
return $default(_that.uid,_that.displayName,_that.avatarUrl,_that.role);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String uid,  String displayName,  String? avatarUrl,  OrganizerHostRole role)  $default,) {final _that = this;
switch (_that) {
case _OrganizerHostProfile():
return $default(_that.uid,_that.displayName,_that.avatarUrl,_that.role);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String uid,  String displayName,  String? avatarUrl,  OrganizerHostRole role)?  $default,) {final _that = this;
switch (_that) {
case _OrganizerHostProfile() when $default != null:
return $default(_that.uid,_that.displayName,_that.avatarUrl,_that.role);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizerHostProfile implements OrganizerHostProfile {
  const _OrganizerHostProfile({required this.uid, required this.displayName, this.avatarUrl, this.role = OrganizerHostRole.host});
  factory _OrganizerHostProfile.fromJson(Map<String, dynamic> json) => _$OrganizerHostProfileFromJson(json);

@override final  String uid;
@override final  String displayName;
@override final  String? avatarUrl;
@override@JsonKey() final  OrganizerHostRole role;

/// Create a copy of OrganizerHostProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizerHostProfileCopyWith<_OrganizerHostProfile> get copyWith => __$OrganizerHostProfileCopyWithImpl<_OrganizerHostProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizerHostProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizerHostProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uid,displayName,avatarUrl,role);

@override
String toString() {
  return 'OrganizerHostProfile(uid: $uid, displayName: $displayName, avatarUrl: $avatarUrl, role: $role)';
}


}

/// @nodoc
abstract mixin class _$OrganizerHostProfileCopyWith<$Res> implements $OrganizerHostProfileCopyWith<$Res> {
  factory _$OrganizerHostProfileCopyWith(_OrganizerHostProfile value, $Res Function(_OrganizerHostProfile) _then) = __$OrganizerHostProfileCopyWithImpl;
@override @useResult
$Res call({
 String uid, String displayName, String? avatarUrl, OrganizerHostRole role
});




}
/// @nodoc
class __$OrganizerHostProfileCopyWithImpl<$Res>
    implements _$OrganizerHostProfileCopyWith<$Res> {
  __$OrganizerHostProfileCopyWithImpl(this._self, this._then);

  final _OrganizerHostProfile _self;
  final $Res Function(_OrganizerHostProfile) _then;

/// Create a copy of OrganizerHostProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uid = null,Object? displayName = null,Object? avatarUrl = freezed,Object? role = null,}) {
  return _then(_OrganizerHostProfile(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizerHostRole,
  ));
}


}

// dart format on
