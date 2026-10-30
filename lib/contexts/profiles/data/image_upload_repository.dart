import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as image_lib;
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'image_upload_repository.g.dart';

enum ImageUploadPurpose {
  profilePhoto,
  organizerCover,
  organizerPhoto,
  organizerProfileImage,
  organizerLogo,
  eventPhoto,
  chatImage,
}

class ImageUploadPolicy {
  const ImageUploadPolicy({
    required this.maxWidth,
    required this.maxHeight,
    required this.quality,
  });

  final double maxWidth;
  final double maxHeight;
  final int quality;
}

class UploadedImage {
  const UploadedImage({required this.url, required this.storagePath});

  final String url;
  final String storagePath;
}

class _StorageUploadContract {
  const _StorageUploadContract({
    required this.resource,
    required this.maxBytes,
    required this.contentTypePattern,
  });

  final String resource;
  final int maxBytes;
  final String contentTypePattern;

  bool allowsContentType(String contentType) {
    return RegExp('^$contentTypePattern\$').hasMatch(contentType);
  }
}

class _PreparedUpload {
  const _PreparedUpload({
    required this.bytes,
    required this.extension,
    required this.contentType,
  });

  final Uint8List bytes;
  final String extension;
  final String contentType;
}

class ImageUploadRepository {
  ImageUploadRepository(this._storage, {ImagePicker? picker})
    : _picker = picker ?? ImagePicker();

  static const profilePhotoPolicy = ImageUploadPolicy(
    maxWidth: 1600,
    maxHeight: 2133,
    quality: 85,
  );
  static const organizerCoverPolicy = ImageUploadPolicy(
    maxWidth: 1800,
    maxHeight: 1200,
    quality: 82,
  );
  static const organizerProfileImagePolicy = ImageUploadPolicy(
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 85,
  );
  static const eventPhotoPolicy = ImageUploadPolicy(
    maxWidth: 1800,
    maxHeight: 1200,
    quality: 82,
  );
  static const chatImagePolicy = ImageUploadPolicy(
    maxWidth: 1440,
    maxHeight: 1920,
    quality: 78,
  );

  static const _profilePhotosContract = _StorageUploadContract(
    resource: 'profile_photos',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );
  static const _hostedMediaContract = _StorageUploadContract(
    resource: 'hosted_media',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );
  static const _organizerMediaContract = _StorageUploadContract(
    resource: 'organizer_media_objects',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );
  static const _organizerLogoMediaContract = _StorageUploadContract(
    resource: 'organizer_logo_media_objects',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );
  static const _eventPhotosContract = _StorageUploadContract(
    resource: 'event_photos',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );
  static const _matchChatImagesContract = _StorageUploadContract(
    resource: 'match_chat_images',
    maxBytes: 8388608,
    contentTypePattern: 'image/.*',
  );

  final FirebaseStorage _storage;
  final ImagePicker _picker;

  static String createMediaId() {
    const alphabet =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    final random = math.Random.secure();
    return List.generate(
      24,
      (_) => alphabet[random.nextInt(alphabet.length)],
      growable: false,
    ).join();
  }

