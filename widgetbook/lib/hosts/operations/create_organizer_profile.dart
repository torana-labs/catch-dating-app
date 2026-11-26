import 'package:catch_platform/media/ordered_photo_picker.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'fixtures.dart';
import 'preview.dart';

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
    ),
  );
}
