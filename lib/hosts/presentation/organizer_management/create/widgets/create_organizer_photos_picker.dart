import 'dart:typed_data';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum CreateOrganizerPhotosPickerVariant { standard, editStrip }

class CreateOrganizerPhotosPicker extends StatelessWidget {
  const CreateOrganizerPhotosPicker({
    super.key,
    required this.photos,
    this.existingImageUrl,
    required this.onAddPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    this.onRetryPhoto,
    this.onAddPhotosInManager,
    this.variant = CreateOrganizerPhotosPickerVariant.standard,
  });

  final List<OrderedPhotoPreview> photos;
  final String? existingImageUrl;
  final VoidCallback? onAddPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final ValueChanged<int>? onRetryPhoto;
  final Future<List<OrderedPhotoPreview>> Function()? onAddPhotosInManager;
  final CreateOrganizerPhotosPickerVariant variant;

  @override
  Widget build(BuildContext context) {
    final visiblePhotos = photos.isNotEmpty
        ? photos
        : [
            if (existingImageUrl != null)
              OrderedPhotoPreview(
                id: 'existing_legacy_club_cover',
                imageUrl: existingImageUrl,
              ),
          ];
    final hasEditablePhotos = photos.isNotEmpty;
    final editStrip = variant == CreateOrganizerPhotosPickerVariant.editStrip;
    final picker = OrderedPhotoPicker(
      label: editStrip
          ? null
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchFieldLabelText(
                  copy: catchFieldLabelTextCopy(context.l10n),
                  label: context
                      .l10n
                      .hostsCreateOrganizerPhotosPickerLabelOrganizerPhotos,
                  mode: CatchFieldLabelTextMode.optional,
                ),
                gapH4,
                CatchText(
                  context
                      .l10n
                      .hostsCreateOrganizerPhotosPickerTextDragToReorderThe,
                  variant: CatchTextVariant.supporting,
                  color: CatchTokens.of(context).ink3,
                ),
              ],
            ),
      photos: visiblePhotos,
      onAddPhotos: onAddPhotos,
      onRemovePhoto: hasEditablePhotos ? onRemovePhoto : null,
      onReorderPhoto: hasEditablePhotos ? onReorderPhoto : null,
      onRetryPhoto: hasEditablePhotos ? onRetryPhoto : null,
      onAddPhotosInManager: onAddPhotosInManager,
      emptyActionLabel: editStrip
          ? context.l10n.hostsCreateOrganizerPhotosPickerVisiblecopyAddPhotos
          : context
                .l10n
                .hostsCreateOrganizerPhotosPickerVisiblecopyAddOrganizerPhotos,
      addActionLabel:
          context.l10n.hostsCreateOrganizerPhotosPickerVisiblecopyAddPhotos,
      showCoverBadge: true,
    );

    if (!editStrip) return picker;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        picker,
        gapH12,
        CatchText(
          context.l10n.hostsCreateOrganizerPhotosPickerTextDragToReorderThe,
          variant: CatchTextVariant.supporting,
          color: CatchTokens.of(context).ink3,
        ),
      ],
    );
  }
}

enum CreateOrganizerProfileImagePickerVariant { standard, editLogo }

class CreateOrganizerProfileImagePicker extends StatelessWidget {
  const CreateOrganizerProfileImagePicker({
    super.key,
    required this.imageBytes,
    this.existingImageUrl,
    required this.onTap,
    this.onRemove,
    this.variant = CreateOrganizerProfileImagePickerVariant.standard,
  });

