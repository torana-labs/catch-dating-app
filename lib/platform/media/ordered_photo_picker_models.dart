part of 'ordered_photo_picker.dart';

enum OrderedPhotoStatus { ready, queued, uploading, failed }

class OrderedPhotoPreview {
  const OrderedPhotoPreview({
    required this.id,
    this.bytes,
    this.imageUrl,
    this.status = OrderedPhotoStatus.ready,
    this.progress,
    this.error,
  });

  final String id;
  final Uint8List? bytes;
  final String? imageUrl;
  final OrderedPhotoStatus status;
  final double? progress;
  final Object? error;

  bool get hasImage => bytes != null || imageUrl != null;
}

abstract final class OrderedPhotoPickerKeys {
  static ValueKey<String> addAction(String label) =>
      ValueKey('ordered_photo_add_$label');

  static ValueKey<String> removeAction(int index) =>
      ValueKey('ordered_photo_remove_$index');

  static const manageAction = ValueKey('ordered_photo_manage');
  static const managerScreen = ValueKey('ordered_photo_manager_screen');
  static const coverRetryAction = ValueKey('ordered_photo_cover_retry');
  static ValueKey<String> setCoverAction(int index) =>
      ValueKey('ordered_photo_set_cover_$index');
  static ValueKey<String> managerRetryAction(int index) =>
      ValueKey('ordered_photo_manager_retry_$index');
}
