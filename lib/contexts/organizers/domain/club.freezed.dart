// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'club.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Club {

@JsonKey(includeToJson: false) String get id;@JsonKey(includeToJson: false) bool get synthetic;@JsonKey(includeToJson: false) String? get seedPrefix; String get name; String get description; String get location; String get locationCityId; String get locationMarketId; String get area; String? get hostUserId; String? get hostName; String? get hostAvatarUrl; String? get ownerUserId; List<String> get hostUserIds; List<ClubHostProfile> get hostProfiles;@TimestampConverter() DateTime get createdAt; String? get imageUrl; String? get profileImageUrl;@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> get clubPhotos; UploadedPhoto? get logoPhoto; List<String> get tags;@JsonKey(name: 'followerCount') int get memberCount; double get rating; int get reviewCount;@NullableTimestampConverter() DateTime? get nextEventAt; String? get nextEventLabel; String? get instagramHandle; String? get phoneNumber; String? get email; ClubLifecycleStatus get status; bool get archived;@NullableTimestampConverter() DateTime? get archivedAt; String? get archiveReason; ClubAppVisibility get appVisibility; OrganizerOwnership? get ownership; OrganizerClaim? get claim; OrganizerPublicPage? get publicPage; OrganizerProvenance? get provenance;@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities get supplyCapabilities;@JsonKey(name: 'organizerType') OrganizerType get organizerType; String? get publicCategoryLabel; ClubHostDefaults get hostDefaults;
/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClubCopyWith<Club> get copyWith => _$ClubCopyWithImpl<Club>(this as Club, _$identity);

  /// Serializes this Club to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Club&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.locationCityId, locationCityId) || other.locationCityId == locationCityId)&&(identical(other.locationMarketId, locationMarketId) || other.locationMarketId == locationMarketId)&&(identical(other.area, area) || other.area == area)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.ownerUserId, ownerUserId) || other.ownerUserId == ownerUserId)&&const DeepCollectionEquality().equals(other.hostUserIds, hostUserIds)&&const DeepCollectionEquality().equals(other.hostProfiles, hostProfiles)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.imageUrl, imageUrl) || other.imageUrl == imageUrl)&&(identical(other.profileImageUrl, profileImageUrl) || other.profileImageUrl == profileImageUrl)&&const DeepCollectionEquality().equals(other.clubPhotos, clubPhotos)&&(identical(other.logoPhoto, logoPhoto) || other.logoPhoto == logoPhoto)&&const DeepCollectionEquality().equals(other.tags, tags)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.reviewCount, reviewCount) || other.reviewCount == reviewCount)&&(identical(other.nextEventAt, nextEventAt) || other.nextEventAt == nextEventAt)&&(identical(other.nextEventLabel, nextEventLabel) || other.nextEventLabel == nextEventLabel)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.status, status) || other.status == status)&&(identical(other.archived, archived) || other.archived == archived)&&(identical(other.archivedAt, archivedAt) || other.archivedAt == archivedAt)&&(identical(other.archiveReason, archiveReason) || other.archiveReason == archiveReason)&&(identical(other.appVisibility, appVisibility) || other.appVisibility == appVisibility)&&(identical(other.ownership, ownership) || other.ownership == ownership)&&(identical(other.claim, claim) || other.claim == claim)&&(identical(other.publicPage, publicPage) || other.publicPage == publicPage)&&(identical(other.provenance, provenance) || other.provenance == provenance)&&(identical(other.supplyCapabilities, supplyCapabilities) || other.supplyCapabilities == supplyCapabilities)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.publicCategoryLabel, publicCategoryLabel) || other.publicCategoryLabel == publicCategoryLabel)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,name,description,location,locationCityId,locationMarketId,area,hostUserId,hostName,hostAvatarUrl,ownerUserId,const DeepCollectionEquality().hash(hostUserIds),const DeepCollectionEquality().hash(hostProfiles),createdAt,imageUrl,profileImageUrl,const DeepCollectionEquality().hash(clubPhotos),logoPhoto,const DeepCollectionEquality().hash(tags),memberCount,rating,reviewCount,nextEventAt,nextEventLabel,instagramHandle,phoneNumber,email,status,archived,archivedAt,archiveReason,appVisibility,ownership,claim,publicPage,provenance,supplyCapabilities,organizerType,publicCategoryLabel,hostDefaults]);

