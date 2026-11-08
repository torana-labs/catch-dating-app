import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/create_organizer_photos_picker.dart';
import 'package:catch_platform/media/ordered_photo_picker.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Media states',
  type: CreateOrganizerPhotosPicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerPhotosPickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerPhotosPicker',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: const [],
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit strip',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('club-photo', 3),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: '24-photo scalable gallery',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews('large-club-photo', 24),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed upload',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerPhotosPicker(
            photos: widgetbookOrderedPhotoPreviews(
              'failed-club-photo',
              3,
              failedIndex: 0,
            ),
            onAddPhotos: () {},
            onRemovePhoto: (_) {},
            onReorderPhoto: (_, _) {},
            onRetryPhoto: (_) {},
            variant: CreateOrganizerPhotosPickerVariant.editStrip,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Scalable gallery manager',
  type: OrderedPhotoManagerScreen,
  path: '[P1 product surfaces]/Host create club',
)
Widget orderedPhotoManagerCatalogState(BuildContext context) {
  return WidgetbookHostDeviceFrame(
    child: OrderedPhotoManagerScreen(
      photos: widgetbookOrderedPhotoPreviews('manager-photo', 24),
      onAddPhotos: () {},
      onRemovePhoto: (_) {},
      onReorderPhoto: (_, _) {},
      onRetryPhoto: (_) {},
      canAdd: true,
      header: CreateOrganizerProfileImagePicker(
        imageBytes: widgetbookCreateOrganizerPngBytes(),
        onTap: () {},
        onRemove: () {},
        variant: CreateOrganizerProfileImagePickerVariant.editLogo,
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Role-sized summary states',
  type: HostOrganizerMediaRail,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerMediaRailCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostOrganizerMediaRail',
    contractId: 'component.host.club.photos_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'logo, cover, and gallery',
        child: WidgetbookHostDeviceFrame(
          child: HostOrganizerMediaRail(
            logoImageBytes: widgetbookCreateOrganizerPngBytes(),
            logoImageUrl: null,
            photos: widgetbookOrderedPhotoPreviews('summary-photo', 3),
            logoBadgeLabel: 'LOGO',
            addPhotosLabel: 'Add photos',
            onManageMedia: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compact empty',
        child: WidgetbookHostDeviceFrame(
          child: HostOrganizerMediaRail(
            logoImageBytes: null,
            logoImageUrl: null,
            photos: const [],
            logoBadgeLabel: 'LOGO',
            addPhotosLabel: 'Add photos',
            onManageMedia: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Logo states',
  type: HostOrganizerLogoManagerHeader,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerLogoManagerHeaderStates(BuildContext context) =>
    widgetbookHostComponentStates('HostOrganizerLogoManagerHeader', [
      (
        'logo picked',
        HostOrganizerLogoManagerHeader(
          imageBytes: widgetbookCreateOrganizerPngBytes(),
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
      (
        'no logo',
        HostOrganizerLogoManagerHeader(
          imageBytes: null,
          existingImageUrl: null,
          onPickLogo: () async => null,
          onRemoveLogo: () async {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Save dock',
  type: HostOrganizerMediaManagerDock,
  path: '[P1 product surfaces]/Host organizer',
)
Widget hostOrganizerMediaManagerDockStates(BuildContext context) =>
    widgetbookHostComponentStates('HostOrganizerMediaManagerDock', [
      (
        'ready to save',
        HostOrganizerMediaManagerDock(
          onSave: () async => false,
          errorText: (_) => null,
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Image states',
  type: CreateOrganizerProfileImagePicker,
  path: '[P1 product surfaces]/Host create club',
)
Widget createOrganizerProfileImagePickerCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateOrganizerProfileImagePicker',
    contractId: 'component.host.club.profile_image_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'standard',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerProfileImagePicker(
            imageBytes: widgetbookCreateOrganizerPngBytes(),
            onTap: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit logo',
        child: WidgetbookHostDeviceFrame(
          child: CreateOrganizerProfileImagePicker(
            imageBytes: widgetbookCreateOrganizerPngBytes(),
            onTap: () {},
            onRemove: () {},
            variant: CreateOrganizerProfileImagePickerVariant.editLogo,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Profile image tile states',
  type: OrganizerProfileImageTile,
  path: '[P1 product surfaces]/Host create club',
)
Widget organizerProfileImageTileCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrganizerProfileImageTile',
    contractId: 'component.host.club.profile_image_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'empty large',
        child: OrganizerProfileImageTile(
          imageBytes: null,
          existingImageUrl: null,
          onTap: () {},
          size: CatchLayout.organizerProfileImagePickerExtent,
          showEmptyLabel: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo filled',
        child: OrganizerProfileImageTile(
          imageBytes: widgetbookCreateOrganizerPngBytes(),
          existingImageUrl: null,
          onTap: () {},
          size: 64,
        ),
      ),
    ],
  );
}