  // ── Picking ───────────────────────────────────────────────────────────────

  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) {
    final policy = policyForPurpose(purpose);
    return withAppErrorContext(
      () => _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: policy.maxWidth,
        maxHeight: policy.maxHeight,
        imageQuality: imageQuality ?? policy.quality,
        requestFullMetadata: false,
      ),
      context: const AppErrorContext(
        operation: AppOperation.plugin,
        action: 'pick a photo',
        resource: 'image_picker',
      ),
    );
  }

  Future<List<XFile>> pickImages({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
    int? limit,
  }) {
    final policy = policyForPurpose(purpose);
    return withAppErrorContext(
      () => _picker.pickMultiImage(
        maxWidth: policy.maxWidth,
        maxHeight: policy.maxHeight,
        imageQuality: imageQuality ?? policy.quality,
        limit: limit,
        requestFullMetadata: false,
      ),
      context: const AppErrorContext(
        operation: AppOperation.plugin,
        action: 'pick photos',
        resource: 'image_picker',
      ),
    );
  }

  // ── Generic upload ────────────────────────────────────────────────────────

  /// Uploads [image] to [storagePath] and returns the download URL.
  ///
  /// The extension is derived from the file name and appended to [storagePath],
  /// so pass a path without an extension (e.g. `'users/abc/photos/0_1234'`).
  Future<String> upload({
    required String storagePath,
    required XFile image,
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
  }) async => (await uploadWithMetadata(
    storagePath: storagePath,
    image: image,
    purpose: purpose,
  )).url;

  /// Uploads [image] and returns both the download URL and final Storage path.
  Future<UploadedImage> uploadWithMetadata({
    required String storagePath,
    required XFile image,
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    Map<String, String>? customMetadata,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
    bool requireJpeg = false,
  }) async {
    final context = _storageContextForPath(storagePath);
    return withBackendErrorContext(() async {
      if (cancellationToken?.isCancellationRequested ?? false) {
        throw _cancelledUpload(context);
      }
      onProgress?.call(
        const ImageUploadProgress(
          stage: ImageUploadJobStage.preparing,
          fraction: 0,
        ),
      );
      final prepared = await _prepareUpload(image: image, purpose: purpose);
      if (requireJpeg && prepared.extension != 'jpg') {
        throw const ValidationException(
          'This photo could not be prepared. Select another photo.',
          code: 'event-photo-preparation-failed',
        );
      }
      if (cancellationToken?.isCancellationRequested ?? false) {
        throw _cancelledUpload(context);
      }
      _assertUploadConformsToStorageContract(
        storagePath: storagePath,
        byteLength: prepared.bytes.length,
        reportedContentType: image.mimeType,
        effectiveContentType: prepared.contentType,
      );
      final finalStoragePath = '$storagePath.${prepared.extension}';
      final ref = _storage.ref(finalStoragePath);
      final task = ref.putData(
        prepared.bytes,
        SettableMetadata(
          contentType: prepared.contentType,
          customMetadata: customMetadata,
        ),
      );
      await cancellationToken?.bind(task.cancel);
      onProgress?.call(
        const ImageUploadProgress(
          stage: ImageUploadJobStage.uploading,
          fraction: 0,
        ),
      );
      StreamSubscription<TaskSnapshot>? progressSubscription;
      if (onProgress != null) {
        progressSubscription = task.snapshotEvents.listen(
          (snapshot) {
            final totalBytes = snapshot.totalBytes;
            final fraction = totalBytes <= 0
                ? 0.0
                : snapshot.bytesTransferred / totalBytes;
            onProgress(
              ImageUploadProgress(
                stage: ImageUploadJobStage.uploading,
                fraction: fraction.clamp(0, 1),
              ),
            );
          },
          onError: (_) {
            // The awaited UploadTask below owns error propagation.
          },
        );
      }
      try {
        await task;
      } finally {
        await progressSubscription?.cancel();
      }
      onProgress?.call(
        const ImageUploadProgress(
          stage: ImageUploadJobStage.attaching,
          fraction: 1,
        ),
      );
      final url = await ref.getDownloadURL();
      return UploadedImage(url: url, storagePath: finalStoragePath);
    }, context: context);
  }

  // ── Path helpers ──────────────────────────────────────────────────────────

  Future<String> uploadUserPhoto({
    required String uid,
    required int index,
    required XFile image,
  }) => upload(
    storagePath:
        'users/$uid/photos/${index}_${DateTime.now().millisecondsSinceEpoch}',
    image: image,
  );

  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) {
    final millis = DateTime.now().millisecondsSinceEpoch;
    return uploadWithMetadata(
      storagePath: 'users/$uid/photos/${index}_$millis',
      image: image,
      onProgress: onProgress,
      cancellationToken: cancellationToken,
    );
  }

  Future<UploadedImage> uploadOrganizerPhoto({
    String? uid,
    required String clubId,
    required int position,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) {
    final resolvedMediaId = mediaId ?? createMediaId();
    return uploadWithMetadata(
      storagePath: 'organizers/$clubId/media/$resolvedMediaId/original',
      image: image,
      purpose: ImageUploadPurpose.organizerPhoto,
      onProgress: onProgress,
      cancellationToken: cancellationToken,
    );
  }

  Future<String> uploadOrganizerCover({
    required String uid,
    required String clubId,
    required XFile image,
  }) async {
    final upload = await uploadOrganizerPhoto(
      uid: uid,
      clubId: clubId,
      position: 0,
      image: image,
    );
    return upload.url;
  }

  Future<UploadedImage> uploadOrganizerLogo({
    String? uid,
    required String clubId,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) {
    final resolvedMediaId = mediaId ?? createMediaId();
    return uploadWithMetadata(
      storagePath: 'organizers/$clubId/logo/$resolvedMediaId/original',
      image: image,
      purpose: ImageUploadPurpose.organizerLogo,
      onProgress: onProgress,
      cancellationToken: cancellationToken,
    );
  }

  Future<String> uploadOrganizerProfileImage({
    required String uid,
    required String clubId,
    required XFile image,
  }) async {
    final upload = await uploadOrganizerLogo(uid: uid, clubId: clubId, image: image);
    return upload.url;
  }

  Future<String> uploadEventPhoto({
    String? uid,
    String? clubId,
    required String eventId,
    int position = 0,
    required XFile image,
  }) async => (await uploadEventPhotoWithMetadata(
    eventId: eventId,
    position: position,
    image: image,
  )).url;

  Future<UploadedImage> uploadEventPhotoWithMetadata({
    required String eventId,
    required int position,
    required XFile image,
    String? mediaId,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) {
    final resolvedMediaId = mediaId ?? createMediaId();
    return uploadWithMetadata(
      storagePath: 'events/$eventId/media/$resolvedMediaId/original',
      image: image,
      purpose: ImageUploadPurpose.eventPhoto,
      onProgress: onProgress,
      cancellationToken: cancellationToken,
    );
  }

  /// Recovery records this immutable JPEG path before bytes may be uploaded.
  /// A failed decoder must not silently change it to an unrecorded PNG path.
  Future<UploadedImage> uploadEventPhotoForRecovery({
    required String eventId,
    required int position,
    required XFile image,
    required String mediaId,
  }) => uploadWithMetadata(
    storagePath: 'events/$eventId/media/$mediaId/original',
    image: image,
    purpose: ImageUploadPurpose.eventPhoto,
    requireJpeg: true,
  );

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

  /// Uploads a chat image and returns both the URL and the final Storage path
  /// so the caller can compensate (delete the object) if the dependent message
  /// write fails — otherwise the upload would leak as an orphan.
  Future<UploadedImage> uploadChatImageWithMetadata({
    required String matchId,
    required String messageId,
    required String uploaderUid,
    required XFile image,
  }) => uploadWithMetadata(
    storagePath:
        'matches/$matchId/images/${messageId}_'
        '${DateTime.now().millisecondsSinceEpoch}',
    image: image,
    purpose: ImageUploadPurpose.chatImage,
    customMetadata: {'uploaderUid': uploaderUid},
  );

  // ── Compensation ──────────────────────────────────────────────────────────

  /// Best-effort deletion of a previously uploaded Storage object.
  ///
  /// Used to compensate when a write that depends on an upload fails (e.g. the
  /// chat message document write fails after the image is already in Storage),
  /// so the upload does not leak as an orphaned object. A missing object is
  /// treated as success, and any other failure is swallowed — the caller is
  /// already handling the primary error and must not be derailed by cleanup.
  Future<void> deleteByPath(String storagePath) async {
    try {
      await deleteByPathChecked(storagePath);
    } catch (_) {
      // Best-effort callers already surface the primary failure. Durable media
      // recovery uses the checked boundary and retains failed compensation.
    }
  }

  /// Idempotent compensation with observable failure. A recovery journal must
  /// retain this path until deletion succeeds or Storage confirms absence.
  Future<void> deleteByPathChecked(String storagePath) =>
      withBackendErrorContext(
        () async {
          if (storagePath.isEmpty) return;
          try {
            await _storage.ref(storagePath).delete();
          } on FirebaseException catch (error) {
            if (error.code != 'object-not-found') rethrow;
          }
        },
        context: const BackendErrorContext(
          service: BackendService.storage,
          action: 'delete uploaded image',
        ),
      );

  // ── Internal ──────────────────────────────────────────────────────────────

  static ImageUploadPolicy policyForPurpose(ImageUploadPurpose purpose) {
    return switch (purpose) {
      ImageUploadPurpose.profilePhoto => profilePhotoPolicy,
      ImageUploadPurpose.organizerCover => organizerCoverPolicy,
      ImageUploadPurpose.organizerPhoto => organizerCoverPolicy,
      ImageUploadPurpose.organizerProfileImage => organizerProfileImagePolicy,
      ImageUploadPurpose.organizerLogo => organizerProfileImagePolicy,
      ImageUploadPurpose.eventPhoto => eventPhotoPolicy,
      ImageUploadPurpose.chatImage => chatImagePolicy,
    };
  }

  static Future<_PreparedUpload> _prepareUpload({
    required XFile image,
    required ImageUploadPurpose purpose,
  }) async {
    final originalBytes = await image.readAsBytes();
    final originalExt = _normalizedExt(image.name);
    final policy = policyForPurpose(purpose);
    final compressedBytes = await compute(_compressedImageBytes, (
      bytes: originalBytes,
      maxWidth: policy.maxWidth,
      maxHeight: policy.maxHeight,
      quality: policy.quality,
    ));
    if (compressedBytes == null) {
      return _PreparedUpload(
        bytes: originalBytes,
        extension: originalExt,
        contentType: _contentTypeForExt(originalExt),
      );
    }
    return _PreparedUpload(
      bytes: compressedBytes,
      extension: 'jpg',
      contentType: 'image/jpeg',
    );
  }

  static Uint8List? _compressedImageBytes(_CompressionRequest request) {
    try {
      final decoded = image_lib.decodeImage(request.bytes);
      if (decoded == null) return null;
      var normalized = image_lib.bakeOrientation(decoded);
      final scale = math.min(
        request.maxWidth / normalized.width,
        request.maxHeight / normalized.height,
      );
      if (scale < 1) {
        normalized = image_lib.copyResize(
          normalized,
          width: math.max(1, (normalized.width * scale).round()),
          height: math.max(1, (normalized.height * scale).round()),
          interpolation: image_lib.Interpolation.average,
        );
      }
      return Uint8List.fromList(
        image_lib.encodeJpg(normalized, quality: request.quality),
      );
    } on Object {
      return null;
    }
  }

  static String _ext(String filename) {
    final dot = filename.lastIndexOf('.');
    return dot != -1 ? filename.substring(dot + 1).toLowerCase() : 'jpg';
  }

  static String _normalizedExt(String filename) =>
      _ext(filename) == 'png' ? 'png' : 'jpg';

  static String _contentTypeForExt(String ext) =>
      ext == 'png' ? 'image/png' : 'image/jpeg';

  static void _assertUploadConformsToStorageContract({
    required String storagePath,
    required int byteLength,
    required String? reportedContentType,
    required String effectiveContentType,
  }) {
    final contract = _contractForStoragePath(storagePath);
    if (contract == null) return;

    final context = BackendErrorContext(
      service: BackendService.storage,
      action: 'upload image',
      resource: contract.resource,
      metadata: _storageDiagnosticMetadata(storagePath),
    );
    if (byteLength > contract.maxBytes) {
      throw StorageUploadPreflightException(
        constraint: 'max-bytes',
        message:
            'That image is too large. Please choose an image under '
            '${_formatBytes(contract.maxBytes)}.',
        debugMessage:
            'Storage upload was $byteLength bytes; max is '
            '${contract.maxBytes} bytes for ${contract.resource}.',
        context: context,
      );
    }

    final sourceContentType = reportedContentType?.trim();
    final contentType = sourceContentType == null || sourceContentType.isEmpty
        ? effectiveContentType
        : sourceContentType;
    if (!contract.allowsContentType(contentType)) {
      throw StorageUploadPreflightException(
        constraint: 'content-type',
        message: 'Please choose an image file.',
        debugMessage:
            'Storage upload content type "$contentType" did not match '
            '${contract.contentTypePattern} for ${contract.resource}.',
        context: context,
      );
    }
  }

  static String _resourceForStoragePath(String storagePath) {
    final contract = _contractForStoragePath(storagePath);
    if (contract != null) return contract.resource;
    return 'images';
  }

  static _StorageUploadContract? _contractForStoragePath(String storagePath) {
    if (storagePath.startsWith('users/') && storagePath.contains('/photos/')) {
      return _profilePhotosContract;
    }
    if (storagePath.startsWith('users/') &&
        storagePath.contains('/hostedMedia/')) {
      return _hostedMediaContract;
    }
    if ((storagePath.startsWith('organizers/') ||
            storagePath.startsWith('clubs/')) &&
        (storagePath.contains('/photos/') || storagePath.contains('/media/'))) {
      return _organizerMediaContract;
    }
    if ((storagePath.startsWith('organizers/') ||
            storagePath.startsWith('clubs/')) &&
        storagePath.contains('/logo/')) {
      return _organizerLogoMediaContract;
    }
    if (storagePath.startsWith('events/') &&
        (storagePath.contains('/photos/') || storagePath.contains('/media/'))) {
      return _eventPhotosContract;
    }
    if (storagePath.startsWith('matches/') &&
        storagePath.contains('/images/')) {
      return _matchChatImagesContract;
    }
    return null;
  }

  static BackendErrorContext _storageContextForPath(String storagePath) =>
      BackendErrorContext(
        service: BackendService.storage,
        action: 'upload image',
        resource: _resourceForStoragePath(storagePath),
        metadata: _storageDiagnosticMetadata(storagePath),
      );

  static Map<String, String> _storageDiagnosticMetadata(String storagePath) {
    final segments = storagePath.split('/');
    final family = switch (segments) {
      ['users', _, 'photos', ...] => 'profile_photo',
      ['organizers' || 'clubs', _, 'media', ...] => 'organizer_gallery',
      ['organizers' || 'clubs', _, 'photos', ...] => 'organizer_gallery_legacy',
      ['organizers' || 'clubs', _, 'logo', ...] => 'organizer_logo',
      ['events', _, 'media', ...] => 'event_gallery',
      ['events', _, 'photos', ...] => 'event_gallery_legacy',
      ['matches', _, 'images', ...] => 'chat_image',
      _ => 'image',
    };
    final pathVersion =
        storagePath.contains('/media/') ||
            (segments.length >= 5 && segments.elementAtOrNull(2) == 'logo')
        ? 'v2'
        : 'legacy';
    return {'path_family': family, 'path_version': pathVersion};
  }

  static StorageException _cancelledUpload(BackendErrorContext context) =>
      StorageException(
        'Upload was cancelled.',
        code: 'canceled',
        context: context,
      );
}

typedef _CompressionRequest = ({
  Uint8List bytes,
  double maxWidth,
  double maxHeight,
  int quality,
});

String _formatBytes(int bytes) {
  final mb = bytes / (1024 * 1024);
  if (mb == mb.roundToDouble()) return '${mb.toInt()} MB';
  return '${mb.toStringAsFixed(1)} MB';
}

@riverpod
ImageUploadRepository imageUploadRepository(Ref ref) =>
    ImageUploadRepository(ref.watch(firebaseStorageProvider));