@override
String toString() {
  return 'Club(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, name: $name, description: $description, location: $location, locationCityId: $locationCityId, locationMarketId: $locationMarketId, area: $area, hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, ownerUserId: $ownerUserId, hostUserIds: $hostUserIds, hostProfiles: $hostProfiles, createdAt: $createdAt, imageUrl: $imageUrl, profileImageUrl: $profileImageUrl, clubPhotos: $clubPhotos, logoPhoto: $logoPhoto, tags: $tags, memberCount: $memberCount, rating: $rating, reviewCount: $reviewCount, nextEventAt: $nextEventAt, nextEventLabel: $nextEventLabel, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, status: $status, archived: $archived, archivedAt: $archivedAt, archiveReason: $archiveReason, appVisibility: $appVisibility, ownership: $ownership, claim: $claim, publicPage: $publicPage, provenance: $provenance, supplyCapabilities: $supplyCapabilities, organizerType: $organizerType, publicCategoryLabel: $publicCategoryLabel, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class $ClubCopyWith<$Res>  {
  factory $ClubCopyWith(Club value, $Res Function(Club) _then) = _$ClubCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String name, String description, String location, String locationCityId, String locationMarketId, String area, String? hostUserId, String? hostName, String? hostAvatarUrl, String? ownerUserId, List<String> hostUserIds, List<ClubHostProfile> hostProfiles,@TimestampConverter() DateTime createdAt, String? imageUrl, String? profileImageUrl,@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> clubPhotos, UploadedPhoto? logoPhoto, List<String> tags,@JsonKey(name: 'followerCount') int memberCount, double rating, int reviewCount,@NullableTimestampConverter() DateTime? nextEventAt, String? nextEventLabel, String? instagramHandle, String? phoneNumber, String? email, ClubLifecycleStatus status, bool archived,@NullableTimestampConverter() DateTime? archivedAt, String? archiveReason, ClubAppVisibility appVisibility, OrganizerOwnership? ownership, OrganizerClaim? claim, OrganizerPublicPage? publicPage, OrganizerProvenance? provenance,@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities supplyCapabilities,@JsonKey(name: 'organizerType') OrganizerType organizerType, String? publicCategoryLabel, ClubHostDefaults hostDefaults
});


$ClubHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class _$ClubCopyWithImpl<$Res>
    implements $ClubCopyWith<$Res> {
  _$ClubCopyWithImpl(this._self, this._then);

  final Club _self;
  final $Res Function(Club) _then;

/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? name = null,Object? description = null,Object? location = null,Object? locationCityId = null,Object? locationMarketId = null,Object? area = null,Object? hostUserId = freezed,Object? hostName = freezed,Object? hostAvatarUrl = freezed,Object? ownerUserId = freezed,Object? hostUserIds = null,Object? hostProfiles = null,Object? createdAt = null,Object? imageUrl = freezed,Object? profileImageUrl = freezed,Object? clubPhotos = null,Object? logoPhoto = freezed,Object? tags = null,Object? memberCount = null,Object? rating = null,Object? reviewCount = null,Object? nextEventAt = freezed,Object? nextEventLabel = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? status = null,Object? archived = null,Object? archivedAt = freezed,Object? archiveReason = freezed,Object? appVisibility = null,Object? ownership = freezed,Object? claim = freezed,Object? publicPage = freezed,Object? provenance = freezed,Object? supplyCapabilities = null,Object? organizerType = null,Object? publicCategoryLabel = freezed,Object? hostDefaults = null,}) {
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
as List<ClubHostProfile>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,imageUrl: freezed == imageUrl ? _self.imageUrl : imageUrl // ignore: cast_nullable_to_non_nullable
as String?,profileImageUrl: freezed == profileImageUrl ? _self.profileImageUrl : profileImageUrl // ignore: cast_nullable_to_non_nullable
as String?,clubPhotos: null == clubPhotos ? _self.clubPhotos : clubPhotos // ignore: cast_nullable_to_non_nullable
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
as ClubLifecycleStatus,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,archivedAt: freezed == archivedAt ? _self.archivedAt : archivedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,archiveReason: freezed == archiveReason ? _self.archiveReason : archiveReason // ignore: cast_nullable_to_non_nullable
as String?,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as ClubAppVisibility,ownership: freezed == ownership ? _self.ownership : ownership // ignore: cast_nullable_to_non_nullable
as OrganizerOwnership?,claim: freezed == claim ? _self.claim : claim // ignore: cast_nullable_to_non_nullable
as OrganizerClaim?,publicPage: freezed == publicPage ? _self.publicPage : publicPage // ignore: cast_nullable_to_non_nullable
as OrganizerPublicPage?,provenance: freezed == provenance ? _self.provenance : provenance // ignore: cast_nullable_to_non_nullable
as OrganizerProvenance?,supplyCapabilities: null == supplyCapabilities ? _self.supplyCapabilities : supplyCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,publicCategoryLabel: freezed == publicCategoryLabel ? _self.publicCategoryLabel : publicCategoryLabel // ignore: cast_nullable_to_non_nullable
as String?,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as ClubHostDefaults,
  ));
}
/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClubHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $ClubHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// Adds pattern-matching-related methods to [Club].
extension ClubPatterns on Club {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Club value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Club() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Club value)  $default,){
final _that = this;
switch (_that) {
case _Club():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Club value)?  $default,){
final _that = this;
switch (_that) {
case _Club() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<ClubHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> clubPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  ClubLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  ClubAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  ClubHostDefaults hostDefaults)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Club() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.clubPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<ClubHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> clubPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  ClubLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  ClubAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  ClubHostDefaults hostDefaults)  $default,) {final _that = this;
switch (_that) {
case _Club():
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.clubPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id, @JsonKey(includeToJson: false)  bool synthetic, @JsonKey(includeToJson: false)  String? seedPrefix,  String name,  String description,  String location,  String locationCityId,  String locationMarketId,  String area,  String? hostUserId,  String? hostName,  String? hostAvatarUrl,  String? ownerUserId,  List<String> hostUserIds,  List<ClubHostProfile> hostProfiles, @TimestampConverter()  DateTime createdAt,  String? imageUrl,  String? profileImageUrl, @JsonKey(name: 'organizerPhotos')  List<UploadedPhoto> clubPhotos,  UploadedPhoto? logoPhoto,  List<String> tags, @JsonKey(name: 'followerCount')  int memberCount,  double rating,  int reviewCount, @NullableTimestampConverter()  DateTime? nextEventAt,  String? nextEventLabel,  String? instagramHandle,  String? phoneNumber,  String? email,  ClubLifecycleStatus status,  bool archived, @NullableTimestampConverter()  DateTime? archivedAt,  String? archiveReason,  ClubAppVisibility appVisibility,  OrganizerOwnership? ownership,  OrganizerClaim? claim,  OrganizerPublicPage? publicPage,  OrganizerProvenance? provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities)  OrganizerSupplyCapabilities supplyCapabilities, @JsonKey(name: 'organizerType')  OrganizerType organizerType,  String? publicCategoryLabel,  ClubHostDefaults hostDefaults)?  $default,) {final _that = this;
switch (_that) {
case _Club() when $default != null:
return $default(_that.id,_that.synthetic,_that.seedPrefix,_that.name,_that.description,_that.location,_that.locationCityId,_that.locationMarketId,_that.area,_that.hostUserId,_that.hostName,_that.hostAvatarUrl,_that.ownerUserId,_that.hostUserIds,_that.hostProfiles,_that.createdAt,_that.imageUrl,_that.profileImageUrl,_that.clubPhotos,_that.logoPhoto,_that.tags,_that.memberCount,_that.rating,_that.reviewCount,_that.nextEventAt,_that.nextEventLabel,_that.instagramHandle,_that.phoneNumber,_that.email,_that.status,_that.archived,_that.archivedAt,_that.archiveReason,_that.appVisibility,_that.ownership,_that.claim,_that.publicPage,_that.provenance,_that.supplyCapabilities,_that.organizerType,_that.publicCategoryLabel,_that.hostDefaults);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Club extends Club {
  const _Club({@JsonKey(includeToJson: false) required this.id, @JsonKey(includeToJson: false) this.synthetic = false, @JsonKey(includeToJson: false) this.seedPrefix, required this.name, required this.description, required this.location, this.locationCityId = '', this.locationMarketId = '', required this.area, this.hostUserId, this.hostName, this.hostAvatarUrl, this.ownerUserId, final  List<String> hostUserIds = const [], final  List<ClubHostProfile> hostProfiles = const [], @TimestampConverter() required this.createdAt, this.imageUrl, this.profileImageUrl, @JsonKey(name: 'organizerPhotos') final  List<UploadedPhoto> clubPhotos = const [], this.logoPhoto, final  List<String> tags = const [], @JsonKey(name: 'followerCount') this.memberCount = 0, this.rating = 0.0, this.reviewCount = 0, @NullableTimestampConverter() this.nextEventAt, this.nextEventLabel, this.instagramHandle, this.phoneNumber, this.email, this.status = ClubLifecycleStatus.active, this.archived = false, @NullableTimestampConverter() this.archivedAt, this.archiveReason, this.appVisibility = ClubAppVisibility.hidden, this.ownership, this.claim, this.publicPage, this.provenance, @JsonKey(readValue: readOrganizerSupplyCapabilities) this.supplyCapabilities = const OrganizerSupplyCapabilities.claimedManaged(), @JsonKey(name: 'organizerType') this.organizerType = OrganizerType.club, this.publicCategoryLabel, this.hostDefaults = const ClubHostDefaults()}): _hostUserIds = hostUserIds,_hostProfiles = hostProfiles,_clubPhotos = clubPhotos,_tags = tags,super._();
  factory _Club.fromJson(Map<String, dynamic> json) => _$ClubFromJson(json);

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

 final  List<ClubHostProfile> _hostProfiles;
@override@JsonKey() List<ClubHostProfile> get hostProfiles {
  if (_hostProfiles is EqualUnmodifiableListView) return _hostProfiles;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_hostProfiles);
}

@override@TimestampConverter() final  DateTime createdAt;
@override final  String? imageUrl;
@override final  String? profileImageUrl;
 final  List<UploadedPhoto> _clubPhotos;
@override@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> get clubPhotos {
  if (_clubPhotos is EqualUnmodifiableListView) return _clubPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_clubPhotos);
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
@override@JsonKey() final  ClubLifecycleStatus status;
@override@JsonKey() final  bool archived;
@override@NullableTimestampConverter() final  DateTime? archivedAt;
@override final  String? archiveReason;
@override@JsonKey() final  ClubAppVisibility appVisibility;
@override final  OrganizerOwnership? ownership;
@override final  OrganizerClaim? claim;
@override final  OrganizerPublicPage? publicPage;
@override final  OrganizerProvenance? provenance;
@override@JsonKey(readValue: readOrganizerSupplyCapabilities) final  OrganizerSupplyCapabilities supplyCapabilities;
@override@JsonKey(name: 'organizerType') final  OrganizerType organizerType;
@override final  String? publicCategoryLabel;
@override@JsonKey() final  ClubHostDefaults hostDefaults;

/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClubCopyWith<_Club> get copyWith => __$ClubCopyWithImpl<_Club>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClubToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Club&&(identical(other.id, id) || other.id == id)&&(identical(other.synthetic, synthetic) || other.synthetic == synthetic)&&(identical(other.seedPrefix, seedPrefix) || other.seedPrefix == seedPrefix)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.location, location) || other.location == location)&&(identical(other.locationCityId, locationCityId) || other.locationCityId == locationCityId)&&(identical(other.locationMarketId, locationMarketId) || other.locationMarketId == locationMarketId)&&(identical(other.area, area) || other.area == area)&&(identical(other.hostUserId, hostUserId) || other.hostUserId == hostUserId)&&(identical(other.hostName, hostName) || other.hostName == hostName)&&(identical(other.hostAvatarUrl, hostAvatarUrl) || other.hostAvatarUrl == hostAvatarUrl)&&(identical(other.ownerUserId, ownerUserId) || other.ownerUserId == ownerUserId)&&const DeepCollectionEquality().equals(other._hostUserIds, _hostUserIds)&&const DeepCollectionEquality().equals(other._hostProfiles, _hostProfiles)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.imageUrl, imageUrl) || other.imageUrl == imageUrl)&&(identical(other.profileImageUrl, profileImageUrl) || other.profileImageUrl == profileImageUrl)&&const DeepCollectionEquality().equals(other._clubPhotos, _clubPhotos)&&(identical(other.logoPhoto, logoPhoto) || other.logoPhoto == logoPhoto)&&const DeepCollectionEquality().equals(other._tags, _tags)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.rating, rating) || other.rating == rating)&&(identical(other.reviewCount, reviewCount) || other.reviewCount == reviewCount)&&(identical(other.nextEventAt, nextEventAt) || other.nextEventAt == nextEventAt)&&(identical(other.nextEventLabel, nextEventLabel) || other.nextEventLabel == nextEventLabel)&&(identical(other.instagramHandle, instagramHandle) || other.instagramHandle == instagramHandle)&&(identical(other.phoneNumber, phoneNumber) || other.phoneNumber == phoneNumber)&&(identical(other.email, email) || other.email == email)&&(identical(other.status, status) || other.status == status)&&(identical(other.archived, archived) || other.archived == archived)&&(identical(other.archivedAt, archivedAt) || other.archivedAt == archivedAt)&&(identical(other.archiveReason, archiveReason) || other.archiveReason == archiveReason)&&(identical(other.appVisibility, appVisibility) || other.appVisibility == appVisibility)&&(identical(other.ownership, ownership) || other.ownership == ownership)&&(identical(other.claim, claim) || other.claim == claim)&&(identical(other.publicPage, publicPage) || other.publicPage == publicPage)&&(identical(other.provenance, provenance) || other.provenance == provenance)&&(identical(other.supplyCapabilities, supplyCapabilities) || other.supplyCapabilities == supplyCapabilities)&&(identical(other.organizerType, organizerType) || other.organizerType == organizerType)&&(identical(other.publicCategoryLabel, publicCategoryLabel) || other.publicCategoryLabel == publicCategoryLabel)&&(identical(other.hostDefaults, hostDefaults) || other.hostDefaults == hostDefaults));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,synthetic,seedPrefix,name,description,location,locationCityId,locationMarketId,area,hostUserId,hostName,hostAvatarUrl,ownerUserId,const DeepCollectionEquality().hash(_hostUserIds),const DeepCollectionEquality().hash(_hostProfiles),createdAt,imageUrl,profileImageUrl,const DeepCollectionEquality().hash(_clubPhotos),logoPhoto,const DeepCollectionEquality().hash(_tags),memberCount,rating,reviewCount,nextEventAt,nextEventLabel,instagramHandle,phoneNumber,email,status,archived,archivedAt,archiveReason,appVisibility,ownership,claim,publicPage,provenance,supplyCapabilities,organizerType,publicCategoryLabel,hostDefaults]);