  final Uint8List? imageBytes;
  final String? existingImageUrl;
  final VoidCallback? onTap;
  final VoidCallback? onRemove;
  final CreateOrganizerProfileImagePickerVariant variant;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    final hasImage = imageBytes != null || existingImageUrl != null;
    final compact =
        variant == CreateOrganizerProfileImagePickerVariant.editLogo;
    final content = Row(
      children: [
        OrganizerProfileImageTile(
          imageBytes: imageBytes,
          existingImageUrl: existingImageUrl,
          // The adjacent labelled button is the single Add/Replace action.
          // Keeping the preview passive avoids three competing upload cues.
          onTap: null,
          size: compact ? 72 : CatchLayout.organizerProfileImagePickerExtent,
        ),
        gapW16,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(
                context
                    .l10n
                    .hostsCreateOrganizerPhotosPickerTextASquareLogoShown,
                variant: CatchTextVariant.supporting,
                color: t.ink2,
              ),
              gapH8,
              Wrap(
                spacing: CatchSpacing.s1,
                runSpacing: CatchSpacing.s1,
                children: [
                  CatchButton.text(
                    label: hasImage
                        ? context
                              .l10n
                              .hostsCreateOrganizerPhotosPickerActionReplaceLogo
                        : context
                              .l10n
                              .hostsCreateOrganizerPhotosPickerActionAddLogo,
                    onPressed: onTap,
                    padding: EdgeInsets.zero,
                  ),
                  if (hasImage)
                    CatchButton.text(
                      label: context
                          .l10n
                          .hostsCreateOrganizerPhotosPickerActionRemoveLogo,
                      onPressed: onRemove,
                      tone: CatchButtonTone.danger,
                      padding: EdgeInsets.zero,
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );

    if (compact) return content;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchFieldLabelText(
          copy: catchFieldLabelTextCopy(context.l10n),
          label: context
              .l10n
              .hostsCreateOrganizerPhotosPickerLabelOrganizerProfileImage,
          mode: CatchFieldLabelTextMode.optional,
        ),
        gapH8,
        content,
      ],
    );
  }
}

class OrganizerProfileImageTile extends StatelessWidget {
  const OrganizerProfileImageTile({
    super.key,
    required this.imageBytes,
    required this.existingImageUrl,
    required this.onTap,
    required this.size,
    this.showEmptyLabel = false,
  });

  final Uint8List? imageBytes;
  final String? existingImageUrl;
  final VoidCallback? onTap;
  final double size;
  final bool showEmptyLabel;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hasImage = imageBytes != null || existingImageUrl != null;
    final interactive = onTap != null;
    final Widget content;

    if (imageBytes case final bytes?) {
      // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
      content = Image.memory(bytes, fit: BoxFit.cover);
    } else if (existingImageUrl case final imageUrl?) {
      content = CatchNetworkImage(
        imageUrl,
        errorBuilder: (_, _, _) => CatchSurface(
          backgroundColor: t.raised,
          radius: CatchRadius.none,
          duration: Duration.zero,
          child: const LimitedBox(
            maxWidth: 0,
            maxHeight: 0,
            child: SizedBox.expand(),
          ),
        ),
      );
    } else {
      content = CatchSurface(
        duration: Duration.zero,
        radius: CatchRadius.none,
        backgroundColor: t.raised,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              interactive ? CatchIcons.addPhoto : CatchIcons.photo,
              size: CatchIconSize.hero,
              color: t.ink2,
            ),
            if (interactive &&
                showEmptyLabel &&
                size >= 112 &&
                MediaQuery.textScalerOf(context).scale(1) < 1.6) ...[
              gapH8,
              Padding(
                padding: CatchInsets.inlineHorizontal,
                child: CatchText(
                  context.l10n.hostsCreateOrganizerPhotosPickerTextAddImage,
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ],
        ),
      );
    }

    final tile = SizedBox.square(
      dimension: size,
      child: CatchSurface(
        onTap: onTap,
        tone: CatchSurfaceTone.raised,
        radius: CatchRadius.md,
        borderRole: CatchBorderRole.boundary,
        clipBehavior: Clip.antiAlias,
        child: content,
      ),
    );

    if (!interactive) {
      return hasImage
          ? Semantics(
              image: true,
              label: context
                  .l10n
                  .hostsCreateOrganizerPhotosPickerLabelOrganizerProfileImage,
              child: tile,
            )
          : ExcludeSemantics(child: tile);
    }

    return Semantics(
      button: true,
      label: hasImage
          ? context
                .l10n
                .hostsCreateOrganizerPhotosPickerLabelChangeOrganizerProfileImage
          : context
                .l10n
                .hostsCreateOrganizerPhotosPickerLabelAddOrganizerProfileImage,
      child: tile,
    );
  }
}
