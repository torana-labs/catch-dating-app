import 'dart:async';
import 'dart:typed_data';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'photo_upload_controller.g.dart';

/// **Pattern B: State controller with record state + Mutation**
///
/// Tracks per-index upload loading state via a Dart record
/// `({Set<int> loadingIndices, Object? uploadError})` and serializes
/// Firestore writes through a `_pendingPhotoWrite` chain to prevent races.
/// [uploadPhotoMutation] gives the UI a standard Mutation lifecycle hook
/// for the overall upload operation.
///
/// **When to use this pattern:** Multi-slot upload UIs where individual
/// slots have independent loading states and writes must be serialized to
/// avoid Firestore document races.
@riverpod
class PhotoUploadController extends _$PhotoUploadController {
  static final uploadPhotoMutation = Mutation<void>();

  Future<void> _pendingPhotoWrite = Future.value();
  bool _isPickingImage = false;
  final _cancellationTokens = <int, ImageUploadCancellationToken>{};

  @override
  PhotoUploadState build() {
    ref.onDispose(() {
      for (final token in _cancellationTokens.values) {
        unawaited(token.cancel());
      }
    });
    return const PhotoUploadState();
  }

  Future<void> pickAndUpload(int index) async {
    RangeError.checkValueInInterval(
      index,
      0,
      maximumProfilePhotoCount - 1,
      'index',
    );
    if (_isPickingImage || state.loadingIndices.contains(index)) return;

    final repo = ref.read(imageUploadRepositoryProvider);
    final userProfileRepository = ref.read(userProfileRepositoryProvider);

    _updateJob(index, stage: ImageUploadJobStage.picking, progress: 0);

    final XFile? photo;
    try {
      photo = await _pickImage(repo);
    } catch (e, st) {
      if (!ref.mounted) return;
      _failUploading(index, e, st);
      return;
    }
    if (!ref.mounted) return;
    if (photo == null) {
      _updateJob(index, stage: ImageUploadJobStage.cancelled, progress: 0);
      return;
    }

    final cancellationToken = ImageUploadCancellationToken();
    _cancellationTokens[index] = cancellationToken;
    UploadedImage? upload;
    try {
      final uid = requireSignedInUid(ref, action: 'upload photos');
      upload = await repo.uploadUserProfilePhoto(
        uid: uid,
        index: index,
        image: photo,
        cancellationToken: cancellationToken,
        onProgress: (progress) => _handleProgress(
          index,
          cancellationToken: cancellationToken,
          progress: progress,
        ),
      );
      _updateJob(index, stage: ImageUploadJobStage.attaching, progress: 1);
      try {
        await _persistUploadedPhoto(
          userProfileRepository: userProfileRepository,
          uid: uid,
          index: index,
          upload: upload,
        );
      } catch (_) {
        await repo.deleteByPath(upload.storagePath);
        rethrow;
      }

      if (!ref.mounted) return;
      _finishUploading(index);
    } catch (e, st) {
      if (!ref.mounted) return;
      if (cancellationToken.isCancellationRequested) {
        _updateJob(index, stage: ImageUploadJobStage.cancelled, progress: 0);
      } else {
        _failUploading(index, e, st);
      }
    } finally {
      if (identical(_cancellationTokens[index], cancellationToken)) {
        _cancellationTokens.remove(index);
      }
    }
  }

  Future<XFile?> pickPhoto() async {
    if (_isPickingImage) return null;
    return _pickImage(ref.read(imageUploadRepositoryProvider));
  }

