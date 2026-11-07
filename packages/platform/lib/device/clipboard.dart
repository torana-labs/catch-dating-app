import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef ClipboardSetter = Future<void> Function(ClipboardData data);

// keepalive: a stateless platform facade with no account state.
final clipboardSetterProvider = Provider<ClipboardSetter>(
  (ref) => Clipboard.setData,
);

// keepalive: a stateless platform facade with no account state.
final clipboardControllerProvider = Provider<ClipboardController>(
  (ref) => ClipboardController(ref.watch(clipboardSetterProvider)),
);

class ClipboardController {
  const ClipboardController(this._setData);

  final ClipboardSetter _setData;

  Future<void> copyText(String text) {
    return withBackendErrorContext(
      () => _setData(ClipboardData(text: text)),
      context: const BackendErrorContext(
        service: BackendService.external,
        action: 'copy text',
        resource: 'clipboard',
      ),
    );
  }
}
