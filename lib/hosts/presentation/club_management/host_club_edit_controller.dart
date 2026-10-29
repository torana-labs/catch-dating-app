import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_club_edit_controller.g.dart';

@riverpod
HostClubEditActions hostClubEditController(Ref ref) =>
    HostClubEditController(ref);

abstract interface class HostClubEditActions {
  Future<void> updateClub({
    required String clubId,
    required UpdateClubPatch patch,
  });

  Future<List<HostPickedClubPhoto>> pickClubPhotos({int? limit});

  Future<HostPickedClubLogo?> pickClubLogo();

  Future<HostClubMediaSaveResult> updateClubMedia({
    required Club club,
    List<HostClubMediaInput>? photoInputs,
    HostPickedClubLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostClubMediaProgress>? onProgress,
  });

  Future<void> discardClubMedia({
    required List<HostClubMediaInput> photoInputs,
    HostPickedClubLogo? logo,
  });
}

class HostPickedClubPhoto {
  const HostPickedClubPhoto({
    required this.id,
    required this.image,
    required this.bytes,
  });

  final String id;
  final XFile image;
  final Uint8List bytes;
}

class HostPickedClubLogo {
  const HostPickedClubLogo({
    required this.id,
    required this.image,
    required this.bytes,
    this.uploadedPhoto,
  });

  final String id;
  final XFile image;
  final Uint8List bytes;
  final UploadedPhoto? uploadedPhoto;

  HostPickedClubLogo copyWith({UploadedPhoto? uploadedPhoto}) =>
      HostPickedClubLogo(
        id: id,
        image: image,
        bytes: bytes,
        uploadedPhoto: uploadedPhoto ?? this.uploadedPhoto,
      );
}

sealed class HostClubMediaInput {
  const HostClubMediaInput();

  String get id;
  UploadedPhoto get resolvedPhoto;
}

final class HostExistingClubPhotoInput extends HostClubMediaInput {
  const HostExistingClubPhotoInput(this.photo);

  final UploadedPhoto photo;

  @override
  String get id => photo.id;

  @override
  UploadedPhoto get resolvedPhoto => photo;
}

final class HostNewClubPhotoInput extends HostClubMediaInput {
  const HostNewClubPhotoInput({
    required this.id,
    required this.image,
    this.uploadedPhoto,
  });

  @override
  final String id;
  final XFile image;
  final UploadedPhoto? uploadedPhoto;

  bool get isUploaded => uploadedPhoto != null;

  HostNewClubPhotoInput copyWith({UploadedPhoto? uploadedPhoto}) =>
      HostNewClubPhotoInput(
        id: id,
        image: image,
        uploadedPhoto: uploadedPhoto ?? this.uploadedPhoto,
      );

  HostNewClubPhotoInput clearUpload() =>
      HostNewClubPhotoInput(id: id, image: image);

  @override
  UploadedPhoto get resolvedPhoto => uploadedPhoto!;
}

class HostClubMediaProgress {
  const HostClubMediaProgress({required this.id, required this.state});

  final String id;
  final ImageUploadJobState state;
}

class HostClubMediaSaveResult {
  const HostClubMediaSaveResult({
    required this.photoInputs,
    required this.logo,
    required this.failures,
    required this.attached,
  });

  final List<HostClubMediaInput>? photoInputs;
  final HostPickedClubLogo? logo;
  final Map<String, Object> failures;
  final bool attached;

  bool get hasFailures => failures.isNotEmpty;
}

class HostClubEditController implements HostClubEditActions {
  const HostClubEditController(this._ref);

  static final updateClubMutation = Mutation<void>();
  static final updateMediaMutation = Mutation<HostClubMediaSaveResult>();
  static final publicationMutation = Mutation<void>();

  final Ref _ref;

  @override
  Future<void> updateClub({
    required String clubId,
    required UpdateClubPatch patch,
  }) async {
    requireSignedInUid(_ref, action: 'edit this organizer');
    if (patch.isEmpty) return;
    await _ref
        .read(clubsRepositoryProvider)
        .updateClub(clubId: clubId, patch: patch);
  }