  Future<void> savePhoto({
    required int index,
    Uint8List? imageBytes,
    PhotoPromptAnswer? prompt,
  }) async {
    RangeError.checkValueInInterval(
      index,
      0,
      maximumProfilePhotoCount - 1,
      'index',
    );
    if (imageBytes == null) {
      await _persistPhotoPrompt(index: index, prompt: prompt);
      return;
    }
    final image = XFile.fromData(
      imageBytes,
      name:
          'profile_photo_${index}_${DateTime.now().millisecondsSinceEpoch}.png',
      mimeType: 'image/png',
    );

    if (state.loadingIndices.contains(index)) return;
    final cancellationToken = ImageUploadCancellationToken();
    _cancellationTokens[index] = cancellationToken;
    _updateJob(index, stage: ImageUploadJobStage.queued, progress: 0);
    try {
      final uid = requireSignedInUid(ref, action: 'upload photos');
      final imageUploadRepository = ref.read(imageUploadRepositoryProvider);
      final upload = await imageUploadRepository.uploadUserProfilePhoto(
        uid: uid,
        index: index,
        image: image,
        cancellationToken: cancellationToken,
        onProgress: (progress) => _handleProgress(
          index,
          cancellationToken: cancellationToken,
          progress: progress,
        ),
      );
      _updateJob(index, stage: ImageUploadJobStage.attaching, progress: 1);
      try {
        await _persistUploadedPhoto(
          userProfileRepository: ref.read(userProfileRepositoryProvider),
          uid: uid,
          index: index,
          upload: upload,
          prompt: prompt,
        );
      } catch (_) {
        await imageUploadRepository.deleteByPath(upload.storagePath);
        rethrow;
      }

      if (!ref.mounted) return;
      _finishUploading(index);
    } catch (e, st) {
      if (!ref.mounted) return;
      if (cancellationToken.isCancellationRequested) {
        _updateJob(index, stage: ImageUploadJobStage.cancelled, progress: 0);
      } else {
        _failUploading(index, e, st);
      }
      rethrow;
    } finally {
      if (identical(_cancellationTokens[index], cancellationToken)) {
        _cancellationTokens.remove(index);
      }
    }
  }

  Future<void> cancelUpload(int index) async {
    final cancellationToken = _cancellationTokens[index];
    if (cancellationToken == null) return;
    await cancellationToken.cancel();
    if (!ref.mounted) return;
    _updateJob(index, stage: ImageUploadJobStage.cancelled, progress: 0);
  }

  Future<void> deletePhoto(int index) {
    RangeError.checkValueInInterval(
      index,
      0,
      maximumProfilePhotoCount - 1,
      'index',
    );
    return _serializePhotoWrite(() async {
      final uid = requireSignedInUid(ref, action: 'delete profile photo');
      final userProfileRepository = ref.read(userProfileRepositoryProvider);
      final latestUser = await userProfileRepository.fetchUserProfile(uid: uid);
      if (latestUser == null) throw const DocumentNotFoundException('users');
      final basePhotos = latestUser.effectiveProfilePhotos;
      if (latestUser.profileComplete &&
          basePhotos.length <= minimumProfilePhotoCount) {
        throw StateError(
          'Keep at least $minimumProfilePhotoCount profile photos.',
        );
      }
      final updatedAt = DateTime.now();
      final updatedPhotos = removeProfilePhotoAtPosition(
        profilePhotos: basePhotos,
        position: index,
        updatedAt: updatedAt,
      );
      await userProfileRepository.updateProfilePhotos(
        uid: uid,
        profilePhotos: updatedPhotos,
      );
    });
  }

  Future<void> reorderPhoto({required int fromIndex, required int toIndex}) {
    RangeError.checkValueInInterval(
      fromIndex,
      0,
      maximumProfilePhotoCount - 1,
      'fromIndex',
    );
    RangeError.checkValueInInterval(
      toIndex,
      0,
      maximumProfilePhotoCount - 1,
      'toIndex',
    );
    return _serializePhotoWrite(() async {
      final uid = requireSignedInUid(ref, action: 'reorder profile photos');
      final userProfileRepository = ref.read(userProfileRepositoryProvider);
      final latestUser = await userProfileRepository.fetchUserProfile(uid: uid);
      if (latestUser == null) throw const DocumentNotFoundException('users');
      final updatedAt = DateTime.now();
      final updatedPhotos = reorderProfilePhoto(
        profilePhotos: latestUser.effectiveProfilePhotos,
        fromPosition: fromIndex,
        toPosition: toIndex,
        updatedAt: updatedAt,
      );
      await userProfileRepository.updateProfilePhotos(
        uid: uid,
        profilePhotos: updatedPhotos,
      );
    });
  }

