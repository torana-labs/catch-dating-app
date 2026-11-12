import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The event report's photos for checked-in guests: the shared photos in a
/// rail (tap one to remove it), one row per photo still uploading with its
/// progress, and the Add photos action while the event has room.
///
/// It binds [HostEventPhotosState] to library components and draws nothing
/// itself; the screen owns picking, uploading and removal.
class HostEventPhotosSection extends StatelessWidget {
  const HostEventPhotosSection({
    super.key,
    required this.state,
    required this.onAdd,
    required this.onRemove,
    required this.onRetry,
    required this.onDismiss,
    this.removing = const {},
  });

  /// Null while the album loads.
  final HostEventPhotosState? state;
  final VoidCallback onAdd;
  final ValueChanged<EventHostPhoto> onRemove;
  final ValueChanged<String> onRetry;
  final ValueChanged<String> onDismiss;

  /// Photos whose removal is in flight.
  final Set<String> removing;

  static const double thumbnailWidth = 104;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = this.state;
    if (state == null) {
      return CatchSection(
        key: const ValueKey<String>('host-event-photos'),
        title: l10n.hostEventPhotosTitle,
        children: const [
          CatchSkeleton.content(
            child: CatchRail(
              label: '',
              itemWidth: thumbnailWidth,
              children: [
                CatchNetworkImage(
                  '',
                  aspect: 1,
                  corner: CatchNetworkImageSize.md,
                ),
                CatchNetworkImage(
                  '',
                  aspect: 1,
                  corner: CatchNetworkImageSize.md,
                ),
                CatchNetworkImage(
                  '',
                  aspect: 1,
                  corner: CatchNetworkImageSize.md,
                ),
              ],
            ),
          ),
        ],
      );
    }
    final photos = state.photos;
    final album = state.album;
    return CatchSection(
      key: const ValueKey<String>('host-event-photos'),
      title: l10n.hostEventPhotosTitle,
      action: state.canAdd
          ? CatchSectionAction(label: l10n.hostEventPhotosAdd, onPressed: onAdd)
          : null,
      note: state.canAdd || photos.isEmpty
          ? null
          : l10n.hostEventPhotosCount(
              count: photos.length,
              max: album.maxPhotos,
            ),
      empty: l10n.hostEventPhotosEmpty,
      children: [
        if (photos.isNotEmpty)
          CatchRail(
            key: const ValueKey<String>('host-event-photos-rail'),
            label: l10n.hostEventPhotosTitle,
            itemWidth: thumbnailWidth,
            wrap: CatchRailMode.never,
            children: [
              for (final (index, photo) in photos.indexed)
                CatchSurface(
                  key: ValueKey<String>('host-event-photo-${photo.photoId}'),
                  padding: CatchSurfacePadding.none,
                  semanticLabel: l10n.hostEventPhotosPhotoLabel(
                    index: index + 1,
                    count: photos.length,
                  ),
                  onPress: removing.contains(photo.photoId)
                      ? null
                      : () => onRemove(photo),
                  child: CatchNetworkImage(
                    photo.thumbnailUrl,
                    aspect: 1,
                    corner: CatchNetworkImageSize.md,
                    placeholder: CatchNetworkImageColor.tile,
                  ),
                ),
            ],
          ),
        for (final upload in state.uploads)
          CatchIndexRow(
            key: ValueKey<String>('host-event-photo-upload-${upload.photoId}'),
            density: CatchIndexRowSize.regular,
            icon: CatchIcons.addPhoto,
            iconTone: upload.isFailed
                ? CatchIndexRowTone.danger
                : CatchIndexRowTone.neutral,
            title: switch (upload.stage) {
              HostEventPhotoUploadStage.preparing =>
                l10n.hostEventPhotosPreparing,
              HostEventPhotoUploadStage.uploading =>
                l10n.hostEventPhotosUploading(
                  percent: (upload.progress * 100).round(),
                ),
              HostEventPhotoUploadStage.sharing => l10n.hostEventPhotosSharing,
              HostEventPhotoUploadStage.failed => l10n.hostEventPhotosFailed,
            },
            titleMaxLines: 2,
            progress: upload.isFailed
                ? null
                : CatchIndexRowProgress(
                    value: (upload.progress * 100).round(),
                    label: l10n.hostEventPhotosUploadProgress,
                  ),
            action: upload.isFailed
                ? CatchIndexRowAction(
                    label: l10n.hostEventPhotosRetry,
                    onPressed: () => onRetry(upload.photoId),
                  )
                : null,
            onTap: upload.isFailed ? () => onDismiss(upload.photoId) : null,
            semanticLabel: upload.isFailed
                ? '${l10n.hostEventPhotosFailed}. ${l10n.hostEventPhotosDismiss}'
                : null,
          ),
        if (photos.isNotEmpty || state.uploads.isNotEmpty)
          CatchText(
            state.isFull ? l10n.hostEventPhotosFull : l10n.hostEventPhotosNote,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
  }
}
