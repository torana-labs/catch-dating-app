import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class OrganizerPhotoRail extends StatelessWidget {
  const OrganizerPhotoRail({super.key, required this.organizer});

  final Organizer organizer;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final photos = organizer.organizerPhotos.take(3).toList();

    return Column(
      children: [
        Row(
          children: [
            for (var index = 0; index < photos.length; index++) ...[
              Expanded(
                child: AspectRatio(
                  aspectRatio: 1,
                  child: CatchSurface(
                    duration: Duration.zero,
                    tone: CatchSurfaceTone.transparent,
                    radius: CatchRadius.infoTile,
                    clipBehavior: Clip.antiAlias,
                    // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
                    child: ColoredBox(
                      color: t.primarySoft,
                      child: CatchNetworkImage(
                        photos[index].thumbnailOrUrl,
                        errorBuilder: (_, _, _) => Icon(
                          CatchIcons.people,
                          color: t.ink2,
                          size: CatchIconSize.lg,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (index != photos.length - 1) gapW8,
            ],
          ],
        ),
        gapH8,
        Row(
          children: [
            Text(
              context.l10n.organizersOrganizerPhotoStripTextFromTheOrganizer,
              style: CatchTextStyles.monoLabelS(context, color: t.ink),
            ),
            const Spacer(),
            Text(
              context.l10n.organizersOrganizerPhotoStripTextLengthPhotos(
                length: organizer.organizerPhotos.length,
              ),
              style: CatchTextStyles.monoLabelS(context, color: t.ink3),
            ),
          ],
        ),
      ],
    );
  }
}