  Future<XFile?> _pickImage(ImageUploadRepository repo) async {
    _isPickingImage = true;
    try {
      return await repo.pickImage();
    } finally {
      _isPickingImage = false;
    }
  }

  void _handleProgress(
    int index, {
    required ImageUploadCancellationToken cancellationToken,
    required ImageUploadProgress progress,
  }) {
    if (!ref.mounted ||
        !identical(_cancellationTokens[index], cancellationToken)) {
      return;
    }
    _updateJob(index, stage: progress.stage, progress: progress.fraction);
  }

  void _updateJob(
    int index, {
    required ImageUploadJobStage stage,
    required double progress,
    Object? error,
  }) {
    state = state.withJob(
      index,
      ImageUploadJobState(stage: stage, progress: progress, error: error),
    );
  }

  void _finishUploading(int index) {
    _updateJob(index, stage: ImageUploadJobStage.complete, progress: 1);
  }

  void _failUploading(int index, Object error, [StackTrace? st]) {
    ref
        .read(errorLoggerProvider)
        .logAppException(
          normalizeBackendError(
            error,
            stackTrace: st,
            context: const BackendErrorContext(
              service: BackendService.local,
              action: 'upload profile photo',
              resource: 'photo_upload_controller',
            ),
          ),
        );
    _updateJob(
      index,
      stage: ImageUploadJobStage.failed,
      progress: 0,
      error: error,
    );
  }

  Future<void> _persistUploadedPhoto({
    required UserProfileRepository userProfileRepository,
    required String uid,
    required int index,
    required UploadedImage upload,
    PhotoPromptAnswer? prompt,
  }) {
    return _serializePhotoWrite(() async {
      final latestUser = await userProfileRepository.fetchUserProfile(uid: uid);
      if (latestUser == null) throw const DocumentNotFoundException('users');
      final basePhotos = latestUser.effectiveProfilePhotos;
      final existingPrompt = basePhotos
          .where((photo) => photo.position == index)
          .firstOrNull
          ?.prompt;
      final updatedAt = DateTime.now();
      final uploadedPhoto = ProfilePhoto.uploaded(
        position: index,
        url: upload.url,
        storagePath: upload.storagePath,
        prompt: prompt ?? existingPrompt,
        now: updatedAt,
      );
      final replacedPhotos = replaceProfilePhotoAtPosition(
        profilePhotos: basePhotos,
        position: index,
        photo: uploadedPhoto,
        updatedAt: updatedAt,
      );
      final updatedPhotos = ensureUniquePhotoPrompts(
        replacedPhotos,
        preferredPosition: index,
      );

      await userProfileRepository.updateProfilePhotos(
        uid: uid,
        profilePhotos: updatedPhotos,
      );
    });
  }

  Future<void> _persistPhotoPrompt({
    required int index,
    required PhotoPromptAnswer? prompt,
  }) {
    return _serializePhotoWrite(() async {
      final uid = requireSignedInUid(ref, action: 'update photo prompt');
      final userProfileRepository = ref.read(userProfileRepositoryProvider);
      final latestUser = await userProfileRepository.fetchUserProfile(uid: uid);
      if (latestUser == null) throw const DocumentNotFoundException('users');
      final updatedAt = DateTime.now();
      final updatedPhotos = replaceProfilePhotoPromptAtPosition(
        profilePhotos: latestUser.effectiveProfilePhotos,
        position: index,
        prompt: prompt,
        updatedAt: updatedAt,
      );
      await userProfileRepository.updateProfilePhotos(
        uid: uid,
        profilePhotos: updatedPhotos,
      );
    });
  }

  Future<T> _serializePhotoWrite<T>(Future<T> Function() operation) {
    final nextWrite = _pendingPhotoWrite.then((_) => operation());
    _pendingPhotoWrite = nextWrite.then<void>(
      (_) {},
      onError: (Object error, StackTrace stack) {
        ref
            .read(errorLoggerProvider)
            .logAppException(
              normalizeBackendError(
                error,
                stackTrace: stack,
                context: const BackendErrorContext(
                  service: BackendService.local,
                  action: 'serialize photo write',
                  resource: 'photo_upload_controller',
                ),
              ),
            );
      },
    );
    return nextWrite;
  }
}
