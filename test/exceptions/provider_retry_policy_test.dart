import 'dart:async';

import 'package:catch_dating_app/pages/frame/app_bootstrap.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/errors/provider_retry_policy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_async/fake_async.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _network = NetworkException('unavailable', 'Check your connection.');

void main() {
  group('catchProviderRetry', () {
    test('retries a transient failure three times with backoff', () {
      expect(
        [
          for (var count = 0; count < 4; count++)
            catchProviderRetry(count, _network),
        ],
        const [
          Duration(milliseconds: 200),
          Duration(milliseconds: 400),
          Duration(milliseconds: 800),
          null,
        ],
      );
      expect(
        catchProviderRetry(
          0,
          FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
        ),
        const Duration(milliseconds: 200),
      );
    });

    test('never retries failures a second attempt cannot fix', () {
      for (final error in <Object>[
        const PermissionException('No access.'),
        const DocumentNotFoundException('event'),
        const SignInRequiredException('load events'),
        FirebaseException(plugin: 'cloud_firestore', code: 'not-found'),
        StateError('bug'),
      ]) {
        expect(catchProviderRetry(0, error), isNull, reason: '$error');
      }
    });

    test('never retries a timeout, raw or mapped', () {
      const repository = BackendErrorContext(
        service: BackendService.functions,
        action: 'load host analytics',
      );
      for (final error in <Object>[
        TimeoutException('read', const Duration(seconds: 10)),
        normalizeBackendError(
          TimeoutException('read', const Duration(seconds: 10)),
          context: repository,
        ),
        FirebaseException(plugin: 'cloud_firestore', code: 'deadline-exceeded'),
        FirebaseFunctionsException(
          code: 'deadline-exceeded',
          message: 'deadline-exceeded',
        ),
        catchAsyncInitialLoadTimeoutException,
      ]) {
        expect(isTimeoutFailure(error), isTrue, reason: '$error');
        expect(catchProviderRetry(0, error), isNull, reason: '$error');
      }
      expect(isTimeoutFailure(_network), isFalse);
    });

    test('a listener opt-out never retries', () {
      expect(noAutomaticRetry(0, _network), isNull);
    });

    test('a raw Firestore error gets the answer its mapped form gets', () {
      const repository = BackendErrorContext(
        service: BackendService.firestore,
        action: 'load events',
      );
      for (final code in [
        'aborted',
        'deadline-exceeded',
        'failed-precondition',
        'invalid-argument',
        'not-found',
        'permission-denied',
        'unauthenticated',
        'unavailable',
      ]) {
        final raw = FirebaseException(plugin: 'cloud_firestore', code: code);
        final mapped = normalizeBackendError(raw, context: repository);
        expect(
          catchProviderRetry(0, raw),
          catchProviderRetry(0, mapped),
          reason: code,
        );
      }
    });
  });

  test('the app container runs a timed-out read once, not four times', () {
    fakeAsync((async) {
      var attempts = 0;
      final slow = FutureProvider.autoDispose<int>((ref) {
        attempts++;
        // A repository maps its timeout to a retryable NetworkException.
        throw normalizeBackendError(
          TimeoutException('read', const Duration(seconds: 10)),
          context: const BackendErrorContext(
            service: BackendService.functions,
            action: 'load host analytics',
          ),
        );
      });
      final container = createCatchAppContainer(
        overrides: [
          errorLoggerProvider.overrideWithValue(
            ErrorLogger(shouldReportErrors: false, consoleSink: (_) {}),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.listen(slow, (_, _) {});
      async.elapse(const Duration(seconds: 30));

      expect(attempts, 1);
      expect(container.read(slow).hasError, isTrue);
      expect(container.read(slow).isLoading, isFalse);
    });
  });

  test('the app container surfaces a permission failure at once', () async {
    final denied = FutureProvider.autoDispose<int>(
      (ref) => throw const PermissionException('No access.'),
    );
    final flaky = FutureProvider.autoDispose<int>((ref) => throw _network);
    final container = createCatchAppContainer(
      overrides: [
        errorLoggerProvider.overrideWithValue(
          ErrorLogger(shouldReportErrors: false, consoleSink: (_) {}),
        ),
      ],
    );
    addTearDown(container.dispose);
    container
      ..listen(denied, (_, _) {})
      ..listen(flaky, (_, _) {});
    await container.pump();

    expect(container.read(denied).hasError, isTrue);
    expect(container.read(denied).isLoading, isFalse);
    expect(container.read(flaky).isLoading, isTrue);
    expect(container.read(flaky).retrying, isTrue);
  });
}
