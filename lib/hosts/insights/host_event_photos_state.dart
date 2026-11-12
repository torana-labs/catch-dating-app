import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:meta/meta.dart';

/// Where one photo the host picked is on its way to guests.
enum HostEventPhotoUploadStage { preparing, uploading, sharing, failed }

/// One picked photo that is not shared yet. The picked file itself stays
/// with the controller.
///
/// [photoId] is fixed when the photo is picked, so a retry replays the same
/// staged upload and share instead of creating a second photo.
@immutable
class HostEventPhotoUpload {
  const HostEventPhotoUpload({
    required this.photoId,
    this.stage = HostEventPhotoUploadStage.preparing,
    this.progress = 0,
    this.error,
  });

  final String photoId;
  final HostEventPhotoUploadStage stage;

  /// Byte progress from 0 to 1 while [stage] is uploading.
  final double progress;
  final Object? error;

  bool get isFailed => stage == HostEventPhotoUploadStage.failed;

  HostEventPhotoUpload copyWith({
    HostEventPhotoUploadStage? stage,
    double? progress,
    Object? error,
  }) => HostEventPhotoUpload(
    photoId: photoId,
    stage: stage ?? this.stage,
    progress: (progress ?? this.progress).clamp(0, 1).toDouble(),
    error: error,
  );
}

/// The event's shared photos plus the photos still uploading.
@immutable
class HostEventPhotosState {
  const HostEventPhotosState({required this.album, this.uploads = const []});

  final EventHostPhotoAlbum album;
  final List<HostEventPhotoUpload> uploads;

  List<EventHostPhoto> get photos => album.photos;

  /// Slots left once the uploads in flight land.
  int get remainingSlots {
    final pending = uploads.where((upload) => !upload.isFailed).length;
    return (album.remainingSlots - pending).clamp(0, album.maxPhotos).toInt();
  }

  bool get canAdd => album.canManage && remainingSlots > 0;
  bool get isFull =>
      album.canManage && album.maxPhotos > 0 && album.remainingSlots == 0;

  HostEventPhotosState copyWith({
    EventHostPhotoAlbum? album,
    List<HostEventPhotoUpload>? uploads,
  }) => HostEventPhotosState(
    album: album ?? this.album,
    uploads: uploads ?? this.uploads,
  );
}
