import 'dart:typed_data';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum CreateClubPhotosPickerVariant { standard, editStrip }

class CreateClubPhotosPicker extends StatelessWidget {
  const CreateClubPhotosPicker({
    super.key,
    required this.photos,
    this.existingImageUrl,
    required this.onAddPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    this.onRetryPhoto,
    this.onAddPhotosInManager,
    this.variant = CreateClubPhotosPickerVariant.standard,
  });

  final List<OrderedPhotoPreview> photos;
  final String? existingImageUrl;
  final VoidCallback? onAddPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final ValueChanged<int>? onRetryPhoto;
  final Future<List<OrderedPhotoPreview>> Function()? onAddPhotosInManager;
  final CreateClubPhotosPickerVariant variant;

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
    final editStrip = variant == CreateClubPhotosPickerVariant.editStrip;
    final picker = OrderedPhotoPicker(
      label: editStrip
          ? null
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchFieldLabelText(
                  copy: catchFieldLabelTextCopy(context.l10n),
                  label:
                      context.l10n.hostsCreateClubPhotosPickerLabelClubPhotos,
                  mode: CatchFieldLabelTextMode.optional,
                ),
                gapH4,
                CatchText(
                  context.l10n.hostsCreateClubPhotosPickerTextDragToReorderThe,
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
          ? context.l10n.hostsCreateClubPhotosPickerVisiblecopyAddPhotos
          : context.l10n.hostsCreateClubPhotosPickerVisiblecopyAddClubPhotos,
      addActionLabel:
          context.l10n.hostsCreateClubPhotosPickerVisiblecopyAddPhotos,
      showCoverBadge: true,
    );

    if (!editStrip) return picker;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        picker,
        gapH12,
        CatchText(
          context.l10n.hostsCreateClubPhotosPickerTextDragToReorderThe,
          variant: CatchTextVariant.supporting,
          color: CatchTokens.of(context).ink3,
        ),
      ],
    );
  }
}

enum CreateClubProfileImagePickerVariant { standard, editLogo }

class CreateClubProfileImagePicker extends StatelessWidget {
  const CreateClubProfileImagePicker({
    super.key,
    required this.imageBytes,
    this.existingImageUrl,
    required this.onTap,
    this.onRemove,
    this.variant = CreateClubProfileImagePickerVariant.standard,
  });

  final Uint8List? imageBytes;
  final String? existingImageUrl;
  final VoidCallback? onTap;
  final VoidCallback? onRemove;
  final CreateClubProfileImagePickerVariant variant;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    final hasImage = imageBytes != null || existingImageUrl != null;
    final compact = variant == CreateClubProfileImagePickerVariant.editLogo;
    final content = Row(
      children: [
        ClubProfileImageTile(
          imageBytes: imageBytes,
          existingImageUrl: existingImageUrl,
          // The adjacent labelled button is the single Add/Replace action.
          // Keeping the preview passive avoids three competing upload cues.
          onTap: null,
          size: compact ? 72 : CatchLayout.clubProfileImagePickerExtent,
        ),
        gapW16,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(
                context.l10n.hostsCreateClubPhotosPickerTextASquareLogoShown,
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
                              .hostsCreateClubPhotosPickerActionReplaceLogo
                        : context.l10n.hostsCreateClubPhotosPickerActionAddLogo,
                    onPressed: onTap,
                    padding: EdgeInsets.zero,
                  ),
                  if (hasImage)
                    CatchButton.text(
                      label: context
                          .l10n
                          .hostsCreateClubPhotosPickerActionRemoveLogo,
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
          label: context.l10n.hostsCreateClubPhotosPickerLabelClubProfileImage,
          mode: CatchFieldLabelTextMode.optional,
        ),
        gapH8,
        content,
      ],
    );
  }
}

class ClubProfileImageTile extends StatelessWidget {
  const ClubProfileImageTile({
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
      content = Image.memory(bytes, fit: BoxFit.cover);
    } else if (existingImageUrl case final imageUrl?) {
      content = CatchNetworkImage(
        imageUrl,
        errorBuilder: (_, _, _) => Container(color: t.raised),
      );
    } else {
      content = ColoredBox(
        color: t.raised,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              interactive
                  ? CatchIcons.addPhotoAlternateOutlined
                  : CatchIcons.imageOutlined,
              size: CatchIcon.hero,
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
                  context.l10n.hostsCreateClubPhotosPickerTextAddImage,
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
              label:
                  context.l10n.hostsCreateClubPhotosPickerLabelClubProfileImage,
              child: tile,
            )
          : ExcludeSemantics(child: tile);
    }

    return Semantics(
      button: true,
      label: hasImage
          ? context.l10n.hostsCreateClubPhotosPickerLabelChangeClubProfileImage
          : context.l10n.hostsCreateClubPhotosPickerLabelAddClubProfileImage,
      child: GestureDetector(onTap: onTap, child: tile),
    );
  }
}
