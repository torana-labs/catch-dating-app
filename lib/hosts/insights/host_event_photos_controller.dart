import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/events/data/event_host_photos_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_state.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_photos_controller.g.dart';

typedef HostEventPhotoMutationKey = ({String eventId, String photoId});

/// The host team's photos for one event's checked-in guests: the shared
/// album, picking several photos at once, per-photo upload progress, retry,
/// and removing a shared photo.
///
/// Uploads run one at a time so progress reads in order and a slow network
/// is not split across several files.
@riverpod
class HostEventPhotosController extends _$HostEventPhotosController {
  static final addPhotosMutation = Mutation<void>();
  static final removePhotoMutation = Mutation<void>();

  static HostEventPhotoMutationKey removeMutationKey({
    required String eventId,
    required String photoId,
  }) => (eventId: eventId, photoId: photoId);

  final _cancellationTokens = <String, ImageUploadCancellationToken>{};
  final _images = <String, XFile>{};
  Future<void> _queue = Future.value();

  @override
  Future<HostEventPhotosState> build(String eventId) async {
    ref.onDispose(() {
      for (final token in _cancellationTokens.values) {
        unawaited(token.cancel());
      }
    });
    final album = await ref.watch(eventHostPhotoAlbumProvider(eventId).future);
    return HostEventPhotosState(album: album);
  }

  /// Picks up to the remaining number of photos and shares each in turn.
  Future<void> addPhotos() async {
    final current = state.value;
    if (current == null || !current.canAdd) return;
    final picked = await ref
        .read(imageUploadRepositoryProvider)
        .pickImages(
          purpose: ImageUploadPurpose.eventHostPhoto,
          limit: current.remainingSlots,
        );
    if (!ref.mounted || picked.isEmpty) return;
    final latest = state.value ?? current;
    final uploads = <HostEventPhotoUpload>[];
    for (final image in picked.take(latest.remainingSlots)) {
      final photoId = ImageUploadRepository.createMediaId();
      _images[photoId] = image;
      uploads.add(HostEventPhotoUpload(photoId: photoId));
    }
    state = AsyncData(
      latest.copyWith(uploads: [...latest.uploads, ...uploads]),
    );
    for (final upload in uploads) {
      _enqueue(upload.photoId);
    }
    await _queue;
  }

  /// Uploads a failed photo again under the same photo id.
  Future<void> retry(String photoId) {
    final upload = _upload(photoId);
    if (upload == null || !upload.isFailed) return Future.value();
    _replace(
      upload.copyWith(stage: HostEventPhotoUploadStage.preparing, progress: 0),
    );
    _enqueue(photoId);
    return _queue;
  }

  /// Forgets a failed upload.
  void dismiss(String photoId) {
    final current = state.value;
    if (current == null) return;
    unawaited(_cancellationTokens.remove(photoId)?.cancel());
    _images.remove(photoId);
    state = AsyncData(
      current.copyWith(
        uploads: [
          for (final upload in current.uploads)
            if (upload.photoId != photoId) upload,
        ],
      ),
    );
  }

  /// Removes a shared photo; guests stop seeing it.
  Future<void> remove(String photoId) async {
    await ref
        .read(eventHostPhotosRepositoryProvider)
        .deletePhoto(eventId: eventId, photoId: photoId);
    if (!ref.mounted) return;
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        album: current.album.copyWith(
          photos: [
            for (final photo in current.photos)
              if (photo.photoId != photoId) photo,
          ],
        ),
      ),
    );
  }

  void _enqueue(String photoId) {
    _queue = _queue.then((_) => _share(photoId));
  }

  Future<void> _share(String photoId) async {
    if (!ref.mounted) return;
    final upload = _upload(photoId);
    final image = _images[photoId];
    if (upload == null || upload.isFailed || image == null) return;
    final token = ImageUploadCancellationToken();
    _cancellationTokens[photoId] = token;
    try {
      final uid = requireSignedInUid(ref, action: 'share event photos');
      final photo = await ref
          .read(eventHostPhotosRepositoryProvider)
          .addPhoto(
            eventId: eventId,
            photoId: photoId,
            uploaderUid: uid,
            image: image,
            cancellationToken: token,
            onProgress: (progress) => _onProgress(photoId, progress),
          );
      if (!ref.mounted) return;
      _images.remove(photoId);
      _land(photo);
    } on Object catch (error) {
      if (!ref.mounted || token.isCancellationRequested) return;
      final latest = _upload(photoId);
      if (latest != null) {
        _replace(
          latest.copyWith(
            stage: HostEventPhotoUploadStage.failed,
            error: error,
          ),
        );
      }
    } finally {
      if (identical(_cancellationTokens[photoId], token)) {
        _cancellationTokens.remove(photoId);
      }
    }
  }

  void _onProgress(String photoId, ImageUploadProgress progress) {
    if (!ref.mounted) return;
    final upload = _upload(photoId);
    if (upload == null) return;
    _replace(
      upload.copyWith(
        stage: switch (progress.stage) {
          ImageUploadJobStage.uploading => HostEventPhotoUploadStage.uploading,
          ImageUploadJobStage.attaching ||
          ImageUploadJobStage.complete => HostEventPhotoUploadStage.sharing,
          _ => HostEventPhotoUploadStage.preparing,
        },
        progress: progress.fraction,
      ),
    );
  }

  void _land(EventHostPhoto photo) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        album: current.album.copyWith(
          photos: [
            photo,
            for (final existing in current.photos)
              if (existing.photoId != photo.photoId) existing,
          ],
        ),
        uploads: [
          for (final upload in current.uploads)
            if (upload.photoId != photo.photoId) upload,
        ],
      ),
    );
  }

  HostEventPhotoUpload? _upload(String photoId) {
    for (final upload
        in state.value?.uploads ?? const <HostEventPhotoUpload>[]) {
      if (upload.photoId == photoId) return upload;
    }
    return null;
  }

  void _replace(HostEventPhotoUpload next) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        uploads: [
          for (final upload in current.uploads)
            upload.photoId == next.photoId ? next : upload,
        ],
      ),
    );
  }
}
