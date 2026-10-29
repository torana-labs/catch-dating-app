import 'dart:async';

import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/console_crash_reporter.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'error_logger.g.dart';

// ── CrashReporter interface ───────────────────────────────────────────────────

abstract interface class CrashReporter {
  Future<void> setCollectionEnabled(bool enabled);
  Future<void> setCustomKey(String key, Object value);

  Future<void> recordError(
    Object error,
    StackTrace stackTrace, {
    bool fatal = false,
    String? reason,
  });

  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  });
}

final class FirebaseCrashReporter implements CrashReporter {
  FirebaseCrashReporter(this._crashlytics);
  final FirebaseCrashlytics _crashlytics;

  @override
  Future<void> setCollectionEnabled(bool enabled) =>
      _crashlytics.setCrashlyticsCollectionEnabled(enabled);

  @override
  Future<void> setCustomKey(String key, Object value) =>
      _crashlytics.setCustomKey(key, value);

  @override
  Future<void> recordError(
    Object error,
    StackTrace stackTrace, {
    bool fatal = false,
    String? reason,
  }) =>
      _crashlytics.recordError(error, stackTrace, fatal: fatal, reason: reason);

  @override
  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  }) => fatal
      ? _crashlytics.recordFlutterFatalError(details)
      : _crashlytics.recordFlutterError(details);
}

// ── Log level ─────────────────────────────────────────────────────────────────

enum LogLevel { fatal, error, warn, info, debug }

typedef ErrorLogSink = void Function(String message);

void _discardErrorLogLine(String _) {}

// ── ErrorLogger ───────────────────────────────────────────────────────────────

class ErrorLogger {
  ErrorLogger({
    CrashReporter? crashReporter,
    bool? shouldReportErrors,
    ErrorLogSink? consoleSink,
  }) : _crashReporter = crashReporter ?? _defaultCrashReporter,
       _shouldReportErrors = shouldReportErrors ?? _defaultShouldReportErrors,
       _consoleSink = consoleSink ?? debugPrint;

  /// Keeps expected failures observable through an optional [crashReporter]
  /// without writing expected stack traces into deterministic test/capture logs.
  ErrorLogger.silent({
    CrashReporter? crashReporter,
    bool shouldReportErrors = false,
  }) : this._configured(
         crashReporter,
         shouldReportErrors,
         _discardErrorLogLine,
       );

  ErrorLogger._configured(
    this._crashReporter,
    this._shouldReportErrors,
    this._consoleSink,
  );

  final CrashReporter? _crashReporter;
  final bool _shouldReportErrors;
  final ErrorLogSink _consoleSink;

  static CrashReporter get _defaultCrashReporter {
    if (kIsWeb) return ConsoleCrashReporter();
    if (AppConfig.shouldUseFirebaseCrashReporter) {
      return FirebaseCrashReporter(FirebaseCrashlytics.instance);
    }
    return ConsoleCrashReporter();
  }

  static bool get _defaultShouldReportErrors {
    return AppConfig.shouldCollectObservability;
  }

  bool get _canReport => _shouldReportErrors && _crashReporter != null;

  // ── Initialization ──────────────────────────────────────────────────────────

  Future<void> initialize() async {
    final crashReporter = _crashReporter;
    if (crashReporter == null) return;

    await crashReporter.setCollectionEnabled(_shouldReportErrors);
    if (!_shouldReportErrors) return;

    await crashReporter.setCustomKey(
      'app_environment',
      AppConfig.environmentName,
    );
    await crashReporter.setCustomKey(
      'use_firebase_emulators',
      AppConfig.useFirebaseEmulators,
    );
    await crashReporter.setCustomKey('platform', defaultTargetPlatform.name);

    final packageInfo = await PackageInfo.fromPlatform();
    await crashReporter.setCustomKey('app_version', packageInfo.version);
    await crashReporter.setCustomKey('build_number', packageInfo.buildNumber);
  }

  /// Sets the current user ID as a Crashlytics custom key so crash reports
  /// are attributable to a specific user. Call when the auth state changes.
  void setUserId(String? uid) {
    if (!_canReport) return;
    unawaited(_crashReporter!.setCustomKey('user_id', uid ?? 'anonymous'));
  }

  // ── Structured logging ─────────────────────────────────────────────────────

