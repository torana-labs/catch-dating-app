import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/organizers/domain/organizer_supply_capabilities.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'club.freezed.dart';
part 'club.g.dart';

enum ClubLifecycleStatus { active, archived }

enum ClubAppVisibility { discoverable, hidden }

/// Canonical organizer classification shared by clubs, communities,
/// individuals, event producers, venues, and brands.
enum OrganizerType { club, community, individual, eventProducer, venue, brand }

@freezed
abstract class Club with _$Club {
  const Club._();

  const factory Club({
    @JsonKey(includeToJson: false) required String id,
    @JsonKey(includeToJson: false) @Default(false) bool synthetic,
    @JsonKey(includeToJson: false) String? seedPrefix,
    required String name,
    required String description,
    required String location,
    @Default('') String locationCityId,
    @Default('') String locationMarketId,
    required String area,
    String? hostUserId,
    String? hostName,
    String? hostAvatarUrl,
    String? ownerUserId,
    @Default([]) List<String> hostUserIds,
    @Default([]) List<ClubHostProfile> hostProfiles,
    @TimestampConverter() required DateTime createdAt,
    String? imageUrl,
    String? profileImageUrl,
    @JsonKey(name: 'organizerPhotos')
    @Default([])
    List<UploadedPhoto> clubPhotos,
    UploadedPhoto? logoPhoto,
    @Default([]) List<String> tags,
    @JsonKey(name: 'followerCount') @Default(0) int memberCount,
    @Default(0.0) double rating,
    @Default(0) int reviewCount,
    @NullableTimestampConverter() DateTime? nextEventAt,
    String? nextEventLabel,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    @Default(ClubLifecycleStatus.active) ClubLifecycleStatus status,
    @Default(false) bool archived,
    @NullableTimestampConverter() DateTime? archivedAt,
    String? archiveReason,
    @Default(ClubAppVisibility.hidden) ClubAppVisibility appVisibility,
    OrganizerOwnership? ownership,
    OrganizerClaim? claim,
    OrganizerPublicPage? publicPage,
    OrganizerProvenance? provenance,
    @JsonKey(readValue: readOrganizerSupplyCapabilities)
    @Default(OrganizerSupplyCapabilities.claimedManaged())
    OrganizerSupplyCapabilities supplyCapabilities,
    @JsonKey(name: 'organizerType')
    @Default(OrganizerType.club)
    OrganizerType organizerType,
    String? publicCategoryLabel,
    @Default(ClubHostDefaults()) ClubHostDefaults hostDefaults,
  }) = _Club;

  factory Club.fromJson(Map<String, dynamic> json) => _$ClubFromJson(json);

  String? get ownerOrPrimaryHostUserId => ownerUserId ?? hostUserId;

  String get displayHostName {
    final trimmedHostName = hostName?.trim();
    if (trimmedHostName != null && trimmedHostName.isNotEmpty) {
      return trimmedHostName;
    }
    return name;
  }

  bool isOwnedBy(String? uid) => uid != null && uid == ownerOrPrimaryHostUserId;

  bool isHostedBy(String? uid) {
    if (uid == null) return false;
    // Match callable and rule authority. Display profiles may outlive a seat.
    return uid == hostUserId || uid == ownerUserId || hostUserIds.contains(uid);
  }

  List<ClubHostProfile> get displayHostProfiles {
    if (hostProfiles.isNotEmpty) return hostProfiles;
    final primaryHostUserId = hostUserId;
    if (primaryHostUserId == null) return const [];
    return [
      ClubHostProfile(
        uid: primaryHostUserId,
        displayName: displayHostName,
        avatarUrl: hostAvatarUrl,
        role: ClubHostRole.owner,
      ),
    ];
  }

  String? get primaryClubPhotoUrl {
    if (clubPhotos.isNotEmpty) return clubPhotos.first.url;
    return imageUrl;
  }

  List<UploadedPhoto> get organizerPhotos => clubPhotos;

  int get followerCount => memberCount;

  String? get logoPhotoUrl => logoPhoto?.thumbnailOrUrl ?? profileImageUrl;

  bool get isAppDiscoverable =>
      appVisibility == ClubAppVisibility.discoverable &&
      status == ClubLifecycleStatus.active &&
      !archived;

  OrganizerAuthority get organizerAuthority => OrganizerAuthority.resolve(
    hasLegacyOwner:
        ownerOrPrimaryHostUserId != null ||
        hostUserIds.isNotEmpty ||
        hostProfiles.isNotEmpty,
    ownership: ownership,
    claim: claim,
    publicPage: publicPage,
    provenance: provenance,
  );

  /// Public consumer routes require both app visibility and an authority state
  /// that has not been suppressed or removed. Web publication/indexing remains
  /// a separate capability because QA/noindex pages may still be previewed.
  bool get isPubliclyBrowseable =>
      !synthetic && isAppDiscoverable && !organizerAuthority.blocksPublicRead;
}

enum ClubHostRole { owner, host }

@freezed
abstract class ClubHostProfile with _$ClubHostProfile {
  const factory ClubHostProfile({
    required String uid,
    required String displayName,
    String? avatarUrl,
    @Default(ClubHostRole.host) ClubHostRole role,
  }) = _ClubHostProfile;

  factory ClubHostProfile.fromJson(Map<String, dynamic> json) =>
      _$ClubHostProfileFromJson(json);
}
