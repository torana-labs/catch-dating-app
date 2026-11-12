import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// "Photos from {organizer}" on the after-event screen: the photos the host
/// team shared with the guests who checked in, in a horizontal strip. A tap
/// opens one full screen through [onOpen].
///
/// The caller leaves the section out when there are no photos. It binds the
/// photos to library components and draws nothing itself.
class EventRecapHostPhotosSection extends StatelessWidget {
  const EventRecapHostPhotosSection({
    super.key,
    required this.organizerName,
    required this.photos,
    required this.onOpen,
  });

  final String? organizerName;
  final List<EventHostPhoto> photos;

  /// Receives the index of the tapped photo.
  final ValueChanged<int> onOpen;

  static const double thumbnailWidth = 132;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final organizer = organizerName;
    final title = organizer == null
        ? l10n.afterEventPhotosTitleNoOrganizer
        : l10n.afterEventPhotosTitle(organizer: organizer);
    return CatchSection.divided(
      key: const ValueKey<String>('after-event-host-photos'),
      title: title,
      first: true,
      showInternalDividers: false,
      children: [
        CatchRail(
          label: title,
          itemWidth: thumbnailWidth,
          wrap: CatchRailMode.never,
          children: [
            for (final (index, photo) in photos.indexed)
              CatchSurface(
                key: ValueKey<String>('after-event-host-photo-$index'),
                padding: CatchSurfacePadding.none,
                semanticLabel: l10n.afterEventPhotoLabel(
                  index: index + 1,
                  count: photos.length,
                ),
                onPress: () => onOpen(index),
                child: CatchNetworkImage(
                  photo.thumbnailUrl,
                  aspect: 3 / 4,
                  corner: CatchNetworkImageSize.md,
                  placeholder: CatchNetworkImageColor.tile,
                ),
              ),
          ],
        ),
        CatchText(
          l10n.afterEventPhotosNote,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
      ],
    );
  }
}
