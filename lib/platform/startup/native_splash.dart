import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

/// Process-lifetime owner for the native splash handoff.
///
/// Consumer startup removes the native surface as soon as its matching Flutter
/// frame is ready. Host startup keeps the existing force-update-gate handoff.
/// Both paths call [remove], so the platform effect must be idempotent.
abstract final class NativeSplash {
  static bool _removed = false;

  static void preserve({required WidgetsBinding widgetsBinding}) {
    if (kIsWeb) return;
    _removed = false;
    FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);
  }

  static void remove() {
    if (kIsWeb || _removed) return;
    _removed = true;
    FlutterNativeSplash.remove();
  }
}
