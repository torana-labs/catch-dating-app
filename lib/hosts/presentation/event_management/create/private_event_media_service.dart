import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'private_event_media_service.g.dart';

// The details controller retains this service while its scope is active.
@riverpod
PrivateEventMediaService privateEventMediaService(Ref ref) {
  return PrivateEventMediaService(
    images: ref.watch(imageUploadRepositoryProvider),
    currentUserId: () =>
        ref.mounted ? ref.read(uidProvider).asData?.value : null,
  );
}

class PrivateEventMediaService {
  const PrivateEventMediaService({
    required this.images,
    required this.currentUserId,
  });
  final ImageUploadRepository images;
  final String? Function() currentUserId;

  Future<List<UploadedPhoto>> pickAndUpload({
    required String userId,
    required String eventId,
    required int position,
  }) async {
    void requireActor() {
      if (currentUserId() != userId) {
        throw const SignInRequiredException('upload event photos');
      }
    }

    requireActor();
    final picked = await images.pickImages(
      purpose: ImageUploadPurpose.eventPhoto,
      imageQuality: 82,
    );
    final photos = <UploadedPhoto>[];
    try {
      for (final image in picked) {
        requireActor();
        final upload = await images.uploadEventPhotoWithMetadata(
          eventId: eventId,
          position: position + photos.length,
          image: image,
        );
        photos.add(
          UploadedPhoto.fromUpload(
            url: upload.url,
            storagePath: upload.storagePath,
            position: position + photos.length,
          ),
        );
      }
      requireActor();
      return photos;
    } catch (_) {
      // No attachment command has been sent by this service yet. Only these
      // newly uploaded objects are safe to clean up after a partial upload.
      for (final photo in photos) {
        await images.deleteByPath(photo.storagePath);
      }
      rethrow;
    }
  }
}
