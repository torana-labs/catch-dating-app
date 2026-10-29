// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Club _$ClubFromJson(Map<String, dynamic> json) => _Club(
  id: json['id'] as String,
  synthetic: json['synthetic'] as bool? ?? false,
  seedPrefix: json['seedPrefix'] as String?,
  name: json['name'] as String,
  description: json['description'] as String,
  location: json['location'] as String,
  locationCityId: json['locationCityId'] as String? ?? '',
  locationMarketId: json['locationMarketId'] as String? ?? '',
  area: json['area'] as String,
  hostUserId: json['hostUserId'] as String?,
  hostName: json['hostName'] as String?,
  hostAvatarUrl: json['hostAvatarUrl'] as String?,
  ownerUserId: json['ownerUserId'] as String?,
  hostUserIds:
      (json['hostUserIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
  hostProfiles:
      (json['hostProfiles'] as List<dynamic>?)
          ?.map((e) => ClubHostProfile.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  imageUrl: json['imageUrl'] as String?,
  profileImageUrl: json['profileImageUrl'] as String?,
  clubPhotos:
      (json['organizerPhotos'] as List<dynamic>?)
          ?.map((e) => UploadedPhoto.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  logoPhoto: json['logoPhoto'] == null
      ? null
      : UploadedPhoto.fromJson(json['logoPhoto'] as Map<String, dynamic>),
  tags:
      (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
  memberCount: (json['followerCount'] as num?)?.toInt() ?? 0,
  rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
  reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
  nextEventAt: const NullableTimestampConverter().fromJson(json['nextEventAt']),
  nextEventLabel: json['nextEventLabel'] as String?,
  instagramHandle: json['instagramHandle'] as String?,
  phoneNumber: json['phoneNumber'] as String?,
  email: json['email'] as String?,
  status:
      $enumDecodeNullable(_$ClubLifecycleStatusEnumMap, json['status']) ??
      ClubLifecycleStatus.active,
  archived: json['archived'] as bool? ?? false,
  archivedAt: const NullableTimestampConverter().fromJson(json['archivedAt']),
  archiveReason: json['archiveReason'] as String?,
  appVisibility:
      $enumDecodeNullable(_$ClubAppVisibilityEnumMap, json['appVisibility']) ??
      ClubAppVisibility.hidden,
  ownership: json['ownership'] == null
      ? null
      : OrganizerOwnership.fromJson(json['ownership'] as Map<String, dynamic>),
  claim: json['claim'] == null
      ? null
      : OrganizerClaim.fromJson(json['claim'] as Map<String, dynamic>),
  publicPage: json['publicPage'] == null
      ? null
      : OrganizerPublicPage.fromJson(
          json['publicPage'] as Map<String, dynamic>,
        ),
  provenance: json['provenance'] == null
      ? null
      : OrganizerProvenance.fromJson(
          json['provenance'] as Map<String, dynamic>,
        ),
  supplyCapabilities:
      readOrganizerSupplyCapabilities(json, 'supplyCapabilities') == null
      ? const OrganizerSupplyCapabilities.claimedManaged()
      : OrganizerSupplyCapabilities.fromJson(
          readOrganizerSupplyCapabilities(json, 'supplyCapabilities')
              as Map<String, dynamic>,
        ),
  organizerType:
      $enumDecodeNullable(_$OrganizerTypeEnumMap, json['organizerType']) ??
      OrganizerType.club,
  publicCategoryLabel: json['publicCategoryLabel'] as String?,
  hostDefaults: json['hostDefaults'] == null
      ? const ClubHostDefaults()
      : ClubHostDefaults.fromJson(json['hostDefaults'] as Map<String, dynamic>),
);

Map<String, dynamic> _$ClubToJson(_Club instance) => <String, dynamic>{
  'name': instance.name,
  'description': instance.description,
  'location': instance.location,
  'locationCityId': instance.locationCityId,
  'locationMarketId': instance.locationMarketId,
  'area': instance.area,
  'hostUserId': instance.hostUserId,
  'hostName': instance.hostName,
  'hostAvatarUrl': instance.hostAvatarUrl,
  'ownerUserId': instance.ownerUserId,
  'hostUserIds': instance.hostUserIds,
  'hostProfiles': instance.hostProfiles.map((e) => e.toJson()).toList(),
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'imageUrl': instance.imageUrl,
  'profileImageUrl': instance.profileImageUrl,
  'organizerPhotos': instance.clubPhotos.map((e) => e.toJson()).toList(),
  'logoPhoto': instance.logoPhoto?.toJson(),
  'tags': instance.tags,
  'followerCount': instance.memberCount,
  'rating': instance.rating,
  'reviewCount': instance.reviewCount,
  'nextEventAt': const NullableTimestampConverter().toJson(
    instance.nextEventAt,
  ),
  'nextEventLabel': instance.nextEventLabel,
  'instagramHandle': instance.instagramHandle,
  'phoneNumber': instance.phoneNumber,
  'email': instance.email,
  'status': _$ClubLifecycleStatusEnumMap[instance.status]!,
  'archived': instance.archived,
  'archivedAt': const NullableTimestampConverter().toJson(instance.archivedAt),
  'archiveReason': instance.archiveReason,
  'appVisibility': _$ClubAppVisibilityEnumMap[instance.appVisibility]!,
  'ownership': instance.ownership?.toJson(),
  'claim': instance.claim?.toJson(),
  'publicPage': instance.publicPage?.toJson(),
  'provenance': instance.provenance?.toJson(),
  'supplyCapabilities': instance.supplyCapabilities.toJson(),
  'organizerType': _$OrganizerTypeEnumMap[instance.organizerType]!,
  'publicCategoryLabel': instance.publicCategoryLabel,
  'hostDefaults': instance.hostDefaults.toJson(),
};

const _$ClubLifecycleStatusEnumMap = {
  ClubLifecycleStatus.active: 'active',
  ClubLifecycleStatus.archived: 'archived',
};

const _$ClubAppVisibilityEnumMap = {
  ClubAppVisibility.discoverable: 'discoverable',
  ClubAppVisibility.hidden: 'hidden',
};

const _$OrganizerTypeEnumMap = {
  OrganizerType.club: 'club',
  OrganizerType.community: 'community',
  OrganizerType.individual: 'individual',
  OrganizerType.eventProducer: 'eventProducer',
  OrganizerType.venue: 'venue',
  OrganizerType.brand: 'brand',
};

_ClubHostProfile _$ClubHostProfileFromJson(Map<String, dynamic> json) =>
    _ClubHostProfile(
      uid: json['uid'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      role:
          $enumDecodeNullable(_$ClubHostRoleEnumMap, json['role']) ??
          ClubHostRole.host,
    );

Map<String, dynamic> _$ClubHostProfileToJson(_ClubHostProfile instance) =>
    <String, dynamic>{
      'uid': instance.uid,
      'displayName': instance.displayName,
      'avatarUrl': instance.avatarUrl,
      'role': _$ClubHostRoleEnumMap[instance.role]!,
    };

const _$ClubHostRoleEnumMap = {
  ClubHostRole.owner: 'owner',
  ClubHostRole.host: 'host',
};
