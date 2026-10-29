import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter/foundation.dart';

/// A [CrashReporter] that prints structured error output to the console.
///
/// Used as a fallback on web where Firebase Crashlytics is not supported.
/// In production, this could be upgraded to send errors to a custom
/// endpoint (e.g. Sentry, Cloud Logging).
final class ConsoleCrashReporter implements CrashReporter {
  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setCustomKey(String key, Object value) async {}

  @override
  Future<void> recordError(
    Object error,
    StackTrace stackTrace, {
    bool fatal = false,
    String? reason,
  }) async {
    debugPrint(
      '[WEB_CRASH] ${reason ?? (fatal ? "FATAL" : "ERROR")}: $error\n$stackTrace',
    );
  }

  @override
  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  }) async {
    debugPrint(
      '[WEB_CRASH] ${fatal ? "FATAL" : "FLUTTER_ERROR"}: ${details.exception}\n${details.stack}',
    );
  }
}
