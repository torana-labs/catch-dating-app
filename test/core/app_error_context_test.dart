import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppErrorContext', () {
    test('maps plugin operations to the external backend service', () {
      const context = AppErrorContext(
        operation: AppOperation.plugin,
        action: 'pick a photo',
        resource: 'image_picker',
      );

      final backend = context.toBackendContext();

      expect(backend.service, BackendService.external);
      expect(backend.action, 'pick a photo');
      expect(backend.resource, 'image_picker');
      expect(backend.metadata['operation'], 'plugin');
    });

    test('maps local operations to the local backend service', () {
      for (final operation in const [
        AppOperation.validation,
        AppOperation.localPersistence,
        AppOperation.navigation,
        AppOperation.ui,
        AppOperation.runtime,
      ]) {
        final context = AppErrorContext(operation: operation, action: 'do it');
        expect(context.toBackendContext().service, BackendService.local);
        expect(
          context.toBackendContext().metadata['operation'],
          operation.logKey,
        );
      }
    });

    test('preserves caller metadata alongside the operation key', () {
      const context = AppErrorContext(
        operation: AppOperation.localPersistence,
        action: 'save draft',
        resource: 'event draft',
        metadata: {'surface': 'create_event'},
      );

      final log = context.toBackendContext().toLogContext();

      expect(log['service'], 'local');
      expect(log['action'], 'save draft');
      expect(log['resource'], 'event draft');
      expect(log['operation'], 'local_persistence');
      expect(log['surface'], 'create_event');
    });
  });

  group('normalizeAppError', () {
    const context = AppErrorContext(
      operation: AppOperation.plugin,
      action: 'pick a photo',
      resource: 'image_picker',
    );

    test('passes existing AppExceptions through unchanged', () {
      const error = ValidationException('Name is required.');
      expect(normalizeAppError(error, context: context), same(error));
    });

    test('wraps unexpected errors into a typed BackendOperationException', () {
      final normalized = normalizeAppError(
        const FormatException('bad payload'),
        context: context,
      );

      expect(normalized, isA<BackendOperationException>());
      expect(normalized.code, 'unexpected');
      expect(normalized.context?.service, BackendService.external);
      expect(normalized.context?.metadata['operation'], 'plugin');
    });

    test('lets a mapper promote a raw error into a typed exception', () {
      final normalized = normalizeAppError(
        'too short',
        context: const AppErrorContext(
          operation: AppOperation.validation,
          action: 'validate name',
        ),
        mapper: (error, stackTrace, ctx) =>
            const ValidationException('Please enter a longer name.'),
      );

      expect(normalized, isA<ValidationException>());
      expect(normalized.message, 'Please enter a longer name.');
    });
  });

  group('withAppErrorContext', () {
    const context = AppErrorContext(
      operation: AppOperation.plugin,
      action: 'open the share sheet',
      resource: 'share_sheet',
    );

    test('returns the operation result on success', () async {
      final result = await withAppErrorContext(
        () async => 42,
        context: context,
      );
      expect(result, 42);
    });

    test('normalizes a thrown error into a typed AppException', () async {
      await expectLater(
        withAppErrorContext<void>(
          () async => throw const FormatException('boom'),
          context: context,
        ),
        throwsA(
          isA<BackendOperationException>().having(
            (e) => e.context?.metadata['operation'],
            'operation',
            'plugin',
          ),
        ),
      );
    });

    test('rethrows an existing AppException untouched', () async {
      await expectLater(
        withAppErrorContext<void>(
          () async => throw const ValidationException('Pick a date.'),
          context: context,
        ),
        throwsA(isA<ValidationException>()),
      );
    });
  });

  group('logAppError / runLoggingAppErrors', () {
    late _FakeCrashReporter reporter;
    late ErrorLogger logger;

    setUp(() {
      reporter = _FakeCrashReporter();
      logger = ErrorLogger.silent(
        crashReporter: reporter,
        shouldReportErrors: true,
      );
    });

    test('logAppError reports unexpected errors to the crash reporter', () {
      logAppError(
        StateError('kaboom'),
        context: const AppErrorContext(
          operation: AppOperation.runtime,
          action: 'refresh the gate',
          resource: 'remote_config',
        ),
        logError: logger,
      );

      expect(reporter.recordedErrors, hasLength(1));
      expect(reporter.recordedErrors.single.fatal, isFalse);
    });

    test('logAppError does NOT crash-report expected validation failures', () {
      logAppError(
        const ValidationException('Please choose a date.'),
        context: const AppErrorContext(
          operation: AppOperation.validation,
          action: 'validate booking',
        ),
        logError: logger,
      );

      // ValidationException is warning severity → logged but not a crash.
      expect(reporter.recordedErrors, isEmpty);
    });

    test(
      'runLoggingAppErrors returns true and does not log on success',
      () async {
        final ok = await runLoggingAppErrors(
          () async {},
          context: const AppErrorContext(
            operation: AppOperation.localPersistence,
            action: 'save draft',
          ),
          logError: logger,
        );

        expect(ok, isTrue);
        expect(reporter.recordedErrors, isEmpty);
      },
    );

    test(
      'runLoggingAppErrors swallows, logs, and returns false on failure',
      () async {
        final ok = await runLoggingAppErrors(
          () async => throw StateError('disk full'),
          context: const AppErrorContext(
            operation: AppOperation.localPersistence,
            action: 'save draft',
            resource: 'event_draft',
          ),
          logError: logger,
        );

        expect(ok, isFalse);
        expect(reporter.recordedErrors, hasLength(1));
      },
    );
  });
}

final class _RecordedError {
  const _RecordedError({required this.error, required this.fatal});

  final Object error;
  final bool fatal;
}

final class _FakeCrashReporter implements CrashReporter {
  final recordedErrors = <_RecordedError>[];

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
    recordedErrors.add(_RecordedError(error: error, fatal: fatal));
  }

  @override
  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  }) async {}
}
