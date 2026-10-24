import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class CreateEventPhotoPicker extends StatelessWidget {
  const CreateEventPhotoPicker({
    super.key,
    required this.photos,
    required this.onAddPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    required this.organizerName,
    this.organizerLogoUrl,
  });

  final List<OrderedPhotoPreview> photos;
  final VoidCallback? onAddPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final String organizerName;
  final String? organizerLogoUrl;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) {
      return CatchSection.divided(
        title: context.l10n.hostsCreateEventPhotoPickerTitleCoverAndGallery,
        count: context.l10n.coreCatchFormFieldLabelTextOptional,
        showInternalDividers: false,
        child: Padding(
          padding: CatchInsets.fieldSectionChildTop,
          child: KeyedSubtree(
            key: const ValueKey('create_event.inherited_organizer_logo'),
            child: CatchField.action(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('create_event.add_event_photos'),
              title: context
                  .l10n
                  .hostsCreateEventPhotoPickerVisiblecopyAddEventPhotos,
              body: context.l10n.hostsCreateEventPhotoPickerBodyInheritedLogo,
              icon: CatchIcons.addPhotoAlternateOutlined,
              onTap: onAddPhotos,
            ),
          ),
        ),
      );
    }
    return CatchSection.divided(
      title: context.l10n.hostsCreateEventPhotoPickerTitleCoverAndGallery,
      count: context.l10n.coreCatchFormFieldLabelTextOptional,
      showInternalDividers: false,
      child: Padding(
        padding: CatchInsets.fieldSectionChildTop,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _InheritedOrganizerLogo(
              organizerName: organizerName,
              organizerLogoUrl: organizerLogoUrl,
            ),
            gapH12,
            CatchText(
              context.l10n.hostsCreateEventPhotoPickerBodyUnlimitedGallery,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink3,
            ),
            gapH16,
            OrderedPhotoPicker(
              photos: photos,
              onAddPhotos: onAddPhotos,
              onRemovePhoto: onRemovePhoto,
              onReorderPhoto: onReorderPhoto,
              emptyActionLabel: context
                  .l10n
                  .hostsCreateEventPhotoPickerVisiblecopyAddEventPhotos,
              addActionLabel:
                  context.l10n.hostsCreateEventPhotoPickerVisiblecopyAddPhotos,
            ),
          ],
        ),
      ),
    );
  }
}

class _InheritedOrganizerLogo extends StatelessWidget {
  const _InheritedOrganizerLogo({
    required this.organizerName,
    required this.organizerLogoUrl,
  });

  final String organizerName;
  final String? organizerLogoUrl;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      key: const ValueKey('create_event.inherited_organizer_logo'),
      children: [
        SizedBox.square(
          dimension: CatchLayout.hostMediaInheritedLogoExtent,
          child: CatchSurface(
            tone: CatchSurfaceTone.raised,
            radius: CatchRadius.md,
            borderRole: CatchBorderRole.boundary,
            clipBehavior: Clip.antiAlias,
            child: organizerLogoUrl == null
                ? Icon(CatchIcons.groupsOutlined, color: t.ink2)
                : CatchNetworkImage(
                    organizerLogoUrl!,
                    errorBuilder: (_, _, _) =>
                        Icon(CatchIcons.groupsOutlined, color: t.ink2),
                  ),
          ),
        ),
        gapW12,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                organizerName,
                style: CatchTextStyles.labelL(context, color: t.ink),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              gapH2,
              CatchText(
                context.l10n.hostsCreateEventPhotoPickerBodyInheritedLogo,
                variant: CatchTextVariant.supporting,
                color: t.ink3,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
