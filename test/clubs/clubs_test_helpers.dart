import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod/misc.dart' show Override;

Club buildClub({
  String id = 'club-1',
  String name = 'Stride Social',
  String description = 'Morning runners who like easy city loops.',
  String location = 'in-mh-mumbai',
  String? locationCityId,
  String? locationMarketId,
  String area = 'Bandra',
  String? hostUserId = 'host-1',
  String? hostName = 'Host',
  String? hostAvatarUrl,
  String? ownerUserId,
  List<String>? hostUserIds,
  List<ClubHostProfile>? hostProfiles,
  DateTime? createdAt,
  String? imageUrl,
  String? profileImageUrl,
  List<UploadedPhoto> clubPhotos = const [],
  UploadedPhoto? logoPhoto,
  List<String> tags = const ['social'],
  int memberCount = 1,
  double rating = 0,
  int reviewCount = 0,
  DateTime? nextEventAt,
  String? nextEventLabel,
  String? instagramHandle,
  String? phoneNumber,
  String? email,
  ClubHostDefaults? hostDefaults,
  ClubAppVisibility appVisibility = ClubAppVisibility.discoverable,
}) {
  return Club(
    id: id,
    name: name,
    description: description,
    location: location,
    locationCityId: locationCityId ?? _cityIdForMarket(location),
    locationMarketId: locationMarketId ?? location,
    area: area,
    hostUserId: hostUserId,
    hostName: hostName,
    hostAvatarUrl: hostAvatarUrl,
    ownerUserId: ownerUserId,
    hostUserIds: hostUserIds ?? const [],
    hostProfiles: hostProfiles ?? const [],
    createdAt: createdAt ?? DateTime(2025),
    imageUrl: imageUrl,
    profileImageUrl: profileImageUrl,
    clubPhotos: clubPhotos,
    logoPhoto: logoPhoto,
    tags: tags,
    memberCount: memberCount,
    rating: rating,
    reviewCount: reviewCount,
    nextEventAt: nextEventAt,
    nextEventLabel: nextEventLabel,
    instagramHandle: instagramHandle,
    phoneNumber: phoneNumber,
    email: email,
    hostDefaults: hostDefaults ?? const ClubHostDefaults(),
    appVisibility: appVisibility,
  );
}

FakeClubsRepository seededClubsRepository(Club club) =>
    FakeClubsRepository()..clubsById[club.id] = club;

String _cityIdForMarket(String marketId) => switch (marketId) {
  'in-dl-delhi-ncr' => 'in-dl-delhi',
  _ => marketId,
};

UserProfile buildUser({
  required String uid,
  String name = 'Runner',
  String email = 'runner@example.com',
  List<String> photoUrls = const [],
}) {
  return UserProfile(
    uid: uid,
    email: email,
    name: name,
    dateOfBirth: DateTime(1995, 6, 15),
    gender: Gender.man,
    phoneNumber: '+10000000000',
    profileComplete: true,
    interestedInGenders: const [Gender.woman],
    profilePhotos: [
      for (final indexed in photoUrls.indexed)
        ProfilePhoto.uploaded(
          position: indexed.$1,
          url: indexed.$2,
          storagePath: 'test-profiles/$uid/${indexed.$1}.jpg',
          now: DateTime(2026),
        ),
    ],
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(version: currentRunPreferencesVersion),
    ),
  );
}

Event buildEvent({
  String id = 'event-1',
  String clubId = 'club-1',
  DateTime? startTime,
  DateTime? endTime,
  int priceInPaise = 0,
  int? bookedCount,
  int? checkedInCount,
  int? waitlistedCount,
}) {
  final start = startTime ?? DateTime.now().add(const Duration(hours: 2));
  return Event(
    id: id,
    clubId: clubId,
    startTime: start,
    endTime: endTime ?? start.add(const Duration(hours: 1)),
    meetingPoint: 'Start',
    meetingLocation: const EventMeetingLocation(
      name: 'Start',
      latitude: 19.0608,
      longitude: 72.8365,
    ),
    startingPointLat: 19.0608,
    startingPointLng: 72.8365,
    distanceKm: 5,
    pace: PaceLevel.easy,
    capacityLimit: 20,
    description: 'Easy paced event.',
    priceInPaise: priceInPaise,
    bookedCount: bookedCount,
    checkedInCount: checkedInCount,
    waitlistedCount: waitlistedCount,
  );
}

