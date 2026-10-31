import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_edit_controller.g.dart';

@riverpod
HostOrganizerEditActions hostOrganizerEditController(Ref ref) =>
    HostOrganizerEditController(ref);

abstract interface class HostOrganizerEditActions {
  Future<void> updateOrganizer({
    required String organizerId,
    required UpdateOrganizerPatch patch,
  });

  Future<List<HostPickedOrganizerPhoto>> pickOrganizerPhotos({int? limit});

  Future<HostPickedOrganizerLogo?> pickOrganizerLogo();

  Future<HostOrganizerMediaSaveResult> updateOrganizerMedia({
    required Organizer organizer,
    List<HostOrganizerMediaInput>? photoInputs,
    HostPickedOrganizerLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostOrganizerMediaProgress>? onProgress,
  });

  Future<void> discardOrganizerMedia({
    required List<HostOrganizerMediaInput> photoInputs,
    HostPickedOrganizerLogo? logo,
  });
}

class HostPickedOrganizerPhoto {
  const HostPickedOrganizerPhoto({
    required this.id,
    required this.image,
    required this.bytes,
  });

  final String id;
  final XFile image;
  final Uint8List bytes;
}

class HostPickedOrganizerLogo {
  const HostPickedOrganizerLogo({
    required this.id,
    required this.image,
    required this.bytes,
    this.uploadedPhoto,
  });

  final String id;
  final XFile image;
  final Uint8List bytes;
  final UploadedPhoto? uploadedPhoto;

  HostPickedOrganizerLogo copyWith({UploadedPhoto? uploadedPhoto}) =>
      HostPickedOrganizerLogo(
        id: id,
        image: image,
        bytes: bytes,
        uploadedPhoto: uploadedPhoto ?? this.uploadedPhoto,
      );
}

sealed class HostOrganizerMediaInput {
  const HostOrganizerMediaInput();

  String get id;
  UploadedPhoto get resolvedPhoto;
}

final class HostExistingOrganizerPhotoInput extends HostOrganizerMediaInput {
  const HostExistingOrganizerPhotoInput(this.photo);

  final UploadedPhoto photo;

  @override
  String get id => photo.id;

  @override
  UploadedPhoto get resolvedPhoto => photo;
}

final class HostNewOrganizerPhotoInput extends HostOrganizerMediaInput {
  const HostNewOrganizerPhotoInput({
    required this.id,
    required this.image,
    this.uploadedPhoto,
  });

  @override
  final String id;
  final XFile image;
  final UploadedPhoto? uploadedPhoto;

  bool get isUploaded => uploadedPhoto != null;

  HostNewOrganizerPhotoInput copyWith({UploadedPhoto? uploadedPhoto}) =>
      HostNewOrganizerPhotoInput(
        id: id,
        image: image,
        uploadedPhoto: uploadedPhoto ?? this.uploadedPhoto,
      );

  HostNewOrganizerPhotoInput clearUpload() =>
      HostNewOrganizerPhotoInput(id: id, image: image);

  @override
  UploadedPhoto get resolvedPhoto => uploadedPhoto!;
}

class HostOrganizerMediaProgress {
  const HostOrganizerMediaProgress({required this.id, required this.state});

  final String id;
  final ImageUploadJobState state;
}

class HostOrganizerMediaSaveResult {
  const HostOrganizerMediaSaveResult({
    required this.photoInputs,
    required this.logo,
    required this.failures,
    required this.attached,
  });

  final List<HostOrganizerMediaInput>? photoInputs;
  final HostPickedOrganizerLogo? logo;
  final Map<String, Object> failures;
  final bool attached;

  bool get hasFailures => failures.isNotEmpty;
}

class HostOrganizerEditController implements HostOrganizerEditActions {
  const HostOrganizerEditController(this._ref);

  static final updateOrganizerMutation = Mutation<void>();
  static final updateMediaMutation = Mutation<HostOrganizerMediaSaveResult>();
  static final publicationMutation = Mutation<void>();

  final Ref _ref;