@override
String toString() {
  return 'Club(id: $id, synthetic: $synthetic, seedPrefix: $seedPrefix, name: $name, description: $description, location: $location, locationCityId: $locationCityId, locationMarketId: $locationMarketId, area: $area, hostUserId: $hostUserId, hostName: $hostName, hostAvatarUrl: $hostAvatarUrl, ownerUserId: $ownerUserId, hostUserIds: $hostUserIds, hostProfiles: $hostProfiles, createdAt: $createdAt, imageUrl: $imageUrl, profileImageUrl: $profileImageUrl, clubPhotos: $clubPhotos, logoPhoto: $logoPhoto, tags: $tags, memberCount: $memberCount, rating: $rating, reviewCount: $reviewCount, nextEventAt: $nextEventAt, nextEventLabel: $nextEventLabel, instagramHandle: $instagramHandle, phoneNumber: $phoneNumber, email: $email, status: $status, archived: $archived, archivedAt: $archivedAt, archiveReason: $archiveReason, appVisibility: $appVisibility, ownership: $ownership, claim: $claim, publicPage: $publicPage, provenance: $provenance, supplyCapabilities: $supplyCapabilities, organizerType: $organizerType, publicCategoryLabel: $publicCategoryLabel, hostDefaults: $hostDefaults)';
}


}