Review buildReview({
  String id = 'review-1',
  String clubId = 'club-1',
  String reviewerUserId = 'runner-1',
  String reviewerName = 'Runner 1',
  int rating = 5,
  String comment = 'Loved it.',
  DateTime? createdAt,
}) {
  return Review(
    id: id,
    organizerId: clubId,
    reviewerUserId: reviewerUserId,
    reviewerName: reviewerName,
    rating: rating,
    comment: comment,
    createdAt: createdAt ?? DateTime(2025, 1, 2),
  );
}

Future<void> pumpTestApp(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: child),
      ),
    ),
  );
  await tester.pump();
}

class FakeClubsRepository implements ClubsRepository {
  String generatedId = 'generated-club-id';
  Completer<String>? createClubCompleter;
  int createClubCallCount = 0;
  String? joinedClubId;
  String? leftClubId;
  String? notificationsClubId;
  String? addedHostClubId;
  String? addedHostUid;
  String? addedHostPhoneNumber;
  String? removedHostClubId;
  String? removedHostUid;
  String? transferredOwnershipClubId;
  String? transferredOwnershipUid;
  String? startedConversationClubId;
  String? startedConversationHostUid;
  String? startedConversationEventId;
  String nextHostConversationMatchId = 'host-inquiry-match-id';
  bool? notificationsEnabled;
  Object? createError;
  Object? joinError;
  Object? leaveError;
  Object? updateError;
  CreateClubCall? lastCreateCall;
  String? lastUpdatedClubId;
  Map<String, dynamic>? lastUpdatedFields;

  final Map<String, Club> clubsById = {};
  final Map<String, List<Club>> clubsByLocation = {};
  final List<List<String>> watchClubsByIdsCalls = [];

  @override
  String generateId() => generatedId;

  @override
  Future<String> createClub({
    String? clubId,
    required String name,
    required String description,
    required String location,
    required String area,
    OrganizerType organizerType = OrganizerType.club,
    String? imageUrl,
    String? profileImageUrl,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    ClubHostDefaults? hostDefaults,
  }) async {
    createClubCallCount += 1;
    if (createError != null) {
      throw createError!;
    }
    final pendingCreate = createClubCompleter;
    if (pendingCreate != null) {
      await pendingCreate.future;
    }
    final resolvedClubId = clubId ?? generatedId;
    lastCreateCall = CreateClubCall(
      clubId: resolvedClubId,
      name: name,
      description: description,
      location: location,
      area: area,
      organizerType: organizerType,
      imageUrl: imageUrl,
      profileImageUrl: profileImageUrl,
      instagramHandle: instagramHandle,
      phoneNumber: phoneNumber,
      email: email,
      hostDefaults: hostDefaults ?? const ClubHostDefaults(),
    );
    return resolvedClubId;
  }

  @override
  Future<Club?> fetchClub(String id) async => clubsById[id];

  @override
  Future<void> joinClub(String clubId) async {
    if (joinError != null) {
      throw joinError!;
    }
    joinedClubId = clubId;
  }

  @override
  Future<void> leaveClub(String clubId) async {
    if (leaveError != null) {
      throw leaveError!;
    }
    leftClubId = clubId;
  }

  @override
  Future<void> setClubPushNotifications({
    required String clubId,
    required bool enabled,
  }) async {
    notificationsClubId = clubId;
    notificationsEnabled = enabled;
  }

  @override
  Future<void> updateClub({
    required String clubId,
    required UpdateClubPatch patch,
  }) async {
    if (updateError != null) {
      throw updateError!;
    }
    lastUpdatedClubId = clubId;
    lastUpdatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
  }

  @override
  Stream<Club?> watchClub(String id) => Stream.value(clubsById[id]);

  @override
  Stream<List<Club>> watchClubsByLocation(String location) =>
      Stream.value(clubsByLocation[location] ?? const []);

  @override
  Stream<List<Club>> watchClubsByLocationSortedByRating(String location) {
    final clubs = <Club>[...(clubsByLocation[location] ?? const <Club>[])]
      ..sort((a, b) => b.rating.compareTo(a.rating));
    return Stream.value(clubs);
  }

  @override
  Stream<List<Club>> watchClubsHostedBy(String uid) => Stream.value(
    clubsById.values.where((club) => club.isHostedBy(uid)).toList(),
  );