  @override
  Future<void> updateOrganizer({
    required String organizerId,
    required UpdateOrganizerPatch patch,
  }) async {
    requireSignedInUid(_ref, action: 'edit this organizer');
    if (patch.isEmpty) return;
    await _ref
        .read(organizersRepositoryProvider)
        .updateOrganizer(organizerId: organizerId, patch: patch);
  }

  @override
  Future<List<HostPickedOrganizerPhoto>> pickOrganizerPhotos({
    int? limit,
  }) async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final images = await repository.pickImages(
      purpose: ImageUploadPurpose.organizerPhoto,
      imageQuality: 85,
      limit: limit,
    );
    return [
      for (final image in images)
        HostPickedOrganizerPhoto(
          id: ImageUploadRepository.createMediaId(),
          image: image,
          bytes: await image.readAsBytes(),
        ),
    ];
  }

  @override
  Future<HostPickedOrganizerLogo?> pickOrganizerLogo() async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final image = await repository.pickImage(
      purpose: ImageUploadPurpose.organizerProfileImage,
      imageQuality: 85,
    );
    if (image == null) return null;
    return HostPickedOrganizerLogo(
      id: ImageUploadRepository.createMediaId(),
      image: image,
      bytes: await image.readAsBytes(),
    );
  }

  @override
  Future<HostOrganizerMediaSaveResult> updateOrganizerMedia({
    required Organizer organizer,
    List<HostOrganizerMediaInput>? photoInputs,
    HostPickedOrganizerLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostOrganizerMediaProgress>? onProgress,
  }) async {
    final uid = requireSignedInUid(_ref, action: 'edit this organizer media');
    if (!organizer.isHostedBy(uid)) {
      throw const BackendOperationException(
        code: 'club-host-edit-required',
        message: 'Only an organizer manager can edit this organizer media.',
        context: BackendErrorContext(
          service: BackendService.local,
          action: 'edit organizer media',
        ),
      );
    }

    final patch = <String, Object?>{};
    final failures = <String, Object>{};
    List<HostOrganizerMediaInput>? resolvedInputs;
    HostPickedOrganizerLogo? resolvedLogo = logo;
    try {
      if (photoInputs != null) {
        resolvedInputs = await _resolvePhotoInputs(
          uid: uid,
          organizerId: organizer.id,
          inputs: photoInputs,
          failures: failures,
          onProgress: onProgress,
        );
      }
      if (logo != null && logo.uploadedPhoto == null) {
        try {
          onProgress?.call(
            HostOrganizerMediaProgress(
              id: logo.id,
              state: const ImageUploadJobState(
                stage: ImageUploadJobStage.preparing,
              ),
            ),
          );
          final upload = await _ref
              .read(imageUploadRepositoryProvider)
              .uploadOrganizerLogo(
                uid: uid,
                organizerId: organizer.id,
                mediaId: logo.id,
                image: logo.image,
                onProgress: (progress) => onProgress?.call(
                  HostOrganizerMediaProgress(
                    id: logo.id,
                    state: ImageUploadJobState(
                      stage: progress.stage,
                      progress: progress.fraction,
                    ),
                  ),
                ),
              );
          resolvedLogo = logo.copyWith(
            uploadedPhoto: UploadedPhoto.fromUpload(
              url: upload.url,
              storagePath: upload.storagePath,
              position: 0,
            ),
          );
        } catch (error) {
          // The returned failure map and failed progress state are the
          // caller-visible error surface; preserve the upload for retry.
          failures[logo.id] = error;
          onProgress?.call(
            HostOrganizerMediaProgress(
              id: logo.id,
              state: ImageUploadJobState(
                stage: ImageUploadJobStage.failed,
                error: error,
              ),
            ),
          );
        }
      }

      if (failures.isNotEmpty) {
        return HostOrganizerMediaSaveResult(
          photoInputs: resolvedInputs,
          logo: resolvedLogo,
          failures: failures,
          attached: false,
        );
      }

      if (resolvedInputs != null) {
        final photos = [
          for (final indexedInput in resolvedInputs.indexed)
            indexedInput.$2.resolvedPhoto.copyWith(
              position: indexedInput.$1,
              updatedAt: DateTime.now(),
            ),
        ];
        patch['imageUrl'] = photos.isEmpty ? null : photos.first.url;
        patch['organizerPhotos'] = photos
            .map((photo) => photo.toJson())
            .toList(growable: false);
      }
      if (resolvedLogo?.uploadedPhoto case final logoPhoto?) {
        patch['profileImageUrl'] = logoPhoto.thumbnailOrUrl;
        patch['logoPhoto'] = logoPhoto.toJson();
      } else if (removeLogo) {
        patch['profileImageUrl'] = null;
        patch['logoPhoto'] = null;
      }
      if (patch.isNotEmpty) {
        await _ref
            .read(organizersRepositoryProvider)
            .updateOrganizer(
              organizerId: organizer.id,
              patch: UpdateOrganizerPatch.raw(patch),
            );
      }
    } catch (_) {
      await discardOrganizerMedia(
        photoInputs: resolvedInputs ?? const [],
        logo: resolvedLogo,
      );
      rethrow;
    }
    return HostOrganizerMediaSaveResult(
      photoInputs: resolvedInputs,
      logo: resolvedLogo,
      failures: const {},
      attached: true,
    );
  }

  Future<List<HostOrganizerMediaInput>> _resolvePhotoInputs({
    required String uid,
    required String organizerId,
    required List<HostOrganizerMediaInput> inputs,
    required Map<String, Object> failures,
    required ValueChanged<HostOrganizerMediaProgress>? onProgress,
  }) async {
    final resolved = List<HostOrganizerMediaInput?>.filled(inputs.length, null);

    Future<void> resolveAt(int index) async {
      final input = inputs[index];
      switch (input) {
        case HostExistingOrganizerPhotoInput():
          resolved[index] = input;
        case HostNewOrganizerPhotoInput(
          :final id,
          :final image,
          :final uploadedPhoto,
        ):
          if (uploadedPhoto != null) {
            resolved[index] = input;
            return;
          }
          try {
            final upload = await _ref
                .read(imageUploadRepositoryProvider)
                .uploadOrganizerPhoto(
                  uid: uid,
                  organizerId: organizerId,
                  mediaId: id,
                  position: index,
                  image: image,
                  onProgress: (progress) => onProgress?.call(
                    HostOrganizerMediaProgress(
                      id: id,
                      state: ImageUploadJobState(
                        stage: progress.stage,
                        progress: progress.fraction,
                      ),
                    ),
                  ),
                );
            resolved[index] = input.copyWith(
              uploadedPhoto: UploadedPhoto.fromUpload(
                url: upload.url,
                storagePath: upload.storagePath,
                position: index,
              ),
            );
          } catch (error) {
            // The returned failure map and failed progress state are the
            // caller-visible error surface; preserve the input for retry.
            failures[id] = error;
            resolved[index] = input;
            onProgress?.call(
              HostOrganizerMediaProgress(
                id: id,
                state: ImageUploadJobState(
                  stage: ImageUploadJobStage.failed,
                  error: error,
                ),
              ),
            );
          }
      }
    }

    for (var start = 0; start < inputs.length; start += 2) {
      await Future.wait([
        for (
          var index = start;
          index < inputs.length && index < start + 2;
          index += 1
        )
          resolveAt(index),
      ]);
    }
    return resolved.cast<HostOrganizerMediaInput>();
  }

  @override
  Future<void> discardOrganizerMedia({
    required List<HostOrganizerMediaInput> photoInputs,
    HostPickedOrganizerLogo? logo,
  }) async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final paths = <String>{
      for (final input in photoInputs)
        if (input is HostNewOrganizerPhotoInput && input.uploadedPhoto != null)
          input.uploadedPhoto!.storagePath,
      if (logo?.uploadedPhoto != null) logo!.uploadedPhoto!.storagePath,
    };
    for (final path in paths) {
      try {
        await repository.deleteByPath(path);
      } catch (_) {
        // Cleanup must never hide the user's original save or discard action.
      }
    }
  }
}
