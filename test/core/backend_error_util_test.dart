import 'dart:async';

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctionsException extends FirebaseFunctionsException {
  TestFirebaseFunctionsException({required super.code, required super.message});
}

void main() {
  const firestoreContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load events',
    resource: 'events',
  );

  group('backendCallableErrorIdentity', () {
    test('preserves exact code and message through mapped wrappers', () {
      final raw = FirebaseFunctionsException(
        code: 'aborted',
        message: 'Rejected',
      );
      final mapped = normalizeBackendError(raw, context: firestoreContext);
      expect(backendCallableErrorIdentity(raw), (
        code: 'aborted',
        message: 'Rejected',
      ));
      expect(backendCallableErrorIdentity(mapped), (
        code: 'aborted',
        message: 'Rejected',
      ));
      expect(
        backendCallableErrorIdentity(
          FirebaseFunctionsException(code: 'aborted', message: ''),
        ),
        (code: 'aborted', message: ''),
      );
    });

    test('rejects non-callable causes and excessive wrapper depth', () {
      expect(
        backendCallableErrorIdentity(
          FirebaseException(plugin: 'cloud_firestore', code: 'aborted'),
        ),
        isNull,
      );
      expect(backendCallableErrorIdentity(StateError('aborted')), isNull);
      Object error = FirebaseFunctionsException(
        code: 'aborted',
        message: 'Rejected',
      );
      for (var depth = 0; depth < 8; depth++) {
        error = BackendOperationException(
          code: 'unexpected',
          message: 'Diagnostic',
          context: firestoreContext,
          cause: error,
        );
      }
      expect(backendCallableErrorIdentity(error), (
        code: 'aborted',
        message: 'Rejected',
      ));
      error = BackendOperationException(
        code: 'unexpected',
        message: 'Diagnostic',
        context: firestoreContext,
        cause: error,
      );
      expect(backendCallableErrorIdentity(error), isNull);
    });
  });

  group('backendCallableErrorDetails', () {
    test('preserves structured recovery details through mapped wrappers', () {
      final raw = FirebaseFunctionsException(
        code: 'aborted',
        message: 'Rejected',
        details: const {'reason': 'stale', 'requestId': 'request-1'},
      );
      final mapped = normalizeBackendError(raw, context: firestoreContext);
      expect(backendCallableErrorDetails(raw, code: 'aborted'), raw.details);
      expect(backendCallableErrorDetails(mapped, code: 'aborted'), raw.details);
      expect(backendCallableErrorDetails(mapped, code: 'unavailable'), isNull);
    });

    test(
      'rejects unstructured details, non-callable causes and deep wrappers',
      () {
        expect(
          backendCallableErrorDetails(
            FirebaseFunctionsException(
              code: 'aborted',
              message: 'Rejected',
              details: 'not a receipt',
            ),
            code: 'aborted',
          ),
          isNull,
        );
        expect(
          backendCallableErrorDetails(
            FirebaseException(plugin: 'cloud_firestore', code: 'aborted'),
            code: 'aborted',
          ),
          isNull,
        );
        Object error = FirebaseFunctionsException(
          code: 'aborted',
          message: 'Rejected',
          details: const {},
        );
        for (var depth = 0; depth < 9; depth++) {
          error = BackendOperationException(
            code: 'unexpected',
            message: 'Diagnostic',
            context: firestoreContext,
            cause: error,
          );
        }
        expect(backendCallableErrorDetails(error, code: 'aborted'), isNull);
      },
    );
  });

  group('normalizeBackendError', () {
    test('preserves existing AppException instances', () {
      const error = ValidationException('Name is required.');

      expect(
        normalizeBackendError(error, context: firestoreContext),
        same(error),
      );
    });

    test('lets feature mappers preserve domain-specific exceptions', () {
      final mapped = normalizeBackendError(
        StateError('server refused booking'),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'book event',
          resource: 'events',
        ),
        mapper: (error, stackTrace, context) => EventBookingFailedException(
          'This event is full.',
          context: context,
        ),
      );

      expect(mapped, isA<EventBookingFailedException>());
      expect(mapped.message, 'This event is full.');
      expect(mapped.context?.service, BackendService.functions);
    });

    test('maps common Firestore failures to typed app exceptions', () {
      expect(
        normalizeBackendError(
          FirebaseException(
            plugin: 'cloud_firestore',
            code: 'permission-denied',
          ),
          context: firestoreContext,
        ),
        isA<BackendOperationException>()
            .having((error) => error.code, 'code', 'backend-permission-denied')
            .having((error) => error.retryable, 'retryable', isTrue),
      );

      final network = normalizeBackendError(
        FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
        context: firestoreContext,
      );
      expect(network, isA<NetworkException>());
      expect(network.retryable, isTrue);

      final missing = normalizeBackendError(
        FirebaseException(plugin: 'cloud_firestore', code: 'not-found'),
        context: firestoreContext,
      );
      expect(missing, isA<DocumentNotFoundException>());
      expect(missing.context?.resource, 'events');
    });

    test(
      'maps Firestore index preconditions to retryable operational errors',
      () {
        final error = normalizeBackendError(
          FirebaseException(
            plugin: 'cloud_firestore',
            code: 'failed-precondition',
            message:
                'The query requires an index. That index is currently building '
                'and cannot be used yet. See its status here: '
                'https://console.firebase.google.com/example',
          ),
          context: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'watch clubs by location',
            resource: 'clubs',
          ),
        );

        expect(error, isA<BackendOperationException>());
        expect(error.retryable, isTrue);
        expect(
          error.message,
          'This list is still getting set up. Please try again in a moment.',
        );
        expect(
          error.debugMessage,
          contains('required index is still building'),
        );
        expect(
          error.debugMessage,
          isNot(contains('console.firebase.google.com')),
        );
      },
    );

    test('maps callable Functions failures with Functions service context', () {
      final error = normalizeBackendError(
        TestFirebaseFunctionsException(
          code: 'unauthenticated',
          message: 'Auth required',
        ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'join event',
          resource: 'events',
        ),
      );

      expect(error, isA<SignInRequiredException>());
      expect(error.context?.service, BackendService.functions);
      expect(error.context?.action, 'join event');
    });

    test(
      'maps a missing callable endpoint to a retryable capability error',
      () {
        final error = normalizeBackendError(
          TestFirebaseFunctionsException(
            code: 'not-found',
            message: 'NOT FOUND',
          ),
          context: const BackendErrorContext(
            service: BackendService.functions,
            action: 'load organizer forms',
            resource: 'organizer_forms',
          ),
          mapper: mapMissingCallableAsUnavailable,
        );

        expect(
          error,
          isA<BackendOperationException>()
              .having((value) => value.code, 'code', 'callable-unavailable')
              .having((value) => value.retryable, 'retryable', isTrue),
        );
        expect(error, isNot(isA<DocumentNotFoundException>()));
        expect(error.context?.action, 'load organizer forms');
      },
    );

    test('preserves domain not-found failures from deployed callables', () {
      final error = normalizeBackendError(
        TestFirebaseFunctionsException(
          code: 'not-found',
          message: 'Organizer not found.',
        ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load organizer forms',
          resource: 'organizer_forms',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

      expect(error, isA<DocumentNotFoundException>());
      expect(error, isNot(isA<BackendOperationException>()));
    });

    test('maps Firebase Auth validation and retry failures', () {
      final invalidCode = normalizeBackendError(
        FirebaseAuthException(code: 'invalid-verification-code'),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'verify OTP',
        ),
      );
      expect(invalidCode, isA<ValidationException>());
      expect(invalidCode.code, 'invalid-verification-code');

      final tooManyRequests = normalizeBackendError(
        FirebaseAuthException(code: 'too-many-requests'),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'send OTP',
        ),
      );
      expect(tooManyRequests, isA<NetworkException>());
      expect(tooManyRequests.retryable, isTrue);
    });

    test('maps Firebase Auth keychain failures without leaking internals', () {
      const rawKeychainMessage =
          'An error occurred when accessing the keychain. The '
          'NSLocalizedFailureReasonErrorKey field in the NSError.userInfo '
          'dictionary will contain more information about the error encountered';

      final exactCode = normalizeBackendError(
        FirebaseAuthException(
          code: 'keychain-error',
          message: rawKeychainMessage,
        ),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'verify OTP',
          resource: 'phone_auth',
        ),
      );

      expect(exactCode, isA<BackendOperationException>());
      expect(exactCode.retryable, isTrue);
      expect(exactCode.severity, AppErrorSeverity.error);
      expect(
        exactCode.message,
        'Unable to finish sign-in on this device. Please restart the app and request a new code.',
      );
      expect(exactCode.message, isNot(contains('keychain')));
      expect(
        exactCode.message,
        isNot(contains('NSLocalizedFailureReasonErrorKey')),
      );
      expect(exactCode.debugMessage, contains(rawKeychainMessage));

      final unknownCode = normalizeBackendError(
        FirebaseAuthException(code: 'unknown', message: rawKeychainMessage),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'verify OTP',
          resource: 'phone_auth',
        ),
      );

      expect(unknownCode, isA<BackendOperationException>());
      expect(unknownCode.message, exactCode.message);
    });

    test('maps Firebase Auth captcha failures without leaking internals', () {
      const rawCaptchaMessage =
          'Cannot contact reCAPTCHA. Check your connection and try again.';

      final exactCode = normalizeBackendError(
        FirebaseAuthException(
          code: 'captcha-check-failed',
          message: rawCaptchaMessage,
        ),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'send verification code',
          resource: 'phone_auth',
        ),
      );

      expect(exactCode, isA<BackendOperationException>());
      expect(exactCode.retryable, isTrue);
      expect(exactCode.severity, AppErrorSeverity.error);
      expect(
        exactCode.message,
        'Unable to complete the verification check. Please close the verification window and try again.',
      );
      expect(exactCode.message, isNot(contains('reCAPTCHA')));
      expect(exactCode.debugMessage, contains(rawCaptchaMessage));

      final messageOnly = normalizeBackendError(
        FirebaseAuthException(code: 'unknown', message: rawCaptchaMessage),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'send verification code',
          resource: 'phone_auth',
        ),
      );

      expect(messageOnly, isA<BackendOperationException>());
      expect(messageOnly.message, exactCode.message);
    });

    test('maps Firebase Auth web verification cancellation cleanly', () {
      const rawCancelMessage = 'The interaction was cancelled by the user.';

      final exactCode = normalizeBackendError(
        FirebaseAuthException(
          code: 'web-context-cancelled',
          message: rawCancelMessage,
        ),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'send verification code',
          resource: 'phone_auth',
        ),
      );

      expect(exactCode, isA<BackendOperationException>());
      expect(exactCode.retryable, isTrue);
      expect(
        exactCode.message,
        'Verification was cancelled. Please try again when ready.',
      );
      expect(exactCode.message, isNot(contains('interaction')));
      expect(exactCode.debugMessage, contains(rawCancelMessage));

      final messageOnly = normalizeBackendError(
        FirebaseAuthException(code: 'unknown', message: rawCancelMessage),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'send verification code',
          resource: 'phone_auth',
        ),
      );

      expect(messageOnly, isA<BackendOperationException>());
      expect(messageOnly.message, exactCode.message);
    });

    test('maps Firebase Storage failures', () {
      final denied = normalizeBackendError(
        FirebaseException(plugin: 'firebase_storage', code: 'unauthorized'),
        context: const BackendErrorContext(
          service: BackendService.storage,
          action: 'upload profile photo',
          resource: 'profile_photos',
        ),
      );
      expect(denied, isA<PermissionException>());

      final retryable = normalizeBackendError(
        FirebaseException(
          plugin: 'firebase_storage',
          code: 'retry-limit-exceeded',
        ),
        context: const BackendErrorContext(
          service: BackendService.storage,
          action: 'upload profile photo',
          resource: 'profile_photos',
        ),
      );
      expect(retryable, isA<StorageException>());
      expect(retryable.retryable, isTrue);
    });

    test('maps Remote Config, App Check, and Messaging failures', () {
      final remoteConfig = normalizeBackendError(
        FirebaseException(
          plugin: 'firebase_remote_config',
          code: 'fetch-throttled',
        ),
        context: const BackendErrorContext(
          service: BackendService.remoteConfig,
          action: 'check minimum app version',
        ),
      );
      expect(remoteConfig, isA<BackendOperationException>());
      expect(remoteConfig.retryable, isTrue);

      final appCheck = normalizeBackendError(
        FirebaseException(plugin: 'firebase_app_check', code: 'token-error'),
        context: const BackendErrorContext(
          service: BackendService.appCheck,
          action: 'verify app session',
        ),
      );
      expect(appCheck, isA<BackendOperationException>());
      expect(appCheck.severity, AppErrorSeverity.error);

      final messaging = normalizeBackendError(
        FirebaseException(
          plugin: 'firebase_messaging',
          code: 'network-request-failed',
        ),
        context: const BackendErrorContext(
          service: BackendService.messaging,
          action: 'save push token',
        ),
      );
      expect(messaging, isA<BackendOperationException>());
      expect(messaging.retryable, isTrue);
    });

    test('maps timeouts and unexpected errors with backend context', () {
      final timeout = normalizeBackendError(
        TimeoutException('slow'),
        context: firestoreContext,
      );
      expect(timeout, isA<NetworkException>());
      expect(timeout.context?.action, 'load events');

      final unexpected = normalizeBackendError(
        StateError('bad decode'),
        context: firestoreContext,
      );
      expect(unexpected, isA<BackendOperationException>());
      expect(unexpected.code, 'unexpected');
      expect(unexpected.severity, AppErrorSeverity.error);
      expect(unexpected.context?.service, BackendService.firestore);
    });
  });
}
