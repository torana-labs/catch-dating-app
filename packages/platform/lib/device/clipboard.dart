import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:flutter/services.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'clipboard.g.dart';

typedef ClipboardSetter = Future<void> Function(ClipboardData data);

// keepalive: account-free: a stateless platform facade with no account state.
@Riverpod(keepAlive: true)
ClipboardSetter clipboardSetter(Ref ref) => Clipboard.setData;

// keepalive: account-free: a stateless platform facade with no account state.
@Riverpod(keepAlive: true)
ClipboardController clipboardController(Ref ref) =>
    ClipboardController(ref.watch(clipboardSetterProvider));

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
