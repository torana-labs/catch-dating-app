import 'package:catch_dating_app/contexts/programmes/domain/program_photo_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

const _albumColors = [
  CatchSurfaceColor.nightsOut,
  CatchSurfaceColor.dinner,
  CatchSurfaceColor.courts,
  CatchSurfaceColor.games,
  CatchSurfaceColor.run,
];

/// Photos (RbProgPhotos): the page title, one coloured tile per function
/// album two to a row, the open album's photos with Add photos, where
/// photos come from and the privacy note.
class HostProgrammePhotosBody extends StatelessWidget {
  const HostProgrammePhotosBody({
    super.key,
    required this.status,
    required this.photos,
    required this.now,
    required this.onAlbum,
    required this.onAdd,
    required this.onRetry,
    this.uploading = false,
  });

  final HostProgrammeStatus status;
  final ProgramPhotos? photos;
  final DateTime now;

  /// Opens a function's album; null shows every photo.
  final ValueChanged<String?> onAlbum;

  /// Adds a photo from this phone to the open album.
  final VoidCallback onAdd;
  final VoidCallback onRetry;
  final bool uploading;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final photos = this.photos;
    if (status != HostProgrammeStatus.ready || photos == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    final albums = photos.albums;
    final open = albums
        .where(
          (album) =>
              album.functionId != null && album.functionId == photos.functionId,
        )
        .firstOrNull;
    final tiles = [
      for (var index = 0; index < albums.length; index++)
        _HostProgrammeAlbumTile(
          album: albums[index],
          color: _albumColors[index % 5],
          now: now,
          onAlbum: onAlbum,
        ),
    ];
    return CatchPageBody.screen(
      children: [
        CatchText(
          l10n.hostProgrammePhotosTitle,
          variant: CatchTextVariant.pageTitle,
        ),
        if (tiles.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.photos,
            title: l10n.hostProgrammePhotosNoAlbums,
          ),
        for (var index = 0; index < tiles.length; index += 2)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              tiles[index],
              if (index + 1 < tiles.length)
                tiles[index + 1]
              else
                const CatchStack(children: []),
            ],
          ),
        CatchSection(
          title: open?.name ?? l10n.hostProgrammePhotosAll,
          action: CatchSectionAction(
            label: l10n.hostProgrammePhotosAdd,
            onPressed: uploading ? null : onAdd,
          ),
          dividers: CatchSectionPlacement.none,
          empty: l10n.hostProgrammePhotosEmpty,
          children: [
            for (var index = 0; index < photos.photos.length; index += 3)
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                equal: true,
                children: [
                  for (final photo in photos.photos.skip(index).take(3))
                    CatchNetworkImage(
                      photo.url ?? '',
                      key: ValueKey<String>('host-photo-${photo.photoId}'),
                      aspect: 1,
                      corner: CatchNetworkImageSize.md,
                      placeholder: CatchNetworkImageColor.tile,
                      semanticLabel:
                          photo.caption ?? l10n.hostProgrammePhotosPhoto,
                    ),
                  for (
                    var pad = photos.photos.skip(index).take(3).length;
                    pad < 3;
                    pad++
                  )
                    const CatchStack(children: []),
                ],
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammePhotosSources,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-photos-from-phone'),
              icon: CatchIcons.addPhoto,
              title: l10n.hostProgrammePhotosFromPhone,
              subtitle: open == null
                  ? l10n.hostProgrammePhotosFromPhoneAll
                  : l10n.hostProgrammePhotosFromPhoneAlbum(name: open.name!),
              action: CatchIndexRowAction(
                label: l10n.hostProgrammePhotosAddShort,
                onPressed: uploading ? null : onAdd,
              ),
              onTap: null,
            ),
          ],
        ),
        CatchNotice.inline(
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.protected,
          body: l10n.hostProgrammePhotosPrivacy,
        ),
      ],
    );
  }
}

/// One album: a coloured square with its name and photo count, or when it
/// starts if it has no photos yet.
class _HostProgrammeAlbumTile extends StatelessWidget {
  const _HostProgrammeAlbumTile({
    required this.album,
    required this.color,
    required this.now,
    required this.onAlbum,
  });

  final ProgramPhotoAlbum album;
  final CatchSurfaceColor color;
  final DateTime now;
  final ValueChanged<String?> onAlbum;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final startsAt = album.startsAt;
    final note = album.photoCount > 0
        ? l10n.hostProgrammePhotosCount(count: album.photoCount)
        : startsAt != null && startsAt.isAfter(now)
        ? AppTimeFormatters.weekdayDayMonth(startsAt)
        : l10n.hostProgrammePhotosNone;
    final name = album.name ?? l10n.hostProgrammePhotosOther;
    return CatchSurface(
      key: ValueKey<String>('host-photo-album-${album.functionId ?? 'other'}'),
      block: CatchSurfaceBlock.spotlight,
      color: color,
      aspect: 1,
      semanticLabel: '$name, $note',
      onPress: () => onAlbum(album.functionId),
      child: CatchStack(
        justify: CatchStackJustify.end,
        gap: CatchStackGap.g4,
        children: [
          CatchText(name, variant: CatchTextVariant.displaySm),
          CatchText(note, variant: CatchTextVariant.bodySmall),
        ],
      ),
    );
  }
}