  @override
  Future<List<HostPickedClubPhoto>> pickClubPhotos({int? limit}) async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final images = await repository.pickImages(
      purpose: ImageUploadPurpose.clubPhoto,
      imageQuality: 85,
      limit: limit,
    );
    return [
      for (final image in images)
        HostPickedClubPhoto(
          id: ImageUploadRepository.createMediaId(),
          image: image,
          bytes: await image.readAsBytes(),
        ),
    ];
  }

  @override
  Future<HostPickedClubLogo?> pickClubLogo() async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final image = await repository.pickImage(
      purpose: ImageUploadPurpose.clubProfileImage,
      imageQuality: 85,
    );
    if (image == null) return null;
    return HostPickedClubLogo(
      id: ImageUploadRepository.createMediaId(),
      image: image,
      bytes: await image.readAsBytes(),
    );
  }

  @override
  Future<HostClubMediaSaveResult> updateClubMedia({
    required Club club,
    List<HostClubMediaInput>? photoInputs,
    HostPickedClubLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostClubMediaProgress>? onProgress,
  }) async {
    final uid = requireSignedInUid(_ref, action: 'edit this organizer media');
    if (!club.isHostedBy(uid)) {
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
    List<HostClubMediaInput>? resolvedInputs;
    HostPickedClubLogo? resolvedLogo = logo;
    try {
      if (photoInputs != null) {
        resolvedInputs = await _resolvePhotoInputs(
          uid: uid,
          clubId: club.id,
          inputs: photoInputs,
          failures: failures,
          onProgress: onProgress,
        );
      }
      if (logo != null && logo.uploadedPhoto == null) {
        try {
          onProgress?.call(
            HostClubMediaProgress(
              id: logo.id,
              state: const ImageUploadJobState(
                stage: ImageUploadJobStage.preparing,
              ),
            ),
          );
          final upload = await _ref
              .read(imageUploadRepositoryProvider)
              .uploadClubLogo(
                uid: uid,
                clubId: club.id,
                mediaId: logo.id,
                image: logo.image,
                onProgress: (progress) => onProgress?.call(
                  HostClubMediaProgress(
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
            HostClubMediaProgress(
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
        return HostClubMediaSaveResult(
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
        patch['clubPhotos'] = photos
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
            .read(clubsRepositoryProvider)
            .updateClub(clubId: club.id, patch: UpdateClubPatch.raw(patch));
      }
    } catch (_) {
      await discardClubMedia(
        photoInputs: resolvedInputs ?? const [],
        logo: resolvedLogo,
      );
      rethrow;
    }
    return HostClubMediaSaveResult(
      photoInputs: resolvedInputs,
      logo: resolvedLogo,
      failures: const {},
      attached: true,
    );
  }

  Future<List<HostClubMediaInput>> _resolvePhotoInputs({
    required String uid,
    required String clubId,
    required List<HostClubMediaInput> inputs,
    required Map<String, Object> failures,
    required ValueChanged<HostClubMediaProgress>? onProgress,
  }) async {
    final resolved = List<HostClubMediaInput?>.filled(inputs.length, null);

    Future<void> resolveAt(int index) async {
      final input = inputs[index];
      switch (input) {
        case HostExistingClubPhotoInput():
          resolved[index] = input;
        case HostNewClubPhotoInput(
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
                .uploadClubPhoto(
                  uid: uid,
                  clubId: clubId,
                  mediaId: id,
                  position: index,
                  image: image,
                  onProgress: (progress) => onProgress?.call(
                    HostClubMediaProgress(
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
              HostClubMediaProgress(
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
    return resolved.cast<HostClubMediaInput>();
  }

  @override
  Future<void> discardClubMedia({
    required List<HostClubMediaInput> photoInputs,
    HostPickedClubLogo? logo,
  }) async {
    final repository = _ref.read(imageUploadRepositoryProvider);
    final paths = <String>{
      for (final input in photoInputs)
        if (input is HostNewClubPhotoInput && input.uploadedPhoto != null)
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
