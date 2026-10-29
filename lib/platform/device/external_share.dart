import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:share_plus/share_plus.dart';

part 'external_share.g.dart';

typedef ExternalShareLauncher = Future<void> Function(ShareParams params);

// keepalive: share launcher is a platform facade shared by route controllers.
@Riverpod(keepAlive: true)
ExternalShareLauncher externalShareLauncher(Ref ref) => (params) async {
  await SharePlus.instance.share(params);
};

// keepalive: share controller centralizes external share behavior across host
// and public flows.
@Riverpod(keepAlive: true)
ExternalShareController externalShareController(Ref ref) =>
    ExternalShareController(ref.watch(externalShareLauncherProvider));

class ExternalShareController {
  const ExternalShareController(this._share);

  final ExternalShareLauncher _share;

  Future<void> shareText({
    required String text,
    String? subject,
    Rect? origin,
  }) {
    return withBackendErrorContext(
      () => _share(
        ShareParams(text: text, subject: subject, sharePositionOrigin: origin),
      ),
      context: const BackendErrorContext(
        service: BackendService.external,
        action: 'share text',
        resource: 'share_sheet',
      ),
    );
  }

  Future<void> shareCsvFile({
    required String csv,
    required String fileName,
    String? subject,
    String? text,
    Rect? origin,
  }) => _shareFile(
    bytes: Uint8List.fromList(utf8.encode(csv)),
    mimeType: 'text/csv',
    action: 'share csv file',
    fileName: fileName,
    subject: subject,
    text: text,
    origin: origin,
  );

  Future<void> shareJsonFile({
    required String json,
    required String fileName,
    String? subject,
    Rect? origin,
  }) => _shareFile(
    bytes: Uint8List.fromList(utf8.encode(json)),
    mimeType: 'application/json',
    action: 'share json file',
    fileName: fileName,
    subject: subject,
    origin: origin,
  );

  Future<void> sharePngFile({
    required Uint8List pngBytes,
    required String fileName,
    String? subject,
    String? text,
    Rect? origin,
  }) => _shareFile(
    bytes: pngBytes,
    mimeType: 'image/png',
    action: 'share png file',
    fileName: fileName,
    subject: subject,
    text: text,
    origin: origin,
  );

  Future<void> _shareFile({
    required Uint8List bytes,
    required String mimeType,
    required String action,
    required String fileName,
    String? subject,
    String? text,
    Rect? origin,
  }) {
    final file = XFile.fromData(
      bytes,
      name: fileName,
      mimeType: mimeType,
      length: bytes.length,
    );
    return withBackendErrorContext(
      () => _share(
        ShareParams(
          text: text,
          subject: subject,
          title: fileName,
          files: [file],
          fileNameOverrides: [fileName],
          sharePositionOrigin: origin,
        ),
      ),
      context: BackendErrorContext(
        service: BackendService.external,
        action: action,
        resource: 'share_sheet',
      ),
    );
  }
}