  @override
  Stream<List<Club>> watchClubsOwnedBy(String uid) => Stream.value(
    clubsById.values.where((club) => club.isOwnedBy(uid)).toList(),
  );

  @override
  Stream<List<Club>> watchClubsByIds({required List<String> clubIds}) {
    watchClubsByIdsCalls.add(List.unmodifiable(clubIds));
    return Stream.value([
      for (final id in clubIds)
        if (clubsById[id] != null) clubsById[id]!,
    ]);
  }

  @override
  Stream<List<Club>> watchClubsForMessagingByIds({
    required List<String> clubIds,
  }) {
    watchClubsByIdsCalls.add(List.unmodifiable(clubIds));
    return Stream.value([
      for (final id in clubIds)
        if (clubsById[id] != null) clubsById[id]!,
    ]);
  }

  @override
  Future<void> addClubHost({
    required String clubId,
    String? uid,
    String? phoneNumber,
  }) async {
    addedHostClubId = clubId;
    addedHostUid = uid;
    addedHostPhoneNumber = phoneNumber;
  }

  @override
  Future<void> removeClubHost({
    required String clubId,
    required String uid,
  }) async {
    removedHostClubId = clubId;
    removedHostUid = uid;
  }

  @override
  Future<void> transferClubOwnership({
    required String clubId,
    required String uid,
  }) async {
    transferredOwnershipClubId = clubId;
    transferredOwnershipUid = uid;
  }

  @override
  Future<String> startOrganizerConversation({
    required String organizerId,
    required String hostUid,
    String? eventId,
  }) async {
    startedConversationClubId = organizerId;
    startedConversationHostUid = hostUid;
    startedConversationEventId = eventId;
    return nextHostConversationMatchId;
  }
}

class CreateClubCall {
  const CreateClubCall({
    required this.clubId,
    required this.name,
    required this.description,
    required this.location,
    required this.area,
    this.organizerType = OrganizerType.club,
    this.imageUrl,
    this.profileImageUrl,
    this.instagramHandle,
    this.phoneNumber,
    this.email,
    this.hostDefaults = const ClubHostDefaults(),
  });

  final String clubId;
  final String name;
  final String description;
  final String location;
  final String area;
  final OrganizerType organizerType;
  final String? imageUrl;
  final String? profileImageUrl;
  final String? instagramHandle;
  final String? phoneNumber;
  final String? email;
  final ClubHostDefaults hostDefaults;
}

class FakeImageUploadRepository implements ImageUploadRepository {
  FakeImageUploadRepository({
    this.pickedImage,
    List<XFile>? pickedImages,
    this.uploadResult = 'https://example.com/club-cover.jpg',
  }) : pickedImages = pickedImages ?? const [];

  XFile? pickedImage;
  List<XFile> pickedImages;
  Object? pickError;
  Object? uploadError;
  String uploadResult;
  String? lastUploadUid;
  String? lastUploadClubId;
  String? lastUploadEventId;
  int? lastUploadPosition;
  XFile? lastUploadedImage;
  final uploadedClubPhotoPositions = <int>[];
  final uploadedClubPhotoImages = <XFile>[];
  final uploadedClubMediaIds = <String>[];
  final failingClubMediaIds = <String>{};

  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async {
    if (pickError != null) {
      throw pickError!;
    }
    return pickedImage;
  }

  @override
  Future<List<XFile>> pickImages({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
    int? limit,
  }) async {
    if (pickError != null) {
      throw pickError!;
    }
    return limit == null ? pickedImages : pickedImages.take(limit).toList();
  }

