import 'dart:typed_data';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_organizer_controller.g.dart';

class PickedOrganizerImage {
  const PickedOrganizerImage({required this.image, required this.bytes});

  final XFile image;
  final Uint8List bytes;
}

class PickedOrganizerPhoto extends PickedOrganizerImage {
  const PickedOrganizerPhoto({required super.image, required super.bytes});
}

class PickedOrganizerProfileImage extends PickedOrganizerImage {
  const PickedOrganizerProfileImage({
    required super.image,
    required super.bytes,
  });
}

sealed class OrganizerPhotoInput {
  const OrganizerPhotoInput();
}

final class ExistingOrganizerPhotoInput extends OrganizerPhotoInput {
  const ExistingOrganizerPhotoInput(this.photo);

  final UploadedPhoto photo;
}

final class NewOrganizerPhotoInput extends OrganizerPhotoInput {
  const NewOrganizerPhotoInput(this.image);

  final XFile image;
}

/// **Pattern A: Action controller + static Mutations**
///
/// Handles create and edit club submission. [submitMutation] tracks the
/// lifecycle of the async submit operation. The UI watches
/// `ref.watch(createOrganizerControllerProvider.submitMutation)`.
@riverpod
class CreateOrganizerController extends _$CreateOrganizerController {
  static final submitMutation = Mutation<void>();

  Future<void>? _submitInFlight;

  @override
  void build() {}

  Future<List<PickedOrganizerPhoto>> pickOrganizerPhotos({
    int imageQuality = 85,
    int? limit,
  }) async {
    final images = await ref
        .read(imageUploadRepositoryProvider)
        .pickImages(
          purpose: ImageUploadPurpose.organizerPhoto,
          imageQuality: imageQuality,
          limit: limit,
        );
    return [
      for (final image in images)
        PickedOrganizerPhoto(image: image, bytes: await image.readAsBytes()),
    ];
  }

  Future<PickedOrganizerProfileImage?> pickProfileImage({
    int imageQuality = 85,
  }) async {
    final image = await ref
        .read(imageUploadRepositoryProvider)
        .pickImage(
          purpose: ImageUploadPurpose.organizerProfileImage,
          imageQuality: imageQuality,
        );
    if (image == null) {
      return null;
    }

    return PickedOrganizerProfileImage(
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
    List<OrganizerPhotoInput>? organizerPhotoInputs,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    OrganizerHostDefaults hostDefaults = const OrganizerHostDefaults(),
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
          organizerPhotoInputs: organizerPhotoInputs,
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
    required List<OrganizerPhotoInput>? organizerPhotoInputs,
    required String? instagramHandle,
    required String? phoneNumber,
    required String? email,
    required OrganizerHostDefaults hostDefaults,
    required XFile? profileImage,
  }) async {
    final uid = requireSignedInUid(ref, action: 'create an organizer');

    final organizersRepo = ref.read(organizersRepositoryProvider);
    final selectedOrganizerPhotoInputs =
        organizerPhotoInputs ?? const <OrganizerPhotoInput>[];
    final reservedOrganizerId =
        selectedOrganizerPhotoInputs.isNotEmpty || profileImage != null
        ? organizersRepo.generateId()
        : null;
    final reportCreated = ref
        .read(appAnalyticsProvider)
        .hostEventCompletion(AnalyticsEvents.hostOrganizerCreated);
    final createdOrganizerId = await organizersRepo.createOrganizer(
      organizerId: reservedOrganizerId,
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
      var organizerPhotos = <UploadedPhoto>[];
      UploadedPhoto? logoPhoto;
      if (selectedOrganizerPhotoInputs.isNotEmpty) {
        organizerPhotos = await _resolveOrganizerPhotoInputs(
          uid: uid,
          organizerId: createdOrganizerId,
          inputs: selectedOrganizerPhotoInputs,
          newStoragePaths: newStoragePaths,
        );
        uploadedPrimaryPhoto = _primaryPhotoUrl(organizerPhotos);
      }
      if (profileImage != null) {
        final upload = await ref
            .read(imageUploadRepositoryProvider)
            .uploadOrganizerLogo(
              uid: uid,
              organizerId: createdOrganizerId,
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
          patch['organizerPhotos'] = organizerPhotos
              .map((photo) => photo.toJson())
              .toList(growable: false);
        }
        if (uploadedProfile != null) {
          patch['profileImageUrl'] = uploadedProfile;
          patch['logoPhoto'] = logoPhoto?.toJson();
        }
        await organizersRepo.updateOrganizer(
          organizerId: createdOrganizerId,
          patch: UpdateOrganizerPatch.raw(patch),
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

  Future<List<UploadedPhoto>> _resolveOrganizerPhotoInputs({
    required String uid,
    required String organizerId,
    required List<OrganizerPhotoInput> inputs,
    required List<String> newStoragePaths,
  }) async {
    final photos = <UploadedPhoto>[];
    for (final indexedInput in inputs.indexed) {
      final position = indexedInput.$1;
      switch (indexedInput.$2) {
        case ExistingOrganizerPhotoInput(:final photo):
          photos.add(
            photo.copyWith(position: position, updatedAt: DateTime.now()),
          );
        case NewOrganizerPhotoInput(:final image):
          final upload = await ref
              .read(imageUploadRepositoryProvider)
              .uploadOrganizerPhoto(
                uid: uid,
                organizerId: organizerId,
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
