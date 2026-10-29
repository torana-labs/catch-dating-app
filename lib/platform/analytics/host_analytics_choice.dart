import 'dart:convert';

import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A device-local choice, separate from notification preferences, account
/// identity, website attribution and advertising consent.
final class HostAnalyticsChoiceStore {
  HostAnalyticsChoiceStore({
    Future<String?> Function()? read,
    Future<bool> Function(String)? write,
    DateTime Function()? now,
  }) : _read = read ?? _readPreferences,
       _write = write ?? _writePreferences,
       _now = now ?? DateTime.now;

  static const storageKey = 'catch_host_analytics_choice_v1';
  static const lifetime = Duration(days: 30);
  final Future<String?> Function() _read;
  final Future<bool> Function(String) _write;
  final DateTime Function() _now;

  static Future<String?> _readPreferences() => withAppErrorContext(
    () async => (await SharedPreferences.getInstance()).getString(storageKey),
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'read Host analytics choice',
      resource: 'shared_preferences',
    ),
    mapper: _storageError,
  );

  static Future<bool> _writePreferences(String value) => withAppErrorContext(
    () async =>
        (await SharedPreferences.getInstance()).setString(storageKey, value),
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save Host analytics choice',
      resource: 'shared_preferences',
    ),
    mapper: _storageError,
  );

  static AppException _storageError(
    Object error,
    StackTrace stack,
    BackendErrorContext context,
  ) => BackendOperationException(
    code: 'host-analytics-choice-unavailable',
    message: 'Your analytics choice could not be read or saved.',
    context: context,
  );

  /// Legacy, expired, malformed and unavailable storage all mean denied.
  Future<DateTime?> permittedUntil() async {
    try {
      final raw = await _read();
      if (raw == null) return null;
      final value = jsonDecode(raw);
      if (value is! Map<String, dynamic> ||
          value['version'] != 1 ||
          value['analytics'] != true ||
          value['chosenAt'] is! int) {
        return null;
      }
      final chosenAt = DateTime.fromMillisecondsSinceEpoch(
        value['chosenAt'] as int,
        isUtc: true,
      );
      final now = _now();
      final expiry = chosenAt.add(lifetime);
      return !chosenAt.isAfter(now) && now.isBefore(expiry) ? expiry : null;
    } catch (_) {
      // Optional analytics must not prevent startup or grant on read failure.
      return null;
    }
  }

  Future<DateTime?> save(bool allowed) async {
    final chosenAt = _now();
    final saved = await _write(
      jsonEncode({
        'version': 1,
        'analytics': allowed,
        'chosenAt': chosenAt.millisecondsSinceEpoch,
      }),
    );
    if (!saved) throw StateError('Host analytics choice could not be saved.');
    return allowed ? chosenAt.add(lifetime) : null;
  }
}