  @override
  Future<String> upload({
    required String storagePath,
    required XFile image,
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadedImage = image;
    return uploadResult;
  }

  @override
  Future<UploadedImage> uploadWithMetadata({
    required String storagePath,
    required XFile image,
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    Map<String, String>? customMetadata,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
    bool requireJpeg = false,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadedImage = image;
    return UploadedImage(url: uploadResult, storagePath: '$storagePath.jpg');
  }

  @override
  Future<UploadedImage> uploadClubPhoto({
    String? uid,
    required String clubId,
    required int position,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    if (mediaId != null) uploadedClubMediaIds.add(mediaId);
    if (mediaId != null && failingClubMediaIds.remove(mediaId)) {
      throw StateError('upload failed for $mediaId');
    }
    lastUploadUid = uid;
    lastUploadClubId = clubId;
    lastUploadPosition = position;
    lastUploadedImage = image;
    uploadedClubPhotoPositions.add(position);
    uploadedClubPhotoImages.add(image);
    onProgress?.call(
      const ImageUploadProgress(
        stage: ImageUploadJobStage.uploading,
        fraction: 1,
      ),
    );
    final resolvedMediaId = mediaId ?? 'test-media';
    return UploadedImage(
      url: uploadResult,
      storagePath: 'organizers/$clubId/media/$resolvedMediaId/original.jpg',
    );
  }

  @override
  Future<UploadedImage> uploadClubLogo({
    String? uid,
    required String clubId,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadUid = uid;
    lastUploadClubId = clubId;
    lastUploadPosition = 0;
    lastUploadedImage = image;
    onProgress?.call(
      const ImageUploadProgress(
        stage: ImageUploadJobStage.uploading,
        fraction: 1,
      ),
    );
    final resolvedMediaId = mediaId ?? 'test-logo';
    return UploadedImage(
      url: uploadResult,
      storagePath: 'organizers/$clubId/logo/$resolvedMediaId/original.jpg',
    );
  }

  @override
  Future<String> uploadClubCover({
    required String uid,
    required String clubId,
    required XFile image,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadUid = uid;
    lastUploadClubId = clubId;
    lastUploadedImage = image;
    return uploadResult;
  }

  @override
  Future<String> uploadClubProfileImage({
    required String uid,
    required String clubId,
    required XFile image,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadUid = uid;
    lastUploadClubId = clubId;
    lastUploadedImage = image;
    return uploadResult;
  }

  @override
  Future<String> uploadEventPhoto({
    String? uid,
    String? clubId,
    required String eventId,
    int position = 0,
    required XFile image,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadUid = uid;
    lastUploadClubId = clubId;
    lastUploadEventId = eventId;
    lastUploadPosition = position;
    lastUploadedImage = image;
    return uploadResult;
  }

  @override
  Future<UploadedImage> uploadEventPhotoForRecovery({
    required String eventId,
    required int position,
    required XFile image,
    required String mediaId,
  }) => uploadEventPhotoWithMetadata(
    eventId: eventId,
    position: position,
    image: image,
    mediaId: mediaId,
  );

  @override
  Future<UploadedImage> uploadEventPhotoWithMetadata({
    required String eventId,
    required int position,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadEventId = eventId;
    lastUploadPosition = position;
    lastUploadedImage = image;
    final resolvedMediaId = mediaId ?? 'test-media';
    return UploadedImage(
      url: uploadResult,
      storagePath: 'events/$eventId/media/$resolvedMediaId/original.jpg',
    );
  }

  @override
  Future<String> uploadUserPhoto({
    required String uid,
    required int index,
    required XFile image,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadedImage = image;
    return uploadResult;
  }

  @override
  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadedImage = image;
    return UploadedImage(
      url: uploadResult,
      storagePath: 'users/$uid/photos/${index}_test.jpg',
    );
  }

  @override
  Future<String> uploadChatImage({
    required String matchId,
    required String messageId,
    required String uploaderUid,
    required XFile image,
  }) async => (await uploadChatImageWithMetadata(
    matchId: matchId,
    messageId: messageId,
    uploaderUid: uploaderUid,
    image: image,
  )).url;

  @override
  Future<UploadedImage> uploadChatImageWithMetadata({
    required String matchId,
    required String messageId,
    required String uploaderUid,
    required XFile image,
  }) async {
    if (uploadError != null) {
      throw uploadError!;
    }
    lastUploadedImage = image;
    return UploadedImage(
      url: uploadResult,
      storagePath: 'matches/$matchId/images/${messageId}_test.jpg',
    );
  }

  final deletedStoragePaths = <String>[];

  @override
  Future<void> deleteByPathChecked(String storagePath) =>
      deleteByPath(storagePath);

  @override
  Future<void> deleteByPath(String storagePath) async {
    deletedStoragePaths.add(storagePath);
  }
}

class TestNavigatorObserver extends NavigatorObserver {
  final poppedRoutes = <Route<dynamic>>[];

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    poppedRoutes.add(route);
    super.didPop(route, previousRoute);
  }
}
