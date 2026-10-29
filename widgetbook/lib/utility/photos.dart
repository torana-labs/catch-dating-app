import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_slot_tile.dart';
import 'package:catch_dating_app/image_uploads/shared/profile_photo_editor_screen.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';
import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

const double _utilityPhotoSlotWidth = 168;

const double _utilityPhotoSlotHeight = 224;

final _profilePhotos = ProfileSurfaceFixtures.profilePhotos(
  owner: widgetbookUtilityViewerUid,
  seed: 'utility',
);

final _orderedPhotoPreviews = [
  for (final photo in _profilePhotos.take(3))
    OrderedPhotoPreview(id: photo.id, imageUrl: photo.url),
];

@widgetbook.UseCase(
  name: 'Grid states',
  type: PhotoGrid,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget photoGridStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PhotoGrid',
    contractId: 'component.image_uploads.photo_grid',
    children: [
      WidgetbookPageStateCard(
        label: 'empty with first slot loading',
        child: PhotoGrid(
          profilePhotos: const [],
          loadingIndices: const {0},
          onSlotTapped: _noopIndex,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'filled editable grid',
        child: PhotoGrid(
          profilePhotos: _profilePhotos.take(4).toList(growable: false),
          onSlotTapped: _noopIndex,
          onDeletePhoto: _noopIndex,
          onReorderPhoto: _noopReorder,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Picker states',
  type: OrderedPhotoPicker,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget orderedPhotoPickerStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrderedPhotoPicker',
    contractId: 'component.image_uploads.ordered_photo_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'empty picker',
        child: OrderedPhotoPicker(
          label: Text(
            'Event photos',
            style: CatchTextStyles.sectionTitle(context),
          ),
          photos: const [],
          onAddPhotos: widgetbookNoop,
          onRemovePhoto: _noopIndex,
          onReorderPhoto: _noopReorder,
          emptyActionLabel: 'Add event photos',
          addActionLabel: 'Add more',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'cover plus reorder',
        child: OrderedPhotoPicker(
          label: Text(
            'Club photos',
            style: CatchTextStyles.sectionTitle(context),
          ),
          photos: _orderedPhotoPreviews,
          onAddPhotos: widgetbookNoop,
          onRemovePhoto: _noopIndex,
          onReorderPhoto: _noopReorder,
          emptyActionLabel: 'Add club photos',
          addActionLabel: 'Add more',
          showCoverBadge: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'section-owned label',
        child: OrderedPhotoPicker(
          photos: const [],
          onAddPhotos: widgetbookNoop,
          onRemovePhoto: _noopIndex,
          onReorderPhoto: _noopReorder,
          emptyActionLabel: 'Add photos',
          addActionLabel: 'Add more',
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ordered tile states',
  type: OrderedPhotoTile,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget orderedPhotoTileStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OrderedPhotoTile',
    contractId: 'component.image_uploads.ordered_photo_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'cover removable',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityMediaPreviewHeight,
            child: OrderedPhotoTile(
              photo: _orderedPhotoPreviews.first,
              index: 0,
              canReorder: true,
              showCoverBadge: true,
              showReorderHandle: true,
              onRemove: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'read only',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityMediaPreviewHeight,
            child: OrderedPhotoTile(
              photo: _orderedPhotoPreviews.last,
              index: 1,
              canReorder: false,
              showCoverBadge: false,
              showReorderHandle: false,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ordered add tile states',
  type: OrderedPhotoAddTile,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget orderedPhotoAddTileStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'OrderedPhotoAddTile',
    contractId: 'component.image_uploads.ordered_photo_add_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'active',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityMediaPreviewHeight,
            child: OrderedPhotoAddTile(
              label: 'Add event photos',
              onTap: widgetbookNoop,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'disabled compact',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactControlWidth,
            height: WidgetbookPreviewLayout.utilityCompactPreviewHeight,
            child: OrderedPhotoAddTile(label: 'Add more'),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Slot states',
  type: PhotoSlotTile,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget photoSlotStates(BuildContext context) {
  final photo = _profilePhotos.first;
  return WidgetbookPageCatalogFrame(
    title: 'PhotoSlotTile',
    contractId: 'component.image_uploads.photo_slot',
    children: [
      WidgetbookPageStateCard(
        label: 'active empty',
        child: _photoSlotFrame(
          child: PhotoSlotTile(
            index: 0,
            url: null,
            isLoading: false,
            isActive: true,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'uploading placeholder',
        child: _photoSlotFrame(
          child: PhotoSlotTile(
            index: 1,
            url: null,
            isLoading: true,
            isActive: true,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'main photo with prompt',
        child: _photoSlotFrame(
          child: PhotoSlotTile(
            index: 0,
            url: photo.url,
            prompt: photo.prompt,
            badgeLabel: 'MAIN',
            isLoading: false,
            isActive: true,
            onTap: widgetbookNoop,
            onDelete: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Striped placeholder states',
  type: PhotoPlaceholderImage,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget stripedPhotoPlaceholderStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PhotoPlaceholderImage',
    contractId: 'component.image_uploads.striped_photo_placeholder',
    children: [
      WidgetbookPageStateCard(
        label: 'first slot',
        child: _photoSlotFrame(child: const PhotoPlaceholderImage(index: 0)),
      ),
      WidgetbookPageStateCard(
        label: 'sixth slot',
        child: _photoSlotFrame(child: const PhotoPlaceholderImage(index: 5)),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Editor states',
  type: ProfilePhotoEditorScreen,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget profilePhotoEditorScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProfilePhotoEditorScreen',
    contractId: 'screen.image_uploads.profile_photo_editor',
    children: [
      WidgetbookPageStateCard(
        label: 'interactive existing photo editor',
        child: WidgetbookUtilityDeviceFrame(
          child: _ProfilePhotoEditorScope(
            child: ProfilePhotoEditorScreen(
              index: 0,
              photo: _profilePhotos.first,
              canDelete: true,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Editor preview states',
  type: ProfilePhotoEditorPreview,
  path: '[P3 utility surfaces]/Image uploads',
)
Widget profilePhotoEditorPreviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ProfilePhotoEditorPreview',
    contractId: 'component.image_uploads.profile_photo_editor_preview',
    children: [
      WidgetbookPageStateCard(
        label: 'existing image',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityTallPreviewHeight,
            child: ProfilePhotoEditorPreview(
              cropKey: GlobalKey(),
              loading: false,
              url: _profilePhotos.first.url,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityTallPreviewHeight,
            child: ProfilePhotoEditorPreview(
              cropKey: GlobalKey(),
              loading: true,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: Center(
          child: SizedBox(
            width: WidgetbookPreviewLayout.compactComponentWidth,
            height: WidgetbookPreviewLayout.utilityTallPreviewHeight,
            child: ProfilePhotoEditorPreview(
              cropKey: GlobalKey(),
              loading: false,
            ),
          ),
        ),
      ),
    ],
  );
}

class _ProfilePhotoEditorScope extends StatelessWidget {
  const _ProfilePhotoEditorScope({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) => Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(
            widgetbookUtilityViewer.copyWith(profilePhotos: _profilePhotos),
          ),
        ),
        userProfileRepositoryProvider.overrideWithValue(
          ProfileFixtureUserProfileRepository(
            profile: widgetbookUtilityViewer.copyWith(
              profilePhotos: _profilePhotos,
            ),
          ),
        ),
        imageUploadRepositoryProvider.overrideWithValue(
          const _ProfilePhotoEditorPreviewImageRepository(),
        ),
      ],
      child: PopScope(canPop: false, child: child),
    );
  }
}

class _ProfilePhotoEditorPreviewImageRepository
    implements ImageUploadRepository {
  const _ProfilePhotoEditorPreviewImageRepository();

  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async => null;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void _noopIndex(int index) {}

void _noopReorder(int fromIndex, int toIndex) {}

Widget _photoSlotFrame({required Widget child}) {
  return Center(
    child: SizedBox(
      width: _utilityPhotoSlotWidth,
      height: _utilityPhotoSlotHeight,
      child: child,
    ),
  );
}