/// @nodoc
abstract mixin class _$ClubCopyWith<$Res> implements $ClubCopyWith<$Res> {
  factory _$ClubCopyWith(_Club value, $Res Function(_Club) _then) = __$ClubCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id,@JsonKey(includeToJson: false) bool synthetic,@JsonKey(includeToJson: false) String? seedPrefix, String name, String description, String location, String locationCityId, String locationMarketId, String area, String? hostUserId, String? hostName, String? hostAvatarUrl, String? ownerUserId, List<String> hostUserIds, List<ClubHostProfile> hostProfiles,@TimestampConverter() DateTime createdAt, String? imageUrl, String? profileImageUrl,@JsonKey(name: 'organizerPhotos') List<UploadedPhoto> clubPhotos, UploadedPhoto? logoPhoto, List<String> tags,@JsonKey(name: 'followerCount') int memberCount, double rating, int reviewCount,@NullableTimestampConverter() DateTime? nextEventAt, String? nextEventLabel, String? instagramHandle, String? phoneNumber, String? email, ClubLifecycleStatus status, bool archived,@NullableTimestampConverter() DateTime? archivedAt, String? archiveReason, ClubAppVisibility appVisibility, OrganizerOwnership? ownership, OrganizerClaim? claim, OrganizerPublicPage? publicPage, OrganizerProvenance? provenance,@JsonKey(readValue: readOrganizerSupplyCapabilities) OrganizerSupplyCapabilities supplyCapabilities,@JsonKey(name: 'organizerType') OrganizerType organizerType, String? publicCategoryLabel, ClubHostDefaults hostDefaults
});


