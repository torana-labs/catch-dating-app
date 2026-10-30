import 'dart:convert';
import 'dart:typed_data';

import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';

final widgetbookHostUid = HostOperationsFixtures.hostUid;

final widgetbookOrganizer = HostOperationsFixtures.primaryOrganizer;

final widgetbookPrivateEvent = HostOperationsFixtures.privateEvent;

final widgetbookEditableEvent = HostOperationsFixtures.event(
  id: 'design-host-editable-event',
  organizer: widgetbookOrganizer,
  start: DateTime(2030, 7, 2, 18, 30),
  bookedCount: 0,
);

Uint8List widgetbookCreateOrganizerPngBytes() {
  return base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAFkl'
    'EQVR42mO4Y+DwnxTMMKphVAN2DAApmUpA0AfJaAAAAABJRU5ErkJggg==',
  );
}

List<OrderedPhotoPreview> widgetbookOrderedPhotoPreviews(
  String prefix,
  int count, {
  int? failedIndex,
}) {
  final bytes = widgetbookCreateOrganizerPngBytes();
  return [
    for (var index = 0; index < count; index++)
      OrderedPhotoPreview(
        id: '$prefix-$index',
        bytes: bytes,
        status: index == failedIndex
            ? OrderedPhotoStatus.failed
            : OrderedPhotoStatus.ready,
      ),
  ];
}
