import 'dart:async';

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Internal callable identity for exact domain recovery classification. Never
/// render provider messages as UI copy. Wrapped causes are bounded to eight.
({String code, String? message})? backendCallableErrorIdentity(Object error) {
  Object? cause = error;
  for (var depth = 0; depth < 8 && cause is AppException; depth++) {
    cause = cause.cause;
  }
  if (cause is! FirebaseFunctionsException) return null;
  return (code: cause.code, message: cause.message);
}

typedef BackendErrorMapper =
    AppException? Function(
      Object error,
      StackTrace stackTrace,
      BackendErrorContext context,
    );

/// Returns structured callable details for internal recovery classification.
/// Callers must match their complete domain identity before treating a request
/// as rejected. These provider details must never be rendered as UI copy.
Map<Object?, Object?>? backendCallableErrorDetails(
  Object error, {
  required String code,
}) {
  Object? cause = error;
  for (var depth = 0; depth < 8 && cause is AppException; depth++) {
    cause = cause.cause;
  }
  if (cause is! FirebaseFunctionsException || cause.code != code) return null;
  final details = cause.details;
  return details is Map ? Map<Object?, Object?>.from(details) : null;
}

/// Reclassifies the generic 404 returned when a callable endpoint has not been
/// deployed yet. Domain callables can also intentionally throw `not-found`, so
/// only the transport's generic messages are treated as capability failures.
AppException? mapMissingCallableAsUnavailable(
  Object error,
  StackTrace stackTrace,
  BackendErrorContext context,
) {
  if (error is! FirebaseFunctionsException ||
      error.code != 'not-found' ||
      !_isMissingCallableTransportMessage(error.message)) {
    return null;
  }
  return BackendOperationException(
    code: 'callable-unavailable',
    message: 'This feature is not available right now. Please try again.',
    debugMessage: _firebaseDebugMessage(error, context),
    cause: error,
    stackTrace: stackTrace,
    context: context,
    retryable: true,
    severity: AppErrorSeverity.error,
  );
}

bool _isMissingCallableTransportMessage(String? message) {
  final normalized = message
      ?.trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[_-]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ');
  return normalized == 'not found' ||
      normalized == 'function not found' ||
      normalized == 'requested function was not found' ||
      normalized == 'the requested function was not found';
}

Future<T> withBackendErrorContext<T>(
  Future<T> Function() operation, {
  required BackendErrorContext context,
  BackendErrorMapper? mapper,
}) async {
  try {
    return await operation();
  } catch (error, stackTrace) {
    throw normalizeBackendError(
      error,
      stackTrace: stackTrace,
      context: context,
      mapper: mapper,
    );
  }
}

Stream<T> withBackendErrorStream<T>(
  Stream<T> Function() operation, {
  required BackendErrorContext context,
  BackendErrorMapper? mapper,
}) {
  try {
    return operation().handleError((Object error, StackTrace stackTrace) {
      throw normalizeBackendError(
        error,
        stackTrace: stackTrace,
        context: context,
        mapper: mapper,
      );
    });
  } catch (error, stackTrace) {
    return Stream.error(
      normalizeBackendError(
        error,
        stackTrace: stackTrace,
        context: context,
        mapper: mapper,
      ),
      stackTrace,
    );
  }
}

AppException normalizeBackendError(
  Object error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
  BackendErrorMapper? mapper,
}) {
  if (error case AppException appException) {
    return appException;
  }

  final mapped = mapper?.call(error, stackTrace ?? StackTrace.current, context);
  if (mapped != null) return mapped;

  if (error case FirebaseFunctionsException functionsError) {
    return _mapFunctionsException(
      functionsError,
      stackTrace: stackTrace,
      context: context,
    );
  }
  if (error case FirebaseAuthException authError) {
    return _mapAuthException(
      authError,
      stackTrace: stackTrace,
      context: context,
    );
  }
  if (error case FirebaseException firebaseError) {
    return _mapFirebaseException(
      firebaseError,
      stackTrace: stackTrace,
      context: context,
    );
  }
  if (error case TimeoutException timeout) {
    return NetworkException(
      'timeout',
      'The request timed out. Please try again.',
      debugMessage: timeout.message,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    );
  }

  return BackendOperationException(
    code: 'unexpected',
    message: 'Unable to ${context.action} right now. Please try again.',
    debugMessage: 'Unexpected ${error.runtimeType}: $error',
    cause: error,
    stackTrace: stackTrace,
    context: context,
    severity: AppErrorSeverity.error,
  );
}

BackendService backendServiceForFirebaseException(FirebaseException error) {
  if (error is FirebaseFunctionsException) return BackendService.functions;
  if (error is FirebaseAuthException) return BackendService.auth;
  return switch (error.plugin) {
    'cloud_firestore' || 'firestore' => BackendService.firestore,
    'firebase_storage' || 'storage' => BackendService.storage,
    'firebase_remote_config' || 'remoteconfig' => BackendService.remoteConfig,
    'firebase_app_check' || 'app_check' => BackendService.appCheck,
    'firebase_messaging' || 'messaging' => BackendService.messaging,
    'firebase_auth' || 'auth' => BackendService.auth,
    _ => BackendService.unknown,
  };
}