@override $ClubHostDefaultsCopyWith<$Res> get hostDefaults;

}
/// @nodoc
class __$ClubCopyWithImpl<$Res>
    implements _$ClubCopyWith<$Res> {
  __$ClubCopyWithImpl(this._self, this._then);

  final _Club _self;
  final $Res Function(_Club) _then;

/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? synthetic = null,Object? seedPrefix = freezed,Object? name = null,Object? description = null,Object? location = null,Object? locationCityId = null,Object? locationMarketId = null,Object? area = null,Object? hostUserId = freezed,Object? hostName = freezed,Object? hostAvatarUrl = freezed,Object? ownerUserId = freezed,Object? hostUserIds = null,Object? hostProfiles = null,Object? createdAt = null,Object? imageUrl = freezed,Object? profileImageUrl = freezed,Object? clubPhotos = null,Object? logoPhoto = freezed,Object? tags = null,Object? memberCount = null,Object? rating = null,Object? reviewCount = null,Object? nextEventAt = freezed,Object? nextEventLabel = freezed,Object? instagramHandle = freezed,Object? phoneNumber = freezed,Object? email = freezed,Object? status = null,Object? archived = null,Object? archivedAt = freezed,Object? archiveReason = freezed,Object? appVisibility = null,Object? ownership = freezed,Object? claim = freezed,Object? publicPage = freezed,Object? provenance = freezed,Object? supplyCapabilities = null,Object? organizerType = null,Object? publicCategoryLabel = freezed,Object? hostDefaults = null,}) {
  return _then(_Club(
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
as List<ClubHostProfile>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,imageUrl: freezed == imageUrl ? _self.imageUrl : imageUrl // ignore: cast_nullable_to_non_nullable
as String?,profileImageUrl: freezed == profileImageUrl ? _self.profileImageUrl : profileImageUrl // ignore: cast_nullable_to_non_nullable
as String?,clubPhotos: null == clubPhotos ? _self._clubPhotos : clubPhotos // ignore: cast_nullable_to_non_nullable
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
as ClubLifecycleStatus,archived: null == archived ? _self.archived : archived // ignore: cast_nullable_to_non_nullable
as bool,archivedAt: freezed == archivedAt ? _self.archivedAt : archivedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,archiveReason: freezed == archiveReason ? _self.archiveReason : archiveReason // ignore: cast_nullable_to_non_nullable
as String?,appVisibility: null == appVisibility ? _self.appVisibility : appVisibility // ignore: cast_nullable_to_non_nullable
as ClubAppVisibility,ownership: freezed == ownership ? _self.ownership : ownership // ignore: cast_nullable_to_non_nullable
as OrganizerOwnership?,claim: freezed == claim ? _self.claim : claim // ignore: cast_nullable_to_non_nullable
as OrganizerClaim?,publicPage: freezed == publicPage ? _self.publicPage : publicPage // ignore: cast_nullable_to_non_nullable
as OrganizerPublicPage?,provenance: freezed == provenance ? _self.provenance : provenance // ignore: cast_nullable_to_non_nullable
as OrganizerProvenance?,supplyCapabilities: null == supplyCapabilities ? _self.supplyCapabilities : supplyCapabilities // ignore: cast_nullable_to_non_nullable
as OrganizerSupplyCapabilities,organizerType: null == organizerType ? _self.organizerType : organizerType // ignore: cast_nullable_to_non_nullable
as OrganizerType,publicCategoryLabel: freezed == publicCategoryLabel ? _self.publicCategoryLabel : publicCategoryLabel // ignore: cast_nullable_to_non_nullable
as String?,hostDefaults: null == hostDefaults ? _self.hostDefaults : hostDefaults // ignore: cast_nullable_to_non_nullable
as ClubHostDefaults,
  ));
}

/// Create a copy of Club
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClubHostDefaultsCopyWith<$Res> get hostDefaults {
  
  return $ClubHostDefaultsCopyWith<$Res>(_self.hostDefaults, (value) {
    return _then(_self.copyWith(hostDefaults: value));
  });
}
}


