import 'dart:convert';
import 'dart:typed_data';
import 'package:meta/meta.dart';

@immutable
class FormProfilePhotoPreview {
  FormProfilePhotoPreview({
    required Uint8List bytes,
    required this.width,
    required this.height,
  }) : bytes = Uint8List.fromList(bytes).asUnmodifiableView();

  factory FormProfilePhotoPreview.fromMap(Map<Object?, Object?> data) {
    final encoded = data['previewBase64'];
    final width = data['width'];
    final height = data['height'];
    if (data['contentType'] != 'image/jpeg' ||
        encoded is! String ||
        encoded.length > 349528 ||
        width is! int ||
        height is! int ||
        width < 1 ||
        height < 1 ||
        width > 640 ||
        height > 640) {
      throw const FormatException('Invalid private photo preview');
    }
    final bytes = base64Decode(encoded);
    if (bytes.length > 256 * 1024 ||
        bytes.length < 3 ||
        bytes[0] != 0xff ||
        bytes[1] != 0xd8 ||
        bytes[2] != 0xff) {
      throw const FormatException('Invalid private preview image');
    }
    return FormProfilePhotoPreview(bytes: bytes, width: width, height: height);
  }
  final Uint8List bytes;
  final int width;
  final int height;
}
