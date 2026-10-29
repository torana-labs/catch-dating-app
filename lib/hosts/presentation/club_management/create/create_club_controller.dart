import 'dart:typed_data';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_club_controller.g.dart';

class PickedClubImage {
  const PickedClubImage({required this.image, required this.bytes});

  final XFile image;
  final Uint8List bytes;
}

class PickedClubPhoto extends PickedClubImage {
  const PickedClubPhoto({required super.image, required super.bytes});
}

class PickedClubProfileImage extends PickedClubImage {
  const PickedClubProfileImage({required super.image, required super.bytes});
}

sealed class ClubPhotoInput {
  const ClubPhotoInput();
}

final class ExistingClubPhotoInput extends ClubPhotoInput {
  const ExistingClubPhotoInput(this.photo);

  final UploadedPhoto photo;
}

final class NewClubPhotoInput extends ClubPhotoInput {
  const NewClubPhotoInput(this.image);

  final XFile image;
}

/// **Pattern A: Action controller + static Mutations**
///
/// Handles create and edit club submission. [submitMutation] tracks the
/// lifecycle of the async submit operation. The UI watches
/// `ref.watch(createClubControllerProvider.submitMutation)`.
@riverpod
class CreateClubController extends _$CreateClubController {
  static final submitMutation = Mutation<void>();

  Future<void>? _submitInFlight;

  @override
  void build() {}

  Future<List<PickedClubPhoto>> pickClubPhotos({
    int imageQuality = 85,
    int? limit,
  }) async {
    final images = await ref
        .read(imageUploadRepositoryProvider)
        .pickImages(
          purpose: ImageUploadPurpose.clubPhoto,
          imageQuality: imageQuality,
          limit: limit,
        );
    return [
      for (final image in images)
        PickedClubPhoto(image: image, bytes: await image.readAsBytes()),
    ];
  }

  Future<PickedClubProfileImage?> pickProfileImage({
    int imageQuality = 85,
  }) async {
    final image = await ref
        .read(imageUploadRepositoryProvider)
        .pickImage(
          purpose: ImageUploadPurpose.clubProfileImage,
          imageQuality: imageQuality,
        );
    if (image == null) {
      return null;
    }

    return PickedClubProfileImage(
      image: image,
      bytes: await image.readAsBytes(),
    );
  }

  Future<void> submit({
    required String name,
    required String location,
    required String area,
    required String description,
    OrganizerType organizerType = OrganizerType.club,
    List<ClubPhotoInput>? clubPhotoInputs,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    ClubHostDefaults hostDefaults = const ClubHostDefaults(),
    XFile? profileImage,
  }) {
    final existingRequest = _submitInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<void> trackedRequest;
    trackedRequest =
        _submit(
          name: name,
          location: location,
          area: area,
          description: description,
          organizerType: organizerType,
          clubPhotoInputs: clubPhotoInputs,
          instagramHandle: instagramHandle,
          phoneNumber: phoneNumber,
          email: email,
          hostDefaults: hostDefaults,
          profileImage: profileImage,
        ).whenComplete(() {
          if (identical(_submitInFlight, trackedRequest)) {
            _submitInFlight = null;
          }
        });
    _submitInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> _submit({
    required String name,
    required String location,
    required String area,
    required String description,
    required OrganizerType organizerType,
    required List<ClubPhotoInput>? clubPhotoInputs,
    required String? instagramHandle,
    required String? phoneNumber,
    required String? email,
    required ClubHostDefaults hostDefaults,
    required XFile? profileImage,
  }) async {
    final uid = requireSignedInUid(ref, action: 'create an organizer');

    final clubsRepo = ref.read(clubsRepositoryProvider);
    final selectedClubPhotoInputs = clubPhotoInputs ?? const <ClubPhotoInput>[];
    final reservedClubId =
        selectedClubPhotoInputs.isNotEmpty || profileImage != null
        ? clubsRepo.generateId()
        : null;
    final reportCreated = ref
        .read(appAnalyticsProvider)
        .hostEventCompletion(AnalyticsEvents.hostClubCreated);
    final createdClubId = await clubsRepo.createClub(
      clubId: reservedClubId,
      name: name,
      description: description,
      location: location,
      area: area,
      organizerType: organizerType,
      instagramHandle: instagramHandle,
      phoneNumber: phoneNumber,
      email: email,
      hostDefaults: hostDefaults,
    );

    reportCreated();
    final newStoragePaths = <String>[];
    try {
      String? uploadedPrimaryPhoto;
      String? uploadedProfile;
      var clubPhotos = <UploadedPhoto>[];
      UploadedPhoto? logoPhoto;
      if (selectedClubPhotoInputs.isNotEmpty) {
        clubPhotos = await _resolveClubPhotoInputs(
          uid: uid,
          clubId: createdClubId,
          inputs: selectedClubPhotoInputs,
          newStoragePaths: newStoragePaths,
        );
        uploadedPrimaryPhoto = _primaryPhotoUrl(clubPhotos);
      }
      if (profileImage != null) {
        final upload = await ref
            .read(imageUploadRepositoryProvider)
            .uploadClubLogo(
              uid: uid,
              clubId: createdClubId,
              image: profileImage,
            );
        newStoragePaths.add(upload.storagePath);
        logoPhoto = UploadedPhoto.fromUpload(
          url: upload.url,
          storagePath: upload.storagePath,
          position: 0,
        );
        uploadedProfile = logoPhoto.url;
      }
      if (uploadedPrimaryPhoto != null || uploadedProfile != null) {
        final patch = <String, Object?>{};
        if (uploadedPrimaryPhoto != null) {
          patch['imageUrl'] = uploadedPrimaryPhoto;
          patch['clubPhotos'] = clubPhotos
              .map((photo) => photo.toJson())
              .toList(growable: false);
        }
        if (uploadedProfile != null) {
          patch['profileImageUrl'] = uploadedProfile;
          patch['logoPhoto'] = logoPhoto?.toJson();
        }
        await clubsRepo.updateClub(
          clubId: createdClubId,
          patch: UpdateClubPatch.raw(patch),
        );
      }
    } catch (_) {
      for (final path in newStoragePaths) {
        try {
          await ref.read(imageUploadRepositoryProvider).deleteByPath(path);
        } catch (_) {
          // Preserve the create failure; cleanup is best effort.
        }
      }
      rethrow;
    }
  }

  Future<List<UploadedPhoto>> _resolveClubPhotoInputs({
    required String uid,
    required String clubId,
    required List<ClubPhotoInput> inputs,
    required List<String> newStoragePaths,
  }) async {
    final photos = <UploadedPhoto>[];
    for (final indexedInput in inputs.indexed) {
      final position = indexedInput.$1;
      switch (indexedInput.$2) {
        case ExistingClubPhotoInput(:final photo):
          photos.add(
            photo.copyWith(position: position, updatedAt: DateTime.now()),
          );
        case NewClubPhotoInput(:final image):
          final upload = await ref
              .read(imageUploadRepositoryProvider)
              .uploadClubPhoto(
                uid: uid,
                clubId: clubId,
                position: position,
                image: image,
              );
          newStoragePaths.add(upload.storagePath);
          photos.add(
            UploadedPhoto.fromUpload(
              url: upload.url,
              storagePath: upload.storagePath,
              position: position,
            ),
          );
      }
    }
    return photos;
  }
}

String? _primaryPhotoUrl(List<UploadedPhoto> photos) =>
    photos.isEmpty ? null : photos.first.url;