/// @nodoc
mixin _$ClubHostProfile {

 String get uid; String get displayName; String? get avatarUrl; ClubHostRole get role;
/// Create a copy of ClubHostProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClubHostProfileCopyWith<ClubHostProfile> get copyWith => _$ClubHostProfileCopyWithImpl<ClubHostProfile>(this as ClubHostProfile, _$identity);

  /// Serializes this ClubHostProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClubHostProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uid,displayName,avatarUrl,role);

@override
String toString() {
  return 'ClubHostProfile(uid: $uid, displayName: $displayName, avatarUrl: $avatarUrl, role: $role)';
}


}

/// @nodoc
abstract mixin class $ClubHostProfileCopyWith<$Res>  {
  factory $ClubHostProfileCopyWith(ClubHostProfile value, $Res Function(ClubHostProfile) _then) = _$ClubHostProfileCopyWithImpl;
@useResult
$Res call({
 String uid, String displayName, String? avatarUrl, ClubHostRole role
});




}
/// @nodoc
class _$ClubHostProfileCopyWithImpl<$Res>
    implements $ClubHostProfileCopyWith<$Res> {
  _$ClubHostProfileCopyWithImpl(this._self, this._then);

  final ClubHostProfile _self;
  final $Res Function(ClubHostProfile) _then;

/// Create a copy of ClubHostProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uid = null,Object? displayName = null,Object? avatarUrl = freezed,Object? role = null,}) {
  return _then(_self.copyWith(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ClubHostRole,
  ));
}

}


/// Adds pattern-matching-related methods to [ClubHostProfile].
extension ClubHostProfilePatterns on ClubHostProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClubHostProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClubHostProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClubHostProfile value)  $default,){
final _that = this;
switch (_that) {
case _ClubHostProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClubHostProfile value)?  $default,){
final _that = this;
switch (_that) {
case _ClubHostProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String uid,  String displayName,  String? avatarUrl,  ClubHostRole role)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClubHostProfile() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String uid,  String displayName,  String? avatarUrl,  ClubHostRole role)  $default,) {final _that = this;
switch (_that) {
case _ClubHostProfile():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String uid,  String displayName,  String? avatarUrl,  ClubHostRole role)?  $default,) {final _that = this;
switch (_that) {
case _ClubHostProfile() when $default != null:
return $default(_that.uid,_that.displayName,_that.avatarUrl,_that.role);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClubHostProfile implements ClubHostProfile {
  const _ClubHostProfile({required this.uid, required this.displayName, this.avatarUrl, this.role = ClubHostRole.host});
  factory _ClubHostProfile.fromJson(Map<String, dynamic> json) => _$ClubHostProfileFromJson(json);

@override final  String uid;
@override final  String displayName;
@override final  String? avatarUrl;
@override@JsonKey() final  ClubHostRole role;

/// Create a copy of ClubHostProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClubHostProfileCopyWith<_ClubHostProfile> get copyWith => __$ClubHostProfileCopyWithImpl<_ClubHostProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClubHostProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClubHostProfile&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uid,displayName,avatarUrl,role);

@override
String toString() {
  return 'ClubHostProfile(uid: $uid, displayName: $displayName, avatarUrl: $avatarUrl, role: $role)';
}


}

/// @nodoc
abstract mixin class _$ClubHostProfileCopyWith<$Res> implements $ClubHostProfileCopyWith<$Res> {
  factory _$ClubHostProfileCopyWith(_ClubHostProfile value, $Res Function(_ClubHostProfile) _then) = __$ClubHostProfileCopyWithImpl;
@override @useResult
$Res call({
 String uid, String displayName, String? avatarUrl, ClubHostRole role
});




}
/// @nodoc
class __$ClubHostProfileCopyWithImpl<$Res>
    implements _$ClubHostProfileCopyWith<$Res> {
  __$ClubHostProfileCopyWithImpl(this._self, this._then);

  final _ClubHostProfile _self;
  final $Res Function(_ClubHostProfile) _then;

/// Create a copy of ClubHostProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uid = null,Object? displayName = null,Object? avatarUrl = freezed,Object? role = null,}) {
  return _then(_ClubHostProfile(
uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as ClubHostRole,
  ));
}


}

// dart format on