  /// Primary logging method. All other log methods delegate here.
  ///
  /// [level] determines severity. Errors at [LogLevel.fatal] or [LogLevel.error]
  /// are reported to Crashlytics (in production). All levels are printed to
  /// the console in debug mode.
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {
    _writeConsoleLog(
      level: level,
      message: message,
      error: error,
      stackTrace: stackTrace,
      context: context,
    );

    if ((level == LogLevel.fatal || level == LogLevel.error) && _canReport) {
      unawaited(
        _crashReporter!.recordError(
          error ?? message,
          stackTrace ?? StackTrace.current,
          fatal: level == LogLevel.fatal,
          reason: message,
        ),
      );
    }
  }

  void _writeConsoleLog({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {
    final timestamp = DateTime.now().toIso8601String();
    final prefix = level.name.toUpperCase();
    final ctx = context != null ? ' ${_formatContext(context)}' : '';
    _consoleSink('[$prefix][$timestamp]$ctx $message');
    if (error != null) _consoleSink('  error=$error');
    if (stackTrace != null) _consoleSink('  $stackTrace');
  }

  String _formatContext(Map<String, String> context) =>
      context.entries.map((e) => '${e.key}=${e.value}').join(' ');

  // ── Convenience methods (backward-compatible) ───────────────────────────────

  void logFlutterError(FlutterErrorDetails details, {bool fatal = false}) {
    _writeConsoleLog(
      level: fatal ? LogLevel.fatal : LogLevel.error,
      message: 'Flutter error: ${details.exception}',
      error: details.exception,
      stackTrace: details.stack,
    );
    if (!_canReport) return;
    unawaited(_crashReporter!.recordFlutterError(details, fatal: fatal));
  }

  void logError(
    Object error,
    StackTrace? stackTrace, {
    bool fatal = false,
    String? reason,
  }) {
    log(
      level: fatal ? LogLevel.fatal : LogLevel.error,
      message: reason ?? 'Unexpected error: $error',
      error: error,
      stackTrace: stackTrace,
    );
  }

  void logAppException(AppException exception) {
    final level = switch (exception.severity) {
      AppErrorSeverity.info => LogLevel.info,
      AppErrorSeverity.warning => LogLevel.warn,
      AppErrorSeverity.error => LogLevel.error,
      AppErrorSeverity.fatal => LogLevel.fatal,
    };
    log(
      level: level,
      message: '[${exception.code}] ${exception.message}',
      error: exception.cause ?? exception,
      stackTrace: exception.stackTrace,
      context: exception.context?.toLogContext(),
    );
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

// keepalive: error logger is app infrastructure and must remain available for
// providers even when no screen watches it. App bootstrap initializes this
// container-owned instance before feature providers can emit failures.
@Riverpod(keepAlive: true)
ErrorLogger errorLogger(Ref ref) => ErrorLogger();

// ── ProviderObserver ──────────────────────────────────────────────────────────

base class AsyncErrorLogger extends ProviderObserver {
  AsyncErrorLogger({this.onBackendOperationFailed});

  /// Called when an [AppException] has structured backend context.
  final void Function(
    ProviderContainer container, {
    required BackendErrorContext context,
    required String errorCode,
    required bool retryable,
    required AppErrorSeverity severity,
  })?
  onBackendOperationFailed;

  @override
  void didAddProvider(ProviderObserverContext context, Object? value) {
    _observeValue(context, value);
  }

  @override
  void didUpdateProvider(
    ProviderObserverContext context,
    Object? previousValue,
    Object? newValue,
  ) {
    _observeValue(context, newValue);
  }

  void _observeValue(ProviderObserverContext context, Object? value) {
    if (value is AsyncError) {
      _logObservedError(context.container, value.error, value.stackTrace);
    } else if (value is MutationError) {
      _logObservedError(context.container, value.error, value.stackTrace);
    }
  }

  void _logObservedError(
    ProviderContainer container,
    Object error,
    StackTrace stackTrace,
  ) {
    final logger = container.read(errorLoggerProvider);
    if (error is AppException) {
      logger.logAppException(error);
      final backendContext = error.context;
      if (backendContext != null) {
        onBackendOperationFailed?.call(
          container,
          context: backendContext,
          errorCode: error.code,
          retryable: error.retryable,
          severity: error.severity,
        );
      }
    } else {
      logger.logError(error, stackTrace);
    }
  }
}