BackendErrorContext backendContextForFirebaseException(
  FirebaseException error, {
  String action = 'complete this action',
  String? resource,
}) {
  return BackendErrorContext(
    service: backendServiceForFirebaseException(error),
    action: action,
    resource: resource ?? error.plugin,
  );
}

AppException _mapFirebaseException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return switch (backendServiceForFirebaseException(error)) {
    BackendService.storage => _mapStorageException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
    BackendService.auth => _mapAuthLikeFirebaseException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
    BackendService.remoteConfig => _mapRemoteConfigException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
    BackendService.appCheck => _mapAppCheckException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
    BackendService.messaging => _mapMessagingException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
    _ => _mapCommonFirebaseException(
      error,
      stackTrace: stackTrace,
      context: context,
    ),
  };
}

AppException _mapCommonFirebaseException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  final debugMessage = _firebaseDebugMessage(error, context);
  return switch (error.code) {
    'permission-denied' when context.service == BackendService.firestore =>
      BackendOperationException(
        code: 'backend-permission-denied',
        message: 'Unable to load this data right now. Please try again.',
        debugMessage: debugMessage,
        cause: error,
        stackTrace: stackTrace,
        context: context,
        retryable: true,
        severity: AppErrorSeverity.error,
      ),
    'permission-denied' => PermissionException(
      "You don't have permission to do that.",
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'unauthenticated' => SignInRequiredException(
      context.action,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'unavailable' || 'network-request-failed' => NetworkException(
      'connection-failed',
      "We're having trouble connecting. Please check your internet and try again.",
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'deadline-exceeded' => NetworkException(
      'timeout',
      'The request timed out. Please try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'resource-exhausted' => NetworkException(
      'too-many-requests',
      "We're experiencing high traffic. Please try again in a moment.",
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'not-found' => DocumentNotFoundException(
      context.resource ?? 'the requested data',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'already-exists' => BackendOperationException(
      code: error.code,
      message: 'This already exists.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'failed-precondition' when context.service == BackendService.firestore =>
      BackendOperationException(
        code: error.code,
        message: _firestoreFailedPreconditionMessage(error),
        debugMessage: _firestoreFailedPreconditionDebugMessage(error, context),
        cause: error,
        stackTrace: stackTrace,
        context: context,
        retryable: true,
        severity: AppErrorSeverity.error,
      ),
    'aborted' => BackendOperationException(
      code: error.code,
      message: 'The operation could not be completed. Please try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      retryable: true,
    ),
    _ => BackendOperationException(
      code: error.code,
      message: 'Unable to ${context.action} right now. Please try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      severity: AppErrorSeverity.error,
    ),
  };
}

String _firestoreFailedPreconditionMessage(FirebaseException error) {
  final message = error.message ?? '';
  if (_mentionsFirestoreIndex(message)) {
    return 'This list is still getting set up. Please try again in a moment.';
  }
  return 'Unable to load this data right now. Please try again.';
}

String _firestoreFailedPreconditionDebugMessage(
  FirebaseException error,
  BackendErrorContext context,
) {
  final message = error.message ?? '';
  if (_mentionsFirestoreIndex(message)) {
    final state = message.toLowerCase().contains('currently building')
        ? 'required index is still building'
        : 'required index is missing';
    return '${context.service.logKey}.${context.action} failed '
        'with ${error.plugin}/${error.code}: $state.';
  }
  return _firebaseDebugMessage(error, context);
}

bool _mentionsFirestoreIndex(String message) {
  final normalized = message.toLowerCase();
  return normalized.contains('index') &&
      (normalized.contains('requires an index') ||
          normalized.contains('query requires an index') ||
          normalized.contains('currently building'));
}

AppException _mapFunctionsException(
  FirebaseFunctionsException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return _mapCommonFirebaseException(
    error,
    stackTrace: stackTrace,
    context: BackendErrorContext(
      service: context.service == BackendService.unknown
          ? BackendService.functions
          : context.service,
      action: context.action,
      resource: context.resource,
      metadata: context.metadata,
    ),
  );
}

AppException _mapAuthException(
  FirebaseAuthException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  final debugMessage = _firebaseDebugMessage(error, context);
  if (_isAuthKeychainFailure(error)) {
    return BackendOperationException(
      code: error.code,
      message:
          'Unable to finish sign-in on this device. Please restart the app and request a new code.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      retryable: true,
      severity: AppErrorSeverity.error,
    );
  }
  if (_isAuthWebVerificationCancelled(error)) {
    return BackendOperationException(
      code: error.code,
      message: 'Verification was cancelled. Please try again when ready.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      retryable: true,
    );
  }
  if (_isAuthCaptchaVerificationFailure(error)) {
    return BackendOperationException(
      code: error.code,
      message:
          'Unable to complete the verification check. Please close the verification window and try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      retryable: true,
      severity: AppErrorSeverity.error,
    );
  }

  return switch (error.code) {
    'invalid-phone-number' => ValidationException(
      'Please enter a valid phone number.',
      code: error.code,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'invalid-verification-code' => ValidationException(
      'That code is invalid. Please try again.',
      code: error.code,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'session-expired' || 'code-expired' => BackendOperationException(
      code: error.code,
      message: 'That code expired. Please request a new one.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'network-request-failed' || 'internal-error' => NetworkException(
      'connection-failed',
      error.code == 'internal-error'
          ? 'Unable to reach authentication services. Please try again.'
          : 'Check your internet connection and try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'timeout' => NetworkException(
      'timeout',
      'The verification request timed out. Please check your connection and try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'too-many-requests' => NetworkException(
      'too-many-requests',
      'Too many attempts. Please wait a bit and try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'operation-not-allowed' => PermissionException(
      'This sign-in method is not enabled.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'user-disabled' => PermissionException(
      'This account has been disabled.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    _ => BackendOperationException(
      code: error.code,
      message: error.message ?? 'Something went wrong. Please try again.',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      severity: AppErrorSeverity.error,
    ),
  };
}

bool _isAuthKeychainFailure(FirebaseAuthException error) {
  final code = error.code.toLowerCase().replaceAll('_', '-');
  if (code == 'keychain-error') return true;

  final message = error.message?.toLowerCase() ?? '';
  return message.contains('keychain') ||
      message.contains('key chain') ||
      message.contains('nslocalizedfailurereasonerrorkey') ||
      message.contains('secitem');
}

bool _isAuthWebVerificationCancelled(FirebaseAuthException error) {
  final code = error.code.toLowerCase().replaceAll('_', '-');
  if (code == 'web-context-canceled' || code == 'web-context-cancelled') {
    return true;
  }

  final message = error.message?.toLowerCase() ?? '';
  return (message.contains('interaction') ||
          message.contains('verification')) &&
      (message.contains('cancelled by the user') ||
          message.contains('canceled by the user'));
}

bool _isAuthCaptchaVerificationFailure(FirebaseAuthException error) {
  final code = error.code.toLowerCase().replaceAll('_', '-');
  if (code == 'captcha-check-failed' || code == 'web-context-already-present') {
    return true;
  }

  final message = error.message?.toLowerCase() ?? '';
  return message.contains('recaptcha') || message.contains('captcha');
}

AppException _mapAuthLikeFirebaseException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return _mapCommonFirebaseException(
    error,
    stackTrace: stackTrace,
    context: context,
  );
}

AppException _mapStorageException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  final debugMessage = _firebaseDebugMessage(error, context);
  return switch (error.code) {
    'unauthorized' || 'permission-denied' => PermissionException(
      "You don't have permission to upload that file.",
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'unauthenticated' => SignInRequiredException(
      context.action,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'object-not-found' => DocumentNotFoundException(
      context.resource ?? 'the uploaded file',
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'canceled' || 'cancelled' => StorageException(
      'Upload was cancelled.',
      code: error.code,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
    'retry-limit-exceeded' || 'unknown' || 'quota-exceeded' => StorageException(
      'Unable to upload right now. Please check your connection and try again.',
      code: error.code,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
      retryable: true,
    ),
    _ => StorageException(
      'Unable to upload right now. Please try again.',
      code: error.code,
      debugMessage: debugMessage,
      cause: error,
      stackTrace: stackTrace,
      context: context,
    ),
  };
}

AppException _mapRemoteConfigException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return BackendOperationException(
    code: error.code,
    message: 'Unable to check the latest app configuration right now.',
    debugMessage: _firebaseDebugMessage(error, context),
    cause: error,
    stackTrace: stackTrace,
    context: context,
    retryable: true,
  );
}

AppException _mapAppCheckException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return BackendOperationException(
    code: error.code,
    message: 'Unable to verify this app session. Please try again.',
    debugMessage: _firebaseDebugMessage(error, context),
    cause: error,
    stackTrace: stackTrace,
    context: context,
    severity: AppErrorSeverity.error,
  );
}

AppException _mapMessagingException(
  FirebaseException error, {
  StackTrace? stackTrace,
  required BackendErrorContext context,
}) {
  return BackendOperationException(
    code: error.code,
    message: 'Unable to update notification settings right now.',
    debugMessage: _firebaseDebugMessage(error, context),
    cause: error,
    stackTrace: stackTrace,
    context: context,
    retryable: error.code == 'network-request-failed',
  );
}

String _firebaseDebugMessage(
  FirebaseException error,
  BackendErrorContext context,
) {
  final plugin = error.plugin.isEmpty ? 'unknown-plugin' : error.plugin;
  final message = error.message;
  return '${context.service.logKey}.${context.action} failed '
      'with $plugin/${error.code}'
      '${message == null || message.isEmpty ? '' : ': $message'}';
}
